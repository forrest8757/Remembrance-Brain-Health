// Form assignment (CLAUDE.md §8): no repeats within the last N−1
// administrations, Latin-square counterbalancing of form order across users,
// and a stored seed for every administration.
import type { Form } from './form';
import { hash32, seedFor } from './random';

/**
 * Balanced (Williams) Latin square for n conditions. Each row is an order of
 * 0..n-1; every condition appears once per row and column. For even n each
 * condition also precedes every other exactly once (carryover balance).
 */
export function balancedLatinSquare(n: number): number[][] {
  if (n < 1) return [];
  const rows: number[][] = [];
  for (let r = 0; r < n; r++) {
    const row: number[] = [];
    for (let c = 0, j = 0, h = 0; c < n; c++) {
      let val: number;
      if (c < 2 || c % 2 !== 0) val = j++;
      else val = n - ++h;
      row.push((val + r) % n);
    }
    rows.push(row);
  }
  return rows;
}

export interface AssignmentHistoryEntry {
  formId: string;
}

export interface AssignFormInput {
  userId: string;
  testId: string;
  forms: readonly Form[];
  /** This user's previous administrations of this test, oldest first. */
  history: readonly AssignmentHistoryEntry[];
  licensedContent: boolean;
}

export interface Assignment {
  form: Form;
  administrationNumber: number;
  seed: number;
  latinSquareRow: number;
}

export function eligibleForms(forms: readonly Form[], testId: string, licensedContent: boolean): Form[] {
  return forms
    .filter((f) => f.testId === testId && (licensedContent || !f.licensed))
    .slice()
    .sort((a, b) => a.formId.localeCompare(b.formId));
}

export function assignForm({ userId, testId, forms, history, licensedContent }: AssignFormInput): Assignment {
  const eligible = eligibleForms(forms, testId, licensedContent);
  if (eligible.length === 0) throw new Error(`No eligible forms for ${testId}`);

  const n = eligible.length;
  const square = balancedLatinSquare(n);
  const latinSquareRow = hash32(`${userId}:${testId}`) % n;
  const administrationNumber = history.length + 1;
  const recent = new Set(history.slice(-(n - 1)).map((h) => h.formId));

  // Walk this user's counterbalanced order from their current position and
  // take the first form not used in the last N−1 administrations.
  const order = square[latinSquareRow]!;
  let form: Form | undefined;
  for (let k = 0; k < n; k++) {
    const candidate = eligible[order[(history.length + k) % n]!]!;
    if (!recent.has(candidate.formId)) {
      form = candidate;
      break;
    }
  }
  // Unreachable when history only holds eligible forms, but a licence flag
  // flip can leave only recent forms: fall back to least recently used.
  if (!form) {
    const lastUse = new Map(history.map((h, i) => [h.formId, i]));
    form = eligible.slice().sort((a, b) => (lastUse.get(a.formId) ?? -1) - (lastUse.get(b.formId) ?? -1))[0]!;
  }

  return { form, administrationNumber, seed: seedFor(userId, testId, administrationNumber), latinSquareRow };
}

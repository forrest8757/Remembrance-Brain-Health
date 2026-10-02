// Background asked once in onboarding: schooling, why they're here, their own
// health and their family's brain health. Context for reading results and for
// suggesting everyday steps; never used to diagnose or to change scores.
// Dev: this browser (rm.background). Production: server-side, encrypted, as
// PHI (CLAUDE.md §2).
//
// Age, sex and education also go into the participant profile (rm.profile),
// the same record the session's profile step reads, so nobody is asked twice.

export type YesNoUnsure = 'yes' | 'no' | 'unsure';

export interface FamilyBrainHealth {
  /** A parent, brother or sister with dementia or Alzheimer's (first-degree). */
  closeFamily: YesNoUnsure | null;
  /** Which of them, when closeFamily is 'yes'. */
  who: string[];
  /** When it began for the earliest of them: before 65 marks early onset. */
  onset: 'before65' | '65plus' | 'unsure' | null;
  /** Grandparents, aunts or uncles (second-degree). */
  widerFamily: YesNoUnsure | null;
  /** Other brain-health conditions anywhere in the close family. */
  otherConditions: string[];
}

export type GeneticTest = 'apoe4-one' | 'apoe4-two' | 'apoe4-none' | 'unsure-result' | 'never' | 'undisclosed';

export interface Background {
  /** The degree chosen; educationYears (in rm.profile) is its usual length. */
  education: string;
  reason: string | null;
  conditions: string[];
  family: FamilyBrainHealth;
  geneticTest: GeneticTest | null;
}

/** Highest schooling, by degree (easier than counting years), with its usual years of school. */
export const EDUCATION = [
  { value: 'less-than-high-school', label: "Didn't finish high school", years: 10 },
  { value: 'high-school', label: 'High school or GED', years: 12 },
  { value: 'some-college', label: 'Some college, trade school or an associate degree', years: 14 },
  { value: 'bachelors', label: "Bachelor's degree", years: 16 },
  { value: 'masters', label: "Master's degree", years: 18 },
  { value: 'doctorate', label: 'Doctorate or professional degree', detail: 'For example PhD, MD or JD', years: 20 },
] as const;

export const EMPTY_FAMILY: FamilyBrainHealth = { closeFamily: null, who: [], onset: null, widerFamily: null, otherConditions: [] };

const KEY = 'rm.background';

export function readBackground(): Partial<Background> {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Background> | null) ?? {};
  } catch {
    return {};
  }
}

export function saveBackground(b: Background) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    // Per-viewer convenience in dev.
  }
}

/** Merge into the participant profile the session uses (rm.profile), keeping what's there. */
export function saveProfileFields(fields: { firstName: string; birthYear: number; sex: 'female' | 'male' | 'undisclosed'; educationYears: number }) {
  try {
    const p = JSON.parse(localStorage.getItem('rm.profile') ?? '{}') as Record<string, unknown>;
    localStorage.setItem('rm.profile', JSON.stringify({ ...p, ...fields }));
  } catch {
    // Per-viewer convenience in dev.
  }
}

/**
 * One plain sentence for the demo profile and for review. Descriptive only:
 * no risk score, no diagnosis.
 */
export function familySummary(f: FamilyBrainHealth): string {
  if (f.closeFamily === 'yes') {
    const who = f.who.length ? f.who.join(', ').toLowerCase() : 'a close relative';
    const when = f.onset === 'before65' ? ', beginning before 65' : f.onset === '65plus' ? ', beginning at 65 or older' : '';
    return `Dementia or Alzheimer's in ${who}${when}.`;
  }
  if (f.widerFamily === 'yes') return "Dementia or Alzheimer's in grandparents, aunts or uncles.";
  if (f.closeFamily === 'no' && (f.widerFamily === 'no' || f.widerFamily === null)) return 'None known.';
  return 'Not sure.';
}

// Per-test administration history (dev: this browser; production: server-side).
// Drives form rotation (no repeats), pairs a delayed recall with its immediate
// form, and gives the delay since the immediate recall ended.
export const DEMO_USER = 'demo-user';

export interface HistoryEntry {
  formId: string;
  /** When the administration ended (epoch ms). */
  at?: number;
  /** Its score fields, for derived measures like retention. */
  fields?: Record<string, number | null>;
}

const historyKey = (testId: string) => `rm.${testId}.history`;

export function readHistory(testId: string): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(historyKey(testId)) ?? '[]');
  } catch {
    return [];
  }
}

export function pushHistory(testId: string, entry: HistoryEntry) {
  try {
    localStorage.setItem(historyKey(testId), JSON.stringify([...readHistory(testId), entry]));
  } catch {
    // Per-viewer convenience only.
  }
}

/** Attach score fields to the latest entry (scores are computed after the record is saved). */
export function setLatestFields(testId: string, fields: Record<string, number | null>) {
  const h = readHistory(testId);
  if (!h.length) return;
  h[h.length - 1] = { ...h[h.length - 1]!, fields };
  try {
    localStorage.setItem(historyKey(testId), JSON.stringify(h));
  } catch {
    // Per-viewer convenience only.
  }
}

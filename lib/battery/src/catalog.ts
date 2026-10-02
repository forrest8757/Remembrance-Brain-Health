// What the orchestrator knows about each test: a participant-facing title,
// a duration estimate (for windows and "time remaining"), and the
// immediate→delayed pairs with their delay windows (build doc P2 "Delay manager").
//
// Ids for tests not built yet are placeholders; batteries skip anything the
// app can't run (not built, or switched off because it needs permission).

const MIN = 60_000;

export interface CatalogEntry {
  testId: string;
  /** Participant-facing name for the "Next up" card. */
  title: string;
  estimateMs: number;
}

export const CATALOG: Record<string, CatalogEntry> = Object.fromEntries(
  (
    [
      ['moca-blind', 'Memory and Thinking Check', 10],
      ['story-immediate', 'A Short Story', 5],
      ['story-delayed', 'The Story Again', 2],
      ['number-span', 'Number Span', 5],
      ['ravlt-immediate', 'Word List', 7],
      ['ravlt-delayed', 'The Word List Again', 3],
      ['cerad-immediate', 'Word List', 5],
      ['cerad-delayed', 'The Word List Again', 5],
      ['category-fluency', 'Naming Things', 4],
      ['oral-trails', 'Counting Quickly', 5],
      ['phonemic-fluency', 'Words by Letter', 4],
      ['naming', 'Naming Pictures by Description', 10],
    ] as const
  ).map(([testId, title, min]) => [testId, { testId, title, estimateMs: min * MIN }]),
);

/** How the gap before a delayed test may be filled (CLAUDE.md §10). */
export type FillerKind =
  /** Non-verbal chrome activity: breathing pacer, stretch, calm scene. No words. */
  | 'nonVerbal'
  /** A neutral pause only: no other tests, no activities (Craft-style story delay). */
  | 'neutralPause';

export interface DelayRule {
  immediate: string;
  delayed: string;
  /** The delay clock starts when the immediate test ends (its last recall). */
  minMs: number;
  /** Past this the delayed test is overdue: administered at once and flagged. null = no upper bound. */
  maxMs: number | null;
  filler: FillerKind;
}

export const DELAY_RULES: DelayRule[] = [
  // Story recall: ~20 min; actual minutes recorded (99 = unknown); never fill with other tests.
  { immediate: 'story-immediate', delayed: 'story-delayed', minMs: 20 * MIN, maxMs: null, filler: 'neutralPause' },
  // Word list (RAVLT-style): 20–30 min after the last immediate recall.
  { immediate: 'ravlt-immediate', delayed: 'ravlt-delayed', minMs: 20 * MIN, maxMs: 30 * MIN, filler: 'nonVerbal' },
  // Word list (CERAD-style): at least 5 min.
  { immediate: 'cerad-immediate', delayed: 'cerad-delayed', minMs: 5 * MIN, maxMs: null, filler: 'nonVerbal' },
];

export const ruleForDelayed = (testId: string) => DELAY_RULES.find((r) => r.delayed === testId);
export const ruleForImmediate = (testId: string) => DELAY_RULES.find((r) => r.immediate === testId);
export const estimateOf = (testId: string) => CATALOG[testId]?.estimateMs ?? 5 * MIN;

// T8 Oral Trail Making, Parts A and B (C2T pp. 40–43). Task, timing, branches
// and corrections follow docs/build-prompts.md §T8; the wording is
// Remembrance-original (DEVIATIONS L-1). See ./README.md.
import { defineTestSpec, type WindowConfig } from '../../schema';

const LETTERS = 'ABCDEFGHIJKL'.split('');

/** Every "You were at '[n]'" correction (Part A): n = 1…24 (25 ends the task). */
const A_VARIANTS = Array.from({ length: 24 }, (_, i) => ({ last: String(i + 1), lastSpoken: String(i + 1) }));
/** Every Part B correction pair: 1 A … 12 L, plus "1" before the first pair. */
const B_VARIANTS = [
  { pair: '1', pairSpoken: '1' },
  ...LETTERS.map((l, i) => ({ pair: `${i + 1}, ${l}`, pairSpoken: `${i + 1}, ${l}.` })),
];

/** Timing shared by both parts (build doc §T8): 5 s → "Please keep going"; lost → last correct; 15 s → discontinue. */
const STALL = {
  stallMs: 5_000,
  keepGoingLine: 'keepGoing',
  lostMs: 5_000,
  discontinueMs: 15_000,
  // "Discontinue, reason code 995–998": 996 (cognitive/behavioral) until the exit flow lets a person choose (T8-6).
  discontinueReasonCode: 996,
  // Self-corrections come "within ~1 s"; 800 ms + ~300 ms transcription stays inside the 1.2-s budget.
  graceMs: 800,
  correctionBudgetMs: 1_200,
  correctionStartLine: 'correctionStart',
} as const;

const PRETEST_WINDOW: WindowConfig = {
  maxMs: 30_000,
  closeOn: ['participant_done', 'silence'],
  silenceCloseMs: 3_000,
  silenceAfterSpeechOnly: true,
  noSpeechCloseMs: 10_000,
  prompts: [],
  // Close once A–L has been said.
  countClose: { judge: 'trails-pretest', atLeast: 12 },
};

const PRACTICE_WINDOW: WindowConfig = {
  maxMs: 20_000,
  closeOn: ['participant_done', 'silence'],
  silenceCloseMs: 3_000,
  silenceAfterSpeechOnly: true,
  noSpeechCloseMs: 10_000,
  prompts: [],
  countClose: { judge: 'trails-practice', atLeast: 7 },
};

export const oralTrailsSpec = defineTestSpec({
  testId: 'oral-trails',
  specVersion: '2.0.0',
  title: 'Oral Trail Making',
  domains: ['ATT', 'EXE'],
  source: { document: 'NACC UDSv4 C2T (Jan 2025, rev. 2025-12-10)', pages: '40–43' },
  // Remembrance-original wording (owner decision 2026-10-01: no content marked as
  // needing permission). Same task, timing, branches and correction logic as
  // C2T (DEVIATIONS L-1). Letters are spelled out for the voice ("ay", "bee").
  lines: [
    { key: 'aIntro', text: "Here's something different. Please count out loud from 1 to 25 as fast as you can: 1, 2, 3, and so on. Ready? Go." },
    { key: 'aCorrection', text: "You were at '{{last}}.' Carry on from there.", ttsText: 'You were at {{lastSpoken}}. Carry on from there.' },
    { key: 'correctionStart', text: 'Start with {{first}}.' },
    { key: 'keepGoing', text: 'Please keep going.' },
    { key: 'pretest', text: 'Please say the alphabet for me, starting from A.', ttsText: 'Please say the alphabet for me, starting from ay.' },
    {
      key: 'bIntro',
      text: "Now let's mix numbers and letters. Go back and forth, a number and then a letter: 1, A, 2, B, and so on, as fast as you can. First a short practice: go up to the number 4, switching between numbers and letters. Ready? Go.",
      ttsText: "Now let's mix numbers and letters. Go back and forth, a number and then a letter: 1, ay, 2, bee, and so on, as fast as you can. First a short practice: go up to the number 4, switching between numbers and letters. Ready? Go.",
    },
    { key: 'bPracticeWrong', text: 'Not quite. It goes 1, A, 2, B, 3, C, 4.', ttsText: 'Not quite. It goes 1, ay, 2, bee, 3, see, 4.' },
    { key: 'bPracticeAgain', text: "Let's try that again. Go up to the number 4, switching between numbers and letters. Ready? Go." },
    {
      key: 'bGo',
      text: 'Now for real. Switch between numbers and letters, 1, A, 2, B, 3, C, and keep going until you reach 13. Ready? Go.',
      ttsText: 'Now for real. Switch between numbers and letters, 1, ay, 2, bee, 3, see, and keep going until you reach 13. Ready? Go.',
    },
    { key: 'bCorrection', text: "You were at '{{pair}}.' Carry on from there.", ttsText: 'You were at {{pairSpoken}} Carry on from there.' },
  ],
  steps: [
    { key: 'aIntro', type: 'say', zone: 'protocol', line: 'aIntro' },
    {
      key: 'partA',
      type: 'sequenceTask',
      zone: 'protocol',
      sequence: 'partA',
      decoder: 'trails-a',
      maxMs: 100_000,
      correctionLine: 'aCorrection',
      correctionVariants: A_VARIANTS,
      ...STALL,
    },
    // Pre-test (chrome): 0 errors → continue; 1–2 → say it again; ≥3, or any error the second time → Part B not given (997).
    { key: 'pretestAsk', type: 'say', zone: 'chrome', line: 'pretest' },
    {
      key: 'pretest',
      type: 'practice',
      zone: 'chrome',
      item: 'a-b-c-d-e-f-g-h-i-j-k-l',
      judge: 'trails-pretest',
      attempts: 2,
      retryLine: 'pretest',
      failGate: { skipTo: null, reasonCode: 997, failOnTag: 'fail' },
      window: PRETEST_WINDOW,
    },
    { key: 'bIntro', type: 'say', zone: 'protocol', line: 'bIntro' },
    // Practice (chrome): up to 3 attempts, the scripted correction after each miss; still wrong → Part B not given.
    {
      key: 'bPractice',
      type: 'practice',
      zone: 'chrome',
      item: '1-a-2-b-3-c-4',
      judge: 'trails-practice',
      attempts: 3,
      feedbackEachAttempt: true,
      onIncorrect: 'bPracticeWrong',
      retryLine: 'bPracticeAgain',
      failGate: { skipTo: null, reasonCode: 996 },
      window: PRACTICE_WINDOW,
    },
    { key: 'bGo', type: 'say', zone: 'protocol', line: 'bGo' },
    {
      key: 'partB',
      type: 'sequenceTask',
      zone: 'protocol',
      sequence: 'partB',
      decoder: 'trails-b',
      maxMs: 300_000,
      correctionLine: 'bCorrection',
      correctionVariants: B_VARIANTS,
      ...STALL,
    },
  ],
  // An interrupted part restarts with a fresh timer; the interruption is flagged (T8-5).
  onInterrupt: 'restart_step',
  // NACC C2T codes for Oral Trails aren't in the source manual (T8 README); internal keys until mapped.
  naccFields: {},
  scorerId: 'oral-trails',
});

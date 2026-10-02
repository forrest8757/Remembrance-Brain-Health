// T3 Number Span Forward & Backward (C2T pp. 24–26). Task, timing and rules
// follow docs/build-prompts.md §T3; the wording is Remembrance-original; see ./README.md for the restated spec,
// ambiguities and deviations.
import { defineTestSpec, type WindowConfig } from '../../schema';

/**
 * Response window (T3 "Response window"): opens after the last digit; closes
 * 3 s after the participant stops speaking, or at 10 s if they never speak.
 * The 30 s hard cap is a safety net the source doesn't specify (DEVIATIONS T3-2).
 */
const WINDOW: WindowConfig = {
  maxMs: 30_000,
  closeOn: ['participant_done', 'silence'],
  silenceCloseMs: 3_000,
  silenceAfterSpeechOnly: true,
  noSpeechCloseMs: 10_000,
  prompts: [],
  onRepeatRequest: { line: 'doBest', maxCount: 1 },
};

export const numberSpanSpec = defineTestSpec({
  testId: 'number-span',
  specVersion: '2.0.0',
  title: 'Number Span Forward & Backward',
  domains: ['ATT', 'EXE'],
  source: { document: 'NACC UDSv4 C2T (Jan 2025, rev. 2025-12-10)', pages: '24–26' },
  // Remembrance-original wording (owner decision 2026-10-01: no content marked as
  // needing permission; the NACC manual's scripts are "reproduced by permission").
  // Same task, timing and rules as C2T; examples are our own (DEVIATIONS L-1).
  lines: [
    {
      key: 'fwdIntro',
      text: "Next, I'll say some numbers, and I'd like you to say them back to me. Please wait until I've finished, then say them in the same order. For example, if I say 6–1–4, you'd say 6–1–4. Let's try one. If I say 3–9–5, what would you say?",
      ttsText: "Next, I'll say some numbers, and I'd like you to say them back to me. Please wait until I've finished, then say them in the same order. For example, if I say 6, 1, 4, you'd say 6, 1, 4. Let's try one. If I say 3, 9, 5, what would you say?",
    },
    { key: 'fwdFeedback', text: 'That one would be 3–9–5.', ttsText: 'That one would be 3, 9, 5.' },
    { key: 'fwdOnly', text: 'From now on, just say the numbers back to me each time.' },
    { key: 'ready', text: 'Ready?' },
    {
      key: 'bwdIntro',
      text: "This time, I'll say some numbers, and I'd like you to say them back in reverse order, starting with the last number. Please wait until I've finished. For example, if I say 4–9–2, you'd say 2–9–4. Let's try one. If I say 7–1–5, what would you say?",
      ttsText: "This time, I'll say some numbers, and I'd like you to say them back in reverse order, starting with the last number. Please wait until I've finished. For example, if I say 4, 9, 2, you'd say 2, 9, 4. Let's try one. If I say 7, 1, 5, what would you say?",
    },
    { key: 'bwdFeedback', text: 'That one would be 5–1–7.', ttsText: 'That one would be 5, 1, 7.' },
    { key: 'bwdOnly', text: 'From now on, just say the numbers back to me in reverse order each time.' },
    { key: 'bwdReminder', text: 'Remember, say the numbers in reverse order, starting with the last one. Ready?' },
    { key: 'doBest', text: 'Just do your best.' },
  ],
  steps: [
    { key: 'fwdIntro', type: 'say', zone: 'protocol', line: 'fwdIntro' },
    { key: 'fwdPractice', type: 'practice', zone: 'chrome', item: '3-9-5', judge: 'span-forward', onIncorrect: 'fwdFeedback', window: WINDOW },
    { key: 'fwdOnly', type: 'say', zone: 'protocol', line: 'fwdOnly' },
    {
      key: 'forward',
      type: 'trials',
      zone: 'protocol',
      items: 'forward',
      groupSize: 2,
      readyLine: 'ready',
      rateMs: 1_000,
      interItemMs: 700,
      judge: 'span-forward',
      discontinue: { type: 'allFailedInGroup' },
      window: WINDOW,
    },
    { key: 'switchBreak', type: 'break', zone: 'chrome', message: 'Nice. A slightly different one next.' },
    { key: 'bwdIntro', type: 'say', zone: 'protocol', line: 'bwdIntro' },
    { key: 'bwdPractice', type: 'practice', zone: 'chrome', item: '7-1-5', judge: 'span-backward', onIncorrect: 'bwdFeedback', window: WINDOW },
    { key: 'bwdOnly', type: 'say', zone: 'protocol', line: 'bwdOnly' },
    {
      key: 'backward',
      type: 'trials',
      zone: 'protocol',
      items: 'backward',
      groupSize: 2,
      readyLine: 'ready',
      rateMs: 1_000,
      interItemMs: 700,
      judge: 'span-backward',
      discontinue: { type: 'allFailedInGroup' },
      reminder: { line: 'bwdReminder', whenTag: 'forward_order', beforeItemIndex: 2, maxUses: 1 },
      window: WINDOW,
    },
  ],
  onInterrupt: 'restart_step',
  naccFields: { forwardTotal: 'C2T Q5a', forwardLongest: 'C2T Q5b', backwardTotal: 'C2T Q6a', backwardLongest: 'C2T Q6b' },
  scorerId: 'number-span',
});

// T1 MoCA-Blind (C2T pp. 14–18). Scripts are verbatim from
// docs/build-prompts.md §T1; lines the source doesn't script are marked
// AUTHORED and listed in ./README.md. Decisions: docs/decisions.md.
import { defineTestSpec, type WindowConfig } from '../../schema';

/** Follow-up phrases for an incomplete date, in the prompt's order ("year, month, exact date, and day of the week"). */
const DATE_PARTS = ['year', 'month', 'exact date', 'day of the week'];
const list = (parts: string[]) =>
  parts.length <= 1 ? parts.join('') : parts.length === 2 ? `${parts[0]} and ${parts[1]}` : `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
export const MOCA_MISSING_PHRASES = Array.from({ length: 15 }, (_, k) => list(DATE_PARTS.filter((_, i) => (k + 1) & (1 << i))));

/** Word-list recall: done, 10 s silence after the last word (spec's proposal), or 15 s with no speech. */
const RECALL: WindowConfig = {
  maxMs: 90_000,
  closeOn: ['participant_done', 'silence'],
  silenceCloseMs: 10_000,
  silenceAfterSpeechOnly: true,
  noSpeechCloseMs: 15_000,
  prompts: [],
};
/** Short answers (digits, sentences): as T3. */
const SHORT: WindowConfig = { ...RECALL, maxMs: 30_000, silenceCloseMs: 3_000, noSpeechCloseMs: 10_000 };
/** Spoken explanations (abstraction, orientation, cues): 5 s after speech, 15 s with none. */
const ANSWER: WindowConfig = { ...RECALL, maxMs: 45_000, silenceCloseMs: 5_000, noSpeechCloseMs: 15_000 };

export const mocaSpec = defineTestSpec({
  testId: 'moca-blind',
  specVersion: '1.0.0',
  title: 'MoCA-Blind',
  domains: ['ATT', 'MEM', 'LANG', 'EXE', 'ORI'],
  source: { document: 'NACC UDSv4 C2T (Jan 2025, rev. 2025-12-10)', pages: '14–18' },
  lines: [
    // 1. Memory (registration)
    {
      key: 'memIntro',
      text: "This is a memory test. I am going to read a list of words that you will have to remember now and later on. Listen carefully. When I am through, tell me as many words as you can remember. It doesn't matter in what order you say them.",
      repeatable: true,
    },
    { key: 'memTrial2', text: 'I am going to read the same list for a second time. Try to remember and tell me as many words as you can, including words you said the first time.', repeatable: true },
    { key: 'memLater', text: 'I will ask you to recall those words again at the end of the test.' },
    // 2. Attention
    { key: 'digitsFwdIntro', text: 'I am going to say some numbers and when I am through, repeat them to me exactly as I said them.', repeatable: true },
    { key: 'digitsBwdIntro', text: 'Now I am going to say some more numbers, but when I am through you must repeat them to me in the backwards order.', repeatable: true },
    { key: 'vigIntro', text: 'I am going to read a sequence of letters. Every time I say the letter A, tap your hand once. If I say a different letter, do not tap your hand.', repeatable: true },
    { key: 'tapCheck', text: "Let's make sure your taps come through. Please tap once now." }, // AUTHORED (spec: "tap once now")
    { key: 'tapCheckAgain', text: 'Please tap once more.' }, // AUTHORED
    {
      key: 'serialIntro',
      text: 'Now I will ask you to count by subtracting seven from {{serialStart}}, and then, keep subtracting seven from your answer until I tell you to stop.',
      repeatable: true, // "Give the instructions twice if necessary."
    },
    { key: 'stop', text: 'Stop.' },
    // 3. Sentence repetition (the sentences themselves are form stimuli, never captioned)
    { key: 'sentence1Intro', text: 'I am going to read you a sentence. Repeat it after me, exactly as I say it.', repeatable: true },
    { key: 'sentence2Intro', text: 'Now I am going to read you another sentence. Repeat it after me, exactly as I say it.', repeatable: true },
    // 4. Verbal fluency (letter)
    {
      key: 'fluencyIntro',
      text: 'Tell me as many words as you can think of that begin with a certain letter of the alphabet that I will tell you in a moment. You can say any kind of word you want, except for proper nouns (like Bob or Boston), numbers, or words that begin with the same sound but have a different suffix, for example, love, lover, loving. I will tell you to stop after one minute. Are you ready?',
      repeatable: true,
    },
    // Phone adaptation ("The letter F, like fox.") used on both channels.
    { key: 'fluencyGo', text: 'Now, tell me as many words as you can think of that begin with the letter {{fluencyLetter}}. The letter {{fluencyLetter}}, like {{fluencyExample}}.' },
    // 5. Abstraction
    { key: 'absPractice', text: 'Tell me how {{abstractionPractice}} are alike.' },
    { key: 'absRetry', text: 'Tell me another way in which those items are alike.' },
    { key: 'absFruit', text: 'Yes, and they are also both fruit.' },
    { key: 'abs1', text: 'Now, tell me how {{abstraction1}} are alike.' },
    { key: 'abs2', text: 'Now tell me how {{abstraction2}} are alike.' },
    // 6. Delayed recall
    { key: 'delayedIntro', text: 'I read some words to you earlier, which I asked you to remember. Tell me as many of those words as you can remember.' },
    { key: 'cue', text: "Here's a hint: one of the words was {{cue}}.", caption: false }, // AUTHORED frame; cue text from the form
    { key: 'choice', text: 'Which of the following words do you think it was, {{choices}}?', caption: false },
    // 7. Orientation
    { key: 'dateQ', text: 'Tell me the date today.' },
    { key: 'dateMissing', text: 'Tell me the {{missing}}.' },
    { key: 'placeQ', text: 'Now, tell me the name of this place, and which city it is in.' },
  ],
  steps: [
    {
      key: 'howItWorks',
      type: 'break',
      zone: 'chrome',
      title: 'How this works',
      message: "You'll hear my voice. Just talk to me naturally. There are no trick questions.",
      cta: "I'm ready",
    },
    // 1. Memory: two trials always, even if trial 1 is perfect.
    { key: 'memIntro', type: 'say', zone: 'protocol', line: 'memIntro' },
    { key: 'words1', type: 'present', zone: 'protocol', stimulus: 'words', rateMs: 1_500 },
    { key: 'registration1', type: 'respond', zone: 'protocol', ...RECALL, judge: 'moca-registration', expected: 'words' },
    { key: 'memTrial2', type: 'say', zone: 'protocol', line: 'memTrial2' },
    // Misheard words (e.g. "vase" for "face") are enunciated more clearly in trial 2.
    { key: 'words2', type: 'present', zone: 'protocol', stimulus: 'words', rateMs: 1_500, emphasizeFrom: 'registration1' },
    { key: 'registration2', type: 'respond', zone: 'protocol', ...RECALL, judge: 'moca-registration', expected: 'words' },
    { key: 'memLater', type: 'say', zone: 'protocol', line: 'memLater' },
    // 2. Attention
    { key: 'digitsFwdIntro', type: 'say', zone: 'protocol', line: 'digitsFwdIntro' },
    { key: 'digitsFwd', type: 'present', zone: 'protocol', stimulus: 'digitsForward', index: 0, rateMs: 1_000 },
    { key: 'digitsForward', type: 'respond', zone: 'protocol', ...SHORT },
    { key: 'digitsBwdIntro', type: 'say', zone: 'protocol', line: 'digitsBwdIntro' },
    { key: 'digitsBwd', type: 'present', zone: 'protocol', stimulus: 'digitsBackward', index: 0, rateMs: 1_000 },
    { key: 'digitsBackward', type: 'respond', zone: 'protocol', ...SHORT },
    { key: 'vigIntro', type: 'say', zone: 'protocol', line: 'vigIntro' },
    {
      key: 'vigilance',
      type: 'tapTask',
      zone: 'protocol',
      stimulus: 'letters',
      index: 0,
      rateMs: 2_000,
      checkLine: 'tapCheck',
      checkRetryLine: 'tapCheckAgain',
      checkTimeoutMs: 8_000,
      undetectableReasonCode: 97, // D11: taps undetectable → not administered
    },
    { key: 'serialIntro', type: 'say', zone: 'protocol', line: 'serialIntro' },
    {
      key: 'serial7',
      type: 'respond',
      zone: 'protocol',
      ...RECALL,
      noSpeechCloseMs: 20_000,
      // "Stop after 5 responses": live count from the streaming transcript.
      countClose: { judge: 'moca-serial-count', atLeast: 5, line: 'stop' },
    },
    // 3. Sentence repetition
    { key: 'sentence1Intro', type: 'say', zone: 'protocol', line: 'sentence1Intro' },
    { key: 'sentence1Read', type: 'present', zone: 'protocol', stimulus: 'sentences', index: 0, rateMs: 1_000 },
    { key: 'sentence1', type: 'respond', zone: 'protocol', ...SHORT },
    { key: 'sentence2Intro', type: 'say', zone: 'protocol', line: 'sentence2Intro' },
    { key: 'sentence2Read', type: 'present', zone: 'protocol', stimulus: 'sentences', index: 1, rateMs: 1_000 },
    { key: 'sentence2', type: 'respond', zone: 'protocol', ...SHORT },
    // 4. Letter fluency: exactly 60 s, then "Stop."
    { key: 'fluencyIntro', type: 'say', zone: 'protocol', line: 'fluencyIntro' },
    { key: 'fluencyGo', type: 'say', zone: 'protocol', line: 'fluencyGo' },
    { key: 'fluency', type: 'respond', zone: 'protocol', maxMs: 60_000, closeOn: [], timeoutLine: 'stop' },
    // 5. Abstraction
    { key: 'absPracticeQ', type: 'say', zone: 'protocol', line: 'absPractice' },
    { key: 'absPractice', type: 'practice', zone: 'chrome', item: 'fruit', judge: 'moca-abstraction-practice', retryLine: 'absRetry', onIncorrect: 'absFruit', window: ANSWER },
    { key: 'abs1Q', type: 'say', zone: 'protocol', line: 'abs1' },
    { key: 'abstraction1', type: 'respond', zone: 'protocol', ...ANSWER },
    { key: 'abs2Q', type: 'say', zone: 'protocol', line: 'abs2' },
    { key: 'abstraction2', type: 'respond', zone: 'protocol', ...ANSWER },
    // 6. Delayed recall: free, then category cue, then multiple choice for missed words only.
    { key: 'delayedIntro', type: 'say', zone: 'protocol', line: 'delayedIntro' },
    { key: 'delayedFree', type: 'respond', zone: 'protocol', ...RECALL, judge: 'moca-free-recall', expected: 'words' },
    {
      key: 'delayedCues',
      type: 'cuedRecall',
      zone: 'protocol',
      words: 'words',
      cues: 'cues',
      choices: 'choices',
      freeRecallStep: 'delayedFree',
      cueLine: 'cue',
      choiceLine: 'choice',
      judge: 'moca-cued-word',
      window: ANSWER,
    },
    // 7. Orientation
    { key: 'dateQ', type: 'say', zone: 'protocol', line: 'dateQ' },
    {
      key: 'orientDate',
      type: 'respond',
      zone: 'protocol',
      ...ANSWER,
      judge: 'moca-orientation-date',
      followUp: { whenTag: 'incomplete', line: 'dateMissing', variants: { missing: MOCA_MISSING_PHRASES } },
    },
    { key: 'placeQ', type: 'say', zone: 'protocol', line: 'placeQ' },
    { key: 'orientPlace', type: 'respond', zone: 'protocol', ...ANSWER },
  ],
  onInterrupt: 'restart_step',
  naccFields: {
    total: 'C2T Q1d',
    digits: 'C2T Q1e',
    vigilance: 'C2T Q1f',
    serial7: 'C2T Q1g',
    sentences: 'C2T Q1h',
    fluency: 'C2T Q1i',
    abstraction: 'C2T Q1j',
    delayedFree: 'C2T Q1k',
    delayedCategory: 'C2T Q1l',
    delayedChoice: 'C2T Q1m',
    orientDate: 'C2T Q1n',
    orientMonth: 'C2T Q1o',
    orientYear: 'C2T Q1p',
    orientDay: 'C2T Q1q',
    orientPlace: 'C2T Q1r',
    orientCity: 'C2T Q1s',
  },
  requiresPermission: 'MoCA (registered trademark; license agreement with MoCA Cognition)',
  scorerId: 'moca-blind',
});

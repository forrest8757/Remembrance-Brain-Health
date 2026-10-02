// T7 Phonemic (letter) Fluency (C2T pp. 48–52). Task, timing, prompts and
// scoring rules follow docs/build-prompts.md §T7; all wording is
// Remembrance-original (the C2T script needs permission). See ./README.md.
import { defineTestSpec, type WindowConfig } from '../../schema';

/**
 * One 60-s letter trial: exactly 60 s, then "Stop." Prompts (all logged):
 * 15-s pauses → "Keep going." then "Can you think of any more words…?"
 * (once each, in that order); 3 wrong-letter words in a row → "Remember, the
 * letter is …" (once); 3 violations of the same rule in a row → that
 * rule's reminder (once per rule).
 */
const trial = (letter: string, whatOther: string, using: string): WindowConfig => ({
  maxMs: 60_000,
  closeOn: [],
  silenceAfterSpeechOnly: false,
  prompts: [
    { key: 'keepGoing', trigger: { type: 'silence', ms: 15_000 }, line: 'keepGoing', maxCount: 1 },
    { key: 'whatOther', trigger: { type: 'silence', ms: 15_000 }, line: whatOther, maxCount: 1 },
    { key: 'usingLetter', trigger: { type: 'phrase', detector: 'phonemic-wrong-letter', expected: letter }, line: using, maxCount: 1 },
    { key: 'remindNames', trigger: { type: 'phrase', detector: 'phonemic-rule-name', expected: letter }, line: 'remindNames', maxCount: 1 },
    { key: 'remindNumbers', trigger: { type: 'phrase', detector: 'phonemic-rule-number', expected: letter }, line: 'remindNumbers', maxCount: 1 },
    { key: 'remindEndings', trigger: { type: 'phrase', detector: 'phonemic-rule-variant', expected: letter }, line: 'remindEndings', maxCount: 1 },
  ],
  timeoutLine: 'stop',
});

export const phonemicFluencySpec = defineTestSpec({
  testId: 'phonemic-fluency',
  specVersion: '2.0.0',
  title: 'Phonemic (Letter) Fluency',
  domains: ['EXE', 'LANG'],
  source: { document: 'NACC UDSv4 C2T (Jan 2025, rev. 2025-12-10)', pages: '48–52' },
  // Remembrance-original wording and examples: the C2T phonemic fluency script
  // needs the author's permission (build doc §3b), which we don't use without
  // the owner's say-so (decision 2026-10-01). Same task, timing, prompts and rules.
  lines: [
    {
      key: 'intro',
      text: "In this activity, I'll give you a letter. When I say go, name as many words as you can that start with that letter. You'll have one minute, and I'll tell you when to stop. Please don't use numbers, or the names of people or places. For example, for the letter T you could say table, tiny, or tomorrow, but not Tom, Texas, or twenty. And please don't give the same word with a different ending: if you say talk, don't also say talks or talked, and if you say tall, don't also say taller or tallest.",
      ttsText: "In this activity, I'll give you a letter. When I say go, name as many words as you can that start with that letter. You'll have one minute, and I'll tell you when to stop. Please don't use numbers, or the names of people or places. For example, for the letter tee you could say table, tiny, or tomorrow, but not Tom, Texas, or twenty. And please don't give the same word with a different ending: if you say talk, don't also say talks or talked, and if you say tall, don't also say taller or tallest.",
    },
    { key: 'firstGo', text: 'Your first letter is {{firstLetter}}, as in {{firstExample}}. Ready? Go.', ttsText: 'Your first letter is {{firstLetterSpoken}}, as in {{firstExample}}. Ready? Go.' },
    { key: 'secondGo', text: 'Now a new letter. Your next letter is {{secondLetter}}, as in {{secondExample}}. Ready? Go.', ttsText: 'Now a new letter. Your next letter is {{secondLetterSpoken}}, as in {{secondExample}}. Ready? Go.' },
    { key: 'keepGoing', text: 'Keep going.' },
    { key: 'whatOtherFirst', text: 'Can you think of any more words that start with {{firstLetter}}?', ttsText: 'Can you think of any more words that start with {{firstLetterSpoken}}?' },
    { key: 'whatOtherSecond', text: 'Can you think of any more words that start with {{secondLetter}}?', ttsText: 'Can you think of any more words that start with {{secondLetterSpoken}}?' },
    { key: 'usingFirst', text: 'Remember, the letter is {{firstLetter}}.', ttsText: 'Remember, the letter is {{firstLetterSpoken}}.' },
    { key: 'usingSecond', text: 'Remember, the letter is {{secondLetter}}.', ttsText: 'Remember, the letter is {{secondLetterSpoken}}.' },
    // Rule reminders, one per rule (owner-approved 2026-10-01).
    { key: 'remindNames', text: 'Remember, no names of people or places.' },
    { key: 'remindNumbers', text: 'Remember, no numbers.' },
    { key: 'remindEndings', text: 'Remember, try not to give me the same word with different endings.' },
    { key: 'stop', text: 'Stop.' },
  ],
  steps: [
    { key: 'intro', type: 'say', zone: 'protocol', line: 'intro' },
    { key: 'firstGo', type: 'say', zone: 'protocol', line: 'firstGo' },
    { key: 'first', type: 'respond', zone: 'protocol', cue: '{{firstLetter}}', ...trial('{{firstLetter}}', 'whatOtherFirst', 'usingFirst') },
    { key: 'secondGo', type: 'say', zone: 'protocol', line: 'secondGo' },
    { key: 'second', type: 'respond', zone: 'protocol', cue: '{{secondLetter}}', ...trial('{{secondLetter}}', 'whatOtherSecond', 'usingSecond') },
  ],
  onInterrupt: 'restart_step',
  naccFields: {
    firstCorrect: 'C2T Q10a', firstRepetitions: 'C2T Q10b', firstViolations: 'C2T Q10c',
    secondCorrect: 'C2T Q10d', secondRepetitions: 'C2T Q10e', secondViolations: 'C2T Q10f',
    totalCorrect: 'C2T Q10g', totalRepetitions: 'C2T Q10h', totalViolations: 'C2T Q10i',
  },
  scorerId: 'phonemic-fluency',
});

// T6 Category Fluency (C2T pp. 32–36). Task, timing, prompts and practice codes
// follow docs/build-prompts.md §T6; the wording is Remembrance-original
// (DEVIATIONS L-1, T6-1). See ./README.md.
import { defineTestSpec, type WindowConfig } from '../../schema';

/** Practice: up to 20 s for two responses (closes at two, or on "I'm finished"). */
const PRACTICE_WINDOW: WindowConfig = {
  maxMs: 20_000,
  closeOn: ['participant_done'],
  silenceAfterSpeechOnly: false,
  prompts: [],
  countClose: { judge: 'fluency-practice', atLeast: 2 },
};

/**
 * A 60-s trial: exactly 60.0 s, then "Stop." One prompt per trial, on 15 s
 * of silence OR an expression of incapacity (the two rules share the key,
 * so they share the single allowance). "Yes." answers a question about a
 * creditable member ("do birds count?"). The instruction sentence may be
 * repeated if the participant specifically asks.
 */
const trialWindow = (category: string, promptLine: string, repeatLine: string): WindowConfig => ({
  maxMs: 60_000,
  closeOn: [],
  silenceAfterSpeechOnly: false,
  prompts: [
    { key: 'tellMe', trigger: { type: 'silence', ms: 15_000 }, line: promptLine, maxCount: 1 },
    { key: 'tellMe', trigger: { type: 'phrase', detector: 'fluency-incapacity' }, line: promptLine, maxCount: 1 },
    { key: 'yes', trigger: { type: 'phrase', detector: 'fluency-question', expected: category }, line: 'yes', maxCount: 3 },
  ],
  onRepeatRequest: { line: repeatLine, maxCount: 1 },
  timeoutLine: 'stop',
});

export const categoryFluencySpec = defineTestSpec({
  testId: 'category-fluency',
  specVersion: '2.0.0',
  title: 'Category Fluency',
  domains: ['LANG', 'EXE'],
  source: { document: 'NACC UDSv4 C2T (Jan 2025, rev. 2025-12-10)', pages: '32–36' },
  // Remembrance-original wording and examples (owner decision 2026-10-01: no
  // content marked as needing permission). Same task, timing, prompts and
  // practice codes as C2T (DEVIATIONS L-1).
  lines: [
    {
      key: 'practiceIntro',
      text: "In this activity, I'll name a category, and you'll tell me as many things that belong to it as you can, as fast as you can. For example, for clothing you could say sock, jacket, or belt. Can you name a couple of other kinds of clothing?",
    },
    // Practice feedback, one per code (build doc §T6 table), without echoing the participant's words.
    { key: 'pCode0', text: 'Some others would be a scarf or a sweater.' },
    { key: 'pCode1one', text: "That one isn't a kind of clothing. Some others would be a scarf or a sweater." },
    { key: 'pCode1many', text: "Those aren't kinds of clothing. Some others would be a scarf or a sweater." },
    { key: 'pCode2', text: "That's right. A scarf or a sweater would work too." },
    { key: 'pCode3', text: 'Some of those are clothing, but not all of them. A scarf or a sweater would work too.' },
    { key: 'pCode4', text: "That's right." },
    { key: 'animalsGo', text: "Now for real. Your category is animals. You'll have one minute. Name as many animals as you can. Ready? Go." },
    { key: 'animalsPrompt', text: 'Any other animals you can think of?' },
    { key: 'animalsRepeat', text: 'Name as many animals as you can in one minute.' },
    {
      key: 'secondGo',
      text: "Here's another category: {{categoryTitle}}. You'll have one minute again. Name as many {{categoryPlural}} as you can. Ready? Go.",
    },
    { key: 'secondPrompt', text: 'Any other {{categoryPlural}} you can think of?' },
    { key: 'secondRepeat', text: 'Name as many {{categoryPlural}} as you can in one minute.' },
    { key: 'yes', text: 'Yes.' },
    { key: 'stop', text: 'Stop.' },
  ],
  steps: [
    { key: 'practiceIntro', type: 'say', zone: 'protocol', line: 'practiceIntro' },
    {
      key: 'practice',
      type: 'practice',
      zone: 'chrome',
      item: 'clothing',
      judge: 'fluency-practice',
      feedback: { code0: 'pCode0', code1one: 'pCode1one', code1many: 'pCode1many', code2: 'pCode2', code3: 'pCode3', code4: 'pCode4' },
      window: PRACTICE_WINDOW,
    },
    { key: 'animalsGo', type: 'say', zone: 'protocol', line: 'animalsGo' },
    { key: 'animals', type: 'respond', zone: 'protocol', ...trialWindow('animals', 'animalsPrompt', 'animalsRepeat') },
    { key: 'secondGo', type: 'say', zone: 'protocol', line: 'secondGo' },
    { key: 'second', type: 'respond', zone: 'protocol', ...trialWindow('{{secondCategory}}', 'secondPrompt', 'secondRepeat') },
  ],
  // An interrupted trial restarts with a fresh 60 s; the interruption is flagged (DEVIATIONS T6-4).
  onInterrupt: 'restart_step',
  // Q9b is the Vegetables count; on Forms B/C the second category is a Remembrance original.
  naccFields: { animals: 'C2T Q9a', secondCategory: 'C2T Q9b' },
  scorerId: 'category-fluency',
});

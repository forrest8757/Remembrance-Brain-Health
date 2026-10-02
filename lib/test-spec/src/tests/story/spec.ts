// T2 Story Recall, immediate and delayed (C2T pp. 19–23, 44–47 structure).
// Craft Story 21 and the C2T wording need permission, so the stories
// (lib/forms story.ts) and all lines here are Remembrance-original
// (CLAUDE.md §8, DEVIATIONS L-1). Two specs, one form: the delayed recall
// always uses the immediate's form, and the battery orchestrator owns the
// ~20-minute delay. See ./README.md.
import { defineTestSpec, type WindowConfig } from '../../schema';

/**
 * Recall window: no time limit or prompts in the source. Closes on "I'm
 * finished" or 20 s of silence after speaking; a 3-minute safety cap (T2-3).
 */
const RECALL: WindowConfig = {
  maxMs: 180_000,
  closeOn: ['participant_done', 'silence'],
  silenceCloseMs: 20_000,
  silenceAfterSpeechOnly: true,
  noSpeechCloseMs: 20_000,
  prompts: [],
};

export const storyImmediateSpec = defineTestSpec({
  testId: 'story-immediate',
  specVersion: '1.0.0',
  title: 'Story Recall (immediate)',
  domains: ['MEM'],
  source: { document: 'NACC UDSv4 C2T (Jan 2025, rev. 2025-12-10), structure only', pages: '19–23' },
  lines: [
    {
      key: 'intro',
      text: "Now I'm going to tell you a short story. Please listen closely. When I've finished, tell me as much of it as you can remember. You can use my words or your own. Here's the story.",
    },
    // The story itself: one continuous narrated clip per form. Never captioned (it's the stimulus), never repeated.
    { key: 'story', text: '{{story}}', caption: false },
    { key: 'recallPrompt', text: 'Now please tell me the story. Try to remember as much as you can.' },
    { key: 'later', text: "I'll ask you about this story again a bit later, so try to keep it in mind." },
  ],
  steps: [
    { key: 'ready', type: 'break', zone: 'chrome', title: 'Ready to listen?', message: "Find a quiet spot. You'll hear a short story once.", cta: "I'm ready" },
    { key: 'intro', type: 'say', zone: 'protocol', line: 'intro' },
    // No repetitions permitted: an interruption during the story invalidates the immediate recall (97).
    { key: 'story', type: 'say', zone: 'protocol', line: 'story', onInterrupt: 'invalidate' },
    { key: 'recallPrompt', type: 'say', zone: 'protocol', line: 'recallPrompt' },
    // An interruption during recall reopens the window; the scorer reads every window of the step together.
    { key: 'recall', type: 'respond', zone: 'protocol', ...RECALL },
    { key: 'later', type: 'say', zone: 'protocol', line: 'later' },
  ],
  onInterrupt: 'restart_step',
  naccFields: { verbatim: 'C2T Q3a', paraphrase: 'C2T Q3b' },
  scorerId: 'story-recall',
});

export const storyDelayedSpec = defineTestSpec({
  testId: 'story-delayed',
  specVersion: '1.0.0',
  title: 'Story Recall (delayed)',
  domains: ['MEM'],
  source: { document: 'NACC UDSv4 C2T (Jan 2025, rev. 2025-12-10), structure only', pages: '44–47' },
  lines: [
    { key: 'intro', text: 'A little while ago, I told you a short story. Please tell me what you remember about it now.' },
    { key: 'cue', text: 'It was a story about {{cueSubject}}. Please tell it to me now.' },
    { key: 'onlyReply', text: 'Just tell me as much of the story as you can remember.' },
  ],
  steps: [
    { key: 'intro', type: 'say', zone: 'protocol', line: 'intro' },
    {
      key: 'recall',
      type: 'respond',
      zone: 'protocol',
      ...RECALL,
      // Doesn't recall the story ("what story?", or 10 s of nothing) → the cue, once (cue needed = 1).
      noSpeechCloseMs: 10_000,
      judge: 'story-delayed-recall',
      followUp: { whenTag: 'no_recall', line: 'cue', variants: {} },
      // A question about the story or a repeat request gets only this reply.
      prompts: [{ key: 'onlyReply', trigger: { type: 'phrase', detector: 'story-question' }, line: 'onlyReply', maxCount: 3 }],
      onRepeatRequest: { line: 'onlyReply', maxCount: 3 },
    },
  ],
  onInterrupt: 'restart_step',
  formsFrom: 'story-immediate',
  naccFields: { verbatim: 'C2T Q8a', paraphrase: 'C2T Q8b', delayMinutes: 'C2T Q8c', cueNeeded: 'C2T Q8d' },
  scorerId: 'story-recall',
});

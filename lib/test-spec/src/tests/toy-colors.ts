// Toy test used to prove the P0 pipeline end to end. Not a clinical
// instrument: it exercises every step type (say, present, respond with a
// silence prompt) so the engine, audio, capture, ASR, forms and scoring
// packages can be tested together.
import { defineTestSpec } from '../schema';

export const toyColorsSpec = defineTestSpec({
  testId: 'toy-colors',
  specVersion: '0.1.0',
  title: 'Say three colors (pipeline toy)',
  domains: ['MEM'],
  source: { document: 'Remembrance P0 foundation prompt', pages: 'n/a' },
  lines: [
    { key: 'intro', text: "Let's try a short practice activity together." },
    {
      key: 'instruction',
      text: 'I am going to say three colors. When I am through, say them back to me.',
      repeatable: true,
      maxRepeats: 1,
    },
    { key: 'yourTurn', text: 'Now, tell me the colors.' },
    { key: 'encourage', text: 'Just do the best you can.' },
    { key: 'thanks', text: 'Thank you.' },
  ],
  steps: [
    { key: 'intro', type: 'say', zone: 'chrome', line: 'intro' },
    { key: 'instruction', type: 'say', zone: 'protocol', line: 'instruction' },
    { key: 'stimuli', type: 'present', zone: 'protocol', stimulus: 'colors', rateMs: 1000 },
    { key: 'yourTurn', type: 'say', zone: 'protocol', line: 'yourTurn' },
    {
      key: 'recall',
      type: 'respond',
      zone: 'protocol',
      maxMs: 20_000,
      closeOn: ['participant_done', 'silence'],
      silenceCloseMs: 10_000,
      prompts: [{ key: 'silence5', trigger: { type: 'silence', ms: 5_000 }, line: 'encourage', maxCount: 1 }],
    },
    { key: 'thanks', type: 'say', zone: 'chrome', line: 'thanks' },
  ],
  naccFields: {},
  scorerId: 'toy-colors',
});

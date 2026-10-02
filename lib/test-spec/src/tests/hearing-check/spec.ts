// P1 hearing screen (build doc §P1 step 4; C2T pp. 7–12 structure). All
// wording is Remembrance-original (CLAUDE.md §8): the questions are played
// by the session shell as yes/no cards; the repetition task runs here.
import { defineTestSpec } from '../../schema';

export const HEARING_SENTENCE = 'The blue cup is on the kitchen table.';

export const hearingCheckSpec = defineTestSpec({
  testId: 'hearing-check',
  specVersion: '1.0.0',
  title: 'Hearing check',
  domains: ['ATT'],
  source: { document: 'NACC UDSv4 C2T (Jan 2025, rev. 2025-12-10), structure only', pages: '7–12' },
  lines: [
    // Spoken by the shell's yes/no cards.
    { key: 'intro', text: 'First, a few quick questions about your hearing, to make sure you can hear me clearly.' },
    { key: 'qTrouble', text: 'Do you often have trouble hearing on a phone or computer?' },
    { key: 'qHearsWell', text: 'Can you hear me clearly right now?' },
    { key: 'qDevice', text: 'Do you use a hearing aid?' },
    { key: 'qDeviceIn', text: 'Is it in and switched on?' },
    // The repetition task.
    { key: 'repeatAsk', text: `Please say this sentence back to me: ${HEARING_SENTENCE}` },
    { key: 'repeatAgain', text: `Once more: ${HEARING_SENTENCE}` },
  ],
  steps: [
    { key: 'repeatAsk', type: 'say', zone: 'chrome', line: 'repeatAsk' },
    {
      key: 'repeat',
      type: 'practice',
      zone: 'chrome',
      item: HEARING_SENTENCE,
      judge: 'hearing-repeat',
      // Two tries: the sentence again after a miss (build doc: "repeat once").
      attempts: 2,
      retryLine: 'repeatAgain',
      // After two misses the shell offers volume/earbuds help and one more round.
      failGate: { skipTo: null, reasonCode: 95 },
      window: {
        maxMs: 15_000,
        closeOn: ['participant_done', 'silence'],
        silenceCloseMs: 2_500,
        silenceAfterSpeechOnly: true,
        noSpeechCloseMs: 8_000,
        prompts: [],
      },
    },
  ],
  onInterrupt: 'restart_step',
  naccFields: {},
  scorerId: 'hearing-check',
});

// Used when no ASR is configured (e.g. the web demo before the API proxy
// exists). Every window reports asrUnavailable, so the administration keeps
// its audio and goes to the review queue (CLAUDE.md §11), never faking a
// transcript.
import { AsrUnavailableError, type AsrProvider, type AsrStream } from '../types';

export class NullAsrProvider implements AsrProvider {
  readonly name = 'none';
  startStream(): AsrStream {
    return {
      write() {},
      onPartial: () => () => {},
      finish: () => Promise.reject(new AsrUnavailableError('No ASR provider configured')),
      abort() {},
    };
  }
}

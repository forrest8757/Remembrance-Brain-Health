// Normalization layer (CLAUDE.md §6): fillers, self-corrections, number
// words ↔ digits, and per-test homophone lexicons. Pure functions; every
// output token keeps the id of the ASR token it came from, so scorers can
// cite evidence.
import type { AsrToken } from './types';

export interface NormalizedToken {
  /** Normalized form (lower-case, digits for numbers). */
  text: string;
  /** Ids of the raw ASR tokens this came from. */
  sourceIds: string[];
  startMs: number;
  endMs: number;
  confidence: number;
}

// "like" is deliberately absent: it is a valid L-word in phonemic fluency.
export const DEFAULT_FILLERS = new Set(['um', 'uh', 'er', 'erm', 'ah', 'hmm', 'mm', 'uhm']);
/** Multi-word fillers, matched before single words. */
export const DEFAULT_FILLER_PHRASES = [['let', "me", 'see'], ["let's", 'see'], ['i', 'think'], ['you', 'know']];
/** Markers that retract the previous response ("drum, no, bell"). */
export const CORRECTION_MARKERS = [['no'], ['i', 'mean'], ['sorry'], ['actually'], ['wait']];

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

export function cleanWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9':]/g, '');
}

export interface NormalizeOptions {
  /** Map heard → intended (e.g. { vase: 'face' } is NOT applied by default; tests opt in). */
  homophones?: Record<string, string>;
  /** Convert number words to digits ("ninety three" → "93"). Default true. */
  numbers?: boolean;
  /** Apply self-corrections ("drum, no, bell" → "bell"). Default true. */
  selfCorrections?: boolean;
  /**
   * Treat each number word as its own digit ("two one eight" → 2 1 8).
   * Use for span tasks where compounds are never intended. Default false.
   */
  digitsOnly?: boolean;
}

function mergeTokens(parts: NormalizedToken[], text: string): NormalizedToken {
  return {
    text,
    sourceIds: parts.flatMap((p) => p.sourceIds),
    startMs: parts[0]!.startMs,
    endMs: parts[parts.length - 1]!.endMs,
    confidence: Math.min(...parts.map((p) => p.confidence)),
  };
}

function matchPhrase(tokens: NormalizedToken[], i: number, phrase: string[]): boolean {
  return phrase.every((w, k) => tokens[i + k]?.text === w);
}

export function normalizeTokens(raw: readonly AsrToken[], opts: NormalizeOptions = {}): NormalizedToken[] {
  let tokens: NormalizedToken[] = raw
    .map((t) => ({ text: cleanWord(t.token), sourceIds: [t.id], startMs: t.startMs, endMs: t.endMs, confidence: t.confidence }))
    .filter((t) => t.text.length > 0);

  // 1. Filler phrases, then single-word fillers.
  const noFillers: NormalizedToken[] = [];
  for (let i = 0; i < tokens.length; ) {
    const phrase = DEFAULT_FILLER_PHRASES.find((p) => matchPhrase(tokens, i, p));
    if (phrase) {
      i += phrase.length;
      continue;
    }
    if (!DEFAULT_FILLERS.has(tokens[i]!.text)) noFillers.push(tokens[i]!);
    i++;
  }
  tokens = noFillers;

  // 2. Self-corrections: a marker drops the response immediately before it.
  if (opts.selfCorrections !== false) {
    const out: NormalizedToken[] = [];
    for (let i = 0; i < tokens.length; ) {
      const marker = CORRECTION_MARKERS.find((m) => matchPhrase(tokens, i, m));
      if (marker && out.length > 0) {
        out.pop();
        i += marker.length;
        continue;
      }
      out.push(tokens[i]!);
      i++;
    }
    tokens = out;
  }

  // 3. Number words → digits.
  if (opts.numbers !== false) {
    const out: NormalizedToken[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]!;
      if (opts.digitsOnly) {
        // "oh" means zero only when digits are expected ("two oh four").
        const digit = t.text === 'oh' ? 0 : ONES[t.text];
        out.push(digit !== undefined && digit < 10 ? { ...t, text: String(digit) } : t);
        continue;
      }
      if (t.text in TENS) {
        const next = tokens[i + 1];
        if (next && next.text in ONES && ONES[next.text]! > 0 && ONES[next.text]! < 10) {
          out.push(mergeTokens([t, next], String(TENS[t.text]! + ONES[next.text]!)));
          i++;
        } else {
          out.push({ ...t, text: String(TENS[t.text]) });
        }
      } else if (t.text in ONES) {
        out.push({ ...t, text: String(ONES[t.text]) });
      } else if (t.text === 'hundred' && out.length > 0 && /^\d$/.test(out[out.length - 1]!.text)) {
        const prev = out.pop()!;
        out.push(mergeTokens([prev, t], String(Number(prev.text) * 100)));
      } else {
        out.push(t);
      }
    }
    tokens = out;
  }

  // 4. Per-test homophone lexicon.
  if (opts.homophones) {
    const lex = opts.homophones;
    tokens = tokens.map((t) => (lex[t.text] ? { ...t, text: lex[t.text]! } : t));
  }
  return tokens;
}

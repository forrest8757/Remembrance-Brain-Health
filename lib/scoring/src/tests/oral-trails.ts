// T8 Oral Trail Making (docs/build-prompts.md §T8): the sequence decoder, the
// pre-test and practice judges, and the scorer.
//
// decodeTrail is used live by the engine's sequenceTask step (to interrupt
// errors in real time) and its event log is what the scorer reads, so the
// corrections a participant heard and the score can't disagree.
import type { Form } from '@workspace/forms';
import { normalizeTokens, type AsrToken } from '@workspace/asr';
import { finalizeScore, type ItemScore, type ReviewReason, type Scorer, type ScoreResult } from '../types';

const SCORER_ID = 'oral-trails';
const SCORER_VERSION = '1.0.0';
const THRESHOLD = 0.6;

// ---- Parsing speech into sequence units ------------------------------------

/** Spoken letter names (and common ASR spellings) → letter. Only A–L matter here. */
const LETTERS: Record<string, string> = {
  a: 'a', ay: 'a',
  b: 'b', bee: 'b', be: 'b',
  c: 'c', see: 'c', sea: 'c', si: 'c',
  d: 'd', dee: 'd',
  e: 'e', ee: 'e',
  f: 'f', ef: 'f', eff: 'f',
  g: 'g', gee: 'g', jee: 'g',
  h: 'h', aitch: 'h', haitch: 'h',
  i: 'i', eye: 'i', aye: 'i',
  j: 'j', jay: 'j',
  k: 'k', kay: 'k',
  l: 'l', el: 'l', elle: 'l', ell: 'l',
  // Past L: single-letter spellings only ("you", "why", "tea" are too often ordinary words).
  m: 'm', n: 'n', o: 'o', p: 'p', pee: 'p', q: 'q', r: 'r', s: 's', t: 't', tee: 't', u: 'u', v: 'v', vee: 'v', w: 'w', x: 'x', y: 'y', z: 'z', zee: 'z', zed: 'z',
};

/** Letters that sound alike over the phone (the "E-set"), plus C. */
const E_SET = new Set(['b', 'c', 'd', 'e', 'g', 'p', 't', 'v', 'z']);

/** "Where was I?" — the participant has lost their place. */
const LOST = [/\bwhere (was|am) i\b/, /\bi('?m| am) lost\b/, /\bi forgot (where|what)\b/, /\bwhat (was|did) i (say|on)\b/, /\blost (my|track)\b/];

export interface TrailUnit {
  unit: string;
  tokenIds: string[];
  startMs: number;
  endMs: number;
  confidence: number;
}

/**
 * Speech → sequence units: numbers ("twenty five" → "25") and letter names
 * ("bee" → "b"); run-together tokens like "4d" split. Everything else is ignored.
 * `letters: false` (Part A) ignores letter names, so "a"/"I" are just words.
 */
export function parseTrailUnits(tokens: readonly AsrToken[], opts: { letters?: boolean } = {}): TrailUnit[] {
  const letters = opts.letters ?? true;
  const split = tokens.flatMap((t) => {
    const parts = t.token.split(/[\s,.-]+/).filter(Boolean);
    return parts.length <= 1 ? [t] : parts.map((p) => ({ ...t, token: p }));
  });
  const out: TrailUnit[] = [];
  for (const n of normalizeTokens(split, { selfCorrections: false })) {
    const base = { tokenIds: n.sourceIds, startMs: n.startMs, endMs: n.endMs, confidence: n.confidence };
    if (/^\d+$/.test(n.text)) out.push({ unit: String(Number(n.text)), ...base });
    else if (/^\d+[a-z]$/.test(n.text) && letters) out.push({ unit: n.text.replace(/[a-z]$/, ''), ...base }, { unit: n.text.slice(-1), ...base });
    else if (/^[a-z]\d+$/.test(n.text) && letters) out.push({ unit: n.text[0]!, ...base }, { unit: n.text.slice(1), ...base });
    else if (letters && LETTERS[n.text]) out.push({ unit: LETTERS[n.text]!, ...base });
  }
  return out;
}

const isLetter = (u: string) => /^[a-z]$/.test(u);
const display = (u: string) => (isLetter(u) ? u.toUpperCase() : u);
/** How a unit is spoken in a correction clip ("A." so the voice says "ay", not "uh"). */
const spoken = (u: string) => (isLetter(u) ? `${u.toUpperCase()}.` : u);

// ---- The live decoder ---------------------------------------------------------

export interface TrailState {
  /** Index of the next expected unit. */
  pos: number;
  /** Units (from the window's unit list) already handled. */
  consumed: number;
  /** After a correction: units the participant may re-say before continuing (re-sync). */
  replayFrom: number;
  /** Ignore speech starting before this (window ms): the correction clip is playing. */
  muteUntilMs: number;
  /** "Where was I?" phrases already acted on. */
  lostPhrases: number;
}

export const initialTrailState: TrailState = { pos: 0, consumed: 0, replayFrom: 0, muteUntilMs: 0, lostPhrases: 0 };

export type TrailEvent =
  | { type: 'progress'; pos: number; unit: string; atMs: number; confidence: number }
  /** Accepted although heard differently (E-set confusion / low confidence): flagged for review. */
  | { type: 'compatible'; pos: number; heard: string; expected: string; atMs: number }
  | { type: 'error'; pos: number; heard: string; expected: string; atMs: number; kind: 'sequencing' | 'setLoss' | 'lost' }
  | { type: 'selfCorrection'; pos: number; heard: string; atMs: number }
  /** A low-confidence mismatch that did NOT trigger a correction (precision over recall). */
  | { type: 'lowConfidence'; pos: number; heard: string; atMs: number }
  | { type: 'keepGoing'; pos: number; atMs: number }
  | { type: 'correction'; pos: number; atMs: number; latencyMs: number | null; line: string; vars: Record<string, string> }
  | { type: 'done'; atMs: number }
  | { type: 'discontinue'; pos: number; atMs: number }
  | { type: 'timeout'; pos: number; atMs: number };

export interface TrailCorrection {
  line: 'correction' | 'correctionStart';
  vars: Record<string, string>;
  /** State to continue from after the clip. */
  state: TrailState;
}

export interface TrailDecode {
  state: TrailState;
  events: TrailEvent[];
  progressed: boolean;
  done: boolean;
  /** A wrong unit is the latest thing heard: wait briefly for a self-correction. */
  pending: { atMs: number } | null;
  /** A confirmed error (or "where was I?"): play this correction now. */
  correct: (TrailCorrection & { errorAtMs: number | null }) | null;
}

export interface TrailOptions {
  /** Part B uses number–letter pairs in corrections ("You said '4, D'"). */
  pairs: boolean;
  /** How long a correction clip blocks the participant's speech (barge-in). */
  muteMs?: number;
  /** Below this, a mismatch never interrupts (logged for review). */
  minConfidence?: number;
}

/**
 * The correction for the current position (build doc §T8, in our wording):
 * Part A "You were at '[n].' Carry on from there."; Part B names the last
 * complete pair ("You were at '4, D.'"). Before anything correct: "Start with 1."
 */
export function trailCorrection(sequence: readonly string[], state: TrailState, opts: TrailOptions, nowMs: number): TrailCorrection {
  const mute = nowMs + (opts.muteMs ?? 2_500);
  const last = state.pos - 1;
  if (last < 0) return { line: 'correctionStart', vars: { first: sequence[0]! }, state: { ...state, replayFrom: 0, muteUntilMs: mute } };
  if (!opts.pairs) {
    const n = sequence[last]!;
    return { line: 'correction', vars: { last: n, lastSpoken: n }, state: { ...state, replayFrom: last, muteUntilMs: mute } };
  }
  // Part B: the last complete pair (number then letter). If the last correct
  // unit is a number, name the pair before it and resume at that number.
  const pairEnd = isLetter(sequence[last]!) ? last : last - 1;
  if (pairEnd < 1) {
    // Only "1" so far: there is no pair to name.
    return { line: 'correction', vars: { pair: '1', pairSpoken: '1' }, state: { ...state, pos: 1, replayFrom: 0, muteUntilMs: mute } };
  }
  const [n, l] = [sequence[pairEnd - 1]!, sequence[pairEnd]!];
  return {
    line: 'correction',
    vars: { pair: `${display(n)}, ${display(l)}`, pairSpoken: `${spoken(n)}, ${spoken(l)}` },
    state: { ...state, pos: pairEnd + 1, replayFrom: pairEnd - 1, muteUntilMs: mute },
  };
}

/**
 * Advance the decoder over the units heard so far. `action`:
 *  - 'decode': new transcript; may report progress, a pending error, or a confirmed error.
 *  - 'commit': the self-correction grace ran out: the pending error stands.
 *  - 'lost': no progress for a while after "Please keep going": give the last correct position (scored as an error).
 */
export function decodeTrail(
  sequence: readonly string[],
  units: readonly TrailUnit[],
  state: TrailState,
  opts: TrailOptions & { action?: 'decode' | 'commit' | 'lost'; nowMs: number; lostPhrases?: number },
): TrailDecode {
  const events: TrailEvent[] = [];
  const minConf = opts.minConfidence ?? 0.5;
  let s = { ...state };
  let progressed = false;

  const error = (heard: string, atMs: number | null, kind: 'sequencing' | 'setLoss' | 'lost'): TrailDecode => {
    events.push({ type: 'error', pos: s.pos, heard, expected: sequence[s.pos] ?? '', atMs: atMs ?? opts.nowMs, kind });
    const c = trailCorrection(sequence, { ...s, consumed: units.length }, opts, opts.nowMs);
    return { state: c.state, events, progressed, done: false, pending: null, correct: { ...c, errorAtMs: atMs } };
  };

  if (opts.action === 'lost') return error('', null, 'lost');

  for (let k = s.consumed; k < units.length; k++) {
    const u = units[k]!;
    if (u.startMs < s.muteUntilMs) {
      s.consumed = k + 1;
      continue;
    }
    const expected = sequence[s.pos];
    if (expected === undefined) break;
    // Re-saying the units named in a correction ("…7, please continue" → "7, 8") is fine.
    if (s.replayFrom < s.pos && u.unit === sequence[s.replayFrom]) {
      s.replayFrom++;
      s.consumed = k + 1;
      continue;
    }
    s.replayFrom = s.pos;
    if (u.unit === expected) {
      events.push({ type: 'progress', pos: s.pos, unit: u.unit, atMs: u.endMs, confidence: u.confidence });
      s = { ...s, pos: s.pos + 1, replayFrom: s.pos + 1, consumed: k + 1 };
      progressed = true;
      if (s.pos >= sequence.length) {
        events.push({ type: 'done', atMs: u.endMs });
        return { state: s, events, progressed, done: true, pending: null, correct: null };
      }
      continue;
    }
    // Repeating the unit just said ("7, 7, 8") isn't an error.
    if (s.pos > 0 && u.unit === sequence[s.pos - 1]) {
      s.consumed = k + 1;
      continue;
    }
    // Phonetically compatible over the phone (E-set letters): accept, flagged.
    if (isLetter(expected) && E_SET.has(expected) && E_SET.has(u.unit) && u.confidence < 0.9) {
      events.push({ type: 'compatible', pos: s.pos, heard: u.unit, expected, atMs: u.endMs });
      events.push({ type: 'progress', pos: s.pos, unit: expected, atMs: u.endMs, confidence: u.confidence });
      s = { ...s, pos: s.pos + 1, replayFrom: s.pos + 1, consumed: k + 1 };
      progressed = true;
      if (s.pos >= sequence.length) {
        events.push({ type: 'done', atMs: u.endMs });
        return { state: s, events, progressed, done: true, pending: null, correct: null };
      }
      continue;
    }
    // A false interruption is worse than a missed error: low confidence never interrupts.
    if (u.confidence < minConf) {
      events.push({ type: 'lowConfidence', pos: s.pos, heard: u.unit, atMs: u.endMs });
      s.consumed = k + 1;
      continue;
    }
    const kind = isLetter(expected) !== isLetter(u.unit) ? 'setLoss' : 'sequencing';
    const next = units[k + 1];
    if (!next) {
      // The wrong unit is the latest word: give the participant a moment to fix it.
      if (opts.action === 'commit') return error(display(u.unit), u.endMs, kind);
      return { state: s, events, progressed, done: false, pending: { atMs: u.endMs }, correct: null };
    }
    if (next.unit === expected) {
      // "3, 5, 4, 5" is a self-correction; "A, 1, B, 2" (a swapped pattern) is not.
      // Decide once we hear what follows the fix (or the grace period ends).
      const after = units[k + 2];
      const continues = after ? after.unit === sequence[s.pos + 1] || after.unit === expected : opts.action === 'commit';
      if (!after && opts.action !== 'commit') return { state: s, events, progressed, done: false, pending: { atMs: next.endMs }, correct: null };
      if (continues) {
        // Fixed before the examiner spoke: logged, not an error (build doc's proposed default).
        events.push({ type: 'selfCorrection', pos: s.pos, heard: display(u.unit), atMs: u.endMs });
        s.consumed = k + 1;
        continue;
      }
      return error(display(u.unit), u.endMs, kind);
    }
    return error(display(u.unit), u.endMs, kind);
  }

  return { state: s, events, progressed, done: false, pending: null, correct: null };
}

/** Count of "where was I?" phrases in the transcript. */
export function countLostPhrases(tokens: readonly AsrToken[]): number {
  const text = normalizeTokens(tokens, { numbers: false, selfCorrections: false })
    .map((t) => t.text)
    .join(' ');
  return LOST.reduce((n, re) => n + (text.match(new RegExp(re.source, 'g'))?.length ?? 0), 0);
}

// ---- Engine adapters -------------------------------------------------------------

interface SequenceJudgeInput {
  expected: string;
  tokens: AsrToken[];
  asrUnavailable: boolean;
  state?: unknown;
  action?: 'decode' | 'commit' | 'lost';
  nowMs?: number;
}

const units = (seq: string) => seq.split('-').filter(Boolean);

function sequenceJudge(pairs: boolean) {
  return ({ expected, tokens, state, action, nowMs }: SequenceJudgeInput) => {
    const seq = units(expected);
    const prev = (state as TrailState | undefined) ?? initialTrailState;
    const lostNow = countLostPhrases(tokens);
    const lostAction = action === 'lost' || (action !== 'commit' && lostNow > prev.lostPhrases);
    const r = decodeTrail(seq, parseTrailUnits(tokens, { letters: pairs }), prev, { pairs, action: lostAction ? 'lost' : (action ?? 'decode'), nowMs: nowMs ?? 0 });
    r.state = { ...r.state, lostPhrases: Math.max(prev.lostPhrases, lostNow) };
    return { correct: null, data: r };
  };
}

/** Pre-test: "the alphabet starting with the letter A", target A–L. */
export function judgeAlphabet(tokens: readonly AsrToken[]): { errors: number; heard: string[] } {
  const target = 'abcdefghijkl'.split('');
  let heard = parseTrailUnits(tokens).map((u) => u.unit).filter(isLetter);
  const lAt = heard.indexOf('l');
  if (lAt >= 0) heard = heard.slice(0, lAt + 1);
  // Edit distance: omissions, insertions, substitutions (a swap counts 2).
  const d = Array.from({ length: heard.length + 1 }, (_, i) => Array.from({ length: target.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= heard.length; i++)
    for (let j = 1; j <= target.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (heard[i - 1] === target[j - 1] ? 0 : 1));
  return { errors: d[heard.length]![target.length]!, heard };
}

/** Part B practice: exactly 1 A 2 B 3 C 4. */
export function judgeTrailPractice(tokens: readonly AsrToken[]): boolean {
  const heard = parseTrailUnits(tokens).map((u) => u.unit);
  return heard.slice(0, 7).join('-') === '1-a-2-b-3-c-4';
}

export const oralTrailsJudges = {
  'trails-a': sequenceJudge(false),
  'trails-b': sequenceJudge(true),
  /** 0 errors → pass; 1–2 → say it again; ≥3 → discontinue Part B. `count` closes the window at L. */
  'trails-pretest': ({ tokens, asrUnavailable }: SequenceJudgeInput) => {
    if (asrUnavailable) return { correct: null, tag: 'unknown', data: { count: 0 } };
    const a = judgeAlphabet(tokens);
    return { correct: a.errors === 0, tag: a.errors === 0 ? 'pass' : a.errors >= 3 ? 'fail' : 'retry', data: { count: a.heard.length, errors: a.errors } };
  },
  'trails-practice': ({ tokens, asrUnavailable }: SequenceJudgeInput) => {
    if (asrUnavailable) return { correct: null, data: { count: 0 } };
    return { correct: judgeTrailPractice(tokens), data: { count: parseTrailUnits(tokens).length } };
  },
};

// ---- Scorer -------------------------------------------------------------------

export interface TrailPartInput {
  /** The live decoder's events for the part's window. */
  events: TrailEvent[];
  /** Closed by finishing, the time cap, a 15-s stall, or not given. */
  outcome: 'done' | 'timeout' | 'discontinued' | 'notAdministered' | 'incomplete';
  asrUnavailable: boolean;
}

export interface OralTrailsInput {
  form: Form;
  partA: TrailPartInput;
  partB: TrailPartInput;
  /** Reason code when Part B wasn't given (pre-test/practice) or a part was discontinued. */
  partBReasonCode: number | null;
  discontinueReasonCode: number;
  practiceAttempts: number | null;
  equated: boolean;
}

/** Maximum time per part (s): the score when not finished in time (build doc §T8). */
export const TRAILS_MAX_S = { A: 100, B: 300 } as const;

function scorePart(prefix: 'partA' | 'partB', part: TrailPartInput, maxS: number, reasonCode: number | null, items: ItemScore[], reasons: ReviewReason[]) {
  const fields: Record<string, number | null> = {};
  if (part.outcome === 'notAdministered' || part.outcome === 'discontinued' || part.outcome === 'incomplete') {
    // Discontinue / not given: the time field holds the reason code; errors and correct are blank.
    fields[`${prefix}Time`] = reasonCode ?? 997;
    fields[`${prefix}Errors`] = null;
    fields[`${prefix}Correct`] = null;
    return fields;
  }
  if (part.asrUnavailable) {
    reasons.push('asr_unavailable');
    fields[`${prefix}Time`] = null;
    fields[`${prefix}Errors`] = null;
    fields[`${prefix}Correct`] = null;
    return fields;
  }
  const ev = part.events;
  const progress = ev.filter((e): e is Extract<TrailEvent, { type: 'progress' }> => e.type === 'progress');
  const errors = ev.filter((e): e is Extract<TrailEvent, { type: 'error' }> => e.type === 'error');
  const done = ev.find((e) => e.type === 'done');
  const correct = new Set(progress.map((p) => p.pos)).size;
  fields[`${prefix}Time`] = part.outcome === 'done' && done ? Math.min(maxS, Math.round(done.atMs / 1000)) : maxS;
  fields[`${prefix}Errors`] = errors.length;
  fields[`${prefix}Correct`] = correct;
  fields[`${prefix}SetLossErrors`] = errors.filter((e) => e.kind === 'setLoss').length;
  fields[`${prefix}SequencingErrors`] = errors.filter((e) => e.kind === 'sequencing').length;
  fields[`${prefix}LostErrors`] = errors.filter((e) => e.kind === 'lost').length;
  fields[`${prefix}SelfCorrections`] = ev.filter((e) => e.type === 'selfCorrection').length;
  fields[`${prefix}KeepGoingPrompts`] = ev.filter((e) => e.type === 'keepGoing').length;
  const latencies = ev.flatMap((e) => (e.type === 'correction' && e.latencyMs !== null ? [e.latencyMs] : []));
  fields[`${prefix}MaxCorrectionLatencyMs`] = latencies.length ? Math.max(...latencies) : null;
  // Hesitations: gaps over 2 s between consecutive correct units.
  const gaps = progress.slice(1).map((p, k) => p.atMs - progress[k]!.atMs);
  fields[`${prefix}Hesitations`] = gaps.filter((g) => g > 2_000).length;

  errors.forEach((e, k) =>
    items.push({ itemKey: `${prefix}.error.${k}`, value: 0, confidence: 1, rationale: `${e.kind} error at position ${e.pos + 1}: heard "${e.heard}" for "${display(e.expected)}"`, evidenceTokenIds: [], scorer: 'auto', scorerVersion: SCORER_VERSION }),
  );
  ev.forEach((e, k) => {
    if (e.type === 'compatible')
      items.push({ itemKey: `${prefix}.compatible.${k}`, value: 1, confidence: 0.5, rationale: `accepted "${e.heard.toUpperCase()}" as "${e.expected.toUpperCase()}" (sounds alike): check the recording`, evidenceTokenIds: [], scorer: 'auto', scorerVersion: SCORER_VERSION });
    if (e.type === 'lowConfidence')
      items.push({ itemKey: `${prefix}.unclear.${k}`, value: 0, confidence: 0.4, rationale: `unclear "${display(e.heard)}" at position ${e.pos + 1} was not corrected: check whether it was an error`, evidenceTokenIds: [], scorer: 'auto', scorerVersion: SCORER_VERSION });
  });
  // Per-transition latencies (Part B): number→letter vs letter→number.
  if (prefix === 'partB') {
    const nl: number[] = [];
    const ln: number[] = [];
    progress.slice(1).forEach((p, k) => ((isLetter(p.unit) ? nl : ln).push(p.atMs - progress[k]!.atMs)));
    const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
    fields.partBNumberToLetterMs = mean(nl);
    fields.partBLetterToNumberMs = mean(ln);
  }
  return fields;
}

export const oralTrailsScorer: Scorer<OralTrailsInput> = {
  scorerId: SCORER_ID,
  scorerVersion: SCORER_VERSION,
  confidenceThreshold: THRESHOLD,

  score(input): ScoreResult {
    const items: ItemScore[] = [];
    const reasons: ReviewReason[] = [];
    const fields: Record<string, number | null> = {
      ...scorePart('partA', input.partA, TRAILS_MAX_S.A, input.discontinueReasonCode, items, reasons),
      ...scorePart('partB', input.partB, TRAILS_MAX_S.B, input.partB.outcome === 'notAdministered' ? input.partBReasonCode : input.discontinueReasonCode, items, reasons),
    };
    fields.partBPracticeAttempts = input.practiceAttempts;
    const a = fields.partATime;
    const b = fields.partBTime;
    // Switching cost (the core EXE marker): only when both parts were finished in time.
    const bothDone = input.partA.outcome === 'done' && input.partB.outcome === 'done' && typeof a === 'number' && typeof b === 'number';
    fields.switchCost = bothDone ? b! - a! : null;
    fields.switchRatio = bothDone && a! > 0 ? Math.round((b! / a!) * 100) / 100 : null;
    return finalizeScore({ testId: SCORER_ID, scorerId: SCORER_ID, scorerVersion: SCORER_VERSION, items, fields, equated: input.equated }, THRESHOLD, [...new Set(reasons)]);
  },
};

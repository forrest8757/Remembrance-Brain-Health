// T7 Phonemic (letter) Fluency judges and scorer (docs/build-prompts.md §T7 "Scoring").
//
// analyzePhonemic is the single source of truth: the live reminder detectors
// and the scorer read speech through it. Every decision carries a rule id for
// audit (build doc: "Every decision stores its rule ID").
//
// The dictionary (Webster's 2nd, ~57k words + ~30k two-word terms for the
// forms' letters) is large, so it loads on demand: call
// loadPhonemicDictionary() before scoring. Without it, words that need a
// dictionary check are "unverified" and go to review rather than guessing.
import type { Form } from '@workspace/forms';
import { normalizeTokens, type AsrToken } from '@workspace/asr';
import { finalizeScore, type ItemScore, type ReviewReason, type Scorer, type ScoreResult } from '../types';
import { FIRST_NAMES } from '../lexicons/first-names.generated';
import {
  ADJECTIVES,
  ALLOWED_PROPER,
  AMBIGUOUS_PROPER,
  BRANDS,
  FALSE_FRIENDS,
  HOMOPHONES,
  IRREGULAR,
  NUMBER_HOMOPHONES,
  NUMBERS,
  PLACES,
  SENSES,
  SUPPLEMENT,
} from '../lexicons/phonemic-rules';

const SCORER_ID = 'phonemic-fluency';
const SCORER_VERSION = '1.0.0';
const THRESHOLD = 0.6;
export const PHONEMIC_TRIAL_MS = 60_000;
const BIN_MS = 15_000;

// ---- Dictionary (lazy) ------------------------------------------------------

let DICT: Set<string> | null = null;
let COMPOUNDS: Set<string> | null = null;

/** Load the dictionary (a separate chunk in the web app). Safe to call repeatedly. */
export async function loadPhonemicDictionary(): Promise<void> {
  if (DICT) return;
  const m = await import('../lexicons/dictionary.generated');
  DICT = new Set(m.DICTIONARY_WORDS.split(' '));
  COMPOUNDS = new Set(m.DICTIONARY_COMPOUNDS.split('|'));
}
export const phonemicDictionaryLoaded = () => DICT !== null;

const NAMES = new Set(FIRST_NAMES.split(' '));
const HOMOPHONE_OF = new Map<string, string[]>();
for (const group of HOMOPHONES) for (const w of group) HOMOPHONE_OF.set(w, [...new Set([...(HOMOPHONE_OF.get(w) ?? []), ...group])]);
/** Words that may be ambiguous in meaning (homographs): variants among them get benefit of the doubt. */
const HOMOGRAPHS = new Set([...Object.keys(SENSES), 'felt', 'left', 'found', 'lay', 'lead', 'saw', 'well', 'wound', 'lie', 'lives', 'leaves', 'fell']);

/** Correction markers ("Fred, no, I mean fish"): a marker retracts the response before it. */
const MARKERS = [['no'], ['i', 'mean'], ['sorry'], ['actually'], ['wait'], ['scratch', 'that']];
/** Connectives and hedges that are never responses. */
const FILLERS = new Set(
  "um uh er erm ah hmm mm huh oh okay ok so and then also or the a an i i'm im i've ive me my let let's see think guess maybe well yeah yes is are was it it's that's there's what how another more other some any like".split(' '),
);
/** Target-letter words treated as connectives in running speech (not scored; see README). */
const TARGET_FILLERS: Record<string, Set<string>> = {
  a: new Set(['a', 'an', 'and', 'also', 'ah', 'actually', 'another', 'any', 'are', 'all']),
  w: new Set(['well', 'what', 'was', 'we', 'with']),
  h: new Set(['hmm', 'huh', 'how']),
  s: new Set(['so', 'see', 'some', 'sorry']),
  f: new Set([]),
  l: new Set(["let's", 'let']),
};

const CONTRACTIONS = new Set(["won't", "can't", "don't", "shan't", "ain't", "y'all", "o'clock"]);
const CONTRACTION_SUFFIX = /(n't|'s|'ll|'re|'ve|'d|'m)$/;

function inDictionary(w: string): boolean | null {
  if (CONTRACTIONS.has(w)) return true;
  if (w.includes("'")) {
    const stem = w.replace(CONTRACTION_SUFFIX, '');
    return stem !== w && stem.length > 0 ? inDictionary(stem) : false;
  }
  if (SUPPLEMENT.has(w) || ALLOWED_PROPER.has(w) || BRANDS.has(w) || ADJECTIVES.has(w) || IRREGULAR[w]) return true;
  if (!DICT) return null;
  return DICT.has(w) || validBases(w).length > 0 || (COMPOUNDS?.has(w) ?? false);
}
const known = (w: string) => !!(DICT?.has(w) || SUPPLEMENT.has(w) || ADJECTIVES.has(w));

/**
 * Inflectional bases of a word (plural, tense, comparative/superlative only).
 * Derivations ("bakery") have none. Comparatives only for listed adjectives,
 * so agentive -er ("farmer") isn't mistaken for one.
 */
export function validBases(w: string): string[] {
  if (FALSE_FRIENDS.has(w)) return [];
  if (IRREGULAR[w] && IRREGULAR[w] !== w) return [IRREGULAR[w]!];
  const c: string[] = [];
  const doubled = (stem: string) => stem.length > 2 && stem.at(-1) === stem.at(-2) ? stem.slice(0, -1) : null;
  if (w.endsWith('ies') && w.length > 4) c.push(`${w.slice(0, -3)}y`);
  if (w.endsWith('ves')) c.push(`${w.slice(0, -3)}f`, `${w.slice(0, -3)}fe`);
  if (/(s|x|z|ch|sh|o)es$/.test(w)) c.push(w.slice(0, -2));
  if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) c.push(w.slice(0, -1));
  if (w.endsWith('ied')) c.push(`${w.slice(0, -3)}y`);
  if (w.endsWith('ed')) {
    c.push(w.slice(0, -2), w.slice(0, -1));
    const d = doubled(w.slice(0, -2));
    if (d) c.push(d);
  }
  if (w.endsWith('ying')) c.push(`${w.slice(0, -4)}ie`);
  if (w.endsWith('ing') && w.length > 5) {
    c.push(w.slice(0, -3), `${w.slice(0, -3)}e`);
    const d = doubled(w.slice(0, -3));
    if (d) c.push(d);
  }
  for (const [suf, n] of [['iest', 4], ['ier', 3], ['est', 3], ['er', 2]] as const) {
    if (!w.endsWith(suf) || w.length <= n + 1) continue;
    const stem = w.slice(0, -n);
    const opts = suf.startsWith('i') ? [`${stem}y`] : [stem, `${stem}e`, doubled(stem)].filter((x): x is string => !!x);
    c.push(...opts.filter((o) => ADJECTIVES.has(o)));
  }
  return [...new Set(c)].filter((b) => b.length >= 2 && b !== w && known(b));
}

const family = (w: string) => new Set([w, ...validBases(w)]);

// ---- Analysis ----------------------------------------------------------------

export type PhonemicStatus = 'correct' | 'repetition' | 'violation' | 'unverified' | 'late';

export type PhonemicRule =
  | 'R-OK'
  | 'R-OK-AMBIGUOUS-PROPER'
  | 'R-OK-AMBIGUOUS-NUMBER'
  | 'R-OK-HOMOPHONE-SPELLING'
  | 'R-OK-CONTEXT'
  | 'R-OK-AMBIGUOUS-VARIANT'
  | 'R-OK-ALLOWED-PROPER'
  | 'R-OK-COMPOUND'
  | 'R-REP-VERBATIM'
  | 'R-REP-HOMOPHONE'
  | 'R-REP-VIOLATION'
  | 'R-VIO-LETTER'
  | 'R-VIO-NAME'
  | 'R-VIO-PLACE'
  | 'R-VIO-NUMBER'
  | 'R-VIO-VARIANT'
  | 'R-UNVERIFIED'
  | 'R-LATE';

export interface PhonemicResponse {
  text: string;
  /** The spelling scored (e.g. "faze" for a heard "phase" under F). */
  resolved: string;
  status: PhonemicStatus;
  rule: PhonemicRule;
  /** Credited/judged with benefit of the doubt: a person should check. */
  review: boolean;
  tokenIds: string[];
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface PhonemicAnalysis {
  letter: string;
  responses: PhonemicResponse[];
  correct: number;
  repetitions: number;
  violations: number;
  unverified: number;
  bins: number[];
  meanClusterSize: number | null;
  switches: number | null;
  firstWordMs: number | null;
  meanGapMs: number | null;
  /** Runs of 3 consecutive responses breaking the same rule (for the once-per-trial reminders). */
  runs: Record<'letter' | 'name' | 'number' | 'variant', number>;
}

interface Word {
  text: string;
  ids: string[];
  startMs: number;
  endMs: number;
  confidence: number;
}

function toWords(tokens: readonly AsrToken[], letter: string): Word[] {
  const split = tokens.flatMap((t) => {
    const parts = t.token.split(/[\s-]+/).filter(Boolean);
    return parts.length <= 1 ? [t] : parts.map((p) => ({ ...t, token: p }));
  });
  const raw = normalizeTokens(split, { numbers: false, selfCorrections: false }).map((n) => ({
    text: n.text.replace(/’/g, "'"),
    ids: n.sourceIds,
    startMs: n.startMs,
    endMs: n.endMs,
    confidence: n.confidence,
  }));
  // Self-corrections: a marker retracts the previous response (build doc: self-corrected
  // violations/repetitions aren't errors). Markers that start with the target letter
  // ("wait" under W) are left as possible responses.
  const out: Word[] = [];
  for (let i = 0; i < raw.length; ) {
    const marker = MARKERS.find((m) => m[0]![0] !== letter && m.every((w, k) => raw[i + k]?.text === w));
    if (marker) {
      // Drop the last response, skipping fillers.
      for (let k = out.length - 1; k >= 0; k--) {
        if (!FILLERS.has(out[k]!.text)) {
          out.splice(k, 1);
          break;
        }
      }
      i += marker.length;
      continue;
    }
    out.push(raw[i]!);
    i++;
  }
  const targetFillers = TARGET_FILLERS[letter] ?? new Set<string>();
  return out.filter((w) => (w.text[0] === letter ? !targetFillers.has(w.text) : !FILLERS.has(w.text)));
}

/** Words spoken as one unit: compounds have almost no pause between words, list items do. */
const MAX_COMPOUND_GAP_MS = 300;

/** Merge multi-word places ("los angeles") and two-word terms ("fire engine") said as one unit. */
function toResponses(words: Word[]): (Word & { compound: boolean })[] {
  const out: (Word & { compound: boolean })[] = [];
  for (let i = 0; i < words.length; ) {
    let merged = false;
    for (const n of [3, 2]) {
      const span = words.slice(i, i + n);
      if (span.length < n) continue;
      if (span.slice(1).some((w, k) => w.startMs - span[k]!.endMs > MAX_COMPOUND_GAP_MS)) continue;
      const phrase = span.map((w) => w.text).join(' ');
      if (PLACES.has(phrase) || (n === 2 && COMPOUNDS?.has(phrase)) || phrase === 'ferris wheel') {
        out.push({
          text: phrase,
          ids: span.flatMap((w) => w.ids),
          startMs: span[0]!.startMs,
          endMs: span[n - 1]!.endMs,
          confidence: Math.min(...span.map((w) => w.confidence)),
          compound: true,
        });
        i += n;
        merged = true;
        break;
      }
    }
    if (!merged) {
      out.push({ ...words[i]!, compound: false });
      i++;
    }
  }
  return out;
}

const neighbors = (rs: { text: string }[], i: number) => [rs[i - 2], rs[i - 1], rs[i + 1], rs[i + 2]].filter(Boolean).map((r) => r!.text);

/** Which meaning of a polysemous word the neighbors suggest (index into SENSES[w]), if any. */
function senseOf(w: string, near: string[]): number | null {
  const senses = SENSES[w];
  if (!senses) return null;
  const hits = senses.map((cues) => near.some((n) => n !== w && cues.includes(n)));
  return hits.filter(Boolean).length === 1 ? hits.indexOf(true) : null;
}

export function analyzePhonemic(letterIn: string, tokens: readonly AsrToken[], opts: { cutoffMs?: number } = {}): PhonemicAnalysis {
  const letter = letterIn.toLowerCase();
  const cutoff = opts.cutoffMs ?? Infinity;
  const rs = toResponses(toWords(tokens, letter));
  const out: PhonemicResponse[] = [];

  rs.forEach((r, i) => {
    const push = (status: PhonemicStatus, rule: PhonemicRule, resolved = r.text, review = false) =>
      out.push({ text: r.text, resolved, status, rule, review: review || (status === 'correct' && r.confidence < THRESHOLD), tokenIds: r.ids, startMs: r.startMs, endMs: r.endMs, confidence: r.confidence });
    if (r.startMs >= cutoff) return push('late', 'R-LATE');
    const head = r.text.split(' ')[0]!;

    // Spelling resolver: a homophone spelled with the target letter gets the benefit of the doubt.
    let resolved = r.text;
    let homophoneSpelling = false;
    if (head[0] !== letter) {
      const alt = (HOMOPHONE_OF.get(r.text) ?? []).find((h) => h[0] === letter && inDictionary(h) !== false);
      if (alt) {
        resolved = alt;
        homophoneSpelling = true;
      }
    }

    // Repetitions first: a repeated violation is a repetition, not another violation.
    const earlier = out.filter((o) => o.status !== 'late');
    const same = earlier.find((o) => o.resolved === resolved || o.text === r.text);
    const homophoneSame = !same && earlier.find((o) => (HOMOPHONE_OF.get(resolved) ?? []).includes(o.resolved));
    if (same || homophoneSame) {
      const prevIndex = out.indexOf((same || homophoneSame) as PhonemicResponse);
      const near = neighbors(rs, i);
      const s1 = senseOf(resolved, neighbors(rs, prevIndex));
      const s2 = senseOf(resolved, near);
      if (s1 !== null && s2 !== null && s1 !== s2) return push('correct', 'R-OK-CONTEXT', resolved, true);
      const prev = (same || homophoneSame) as PhonemicResponse;
      return push('repetition', prev.status === 'violation' ? 'R-REP-VIOLATION' : same ? 'R-REP-VERBATIM' : 'R-REP-HOMOPHONE', resolved);
    }

    // Numbers ("four" alone could be "for"/"fore": correct unless beside other numbers).
    if (NUMBERS.has(r.text)) {
      const alt = (NUMBER_HOMOPHONES[r.text] ?? []).find((a) => a[0] === letter);
      const besideNumbers = [rs[i - 1], rs[i + 1]].some((n) => n && NUMBERS.has(n.text));
      if (alt && !besideNumbers) return push('correct', 'R-OK-AMBIGUOUS-NUMBER', alt, true);
      return push('violation', 'R-VIO-NUMBER');
    }

    // Wrong first letter (by spelling).
    if (resolved[0] !== letter) return push('violation', 'R-VIO-LETTER');

    // Proper nouns: people and places are violations; days, months, brands are fine.
    if (ALLOWED_PROPER.has(resolved) || BRANDS.has(resolved)) return push('correct', 'R-OK-ALLOWED-PROPER', resolved, PLACES.has(resolved) || NAMES.has(resolved));
    const isPlace = PLACES.has(resolved);
    if (isPlace || NAMES.has(resolved)) {
      // Also an ordinary word ("frank", "lily", "flint")? Benefit of the doubt.
      if (AMBIGUOUS_PROPER.has(resolved)) return push('correct', 'R-OK-AMBIGUOUS-PROPER', resolved, true);
      return push('violation', isPlace ? 'R-VIO-PLACE' : 'R-VIO-NAME', resolved);
    }

    // Grammatical variants of an earlier response (plural, tense, comparative only).
    const fam = family(resolved);
    const variantOf = earlier.find((o) => o.resolved !== resolved && [...family(o.resolved)].some((b) => fam.has(b)));
    if (variantOf) {
      if (HOMOGRAPHS.has(resolved) || HOMOGRAPHS.has(variantOf.resolved)) return push('correct', 'R-OK-AMBIGUOUS-VARIANT', resolved, true);
      return push('violation', 'R-VIO-VARIANT', resolved);
    }

    // In a dictionary?
    const inDict = r.compound ? true : inDictionary(resolved);
    if (inDict !== true) return push('unverified', 'R-UNVERIFIED', resolved, true);
    return push('correct', homophoneSpelling ? 'R-OK-HOMOPHONE-SPELLING' : r.compound ? 'R-OK-COMPOUND' : 'R-OK', resolved, homophoneSpelling);
  });

  const correct = out.filter((o) => o.status === 'correct');
  const bins = [0, 0, 0, 0];
  for (const c of correct) bins[Math.min(3, Math.floor(c.startMs / BIN_MS))]!++;

  // Troyer phonemic clusters: consecutive correct words sharing the first two
  // letters, a rhyme (last three letters), or a homophone.
  const related = (a: string, b: string) =>
    a.slice(0, 2) === b.slice(0, 2) || (a.length > 3 && b.length > 3 && a.slice(-3) === b.slice(-3)) || (HOMOPHONE_OF.get(a) ?? []).includes(b);
  let meanClusterSize: number | null = null;
  let switches: number | null = null;
  if (correct.length) {
    const sizes: number[] = [];
    let size = 0;
    for (let k = 1; k < correct.length; k++) {
      if (related(correct[k - 1]!.resolved, correct[k]!.resolved)) size++;
      else {
        sizes.push(size);
        size = 0;
      }
    }
    sizes.push(size);
    meanClusterSize = Math.round((sizes.reduce((a, b) => a + b, 0) / sizes.length) * 100) / 100;
    switches = sizes.length - 1;
  }
  const gaps = correct.slice(1).map((c, k) => c.startMs - correct[k]!.startMs);

  // Runs of 3 consecutive responses breaking the same rule.
  const runs = { letter: 0, name: 0, number: 0, variant: 0 };
  const ruleOf = (o: PhonemicResponse): keyof typeof runs | null =>
    o.rule === 'R-VIO-LETTER' ? 'letter' : o.rule === 'R-VIO-NAME' || o.rule === 'R-VIO-PLACE' ? 'name' : o.rule === 'R-VIO-NUMBER' ? 'number' : o.rule === 'R-VIO-VARIANT' ? 'variant' : null;
  let current: keyof typeof runs | null = null;
  let length = 0;
  for (const o of out) {
    if (o.status === 'late') continue;
    const r = ruleOf(o);
    if (r && r === current) length++;
    else {
      current = r;
      length = r ? 1 : 0;
    }
    if (current && length === 3) {
      runs[current]++;
      length = 0;
    }
  }

  return {
    letter,
    responses: out,
    correct: correct.length,
    repetitions: out.filter((o) => o.status === 'repetition').length,
    violations: out.filter((o) => o.status === 'violation').length,
    unverified: out.filter((o) => o.status === 'unverified').length,
    bins,
    meanClusterSize,
    switches,
    firstWordMs: correct[0]?.startMs ?? null,
    meanGapMs: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
    runs,
  };
}

// ---- Live detectors (engine phrase prompts) ---------------------------------------

interface JudgeInputLike {
  expected: string;
  tokens: AsrToken[];
  asrUnavailable: boolean;
}
const runDetector = (rule: keyof PhonemicAnalysis['runs']) => ({ expected, tokens }: JudgeInputLike) => ({
  correct: null,
  data: { matches: analyzePhonemic(expected, tokens).runs[rule] },
});

export const phonemicFluencyJudges = {
  /** 3 consecutive wrong-letter words → "We are now using the letter F." (once per trial). */
  'phonemic-wrong-letter': runDetector('letter'),
  /** 3 consecutive violations of the same rule → that rule's reminder (once per rule per trial). */
  'phonemic-rule-name': runDetector('name'),
  'phonemic-rule-number': runDetector('number'),
  'phonemic-rule-variant': runDetector('variant'),
};

// ---- Scorer ------------------------------------------------------------------

export interface PhonemicTrialInput {
  tokens: AsrToken[];
  asrUnavailable: boolean;
  completed: boolean;
}

export interface PhonemicFluencyInput {
  form: Form;
  first: PhonemicTrialInput | null;
  second: PhonemicTrialInput | null;
  reasonCode: number | null;
  equated: boolean;
}

export const phonemicLetters = (form: Form) => [form.items.firstLetter?.[0] ?? 'F', form.items.secondLetter?.[0] ?? 'L'] as const;

export const phonemicFluencyScorer: Scorer<PhonemicFluencyInput> = {
  scorerId: SCORER_ID,
  scorerVersion: SCORER_VERSION,
  confidenceThreshold: THRESHOLD,

  score({ form, first, second, reasonCode, equated }): ScoreResult {
    const reasons: ReviewReason[] = [];
    const items: ItemScore[] = [];
    const fields: Record<string, number | null> = {};
    const [l1, l2] = phonemicLetters(form);
    let blankTotals = false;

    for (const [prefix, letter, trial] of [['first', l1, first], ['second', l2, second]] as const) {
      if (!trial || !trial.completed) {
        // Not completed: reason code in "correct", the rest blank (and, for L, the totals).
        fields[`${prefix}Correct`] = reasonCode ?? 97;
        fields[`${prefix}Repetitions`] = null;
        fields[`${prefix}Violations`] = null;
        blankTotals = true;
        continue;
      }
      if (trial.asrUnavailable) {
        reasons.push('asr_unavailable');
        fields[`${prefix}Correct`] = null;
        fields[`${prefix}Repetitions`] = null;
        fields[`${prefix}Violations`] = null;
        blankTotals = true;
        continue;
      }
      const a = analyzePhonemic(letter, trial.tokens, { cutoffMs: PHONEMIC_TRIAL_MS });
      a.responses.forEach((r, k) => {
        if (r.status === 'late') return;
        items.push({
          itemKey: `${prefix}.${k}`,
          value: r.status === 'correct' ? 1 : 0,
          confidence: r.status === 'unverified' ? 0.3 : r.review ? 0.5 : r.confidence,
          rationale: `${r.text}${r.resolved !== r.text ? ` (as "${r.resolved}")` : ''}: ${r.status} [${r.rule}]`,
          evidenceTokenIds: r.tokenIds,
          scorer: 'auto',
          scorerVersion: SCORER_VERSION,
        });
      });
      fields[`${prefix}Correct`] = a.correct;
      fields[`${prefix}Repetitions`] = a.repetitions;
      fields[`${prefix}Violations`] = a.violations;
      fields[`${prefix}Unverified`] = a.unverified;
      a.bins.forEach((b, k) => (fields[`${prefix}Bin${k + 1}`] = b));
      fields[`${prefix}MeanClusterSize`] = a.meanClusterSize;
      fields[`${prefix}Switches`] = a.switches;
      fields[`${prefix}FirstWordMs`] = a.firstWordMs;
      fields[`${prefix}MeanGapMs`] = a.meanGapMs;
    }

    const sum = (k: string) => (fields[`first${k}`] as number) + (fields[`second${k}`] as number);
    fields.totalCorrect = blankTotals ? null : sum('Correct');
    fields.totalRepetitions = blankTotals ? null : sum('Repetitions');
    fields.totalViolations = blankTotals ? null : sum('Violations');
    if (!DICT) reasons.push('low_confidence');
    return finalizeScore({ testId: SCORER_ID, scorerId: SCORER_ID, scorerVersion: SCORER_VERSION, items, fields, equated }, THRESHOLD, [...new Set(reasons)]);
  },
};

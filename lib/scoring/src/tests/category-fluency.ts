// T6 Category Fluency judges and scorer (docs/build-prompts.md §T6 "Scoring").
//
// analyzeFluency is the single source of truth: the practice judge, the live
// detectors ("I can't think of any more", "do birds count?") and the scorer
// all read speech through it, so they can't disagree.
import type { Form } from '@workspace/forms';
import { normalizeTokens, type AsrToken } from '@workspace/asr';
import { finalizeScore, type ItemScore, type ReviewReason, type Scorer, type ScoreResult } from '../types';
import { buildLexicon, isCategoryName, lookup, type Lexicon, type LexiconEntry, type LexiconSource } from '../lexicons/lexicon';
import { animalsSource } from '../lexicons/animals';
import { vegetablesSource } from '../lexicons/vegetables';
import { fruitsSource } from '../lexicons/fruits';
import { occupationsSource } from '../lexicons/occupations';
import { clothingSource } from '../lexicons/clothing';

const SCORER_ID = 'category-fluency';
const SCORER_VERSION = '1.0.0';
const THRESHOLD = 0.6;
/** Trial length (build doc: "stops at exactly 60.0 s"). */
export const FLUENCY_TRIAL_MS = 60_000;
const BIN_MS = 15_000;

// ---- Lexicons ---------------------------------------------------------------

const SOURCES: Record<string, LexiconSource> = {
  animals: animalsSource,
  vegetables: vegetablesSource,
  fruits: fruitsSource,
  occupations: occupationsSource,
  clothing: clothingSource,
};
const built = new Map<string, Lexicon>();

export function lexiconFor(category: string): Lexicon {
  let lex = built.get(category);
  if (!lex) {
    const src = SOURCES[category];
    if (!src) throw new Error(`No lexicon for category "${category}"`);
    lex = buildLexicon(src);
    built.set(category, lex);
  }
  return lex;
}

export const FLUENCY_CATEGORIES = Object.keys(SOURCES);

/** Words that carry no response: fillers, connectives, hedges, numbers, incapacity phrases. */
const STOPWORDS = new Set(
  (
    "a an the and or but so then also too and um uh er ah oh okay ok well like let let's me see think thinking i i'm im i've ive " +
    'you know yeah yes no not some more any another other others there there\'s theres here is are was were be been what else how ' +
    'about maybe of course good one ones lots lot kind kinds sort sorts type types all different many much got have has had can ' +
    "can't cant cannot could couldn't would do does did don't dont it it's its that that's thats this those these wait sorry hmm " +
    'mm hm any my our your their his her big little small large baby wild young old with without for in on at to from by just ' +
    'really very probably again already still now right sure guess say said said like um uhh huh oops gosh boy wow hey okay ' +
    'nothing everything something anything think remember forget forgot come came up out done finished stuck give gave mind ' +
    'two three four five six seven eight nine ten dozen couple few several bunch kind of type sort uh-huh mhm ' +
    'word words thing things stuff name names call called keep going go goes went try trying one minute minutes time ' +
    'animal animals vegetable vegetables fruit fruits job jobs category list'
  ).split(/\s+/),
);

// ---- Analysis ---------------------------------------------------------------

export type FluencyWordStatus =
  | 'credited'
  /** Same lemma already said (plurals collapse: "cats" after "cat"). */
  | 'repetition'
  /** In the category's vocabulary but no credit (mythical, prepared, spice…). */
  | 'noCredit'
  /** Belongs to another category (e.g. "shirt" during Animals). */
  | 'intrusion'
  /** Not in any lexicon: needs a reviewer (or, later, the rubric-constrained LLM). */
  | 'unrecognized'
  /** Said after the 60.0 s cutoff: kept in raw data, not scored. */
  | 'late'
  /** Part of a question to the examiner ("do birds count?"). */
  | 'question';

export interface FluencyWord {
  text: string;
  lemma: string | null;
  status: FluencyWordStatus;
  /** For noCredit and intrusion: why / which category. */
  reason?: string;
  clusters: string[];
  /** Credited, but a person should check it (ambiguous membership or low ASR confidence). */
  review: boolean;
  tokenIds: string[];
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface FluencyAnalysis {
  category: string;
  words: FluencyWord[];
  total: number;
  repetitions: number;
  intrusions: number;
  noCredit: number;
  unrecognized: number;
  /** Credited words per 15-s bin (output decay). */
  bins: number[];
  /** Troyer: mean cluster size (words after the first in each cluster) and switches between clusters. */
  meanClusterSize: number | null;
  switches: number | null;
  firstWordMs: number | null;
  meanGapMs: number | null;
  /** Questions to the examiner, and whether their subject is creditable (→ "Yes."). */
  questions: { creditable: boolean; text: string }[];
  /** Expressions of incapacity ("I can't think of any more"). */
  incapacity: number;
}

interface Word {
  text: string;
  ids: string[];
  startMs: number;
  endMs: number;
  confidence: number;
}

/** Split hyphenated / multi-word ASR tokens ("sea-lion", "t-shirt") and normalize. */
function toWords(tokens: readonly AsrToken[]): Word[] {
  const split: AsrToken[] = tokens.flatMap((t) => {
    const parts = t.token.split(/[\s-]+/).filter(Boolean);
    return parts.length <= 1 ? [t] : parts.map((p) => ({ ...t, token: p }));
  });
  return normalizeTokens(split, { numbers: false, selfCorrections: false }).map((n) => ({
    text: n.text,
    ids: n.sourceIds,
    startMs: n.startMs,
    endMs: n.endMs,
    confidence: n.confidence,
  }));
}

/** Longest lexicon match starting at i (up to the lexicon's longest entry). */
function matchAt(lex: Lexicon, words: readonly Word[], i: number): { entry: LexiconEntry; length: number } | null {
  for (let n = Math.min(lex.maxWords, words.length - i); n >= 1; n--) {
    const entry = lookup(
      lex,
      words.slice(i, i + n).map((w) => w.text),
    );
    if (entry) return { entry, length: n };
  }
  return null;
}

const Q_START = new Set(['do', 'does', 'can', 'could', 'would', 'will', 'should', 'is', 'are', 'what', 'how']);
// "ok"/"okay" are left out: they end too many non-questions ("there's a cat, okay").
const Q_END = new Set(['count', 'counts', 'allowed', 'acceptable', 'qualify', 'qualifies', 'included']);

/**
 * Questions to the examiner about membership: "do birds count?", "does a
 * whale count", "is a tomato a vegetable", "what about insects". Returns
 * word spans; `creditable` when a word inside names a credited member.
 */
function findQuestions(lex: Lexicon, words: readonly Word[]): { start: number; end: number; creditable: boolean }[] {
  const out: { start: number; end: number; creditable: boolean }[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!.text;
    if (!Q_START.has(w)) continue;
    let end = -1;
    if ((w === 'what' || w === 'how') && words[i + 1]?.text === 'about') {
      // "what about X": the subject is the next lexicon match (or next word).
      const m = matchAt(lex, words, i + 2);
      end = i + 1 + (m ? m.length : 1);
    } else {
      for (let k = i + 1; k < Math.min(words.length, i + 8); k++) {
        const t = words[k]!.text;
        if (Q_END.has(t) || (k > i + 1 && isCategoryName(lex, t))) {
          end = k;
          break;
        }
      }
    }
    if (end < 0) continue;
    let creditable = false;
    for (let k = i + 1; k <= end; ) {
      const m = matchAt(lex, words, k);
      if (m && !m.entry.noCredit) creditable = true;
      k += m ? m.length : 1;
    }
    out.push({ start: i, end: Math.min(end, words.length - 1), creditable });
    i = end;
  }
  return out;
}

const INCAPACITY: RegExp[] = [
  /\b(can'?t|cannot|can not) think of (any|anything|anymore|more|others?|another)\b/,
  /\b(can'?t|cannot) (remember|come up with|think) (any )?(more|others?|anything)\b/,
  /\bthat'?s (all|it)\b/,
  /\bi'?m (done|out|finished|stuck|blanking)\b/,
  /\bi (don'?t|do not) know (any )?(more|others?|anything else|any others)\b/,
  /\b(no|nothing) (more|else)\b/,
  /\bi give up\b/,
  /\bmy mind (is|went) blank\b/,
];

function countIncapacity(words: readonly Word[]): number {
  const text = words.map((w) => w.text).join(' ');
  return INCAPACITY.reduce((n, re) => n + (text.match(new RegExp(re.source, 'g'))?.length ?? 0), 0);
}

export function analyzeFluency(category: string, tokens: readonly AsrToken[], opts: { cutoffMs?: number } = {}): FluencyAnalysis {
  const lex = lexiconFor(category);
  const others = FLUENCY_CATEGORIES.filter((c) => c !== category).map(lexiconFor);
  const cutoff = opts.cutoffMs ?? Infinity;
  const words = toWords(tokens);
  const questions = findQuestions(lex, words);
  const inQuestion = new Set(questions.flatMap((q) => Array.from({ length: q.end - q.start + 1 }, (_, k) => q.start + k)));
  const seen = new Set<string>();
  const out: FluencyWord[] = [];

  const push = (span: Word[], fields: Omit<FluencyWord, 'text' | 'tokenIds' | 'startMs' | 'endMs' | 'confidence'>) =>
    out.push({
      ...fields,
      text: span.map((w) => w.text).join(' '),
      tokenIds: span.flatMap((w) => w.ids),
      startMs: span[0]!.startMs,
      endMs: span[span.length - 1]!.endMs,
      confidence: Math.min(...span.map((w) => w.confidence)),
    });

  for (let i = 0; i < words.length; ) {
    if (inQuestion.has(i)) {
      const q = questions.find((x) => x.start <= i && i <= x.end)!;
      if (i === q.start) push(words.slice(q.start, q.end + 1), { lemma: null, status: 'question', clusters: [], review: false });
      i = q.end + 1;
      continue;
    }
    const hit = matchAt(lex, words, i);
    if (hit) {
      const span = words.slice(i, i + hit.length);
      i += hit.length;
      const { entry } = hit;
      const base = { lemma: entry.lemma, clusters: entry.clusters };
      if (span[0]!.startMs >= cutoff) push(span, { ...base, status: 'late', review: false });
      else if (entry.noCredit) push(span, { ...base, status: 'noCredit', reason: entry.noCredit, review: false });
      else if (seen.has(entry.lemma)) push(span, { ...base, status: 'repetition', review: false });
      else {
        seen.add(entry.lemma);
        const confidence = Math.min(...span.map((w) => w.confidence));
        push(span, { ...base, status: 'credited', review: !!entry.review || confidence < THRESHOLD });
      }
      continue;
    }
    const w = words[i]!;
    if (STOPWORDS.has(w.text) || isCategoryName(lex, w.text)) {
      i++;
      continue;
    }
    const other = others.map((o) => ({ o, m: matchAt(o, words, i) })).find((x) => x.m);
    if (other?.m) {
      const span = words.slice(i, i + other.m.length);
      i += other.m.length;
      push(span, { lemma: other.m.entry.lemma, status: span[0]!.startMs >= cutoff ? 'late' : 'intrusion', reason: other.o.category, clusters: [], review: false });
      continue;
    }
    push([w], { lemma: null, status: w.startMs >= cutoff ? 'late' : 'unrecognized', clusters: [], review: false });
    i++;
  }

  const credited = out.filter((w) => w.status === 'credited');
  const bins = [0, 0, 0, 0];
  for (const w of credited) bins[Math.min(3, Math.floor(w.startMs / BIN_MS))]!++;

  // Troyer clustering: a cluster is a run of consecutive credited words sharing
  // at least one subcategory; size = words after the first; switches = clusters − 1.
  let meanClusterSize: number | null = null;
  let switches: number | null = null;
  if (credited.length > 0) {
    const sizes: number[] = [];
    let shared = new Set(credited[0]!.clusters);
    let size = 0;
    for (const w of credited.slice(1)) {
      const next = new Set(w.clusters.filter((c) => shared.has(c)));
      if (next.size > 0) {
        size++;
        shared = next;
      } else {
        sizes.push(size);
        size = 0;
        shared = new Set(w.clusters);
      }
    }
    sizes.push(size);
    meanClusterSize = Math.round((sizes.reduce((a, b) => a + b, 0) / sizes.length) * 100) / 100;
    switches = sizes.length - 1;
  }
  const gaps = credited.slice(1).map((w, k) => w.startMs - credited[k]!.startMs);

  return {
    category,
    words: out,
    total: credited.length,
    repetitions: out.filter((w) => w.status === 'repetition').length,
    intrusions: out.filter((w) => w.status === 'intrusion').length,
    noCredit: out.filter((w) => w.status === 'noCredit').length,
    unrecognized: out.filter((w) => w.status === 'unrecognized').length,
    bins,
    meanClusterSize,
    switches,
    firstWordMs: credited[0]?.startMs ?? null,
    meanGapMs: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
    questions: questions.map((q) => ({
      creditable: q.creditable,
      text: words
        .slice(q.start, q.end + 1)
        .map((w) => w.text)
        .join(' '),
    })),
    incapacity: countIncapacity(words),
  };
}

// ---- Live judges (engine) -----------------------------------------------------

interface JudgeInputLike {
  expected: string;
  tokens: AsrToken[];
  asrUnavailable: boolean;
}

/** Practice feedback codes (build doc §T6 practice table). */
export type PracticeCode = 'code0' | 'code1one' | 'code1many' | 'code2' | 'code3' | 'code4';

export function classifyPractice(tokens: readonly AsrToken[]): { code: PracticeCode; correct: number; incorrect: number } {
  const a = analyzeFluency('clothing', tokens);
  const correct = new Set(a.words.filter((w) => w.status === 'credited' || w.status === 'repetition').map((w) => w.lemma)).size;
  const incorrect = a.words.filter((w) => w.status === 'intrusion' || w.status === 'unrecognized' || w.status === 'noCredit').length;
  const code: PracticeCode =
    correct === 0 && incorrect === 0
      ? 'code0'
      : correct === 0
        ? incorrect === 1
          ? 'code1one'
          : 'code1many'
        : incorrect > 0
          ? 'code3'
          : correct >= 2
            ? 'code4'
            : 'code2';
  return { code, correct, incorrect };
}

export const categoryFluencyJudges = {
  /** Practice ("other articles of clothing"): code 0–4 → which scripted line plays. `count` closes the window at two responses. */
  'fluency-practice': ({ tokens, asrUnavailable }: JudgeInputLike) => {
    if (asrUnavailable) return { correct: null, tag: 'code0', data: { count: 0 } };
    const c = classifyPractice(tokens);
    return { correct: c.code === 'code2' || c.code === 'code4', tag: c.code, data: { count: c.correct + c.incorrect, ...c } };
  },
  /** Detector: "I can't think of any more" → the one allowed prompt (shared with the 15-s silence prompt). */
  'fluency-incapacity': ({ tokens }: JudgeInputLike) => {
    const n = countIncapacity(toWords(tokens));
    return { correct: null, data: { matches: n } };
  },
  /** Detector: "do birds count?" about a creditable member → "Yes." (expected = the category). */
  'fluency-question': ({ tokens, expected }: JudgeInputLike) => {
    const lex = lexiconFor(expected);
    const n = findQuestions(lex, toWords(tokens)).filter((q) => q.creditable).length;
    return { correct: null, data: { matches: n } };
  },
};

// ---- Scorer -------------------------------------------------------------------

export interface FluencyTrialInput {
  tokens: AsrToken[];
  asrUnavailable: boolean;
  /** The 60-s window ran to its end. */
  completed: boolean;
}

export interface CategoryFluencyInput {
  form: Form;
  animals: FluencyTrialInput | null;
  second: FluencyTrialInput | null;
  /** The administration's reason code when it stopped early (95–98). */
  reasonCode: number | null;
  equated: boolean;
}

/** The form's second category (Form A: vegetables). */
export const secondCategoryOf = (form: Form) => form.items.secondCategory?.[0] ?? 'vegetables';

export const categoryFluencyScorer: Scorer<CategoryFluencyInput> = {
  scorerId: SCORER_ID,
  scorerVersion: SCORER_VERSION,
  confidenceThreshold: THRESHOLD,

  score({ form, animals, second, reasonCode, equated }): ScoreResult {
    const reasons: ReviewReason[] = [];
    const items: ItemScore[] = [];
    const fields: Record<string, number | null> = {};
    const trials: [string, string, FluencyTrialInput | null][] = [
      ['animals', 'animals', animals],
      ['secondCategory', secondCategoryOf(form), second],
    ];

    for (const [field, category, trial] of trials) {
      if (!trial || !trial.completed) {
        // Not completed → reason code (95–98); derived metrics left blank.
        fields[field] = reasonCode ?? 97;
        continue;
      }
      if (trial.asrUnavailable) {
        reasons.push('asr_unavailable');
        fields[field] = null;
        continue;
      }
      const a = analyzeFluency(category, trial.tokens, { cutoffMs: FLUENCY_TRIAL_MS });
      a.words.forEach((w, k) => {
        if (w.status === 'late') return;
        // A member named only inside a question ("do birds count?") isn't credited; a person decides.
        if (w.status === 'question') {
          if (!a.questions.some((q) => q.creditable && q.text === w.text)) return;
          items.push({ itemKey: `${field}.${k}`, value: 0, confidence: 0.5, rationale: `asked "${w.text}": not credited — check whether to credit`, evidenceTokenIds: w.tokenIds, scorer: 'auto', scorerVersion: SCORER_VERSION });
          return;
        }
        const confidence = w.status === 'unrecognized' ? 0.3 : w.review ? 0.5 : w.confidence;
        items.push({
          itemKey: `${field}.${k}`,
          value: w.status === 'credited' ? 1 : 0,
          confidence,
          rationale: `${w.text}: ${w.status}${w.reason ? ` (${w.reason})` : ''}${w.review ? ' — needs review' : ''}`,
          evidenceTokenIds: w.tokenIds,
          scorer: 'auto',
          scorerVersion: SCORER_VERSION,
        });
      });
      fields[field] = a.total;
      fields[`${field}Repetitions`] = a.repetitions;
      fields[`${field}Intrusions`] = a.intrusions;
      fields[`${field}NoCredit`] = a.noCredit;
      fields[`${field}Unrecognized`] = a.unrecognized;
      a.bins.forEach((b, k) => (fields[`${field}Bin${k + 1}`] = b));
      fields[`${field}MeanClusterSize`] = a.meanClusterSize;
      fields[`${field}Switches`] = a.switches;
      fields[`${field}FirstWordMs`] = a.firstWordMs;
      fields[`${field}MeanGapMs`] = a.meanGapMs;
    }

    return finalizeScore({ testId: SCORER_ID, scorerId: SCORER_ID, scorerVersion: SCORER_VERSION, items, fields, equated }, THRESHOLD, [...new Set(reasons)]);
  },
};

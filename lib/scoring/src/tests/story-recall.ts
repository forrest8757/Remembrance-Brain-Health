// T2 Story Recall judges and scorer (docs/build-prompts.md §T2 "Scoring"),
// for Remembrance-original stories (lib/forms story.ts).
//
// Verbatim (/44) and paraphrase (/25) are independent, scored separately for
// the immediate and the delayed recall. Order doesn't matter.
import { storyUnits, type Form, type StoryUnit } from '@workspace/forms';
import { normalizeTokens, type AsrToken } from '@workspace/asr';
import { finalizeScore, type ItemScore, type ReviewReason, type Scorer, type ScoreResult } from '../types';

const SCORER_ID = 'story-recall';
const SCORER_VERSION = '1.0.0';
/** Build doc: a paraphrase unit below 0.85 confidence goes to review. */
const THRESHOLD = 0.85;

// ---- Word stems --------------------------------------------------------------

const IRREGULAR: Record<string, string> = {
  flew: 'fly', flown: 'fly', flies: 'fly', rode: 'ride', ridden: 'ride', swam: 'swim', swum: 'swim', threw: 'throw', thrown: 'throw',
  flung: 'fling', swung: 'swing', ran: 'run', heard: 'hear', met: 'meet', got: 'get', gotten: 'get', gave: 'give', given: 'give',
  came: 'come', went: 'go', gone: 'go', brought: 'bring', took: 'take', taken: 'take', caught: 'catch', found: 'find', fell: 'fall',
  fallen: 'fall', geese: 'goose', children: 'child', men: 'man', women: 'woman', blew: 'blow', blown: 'blow', saw: 'see', seen: 'see',
  told: 'tell', said: 'say', lost: 'lose', left: 'leave', felt: 'feel', kept: 'keep', grabbed: 'grab', stepped: 'step', beat: 'beat',
};
const DIGIT_WORDS: Record<string, string> = { '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten', '12': 'twelve' };

/**
 * A crude stem so verb variations, plurals and possessives match ("rode" →
 * ride, "kites" → kite, "farmer's" → farmer) while different words don't.
 */
export function stem(raw: string): string {
  let w = raw.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9']/g, '');
  w = DIGIT_WORDS[w] ?? w;
  w = w.replace(/'s$/, '').replace(/'$/, '');
  if (IRREGULAR[w]) w = IRREGULAR[w];
  let stripped = false;
  for (let pass = 0; pass < 2; pass++) {
    if (w.endsWith('ies') && w.length > 4) {
      w = `${w.slice(0, -3)}y`;
      stripped = true;
      continue;
    }
    if (w.endsWith('ied') && w.length > 4) {
      w = `${w.slice(0, -3)}y`;
      stripped = true;
      continue;
    }
    const suf = ['ing', 'ed', 'es', 's'].find((x) => w.endsWith(x) && w.length - x.length >= 3 && !(x === 's' && /(ss|us|is)$/.test(w)));
    if (!suf) break;
    w = w.slice(0, -suf.length);
    stripped = true;
  }
  if (w.endsWith('e') && w.length > 3) w = w.slice(0, -1);
  // A doubled consonant left by a suffix ("skipp-ing" → skip), but not s/l/z ("hiss", "pull").
  if (stripped && /([b-df-hj-km-np-rtv-xz])\1$/.test(w)) w = w.slice(0, -1);
  return w;
}

const ARTICLES = new Set(['the', 'a', 'an']);
const phraseStems = (phrase: string) => phrase.split(/\s+/).filter((w) => !ARTICLES.has(w.toLowerCase())).map(stem);

interface RecallWord {
  stem: string;
  id: string;
  confidence: number;
}

function recallWords(tokens: readonly AsrToken[]): RecallWord[] {
  const split = tokens.flatMap((t) => {
    const parts = t.token.split(/[\s-]+/).filter(Boolean);
    return parts.length <= 1 ? [t] : parts.map((p) => ({ ...t, token: p }));
  });
  return normalizeTokens(split, { numbers: false, selfCorrections: false })
    .filter((n) => !ARTICLES.has(n.text))
    .map((n) => ({ stem: stem(n.text), id: n.sourceIds[0] ?? '', confidence: n.confidence }));
}

/** Where a phrase occurs (consecutive stems, articles ignored), or -1. */
function findPhrase(words: readonly RecallWord[], phrase: string): number {
  const p = phraseStems(phrase);
  if (!p.length) return -1;
  for (let i = 0; i + p.length <= words.length; i++) if (p.every((s, k) => words[i + k]!.stem === s)) return i;
  return -1;
}

// ---- Scoring one recall -----------------------------------------------------------

export interface UnitResult {
  unit: number;
  awarded: boolean;
  /** Why: which accept or reject phrase matched, or "not mentioned". */
  evidence: string;
  confidence: number;
  evidenceIds: string[];
}

export interface RecallAnalysis {
  verbatim: number;
  paraphrase: number;
  bits: { bit: number; word: string; credited: boolean }[];
  units: UnitResult[];
  /** Content words not from the story or its rubric (derived; "intrusions"). */
  intrusions: string[];
  wordCount: number;
}

const FUNCTION_WORDS = new Set(
  "and or but so then also um uh er ah oh okay ok well like i i'm me my you your we it it's that's this that there was were is are be been had has have do did don't to of in on at for with by from up just really very think know remember about story".split(' '),
);

export function analyzeRecall(form: Form, tokens: readonly AsrToken[]): RecallAnalysis {
  const words = recallWords(tokens);
  const bitWords = form.items.bitWords ?? [];

  // Verbatim: each bit's word anywhere in the recall; duplicated words ("he" ×2) up to their count in the recall.
  const available = new Map<string, number>();
  for (const w of words) available.set(w.stem, (available.get(w.stem) ?? 0) + 1);
  const bits = bitWords.map((word, k) => {
    const s = stem(word);
    const left = available.get(s) ?? 0;
    if (left > 0) available.set(s, left - 1);
    return { bit: k + 1, word, credited: left > 0 };
  });

  // Paraphrase: data-table rubric (accept → 1; reject → confident 0; related words but no match → review).
  const units: UnitResult[] = storyUnits(form).map((u: StoryUnit, k) => {
    for (const a of u.accept) {
      const at = findPhrase(words, a);
      if (at >= 0) {
        const span = words.slice(at, at + phraseStems(a).length);
        return { unit: k + 1, awarded: true, evidence: `"${a}"`, confidence: Math.min(0.97, ...span.map((w) => w.confidence)), evidenceIds: span.map((w) => w.id) };
      }
    }
    for (const r of u.reject) {
      if (findPhrase(words, r) >= 0) return { unit: k + 1, awarded: false, evidence: `0-point: "${r}"`, confidence: 0.9, evidenceIds: [] };
    }
    const related = new Set([...u.bits.map((b) => stem(bitWords[b - 1] ?? '')), ...u.accept.flatMap(phraseStems)].filter((s) => !FUNCTION_WORDS.has(s)));
    const near = words.find((w) => related.has(w.stem));
    return near
      ? { unit: k + 1, awarded: false, evidence: 'related words but no match: a person should check', confidence: 0.6, evidenceIds: [near.id] }
      : { unit: k + 1, awarded: false, evidence: 'not mentioned', confidence: 0.92, evidenceIds: [] };
  });

  // Intrusions: words that are neither in the story nor an accepted way of saying it (0-point examples don't excuse a word).
  const storyText = (form.items.story?.[0] ?? '').split(/[\s,.]+/).filter(Boolean);
  const storyStems = new Set([...storyText.map(stem), ...storyUnits(form).flatMap((u) => u.accept.flatMap(phraseStems))]);
  const intrusions = [...new Set(words.map((w) => w.stem).filter((s) => !storyStems.has(s) && !FUNCTION_WORDS.has(s) && s.length > 2))];

  return {
    verbatim: bits.filter((b) => b.credited).length,
    paraphrase: units.filter((u) => u.awarded).length,
    bits,
    units,
    intrusions,
    wordCount: words.length,
  };
}

// ---- Live judges ---------------------------------------------------------------------

interface JudgeInputLike {
  expected: string;
  tokens: AsrToken[];
  asrUnavailable: boolean;
}

const NO_RECALL = [/\bwhat story\b/, /\b(don'?t|do not|can'?t|cannot) remember\b/, /\bno (idea|recollection)\b/, /\b(didn'?t|did not) (hear|tell)\b/, /\bwhich story\b/, /\bi forgot\b/];
const QUESTION = [/\b(say|read|tell) (it|that|the story) again\b/, /\brepeat\b/, /\b(was it|was there|were there|did (he|she|they)|is it)\b/];

const textOf = (tokens: readonly AsrToken[]) =>
  normalizeTokens(tokens, { numbers: false, selfCorrections: false })
    .map((t) => t.text)
    .join(' ');

/** Judges need the form: the app/tests bind it (see storyRecallJudgesFor). */
export function storyRecallJudgesFor(form: Form) {
  return {
    /** Delayed recall: no story recalled ("what story?", or nothing) → the scripted cue, once. */
    'story-delayed-recall': ({ tokens, asrUnavailable }: JudgeInputLike) => {
      if (asrUnavailable) return { correct: null };
      const text = textOf(tokens);
      const a = analyzeRecall(form, tokens);
      const noRecall = a.verbatim <= 2 && (NO_RECALL.some((re) => re.test(text)) || a.wordCount < 4);
      return { correct: !noRecall, tag: noRecall ? 'no_recall' : undefined, data: { verbatim: a.verbatim } };
    },
    /** A question about the story or a repeat request → the one allowed reply. */
    'story-question': ({ tokens }: JudgeInputLike) => {
      const text = textOf(tokens);
      return { correct: null, data: { matches: QUESTION.reduce((n, re) => n + (text.match(new RegExp(re.source, 'g'))?.length ?? 0), 0) } };
    },
  };
}

// ---- Scorer -------------------------------------------------------------------------

export interface StoryRecallInput {
  form: Form;
  /** All recall windows of the step, in order (an interrupted recall resumes in a new window). */
  recall: { tokens: AsrToken[]; asrUnavailable: boolean } | null;
  completed: boolean;
  reasonCode: number | null;
  /** Delayed only: actual minutes since the immediate recall ended (99 = unknown) and whether the cue was needed. */
  delayed?: { minutes: number; cueNeeded: boolean };
  equated: boolean;
}

export const storyRecallScorer: Scorer<StoryRecallInput> = {
  scorerId: SCORER_ID,
  scorerVersion: SCORER_VERSION,
  confidenceThreshold: THRESHOLD,

  score({ form, recall, completed, reasonCode, delayed, equated }): ScoreResult {
    const reasons: ReviewReason[] = [];
    const items: ItemScore[] = [];
    const fields: Record<string, number | null> = {};
    if (delayed) {
      fields.delayMinutes = delayed.minutes;
      fields.cueNeeded = delayed.cueNeeded ? 1 : 0;
    }
    if (!completed || !recall) {
      // Not completed: reason code in verbatim, paraphrase blank.
      fields.verbatim = reasonCode ?? 97;
      fields.paraphrase = null;
      return finalizeScore({ testId: SCORER_ID, scorerId: SCORER_ID, scorerVersion: SCORER_VERSION, items, fields, equated }, THRESHOLD, reasons);
    }
    if (recall.asrUnavailable) {
      reasons.push('asr_unavailable');
      fields.verbatim = null;
      fields.paraphrase = null;
      return finalizeScore({ testId: SCORER_ID, scorerId: SCORER_ID, scorerVersion: SCORER_VERSION, items, fields, equated }, THRESHOLD, reasons);
    }
    const a = analyzeRecall(form, recall.tokens);
    for (const u of a.units) {
      items.push({
        itemKey: `unit.${u.unit}`,
        value: u.awarded ? 1 : 0,
        confidence: u.confidence,
        rationale: `${storyUnits(form)[u.unit - 1]?.label}: ${u.evidence}`,
        evidenceTokenIds: u.evidenceIds,
        scorer: 'auto',
        scorerVersion: SCORER_VERSION,
      });
    }
    fields.verbatim = a.verbatim;
    fields.paraphrase = a.paraphrase;
    fields.intrusions = a.intrusions.length;
    fields.recallWords = a.wordCount;
    return finalizeScore({ testId: SCORER_ID, scorerId: SCORER_ID, scorerVersion: SCORER_VERSION, items, fields, equated }, THRESHOLD, reasons);
  },
};

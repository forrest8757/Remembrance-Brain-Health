// T1 MoCA-Blind judges and scorer (docs/build-prompts.md §T1 "Scoring").
// Pure functions. Live judges (used by the engine to decide cues and
// follow-ups) share code with the post-hoc scorer so the two agree.
import type { Form } from '@workspace/forms';
import { lemma } from '@workspace/forms';
import { cleanWord, normalizeTokens, type AsrToken } from '@workspace/asr';
import { finalizeScore, type ItemScore, type ReviewReason, type Scorer, type ScoreResult } from '../types';
import { editDistance } from '../similarity';
import { parseSpanResponse } from './number-span';

const SCORER_ID = 'moca-blind';
const SCORER_VERSION = '1.0.0';
const THRESHOLD = 0.7;
/** Sentence repetition: ASR tends to "fix" grammar, so be stricter (spec ⚠️). */
const SENTENCE_THRESHOLD = 0.85;

const words = (tokens: readonly AsrToken[]) => normalizeTokens(tokens, { numbers: false }).map((t) => t.text);
const text = (tokens: readonly AsrToken[]) => words(tokens).join(' ');
const minConf = (tokens: readonly AsrToken[]) => (tokens.length ? Math.min(...tokens.map((t) => t.confidence)) : 1);

// ---- Misheard words ---------------------------------------------------------------

/**
 * Coarse sound key for phone confusions: voiced/voiceless pairs merge
 * (v/f, z/s, b/p, d/t, g/k), soft c → s, silent final e dropped.
 */
export function soundKey(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  w = w.replace(/ph/g, 'f').replace(/c(?=[eiy])/g, 's').replace(/ck/g, 'k').replace(/c/g, 'k').replace(/qu/g, 'kw');
  w = w.replace(/v/g, 'f').replace(/z/g, 's').replace(/b/g, 'p').replace(/d/g, 't').replace(/g/g, 'k');
  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
  return w.replace(/(.)\1+/g, '$1');
}

const matchesTarget = (heard: string, target: string) => heard === target || lemma(heard) === lemma(target);

function nearMiss(heard: string, target: string): boolean {
  if (matchesTarget(heard, target) || heard.length < 3) return false;
  const a = soundKey(heard);
  const b = soundKey(target);
  return a === b || (Math.min(a.length, b.length) >= 3 && editDistance(a, b) <= 1);
}

export interface RegistrationData {
  recalled: string[];
  /** Targets not recalled for which a similar-sounding word was said. */
  misheard: string[];
  heardAs: Record<string, string>;
}

export function judgeRegistration(targets: readonly string[], tokens: readonly AsrToken[]) {
  const heard = words(tokens);
  const recalled = targets.filter((t) => heard.some((h) => matchesTarget(h, t)));
  const heardAs: Record<string, string> = {};
  for (const t of targets) {
    if (recalled.includes(t)) continue;
    const miss = heard.find((h) => nearMiss(h, t) && !targets.some((o) => matchesTarget(h, o)));
    if (miss) heardAs[t] = miss;
  }
  const data: RegistrationData = { recalled, misheard: Object.keys(heardAs), heardAs };
  return { correct: null, data };
}

/** Misheard words that recurred in both registration trials (credited at delayed recall). */
function recurringMisheard(registration: readonly { data?: unknown }[]): Record<string, string> {
  const [t1, t2] = registration.map((r) => (r.data as RegistrationData | undefined)?.heardAs ?? {});
  const out: Record<string, string> = {};
  if (!t1 || !t2) return out;
  for (const [target, heard] of Object.entries(t1)) if (t2[target] === heard) out[target] = heard;
  return out;
}

function recalledWords(targets: readonly string[], tokens: readonly AsrToken[], credit: Record<string, string>): string[] {
  const heard = words(tokens);
  return targets.filter((t) => heard.some((h) => matchesTarget(h, t) || credit[t] === h));
}

// ---- Delayed recall ---------------------------------------------------------------------

export interface CuedResponse {
  word: string;
  stage: 'cue' | 'choice';
  tokens: AsrToken[];
}

export function scoreDelayedRecall(
  targets: readonly string[],
  input: { free: AsrToken[]; cued: CuedResponse[]; registration: readonly { data?: unknown }[] },
) {
  const credit = recurringMisheard(input.registration);
  const freeWords = recalledWords(targets, input.free, credit);
  const cueStage = input.cued.filter((c) => c.stage === 'cue' && !freeWords.includes(c.word));
  const cueHits = cueStage.filter((c) => recalledWords([c.word], c.tokens, credit).length > 0).map((c) => c.word);
  const choiceStage = input.cued.filter((c) => c.stage === 'choice' && !freeWords.includes(c.word) && !cueHits.includes(c.word));
  const choiceHits = choiceStage.filter((c) => recalledWords([c.word], c.tokens, credit).length > 0).map((c) => c.word);
  const known = new Set([...targets, ...Object.values(credit)]);
  const intrusions = words(input.free).filter((w) => /^[a-z]{3,}$/.test(w) && !known.has(w) && !targets.some((t) => matchesTarget(w, t)) && !STOP_WORDS.has(w));
  return {
    free: freeWords.length,
    freeWords,
    category: cueStage.length ? cueHits.length : 88,
    choice: choiceStage.length ? choiceHits.length : 88,
    intrusions,
  };
}

const STOP_WORDS = new Set(['the', 'and', 'was', 'were', 'there', 'that', 'this', 'with', 'think', 'remember', 'don', 'dont', "don't", 'know', 'one', 'words', 'word', 'maybe', 'also', 'it', 'its', 'i']);

// ---- Serial 7s -----------------------------------------------------------------------------

export function scoreSerial7(start: number, tokens: readonly AsrToken[]) {
  const answers = normalizeTokens(tokens)
    .map((t) => t.text)
    .filter((t) => /^\d+$/.test(t))
    .map(Number)
    .slice(0, 5);
  let prev = start;
  let correct = 0;
  // Each subtraction is judged against the participant's own previous answer.
  for (const a of answers) {
    if (a === prev - 7) correct++;
    prev = a;
  }
  const points = correct >= 4 ? 3 : correct >= 2 ? 2 : correct === 1 ? 1 : 0;
  return { answers, correct, points };
}

// ---- Sentences -----------------------------------------------------------------------------

export function scoreSentence(target: string, tokens: readonly AsrToken[]) {
  const want = target.toLowerCase().replace(/[^a-z' ]/g, '').split(/\s+/).filter(Boolean);
  const got = words(tokens);
  const value = want.length === got.length && want.every((w, i) => w === got[i]) ? 1 : 0;
  const c = minConf(tokens);
  return { value, confidence: c < SENTENCE_THRESHOLD ? Math.min(c, 0.6) : c, heard: got.join(' ') };
}

// ---- Letter fluency ------------------------------------------------------------------------

const NUMBER_WORDS = new Set([
  'zero', 'one', 'two', 'three', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
  'hundred', 'thousand', 'million', 'billion', 'first', 'second', 'third', 'fourth', 'fifth',
]);
/** Could be a number or another word ("four" / for / fore): a number only next to other numbers. */
const AMBIGUOUS_NUMBERS = new Set(['four']);

/**
 * People and places (proper nouns that are rule violations). A small seed
 * list; out-of-list proper nouns get benefit of the doubt (T7 rule) and the
 * full T7 gazetteer/NER replaces this when T7 is built.
 */
const PEOPLE_AND_PLACES = new Set([
  'fred', 'frank', 'frances', 'francis', 'florence', 'felix', 'fiona', 'france', 'finland', 'florida', 'frankfurt', 'fresno',
  'mary', 'mike', 'mark', 'martha', 'mexico', 'miami', 'michigan', 'maine', 'peter', 'paul', 'paris', 'peru', 'portland',
  'rose', 'robert', 'rachel', 'rome', 'russia', 'reno', 'lisa', 'london', 'john', 'bob', 'boston',
]);

function variantOf(a: string, b: string): boolean {
  // Plural, tense and comparative/superlative only (T7 rule); other shared roots are credited.
  const stems = (w: string) => [w, w.replace(/(es|s|ed|ing|er|est)$/, ''), w.replace(/(ied|ies)$/, 'y'), w.replace(/(ing|ed|er|est)$/, '').replace(/(.)\1$/, '$1')];
  if (a === b) return false;
  const sa = stems(a);
  const sb = stems(b);
  return sa.some((x) => x.length >= 2 && sb.includes(x)) && /(s|es|ed|ing|er|est|ies|ied)$/.test(a.length > b.length ? a : b);
}

export function scoreLetterFluency(letter: string, tokens: readonly AsrToken[]) {
  const L = letter.toLowerCase();
  const heard = normalizeTokens(tokens, { numbers: false }).map((t) => t.text).filter((w) => /^[a-z']+$/.test(w));
  const accepted: string[] = [];
  const rejected: { word: string; reason: string }[] = [];
  heard.forEach((w, i) => {
    const neighbours = [heard[i - 1], heard[i + 1]];
    let reason: string | null = null;
    if (accepted.includes(w) || rejected.some((r) => r.word === w)) reason = 'repetition';
    else if (NUMBER_WORDS.has(w) || (AMBIGUOUS_NUMBERS.has(w) && neighbours.some((n) => n && (NUMBER_WORDS.has(n) || AMBIGUOUS_NUMBERS.has(n))))) reason = 'number';
    else if (!w.startsWith(L)) reason = 'wrong letter';
    else if (PEOPLE_AND_PLACES.has(w)) reason = 'proper noun';
    else if (accepted.some((a) => variantOf(w, a))) reason = 'variant';
    if (reason) rejected.push({ word: w, reason });
    else accepted.push(w);
  });
  const valid = accepted.length;
  // Near the ≥11 cut-off, a judgement call (proper noun, variant) could flip the point.
  const judgementCalls = rejected.some((r) => r.reason === 'proper noun' || r.reason === 'variant');
  const borderline = Math.abs(valid - 11) <= 1 && judgementCalls;
  return { valid, value: valid >= 11 ? 1 : 0, accepted, rejected, confidence: borderline ? Math.min(minConf(tokens), 0.65) : minConf(tokens) };
}

// ---- Abstraction ---------------------------------------------------------------------------

export function scoreAbstraction(tokens: readonly AsrToken[], accept: readonly string[], reject: readonly string[]) {
  const t = text(tokens);
  const ok = accept.some((k) => t.includes(k));
  const bad = reject.some((k) => t.includes(k));
  if (ok && !bad) return { value: 1, needsAdjudication: false, confidence: minConf(tokens) };
  if (bad && !ok) return { value: 0, needsAdjudication: false, confidence: minConf(tokens) };
  // Novel or mixed phrasing: the rubric-constrained adjudicator decides (CLAUDE.md §7).
  return { value: 0, needsAdjudication: true, confidence: 0.4 };
}

// ---- Vigilance -----------------------------------------------------------------------------

export function scoreVigilance(letters: readonly string[], onsets: readonly number[], rateMs: number, taps: readonly number[]) {
  let hits = 0;
  let commissions = 0;
  let omissions = 0;
  let multiTapWindows = 0;
  letters.forEach((letter, i) => {
    const start = onsets[i]!;
    const end = onsets[i + 1] ?? start + rateMs;
    const n = taps.filter((t) => t >= start && t < end).length;
    if (n > 1) multiTapWindows++;
    if (letter === 'A') n > 0 ? hits++ : omissions++;
    else if (n > 0) commissions++;
  });
  const errors = commissions + omissions;
  return { hits, commissions, omissions, errors, multiTapWindows, value: errors <= 1 ? 1 : 0 };
}

// ---- Orientation ---------------------------------------------------------------------------

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_ABBR: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const UNITS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
  thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

export interface DateMention {
  year?: number;
  month?: number;
  day?: number;
  weekday?: number;
  /** Parts not mentioned, in the order of the follow-up prompt. */
  missing: string[];
}

const PART_NAMES = ['year', 'month', 'exact date', 'day of the week'] as const;

/** Parse whatever date parts were said, in any common spoken or written form. */
export function parseDateMention(tokens: readonly AsrToken[]): DateMention {
  const raw = tokens.map((t) => t.token.toLowerCase());
  const out: DateMention = { missing: [] };
  // Written numeric dates: 9/29, 9/29/2026, 9-29-26.
  for (const r of raw) {
    const m = r.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
    if (m) {
      out.month = Number(m[1]);
      out.day = Number(m[2]);
      if (m[3]) out.year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    }
  }
  const w = raw.map((r) => cleanWord(r)).filter(Boolean);
  const numbers: { value: number; ordinal: boolean; at: number }[] = [];
  for (let i = 0; i < w.length; i++) {
    const t = w[i]!;
    const next = w[i + 1];
    if (MONTHS.includes(t)) out.month = MONTHS.indexOf(t) + 1;
    else if (MONTH_ABBR[t]) out.month = MONTH_ABBR[t];
    else if (WEEKDAYS.includes(t)) out.weekday = WEEKDAYS.indexOf(t);
    else if (/^\d+(st|nd|rd|th)$/.test(t)) numbers.push({ value: parseInt(t, 10), ordinal: true, at: i });
    else if (/^\d+$/.test(t)) numbers.push({ value: Number(t), ordinal: false, at: i });
    else if (ORDINALS[t]) numbers.push({ value: ORDINALS[t], ordinal: true, at: i });
    else if (t === 'thousand' && numbers.length && numbers[numbers.length - 1]!.value < 10) {
      // "two thousand twenty five"
      const base = numbers.pop()!.value * 1000;
      let rest = 0;
      let j = i + 1;
      if (TENS[w[j]!] !== undefined) {
        rest = TENS[w[j]!]!;
        if (UNITS[w[j + 1]!] !== undefined && UNITS[w[j + 1]!]! < 10) {
          rest += UNITS[w[j + 1]!]!;
          j++;
        }
        j++;
      } else if (UNITS[w[j]!] !== undefined) {
        rest = UNITS[w[j]!]!;
        j++;
      }
      numbers.push({ value: base + rest, ordinal: false, at: i });
      i = j - 1;
    } else if (TENS[t] !== undefined) {
      if (next && ORDINALS[next] && ORDINALS[next]! < 10) {
        numbers.push({ value: TENS[t]! + ORDINALS[next]!, ordinal: true, at: i });
        i++;
      } else if (next && UNITS[next] !== undefined && UNITS[next]! < 10) {
        numbers.push({ value: TENS[t]! + UNITS[next]!, ordinal: false, at: i });
        i++;
      } else numbers.push({ value: TENS[t]!, ordinal: false, at: i });
    } else if (UNITS[t] !== undefined) numbers.push({ value: UNITS[t]!, ordinal: false, at: i });
  }
  // Years: a 4-digit number, or two adjacent 2-digit numbers ("twenty twenty six").
  for (let k = 0; k < numbers.length; k++) {
    const n = numbers[k]!;
    const m = numbers[k + 1];
    if (!n.ordinal && n.value >= 1900 && n.value <= 2100) {
      out.year ??= n.value;
      numbers.splice(k--, 1);
    } else if (!n.ordinal && m && !m.ordinal && m.at === n.at + 1 && n.value >= 19 && n.value <= 20 && m.value < 100) {
      out.year ??= n.value * 100 + m.value;
      numbers.splice(k, 2);
      k--;
    }
  }
  // Day of month: prefer an ordinal, else a remaining 1–31.
  const day = numbers.find((n) => n.ordinal && n.value >= 1 && n.value <= 31) ?? numbers.find((n) => n.value >= 1 && n.value <= 31);
  if (day && out.day === undefined) out.day = day.value;

  const have = [out.year, out.month, out.day, out.weekday];
  out.missing = PART_NAMES.filter((_, i) => have[i] === undefined);
  return out;
}

/** "year" / "year and month" / "year, month, and exact date". */
export function listMissing(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/** Every follow-up phrase the judge can produce (for pre-rendering clips). */
export function allMissingPhrases(): string[] {
  const out: string[] = [];
  for (let mask = 1; mask < 16; mask++) out.push(listMissing(PART_NAMES.filter((_, i) => mask & (1 << i))));
  return out;
}

/** Local calendar parts of an instant in the participant's time zone. */
export function dateParts(at: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'long' });
  const p = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day), weekday: WEEKDAYS.indexOf(String(p.weekday).toLowerCase()) };
}

export interface MocaProfile {
  city: string;
  location: 'home' | 'other';
  placeName?: string;
}

const RESIDENCE = ['home', 'house', 'apartment', 'condo', 'my place', 'residence', 'flat', 'duplex', 'townhouse', 'trailer'];

export function scoreOrientation(input: { dateTokens: AsrToken[]; placeTokens: AsrToken[]; at: Date; timeZone: string; profile: MocaProfile }) {
  const truth = dateParts(input.at, input.timeZone);
  const said = parseDateMention(input.dateTokens);
  const placeText = text(input.placeTokens);
  const needsReview: string[] = [];

  let place = 0;
  if (input.profile.location === 'home' ? RESIDENCE.some((r) => placeText.includes(r)) : (input.profile.placeName ?? '').toLowerCase().split(/\s+/).filter((x) => x.length > 3).some((x) => placeText.includes(x))) place = 1;
  else if (placeText.trim()) needsReview.push('place'); // named somewhere else: a person decides (D8)

  const cityWords = input.profile.city.toLowerCase().split(/\s+/).filter(Boolean);
  let city = 0;
  if (cityWords.length && cityWords.every((c) => placeText.includes(c))) city = 1;
  else if (placeText.trim()) needsReview.push('city');

  return {
    // Exact: an error of one day on the date or weekday scores 0.
    parts: {
      date: said.day === truth.day ? 1 : 0,
      month: said.month === truth.month ? 1 : 0,
      year: said.year === truth.year ? 1 : 0,
      day: said.weekday === truth.weekday ? 1 : 0,
      place,
      city,
    },
    said,
    truth,
    needsReview,
  };
}

// ---- Live judges ---------------------------------------------------------------------------

interface JudgeInput {
  expected: string;
  items?: string[];
  tokens: AsrToken[];
  asrUnavailable: boolean;
  prior?: Record<string, { data?: unknown }>;
}

const unknown = { correct: null, tag: 'asr_unavailable' } as const;

export const mocaJudges: Record<string, (input: JudgeInput) => { correct: boolean | null; tag?: string; data?: unknown; vars?: Record<string, string> }> = {
  /** Registration trials: recalled words and misheard targets (for trial-2 emphasis). */
  'moca-registration': (i) => (i.asrUnavailable ? unknown : judgeRegistration(i.items ?? [], i.tokens)),

  /** Delayed free recall: which words need cues (with recurring-misheard credit). */
  'moca-free-recall': (i) => {
    if (i.asrUnavailable) return unknown;
    const registration = ['registration1', 'registration2'].map((k) => i.prior?.[k] ?? {});
    const credit = recurringMisheard(registration);
    return { correct: null, data: { recalled: recalledWords(i.items ?? [], i.tokens, credit) } };
  },

  /** One cued word: recalled after the category cue or multiple choice? */
  'moca-cued-word': (i) => {
    if (i.asrUnavailable) return unknown;
    const registration = ['registration1', 'registration2'].map((k) => i.prior?.[k] ?? {});
    return { correct: recalledWords([i.expected], i.tokens, recurringMisheard(registration)).length > 0 };
  },

  'moca-abstraction-practice': (i) => (i.asrUnavailable ? unknown : { correct: text(i.tokens).includes('fruit') }),

  /** Serial 7s live count: close the window after five answers. */
  'moca-serial-count': (i) => ({
    correct: null,
    data: { count: normalizeTokens(i.tokens).filter((t) => /^\d+$/.test(t.text)).length },
  }),

  /** Date: which parts were mentioned, for the one follow-up prompt. */
  'moca-orientation-date': (i) => {
    if (i.asrUnavailable) return unknown;
    const missing = parseDateMention(i.tokens).missing;
    return missing.length ? { correct: null, tag: 'incomplete', vars: { missing: listMissing(missing) } } : { correct: null };
  },
};

// ---- Scorer --------------------------------------------------------------------------------

export interface MocaInput {
  form: Form;
  /** Final response window per step (all windows of a step concatenated where it reopened). */
  responses: {
    digitsForward: AsrToken[];
    digitsBackward: AsrToken[];
    serial7: AsrToken[];
    sentence1: AsrToken[];
    sentence2: AsrToken[];
    fluency: AsrToken[];
    abstraction1: AsrToken[];
    abstraction2: AsrToken[];
    delayedFree: AsrToken[];
    dateTokens: AsrToken[];
    placeTokens: AsrToken[];
  };
  cued: CuedResponse[];
  /** Live judgements of the two registration trials. */
  registration: { data?: unknown }[];
  vigilance: { administered: boolean; reasonCode?: number; letters: string[]; onsets: number[]; rateMs: number; taps: number[] };
  asrUnavailable: boolean;
  /** Wall-clock time of the orientation question. */
  at: Date;
  timeZone: string;
  profile: MocaProfile;
  educationYears: number | null;
  /** Administration stopped early (reason code); unadministered items make the total 88. */
  reasonCode: number | null;
  equated: boolean;
}

export const mocaScorer: Scorer<MocaInput> = {
  scorerId: SCORER_ID,
  scorerVersion: SCORER_VERSION,
  confidenceThreshold: THRESHOLD,

  score(input): ScoreResult {
    const { form, responses: r } = input;
    const items: ItemScore[] = [];
    const reasons: ReviewReason[] = [];
    const item = (itemKey: string, value: number, confidence: number, rationale: string, evidence: readonly AsrToken[] = []) =>
      items.push({ itemKey, value, confidence, rationale, evidenceTokenIds: evidence.map((t) => t.id), scorer: 'auto', scorerVersion: SCORER_VERSION });
    const first = (k: string) => form.items[k]?.[0] ?? '';

    // Vigilance never needs a transcript (taps), so it scores even on an ASR outage.
    let vigilance: number;
    if (!input.vigilance.administered) {
      vigilance = input.vigilance.reasonCode ?? 97;
      item('vigilance', 0, 1, `not administered (reason ${vigilance})`);
    } else {
      const v = scoreVigilance(input.vigilance.letters, input.vigilance.onsets, input.vigilance.rateMs, input.vigilance.taps);
      vigilance = v.value;
      item('vigilance', v.value, v.multiTapWindows ? 0.8 : 0.95, `${v.hits} hits, ${v.commissions} commissions, ${v.omissions} omissions${v.multiTapWindows ? `, ${v.multiTapWindows} multi-tap windows` : ''}`);
    }

    if (input.asrUnavailable) {
      reasons.push('asr_unavailable');
      const fields = {
        digits: null, vigilance, serial7: null, sentences: null, fluency: null, abstraction: null,
        delayedFree: null, delayedCategory: null, delayedChoice: null,
        orientDate: null, orientMonth: null, orientYear: null, orientDay: null, orientPlace: null, orientCity: null, orientation: null,
        total: null, educationAdjustedTotal: null,
      };
      return finalizeScore({ testId: SCORER_ID, scorerId: SCORER_ID, scorerVersion: SCORER_VERSION, items, fields, equated: input.equated }, THRESHOLD, reasons);
    }

    // Digits (Q1e).
    const fwdTarget = first('digitsForward').split('-').map(Number);
    const bwdTarget = first('digitsBackward').split('-').map(Number).reverse();
    const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
    const fwd = parseSpanResponse(r.digitsForward, fwdTarget.length);
    const bwd = parseSpanResponse(r.digitsBackward, bwdTarget.length);
    const fwdOk = same(fwd.digits, fwdTarget) ? 1 : 0;
    const bwdOk = same(bwd.digits, bwdTarget) ? 1 : 0;
    item('digits.forward', fwdOk, fwd.attempts > 1 ? 0.6 : fwd.minConfidence, `heard ${fwd.digits.join('-') || '(nothing)'}`, r.digitsForward);
    item('digits.backward', bwdOk, bwd.attempts > 1 ? 0.6 : bwd.minConfidence, `heard ${bwd.digits.join('-') || '(nothing)'}`, r.digitsBackward);

    // Serial 7s (Q1g).
    const s7 = scoreSerial7(Number(first('serialStart')), r.serial7);
    item('serial7', s7.points, minConf(r.serial7), `answers ${s7.answers.join(', ') || '(none)'}: ${s7.correct} correct`, r.serial7);

    // Sentences (Q1h).
    const [target1 = '', target2 = ''] = form.items.sentences ?? [];
    const sen1 = scoreSentence(target1, r.sentence1);
    const sen2 = scoreSentence(target2, r.sentence2);
    item('sentence1', sen1.value, sen1.confidence, `heard "${sen1.heard}"`, r.sentence1);
    item('sentence2', sen2.value, sen2.confidence, `heard "${sen2.heard}"`, r.sentence2);

    // Letter fluency (Q1i).
    const flu = scoreLetterFluency(first('fluencyLetter'), r.fluency);
    item('fluency', flu.value, flu.confidence, `${flu.valid} valid words (≥11 scores 1)`, r.fluency);

    // Abstraction (Q1j).
    const ab = [1, 2].map((n) =>
      scoreAbstraction(n === 1 ? r.abstraction1 : r.abstraction2, form.items[`abstraction${n}Accept`] ?? [], form.items[`abstraction${n}Reject`] ?? []),
    );
    ab.forEach((a, k) => item(`abstraction${k + 1}`, a.value, a.confidence, a.needsAdjudication ? 'novel phrasing: needs adjudication' : 'matched rubric', k ? r.abstraction2 : r.abstraction1));

    // Delayed recall (Q1k–Q1m).
    const dr = scoreDelayedRecall(form.items.words ?? [], { free: r.delayedFree, cued: input.cued, registration: input.registration });
    item('delayedFree', dr.free, minConf(r.delayedFree), `recalled ${dr.freeWords.join(', ') || 'none'}${dr.intrusions.length ? `; intrusions ${dr.intrusions.join(', ')}` : ''}`, r.delayedFree);

    // Orientation (Q1n–Q1s).
    const ori = scoreOrientation({ dateTokens: r.dateTokens, placeTokens: r.placeTokens, at: input.at, timeZone: input.timeZone, profile: input.profile });
    for (const [k, v] of Object.entries(ori.parts)) {
      const review = ori.needsReview.includes(k);
      item(`orientation.${k}`, v, review ? 0.4 : minConf(k === 'place' || k === 'city' ? r.placeTokens : r.dateTokens), review ? 'does not match profile: needs review (D8)' : '', k === 'place' || k === 'city' ? r.placeTokens : r.dateTokens);
    }
    const orientation = Object.values(ori.parts).reduce((a, b) => a + b, 0);

    const fields: Record<string, number | null> = {
      digits: fwdOk + bwdOk,
      vigilance,
      serial7: s7.points,
      sentences: sen1.value + sen2.value,
      fluency: flu.value,
      abstraction: ab[0]!.value + ab[1]!.value,
      delayedFree: dr.free,
      delayedCategory: dr.category,
      delayedChoice: dr.choice,
      orientDate: ori.parts.date,
      orientMonth: ori.parts.month,
      orientYear: ori.parts.year,
      orientDay: ori.parts.day,
      orientPlace: ori.parts.place,
      orientCity: ori.parts.city,
      orientation,
    };

    // Q1d: sum of 1e–1k and 1n–1s; any scored item not administered → 88.
    const notAdministered = !input.vigilance.administered || input.reasonCode !== null;
    const total = notAdministered ? 88 : fields.digits! + vigilance + fields.serial7! + fields.sentences! + fields.fluency! + fields.abstraction! + dr.free + orientation;
    fields.total = total;
    // D10: +1 for ≤12 years of education, stored separately, capped at the 22-point maximum.
    fields.educationAdjustedTotal = total === 88 ? 88 : input.educationYears !== null && input.educationYears <= 12 ? Math.min(22, total + 1) : total;

    return finalizeScore({ testId: SCORER_ID, scorerId: SCORER_ID, scorerVersion: SCORER_VERSION, items, fields, equated: input.equated }, THRESHOLD, reasons);
  },
};

// ---- From an administration record -----------------------------------------------------------

/** The parts of an engine AdministrationRecord the MoCA scorer reads (structural; no engine dependency). */
export interface MocaRecordLike {
  startedAt: number;
  wallClockStart: number;
  timeZone: string;
  reasonCode: number | null;
  responseWindows: { windowKey: string; stepKey: string; itemIndex: number | null; openedAt: number; closedAt: number | null; asrTokens: AsrToken[]; asrUnavailable: boolean }[];
  stimulusEvents: { stepKey: string; actualOnsetMs: number }[];
  taps: { stepKey: string; atMs: number; phase: 'check' | 'task' }[];
  notAdministered: { stepKey: string; reasonCode: number }[];
  notes: Record<string, { data?: unknown }>;
}

/** Scored response steps (step keys in the T1 spec). */
const SCORED_STEPS = [
  'digitsForward', 'digitsBackward', 'serial7', 'sentence1', 'sentence2', 'fluency',
  'abstraction1', 'abstraction2', 'delayedFree', 'orientDate', 'orientPlace',
] as const;

export function mocaInputFromRecord(
  record: MocaRecordLike,
  form: Form,
  opts: { profile: MocaProfile; educationYears: number | null; vigilanceRateMs?: number; equated?: boolean },
): MocaInput {
  const closed = record.responseWindows.filter((w) => w.closedAt !== null);
  const windows = (stepKey: string) => closed.filter((w) => w.stepKey === stepKey);
  // A step whose window reopened (date follow-up) is scored on everything said.
  const tokens = (stepKey: string) => windows(stepKey).flatMap((w) => w.asrTokens);
  const words = form.items.words ?? [];
  const cued: CuedResponse[] = windows('delayedCues').map((w) => ({
    word: words[w.itemIndex ?? 0] ?? '',
    stage: w.windowKey.includes('.choice#') ? 'choice' : 'cue',
    tokens: w.asrTokens,
  }));
  const dateWindow = windows('orientDate')[0];
  const at = new Date(record.wallClockStart + ((dateWindow?.openedAt ?? record.startedAt) - record.startedAt));
  const notAdmin = record.notAdministered.find((n) => n.stepKey === 'vigilance');
  const scoredWindows = closed.filter((w) => (SCORED_STEPS as readonly string[]).includes(w.stepKey) || w.stepKey === 'delayedCues');
  return {
    form,
    responses: {
      digitsForward: tokens('digitsForward'),
      digitsBackward: tokens('digitsBackward'),
      serial7: tokens('serial7'),
      sentence1: tokens('sentence1'),
      sentence2: tokens('sentence2'),
      fluency: tokens('fluency'),
      abstraction1: tokens('abstraction1'),
      abstraction2: tokens('abstraction2'),
      delayedFree: tokens('delayedFree'),
      dateTokens: tokens('orientDate'),
      placeTokens: tokens('orientPlace'),
    },
    cued,
    registration: [record.notes.registration1 ?? {}, record.notes.registration2 ?? {}],
    vigilance: {
      administered: !notAdmin && record.stimulusEvents.some((e) => e.stepKey === 'vigilance'),
      reasonCode: notAdmin?.reasonCode ?? (record.stimulusEvents.some((e) => e.stepKey === 'vigilance') ? undefined : 97),
      letters: (form.items.letters?.[0] ?? '').split('-'),
      onsets: record.stimulusEvents.filter((e) => e.stepKey === 'vigilance').map((e) => e.actualOnsetMs),
      rateMs: opts.vigilanceRateMs ?? 2_000,
      taps: record.taps.filter((t) => t.stepKey === 'vigilance' && t.phase === 'task').map((t) => t.atMs),
    },
    asrUnavailable: scoredWindows.some((w) => w.asrUnavailable),
    at,
    timeZone: record.timeZone,
    profile: opts.profile,
    educationYears: opts.educationYears,
    reasonCode: record.reasonCode,
    equated: opts.equated ?? false,
  };
}

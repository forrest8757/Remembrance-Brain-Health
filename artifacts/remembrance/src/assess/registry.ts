// Tests available in the web app. Each entry wires a spec to its form
// assignment, live judges and scorer; the runner page is generic.
import { categoryFluencySpec, hearingCheckSpec, mocaSpec, numberSpanSpec, oralTrailsSpec, phonemicFluencySpec, storyDelayedSpec, storyImmediateSpec, toyColorsSpec, type TestSpec } from '@workspace/test-spec';
import { assignForm, categoryFluencyForms, generateNumberSpanForm, hearingCheckForms, mocaForms, oralTrailsForms, phonemicFluencyForms, seedFor, storyForms, storyUnits, toyColorsForms, type Form } from '@workspace/forms';
import { clipRequests } from '@workspace/audio';
import {
  analyzeFluency,
  categoryFluencyJudges,
  categoryFluencyScorer,
  FLUENCY_TRIAL_MS,
  secondCategoryOf,
  type FluencyWord,
  oralTrailsJudges,
  oralTrailsScorer,
  analyzePhonemic,
  hearingCheckJudges,
  hearingCheckScorer,
  analyzeRecall,
  storyRecallJudgesFor,
  storyRecallScorer,
  loadPhonemicDictionary,
  phonemicFluencyJudges,
  phonemicFluencyScorer,
  phonemicLetters,
  PHONEMIC_TRIAL_MS,
  type PhonemicResponse,
  TRAILS_MAX_S,
  type TrailEvent,
  type TrailPartInput,
  mocaInputFromRecord,
  mocaJudges,
  mocaScorer,
  numberSpanJudges,
  numberSpanScorer,
  toyColorsScorer,
  type ScoreResult,
} from '@workspace/scoring';
import { summarizeTrials, type AdministrationRecord, type Judge } from '@workspace/engine';
import type { ParticipantProfile } from '@workspace/ui';
import { readHistory } from './history';

export interface FormPick {
  form: Form;
  administrationNumber: number;
  seed: number;
}

export interface AssessmentEntry {
  id: string;
  title: string;
  /** Plain-language description for the welcome card. */
  blurb: string;
  minutes: number;
  spec: TestSpec;
  judges?: Record<string, Judge>;
  /** Judges that need the form itself (story recall); takes precedence over `judges`. */
  judgesFor?: (form: Form) => Record<string, Judge>;
  pickForm(userId: string, history: { formId: string }[]): FormPick;
  /** Load anything the judges need before the test starts (e.g. a dictionary). */
  prepare?: () => Promise<void>;
  score(record: AdministrationRecord, form: Form, profile: ParticipantProfile | null): ScoreResult;
  /** Try-out preview (DEVIATIONS P-9): the official scores, each with a plain-language reason. */
  report(score: ScoreResult, record: AdministrationRecord, form: Form): ResultReport;
}

/** One official score line, e.g. "8 of 14" for C2T Q5a. */
export interface ResultSection {
  label: string;
  value: string;
  why: string;
}

export interface ResultReport {
  /** The test's main official score(s), shown large. */
  headline: { value: string; caption: string }[];
  sections: ResultSection[];
  /** Anything that affected the scores: stopped early, answers being reviewed. */
  notes: string[];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
/** Score fields: null = couldn't be scored automatically (review queue); 88+ = a "not given" code. */
const REVIEW = 'Being reviewed';
const REVIEW_WHY = "We couldn't make out an answer here clearly, so a person will check it before this part is scored.";
const outOf = (v: number | null | undefined, max: number) =>
  v === null || v === undefined ? REVIEW : v >= 88 ? 'Not given' : `${v} of ${max}`;
const reviewNote = (s: ScoreResult) =>
  s.needsReview ? ['Some answers are waiting for a person to check them, so a score here could still change.'] : [];

const toyColors: AssessmentEntry = {
  id: 'toy-colors',
  title: 'Say three colors',
  blurb: "You'll hear a few words, then say them back. It's a short practice of how these activities work.",
  minutes: 1,
  spec: toyColorsSpec,
  pickForm(userId, history) {
    const a = assignForm({ userId, testId: 'toy-colors', forms: toyColorsForms, history, licensedContent: false });
    return { form: a.form, administrationNumber: a.administrationNumber, seed: a.seed };
  },
  score(record, form) {
    const recall = record.responseWindows.filter((w) => w.stepKey === 'recall').at(-1);
    return toyColorsScorer.score({
      form,
      recall: { tokens: recall?.asrTokens ?? [], asrUnavailable: recall?.asrUnavailable ?? true },
      equated: form.equated,
    });
  },
  report: (s, record, form) => ({
    headline: [{ value: outOf(s.fields.recalled, 3), caption: 'colors remembered' }],
    sections: [
      {
        label: 'Colors remembered',
        value: outOf(s.fields.recalled, 3),
        why:
          s.fields.recalled === null
            ? REVIEW_WHY
            : `You said ${s.fields.recalled} of the 3 colors (${(form.items.colors ?? []).join(', ')}).${s.fields.intrusions ? ` You also said ${plural(s.fields.intrusions, 'other color')}, which doesn't change the score.` : ''}`,
      },
    ],
    notes: [...(record.status !== 'complete' ? ['The activity was stopped before the end.'] : []), ...reviewNote(s)],
  }),
};

const numberSpan: AssessmentEntry = {
  id: 'number-span',
  title: 'Number Span',
  blurb: "You'll hear some numbers and say them back, first in the same order, then backward.",
  minutes: 5,
  spec: numberSpanSpec,
  judges: numberSpanJudges,
  // Procedural forms: a fresh, reproducible form every administration (T3).
  pickForm(userId, history) {
    const administrationNumber = history.length + 1;
    const seed = seedFor(userId, 'number-span', administrationNumber);
    return { form: generateNumberSpanForm(seed), administrationNumber, seed };
  },
  score(record, form) {
    const blocks = summarizeTrials(record, numberSpanSpec, form);
    return numberSpanScorer.score({
      form,
      responses: (['forward', 'backward'] as const).flatMap((direction) =>
        (blocks[direction]?.responses ?? []).map((r) => ({ direction, ...r })),
      ),
      completed: { forward: blocks.forward?.completed ?? false, backward: blocks.backward?.completed ?? false },
      reasonCode: record.reasonCode,
      equated: form.equated,
    });
  },
  // Official fields (build doc T3): per direction, sequences correct 0–14
  // (C2T Q5a / Q6a) and the longest span with a correct trial (Q5b / Q6b).
  // An unfinished direction gets no official score (reason code, span blank).
  report(s, record, form) {
    const blocks = summarizeTrials(record, numberSpanSpec, form);
    const headline: ResultReport['headline'] = [];
    const sections: ResultSection[] = [];
    for (const d of ['forward', 'backward'] as const) {
      const list = form.items[d] ?? [];
      const name = d === 'forward' ? 'Same order' : 'Reverse order';
      const total = s.fields[`${d}Total`];
      const span = s.fields[`${d}LongestSpan`];
      const mine = s.items.filter((i) => i.itemKey.startsWith(`${d}.`));
      const correct = mine.filter((i) => i.value === 1).length;
      const block = blocks[d];

      if (!block?.completed) {
        headline.push({ value: 'Not finished', caption: `numbers in ${name.toLowerCase()}` });
        sections.push({
          label: `${name}: sequences correct`,
          value: 'No official score',
          why: mine.length
            ? `This part was stopped after ${plural(mine.length, 'sequence')} (${correct} correct so far). The test only gives an official score to a part that's finished.`
            : "This part wasn't reached, so it has no score.",
        });
        continue;
      }
      headline.push({ value: outOf(total, list.length), caption: `numbers in ${name.toLowerCase()}` });
      const stoppedByRule = block.discontinuedAfter !== null && mine.length < list.length;
      sections.push({
        label: `${name}: sequences correct`,
        value: outOf(total, list.length),
        why:
          total === null
            ? REVIEW_WHY
            : `You repeated ${total} of the ${list.length} sequences ${d === 'forward' ? 'in the same order' : 'backward'}. Each correct sequence is one point.` +
              (stoppedByRule
                ? ` This part stops after two misses at the same length, so the ${plural(list.length - mine.length, 'longer sequence')} after that weren't given. That's how the test is designed; almost no one reaches the end.`
                : ''),
      });
      sections.push({
        label: `${name}: longest span`,
        value: span === null || span === undefined ? REVIEW : span === 0 ? 'None' : `${span} digits`,
        why:
          span === null || span === undefined
            ? REVIEW_WHY
            : span === 0
              ? 'No sequence was repeated correctly in this part.'
              : `The longest sequence you repeated correctly at least once was ${span} digits.`,
      });
    }
    return { headline, sections, notes: [...(record.status !== 'complete' ? ['The activity was stopped before the end.'] : []), ...reviewNote(s)] };
  },
};

const moca: AssessmentEntry = {
  id: 'moca-blind',
  title: 'Memory and Thinking Check',
  blurb: "A short conversation with a mix of memory, attention and word activities. You'll listen, answer out loud, and tap the screen once.",
  minutes: 10,
  spec: mocaSpec,
  judges: mocaJudges,
  // Off by default: mocaSpec.requiresPermission (MoCA trademark/license, build doc §3b).
  // D5: original forms only; Form A (licensed) is never assigned.
  pickForm(userId, history) {
    const a = assignForm({ userId, testId: 'moca-blind', forms: mocaForms, history, licensedContent: false });
    return { form: a.form, administrationNumber: a.administrationNumber, seed: a.seed };
  },
  score(record, form, profile) {
    return mocaScorer.score(
      mocaInputFromRecord(record, form, {
        profile: profile ?? { city: '', location: 'home' },
        educationYears: profile?.educationYears ?? null,
        equated: form.equated,
      }),
    );
  },
  // Official fields (build doc T1): Q1e–Q1s and the total Q1d (max 22; 88
  // when any scored part wasn't given), plus the education-adjusted total (D10).
  report(s, record, form) {
    const f = s.fields;
    const why = (key: string) => s.items.find((i) => i.itemKey === key)?.rationale ?? '';
    const sec = (label: string, key: string, max: number, text: () => string): ResultSection => ({
      label,
      value: outOf(f[key], max),
      why: f[key] === null || f[key] === undefined ? REVIEW_WHY : (f[key] as number) >= 88 ? "This part wasn't given." : text(),
    });
    const missedOrientation = [
      ['orientDate', 'the date'], ['orientMonth', 'the month'], ['orientYear', 'the year'],
      ['orientDay', 'the day of the week'], ['orientPlace', 'the place'], ['orientCity', 'the city'],
    ].filter(([k]) => f[k!] === 0).map(([, name]) => name);
    const hinted = [
      typeof f.delayedCategory === 'number' && f.delayedCategory < 88 ? `${f.delayedCategory} after a category hint` : null,
      typeof f.delayedChoice === 'number' && f.delayedChoice < 88 ? `${f.delayedChoice} after hearing choices` : null,
    ].filter(Boolean);

    const sections: ResultSection[] = [
      sec('Repeating numbers', 'digits', 2, () => `You repeated ${f.digits} of the 2 number sequences correctly (one forward, one backward).`),
      {
        ...sec('Tapping for a letter', 'vigilance', 1, () =>
          `${f.vigilance ? 'One point: no more than one mistake.' : 'No point: two or more mistakes (a missed tap or an extra tap).'} (${why('vigilance')})`,
        ),
        ...(f.vigilance === 97 ? { value: 'Not given', why: "Taps couldn't be detected on this device, so this part wasn't given." } : {}),
      },
      sec('Counting back by 7s', 'serial7', 3, () =>
        `Starting from ${form.items.serialStart?.[0] ?? 'the start number'}, ${why('serial7').replace(/^answers /, 'you said ')}. Each answer is checked against your previous one: 4–5 right is 3 points, 2–3 is 2, one is 1.`,
      ),
      sec('Repeating sentences', 'sentences', 2, () => `You repeated ${f.sentences} of the 2 sentences exactly. A sentence counts only if every word matches.`),
      sec('Naming words by letter', 'fluency', 1, () =>
        `You said ${why('fluency').replace(/ \(≥11 scores 1\)$/, '')} starting with ${form.items.fluencyLetter?.[0] ?? 'the letter'} in one minute. 11 or more earns the point.`,
      ),
      sec('How things are alike', 'abstraction', 2, () => `You described ${f.abstraction} of the 2 pairs by what they have in common.`),
      sec('Remembering the 5 words', 'delayedFree', 5, () =>
        `You remembered ${f.delayedFree} of the 5 words without hints.${hinted.length ? ` You also remembered ${hinted.join(' and ')}; those are recorded but don't earn points.` : ''}`,
      ),
      sec('Date and place', 'orientation', 6, () =>
        missedOrientation.length ? `You got ${f.orientation} of 6 exactly right. Missed: ${missedOrientation.join(', ')}.` : 'You got all 6 exactly right: date, month, year, day, place and city.',
      ),
    ];

    const headline: ResultReport['headline'] =
      f.total === null || f.total === undefined
        ? [{ value: REVIEW, caption: 'total' }]
        : f.total === 88
          ? [{ value: 'Not finished', caption: 'total: given only when every part is finished' }]
          : [{ value: `${f.total} of 22`, caption: 'total' }];
    const notes: string[] = [];
    if (typeof f.educationAdjustedTotal === 'number' && typeof f.total === 'number' && f.total < 88 && f.educationAdjustedTotal > f.total) {
      notes.push(`With the education adjustment (one point for 12 or fewer years of school), your total is ${f.educationAdjustedTotal} of 22.`);
    }
    if (record.status !== 'complete') notes.push('The activity was stopped before the end.');
    return { headline, sections, notes: [...notes, ...reviewNote(s)] };
  },
};

/** The last response window of a step, as a fluency trial (complete = ran the full 60 s). */
function fluencyTrial(record: AdministrationRecord, stepKey: string) {
  const w = record.responseWindows.filter((x) => x.stepKey === stepKey).at(-1);
  return w ? { tokens: w.asrTokens, asrUnavailable: w.asrUnavailable, completed: w.closeReason === 'timeout' } : null;
}

const quoteList = (ws: FluencyWord[]) => ws.map((w) => `"${w.text}"`).join(', ');

/** Plain-language noun and example subgroups per category, for the results text. */
const CATEGORY_WORDS: Record<string, { one: string; groups: string }> = {
  animals: { one: 'animal', groups: 'pets, farm animals or birds' },
  vegetables: { one: 'vegetable', groups: 'leafy greens, root vegetables or beans' },
  fruits: { one: 'fruit', groups: 'berries, citrus or tropical fruits' },
  occupations: { one: 'job', groups: 'health care, the trades or teaching' },
};

const categoryFluency: AssessmentEntry = {
  id: 'category-fluency',
  title: 'Naming Things',
  blurb: "You'll hear a category, like animals, and name as many things in it as you can in one minute.",
  minutes: 4,
  spec: categoryFluencySpec,
  judges: categoryFluencyJudges,
  // Animals is fixed; the second category rotates (Form A vegetables, B fruits, C occupations).
  pickForm(userId, history) {
    const a = assignForm({ userId, testId: 'category-fluency', forms: categoryFluencyForms, history, licensedContent: false });
    return { form: a.form, administrationNumber: a.administrationNumber, seed: a.seed };
  },
  score(record, form) {
    return categoryFluencyScorer.score({
      form,
      animals: fluencyTrial(record, 'animals'),
      second: fluencyTrial(record, 'second'),
      reasonCode: record.reasonCode,
      equated: form.equated,
    });
  },
  // Official fields (build doc T6): Animals 0–77 (C2T Q9a), second category 0–77 (Q9b for Vegetables).
  report(s, record, form) {
    const headline: ResultReport['headline'] = [];
    const sections: ResultSection[] = [];
    const trials = [
      ['animals', 'animals', 'Animals'],
      ['secondCategory', secondCategoryOf(form), form.items.categoryTitle?.[0] ?? 'Second category'],
    ] as const;
    for (const [field, category, title] of trials) {
      const value = s.fields[field];
      const trial = fluencyTrial(record, field === 'animals' ? 'animals' : 'second');
      if (value === null || value === undefined) {
        headline.push({ value: REVIEW, caption: `${title.toLowerCase()} named` });
        sections.push({ label: title, value: REVIEW, why: REVIEW_WHY });
        continue;
      }
      if (value >= 88 || !trial) {
        headline.push({ value: 'Not finished', caption: `${title.toLowerCase()} named` });
        sections.push({ label: title, value: 'No official score', why: "This minute wasn't finished, so it has no score." });
        continue;
      }
      const a = analyzeFluency(category, trial.tokens, { cutoffMs: FLUENCY_TRIAL_MS });
      const of = (status: FluencyWord['status']) => a.words.filter((w) => w.status === status);
      const words = CATEGORY_WORDS[category] ?? { one: 'item', groups: 'related groups' };
      const parts = [`You named ${plural(value, words.one)} in one minute. Each different one counts once.`];
      if (of('repetition').length) parts.push(`Said more than once (counted once): ${quoteList(of('repetition'))}.`);
      if (of('noCredit').length) parts.push(`Not counted by the test's rules: ${of('noCredit').map((w) => `"${w.text}" (${w.reason})`).join(', ')}.`);
      if (of('intrusion').length) parts.push(`From a different category, so not counted: ${quoteList(of('intrusion'))}.`);
      if (of('unrecognized').length) parts.push(`A person will check these, which could add to your score: ${quoteList(of('unrecognized'))}.`);
      if (a.words.some((w) => w.status === 'credited' && w.review)) parts.push(`Counted for now, pending a check: ${quoteList(a.words.filter((w) => w.status === 'credited' && w.review))}.`);
      if (of('late').length) parts.push(`Said after the minute was up, so not counted: ${quoteList(of('late'))}.`);
      headline.push({ value: String(value), caption: `${title.toLowerCase()} named` });
      sections.push({ label: title, value: `${value} counted`, why: parts.join(' ') });
      if (value > 0) {
        sections.push({
          label: `${title}: pace over the minute`,
          value: a.bins.join(' · '),
          why: `Words in each 15 seconds: ${a.bins.join(', ')}. Most people name more at the start and slow down; that's expected.${a.switches !== null ? ` You moved between groups (like ${words.groups}) ${plural(a.switches, 'time')}.` : ''}`,
        });
      }
    }
    return { headline, sections, notes: [...(record.status !== 'complete' ? ['The activity was stopped before the end.'] : []), ...reviewNote(s)] };
  },
};

/** One Oral Trails part from the record: the live decoder's events and how the window ended. */
function trailPart(record: AdministrationRecord, stepKey: string): TrailPartInput {
  const events = record.sequenceEvents.filter((e) => e.stepKey === stepKey) as unknown as TrailEvent[];
  if (record.notAdministered.some((n) => n.stepKey === stepKey)) return { events, outcome: 'notAdministered', asrUnavailable: false };
  const w = record.responseWindows.filter((x) => x.stepKey === stepKey).at(-1);
  const outcome =
    w?.closeReason === 'count' ? 'done' : w?.closeReason === 'timeout' ? 'timeout' : w?.closeReason === 'discontinue' ? 'discontinued' : 'incomplete';
  return { events, outcome, asrUnavailable: w?.asrUnavailable ?? false };
}

const oralTrails: AssessmentEntry = {
  id: 'oral-trails',
  title: 'Counting Quickly',
  blurb: "You'll count out loud as quickly as you can, then switch back and forth between numbers and letters.",
  minutes: 5,
  spec: oralTrailsSpec,
  judges: oralTrailsJudges,
  // One fixed form (counting is fixed); practice effects are handled statistically (build doc T8).
  pickForm(_userId, history) {
    return { form: oralTrailsForms[0]!, administrationNumber: history.length + 1, seed: 0 };
  },
  score(record, form) {
    const partB = trailPart(record, 'partB');
    return oralTrailsScorer.score({
      form,
      partA: trailPart(record, 'partA'),
      partB,
      partBReasonCode: record.notAdministered.find((n) => n.stepKey === 'partB')?.reasonCode ?? null,
      discontinueReasonCode: 996,
      practiceAttempts: record.responseWindows.filter((w) => w.stepKey === 'bPractice').length || null,
      equated: form.equated,
    });
  },
  // Official fields (build doc T8): time (s, capped at 100 / 300), errors, correct, per part.
  report(s, record) {
    const f = s.fields;
    const headline: ResultReport['headline'] = [];
    const sections: ResultSection[] = [];
    const parts = [
      ['partA', 'Counting 1 to 25', TRAILS_MAX_S.A, 'numbers'],
      ['partB', 'Switching numbers and letters', TRAILS_MAX_S.B, 'numbers and letters'],
    ] as const;
    for (const [key, title, maxS, what] of parts) {
      const part = trailPart(record, key);
      const time = f[`${key}Time`];
      const errors = f[`${key}Errors`];
      if (part.outcome === 'notAdministered') {
        const gate = record.notAdministered.find((n) => n.stepKey === key);
        const why = gate?.reason === 'gate:pretest'
          ? "This part needs the alphabet from A to L first, and that check didn't go smoothly, so it wasn't given. That's the test's rule, not a score."
          : "The practice round didn't come together after three tries, so this part wasn't given. That's the test's rule, not a score.";
        headline.push({ value: 'Not given', caption: title.toLowerCase() });
        sections.push({ label: title, value: 'Not given', why });
        continue;
      }
      if (part.outcome === 'discontinued' || part.outcome === 'incomplete') {
        headline.push({ value: 'Not finished', caption: title.toLowerCase() });
        sections.push({
          label: title,
          value: 'No official score',
          why:
            part.outcome === 'discontinued'
              ? 'This part stops after about 20 seconds without progress, as the test requires. An unfinished part has no official time.'
              : 'This part was stopped before the end, so it has no official time.',
        });
        continue;
      }
      if (time === null || time === undefined) {
        headline.push({ value: REVIEW, caption: title.toLowerCase() });
        sections.push({ label: title, value: REVIEW, why: REVIEW_WHY });
        continue;
      }
      const ev = part.events;
      const keepGoing = ev.filter((e) => e.type === 'keepGoing').length;
      const selfFixed = ev.filter((e) => e.type === 'selfCorrection').length;
      const timedOut = part.outcome === 'timeout';
      headline.push({ value: timedOut ? `${maxS} s (time limit)` : `${time} s`, caption: title.toLowerCase() });
      const why = [
        timedOut
          ? `The time limit is ${maxS} seconds, and the score for not finishing in time is ${maxS}.`
          : `You reached the end in ${time} seconds. The clock ran the whole time, including any corrections.`,
        errors
          ? `${plural(errors as number, 'mistake')}: ${errors === 1 ? '' : 'each time '}you heard where you'd got to and carried on. Mistakes don't change the time directly, but the correction takes a few seconds.`
          : 'No mistakes.',
      ];
      if (selfFixed) why.push(`You fixed ${plural(selfFixed, 'slip')} yourself right away; those don't count as mistakes.`);
      if (keepGoing) why.push(`You heard "Please keep going" ${keepGoing === 1 ? 'once, after a pause' : `${keepGoing} times, after pauses`} of 5 seconds.`);
      sections.push({ label: title, value: timedOut ? `${maxS} s` : `${time} s`, why: why.join(' ') });
      sections.push({ label: `${title}: ${what} in order`, value: `${f[`${key}Correct`]} of 25`, why: `How many of the 25 ${what} you said in the right order.` });
    }
    if (typeof f.switchCost === 'number') {
      sections.push({
        label: 'Extra time for switching',
        value: `${f.switchCost} s`,
        why: `Switching between numbers and letters took ${f.switchCost} seconds longer than counting alone. That extra time is the part that reflects mental flexibility; almost everyone is slower when switching.`,
      });
    }
    return { headline, sections, notes: [...(record.status !== 'complete' ? ['The activity was stopped before the end.'] : []), ...reviewNote(s)] };
  },
};

const RULE_WORDS: Partial<Record<PhonemicResponse['rule'], string>> = {
  'R-VIO-LETTER': "doesn't start with the letter",
  'R-VIO-NAME': "a person's name",
  'R-VIO-PLACE': 'a place',
  'R-VIO-NUMBER': 'a number',
  'R-VIO-VARIANT': 'the same word with a different ending',
};

const phonemicFluency: AssessmentEntry = {
  id: 'phonemic-fluency',
  title: 'Words by Letter',
  blurb: "You'll hear a letter and say as many words as you can that start with it, in one minute. Then a second letter.",
  minutes: 4,
  spec: phonemicFluencySpec,
  judges: phonemicFluencyJudges,
  // Form A (F, L) is the NACC pair; B (S, W) and C (A, H) rotate in.
  pickForm(userId, history) {
    const a = assignForm({ userId, testId: 'phonemic-fluency', forms: phonemicFluencyForms, history, licensedContent: false });
    return { form: a.form, administrationNumber: a.administrationNumber, seed: a.seed };
  },
  prepare: loadPhonemicDictionary,
  score(record, form) {
    return phonemicFluencyScorer.score({
      form,
      first: fluencyTrial(record, 'first'),
      second: fluencyTrial(record, 'second'),
      reasonCode: record.reasonCode,
      equated: form.equated,
    });
  },
  // Official fields (build doc T7): per letter correct (0–40), repetitions, rule breaks; totals (C2T Q10a–i).
  report(s, record, form) {
    const f = s.fields;
    const letters = phonemicLetters(form);
    const headline: ResultReport['headline'] = [];
    const sections: ResultSection[] = [];
    (['first', 'second'] as const).forEach((prefix, k) => {
      const letter = letters[k]!;
      const correct = f[`${prefix}Correct`];
      const title = `Words starting with ${letter}`;
      const trial = fluencyTrial(record, prefix);
      if (correct === null || correct === undefined) {
        headline.push({ value: REVIEW, caption: `${letter} words` });
        sections.push({ label: title, value: REVIEW, why: REVIEW_WHY });
        return;
      }
      if (correct >= 88 || !trial) {
        headline.push({ value: 'Not finished', caption: `${letter} words` });
        sections.push({ label: title, value: 'No official score', why: "This minute wasn't finished, so it has no score." });
        return;
      }
      const a = analyzePhonemic(letter, trial.tokens, { cutoffMs: PHONEMIC_TRIAL_MS });
      const by = (st: PhonemicResponse['status']) => a.responses.filter((r) => r.status === st);
      const why = [`You said ${plural(correct, 'word')} that count. Each different word starting with ${letter} counts once.`];
      if (by('repetition').length) why.push(`Said more than once (counted once): ${by('repetition').map((r) => `"${r.text}"`).join(', ')}.`);
      if (by('violation').length) why.push(`Didn't count by the rules: ${by('violation').map((r) => `"${r.text}" (${RULE_WORDS[r.rule] ?? 'rule'})`).join(', ')}.`);
      if (by('unverified').length) why.push(`A person will check these, which could add to your score: ${by('unverified').map((r) => `"${r.text}"`).join(', ')}.`);
      const doubt = a.responses.filter((r) => r.status === 'correct' && r.review);
      if (doubt.length) why.push(`Counted with the benefit of the doubt, pending a check: ${doubt.map((r) => `"${r.text}"`).join(', ')}.`);
      if (by('late').length) why.push(`Said after the minute was up, so not counted: ${by('late').map((r) => `"${r.text}"`).join(', ')}.`);
      headline.push({ value: String(correct), caption: `${letter} words` });
      sections.push({ label: title, value: `${correct} counted`, why: why.join(' ') });
      if (correct > 0) {
        sections.push({
          label: `${letter}: pace over the minute`,
          value: a.bins.join(' · '),
          why: `Words in each 15 seconds: ${a.bins.join(', ')}. Most people slow down as the minute goes on.${a.switches !== null ? ` You moved between sound groups (words starting the same way or rhyming) ${plural(a.switches, 'time')}.` : ''}`,
        });
      }
    });
    if (typeof f.totalCorrect === 'number') {
      sections.unshift({
        label: 'Both letters together',
        value: `${f.totalCorrect} words`,
        why: `${f.totalCorrect} words counted across both letters, with ${plural(f.totalRepetitions ?? 0, 'repeat')} and ${plural(f.totalViolations ?? 0, 'rule break')}.`,
      });
    }
    return { headline, sections, notes: [...(record.status !== 'complete' ? ['The activity was stopped before the end.'] : []), ...reviewNote(s)] };
  },
};

/** All recall windows of a step, joined (an interrupted recall resumes in a new window). */
function storyRecall(record: AdministrationRecord) {
  const ws = record.responseWindows.filter((w) => w.stepKey === 'recall');
  return ws.length ? { tokens: ws.flatMap((w) => w.asrTokens), asrUnavailable: ws.some((w) => w.asrUnavailable) } : null;
}
const storyCompleted = (record: AdministrationRecord) =>
  record.status === 'complete' && record.responseWindows.some((w) => w.stepKey === 'recall' && w.closedAt !== null);

const storyImmediate: AssessmentEntry = {
  id: 'story-immediate',
  title: 'A Short Story',
  blurb: "You'll hear a short story once, then tell it back in your own words. Later, you'll be asked about it again.",
  minutes: 3,
  spec: storyImmediateSpec,
  judgesFor: storyRecallJudgesFor,
  // Four original stories rotate; never the same one twice in a row.
  pickForm(userId, history) {
    const a = assignForm({ userId, testId: 'story-immediate', forms: storyForms, history, licensedContent: false });
    return { form: a.form, administrationNumber: a.administrationNumber, seed: a.seed };
  },
  score(record, form) {
    return storyRecallScorer.score({ form, recall: storyRecall(record), completed: storyCompleted(record), reasonCode: record.reasonCode, equated: form.equated });
  },
  // Official fields: exact words (/44, Q3a-style) and ideas (/25, Q3b-style). No story details here: they'd cue the later recall.
  report(s) {
    const v = s.fields.verbatim;
    const p = s.fields.paraphrase;
    if (v === null || v === undefined) return { headline: [{ value: REVIEW, caption: 'story' }], sections: [{ label: 'Story', value: REVIEW, why: REVIEW_WHY }], notes: [] };
    if (v >= 88) {
      return {
        headline: [{ value: 'Not finished', caption: 'story' }],
        sections: [{ label: 'Story', value: 'No official score', why: 'The story can only be told once, so if it was interrupted while it was being told, this part has no score.' }],
        notes: [],
      };
    }
    return {
      headline: [
        { value: `${v} of 44`, caption: 'exact words' },
        { value: `${p} of 25`, caption: 'ideas' },
      ],
      sections: [
        { label: 'Exact words', value: `${v} of 44`, why: `The story has 44 key words. You used ${v} of them, in any order. Small changes like "walks" for "walked" still count.` },
        { label: 'Ideas', value: `${p} of 25`, why: `The story has 25 ideas. You got across ${p} of them, in your own words or the story's. The two scores are separate, not added together.` },
      ],
      notes: [
        "Details of what you remembered come after the second part, so they don't give anything away.",
        ...reviewNote(s),
      ],
    };
  },
};

/** The delayed recall always uses the form of the latest immediate recall. */
function lastImmediate() {
  const h = readHistory('story-immediate').at(-1);
  return { form: storyForms.find((f) => f.formId === h?.formId) ?? storyForms[0]!, at: h?.at ?? null, fields: h?.fields ?? null };
}

const storyDelayed: AssessmentEntry = {
  id: 'story-delayed',
  title: 'The Story Again',
  blurb: 'A little while after the short story, tell it again from memory.',
  minutes: 2,
  spec: storyDelayedSpec,
  judgesFor: storyRecallJudgesFor,
  pickForm() {
    const { form } = lastImmediate();
    return { form, administrationNumber: readHistory('story-delayed').length + 1, seed: 0 };
  },
  score(record, form) {
    const { at } = lastImmediate();
    const minutes = at === null ? 99 : Math.round((record.wallClockStart - at) / 60_000);
    const cueNeeded = record.promptEvents.some((p) => p.stepKey === 'recall' && p.promptKey === 'followUp');
    return storyRecallScorer.score({
      form,
      recall: storyRecall(record),
      completed: storyCompleted(record),
      reasonCode: record.reasonCode,
      delayed: { minutes, cueNeeded },
      equated: form.equated,
    });
  },
  // Official fields: exact words (Q8a-style), ideas (Q8b), delay minutes (Q8c), cue needed (Q8d); retention derived.
  report(s, record, form) {
    const f = s.fields;
    const v = f.verbatim;
    const p = f.paraphrase;
    if (v === null || v === undefined) return { headline: [{ value: REVIEW, caption: 'story' }], sections: [{ label: 'Story', value: REVIEW, why: REVIEW_WHY }], notes: [] };
    if (v >= 88) return { headline: [{ value: 'Not finished', caption: 'story' }], sections: [{ label: 'Story', value: 'No official score', why: "This part wasn't finished, so it has no score." }], notes: [] };
    const units = storyUnits(form);
    const a = analyzeRecall(form, storyRecall(record)?.tokens ?? []);
    const got = a.units.filter((u) => u.awarded).map((u) => units[u.unit - 1]!.label);
    const missed = a.units.filter((u) => !u.awarded).map((u) => units[u.unit - 1]!.label);
    const before = lastImmediate().fields;
    const sections: ResultSection[] = [
      { label: 'Exact words', value: `${v} of 44`, why: `You used ${v} of the story's 44 key words, in any order.` },
      {
        label: 'Ideas',
        value: `${p} of 25`,
        why: `You got across ${p} of the 25 ideas.${got.length ? ` Remembered: ${got.map((g) => `"${g}"`).join(', ')}.` : ''}${missed.length ? ` Not mentioned: ${missed.map((m) => `"${m}"`).join(', ')}.` : ''}`,
      },
      {
        label: 'Time since the first telling',
        value: f.delayMinutes === 99 ? 'Unknown' : `${f.delayMinutes} minutes`,
        why: f.delayMinutes === 99 ? "We couldn't tell when you first heard the story." : 'The story is asked about again after about 20 minutes.',
      },
    ];
    if (f.cueNeeded) sections.push({ label: 'Reminder', value: 'Given', why: 'You heard a short reminder of what the story was about before telling it. That is recorded, and scored the same way.' });
    if (typeof before?.paraphrase === 'number' && before.paraphrase > 0 && typeof p === 'number') {
      sections.push({ label: 'Kept since the first telling', value: `${Math.round((p / before.paraphrase) * 100)}%`, why: `You recalled ${before.paraphrase} ideas right after hearing the story and ${p} now. Some loss over time is normal.` });
    }
    return { headline: [{ value: `${v} of 44`, caption: 'exact words' }, { value: `${p} of 25`, caption: 'ideas' }], sections, notes: reviewNote(s) };
  },
};

/** P1 hearing screen's repetition task (run by the session shell, not on its own list). */
const hearingCheck: AssessmentEntry = {
  id: 'hearing-check',
  title: 'Hearing check',
  blurb: "You'll hear a short sentence and say it back, so we know you can hear clearly.",
  minutes: 1,
  spec: hearingCheckSpec,
  judges: hearingCheckJudges,
  pickForm: () => ({ form: hearingCheckForms[0]!, administrationNumber: 1, seed: 0 }),
  score(record, form) {
    const last = record.trialResults.filter((r) => r.stepKey === 'repeat').at(-1);
    return hearingCheckScorer.score({ form, passed: last ? last.correct : false, tries: record.responseWindows.filter((w) => w.stepKey === 'repeat').length });
  },
  report: (s) => ({
    headline: [{ value: s.fields.passed === 1 ? 'Heard clearly' : s.fields.passed === 0 ? 'Not clear yet' : 'Not checked', caption: 'hearing' }],
    sections: [],
    notes: [],
  }),
};

export const ASSESSMENTS: Record<string, AssessmentEntry> = {
  [hearingCheck.id]: hearingCheck,
  [storyImmediate.id]: storyImmediate,
  [storyDelayed.id]: storyDelayed,
  [phonemicFluency.id]: phonemicFluency,
  [oralTrails.id]: oralTrails,
  [categoryFluency.id]: categoryFluency,
  [moca.id]: moca,
  [numberSpan.id]: numberSpan,
  [toyColors.id]: toyColors,
};

/**
 * Tests that need permission stay off unless the owner lists them, e.g.
 * VITE_PERMITTED_TESTS=moca-blind (decision 2026-10-01).
 */
const PERMITTED = new Set(String(import.meta.env.VITE_PERMITTED_TESTS ?? '').split(',').map((x) => x.trim()).filter(Boolean));
export const isAvailable = (entry: AssessmentEntry) => !entry.spec.requiresPermission || PERMITTED.has(entry.id);

/** Every clip an administration of this form can need, for preloading. */
export function clipIdsFor(spec: TestSpec, form: Form): string[] {
  return clipRequests(spec, form).map((r) => r.clipId);
}

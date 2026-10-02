// T7: a unit test for every example in the build doc's scoring rules (frank,
// fôr/four-five, ferris wheel, brand names, days/months, still/flue-flew,
// felt…felt, phone-for-F, bake/bakes/baking, big/bigger, bakery-after-bake,
// repeated violation → repetition, self-correction), the reminder runs, and the fields.
import { beforeAll, describe, expect, it } from 'vitest';
import type { AsrToken } from '@workspace/asr';
import type { Form } from '@workspace/forms';
import { analyzePhonemic, loadPhonemicDictionary, phonemicFluencyJudges, phonemicFluencyScorer, validBases } from './phonemic-fluency';

beforeAll(async () => {
  await loadPhonemicDictionary();
});

function say(text: string, stepMs = 1500, conf = 0.95): AsrToken[] {
  return text.split(/\s+/).filter(Boolean).map((raw, i) => {
    const [token, at] = raw.split('@') as [string, string | undefined];
    const startMs = at !== undefined ? Number(at) : i * stepMs;
    return { id: `t${i}`, token, startMs, endMs: startMs + 400, confidence: conf };
  });
}
const judge = (letter: string, text: string) => analyzePhonemic(letter, say(text)).responses.map((r) => `${r.text}:${r.status}:${r.rule}`);
const status = (letter: string, text: string) => analyzePhonemic(letter, say(text)).responses.map((r) => r.status);

describe('Correct responses', () => {
  it('begins with the letter, is in a dictionary, not a proper noun/number, not repeated', () => {
    expect(judge('f', 'fish fox fast')).toEqual(['fish:correct:R-OK', 'fox:correct:R-OK', 'fast:correct:R-OK']);
  });
  it('benefit of the doubt: "frank" (name / food / adjective) is correct on first instance', () => {
    expect(judge('f', 'frank')).toEqual(['frank:correct:R-OK-AMBIGUOUS-PROPER']);
  });
  it('"fôr" (for/fore/four) is correct alone…', () => {
    expect(judge('f', 'fish four')).toEqual(['fish:correct:R-OK', 'four:correct:R-OK-AMBIGUOUS-NUMBER']);
  });
  it('…but a number beside other numbers ("four, five") is a rule violation', () => {
    expect(status('f', 'four five')).toEqual(['violation', 'violation']);
  });
  it('contractions are correct', () => {
    expect(status('l', "let's lose let lost")).toContain('correct');
    expect(status('w', "won't")).toEqual(['correct']);
  });
  it('compound words with a single meaning count once (ferris wheel)', () => {
    expect(judge('f', 'ferris@0 wheel@450 fire@2000 engine@2450')).toEqual(['ferris wheel:correct:R-OK-COMPOUND', 'fire engine:correct:R-OK-COMPOUND']);
  });
  it('…but separate answers with a pause between them stay separate ("fly … fish")', () => {
    expect(status('f', 'fly@0 fish@1500')).toEqual(['correct', 'correct']);
  });
  it('proper nouns that are not people or places are correct: brands, days, months', () => {
    expect(status('f', 'ford friday february fanta')).toEqual(['correct', 'correct', 'correct', 'correct']);
  });
  it('a different meaning, suggested by context, is not a repetition ("felt, feeling, fresh, fabric, felt")', () => {
    const r = analyzePhonemic('f', say('felt feeling fresh fabric felt')).responses;
    expect(r.at(-1)).toMatchObject({ text: 'felt', status: 'correct', rule: 'R-OK-CONTEXT' });
  });
});

describe('Repetitions', () => {
  it('any response repeated verbatim within the 60 s', () => {
    expect(status('f', 'fish fox fish')).toEqual(['correct', 'correct', 'repetition']);
  });
  it('a repeated word with several meanings is a repetition without context ("still … still")', () => {
    expect(status('s', 'still sun still')).toEqual(['correct', 'correct', 'repetition']);
  });
  it('a homophone is a repetition ("flue", then "flew")', () => {
    expect(judge('f', 'flue fish flew')).toEqual(['flue:correct:R-OK', 'fish:correct:R-OK', 'flew:repetition:R-REP-HOMOPHONE']);
  });
  it('repeated rule violations count as repetitions, not violations', () => {
    expect(judge('f', 'phone fish phone')).toEqual(['phone:violation:R-VIO-LETTER', 'fish:correct:R-OK', 'phone:repetition:R-REP-VIOLATION']);
  });
});

describe('Rule violations', () => {
  it('another first letter, including the same sound ("phone" for F)', () => {
    expect(judge('f', 'phone')).toEqual(['phone:violation:R-VIO-LETTER']);
    expect(judge('f', 'dog')).toEqual(['dog:violation:R-VIO-LETTER']);
  });
  it('…unless a spelling with the target letter sounds the same (benefit of the doubt, flagged)', () => {
    const r = analyzePhonemic('f', say('phase')).responses[0]!;
    expect(r).toMatchObject({ status: 'correct', resolved: 'faze', rule: 'R-OK-HOMOPHONE-SPELLING', review: true });
  });
  it('names of people or places (Barbara, Boston)', () => {
    expect(judge('b', 'barbara boston')).toEqual(['barbara:violation:R-VIO-NAME', 'boston:violation:R-VIO-PLACE']);
    expect(judge('f', 'fred florida')).toEqual(['fred:violation:R-VIO-NAME', 'florida:violation:R-VIO-PLACE']);
  });
  it('multi-word places are one response ("los angeles")', () => {
    expect(judge('l', 'los@0 angeles@450 lamp@2000')).toEqual(['los angeles:violation:R-VIO-PLACE', 'lamp:correct:R-OK']);
  });
  it('numbers (billion)', () => {
    expect(judge('b', 'billion')).toEqual(['billion:violation:R-VIO-NUMBER']);
  });
  it('grammatical variants: plurals and tense ("bake" → "bakes", "baking", "baked")', () => {
    expect(status('b', 'bake bakes baking baked')).toEqual(['correct', 'violation', 'violation', 'violation']);
  });
  it('grammatical variants: comparatives/superlatives ("big" → "bigger", "biggest")', () => {
    expect(status('b', 'big bigger biggest')).toEqual(['correct', 'violation', 'violation']);
  });
  it('other words sharing a root are credited ("bakery" after "bake")', () => {
    expect(status('b', 'bake bakery baker')).toEqual(['correct', 'correct', 'correct']);
  });
  it('agentive -er is not a comparative ("farm" → "farmer")', () => {
    expect(status('f', 'farm farmer')).toEqual(['correct', 'correct']);
  });
  it('look-alikes that are not inflections are credited ("fee" → "feed")', () => {
    expect(status('f', 'fee feed')).toEqual(['correct', 'correct']);
  });
  it('irregular forms are variants ("freeze" → "froze")', () => {
    expect(status('f', 'freeze fish froze')).toEqual(['correct', 'correct', 'violation']);
  });
  it('a word with two meanings gets the benefit of the doubt ("fly" the insect → "flew")', () => {
    expect(status('f', 'fly fish flew')).toEqual(['correct', 'correct', 'correct']);
  });
  it('ambiguous → not a violation ("felt" then "feeling": felt may be the fabric)', () => {
    expect(judge('f', 'felt feeling')).toEqual(['felt:correct:R-OK', 'feeling:correct:R-OK-AMBIGUOUS-VARIANT']);
  });
  it('validBases knows only inflection', () => {
    expect(validBases('bakes')).toContain('bake');
    expect(validBases('bakery')).toEqual([]);
  });
});

describe('Self-corrections', () => {
  it('a self-corrected violation is not an error ("Fred, no, fish")', () => {
    expect(judge('f', 'fred no fish')).toEqual(['fish:correct:R-OK']);
  });
  it('a self-corrected repetition is not an error ("fish, fox, fish, I mean, frog")', () => {
    expect(status('f', 'fish fox fish i mean frog')).toEqual(['correct', 'correct', 'correct']);
  });
  it('a marker that starts with the target letter is a response ("wait" under W)', () => {
    expect(status('w', 'water wait')).toEqual(['correct', 'correct']);
  });
});

describe('Normalization and timing', () => {
  it('fillers and connectives are not responses', () => {
    expect(judge('f', 'um fish uh and fox let me see fast')).toEqual(['fish:correct:R-OK', 'fox:correct:R-OK', 'fast:correct:R-OK']);
  });
  it('responses at or after 60.0 s are not scored', () => {
    const a = analyzePhonemic('f', say('fish@59950 fox@60000'), { cutoffMs: 60_000 });
    expect(a.responses.map((r) => r.status)).toEqual(['correct', 'late']);
    expect(a.correct).toBe(1);
  });
  it('words not in the dictionary are unverified (review), not violations', () => {
    expect(judge('f', 'flimbozzle')).toEqual(['flimbozzle:unverified:R-UNVERIFIED']);
  });
});

describe('reminders (once per trial each)', () => {
  const runs = (letter: string, text: string) => analyzePhonemic(letter, say(text)).runs;
  it('3 consecutive wrong-letter words → one "We are now using the letter F."', () => {
    expect(runs('f', 'fish dog cat mouse')).toMatchObject({ letter: 1 });
    expect(runs('f', 'dog cat fish mouse')).toMatchObject({ letter: 0 });
  });
  it('3 consecutive violations of the same rule → that rule\'s reminder', () => {
    expect(runs('f', 'fred florida france fish')).toMatchObject({ name: 1 });
    expect(runs('f', 'fred frank florida fish')).toMatchObject({ name: 0 });
    expect(runs('f', 'four five fifty')).toMatchObject({ number: 1 });
    expect(runs('f', 'fix fixes fixed fixing')).toMatchObject({ variant: 1 });
  });
  it('detectors report the count to the engine', () => {
    const d = phonemicFluencyJudges['phonemic-wrong-letter']({ expected: 'F', tokens: say('dog cat mouse'), asrUnavailable: false });
    expect(d.data.matches).toBe(1);
  });
});

describe('scorer fields (Q10a–Q10i)', () => {
  const form = { formId: 'A', testId: 'phonemic-fluency', version: '1.0.0', items: { firstLetter: ['F'], secondLetter: ['L'] }, licensed: false, equated: false } as unknown as Form;
  const trial = (text: string) => ({ tokens: say(text), asrUnavailable: false, completed: true });

  it('correct, repetitions, violations per letter and totals', () => {
    const s = phonemicFluencyScorer.score({ form, first: trial('fish fox fish phone'), second: trial('lamp lion lamp'), reasonCode: null, equated: false });
    expect(s.fields).toMatchObject({
      firstCorrect: 2, firstRepetitions: 1, firstViolations: 1,
      secondCorrect: 2, secondRepetitions: 1, secondViolations: 0,
      totalCorrect: 4, totalRepetitions: 2, totalViolations: 1,
    });
  });
  it('F not completed → reason code in F correct, F repetitions/violations blank', () => {
    const s = phonemicFluencyScorer.score({ form, first: null, second: trial('lamp'), reasonCode: 96, equated: false });
    expect(s.fields).toMatchObject({ firstCorrect: 96, firstRepetitions: null, firstViolations: null, totalCorrect: null });
  });
  it('L not completed → reason code in L correct; L repetitions/violations and totals blank', () => {
    const s = phonemicFluencyScorer.score({ form, first: trial('fish'), second: null, reasonCode: 98, equated: false });
    expect(s.fields).toMatchObject({ firstCorrect: 1, secondCorrect: 98, secondRepetitions: null, totalCorrect: null, totalRepetitions: null, totalViolations: null });
  });
  it('benefit-of-the-doubt decisions go to review', () => {
    expect(phonemicFluencyScorer.score({ form, first: trial('frank fish'), second: trial('lamp'), reasonCode: null, equated: false }).needsReview).toBe(true);
    expect(phonemicFluencyScorer.score({ form, first: trial('fish fox'), second: trial('lamp'), reasonCode: null, equated: false }).needsReview).toBe(false);
  });
});

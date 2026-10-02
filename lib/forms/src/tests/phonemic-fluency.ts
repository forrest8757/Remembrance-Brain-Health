// T7 Phonemic Fluency forms: a letter pair each. Form A is the NACC pair
// (F, L). B (S, W) and C (A, H) are Remembrance letter pairs chosen per the
// build doc: avoid C/K/X/Q/Z, the two letters differ in first-sound class,
// never the MoCA fluency letters (M, P, R on the original MoCA forms) and
// never T (the instructions' own example letter). All are `equated: false`:
// our wording isn't the NACC script, so even F+L isn't the NACC instrument. Productivity matching
// (±10% Zipf counts) needs word frequencies: unverified, equated: false.
import { defineForm, type Form } from '../form';
import type { EquivalenceConstraint, FormBank } from '../validator';

/** Letters with a dictionary in lib/scoring (generated word lists). */
export const PHONEMIC_LETTERS = ['A', 'F', 'H', 'L', 'S', 'W'];
/** Letters other tests use as a cue or example in the same session. */
const RESERVED = { M: 'MoCA Form B fluency', P: 'MoCA Form C fluency', R: 'MoCA Form D fluency', T: 'the T7 instructions’ example' } as Record<string, string>;
/** First-sound class, for "the two letters in a pair differ in first-sound class". */
const SOUND_CLASS: Record<string, string> = { F: 'fricative', S: 'fricative', H: 'fricative', L: 'approximant', W: 'approximant', A: 'vowel' };
/** How the examiner voice says each letter on its own. */
const SPOKEN: Record<string, string> = { A: 'ay', F: 'eff', H: 'aitch', L: 'ell', S: 'ess', W: 'double-you' };

const form = (formId: string, first: [string, string], second: [string, string], equated: boolean) =>
  defineForm({
    formId,
    testId: 'phonemic-fluency',
    version: '1.0.0',
    licensed: false,
    items: {
      firstLetter: [first[0]],
      firstLetterSpoken: [SPOKEN[first[0]]!],
      firstExample: [first[1]],
      secondLetter: [second[0]],
      secondLetterSpoken: [SPOKEN[second[0]]!],
      secondExample: [second[1]],
    },
    equivalence: { letters: `${first[0]}${second[0]}` },
    equated,
  });

export const phonemicFluencyForms: Form[] = [
  form('phonemic-fluency.A', ['F', 'fox'], ['L', 'lamp'], false),
  form('phonemic-fluency.B', ['S', 'sun'], ['W', 'water'], false),
  form('phonemic-fluency.C', ['A', 'apple'], ['H', 'house'], false),
];

const letters = (f: Form) => [f.items.firstLetter?.[0] ?? '', f.items.secondLetter?.[0] ?? ''];

const usableLetters: EquivalenceConstraint = (f) =>
  letters(f).flatMap((l) => [
    ...(PHONEMIC_LETTERS.includes(l) ? [] : [`no word lists for letter ${l}`]),
    ...(RESERVED[l] ? [`letter ${l} is reserved (${RESERVED[l]})`] : []),
  ]);

const differentSoundClass: EquivalenceConstraint = (f) => {
  const [a, b] = letters(f);
  return SOUND_CLASS[a!] === SOUND_CLASS[b!] ? [`${a} and ${b} share a first-sound class`] : [];
};

const examplesMatchLetters: EquivalenceConstraint = (f) =>
  (['first', 'second'] as const).flatMap((p) => {
    const l = f.items[`${p}Letter`]?.[0]?.toLowerCase() ?? '';
    const word = (f.items[`${p}Example`]?.[0] ?? '').split(' ').at(-1) ?? '';
    return word.startsWith(l) ? [] : [`${p} example "${word}" doesn't start with ${l.toUpperCase()}`];
  });

const distinctPairs: EquivalenceConstraint = (f, bank) =>
  bank.filter((o) => o.formId !== f.formId && letters(o).some((l) => letters(f).includes(l))).map((o) => `shares a letter with ${o.formId}`);

export const phonemicFluencyBank: FormBank = {
  testId: 'phonemic-fluency',
  forms: phonemicFluencyForms,
  constraints: [usableLetters, differentSoundClass, examplesMatchLetters, distinctPairs],
  minOriginalForms: 3,
};

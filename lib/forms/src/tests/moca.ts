// T1 MoCA-Blind forms (docs/build-prompts.md §T1 "Alternate forms").
// Per decision D5 only Remembrance-original forms (B–D) are ever assigned;
// canonical Form A is kept as a licensed fixture that the constraints are
// tested against. See the T1 README for how ambiguous rules were resolved.
import { defineForm, type Form } from '../form';
import { mulberry32 } from '../random';
import type { EquivalenceConstraint, FormBank } from '../validator';

export const MOCA_TEST_ID = 'moca-blind';

/** Category order of the five memory words (fixed across forms). */
export const MOCA_CATEGORIES = ['body', 'fabric', 'building', 'flower', 'color'] as const;
export const MOCA_CUES = ['a part of the body', 'a type of fabric', 'a type of building', 'a type of flower', 'a color'];

/** Form A distractor letters for vigilance; H and 8-like sounds excluded. */
export const VIGILANCE_DISTRACTORS = ['F', 'B', 'C', 'M', 'N', 'J', 'K', 'L', 'D', 'E', 'O'] as const;
export const VIGILANCE_LENGTH = 29;
export const VIGILANCE_TARGETS = 11;

// ---- Vigilance generator ------------------------------------------------------

/** Lengths of consecutive A runs, e.g. Form A → [1,2,1,1,3,1,2,...]. */
export function aRuns(letters: readonly string[]): number[] {
  const runs: number[] = [];
  let run = 0;
  for (const l of letters) {
    if (l === 'A') run++;
    else if (run) {
      runs.push(run);
      run = 0;
    }
  }
  if (run) runs.push(run);
  return runs;
}

export function vigilanceIssue(letters: readonly string[]): string | null {
  if (letters.length !== VIGILANCE_LENGTH) return `expected ${VIGILANCE_LENGTH} letters, got ${letters.length}`;
  const targets = letters.filter((l) => l === 'A').length;
  if (targets !== VIGILANCE_TARGETS) return `expected ${VIGILANCE_TARGETS} A targets, got ${targets}`;
  const runs = aRuns(letters).sort((a, b) => b - a);
  // Form A: one triple, two doubles, four singles (3 + 2·2 + 4 = 11).
  if (runs.join(',') !== '3,2,2,1,1,1,1') return `A-run structure ${runs.join(',')} ≠ 3,2,2,1,1,1,1`;
  for (const lure of ['J', 'K']) {
    const n = letters.filter((l) => l === lure).length;
    if (n !== 2) return `sound-alike lure ${lure} appears ${n}× (must be exactly 2)`;
  }
  const bad = letters.filter((l) => l !== 'A' && !(VIGILANCE_DISTRACTORS as readonly string[]).includes(l));
  if (bad.length) return `letters outside Form A's distractor set: ${[...new Set(bad)].join(', ')}`;
  for (let i = 1; i < letters.length; i++) {
    if (letters[i] !== 'A' && letters[i] === letters[i - 1]) return `repeated distractor ${letters[i]}${letters[i]}`;
  }
  return null;
}

/** Seeded generator for vigilance strings matching Form A's structure. */
export function generateVigilance(seed: number): string[] {
  const rand = mulberry32(seed);
  const shuffle = <T>(xs: T[]) => {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [xs[i], xs[j]] = [xs[j]!, xs[i]!];
    }
    return xs;
  };
  for (let attempt = 0; attempt < 1000; attempt++) {
    const runs = shuffle([3, 2, 2, 1, 1, 1, 1]);
    // 18 distractors split into 8 gaps (before, between the 7 runs, after); inner gaps ≥ 1.
    const gaps = [0, 1, 1, 1, 1, 1, 1, 0];
    for (let left = 18 - 6; left > 0; left--) gaps[Math.floor(rand() * gaps.length)]!++;
    if (gaps[0]! < 2) continue; // like Form A, never open on a target
    const others = shuffle(['J', 'J', 'K', 'K', ...Array.from({ length: 14 }, () => shuffle(['F', 'B', 'C', 'M', 'N', 'L', 'D', 'E', 'O'])[0]!)]);
    const letters: string[] = [];
    let o = 0;
    gaps.forEach((g, i) => {
      for (let k = 0; k < g; k++) letters.push(others[o++]!);
      if (i < runs.length) for (let k = 0; k < runs[i]!; k++) letters.push('A');
    });
    if (vigilanceIssue(letters) === null) return letters;
  }
  throw new Error('Could not generate a vigilance string');
}

// ---- Other item constraints ----------------------------------------------------

export function digitsIssue(item: string, length: number): string | null {
  const d = item.split('-').map(Number);
  if (d.length !== length) return `expected ${length} digits`;
  if (d.some((x) => !Number.isInteger(x) || x < 1 || x > 9)) return 'digits must be 1–9 (no 0)';
  if (new Set(d).size !== d.length) return 'repeated digit';
  // Read as 3+ same-direction steps (4 digits): Form A's 2-1-8-5-4 has a 3-digit descending run (T1 README).
  for (let i = 3; i < d.length; i++) {
    const w = d.slice(i - 3, i + 1);
    if ((w[0]! < w[1]! && w[1]! < w[2]! && w[2]! < w[3]!) || (w[0]! > w[1]! && w[1]! > w[2]! && w[2]! > w[3]!)) return 'monotonic run of 4';
  }
  if (d.length >= 4 && d[0] === 1 && d[1] === 9) return 'reads like a year';
  return null;
}

/** Borrow operations in a 5-step serial-7 chain (100 → 4). */
export function serialBorrows(start: number): number {
  let n = 0;
  for (let x = start, k = 0; k < 5; k++, x -= 7) if (x % 10 < 7) n++;
  return n;
}

const words = (s: string) => s.replace(/[.,]/g, '').split(/\s+/).filter(Boolean);

/**
 * Rhyme key: the last three letters. Crude (orthographic, not phonetic) but
 * catches true rhymes like face/lace without flagging face/nose.
 */
export function rhymeKey(word: string): string {
  return word.toLowerCase().slice(-3);
}

// ---- Forms ----------------------------------------------------------------------

interface MocaContent {
  formId: string;
  licensed: boolean;
  words: [string, string, string, string, string];
  syllables: [number, number, number, number, number];
  choices: [string, string, string, string, string];
  digitsForward: string;
  digitsBackward: string;
  letters: string[];
  serialStart: number;
  sentences: [string, string];
  fluencyLetter: string;
  fluencyExample: string;
  abstractionPractice: string;
  abstraction1: string;
  abstraction1Accept: string[];
  abstraction1Reject: string[];
  abstraction2: string;
  abstraction2Accept: string[];
  abstraction2Reject: string[];
}

function mocaForm(c: MocaContent): Form {
  return defineForm({
    formId: c.formId,
    testId: MOCA_TEST_ID,
    version: '1.0.0',
    licensed: c.licensed,
    items: {
      words: [...c.words],
      cues: [...MOCA_CUES],
      choices: [...c.choices],
      digitsForward: [c.digitsForward],
      digitsBackward: [c.digitsBackward],
      letters: [c.letters.join('-')],
      serialStart: [String(c.serialStart)],
      sentences: [...c.sentences],
      fluencyLetter: [c.fluencyLetter],
      fluencyExample: [c.fluencyExample],
      abstractionPractice: [c.abstractionPractice],
      abstraction1: [c.abstraction1],
      abstraction1Accept: c.abstraction1Accept,
      abstraction1Reject: c.abstraction1Reject,
      abstraction2: [c.abstraction2],
      abstraction2Accept: c.abstraction2Accept,
      abstraction2Reject: c.abstraction2Reject,
    },
    equivalence: { syllables: c.syllables.join(','), serialBorrows: serialBorrows(c.serialStart) },
  });
}

/** Canonical content (MoCA Cognition). Never assigned (D5); constraint fixture only. */
export const mocaFormA = mocaForm({
  formId: 'moca-blind.A',
  licensed: true,
  words: ['face', 'velvet', 'church', 'daisy', 'red'],
  syllables: [1, 2, 1, 2, 1],
  choices: ['nose|face|hand', 'denim|cotton|velvet', 'church|school|hospital', 'rose|daisy|tulip', 'red|blue|green'],
  digitsForward: '2-1-8-5-4',
  digitsBackward: '7-4-2',
  letters: 'F B A C M N A A J K L B A F A K D E A A A J A M O F A A B'.split(' '),
  serialStart: 100,
  sentences: ['I only know that John is the one to help today.', 'The cat always hid under the couch when dogs were in the room.'],
  fluencyLetter: 'F',
  fluencyExample: 'fox',
  abstractionPractice: 'an orange and a banana',
  abstraction1: 'a train and a bicycle',
  abstraction1Accept: ['transport', 'travel', 'trip'],
  abstraction1Reject: ['wheel'],
  abstraction2: 'a ruler and a watch',
  abstraction2Accept: ['measur', 'instrument'],
  abstraction2Reject: ['number'],
});

/** Remembrance-original parallel forms. Vigilance strings are frozen generator output (seeds 4001–4003). */
export const mocaOriginalForms: Form[] = [
  mocaForm({
    formId: 'moca-blind.B',
    licensed: false,
    words: ['knee', 'silk', 'tower', 'lily', 'gray'],
    syllables: [1, 1, 2, 2, 1],
    choices: ['wrist|knee|chin', 'wool|linen|silk', 'tower|barn|temple', 'iris|lily|violet', 'gray|pink|brown'],
    digitsForward: '5-2-9-3-7',
    digitsBackward: '8-3-6',
    letters: 'B J N C A L D K A O M A F O C D A A J A A A N K A B A A L'.split(' '), // generateVigilance(4001), frozen
    serialStart: 90,
    sentences: ['I only know that Peter is the one to ask today.', 'The dog always slept under the table when guests were in the house.'],
    fluencyLetter: 'M',
    fluencyExample: 'milk',
    abstractionPractice: 'an apple and a grape',
    abstraction1: 'a bus and a canoe',
    abstraction1Accept: ['transport', 'travel', 'trip', 'vehicle', 'get around', 'ride'],
    abstraction1Reject: ['wheel', 'seat', 'water'],
    abstraction2: 'a scale and a thermometer',
    abstraction2Accept: ['measur', 'instrument'],
    abstraction2Reject: ['number', 'read'],
  }),
  mocaForm({
    formId: 'moca-blind.C',
    licensed: false,
    words: ['thumb', 'lace', 'castle', 'orchid', 'yellow'],
    syllables: [1, 1, 2, 2, 2],
    choices: ['ankle|thumb|chest', 'satin|felt|lace', 'castle|museum|garage', 'iris|orchid|lilac', 'yellow|purple|orange'],
    digitsForward: '4-9-1-6-3',
    digitsBackward: '5-8-2',
    letters: 'B M A A B E A A K A A A B N A C D B D A J A K L D A J D E'.split(' '), // generateVigilance(4002), frozen
    serialStart: 110,
    sentences: ['I only know that Laura is the one to trust today.', 'The bird always sang near the window when children were in the yard.'],
    fluencyLetter: 'P',
    fluencyExample: 'pan',
    abstractionPractice: 'a cherry and a lemon',
    abstraction1: 'a truck and an airplane',
    abstraction1Accept: ['transport', 'travel', 'trip', 'vehicle', 'get around', 'ride'],
    abstraction1Reject: ['wheel', 'engine', 'big'],
    abstraction2: 'a clock and a tape measure',
    abstraction2Accept: ['measur', 'instrument'],
    abstraction2Reject: ['number', 'hand'],
  }),
  mocaForm({
    formId: 'moca-blind.D',
    licensed: false,
    words: ['shoulder', 'tweed', 'cottage', 'poppy', 'silver'],
    syllables: [2, 1, 2, 2, 2],
    choices: ['shoulder|finger|stomach', 'flannel|nylon|tweed', 'cottage|factory|prison', 'violet|poppy|pansy', 'silver|black|white'],
    digitsForward: '7-3-8-2-6',
    digitsBackward: '6-1-9',
    letters: 'N O K J A C O E A A N M K A B C A A M B O A A A F N A J A'.split(' '), // generateVigilance(4003), frozen
    serialStart: 120,
    sentences: ['I only know that Helen is the one to see today.', 'The horse always stood beside the gate when storms were in the air.'],
    fluencyLetter: 'R',
    fluencyExample: 'rain',
    abstractionPractice: 'a strawberry and a peach',
    abstraction1: 'a wagon and a ship',
    abstraction1Accept: ['transport', 'travel', 'trip', 'vehicle', 'get around', 'ride'],
    abstraction1Reject: ['wheel', 'wood', 'big'],
    abstraction2: 'a clock and a scale',
    abstraction2Accept: ['measur', 'instrument'],
    abstraction2Reject: ['number', 'face'],
  }),
];

export const mocaForms: Form[] = [mocaFormA, ...mocaOriginalForms];

// ---- Validator ----------------------------------------------------------------

const first = (form: Form, key: string) => form.items[key]?.[0] ?? '';

const memoryWords: EquivalenceConstraint = (form) => {
  const issues: string[] = [];
  const w = form.items.words ?? [];
  const choices = form.items.choices ?? [];
  const syll = String(form.equivalence.syllables ?? '').split(',').map(Number);
  if (w.length !== 5) issues.push('needs 5 memory words (body, fabric, building, flower, color)');
  if (choices.length !== 5) issues.push('needs 5 multiple-choice sets');
  if ((form.items.cues ?? []).join('|') !== MOCA_CUES.join('|')) issues.push('category cues must be the fixed five');
  // Syllables: 1–2, except Form A's own 3-syllable foil set (hospital) is only a foil.
  syll.forEach((s, i) => (s < 1 || s > 2) && issues.push(`"${w[i]}" must have 1–2 syllables`));
  w.forEach((word, i) => {
    const set = (choices[i] ?? '').split('|');
    if (set.length !== 3 || new Set(set).size !== 3) issues.push(`choices for "${word}" must be 3 distinct words`);
    if (!set.includes(word)) issues.push(`choices for "${word}" must include it`);
  });
  // Phone confusability: no rhymes among the five, or between a word and its own foils.
  for (let i = 0; i < w.length; i++) {
    for (let j = i + 1; j < w.length; j++) if (rhymeKey(w[i]!) === rhymeKey(w[j]!)) issues.push(`"${w[i]}" and "${w[j]}" rhyme`);
    for (const foil of (choices[i] ?? '').split('|')) {
      if (foil !== w[i] && rhymeKey(foil) === rhymeKey(w[i]!)) issues.push(`"${w[i]}" rhymes with its foil "${foil}"`);
    }
  }
  return issues;
};

const digits: EquivalenceConstraint = (form) =>
  [
    [first(form, 'digitsForward'), 5],
    [first(form, 'digitsBackward'), 3],
  ].flatMap(([item, len]) => {
    const issue = digitsIssue(item as string, len as number);
    return issue ? [`digits "${item}": ${issue}`] : [];
  });

const vigilance: EquivalenceConstraint = (form) => {
  const issue = vigilanceIssue(first(form, 'letters').split('-'));
  return issue ? [`vigilance: ${issue}`] : [];
};

const serial: EquivalenceConstraint = (form) => {
  const start = Number(first(form, 'serialStart'));
  const issues: string[] = [];
  if (!(start >= 80 && start <= 120)) issues.push(`serial-7 start ${start} outside 80–120`);
  if (serialBorrows(start) !== 4) issues.push(`serial-7 start ${start} has ${serialBorrows(start)} borrows (100 has 4)`);
  return issues;
};

const sentences: EquivalenceConstraint = (form) => {
  const [s1 = '', s2 = ''] = form.items.sentences ?? [];
  const issues: string[] = [];
  if (words(s1).length !== 11) issues.push(`sentence 1 has ${words(s1).length} words (Form A: 11)`);
  if (words(s2).length !== 13) issues.push(`sentence 2 has ${words(s2).length} words (Form A: 13)`);
  if (!/\bonly\b/i.test(s1)) issues.push('sentence 1 needs an "only"-type adverb');
  if (!/\balways\b/i.test(s2)) issues.push('sentence 2 needs an "always"-type adverb');
  if (!/\bwhen\b/i.test(s2)) issues.push('sentence 2 needs a subordinate "when" clause');
  return issues;
};

const fluencyAndAbstraction: EquivalenceConstraint = (form) => {
  const issues: string[] = [];
  const letter = first(form, 'fluencyLetter');
  if (!/^[A-Z]$/.test(letter)) issues.push('fluency letter must be one capital letter');
  if (!first(form, 'fluencyExample').toUpperCase().startsWith(letter)) issues.push('fluency example must start with the letter');
  // Practice pairs are always fruit, so the scripted feedback "…they are also both fruit" stays verbatim.
  if (!first(form, 'abstractionPractice')) issues.push('abstraction practice pair missing');
  for (const k of ['abstraction1', 'abstraction2']) {
    if (!first(form, k)) issues.push(`${k} missing`);
    if (!(form.items[`${k}Accept`] ?? []).length) issues.push(`${k} needs acceptable answers`);
    if (!(form.items[`${k}Reject`] ?? []).length) issues.push(`${k} needs unacceptable answers`);
  }
  return issues;
};

export const mocaConstraints: EquivalenceConstraint[] = [memoryWords, digits, vigilance, serial, sentences, fluencyAndAbstraction];

export const mocaBank: FormBank = {
  testId: MOCA_TEST_ID,
  forms: mocaForms,
  constraints: mocaConstraints,
  minOriginalForms: 3,
};

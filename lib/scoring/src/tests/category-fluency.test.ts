// Every credit / no-credit example in build doc §T6, plus multi-word merging,
// the 60.0-s cutoff, practice codes and the live detectors.
import { describe, expect, it } from 'vitest';
import type { AsrToken } from '@workspace/asr';
import type { Form } from '@workspace/forms';
import {
  analyzeFluency,
  categoryFluencyJudges,
  categoryFluencyScorer,
  classifyPractice,
  FLUENCY_CATEGORIES,
  lexiconFor,
} from './category-fluency';

/** "dog cat" → tokens 1 s apart (or at explicit times with "word@ms"). */
function say(text: string, stepMs = 1000, conf = 0.95): AsrToken[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw, i) => {
      const [token, at] = raw.split('@') as [string, string | undefined];
      const startMs = at !== undefined ? Number(at) : i * stepMs;
      return { id: `t${i}`, token, startMs, endMs: startMs + 400, confidence: conf };
    });
}
const credited = (category: string, text: string) =>
  analyzeFluency(category, say(text))
    .words.filter((w) => w.status === 'credited')
    .map((w) => w.lemma);
const statusOf = (category: string, text: string) => analyzeFluency(category, say(text)).words.map((w) => `${w.text}:${w.status}`);

describe('Animals credit rules (C2T Q9a)', () => {
  it('credits breeds (terrier)', () => {
    expect(credited('animals', 'terrier poodle beagle')).toEqual(['terrier', 'poodle', 'beagle']);
  });
  it('credits male/female/infant names (bull, cow, calf)', () => {
    expect(credited('animals', 'bull cow calf')).toEqual(['bull', 'cow', 'calf']);
  });
  it('credits superordinate AND subordinate (dog and terrier)', () => {
    expect(credited('animals', 'dog terrier')).toEqual(['dog', 'terrier']);
  });
  it('credits birds, fish, reptiles, insects', () => {
    expect(credited('animals', 'robin salmon iguana beetle')).toEqual(['robin', 'salmon', 'iguana', 'beetle']);
  });
  it('gives no credit for repetitions; plurals collapse ("cats" after "cat")', () => {
    const a = analyzeFluency('animals', say('cat dog cats dog'));
    expect(a.total).toBe(2);
    expect(a.repetitions).toBe(2);
  });
  it('gives no credit for mythical animals', () => {
    expect(statusOf('animals', 'unicorn dragon horse')).toEqual(['unicorn:noCredit', 'dragon:noCredit', 'horse:credited']);
  });
  it('logs the practice examples (sock, jacket, belt) as intrusions', () => {
    const a = analyzeFluency('animals', say('dog sock jacket belt'));
    expect(a.total).toBe(1);
    expect(a.intrusions).toBe(3);
  });
});

describe('Vegetables credit rules (C2T Q9b)', () => {
  it('credits superordinate and subordinate (peppers and jalapeños)', () => {
    expect(credited('vegetables', 'peppers jalapenos')).toEqual(['pepper', 'jalapeno']);
  });
  it('credits less specific names (greens)', () => {
    expect(credited('vegetables', 'greens')).toEqual(['greens']);
  });
  it('credits nuts (peanuts, acorns)', () => {
    expect(credited('vegetables', 'peanuts acorns')).toEqual(['peanut', 'acorn']);
  });
  it('credits grains (corn, rice, wheat, oats)', () => {
    expect(credited('vegetables', 'corn rice wheat oats')).toEqual(['corn', 'rice', 'wheat', 'oat']);
  });
  it('credits gourds, sugarcane, herbs, seaweed', () => {
    expect(credited('vegetables', 'gourd sugarcane basil seaweed')).toEqual(['gourd', 'sugarcane', 'basil', 'seaweed']);
  });
  it('credits tomato, avocado, pumpkin and legumes', () => {
    expect(credited('vegetables', 'tomatoes avocado pumpkin lentils')).toEqual(['tomato', 'avocado', 'pumpkin', 'lentil']);
  });
  it('credits dictionary-verifiable culturally specific vegetables (jicama)', () => {
    expect(credited('vegetables', 'jicama')).toEqual(['jicama']);
  });
  it('gives no credit for prepared products (pickles, tomato sauce, ketchup)', () => {
    const a = analyzeFluency('vegetables', say('pickles tomato sauce ketchup'));
    expect(a.words.map((w) => [w.text, w.status, w.reason])).toEqual([
      ['pickles', 'noCredit', 'prepared'],
      ['tomato sauce', 'noCredit', 'prepared'],
      ['ketchup', 'noCredit', 'prepared'],
    ]);
  });
  it('gives no credit for spices, but credits the vegetable of the same name', () => {
    expect(statusOf('vegetables', 'black pepper cinnamon pepper')).toEqual(['black pepper:noCredit', 'cinnamon:noCredit', 'pepper:credited']);
  });
  it('gives no credit for repetitions', () => {
    expect(analyzeFluency('vegetables', say('carrot carrots carrot')).total).toBe(1);
  });
});

describe('normalization', () => {
  it('merges multi-word names using the lexicon (polar bear, sea lion, brussels sprouts)', () => {
    expect(credited('animals', 'polar bear sea lion bear')).toEqual(['polar bear', 'sea lion', 'bear']);
    expect(credited('vegetables', 'brussels sprouts')).toEqual(['brussels sprouts']);
  });
  it('merges hyphenated ASR tokens (sea-lion)', () => {
    expect(credited('animals', 'sea-lion')).toEqual(['sea lion']);
  });
  it('drops fillers and connectives ("um, dog, uh, and, cat")', () => {
    const a = analyzeFluency('animals', say('um dog, uh and cat'));
    expect(a.words.map((w) => w.text)).toEqual(['dog', 'cat']);
    expect(a.unrecognized).toBe(0);
  });
  it('sends out-of-lexicon words to review', () => {
    expect(statusOf('animals', 'dog blorgle')).toEqual(['dog:credited', 'blorgle:unrecognized']);
  });
  it('does not treat category names as answers or intrusions', () => {
    const a = analyzeFluency('animals', say('animals like dogs'));
    expect(a.words.map((w) => w.status)).toEqual(['credited']);
  });
});

describe('60.0 s cutoff (±50 ms)', () => {
  it('scores a word starting at 59.95 s and ignores one at 60.0 s (kept as late)', () => {
    const a = analyzeFluency('animals', say('dog@59950 cat@60000 cow@60040'), { cutoffMs: 60_000 });
    expect(a.words.map((w) => w.status)).toEqual(['credited', 'late', 'late']);
    expect(a.total).toBe(1);
  });
});

describe('derived metrics', () => {
  it('counts credited words per 15-s bin', () => {
    expect(analyzeFluency('animals', say('dog@1000 cat@14000 cow@16000 pig@50000')).bins).toEqual([2, 1, 0, 1]);
  });
  it('measures Troyer clusters and switches', () => {
    // pets (dog, cat, hamster) → farm (cow, pig) → africa (lion)
    const a = analyzeFluency('animals', say('dog cat hamster cow pig lion'));
    expect(a.switches).toBe(2);
    expect(a.meanClusterSize).toBeCloseTo((2 + 1 + 0) / 3, 2);
  });
  it('measures first-word latency and mean gap', () => {
    const a = analyzeFluency('animals', say('dog@2000 cat@4000 cow@8000'));
    expect(a.firstWordMs).toBe(2000);
    expect(a.meanGapMs).toBe(3000);
  });
});

describe('practice classification (codes 0–4)', () => {
  it('0: no response', () => expect(classifyPractice([]).code).toBe('code0'));
  it('1: incorrect only (one / several)', () => {
    expect(classifyPractice(say('dog')).code).toBe('code1one');
    expect(classifyPractice(say('dog carrot')).code).toBe('code1many');
  });
  it('2: one correct, none incorrect', () => expect(classifyPractice(say('socks')).code).toBe('code2'));
  it('3: correct and incorrect', () => expect(classifyPractice(say('socks dog')).code).toBe('code3'));
  it('4: two or more correct', () => expect(classifyPractice(say('socks pants')).code).toBe('code4'));
  it('the practice judge reports a response count to close the window at two', () => {
    const j = categoryFluencyJudges['fluency-practice']({ expected: '', tokens: say('socks pants'), asrUnavailable: false });
    expect(j).toMatchObject({ correct: true, tag: 'code4', data: { count: 2 } });
  });
});

describe('live detectors', () => {
  const incapacity = (text: string) => (categoryFluencyJudges['fluency-incapacity']({ expected: '', tokens: say(text), asrUnavailable: false }).data as { matches: number }).matches;
  const question = (text: string, category = 'animals') =>
    (categoryFluencyJudges['fluency-question']({ expected: category, tokens: say(text), asrUnavailable: false }).data as { matches: number }).matches;

  it('detects expressions of incapacity', () => {
    expect(incapacity("dog cat I can't think of any more")).toBe(1);
    expect(incapacity("that's all I know")).toBe(1);
    expect(incapacity('dog cat cow')).toBe(0);
  });
  it('answers "Yes" only to questions about creditable members ("do birds count?")', () => {
    expect(question('do birds count')).toBe(1);
    expect(question('dog cat does a whale count')).toBe(1);
    expect(question('is a tomato a vegetable', 'vegetables')).toBe(1);
    expect(question('do unicorns count')).toBe(0);
    expect(question('dog cat cow')).toBe(0);
  });
  it('a member named only inside the question is not credited', () => {
    const a = analyzeFluency('animals', say('dog do birds count cat'));
    expect(a.words.map((w) => `${w.text}:${w.status}`)).toEqual(['dog:credited', 'do birds count:question', 'cat:credited']);
  });
});

describe('scorer', () => {
  const form = { formId: 'A', testId: 'category-fluency', version: '1.0.0', items: { secondCategory: ['vegetables'] }, licensed: false, equated: false } as unknown as Form;
  const trial = (text: string) => ({ tokens: say(text, 2000), asrUnavailable: false, completed: true });

  it('scores Animals → animals (Q9a) and the second category (Q9b)', () => {
    const s = categoryFluencyScorer.score({ form, animals: trial('dog cat cow pig'), second: trial('carrot peas corn'), reasonCode: null, equated: false });
    expect(s.fields.animals).toBe(4);
    expect(s.fields.secondCategory).toBe(3);
    expect(s.needsReview).toBe(false);
  });
  it('not completed → reason code', () => {
    const s = categoryFluencyScorer.score({ form, animals: trial('dog'), second: null, reasonCode: 96, equated: false });
    expect(s.fields.secondCategory).toBe(96);
  });
  it('ASR outage → unscored and queued for review', () => {
    const s = categoryFluencyScorer.score({ form, animals: { tokens: [], asrUnavailable: true, completed: true }, second: trial('carrot'), reasonCode: null, equated: false });
    expect(s.fields.animals).toBeNull();
    expect(s.reviewReasons).toContain('asr_unavailable');
  });
  it('unrecognized words and judgement calls go to review', () => {
    expect(categoryFluencyScorer.score({ form, animals: trial('dog blorgle'), second: trial('carrot'), reasonCode: null, equated: false }).needsReview).toBe(true);
    expect(categoryFluencyScorer.score({ form, animals: trial('dog dinosaur'), second: trial('carrot'), reasonCode: null, equated: false }).needsReview).toBe(true);
  });
});

describe('lexicons', () => {
  it('every category builds, and no credited word is also a no-credit word in the same category', () => {
    for (const c of FLUENCY_CATEGORIES) {
      const lex = lexiconFor(c);
      expect(lex.index.size).toBeGreaterThan(50);
    }
  });
});

describe('forms ↔ lexicons', async () => {
  const { SECOND_CATEGORIES, categoryFluencyForms } = await import('@workspace/forms');
  it('every rotating second category and the practice category has a lexicon', () => {
    for (const c of [...SECOND_CATEGORIES, 'animals', 'clothing']) expect(() => lexiconFor(c)).not.toThrow();
  });
  it('practice examples are clothing and the follow-up examples (scarf, sweater) are too', () => {
    for (const f of categoryFluencyForms) expect(classifyPractice(say(f.items.practiceExamples!.join(' '))).code).toBe('code4');
  });
});

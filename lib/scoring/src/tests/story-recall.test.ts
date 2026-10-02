// T2 Story Recall: every 1-point and 0-point example of all four original
// rubrics (4 × 25 units), the verbatim allowances, duplicates, the delayed
// cue judge, and the fields.
import { describe, expect, it } from 'vitest';
import type { AsrToken } from '@workspace/asr';
import { storyForms, storyUnits } from '@workspace/forms';
import { analyzeRecall, stem, storyRecallJudgesFor, storyRecallScorer } from './story-recall';

const say = (text: string, conf = 0.95): AsrToken[] =>
  text.split(/\s+/).filter(Boolean).map((token, i) => ({ id: `t${i}`, token, startMs: i * 400, endMs: i * 400 + 300, confidence: conf }));

describe('stems (verbatim allowances)', () => {
  it('verb variations, plurals, possessives match; different words don\'t', () => {
    expect(stem('rode')).toBe(stem('ride'));
    expect(stem('riding')).toBe(stem('rides'));
    expect(stem('kites')).toBe(stem('kite'));
    expect(stem("farmer's")).toBe(stem('farmer'));
    expect(stem("cats'")).toBe(stem('cat'));
    expect(stem('geese')).toBe(stem('goose'));
    expect(stem('skipping')).toBe(stem('skip'));
    expect(stem('hissing')).toBe(stem('hiss'));
    expect(stem('hiss')).not.toBe(stem('his'));
    expect(stem('hurried')).toBe(stem('hurry'));
    expect(stem('9')).toBe(stem('nine'));
    expect(stem('tom')).not.toBe(stem('tommy'));
  });
});

describe.each(storyForms.map((f) => [f.formId, f] as const))('%s', (_id, form) => {
  const story = form.items.story![0]!;

  it('a word-perfect retelling scores 44 verbatim and 25 paraphrase', () => {
    const a = analyzeRecall(form, say(story));
    expect(a.verbatim).toBe(44);
    expect(a.paraphrase).toBe(25);
    expect(a.intrusions).toEqual([]);
  });

  it('silence scores 0 / 0', () => {
    const a = analyzeRecall(form, []);
    expect([a.verbatim, a.paraphrase]).toEqual([0, 0]);
  });

  it('order doesn\'t matter (verbatim)', () => {
    const words = story.split(/\s+/).reverse().join(' ');
    expect(analyzeRecall(form, say(words)).verbatim).toBe(44);
  });

  const units = storyUnits(form);
  describe.each(units.map((u, k) => [k + 1, u] as const))('unit %i', (n, u) => {
    it.each(u.accept)(`1 point: "%s"`, (phrase) => {
      expect(analyzeRecall(form, say(phrase)).units[n - 1]!.awarded).toBe(true);
    });
    it.each(u.reject.length ? u.reject : ['(none)'])(`0 points: "%s"`, (phrase) => {
      expect(analyzeRecall(form, say(phrase)).units[n - 1]!.awarded).toBe(false);
    });
  });
});

describe('story.1 specifics', () => {
  const form = storyForms[0]!;
  it('allows verb variations and dropped possessives for verbatim ("loves", "farmer", "kite")', () => {
    const bits = analyzeRecall(form, say('loves farmer kite')).bits.filter((b) => b.credited).map((b) => stem(b.word));
    expect(bits.sort()).toEqual([stem('farmer'), stem('kite'), stem('loved')].sort());
  });
  it('a name variant earns the paraphrase point but not the verbatim one ("Tom")', () => {
    const a = analyzeRecall(form, say('tom'));
    expect(a.bits.find((b) => b.word === 'tommy')!.credited).toBe(false);
    expect(a.units[2]!.awarded).toBe(true);
  });
  it('duplicated words are credited up to their count in the recall ("he" ×2, "kite" ×2)', () => {
    expect(analyzeRecall(form, say('he kite')).bits.filter((b) => b.credited)).toHaveLength(2);
    expect(analyzeRecall(form, say('he he kite kite')).bits.filter((b) => b.credited)).toHaveLength(4);
  });
  it('story elements that weren\'t in the story are counted as intrusions', () => {
    expect(analyzeRecall(form, say('tommy flew kites with his dog rover')).intrusions).toEqual(expect.arrayContaining(['dog', 'rover']));
  });
  it('a unit with related words but no rubric match goes to review', () => {
    const u = analyzeRecall(form, say('the geese were there')).units[21]!; // "heard sharp honking"
    expect(u.awarded).toBe(false);
    expect(u.confidence).toBeLessThan(0.85);
  });
});

describe('delayed recall judges', () => {
  const j = storyRecallJudgesFor(storyForms[0]!);
  it('"what story?" or nothing → the cue', () => {
    expect(j['story-delayed-recall']({ expected: '', tokens: say('what story'), asrUnavailable: false }).tag).toBe('no_recall');
    expect(j['story-delayed-recall']({ expected: '', tokens: [], asrUnavailable: false }).tag).toBe('no_recall');
    expect(j['story-delayed-recall']({ expected: '', tokens: say("i don't remember any story"), asrUnavailable: false }).tag).toBe('no_recall');
  });
  it('any real recall → no cue', () => {
    expect(j['story-delayed-recall']({ expected: '', tokens: say('a boy named tommy flew kites with his friends'), asrUnavailable: false }).tag).toBeUndefined();
  });
  it('a question or repeat request → the allowed reply', () => {
    expect((j['story-question']({ expected: '', tokens: say('can you say it again'), asrUnavailable: false }).data as { matches: number }).matches).toBe(1);
    expect((j['story-question']({ expected: '', tokens: say('was it about a boy'), asrUnavailable: false }).data as { matches: number }).matches).toBe(1);
    expect((j['story-question']({ expected: '', tokens: say('tommy flew kites'), asrUnavailable: false }).data as { matches: number }).matches).toBe(0);
  });
});

describe('scorer fields', () => {
  const form = storyForms[1]!;
  it('immediate: verbatim (Q3a-style) and paraphrase (Q3b-style)', () => {
    const s = storyRecallScorer.score({ form, recall: { tokens: say(form.items.story![0]!), asrUnavailable: false }, completed: true, reasonCode: null, equated: false });
    expect(s.fields).toMatchObject({ verbatim: 44, paraphrase: 25, intrusions: 0 });
  });
  it('delayed: adds delay minutes and whether the cue was needed', () => {
    const s = storyRecallScorer.score({ form, recall: { tokens: say('lily rode bikes'), asrUnavailable: false }, completed: true, reasonCode: null, delayed: { minutes: 21, cueNeeded: true }, equated: false });
    expect(s.fields).toMatchObject({ delayMinutes: 21, cueNeeded: 1 });
  });
  it('not completed → reason code in verbatim, paraphrase blank', () => {
    const s = storyRecallScorer.score({ form, recall: null, completed: false, reasonCode: 97, equated: false });
    expect(s.fields).toMatchObject({ verbatim: 97, paraphrase: null });
  });
});

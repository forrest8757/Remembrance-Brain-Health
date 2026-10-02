import { describe, expect, it } from 'vitest';
import { toyColorsForms } from '@workspace/forms';
import type { AsrToken } from '@workspace/asr';
import { toyColorsScorer } from './toy-colors';
import { toReviewQueueEntry } from '../review';

const form = toyColorsForms[0]!; // red, blue, yellow

const said = (words: string, confidence = 0.95): AsrToken[] =>
  words
    .split(' ')
    .filter(Boolean)
    .map((w, i) => ({ id: `recall:${i}`, token: w, startMs: 800 + i * 600, endMs: 1100 + i * 600, confidence }));

const score = (words: string, extra: { confidence?: number; asrUnavailable?: boolean } = {}) =>
  toyColorsScorer.score({ form, recall: { tokens: said(words, extra.confidence), asrUnavailable: extra.asrUnavailable ?? false }, equated: false });

describe('toy-colors scorer', () => {
  it('credits each target once, in any order', () => {
    const r = score('yellow red blue red');
    expect(r.fields.recalled).toBe(3);
    expect(r.fields.intrusions).toBe(0);
    expect(r.items.map((i) => i.value)).toEqual([1, 1, 1]);
    expect(r.needsReview).toBe(false);
  });

  it('counts intrusions (non-target colors) and ignores non-color words', () => {
    const r = score('red green the blue');
    expect(r.fields).toMatchObject({ recalled: 2, intrusions: 1 });
  });

  it('honours self-corrections and fillers', () => {
    expect(score('um green no yellow blue').fields).toMatchObject({ recalled: 2, intrusions: 0 });
  });

  it('accepts listed homophones', () => {
    expect(score('read blew').fields.recalled).toBe(2);
  });

  it('scores silence as 0 with high confidence', () => {
    const r = score('');
    expect(r.fields.recalled).toBe(0);
    expect(r.items.every((i) => i.confidence >= 0.9)).toBe(true);
    expect(r.needsReview).toBe(false);
  });

  it('cites evidence tokens for credited items', () => {
    const r = score('blue');
    expect(r.items.find((i) => i.itemKey === 'blue')!.evidenceTokenIds).toEqual(['recall:0']);
  });

  it('sends low-confidence recognitions to review', () => {
    const r = score('red blue yellow', { confidence: 0.4 });
    expect(r.needsReview).toBe(true);
    expect(toReviewQueueEntry('adm-1', r)).toMatchObject({ administrationId: 'adm-1', testId: 'toy-colors' });
  });

  it('flags a near-miss that may be a mis-recognized target', () => {
    const r = score('yell oh red blue');
    const yellow = r.items.find((i) => i.itemKey === 'yellow')!;
    expect(yellow.value).toBe(0);
    expect(yellow.confidence).toBeLessThan(0.7);
    expect(r.needsReview).toBe(true);
  });

  it('sends ASR outages to review and scores nothing', () => {
    const r = score('', { asrUnavailable: true });
    expect(r.needsReview).toBe(true);
    expect(r.fields.recalled).toBeNull();
    expect(r.reviewReasons).toContain('asr_unavailable');
  });

  it('is deterministic and versioned', () => {
    expect(score('red blue')).toEqual(score('red blue'));
    expect(score('red').scorerVersion).toBe(toyColorsScorer.scorerVersion);
  });
});

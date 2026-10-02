import { describe, expect, it } from 'vitest';
import {
  ALL_BANKS,
  assignForm,
  balancedLatinSquare,
  checkSessionCollisions,
  defineForm,
  lemma,
  mulberry32,
  seedFor,
  validateBank,
  type Form,
} from './index';

const mk = (formId: string, items: Record<string, string[]>, extra: Partial<Form> = {}) =>
  defineForm({ formId, testId: extra.testId ?? 't', version: '1.0.0', licensed: extra.licensed ?? false, items });

describe('balancedLatinSquare', () => {
  it.each([2, 3, 4, 5, 6])('is a Latin square for n=%i', (n) => {
    const sq = balancedLatinSquare(n);
    for (const row of sq) expect(new Set(row).size).toBe(n);
    for (let c = 0; c < n; c++) expect(new Set(sq.map((r) => r[c])).size).toBe(n);
  });

  it('is carryover-balanced for even n', () => {
    const n = 4;
    const pairs = new Map<string, number>();
    for (const row of balancedLatinSquare(n)) {
      for (let i = 0; i < n - 1; i++) pairs.set(`${row[i]}>${row[i + 1]}`, (pairs.get(`${row[i]}>${row[i + 1]}`) ?? 0) + 1);
    }
    expect(pairs.size).toBe(n * (n - 1));
    expect([...pairs.values()].every((v) => v === 1)).toBe(true);
  });
});

describe('assignForm', () => {
  const forms = [mk('t.A', { x: ['a'] }, { licensed: true }), mk('t.R1', { x: ['b'] }), mk('t.R2', { x: ['c'] }), mk('t.R3', { x: ['d'] })];

  it('never serves licensed forms unless the flag is on', () => {
    for (let i = 0; i < 10; i++) {
      const a = assignForm({ userId: `u${i}`, testId: 't', forms, history: [], licensedContent: false });
      expect(a.form.licensed).toBe(false);
    }
  });

  it('never repeats a form within the last N−1 administrations', () => {
    for (const userId of ['alice', 'bob', 'carol', 'dan']) {
      const history: { formId: string }[] = [];
      for (let i = 0; i < 12; i++) {
        const { form } = assignForm({ userId, testId: 't', forms, history, licensedContent: true });
        expect(history.slice(-(4 - 1)).map((h) => h.formId)).not.toContain(form.formId);
        history.push({ formId: form.formId });
      }
    }
  });

  it('counterbalances first forms across users', () => {
    const firsts = new Set<string>();
    for (let i = 0; i < 40; i++) firsts.add(assignForm({ userId: `user-${i}`, testId: 't', forms, history: [], licensedContent: true }).form.formId);
    expect(firsts.size).toBe(4);
  });

  it('numbers administrations and derives a reproducible seed', () => {
    const a = assignForm({ userId: 'u', testId: 't', forms, history: [{ formId: 't.R1' }], licensedContent: false });
    expect(a.administrationNumber).toBe(2);
    expect(a.seed).toBe(seedFor('u', 't', 2));
    const r1 = mulberry32(a.seed);
    const r2 = mulberry32(a.seed);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });
});

describe('session collision checker', () => {
  it('catches the canonical-battery collisions from CLAUDE.md §8', async () => {
    const moca = mk('moca.A', { words: ['FACE', 'VELVET', 'CHURCH', 'DAISY', 'RED'], mcFace: ['nose', 'face', 'hand'] }, { testId: 'moca' });
    const ravlt = mk('ravlt.A', { listA: ['drum', 'nose'], listB: ['church'], foils: ['face'] }, { testId: 'ravlt' });
    const collisions = await checkSessionCollisions([
      { testId: 'moca', form: moca },
      { testId: 'ravlt', form: ravlt },
    ]);
    const tokens = collisions.map((c) => `${c.a.token.toLowerCase()}/${c.b.token.toLowerCase()}`);
    expect(tokens).toContain('face/face');
    expect(tokens).toContain('church/church');
    expect(tokens).toContain('nose/nose');
  });

  it('ignores repeats inside one test and catches lemma variants', async () => {
    const a = mk('a', { x: ['bell', 'bell', 'churches'] }, { testId: 'a' });
    const b = mk('b', { y: ['church'] }, { testId: 'b' });
    const collisions = await checkSessionCollisions([{ testId: 'a', form: a }, { testId: 'b', form: b }]);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]!.kind).toBe('lemma');
  });

  it('uses the similarity provider above the threshold', async () => {
    const a = mk('a', { x: ['sofa'] }, { testId: 'a' });
    const b = mk('b', { y: ['couch'] }, { testId: 'b' });
    const similarity = { similarity: async () => 0.9 };
    const collisions = await checkSessionCollisions([{ testId: 'a', form: a }, { testId: 'b', form: b }], { similarity });
    expect(collisions[0]).toMatchObject({ kind: 'semantic', score: 0.9 });
  });

  it('lemmatizes common inflections', () => {
    expect(['churches', 'daisies', 'boxes', 'walking', 'walked', 'glass', 'bus'].map(lemma)).toEqual([
      'church', 'daisy', 'box', 'walk', 'walk', 'glass', 'bus',
    ]);
  });
});

describe('form validator', () => {
  it('passes every registered bank', () => {
    for (const bank of ALL_BANKS) expect(validateBank(bank)).toEqual([]);
  });

  it('reports constraint failures and too few originals', () => {
    const bank = { testId: 't', forms: [mk('t.R1', { x: ['a'] })], constraints: [() => ['bad']], minOriginalForms: 3 };
    const issues = validateBank(bank).map((i) => i.message);
    expect(issues).toContain('bad');
    expect(issues.some((m) => m.includes('≥3 original'))).toBe(true);
  });
});

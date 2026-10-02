// Session-level lexical collision check (CLAUDE.md §8): no stimulus, foil,
// cue or example may appear in two tests of one session, or be a close
// neighbour of another test's content.
import { formTokens, type Form } from './form';

export interface SessionEntry {
  testId: string;
  form: Form;
}

export interface CollisionSide {
  testId: string;
  formId: string;
  itemKey: string;
  token: string;
}

export interface Collision {
  kind: 'exact' | 'lemma' | 'semantic';
  a: CollisionSide;
  b: CollisionSide;
  /** Similarity score for semantic collisions. */
  score?: number;
}

/** Pluggable semantic similarity (e.g. embeddings), returning 0..1. */
export interface SimilarityProvider {
  similarity(a: string, b: string): Promise<number>;
}

export function normalizeToken(token: string): string {
  return token.toLowerCase().normalize('NFKD').replace(/[^a-z0-9' ]/g, '').trim();
}

const IRREGULAR: Record<string, string> = {
  children: 'child', men: 'man', women: 'woman', feet: 'foot', teeth: 'tooth', mice: 'mouse', geese: 'goose',
};

/** Deliberately simple English lemmatizer: enough to catch plural/tense variants. */
export function lemma(token: string): string {
  const t = normalizeToken(token);
  if (IRREGULAR[t]) return IRREGULAR[t];
  if (t.length > 4 && t.endsWith('ies')) return `${t.slice(0, -3)}y`;
  if (t.length > 4 && /(ches|shes|sses|xes|zes)$/.test(t)) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us')) return t.slice(0, -1);
  if (t.length > 5 && t.endsWith('ing')) return t.slice(0, -3);
  if (t.length > 4 && t.endsWith('ed')) return t.slice(0, -2);
  return t;
}

export async function checkSessionCollisions(
  entries: readonly SessionEntry[],
  opts: { similarity?: SimilarityProvider; threshold?: number } = {},
): Promise<Collision[]> {
  const threshold = opts.threshold ?? 0.85;
  const sides: CollisionSide[] = entries.flatMap(({ testId, form }) =>
    formTokens(form).map(({ itemKey, token }) => ({ testId, formId: form.formId, itemKey, token })),
  );

  const collisions: Collision[] = [];
  for (let i = 0; i < sides.length; i++) {
    for (let j = i + 1; j < sides.length; j++) {
      const a = sides[i]!;
      const b = sides[j]!;
      if (a.testId === b.testId) continue;
      if (normalizeToken(a.token) === normalizeToken(b.token)) {
        collisions.push({ kind: 'exact', a, b });
      } else if (lemma(a.token) === lemma(b.token)) {
        collisions.push({ kind: 'lemma', a, b });
      } else if (opts.similarity) {
        const score = await opts.similarity.similarity(a.token, b.token);
        if (score >= threshold) collisions.push({ kind: 'semantic', a, b, score });
      }
    }
  }
  return collisions;
}

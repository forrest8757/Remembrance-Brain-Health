// Category lexicons for semantic fluency (T6): which spoken words belong to a
// category, which earn credit, and which subcategory (for Troyer clustering
// and switching) each belongs to.
//
// Source format, per subcategory: a list of entries, each "lemma" or
// "lemma=alias=alias" (synonyms, alternate spellings, ASR splits). Multi-word
// names are written with spaces ("polar bear"). An entry may appear in several
// subcategories (a horse is a farm animal and a beast of burden); its
// clusters are the union.

export type LexiconFlag =
  /** Belongs to the category's vocabulary but earns no credit (e.g. mythical animals). */
  | 'noCredit'
  /** Credit is a judgement call: credited, but sent to review. */
  | 'review';

export interface LexiconSource {
  category: string;
  /** subcategory → entries */
  groups: Record<string, string[]>;
  /** Entries (same format) that are recognized but never credited, with the reason. */
  noCredit?: Record<string, string[]>;
  /** Lemmas credited only after review (ambiguous membership). */
  review?: string[];
  /** Words that name the category itself ("animals"): neither credited nor intrusions. */
  categoryNames?: string[];
}

export interface LexiconEntry {
  lemma: string;
  clusters: string[];
  /** Why it earns no credit (e.g. "mythical"), if it doesn't. */
  noCredit?: string;
  review?: boolean;
}

export interface Lexicon {
  category: string;
  /** Normalized phrase (lemma or alias, singular) → entry. */
  index: Map<string, LexiconEntry>;
  categoryNames: Set<string>;
  /** Longest phrase length in words, for greedy matching. */
  maxWords: number;
}

export function buildLexicon(src: LexiconSource): Lexicon {
  const index = new Map<string, LexiconEntry>();
  const entries = new Map<string, LexiconEntry>();
  const add = (raw: string, cluster: string | null, noCredit?: string) => {
    const [lemma, ...aliases] = raw.split('=').map((s) => s.trim().toLowerCase());
    if (!lemma) return;
    let entry = entries.get(lemma);
    if (!entry) {
      entry = { lemma, clusters: [] };
      entries.set(lemma, entry);
    }
    if (cluster && !entry.clusters.includes(cluster)) entry.clusters.push(cluster);
    if (noCredit) entry.noCredit = noCredit;
    for (const phrase of [lemma, ...aliases]) index.set(phrase, entry);
  };
  for (const [cluster, list] of Object.entries(src.groups)) for (const raw of list) add(raw, cluster);
  for (const [reason, list] of Object.entries(src.noCredit ?? {})) for (const raw of list) add(raw, null, reason);
  for (const lemma of src.review ?? []) {
    const e = entries.get(lemma);
    if (e) e.review = true;
  }
  const maxWords = Math.max(1, ...[...index.keys()].map((k) => k.split(' ').length));
  return { category: src.category, index, categoryNames: new Set(src.categoryNames ?? []), maxWords };
}

const IRREGULAR: Record<string, string> = {
  mice: 'mouse', geese: 'goose', oxen: 'ox', teeth: 'tooth', feet: 'foot', lice: 'louse', children: 'child',
  people: 'person', men: 'man', women: 'woman', cacti: 'cactus', fungi: 'fungus', octopi: 'octopus',
  wolves: 'wolf', calves: 'calf', halves: 'half', leaves: 'leaf', loaves: 'loaf', knives: 'knife', wives: 'wife',
  elves: 'elf', thieves: 'thief', shelves: 'shelf', scarves: 'scarf', hooves: 'hoof', firemen: 'fireman',
  policemen: 'policeman', mailmen: 'mailman', fishermen: 'fisherman', businessmen: 'businessman',
};

/** Singular candidates for a word, most likely first ("berries" → berry, berrie, berrie s…). */
export function singularCandidates(word: string): string[] {
  const out = [word];
  if (IRREGULAR[word]) out.push(IRREGULAR[word]);
  if (word.endsWith('ies') && word.length > 4) out.push(`${word.slice(0, -3)}y`);
  if (word.endsWith('ves')) out.push(`${word.slice(0, -3)}f`, `${word.slice(0, -3)}fe`);
  if (word.endsWith('es')) out.push(word.slice(0, -2));
  if (word.endsWith('s') && !word.endsWith('ss')) out.push(word.slice(0, -1));
  return out;
}

/** Look up a phrase, trying singular forms of its last word. */
export function lookup(lex: Lexicon, words: readonly string[]): LexiconEntry | undefined {
  const head = words.slice(0, -1);
  for (const last of singularCandidates(words[words.length - 1]!)) {
    const hit = lex.index.get([...head, last].join(' '));
    if (hit) return hit;
  }
  return undefined;
}

export function isCategoryName(lex: Lexicon, word: string): boolean {
  return singularCandidates(word).some((w) => lex.categoryNames.has(w));
}

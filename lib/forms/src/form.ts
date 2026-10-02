// Parallel forms (CLAUDE.md §8). A Form is an immutable, versioned content
// bundle. Every string in `items` is lexical content (stimuli, foils, cues,
// examples) and takes part in the session-level collision check.
import { z } from 'zod';

export const formSchema = z.object({
  formId: z.string().min(1),
  testId: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Canonical NACC content: only served when LICENSED_CONTENT=true. */
  licensed: z.boolean(),
  /** Ordered token lists keyed by the spec's stimulus/cue keys. */
  items: z.record(z.string(), z.array(z.string().min(1)).min(1)),
  /** Whatever the test's equivalence constraints measure (frequency, syllables…). */
  equivalence: z.record(z.string(), z.union([z.number(), z.string()])).default({}),
  /** False until the form has been equated in a pilot study. */
  equated: z.boolean().default(false),
});

export type Form = z.infer<typeof formSchema>;
export type FormInput = z.input<typeof formSchema>;

export function defineForm(input: FormInput): Form {
  return Object.freeze(formSchema.parse(input)) as Form;
}

export function formTokens(form: Form): { itemKey: string; token: string }[] {
  return Object.entries(form.items).flatMap(([itemKey, tokens]) => tokens.map((token) => ({ itemKey, token })));
}

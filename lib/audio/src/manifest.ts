// Clip manifest (CLAUDE.md §5): one entry per pre-rendered clip. A clip
// change (hash) must bump the form or spec version that uses it.
import { z } from 'zod';

export const clipEntrySchema = z.object({
  clipId: z.string(),
  kind: z.enum(['line', 'token', 'emphasis']),
  text: z.string(),
  file: z.string(),
  durationMs: z.number().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  lufs: z.number().nullable(),
  peakLimited: z.boolean(),
});

export const clipManifestSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  voice: z.object({
    provider: z.enum(['elevenlabs', 'macos-say']),
    voiceId: z.string(),
    modelId: z.string(),
    /** Dev voices are for building/testing only, never for real administrations. */
    devOnly: z.boolean(),
  }),
  targetLufs: z.number(),
  clips: z.array(clipEntrySchema),
});

export type ClipEntry = z.infer<typeof clipEntrySchema>;
export type ClipManifest = z.infer<typeof clipManifestSchema>;

/** Clip id for a stimulus token. Tokens are shared across tests/forms. */
export function tokenClipId(token: string): string {
  return `tok.${token.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

/** Clip id of a token's "enunciated more clearly" variant (MoCA trial 2 for misheard words). */
export function emphasisClipId(token: string): string {
  return `${tokenClipId(token)}.emph`;
}

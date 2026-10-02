// Browser clip library: loads the pre-rendered manifest, decodes clips once,
// and plays scripted lines. Runtime synthesis is never used (CLAUDE.md §5).
import { clipManifestSchema, type ClipManifest } from './manifest';
import type { ClipBuffer } from './scheduler';

export interface ClipLibrary {
  readonly manifest: ClipManifest;
  readonly context: AudioContext;
  /** Resolve clips ahead of time so presentation never waits on the network. */
  preload(clipIds: readonly string[]): Promise<void>;
  get(clipId: string): ClipBuffer;
  /** Play one clip now; resolves when it ends (or is stopped). */
  play(clipId: string, opts?: { volume?: number }): { ended: Promise<void>; stop(): void };
  has(clipId: string): boolean;
}

export async function loadClipLibrary(baseUrl: string, context: AudioContext): Promise<ClipLibrary> {
  const base = baseUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/manifest.json`);
  if (!res.ok) throw new Error(`Clip manifest not found at ${base}/manifest.json (run the prerender script)`);
  const manifest = clipManifestSchema.parse(await res.json());
  const byId = new Map(manifest.clips.map((c) => [c.clipId, c]));
  const decoded = new Map<string, ClipBuffer>();

  const load = async (clipId: string) => {
    if (decoded.has(clipId)) return;
    const entry = byId.get(clipId);
    if (!entry) throw new Error(`Clip "${clipId}" is not in the manifest`);
    const bytes = await (await fetch(`${base}/${entry.file}`)).arrayBuffer();
    const buffer = await context.decodeAudioData(bytes);
    decoded.set(clipId, { clipId, buffer, durationMs: buffer.duration * 1000 });
  };

  const get = (clipId: string): ClipBuffer => {
    const clip = decoded.get(clipId);
    if (!clip) throw new Error(`Clip "${clipId}" was not preloaded`);
    return clip;
  };

  return {
    manifest,
    context,
    has: (clipId) => byId.has(clipId),
    async preload(clipIds) {
      await Promise.all(clipIds.map(load));
    },
    get,
    play(clipId, opts = {}) {
      const clip = get(clipId);
      const src = context.createBufferSource();
      src.buffer = clip.buffer as AudioBuffer;
      const gain = context.createGain();
      gain.gain.value = opts.volume ?? 1;
      src.connect(gain).connect(context.destination);
      const ended = new Promise<void>((resolve) => (src.onended = () => resolve()));
      src.start();
      return {
        ended,
        stop() {
          try {
            src.stop();
          } catch {
            // Already stopped.
          }
        },
      };
    },
  };
}

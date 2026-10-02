// Pre-render every scripted line and every stimulus token as its own clip
// (CLAUDE.md §5): synthesize → trim silence → normalize to −16 LUFS →
// write WAV + manifest (duration, sha256, voice).
//
// Provider: ElevenLabs when ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are
// set; otherwise macOS `say` as a dev-only voice (manifest.voice.devOnly).
//
//   pnpm --filter @workspace/audio prerender [--out <dir>] [--force]
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_SPECS } from '@workspace/test-spec';
import { ALL_BANKS } from '@workspace/forms';
import {
  clipRequests,
  clipManifestSchema,
  decodeWav,
  encodeWav,
  normalizeLoudness,
  trimSilence,
  type ClipEntry,
  type ClipManifest,
  type PcmAudio,
} from '../src/index';

const TARGET_LUFS = -16;
const SAMPLE_RATE = 24_000;
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const outDir = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1]! : path.join(here, '../../../artifacts/remembrance/public/clips'));
const force = args.includes('--force');

interface Voice {
  manifest: ClipManifest['voice'];
  /** `emphasis`: the same word enunciated more clearly (slower, stressed). */
  synthesize(text: string, emphasis?: boolean): Promise<PcmAudio>;
}

function elevenLabsVoice(apiKey: string, voiceId: string): Voice {
  const modelId = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_multilingual_v2';
  return {
    manifest: { provider: 'elevenlabs', voiceId, modelId, devOnly: false },
    async synthesize(text, emphasis = false) {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=pcm_${SAMPLE_RATE}`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
        // Fixed settings: changing them changes every clip (and form versions).
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: { stability: 0.75, similarity_boost: 0.75, style: 0, use_speaker_boost: true, ...(emphasis ? { speed: 0.8 } : {}) },
        }),
      });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
      const pcm = new DataView(await res.arrayBuffer());
      const samples = new Float32Array(pcm.byteLength / 2);
      for (let i = 0; i < samples.length; i++) samples[i] = pcm.getInt16(i * 2, true) / 0x8000;
      return { sampleRate: SAMPLE_RATE, samples };
    },
  };
}

function macosSayVoice(): Voice {
  const voiceId = process.env.SAY_VOICE ?? 'Samantha';
  return {
    manifest: { provider: 'macos-say', voiceId, modelId: 'say-170wpm', devOnly: true },
    async synthesize(text, emphasis = false) {
      const tmp = path.join(tmpdir(), `rm-clip-${process.pid}-${Date.now()}.wav`);
      execFileSync('say', ['-v', voiceId, '-r', emphasis ? '120' : '170', '-o', tmp, `--data-format=LEI16@${SAMPLE_RATE}`, emphasis ? `[[emph +]]${text}` : text]);
      const audio = decodeWav(readFileSync(tmp));
      rmSync(tmp);
      return audio;
    },
  };
}

/**
 * Every clip any administration can need: each spec × each servable form of
 * that test. Licensed forms are skipped unless LICENSED_CONTENT=true (D5), and
 * tests that need permission unless PERMITTED_TESTS lists them (CLAUDE.md §8).
 */
function collectClips(): { clipId: string; kind: ClipEntry['kind']; text: string }[] {
  const licensed = process.env.LICENSED_CONTENT === 'true';
  const clips = new Map<string, { clipId: string; kind: ClipEntry['kind']; text: string }>();
  const permitted = new Set((process.env.PERMITTED_TESTS ?? '').split(',').map((s) => s.trim()).filter(Boolean));
  for (const spec of ALL_SPECS) {
    if (spec.requiresPermission && !permitted.has(spec.testId)) {
      console.log(`– skipping ${spec.testId}: needs permission (${spec.requiresPermission})`);
      continue;
    }
    const forms = ALL_BANKS.filter((b) => b.testId === (spec.formsFrom ?? spec.testId)).flatMap((b) => b.forms).filter((f) => licensed || !f.licensed);
    for (const form of forms) for (const r of clipRequests(spec, form)) clips.set(r.clipId, r);
  }
  return [...clips.values()];
}

async function main() {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const voice = key && voiceId ? elevenLabsVoice(key, voiceId) : macosSayVoice();
  if (voice.manifest.devOnly) console.warn(`⚠ Using dev-only voice (${voice.manifest.provider}:${voice.manifest.voiceId}). Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID for production clips.`);

  mkdirSync(outDir, { recursive: true });
  const manifestPath = path.join(outDir, 'manifest.json');
  const previous = existsSync(manifestPath) ? clipManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8'))) : null;
  const sameVoice = previous && JSON.stringify(previous.voice) === JSON.stringify(voice.manifest);
  const prevById = new Map(previous?.clips.map((c) => [c.clipId, c]) ?? []);

  const entries: ClipEntry[] = [];
  for (const { clipId, kind, text } of collectClips()) {
    const file = `${clipId}.wav`;
    const prev = prevById.get(clipId);
    if (!force && sameVoice && prev?.text === text && existsSync(path.join(outDir, file))) {
      entries.push(prev);
      continue;
    }
    const raw = await voice.synthesize(text, kind === 'emphasis');
    const normalized = normalizeLoudness(trimSilence(raw), TARGET_LUFS);
    const bytes = encodeWav(normalized.audio);
    writeFileSync(path.join(outDir, file), bytes);
    const entry: ClipEntry = {
      clipId,
      kind,
      text,
      file,
      durationMs: Math.round((normalized.audio.samples.length / normalized.audio.sampleRate) * 1000),
      sha256: createHash('sha256').update(bytes).digest('hex'),
      lufs: Number.isFinite(normalized.outputLufs) ? Math.round(normalized.outputLufs * 10) / 10 : null,
      peakLimited: normalized.peakLimited,
    };
    if (prev && prev.sha256 !== entry.sha256) console.warn(`↻ ${clipId} changed: bump the version of every spec/form that uses it`);
    entries.push(entry);
    console.log(`✓ ${clipId} (${entry.durationMs} ms, ${entry.lufs} LUFS${entry.peakLimited ? ', peak-limited' : ''})`);
  }

  const manifest: ClipManifest = { version: 1, generatedAt: new Date().toISOString(), voice: voice.manifest, targetLufs: TARGET_LUFS, clips: entries };
  writeFileSync(manifestPath, `${JSON.stringify(clipManifestSchema.parse(manifest), null, 2)}\n`);
  // Remove clips no longer in the manifest (old wording, tests switched off), so they don't ship.
  const keep = new Set(entries.map((e) => e.file));
  for (const f of readdirSync(outDir)) if (f.endsWith('.wav') && !keep.has(f)) rmSync(path.join(outDir, f));
  console.log(`Wrote ${entries.length} clips + manifest to ${path.relative(process.cwd(), outDir)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

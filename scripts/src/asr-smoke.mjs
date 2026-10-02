// Smoke test for real speech-to-text: macOS speaks a serial-7s answer, the
// audio streams through the API relay (like the browser does), and the
// transcript prints. Needs the API server running with DEEPGRAM_API_KEY.
//   pnpm --filter @workspace/scripts asr-smoke [phrase]
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const RELAY = process.env.ASR_RELAY_URL ?? 'ws://localhost:8080/api/asr/stream';
const phrase = process.argv[2] ?? 'ninety three, eighty six, seventy nine, seventy two, sixty five';
const wav = path.join(tmpdir(), `rm-asr-smoke-${process.pid}.wav`);
execFileSync('say', ['-v', 'Daniel', '-o', wav, '--data-format=LEI16@16000', phrase]);
const bytes = readFileSync(wav);
rmSync(wav);
// Find the WAV data chunk (`say` adds extra chunks, so the header isn't always 44 bytes).
const dataAt = bytes.indexOf(Buffer.from('data')) + 8;
const pcm = bytes.subarray(dataAt);

const ws = new WebSocket(`${RELAY}?windowId=smoke%231&sampleRate=16000`);
ws.binaryType = 'arraybuffer';
ws.onopen = async () => {
  // Stream in real time: 100 ms chunks.
  const chunk = 3200;
  for (let i = 0; i < pcm.length; i += chunk) {
    ws.send(pcm.subarray(i, i + chunk));
    await new Promise((r) => setTimeout(r, 100));
  }
  ws.send(JSON.stringify({ type: 'finish' }));
};
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'partial') process.stdout.write(`\rpartial: ${msg.tokens.map((t) => t.token).join(' ')}   `);
  if (msg.type === 'final') {
    console.log(`\nfinal (${msg.provider} ${msg.model}):`);
    for (const t of msg.tokens) console.log(`  ${t.token.padEnd(10)} ${t.startMs}–${t.endMs} ms  conf ${t.confidence.toFixed(2)}`);
  }
  if (msg.type === 'error') console.log(`\nrelay error: ${msg.reason}${msg.reason === 'not_configured' ? ' (set DEEPGRAM_API_KEY in artifacts/api-server/.env and restart the API server)' : ''}`);
};
ws.onclose = () => process.exit(0);
ws.onerror = () => {
  console.log(`could not reach ${RELAY}: is the API server running?`);
  process.exit(1);
};

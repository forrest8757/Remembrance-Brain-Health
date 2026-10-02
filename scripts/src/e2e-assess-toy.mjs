// Drives /assess/toy end to end in Chromium with a fake microphone, captures
// every participant-visible state at 390 and 1280 px, and prints the debug
// administration record. Usage (app dev server running):
//   APP_URL=http://localhost:5173 pnpm --filter @workspace/scripts e2e-assess-toy
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.env.APP_URL ?? 'http://localhost:5173';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../design/assess-toy');
await mkdir(OUT, { recursive: true });

// Chromium's fake capture device is silent in headless mode on macOS, so the
// test replaces getUserMedia with a Web Audio stream looping a participant
// voice. Everything downstream of the MediaStream (capture, VAD, recording,
// orb) is the real product code. FAKE_MIC_WAV overrides; macOS can generate one.
let fakeMic = process.env.FAKE_MIC_WAV;
if (!fakeMic) {
  if (process.platform !== 'darwin') throw new Error('Set FAKE_MIC_WAV to a speech WAV file');
  fakeMic = path.join(tmpdir(), 'rm-fake-participant.wav');
  execFileSync('say', ['-v', 'Daniel', '-o', fakeMic, '--data-format=LEI16@48000', 'My name is Margaret. [[slnc 800]] Red. [[slnc 500]] Blue. [[slnc 500]] Yellow. [[slnc 1500]]']);
}
const fakeMicBytes = await readFile(fakeMic);

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

// Web Audio needs a working output device. Some environments (CI without
// audio, some sandboxes) report a running AudioContext whose clock never moves.
{
  const probe = await browser.newPage();
  const advanced = await probe.evaluate(async () => {
    const ctx = new AudioContext();
    await ctx.resume();
    const t0 = ctx.currentTime;
    await new Promise((r) => setTimeout(r, 500));
    return ctx.currentTime - t0;
  });
  await probe.close();
  if (advanced < 0.25) {
    console.error(`Audio clock is frozen in this browser environment (advanced ${advanced.toFixed(3)} s in 0.5 s). Run from a normal desktop session with an audio output device.`);
    await browser.close();
    process.exit(2);
  }
}

/** Installed before any page script runs. */
function installFakeMic() {
  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    if (!constraints || !constraints.audio) return original(constraints);
    const ctx = new AudioContext();
    const bytes = await (await fetch('/__fake-mic.wav')).arrayBuffer();
    const buffer = await ctx.decodeAudioData(bytes);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const dest = ctx.createMediaStreamDestination();
    src.connect(dest);
    src.start();
    return dest.stream;
  };
}

async function run({ width, height, name, reducedMotion }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion });
  await context.route('**/__fake-mic.wav', (route) => route.fulfill({ body: fakeMicBytes, contentType: 'audio/wav' }));
  await context.addInitScript(installFakeMic);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const shot = async (state) => page.screenshot({ path: path.join(OUT, `${state}-${name}.png`), fullPage: true });

  await page.goto(`${BASE}/assess/toy?debug=1`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await shot('1-welcome');
  await page.getByRole('button', { name: "I'm ready to begin" }).click();

  await page.getByText("Let's make sure I can hear you.").waitFor();
  await page.getByRole('button', { name: 'Sounds good, continue' }).waitFor();
  await page.waitForTimeout(1200);
  await shot('2-mic-check');
  // The fake device plays a constant tone, which may or may not pass the level check.
  const cont = page.getByRole('button', { name: 'Sounds good, continue' });
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes('Sounds good'));
    return b && !b.disabled;
  }, null, { timeout: 15_000 });
  await cont.click();

  const seen = new Set();
  const capture = async (label, locator) => {
    await locator.waitFor({ timeout: 30_000 });
    if (!seen.has(label)) {
      seen.add(label);
      await page.waitForTimeout(400);
      await shot(label);
    }
  };
  await capture('3-examiner-speaking', page.getByText('I am going to say three colors'));
  await capture('4-presenting', page.getByText('Listen carefully.'));
  await capture('5-listening', page.getByText('Your turn. Speak whenever you are ready.'));

  // Interruption path: pause mid-window, capture the sheet, resume.
  await page.getByRole('button', { name: 'Pause' }).click();
  await capture('6-paused', page.getByRole('dialog'));
  await page.getByRole('button', { name: "I'm ready to continue" }).click();
  await page.getByText('Your turn. Speak whenever you are ready.').waitFor();
  await page.getByRole('button', { name: "I'm finished" }).click();

  await capture('7-complete', page.getByText("That's everything for today."));
  const debug = JSON.parse(await page.locator('pre').innerText());
  await context.close();
  return { debug, errors };
}

const results = [];
for (const cfg of [
  { width: 390, height: 844, name: '390', reducedMotion: 'no-preference' },
  { width: 1280, height: 800, name: '1280', reducedMotion: 'no-preference' },
  { width: 390, height: 844, name: '390-reduced', reducedMotion: 'reduce' },
]) {
  const r = await run(cfg);
  results.push(r);
  console.log(`\n=== ${cfg.name} ===`);
  console.log(JSON.stringify(r.debug, null, 2));
  if (r.errors.length) console.log('PAGE ERRORS:', r.errors);
}
await browser.close();
process.exit(results.some((r) => r.errors.length) ? 1 : 0);

// Screenshots lib/ui (Clarity) component states from Ladle at 390 and 1280 px.
// Usage: `pnpm --filter @workspace/ui ladle` (port 61000), then
//   LADLE_URL=http://localhost:61000 pnpm --filter @workspace/scripts screenshot-ui
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.env.LADLE_URL ?? 'http://localhost:61000';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../design/clarity-ui');

const SHOTS = [
  ['primitives', 'assessment--primitives', {}],
  ['protocol-examiner', 'assessment--protocol', { phase: 'examinerSpeaking' }],
  ['protocol-presenting', 'assessment--protocol', { phase: 'presenting' }],
  ['protocol-listening', 'assessment--protocol', { phase: 'listening' }],
  ['protocol-letter-cue', 'assessment--protocol', { phase: 'letterCue' }],
  ['protocol-processing', 'assessment--protocol', { phase: 'processing' }],
  ['mic-good', 'assessment--mic-check-states', { status: 'good' }],
  ['mic-denied', 'assessment--mic-check-states', { status: 'denied' }],
  ['hearing', 'assessment--hearing', {}],
  ['environment', 'assessment--environment', {}],
  ['consent', 'assessment--consent', {}],
  ['break', 'assessment--break', {}],
  ['interruption', 'assessment--interruption', {}],
  ['complete', 'assessment--complete', {}],
  ['vigilance', 'assessment--vigilance', {}],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const [width, height] of [[390, 844], [1280, 800]]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  for (const [name, story, args] of SHOTS) {
    const q = new URLSearchParams({ story, mode: 'preview', ...Object.fromEntries(Object.entries(args).map(([k, v]) => [`arg-${k}`, v])) });
    await page.goto(`${BASE}/?${q}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    if (scrollW > width) console.warn(`⚠ ${name}@${width}: horizontal overflow (${scrollW}px)`);
    await page.screenshot({ path: path.join(OUT, `${name}-${width}.png`), fullPage: true });
  }
  await page.close();
}
await browser.close();
console.log(`wrote ${SHOTS.length * 2} screenshots to ${path.relative(process.cwd(), OUT)}`);

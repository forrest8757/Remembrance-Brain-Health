// Screenshots every P0 design-direction screen at phone and desktop widths.
// Usage: start mockup-sandbox (PORT=5174 BASE_PATH=/ vite dev), then
//   SANDBOX_URL=http://127.0.0.1:5174 pnpm --filter @workspace/scripts screenshot-directions
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.env.SANDBOX_URL ?? 'http://127.0.0.1:5174';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../design/directions');

const DIRECTIONS = ['Sanctuary', 'Clarity', 'Companion'];
const SCREENS = ['welcome', 'mic-check', 'examiner-speaking', 'listening', 'break', 'complete'];
const WIDTHS = [
  { name: '390', width: 390, height: 844 },
  { name: '1280', width: 1280, height: 800 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const vp of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
  for (const direction of DIRECTIONS) {
    for (const screen of SCREENS) {
      await page.goto(`${BASE}/preview/assessment-directions/${direction}?screen=${screen}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      // Let entrance animations settle and the fake amplitude reach a phrase peak.
      await page.waitForTimeout(1600);
      const file = path.join(OUT, `${direction.toLowerCase()}-${screen}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log('wrote', path.relative(process.cwd(), file));
    }
  }
  await page.close();
}

await browser.close();

// Redesign Phase 2: screenshot the three Home directions in every variant and
// check each one: axe-core (zero violations), tap targets ≥ 56 px, no
// sideways scrolling at 200% text.
// Usage: mockup-sandbox dev server on :5174, then
//   SANDBOX_URL=http://127.0.0.1:5174 node src/screenshot-home-directions.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const BASE = process.env.SANDBOX_URL ?? 'http://127.0.0.1:5174';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../design/directions/home');
const DIRECTIONS = [
  ['a-oura-calm', 'OuraCalm'],
  ['b-watch-rings', 'WatchRings'],
  ['c-dashboard-soft', 'DashboardSoft'],
];
const WIDTHS = [
  [390, 844],
  [1280, 800],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const report = [];

for (const [w, h] of WIDTHS) {
  for (const reducedMotion of ['reduce']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion });
    const page = await ctx.newPage();
    for (const [slug, comp] of DIRECTIONS) {
      for (const theme of ['dark', 'light']) {
        for (const text of [100, 200]) {
          await page.goto(`${BASE}/preview/home-directions/${comp}?theme=${theme}&text=${text}`, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(400);
          const name = `${slug}-${theme}-${w}-${text}`;
          // First screen as the participant sees it (tab bar pinned), then the whole page with the tab bar at the end.
          await page.screenshot({ path: path.join(OUT, `${name}-first-screen.png`) });
          await page.addStyleTag({ content: '.hd-tabbar{position:static !important}' });
          await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });

          const axe = await new AxeBuilder({ page }).include('.hd-root').analyze();
          const checks = await page.evaluate(() => {
            const small = [...document.querySelectorAll('.hd-root a, .hd-root button')]
              .map((el) => ({ el, r: el.getBoundingClientRect() }))
              .filter(({ r }) => r.width > 0 && (r.width < 55.5 || r.height < 55.5))
              .map(({ el, r }) => `${el.textContent?.trim().slice(0, 30) || el.getAttribute('aria-label')} (${Math.round(r.width)}×${Math.round(r.height)})`);
            return { small, overflowX: document.documentElement.scrollWidth > window.innerWidth + 1 };
          });
          report.push({ name, violations: axe.violations.map((v) => `${v.id} (${v.nodes.length})`), smallTargets: checks.small, overflowX: checks.overflowX });
          console.log(`${name}: axe ${axe.violations.length} · small targets ${checks.small.length} · sideways scroll ${checks.overflowX}`);
        }
      }
    }
    await ctx.close();
  }
}
await browser.close();
await writeFile(path.join(OUT, 'checks.json'), JSON.stringify(report, null, 2));
const bad = report.filter((r) => r.violations.length || r.smallTargets.length || r.overflowX);
console.log(bad.length ? `${bad.length} variant(s) with issues` : 'all variants clean');

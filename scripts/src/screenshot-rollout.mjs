// Redesign Phase 3: capture a rebuilt app screen in every variant
// (dark/light × 390/1280 px × 100/200% text, reduced motion) and check it:
// axe-core 0 violations, tap targets ≥ 56 px, no sideways scrolling.
//   node src/screenshot-rollout.mjs <screen-name> <path> [--tag after]
// e.g. node src/screenshot-rollout.mjs home /dashboard
// --state fixtures/x.json loads localStorage keys first (null removes a key).
// --click "Good|7 to 8 hours|Save check-in" taps each exact text, in order, first;
//   an entry "fill:#first-name=Margaret" types into a field instead.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const [screen, route, ...rest] = process.argv.slice(2);
const tag = rest.includes('--tag') ? rest[rest.indexOf('--tag') + 1] : 'after';
const stateFile = rest.includes('--state') ? rest[rest.indexOf('--state') + 1] : null;
const state = stateFile ? JSON.parse(await (await import('node:fs/promises')).readFile(stateFile, 'utf8')) : null;
const clicks = rest.includes('--click') ? rest[rest.indexOf('--click') + 1].split('|') : [];
const BASE = process.env.APP_URL ?? 'http://localhost:5173';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), `../../design/rollout/${screen}`);
await mkdir(OUT, { recursive: true });

const browser = await browser_();
async function browser_() {
  return chromium.launch();
}
const report = [];
for (const [w, h] of [[390, 844], [1280, 800]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.evaluate(() => {
    if (!localStorage.getItem('rm.profile')) localStorage.setItem('rm.profile', JSON.stringify({ firstName: 'Margaret', city: 'Provo', location: 'home', educationYears: 16, birthYear: 1950, sex: 'female' }));
  });
  for (const theme of ['dark', 'light']) {
    for (const text of [100, 200]) {
      // Every variant starts from the same demo state (it lives in sessionStorage).
      await page.goto(`${BASE}/`);
      await page.evaluate(() => sessionStorage.clear());
      if (state) {
        await page.goto(`${BASE}/`);
        await page.evaluate((st) => {
          for (const [k, v] of Object.entries(st)) v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v));
        }, state);
      }
      await page.goto(`${BASE}${route}${route.includes('?') ? '&' : '?'}theme=${theme}&text=${text}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      for (const c of clicks) {
        if (c.startsWith('fill:')) {
          const [sel, val] = c.slice(5).split('=');
          await page.fill(sel, val);
        } else await page.getByText(c, { exact: true }).first().click();
      }
      await page.waitForTimeout(400);
      const name = `${tag}-${theme}-${w}-${text}`;
      await page.screenshot({ path: path.join(OUT, `${name}-first-screen.png`) });
      await page.addStyleTag({ content: '.ds-tabbar{position:static !important}.ds-rail nav{position:static !important;height:auto !important}' });
      await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
      const axe = await new AxeBuilder({ page }).include('.ds-root').analyze();
      const checks = await page.evaluate(() => ({
        small: [...document.querySelectorAll('.ds-root a, .ds-root button, .ds-root summary, .ds-root label.ds-choice')]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && (r.width < 55.5 || r.height < 55.5))
          .map(({ el, r }) => `${(el.textContent || '').trim().slice(0, 30)} (${Math.round(r.width)}×${Math.round(r.height)})`),
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
        // .ds-root clips sideways overflow, so also look for anything that would be cut off.
        clipped: [...document.querySelectorAll('.ds-root :is(h1,h2,h3,p,a,button,label,legend,span,li)')]
          .filter((el) => el.getClientRects().length && !el.closest('.sr-only') && (el.getBoundingClientRect().right > window.innerWidth + 1 || (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)))
          .map((el) => (el.textContent || '').trim().slice(0, 30)),
      }));
      report.push({ name, violations: axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`), smallTargets: checks.small, overflowX: checks.overflowX, clipped: checks.clipped });
      console.log(`${name}: axe ${axe.violations.length} · small ${checks.small.length} · sideways ${checks.overflowX} · cut off ${checks.clipped.length}`);
    }
  }
  await ctx.close();
}
await browser.close();
await writeFile(path.join(OUT, `${tag}-checks.json`), JSON.stringify(report, null, 2));
const bad = report.filter((r) => r.violations.length || r.smallTargets.length || r.overflowX || r.clipped.length);
console.log(bad.length ? `${bad.length} variant(s) with issues:\n${JSON.stringify(bad, null, 1)}` : 'all variants clean');

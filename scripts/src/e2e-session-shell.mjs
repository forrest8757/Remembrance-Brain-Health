// P1 Session Shell flows (build doc DoD): happy path, hearing fail → graceful
// exit, caregiver setup → handoff, consent declined. Drives the real page with
// ?debug=1, which simulates only the spoken repeat-after-me result (headless
// Chromium here has a frozen audio clock).
//   pnpm --filter @workspace/scripts exec node src/e2e-session-shell.mjs  (app on :5173)
import { chromium } from 'playwright';

const BASE = process.env.APP_URL ?? 'http://localhost:5173';
const PROFILE = { firstName: 'Ruth', city: 'Provo', location: 'home', educationYears: 16, birthYear: 1952, sex: 'female' };
const b = await chromium.launch();
let failures = 0;

async function flow(name, fn) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.setDefaultTimeout(5000);
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${BASE}/`);
  await p.evaluate((prof) => {
    localStorage.clear();
    localStorage.setItem('rm.profile', JSON.stringify(prof));
  }, PROFILE);
  await p.goto(`${BASE}/assess/session?debug=1`);
  const click = (label) => p.getByRole('button', { name: label, exact: true }).click();
  const see = async (text) => {
    await p.getByText(text, { exact: false }).first().waitFor({ timeout: 4000 });
  };
  try {
    await fn({ p, click, see });
    if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
    console.log(`✓ ${name}`);
  } catch (e) {
    failures++;
    console.log(`✗ ${name}: ${e.message.split('\n')[0]}`);
    await p.screenshot({ path: `/tmp/claude-shell-${name.replace(/\W+/g, '-')}.png` });
  }
  await p.close();
}

/** Start → identity → plan → device → hearing questions (all "fine" answers). */
async function throughHearingQuestions({ click, see }) {
  await click('Start');
  await see('Hello, Ruth.');
  await click("Yes, that's me");
  await click('Good to know');
  await click("I'm set up");
  await see('trouble hearing');
  await click('No');
  await see('hear me clearly');
  await click('Yes');
  await see('hearing aid');
  await click('No');
}

/** Environment: every answer is the calm one. */
async function calmSpace({ click }, except = []) {
  const answers = [['quiet', 'Yes'], ['pets', 'No'], ['devices', 'No'], ['people', 'No'], ['break', 'No'], ['paper', 'No'], ['dates', 'No']];
  for (const [key, a] of answers) if (!except.includes(key)) await click(a);
}

await flow('happy path', async (t) => {
  await throughHearingQuestions(t);
  await t.click('Simulate: repeated correctly');
  await t.see('somewhere quiet');
  await calmSpace(t);
  await t.see('Recording your answers');
  await t.click('I agree');
  await t.click("I'm ready");
  await t.see("Great, Ruth. Let's begin.");
  await t.click('Start the first activity');
  await t.see('Next up');
  const shell = await t.p.evaluate(() => JSON.parse(localStorage.getItem('rm.shell')));
  if (shell.stage !== 'battery' || shell.consent !== 'given' || shell.integrityVersion !== 'soft-v1') throw new Error(`unexpected shell ${JSON.stringify(shell.stage)}`);
});

await flow('hearing fail → graceful exit', async (t) => {
  await throughHearingQuestions(t);
  await t.click('Simulate: not repeated');
  await t.see('easier to hear');
  await t.click('Try again');
  await t.click('Simulate: not repeated');
  await t.see("Let's stop here for today.");
  await t.see('Choose another time');
});

await flow('caregiver setup → handoff', async (t) => {
  await throughHearingQuestions(t);
  await t.click('Simulate: repeated correctly');
  await t.click('Yes'); // quiet
  await t.click('No'); // pets
  await t.click('No'); // devices
  await t.see('anyone else in the room');
  await t.click('Yes');
  await t.click("They're helping me set up");
  await t.see('Please leave the room now.');
  await t.click("They've left the room");
  await t.see('bathroom break');
  await t.click('No');
  await t.click('No');
  await t.click('No');
  await t.see('Recording your answers');
  const shell = await t.p.evaluate(() => JSON.parse(localStorage.getItem('rm.shell')));
  if (!shell.caregiverHandoff) throw new Error('handoff not recorded');
});

await flow('consent declined', async (t) => {
  await throughHearingQuestions(t);
  await t.click('Simulate: repeated correctly');
  await calmSpace(t);
  await t.click('Not today');
  await t.see("That's okay.");
  await t.see("can't continue without it");
});

await b.close();
console.log(failures ? `${failures} flow(s) failed` : 'all flows passed');
process.exit(failures ? 1 : 0);

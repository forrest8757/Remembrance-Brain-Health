// Generates localStorage states for capturing session screens (redesign
// rollout 3), using the real orchestrator and shell code.
//   npx tsx scripts/fixtures/make-session-fixtures.ts
import { writeFileSync } from 'node:fs';
import { LEAN_B2C, reduce, resolveBattery, shellReduce, startSession, startShell, ENVIRONMENT_KEYS } from '../../lib/battery/src/index';

const AVAILABLE = new Set(['story-immediate', 'story-delayed', 'number-span', 'category-fluency', 'oral-trails', 'phonemic-fluency']);
const now = Date.now();
const session = startSession(resolveBattery(LEAN_B2C, AVAILABLE), now);
const shell = startShell({ returning: false, consentOnFile: false, now });
const PROFILE = { firstName: 'Margaret', city: 'Provo', location: 'home', educationYears: 16, birthYear: 1950, sex: 'female' };
const out = (name: string, state: Record<string, unknown>) => writeFileSync(new URL(`./${name}.json`, import.meta.url), JSON.stringify({ 'rm.profile': PROFILE, ...state }, null, 1));

out('session-intro', { 'rm.session': null, 'rm.shell': null });
out('session-identity', { 'rm.session': session, 'rm.shell': shell });
let env = shellReduce(shell, { type: 'IDENTITY', confirmed: true }, now);
for (const a of [{ type: 'CONTINUE' }, { type: 'CONTINUE' }, { type: 'HEARING_ANSWER', question: 'troubleUsually', yes: false }, { type: 'HEARING_ANSWER', question: 'hearsWell', yes: true }, { type: 'HEARING_ANSWER', question: 'usesDevice', yes: false }, { type: 'HEARING_REPEAT_RESULT', passed: true }] as const)
  env = shellReduce(env, a, now);
env = shellReduce(env, { type: 'ENVIRONMENT', key: 'quiet', answer: { issue: false, resolved: true } }, now);
env = shellReduce(env, { type: 'ENVIRONMENT', key: 'pets', answer: { issue: false, resolved: true } }, now);
out('session-environment', { 'rm.session': session, 'rm.shell': env });
let battery = env;
for (const key of ENVIRONMENT_KEYS) battery = shellReduce(battery, { type: 'ENVIRONMENT', key, answer: { issue: false, resolved: true } }, now);
battery = shellReduce(shellReduce(battery, { type: 'CONSENT', given: true }, now), { type: 'READY', ready: true, integrityVersion: 'soft-v1' }, now);
out('session-nextup', { 'rm.session': session, 'rm.shell': battery });
let done = session;
let t = now - 30 * 60_000;
for (const item of session.items) {
  done = reduce(done, { type: 'TEST_STARTED', testId: item.testId, at: t });
  t += 4 * 60_000;
  done = reduce(done, { type: 'TEST_ENDED', testId: item.testId, at: t, outcome: 'complete' });
}
const complete = shellReduce(shellReduce(battery, { type: 'BATTERY_DONE' }, now), { type: 'SELF_REPORT', report: { interrupted: false, helped: false, usedAids: false, tired: false, feeling: 'calm' } }, now);
const results = [
  { testId: 'story-immediate', title: 'A Short Story', headline: '31 of 44 exact words · 19 of 25 ideas', needsReview: false, focusLost: 0, interruptions: 0, report: { headline: [], sections: [{ label: 'Exact words', value: '31 of 44', why: 'You used 31 of the story’s 44 key words, in any order.' }], notes: [] } },
  { testId: 'number-span', title: 'Number Span', headline: '9 of 14 numbers in the same order · 7 of 14 numbers in reverse order', needsReview: false, focusLost: 0, interruptions: 0, report: { headline: [], sections: [], notes: [] } },
];
out('session-complete', { 'rm.session': done, 'rm.shell': complete, 'rm.session.results': results, 'rm.session.completions': [now - 14 * 86_400_000, now - 7 * 86_400_000, now] });
console.log('fixtures written');

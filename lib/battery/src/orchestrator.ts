// Battery orchestrator (build doc P2): sequences tests, runs the delay
// manager, and keeps a serializable session state that resumes after a
// refresh or a dropped call.
//
// Pure: `reduce(state, event)` records what happened; `plan(state, now)`
// says what to do next. The web app (and later the phone runner) persists
// the state after every event and calls plan() whenever it needs a step.
import { checkSessionCollisions, type Collision, type SessionEntry } from '@workspace/forms';
import { CATALOG, DELAY_RULES, estimateOf, ruleForDelayed, ruleForImmediate, type FillerKind } from './catalog';
import type { BatteryDef } from './presets';

// ---- Resolving and validating a battery -----------------------------------------

export interface ResolvedBattery {
  id: string;
  title: string;
  /** Test ids actually administered, in order. */
  items: string[];
  /** Visit index per item (all 0 for one sitting). */
  visitOf: number[];
  skipped: { testId: string; reason: 'unavailable' | 'optional' | 'partner_unavailable' }[];
  /** Problems that make the battery invalid (e.g. a delayed test before its partner). */
  issues: string[];
  /** Expected delays that need filler (informational). */
  notes: string[];
}

/**
 * Resolve a battery against the tests the app can run (built and permitted):
 * unavailable tests are skipped, a delayed test whose immediate partner is
 * skipped is skipped too, and the order is validated (build doc P2:
 * "every delayed test comes after its immediate partner, delay windows are satisfiable").
 */
export function resolveBattery(def: BatteryDef, available: ReadonlySet<string>, opts: { includeOptional?: boolean } = {}): ResolvedBattery {
  const skipped: ResolvedBattery['skipped'] = [];
  const keep: { testId: string; visit: number }[] = [];
  const visitOfIndex = (i: number) => (def.visits ? def.visits.findIndex((v) => v.includes(i)) : 0);
  def.items.forEach((item, i) => {
    if (item.optional && !opts.includeOptional) return void skipped.push({ testId: item.testId, reason: 'optional' });
    if (!available.has(item.testId)) return void skipped.push({ testId: item.testId, reason: 'unavailable' });
    keep.push({ testId: item.testId, visit: Math.max(0, visitOfIndex(i)) });
  });
  // A delayed test without its immediate partner can't run.
  const kept = keep.filter(({ testId }) => {
    const rule = ruleForDelayed(testId);
    if (rule && !keep.some((k) => k.testId === rule.immediate)) {
      skipped.push({ testId, reason: 'partner_unavailable' });
      return false;
    }
    return true;
  });
  // Renumber visits so an emptied visit (e.g. MoCA switched off) disappears.
  const visitIds = [...new Set(kept.map((k) => k.visit))];
  const items = kept.map((k) => ({ ...k, visit: visitIds.indexOf(k.visit) }));

  const issues: string[] = [];
  const notes: string[] = [];
  const ids = items.map((k) => k.testId);
  for (const rule of DELAY_RULES) {
    const a = ids.indexOf(rule.immediate);
    const b = ids.indexOf(rule.delayed);
    if (a < 0 || b < 0) continue;
    if (b < a) {
      issues.push(`${rule.delayed} comes before its partner ${rule.immediate}`);
      continue;
    }
    if (items[a]!.visit !== items[b]!.visit) issues.push(`${rule.immediate} and ${rule.delayed} are in different visits`);
    const between = ids.slice(a + 1, b).reduce((sum, t) => sum + estimateOf(t), 0);
    if (rule.maxMs !== null && between > rule.maxMs)
      issues.push(`the tests between ${rule.immediate} and ${rule.delayed} take ~${Math.round(between / 60_000)} min, over the ${rule.maxMs / 60_000}-min window`);
    if (between < rule.minMs) notes.push(`${rule.delayed}: ~${Math.round((rule.minMs - between) / 60_000)} min of ${rule.filler === 'neutralPause' ? 'neutral pause' : 'non-verbal filler'} expected`);
  }
  return { id: def.id, title: def.title, items: ids, visitOf: items.map((k) => k.visit), skipped, issues, notes };
}

/** Session-level lexical collision check across the forms chosen for a session (CLAUDE.md §8). */
export function sessionCollisions(entries: SessionEntry[]): Promise<Collision[]> {
  return checkSessionCollisions(entries);
}

// ---- Session state ----------------------------------------------------------------

export type ItemStatus = 'pending' | 'running' | 'complete' | 'partial' | 'skipped';

export type SessionFlag =
  /** A delayed test ran after its window closed (e.g. a long interruption). */
  | 'window_overrun'
  /** A delayed test was moved ahead of other tests so its window wouldn't close. */
  | 'moved_up_to_protect_window'
  /** The test was interrupted and restarted when the session resumed. */
  | 'restarted_after_interruption'
  /** The delay before this test couldn't be measured (99). */
  | 'delay_unknown';

export interface SessionItem {
  testId: string;
  visit: number;
  status: ItemStatus;
  startedAt: number | null;
  endedAt: number | null;
  flags: SessionFlag[];
  /** Delayed tests: actual minutes since the immediate test ended (99 = unknown). */
  delayMinutes: number | null;
}

export interface SessionState {
  version: 1;
  batteryId: string;
  title: string;
  startedAt: number;
  items: SessionItem[];
  /** Delay clocks: delayed test id → when its immediate partner ended. */
  clocks: Record<string, number>;
  /** A filler in progress (so a refresh resumes it, not restarts the wait). */
  filler: { forTestId: string; kind: FillerKind; startedAt: number } | null;
  /** The visit in progress (D12 two-visit batteries). */
  visit: number;
  visitEndedAt: number | null;
  interruptions: { at: number; resumedAt: number | null }[];
  log: { at: number; type: string; testId?: string; detail?: string }[];
}

export function startSession(b: ResolvedBattery, now: number): SessionState {
  return {
    version: 1,
    batteryId: b.id,
    title: b.title,
    startedAt: now,
    items: b.items.map((testId, i) => ({ testId, visit: b.visitOf[i] ?? 0, status: 'pending', startedAt: null, endedAt: null, flags: [], delayMinutes: null })),
    clocks: {},
    filler: null,
    visit: 0,
    visitEndedAt: null,
    interruptions: [],
    log: [{ at: now, type: 'session_started' }],
  };
}

export type SessionEvent =
  | { type: 'TEST_STARTED'; testId: string; at: number }
  | { type: 'TEST_ENDED'; testId: string; at: number; outcome: 'complete' | 'partial' }
  | { type: 'FILLER_STARTED'; forTestId: string; kind: FillerKind; at: number }
  | { type: 'FILLER_ENDED'; at: number }
  /** App backgrounded, page closed, call dropped. Delay clocks keep running. */
  | { type: 'INTERRUPTED'; at: number }
  | { type: 'RESUMED'; at: number }
  | { type: 'NEXT_VISIT'; at: number };

const mapItem = (s: SessionState, testId: string, f: (i: SessionItem) => SessionItem): SessionItem[] => s.items.map((i) => (i.testId === testId ? f(i) : i));

export function reduce(s: SessionState, e: SessionEvent): SessionState {
  const log = [...s.log, { at: e.at, type: e.type.toLowerCase(), testId: 'testId' in e ? e.testId : 'forTestId' in e ? e.forTestId : undefined }];
  switch (e.type) {
    case 'TEST_STARTED': {
      const rule = ruleForDelayed(e.testId);
      const clock = s.clocks[e.testId];
      return {
        ...s,
        filler: null,
        log,
        items: mapItem(s, e.testId, (i) => ({
          ...i,
          status: 'running',
          startedAt: e.at,
          delayMinutes: rule ? (clock === undefined ? 99 : Math.round((e.at - clock) / 60_000)) : null,
          flags: rule && clock === undefined && !i.flags.includes('delay_unknown') ? [...i.flags, 'delay_unknown'] : i.flags,
        })),
      };
    }
    case 'TEST_ENDED': {
      const rule = ruleForImmediate(e.testId);
      return {
        ...s,
        log,
        items: mapItem(s, e.testId, (i) => ({ ...i, status: e.outcome, endedAt: e.at })),
        // The delay clock starts when the immediate test ends (only once it really happened).
        clocks: rule && e.outcome === 'complete' ? { ...s.clocks, [rule.delayed]: e.at } : s.clocks,
      };
    }
    case 'FILLER_STARTED':
      return { ...s, log, filler: s.filler ?? { forTestId: e.forTestId, kind: e.kind, startedAt: e.at } };
    case 'FILLER_ENDED':
      return { ...s, log, filler: null };
    case 'INTERRUPTED':
      return { ...s, log, interruptions: [...s.interruptions, { at: e.at, resumedAt: null }] };
    case 'RESUMED':
      // A test that was running restarts (its spec's interrupt policy decides the details); delay clocks never pause.
      return {
        ...s,
        log,
        interruptions: s.interruptions.map((x, k, all) => (k === all.length - 1 && x.resumedAt === null ? { ...x, resumedAt: e.at } : x)),
        items: s.items.map((i) =>
          i.status === 'running'
            ? { ...i, status: 'pending', startedAt: null, flags: i.flags.includes('restarted_after_interruption') ? i.flags : [...i.flags, 'restarted_after_interruption'] }
            : i,
        ),
      };
    case 'NEXT_VISIT':
      return { ...s, log, visit: s.visit + 1, visitEndedAt: null };
  }
}

// ---- What to do next --------------------------------------------------------------

export type SessionStep =
  | { kind: 'test'; testId: string; flags: SessionFlag[] }
  /** Wait before a delayed test: non-verbal filler, or (story recall) a neutral pause only. */
  | { kind: 'filler'; forTestId: string; filler: FillerKind; untilAt: number }
  /** D12: this visit is over; the next one may start after `earliestAt` (1–7 days). */
  | { kind: 'visitBreak'; nextVisit: number; earliestAt: number }
  | { kind: 'done' };

const DAY = 24 * 60 * 60_000;

export function plan(s: SessionState, now: number): SessionStep {
  const pending = s.items.filter((i) => i.status === 'pending' && i.visit === s.visit);
  if (pending.length === 0) {
    const later = s.items.some((i) => i.status === 'pending' && i.visit > s.visit);
    if (!later) return { kind: 'done' };
    const lastEnd = Math.max(...s.items.filter((i) => i.visit === s.visit).map((i) => i.endedAt ?? 0));
    return { kind: 'visitBreak', nextVisit: s.visit + 1, earliestAt: lastEnd + DAY };
  }
  const first = pending[0]!;

  // Protect delay windows with an upper bound: overdue → now (flagged); about
  // to close because of the next test → move the delayed test up (flagged).
  for (const item of pending) {
    const rule = ruleForDelayed(item.testId);
    const clock = s.clocks[item.testId];
    if (!rule || rule.maxMs === null || clock === undefined) continue;
    const deadline = clock + rule.maxMs;
    if (now > deadline) return { kind: 'test', testId: item.testId, flags: ['window_overrun'] };
    if (item !== first && now + estimateOf(first.testId) > deadline && now >= clock + rule.minMs) {
      return { kind: 'test', testId: item.testId, flags: ['moved_up_to_protect_window'] };
    }
  }

  // A delayed test that comes due early waits with allowed filler only (never other tests).
  const rule = ruleForDelayed(first.testId);
  const clock = s.clocks[first.testId];
  if (rule && clock !== undefined && now < clock + rule.minMs) {
    return { kind: 'filler', forTestId: first.testId, filler: rule.filler, untilAt: clock + rule.minMs };
  }
  return { kind: 'test', testId: first.testId, flags: [] };
}

/** Progress for the ProgressRail: test N of M in this visit (never item-level). */
export function progress(s: SessionState): { current: number; total: number } {
  const visitItems = s.items.filter((i) => i.visit === s.visit);
  const done = visitItems.filter((i) => i.status === 'complete' || i.status === 'partial' || i.status === 'skipped').length;
  return { current: Math.min(done + 1, visitItems.length), total: visitItems.length };
}

/** Estimated minutes left in this visit (chrome zone only), including expected delay waits. */
export function minutesRemaining(s: SessionState, now: number): number {
  let t = now;
  const sim: SessionState = JSON.parse(JSON.stringify(s));
  for (let guard = 0; guard < 50; guard++) {
    const step = plan(sim, t);
    if (step.kind === 'done' || step.kind === 'visitBreak') break;
    if (step.kind === 'filler') {
      // After the wait, plan() moves on to the delayed test.
      t = step.untilAt;
      continue;
    }
    t += estimateOf(step.testId);
    const ended = reduce(reduce(sim, { type: 'TEST_STARTED', testId: step.testId, at: t - estimateOf(step.testId) }), { type: 'TEST_ENDED', testId: step.testId, at: t, outcome: 'complete' });
    Object.assign(sim, ended);
  }
  return Math.max(0, Math.round((t - now) / 60_000));
}

export const titleOf = (testId: string) => CATALOG[testId]?.title ?? testId;

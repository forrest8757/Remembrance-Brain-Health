// P1 Session Shell (build doc §P1): everything before the first test and after
// the last — identity, interruption plan, device setup, hearing screen,
// environment check, recording consent, integrity statement, rapport — and
// the post-battery self-report with the automatic validity rating (CLAUDE.md §12).
//
// Pure: `shellReduce(state, action)` and `validityOf(...)`. The web session page
// renders the current stage.

export type ShellStage =
  | 'identity'
  | 'interruptionPlan'
  | 'device'
  | 'hearingQuestions'
  | 'hearingRepeat'
  | 'hearingBoost'
  | 'environment'
  | 'consent'
  | 'rapport'
  | 'battery'
  | 'selfReport'
  | 'complete'
  | 'ended';

export type EndReason = 'identity' | 'hearing' | 'consent' | 'not_ready';

/** Environment questions (Remembrance wording lives in the UI; keys are stable). */
export const ENVIRONMENT_KEYS = ['quiet', 'pets', 'devices', 'people', 'break', 'paper', 'dates'] as const;
export type EnvironmentKey = (typeof ENVIRONMENT_KEYS)[number];

export interface EnvironmentAnswer {
  /** The question's "problem" answer (e.g. "Yes, someone is nearby"; for `quiet`, "No"). */
  issue: boolean;
  /** The issue was dealt with (pet seen to, devices off, person left…). */
  resolved: boolean;
}

export interface ShellState {
  version: 1;
  stage: ShellStage;
  /** Returning participants skip already-confirmed setup (but never the hearing repetition or environment check). */
  returning: boolean;
  hearing: {
    troubleUsually: boolean | null;
    hearsWell: boolean | null;
    usesDevice: boolean | null;
    deviceInPlace: boolean | null;
    /** Repetition rounds run (each allows two tries); the second follows the volume/earbuds card. */
    rounds: number;
    passed: boolean | null;
    boosted: boolean;
  };
  environment: Partial<Record<EnvironmentKey, EnvironmentAnswer>>;
  /** A caregiver helped with setup and then left (allowed; logged). */
  caregiverHandoff: boolean;
  consent: 'given' | 'declined' | null;
  /** Which integrity statement was shown (logged; build doc ⟦DECISION⟧). */
  integrityVersion: string | null;
  selfReport: SelfReport | null;
  ended: EndReason | null;
  log: { at: number; type: string; detail?: string }[];
}

export interface SelfReport {
  interrupted: boolean;
  helped: boolean;
  usedAids: boolean;
  tired: boolean;
  /** How they felt: calm, a little stressed, very stressed. */
  feeling: 'calm' | 'some_stress' | 'very_stressed';
}

export function startShell(opts: { returning: boolean; consentOnFile: boolean; now: number }): ShellState {
  return {
    version: 1,
    stage: 'identity',
    returning: opts.returning,
    hearing: { troubleUsually: null, hearsWell: null, usesDevice: null, deviceInPlace: null, rounds: 0, passed: null, boosted: false },
    environment: {},
    caregiverHandoff: false,
    consent: opts.consentOnFile ? 'given' : null,
    integrityVersion: null,
    selfReport: null,
    ended: null,
    log: [{ at: opts.now, type: 'shell_started', detail: opts.returning ? 'returning' : 'first visit' }],
  };
}

export type ShellAction =
  | { type: 'IDENTITY'; confirmed: boolean }
  | { type: 'CONTINUE' }
  | { type: 'HEARING_ANSWER'; question: 'troubleUsually' | 'hearsWell' | 'usesDevice' | 'deviceInPlace'; yes: boolean }
  | { type: 'HEARING_REPEAT_RESULT'; passed: boolean }
  | { type: 'ENVIRONMENT'; key: EnvironmentKey; answer: EnvironmentAnswer }
  | { type: 'CAREGIVER_LEFT' }
  | { type: 'CONSENT'; given: boolean }
  | { type: 'READY'; ready: boolean; integrityVersion: string }
  | { type: 'BATTERY_DONE' }
  | { type: 'SELF_REPORT'; report: SelfReport };

/** The stage after `stage`, skipping what a returning participant already did. */
function nextStage(s: ShellState, stage: ShellStage): ShellStage {
  const order: ShellStage[] = ['identity', 'interruptionPlan', 'device', 'hearingQuestions', 'hearingRepeat', 'environment', 'consent', 'rapport', 'battery', 'selfReport', 'complete'];
  let i = order.indexOf(stage) + 1;
  for (; i < order.length; i++) {
    const st = order[i]!;
    if (s.returning && (st === 'interruptionPlan' || st === 'device' || st === 'hearingQuestions')) continue;
    if (st === 'consent' && s.consent === 'given') continue;
    return st;
  }
  return 'complete';
}

const end = (s: ShellState, reason: EndReason, now: number): ShellState => ({ ...s, stage: 'ended', ended: reason, log: [...s.log, { at: now, type: 'ended', detail: reason }] });

/** Hearing questions in order: trouble usually → hears well → uses a device → device in place (only if they use one). */
export function nextHearingQuestion(s: ShellState): 'troubleUsually' | 'hearsWell' | 'usesDevice' | 'deviceInPlace' | null {
  const h = s.hearing;
  if (h.troubleUsually === null) return 'troubleUsually';
  if (h.hearsWell === null) return 'hearsWell';
  if (h.usesDevice === null) return 'usesDevice';
  if (h.usesDevice && h.deviceInPlace === null) return 'deviceInPlace';
  return null;
}

export function shellReduce(s: ShellState, a: ShellAction, now = Date.now()): ShellState {
  const log = [...s.log, { at: now, type: a.type.toLowerCase(), detail: 'key' in a ? a.key : 'question' in a ? `${a.question}=${a.yes}` : undefined }];
  const withLog = { ...s, log };
  switch (a.type) {
    case 'IDENTITY':
      return a.confirmed ? { ...withLog, stage: nextStage(s, 'identity') } : end(withLog, 'identity', now);
    case 'CONTINUE':
      if (s.stage === 'hearingBoost') return { ...withLog, stage: 'hearingRepeat', hearing: { ...s.hearing, boosted: true } };
      return { ...withLog, stage: nextStage(s, s.stage) };
    case 'HEARING_ANSWER': {
      const hearing = { ...s.hearing, [a.question]: a.yes };
      const next = { ...withLog, hearing };
      return nextHearingQuestion(next) === null ? { ...next, stage: nextStage(next, 'hearingQuestions') } : next;
    }
    case 'HEARING_REPEAT_RESULT': {
      const hearing = { ...s.hearing, rounds: s.hearing.rounds + 1, passed: a.passed };
      if (a.passed) return { ...withLog, hearing, stage: nextStage(s, 'hearingRepeat') };
      // Failed both tries: one more round after the volume/earbuds card; then a graceful end (validity 1, hearing).
      return hearing.rounds < 2 ? { ...withLog, hearing, stage: 'hearingBoost' } : end({ ...withLog, hearing }, 'hearing', now);
    }
    case 'ENVIRONMENT': {
      const environment = { ...s.environment, [a.key]: a.answer };
      const done = ENVIRONMENT_KEYS.every((k) => environment[k] && (!environment[k]!.issue || environment[k]!.resolved));
      return { ...withLog, environment, stage: done ? nextStage(s, 'environment') : s.stage };
    }
    case 'CAREGIVER_LEFT':
      return { ...withLog, caregiverHandoff: true, environment: { ...s.environment, people: { issue: true, resolved: true } } };
    case 'CONSENT':
      // A hard gate: no recording, no automated scoring, so no session (no manual-scoring path yet).
      return a.given ? { ...withLog, consent: 'given', stage: nextStage({ ...s, consent: 'given' }, 'consent') } : end({ ...withLog, consent: 'declined' }, 'consent', now);
    case 'READY':
      return a.ready ? { ...withLog, integrityVersion: a.integrityVersion, stage: 'battery' } : end(withLog, 'not_ready', now);
    case 'BATTERY_DONE':
      return { ...withLog, stage: 'selfReport' };
    case 'SELF_REPORT':
      return { ...withLog, selfReport: a.report, stage: 'complete' };
  }
}

// ---- Validity (CLAUDE.md §12) ------------------------------------------------------

/** NACC validity categories. */
export const VALIDITY_CATEGORIES = {
  1: 'Hearing impairment',
  2: 'Distractions',
  3: 'Interruptions',
  4: 'Lack of effort / disinterest',
  5: 'Fatigue',
  6: 'Emotional issues',
  7: 'Unapproved assistance',
  8: 'Other',
} as const;
export type ValidityCategory = keyof typeof VALIDITY_CATEGORIES;

export interface ValidityInput {
  shell: ShellState;
  /** Session interruptions (app closed/backgrounded) from the orchestrator. */
  sessionInterruptions: number;
  /** Focus-loss and interruption flags from the tests' records. */
  focusLost: number;
  testInterruptions: number;
  /** Delay windows missed (orchestrator `window_overrun`). */
  windowOverruns: number;
}

export interface ValidityRating {
  /** 1 Very valid · 2 Questionably valid · 3 Invalid. */
  rating: 1 | 2 | 3;
  categories: ValidityCategory[];
  reasons: string[];
}

export function validityOf(v: ValidityInput): ValidityRating {
  const cats = new Set<ValidityCategory>();
  const reasons: string[] = [];
  const add = (c: ValidityCategory, why: string) => {
    cats.add(c);
    reasons.push(why);
  };
  const { shell } = v;
  const h = shell.hearing;
  const sr = shell.selfReport;

  if (h.passed === false) add(1, 'did not pass the hearing check');
  else if (h.boosted || h.troubleUsually || h.hearsWell === false) add(1, 'some trouble hearing (passed after adjustment)');
  const unresolved = ENVIRONMENT_KEYS.filter((k) => shell.environment[k]?.issue && !shell.environment[k]?.resolved);
  if (unresolved.length) add(2, `environment not settled: ${unresolved.join(', ')}`);
  if (v.focusLost > 0) add(2, `left the app during a test ${v.focusLost} time(s)`);
  if (v.sessionInterruptions > 0 || v.testInterruptions > 0 || sr?.interrupted) add(3, 'interrupted');
  if (v.windowOverruns > 0) add(3, 'a delayed recall ran late');
  if (sr?.tired) add(5, 'reported feeling tired');
  if (sr?.feeling === 'very_stressed') add(6, 'reported feeling very stressed');
  if (sr?.helped) add(7, 'reported help from someone');
  if (sr?.usedAids) add(7, 'reported writing things down or using aids');

  // Invalid: unapproved help or aids, or a failed hearing check. Questionable: anything else noted.
  const rating: ValidityRating['rating'] = cats.has(7) || h.passed === false ? 3 : cats.size > 0 ? 2 : 1;
  return { rating, categories: [...cats].sort(), reasons };
}

// A battery session: the P1 Session Shell (identity, setup, hearing screen,
// environment, consent, rapport; self-report and validity afterwards) around
// the P2 battery (the lean battery's available tests back to back, with the
// delay manager, a "Next up" card per test, an optional breather between
// tests, and results only at the end, CLAUDE.md §9).
//
// The orchestrator state is saved after every event (dev: this browser), so a
// refresh resumes the session: a test that was running restarts, delay clocks
// keep running.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LEAN_B2C,
  minutesRemaining,
  plan,
  progress,
  reduce,
  ruleForDelayed,
  resolveBattery,
  sessionCollisions,
  startSession,
  titleOf,
  shellReduce,
  startShell,
  validityOf,
  VALIDITY_CATEGORIES,
  type SessionEvent,
  type SessionState,
  type ShellAction,
  type ShellState,
  type ValidityRating,
} from '@workspace/battery';
import {
  ConsentStage,
  DeviceStage,
  EndedStage,
  EnvironmentStage,
  HearingBoostStage,
  HearingQuestionsStage,
  IdentityStage,
  InterruptionPlanStage,
  RapportStage,
  SelfReportStage,
} from '@/pages/session-shell';
import { AssessmentLayout, BreakCard, Button, DelayActivity, ListeningOrb, ProfileSetup, StatusIcon, StreakMeter, Text, ThemeRoot, TopBar, isProfileComplete, type ParticipantProfile } from '@workspace/ui';
import { ASSESSMENTS, isAvailable, type FormPick, type ResultReport } from '@/assess/registry';
import { DEMO_USER, readHistory, readProfile, Runner, saveProfile, type SessionHooks } from '@/pages/assess-run';

const SESSION_KEY = 'rm.session';
const RESULTS_KEY = 'rm.session.results';
const SHELL_KEY = 'rm.shell';
/** Set once a shell has been completed: returning participants skip already-confirmed setup. */
const SHELL_DONE_KEY = 'rm.shell.completedAt';
/** Recording consent on file (dev: this browser). */
const CONSENT_KEY = 'rm.consent';

interface StoredResult {
  testId: string;
  title: string;
  headline: string;
  needsReview: boolean;
  report: ResultReport;
  /** Validity inputs from the test's record. */
  focusLost: number;
  interruptions: number;
}

function load<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Dev convenience; production persists server-side.
  }
}

/** Tests the app can run now: built, registered and not switched off for permission. */
const AVAILABLE = new Set(Object.values(ASSESSMENTS).filter(isAvailable).map((e) => e.id));

function newSession(): SessionState {
  return startSession(resolveBattery(LEAN_B2C, AVAILABLE), Date.now());
}

/** Every session screen follows the person's theme and text size (the test screens through the rm- token bridge). */
export default function SessionPage() {
  return (
    <ThemeRoot>
      <SessionFlow />
    </ThemeRoot>
  );
}

function SessionFlow() {
  const [profile, setProfile] = useState<ParticipantProfile | null>(() => {
    const p = readProfile();
    return isProfileComplete(p) ? p : null;
  });
  const [state, setState] = useState<SessionState | null>(() => {
    const s = load<SessionState>(SESSION_KEY);
    if (!s) return null;
    // Reloaded mid-test: treat the reload as an interruption that ended now.
    if (s.items.some((i) => i.status === 'running')) {
      const last = s.log.at(-1)?.at ?? Date.now();
      return reduce(reduce(s, { type: 'INTERRUPTED', at: last }), { type: 'RESUMED', at: Date.now() });
    }
    return s;
  });
  const [results, setResults] = useState<StoredResult[]>(() => load<StoredResult[]>(RESULTS_KEY) ?? []);
  const [shell, setShell] = useState<ShellState | null>(() => load<ShellState>(SHELL_KEY));
  const sendShell = useCallback((a: ShellAction) => {
    setShell((sh) => {
      if (!sh) return sh;
      const next = shellReduce(sh, a);
      save(SHELL_KEY, next);
      if (next.consent === 'given') save(CONSENT_KEY, 'given');
      if (next.stage === 'complete' && sh.stage !== 'complete') {
        save(SHELL_DONE_KEY, Date.now());
        // Every completed weekly check-in, for Home's consistency meter.
        save('rm.session.completions', [...(load<number[]>('rm.session.completions') ?? []), Date.now()]);
      }
      return next;
    });
  }, []);
  const [micChecked, setMicChecked] = useState(false);
  const [breather, setBreather] = useState(false);
  const [now, setNow] = useState(Date.now());

  const dispatch = useCallback((e: SessionEvent) => {
    setState((s) => {
      if (!s) return s;
      const next = reduce(s, e);
      save(SESSION_KEY, next);
      return next;
    });
  }, []);

  useEffect(() => save(RESULTS_KEY, results), [results]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Forms for every test, chosen once and collision-checked across the session (CLAUDE.md §8).
  const picks = useMemo(() => {
    const out: Record<string, FormPick> = {};
    for (const i of state?.items ?? []) {
      const entry = ASSESSMENTS[i.testId];
      if (entry) out[i.testId] = entry.pickForm(DEMO_USER, readHistory(i.testId));
    }
    // A delayed recall always uses its immediate partner's form (same session).
    for (const testId of Object.keys(out)) {
      const rule = ruleForDelayed(testId);
      if (rule && out[rule.immediate]) out[testId] = { ...out[testId]!, form: out[rule.immediate]!.form };
    }
    return out;
  }, [state?.batteryId, state?.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!state) return;
    // Delayed recalls share their partner's form by design, so they're left out of the clash check.
    void sessionCollisions(Object.entries(picks).filter(([testId]) => !ruleForDelayed(testId)).map(([testId, p]) => ({ testId, form: p.form }))).then((c) => {
      if (c.length) console.warn('Session lexical collisions', c);
    });
  }, [picks]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = state ? plan(state, now) : null;

  // The battery is done → the shell's self-report.
  useEffect(() => {
    if (shell?.stage === 'battery' && (step?.kind === 'done' || step?.kind === 'visitBreak')) sendShell({ type: 'BATTERY_DONE' });
  }, [shell?.stage, step?.kind, sendShell]);

  // Fillers: record start once, end when the wait is over.
  useEffect(() => {
    if (step?.kind === 'filler' && !state?.filler) dispatch({ type: 'FILLER_STARTED', forTestId: step.forTestId, kind: step.filler, at: Date.now() });
  }, [step?.kind, state?.filler, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) {
    return (
      <ProfileSetup
        initial={readProfile() ?? undefined}
        onSave={(p) => {
          saveProfile(p);
          setProfile(p);
        }}
      />
    );
  }

  if (!state) {
    const preview = resolveBattery(LEAN_B2C, AVAILABLE);
    const minutes = minutesRemaining(startSession(preview, 0), 0);
    const start = () => {
      const st = newSession();
      const sh = startShell({ returning: load<number>(SHELL_DONE_KEY) !== null, consentOnFile: load<string>(CONSENT_KEY) === 'given', now: Date.now() });
      save(SESSION_KEY, st);
      save(SHELL_KEY, sh);
      save(RESULTS_KEY, []);
      setResults([]);
      setState(st);
      setShell(sh);
    };
    // Session intro (redesign rollout 3): no tab bar during a session, just a labeled way back.
    return (
      <main className="mx-auto flex w-full max-w-[40rem] flex-col gap-6 px-4 pb-10 pt-6">
        <TopBar backHref={`${import.meta.env.BASE_URL}dashboard`} backLabel="Back to Home" />
        <section className="flex flex-col items-center gap-4 py-2 text-center" aria-labelledby="session-intro-title">
          <div className="relative">
            <div aria-hidden className="ds-glow ds-glow-breathe" />
            <ListeningOrb state="idle" size={160} />
          </div>
          <p className="ds-label">
            {preview.items.length} activities · about {minutes} minutes
          </p>
          <h1 id="session-intro-title" className="text-[2rem] font-semibold leading-tight">
            Your weekly session
          </h1>
          <p className="text-[1.2rem]">A few short listening and speaking activities, one after another.</p>
        </section>
        <section className="ds-card flex flex-col gap-3" aria-labelledby="before-title">
          <h2 id="before-title" className="ds-title">
            Before you start
          </h2>
          <ul className="flex flex-col gap-3">
            {[
              `Find a quiet spot where you can stay for about ${minutes} minutes.`,
              'Use headphones, or turn your volume up.',
              'You can take a breather between activities.',
              "There's no rush, and nobody gets everything right.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1">
                  <StatusIcon status="steady" />
                </span>
                <span className="min-w-0 break-words [hyphens:auto]">{t}</span>
              </li>
            ))}
          </ul>
        </section>
        <button type="button" className="ds-button ds-button-primary" onClick={start}>
          Start
        </button>
        <a href={`${import.meta.env.BASE_URL}dashboard`} className="ds-button ds-button-secondary">
          Not right now
        </a>
        <p style={{ fontSize: '1rem' }}>A wellness activity, not a medical test.</p>
      </main>
    );
  }

  const home = () => (window.location.href = `${import.meta.env.BASE_URL}dashboard`);
  const restart = () => {
    save(SESSION_KEY, null);
    save(SHELL_KEY, null);
    setState(null);
    setShell(null);
  };

  // ---- P1 Session Shell around the battery ----
  if (shell && shell.stage !== 'battery') {
    const name = profile.firstName;
    switch (shell.stage) {
      case 'identity':
        return <IdentityStage name={name} birthYear={profile.birthYear} returning={shell.returning} send={sendShell} />;
      case 'interruptionPlan':
        return <InterruptionPlanStage send={sendShell} />;
      case 'device':
        return <DeviceStage send={sendShell} />;
      case 'hearingQuestions':
        return <HearingQuestionsStage shell={shell} send={sendShell} />;
      case 'hearingBoost':
        return <HearingBoostStage send={sendShell} />;
      case 'hearingRepeat': {
        const hearing = ASSESSMENTS['hearing-check']!;
        // Dev only (?debug=1): simulate the spoken repetition, e.g. for headless flow tests.
        if (new URLSearchParams(window.location.search).has('debug')) {
          return (
            <AssessmentLayout>
              <Text variant="eyebrow">Hearing check (debug)</Text>
              <Text variant="title">Simulate the repeat-after-me result</Text>
              <Button onClick={() => sendShell({ type: 'HEARING_REPEAT_RESULT', passed: true })}>Simulate: repeated correctly</Button>
              <Button variant="secondary" onClick={() => sendShell({ type: 'HEARING_REPEAT_RESULT', passed: false })}>
                Simulate: not repeated
              </Button>
            </AssessmentLayout>
          );
        }
        return (
          <Runner
            key={`hearing:${shell.hearing.rounds}`}
            entry={hearing}
            session={{
              pick: hearing.pickForm(DEMO_USER, []),
              micChecked,
              onMicChecked: () => setMicChecked(true),
              onStarted: () => {},
              // No transcript (null) can't fail anyone: it passes, flagged as unverified.
              onFinished: ({ score }) => sendShell({ type: 'HEARING_REPEAT_RESULT', passed: score.fields.passed !== 0 }),
            }}
          />
        );
      }
      case 'environment':
        return <EnvironmentStage shell={shell} minutes={minutesRemaining(state, now)} send={sendShell} />;
      case 'consent':
        return <ConsentStage send={sendShell} />;
      case 'rapport':
        return <RapportStage name={name} send={sendShell} />;
      case 'selfReport':
        return <SelfReportStage send={sendShell} />;
      case 'ended':
        return <EndedStage reason={shell.ended!} name={name} onHome={() => { restart(); home(); }} />;
      case 'complete': {
        const validity = validityOf({
          shell,
          sessionInterruptions: state.interruptions.length,
          focusLost: results.reduce((n, r) => n + (r.focusLost ?? 0), 0),
          testInterruptions: results.reduce((n, r) => n + (r.interruptions ?? 0), 0),
          windowOverruns: state.items.filter((i) => i.flags.includes('window_overrun')).length,
        });
        return <SessionResults state={state} results={results} validity={validity} onRestart={restart} />;
      }
    }
  }

  if (step?.kind === 'done' || step?.kind === 'visitBreak') {
    return <SessionResults state={state} results={results} validity={null} onRestart={restart} />;
  }

  if (step?.kind === 'filler') {
    const ready = now >= step.untilAt;
    return <DelayActivity ready={ready} onReady={() => dispatch({ type: 'FILLER_ENDED', at: Date.now() })} />;
  }

  if (step?.kind !== 'test') return null;
  const entry = ASSESSMENTS[step.testId]!;

  if (breather) {
    return <BreakCard next={entry.title} onContinue={() => setBreather(false)} />;
  }

  const hooks: SessionHooks = {
    pick: picks[step.testId]!,
    progress: progress(state),
    micChecked,
    onMicChecked: () => setMicChecked(true),
    onStarted: () => dispatch({ type: 'TEST_STARTED', testId: step.testId, at: Date.now() }),
    onFinished: ({ record, score, report }) => {
      setResults((rs) => [
        ...rs.filter((r) => r.testId !== step.testId),
        {
          testId: step.testId,
          title: entry.title,
          headline: report.headline.map((h) => `${h.value} ${h.caption}`).join(' · '),
          needsReview: score.needsReview,
          report,
          focusLost: record.flags.filter((f) => f.kind === 'focus_lost').length,
          interruptions: record.flags.filter((f) => f.kind === 'interruption').length,
        },
      ]);
      dispatch({ type: 'TEST_ENDED', testId: step.testId, at: Date.now(), outcome: record.status === 'complete' ? 'complete' : 'partial' });
      // Offer a breather between tests (not within them).
      setBreather(true);
    },
  };
  // Remount per test (and per restart) so each gets a fresh administration.
  const attempt = state.items.find((i) => i.testId === step.testId)!.flags.length;
  return <Runner key={`${step.testId}:${attempt}`} entry={entry} session={hooks} />;
}

function SessionResults({ state, results, validity, onRestart }: { state: SessionState; results: StoredResult[]; validity: ValidityRating | null; onRestart: () => void }) {
  // The thank-you and the results share one page: the old interstitial's "Back to home" button actually opened the results.
  const flagged = state.items.filter((i) => i.flags.length);
  const done = (load<number[]>('rm.session.completions') ?? []).filter((t) => Date.now() - t < 5 * 7 * 24 * 60 * 60 * 1000).length;
  const home = `${import.meta.env.BASE_URL}dashboard`;
  // Session completion (redesign rollout 3). Results only now, after every activity (CLAUDE.md §9, DEVIATIONS P-11).
  return (
    <main className="mx-auto flex w-full max-w-[40rem] flex-col gap-6 px-4 pb-10 pt-6">
      <TopBar backHref={home} backLabel="Back to Home" />
      <section className="flex flex-col items-center gap-3 py-2 text-center" aria-labelledby="done-title">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <div aria-hidden className="ds-glow" />
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full" style={{ border: '8px solid var(--ring-arc)' }}>
            <StatusIcon status="steady" size={44} />
          </span>
        </div>
        <h1 id="done-title" className="text-[2rem] font-semibold leading-tight">
          That's everything for this week.
        </h1>
        <p className="text-[1.2rem]">Thank you for your time and focus.</p>
      </section>
      <StreakMeter done={Math.min(5, Math.max(1, done))} of={5} />
      <section className="ds-card flex flex-col gap-4" aria-labelledby="results-title">
        <h2 id="results-title" className="ds-title">
          Your results
        </h2>
        <ol className="flex flex-col">
          {state.items.map((i) => {
            const r = results.find((x) => x.testId === i.testId);
            return (
              <li key={i.testId} className="flex flex-col gap-1 border-t py-4 first:border-t-0 first:pt-0 last:pb-0" style={{ borderColor: 'var(--elevated)' }}>
                <h3 className="font-semibold">{r?.title ?? titleOf(i.testId)}</h3>
                <p>{r?.headline ?? 'Not finished'}</p>
                {i.delayMinutes !== null && (
                  <p className="ds-secondary" style={{ fontSize: '1rem' }}>
                    Given {i.delayMinutes === 99 ? 'after an unknown delay' : `${i.delayMinutes} minutes after the first part`}
                  </p>
                )}
                {r && (
                  <details className="mt-2">
                    <summary className="ds-tap flex cursor-pointer items-center font-semibold" style={{ color: 'var(--accent-text)' }}>
                      How it was scored
                    </summary>
                    <dl className="mt-2 flex flex-col gap-3">
                      {r.report.sections.map((sec) => (
                        <div key={sec.label}>
                          <dt className="font-semibold">
                            {sec.label}: {sec.value}
                          </dt>
                          <dd>{sec.why}</dd>
                        </div>
                      ))}
                    </dl>
                    {r.report.notes.map((n) => (
                      <p key={n} className="mt-2">
                        {n}
                      </p>
                    ))}
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      </section>
      {flagged.length > 0 && <p>Noted for review: {flagged.map((i) => `${titleOf(i.testId)} (${i.flags.join(', ').replace(/_/g, ' ')})`).join('; ')}.</p>}
      {validity && (
        // Session quality (CLAUDE.md §12): for review and research, shown here only in this preview.
        <details className="ds-card">
          <summary className="ds-tap flex cursor-pointer items-center font-semibold">Session quality (for review)</summary>
          <p className="mt-2">
            {validity.rating === 1 ? 'Very valid' : validity.rating === 2 ? 'Questionably valid' : 'Invalid'}
            {validity.categories.length ? `: ${validity.categories.map((c) => VALIDITY_CATEGORIES[c]).join(', ')}` : ''}.
            {validity.reasons.length ? ` (${validity.reasons.join('; ')})` : ''}
          </p>
        </details>
      )}
      <a href={home} className="ds-button ds-button-primary">
        Back to Home
      </a>
      <button type="button" className="ds-button ds-button-secondary" onClick={onRestart}>
        Start a new session
      </button>
      <p style={{ fontSize: '1rem' }}>A wellness activity, not a medical test.</p>
    </main>
  );
}

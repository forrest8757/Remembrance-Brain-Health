// Generic runner for any registered assessment (src/assess/registry.ts):
// welcome → mic check → administration (engine + web channel) → complete.
// Spec → engine → pre-rendered clips on the Web Audio clock → mic capture +
// VAD → ASR → live judges → scoring.
//
// Try-out preview: after the test, a 15 s "scoring" screen, then the score.
// (A real session keeps scores out of SessionComplete, CLAUDE.md §9; see
// DEVIATIONS.md P-9.) ?debug=1 adds transcripts and the raw record.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'wouter';
import { loadClipLibrary, type ClipLibrary } from '@workspace/audio';
import { detectMicSupport, openMicSession, type MicSession } from '@workspace/capture';
import { RelayAsrProvider } from '@workspace/asr';
import { compareWithNorms, type NormComparison } from '@workspace/api-client-react';
import { toReviewQueueEntry, type ScoreResult } from '@workspace/scoring';
import { useAdministration, createWebChannel, type WebChannel } from '@workspace/engine/react';
import type { AdministrationRecord } from '@workspace/engine';
import {
  AssessmentLayout,
  Button,
  InterruptionSheet,
  ListeningOrb,
  MicCheck,
  ProfileSetup,
  ProgressRail,
  ThemeRoot,
  isProfileComplete,
  ProtocolScreen,
  Text,
  type MicCheckStatus,
  type ParticipantProfile,
} from '@workspace/ui';
import NotFound from '@/pages/not-found';
import { DEMO_USER, pushHistory, readHistory, setLatestFields } from '@/assess/history';
import { ASSESSMENTS, clipIdsFor, isAvailable, type AssessmentEntry, type FormPick, type ResultReport } from '@/assess/registry';

export { DEMO_USER, readHistory } from '@/assess/history';

// Demo only: kept in this browser. Production stores the profile server-side as PHI.
const PROFILE_KEY = 'rm.profile';

/** The saved profile, possibly from before birth year and sex were asked (then the form is shown again, prefilled). */
export function readProfile(): Partial<ParticipantProfile> | null {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function saveProfile(profile: ParticipantProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Still usable for this session.
  }
}

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Dev preview only: the last result per test, shown on the dashboard's temporary "Try every test" list. */
export interface LastResult {
  /** e.g. "8 of 14 · 6 of 14" */
  summary: string;
  at: string;
  needsReview: boolean;
  reviewReasons: string[];
}
export const lastResultKey = (testId: string) => `rm.${testId}.lastResult`;

function saveLastResult(testId: string, result: LastResult) {
  try {
    localStorage.setItem(lastResultKey(testId), JSON.stringify(result));
  } catch {
    // Preview convenience only.
  }
}

type Phase = 'profile' | 'welcome' | 'loading' | 'mic' | 'running' | 'scoring' | 'complete' | 'stopped';

/** How long the "scoring your answers" screen shows before the result. */
const SCORING_MS = 15_000;

interface Rig {
  context: AudioContext;
  clips: ClipLibrary;
  mic: MicSession;
  channel: WebChannel;
}

/** Mic check: "good" once the participant has spoken clearly for a moment. */
function useMicStatus(mic: MicSession | null): MicCheckStatus {
  const [status, setStatus] = useState<MicCheckStatus>('requesting');
  useEffect(() => {
    if (!mic) return;
    let voicedFrames = 0;
    let faintFrames = 0;
    let raf = 0;
    const tick = () => {
      const a = mic.amplitude();
      if (a > 0.2) voicedFrames++;
      else if (a > 0.05) faintFrames++;
      setStatus((prev) => (prev === 'good' ? prev : voicedFrames > 20 ? 'good' : faintFrames > 60 ? 'tooQuiet' : 'listening'));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mic]);
  return mic ? status : 'requesting';
}

export default function AssessRun() {
  return (
    <ThemeRoot>
      <AssessRunInner />
    </ThemeRoot>
  );
}

function AssessRunInner() {
  const params = useParams<{ testId: string }>();
  // /assess/toy predates the registry; keep the old link working.
  const entry = ASSESSMENTS[params.testId === 'toy' ? 'toy-colors' : params.testId];
  if (!entry) return <NotFound />;
  if (!isAvailable(entry)) {
    return (
      <AssessmentLayout>
        <Text variant="eyebrow">Not available</Text>
        <Text variant="title">{entry.title} is switched off.</Text>
        <Text variant="lead">It uses content that needs a license or the author's permission, so it stays off until that's in place.</Text>
        <Button onClick={() => (window.location.href = `${import.meta.env.BASE_URL}dashboard`)}>Back to home</Button>
      </AssessmentLayout>
    );
  }
  return <Runner key={entry.id} entry={entry} />;
}

/** When a Runner is one test of a battery session (P2), the session drives it. */
export interface SessionHooks {
  /** The form the session chose (and collision-checked) for this test. */
  pick: FormPick;
  /** Test N of M; omitted for setup steps (the hearing check). */
  progress?: { current: number; total: number };
  /** The mic was already checked earlier in this session. */
  micChecked: boolean;
  onMicChecked: () => void;
  onStarted: () => void;
  /** No per-test scores between tests (CLAUDE.md §9): the session collects them for the end. */
  onFinished: (result: { record: AdministrationRecord; score: ScoreResult; report: ResultReport }) => void;
}

export function Runner({ entry, session }: { entry: AssessmentEntry; session?: SessionHooks }) {
  const debug = useMemo(() => new URLSearchParams(window.location.search).has('debug'), []);
  const ownPick = useMemo(() => entry.pickForm(DEMO_USER, readHistory(entry.id)), [entry]);
  const pick = session?.pick ?? ownPick;
  const [profile, setProfile] = useState<ParticipantProfile | null>(() => {
    const p = readProfile();
    return isProfileComplete(p) ? p : null;
  });
  // Every test needs the profile now: age and sex for comparisons, plus D8/D10 for MoCA.
  const [phase, setPhase] = useState<Phase>(() => (session || isProfileComplete(readProfile()) ? 'welcome' : 'profile'));
  const [rig, setRig] = useState<Rig | null>(null);
  const [error, setError] = useState<MicCheckStatus | 'clips' | null>(null);
  const [pulse, setPulse] = useState(0);
  const rigRef = useRef<Rig | null>(null);
  const micStatus = useMicStatus(phase === 'mic' ? (rig?.mic ?? null) : null);

  // Everything audio starts on the participant's tap (autoplay policy).
  const begin = useCallback(async () => {
    if (detectMicSupport() !== 'supported') {
      setError('unsupported');
      setPhase('mic');
      return;
    }
    setPhase('loading');
    const context = new AudioContext();
    try {
      const clips = await loadClipLibrary(`${import.meta.env.BASE_URL}clips`, context);
      // Test-specific data (e.g. the T7 dictionary) loads alongside the clips.
      await Promise.all([clips.preload(clipIdsFor(entry.spec, pick.form)), entry.prepare?.()]);
      const channel = createWebChannel({
        clips,
        // Our API relays audio to the ASR vendor; the key stays on the server.
        // Without a key (or server) every answer falls back to review.
        asr: new RelayAsrProvider({
          url: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${import.meta.env.BASE_URL}api/asr/stream`,
        }),
        // Dev only: keep audio in memory. Production uploads to a HIPAA bucket.
        storeAudio: async (_key, rec) => URL.createObjectURL(rec.blob),
        onStimulusOnset: () => setPulse((p) => p + 1),
      });
      const mic = await openMicSession({ context, onPcm: channel.onPcm, onVad: channel.onVad });
      channel.attachMic(mic);
      const next = { context, clips, mic, channel };
      rigRef.current = next;
      setRig(next);
      // In a session the mic is checked once, before the first test.
      setPhase(session?.micChecked ? 'running' : 'mic');
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      setError(denied ? 'denied' : 'clips');
      setPhase('mic');
      void context.close();
    }
  }, [entry, pick.form, session?.micChecked]);

  const started = useRef(false);
  useEffect(() => {
    if (phase === 'running' && !started.current) {
      started.current = true;
      session?.onStarted();
    }
  }, [phase, session]);

  useEffect(
    () => () => {
      const r = rigRef.current;
      if (r) void r.mic.dispose().then(() => r.context.close());
    },
    [],
  );

  // Some judges need the form itself (story recall).
  const judges = useMemo(() => entry.judgesFor?.(pick.form) ?? entry.judges, [entry, pick.form]);
  const { view, record: liveRecord, send } = useAdministration({
    spec: entry.spec,
    form: pick.form,
    judges: judges,
    timeZone: TIME_ZONE,
    // Only while running: reattaching a channel later would start a fresh administration.
    channel: phase === 'running' ? (rig?.channel ?? null) : null,
    now: rig ? () => rig.context.currentTime * 1000 : undefined,
  });

  // The finished record is kept here, so nothing after the test can replace it.
  const [record, setRecord] = useState<AdministrationRecord | null>(null);
  const result = useMemo(() => {
    if (!record) return null;
    const score = entry.score(record, pick.form, profile);
    return { report: entry.report(score, record, pick.form), score };
  }, [record, entry, pick.form, profile]);

  useEffect(() => {
    if (!liveRecord || phase !== 'running') return;
    setRecord(liveRecord);
    pushHistory(entry.id, { formId: pick.form.formId, at: Date.now() });
    setPhase(session ? 'complete' : 'scoring');
  }, [liveRecord, phase, entry.id, pick.form.formId, session]);

  // In a session: hand the result to the session and move on (no score screen).
  const reported = useRef(false);
  useEffect(() => {
    if (!session || !result || !record || reported.current) return;
    reported.current = true;
    session.onFinished({ record, score: result.score, report: result.report });
  }, [session, result, record]);

  // Comparison with others the same age and sex, fetched during the scoring screen.
  const [comparison, setComparison] = useState<ComparisonState>({ kind: 'loading' });
  const compared = useRef(false);
  useEffect(() => {
    if (!result || !record || !profile || compared.current) return;
    compared.current = true;
    compareWithNorms({
      participantId: DEMO_USER,
      testId: entry.id,
      formId: pick.form.formId,
      specVersion: entry.spec.specVersion,
      scorerVersion: result.score.scorerVersion,
      equated: result.score.equated,
      channel: 'web',
      administrationNumber: pick.administrationNumber,
      completed: record.status === 'complete',
      birthYear: profile.birthYear,
      sex: profile.sex,
      educationYears: profile.educationYears,
      fields: result.score.fields,
    })
      .then((data) => setComparison({ kind: 'ok', data }))
      .catch(() => setComparison({ kind: 'unavailable' }));
  }, [result, record, profile, entry, pick]);

  useEffect(() => {
    if (!result) return;
    setLatestFields(entry.id, result.score.fields);
    saveLastResult(entry.id, {
      summary: result.report.headline.map((h) => h.value).join(' · '),
      at: new Date().toISOString(),
      needsReview: result.score.needsReview,
      reviewReasons: result.score.reviewReasons,
    });
  }, [result, entry.id]);

  useEffect(() => {
    if (phase !== 'scoring' || !record) return;
    const t = setTimeout(() => setPhase(record.status === 'complete' ? 'complete' : 'stopped'), SCORING_MS);
    return () => clearTimeout(t);
  }, [phase, record]);

  if (phase === 'profile') {
    return (
      <ProfileSetup
        initial={profile ?? readProfile() ?? undefined}
        onSave={(p) => {
          saveProfile(p);
          setProfile(p);
          setPhase('welcome');
        }}
      />
    );
  }

  if ((phase === 'welcome' || phase === 'loading') && session) {
    // "Next up" card: a gentle preview only (P2: never reveal a coming delayed recall).
    return (
      <AssessmentLayout aside={<ListeningOrb state="idle" size={180} />} rail={session.progress ? <ProgressRail current={session.progress.current} total={session.progress.total} /> : undefined}>
        <Text variant="eyebrow">Next up · about {entry.minutes} minute{entry.minutes === 1 ? '' : 's'}</Text>
        <Text variant="title">{entry.title}</Text>
        <Text variant="lead">{entry.blurb}</Text>
        <Button onClick={begin} disabled={phase === 'loading'}>
          {phase === 'loading' ? 'Getting ready…' : 'Begin'}
        </Button>
      </AssessmentLayout>
    );
  }

  if (phase === 'welcome' || phase === 'loading') {
    return (
      <AssessmentLayout aside={<ListeningOrb state="idle" size={180} />}>
        <Text variant="eyebrow">About {entry.minutes} minute{entry.minutes === 1 ? '' : 's'}</Text>
        <Text variant="title">{entry.title}</Text>
        <Text variant="lead">{entry.blurb} Use headphones or turn your volume up.</Text>
        <Button onClick={begin} disabled={phase === 'loading'}>
          {phase === 'loading' ? 'Getting ready…' : "I'm ready to begin"}
        </Button>
        <p className="text-rm-eyebrow text-rm-ink-soft">Wellness activity preview. Not a medical test.</p>
      </AssessmentLayout>
    );
  }

  if (phase === 'mic') {
    if (error === 'clips') {
      return (
        <AssessmentLayout>
          <Text variant="title">We couldn't load the audio.</Text>
          <Text variant="lead">Please check your connection and try again.</Text>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </AssessmentLayout>
      );
    }
    return (
      <MicCheck
        step="Setup"
        status={error ?? micStatus}
        getAmplitude={rig?.mic.amplitude}
        onContinue={() => {
          session?.onMicChecked();
          setPhase('running');
        }}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (phase === 'scoring') {
    return (
      <AssessmentLayout aside={<ListeningOrb state="thinking" size={180} />}>
        <Text variant="eyebrow">All done</Text>
        <Text variant="title">Scoring your answers…</Text>
        <Text variant="lead">This takes about 15 seconds. Thank you for your time and focus.</Text>
        <div role="progressbar" aria-label="Scoring" className="h-3 w-full overflow-hidden rounded-full bg-rm-cream-deep">
          <div className="h-full w-0 rounded-full bg-rm-navy motion-safe:animate-[rm-fill_15s_linear_forwards] motion-reduce:w-full" />
        </div>
        <style>{'@keyframes rm-fill { from { width: 0 } to { width: 100% } }'}</style>
      </AssessmentLayout>
    );
  }

  if (session && (phase === 'complete' || phase === 'stopped')) {
    return (
      <AssessmentLayout aside={<ListeningOrb state="thinking" size={180} />}>
        <Text variant="eyebrow">One moment</Text>
        <Text variant="title">Thank you.</Text>
      </AssessmentLayout>
    );
  }

  if ((phase === 'complete' || phase === 'stopped') && result) {
    return (
      <>
        <ResultScreen title={entry.title} report={result.report} comparison={comparison} firstTime={pick.administrationNumber === 1} onDone={() => (window.location.href = `${import.meta.env.BASE_URL}dashboard`)} />
        {debug && record && <DebugPanel entry={entry} record={record} pick={pick} profile={profile} />}
      </>
    );
  }

  if (!view) return null;
  return (
    <>
      <ProtocolScreen
        view={view}
        progress={session?.progress ?? { current: 1, total: 1 }}
        getAmplitude={rig?.mic.amplitude}
        pulse={pulse}
        onDone={() => send({ type: 'PARTICIPANT_DONE' })}
        onRepeat={() => send({ type: 'REPEAT_REQUESTED' })}
        onPause={() => send({ type: 'PAUSE', reason: 'participant' })}
        onContinue={() => send({ type: 'CONTINUE' })}
        // Timestamped by the engine on the audio clock, the same clock as the letter onsets.
        onTap={() => send({ type: 'TAP' })}
      />
      <InterruptionSheet
        open={view.phase === 'paused'}
        onResume={() => send({ type: 'RESUME' })}
        // Participant chose to stop: 97 "other problem" until P1 defines the exit flow (DEVIATIONS P-7).
        onStop={() => send({ type: 'ABORT', reasonCode: 97 })}
      />
    </>
  );
}

function DebugPanel({ entry, record, pick, profile }: { entry: AssessmentEntry; record: AdministrationRecord; pick: FormPick; profile: ParticipantProfile | null }) {
  const score = entry.score(record, pick.form, profile);

  const review = toReviewQueueEntry('dev', score);
  const onsetGaps = record.stimulusEvents
    .map((e, i, all) => (i > 0 && all[i - 1]!.itemIndex === e.itemIndex && all[i - 1]!.stepKey === e.stepKey ? Math.round(e.actualOnsetMs - all[i - 1]!.actualOnsetMs) : null))
    .filter((g): g is number => g !== null);
  return (
    <section className="mx-auto w-full max-w-[1080px] px-4 pt-6 font-rm text-rm-ink md:px-10">
      <div className="rounded-rm-lg border-2 border-dashed border-rm-cyan bg-rm-surface p-6 md:p-8">
        <p className="text-rm-eyebrow font-semibold uppercase tracking-[0.08em] text-rm-ink-soft">Results preview · dev only · participants never see this</p>
        <h2 className="mt-2 text-rm-title font-bold">NACC fields</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-2 md:grid-cols-2">
          {Object.entries(score.fields).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-rm-cream-deep py-2 text-rm-body">
              <dt>{k}</dt>
              <dd className="font-semibold">{v === null ? 'needs review' : v}</dd>
            </div>
          ))}
        </dl>
        {score.needsReview && (
          <p className="mt-4 text-rm-body text-rm-ink-soft">
            Sent to review: {score.reviewReasons.join(', ')}
            {review?.lowConfidenceItems.length ? ` (items: ${review.lowConfidenceItems.join(', ')})` : ''}
          </p>
        )}
        <details className="mt-6">
          <summary className="cursor-pointer text-rm-label font-semibold">What the speech recognizer heard</summary>
          <ul className="mt-3 space-y-1 font-mono text-sm">
            {record.responseWindows.map((w) => (
              <li key={w.windowKey}>
                <span className="text-rm-ink-soft">{w.windowKey}:</span>{' '}
                {w.asrUnavailable ? '(no transcript)' : w.asrTokens.map((t) => t.token).join(' ') || '(silence)'}
                {record.trialResults.filter((r) => r.windowKey === w.windowKey).map((r) => ` → ${r.correct === null ? 'unknown' : r.correct ? 'correct' : 'incorrect'}`)}
              </li>
            ))}
          </ul>
        </details>
        <details className="mt-4">
          <summary className="cursor-pointer text-rm-label font-semibold">Raw record</summary>
          <pre className="mt-3 overflow-auto rounded-rm-md bg-rm-cream p-4 text-xs">
            {JSON.stringify(
              {
                testId: entry.id,
                formId: pick.form.formId,
                seed: pick.seed,
                administrationNumber: pick.administrationNumber,
                status: record.status,
                reasonCode: record.reasonCode,
                onsetGapsMs: onsetGaps,
                windows: record.responseWindows.map((w) => ({ key: w.windowKey, closeReason: w.closeReason, ms: w.closedAt && Math.round(w.closedAt - w.openedAt) })),
                discontinued: record.discontinued,
                taps: record.taps.length,
                notAdministered: record.notAdministered,
                prompts: record.promptEvents,
                flags: record.flags,
                fields: score.fields,
              },
              null,
              2,
            )}
          </pre>
        </details>
      </div>
    </section>
  );
}

type ComparisonState = { kind: 'loading' } | { kind: 'unavailable' } | { kind: 'ok'; data: NormComparison };

/** Try-out preview result (DEVIATIONS.md P-9): the official scores and why, then how they compare. */
function ResultScreen({
  title,
  report,
  comparison,
  firstTime,
  onDone,
}: {
  title: string;
  report: ResultReport;
  comparison: ComparisonState;
  firstTime: boolean;
  onDone: () => void;
}) {
  return (
    <main className="min-h-dvh bg-rm-cream font-rm text-rm-ink">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8 px-4 py-10 md:px-10 md:py-16">
        <header className="flex flex-col gap-4">
          <Text variant="eyebrow">{title} · your results</Text>
          <div className="flex flex-wrap gap-x-12 gap-y-4">
            {report.headline.map((h) => (
              <p key={h.caption} className="flex flex-col">
                <span className="text-[44px] font-bold leading-tight tracking-tight md:text-[56px]">{h.value}</span>
                <span className="text-rm-body text-rm-ink-soft">{h.caption}</span>
              </p>
            ))}
          </div>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-rm-lead font-bold">How it was scored</h2>
          <ol className="flex flex-col gap-4">
            {report.sections.map((s) => (
              <li key={s.label} className="rounded-rm-lg bg-rm-surface p-5 md:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-rm-body font-bold">{s.label}</h3>
                  <span className="text-rm-body font-semibold">{s.value}</span>
                </div>
                <p className="mt-2 text-rm-body leading-relaxed text-rm-ink-soft">{s.why}</p>
              </li>
            ))}
          </ol>
          {report.notes.map((n) => (
            <Text key={n} variant="body">{n}</Text>
          ))}
        </section>

        <ComparisonSection comparison={comparison} firstTime={firstTime} />

        <Button onClick={onDone}>Back to home</Button>
        <p className="text-rm-eyebrow text-rm-ink-soft">Wellness activity preview. Not a medical test.</p>
      </div>
    </main>
  );
}

function ComparisonSection({ comparison, firstTime }: { comparison: ComparisonState; firstTime: boolean }) {
  const body = (() => {
    if (comparison.kind === 'loading') return <Text variant="body">Looking up people like you…</Text>;
    if (comparison.kind === 'unavailable')
      return <Text variant="body" className="text-rm-ink-soft">Comparisons aren't switched on yet. Your results are saved on this device.</Text>;
    const { cohort, minCohort, results, stored } = comparison.data;
    if (results.length === 0)
      return <Text variant="body" className="text-rm-ink-soft">There's no finished score to compare this time.</Text>;
    const ready = results.filter((r) => r.percentile !== null);
    return (
      <>
        {ready.length === 0 ? (
          <Text variant="body">
            We compare you with {cohort}. So far {results[0]!.n === 0 ? 'no one else' : `${results[0]!.n} ${results[0]!.n === 1 ? 'person' : 'people'}`} in that group
            {results[0]!.n === 1 ? ' has' : ' have'} finished this activity. We'll show a comparison once {minCohort} have.
          </Text>
        ) : (
          <ul className="flex flex-col gap-3">
            {ready.map((r) => (
              <li key={r.field} className="rounded-rm-lg bg-rm-surface p-5">
                <p className="text-rm-body font-bold">{r.label}</p>
                <p className="mt-1 text-rm-body text-rm-ink-soft">
                  You did better than about {r.percentile}% of {cohort} who have done this (typical result {r.median}; {r.n} people).
                </p>
              </li>
            ))}
          </ul>
        )}
        {stored && <Text variant="body" className="text-rm-ink-soft">Your score now helps build the comparison for others your age, without your name or any contact details.</Text>}
        {!firstTime && (
          <Text variant="body" className="text-rm-ink-soft">
            Comparisons use each person's first time. People often score a little higher on later tries, just from knowing how the activity works.
          </Text>
        )}
      </>
    );
  })();
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-rm-lead font-bold">Compared with people like you</h2>
      {body}
    </section>
  );
}

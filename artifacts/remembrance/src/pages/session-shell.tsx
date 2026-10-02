// P1 Session Shell screens (build doc §P1), all chrome zone and all
// Remembrance-original wording (CLAUDE.md §8). The flow lives in
// @workspace/battery shell.ts; these components only render a stage.
import { useEffect, useRef, useState } from 'react';
import { loadClipLibrary, type ClipLibrary } from '@workspace/audio';
import { clipIdFor, hearingCheckSpec } from '@workspace/test-spec';
import {
  ENVIRONMENT_KEYS,
  nextHearingQuestion,
  type EnvironmentKey,
  type SelfReport,
  type ShellAction,
  type ShellState,
} from '@workspace/battery';
import { AssessmentLayout, Button, ConsentCard, HearingCheck, ListeningOrb, Stack, Text } from '@workspace/ui';

/** The integrity statement shown before the tests (logged by version; build doc ⟦DECISION⟧: softer B2C wording). */
export const INTEGRITY_VERSION = 'soft-v1';

// ---- Examiner voice for the shell's spoken questions --------------------------------

let shared: Promise<ClipLibrary> | null = null;
/** One clip library for the shell, created on the first tap (autoplay policy). */
export function unlockShellAudio(): Promise<ClipLibrary> {
  shared ??= loadClipLibrary(`${import.meta.env.BASE_URL}clips`, new AudioContext());
  return shared;
}

function useSpeak(lineKey: string | null) {
  useEffect(() => {
    if (!lineKey || !shared) return;
    let stop: (() => void) | undefined;
    // The question is always on screen too, so a missing clip or blocked audio just stays silent.
    shared
      .then(async (lib) => {
        const id = clipIdFor(hearingCheckSpec, lineKey);
        if (!lib.has(id)) return;
        await lib.preload([id]);
        await lib.context.resume();
        stop = lib.play(id).stop;
      })
      .catch(() => {});
    return () => stop?.();
  }, [lineKey]);
}

// ---- Stages ----------------------------------------------------------------------------

type Send = (a: ShellAction) => void;

function Card({ eyebrow, title, children, aside }: { eyebrow: string; title: string; children?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <AssessmentLayout aside={aside ?? <ListeningOrb state="idle" size={180} />}>
      <Text variant="eyebrow">{eyebrow}</Text>
      <Text variant="title">{title}</Text>
      {children}
    </AssessmentLayout>
  );
}

export function IdentityStage({ name, birthYear, returning, send }: { name: string; birthYear: number; returning: boolean; send: Send }) {
  return (
    <Card eyebrow={returning ? 'Welcome back' : 'Welcome'} title={`Hello, ${name}.`}>
      <Text variant="lead">
        Before we start, please confirm this is you: {name}, born in {birthYear}.
      </Text>
      <Stack gap={4} direction="responsive">
        <Button
          onClick={() => {
            void unlockShellAudio();
            send({ type: 'IDENTITY', confirmed: true });
          }}
        >
          Yes, that's me
        </Button>
        <Button variant="secondary" onClick={() => send({ type: 'IDENTITY', confirmed: false })}>
          No
        </Button>
      </Stack>
    </Card>
  );
}

export function InterruptionPlanStage({ send }: { send: Send }) {
  return (
    <Card eyebrow="Before we begin" title="If something comes up, that's okay.">
      <Text variant="lead">If anything interrupts us, we'll save your place, and you can pick up where you left off.</Text>
      <Button onClick={() => send({ type: 'CONTINUE' })}>Good to know</Button>
    </Card>
  );
}

export function DeviceStage({ send }: { send: Send }) {
  return (
    <Card eyebrow="Getting set up" title="Let's get you comfortable.">
      <ul className="flex max-w-[60ch] list-disc flex-col gap-2 pl-6 text-rm-body text-rm-ink-soft">
        <li>Sit somewhere comfortable, with the device facing you about an arm's length away.</li>
        <li>Use the speaker at a comfortable volume, or earbuds or headphones if you have them.</li>
        <li>In a moment we'll check that we can hear you, too.</li>
      </ul>
      <Button onClick={() => send({ type: 'CONTINUE' })}>I'm set up</Button>
    </Card>
  );
}

const HEARING_QUESTIONS = {
  troubleUsually: { line: 'qTrouble', text: 'Do you often have trouble hearing on a phone or computer?' },
  hearsWell: { line: 'qHearsWell', text: 'Can you hear me clearly right now?' },
  usesDevice: { line: 'qDevice', text: 'Do you use a hearing aid?' },
  deviceInPlace: { line: 'qDeviceIn', text: 'Is it in and switched on?' },
} as const;

export function HearingQuestionsStage({ shell, send }: { shell: ShellState; send: Send }) {
  const q = nextHearingQuestion(shell);
  const [pausedFor, setPausedFor] = useState<'volume' | 'device' | null>(null);
  useSpeak(q && !pausedFor ? HEARING_QUESTIONS[q].line : null);
  if (pausedFor === 'volume') {
    return (
      <Card eyebrow="Hearing" title="Let's turn it up.">
        <Text variant="lead">Use your device's volume buttons to make my voice louder, or put on earbuds or headphones.</Text>
        <Button onClick={() => setPausedFor(null)}>Done</Button>
      </Card>
    );
  }
  if (pausedFor === 'device') {
    return (
      <Card eyebrow="Hearing" title="Please put your hearing aid in.">
        <Text variant="lead">Take your time. Tap the button when it's in and switched on.</Text>
        <Button onClick={() => send({ type: 'HEARING_ANSWER', question: 'deviceInPlace', yes: false })}>It's in now</Button>
      </Card>
    );
  }
  if (!q) return null;
  return (
    <HearingCheck
      step="Hearing"
      question={HEARING_QUESTIONS[q].text}
      onAnswer={(yes) => {
        if (q === 'hearsWell' && !yes) setPausedFor('volume');
        if (q === 'deviceInPlace' && !yes) return setPausedFor('device');
        send({ type: 'HEARING_ANSWER', question: q, yes });
      }}
    />
  );
}

export function HearingBoostStage({ send }: { send: Send }) {
  return (
    <Card eyebrow="Hearing" title="Let's make it easier to hear.">
      <Text variant="lead">Turn your volume up, and use earbuds or headphones if you have them. Then we'll try the sentence once more.</Text>
      <Button onClick={() => send({ type: 'CONTINUE' })}>Try again</Button>
    </Card>
  );
}

const ENVIRONMENT: Record<EnvironmentKey, { short: string; question: string; issueOn: boolean; fix: string; fixDone: string }> = {
  quiet: { short: 'A quiet spot', question: 'Are you somewhere quiet where no one will disturb you for about {m} minutes?', issueOn: false, fix: 'Please find a quiet spot where you can stay for about {m} minutes.', fixDone: "I'm somewhere quiet now" },
  pets: { short: 'Pets settled', question: 'Do any pets need looking after before we start?', issueOn: true, fix: "Take your time. Tap when you're back.", fixDone: "I'm back" },
  devices: { short: 'Screens and sounds off', question: 'Apart from this device, is a phone, TV, radio or computer on near you?', issueOn: true, fix: "Could you switch them off so they don't distract you?", fixDone: "They're off" },
  people: { short: 'Just you in the room', question: 'Is anyone else in the room with you?', issueOn: true, fix: 'Please ask them to step into another room, so nothing distracts you.', fixDone: "They've left" },
  break: { short: 'Comfortable', question: 'Do you need a bathroom break or a glass of water first?', issueOn: true, fix: "Take your time. Tap when you're ready.", fixDone: "I'm ready" },
  paper: { short: 'No pen or paper', question: 'These activities happen in your head. Do you have paper, pens or pencils in front of you?', issueOn: true, fix: "Please put them away, since we'll only be talking.", fixDone: "They're put away" },
  dates: { short: 'No calendars in view', question: 'Can you see a calendar, a newspaper, or a watch that shows the date?', issueOn: true, fix: 'Please move it out of sight for now.', fixDone: "It's out of sight" },
};

export function EnvironmentStage({ shell, minutes, send }: { shell: ShellState; minutes: number; send: Send }) {
  const current = ENVIRONMENT_KEYS.find((k) => !shell.environment[k] || (shell.environment[k]!.issue && !shell.environment[k]!.resolved));
  const [caregiver, setCaregiver] = useState(false);
  const fill = (t: string) => t.replace('{m}', String(minutes));
  const aside = (
    <ul className="flex w-full flex-col gap-3" aria-label="Your space">
      {ENVIRONMENT_KEYS.map((k) => {
        const a = shell.environment[k];
        const done = !!a && (!a.issue || a.resolved);
        return (
          <li key={k} className="flex min-h-14 items-center gap-4 rounded-rm-md bg-rm-cream px-5">
            <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${done ? 'border-rm-navy bg-rm-navy text-white' : 'border-rm-line'}`}>
              {done ? '✓' : ''}
            </span>
            <span className="min-w-0 break-words text-rm-body">
              {ENVIRONMENT[k].short}
              <span className="sr-only">{done ? ' (done)' : ' (not yet)'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
  if (!current) return null;
  const e = ENVIRONMENT[current];
  const answer = shell.environment[current];

  if (caregiver) {
    return (
      <Card eyebrow="Thank you for helping" title={`Please leave the room now.`} aside={aside}>
        <Text variant="lead">The activities need to be done alone, so nothing gives away an answer. You're welcome to come back when they're finished.</Text>
        <Button
          onClick={() => {
            setCaregiver(false);
            send({ type: 'CAREGIVER_LEFT' });
          }}
        >
          They've left the room
        </Button>
      </Card>
    );
  }
  if (answer?.issue && !answer.resolved) {
    return (
      <Card eyebrow="Getting your space ready" title={fill(e.fix)} aside={aside}>
        <Stack gap={4} direction="responsive">
          <Button onClick={() => send({ type: 'ENVIRONMENT', key: current, answer: { issue: true, resolved: true } })}>{e.fixDone}</Button>
          {current === 'people' && (
            <Button variant="secondary" onClick={() => setCaregiver(true)}>
              They're helping me set up
            </Button>
          )}
        </Stack>
      </Card>
    );
  }
  return (
    <Card eyebrow="Getting your space ready" title={fill(e.question)} aside={aside}>
      <Stack gap={4} direction="responsive">
        <Button onClick={() => send({ type: 'ENVIRONMENT', key: current, answer: { issue: e.issueOn, resolved: !e.issueOn } })}>Yes</Button>
        <Button variant="secondary" onClick={() => send({ type: 'ENVIRONMENT', key: current, answer: { issue: !e.issueOn, resolved: e.issueOn } })}>
          No
        </Button>
      </Stack>
    </Card>
  );
}

export function ConsentStage({ send }: { send: Send }) {
  return (
    <ConsentCard title="Recording your answers" onAgree={() => send({ type: 'CONSENT', given: true })} onDecline={() => send({ type: 'CONSENT', given: false })}>
      <p>To score these activities, we record what you say during them. The recordings are turned into text by a secure speech service, scored automatically, and sometimes checked by a trained person.</p>
      <p>Your recordings and results are kept private and protected. They're never sold, and you can ask us to delete them at any time.</p>
      <p>Without recording, the activities can't be scored, so recording is needed to continue.</p>
      <p className="text-rm-eyebrow">Draft wording, pending legal review.</p>
    </ConsentCard>
  );
}

export function RapportStage({ name, send }: { name: string; send: Send }) {
  const [ready, setReady] = useState(false);
  if (ready) {
    return (
      <Card eyebrow="Ready" title={`Great, ${name}. Let's begin.`}>
        <Button onClick={() => send({ type: 'READY', ready: true, integrityVersion: INTEGRITY_VERSION })}>Start the first activity</Button>
      </Card>
    );
  }
  return (
    <Card eyebrow="Before we start" title="A few short memory and thinking activities.">
      <Text variant="lead">Some will feel easy and some will feel hard. Nobody gets everything right, so just do your best.</Text>
      {/* Integrity statement, softer B2C version (logged as INTEGRITY_VERSION). */}
      <Text variant="body" className="text-rm-ink-soft">
        Please do them on your own, without notes, help, or looking things up. That's what makes your results meaningful.
      </Text>
      <Stack gap={4} direction="responsive">
        <Button onClick={() => setReady(true)}>I'm ready</Button>
        <Button variant="secondary" onClick={() => send({ type: 'READY', ready: false, integrityVersion: INTEGRITY_VERSION })}>
          Not right now
        </Button>
      </Stack>
    </Card>
  );
}

const SELF_REPORT_QUESTIONS: { key: Exclude<keyof SelfReport, 'feeling'>; text: string }[] = [
  { key: 'interrupted', text: 'Were you interrupted at any point?' },
  { key: 'helped', text: 'Did anyone help you with your answers?' },
  { key: 'usedAids', text: 'Did you write anything down, or use anything else to help you remember?' },
  { key: 'tired', text: 'Did you feel tired during the activities?' },
];

export function SelfReportStage({ send }: { send: Send }) {
  const [answers, setAnswers] = useState<Partial<SelfReport>>({});
  const next = SELF_REPORT_QUESTIONS.find((q) => answers[q.key] === undefined);
  const sentRef = useRef(false);
  if (next) {
    return (
      <Card eyebrow="A few last questions" title={next.text}>
        <Text variant="body" className="text-rm-ink-soft">There's no wrong answer. It just helps us understand your results.</Text>
        <Stack gap={4} direction="responsive">
          <Button onClick={() => setAnswers((a) => ({ ...a, [next.key]: true }))}>Yes</Button>
          <Button variant="secondary" onClick={() => setAnswers((a) => ({ ...a, [next.key]: false }))}>
            No
          </Button>
        </Stack>
      </Card>
    );
  }
  const finish = (feeling: SelfReport['feeling']) => {
    if (sentRef.current) return;
    sentRef.current = true;
    send({ type: 'SELF_REPORT', report: { ...(answers as Omit<SelfReport, 'feeling'>), feeling } });
  };
  return (
    <Card eyebrow="A few last questions" title="How did you feel overall?">
      <Stack gap={4}>
        <Button onClick={() => finish('calm')}>Calm</Button>
        <Button variant="secondary" onClick={() => finish('some_stress')}>
          A little stressed
        </Button>
        <Button variant="secondary" onClick={() => finish('very_stressed')}>
          Very stressed
        </Button>
      </Stack>
    </Card>
  );
}

const ENDINGS: Record<NonNullable<ShellState['ended']>, { title: string; body: string }> = {
  identity: { title: 'No problem.', body: 'These activities are for the person whose account this is. Please have them start the check-in, or sign in as yourself.' },
  hearing: {
    title: "Let's stop here for today.",
    body: "It sounds like it may be hard to hear me well enough right now for these activities, so we won't continue at this time. Thank you for taking the time today. You can try again whenever you like, perhaps with earbuds or headphones.",
  },
  consent: { title: "That's okay.", body: "These activities need a recording of your voice to be scored, so we can't continue without it. You're welcome to come back any time." },
  not_ready: { title: 'Another time, then.', body: "No problem at all. Come back whenever you're ready." },
};

export function EndedStage({ reason, name, onHome }: { reason: NonNullable<ShellState['ended']>; name: string; onHome: () => void }) {
  const e = ENDINGS[reason];
  return (
    <Card eyebrow={`Thank you, ${name}`} title={e.title}>
      <Text variant="lead">{e.body}</Text>
      <Button onClick={onHome}>{reason === 'hearing' ? 'Choose another time' : 'Back to home'}</Button>
    </Card>
  );
}

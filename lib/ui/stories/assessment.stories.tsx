import { useEffect, useMemo, useState } from 'react';
import type { Story } from '@ladle/react';
import {
  BreakCard,
  Button,
  Card,
  ConsentCard,
  DelayActivity,
  EnvironmentCheck,
  HearingCheck,
  IconLabel,
  InterruptionSheet,
  ListeningOrb,
  MicCheck,
  PracticeCard,
  ProfileSetup,
  ProtocolScreen,
  SessionComplete,
  Stack,
  TapPad,
  Text,
  type MicCheckStatus,
  type OrbState,
  type ProtocolView,
} from '../src';
import { fakeAmplitude } from './_fake';

const noop = () => {};

// ---- Primitives -------------------------------------------------------------

export const Primitives: Story = () => (
  <div className="min-h-screen bg-rm-cream p-6">
    <Stack gap={8} className="mx-auto max-w-[720px]">
      <Text variant="eyebrow">Eyebrow</Text>
      <Text variant="display">Display heading</Text>
      <Text variant="title">Title heading</Text>
      <Text variant="instruction">Instruction caption at 28 px for examiner lines.</Text>
      <Text variant="lead">Lead text for supporting copy at 24 px.</Text>
      <Text variant="body">Body text at the 20 px floor.</Text>
      <Stack gap={4} direction="responsive">
        <Button>Primary action</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="quiet">Quiet</Button>
        <Button disabled>Disabled</Button>
      </Stack>
      <Card>
        <IconLabel icon={<span className="block h-4 w-4 rounded-full bg-rm-cyan" />}>Icon with its label</IconLabel>
      </Card>
    </Stack>
  </div>
);

// ---- ListeningOrb -----------------------------------------------------------

export const Orb: Story<{ state: OrbState }> = ({ state }) => {
  const amp = useMemo(fakeAmplitude, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-rm-surface">
      <ListeningOrb state={state} getAmplitude={amp} />
    </div>
  );
};
Orb.args = { state: 'listening' };
Orb.argTypes = { state: { options: ['idle', 'examinerSpeaking', 'listening', 'thinking', 'paused'], control: { type: 'radio' } } };

// ---- Protocol screen (every phase) ------------------------------------------

const VIEWS: Record<string, ProtocolView> = {
  examinerSpeaking: {
    phase: 'examinerSpeaking',
    caption: 'I am going to say three colors. When I am through, say them back to me.',
    canRepeat: true,
    canFinish: false,
  },
  presenting: { phase: 'presenting', caption: null, canRepeat: false, canFinish: false },
  listening: { phase: 'listening', caption: null, canRepeat: false, canFinish: true },
  letterCue: { phase: 'listening', caption: null, canRepeat: false, canFinish: false, cue: 'F' },
  processing: { phase: 'processing', caption: null, canRepeat: false, canFinish: false },
  paused: { phase: 'paused', caption: null, canRepeat: false, canFinish: false },
  break: { phase: 'break', caption: null, message: 'Nice. A slightly different one next.', canRepeat: false, canFinish: false },
  intro: {
    phase: 'break',
    caption: null,
    title: 'How this works',
    message: "You'll hear my voice. Just talk to me naturally. There are no trick questions.",
    cta: "I'm ready",
    canRepeat: false,
    canFinish: false,
  },
  tapCheck: { phase: 'tapCheck', caption: null, canRepeat: false, canFinish: false },
  tapping: { phase: 'tapping', caption: null, canRepeat: false, canFinish: false },
};

export const Protocol: Story<{ phase: keyof typeof VIEWS }> = ({ phase }) => {
  const amp = useMemo(fakeAmplitude, []);
  // One identical pulse per "digit", at 1 per second, while presenting.
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => p + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <ProtocolScreen
      view={VIEWS[phase]!}
      progress={{ current: 3, total: 7 }}
      getAmplitude={amp}
      pulse={pulse}
      onDone={noop}
      onRepeat={noop}
      onPause={noop}
      onContinue={noop}
      onTap={noop}
    />
  );
};
Protocol.args = { phase: 'examinerSpeaking' };
Protocol.argTypes = { phase: { options: Object.keys(VIEWS), control: { type: 'radio' } } };

// ---- Chrome screens ---------------------------------------------------------

export const MicCheckStates: Story<{ status: MicCheckStatus }> = ({ status }) => {
  const amp = useMemo(fakeAmplitude, []);
  return <MicCheck status={status} getAmplitude={amp} onContinue={noop} onRetry={noop} step="Step 1 of 3 · Setup" />;
};
MicCheckStates.args = { status: 'good' };
MicCheckStates.argTypes = { status: { options: ['requesting', 'listening', 'tooQuiet', 'good', 'denied', 'unsupported'], control: { type: 'radio' } } };

export const Hearing: Story = () => <HearingCheck step="Hearing check" question="Can you hear me well enough?" onAnswer={noop} />;

export const Environment: Story = () => {
  const [items, setItems] = useState([
    { key: 'quiet', label: 'Quiet place for about 30 minutes', done: true },
    { key: 'devices', label: 'TV, radio and other devices off', done: true },
    { key: 'paper', label: 'Pencils and paper put away', done: false },
    { key: 'calendar', label: 'Calendars and watches out of sight', done: false },
  ]);
  return (
    <div onClick={() => setItems((all) => all.map((i, k) => (k === all.findIndex((x) => !x.done) ? { ...i, done: true } : i)))}>
      <EnvironmentCheck items={items} onContinue={noop} />
    </div>
  );
};

export const Consent: Story = () => (
  <ConsentCard title="May we record your answers?" onAgree={noop} onDecline={noop}>
    <p>We record what you say during these activities so your answers can be scored accurately. Recordings are encrypted and only used for your results.</p>
    <p>Draft wording: pending legal review.</p>
  </ConsentCard>
);

export const Practice: Story = () => (
  <div className="min-h-screen bg-rm-cream p-6">
    <PracticeCard>
      <Text variant="instruction">Tell me how an apple and a pear are alike.</Text>
    </PracticeCard>
  </div>
);

export const Break: Story = () => <BreakCard next="activity 4 of 7" onContinue={noop} />;
export const Delay: Story = () => <DelayActivity ready={false} />;

export const Interruption: Story = () => {
  const [open, setOpen] = useState(true);
  return (
    <div className="min-h-screen bg-rm-cream p-6">
      <Button onClick={() => setOpen(true)}>Pause</Button>
      <InterruptionSheet open={open} onResume={() => setOpen(false)} onStop={() => setOpen(false)} />
    </div>
  );
};

export const Complete: Story<{ streak: number }> = ({ streak }) => <SessionComplete name="Margaret" streakWeeks={streak} onDone={noop} />;
Complete.args = { streak: 4 };

export const Vigilance: Story = () => {
  const [taps, setTaps] = useState(0);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-rm-cream p-6">
      <TapPad onTap={() => setTaps((t) => t + 1)} />
      <p className="text-rm-eyebrow text-rm-ink-soft">(story only) taps: {taps}</p>
    </div>
  );
};

export const Profile: Story = () => <ProfileSetup onSave={noop} />;

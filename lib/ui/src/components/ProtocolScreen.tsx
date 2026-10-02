// Renders one administration state. It takes only the engine's Firewall-safe
// view (structurally typed so lib/ui does not depend on lib/engine), plus a
// live amplitude reader for the orb. It cannot receive stimuli or responses.
import { Button, Stack, Text } from '../primitives';
import { AssessmentLayout } from './AssessmentLayout';
import { BreathingPacer } from './chrome';
import { ListeningOrb, type OrbState } from './ListeningOrb';
import { DoneButton, ExaminerCaption, ProgressRail, TapPad } from './protocol';

export interface ProtocolView {
  phase: 'examinerSpeaking' | 'presenting' | 'listening' | 'processing' | 'tapCheck' | 'tapping' | 'break' | 'paused' | 'complete';
  caption: string | null;
  message?: string | null;
  title?: string | null;
  cta?: string | null;
  canRepeat: boolean;
  canFinish: boolean;
  /** Task cue shown large while listening (e.g. the letter "F"). */
  cue?: string | null;
}

export interface ProtocolScreenProps {
  view: ProtocolView;
  progress?: { current: number; total: number };
  getAmplitude?: () => number;
  /** Increments once per stimulus onset; every pulse looks the same. */
  pulse?: number;
  onDone: () => void;
  onRepeat: () => void;
  onPause: () => void;
  onContinue: () => void;
  /** Tap tasks (vigilance). Every tap looks the same, hit or not. */
  onTap?: () => void;
}

const ORB: Record<ProtocolView['phase'], OrbState> = {
  examinerSpeaking: 'examinerSpeaking',
  presenting: 'examinerSpeaking',
  listening: 'listening',
  processing: 'thinking',
  tapCheck: 'idle',
  tapping: 'examinerSpeaking',
  break: 'idle',
  paused: 'paused',
  complete: 'idle',
};

export function ProtocolScreen({ view, progress, getAmplitude, pulse, onDone, onRepeat, onPause, onContinue, onTap }: ProtocolScreenProps) {
  const rail = progress ? <ProgressRail current={progress.current} total={progress.total} /> : undefined;

  if (view.phase === 'break') {
    return (
      <AssessmentLayout rail={rail} onPause={onPause} aside={<BreathingPacer />}>
        <Text variant="eyebrow">{view.title ?? 'A short pause'}</Text>
        {view.message && <Text variant="title">{view.message}</Text>}
        {!view.title && <Text variant="lead">Take a breath. Continue whenever you're ready.</Text>}
        <Button onClick={onContinue}>{view.cta ?? "I'm ready"}</Button>
      </AssessmentLayout>
    );
  }

  if (view.phase === 'tapCheck' || view.phase === 'tapping') {
    // D11: the screen tap stands in for tapping the table. No letters on screen, ever.
    return (
      <AssessmentLayout rail={rail} onPause={onPause}>
        <Stack gap={6} className="items-center">
          <Text variant="eyebrow">{view.phase === 'tapCheck' ? 'Tap once' : 'Listen and tap'}</Text>
          {view.phase === 'tapCheck' && <Text variant="instruction">Tap the big button once.</Text>}
          <TapPad onTap={() => onTap?.()} label="Tap" />
        </Stack>
      </AssessmentLayout>
    );
  }

  return (
    <AssessmentLayout
      rail={rail}
      onPause={onPause}
      aside={
        <ListeningOrb
          state={ORB[view.phase]}
          getAmplitude={view.phase === 'listening' ? getAmplitude : undefined}
          pulse={view.phase === 'presenting' ? pulse : undefined}
        />
      }
    >
      {view.phase === 'examinerSpeaking' && view.caption && (
        <Stack gap={6}>
          <ExaminerCaption text={view.caption} />
          {view.canRepeat && (
            <Button variant="secondary" onClick={onRepeat}>
              Please say that again
            </Button>
          )}
        </Stack>
      )}
      {view.phase === 'presenting' && (
        // Stimuli are auditory only: nothing but a neutral cue on screen.
        <Stack gap={4}>
          <Text variant="eyebrow">Listen</Text>
          <Text variant="instruction">Listen carefully.</Text>
        </Stack>
      )}
      {view.phase === 'listening' && (
        <Stack gap={8}>
          <Stack gap={4}>
            <Text variant="eyebrow">Listening</Text>
            {view.cue ? (
              // The task cue (a letter), not a stimulus: the same glyph the whole minute.
              <p aria-label={`Words that begin with the letter ${view.cue}`} className="flex items-baseline gap-4">
                <span aria-hidden className="text-[120px] font-bold leading-none text-rm-navy">{view.cue}</span>
                <span className="text-rm-lead text-rm-ink-soft">Words that begin with this letter.</span>
              </p>
            ) : (
              <Text variant="instruction">Your turn. Speak whenever you are ready.</Text>
            )}
          </Stack>
          {view.canFinish && <DoneButton onDone={onDone} />}
        </Stack>
      )}
      {view.phase === 'processing' && (
        <Stack gap={4}>
          <Text variant="eyebrow">One moment</Text>
          <Text variant="instruction">Thank you.</Text>
        </Stack>
      )}
    </AssessmentLayout>
  );
}

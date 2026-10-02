// The only thing a UI may render from an administration. It is built from
// the spec and state, never from responses, so it cannot leak correctness;
// lines marked `caption: false` (memory words, cues, choices) are never shown
// (CLAUDE.md §4 Firewall).
import { formatChoices, renderLine, windowOf, type Zone } from '@workspace/test-spec';
import type { AdministrationSnapshot } from './machine';

export type AdministrationPhase =
  | 'examinerSpeaking'
  | 'presenting'
  | 'listening'
  | 'processing'
  | 'tapCheck'
  | 'tapping'
  | 'break'
  | 'paused'
  | 'complete';

export interface AdministrationView {
  phase: AdministrationPhase;
  zone: Zone;
  stepKey: string;
  /** Caption of the current scripted instruction. Never set while stimuli play. */
  caption: string | null;
  /** Chrome-zone copy for a break/intro card. */
  message: string | null;
  title: string | null;
  cta: string | null;
  /** Participant may ask for the current instruction again. */
  canRepeat: boolean;
  /** "I'm finished" is a legal way to close the current window. */
  canFinish: boolean;
  /** Task cue shown large while listening (the letter in phonemic fluency); never a stimulus. */
  cue: string | null;
}

/** Deepest active state name, e.g. { running: { step3: 'listening' } } → 'listening'. */
function leafState(value: unknown): string {
  let v = value;
  while (v && typeof v === 'object') v = Object.values(v as Record<string, unknown>)[0];
  return typeof v === 'string' ? v : '';
}

export function getView(snapshot: AdministrationSnapshot): AdministrationView {
  const { spec, form, stepKey, promptCounts, lastJudgement, cue } = snapshot.context;
  const zone: Zone = snapshot.hasTag('protocol') ? 'protocol' : 'chrome';
  const blank = { zone, stepKey, caption: null, message: null, title: null, cta: null, canRepeat: false, canFinish: false, cue: null };

  if (snapshot.status === 'done' || snapshot.matches('complete')) return { ...blank, zone: 'chrome', phase: 'complete' };
  if (snapshot.matches('paused')) return { ...blank, zone: 'chrome', phase: 'paused' };

  const step = spec.steps.find((s) => s.key === stepKey)!;
  const sub = leafState(snapshot.value);
  const speaking = (lineKey: string, vars: Record<string, string> = {}): AdministrationView => {
    const line = renderLine(spec, lineKey, form, vars);
    return { ...blank, phase: 'examinerSpeaking', caption: line.caption ? line.text : null };
  };
  const listeningView = (w: { closeOn: string[] }): AdministrationView => ({ ...blank, phase: 'listening', canFinish: w.closeOn.includes('participant_done') });

  switch (step.type) {
    case 'say': {
      const line = spec.lines.find((l) => l.key === step.line)!;
      return { ...speaking(step.line), canRepeat: line.repeatable && (promptCounts[`repeat:${line.key}`] ?? 0) < line.maxRepeats };
    }
    case 'present':
      return { ...blank, phase: 'presenting' };
    case 'break':
      return { ...blank, phase: 'break', message: step.message, title: step.title ?? null, cta: step.cta ?? null };
    case 'tapTask':
      if (sub === 'check') return speaking(step.checkLine);
      if (sub === 'recheck') return speaking(step.checkRetryLine);
      if (sub === 'awaitTap') return { ...blank, phase: 'tapCheck' };
      if (sub === 'presenting' || sub === 'tail' || sub === 'settle') return { ...blank, phase: 'tapping' };
      return { ...blank, phase: 'processing' };
    case 'sequenceTask':
      // The orb only: no numbers, letters, counter or timer on screen (build doc §T8 UX).
      if (sub === 'running' || sub === 'pending' || sub === 'stalled' || sub === 'lost') return { ...blank, phase: 'listening', canFinish: false };
      return { ...blank, phase: 'processing' };
    case 'cuedRecall': {
      const idx = cue?.queue[0] ?? 0;
      if (sub === 'cue') return speaking(step.cueLine, { cue: form.items[step.cues]?.[idx] ?? '' });
      if (sub === 'choice') return speaking(step.choiceLine, { choices: formatChoices(form.items[step.choices]?.[idx] ?? '') });
      if (sub === 'cueListening' || sub === 'choiceListening') return listeningView(step.window);
      return { ...blank, phase: 'processing' };
    }
    case 'respond':
    case 'practice':
    case 'trials': {
      if (step.type === 'practice' && sub === 'feedback' && step.onIncorrect) return speaking(step.onIncorrect);
      if (step.type === 'practice' && sub.startsWith('fb-') && step.feedback?.[sub.slice(3)]) return speaking(step.feedback[sub.slice(3)]!);
      if (step.type === 'practice' && sub === 'retry' && step.retryLine) return speaking(step.retryLine);
      if (step.type === 'respond' && sub === 'followUp' && step.followUp) return speaking(step.followUp.line, lastJudgement?.vars ?? {});
      if (step.type === 'trials') {
        if (sub === 'ready') return speaking(step.readyLine);
        if (sub === 'reminding' && step.reminder) return speaking(step.reminder.line);
        if (sub === 'presenting') return { ...blank, phase: 'presenting' };
      }
      if (sub === 'listening') {
        const cue = step.type === 'respond' && step.cue ? step.cue.replace(/\{\{(\w+)\}\}/g, (_, n: string) => form.items[n]?.[0] ?? '') : null;
        return { ...listeningView(windowOf(step)), cue };
      }
      return { ...blank, phase: 'processing' };
    }
  }
}

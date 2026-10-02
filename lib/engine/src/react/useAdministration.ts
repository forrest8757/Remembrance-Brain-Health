// React binding: runs one administration against a channel and exposes the
// Firewall-safe view. The actor is created only once a channel exists, so no
// command is ever emitted into the void.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createActor, type Actor } from 'xstate';
import type { TestSpec } from '@workspace/test-spec';
import type { Form } from '@workspace/forms';
import { bindChannel, type EngineChannel } from '../channel';
import { createAdministrationMachine, type AdministrationMachine, type AdministrationSnapshot } from '../machine';
import type { AdministrationRecord, EngineEvent, Judge } from '../types';
import { getView, type AdministrationView } from '../view';

export interface UseAdministrationOptions {
  spec: TestSpec;
  form: Form;
  /** Null until clips are loaded and the mic is attached. */
  channel: EngineChannel | null;
  now?: () => number;
  /** Live judges for steps that judge responses. */
  judges?: Record<string, Judge>;
  /** Participant's IANA time zone (orientation scoring). */
  timeZone?: string;
  /** Pause automatically when the page is hidden (default true). */
  pauseOnHidden?: boolean;
}

export interface UseAdministrationResult {
  view: AdministrationView | null;
  record: AdministrationRecord | null;
  snapshot: AdministrationSnapshot | null;
  send: (event: EngineEvent) => void;
}

export function useAdministration({ spec, form, channel, now, judges, timeZone, pauseOnHidden = true }: UseAdministrationOptions): UseAdministrationResult {
  const [snapshot, setSnapshot] = useState<AdministrationSnapshot | null>(null);
  const actorRef = useRef<Actor<AdministrationMachine> | null>(null);
  // Refreshed every render: the audio clock only exists once the rig is ready,
  // and window times must use the same clock as stimulus onsets.
  const nowRef = useRef(now ?? (() => performance.now()));
  nowRef.current = now ?? (() => performance.now());
  const judgesRef = useRef(judges);
  judgesRef.current = judges;

  useEffect(() => {
    if (!channel) return;
    const actor = createActor(createAdministrationMachine(spec), { input: { spec, form, now: () => nowRef.current(), judges: judgesRef.current, timeZone } });
    actorRef.current = actor;
    const unbind = bindChannel(actor, channel);
    const sub = actor.subscribe(setSnapshot);
    actor.start();
    return () => {
      sub.unsubscribe();
      unbind();
      actor.stop();
      channel.stopAll();
      actorRef.current = null;
    };
  }, [spec, form, channel, timeZone]);

  useEffect(() => {
    if (!pauseOnHidden) return;
    const onVisibility = () => {
      const actor = actorRef.current;
      if (!actor || document.visibilityState !== 'hidden') return;
      actor.send({ type: 'FOCUS_LOST' });
      if (!actor.getSnapshot().matches('paused')) actor.send({ type: 'PAUSE', reason: 'backgrounded' });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pauseOnHidden]);

  const send = useCallback((event: EngineEvent) => actorRef.current?.send(event), []);

  return {
    snapshot,
    view: snapshot ? getView(snapshot) : null,
    record: snapshot?.status === 'done' ? (snapshot.output ?? null) : null,
    send,
  };
}

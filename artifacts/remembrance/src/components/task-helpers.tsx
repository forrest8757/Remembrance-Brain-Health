import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

type FeedbackKind = 'success' | 'neutral' | 'soft';

type TaskFeedbackValue = {
  soundOn: boolean;
  setSoundOn: (enabled: boolean) => void;
  feedback: (kind?: FeedbackKind) => void;
  speak: (text: string) => void;
};

const TaskFeedbackContext = createContext<TaskFeedbackValue | null>(null);
let globalSoundOn = true;

function makeTone(kind: FeedbackKind = 'soft') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequency = kind === 'success' ? 660 : kind === 'neutral' ? 260 : 420;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, audioContext.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);
    oscillator.addEventListener('ended', () => {
      void audioContext.close();
    });
  } catch {
    // Audio is an enhancement and can be unavailable until the first user gesture.
  }
}

function vibrate(pattern: number | number[] = 8) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

export function TaskFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [soundOn, setSoundOn] = useState(globalSoundOn);

  const updateSound = useCallback((enabled: boolean) => {
    globalSoundOn = enabled;
    setSoundOn(enabled);
  }, []);

  const feedback = useCallback(
    (kind: FeedbackKind = 'soft') => {
      vibrate(kind === 'success' ? [8, 24, 8] : kind === 'neutral' ? 5 : 8);
      if (soundOn) makeTone(kind);
    },
    [soundOn],
  );

  const speak = useCallback(
    (text: string) => {
      if (!soundOn || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    },
    [soundOn],
  );

  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  return (
    <TaskFeedbackContext.Provider value={{ soundOn, setSoundOn: updateSound, feedback, speak }}>
      {children}
    </TaskFeedbackContext.Provider>
  );
}

const fallbackFeedback: TaskFeedbackValue = {
  get soundOn() {
    return globalSoundOn;
  },
  setSoundOn: (enabled) => {
    globalSoundOn = enabled;
  },
  feedback: (kind: FeedbackKind = 'soft') => {
    vibrate(kind === 'success' ? [8, 24, 8] : kind === 'neutral' ? 5 : 8);
    if (globalSoundOn) makeTone(kind);
  },
  speak: (text: string) => {
    if (!globalSoundOn || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  },
};

export function useTaskFeedback(): TaskFeedbackValue {
  const context = useContext(TaskFeedbackContext);
  if (context) return context;
  return fallbackFeedback;
}

export function SoundToggle({ className = '' }: { className?: string }) {
  const { soundOn, setSoundOn } = useTaskFeedback();
  return (
    <button
      type="button"
      onClick={() => setSoundOn(!soundOn)}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-navy/5 text-navy transition-colors hover:bg-navy/10 ${className}`}
      aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
      title={soundOn ? 'Sound on' : 'Sound off'}
    >
      {soundOn ? <Volume2 size={19} /> : <VolumeX size={19} />}
    </button>
  );
}

/**
 * A timeout that retains its remaining time while paused. Delayed task
 * transitions use this rather than a bare setTimeout so pause is a true pause.
 */
export function usePausableTimeout(
  callback: () => void,
  delay: number,
  paused: boolean,
  enabled = true,
  resetKey?: string | number,
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const remainingRef = useRef(delay);
  const completedRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // A task can keep the same enabled state while advancing through several
    // timed cards (for example, each word in the memory encoding pass). The
    // reset key makes each card a fresh, pause-aware timeout instead of
    // allowing the previous card's timer to carry on.
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    remainingRef.current = delay;
    completedRef.current = false;
  }, [delay, enabled, resetKey]);

  useEffect(() => {
    if (!enabled || paused || completedRef.current) return;

    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      completedRef.current = true;
      remainingRef.current = delay;
      callbackRef.current();
    }, Math.max(0, remainingRef.current));

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        const elapsed = Date.now() - startedAtRef.current;
        remainingRef.current = Math.max(0, remainingRef.current - elapsed);
        timerRef.current = null;
      }
    };
  }, [delay, enabled, paused, resetKey]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );
}

/**
 * A recurring timeout with pause-aware remaining time. It avoids interval
 * callbacks continuing to mutate a task while its pause veil is visible.
 */
export function usePausableTicker(
  callback: () => void,
  interval: number,
  paused: boolean,
  enabled = true,
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const remainingRef = useRef(interval);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    remainingRef.current = interval;
  }, [interval, enabled]);

  useEffect(() => {
    if (!enabled || paused) return;
    let disposed = false;

    const schedule = () => {
      if (disposed) return;
      startedAtRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (disposed) return;
        remainingRef.current = interval;
        callbackRef.current();
        schedule();
      }, Math.max(0, remainingRef.current));
    };
    schedule();

    return () => {
      disposed = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        const elapsed = Date.now() - startedAtRef.current;
        remainingRef.current = Math.max(0, remainingRef.current - elapsed);
        timerRef.current = null;
      }
    };
  }, [interval, enabled, paused]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );
}

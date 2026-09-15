import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  Clock3,
  Mic,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Type,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useDemoState } from '@/lib/store';
import { ProcessingSequence } from '@/components/tasks';
import { Button } from '@/components/ui/button';
import {
  canReadTextAloud,
  detectMicrophoneSupport,
  disposeVoiceAudioSession,
  openVoiceAudioSession,
  readTextAloud,
  readVoiceAudioFrame,
  stopReadingTextAloud,
  type MicrophoneSupport,
  type VoiceAudioSession,
} from '@/lib/voice-audio';

type Phase = 'intro' | 'warmup' | 'task' | 'processing';
type CapturePurpose = 'warmup' | 'task';
type CaptureMode = 'microphone' | 'simulated' | 'reflection' | null;
type MicStatus = 'available' | 'granted' | 'denied' | 'unsupported' | 'error';

const MAX_RECORDING_SECONDS = 60;
const MIN_CORE_RECORDING_SECONDS = 20;
const MIN_TEXT_RESPONSE_CHARACTERS = 20;
const DEFAULT_WAVEFORM: number[] = Array.from({ length: 18 }, (_, index) =>
  index % 3 === 0 ? 0.2 : 0.08,
);
const CORE_ROUNDS = [
  {
    prompt: 'Tell me about a place you love.',
    support:
      'Share a memory, a few familiar details, or what makes that place feel special to you.',
    placeholder: 'Write about a place you love and what makes it meaningful...',
  },
  {
    prompt: 'Take a minute and tell me about your morning.',
    support:
      'Walk through the parts of a familiar morning that you would like to remember.',
    placeholder: 'Write about your morning and the details you remember...',
  },
] as const;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

function getMicrophoneError(error: unknown): {
  status: MicStatus;
  message: string;
} {
  const name =
    typeof DOMException !== 'undefined' && error instanceof DOMException ? error.name : '';

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return {
      status: 'denied',
      message:
        'Microphone permission was not granted. You can try again, or continue without recording.',
    };
  }

  if (name === 'NotFoundError' || name === 'NotSupportedError' || name === 'TypeError') {
    return {
      status: 'unsupported',
      message:
        'This browser cannot provide microphone audio here. Nothing was recorded or uploaded.',
    };
  }

  return {
    status: 'error',
    message:
      'We could not open the microphone right now. You can try again, or continue without recording.',
  };
}

export default function VoiceTest() {
  const [, setLocation] = useLocation();
  const { updateDomainScore } = useDemoState();

  const [phase, setPhase] = useState<Phase>('intro');
  const [micAvailability, setMicAvailability] = useState<MicrophoneSupport | null>(null);
  const [micStatus, setMicStatus] = useState<MicStatus>('available');
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [warmupComplete, setWarmupComplete] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [volume, setVolume] = useState(0);
  const [waveform, setWaveform] = useState(DEFAULT_WAVEFORM);
  const [reflection, setReflection] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const audioSessionRef = useRef<VoiceAudioSession | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const captureAttemptRef = useRef(0);
  const currentRoundRef = useRef(0);
  const elapsedSecondsRef = useRef(0);
  const isPausedRef = useRef(false);
  const isCapturingRef = useRef(false);
  const capturePurposeRef = useRef<CapturePurpose>('task');

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const disposeCurrentAudio = useCallback(() => {
    stopAnimation();
    stopTimer();
    disposeVoiceAudioSession(audioSessionRef.current);
    audioSessionRef.current = null;
  }, [stopAnimation, stopTimer]);

  const readMicrophoneFrame = useCallback(() => {
    if (!mountedRef.current || isPausedRef.current || !audioSessionRef.current) return;

    const frame = readVoiceAudioFrame(audioSessionRef.current);
    setVolume(frame.level);
    setWaveform(frame.waveform);
    animationFrameRef.current = window.requestAnimationFrame(readMicrophoneFrame);
  }, []);

  const startMicrophoneAnalysis = useCallback(() => {
    stopAnimation();
    if (!isPausedRef.current && audioSessionRef.current) {
      animationFrameRef.current = window.requestAnimationFrame(readMicrophoneFrame);
    }
  }, [readMicrophoneFrame, stopAnimation]);

  const startSimulatedAnimation = useCallback(() => {
    stopAnimation();

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVolume(0.25);
      setWaveform(DEFAULT_WAVEFORM);
      return;
    }

    const updateSimulatedFrame = () => {
      if (!mountedRef.current || isPausedRef.current || !isCapturingRef.current) return;

      const time = performance.now() / 850;
      const pulse = (Math.sin(time) + 1) / 2;
      setVolume(0.16 + pulse * 0.3);
      setWaveform(
        DEFAULT_WAVEFORM.map((_, index) => {
          const wave = (Math.sin(time * 1.4 + index * 0.65) + 1) / 2;
          return 0.12 + wave * 0.45;
        }),
      );
      animationFrameRef.current = window.requestAnimationFrame(updateSimulatedFrame);
    };

    animationFrameRef.current = window.requestAnimationFrame(updateSimulatedFrame);
  }, [stopAnimation]);

  useEffect(() => {
    const support = detectMicrophoneSupport();
    setMicAvailability(support);
    setMicStatus(support.supported ? 'available' : 'unsupported');
    setSpeechAvailable(canReadTextAloud());

    return () => {
      mountedRef.current = false;
      captureAttemptRef.current += 1;
      disposeCurrentAudio();
      stopReadingTextAloud();
    };
  }, [disposeCurrentAudio]);

  useEffect(() => {
    if (phase !== 'task' && phase !== 'warmup') {
      stopReadingTextAloud();
    }
  }, [phase]);

  useEffect(() => {
    if (!isCapturing || isPaused || captureMode === 'reflection') return;

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((previous) => {
        const next = Math.min(MAX_RECORDING_SECONDS, previous + 1);
        elapsedSecondsRef.current = next;
        return next;
      });
    }, 1000);

    return stopTimer;
  }, [captureMode, isCapturing, isPaused, stopTimer]);

  useEffect(() => {
    if (isCapturing && elapsedSeconds >= MAX_RECORDING_SECONDS) {
      finishCapture();
    }
    // finishCapture intentionally lives below and is kept stable with refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, isCapturing]);

  useEffect(() => {
    if (
      !isCapturing ||
      isPaused ||
      captureMode !== 'simulated' ||
      typeof window === 'undefined'
    ) {
      return;
    }

    startSimulatedAnimation();
    return stopAnimation;
  }, [captureMode, isCapturing, isPaused, startSimulatedAnimation, stopAnimation]);

  const startMicrophoneCapture = useCallback(
    async (purpose: CapturePurpose) => {
      const support = detectMicrophoneSupport();
      if (!support.supported) {
        setMicAvailability(support);
        setMicStatus('unsupported');
        setAudioNotice(
          'This browser cannot use a microphone here. Nothing was recorded or uploaded.',
        );
        return;
      }

      const attempt = captureAttemptRef.current + 1;
      captureAttemptRef.current = attempt;
      capturePurposeRef.current = purpose;
      setAudioNotice(null);
      setIsRequesting(true);
      setIsPaused(false);
      isPausedRef.current = false;
      disposeCurrentAudio();

      try {
        const session = await openVoiceAudioSession();

        // getUserMedia can resolve after the page has navigated away. Dispose
        // the late stream rather than attaching it to an unmounted page.
        if (!mountedRef.current || captureAttemptRef.current !== attempt) {
          disposeVoiceAudioSession(session);
          return;
        }

        audioSessionRef.current = session;
        isCapturingRef.current = true;
        setCaptureMode('microphone');
        setMicStatus('granted');
        setIsCapturing(true);
        elapsedSecondsRef.current = 0;
        setElapsedSeconds(0);
        setVolume(0);
        setWaveform(DEFAULT_WAVEFORM);
        startMicrophoneAnalysis();
      } catch (error) {
        if (!mountedRef.current || captureAttemptRef.current !== attempt) return;

        disposeCurrentAudio();
        const microphoneError = getMicrophoneError(error);
        setMicStatus(microphoneError.status);
        setAudioNotice(microphoneError.message);
        setIsCapturing(false);
        isCapturingRef.current = false;
      } finally {
        if (mountedRef.current && captureAttemptRef.current === attempt) {
          setIsRequesting(false);
        }
      }
    },
    [disposeCurrentAudio, startMicrophoneAnalysis],
  );

  const startSimulatedCapture = useCallback(
    (purpose: CapturePurpose) => {
      captureAttemptRef.current += 1;
      capturePurposeRef.current = purpose;
      setAudioNotice(null);
      setIsPaused(false);
      isPausedRef.current = false;
      disposeCurrentAudio();
      isCapturingRef.current = true;
      setIsCapturing(true);
      elapsedSecondsRef.current = 0;
      setElapsedSeconds(0);
      setVolume(0.2);
      setWaveform(DEFAULT_WAVEFORM);
    },
    [disposeCurrentAudio],
  );

  const finishCapture = useCallback(() => {
    if (!isCapturingRef.current) return;

    const purpose = capturePurposeRef.current;
    const completedRound = currentRoundRef.current;
    const elapsed = elapsedSecondsRef.current;

    if (purpose === 'task' && elapsed < MIN_CORE_RECORDING_SECONDS) {
      const remaining = MIN_CORE_RECORDING_SECONDS - elapsed;
      setAudioNotice(
        `Take a little more time with this response. You can finish after ${formatTime(
          remaining,
        )} more, whenever you feel ready.`,
      );
      return;
    }

    captureAttemptRef.current += 1;
    isCapturingRef.current = false;
    disposeCurrentAudio();
    setIsCapturing(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setVolume(0);
    setWaveform(DEFAULT_WAVEFORM);
    elapsedSecondsRef.current = 0;
    setElapsedSeconds(0);

    if (purpose === 'warmup') {
      setWarmupComplete(true);
      currentRoundRef.current = 0;
      setCurrentRound(0);
      setPhase('task');
      setAudioNotice(null);
    } else if (completedRound < CORE_ROUNDS.length - 1) {
      currentRoundRef.current = completedRound + 1;
      setCurrentRound(completedRound + 1);
      setPhase('task');
      setAudioNotice('Lovely. That is one of two responses. Take a breath, then continue.');
    } else {
      setAudioNotice(null);
      setPhase('processing');
    }
  }, [disposeCurrentAudio]);

  const beginWarmup = useCallback(() => {
    currentRoundRef.current = 0;
    elapsedSecondsRef.current = 0;
    setCurrentRound(0);
    setWarmupComplete(false);
    setCaptureMode(null);
    setReflection('');
    setPhase('warmup');
    setAudioNotice(null);
    capturePurposeRef.current = 'warmup';
  }, []);

  const chooseAlternative = useCallback(
    (mode: 'simulated' | 'reflection') => {
      captureAttemptRef.current += 1;
      disposeCurrentAudio();
      isCapturingRef.current = false;
      isPausedRef.current = false;
      setIsCapturing(false);
      setIsPaused(false);
      setCaptureMode(mode);
      setIsRequesting(false);
      elapsedSecondsRef.current = 0;
      setElapsedSeconds(0);
      setVolume(0);
      setWaveform(DEFAULT_WAVEFORM);
      if (phase === 'warmup' && mode === 'simulated') {
        setWarmupComplete(true);
        currentRoundRef.current = 0;
        setCurrentRound(0);
        setPhase('task');
      }
      setAudioNotice(null);
    },
    [disposeCurrentAudio, phase],
  );

  const retryMicrophone = useCallback(() => {
    const support = detectMicrophoneSupport();
    setMicAvailability(support);
    setMicStatus(support.supported ? 'available' : 'unsupported');
    setCaptureMode(support.supported ? 'microphone' : null);
    setAudioNotice(
      support.supported
        ? 'When you are ready, tap the microphone again.'
        : 'This browser still cannot use a microphone here.',
    );
  }, []);

  const togglePause = useCallback(() => {
    if (!isCapturingRef.current) return;

    const nextPaused = !isPausedRef.current;
    isPausedRef.current = nextPaused;
    setIsPaused(nextPaused);

    if (nextPaused) {
      stopAnimation();
      if (audioSessionRef.current?.context.state === 'running') {
        void audioSessionRef.current.context.suspend().catch(() => undefined);
      }
    } else {
      setAudioNotice(null);
      if (audioSessionRef.current?.context.state === 'suspended') {
        void audioSessionRef.current.context.resume().catch(() => undefined);
      }
      if (captureMode === 'microphone') {
        startMicrophoneAnalysis();
      } else if (captureMode === 'simulated') {
        startSimulatedAnimation();
      }
    }
  }, [captureMode, startMicrophoneAnalysis, startSimulatedAnimation, stopAnimation]);

  const handleOrbClick = useCallback(() => {
    if (isPaused || isRequesting) return;

    if (isCapturing) {
      finishCapture();
      return;
    }

    const purpose = phase === 'warmup' ? 'warmup' : 'task';
    if (captureMode === 'simulated') {
      startSimulatedCapture(purpose);
    } else {
      startMicrophoneCapture(purpose);
    }
  }, [
    captureMode,
    finishCapture,
    isCapturing,
    isPaused,
    isRequesting,
    phase,
    startMicrophoneCapture,
    startSimulatedCapture,
  ]);

  const handleReadPrompt = useCallback(
    (text: string) => {
      if (!soundEnabled) return;
      if (!readTextAloud(text)) {
        setSpeechAvailable(false);
        setAudioNotice('Audio reading is not available in this browser. The prompt is shown in full.');
      }
    },
    [soundEnabled],
  );

  const toggleSound = useCallback(() => {
    if (soundEnabled) {
      stopReadingTextAloud();
      setSoundEnabled(false);
    } else {
      setSoundEnabled(true);
      setAudioNotice(null);
    }
  }, [soundEnabled]);

  const handleBack = useCallback(() => {
    captureAttemptRef.current += 1;
    disposeCurrentAudio();
    stopReadingTextAloud();
    window.history.back();
  }, [disposeCurrentAudio]);

  const handleReflectionSubmit = useCallback(() => {
    const responseLength = reflection.trim().length;

    if (phase === 'warmup') {
      if (responseLength < 3) {
        setAudioNotice('A few words are enough for practice. Add a little more, then continue.');
        return;
      }

      setWarmupComplete(true);
      currentRoundRef.current = 0;
      setCurrentRound(0);
      setReflection('');
      setAudioNotice(null);
      setPhase('task');
      return;
    }

    if (responseLength < MIN_TEXT_RESPONSE_CHARACTERS) {
      setAudioNotice(
        `Please add a little more detail so this is a meaningful response (at least ${MIN_TEXT_RESPONSE_CHARACTERS} characters).`,
      );
      return;
    }

    if (currentRoundRef.current < CORE_ROUNDS.length - 1) {
      currentRoundRef.current += 1;
      setCurrentRound(currentRoundRef.current);
      setReflection('');
      setAudioNotice('Thank you. That is one of two responses. The next prompt is ready when you are.');
      return;
    }

    setReflection('');
    setAudioNotice(null);
    setPhase('processing');
  }, [phase, reflection]);

  const handleProcessingComplete = useCallback(() => {
    if (!mountedRef.current) return;
    updateDomainScore('language', 18);
    setLocation('/domain/language');
  }, [setLocation, updateDomainScore]);

  const currentPrompt = CORE_ROUNDS[currentRound];
  const prompt =
    phase === 'warmup'
      ? 'Tap the microphone, say a few words, and tap it again when you are ready.'
      : currentPrompt.prompt;
  const promptSupport =
    phase === 'warmup'
      ? 'A quick practice makes the real reflection feel easy.'
      : currentPrompt.support;
  const textPlaceholder =
    phase === 'warmup'
      ? 'A few practice words are enough...'
      : currentPrompt.placeholder;
  const minimumTextCharacters =
    phase === 'warmup' ? 3 : MIN_TEXT_RESPONSE_CHARACTERS;
  const microphoneFallback =
    !micAvailability?.supported ||
    micStatus === 'denied' ||
    micStatus === 'unsupported' ||
    micStatus === 'error';
  const orbScale = 1 + Math.min(0.32, volume * 0.32);
  const demoCapture = captureMode === 'simulated';
  const coreMinimumReached =
    phase === 'task' && elapsedSeconds >= MIN_CORE_RECORDING_SECONDS;

  return (
    <div className="min-h-screen bg-navy text-white flex flex-col relative overflow-hidden">
      {phase !== 'processing' && (
        <header className="absolute top-0 left-0 right-0 px-5 py-5 sm:px-8 z-30 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Leave voice reflection"
            className="min-h-11 min-w-11 rounded-full text-white/75 hover:text-white hover:bg-white/10 transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
          >
            <ArrowLeft size={23} />
          </button>

          <div className="flex items-center gap-2">
            {isCapturing && (
              <button
                type="button"
                onClick={togglePause}
                aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
                className="min-h-11 min-w-11 rounded-full text-white/75 hover:text-white hover:bg-white/10 transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
              >
                {isPaused ? <Play size={21} /> : <Pause size={21} />}
              </button>
            )}
            <button
              type="button"
              onClick={toggleSound}
              aria-label={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
              className="min-h-11 min-w-11 rounded-full text-white/75 hover:text-white hover:bg-white/10 transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
            >
              {soundEnabled ? <Volume2 size={21} /> : <VolumeX size={21} />}
            </button>
          </div>
        </header>
      )}

      {phase === 'intro' && (
        <main className="flex-1 w-full max-w-xl mx-auto px-6 pt-28 pb-12 flex flex-col justify-center animate-in fade-in duration-500">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan">
              <Mic size={15} />
              Weekly check-in · Language
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight">
                Let&apos;s take a quiet moment to talk.
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed text-white/75">
                Share a place, person, or memory that matters to you. There is no right way to
                answer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4 flex gap-3 items-start">
                <Clock3 className="text-cyan mt-0.5 shrink-0" size={21} />
                <div>
                  <p className="font-semibold">About 3 minutes</p>
                  <p className="text-sm text-white/60 mt-1">Setup + two rounds, up to 60 sec each</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4 flex gap-3 items-start">
                <ShieldCheck className="text-cyan mt-0.5 shrink-0" size={21} />
                <div>
                  <p className="font-semibold">Your choice</p>
                  <p className="text-sm text-white/60 mt-1">Pause, use text, or skip the mic</p>
                </div>
              </div>
            </div>

            <Button
              onClick={beginWarmup}
              className="w-full h-16 rounded-2xl bg-cyan text-navy hover:bg-cyan/90 text-lg font-bold shadow-lg shadow-cyan/10"
            >
              Begin with a practice round
            </Button>
            <p className="text-xs leading-relaxed text-white/45">
              Demo only · Nothing is uploaded · The result is scripted and is not real voice
              analysis.
            </p>
          </div>
        </main>
      )}

      {(phase === 'warmup' || phase === 'task') && (
        <main className="flex-1 w-full max-w-3xl mx-auto px-5 pt-28 pb-10 flex flex-col items-center animate-in fade-in duration-500">
          <div className="w-full max-w-2xl text-center space-y-4">
            <div
              aria-live="polite"
              className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-cyan"
            >
              {phase === 'warmup' ? (
                <>
                  <span className="rounded-full bg-cyan/15 px-3 py-1">Practice round</span>
                  <span className="text-white/45">Doesn&apos;t count</span>
                </>
              ) : (
                <>
                  <span className="rounded-full bg-cyan/15 px-3 py-1">
                    Round {currentRound + 1} of {CORE_ROUNDS.length}
                  </span>
                  {warmupComplete && <span className="text-white/45">Warm-up complete</span>}
                </>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight">
              {phase === 'warmup' ? "Let's try it once together." : prompt}
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed text-white/70 max-w-xl mx-auto">
              {promptSupport}
            </p>
          </div>

          <div className="w-full max-w-2xl mt-7 rounded-2xl border border-white/15 bg-white/5 px-4 py-4 sm:px-5 flex items-center justify-between gap-4">
            <p className="text-base sm:text-lg leading-relaxed text-white/90">{prompt}</p>
            {soundEnabled && speechAvailable && (
              <button
                type="button"
                onClick={() => handleReadPrompt(prompt)}
                aria-label="Read this prompt aloud"
                className="min-h-11 min-w-11 shrink-0 rounded-full border border-cyan/40 text-cyan hover:bg-cyan/10 inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
              >
                <Volume2 size={21} />
              </button>
            )}
          </div>

          {audioNotice && (
            <div
              role="status"
              className="w-full max-w-2xl mt-4 rounded-2xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm leading-relaxed text-white/85"
            >
              {audioNotice}
            </div>
          )}

          {captureMode === 'reflection' ? (
            <section className="w-full max-w-2xl mt-8 rounded-3xl border border-white/15 bg-white/5 p-5 sm:p-7">
              <div className="flex items-center gap-3 text-cyan mb-4">
                <Type size={22} />
                <h2 className="text-lg font-semibold text-white">
                  Type your response instead
                </h2>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-white/65">
                Accessibility alternative: respond in writing to the prompt above. This demo does
                not recognize speech or words.
              </p>
              <textarea
                value={reflection}
                onChange={(event) => setReflection(event.target.value.slice(0, 1200))}
                aria-label={`Written response for ${prompt}`}
                placeholder={textPlaceholder}
                className="w-full min-h-40 rounded-2xl border border-white/20 bg-navy/50 p-4 text-base leading-relaxed text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan resize-y"
              />
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-white/55">
                  {phase === 'warmup'
                    ? 'A few words are enough for practice.'
                    : `Share at least ${MIN_TEXT_RESPONSE_CHARACTERS} characters so your response has some detail.`}
                  <span className="block mt-1 text-white/40">
                    {reflection.trim().length} characters
                  </span>
                </p>
                <Button
                  onClick={handleReflectionSubmit}
                  disabled={reflection.trim().length < minimumTextCharacters}
                  className="w-full sm:w-auto min-h-14 px-7 rounded-2xl bg-cyan text-navy hover:bg-cyan/90 font-bold"
                >
                  {phase === 'warmup'
                    ? 'Continue to round 1'
                    : currentRound === CORE_ROUNDS.length - 1
                      ? 'Finish this reflection'
                      : 'Continue to round 2'}
                </Button>
              </div>
            </section>
          ) : microphoneFallback && !isCapturing && captureMode !== 'simulated' ? (
            <section className="w-full max-w-2xl mt-8 rounded-3xl border border-cyan/30 bg-white/8 p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <Mic className="text-cyan mt-1 shrink-0" size={24} />
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">The microphone is not available</h2>
                  <p className="text-sm sm:text-base leading-relaxed text-white/70">
                    {micStatus === 'denied'
                      ? 'Permission was declined. You are in control: try the permission again or continue without recording.'
                      : 'This browser or connection does not support microphone audio here.'}
                  </p>
                  <p className="text-sm leading-relaxed text-white/55">
                    Microphone input is not saved or uploaded, and no real analysis is performed.
                  </p>
                  {phase === 'warmup' && (
                    <p className="text-sm leading-relaxed text-cyan/90">
                      Choose an option below for your uncounted practice round. The two prompt
                      rounds come next.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <Button
                  onClick={retryMicrophone}
                  className="min-h-14 rounded-2xl bg-cyan text-navy hover:bg-cyan/90 font-bold"
                >
                  <RotateCcw size={19} />
                  Try microphone again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => chooseAlternative('reflection')}
                  className="min-h-14 rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold"
                >
                  <Type size={19} />
                  Type a response instead (accessibility)
                </Button>
                <button
                  type="button"
                  onClick={() => chooseAlternative('simulated')}
                  className="min-h-11 rounded-xl text-sm font-semibold text-cyan/90 underline underline-offset-4 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                >
                  Use simulated demo alternative (no recording)
                </button>
              </div>
            </section>
          ) : (
            <section className="w-full max-w-2xl mt-5 flex flex-col items-center">
              <div className="relative flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80">
                <div
                  className={`absolute inset-5 rounded-full border border-cyan/20 ${
                    isCapturing && !isPaused ? 'animate-[spin_16s_linear_infinite]' : ''
                  }`}
                />
                <div
                  className={`absolute inset-12 rounded-full border border-cyan/25 ${
                    isCapturing && !isPaused
                      ? 'animate-[spin_11s_linear_infinite_reverse]'
                      : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={handleOrbClick}
                  disabled={isRequesting || isPaused}
                  aria-label={
                    isCapturing
                      ? phase === 'task' && !coreMinimumReached
                        ? `Keep speaking; finish is available after ${MIN_CORE_RECORDING_SECONDS} seconds`
                        : 'Finish this response'
                      : phase === 'warmup'
                        ? 'Start practice recording'
                        : 'Start voice reflection'
                  }
                  className="relative z-10 w-48 h-48 sm:w-56 sm:h-56 rounded-full border-2 border-cyan/70 bg-cyan/15 text-cyan shadow-[0_0_80px_rgba(27,206,223,0.16)] transition-transform duration-300 hover:scale-[1.03] disabled:cursor-default disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan/40"
                  style={{ transform: `scale(${orbScale})` }}
                >
                  <span className="absolute inset-4 rounded-full bg-cyan/10" />
                  <span className="relative z-10 flex flex-col items-center justify-center gap-3">
                    {isRequesting ? (
                      <span className="text-base font-semibold">Opening microphone…</span>
                    ) : isCapturing ? (
                      <>
                        <span className="flex items-end justify-center gap-1 h-11" aria-hidden="true">
                          {waveform.map((bar, index) => (
                            <span
                              key={index}
                              className="w-1.5 rounded-full bg-cyan transition-[height] duration-100"
                              style={{
                                height: `${12 + bar * 38 + volume * 12}px`,
                              }}
                            />
                          ))}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-[0.16em]">
                          {phase === 'task' && !coreMinimumReached
                            ? 'Keep speaking'
                            : 'Tap to finish'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Mic size={43} strokeWidth={1.5} />
                        <span className="text-xs font-bold uppercase tracking-[0.16em]">
                          Tap to speak
                        </span>
                      </>
                    )}
                  </span>
                </button>
              </div>

              <div className="text-center -mt-2 space-y-3">
                <p className="text-base text-white/70">
                  {isCapturing
                    ? demoCapture
                      ? 'Demo waveform · no microphone is being used.'
                      : 'The light responds to your voice. Tap again whenever you are ready.'
                    : 'There is plenty of time. Start whenever you feel ready.'}
                </p>
                {isCapturing && (
                  <>
                    <p className="text-sm text-white/50 tabular-nums">
                      {isPaused ? 'Paused at ' : 'Elapsed · '}
                      {formatTime(elapsedSeconds)} <span className="text-white/35">/ 1:00</span>
                    </p>
                    {phase === 'task' && !coreMinimumReached && !isPaused && (
                      <p className="text-sm text-cyan/80">
                        Take your time; you can finish after 0:20.
                      </p>
                    )}
                  </>
                )}
                {demoCapture && (
                  <p className="text-xs text-cyan/90">
                    Simulated demo · nothing is recorded or analyzed.
                  </p>
                )}
              </div>
              {!isCapturing && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => chooseAlternative('reflection')}
                    className="mt-6 min-h-12 rounded-2xl border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white font-semibold"
                  >
                    <Type size={18} />
                    Type a response instead (accessibility)
                  </Button>
                  {captureMode !== 'simulated' && (
                    <button
                      type="button"
                      onClick={() => chooseAlternative('simulated')}
                      className="mt-3 min-h-11 rounded-xl text-sm font-semibold text-cyan/90 underline underline-offset-4 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                    >
                      Use simulated demo alternative (no recording)
                    </button>
                  )}
                </>
              )}
            </section>
          )}

          <div className="mt-auto pt-8 text-center max-w-xl">
            <p className="text-xs leading-relaxed text-white/40">
              Demo only · No recordings are uploaded · This experience does not recognize words or
              perform real analysis.
            </p>
          </div>
        </main>
      )}

      {isPaused && isCapturing && (
        <div className="absolute inset-0 z-40 bg-navy/92 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-300">
          <div className="rounded-full bg-cyan/15 p-5 text-cyan mb-6">
            <Pause size={32} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold">Take your time.</h2>
          <p className="mt-3 text-lg text-white/70">The clock and listening display are paused.</p>
          <Button
            onClick={togglePause}
            className="mt-8 min-h-14 px-9 rounded-2xl bg-cyan text-navy hover:bg-cyan/90 text-lg font-bold"
          >
            <Play size={20} />
            Resume when ready
          </Button>
        </div>
      )}

      {phase === 'processing' && (
        <div className="absolute inset-0 z-50 bg-background text-foreground">
          <ProcessingSequence domain="language" modality="voice" onComplete={handleProcessingComplete} />
        </div>
      )}
    </div>
  );
}
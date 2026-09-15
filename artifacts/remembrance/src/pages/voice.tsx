import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useDemoState } from '@/lib/store';
import { ProcessingSequence } from '@/components/tasks';
import { ArrowLeft, Mic, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VoiceTest() {
  const [, setLocation] = useLocation();
  const { updateDomainScore } = useDemoState();
  
  const [phase, setPhase] = useState<'intro' | 'prompt' | 'recording' | 'processing'>('intro');
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(0);
  const [hasMic, setHasMic] = useState<boolean | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const startRecording = async () => {
    if (isPaused) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasMic(true);
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolume(avg);
        rafRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
      setPhase('recording');
    } catch (err) {
      console.warn("Mic access denied or unsupported", err);
      setHasMic(false);
      setPhase('recording');
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phase === 'recording' && hasMic === false && !isPaused) {
      interval = setInterval(() => setVolume(Math.random() * 80 + 20), 150);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase, hasMic, isPaused]);

  const stopRecording = () => {
    if (isPaused) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setPhase('processing');
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleProcessingComplete = () => {
    updateDomainScore('language', 18);
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col relative overflow-hidden text-white">
      {phase !== 'processing' && (
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
          <button onClick={() => window.history.back()} className="p-2 text-white/50 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft />
          </button>
          
          {(phase === 'prompt' || phase === 'recording') && (
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 text-white/50 hover:bg-white/10 rounded-full transition-colors"
              title="Pause test"
            >
              {isPaused ? <Play /> : <Pause />}
            </button>
          )}
        </div>
      )}

      {phase === 'intro' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 max-w-md mx-auto w-full text-center z-10 animate-in fade-in duration-500">
          <div className="inline-flex items-center justify-center px-3 py-1 bg-white/10 text-white/70 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            Practice Round
          </div>
          <h1 className="text-3xl font-bold">First, let's test your microphone.</h1>
          <p className="text-white/70 font-medium text-lg">Just tap the microphone and say "Hello."</p>
          
          <Button 
            onClick={() => setPhase('prompt')}
            className="h-16 text-xl bg-cyan hover:bg-cyan/90 text-navy font-bold rounded-2xl shadow-md transition-all mt-8 w-full"
          >
            I'm ready
          </Button>
        </div>
      )}

      {(phase === 'prompt' || phase === 'recording') && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-16 max-w-2xl mx-auto w-full text-center z-10 animate-in fade-in duration-700">
          
          <div className="space-y-6">
            <h1 className="text-3xl md:text-5xl font-medium leading-tight">
              Tell me about a place you love, in as much detail as you'd like.
            </h1>
            <p className="text-white/50 text-lg font-medium">
              No right answers here. Just talk.
            </p>
          </div>

          <div className="relative flex justify-center py-12">
            <div className={`absolute inset-0 rounded-full border border-white/10 ${!isPaused && 'animate-[spin_10s_linear_infinite]'}`} />
            <div className={`absolute inset-4 rounded-full border border-cyan/10 ${!isPaused && 'animate-[spin_15s_linear_infinite_reverse]'}`} />

            <button 
              onClick={() => phase === 'prompt' ? startRecording() : stopRecording()}
              disabled={isPaused}
              className={`relative z-10 w-32 h-32 rounded-full bg-cyan/20 border-2 border-cyan/50 flex flex-col items-center justify-center transition-transform ${!isPaused && 'hover:scale-105'}`}
            >
              {phase === 'prompt' ? (
                <>
                  <Mic className="w-10 h-10 text-cyan mb-2" />
                  <span className="text-xs font-bold text-cyan uppercase tracking-widest">Tap to speak</span>
                </>
              ) : (
                <>
                  <div 
                    className={`absolute inset-0 bg-cyan/30 rounded-full transition-all duration-100 ease-out`}
                    style={{ transform: `scale(${isPaused ? 1 : 1 + (volume / 200)})`, opacity: isPaused ? 0.5 : 0.5 + (volume / 200) }}
                  />
                  <div className={`w-6 h-6 bg-cyan rounded-sm relative z-20 ${!isPaused && 'animate-pulse'}`} />
                  <span className="absolute -bottom-8 text-xs font-bold text-cyan uppercase tracking-widest whitespace-nowrap">Tap to stop</span>
                </>
              )}
            </button>
          </div>
          
          <div className="absolute bottom-6 left-0 w-full text-center">
            <p className="text-xs text-white/30 font-medium">Demo note: Results are simulated. No real analysis is performed.</p>
          </div>
        </div>
      )}

      {isPaused && (
        <div className="absolute inset-0 bg-navy/90 z-40 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in zoom-in-95">
          <h2 className="text-3xl font-bold text-white mb-4">Take your time.</h2>
          <p className="text-white/70 mb-8 font-medium">Ready when you are.</p>
          <Button 
            onClick={() => setIsPaused(false)}
            className="h-14 px-8 bg-cyan text-navy rounded-2xl text-lg font-bold"
          >
            Resume
          </Button>
        </div>
      )}

      {phase === 'processing' && (
        <div className="absolute inset-0 z-50 bg-background text-foreground">
          <ProcessingSequence onComplete={handleProcessingComplete} />
        </div>
      )}
    </div>
  );
}

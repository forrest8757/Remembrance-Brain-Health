import React, { useState, useEffect, useRef } from 'react';
import { useDemoState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Volume2, Check, RefreshCw, Pause, Play } from 'lucide-react';

export function TaskShell({ 
  title, 
  instruction, 
  onComplete,
  children,
  isWarmup = false,
  onSkipWarmup,
  isPaused,
  onTogglePause
}: { 
  title: string; 
  instruction: string; 
  onComplete: () => void;
  children: React.ReactNode;
  isWarmup?: boolean;
  onSkipWarmup?: () => void;
  isPaused?: boolean;
  onTogglePause?: (paused: boolean) => void;
}) {
  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto relative">
      <div className="flex-none p-6 text-center space-y-4">
        {isWarmup && (
          <div className="inline-flex items-center justify-center px-3 py-1 bg-navy/5 text-navy/60 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            Practice Round
          </div>
        )}
        <div className="relative">
          <h2 className="text-2xl font-bold text-navy flex items-center justify-center gap-3">
            {instruction}
            <button className="p-2 bg-navy/5 hover:bg-navy/10 rounded-full text-navy transition-colors">
              <Volume2 size={20} />
            </button>
          </h2>
          
          {onTogglePause && (
            <button 
              onClick={() => onTogglePause(!isPaused)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-navy/5 hover:bg-navy/10 rounded-full text-navy transition-colors"
              title="Pause test"
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 relative flex flex-col items-center justify-center p-6">
        {children}
        
        {isPaused && (
          <div className="absolute inset-0 bg-background/90 z-40 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in zoom-in-95 rounded-3xl">
            <h2 className="text-3xl font-bold text-navy mb-4">Take your time.</h2>
            <p className="text-navy/70 mb-8 font-medium">Ready when you are.</p>
            <Button 
              onClick={() => onTogglePause && onTogglePause(false)}
              className="h-14 px-8 bg-navy text-white rounded-2xl text-lg font-bold"
            >
              Resume
            </Button>
          </div>
        )}
      </div>

      {isWarmup && onSkipWarmup && (
        <div className="flex-none p-6 text-center">
          <button onClick={onSkipWarmup} className="text-sm font-bold text-navy/40 hover:text-navy/70">
            Skip practice
          </button>
        </div>
      )}
    </div>
  );
}

export function FocusField({ onComplete, isWarmup = false }: { onComplete: () => void, isWarmup?: boolean }) {
  const [shapes, setShapes] = useState<{id: number, type: 'circle'|'square', color: 'cyan'|'navy', x: number, y: number, active: boolean}[]>([]);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const target = isWarmup ? 1 : 5;

  useEffect(() => {
    if (isPaused) return;

    if (score >= target) {
      const t = setTimeout(onComplete, 1000);
      return () => clearTimeout(t);
    }

    const interval = setInterval(() => {
      if (shapes.filter(s => s.active).length < 3) {
        const isTarget = isWarmup ? true : Math.random() > 0.5;
        const newShape = {
          id: Date.now(),
          type: isTarget ? 'circle' : (Math.random() > 0.5 ? 'circle' : 'square'),
          color: isTarget ? 'cyan' : 'navy',
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 80,
          active: true
        };
        if (newShape.color === 'cyan') newShape.type = 'circle';
        
        setShapes(s => [...s, newShape as any]);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [shapes, score, target, onComplete, isPaused, isWarmup]);

  const handleTap = (id: number, type: string, color: string) => {
    if (isPaused) return;
    setShapes(s => s.map(shape => shape.id === id ? { ...shape, active: false } : shape));
    if (type === 'circle' && color === 'cyan') {
      setScore(s => s + 1);
    }
  };

  return (
    <TaskShell 
      title="Focus Field" 
      instruction="Tap the blue circles. Ignore the rest." 
      onComplete={onComplete}
      isWarmup={isWarmup}
      onSkipWarmup={isWarmup ? onComplete : undefined}
      isPaused={isPaused}
      onTogglePause={setIsPaused}
    >
      <div className="w-full aspect-square max-w-[400px] bg-white rounded-3xl border border-border relative overflow-hidden shadow-sm">
        {shapes.map(shape => (
          shape.active && (
            <button
              key={shape.id}
              onClick={() => handleTap(shape.id, shape.type, shape.color)}
              className={`absolute w-16 h-16 -ml-8 -mt-8 transition-all duration-500 ease-out animate-in zoom-in fade-in
                ${shape.type === 'circle' ? 'rounded-full' : 'rounded-2xl'}
                ${shape.color === 'cyan' ? 'bg-cyan hover:bg-cyan/80 shadow-[0_0_15px_rgba(27,206,223,0.5)]' : 'bg-navy hover:bg-navy/80'}
              `}
              style={{ left: `${shape.x}%`, top: `${shape.y}%` }}
            />
          )
        ))}
        {score >= target && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center animate-in fade-in z-20">
            <div className="text-2xl font-bold text-navy flex items-center gap-2">
              <Check className="text-cyan" size={32} /> Nicely done.
            </div>
          </div>
        )}
      </div>
    </TaskShell>
  );
}

export function ConnectPath({ onComplete, isWarmup = false }: { onComplete: () => void, isWarmup?: boolean }) {
  const [isPaused, setIsPaused] = useState(false);
  const nodes = isWarmup 
    ? [{ id: '1', label: '1' }, { id: 'A', label: 'A' }, { id: '2', label: '2' }]
    : [{ id: '1', label: '1' }, { id: 'A', label: 'A' }, { id: '2', label: '2' }, { id: 'B', label: 'B' }, { id: '3', label: '3' }, { id: 'C', label: 'C' }];
  
  const positions = [
    { x: 20, y: 20 }, { x: 80, y: 30 },
    { x: 40, y: 60 }, { x: 70, y: 80 },
    { x: 20, y: 80 }, { x: 80, y: 50 }
  ];

  const [activeIdx, setActiveIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const getContainerCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent | MouseEvent).clientX;
      clientY = (e as React.MouseEvent | MouseEvent).clientY;
    }
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent, idx: number) => {
    if (isPaused) return;
    if (idx === activeIdx) {
      setIsDragging(true);
      setDragPos(getContainerCoords(e));
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPaused) return;
    if (isDragging) {
      const pos = getContainerCoords(e);
      setDragPos(pos);

      const nextPos = positions[activeIdx + 1];
      if (nextPos) {
        const dist = Math.sqrt(Math.pow(pos.x - nextPos.x, 2) + Math.pow(pos.y - nextPos.y, 2));
        if (dist < 15) {
          const next = activeIdx + 1;
          setActiveIdx(next);
          if (next === nodes.length - 1) {
            setIsDragging(false);
            setTimeout(onComplete, 1000);
          }
        }
      }
    }
  };

  const handlePointerUp = () => {
    if (isDragging) setIsDragging(false);
  };

  return (
    <TaskShell 
      title="Connect Path" 
      instruction={isWarmup ? "Connect 1 to A to 2." : "Connect numbers and letters in order (1, A, 2, B...)."}
      onComplete={onComplete}
      isWarmup={isWarmup}
      onSkipWarmup={isWarmup ? onComplete : undefined}
      isPaused={isPaused}
      onTogglePause={setIsPaused}
    >
      <div 
        ref={containerRef}
        className="w-full aspect-square max-w-[400px] bg-white rounded-3xl border border-border relative shadow-sm touch-none"
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onTouchCancel={handlePointerUp}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
          {nodes.map((_, i) => {
            if (i < activeIdx) {
              const p1 = positions[i];
              const p2 = positions[i+1];
              if (!p2) return null;
              return (
                <line key={`line-${i}`} x1={`${p1.x}%`} y1={`${p1.y}%`} x2={`${p2.x}%`} y2={`${p2.y}%`} stroke="#1BCEDF" strokeWidth="6" strokeLinecap="round" className="animate-in fade-in drop-shadow-[0_0_8px_rgba(27,206,223,0.5)]" />
              );
            }
            return null;
          })}
          {isDragging && activeIdx < nodes.length - 1 && (
            <line x1={`${positions[activeIdx].x}%`} y1={`${positions[activeIdx].y}%`} x2={`${dragPos.x}%`} y2={`${dragPos.y}%`} stroke="#1BCEDF" strokeWidth="6" strokeLinecap="round" strokeOpacity={0.6} />
          )}
        </svg>

        {nodes.map((node, i) => (
          <button
            key={node.id}
            onMouseDown={(e) => handlePointerDown(e, i)}
            onTouchStart={(e) => handlePointerDown(e, i)}
            onClick={() => {
              if (isPaused) return;
              if (i === activeIdx) {
                const next = activeIdx + 1;
                setActiveIdx(next);
                if (next === nodes.length - 1) setTimeout(onComplete, 1000);
              }
            }}
            className={`absolute w-14 h-14 -ml-7 -mt-7 rounded-full flex items-center justify-center text-xl font-bold transition-all z-10 shadow-sm
              ${i < activeIdx ? 'bg-cyan text-navy border-2 border-cyan scale-90' : 
                i === activeIdx ? 'bg-white text-navy border-2 border-navy hover:bg-navy/5 animate-pulse' : 
                'bg-white text-navy/40 border-2 border-navy/20'}
            `}
            style={{ left: `${positions[i].x}%`, top: `${positions[i].y}%` }}
          >
            {node.label}
          </button>
        ))}
        {activeIdx === nodes.length - 1 && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center animate-in fade-in z-20 rounded-3xl">
            <div className="text-2xl font-bold text-navy flex items-center gap-2">
              <Check className="text-cyan" size={32} /> Perfect path.
            </div>
          </div>
        )}
      </div>
    </TaskShell>
  );
}

export function RecallChain({ onComplete, isWarmup = false }: { onComplete: () => void, isWarmup?: boolean }) {
  const [isPaused, setIsPaused] = useState(false);
  const words = ["Apple", "Train", "Garden", "Chair", "River"];
  const distractors = ["Cloud", "Book", "Window", "Bridge", "Music", "Road", "Bird"];
  
  const [phase, setPhase] = useState<'learn'|'distractor'|'recall'|'delayed-recall'|'complete'>('learn');
  const [learnIdx, setLearnIdx] = useState(0);
  const [recalled, setRecalled] = useState<string[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [distractorTime, setDistractorTime] = useState(20);

  useEffect(() => {
    if (isPaused) return;
    let timer: NodeJS.Timeout;

    if (phase === 'learn') {
      if (learnIdx < words.length) {
        timer = setTimeout(() => setLearnIdx(i => i + 1), 2000);
      } else {
        timer = setTimeout(() => {
          setPhase('distractor');
        }, 1000);
      }
    } else if (phase === 'distractor') {
      if (distractorTime > 0) {
        timer = setTimeout(() => setDistractorTime(t => t - 1), 1000);
      } else {
        setOptions([...words, ...distractors.slice(0, 4)].sort(() => Math.random() - 0.5));
        setPhase('recall');
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [phase, learnIdx, isPaused, distractorTime]);

  const handleRecall = (word: string) => {
    if (isPaused) return;
    if (!recalled.includes(word)) {
      const newRecalled = [...recalled, word];
      setRecalled(newRecalled);
      
      if (newRecalled.filter(w => words.includes(w)).length === words.length || newRecalled.length >= 6) {
        if (phase === 'recall') {
          setTimeout(() => {
            setPhase('delayed-recall');
            setRecalled([]);
            setOptions([...words, ...distractors.slice(3, 8)].sort(() => Math.random() - 0.5));
          }, 1500);
        } else {
          setTimeout(() => setPhase('complete'), 1500);
          setTimeout(onComplete, 2500);
        }
      }
    }
  };

  const getInstruction = () => {
    switch (phase) {
      case 'learn': return "Just take these in. No need to do anything yet.";
      case 'distractor': return "Let's do something else for a moment.";
      case 'recall': return "Which of these do you remember? Tap them.";
      case 'delayed-recall': return "Earlier we looked at five words. Any come back to you?";
      case 'complete': return "All done.";
    }
  };

  return (
    <TaskShell 
      title="Recall Chain" 
      instruction={getInstruction()}
      onComplete={onComplete}
      isPaused={isPaused}
      onTogglePause={setIsPaused}
    >
      <div className="w-full max-w-md h-64 flex flex-col items-center justify-center">
        {phase === 'learn' && learnIdx < words.length && (
          <div className="text-5xl font-bold text-navy animate-in zoom-in fade-in duration-500 text-center">
            {words[learnIdx]}
          </div>
        )}

        {phase === 'distractor' && (
          <div className="animate-in fade-in space-y-4 text-center">
            <p className="text-xl font-bold text-navy">Relax your mind.</p>
            <div className="w-16 h-16 mx-auto bg-cyan/10 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-cyan tabular-nums">{distractorTime}</span>
            </div>
          </div>
        )}
        
        {(phase === 'recall' || phase === 'delayed-recall') && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-wrap justify-center gap-3">
              {options.map(word => {
                const isSelected = recalled.includes(word);
                const isCorrect = words.includes(word);
                return (
                  <button
                    key={word}
                    onClick={() => handleRecall(word)}
                    disabled={isSelected}
                    className={`px-6 py-3 rounded-2xl text-lg font-bold border-2 transition-all
                      ${isSelected 
                        ? (isCorrect ? 'bg-cyan text-navy border-cyan scale-105 shadow-md' : 'bg-transparent text-navy/30 border-border') 
                        : 'bg-white text-navy border-border hover:border-navy/30 hover:bg-navy/5'
                      }
                    `}
                  >
                    {word}
                  </button>
                )
              })}
            </div>
            
            {recalled.filter(w => words.includes(w)).length === words.length && (
              <div className="text-xl font-bold text-navy flex items-center justify-center gap-2 pt-4">
                <Check className="text-cyan" size={24} /> You got them all.
              </div>
            )}
          </div>
        )}

        {phase === 'complete' && (
          <div className="text-2xl font-bold text-navy flex items-center justify-center gap-2 animate-in fade-in">
            <Check className="text-cyan" size={32} /> Beautifully done.
          </div>
        )}
      </div>
    </TaskShell>
  );
}

export function NameMatch({ onComplete, isWarmup = false }: { onComplete: () => void, isWarmup?: boolean }) {
  const [isPaused, setIsPaused] = useState(false);
  const images = [
    { name: "Chair", alt: "A wooden chair" },
    { name: "Tree", alt: "A green tree" },
    { name: "House", alt: "A small house" },
    { name: "Dog", alt: "A friendly dog" }
  ];
  const target = isWarmup ? images[0] : images[1];
  
  const [phase, setPhase] = useState<'match' | 'fluency' | 'complete'>('match');
  const [doneMatch, setDoneMatch] = useState(false);
  const [fluencyTime, setFluencyTime] = useState(30);
  const [bubbles, setBubbles] = useState<string[]>([]);

  useEffect(() => {
    if (isPaused) return;
    let timer: NodeJS.Timeout;

    if (phase === 'fluency') {
      if (fluencyTime > 0) {
        timer = setTimeout(() => setFluencyTime(t => t - 1), 1000);
        // Simulate speech recognition adding bubbles
        if (fluencyTime % 3 === 0 && fluencyTime < 30 && bubbles.length < 5) {
          const fruits = ["Apple", "Banana", "Orange", "Grape", "Pear"];
          setBubbles(b => [...b, fruits[b.length]]);
        }
      } else {
        setPhase('complete');
        setTimeout(onComplete, 1500);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [phase, fluencyTime, isPaused, bubbles]);

  const handleMatch = (name: string) => {
    if (isPaused) return;
    if (name === target.name) {
      setDoneMatch(true);
      if (isWarmup) {
        setTimeout(onComplete, 1000);
      } else {
        setTimeout(() => {
          setPhase('fluency');
        }, 1500);
      }
    }
  };

  const getInstruction = () => {
    if (phase === 'match') return `Tap the picture that matches: "${target.name.toUpperCase()}"`;
    if (phase === 'fluency') return "Name as many fruits as you can aloud.";
    return "Well done.";
  };

  return (
    <TaskShell 
      title="Name & Match" 
      instruction={getInstruction()}
      onComplete={onComplete}
      isWarmup={isWarmup}
      onSkipWarmup={isWarmup ? onComplete : undefined}
      isPaused={isPaused}
      onTogglePause={setIsPaused}
    >
      {phase === 'match' && (
        <div className="grid grid-cols-2 gap-4 w-full max-w-[400px]">
          {images.map(img => (
            <button
              key={img.name}
              onClick={() => handleMatch(img.name)}
              className={`aspect-square bg-white rounded-3xl border-2 flex items-center justify-center transition-all shadow-sm
                ${doneMatch && img.name === target.name ? 'border-cyan bg-cyan/5 scale-105 shadow-lg' : 'border-border hover:border-navy/20 hover:bg-navy/5'}
              `}
            >
              <span className="text-2xl font-bold text-navy">{img.name}</span>
            </button>
          ))}
          {doneMatch && (
            <div className="col-span-2 mt-4 text-xl font-bold text-navy flex items-center justify-center gap-2 animate-in fade-in">
              <Check className="text-cyan" size={24} /> Spot on.
            </div>
          )}
        </div>
      )}

      {phase === 'fluency' && (
        <div className="w-full max-w-md flex flex-col items-center animate-in fade-in">
          <p className="mb-6 text-center text-navy/70">Demo: the words below are examples, not a transcription of your voice.</p>
          <div className="w-16 h-16 rounded-full border-4 border-cyan/20 flex items-center justify-center mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-t-cyan border-r-cyan border-transparent animate-[spin_2s_linear_infinite]" />
            <span className="font-bold text-xl text-navy">{fluencyTime}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-3 min-h-[100px]">
            {bubbles.map(b => (
              <div key={b} className="px-4 py-2 bg-cyan/10 border border-cyan/30 text-navy font-bold rounded-full animate-in zoom-in-50 spring-bouce">
                {b}
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'complete' && (
        <div className="text-2xl font-bold text-navy flex items-center justify-center gap-2 animate-in fade-in">
          <Check className="text-cyan" size={32} /> Great work.
        </div>
      )}
    </TaskShell>
  );
}

export function DrawCopy({ onComplete, isWarmup = false }: { onComplete: () => void, isWarmup?: boolean }) {
  const [isPaused, setIsPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState<'clock' | 'figure' | 'complete'>(isWarmup ? 'clock' : 'clock');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [history, setHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1BCEDF'; 
        ctx.lineWidth = 6;
      }
    }
  }, [phase]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      }
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!isDrawing || isPaused) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPaused) return;
    setIsDrawing(true);
    saveHistory();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.beginPath();
    draw(e);
  };

  const endDraw = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const handleUndo = () => {
    if (isPaused) return;
    if (history.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        const lastState = history[history.length - 1];
        ctx.putImageData(lastState, 0, 0);
        setHistory(prev => prev.slice(0, -1));
      }
    }
  };

  const handleDone = () => {
    if (isWarmup || phase === 'figure') {
      setDone(true);
      setTimeout(onComplete, 1000);
    } else {
      setPhase('figure');
      setHistory([]);
    }
  };

  return (
    <TaskShell 
      title="Draw & Copy" 
      instruction={isWarmup ? "Trace a circle." : (phase === 'clock' ? "Draw a clock showing ten past eleven." : "Copy the figure below.")}
      onComplete={onComplete}
      isWarmup={isWarmup}
      onSkipWarmup={isWarmup ? onComplete : undefined}
      isPaused={isPaused}
      onTogglePause={setIsPaused}
    >
      <div className="w-full flex flex-col items-center gap-6">
        {phase === 'figure' && !isWarmup && (
          <div className="w-[150px] h-[150px] border-2 border-navy/20 rounded-xl flex items-center justify-center mb-2">
            <svg viewBox="0 0 100 100" className="w-24 h-24 stroke-navy fill-transparent" strokeWidth={4}>
              <rect x="20" y="20" width="60" height="60" />
              <line x1="20" y1="20" x2="80" y2="80" />
              <line x1="80" y1="20" x2="20" y2="80" />
            </svg>
          </div>
        )}

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="bg-white rounded-3xl border-2 border-border shadow-sm touch-none cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <button 
            onClick={handleUndo} 
            disabled={history.length === 0 || done || isPaused}
            className="absolute -top-4 -right-4 bg-white border border-border text-navy rounded-full p-3 shadow-md hover:bg-navy/5 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={20} className="rotate-180 scale-x-[-1]" />
          </button>
        </div>

        {!done ? (
          <Button 
            onClick={handleDone}
            className="w-full max-w-[300px] h-14 bg-navy hover:bg-navy/90 text-white rounded-2xl text-lg font-bold"
          >
            I'm done drawing
          </Button>
        ) : (
          <div className="h-14 flex items-center justify-center text-xl font-bold text-navy gap-2 animate-in fade-in">
            <Check className="text-cyan" size={24} /> Lovely.
          </div>
        )}
      </div>
    </TaskShell>
  );
}

export function ProcessingSequence({ onComplete }: { onComplete: () => void }) {
  const { state } = useDemoState();
  const speed = state.demoSpeed;
  const time = speed === 'skip' ? 500 : (speed === 'fast' ? 3000 : 30000);
  const [phase, setPhase] = useState(0);
  const captions = ["Processing responses...", "Analyzing patterns...", "Updating your Remembrance Score..."];

  useEffect(() => {
    let t1: NodeJS.Timeout, t2: NodeJS.Timeout, t3: NodeJS.Timeout;
    
    if (speed === 'skip') {
      t3 = setTimeout(onComplete, 500);
    } else {
      const phaseTime = time / 3;
      t1 = setTimeout(() => setPhase(1), phaseTime);
      t2 = setTimeout(() => setPhase(2), phaseTime * 2);
      t3 = setTimeout(onComplete, time);
    }

    return () => { 
      if (t1) clearTimeout(t1); 
      if (t2) clearTimeout(t2); 
      if (t3) clearTimeout(t3); 
    };
  }, [speed, time, onComplete]);

  return (
    <div className="absolute inset-0 bg-background z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
      <div className="w-48 h-48 relative mb-12">
        <div className="absolute inset-0 rounded-full border-4 border-cyan/20 animate-spin" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-4 rounded-full border-4 border-t-cyan border-r-cyan border-transparent animate-spin" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-5xl font-mono text-cyan/50 tabular-nums">
            {Math.floor(Math.random() * 99)}
          </div>
        </div>
      </div>
      
      <h2 className="text-2xl md:text-3xl font-bold text-navy animate-pulse">
        {captions[phase]}
      </h2>
      
      {speed !== 'skip' && (
        <button onClick={onComplete} className="absolute bottom-12 text-navy/40 font-bold hover:text-navy transition-colors z-50">
          Skip animation
        </button>
      )}
    </div>
  );
}

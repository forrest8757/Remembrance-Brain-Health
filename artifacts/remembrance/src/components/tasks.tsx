import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Pause, Play, RefreshCw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrainVisualization } from '@/components/brain-viz';
import {
  SoundToggle,
  TaskFeedbackProvider,
  usePausableTicker,
  usePausableTimeout,
  useTaskFeedback,
} from '@/components/task-helpers';
import { useDemoState } from '@/lib/store';

export type TaskModality = 'interactive' | 'voice';

export type TaskProps = {
  onComplete: () => void;
  isWarmup?: boolean;
  /** Kept for compatibility with the original shell API. Warmups cannot be skipped. */
  onSkipWarmup?: () => void;
  /** Legacy compatibility prop; warmups always require a successful practice action. */
  allowSkipWarmup?: boolean;
  domain?: string;
  modality?: TaskModality;
};

export type TaskShellProps = {
  title: string;
  instruction: string;
  onComplete: () => void;
  children: React.ReactNode;
  isWarmup?: boolean;
  onSkipWarmup?: () => void;
  isPaused?: boolean;
  onTogglePause?: (paused: boolean) => void;
};

/**
 * The common shell deliberately owns pause, sound, speech, and the practice
 * label. Individual tasks own their timer state so a pause can freeze every
 * transition and not just the visible countdown.
 */
export function TaskShell({
  title,
  instruction,
  children,
  isWarmup = false,
  isPaused = false,
  onTogglePause,
}: TaskShellProps) {
  return (
    <TaskFeedbackProvider>
      <div className="relative mx-auto flex h-full min-h-[540px] w-full max-w-2xl flex-col">
        <div className="relative flex-none space-y-3 p-5 text-center sm:p-6">
          <div className="absolute left-5 top-5">
            <SoundToggle />
          </div>
          <div className="flex items-center justify-center gap-2">
            {isWarmup && (
              <span className="rounded-full bg-navy/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy/65">
                Practice round · not counted
              </span>
            )}
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-navy/45">{title}</span>
          </div>
          <div className="relative flex items-center justify-center gap-2">
            <h2 className="max-w-[31rem] text-xl font-bold leading-snug text-navy sm:text-2xl">{instruction}</h2>
            <InstructionButton instruction={instruction} disabled={isPaused} />
            {onTogglePause && (
              <button
                type="button"
                onClick={() => onTogglePause(!isPaused)}
                className="absolute right-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-navy/5 text-navy transition-colors hover:bg-navy/10"
                aria-label={isPaused ? 'Resume task' : 'Pause task'}
              >
                {isPaused ? <Play size={19} /> : <Pause size={19} />}
              </button>
            )}
          </div>
        </div>

        <div className={`relative flex-1 p-4 sm:p-6 ${isPaused ? 'pointer-events-none select-none' : ''}`}>
          {children}
        </div>

        {isPaused && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-3xl bg-background/95 p-6 text-center shadow-xl backdrop-blur-sm">
            <h2 className="mb-3 text-3xl font-bold text-navy">Take your time.</h2>
            <p className="mb-7 text-lg font-medium text-navy/70">Ready when you are.</p>
            {onTogglePause && (
              <Button
                type="button"
                onClick={() => onTogglePause(false)}
                className="h-14 rounded-2xl bg-navy px-8 text-lg font-bold text-white hover:bg-navy/90"
              >
                Resume
              </Button>
            )}
          </div>
        )}
      </div>
    </TaskFeedbackProvider>
  );
}

function InstructionButton({ instruction, disabled }: { instruction: string; disabled: boolean }) {
  const { speak } = useTaskFeedback();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => speak(instruction)}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-navy/5 text-navy transition-colors hover:bg-navy/10 disabled:opacity-40"
      aria-label="Hear instruction"
      title="Hear instruction"
    >
      <Volume2 size={18} />
    </button>
  );
}

type Shape = {
  id: number;
  type: 'circle' | 'square';
  color: 'cyan' | 'navy';
  x: number;
  y: number;
};

function nextShape(id: number, rule: 'circle' | 'square'): Shape {
  const target = Math.random() > 0.34;
  const type = target
    ? rule
    : rule === 'circle'
      ? Math.random() > 0.5
        ? 'square'
        : 'circle'
      : Math.random() > 0.5
        ? 'circle'
        : 'square';
  const color = rule === 'circle' && type === 'circle' ? 'cyan' : target && rule === 'square' ? 'navy' : 'navy';
  return {
    id,
    type,
    color,
    x: 14 + Math.random() * 72,
    y: 14 + Math.random() * 72,
  };
}

function isShapeTarget(shape: Shape, rule: 'circle' | 'square') {
  return rule === 'circle' ? shape.type === 'circle' && shape.color === 'cyan' : shape.type === 'square';
}

export function FocusField({ onComplete, isWarmup = false }: TaskProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [shape, setShape] = useState<Shape | null>(() =>
    isWarmup ? { id: 1, type: 'circle', color: 'cyan', x: 50, y: 50 } : nextShape(1, 'circle'),
  );
  const [shapeId, setShapeId] = useState(1);
  const [hits, setHits] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finishPending, setFinishPending] = useState(false);
  const { feedback } = useTaskFeedback();
  const assessmentSeconds = 120;
  const rule: 'circle' | 'square' = isWarmup || Math.floor(elapsedSeconds / 30) % 2 === 0 ? 'circle' : 'square';

  useEffect(() => {
    setShape(isWarmup ? { id: 1, type: 'circle', color: 'cyan', x: 50, y: 50 } : nextShape(1, rule));
  }, [isWarmup, rule]);

  usePausableTicker(
    () => {
      setShapeId((previous) => {
        const id = previous + 1;
        setShape(nextShape(id, rule));
        return id;
      });
    },
    1450,
    isPaused,
    !isWarmup && !finishPending,
  );

  usePausableTicker(
    () => setElapsedSeconds((value) => Math.min(assessmentSeconds, value + 1)),
    1000,
    isPaused,
    !isWarmup && !finishPending,
  );

  // Attention is a sustained, timed activity. A high hit count never ends it
  // early; the changing rule phases are part of the assessment.
  usePausableTimeout(
    () => setFinishPending(true),
    assessmentSeconds * 1000,
    isPaused,
    !isWarmup && !finishPending,
  );
  usePausableTimeout(onComplete, 700, isPaused, finishPending);

  const handleShape = () => {
    if (isPaused || !shape) return;
    const target = isShapeTarget(shape, rule);
    setShape(null);
    if (target) {
      feedback('success');
      if (isWarmup) {
        setFinishPending(true);
      } else {
        setHits((value) => value + 1);
      }
    } else {
      feedback('neutral');
    }
  };

  const instruction = isWarmup
    ? 'Tap the blue circle.'
    : rule === 'circle'
      ? 'Tap the cyan circles and let the rest drift by.'
      : 'Now tap the squares instead.';

  return (
    <TaskShell
      title="Focus Field"
      instruction={instruction}
      onComplete={onComplete}
      isWarmup={isWarmup}
      isPaused={isPaused}
      onTogglePause={setIsPaused}
    >
      <div className="mx-auto flex w-full max-w-[430px] flex-col items-center gap-4">
        <p className="text-center text-sm font-medium text-navy/60">
          {isWarmup
            ? 'Try the example first; practice does not count.'
            : rule === 'circle'
              ? 'There is no penalty if a shape drifts by.'
              : 'The rule has changed calmly. Shapes remain large and spaced out.'}
        </p>
        <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] border border-border bg-white shadow-sm">
          {shape && (
            <button
              type="button"
              onClick={handleShape}
              aria-label={shape.type === 'circle' ? `${shape.color} circle` : `${shape.color} square`}
              className={`absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-75 fade-in duration-500 sm:h-24 sm:w-24 ${
                shape.type === 'circle' ? 'rounded-full' : 'rounded-2xl'
              } ${
                shape.color === 'cyan'
                  ? 'bg-cyan shadow-[0_0_24px_rgba(27,206,223,0.48)]'
                  : 'bg-navy/80 shadow-[0_0_14px_rgba(30,58,95,0.14)]'
              }`}
              style={{ left: `${shape.x}%`, top: `${shape.y}%` }}
            />
          )}
          {finishPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85">
              <div className="flex items-center gap-2 text-xl font-bold text-navy">
                <Check className="text-cyan" size={28} /> Nicely done.
              </div>
            </div>
          )}
        </div>
        {!isWarmup && <div className="h-2 w-full overflow-hidden rounded-full bg-navy/5" aria-label="Quiet progress">
           <div className="h-full rounded-full bg-cyan transition-all duration-500" style={{ width: `${Math.min(100, (elapsedSeconds / assessmentSeconds) * 100)}%` }} />
         </div>}
        {!isWarmup && (
          <div className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-navy/45">
            <span>{Math.floor(elapsedSeconds / 30) + 1} of 4 rule phases</span>
            <span>{Math.max(0, assessmentSeconds - elapsedSeconds)}s remaining · {hits} caught</span>
          </div>
        )}
      </div>
    </TaskShell>
  );
}

type PathNode = { id: string; label: string; x: number; y: number };

const PATH_LABELS = ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5', 'E'];
// Two generous rows keep 10 targets comfortably separated even on a phone.
// The anchor order is shuffled for every board, while the labels remain in
// their alternating sequence.
const PATH_ANCHORS = [
  { x: 10, y: 24 },
  { x: 30, y: 24 },
  { x: 50, y: 24 },
  { x: 70, y: 24 },
  { x: 90, y: 24 },
  { x: 10, y: 76 },
  { x: 30, y: 76 },
  { x: 50, y: 76 },
  { x: 70, y: 76 },
  { x: 90, y: 76 },
];

function shuffledAnchors(board: number) {
  // Use a fresh shuffle per board. The board number also makes it extremely
  // unlikely that a rerender accidentally gives a completed board the same
  // spatial arrangement.
  const values = [...PATH_ANCHORS];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

export function ConnectPath({ onComplete, isWarmup = false }: TaskProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [boardIndex, setBoardIndex] = useState(0);
  const nodes = useMemo(
    () => {
      if (isWarmup) {
        return ['1', 'A', '2'].map((label, index) => ({
          id: label,
          label,
          ...[
            { x: 18, y: 50 },
            { x: 50, y: 28 },
            { x: 82, y: 68 },
          ][index],
        }));
      }
      return shuffledAnchors(boardIndex).map((position, index) => ({
        id: `${boardIndex}-${PATH_LABELS[index]}`,
        label: PATH_LABELS[index],
        ...position,
      }));
    },
    [boardIndex, isWarmup],
  );
  const [path, setPath] = useState<number[]>([0]);
  const pathRef = useRef(path);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 50, y: 50 });
  const [finishPending, setFinishPending] = useState(false);
  const pointerMovedRef = useRef(false);
  const captureTargetRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { feedback } = useTaskFeedback();

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    pathRef.current = [0];
    setPath([0]);
    setDragPos(nodes[0] ?? { x: 50, y: 50 });
  }, [boardIndex, nodes]);

  usePausableTimeout(onComplete, 700, isPaused, finishPending);

  const coords = (event: React.PointerEvent<HTMLElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  };

  const lockNext = () => {
    if (isPaused || finishPending) return;
    const current = pathRef.current;
    if (current.length >= nodes.length) return;
    const next = [...current, current.length];
    pathRef.current = next;
    setPath(next);
    feedback('success');
    if (next.length === nodes.length) {
      if (isWarmup || boardIndex >= 3) {
        setFinishPending(true);
      } else {
        // Move straight into the next board. There is no artificial wait:
        // natural tracing time is the timing measure.
        setBoardIndex((value) => value + 1);
      }
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>, nodeIndex: number) => {
    if (isPaused || finishPending || nodeIndex !== pathRef.current.length - 1) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    captureTargetRef.current = event.currentTarget;
    setIsDragging(true);
    pointerMovedRef.current = false;
    setDragPos(coords(event));
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isPaused || !isDragging || finishPending) return;
    pointerMovedRef.current = true;
    const position = coords(event);
    setDragPos(position);
    const nextNode = nodes[pathRef.current.length];
    if (nextNode) {
      const distance = Math.hypot(position.x - nextNode.x, position.y - nextNode.y);
        if (distance <= 26) lockNext();
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      if (!finishPending && pointerMovedRef.current) feedback('neutral');
      setIsDragging(false);
      captureTargetRef.current?.releasePointerCapture?.(event.pointerId);
      captureTargetRef.current = null;
    }
  };

  const handleNodeTap = (index: number) => {
    if (isPaused || finishPending) return;
    if (index === pathRef.current.length) lockNext();
    else if (index !== pathRef.current.length - 1) feedback('neutral');
  };

  return (
    <TaskShell
      title="Connect the Path"
      instruction={isWarmup ? 'Draw a line from 1 to A to 2.' : 'Connect the numbers and letters in order.'}
      onComplete={onComplete}
      isWarmup={isWarmup}
      isPaused={isPaused}
      onTogglePause={setIsPaused}
    >
      <div className="mx-auto flex w-full max-w-[500px] flex-col items-center gap-4">
        <p className="text-center text-sm font-medium text-navy/60">Drag between the glowing nodes, or tap the next node.</p>
        <div
          ref={containerRef}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] border border-border bg-white shadow-sm touch-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
            {path.slice(0, -1).map((nodeIndex, index) => {
              const from = nodes[nodeIndex];
              const to = nodes[path[index + 1]];
              return (
                <line
                  key={`${from.id}-${to.id}`}
                  x1={`${from.x}%`}
                  y1={`${from.y}%`}
                  x2={`${to.x}%`}
                  y2={`${to.y}%`}
                  stroke="#1BCEDF"
                  strokeWidth="2.8%"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_8px_rgba(27,206,223,0.5)]"
                />
              );
            })}
            {isDragging && pathRef.current.length < nodes.length && (
              <line
                x1={`${nodes[pathRef.current.length - 1].x}%`}
                y1={`${nodes[pathRef.current.length - 1].y}%`}
                x2={`${dragPos.x}%`}
                y2={`${dragPos.y}%`}
                stroke="#1BCEDF"
                strokeWidth="2.8%"
                strokeLinecap="round"
                strokeOpacity="0.55"
              />
            )}
          </svg>
          {nodes.map((node, index) => {
            const reached = index < path.length;
            const next = index === path.length;
            return (
              <button
                type="button"
                key={node.id}
                onPointerDown={(event) => handlePointerDown(event, index)}
                onClick={() => {
                  if (!pointerMovedRef.current) handleNodeTap(index);
                  pointerMovedRef.current = false;
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleNodeTap(index);
                  }
                }}
                aria-label={`Node ${node.label}${next ? ', next' : ''}`}
                className={`absolute z-10 flex h-[3.25rem] w-[3.25rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-lg font-bold shadow-sm transition-all sm:h-16 sm:w-16 ${
                  reached
                    ? 'border-cyan bg-cyan text-navy'
                    : next
                      ? 'animate-pulse border-navy bg-white text-navy'
                      : 'border-navy/20 bg-white text-navy/45'
                }`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                {node.label}
              </button>
            );
          })}
          {finishPending && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[2rem] bg-white/85">
              <div className="flex items-center gap-2 text-xl font-bold text-navy">
                <Check className="text-cyan" size={28} /> Path complete.
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-navy/55">
          <span className="h-2 w-2 rounded-full bg-cyan" />
          {isWarmup ? 'Practice · 2 connections' : `Board ${Math.min(boardIndex + 1, 4)} of 4 · ${Math.min(path.length - 1, nodes.length - 1)} of ${nodes.length - 1} connections`}
        </div>
      </div>
    </TaskShell>
  );
}

type RecallWord = { word: string; picture: 'apple' | 'train' | 'garden' | 'chair' | 'river' };

const RECALL_WORDS: RecallWord[] = [
  { word: 'Apple', picture: 'apple' },
  { word: 'Train', picture: 'train' },
  { word: 'Garden', picture: 'garden' },
  { word: 'Chair', picture: 'chair' },
  { word: 'River', picture: 'river' },
];

const RECALL_DISTRACTORS = ['Cloud', 'Book', 'Window', 'Bridge', 'Music', 'Road'];

function shuffleWords(words: string[]) {
  return [...words].sort(() => Math.random() - 0.5);
}

function MiniFocusField({
  shape,
  onTap,
}: {
  shape: Shape | null;
  onTap: (shape: Shape) => void;
}) {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-[390px] overflow-hidden rounded-[2rem] border border-border bg-white shadow-sm">
      {shape && (
        <button
          type="button"
          className={`absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 ${
            shape.type === 'circle' ? 'rounded-full' : 'rounded-2xl'
          } ${shape.color === 'cyan' ? 'bg-cyan shadow-[0_0_20px_rgba(27,206,223,0.45)]' : 'bg-navy/75'}`}
          style={{ left: `${shape.x}%`, top: `${shape.y}%` }}
          aria-label="Moving shape"
          onClick={() => onTap(shape)}
        />
      )}
    </div>
  );
}

export function RecallChain({ onComplete, isWarmup = false }: TaskProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<'warmup' | 'learn' | 'distractor' | 'recall' | 'intervening' | 'delayed-recall' | 'complete'>(
    isWarmup ? 'warmup' : 'learn',
  );
  const [learnPass, setLearnPass] = useState(1);
  const [learnIndex, setLearnIndex] = useState(0);
  const [distractorSeconds, setDistractorSeconds] = useState(20);
  const [interveningSeconds, setInterveningSeconds] = useState(60);
  const [interveningHits, setInterveningHits] = useState(0);
  const [miniShape, setMiniShape] = useState<Shape | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [recalled, setRecalled] = useState<string[]>([]);
  const [typedWord, setTypedWord] = useState('');
  const [finishPending, setFinishPending] = useState(false);
  const { feedback, speak } = useTaskFeedback();

  useEffect(() => {
    if (phase === 'learn' && learnIndex < RECALL_WORDS.length) speak(RECALL_WORDS[learnIndex].word);
  }, [learnIndex, learnPass, phase, speak]);

  usePausableTimeout(
    () => {
      if (learnIndex + 1 < RECALL_WORDS.length) setLearnIndex((value) => value + 1);
      else if (learnPass === 1) {
        setLearnPass(2);
        setLearnIndex(0);
      } else {
        setPhase('distractor');
      }
    },
    5000,
    isPaused,
    phase === 'learn',
    `${learnPass}-${learnIndex}`,
  );

  useEffect(() => {
    if (phase === 'distractor' || phase === 'intervening') {
      setMiniShape(nextShape(Date.now(), 'circle'));
    } else {
      setMiniShape(null);
    }
  }, [phase]);

  usePausableTicker(
    () => {
      setMiniShape(nextShape(Date.now(), 'circle'));
    },
    1200,
    isPaused,
    phase === 'distractor' || phase === 'intervening',
  );

  usePausableTicker(
    () => {
      if (phase === 'distractor') {
        setDistractorSeconds((value) => {
          if (value <= 1) {
            setOptions(shuffleWords([...RECALL_WORDS.map((item) => item.word), ...RECALL_DISTRACTORS.slice(0, 4)]));
            setPhase('recall');
            return 0;
          }
          return value - 1;
        });
      } else if (phase === 'intervening') {
        setInterveningSeconds((value) => {
          if (value <= 1) {
            setOptions(shuffleWords([...RECALL_WORDS.map((item) => item.word), ...RECALL_DISTRACTORS.slice(2)]));
            setRecalled([]);
            setPhase('delayed-recall');
            return 0;
          }
          return value - 1;
        });
      }
    },
    1000,
    isPaused,
    phase === 'distractor' || phase === 'intervening',
  );

  usePausableTimeout(onComplete, 650, isPaused, finishPending);

  const addRecall = (value: string) => {
    if (isPaused || recalled.includes(value)) return;
    setRecalled((current) => [...current, value]);
    feedback(RECALL_WORDS.some((item) => item.word.toLowerCase() === value.toLowerCase()) ? 'success' : 'neutral');
  };

  const submitTypedWord = () => {
    const cleaned = typedWord.trim();
    if (!cleaned) return;
    const known = RECALL_WORDS.find((item) => item.word.toLowerCase() === cleaned.toLowerCase());
    addRecall(known?.word ?? cleaned);
    setTypedWord('');
  };

  const tapMiniShape = (value: Shape) => {
    if (isPaused) return;
    setMiniShape(null);
    if (isShapeTarget(value, 'circle')) {
      setInterveningHits((count) => count + 1);
      feedback('success');
    } else feedback('neutral');
  };

  const continueFromRecall = () => {
    if (isPaused) return;
    if (phase === 'recall') {
      setRecalled([]);
      setInterveningSeconds(60);
      setInterveningHits(0);
      setPhase('intervening');
    } else if (phase === 'delayed-recall') {
      setFinishPending(true);
      setPhase('complete');
    }
  };

  let instruction = 'Just take these in. No need to do anything yet.';
  if (phase === 'warmup') instruction = 'Look at the picture, then tap the word you remember.';
  if (phase === 'distractor') instruction = 'Let’s do something else for a moment.';
  if (phase === 'intervening') instruction = 'Keep catching the blue circles for one minute.';
  if (phase === 'recall') instruction = 'Which of these do you remember? Tap or type them.';
  if (phase === 'delayed-recall') instruction = 'Earlier we looked at five words; any come back to you now?';
  if (phase === 'complete') instruction = 'All done, nicely done.';

  return (
    <TaskShell
      title="Recall Chain"
      instruction={instruction}
      onComplete={onComplete}
      isWarmup={isWarmup}
      isPaused={isPaused}
      onTogglePause={setIsPaused}
    >
      <div className="mx-auto flex w-full max-w-[510px] flex-col items-center gap-5">
        {phase === 'warmup' && (
          <div className="flex w-full flex-col items-center gap-5 rounded-[2rem] bg-white p-6 shadow-sm">
            <PictureIllustration kind="apple" className="h-36 w-36" />
            <p className="text-lg font-semibold text-navy">This is an apple.</p>
            <Button
              type="button"
              onClick={() => {
                feedback('success');
                setFinishPending(true);
                setPhase('complete');
              }}
              className="h-14 w-full max-w-xs rounded-2xl bg-navy text-lg font-bold text-white hover:bg-navy/90"
            >
              I remember
            </Button>
          </div>
        )}

        {phase === 'learn' && (
          <div className="flex w-full flex-col items-center gap-4 rounded-[2rem] bg-white p-7 text-center shadow-sm">
            <div className="text-sm font-bold uppercase tracking-wider text-navy/45">
              Look {learnPass} of 2 · Word {learnIndex + 1} of {RECALL_WORDS.length}
            </div>
            <PictureIllustration kind={RECALL_WORDS[learnIndex].picture} className="h-40 w-40" />
            <div className="text-4xl font-extrabold text-navy">{RECALL_WORDS[learnIndex].word}</div>
            <p className="text-sm font-medium text-navy/55">Take about five seconds with each word; it will be read aloud.</p>
          </div>
        )}

        {(phase === 'distractor' || phase === 'intervening') && (
          <div className="flex w-full flex-col items-center gap-4">
            <p className="text-center text-sm font-medium text-navy/60">
              {phase === 'distractor' ? 'A short 20-second focus activity creates a natural pause.' : 'A little later, let’s give those words another moment.'}
            </p>
            <MiniFocusField shape={miniShape} onTap={tapMiniShape} />
            <div className="rounded-full bg-cyan/10 px-5 py-2 text-lg font-bold tabular-nums text-navy">
              {phase === 'distractor' ? distractorSeconds : interveningSeconds}s
            </div>
            {phase === 'intervening' && (
              <div className="w-full space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-navy/5">
                  <div className="h-full rounded-full bg-cyan transition-all duration-500" style={{ width: `${((60 - interveningSeconds) / 60) * 100}%` }} />
                </div>
                <div className="text-center text-xs font-bold uppercase tracking-wider text-navy/45">
                  Active focus · {interveningHits} circles caught
                </div>
              </div>
            )}
          </div>
        )}

        {(phase === 'recall' || phase === 'delayed-recall') && (
          <div className="w-full space-y-5">
            <div className="flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-2xl border border-cyan/30 bg-cyan/5 p-3" aria-live="polite">
              {recalled.length === 0 ? (
                <span className="text-sm font-semibold text-navy/45">Your remembered words will settle here.</span>
              ) : (
                recalled.map((word) => (
                  <span key={word} className="rounded-full bg-cyan px-4 py-2 text-sm font-bold text-navy">
                    {word}
                  </span>
                ))
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {options.map((word) => (
                <button
                  type="button"
                  key={word}
                  disabled={recalled.includes(word)}
                  onClick={() => addRecall(word)}
                  className={`min-h-14 rounded-2xl border-2 px-3 text-base font-bold transition-all ${
                    recalled.includes(word)
                      ? 'border-cyan bg-cyan/15 text-navy/45'
                      : 'border-border bg-white text-navy hover:border-cyan hover:bg-cyan/5'
                  }`}
                >
                  {word}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={typedWord}
                onChange={(event) => setTypedWord(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitTypedWord();
                }}
                disabled={isPaused}
                className="min-h-12 min-w-0 flex-1 rounded-2xl border border-border bg-white px-4 text-base text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                placeholder="Type a word (optional)"
                aria-label="Type a remembered word"
              />
              <Button type="button" onClick={submitTypedWord} disabled={!typedWord.trim() || isPaused} className="min-h-12 rounded-2xl bg-navy px-5 font-bold text-white hover:bg-navy/90">
                Add
              </Button>
            </div>
            <Button type="button" onClick={continueFromRecall} disabled={isPaused} className="h-14 w-full rounded-2xl bg-navy text-lg font-bold text-white hover:bg-navy/90">
              {phase === 'recall' ? 'Continue gently' : 'Finish recall'}
              <ChevronRight className="ml-2" size={20} />
            </Button>
            <p className="text-center text-xs font-medium text-navy/45">Only the words you remember are celebrated.</p>
          </div>
        )}

        {phase === 'complete' && (
          <div className="flex items-center gap-2 pt-12 text-2xl font-bold text-navy">
            <Check className="text-cyan" size={32} /> Beautifully done.
          </div>
        )}
      </div>
    </TaskShell>
  );
}

type PictureKind = 'apple' | 'train' | 'garden' | 'chair' | 'river' | 'tree' | 'house' | 'dog';

function PictureIllustration({ kind, className = '' }: { kind: PictureKind; className?: string }) {
  const common = { stroke: '#1E3A5F', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={`${kind} illustration`}>
      <circle cx="60" cy="60" r="52" fill="#F5F1EA" />
      {kind === 'apple' && (
        <>
          <path d="M59 44c-1-13 7-19 15-22" fill="none" {...common} />
          <path d="M63 27c8-7 17-3 19 1-8 5-14 5-19-1Z" fill="#1BCEDF" {...common} />
          <path d="M60 45c-17-15-36-2-29 20 7 25 25 31 29 15 5 16 23 10 29-15 7-22-12-35-29-20Z" fill="#1BCEDF" {...common} />
        </>
      )}
      {kind === 'train' && (
        <>
          <rect x="26" y="34" width="68" height="49" rx="10" fill="#1BCEDF" {...common} />
          <path d="M26 55h68M42 42h13v11H42zM65 42h13v11H65z" fill="#F5F1EA" {...common} />
          <circle cx="42" cy="86" r="7" fill="#1E3A5F" {...common} /><circle cx="78" cy="86" r="7" fill="#1E3A5F" {...common} />
          <path d="M21 96h78" fill="none" {...common} />
        </>
      )}
      {kind === 'garden' && (
        <>
          <path d="M28 85c16-18 47-21 65 0" fill="#1BCEDF" {...common} />
          <path d="M60 84V44M60 57 43 45M60 66l18-17" fill="none" {...common} />
          <circle cx="42" cy="42" r="11" fill="#1BCEDF" {...common} /><circle cx="78" cy="46" r="12" fill="#1BCEDF" {...common} />
          <path d="M23 94h74" fill="none" {...common} />
        </>
      )}
      {kind === 'chair' && (
        <>
          <path d="M39 37v35h42V37M31 72h58M39 72l-7 25M81 72l7 25M49 37h22v26H49z" fill="none" {...common} />
          <path d="M46 63h28" fill="none" stroke="#1BCEDF" strokeWidth="7" />
        </>
      )}
      {kind === 'river' && (
        <>
          <path d="M20 82c16-19 25-19 40 0s24 19 40 0" fill="none" stroke="#1BCEDF" strokeWidth="8" />
          <path d="M20 68c16-19 25-19 40 0s24 19 40 0M60 28v22M50 38h20" fill="none" {...common} />
          <path d="M35 39c7-9 15-9 22 0 7-9 15-9 22 0" fill="none" {...common} />
        </>
      )}
      {kind === 'tree' && (
        <>
          <path d="M54 65v29M66 65v29" stroke="#1E3A5F" strokeWidth="8" />
          <circle cx="60" cy="42" r="26" fill="#1BCEDF" {...common} />
          <circle cx="39" cy="56" r="15" fill="#1BCEDF" {...common} /><circle cx="81" cy="56" r="15" fill="#1BCEDF" {...common} />
        </>
      )}
      {kind === 'house' && (
        <>
          <path d="M27 56 60 29l33 27v38H27Z" fill="#1BCEDF" {...common} />
          <path d="M52 94V70h16v24M38 59h13v13H38zM69 59h13v13H69z" fill="#F5F1EA" {...common} />
        </>
      )}
      {kind === 'dog' && (
        <>
          <path d="M37 53c-4-16 3-23 13-13 7-5 15-5 22 0 10-10 17-3 13 13 4 18-8 30-24 30S33 71 37 53Z" fill="#1BCEDF" {...common} />
          <circle cx="50" cy="58" r="2.5" fill="#1E3A5F" /><circle cx="70" cy="58" r="2.5" fill="#1E3A5F" />
          <path d="M55 70c3 3 7 3 10 0M60 66v5" fill="none" {...common} />
        </>
      )}
    </svg>
  );
}

const NAMING_OPTIONS: Array<{ name: string; picture: PictureKind }> = [
  { name: 'Apple', picture: 'apple' },
  { name: 'Train', picture: 'train' },
  { name: 'Tree', picture: 'tree' },
  { name: 'House', picture: 'house' },
];

const MATCH_OPTIONS: Array<{ name: string; picture: PictureKind }> = [
  { name: 'Tree', picture: 'tree' },
  { name: 'Dog', picture: 'dog' },
  { name: 'Chair', picture: 'chair' },
  { name: 'River', picture: 'river' },
];

const FRUITS = ['Apple', 'Banana', 'Orange', 'Grape', 'Pear', 'Peach'];
const ANIMALS = ['Dog', 'Cat', 'Horse', 'Bird', 'Rabbit', 'Lion'];

const NAMING_PROMPTS: Array<{ name: string; picture: PictureKind }> = [
  { name: 'Apple', picture: 'apple' },
  { name: 'Train', picture: 'train' },
  { name: 'House', picture: 'house' },
];

const COMPREHENSION_PROMPTS: Array<{ word: string; answer: PictureKind }> = [
  { word: 'TREE', answer: 'tree' },
  { word: 'DOG', answer: 'dog' },
  { word: 'RIVER', answer: 'river' },
];

export function NameMatch({ onComplete, isWarmup = false }: TaskProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<'warmup' | 'name' | 'match' | 'fluency' | 'complete'>(isWarmup ? 'warmup' : 'name');
  const [namingIndex, setNamingIndex] = useState(0);
  const [comprehensionIndex, setComprehensionIndex] = useState(0);
  const [fluencyCategory, setFluencyCategory] = useState(0);
  const [typedName, setTypedName] = useState('');
  const [fluencySeconds, setFluencySeconds] = useState(45);
  const [userWords, setUserWords] = useState<string[]>([]);
  const [typedFluencyWord, setTypedFluencyWord] = useState('');
  const [finishPending, setFinishPending] = useState(false);
  const { feedback } = useTaskFeedback();

  usePausableTicker(
    () => {
      setFluencySeconds((value) => {
        if (value <= 1) {
          if (fluencyCategory === 0) {
            setFluencyCategory(1);
            setUserWords([]);
            return 45;
          } else {
            setPhase('complete');
            setFinishPending(true);
            return 0;
          }
        }
        return value - 1;
      });
    },
    1000,
    isPaused,
    phase === 'fluency',
  );
  usePausableTimeout(onComplete, 650, isPaused, finishPending);

  const moveFromName = (answer: string) => {
    if (isPaused) return;
    const namingTarget = isWarmup ? 'chair' : 'apple';
    const expected = isWarmup ? namingTarget : NAMING_PROMPTS[namingIndex].name.toLowerCase();
    if (answer.toLowerCase() === expected) {
      feedback('success');
      if (isWarmup) {
        setFinishPending(true);
        setPhase('complete');
      } else if (namingIndex + 1 < NAMING_PROMPTS.length) {
        setNamingIndex((value) => value + 1);
      } else {
        setPhase('match');
      }
    } else {
      feedback('neutral');
    }
  };

  const submitName = () => {
    const answer = typedName.trim();
    if (!answer) return;
    moveFromName(answer);
    setTypedName('');
  };

  const addFluencyWord = (word: string) => {
    if (isPaused || userWords.includes(word)) return;
    setUserWords((current) => [...current, word]);
    feedback('success');
  };

  const submitFluencyWord = () => {
    const cleaned = typedFluencyWord.trim();
    if (!cleaned) return;
    const words = fluencyCategory === 0 ? FRUITS : ANIMALS;
    const matchingWord = words.find((word) => word.toLowerCase() === cleaned.toLowerCase());
    if (matchingWord) addFluencyWord(matchingWord);
    else feedback('neutral');
    setTypedFluencyWord('');
  };

  const answerComprehension = (picture: PictureKind) => {
    if (isPaused) return;
    if (picture === COMPREHENSION_PROMPTS[comprehensionIndex].answer) {
      feedback('success');
      if (comprehensionIndex + 1 < COMPREHENSION_PROMPTS.length) {
        setComprehensionIndex((value) => value + 1);
      } else {
        setFluencyCategory(0);
        setFluencySeconds(45);
        setUserWords([]);
        setPhase('fluency');
      }
    } else {
      feedback('neutral');
    }
  };

  const fluencyWords = fluencyCategory === 0 ? FRUITS : ANIMALS;
  const fluencyLabel = fluencyCategory === 0 ? 'fruits' : 'animals';

  const instruction =
    phase === 'warmup'
      ? 'What is this? Say it aloud, or tap the word.'
      : phase === 'name'
        ? `What is this? Say it aloud, or choose the word. (${namingIndex + 1} of ${NAMING_PROMPTS.length})`
        : phase === 'match'
          ? `Tap the picture that matches the word ${COMPREHENSION_PROMPTS[comprehensionIndex].word}.`
          : phase === 'fluency'
            ? `Name as many ${fluencyLabel} as you can in forty-five seconds.`
            : 'All done, nicely done.';

  return (
    <TaskShell
      title="Name & Match"
      instruction={instruction}
      onComplete={onComplete}
      isWarmup={isWarmup}
      isPaused={isPaused}
      onTogglePause={setIsPaused}
    >
      <div className="mx-auto flex w-full max-w-[540px] flex-col items-center gap-5">
        {(phase === 'warmup' || phase === 'name') && (
          <div className="w-full rounded-[2rem] bg-white p-5 shadow-sm sm:p-7">
            <div className="mx-auto flex max-w-xs flex-col items-center gap-4">
              <PictureIllustration
                kind={phase === 'warmup' ? 'chair' : NAMING_PROMPTS[namingIndex].picture}
                className="h-48 w-48"
              />
              <p className="text-center text-sm font-medium text-navy/55">Voice is optional; this demo does not transcribe audio.</p>
              <div className="grid w-full grid-cols-2 gap-3">
                {(phase === 'warmup'
                  ? [
                      { name: 'Chair', picture: 'chair' as PictureKind },
                      { name: 'Tree', picture: 'tree' as PictureKind },
                      { name: 'House', picture: 'house' as PictureKind },
                      { name: 'Dog', picture: 'dog' as PictureKind },
                    ]
                  : NAMING_OPTIONS
                ).map((option) => (
                  <button
                    type="button"
                    key={option.name}
                    onClick={() => moveFromName(option.name)}
                    className="min-h-14 rounded-2xl border-2 border-border bg-white px-3 text-base font-bold text-navy transition-colors hover:border-cyan hover:bg-cyan/5"
                  >
                    {option.name}
                  </button>
                ))}
              </div>
              <div className="flex w-full gap-2">
                <input
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') submitName();
                  }}
                  disabled={isPaused}
                  placeholder="Type your answer"
                  aria-label="Type the picture name"
                  className="min-h-12 min-w-0 flex-1 rounded-2xl border border-border px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                />
                <Button type="button" onClick={submitName} disabled={!typedName.trim() || isPaused} className="min-h-12 rounded-2xl bg-navy px-5 font-bold text-white hover:bg-navy/90">
                  Add
                </Button>
              </div>
              <button
                type="button"
                onClick={() => moveFromName(isWarmup ? 'chair' : NAMING_PROMPTS[namingIndex].name)}
                disabled={isPaused}
                className="min-h-11 rounded-full px-4 text-sm font-bold text-navy/65 underline decoration-cyan decoration-2 underline-offset-4"
              >
                I said it aloud
              </button>
            </div>
          </div>
        )}

        {phase === 'match' && (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-white p-4 text-center shadow-sm">
              <span className="text-2xl font-extrabold tracking-wide text-navy">
                {COMPREHENSION_PROMPTS[comprehensionIndex].word}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-navy/45">
                Question {comprehensionIndex + 1} of {COMPREHENSION_PROMPTS.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {MATCH_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.name}
                  onClick={() => answerComprehension(option.picture)}
                  className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-border bg-white p-3 shadow-sm transition-all hover:border-cyan hover:bg-cyan/5"
                >
                  <PictureIllustration kind={option.picture} className="h-24 w-24" />
                  <span className="sr-only">{option.name}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-medium text-navy/55">Each picture is a clear illustration, not a text label.</p>
          </div>
        )}

        {phase === 'fluency' && (
          <div className="w-full space-y-5 rounded-[2rem] bg-white p-6 text-center shadow-sm">
            <div className="flex items-center justify-between rounded-2xl bg-cyan/5 px-4 py-3 text-left">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-navy/45">Fluency {fluencyCategory + 1} of 2</div>
                <div className="mt-1 text-lg font-extrabold text-navy">Name {fluencyLabel}</div>
              </div>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-cyan/20">
                <span className="text-2xl font-bold tabular-nums text-navy">{fluencySeconds}</span>
              </div>
            </div>
            <div className="flex min-h-16 flex-wrap justify-center gap-2" aria-live="polite">
              {userWords.length === 0 ? (
                <span className="text-sm font-medium text-navy/45">Your words will appear here.</span>
              ) : (
                userWords.map((word) => <span key={word} className="rounded-full bg-cyan/15 px-4 py-2 text-sm font-bold text-navy">{word}</span>)
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {fluencyWords.map((word) => (
                <button
                  type="button"
                  key={word}
                  disabled={userWords.includes(word) || isPaused}
                  onClick={() => addFluencyWord(word)}
                  className="min-h-11 rounded-full border border-cyan/35 px-4 text-sm font-bold text-navy transition-colors hover:bg-cyan/10 disabled:opacity-35"
                >
                  {word}
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-dashed border-cyan/35 bg-cyan/5 p-3 text-left">
              <div className="text-xs font-bold uppercase tracking-wider text-navy/50">Example bubbles · not a transcription</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(fluencyCategory === 0 ? ['Apple', 'Pear'] : ['Dog', 'Horse']).map((word) => (
                  <span key={word} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-navy/55">
                    {word}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex w-full gap-2">
              <input
                value={typedFluencyWord}
                onChange={(event) => setTypedFluencyWord(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitFluencyWord();
                }}
                disabled={isPaused}
                placeholder={`Type a ${fluencyLabel} (optional)`}
                aria-label={`Type an answer from ${fluencyLabel}`}
                className="min-h-12 min-w-0 flex-1 rounded-2xl border border-border px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
              />
              <Button type="button" onClick={submitFluencyWord} disabled={!typedFluencyWord.trim() || isPaused} className="min-h-12 rounded-2xl bg-navy px-5 font-bold text-white hover:bg-navy/90">
                Add
              </Button>
            </div>
            <p className="text-xs font-semibold text-navy/45">Tap a word or say it aloud; spoken audio is not transcribed in this demo.</p>
          </div>
        )}

        {phase === 'complete' && (
          <div className="flex items-center gap-2 pt-12 text-2xl font-bold text-navy">
            <Check className="text-cyan" size={32} /> Great work.
          </div>
        )}
      </div>
    </TaskShell>
  );
}

type Point = { x: number; y: number };

function FigureReference({ figureIndex }: { figureIndex: number }) {
  return (
    <svg viewBox="0 0 160 160" className="h-32 w-32 rounded-2xl border border-border bg-cream p-2 sm:h-40 sm:w-40">
      {figureIndex === 0 ? (
        <path
          d="M35 46 80 27l45 19-45 19-45-19ZM35 46v57l45 30V65M125 46v57l-45 30"
          fill="none"
          stroke="#1E3A5F"
          strokeWidth="5"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="m80 24 25 14 25 43-25 43-50 0-25-43 25-43 25-14Zm0 0v43m0 0 25 14m-25-14-25 14m-25 0 25 43m25-43 25 43m25-43-25 43"
          fill="none"
          stroke="#1E3A5F"
          strokeWidth="5"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function DrawCopy({ onComplete, isWarmup = false }: TaskProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<'warmup' | 'clock' | 'figure-1' | 'figure-2' | 'complete'>(isWarmup ? 'warmup' : 'clock');
  const [figureIndex, setFigureIndex] = useState(0);
  const [guideOn, setGuideOn] = useState(true);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [strokeCount, setStrokeCount] = useState(0);
  const [inkLength, setInkLength] = useState(0);
  const [strokeLengths, setStrokeLengths] = useState<number[]>([]);
  const [warmupSuccessful, setWarmupSuccessful] = useState(false);
  const [finishPending, setFinishPending] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const strokePointsRef = useRef<Point[]>([]);
  const { feedback } = useTaskFeedback();

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#1BCEDF';
    context.lineWidth = 9;
  };

  useEffect(() => {
    clearCanvas();
    setHistory([]);
    setStrokeCount(0);
    setInkLength(0);
    setStrokeLengths([]);
    strokePointsRef.current = [];
  }, [phase]);

  usePausableTimeout(onComplete, 650, isPaused, finishPending);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPaused || finishPending) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setHistory((current) => [...current, context.getImageData(0, 0, canvas.width, canvas.height)]);
    const point = pointFromEvent(event);
    drawingRef.current = true;
    lastPointRef.current = point;
    strokePointsRef.current = [point];
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const continueStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPaused || !drawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const point = pointFromEvent(event);
    const previous = lastPointRef.current ?? point;
    const midpoint = { x: (previous.x + point.x) / 2, y: (previous.y + point.y) / 2 };
    context.quadraticCurveTo(previous.x, previous.y, midpoint.x, midpoint.y);
    context.stroke();
    context.beginPath();
    context.moveTo(midpoint.x, midpoint.y);
    lastPointRef.current = point;
    strokePointsRef.current.push(point);
  };

  const endStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context && lastPointRef.current) {
      context.lineTo(lastPointRef.current.x, lastPointRef.current.y);
      context.stroke();
      context.closePath();
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setStrokeCount((value) => value + 1);
    const points = strokePointsRef.current;
    const length = points.slice(1).reduce((total, point, index) => {
      const previous = points[index];
      return total + Math.hypot(point.x - previous.x, point.y - previous.y);
    }, 0);
    setInkLength((value) => value + length);
    setStrokeLengths((values) => [...values, length]);
    if (phase === 'warmup') {
      const lineY = 190;
      const nearGuide = points.length >= 5 && points.every((point) => Math.abs(point.y - lineY) < 95);
      if (nearGuide) {
        feedback('success');
        setWarmupSuccessful(true);
      } else {
        feedback('neutral');
      }
    } else {
      feedback('success');
    }
    lastPointRef.current = null;
    strokePointsRef.current = [];
  };

  const undo = () => {
    if (isPaused || history.length === 0) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.putImageData(history[history.length - 1], 0, 0);
    setHistory((current) => current.slice(0, -1));
    setStrokeCount((value) => Math.max(0, value - 1));
    const removedLength = strokeLengths[strokeLengths.length - 1] ?? 0;
    setStrokeLengths((values) => values.slice(0, -1));
    setInkLength((value) => Math.max(0, value - removedLength));
    feedback('soft');
  };

  const doneDrawing = () => {
    if (isPaused || finishPending) return;
    if (phase === 'warmup') {
      if (!warmupSuccessful) return;
      setFinishPending(true);
      setPhase('complete');
    } else if (phase === 'clock') {
      // A single dot should never count as a clock. The checklist is
      // deliberately forgiving while still requiring a meaningful drawing.
      if (strokeCount < 3 || inkLength < 260) {
        feedback('neutral');
        return;
      }
      setFigureIndex(0);
      setPhase('figure-1');
    } else if (phase === 'figure-1') {
      if (strokeCount < 2 || inkLength < 160) {
        feedback('neutral');
        return;
      }
      setFigureIndex(1);
      setPhase('figure-2');
    } else if (phase === 'figure-2') {
      if (strokeCount < 2 || inkLength < 160) {
        feedback('neutral');
        return;
      }
      setFinishPending(true);
      setPhase('complete');
    }
  };

  const instruction =
    phase === 'warmup'
      ? 'Trace the guide line.'
      : phase === 'clock'
        ? 'Draw a clock, then set it to ten past eleven.'
        : phase === 'figure-1' || phase === 'figure-2'
          ? `Copy figure ${figureIndex + 1} of 2 on the canvas.`
          : 'All done, nicely done.';

  return (
    <TaskShell
      title="Draw & Copy"
      instruction={instruction}
      onComplete={onComplete}
      isWarmup={isWarmup}
      isPaused={isPaused}
      onTogglePause={setIsPaused}
    >
      <div className="mx-auto flex w-full max-w-[700px] flex-col items-center gap-5">
        {(phase === 'figure-1' || phase === 'figure-2') && (
          <div className="flex w-full items-center justify-center gap-4 rounded-3xl bg-white p-4 shadow-sm sm:gap-8 sm:p-6">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-navy/45">Reference {figureIndex + 1}</span>
              <FigureReference figureIndex={figureIndex} />
            </div>
            <div className="h-20 w-px bg-border" />
            <div className="text-sm font-semibold text-navy/55">
              <div>Your canvas →</div>
              <div className="mt-2 text-xs font-medium text-navy/45">{figureIndex === 0 ? 'A solid shape' : 'Crossing lines'}</div>
            </div>
          </div>
        )}
        <div className="relative w-full">
          {(phase === 'warmup' || (phase === 'clock' && guideOn)) && (
            <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 640 380" preserveAspectRatio="none" aria-hidden="true">
              {phase === 'warmup' ? (
                <path d="M100 190H540" stroke="#1E3A5F" strokeWidth="3" strokeDasharray="10 12" opacity="0.22" />
              ) : (
                <>
                  <circle cx="320" cy="190" r="125" fill="none" stroke="#1E3A5F" strokeWidth="3" strokeDasharray="8 12" opacity="0.18" />
                  <path d="M320 190 392 65M320 190 269 126" stroke="#1E3A5F" strokeWidth="3" strokeDasharray="8 12" opacity="0.18" />
                </>
              )}
            </svg>
          )}
          <canvas
            ref={canvasRef}
            width={640}
            height={380}
            className="relative z-0 h-[300px] w-full touch-none rounded-[2rem] border-2 border-border bg-white shadow-sm sm:h-[380px]"
            onPointerDown={startStroke}
            onPointerMove={continueStroke}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onPointerLeave={(event) => {
              if (drawingRef.current) continueStroke(event);
            }}
            aria-label="Drawing canvas"
          />
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0 || isPaused || finishPending}
            className="absolute right-3 top-3 z-20 inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border border-border bg-white text-navy shadow-md transition-colors hover:bg-navy/5 disabled:opacity-35"
            aria-label="Undo last stroke"
            title="Undo last stroke"
          >
            <RefreshCw size={20} className="rotate-180" />
          </button>
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          {(phase === 'clock' || phase === 'warmup') && (
            <button
              type="button"
              onClick={() => setGuideOn((value) => !value)}
              className="min-h-11 rounded-full border border-border px-4 text-sm font-bold text-navy transition-colors hover:bg-navy/5"
            >
              {guideOn ? 'Hide guide' : 'Show guide'}
            </button>
          )}
          <Button
            type="button"
            onClick={doneDrawing}
            disabled={isPaused || finishPending || (phase === 'warmup' && !warmupSuccessful)}
            className="h-14 min-w-[220px] rounded-2xl bg-navy text-lg font-bold text-white hover:bg-navy/90"
          >
            {phase === 'clock' ? 'Set clock & continue' : phase === 'figure-1' ? 'Set figure & continue' : phase === 'figure-2' ? 'Finish drawings' : 'Lovely, continue'}
          </Button>
        </div>
        {phase === 'clock' && (
          <div className="w-full rounded-2xl border border-cyan/25 bg-cyan/5 p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-navy/50">Clock readiness</div>
            <div className="grid gap-2 text-sm font-semibold text-navy/70 sm:grid-cols-3">
              <span className={inkLength >= 150 ? 'text-navy' : 'text-navy/45'}>{inkLength >= 150 ? '✓' : '○'} Face</span>
              <span className={inkLength >= 220 && strokeCount >= 2 ? 'text-navy' : 'text-navy/45'}>
                {inkLength >= 220 && strokeCount >= 2 ? '✓' : '○'} Numbers & marks
              </span>
              <span className={inkLength >= 260 && strokeCount >= 3 ? 'text-navy' : 'text-navy/45'}>
                {inkLength >= 260 && strokeCount >= 3 ? '✓' : '○'} Hands at 11:10
              </span>
            </div>
            <p className="mt-2 text-xs font-medium text-navy/50">A few meaningful strokes are needed before continuing; a dot is not a clock.</p>
          </div>
        )}
        {(phase === 'figure-1' || phase === 'figure-2') && (
          <div className="flex w-full items-center justify-between rounded-2xl border border-cyan/25 bg-cyan/5 px-4 py-3 text-sm font-semibold text-navy/65">
            <span>Figure {figureIndex + 1} of 2</span>
            <span>{strokeCount >= 2 && inkLength >= 160 ? 'Ready to set' : 'Use two or more meaningful strokes'}</span>
          </div>
        )}
        {phase === 'warmup' && (
          <p className="text-center text-sm font-medium text-navy/55">
            Follow the dotted line with one relaxed stroke; a little drift is okay.
          </p>
        )}
      </div>
    </TaskShell>
  );
}

const DOMAIN_SECTORS: Record<string, number> = {
  attention: 0,
  executive: 1,
  memory: 2,
  language: 3,
  motor: 4,
  coordination: 4,
};

type ProcessingProps = {
  onComplete: () => void;
  domain?: string | number;
  activeDomain?: string | number;
  modality?: TaskModality;
};

export function ProcessingSequence({ onComplete, domain, activeDomain, modality = 'interactive' }: ProcessingProps) {
  const { state } = useDemoState();
  const speed = state.demoSpeed;
  const totalTime = speed === 'skip' ? 500 : speed === 'fast' ? 3000 : 30000;
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState(0);
  const [metrics, setMetrics] = useState({ responses: 0, signals: 0, timing: 0 });
  const [finished, setFinished] = useState(false);
  const { feedback } = useTaskFeedback();
  const selectedDomain = activeDomain ?? domain;
  const activeSector =
    typeof selectedDomain === 'number'
      ? selectedDomain
      : typeof selectedDomain === 'string'
        ? DOMAIN_SECTORS[selectedDomain.toLowerCase()] ?? null
        : null;

  usePausableTicker(
    () => setPhase((value) => Math.min(2, value + 1)),
    Math.max(120, totalTime / 3),
    isPaused,
    phase < 2,
  );
  usePausableTimeout(
    () => {
      if (!isPaused && !finished) {
        setFinished(true);
        feedback('success');
        onComplete();
      }
    },
    totalTime,
    isPaused,
    !finished,
  );

  const finishNow = () => {
    if (isPaused || finished) return;
    setFinished(true);
    feedback('success');
    onComplete();
  };

  useEffect(() => {
    const base = modality === 'voice' ? { responses: 1, signals: 18, timing: 42 } : { responses: 12, signals: 7, timing: 84 };
    const values = [
      base,
      { responses: base.responses + 8, signals: base.signals + 11, timing: base.timing + 5 },
      { responses: base.responses + 13, signals: base.signals + 19, timing: base.timing + 9 },
    ];
    setMetrics(values[phase]);
  }, [modality, phase]);

  const captions = ['Processing responses…', 'Reviewing the activity pattern…', 'Updating your Remembrance Score…'];

  return (
    <TaskFeedbackProvider>
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6 text-center">
        <div className="absolute right-5 top-5">
          <SoundToggle />
        </div>
        <button
          type="button"
          onClick={() => setIsPaused((value) => !value)}
          className="absolute left-5 top-5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-navy/5 text-navy"
          aria-label={isPaused ? 'Resume processing' : 'Pause processing'}
        >
          {isPaused ? <Play size={19} /> : <Pause size={19} />}
        </button>
        <BrainVisualization activeSector={activeSector} className="mb-6 w-64 sm:w-80" />
        <div className="mb-7 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-white/75 p-3 text-left shadow-sm">
          <Metric label="Responses" value={metrics.responses} />
          <Metric label="Signals" value={metrics.signals} />
          <Metric label="Timing" value={metrics.timing} />
        </div>
        <h2 className="max-w-md text-2xl font-bold text-navy sm:text-3xl">{captions[phase]}</h2>
        <p className="mt-3 max-w-sm text-sm font-medium text-navy/55">
          This is a simulated demo result; nothing here is a medical measurement.
        </p>
        <button
          type="button"
          onClick={finishNow}
          disabled={isPaused || finished}
          className="absolute bottom-10 min-h-11 rounded-full px-4 text-sm font-bold text-navy/55 underline decoration-cyan decoration-2 underline-offset-4 transition-colors hover:text-navy disabled:pointer-events-none disabled:opacity-30"
        >
          {speed === 'skip' ? 'Continue' : 'Skip processing'}
        </button>
        {isPaused && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/95 p-6 backdrop-blur-sm">
            <h2 className="mb-3 text-3xl font-bold text-navy">Take your time.</h2>
            <p className="mb-7 text-lg font-medium text-navy/70">Ready when you are.</p>
            <Button type="button" onClick={() => setIsPaused(false)} className="h-14 rounded-2xl bg-navy px-8 text-lg font-bold text-white hover:bg-navy/90">
              Resume
            </Button>
          </div>
        )}
      </div>
    </TaskFeedbackProvider>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.65rem] font-bold uppercase tracking-wider text-navy/45">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-navy">{value}</div>
    </div>
  );
}

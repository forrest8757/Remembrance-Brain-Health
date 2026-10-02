// Builds an XState v5 machine FROM a test spec (CLAUDE.md §3 golden rule).
// Every step becomes a state tagged with its zone. The machine emits
// commands (cmd.*) for channels to execute and consumes their events.
//
//   adm
//   ├─ running            (PAUSE → paused, remembers the step via history)
//   │   ├─ step0 … stepN  say | present | respond | practice | trials | tapTask | cuedRecall | break
//   │   │                 respond:    listening → capturing → [judging → followUp → listening]
//   │   │                 practice:   listening → capturing → judging → [retry → listening] → [feedback]
//   │   │                 trials:     ready → presenting → listening → capturing → judging
//   │   │                               → reminding (→ listening) | gap (→ ready) | done
//   │   │                 tapTask:    check → awaitTap → [recheck → awaitTap] → settle → presenting → tail
//   │   │                               | undetectable (not administered)
//   │   │                 cuedRecall: next → cue → cueListening … → choice → choiceListening … → next
//   │   └─ hist           (shallow history: resume re-enters the current step;
//   │                      a trials block resumes at its current item)
//   ├─ paused             (chrome zone; RESUME → hist, or → complete if the spec invalidates)
//   └─ complete           (final; output = AdministrationRecord)
import { assign, emit, enqueueActions, setup, type SnapshotFrom } from 'xstate';
import {
  formatChoices,
  getLine,
  renderLine,
  type CuedRecallStep,
  type PracticeStep,
  type RespondStep,
  type Step,
  type TapTaskStep,
  type TestSpec,
  type TrialsStep,
  type WindowConfig,
  type PromptRule,
  type Zone,
} from '@workspace/test-spec';
import type { Form } from '@workspace/forms';
import { emphasisClipId, tokenClipId } from '@workspace/audio';
import {
  ENGINE_VERSION,
  type AdministrationRecord,
  type AsrTokenLike,
  type CloseReason,
  type EngineCommand,
  type EngineEvent,
  type Judge,
  type Judgement,
  type ReasonCode,
} from './types';

export interface AdministrationInput {
  spec: TestSpec;
  form: Form;
  /** Session clock in ms (audio clock on web, Date.now on phone, simulated in tests). */
  now: () => number;
  /** Live judges for steps that judge responses, keyed by the spec's judge ids. */
  judges?: Record<string, Judge>;
  /** Wall clock (epoch ms) for date-dependent scoring; defaults to Date.now. */
  wallClock?: () => number;
  /** Participant's IANA time zone; defaults to the runtime's. */
  timeZone?: string;
}

export interface TrialState {
  stepKey: string;
  index: number;
  remindersUsed: number;
  /** The current item's presentation failed onset QA. */
  presentationFlagged: boolean;
  /** Final judgement per item index. */
  results: (Judgement | undefined)[];
}

export interface CueState {
  stepKey: string;
  /** Word indices still to cue, in order. */
  queue: number[];
}

export interface AdministrationContext {
  spec: TestSpec;
  form: Form;
  now: () => number;
  judges: Record<string, Judge>;
  /** Increments per say/present so stale completion events are ignored. */
  playId: number;
  stepKey: string;
  attempts: Record<string, number>;
  promptCounts: Record<string, number>;
  windowKey: string | null;
  closeReason: CloseReason | null;
  /** The participant has spoken in the current window (VAD). */
  spoke: boolean;
  trial: TrialState | null;
  cue: CueState | null;
  /** Tap-check attempts in the current tap task. */
  tapChecks: number;
  /** The live sequence decoder (sequenceTask). */
  seq: SequenceContext | null;
  lastJudgement: Judgement | null;
  record: AdministrationRecord;
}

export interface SequenceContext {
  stepKey: string;
  /** Opaque decoder state, passed back on every call. */
  state: unknown;
  /** The latest streaming transcript of the window. */
  tokens: AsrTokenLike[];
  /** Waiting out the self-correction grace period. */
  pending: boolean;
}

/** What a sequence decoder judge returns in `data` (see lib/scoring oral-trails). */
interface SequenceDecode {
  state: unknown;
  events: ({ type: string } & Record<string, unknown>)[];
  progressed: boolean;
  done: boolean;
  pending: { atMs: number } | null;
  correct: { line: 'correction' | 'correctionStart'; vars: Record<string, string>; state: unknown; errorAtMs: number | null } | null;
}

type Ctx = AdministrationContext;
type Args = { context: Ctx; event: EngineEvent };
type EventOf<T extends EngineEvent['type']> = Extract<EngineEvent, { type: T }>;

const stateKey = (i: number) => `step${i}`;
const stateId = (i: number) => `adm-step${i}`;

/** Items are stored as tokens joined by "-" ("1-8-4"); a single word is one token. */
export const itemTokens = (item: string): string[] => item.split('-').filter(Boolean);

/** Tokens a present step plays, in order. */
export function presentTokens(step: { stimulus: string; index?: number }, form: Form): string[] {
  const list = form.items[step.stimulus] ?? [];
  return step.index !== undefined ? itemTokens(list[step.index] ?? '') : list;
}

/** Silence marks the channel's VAD must emit for a response window. */
export function silenceMarksFor(w: WindowConfig): number[] {
  const marks = new Set<number>(w.prompts.flatMap((p) => (p.trigger.type === 'silence' ? [p.trigger.ms] : [])));
  if (w.closeOn.includes('silence') && w.silenceCloseMs) marks.add(w.silenceCloseMs);
  if (w.noSpeechCloseMs) marks.add(w.noSpeechCloseMs);
  return [...marks].sort((a, b) => a - b);
}

export function createAdministrationMachine(spec: TestSpec) {
  const steps = spec.steps;

  const m = setup({
    types: {
      context: {} as AdministrationContext,
      events: {} as EngineEvent,
      emitted: {} as EngineCommand,
      input: {} as AdministrationInput,
      output: {} as AdministrationRecord,
    },
    actions: {
      storeResponse: assign(({ context, event }) => {
        if (event.type !== 'RESPONSE_CAPTURED') return {};
        const { windowKey, response } = event;
        return {
          record: {
            ...context.record,
            responseWindows: context.record.responseWindows.map((w) =>
              w.windowKey === windowKey ? { ...w, audioUri: response.audioUri, asrTokens: response.asrTokens, asrUnavailable: response.asrUnavailable } : w,
            ),
            flags: response.asrUnavailable
              ? [...context.record.flags, { kind: 'asr_unavailable' as const, stepKey: context.stepKey, at: context.now() }]
              : context.record.flags,
          },
        };
      }),
    },
  });

  /** Target after step i completes. */
  const after = (i: number) => (i + 1 < steps.length ? `#${stateId(i + 1)}` : '#adm.complete');

  const enterStep = (step: Step) => assign(({ context }: Args) => ({ stepKey: step.key, playId: context.playId + 1 }));

  const logLine = (stepKey: string, lineKey: string, repeat: boolean) =>
    assign(({ context }: Args) => ({
      record: { ...context.record, lineEvents: [...context.record.lineEvents, { stepKey, lineKey, repeat, at: context.now() }] },
    }));

  type VarsOf = (ctx: Ctx) => Record<string, string>;
  const noVars: VarsOf = () => ({});

  const emitSay = (stepKey: string, lineKey: string, zone: Zone, vars: VarsOf = noVars) =>
    emit(({ context }: Args) => ({
      type: 'cmd.say' as const,
      playId: context.playId,
      stepKey,
      lineKey,
      clipId: renderLine(spec, lineKey, context.form, vars(context)).clipId,
      zone,
    }));

  const emitPrompt = (stepKey: string, promptKey: string, lineKey: string, vars: VarsOf = noVars) =>
    emit(({ context }: Args) => ({ type: 'cmd.prompt' as const, stepKey, promptKey, lineKey, clipId: renderLine(spec, lineKey, context.form, vars(context)).clipId }));

  const logPrompt = (stepKey: string, promptKey: string, reason: string) =>
    assign(({ context }: Args) => ({
      record: { ...context.record, promptEvents: [...context.record.promptEvents, { stepKey, promptKey, reason, at: context.now() }] },
    }));

  /** A substate that speaks one line and moves on when it has finished. */
  const sayState = (stepKey: string, lineKey: string, zone: Zone, target: string, vars: VarsOf = noVars) => ({
    entry: [assign(({ context }: Args) => ({ playId: context.playId + 1 })), logLine(stepKey, lineKey, false), emitSay(stepKey, lineKey, zone, vars)],
    on: {
      LINE_ENDED: { guard: ({ context, event }: Args) => (event as EventOf<'LINE_ENDED'>).playId === context.playId, target },
    },
  });

  /**
   * One response window as two substates (`<listen>` → `<capture>`). `base`
   * names the window (attempts are numbered per base); `onCaptured` runs when
   * the recording and transcript come back.
   */
  const windowStates = (opts: {
    stepKey: string;
    base: (ctx: Ctx) => string;
    itemIndex: (ctx: Ctx) => number | null;
    cfg: WindowConfig;
    onCaptured: { target: string; actions?: unknown[] };
    listen?: string;
    capture?: string;
  }) => {
    const { stepKey, cfg } = opts;
    const listen = opts.listen ?? 'listening';
    const capture = opts.capture ?? 'capturing';
    const closeTo = (reason: CloseReason, extra: unknown[] = []) => ({ target: capture, actions: [assign({ closeReason: reason }), ...extra] });
    const promptKey = (ctx: Ctx, key: string) => `${opts.base(ctx)}:${key}`;
    const phraseRules = cfg.prompts.filter((r) => r.trigger.type === 'phrase');
    return {
      [listen]: {
        entry: [
          assign(({ context }: Args) => {
            const base = opts.base(context);
            const attempt = (context.attempts[base] ?? 0) + 1;
            const windowKey = `${base}#${attempt}`;
            return {
              attempts: { ...context.attempts, [base]: attempt },
              windowKey,
              closeReason: null,
              spoke: false,
              // Prompt allowances are per window.
              promptCounts: Object.fromEntries(Object.entries(context.promptCounts).filter(([k]) => !k.startsWith(`${base}:`))),
              record: {
                ...context.record,
                responseWindows: [
                  ...context.record.responseWindows,
                  {
                    windowKey,
                    stepKey,
                    itemIndex: opts.itemIndex(context),
                    openedAt: context.now(),
                    closedAt: null,
                    closeReason: null,
                    audioUri: null,
                    asrTokens: [],
                    asrUnavailable: false,
                  },
                ],
              },
            };
          }),
          emit(({ context }: Args) => ({ type: 'cmd.openWindow' as const, windowKey: context.windowKey!, stepKey, maxMs: cfg.maxMs, silenceMarksMs: silenceMarksFor(cfg) })),
        ],
        after: {
          [cfg.maxMs]: closeTo('timeout', cfg.timeoutLine ? [logPrompt(stepKey, 'timeout', 'time_limit'), emitPrompt(stepKey, 'timeout', cfg.timeoutLine)] : []),
        },
        on: {
          PARTICIPANT_DONE: cfg.closeOn.includes('participant_done') ? closeTo('participant_done') : {},
          VAD_SPEECH: { actions: assign({ spoke: true }) },
          ASR_PARTIAL: [
            ...(cfg.countClose
              ? [
                  {
                    guard: ({ context, event }: Args) => {
                      const e = event as EventOf<'ASR_PARTIAL'>;
                      if (e.windowKey !== context.windowKey) return false;
                      const j = context.judges[cfg.countClose!.judge]?.({ expected: '', tokens: e.tokens, asrUnavailable: false });
                      return ((j?.data as { count?: number } | undefined)?.count ?? 0) >= cfg.countClose!.atLeast;
                    },
                    ...closeTo('count', cfg.countClose.line ? [logPrompt(stepKey, 'countReached', 'count'), emitPrompt(stepKey, 'countReached', cfg.countClose.line)] : []),
                  },
                ]
              : []),
            ...(phraseRules.length
              ? [
                  {
                    guard: ({ context, event }: Args) => (event as EventOf<'ASR_PARTIAL'>).windowKey === context.windowKey,
                    // Phrase prompts: a detector counts matches in the live transcript;
                    // each new match may fire its rule once more, within maxCount.
                    // Rules sharing a key share the allowance (e.g. 15-s silence and
                    // "I can't think of any more" → one prompt per trial).
                    actions: enqueueActions(({ context: c, event, enqueue }) => {
                      const context = c as Ctx;
                      const e = event as EventOf<'ASR_PARTIAL'>;
                      const counts = { ...context.promptCounts };
                      const fire: PromptRule[] = [];
                      for (const rule of phraseRules) {
                        if (rule.trigger.type !== 'phrase') continue;
                        // `expected` may name a form value, e.g. "{{secondCategory}}".
                        const expected = (rule.trigger.expected ?? '').replace(/\{\{(\w+)\}\}/g, (_, name: string) => context.form.items[name]?.[0] ?? '');
                        const j = context.judges[rule.trigger.detector]?.({ expected, tokens: e.tokens, asrUnavailable: false });
                        const matches = (j?.data as { matches?: number } | undefined)?.matches ?? 0;
                        const seenKey = promptKey(context, `${rule.key}~${rule.trigger.detector}~seen`);
                        if (matches <= (counts[seenKey] ?? 0)) continue;
                        counts[seenKey] = matches;
                        const countKey = promptKey(context, rule.key);
                        if ((counts[countKey] ?? 0) >= rule.maxCount) continue;
                        counts[countKey] = (counts[countKey] ?? 0) + 1;
                        fire.push(rule);
                      }
                      enqueue.assign({ promptCounts: counts });
                      for (const rule of fire) {
                        enqueue(logPrompt(stepKey, rule.key, `phrase:${rule.trigger.type === 'phrase' ? rule.trigger.detector : ''}`));
                        enqueue(emitPrompt(stepKey, rule.key, rule.line));
                      }
                    }),
                  },
                ]
              : []),
          ],
          VAD_SILENCE: [
            ...(cfg.noSpeechCloseMs
              ? [{ guard: ({ context, event }: Args) => !context.spoke && (event as EventOf<'VAD_SILENCE'>).ms >= cfg.noSpeechCloseMs!, ...closeTo('timeout') }]
              : []),
            {
              guard: ({ context, event }: Args) =>
                cfg.closeOn.includes('silence') &&
                (event as EventOf<'VAD_SILENCE'>).ms >= (cfg.silenceCloseMs ?? Infinity) &&
                (!cfg.silenceAfterSpeechOnly || context.spoke),
              ...closeTo('silence'),
            },
            ...cfg.prompts.map((rule) => ({
              guard: ({ context, event }: Args) =>
                rule.trigger.type === 'silence' && (event as EventOf<'VAD_SILENCE'>).ms === rule.trigger.ms && (context.promptCounts[promptKey(context, rule.key)] ?? 0) < rule.maxCount,
              actions: [
                assign(({ context }: Args) => ({
                  promptCounts: { ...context.promptCounts, [promptKey(context, rule.key)]: (context.promptCounts[promptKey(context, rule.key)] ?? 0) + 1 },
                })),
                logPrompt(stepKey, rule.key, `silence:${rule.trigger.type === 'silence' ? rule.trigger.ms : 0}`),
                emitPrompt(stepKey, rule.key, rule.line),
              ],
            })),
          ],
          REPEAT_REQUESTED: cfg.onRepeatRequest
            ? {
                guard: ({ context }: Args) => (context.promptCounts[promptKey(context, 'repeatRequest')] ?? 0) < cfg.onRepeatRequest!.maxCount,
                actions: [
                  assign(({ context }: Args) => ({
                    promptCounts: { ...context.promptCounts, [promptKey(context, 'repeatRequest')]: (context.promptCounts[promptKey(context, 'repeatRequest')] ?? 0) + 1 },
                  })),
                  logPrompt(stepKey, 'repeatRequest', 'participant_asked'),
                  emitPrompt(stepKey, 'repeatRequest', cfg.onRepeatRequest.line),
                ],
              }
            : {},
        },
      },
      [capture]: {
        entry: [
          assign(({ context }: Args) => ({
            record: {
              ...context.record,
              responseWindows: context.record.responseWindows.map((w) =>
                w.windowKey === context.windowKey ? { ...w, closedAt: context.now(), closeReason: context.closeReason } : w,
              ),
            },
          })),
          emit(({ context }: Args) => ({ type: 'cmd.closeWindow' as const, windowKey: context.windowKey!, reason: context.closeReason ?? 'timeout' })),
        ],
        on: {
          RESPONSE_CAPTURED: {
            guard: ({ context, event }: Args) => (event as EventOf<'RESPONSE_CAPTURED'>).windowKey === context.windowKey,
            target: opts.onCaptured.target,
            actions: ['storeResponse', ...(opts.onCaptured.actions ?? [])],
          },
        },
      },
    };
  };

  /** Run a judge on the captured response and record the result. */
  const judgeResponse = (opts: {
    step: PracticeStep | TrialsStep | RespondStep | CuedRecallStep;
    judgeId: string;
    expected: (ctx: Ctx) => string;
    items?: (ctx: Ctx) => string[] | undefined;
    itemIndex: (ctx: Ctx) => number;
    itemLabel?: (ctx: Ctx) => string;
    storeNote?: boolean;
  }) =>
    assign(({ context, event }: Args) => {
      const { response, windowKey } = event as EventOf<'RESPONSE_CAPTURED'>;
      const judge = context.judges[opts.judgeId];
      const flagged = opts.step.type === 'trials' && context.trial?.presentationFlagged;
      const judgement: Judgement = flagged
        ? { correct: null, tag: 'timing_flagged' }
        : judge
          ? judge({
              expected: opts.expected(context),
              items: opts.items?.(context),
              tokens: response.asrTokens,
              asrUnavailable: response.asrUnavailable,
              prior: context.record.notes,
            })
          : { correct: null, tag: 'no_judge' };
      const index = opts.itemIndex(context);
      return {
        lastJudgement: judgement,
        trial:
          opts.step.type === 'trials' && context.trial
            ? { ...context.trial, results: Object.assign([...context.trial.results], { [index]: judgement }) }
            : context.trial,
        record: {
          ...context.record,
          notes: opts.storeNote ? { ...context.record.notes, [opts.step.key]: judgement } : context.record.notes,
          trialResults: [
            ...context.record.trialResults,
            { stepKey: opts.step.key, itemIndex: index, item: (opts.itemLabel ?? opts.expected)(context), windowKey, correct: judgement.correct, tag: judgement.tag ?? null },
          ],
        },
      };
    });

  const logStimuli = (stepKey: string, itemIndex: (ctx: Ctx) => number | null, tokens: (ctx: Ctx) => string[]) =>
    assign(({ context, event }: Args) => {
      const e = event as EventOf<'PRESENTATION_ENDED'>;
      const toks = tokens(context);
      return {
        trial: context.trial && context.trial.stepKey === stepKey ? { ...context.trial, presentationFlagged: e.flagged } : context.trial,
        record: {
          ...context.record,
          stimulusEvents: [
            ...context.record.stimulusEvents,
            ...e.onsets.map((o) => ({
              stepKey,
              itemIndex: itemIndex(context),
              token: toks[o.index] ?? '',
              clipId: o.clipId,
              scheduledOnsetMs: o.scheduledOnsetMs,
              actualOnsetMs: o.actualOnsetMs,
            })),
          ],
          flags: e.flagged ? [...context.record.flags, { kind: 'timing' as const, stepKey, at: context.now() }] : context.record.flags,
        },
      };
    });

  const playIdGuard = ({ context, event }: Args) => (event as { playId: number }).playId === context.playId;

  // ---- Tap task (vigilance) ----------------------------------------------------------

  function tapTaskState(step: TapTaskStep, i: number, base: { id: string; tags: string[] }) {
    const tokens = (ctx: Ctx) => presentTokens(step, ctx.form);
    const recordTap = (phase: 'check' | 'task') =>
      assign(({ context, event }: Args) => ({
        record: {
          ...context.record,
          taps: [...context.record.taps, { stepKey: step.key, atMs: (event as EventOf<'TAP'>).atMs ?? context.now(), phase }],
        },
      }));
    const tapCapture = (on: boolean) => emit({ type: 'cmd.tapCapture' as const, stepKey: step.key, on });
    return {
      ...base,
      initial: 'check',
      entry: [enterStep(step), assign({ tapChecks: 0 })],
      exit: tapCapture(false),
      states: {
        check: sayState(step.key, step.checkLine, step.zone, 'awaitTap'),
        awaitTap: {
          entry: [assign(({ context }: Args) => ({ tapChecks: context.tapChecks + 1 })), tapCapture(true)],
          on: { TAP: { target: 'settle', actions: recordTap('check') } },
          after: {
            [step.checkTimeoutMs]: [
              { guard: ({ context }: Args) => context.tapChecks < 2, target: 'recheck' },
              {
                target: 'undetectable',
                actions: assign(({ context }: Args) => ({
                  record: {
                    ...context.record,
                    notAdministered: [...context.record.notAdministered, { stepKey: step.key, reasonCode: step.undetectableReasonCode, reason: 'taps_undetectable' }],
                  },
                })),
              },
            ],
          },
        },
        recheck: sayState(step.key, step.checkRetryLine, step.zone, 'awaitTap'),
        // A beat between the check tap and the first letter.
        settle: { on: { TAP: { actions: recordTap('check') } }, after: { 1200: 'presenting' } },
        presenting: {
          entry: [
            assign(({ context }: Args) => ({ playId: context.playId + 1 })),
            emit(({ context }: Args) => ({
              type: 'cmd.present' as const,
              playId: context.playId,
              stepKey: step.key,
              clipIds: tokens(context).map(tokenClipId),
              rateMs: step.rateMs,
              toleranceMs: step.toleranceMs,
            })),
          ],
          on: {
            TAP: { actions: recordTap('task') },
            PRESENTATION_ENDED: { guard: playIdGuard, target: 'tail', actions: logStimuli(step.key, () => step.index, tokens) },
          },
        },
        // The last letter's window runs one full interval after its onset.
        tail: { on: { TAP: { actions: recordTap('task') } }, after: { [step.rateMs]: after(i) } },
        undetectable: { always: after(i) },
      },
    };
  }

  // ---- Cued recall (MoCA delayed-recall cues) ------------------------------------------

  function cuedRecallState(step: CuedRecallStep, i: number, base: { id: string; tags: string[] }) {
    const idx = (ctx: Ctx) => ctx.cue?.queue[0] ?? 0;
    const word = (ctx: Ctx) => ctx.form.items[step.words]?.[idx(ctx)] ?? '';
    const cueVars: VarsOf = (ctx) => ({ cue: ctx.form.items[step.cues]?.[idx(ctx)] ?? '' });
    const choiceVars: VarsOf = (ctx) => ({ choices: formatChoices(ctx.form.items[step.choices]?.[idx(ctx)] ?? '') });
    const judge = (stage: 'cue' | 'choice') =>
      judgeResponse({ step, judgeId: step.judge, expected: word, itemIndex: idx, itemLabel: (ctx) => `${word(ctx)}:${stage}` });
    return {
      ...base,
      initial: 'next',
      entry: [
        enterStep(step),
        assign(({ context }: Args) => {
          if (context.cue?.stepKey === step.key) return {};
          const free = context.record.notes[step.freeRecallStep];
          const recalled = (free?.data as { recalled?: string[] } | undefined)?.recalled;
          const words = context.form.items[step.words] ?? [];
          // Unknown free recall (no transcript): cueing could cue a recalled word, so skip all cues.
          if (!recalled) {
            return {
              cue: { stepKey: step.key, queue: [] },
              record: {
                ...context.record,
                promptEvents: [...context.record.promptEvents, { stepKey: step.key, promptKey: 'cuesSkipped', reason: 'free_recall_unknown', at: context.now() }],
              },
            };
          }
          return { cue: { stepKey: step.key, queue: words.map((_, k) => k).filter((k) => !recalled.includes(words[k]!)) } };
        }),
      ],
      states: {
        next: { always: [{ guard: ({ context }: Args) => (context.cue?.queue.length ?? 0) === 0, target: after(i) }, { target: 'cue' }] },
        cue: sayState(step.key, step.cueLine, step.zone, 'cueListening', cueVars),
        ...windowStates({
          stepKey: step.key,
          base: (ctx) => `${step.key}.${idx(ctx)}.cue`,
          itemIndex: idx,
          cfg: step.window,
          onCaptured: { target: 'cueJudging', actions: [judge('cue')] },
          listen: 'cueListening',
          capture: 'cueCapturing',
        }),
        cueJudging: { always: [{ guard: ({ context }: Args) => context.lastJudgement?.correct === false, target: 'choice' }, { target: 'advance' }] },
        choice: sayState(step.key, step.choiceLine, step.zone, 'choiceListening', choiceVars),
        ...windowStates({
          stepKey: step.key,
          base: (ctx) => `${step.key}.${idx(ctx)}.choice`,
          itemIndex: idx,
          cfg: step.window,
          onCaptured: { target: 'advance', actions: [judge('choice')] },
          listen: 'choiceListening',
          capture: 'choiceCapturing',
        }),
        advance: {
          always: { target: 'next', actions: assign(({ context }: Args) => ({ cue: context.cue ? { ...context.cue, queue: context.cue.queue.slice(1) } : context.cue })) },
        },
      },
    };
  }

  // Dynamic state construction: the config is typed loosely on purpose; the
  // runtime shape is validated by the spec schema and the engine tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stepStates: Record<string, any> = {};

  steps.forEach((step, i) => {
    const base = { id: stateId(i), tags: [step.zone] };

    if (step.type === 'say') {
      const line = getLine(spec, step.line);
      stepStates[stateKey(i)] = {
        ...base,
        entry: [enterStep(step), logLine(step.key, line.key, false), emitSay(step.key, line.key, step.zone)],
        on: {
          LINE_ENDED: { guard: playIdGuard, target: after(i) },
          REPEAT_REQUESTED: {
            guard: ({ context }: Args) => line.repeatable && (context.promptCounts[`repeat:${line.key}`] ?? 0) < line.maxRepeats,
            actions: [
              assign(({ context }: Args) => ({
                playId: context.playId + 1,
                promptCounts: { ...context.promptCounts, [`repeat:${line.key}`]: (context.promptCounts[`repeat:${line.key}`] ?? 0) + 1 },
              })),
              logLine(step.key, line.key, true),
              emitSay(step.key, line.key, step.zone),
            ],
          },
        },
      };
    } else if (step.type === 'present') {
      const tokens = (ctx: Ctx) => presentTokens(step, ctx.form);
      stepStates[stateKey(i)] = {
        ...base,
        entry: [
          enterStep(step),
          emit(({ context }: Args) => {
            const emphasized = step.emphasizeFrom ? ((context.record.notes[step.emphasizeFrom]?.data as { misheard?: string[] } | undefined)?.misheard ?? []) : [];
            return {
              type: 'cmd.present' as const,
              playId: context.playId,
              stepKey: step.key,
              clipIds: tokens(context).map((t) => (emphasized.includes(t) ? emphasisClipId(t) : tokenClipId(t))),
              rateMs: step.rateMs,
              toleranceMs: step.toleranceMs,
            };
          }),
        ],
        on: {
          PRESENTATION_ENDED: { guard: playIdGuard, target: after(i), actions: logStimuli(step.key, () => step.index ?? null, tokens) },
        },
      };
    } else if (step.type === 'respond') {
      // Not prefixed with the window base: reopening the window must not reset it.
      const followUpKey = `followUp:${step.key}`;
      stepStates[stateKey(i)] = {
        ...base,
        initial: 'listening',
        entry: enterStep(step),
        states: {
          ...windowStates({
            stepKey: step.key,
            base: () => step.key,
            itemIndex: () => null,
            cfg: step,
            onCaptured: step.judge
              ? {
                  target: 'judging',
                  actions: [
                    judgeResponse({
                      step,
                      judgeId: step.judge,
                      expected: () => '',
                      items: (ctx) => (step.expected ? ctx.form.items[step.expected] : undefined),
                      itemIndex: () => -1,
                      itemLabel: () => step.key,
                      storeNote: true,
                    }),
                  ],
                }
              : { target: after(i) },
          }),
          judging: {
            always: [
              ...(step.followUp
                ? [
                    {
                      guard: ({ context }: Args) => context.lastJudgement?.tag === step.followUp!.whenTag && !context.promptCounts[followUpKey],
                      target: 'followUp',
                      actions: [assign(({ context }: Args) => ({ promptCounts: { ...context.promptCounts, [followUpKey]: 1 } })), logPrompt(step.key, 'followUp', step.followUp.whenTag)],
                    },
                  ]
                : []),
              { target: after(i) },
            ],
          },
          ...(step.followUp ? { followUp: sayState(step.key, step.followUp.line, step.zone, 'listening', (ctx) => ctx.lastJudgement?.vars ?? {}) } : {}),
        },
      };
    } else if (step.type === 'practice') {
      // Retries used so far. Not prefixed with the window base: reopening the window must not reset it.
      const retryKey = `retry:${step.key}`;
      const maxAttempts = step.attempts ?? (step.retryLine ? 2 : 1);
      const retriesUsed = (ctx: Ctx) => ctx.promptCounts[retryKey] ?? 0;
      const wrong = (ctx: Ctx) => ctx.lastJudgement?.correct === false;
      const gate = step.failGate;
      const finalWrongTarget = step.onIncorrect ? 'feedback' : gate ? 'gate' : after(i);
      const countRetry = assign(({ context }: Args) => ({ promptCounts: { ...context.promptCounts, [retryKey]: retriesUsed(context) + 1 } }));
      // Steps skipped by the gate: everything after this one up to skipTo (or the end).
      const skipToIndex = gate?.skipTo ? steps.findIndex((s2) => s2.key === gate.skipTo) : steps.length;
      const skipped = steps.slice(i + 1, skipToIndex).map((s2) => s2.key);
      stepStates[stateKey(i)] = {
        ...base,
        initial: 'listening',
        entry: enterStep(step),
        states: {
          ...windowStates({
            stepKey: step.key,
            base: () => step.key,
            itemIndex: () => null,
            cfg: step.window,
            onCaptured: { target: 'judging', actions: [judgeResponse({ step, judgeId: step.judge, expected: () => step.item, itemIndex: () => -1 })] },
          }),
          judging: {
            always: [
              ...(gate?.failOnTag ? [{ guard: ({ context }: Args) => context.lastJudgement?.tag === gate.failOnTag, target: 'gate' }] : []),
              {
                guard: ({ context }: Args) => wrong(context) && retriesUsed(context) + 1 < maxAttempts,
                target: step.feedbackEachAttempt && step.onIncorrect ? 'retryFeedback' : step.retryLine ? 'retry' : 'listening',
                actions: countRetry,
              },
              // Tag-chosen feedback (spoken for any answer), else onIncorrect for a wrong one.
              ...Object.keys(step.feedback ?? {}).map((tag) => ({
                guard: ({ context }: Args) => context.lastJudgement?.tag === tag,
                target: `fb-${tag}`,
              })),
              { guard: ({ context }: Args) => wrong(context), target: finalWrongTarget },
              { target: after(i) },
            ],
          },
          ...(step.feedbackEachAttempt && step.onIncorrect
            ? { retryFeedback: sayState(step.key, step.onIncorrect, step.zone, step.retryLine ? 'retry' : 'listening') }
            : {}),
          ...(step.retryLine ? { retry: sayState(step.key, step.retryLine, step.zone, 'listening') } : {}),
          ...(step.onIncorrect ? { feedback: sayState(step.key, step.onIncorrect, step.zone, gate ? 'gate' : after(i)) } : {}),
          ...Object.fromEntries(Object.entries(step.feedback ?? {}).map(([tag, line]) => [`fb-${tag}`, sayState(step.key, line, step.zone, after(i))])),
          ...(gate
            ? {
                gate: {
                  entry: assign(({ context }: Args) => ({
                    record: {
                      ...context.record,
                      notAdministered: [
                        ...context.record.notAdministered,
                        ...skipped.map((stepKey) => ({ stepKey, reasonCode: gate.reasonCode, reason: `gate:${step.key}` })),
                      ],
                    },
                  })),
                  always: { target: gate.skipTo ? `#${stateId(skipToIndex)}` : '#adm.complete' },
                },
              }
            : {}),
        },
      };
    } else if (step.type === 'sequenceTask') {
      const capId = `${stateId(i)}-capture`;
      const seqOf = (ctx: Ctx) => ctx.form.items[step.sequence]?.[0] ?? '';
      /** Window-relative time, the clock ASR token times use. */
      const nowRel = (ctx: Ctx) => {
        const w = ctx.record.responseWindows.find((x) => x.windowKey === ctx.windowKey);
        return w ? ctx.now() - w.openedAt : 0;
      };
      const decode = (ctx: Ctx, tokens: AsrTokenLike[], action: 'decode' | 'commit' | 'lost'): SequenceDecode | null =>
        (ctx.judges[step.decoder]?.({ expected: seqOf(ctx), tokens, asrUnavailable: false, state: ctx.seq?.state, action, nowMs: nowRel(ctx) })?.data as SequenceDecode | undefined) ?? null;
      const partialTokens = (ctx: Ctx, event: EngineEvent) =>
        event.type === 'ASR_PARTIAL' && event.windowKey === ctx.windowKey ? event.tokens : (ctx.seq?.tokens ?? []);
      const logEvents = (ctx: Ctx, events: SequenceDecode['events']) =>
        events.length ? [...ctx.record.sequenceEvents, ...events.map((e) => ({ ...e, stepKey: step.key, windowKey: ctx.windowKey ?? '' }))] : ctx.record.sequenceEvents;

      /** Store a decode without a correction (progress, pending, nothing new). */
      const store = (action: 'decode' | 'commit', pending: boolean) =>
        assign(({ context, event }: Args) => {
          const tokens = partialTokens(context, event);
          const r = decode(context, tokens, action);
          if (!r) return {};
          return { seq: { stepKey: step.key, state: r.state, tokens, pending }, record: { ...context.record, sequenceEvents: logEvents(context, r.events) } };
        });

      /** Play the decoder's correction now; the timer keeps running (build doc §T8). */
      const applyCorrection = (action: 'decode' | 'commit' | 'lost') =>
        enqueueActions(({ context: c, event, enqueue }) => {
          const context = c as Ctx;
          const tokens = partialTokens(context, event as EngineEvent);
          const r = decode(context, tokens, action);
          if (!r?.correct) return;
          const at = nowRel(context);
          const line = r.correct.line === 'correction' ? step.correctionLine : step.correctionStartLine;
          const correction = { type: 'correction', pos: (r.correct.state as { pos?: number }).pos ?? null, atMs: at, latencyMs: r.correct.errorAtMs === null ? null : at - r.correct.errorAtMs, line, vars: r.correct.vars };
          enqueue.assign({
            seq: { stepKey: step.key, state: r.correct.state, tokens, pending: false },
            record: { ...context.record, sequenceEvents: logEvents(context, [...r.events, correction]) },
          });
          enqueue(logPrompt(step.key, 'correction', action === 'lost' ? 'lost' : 'error'));
          enqueue.emit({ type: 'cmd.prompt', stepKey: step.key, promptKey: 'correction', lineKey: line, clipId: renderLine(spec, line, context.form, r.correct.vars).clipId } as never);
        });

      const decodeNow = ({ context, event }: Args) => decode(context, partialTokens(context, event), 'decode');
      const forThisWindow = ({ context, event }: Args) => event.type === 'ASR_PARTIAL' && event.windowKey === context.windowKey;
      const closeTo = (reason: CloseReason, extra: unknown[] = []) => ({ target: `#${capId}`, actions: [assign({ closeReason: reason }), ...extra] });
      const logOne = (type: string) =>
        assign(({ context }: Args) => ({ record: { ...context.record, sequenceEvents: logEvents(context, [{ type, pos: (context.seq?.state as { pos?: number } | undefined)?.pos ?? 0, atMs: nowRel(context) }]) } }));

      const ws = windowStates({
        stepKey: step.key,
        base: () => step.key,
        itemIndex: () => null,
        cfg: { maxMs: step.maxMs, closeOn: [], silenceAfterSpeechOnly: false, prompts: [] },
        onCaptured: { target: after(i) },
      }) as Record<string, Record<string, unknown>>;
      const listen = ws.listening!;
      ws.capturing!.id = capId;
      listen.entry = [...(listen.entry as unknown[]), assign({ seq: { stepKey: step.key, state: undefined, tokens: [], pending: false } })];
      listen.initial = 'running';
      // Transcript handlers live on each sub-state (not the listening state): re-entering
      // `running` to restart its 5-s timer must not re-enter (re-open) the window.
      const onPartial = (self: 'running' | 'pending' | 'stalled' | 'lost') => [
        { guard: (a: Args) => forThisWindow(a) && !!decodeNow(a)?.done, ...closeTo('count', [store('decode', false)]) },
        { guard: (a: Args) => forThisWindow(a) && !!decodeNow(a)?.correct, target: 'running', reenter: true, actions: applyCorrection('decode') },
        self === 'pending'
          ? { guard: (a: Args) => forThisWindow(a) && !!decodeNow(a)?.pending, actions: store('decode', true) }
          : { guard: (a: Args) => forThisWindow(a) && !!decodeNow(a)?.pending, target: 'pending', actions: store('decode', true) },
        { guard: (a: Args) => forThisWindow(a) && !!decodeNow(a)?.progressed, target: 'running', reenter: true, actions: store('decode', false) },
        { guard: forThisWindow, actions: store('decode', self === 'pending') },
      ];
      listen.states = {
        running: {
          on: { ASR_PARTIAL: onPartial('running') },
          after: {
            [step.stallMs]: {
              target: 'stalled',
              actions: [logOne('keepGoing'), logPrompt(step.key, 'keepGoing', 'pause'), emitPrompt(step.key, 'keepGoing', step.keepGoingLine)],
            },
          },
        },
        pending: {
          on: { ASR_PARTIAL: onPartial('pending') },
          after: {
            [step.graceMs]: [
              {
                guard: ({ context }: Args) => !!decode(context, context.seq?.tokens ?? [], 'commit')?.correct,
                target: 'running',
                actions: applyCorrection('commit'),
              },
              {
                guard: ({ context }: Args) => !!decode(context, context.seq?.tokens ?? [], 'commit')?.done,
                ...closeTo('count', [store('commit', false)]),
              },
              { target: 'running', actions: store('commit', false) },
            ],
          },
        },
        stalled: { on: { ASR_PARTIAL: onPartial('stalled') }, after: { [step.lostMs]: { target: 'lost', actions: applyCorrection('lost') } } },
        lost: {
          on: { ASR_PARTIAL: onPartial('lost') },
          after: {
            [Math.max(0, step.discontinueMs - step.lostMs)]: closeTo('discontinue', [
              logOne('discontinue'),
              assign(({ context }: Args) => ({
                record: {
                  ...context.record,
                  discontinued: [...context.record.discontinued, { stepKey: step.key, afterItemIndex: (context.seq?.state as { pos?: number } | undefined)?.pos ?? 0, at: context.now() }],
                },
              })),
            ]),
          },
        },
      };
      stepStates[stateKey(i)] = { ...base, initial: 'listening', entry: enterStep(step), states: ws };
    } else if (step.type === 'trials') {
      const items = (ctx: Ctx) => ctx.form.items[step.items] ?? [];
      const index = (ctx: Ctx) => ctx.trial?.index ?? 0;
      const currentItem = (ctx: Ctx) => items(ctx)[index(ctx)] ?? '';
      const isLast = (ctx: Ctx) => index(ctx) >= items(ctx).length - 1;
      const reminderApplies = (ctx: Ctx) =>
        !!step.reminder &&
        ctx.lastJudgement?.tag === step.reminder.whenTag &&
        index(ctx) < step.reminder.beforeItemIndex &&
        (ctx.trial?.remindersUsed ?? 0) < step.reminder.maxUses;
      const shouldDiscontinue = (ctx: Ctx) => {
        if (step.discontinue?.type !== 'allFailedInGroup') return false;
        const idx = index(ctx);
        if ((idx + 1) % step.groupSize !== 0) return false;
        const group = ctx.trial?.results.slice(idx + 1 - step.groupSize, idx + 1) ?? [];
        return group.length === step.groupSize && group.every((r) => r?.correct === false);
      };
      const next = step.interItemMs > 0 ? 'gap' : 'advance';

      stepStates[stateKey(i)] = {
        ...base,
        initial: 'ready',
        entry: [
          enterStep(step),
          // Start the block, or (after an interruption) resume at the current item.
          assign(({ context }: Args) => ({
            trial:
              context.trial?.stepKey === step.key
                ? { ...context.trial, presentationFlagged: false }
                : { stepKey: step.key, index: 0, remindersUsed: 0, presentationFlagged: false, results: [] },
          })),
        ],
        states: {
          ready: sayState(step.key, step.readyLine, step.zone, 'presenting'),
          presenting: {
            entry: [
              assign(({ context }: Args) => ({ playId: context.playId + 1 })),
              emit(({ context }: Args) => ({
                type: 'cmd.present' as const,
                playId: context.playId,
                stepKey: step.key,
                clipIds: itemTokens(currentItem(context)).map(tokenClipId),
                rateMs: step.rateMs,
                toleranceMs: step.toleranceMs,
              })),
            ],
            on: {
              PRESENTATION_ENDED: { guard: playIdGuard, target: 'listening', actions: logStimuli(step.key, index, (ctx) => itemTokens(currentItem(ctx))) },
            },
          },
          ...windowStates({
            stepKey: step.key,
            base: (ctx) => `${step.key}.${index(ctx)}`,
            itemIndex: index,
            cfg: step.window,
            onCaptured: { target: 'judging', actions: [judgeResponse({ step, judgeId: step.judge, expected: currentItem, itemIndex: index })] },
          }),
          judging: {
            always: [
              ...(step.reminder
                ? [
                    {
                      guard: ({ context }: Args) => reminderApplies(context),
                      target: 'reminding',
                      actions: [
                        assign(({ context }: Args) => ({ trial: context.trial ? { ...context.trial, remindersUsed: context.trial.remindersUsed + 1 } : context.trial })),
                        assign(({ context }: Args) => ({
                          record: {
                            ...context.record,
                            promptEvents: [...context.record.promptEvents, { stepKey: step.key, promptKey: 'reminder', reason: context.lastJudgement?.tag ?? '', at: context.now() }],
                          },
                        })),
                      ],
                    },
                  ]
                : []),
              {
                guard: ({ context }: Args) => shouldDiscontinue(context),
                target: after(i),
                actions: assign(({ context }: Args) => ({
                  record: { ...context.record, discontinued: [...context.record.discontinued, { stepKey: step.key, afterItemIndex: index(context), at: context.now() }] },
                })),
              },
              { guard: ({ context }: Args) => isLast(context), target: after(i) },
              { target: next },
            ],
          },
          // The reminder reopens the window without re-presenting the item.
          ...(step.reminder ? { reminding: sayState(step.key, step.reminder.line, step.zone, 'listening') } : {}),
          // Neutral pause, identical after any response.
          gap: { after: { [step.interItemMs]: 'advance' } },
          advance: {
            always: {
              target: 'ready',
              actions: assign(({ context }: Args) => ({
                trial: context.trial ? { ...context.trial, index: context.trial.index + 1, presentationFlagged: false } : context.trial,
              })),
            },
          },
        },
      };
    } else if (step.type === 'tapTask') {
      stepStates[stateKey(i)] = tapTaskState(step, i, base);
    } else if (step.type === 'cuedRecall') {
      stepStates[stateKey(i)] = cuedRecallState(step, i, base);
    } else {
      stepStates[stateKey(i)] = {
        ...base,
        entry: enterStep(step),
        on: { CONTINUE: { target: after(i) } },
      };
    }
  });

  return m.createMachine({
    id: 'adm',
    context: ({ input }) => ({
      spec: input.spec,
      form: input.form,
      now: input.now,
      judges: input.judges ?? {},
      playId: 0,
      stepKey: steps[0]!.key,
      attempts: {},
      promptCounts: {},
      windowKey: null,
      closeReason: null,
      spoke: false,
      trial: null,
      cue: null,
      tapChecks: 0,
      seq: null,
      lastJudgement: null,
      record: {
        testId: input.spec.testId,
        specVersion: input.spec.specVersion,
        engineVersion: ENGINE_VERSION,
        formId: input.form.formId,
        formVersion: input.form.version,
        status: 'complete',
        reasonCode: null,
        startedAt: input.now(),
        endedAt: null,
        stimulusEvents: [],
        responseWindows: [],
        promptEvents: [],
        lineEvents: [],
        trialResults: [],
        discontinued: [],
        taps: [],
        notAdministered: [],
        sequenceEvents: [],
        notes: {},
        wallClockStart: (input.wallClock ?? Date.now)(),
        timeZone: input.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        interruptions: [],
        flags: [],
      },
    }),
    initial: 'running',
    on: {
      // Captures that land outside `capturing` (e.g. while paused) are still stored.
      RESPONSE_CAPTURED: { actions: 'storeResponse' },
      FOCUS_LOST: {
        actions: assign(({ context }) => ({
          record: { ...context.record, flags: [...context.record.flags, { kind: 'focus_lost' as const, stepKey: context.stepKey, at: context.now() }] },
        })),
      },
      ABORT: {
        target: '.complete',
        actions: [
          assign(({ context, event }) => ({ record: { ...context.record, status: 'partial' as const, reasonCode: event.reasonCode as ReasonCode } })),
          emit({ type: 'cmd.stopAll' as const }),
        ],
      },
    },
    states: {
      running: {
        initial: stateKey(0),
        states: { ...stepStates, hist: { type: 'history', history: 'shallow' } },
        on: {
          PAUSE: {
            target: 'paused',
            actions: [
              assign(({ context, event }) => ({
                record: {
                  ...context.record,
                  interruptions: [...context.record.interruptions, { stepKey: context.stepKey, reason: event.reason, pausedAt: context.now(), resumedAt: null }],
                  flags: [...context.record.flags, { kind: 'interruption' as const, stepKey: context.stepKey, at: context.now() }],
                },
              })),
              emit({ type: 'cmd.stopAll' as const }),
            ],
          },
        },
      },
      paused: {
        tags: ['chrome'],
        on: {
          RESUME: [
            {
              // The interrupted step's own policy wins over the spec's (e.g. story narration → invalidate).
              guard: ({ context }) => (context.spec.steps.find((st) => st.key === context.stepKey)?.onInterrupt ?? context.spec.onInterrupt) === 'invalidate',
              target: 'complete',
              actions: assign(({ context }) => ({ record: { ...context.record, status: 'partial' as const, reasonCode: 97 as ReasonCode } })),
            },
            {
              target: 'running.hist',
              actions: assign(({ context }) => ({
                record: {
                  ...context.record,
                  interruptions: context.record.interruptions.map((r, k, all) => (k === all.length - 1 ? { ...r, resumedAt: context.now() } : r)),
                },
              })),
            },
          ],
        },
      },
      complete: {
        type: 'final',
        tags: ['chrome'],
        entry: assign(({ context }) => ({ record: { ...context.record, endedAt: context.now() } })),
      },
    },
    output: ({ context }) => context.record,
  });
}

export type AdministrationMachine = ReturnType<typeof createAdministrationMachine>;
export type AdministrationSnapshot = SnapshotFrom<AdministrationMachine>;

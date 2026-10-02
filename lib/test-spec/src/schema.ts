// Declarative, versioned test definitions (CLAUDE.md §3, §4).
// A test is an ordered list of steps. Every step carries a zone tag so the
// engine and UI can enforce the Standardization Firewall. Stimulus content is
// NOT part of the spec: it comes from the assigned Form (lib/forms), so the
// same spec runs every parallel form.
import { z } from 'zod';

export const zoneSchema = z.enum(['protocol', 'chrome']);
export type Zone = z.infer<typeof zoneSchema>;

/** Remembrance's five domains (CLAUDE.md §2 domain key). */
export const domainSchema = z.enum(['MEM', 'ATT', 'EXE', 'LANG', 'ORI']);
export type Domain = z.infer<typeof domainSchema>;

/**
 * A verbatim scripted line. `text` is what the examiner says, word for word.
 * `{{name}}` placeholders are filled from the form (`form.items[name][0]`) or
 * by the step at runtime (e.g. a cue for one word); each filled version is
 * its own pre-rendered clip.
 */
export const scriptLineSchema = z.object({
  key: z.string().min(1),
  text: z.string().min(1),
  /** Pre-rendered clip id; defaults to `${testId}.${key}` when omitted. */
  clipId: z.string().optional(),
  /**
   * Text sent to the voice for rendering when it must differ in form (not in
   * words) from the caption, e.g. "1, 8, 7" for a caption of "1–8–7".
   */
  ttsText: z.string().optional(),
  /** Whether the participant may ask for this line to be repeated (verbatim). */
  repeatable: z.boolean().default(false),
  /** How many repeats are allowed when `repeatable`. */
  maxRepeats: z.number().int().min(0).default(1),
  /**
   * False for lines that carry memory stimuli or cues (e.g. multiple-choice
   * options): they are spoken but never captioned (CLAUDE.md §4).
   */
  caption: z.boolean().default(true),
});
export type ScriptLine = z.infer<typeof scriptLineSchema>;

/** A spec-permitted prompt, e.g. "15 s silence → one allowed prompt". */
export const promptRuleSchema = z.object({
  key: z.string().min(1),
  trigger: z.discriminatedUnion('type', [
    z.object({ type: z.literal('silence'), ms: z.number().int().positive() }),
    z.object({ type: z.literal('participantAsked') }),
    /**
     * Something the participant said, found in the live transcript by a
     * detector (a judge returning data.matches), e.g. "I can't think of any
     * more". `expected` is passed to the detector (e.g. the category).
     */
    z.object({ type: z.literal('phrase'), detector: z.string().min(1), expected: z.string().optional() }),
  ]),
  /** Script line spoken when the rule fires. */
  line: z.string().min(1),
  maxCount: z.number().int().positive(),
});
export type PromptRule = z.infer<typeof promptRuleSchema>;

/** What happens to the current step when the administration is interrupted. */
export const interruptPolicySchema = z.enum(['restart_step', 'invalidate']);

const stepBase = {
  key: z.string().min(1),
  zone: zoneSchema,
  /** Overrides the spec's onInterrupt for this step (e.g. a story that can't be repeated → invalidate). */
  onInterrupt: interruptPolicySchema.optional(),
};

export const sayStepSchema = z.object({
  ...stepBase,
  type: z.literal('say'),
  line: z.string().min(1),
});

export const presentStepSchema = z.object({
  ...stepBase,
  type: z.literal('present'),
  /** Key into `form.items` holding the ordered stimulus tokens. */
  stimulus: z.string().min(1),
  /** Present only this entry of the list (its tokens split on "-"), e.g. one digit item or one sentence. */
  index: z.number().int().nonnegative().optional(),
  /** Onset-to-onset interval in ms, scheduled on the Web Audio clock. */
  rateMs: z.number().int().positive(),
  /** Allowed onset error before the trial is flagged. */
  toleranceMs: z.number().int().positive().default(50),
  /**
   * Use the "emphasized" clip for tokens a previous respond step judged as
   * misheard (judgement data `misheard: string[]`). MoCA trial 2.
   */
  emphasizeFrom: z.string().optional(),
});

/**
 * How a response window opens, closes and prompts. Shared by every step that
 * listens.
 */
export const windowConfigSchema = z.object({
  /** Hard time limit for the window (e.g. 60 s fluency). */
  maxMs: z.number().int().positive(),
  /** Ways the window may close besides the timeout. */
  closeOn: z.array(z.enum(['participant_done', 'silence'])).default(['participant_done']),
  /** Silence (VAD) after which the window closes, when `closeOn` includes 'silence'. */
  silenceCloseMs: z.number().int().positive().optional(),
  /** Only count that silence once the participant has started speaking. */
  silenceAfterSpeechOnly: z.boolean().default(false),
  /** Close (as a timeout) if nobody has spoken after this long. */
  noSpeechCloseMs: z.number().int().positive().optional(),
  prompts: z.array(promptRuleSchema).default([]),
  /** The only reply allowed when the participant asks for a repeat here. */
  onRepeatRequest: z.object({ line: z.string().min(1), maxCount: z.number().int().positive() }).optional(),
  /** Spoken when the hard time limit ends the window (e.g. "Stop." after 60 s). */
  timeoutLine: z.string().optional(),
  /**
   * Close as soon as a live judge counts enough responses in the streaming
   * transcript (e.g. serial 7s: stop after 5 answers), then say `line`.
   */
  countClose: z.object({ judge: z.string().min(1), atLeast: z.number().int().positive(), line: z.string().optional() }).optional(),
});
export type WindowConfig = z.infer<typeof windowConfigSchema>;

export const respondStepSchema = z.object({
  ...stepBase,
  type: z.literal('respond'),
  ...windowConfigSchema.shape,
  /**
   * A task cue shown large while listening (e.g. the letter "F" in phonemic
   * fluency). Never a stimulus to remember. May use {{form}} placeholders.
   */
  cue: z.string().optional(),
  /** Judge the response live (needed when a later step depends on it). */
  judge: z.string().optional(),
  /** Key into `form.items` passed to the judge as the expected items. */
  expected: z.string().optional(),
  /**
   * One scripted follow-up when the judgement has a tag (e.g. an incomplete
   * date → "Tell me the {{missing}}."); the window reopens once. `variants`
   * lists every value the judge may put in each placeholder, so each has a clip.
   */
  followUp: z
    .object({
      whenTag: z.string().min(1),
      line: z.string().min(1),
      variants: z.record(z.string(), z.array(z.string().min(1)).min(1)).default({}),
    })
    .optional(),
});

/** A scripted practice item: judged live, with scripted feedback if wrong. */
export const practiceStepSchema = z.object({
  ...stepBase,
  type: z.literal('practice'),
  /** The expected practice answer, e.g. "3-9-5" or "fruit". */
  item: z.string().min(1),
  /** Judge id (registered by the scoring package). */
  judge: z.string().min(1),
  /** Optional one-time second chance after a wrong answer ("Tell me another way…"). */
  retryLine: z.string().optional(),
  /** Line spoken only when the (final) answer is judged incorrect. */
  onIncorrect: z.string().min(1).optional(),
  /**
   * Scripted feedback chosen by the judgement's tag, spoken for any answer
   * (e.g. category-fluency practice codes 0–4). Takes the place of onIncorrect.
   */
  feedback: z.record(z.string(), z.string().min(1)).optional(),
  /** Attempts allowed (default: 2 with a retryLine, else 1). */
  attempts: z.number().int().positive().optional(),
  /** Say onIncorrect after every failed attempt, before the retry line (Oral Trails practice). */
  feedbackEachAttempt: z.boolean().default(false),
  /**
   * When the final attempt fails (or a judgement has `failOnTag`), the steps up
   * to `skipTo` (null = the rest of the test) are not administered and get
   * `reasonCode` (e.g. Oral Trails pre-test ≥3 errors → Part B code 997).
   */
  failGate: z
    .object({ skipTo: z.string().nullable(), reasonCode: z.number().int(), failOnTag: z.string().optional() })
    .optional(),
  window: windowConfigSchema,
});

/**
 * A spoken sequence followed live (Oral Trails): a decoder judge tracks the
 * expected next element in the streaming transcript, the examiner interrupts
 * errors with a correction (the timer keeps running), prompts after a pause,
 * gives the last correct position when the participant is lost, and
 * discontinues after a longer stall.
 */
export const sequenceTaskStepSchema = z.object({
  ...stepBase,
  type: z.literal('sequenceTask'),
  /** Key into form.items: entry 0 is the sequence, elements joined by "-". */
  sequence: z.string().min(1),
  /** Decoder judge id (registered by the scoring package). */
  decoder: z.string().min(1),
  /** Hard time limit (Part A 100 s, Part B 300 s). */
  maxMs: z.number().int().positive(),
  /** No progress for this long → keepGoingLine. */
  stallMs: z.number().int().positive(),
  keepGoingLine: z.string().min(1),
  /** No progress for this long after the keep-going prompt → the last correct position is given (scored as an error). */
  lostMs: z.number().int().positive(),
  /** No progress for this long after the keep-going prompt → discontinue. */
  discontinueMs: z.number().int().positive(),
  discontinueReasonCode: z.number().int(),
  /** Wait this long after a wrong element for a self-correction before interrupting. */
  graceMs: z.number().int().nonnegative(),
  /** Correction line (placeholders filled by the decoder) and the one used before anything is correct. */
  correctionLine: z.string().min(1),
  correctionStartLine: z.string().min(1),
  /** Every placeholder set the correction line can take, so each has a clip. */
  correctionVariants: z.array(z.record(z.string(), z.string())).min(1),
  /** Corrections must start within this long of the error (logged; build doc ≤1.2 s). */
  correctionBudgetMs: z.number().int().positive(),
});

/** Discontinue rule for trial blocks. */
export const discontinueRuleSchema = z.discriminatedUnion('type', [
  /** Stop when every trial in a group (e.g. both trials at one length) is failed. */
  z.object({ type: z.literal('allFailedInGroup') }),
]);

/**
 * A block of trials drawn from a form list: "Ready?" → present item → respond
 * → judge, repeated, with an optional discontinue rule and one-time reminder.
 */
export const trialsStepSchema = z.object({
  ...stepBase,
  type: z.literal('trials'),
  /** Key into `form.items`; each entry is one item, tokens separated by "-". */
  items: z.string().min(1),
  /** Trials per group (e.g. 2 per length). Groups are consecutive. */
  groupSize: z.number().int().positive(),
  /** Line spoken before every item (e.g. "Ready?"). */
  readyLine: z.string().min(1),
  rateMs: z.number().int().positive(),
  toleranceMs: z.number().int().positive().default(50),
  /** Neutral pause after each response, identical for any answer. */
  interItemMs: z.number().int().nonnegative().default(0),
  judge: z.string().min(1),
  discontinue: discontinueRuleSchema.optional(),
  /**
   * One scripted reminder when a response gets a given judge tag, on early
   * items only; the window reopens without re-presenting the item.
   */
  reminder: z
    .object({
      line: z.string().min(1),
      whenTag: z.string().min(1),
      /** Only items with index below this (0-based) qualify. */
      beforeItemIndex: z.number().int().positive(),
      maxUses: z.number().int().positive(),
    })
    .optional(),
  window: windowConfigSchema,
});

/**
 * Vigilance-style tapping: a tap check, then letters presented at a fixed
 * rate while taps are timestamped. No response window; the UI shows a TapPad.
 */
export const tapTaskStepSchema = z.object({
  ...stepBase,
  type: z.literal('tapTask'),
  /** Key into `form.items`; entry `index` holds the letters joined by "-". */
  stimulus: z.string().min(1),
  index: z.number().int().nonnegative().default(0),
  rateMs: z.number().int().positive(),
  toleranceMs: z.number().int().positive().default(50),
  /** "Tap once now" check before the letters. */
  checkLine: z.string().min(1),
  /** Asked once if no tap was detected. */
  checkRetryLine: z.string().min(1),
  checkTimeoutMs: z.number().int().positive(),
  /** Reason code recorded when taps can't be detected (task not administered). */
  undetectableReasonCode: z.number().int(),
});

/**
 * Cued recall for words missed in a free-recall step: for each missed word, a
 * category cue, then (if still missed) a multiple choice. Words already
 * recalled are never cued.
 */
export const cuedRecallStepSchema = z.object({
  ...stepBase,
  type: z.literal('cuedRecall'),
  /** form.items keys: target words, their category cues, and "a|b|c" choice sets. */
  words: z.string().min(1),
  cues: z.string().min(1),
  choices: z.string().min(1),
  /** Respond step whose live judgement lists the words already recalled. */
  freeRecallStep: z.string().min(1),
  /** Lines with {{cue}} and {{choices}} placeholders. */
  cueLine: z.string().min(1),
  choiceLine: z.string().min(1),
  judge: z.string().min(1),
  window: windowConfigSchema,
});

/** A chrome-zone card between sections; continues on the participant's tap or voice. */
export const breakStepSchema = z.object({
  ...stepBase,
  type: z.literal('break'),
  message: z.string().min(1),
  /** Optional card heading and button label (defaults: "A short pause" / "I'm ready"). */
  title: z.string().optional(),
  cta: z.string().optional(),
});

export const stepSchema = z.discriminatedUnion('type', [
  sayStepSchema,
  presentStepSchema,
  respondStepSchema,
  practiceStepSchema,
  trialsStepSchema,
  tapTaskStepSchema,
  cuedRecallStepSchema,
  breakStepSchema,
  sequenceTaskStepSchema,
]);
export type Step = z.infer<typeof stepSchema>;
export type SayStep = z.infer<typeof sayStepSchema>;
export type PresentStep = z.infer<typeof presentStepSchema>;
export type RespondStep = z.infer<typeof respondStepSchema>;
export type PracticeStep = z.infer<typeof practiceStepSchema>;
export type TrialsStep = z.infer<typeof trialsStepSchema>;
export type TapTaskStep = z.infer<typeof tapTaskStepSchema>;
export type CuedRecallStep = z.infer<typeof cuedRecallStepSchema>;
export type BreakStep = z.infer<typeof breakStepSchema>;
export type SequenceTaskStep = z.infer<typeof sequenceTaskStepSchema>;
export type ListeningStep = RespondStep | PracticeStep | TrialsStep | CuedRecallStep;

/** The response-window settings of any step that opens one. */
export function windowOf(step: ListeningStep): WindowConfig {
  return step.type === 'respond' ? step : step.window;
}

export const testSpecSchema = z
  .object({
    testId: z.string().regex(/^[a-z0-9-]+$/),
    specVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    title: z.string().min(1),
    domains: z.array(domainSchema).min(1),
    source: z.object({ document: z.string(), pages: z.string() }),
    lines: z.array(scriptLineSchema).min(1),
    steps: z.array(stepSchema).min(1),
    onInterrupt: interruptPolicySchema.default('restart_step'),
    /** Map from derived score keys to NACC field codes (e.g. C2T Q1e). */
    naccFields: z.record(z.string(), z.string()).default({}),
    /**
     * Set when the test's content needs a license or the author's permission
     * (build doc §3b). Such tests are off — no clips rendered, no route — unless
     * the owner lists them (PERMITTED_TESTS / VITE_PERMITTED_TESTS).
     */
    requiresPermission: z.string().optional(),
    /** Uses another test's forms (a delayed recall uses its immediate partner's form). */
    formsFrom: z.string().optional(),
    scorerId: z.string().min(1),
  })
  .superRefine((spec, ctx) => {
    const lineKeys = new Set(spec.lines.map((l) => l.key));
    const stepKeys = new Set<string>();
    spec.steps.forEach((step, i) => {
      if (stepKeys.has(step.key)) {
        ctx.addIssue({ code: 'custom', path: ['steps', i, 'key'], message: `Duplicate step key "${step.key}"` });
      }
      stepKeys.add(step.key);

      const refs: string[] = [];
      if (step.type === 'say') refs.push(step.line);
      if (step.type === 'respond' || step.type === 'practice' || step.type === 'trials' || step.type === 'cuedRecall') {
        const w = windowOf(step);
        refs.push(...w.prompts.map((p) => p.line));
        if (w.onRepeatRequest) refs.push(w.onRepeatRequest.line);
        if (w.timeoutLine) refs.push(w.timeoutLine);
        if (w.countClose?.line) refs.push(w.countClose.line);
        if (w.closeOn.includes('silence') && !w.silenceCloseMs) {
          ctx.addIssue({ code: 'custom', path: ['steps', i], message: 'closeOn "silence" requires silenceCloseMs' });
        }
      }
      if (step.type === 'respond' && step.followUp) {
        refs.push(step.followUp.line);
        if (!step.judge) ctx.addIssue({ code: 'custom', path: ['steps', i], message: 'followUp requires a judge' });
      }
      if (step.type === 'practice') {
        if (step.onIncorrect) refs.push(step.onIncorrect);
        if (step.feedback) refs.push(...Object.values(step.feedback));
        if (!step.onIncorrect && !step.feedback && !step.failGate) ctx.addIssue({ code: 'custom', path: ['steps', i], message: 'practice needs onIncorrect, feedback or failGate' });
        if (step.retryLine) refs.push(step.retryLine);
      }
      if (step.type === 'trials') {
        refs.push(step.readyLine);
        if (step.reminder) refs.push(step.reminder.line);
      }
      if (step.type === 'tapTask') refs.push(step.checkLine, step.checkRetryLine);
      if (step.type === 'sequenceTask') refs.push(step.keepGoingLine, step.correctionLine, step.correctionStartLine);
      if (step.type === 'practice' && step.failGate?.skipTo && !spec.steps.some((s) => s.key === step.failGate!.skipTo)) {
        ctx.addIssue({ code: 'custom', path: ['steps', i], message: `failGate.skipTo "${step.failGate.skipTo}" is not a step` });
      }
      if (step.type === 'cuedRecall') {
        refs.push(step.cueLine, step.choiceLine);
        if (!stepKeys.has(step.freeRecallStep)) {
          ctx.addIssue({ code: 'custom', path: ['steps', i], message: `freeRecallStep "${step.freeRecallStep}" must come earlier` });
        }
      }
      if (step.type === 'present' && step.emphasizeFrom && !stepKeys.has(step.emphasizeFrom)) {
        ctx.addIssue({ code: 'custom', path: ['steps', i], message: `emphasizeFrom "${step.emphasizeFrom}" must come earlier` });
      }
      for (const ref of refs) {
        if (!lineKeys.has(ref)) {
          ctx.addIssue({ code: 'custom', path: ['steps', i], message: `Unknown script line "${ref}"` });
        }
      }
      // Stimuli and their responses are protocol events by definition (CLAUDE.md §4).
      const protocolOnly = ['present', 'respond', 'trials', 'tapTask', 'cuedRecall'];
      if (protocolOnly.includes(step.type) && step.zone !== 'protocol') {
        ctx.addIssue({ code: 'custom', path: ['steps', i, 'zone'], message: `${step.type} steps must be in the protocol zone` });
      }
      if ((step.type === 'practice' || step.type === 'break') && step.zone !== 'chrome') {
        ctx.addIssue({ code: 'custom', path: ['steps', i, 'zone'], message: `${step.type} steps must be in the chrome zone` });
      }
    });
  });

export type TestSpec = z.infer<typeof testSpecSchema>;
export type TestSpecInput = z.input<typeof testSpecSchema>;

export function defineTestSpec(input: TestSpecInput): TestSpec {
  return testSpecSchema.parse(input);
}

export function getLine(spec: TestSpec, lineKey: string): ScriptLine {
  const line = spec.lines.find((l) => l.key === lineKey);
  if (!line) throw new Error(`Unknown line "${lineKey}" in ${spec.testId}`);
  return line;
}

// ---- Templated lines ------------------------------------------------------------

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

export function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1]!);
}

/** Minimal shape of a form needed to fill placeholders (avoids a lib/forms dependency). */
export interface FormLike {
  items: Record<string, string[]>;
}

export interface RenderedLine {
  text: string;
  ttsText: string;
  clipId: string;
  caption: boolean;
}

function slug(text: string): string {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (base.length <= 48) return base;
  // Long renderings get a short stable hash so ids stay readable and unique.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return `${base.slice(0, 40)}-${(h >>> 0).toString(36)}`;
}

/**
 * Fill a line's placeholders from runtime `vars` first, then from the form
 * (`form.items[name][0]`). Lines without placeholders keep their plain clip id.
 */
export function renderLine(spec: TestSpec, lineKey: string, form?: FormLike, vars: Record<string, string> = {}): RenderedLine {
  const line = getLine(spec, lineKey);
  const fill = (t: string) =>
    t.replace(PLACEHOLDER, (_, name: string) => {
      const value = vars[name] ?? form?.items[name]?.[0];
      if (value === undefined) throw new Error(`No value for {{${name}}} in ${spec.testId}.${lineKey}`);
      return value;
    });
  const templated = placeholders(line.text).length > 0 || placeholders(line.ttsText ?? '').length > 0;
  const text = fill(line.text);
  const ttsText = fill(line.ttsText ?? line.text);
  const clipId = line.clipId ?? (templated ? `${spec.testId}.${line.key}.${slug(ttsText)}` : `${spec.testId}.${line.key}`);
  return { text, ttsText, clipId, caption: line.caption };
}

/** Clip id of a line (templated lines need the form and/or runtime vars). */
export function clipIdFor(spec: TestSpec, lineKey: string, form?: FormLike, vars?: Record<string, string>): string {
  return renderLine(spec, lineKey, form, vars).clipId;
}

/** "nose|face|hand" → "nose, face, or hand". */
export function formatChoices(choices: string): string {
  const parts = choices.split('|');
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')}, or ${parts[parts.length - 1]}`;
}

/**
 * Every (line, vars) rendering an administration of this form could need,
 * for clip pre-rendering and preloading.
 */
export function enumerateRenderings(spec: TestSpec, form: FormLike): { lineKey: string; vars: Record<string, string> }[] {
  const out: { lineKey: string; vars: Record<string, string> }[] = spec.lines.map((l) => ({ lineKey: l.key, vars: {} }));
  const runtime = new Set<string>();
  for (const step of spec.steps) {
    if (step.type === 'cuedRecall') {
      runtime.add(step.cueLine).add(step.choiceLine);
      (form.items[step.cues] ?? []).forEach((cue) => out.push({ lineKey: step.cueLine, vars: { cue } }));
      (form.items[step.choices] ?? []).forEach((c) => out.push({ lineKey: step.choiceLine, vars: { choices: formatChoices(c) } }));
    }
    if (step.type === 'sequenceTask') {
      runtime.add(step.correctionLine).add(step.correctionStartLine);
      for (const vars of step.correctionVariants) out.push({ lineKey: step.correctionLine, vars });
      out.push({ lineKey: step.correctionStartLine, vars: { first: (form.items[step.sequence]?.[0] ?? '').split('-')[0] ?? '' } });
    }
    if (step.type === 'respond' && step.followUp && Object.keys(step.followUp.variants).length) {
      runtime.add(step.followUp.line);
      const names = Object.keys(step.followUp.variants);
      // Placeholders are filled independently; one placeholder per follow-up line in practice.
      for (const name of names) for (const value of step.followUp.variants[name]!) out.push({ lineKey: step.followUp.line, vars: { [name]: value } });
    }
  }
  // Runtime-only lines have no base rendering.
  return out.filter((r) => !(runtime.has(r.lineKey) && Object.keys(r.vars).length === 0));
}

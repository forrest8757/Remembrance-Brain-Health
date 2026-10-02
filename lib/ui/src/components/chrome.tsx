// CHROME-zone screens and cards (CLAUDE.md §9, §10). Warmth and motion are
// welcome here; nothing here ever shows stimuli or scores.
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotionConfig } from 'framer-motion';
import { Button, Stack, Text, cx } from '../primitives';
import { AssessmentLayout } from './AssessmentLayout';
import { ListeningOrb } from './ListeningOrb';

// ---- MicCheck ---------------------------------------------------------------

export type MicCheckStatus = 'requesting' | 'listening' | 'tooQuiet' | 'good' | 'denied' | 'unsupported';

const MIC_STATUS: Record<MicCheckStatus, string> = {
  requesting: 'Allow the microphone when your device asks',
  listening: 'Listening…',
  tooQuiet: 'I can barely hear you. Try moving a little closer',
  good: 'I can hear you clearly',
  denied: 'The microphone is turned off for this page',
  unsupported: "This device can't share its microphone here",
};

export function MicCheck({
  status,
  getAmplitude,
  onContinue,
  onRetry,
  step,
}: {
  status: MicCheckStatus;
  getAmplitude?: () => number;
  onContinue: () => void;
  onRetry?: () => void;
  step?: string;
}) {
  const blocked = status === 'denied' || status === 'unsupported';
  return (
    <AssessmentLayout
      aside={
        <Stack gap={6} className="items-center">
          <ListeningOrb state={status === 'listening' || status === 'good' || status === 'tooQuiet' ? 'listening' : 'idle'} getAmplitude={getAmplitude} />
          <p role="status" className="flex items-center gap-3 text-center text-rm-lead font-semibold">
            <span aria-hidden className={cx('h-3 w-3 shrink-0 rounded-full', status === 'good' ? 'bg-rm-cyan' : 'bg-rm-line')} />
            {MIC_STATUS[status]}
          </p>
        </Stack>
      }
    >
      {step && <Text variant="eyebrow">{step}</Text>}
      <Text variant="title">Let's make sure I can hear you.</Text>
      <Text variant="lead">
        {blocked
          ? 'To take these activities we need to hear your voice. You can turn the microphone on in your browser settings, then try again.'
          : "Say your name out loud, the way you'd talk across a kitchen table."}
      </Text>
      {blocked ? (
        onRetry && <Button onClick={onRetry}>Try again</Button>
      ) : (
        <Button onClick={onContinue} disabled={status !== 'good'}>
          Sounds good, continue
        </Button>
      )}
    </AssessmentLayout>
  );
}

// ---- HearingCheck -----------------------------------------------------------

/** One yes/no question from the verbatim hearing screen (P1). */
export function HearingCheck({ question, onAnswer, step }: { question: string; onAnswer: (yes: boolean) => void; step?: string }) {
  return (
    <AssessmentLayout aside={<ListeningOrb state="examinerSpeaking" />}>
      {step && <Text variant="eyebrow">{step}</Text>}
      <Text variant="instruction" aria-live="polite">
        {question}
      </Text>
      <Stack gap={4} direction="responsive">
        <Button onClick={() => onAnswer(true)}>Yes</Button>
        <Button variant="secondary" onClick={() => onAnswer(false)}>
          No
        </Button>
      </Stack>
    </AssessmentLayout>
  );
}

// ---- EnvironmentCheck -------------------------------------------------------

export interface EnvironmentItem {
  key: string;
  label: string;
  done: boolean;
}

/** "Getting your space ready" checklist; items tick off with gentle motion. */
export function EnvironmentCheck({ items, onContinue }: { items: EnvironmentItem[]; onContinue: () => void }) {
  const reduce = useReducedMotionConfig();
  const allDone = items.every((i) => i.done);
  return (
    <AssessmentLayout
      aside={
        <ul className="flex w-full flex-col gap-4" aria-label="Your space">
          {items.map((item) => (
            <li key={item.key} className="flex min-h-16 items-center gap-4 rounded-rm-md bg-rm-cream px-5">
              <span aria-hidden className={cx('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2', item.done ? 'border-rm-navy bg-rm-navy' : 'border-rm-line')}>
                <AnimatePresence>
                  {item.done && (
                    <motion.svg viewBox="0 0 24 24" className="h-5 w-5" initial={reduce ? false : { pathLength: 0, opacity: 0 }} animate={{ opacity: 1 }}>
                      <motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
                    </motion.svg>
                  )}
                </AnimatePresence>
              </span>
              <span className="text-rm-body">
                {item.label}
                <span className="sr-only">{item.done ? ' (done)' : ' (not yet)'}</span>
              </span>
            </li>
          ))}
        </ul>
      }
    >
      <Text variant="eyebrow">Getting your space ready</Text>
      <Text variant="title">A calm space helps you do your best.</Text>
      <Text variant="lead">We'll go through a few quick things together.</Text>
      <Button onClick={onContinue} disabled={!allDone}>
        My space is ready
      </Button>
    </AssessmentLayout>
  );
}

// ---- ConsentCard ------------------------------------------------------------

export function ConsentCard({ title, children, onAgree, onDecline }: { title: string; children: ReactNode; onAgree: () => void; onDecline: () => void }) {
  return (
    <AssessmentLayout>
      <Text variant="eyebrow">Before we start</Text>
      <Text variant="title">{title}</Text>
      <div className="max-w-[60ch] space-y-4 text-rm-body text-rm-ink-soft">{children}</div>
      <Stack gap={4} direction="responsive">
        <Button onClick={onAgree}>I agree</Button>
        <Button variant="secondary" onClick={onDecline}>
          Not today
        </Button>
      </Stack>
    </AssessmentLayout>
  );
}

// ---- PracticeCard -----------------------------------------------------------

/** Chrome wrapper around a scripted practice item. */
export function PracticeCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-rm-lg border-2 border-dashed border-rm-line p-6">
      <Text variant="eyebrow">Practice (this one doesn't count)</Text>
      {children}
    </div>
  );
}

// ---- Breathing pacer, BreakCard, DelayActivity ------------------------------

export function BreathingPacer({ size = 240 }: { size?: number }) {
  const reduce = useReducedMotionConfig();
  return (
    <div aria-hidden className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full border-2 border-rm-meter-off" />
      <div className={cx('absolute inset-0 rounded-full bg-rm-cyan opacity-90', !reduce && 'animate-rm-pacer')} style={reduce ? { transform: 'scale(0.8)' } : undefined} />
    </div>
  );
}

export function BreakCard({ next, onContinue }: { next?: string; onContinue: () => void }) {
  return (
    <AssessmentLayout aside={<BreathingPacer />}>
      <Text variant="eyebrow">{next ? `Break · Next: ${next}` : 'Break'}</Text>
      <Text variant="title">Time for a short breather.</Text>
      <Text variant="lead">Follow the circle. Breathe in as it grows, and out as it settles.</Text>
      <Button onClick={onContinue}>I'm ready for the next one</Button>
    </AssessmentLayout>
  );
}

/**
 * Non-verbal delay-interval filler (CLAUDE.md §10): no words to remember, no
 * reading, no verbal games. The orchestrator decides when it ends.
 */
export function DelayActivity({ onReady, ready }: { onReady?: () => void; ready: boolean }) {
  return (
    <AssessmentLayout aside={<BreathingPacer />}>
      <Text variant="eyebrow">A quiet moment</Text>
      <Text variant="title">Let's rest for a little while.</Text>
      <Text variant="lead">Breathe along with the circle. We'll continue when it's time.</Text>
      {ready && onReady && <Button onClick={onReady}>Continue</Button>}
    </AssessmentLayout>
  );
}

// ---- InterruptionSheet ------------------------------------------------------

export function InterruptionSheet({ open, onResume, onStop }: { open: boolean; onResume: () => void; onStop: () => void }) {
  const reduce = useReducedMotionConfig();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onResume();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onResume]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-rm-scrim md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rm-pause-title"
            className="w-full max-w-[560px] rounded-t-rm-lg bg-rm-surface p-6 font-rm shadow-rm-sheet md:rounded-rm-lg md:p-10"
            initial={reduce ? false : { y: 40 }}
            animate={{ y: 0 }}
            exit={reduce ? undefined : { y: 40 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Stack gap={6}>
              <Text variant="title" id="rm-pause-title">
                Paused
              </Text>
              <Text variant="lead">Take all the time you need. We saved your place.</Text>
              <Stack gap={4}>
                <Button block onClick={onResume}>
                  I'm ready to continue
                </Button>
                <Button block variant="secondary" onClick={onStop}>
                  I need to stop for today
                </Button>
              </Stack>
            </Stack>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---- SessionComplete --------------------------------------------------------

/** Warm completion. Never shows per-test scores (CLAUDE.md §9). */
export function SessionComplete({
  name,
  resultsWhen = 'tomorrow morning',
  streakWeeks,
  onDone,
}: {
  name?: string;
  resultsWhen?: string;
  streakWeeks?: number;
  onDone: () => void;
}) {
  return (
    <AssessmentLayout
      aside={
        streakWeeks ? (
          <Stack gap={6} className="w-full">
            <Text variant="eyebrow">Consistency</Text>
            <div aria-hidden className="flex gap-3">
              {Array.from({ length: Math.min(streakWeeks, 8) }, (_, w) => (
                <div key={w} className="flex flex-1 flex-col items-center gap-2">
                  <span className="h-16 w-full rounded-rm-sm bg-rm-navy" />
                  <span className="text-rm-eyebrow text-rm-ink-soft">Wk {w + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-[28px] font-bold">{streakWeeks} weeks in a row</p>
            <Text variant="body" className="text-rm-ink-soft">
              You've made time for your brain health every week.
            </Text>
          </Stack>
        ) : (
          <ListeningOrb state="idle" size={180} />
        )
      }
    >
      <Text variant="eyebrow">Session complete</Text>
      <Text variant="title">{name ? `That's everything for today, ${name}.` : "That's everything for today."}</Text>
      <Text variant="lead">Thank you for your time and focus. Your results will be ready {resultsWhen}.</Text>
      <Button onClick={onDone}>Back to home</Button>
    </AssessmentLayout>
  );
}

// ---- ProfileSetup (one-time, before the first activity; D8, D10, norms) ------

export interface ParticipantProfile {
  /** What to call them (greeting and identity check, P1). */
  firstName: string;
  /** City or town only. Never a street address (D8). */
  city: string;
  location: 'home' | 'other';
  /** Name of the usual place when not at home (e.g. "Sunrise Senior Living"). */
  placeName?: string;
  /** Representative years for the chosen education band (D10 only needs ≤12 vs more). */
  educationYears: number;
  /** Birth year only (not a full date): age for comparing with people of the same age. */
  birthYear: number;
  /** For comparing with people of the same sex; 'undisclosed' compares with everyone that age. */
  sex: 'female' | 'male' | 'undisclosed';
}

/** A saved profile from before birth year and sex were asked is incomplete. */
export function isProfileComplete(p: Partial<ParticipantProfile> | null | undefined): p is ParticipantProfile {
  return !!p && !!p.firstName && !!p.city && !!p.location && typeof p.educationYears === 'number' && typeof p.birthYear === 'number' && !!p.sex;
}

const SEX = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'undisclosed', label: "I'd rather not say" },
] as const;

const THIS_YEAR = new Date().getFullYear();

const EDUCATION = [
  { years: 12, label: '12 years or fewer', detail: 'High school or less' },
  { years: 16, label: '13 to 16 years', detail: 'Some college, or a college degree' },
  { years: 18, label: '17 years or more', detail: 'Graduate or professional study' },
];

export function ProfileSetup({ initial, onSave }: { initial?: Partial<ParticipantProfile>; onSave: (profile: ParticipantProfile) => void }) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [location, setLocation] = useState<'home' | 'other' | null>(initial?.location ?? null);
  const [placeName, setPlaceName] = useState(initial?.placeName ?? '');
  const [educationYears, setEducationYears] = useState<number | null>(initial?.educationYears ?? null);
  const [birthYearText, setBirthYearText] = useState(initial?.birthYear ? String(initial.birthYear) : '');
  const [sex, setSex] = useState<ParticipantProfile['sex'] | null>(initial?.sex ?? null);
  // Answered already (e.g. in onboarding)? Then only the rest is asked, once.
  const [known] = useState(() => ({
    firstName: !!initial?.firstName,
    birthYear: typeof initial?.birthYear === 'number',
    sex: !!initial?.sex,
    educationYears: typeof initial?.educationYears === 'number',
  }));
  const onlyPlace = known.firstName && known.birthYear && known.sex && known.educationYears;
  const birthYear = /^\d{4}$/.test(birthYearText.trim()) ? Number(birthYearText.trim()) : null;
  const birthYearValid = birthYear !== null && birthYear >= THIS_YEAR - 110 && birthYear <= THIS_YEAR - 18;
  const ready =
    firstName.trim().length > 0 &&
    city.trim().length > 1 &&
    location !== null &&
    (location === 'home' || placeName.trim().length > 1) &&
    educationYears !== null &&
    birthYearValid &&
    sex !== null;
  const choice = (selected: boolean) =>
    cx(
      'rm-focus flex min-h-16 w-full flex-col items-start justify-center rounded-rm-md border-2 px-5 py-3 text-left text-rm-body',
      selected ? 'border-rm-navy bg-rm-navy text-rm-surface' : 'border-rm-line bg-rm-surface text-rm-ink',
    );
  const input = 'rm-focus min-h-16 w-full rounded-rm-md border-2 border-rm-line bg-rm-surface px-5 text-rm-lead text-rm-ink';

  return (
    <AssessmentLayout>
      <Text variant="eyebrow">About you · asked once</Text>
      <Text variant="title">{onlyPlace ? 'Two quick questions.' : 'A few quick questions.'}</Text>
      <Text variant="lead">
        {onlyPlace ? 'Where you are today. ' : 'These help us understand your answers and compare them with people like you. '}We'll never ask for your address.
      </Text>

      {!known.firstName && (
      <label className="flex flex-col gap-3">
        <span className="text-rm-label font-semibold">What should we call you?</span>
        <input className={input} value={firstName} onChange={(e) => setFirstName(e.target.value.slice(0, 40))} autoComplete="given-name" placeholder="Your first name" />
      </label>
      )}

      {!known.birthYear && (
      <label className="flex flex-col gap-3">
        <span className="text-rm-label font-semibold">What year were you born?</span>
        <input
          className={input}
          value={birthYearText}
          onChange={(e) => setBirthYearText(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          autoComplete="bday-year"
          placeholder="For example, 1956"
          aria-invalid={birthYearText.length === 4 && !birthYearValid}
        />
        {birthYearText.length === 4 && !birthYearValid && <span className="text-rm-body text-rm-ink-soft">Please check the year.</span>}
      </label>
      )}

      {!known.sex && (
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-rm-label font-semibold">What is your sex?</legend>
        {SEX.map((o) => (
          <button key={o.value} type="button" className={choice(sex === o.value)} aria-pressed={sex === o.value} onClick={() => setSex(o.value)}>
            {o.label}
          </button>
        ))}
      </fieldset>
      )}

      <label className="flex flex-col gap-3">
        <span className="text-rm-label font-semibold">What city or town do you live in?</span>
        <input className={input} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" placeholder="For example, Provo" />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-rm-label font-semibold">Where will you usually do these activities?</legend>
        <button type="button" className={choice(location === 'home')} aria-pressed={location === 'home'} onClick={() => setLocation('home')}>
          At home
        </button>
        <button type="button" className={choice(location === 'other')} aria-pressed={location === 'other'} onClick={() => setLocation('other')}>
          Somewhere else
        </button>
        {location === 'other' && (
          <input className={input} value={placeName} onChange={(e) => setPlaceName(e.target.value)} placeholder="Name of the place, e.g. Sunrise Senior Living" aria-label="Name of the place" />
        )}
      </fieldset>

      {!known.educationYears && (
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-rm-label font-semibold">How many years of school have you completed?</legend>
        {EDUCATION.map((e) => (
          <button key={e.years} type="button" className={choice(educationYears === e.years)} aria-pressed={educationYears === e.years} onClick={() => setEducationYears(e.years)}>
            <span className="font-semibold">{e.label}</span>
            <span className="text-rm-eyebrow opacity-80">{e.detail}</span>
          </button>
        ))}
      </fieldset>
      )}

      <Button
        disabled={!ready}
        onClick={() =>
          onSave({
            firstName: firstName.trim(),
            city: city.trim(),
            location: location!,
            placeName: location === 'other' ? placeName.trim() : undefined,
            educationYears: educationYears!,
            birthYear: birthYear!,
            sex: sex!,
          })
        }
      >
        Save and continue
      </Button>
    </AssessmentLayout>
  );
}

// Onboarding (redesign Phase 3, rollout 7; extended 2026-10-02). One short
// screen at a time: welcome → which is easier to read (dark or light) → text
// size, with a live preview → about you (name, birth year, sex) → schooling
// and why you're here → brain health in your family → your own health → done.
// Display choices save as you make them (rm.display). Name, birth year, sex and
// education go into the participant profile (rm.profile) that the session
// reads, so its profile step only asks what's left (city, usual place).
// Health and family history: onboarding/background.ts.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  CheckList,
  ChoiceGroup,
  StatusIcon,
  readDisplayPrefs,
  saveDisplayPrefs,
  ThemeRoot,
  type Choice,
  type DisplayPrefs,
  type ThemeName,
  useSystemTheme,
} from '@workspace/ui';
import { useDemoState } from '@/lib/store';
import {
  EDUCATION,
  EMPTY_FAMILY,
  familySummary,
  saveBackground,
  saveProfileFields,
  type FamilyBrainHealth,
  type GeneticTest,
  type YesNoUnsure,
} from '@/onboarding/background';

const STEPS = 8;
const THIS_YEAR = new Date().getFullYear();
const SIZES: Choice<number>[] = [
  { value: 100, label: 'Standard' },
  { value: 125, label: 'Larger' },
  { value: 150, label: 'Large' },
  { value: 200, label: 'Largest' },
];
const SEX: Choice<'female' | 'male' | 'undisclosed'>[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'undisclosed', label: "I'd rather not say" },
];
const SCHOOLING: Choice<string>[] = EDUCATION.map((e) => ({ value: e.value, label: e.label, detail: 'detail' in e ? e.detail : undefined }));
const REASONS: Choice<string>[] = ['Staying proactive', 'Noticing small changes', 'Family history', 'Something else'].map((r) => ({ value: r, label: r }));
const YES_NO: Choice<YesNoUnsure>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure' },
];
const CLOSE_FAMILY = ['Mother', 'Father', 'A brother or sister'];
const ONSET: Choice<'before65' | '65plus' | 'unsure'>[] = [
  { value: 'before65', label: 'Before 65' },
  { value: '65plus', label: '65 or older' },
  { value: 'unsure', label: 'Not sure' },
];
const OTHER_FAMILY = ["Parkinson's disease", 'A stroke', 'Memory problems that were never diagnosed'];
const CONDITIONS = ['High blood pressure', 'High cholesterol', 'Diabetes', 'Heart disease', 'Depression or anxiety', 'Hearing loss', 'Trouble sleeping'];
const GENETIC: Choice<GeneticTest>[] = [
  { value: 'never', label: "No, I haven't" },
  { value: 'apoe4-none', label: 'Yes, and I have no copies of APOE4' },
  { value: 'apoe4-one', label: 'Yes, and I have one copy of APOE4' },
  { value: 'apoe4-two', label: 'Yes, and I have two copies of APOE4' },
  { value: 'unsure-result', label: "Yes, but I'm not sure of the result" },
  { value: 'undisclosed', label: "I'd rather not say" },
];

/** A gentle note under a question that hasn't been answered yet: icon + words, never color alone. */
function Missing({ id, show, children }: { id: string; show: boolean; children: ReactNode }) {
  return show ? (
    <p id={id} className="flex items-start gap-3 font-semibold">
      <StatusIcon status="watch" size={24} />
      <span className="min-w-0">{children}</span>
    </p>
  ) : null;
}

/** The first unanswered question's field, to move focus to it. */
const FIELD_FOR: Record<string, string> = {
  name: '#first-name',
  year: '#birth-year',
  sex: 'input[name="sex"]',
  school: 'input[name="schooling"]',
};

function Step({ n, title, lead, children, onBack }: { n: number; title: string; lead?: string; children: ReactNode; onBack?: () => void }) {
  // A new step moves focus to its question, once (screen readers hear it).
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (n > 1) heading.current?.focus({ preventScroll: true });
  }, [n]);
  return (
    <main className="mx-auto flex w-full max-w-[40rem] flex-col gap-6 px-4 pb-10 pt-6">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4">
        {onBack ? (
          <button type="button" onClick={onBack} className="ds-tap -ml-2 inline-flex items-center gap-2 rounded-2xl px-2 font-semibold" style={{ color: 'var(--accent-text)' }}>
            <svg aria-hidden viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Back
          </button>
        ) : (
          <span className="font-semibold">Remembrance</span>
        )}
        <span className="ds-label">
          Step {n} of {STEPS}
        </span>
      </div>
      <header className="flex flex-col gap-2">
        <h1 className="text-[2rem] font-semibold leading-tight" tabIndex={-1} ref={heading}>
          {title}
        </h1>
        {lead && <p className="text-[1.2rem]">{lead}</p>}
      </header>
      {children}
    </main>
  );
}

/** A small, true-to-life sample of one theme. */
function ThemeSample({ theme, chosen, onChoose }: { theme: ThemeName; chosen: boolean; onChoose: () => void }) {
  const name = theme === 'dark' ? 'Dark' : 'Light';
  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={onChoose}
      className="ds-tap flex flex-col gap-3 rounded-[1.5rem] p-2 text-left"
      style={{ border: `${chosen ? 4 : 2}px solid ${chosen ? 'var(--accent-text)' : 'var(--track)'}` }}
    >
      <div className="ds-root flex flex-col gap-2 rounded-2xl p-4" data-theme={theme} style={{ minHeight: 'auto' }}>
        <span className="ds-label">Sample</span>
        <span className="text-[1.4rem] font-semibold leading-tight">Good morning.</span>
        <span>Your weekly session is ready when you are.</span>
      </div>
      <span className="flex items-center gap-3 px-2 pb-1 font-semibold">
        <svg aria-hidden viewBox="0 0 24 24" width="1.25em" height="1.25em" className="shrink-0">
          <circle cx="12" cy="12" r="10" fill="none" stroke={chosen ? 'var(--accent-text)' : 'var(--text-2)'} strokeWidth="2.5" />
          {chosen && <circle cx="12" cy="12" r="5.5" fill="var(--accent-text)" />}
        </svg>
        {name}
      </span>
    </button>
  );
}

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { updateProfile, setOnboardingComplete } = useDemoState();
  const [prefs, setPrefs] = useState<DisplayPrefs>(() => readDisplayPrefs());
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [birthYearText, setBirthYearText] = useState('');
  const [sex, setSex] = useState<'female' | 'male' | 'undisclosed' | null>(null);
  const [education, setEducation] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [family, setFamily] = useState<FamilyBrainHealth>(EMPTY_FAMILY);
  const [conditions, setConditions] = useState<string[]>([]);
  const [genetic, setGenetic] = useState<GeneticTest | null>(null);
  /** Which required answers were missing when Continue was tapped. */
  const [missing, setMissing] = useState<string[]>([]);

  const birthYear = /^\d{4}$/.test(birthYearText) ? Number(birthYearText) : null;
  const birthYearValid = birthYear !== null && birthYear >= THIS_YEAR - 110 && birthYear <= THIS_YEAR - 18;
  const fam = (f: Partial<FamilyBrainHealth>) => setFamily((cur) => ({ ...cur, ...f }));
  /** Continue only when every required answer is there; otherwise say which. */
  const require = (gaps: (string | false)[]) => {
    const g = gaps.filter(Boolean) as string[];
    setMissing(g);
    if (!g.length) return next();
    // Continue is at the bottom of a long page: take them to the first question that needs an answer.
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(FIELD_FOR[g[0]!] ?? '');
      el?.focus({ preventScroll: true });
      el?.closest('section')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  };

  const display = (p: Partial<DisplayPrefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    saveDisplayPrefs(next);
  };
  const next = () => {
    setMissing([]);
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };
  const back = () => {
    setMissing([]);
    setStep((s) => s - 1);
    window.scrollTo(0, 0);
  };
  const finish = (to: string) => {
    const edu = EDUCATION.find((e) => e.value === education)!;
    saveProfileFields({ firstName: firstName.trim(), birthYear: birthYear!, sex: sex!, educationYears: edu.years });
    saveBackground({ education: edu.value, reason, conditions, family, geneticTest: genetic });
    updateProfile({
      firstName: firstName.trim(),
      age: String(THIS_YEAR - birthYear!),
      sex: SEX.find((o) => o.value === sex)!.label,
      education: edu.label,
      reason: reason ?? '',
      conditions,
      familyHistory: familySummary(family),
    });
    setOnboardingComplete(true);
    setLocation(to);
  };
  const system = useSystemTheme();
  const shown: ThemeName = prefs.theme === 'system' ? system : prefs.theme;

  return (
    <ThemeRoot prefs={prefs}>
      {step === 1 && (
        <Step key={1} n={1} title="Welcome to Remembrance." lead="A weekly check on your memory and thinking, done by talking, at home. Setting up takes about 4 minutes.">
          <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
            <div aria-hidden className="ds-glow" />
            <span aria-hidden className="relative h-24 w-24 rounded-full" style={{ background: 'var(--orb)' }} />
          </div>
          <button type="button" className="ds-button ds-button-primary" onClick={next}>
            Get started
          </button>
          <p style={{ fontSize: '1rem' }}>A wellness activity, not a medical test.</p>
        </Step>
      )}

      {step === 2 && (
        <Step key={2} n={2} title="Which is easier to read?" lead="Tap the one that feels more comfortable. You can change this later in Settings." onBack={back}>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(15rem,100%),1fr))]">
            <ThemeSample theme="dark" chosen={shown === 'dark'} onChoose={() => display({ theme: 'dark' })} />
            <ThemeSample theme="light" chosen={shown === 'light'} onChoose={() => display({ theme: 'light' })} />
          </div>
          <button type="button" className="ds-button ds-button-primary" onClick={next}>
            Continue
          </button>
        </Step>
      )}

      {step === 3 && (
        <Step key={3} n={3} title="Is this text comfortable to read?" lead="Choose a size. This page changes as you tap, so you can see it." onBack={back}>
          <section className="ds-card">
            <ChoiceGroup name="text-size" legend="Text size" options={SIZES} value={prefs.textSize} onChange={(v) => display({ textSize: v })} layout="wrap" />
          </section>
          <button type="button" className="ds-button ds-button-primary" onClick={next}>
            This size is good
          </button>
        </Step>
      )}

      {step === 4 && (
        <Step key={4} n={4} title="A little about you" lead="This helps us compare your results with people your age." onBack={back}>
          <section className="ds-card flex flex-col gap-3" style={missing.includes('name') ? { borderColor: 'var(--watch)' } : undefined}>
            <label htmlFor="first-name" className="ds-title">
              What should we call you?
            </label>
            <input
              id="first-name"
              value={firstName}
              autoComplete="given-name"
              onChange={(e) => setFirstName(e.target.value.slice(0, 40))}
              aria-describedby={missing.includes('name') && !firstName.trim() ? 'name-missing' : undefined}
              className="ds-tap w-full rounded-2xl px-4"
              style={{ background: 'var(--bg)', color: 'var(--text)', border: '2px solid var(--text-2)' }}
            />
            <Missing id="name-missing" show={missing.includes('name') && !firstName.trim()}>
              Please type the name you'd like us to use.
            </Missing>
          </section>
          <section className="ds-card flex flex-col gap-3" style={missing.includes('year') && !birthYearValid ? { borderColor: 'var(--watch)' } : undefined}>
            <label htmlFor="birth-year" className="ds-title">
              What year were you born?
            </label>
            <input
              id="birth-year"
              value={birthYearText}
              inputMode="numeric"
              autoComplete="bday-year"
              placeholder="For example, 1952"
              onChange={(e) => setBirthYearText(e.target.value.replace(/\D/g, '').slice(0, 4))}
              aria-invalid={birthYearText.length === 4 && !birthYearValid}
              aria-describedby="birth-year-note"
              className="ds-tap w-full rounded-2xl px-4"
              style={{ background: 'var(--bg)', color: 'var(--text)', border: '2px solid var(--text-2)' }}
            />
            {/* Reading the age back catches a mistyped year. */}
            <p id="birth-year-note" aria-live="polite">
              {birthYearValid ? `So you're about ${THIS_YEAR - birthYear!}.` : birthYearText.length === 4 ? 'Please check the year.' : ''}
            </p>
            <Missing id="year-missing" show={missing.includes('year') && birthYearText.length < 4}>
              Please type the year you were born, like 1952.
            </Missing>
          </section>
          <section className="ds-card flex flex-col gap-3" style={missing.includes('sex') && !sex ? { borderColor: 'var(--watch)' } : undefined}>
            <ChoiceGroup name="sex" legend="What is your sex?" options={SEX} value={sex} onChange={setSex} />
            <Missing id="sex-missing" show={missing.includes('sex') && !sex}>
              Please choose one. "I'd rather not say" is fine.
            </Missing>
          </section>
          <button
            type="button"
            className="ds-button ds-button-primary"
            onClick={() => require([!firstName.trim() && 'name', !birthYearValid && 'year', !sex && 'sex'])}
          >
            Continue
          </button>
        </Step>
      )}

      {step === 5 && (
        <Step key={5} n={5} title="A little more about you" onBack={back}>
          <section className="ds-card flex flex-col gap-3" style={missing.includes('school') && !education ? { borderColor: 'var(--watch)' } : undefined}>
            <ChoiceGroup
              name="schooling"
              legend="How far did you go in school?"
              hint="Choose the highest you finished. Schooling affects how some activities are scored."
              options={SCHOOLING}
              value={education}
              onChange={setEducation}
            />
            <Missing id="school-missing" show={missing.includes('school') && !education}>
              Please choose one.
            </Missing>
          </section>
          <section className="ds-card">
            <ChoiceGroup name="reason" legend="What brings you here?" hint="Optional." options={REASONS} value={reason} onChange={setReason} />
          </section>
          <button type="button" className="ds-button ds-button-primary" onClick={() => require([!education && 'school'])}>
            Continue
          </button>
        </Step>
      )}

      {step === 6 && (
        <Step
          key={6}
          n={6}
          title="Brain health in your family"
          lead="Memory problems can run in families, so this helps us understand your results. It's never used to diagnose anything. Answer what you know."
          onBack={back}
        >
          <section className="ds-card flex flex-col gap-6">
            <ChoiceGroup
              name="close-family"
              legend="Has a parent, brother or sister had dementia or Alzheimer's disease?"
              options={YES_NO}
              value={family.closeFamily}
              onChange={(v) => fam(v === 'yes' ? { closeFamily: v } : { closeFamily: v, who: [], onset: null })}
            />
            {family.closeFamily === 'yes' && (
              <>
                <CheckList legend="Who?" hint="Choose any that apply." options={CLOSE_FAMILY} values={family.who} onChange={(who) => fam({ who })} />
                <ChoiceGroup
                  name="onset"
                  legend="About how old were they when it began?"
                  hint="If more than one, think of whoever was youngest."
                  options={ONSET}
                  value={family.onset}
                  onChange={(onset) => fam({ onset })}
                />
              </>
            )}
          </section>
          <section className="ds-card">
            <ChoiceGroup
              name="wider-family"
              legend="What about grandparents, aunts or uncles?"
              hint="Dementia or Alzheimer's disease."
              options={YES_NO}
              value={family.widerFamily}
              onChange={(widerFamily) => fam({ widerFamily })}
            />
          </section>
          <section className="ds-card">
            <CheckList
              legend="Has anyone in your close family had any of these?"
              hint="Optional. Choose any that apply."
              options={OTHER_FAMILY}
              values={family.otherConditions}
              onChange={(otherConditions) => fam({ otherConditions })}
            />
          </section>
          <button type="button" className="ds-button ds-button-primary" onClick={next}>
            Continue
          </button>
          <button
            type="button"
            className="ds-button ds-button-secondary"
            onClick={() => {
              setFamily(EMPTY_FAMILY);
              next();
            }}
          >
            Skip this
          </button>
        </Step>
      )}

      {step === 7 && (
        <Step key={7} n={7} title="Your own health" lead="This helps us suggest everyday steps that suit you. All optional." onBack={back}>
          <section className="ds-card">
            <CheckList legend="Do any of these apply to you?" hint="Choose any that apply." options={CONDITIONS} values={conditions} onChange={setConditions} />
          </section>
          <section className="ds-card">
            <ChoiceGroup
              name="genetic"
              legend="Have you ever had a genetic test for Alzheimer's risk?"
              hint="Some people have had an APOE test, through a doctor or a home DNA service. Skip this if you're not sure."
              options={GENETIC}
              value={genetic}
              onChange={setGenetic}
            />
          </section>
          <button type="button" className="ds-button ds-button-primary" onClick={next}>
            Continue
          </button>
          <button
            type="button"
            className="ds-button ds-button-secondary"
            onClick={() => {
              setConditions([]);
              setGenetic(null);
              next();
            }}
          >
            Skip this
          </button>
        </Step>
      )}

      {step === 8 && (
        <Step key={8} n={8} title={`You're all set, ${firstName.trim()}.`} lead="Your first weekly session takes about 25 minutes. Find a quiet spot when you're ready. There's no rush." onBack={back}>
          <button type="button" className="ds-button ds-button-primary" onClick={() => finish('/assess/session')}>
            Start my first session
          </button>
          <button type="button" className="ds-button ds-button-secondary" onClick={() => finish('/dashboard')}>
            Look around first
          </button>
        </Step>
      )}
    </ThemeRoot>
  );
}

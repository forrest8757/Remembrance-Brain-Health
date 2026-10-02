// Daily check-in (redesign Phase 3, rollout 4). About a minute: mood, sleep,
// an optional note. One-tap answers in words (rule 9: no sliders or drags;
// rule 2: never color alone). Stored as before ({mood 1–5, sleep hours}) so
// Home's context chips and insight keep working.
import { useState } from 'react';
import { AppShell, ChoiceGroup, StatusIcon, ThemeRoot, TopBar, type Choice } from '@workspace/ui';
import { localDateKey, useDemoState } from '@/lib/store';
import { APP_NAV } from '@/pages/dashboard';

const home = `${import.meta.env.BASE_URL}dashboard`;

const MOODS: Choice<number>[] = [
  { value: 5, label: 'Great' },
  { value: 4, label: 'Good' },
  { value: 3, label: 'Okay' },
  { value: 2, label: 'A bit low' },
  { value: 1, label: 'Low' },
];

/** Hours are stored as the middle of each band (Home reads ≥ 7 as rested). */
const SLEEP: Choice<number>[] = [
  { value: 8.5, label: 'More than 8 hours' },
  { value: 7.5, label: '7 to 8 hours' },
  { value: 6.5, label: '6 to 7 hours' },
  { value: 5.5, label: '5 to 6 hours' },
  { value: 4.5, label: 'Less than 5 hours' },
];
const sleepBand = (h: number) => (h >= 8 ? 8.5 : h >= 7 ? 7.5 : h >= 6 ? 6.5 : h >= 5 ? 5.5 : 4.5);

export default function CheckIn() {
  const { state, addCheckIn } = useDemoState();
  const today = localDateKey();
  const existing = state.checkIns.find((c) => c.date === today);
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [sleep, setSleep] = useState<number | null>(existing ? sleepBand(existing.sleep) : null);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saved, setSaved] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);

  const save = () => {
    const gaps = [mood === null && 'how you feel', sleep === null && 'how long you slept'].filter(Boolean) as string[];
    setMissing(gaps);
    if (gaps.length) return;
    addCheckIn({ date: today, mood: mood!, sleep: sleep!, notes: notes.trim() });
    setSaved(true);
    window.scrollTo(0, 0);
  };

  return (
    <ThemeRoot>
      <AppShell nav={APP_NAV} current="home">
        {saved ? (
          <div className="flex flex-col gap-6">
            <TopBar backHref={home} backLabel="Back to Home" />
            <section className="flex flex-col items-center gap-3 py-4 text-center" aria-labelledby="saved-title">
              <span className="flex h-24 w-24 items-center justify-center rounded-full" style={{ border: '6px solid var(--ring-arc)' }}>
                <StatusIcon status="steady" size={40} />
              </span>
              <h1 id="saved-title" className="text-[2rem] font-semibold leading-tight" tabIndex={-1} ref={(el) => el?.focus()}>
                Thanks. Today's check-in is saved.
              </h1>
              <p className="text-[1.2rem]" style={{ maxWidth: '30rem' }}>
                Sleep and mood can nudge your scores up or down, so this helps us read your results fairly.
              </p>
            </section>
            <a href={home} className="ds-button ds-button-primary">
              Back to Home
            </a>
            <button type="button" className="ds-button ds-button-secondary" onClick={() => setSaved(false)}>
              Change my answers
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <TopBar backHref={home} backLabel="Back to Home" />
            <header>
              <p className="ds-label">About 1 minute</p>
              <h1 className="mt-1 text-[2rem] font-semibold leading-tight">Daily check-in</h1>
              <p className="mt-2 text-[1.2rem]">{existing ? 'You checked in earlier today. You can change your answers.' : 'Two quick questions about today.'}</p>
            </header>

            <section className="ds-card">
              <ChoiceGroup name="mood" legend="How are you feeling today?" options={MOODS} value={mood} onChange={setMood} />
            </section>

            <section className="ds-card">
              <ChoiceGroup name="sleep" legend="How long did you sleep last night?" options={SLEEP} value={sleep} onChange={setSleep} />
            </section>

            <section className="ds-card flex flex-col gap-3">
              <label htmlFor="notes" className="ds-title">
                Anything else about today?
              </label>
              <p id="notes-hint" className="ds-secondary -mt-1">
                Optional. For example, a busy morning or a new medicine.
              </p>
              <textarea
                id="notes"
                aria-describedby="notes-hint"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="ds-tap w-full resize-y rounded-2xl p-4"
                style={{ background: 'var(--bg)', color: 'var(--text)', border: '2px solid var(--text-2)' }}
              />
            </section>

            {missing.length > 0 && (
              <p role="alert" className="ds-card" style={{ borderColor: 'var(--watch)' }}>
                Please choose {missing.join(' and ')} first.
              </p>
            )}
            <button type="button" className="ds-button ds-button-primary" onClick={save}>
              Save check-in
            </button>
          </div>
        )}
      </AppShell>
    </ThemeRoot>
  );
}

// Settings (redesign Phase 3, rollout 8): how Remembrance looks and sounds.
// Every choice applies the moment you tap it, here and everywhere else,
// including the activity screens (rm.display; lib/ui ThemeRoot).
import { useState } from 'react';
import { AppShell, ChoiceGroup, readDisplayPrefs, saveDisplayPrefs, ThemeRoot, type Choice, type DisplayPrefs, type ThemePreference } from '@workspace/ui';
import { APP_NAV } from '@/pages/dashboard';

const THEMES: Choice<ThemePreference>[] = [
  { value: 'system', label: 'Match my device', detail: 'Dark or light, following your device' },
  { value: 'dark', label: 'Dark', detail: 'Deep navy background, light text' },
  { value: 'light', label: 'Light', detail: 'Cream background, dark text' },
];
const SIZES: Choice<number>[] = [
  { value: 100, label: 'Standard' },
  { value: 125, label: 'Larger' },
  { value: 150, label: 'Large' },
  { value: 200, label: 'Largest' },
];
const MOTION: Choice<DisplayPrefs['motion']>[] = [
  { value: 'system', label: 'Match my device' },
  { value: 'reduce', label: 'Less movement', detail: 'No breathing glow, rising cards or sliding screens' },
  { value: 'full', label: 'Gentle movement', detail: 'Soft, slow animations' },
];
const CAPTIONS: Choice<'on' | 'off'>[] = [
  { value: 'on', label: 'Show written instructions', detail: 'Recommended' },
  { value: 'off', label: 'Listen only' },
];

export default function Settings() {
  const [prefs, setPrefs] = useState<DisplayPrefs>(() => readDisplayPrefs());
  const update = (p: Partial<DisplayPrefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    saveDisplayPrefs(next);
  };
  return (
    <ThemeRoot prefs={prefs}>
      <AppShell nav={APP_NAV} current="settings">
        <div className="flex flex-col gap-6">
          <header>
            <h1 className="text-[2rem] font-semibold leading-tight">Settings</h1>
            <p className="mt-2 text-[1.2rem]">Changes apply as soon as you tap them.</p>
          </header>

          <section className="ds-card flex flex-col gap-6" aria-labelledby="display-title">
            <h2 id="display-title" className="ds-title">
              Display
            </h2>
            <ChoiceGroup name="theme" legend="Colors" options={THEMES} value={prefs.theme} onChange={(theme) => update({ theme })} legendClassName="ds-label" />
            <ChoiceGroup
              name="text-size"
              legend="Text size"
              hint="This page shows the size as you choose it."
              options={SIZES}
              value={prefs.textSize}
              onChange={(textSize) => update({ textSize })}
              layout="wrap"
              legendClassName="ds-label"
            />
            <ChoiceGroup name="motion" legend="Movement" options={MOTION} value={prefs.motion} onChange={(motion) => update({ motion })} legendClassName="ds-label" />
          </section>

          <section className="ds-card flex flex-col gap-6" aria-labelledby="sound-title">
            <h2 id="sound-title" className="ds-title">
              During activities
            </h2>
            <ChoiceGroup
              name="captions"
              legend="Captions"
              hint="The words the voice says when it explains an activity. Test items are never shown in writing."
              options={CAPTIONS}
              value={prefs.captions ? 'on' : 'off'}
              onChange={(v) => update({ captions: v === 'on' })}
              legendClassName="ds-label"
            />
            <div className="flex flex-col gap-2">
              <h3 className="ds-label">Voice pace</h3>
              <p>
                The voice always speaks at the same steady pace, so your results can be compared from week to week.
              </p>
              <p className="ds-secondary">For volume, use your device's volume buttons. Headphones help.</p>
            </div>
          </section>
        </div>
      </AppShell>
    </ThemeRoot>
  );
}

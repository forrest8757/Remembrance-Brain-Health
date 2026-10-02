// App components (redesign, design/DESIGN_LANGUAGE.md). Every story renders
// through the real ThemeRoot, with controls for the variants the redesign must
// pass: Theme (dark / light), Text size (100% / 200%) and Movement (reduced /
// full). Use the Controls panel to switch them.
import { useState } from 'react';
import type { Story, StoryDefault } from '@ladle/react';
import {
  AppShell,
  CheckInCard,
  CheckList,
  ChoiceGroup,
  ContextRow,
  DomainRing,
  DomainRow,
  InsightCard,
  NAV_ICONS,
  ScoreRing,
  SessionCard,
  StatusChip,
  StreakMeter,
  ThemeRoot,
  TopBar,
  TrendChart,
  UsualRangeBar,
  type DisplayPrefs,
  type DomainSummary,
  type NavItem,
} from '../src';

interface Variant {
  theme: 'dark' | 'light';
  textSize: 100 | 200;
  motion: 'reduce' | 'full';
}

export default {
  args: { theme: 'dark', textSize: 100, motion: 'reduce' },
  argTypes: {
    theme: { options: ['dark', 'light'], control: { type: 'radio' } },
    textSize: { options: [100, 200], control: { type: 'radio' } },
    motion: { options: ['reduce', 'full'], control: { type: 'radio' } },
  },
} satisfies StoryDefault<Variant>;

function Frame({ v, children }: { v: Variant; children: React.ReactNode }) {
  const prefs: DisplayPrefs = { theme: v.theme, textSize: v.textSize, motion: v.motion, captions: true };
  return (
    <ThemeRoot prefs={prefs}>
      <div className="mx-auto flex max-w-[40rem] flex-col gap-6 p-4">{children}</div>
    </ThemeRoot>
  );
}

const DOMAINS: DomainSummary[] = [
  { key: 'memory', score: 74, status: 'steady', sentence: 'Steady this month.', weeks: [72, 73, 71, 72, 74, 73, 72, 75, 74, 73, 74, 74] },
  { key: 'executive', score: 69, status: 'watch', sentence: 'A little lower than your usual lately.', weeks: [74, 73, 74, 73, 72, 73, 72, 71, 70, 70, 69, 69] },
  { key: 'language', score: 61, status: 'attention', sentence: 'Lower than usual for a few weeks.', weeks: [70, 69, 70, 68, 67, 66, 66, 65, 63, 62, 62, 61] },
];
const WEEKS = ['Jul 13', 'Jul 20', 'Jul 27', 'Aug 3', 'Aug 10', 'Aug 17', 'Aug 24', 'Aug 31', 'Sep 7', 'Sep 14', 'Sep 21', 'Sep 28'];
const NAV: NavItem[] = [
  { key: 'home', label: 'Home', href: '#', icon: NAV_ICONS.home },
  { key: 'trends', label: 'Trends', href: '#', icon: NAV_ICONS.trends },
  { key: 'session', label: 'Session', href: '#', icon: NAV_ICONS.session },
  { key: 'plan', label: 'Plan', href: '#', icon: NAV_ICONS.plan },
  { key: 'settings', label: 'Settings', href: '#', icon: NAV_ICONS.settings },
];

export const Rings: Story<Variant> = (v) => (
  <Frame v={v}>
    <div className="flex flex-wrap items-center gap-6">
      <ScoreRing score={78} status="steady" />
      <ScoreRing score={78} status="steady" size="compact" />
      <DomainRing domain="memory" score={74} />
      <DomainRing domain="orientation" score={92} size="8rem" />
    </div>
  </Frame>
);

export const StatusChips: Story<Variant> = (v) => (
  <Frame v={v}>
    <div className="flex flex-wrap gap-3">
      <StatusChip status="steady" />
      <StatusChip status="watch" />
      <StatusChip status="attention" />
    </div>
  </Frame>
);

export const DomainRows: Story<Variant> = (v) => (
  <Frame v={v}>
    <section className="ds-card flex flex-col gap-2">
      {DOMAINS.map((d) => (
        <DomainRow key={d.key} d={d} href="#" />
      ))}
    </section>
  </Frame>
);

export const Cards: Story<Variant> = (v) => (
  <Frame v={v}>
    <SessionCard state="due" minutes={25} href="#" />
    <SessionCard state="upcoming" minutes={25} href="#" />
    <SessionCard state="done" minutes={25} href="#" />
    <CheckInCard done={false} href="#" />
    <CheckInCard done href="#" />
    <InsightCard text="Your trends are most reliable when sessions happen around the same time each week." href="#" />
    <ContextRow
      items={[
        { key: 'sleep', label: 'Sleep', value: 'Rested' },
        { key: 'mood', label: 'Mood', value: 'Good' },
      ]}
    />
    <StreakMeter done={0} of={5} />
    <StreakMeter done={3} of={5} />
  </Frame>
);

export const Charts: Story<Variant> = (v) => (
  <Frame v={v}>
    <TopBar backHref="#" backLabel="Back to Home" />
    <section className="ds-card flex flex-col gap-3">
      <UsualRangeBar value={69} usual={[70, 74]} color="var(--d-executive)" />
    </section>
    <section className="ds-card flex flex-col gap-3">
      <TrendChart points={DOMAINS[1]!.weeks.map((value, i) => ({ label: WEEKS[i]!, value }))} color="var(--d-executive)" summary="4 points lower over the last 4 weeks." />
    </section>
  </Frame>
);

export const Choices: Story<Variant> = (v) => {
  const [mood, setMood] = useState<number | null>(4);
  const [size, setSize] = useState<number | null>(null);
  const [conds, setConds] = useState<string[]>(['Diabetes']);
  return (
    <Frame v={v}>
      <section className="ds-card">
        <ChoiceGroup
          name="mood"
          legend="How are you feeling today?"
          options={['Great', 'Good', 'Okay', 'A bit low', 'Low'].map((label, i) => ({ value: 5 - i, label }))}
          value={mood}
          onChange={setMood}
        />
      </section>
      <section className="ds-card">
        <ChoiceGroup
          name="size"
          legend="Text size"
          hint="Two columns where there's room."
          layout="wrap"
          options={[100, 125, 150, 200].map((s) => ({ value: s, label: s === 100 ? 'Standard' : `${s}%` }))}
          value={size}
          onChange={setSize}
        />
      </section>
      <section className="ds-card">
        <CheckList legend="Do any of these apply to you?" options={['High blood pressure', 'Diabetes', 'Heart disease']} values={conds} onChange={setConds} />
      </section>
    </Frame>
  );
};

export const Shell: Story<Variant> = (v) => (
  <ThemeRoot prefs={{ theme: v.theme, textSize: v.textSize, motion: v.motion, captions: true }}>
    <AppShell nav={NAV} current="home">
      <h1 className="text-[2rem] font-semibold">Good morning, Margaret.</h1>
      <p>The tab bar moves to the top at large text sizes on a phone; wide screens use the side rail.</p>
    </AppShell>
  </ThemeRoot>
);

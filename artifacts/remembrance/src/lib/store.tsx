import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type DomainKey = 'attention' | 'executive' | 'memory' | 'language' | 'motor';
export const DOMAIN_ORDER: DomainKey[] = ['attention', 'executive', 'memory', 'language', 'motor'];

export type DomainScores = Record<DomainKey, number | null>;

export type Goal = {
  id: string;
  /** Kept as a string for compatibility with the original goal API. */
  category: string;
  /** Stable category id used by the plan when available. */
  categoryId?: string;
  title: string;
  originalTitle?: string;
  accepted: boolean;
  declined: boolean;
  /** True after a second decline, so a resolved recommendation stays in history. */
  resolved?: boolean;
  /** True once the single alternative has been offered or accepted. */
  swapUsed?: boolean;
  /** Local calendar dates on which this goal was checked off. */
  completedDates?: string[];
};

export type CheckIn = {
  /** Local calendar date (YYYY-MM-DD), not an instant in UTC. */
  date: string;
  mood: number; // 1-5
  sleep: number;
  notes: string;
};

export type ScoreSnapshot = {
  id: string;
  timestamp: string;
  source: 'baseline' | 'weekly' | 'sample';
  domain?: DomainKey;
  cycleNumber: number;
  domains: DomainScores;
  composite: number | null;
  completedDomains: DomainKey[];
};

export type CompletedCycle = {
  id: string;
  cycleNumber: number;
  startedAt: string;
  completedAt: string;
  before: ScoreSnapshot;
  after: ScoreSnapshot;
  domainScoresBefore: DomainScores;
  domainScoresAfter: DomainScores;
  compositeBefore: number;
  compositeAfter: number;
  domains: DomainKey[];
  takeaway: string;
};

export type WeeklyCompletionResult = {
  domain: DomainKey;
  score: number;
  composite: number | null;
  completedDomains: DomainKey[];
  cycleCompleted: boolean;
  cycle?: CompletedCycle;
  takeaway: string;
};

export type LastCompletion = WeeklyCompletionResult & {
  completedAt: string;
};

export type DemoState = {
  onboardingComplete: boolean;
  profile: {
    firstName: string;
    age: string;
    sex: string;
    education: string;
    reason: string;
    conditions: string[];
    familyHistory: string;
  };
  scores: {
    composite: number | null;
    domains: DomainScores;
  };
  goals: Goal[];
  checkIns: CheckIn[];
  demoSpeed: 'full' | 'fast' | 'skip';
  currentWeekDomain: DomainKey | null;
  /** Immutable-ish point-in-time records used by the progress report and trends. */
  scoreHistory: ScoreSnapshot[];
  /** Distinct domains completed in the currently active five-week round. */
  activeCycleDomains: DomainKey[];
  completedCycles: CompletedCycle[];
  lastCompletion: LastCompletion | null;
};

export function calculateComposite(domains: Partial<DomainScores>): number | null {
  const values = DOMAIN_ORDER.map((domain) => domains[domain]);
  if (values.some((value) => value === null || value === undefined)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const emptyDomains = (): DomainScores => ({
  attention: null,
  executive: null,
  memory: null,
  language: null,
  motor: null,
});

const cloneDomains = (domains: DomainScores): DomainScores => ({ ...domains });

const makeInitialState = (): DemoState => ({
  onboardingComplete: false,
  profile: {
    firstName: '',
    age: '',
    sex: '',
    education: '',
    reason: '',
    conditions: [],
    familyHistory: '',
  },
  scores: {
    composite: null,
    domains: emptyDomains(),
  },
  goals: [],
  checkIns: [],
  demoSpeed: 'full',
  currentWeekDomain: 'attention',
  scoreHistory: [],
  activeCycleDomains: [],
  completedCycles: [],
  lastCompletion: null,
});

const normaliseState = (stored: Partial<DemoState>): DemoState => {
  const initial = makeInitialState();
  const domains = { ...initial.scores.domains, ...(stored.scores?.domains || {}) };
  const history = (stored.scoreHistory || []).map((snapshot) => ({
    ...snapshot,
    domains: { ...emptyDomains(), ...(snapshot.domains || {}) },
    completedDomains: snapshot.completedDomains || [],
  }));
  return {
    ...initial,
    ...stored,
    profile: { ...initial.profile, ...(stored.profile || {}) },
    scores: {
      ...initial.scores,
      ...(stored.scores || {}),
      domains,
      composite: calculateComposite(domains),
    },
    goals: (stored.goals || []).map((goal) => ({
      ...goal,
      completedDates: goal.completedDates || [],
    })),
    checkIns: stored.checkIns || [],
    scoreHistory: history,
    activeCycleDomains: stored.activeCycleDomains || [],
    completedCycles: (stored.completedCycles || []).map((cycle) => ({
      ...cycle,
      domainScoresBefore: { ...emptyDomains(), ...(cycle.domainScoresBefore || {}) },
      domainScoresAfter: { ...emptyDomains(), ...(cycle.domainScoresAfter || {}) },
    })),
    lastCompletion: stored.lastCompletion || null,
    currentWeekDomain: stored.currentWeekDomain || 'attention',
  };
};

function makeSnapshot(
  source: ScoreSnapshot['source'],
  domain: DomainKey | undefined,
  domains: DomainScores,
  cycleNumber: number,
  completedDomains: DomainKey[],
  timestamp = new Date().toISOString(),
): ScoreSnapshot {
  return {
    id: `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    source,
    domain,
    cycleNumber,
    domains: cloneDomains(domains),
    composite: calculateComposite(domains),
    completedDomains: [...completedDomains],
  };
}

function makeTakeaway(domain: DomainKey, score: number, cycleCompleted: boolean): string {
  const label = domain === 'motor' ? 'Perpetual Motor' : domain;
  if (cycleCompleted) {
    return 'You completed all five areas. Your recorded snapshots are ready for a round-over-round comparison.';
  }
  return `You completed your ${label} check-in. Your latest recorded result is saved, and the next area will be ready when you are.`;
}

type DemoContextType = {
  state: DemoState;
  updateProfile: (profile: Partial<DemoState['profile']>) => void;
  setOnboardingComplete: (complete: boolean) => void;
  /**
   * Updates scores without advancing the weekly cycle. The first argument is
   * retained for compatibility; the composite is always derived from all five
   * domain values.
   */
  updateScores: (composite: number, domains: Partial<DomainScores>) => void;
  setBaselineScores: (domains: Partial<DomainScores>) => void;
  /** Compatible with voice and assessment callers; this records a weekly completion. */
  updateDomainScore: (domain: DomainKey, score: number) => WeeklyCompletionResult;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  toggleGoalCompletion: (id: string, date?: string) => void;
  addCheckIn: (checkIn: CheckIn) => void;
  resetDemo: () => void;
  loadSampleUser: () => void;
  forceCompletedSampleCycle: () => void;
  setDemoSpeed: (speed: 'full' | 'fast' | 'skip') => void;
};

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => {
    try {
      const stored = sessionStorage.getItem('remembrance_demo_state');
      return stored ? normaliseState(JSON.parse(stored) || {}) : makeInitialState();
    } catch {
      return makeInitialState();
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('remembrance_demo_state', JSON.stringify(state));
    } catch {
      // Session storage is optional for the in-memory demo.
    }
  }, [state]);

  const updateProfile = (profileUpdate: Partial<DemoState['profile']>) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...profileUpdate } }));
  };

  const setOnboardingComplete = (complete: boolean) => {
    setState((s) => ({ ...s, onboardingComplete: complete }));
  };

  const updateScores = (_composite: number, domains: Partial<DomainScores>) => {
    setState((s) => {
      const nextDomains = { ...s.scores.domains, ...domains };
      return {
        ...s,
        scores: {
          composite: calculateComposite(nextDomains),
          domains: nextDomains,
        },
      };
    });
  };

  const setBaselineScores = (domains: Partial<DomainScores>) => {
    setState((s) => {
      const nextDomains = { ...s.scores.domains, ...domains };
      const composite = calculateComposite(nextDomains);
      if (composite === null) return { ...s, scores: { composite, domains: nextDomains } };

      const cycleNumber = s.completedCycles.length + 1;
      const snapshot = makeSnapshot('baseline', undefined, nextDomains, cycleNumber, []);
      const withoutCurrentBaseline = s.scoreHistory.filter(
        (item) => !(item.source === 'baseline' && item.cycleNumber === cycleNumber),
      );
      return {
        ...s,
        scores: { composite, domains: nextDomains },
        scoreHistory: [...withoutCurrentBaseline, snapshot],
        activeCycleDomains: [],
        // Baseline starts the cycle; it never counts as a weekly domain test.
        currentWeekDomain: 'attention',
        lastCompletion: null,
      };
    });
  };

  const updateDomainScore = (domain: DomainKey, rawScore: number): WeeklyCompletionResult => {
    const score = Math.max(0, Math.min(20, Math.round(rawScore)));
    const current = state;
    const nextDomains = { ...current.scores.domains, [domain]: score };
    const composite = calculateComposite(nextDomains);
    const cycleNumber = current.completedCycles.length + 1;
    const completedDomains = current.activeCycleDomains.includes(domain)
      ? [...current.activeCycleDomains]
      : [...current.activeCycleDomains, domain];
    const cycleCompleted = completedDomains.length === DOMAIN_ORDER.length;
    const snapshot = makeSnapshot('weekly', domain, nextDomains, cycleNumber, completedDomains);
    let completedCycle: CompletedCycle | undefined;

    if (cycleCompleted && composite !== null) {
      const before = [...current.scoreHistory]
        .reverse()
        .find((item) => item.source === 'baseline' && item.cycleNumber === cycleNumber);
      if (before && before.composite !== null) {
        const takeaway = makeTakeaway(domain, score, true);
        completedCycle = {
          id: `cycle-${cycleNumber}-${Date.now()}`,
          cycleNumber,
          startedAt: before.timestamp,
          completedAt: snapshot.timestamp,
          before,
          after: snapshot,
          domainScoresBefore: cloneDomains(before.domains),
          domainScoresAfter: cloneDomains(snapshot.domains),
          compositeBefore: before.composite,
          compositeAfter: composite,
          domains: [...DOMAIN_ORDER],
          takeaway,
        };
      }
    }

    const takeaway = makeTakeaway(domain, score, Boolean(completedCycle));
    const result: WeeklyCompletionResult = {
      domain,
      score,
      composite,
      completedDomains,
      cycleCompleted: Boolean(completedCycle),
      cycle: completedCycle,
      takeaway,
    };

    setState((s) => {
      const nextCycleNumber = s.completedCycles.length + 1;
      const activeDomains = s.activeCycleDomains.includes(domain)
        ? [...s.activeCycleDomains]
        : [...s.activeCycleDomains, domain];
      const shouldComplete = activeDomains.length === DOMAIN_ORDER.length;
      const stateSnapshot = makeSnapshot(
        'weekly',
        domain,
        { ...s.scores.domains, [domain]: score },
        nextCycleNumber,
        activeDomains,
      );
      let cycle = completedCycle;
      if (shouldComplete && stateSnapshot.composite !== null) {
        const before = [...s.scoreHistory]
          .reverse()
          .find((item) => item.source === 'baseline' && item.cycleNumber === nextCycleNumber);
        if (before && before.composite !== null) {
          cycle = {
            id: `cycle-${nextCycleNumber}-${Date.now()}`,
            cycleNumber: nextCycleNumber,
            startedAt: before.timestamp,
            completedAt: stateSnapshot.timestamp,
            before,
            after: stateSnapshot,
            domainScoresBefore: cloneDomains(before.domains),
            domainScoresAfter: cloneDomains(stateSnapshot.domains),
            compositeBefore: before.composite,
            compositeAfter: stateSnapshot.composite,
            domains: [...DOMAIN_ORDER],
            takeaway: makeTakeaway(domain, score, true),
          };
        }
      }
      const nextDomain = shouldComplete
        ? DOMAIN_ORDER[0]
        : DOMAIN_ORDER.find((candidate) => !activeDomains.includes(candidate)) || DOMAIN_ORDER[0];
      const updatedCycles = cycle ? [...s.completedCycles, cycle] : s.completedCycles;
      // The completed snapshot is also the honest starting point for the
      // next round. Keeping it as a baseline snapshot means a second round
      // can be compared without inventing an earlier value.
      const nextRoundBaseline = cycle
        ? makeSnapshot(
            'baseline',
            undefined,
            stateSnapshot.domains,
            nextCycleNumber + 1,
            [],
            stateSnapshot.timestamp,
          )
        : null;
      const latestResult = {
        ...result,
        composite: stateSnapshot.composite,
        completedDomains: activeDomains,
        cycleCompleted: Boolean(cycle),
        cycle,
        takeaway: makeTakeaway(domain, score, Boolean(cycle)),
      };
      return {
        ...s,
        scores: { composite: stateSnapshot.composite, domains: stateSnapshot.domains },
        scoreHistory: [...s.scoreHistory, stateSnapshot, ...(nextRoundBaseline ? [nextRoundBaseline] : [])],
        activeCycleDomains: shouldComplete ? [] : activeDomains,
        completedCycles: updatedCycles,
        currentWeekDomain: nextDomain,
        lastCompletion: { ...latestResult, completedAt: stateSnapshot.timestamp },
      };
    });

    return result;
  };

  const addGoal = (goal: Goal) => {
    setState((s) => ({
      ...s,
      goals: [...s.goals, { ...goal, completedDates: goal.completedDates || [] }],
    }));
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) =>
        g.id === id
          ? { ...g, ...updates, completedDates: updates.completedDates || g.completedDates || [] }
          : g,
      ),
    }));
  };

  const toggleGoalCompletion = (id: string, date = localDateKey()) => {
    setState((s) => ({
      ...s,
      goals: s.goals.map((goal) => {
        if (goal.id !== id) return goal;
        const dates = goal.completedDates || [];
        return {
          ...goal,
          completedDates: dates.includes(date) ? dates.filter((item) => item !== date) : [...dates, date],
        };
      }),
    }));
  };

  const addCheckIn = (checkIn: CheckIn) => {
    setState((s) => ({
      ...s,
      // A check-in is a daily log, so submitting again edits today's entry
      // rather than creating duplicate rows.
      checkIns: [...s.checkIns.filter((item) => item.date !== checkIn.date), checkIn],
    }));
  };

  const resetDemo = () => {
    setState(makeInitialState());
  };

  const loadSampleUser = () => {
    const now = Date.now();
    const iso = (daysAgo: number) => new Date(now - daysAgo * 86400000).toISOString();
    const baseline: DomainScores = {
      attention: 16,
      executive: 15,
      memory: 17,
      language: 18,
      motor: 16,
    };
    const firstWeekly = { ...baseline, attention: 17 };
    const secondWeekly = { ...firstWeekly, memory: 16 };
    const thirdWeekly = { ...secondWeekly, executive: 16 };
    const baselineSnapshot = makeSnapshot('sample', undefined, baseline, 1, [], iso(28));
    baselineSnapshot.source = 'baseline';
    const snapshots = [
      baselineSnapshot,
      makeSnapshot('sample', 'attention', firstWeekly, 1, ['attention'], iso(21)),
      makeSnapshot('sample', 'memory', secondWeekly, 1, ['attention', 'memory'], iso(14)),
      makeSnapshot('sample', 'executive', thirdWeekly, 1, ['attention', 'memory', 'executive'], iso(7)),
    ];
    const today = localDateKey();
    const dateAgo = (daysAgo: number) => localDateKey(new Date(now - daysAgo * 86400000));
    setState({
      ...makeInitialState(),
      onboardingComplete: true,
      profile: {
        firstName: 'Sarah',
        age: '62',
        sex: 'Female',
        education: 'Bachelors',
        reason: 'Staying proactive',
        conditions: ['High blood pressure'],
        familyHistory: 'No',
      },
      scores: { composite: calculateComposite(thirdWeekly), domains: thirdWeekly },
      goals: [
        {
          id: 'sample-water',
          category: 'Diet',
          categoryId: 'diet',
          title: 'Drink one extra glass of water before noon.',
          accepted: true,
          declined: false,
          completedDates: [dateAgo(1)],
        },
        {
          id: 'sample-sleep',
          category: 'Sleep',
          categoryId: 'sleep',
          title: 'No screens 30 minutes before bed.',
          accepted: true,
          declined: false,
          completedDates: [dateAgo(2)],
        },
        {
          id: 'sample-social-resolved',
          category: 'Social Engagement',
          categoryId: 'social',
          title: 'Try a different social goal next cycle.',
          originalTitle: 'Call a friend or family member for 10 minutes.',
          accepted: false,
          declined: true,
          swapUsed: true,
          resolved: true,
          completedDates: [],
        },
      ],
      checkIns: [
        { date: dateAgo(3), mood: 4, sleep: 7.5, notes: 'A calm morning.' },
        { date: dateAgo(2), mood: 3, sleep: 7, notes: '' },
        { date: dateAgo(1), mood: 4, sleep: 8, notes: 'Felt rested.' },
        { date: today, mood: 4, sleep: 7.5, notes: '' },
      ],
      demoSpeed: 'full',
      currentWeekDomain: 'language',
      scoreHistory: snapshots,
      activeCycleDomains: ['attention', 'memory', 'executive'],
      completedCycles: [],
      lastCompletion: null,
    });
  };

  const forceCompletedSampleCycle = () => {
    const now = Date.now();
    const iso = (daysAgo: number) => new Date(now - daysAgo * 86400000).toISOString();
    const beforeDomains: DomainScores = {
      attention: 16,
      executive: 15,
      memory: 17,
      language: 18,
      motor: 15,
    };
    const afterDomains: DomainScores = {
      attention: 17,
      executive: 16,
      memory: 16,
      language: 18,
      motor: 16,
    };
    const before = makeSnapshot('sample', undefined, beforeDomains, 1, [], iso(35));
    before.source = 'baseline';
    const weeklySnapshots = DOMAIN_ORDER.map((domain, index) =>
      makeSnapshot(
        'sample',
        domain,
        afterDomains,
        1,
        DOMAIN_ORDER.slice(0, index + 1),
        iso(28 - index * 7),
      ),
    );
    const after = weeklySnapshots[weeklySnapshots.length - 1];
    const nextRoundBaseline = makeSnapshot('baseline', undefined, afterDomains, 2, [], after.timestamp);
    const takeaway = 'You completed all five areas. Your recorded snapshots are ready for a round-over-round comparison.';
    const cycle: CompletedCycle = {
      id: 'sample-cycle-1',
      cycleNumber: 1,
      startedAt: before.timestamp,
      completedAt: after.timestamp,
      before,
      after,
      domainScoresBefore: beforeDomains,
      domainScoresAfter: afterDomains,
      compositeBefore: calculateComposite(beforeDomains) as number,
      compositeAfter: calculateComposite(afterDomains) as number,
      domains: [...DOMAIN_ORDER],
      takeaway,
    };
    setState((s) => ({
      ...s,
      onboardingComplete: true,
      scores: { composite: cycle.compositeAfter, domains: afterDomains },
      scoreHistory: [before, ...weeklySnapshots, nextRoundBaseline],
      activeCycleDomains: [],
      completedCycles: [cycle],
      currentWeekDomain: 'attention',
      lastCompletion: {
        domain: 'motor',
        score: afterDomains.motor as number,
        composite: cycle.compositeAfter,
        completedDomains: [...DOMAIN_ORDER],
        cycleCompleted: true,
        cycle,
        takeaway,
        completedAt: after.timestamp,
      },
    }));
  };

  const setDemoSpeed = (speed: 'full' | 'fast' | 'skip') => {
    setState((s) => ({ ...s, demoSpeed: speed }));
  };

  return (
    <DemoContext.Provider
      value={{
        state,
        updateProfile,
        setOnboardingComplete,
        updateScores,
        setBaselineScores,
        updateDomainScore,
        addGoal,
        updateGoal,
        toggleGoalCompletion,
        addCheckIn,
        resetDemo,
        loadSampleUser,
        forceCompletedSampleCycle,
        setDemoSpeed,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoState() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemoState must be used within a DemoProvider');
  }
  return context;
}
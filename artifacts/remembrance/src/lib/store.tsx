import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Goal = {
  id: string;
  category: string;
  title: string;
  accepted: boolean;
  declined: boolean;
};

export type CheckIn = {
  date: string;
  mood: number; // 1-5
  sleep: number;
  notes: string;
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
    domains: {
      attention: number | null;
      executive: number | null;
      memory: number | null;
      language: number | null;
      motor: number | null;
    };
  };
  goals: Goal[];
  checkIns: CheckIn[];
  demoSpeed: 'full' | 'fast' | 'skip';
  currentWeekDomain: string | null;
};

const initialState: DemoState = {
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
    domains: {
      attention: null,
      executive: null,
      memory: null,
      language: null,
      motor: null,
    },
  },
  goals: [],
  checkIns: [],
  demoSpeed: 'full',
  currentWeekDomain: 'memory',
};

type DemoContextType = {
  state: DemoState;
  updateProfile: (profile: Partial<DemoState['profile']>) => void;
  setOnboardingComplete: (complete: boolean) => void;
  updateScores: (composite: number, domains: Partial<DemoState['scores']['domains']>) => void;
  updateDomainScore: (domain: keyof DemoState['scores']['domains'], score: number) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  addCheckIn: (checkIn: CheckIn) => void;
  resetDemo: () => void;
  loadSampleUser: () => void;
  setDemoSpeed: (speed: 'full' | 'fast' | 'skip') => void;
};

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => {
    try {
      const stored = sessionStorage.getItem('remembrance_demo_state');
      return stored ? JSON.parse(stored) : initialState;
    } catch {
      return initialState;
    }
  });

  useEffect(() => {
    sessionStorage.setItem('remembrance_demo_state', JSON.stringify(state));
  }, [state]);

  const updateProfile = (profileUpdate: Partial<DemoState['profile']>) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...profileUpdate } }));
  };

  const setOnboardingComplete = (complete: boolean) => {
    setState((s) => ({ ...s, onboardingComplete: complete }));
  };

  const updateScores = (composite: number, domains: Partial<DemoState['scores']['domains']>) => {
    setState((s) => ({
      ...s,
      scores: {
        composite,
        domains: { ...s.scores.domains, ...domains },
      },
    }));
  };

  const updateDomainScore = (domain: keyof DemoState['scores']['domains'], score: number) => {
    setState((s) => {
      const newDomains = { ...s.scores.domains, [domain]: score };
      const values = Object.values(newDomains).filter((v): v is number => v !== null);
      const composite = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 5) : 0;
      return {
        ...s,
        scores: { composite, domains: newDomains },
      };
    });
  };

  const addGoal = (goal: Goal) => {
    setState((s) => ({ ...s, goals: [...s.goals, goal] }));
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
  };

  const addCheckIn = (checkIn: CheckIn) => {
    setState((s) => ({ ...s, checkIns: [...s.checkIns, checkIn] }));
  };

  const resetDemo = () => {
    setState(initialState);
  };

  const loadSampleUser = () => {
    setState({
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
      scores: {
        composite: 82,
        domains: {
          attention: 17,
          executive: 15,
          memory: 16,
          language: 18,
          motor: 16,
        },
      },
      goals: [
        { id: '1', category: 'Diet', title: 'Drink one extra glass of water before noon', accepted: true, declined: false },
        { id: '2', category: 'Sleep', title: 'No screens 30 minutes before bed', accepted: true, declined: false },
      ],
      checkIns: [
        { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], mood: 4, sleep: 7, notes: '' },
      ],
      demoSpeed: 'fast',
      currentWeekDomain: 'memory',
    });
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
        updateDomainScore,
        addGoal,
        updateGoal,
        addCheckIn,
        resetDemo,
        loadSampleUser,
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

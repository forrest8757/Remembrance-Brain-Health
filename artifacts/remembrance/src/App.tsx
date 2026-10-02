import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { DemoProvider } from '@/lib/store';
import { DemoPanel } from '@/components/demo-panel';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

// Route imports
import Landing from '@/pages/landing';
import Welcome from '@/pages/welcome';
import Baseline from '@/pages/baseline';
import ScoreReveal from '@/pages/score-reveal';
import Dashboard from '@/pages/dashboard';
import DomainDetail from '@/pages/domain-detail';
import Assessment from '@/pages/assessment';
import VoiceTest from '@/pages/voice';
import CarePlan from '@/pages/plan';
import CheckIn from '@/pages/check-in';
import Progress from '@/pages/progress';
import AssessRun from '@/pages/assess-run';
import Settings from '@/pages/settings';
import SessionPage from '@/pages/session';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/welcome" component={Welcome} />
        <Route path="/baseline" component={Baseline} />
        <Route path="/score-reveal" component={ScoreReveal} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/domain/:id" component={DomainDetail} />
        <Route path="/assessment/:id" component={Assessment} />
        <Route path="/voice" component={VoiceTest} />
        <Route path="/plan" component={CarePlan} />
        <Route path="/check-in" component={CheckIn} />
        <Route path="/progress" component={Progress} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function AppContent() {
  const [location] = useLocation();

  // Marketing interactions are ephemeral. Only the separate product demo
  // mounts the provider that reads and writes session storage.
  if (location === '/') {
    return <RoutedErrorBoundary><Landing /></RoutedErrorBoundary>;
  }

  // The NACC-derived assessment suite (CLAUDE.md) is separate from the demo
  // and never touches the demo's simulated state.
  if (location.startsWith('/assess/')) {
    return (
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/assess/session" component={SessionPage} />
          <Route path="/assess/:testId" component={AssessRun} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    );
  }

  return (
    <DemoProvider>
      <Router />
      <DemoPanel />
    </DemoProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <div className="min-h-[100dvh] flex flex-col font-sans bg-background text-foreground relative">
            <AppContent />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

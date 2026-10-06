// "My results": reads back what the backend actually stored for this
// browser's anonymous user (see @/assess/remote-user). POC: no sign-in, so
// this is scoped to whatever device/browser the participant is using.
import { useEffect, useState } from 'react';
import { getListScoresQueryKey, useListScores } from '@workspace/api-client-react';
import { AssessmentLayout, Button, Text, ThemeRoot } from '@workspace/ui';
import { getOrCreateUserId } from '@/assess/remote-user';
import { ASSESSMENTS } from '@/assess/registry';

function titleFor(testId: string): string {
  return ASSESSMENTS[testId]?.title ?? testId;
}

function goHome() {
  window.location.href = `${import.meta.env.BASE_URL}dashboard`;
}

function AssessResultsInner() {
  const [userId, setUserId] = useState<number | null | 'unavailable'>(null);

  useEffect(() => {
    let cancelled = false;
    getOrCreateUserId().then((id) => {
      if (!cancelled) setUserId(id ?? 'unavailable');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedId = typeof userId === 'number' ? userId : 0;
  const { data: scores, isLoading, isError } = useListScores(resolvedId, {
    query: { enabled: typeof userId === 'number', queryKey: getListScoresQueryKey(resolvedId) },
  });

  if (userId === 'unavailable') {
    return (
      <AssessmentLayout>
        <Text variant="eyebrow">Your results</Text>
        <Text variant="title">We couldn't reach the server.</Text>
        <Text variant="lead">Your results are still saved on this device from each test's own screen. Please try again later.</Text>
        <Button onClick={goHome}>Back to home</Button>
      </AssessmentLayout>
    );
  }

  if (userId === null || isLoading) {
    return (
      <AssessmentLayout>
        <Text variant="eyebrow">Your results</Text>
        <Text variant="title">Loading…</Text>
      </AssessmentLayout>
    );
  }

  if (isError) {
    return (
      <AssessmentLayout>
        <Text variant="eyebrow">Your results</Text>
        <Text variant="title">Something went wrong.</Text>
        <Text variant="lead">We couldn't load your saved results. Please try again later.</Text>
        <Button onClick={goHome}>Back to home</Button>
      </AssessmentLayout>
    );
  }

  const list = scores ?? [];

  return (
    <main className="min-h-dvh bg-rm-cream font-rm text-rm-ink">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8 px-4 py-10 md:px-10 md:py-16">
        <header className="flex flex-col gap-2">
          <Text variant="eyebrow">Your results</Text>
          <Text variant="title">Everything saved on this device</Text>
        </header>

        {list.length === 0 ? (
          <Text variant="body">You haven't completed a test yet. Take one from the dashboard and it'll show up here.</Text>
        ) : (
          <ol className="flex flex-col gap-4">
            {list.map((s) => (
              <li key={s.id} className="rounded-rm-lg bg-rm-surface p-5 md:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <Text variant="body" className="font-bold">{titleFor(s.testId)}</Text>
                  <Text variant="body" className="text-rm-ink-soft">{new Date(s.createdAt).toLocaleString()}</Text>
                </div>
                <dl className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                  {Object.entries(s.fields).map(([field, value]) => (
                    <div key={field} className="flex justify-between gap-4 border-b border-rm-cream-deep py-1 text-rm-body text-rm-ink-soft">
                      <dt>{field}</dt>
                      <dd className="font-semibold">{value === null ? 'needs review' : value}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        )}

        <Button onClick={goHome}>Back to home</Button>
        <p className="text-rm-eyebrow text-rm-ink-soft">Stored for this browser only — there's no account to sign into yet.</p>
      </div>
    </main>
  );
}

export default function AssessResults() {
  return (
    <ThemeRoot>
      <AssessResultsInner />
    </ThemeRoot>
  );
}

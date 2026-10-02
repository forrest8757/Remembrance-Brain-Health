// Direction C, "Dashboard Soft": a smaller ring and five DomainCards in a feed, the most information up front.
import { CheckInCard, ContextRow, DATA, DomainCard, Frame, Greeting, InsightCard, ScoreRing, StatusChip, StreakMeter, WeeklySessionCard } from './_kit';

export default function DashboardSoft() {
  return (
    <Frame direction="C · Dashboard Soft">
      <div className="flex flex-col gap-6">
        <Greeting />
        <div className="grid gap-6 md:grid-cols-2">
          <section className="hd-card hd-rise flex flex-wrap items-center gap-6" aria-labelledby="score-label">
            <div style={{ width: '9rem' }}>
              <ScoreRing size="compact" />
            </div>
            <div className="flex min-w-[min(12rem,100%)] flex-1 flex-col gap-2">
              <p id="score-label" className="hd-label">
                Remembrance Score
              </p>
              <span className="self-start">
                <StatusChip status={DATA.scoreStatus} />
              </span>
              <p>{DATA.scoreSentence}</p>
            </div>
          </section>
          <WeeklySessionCard />
        </div>
        <h2 className="hd-title mt-2">Your five areas</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {DATA.domains.map((d) => (
            <DomainCard key={d.key} d={d} />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <CheckInCard />
          <InsightCard />
          <ContextRow />
          <StreakMeter />
        </div>
      </div>
    </Frame>
  );
}

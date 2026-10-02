// Direction A, "Oura Calm": one giant ScoreRing, a minimal feed, the most negative space.
import { CheckInCard, ContextRow, DATA, DomainRow, Frame, Greeting, InsightCard, ScoreRing, StatusChip, StreakMeter, WeeklySessionCard } from './_kit';

export default function OuraCalm() {
  return (
    <Frame direction="A · Oura Calm">
      <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: '40rem' }}>
        <Greeting />
        <section className="flex flex-col items-center gap-4 py-6 text-center" aria-labelledby="score-label">
          <ScoreRing />
          <p id="score-label" className="hd-label">
            Remembrance Score
          </p>
          <StatusChip status={DATA.scoreStatus} />
          <p className="text-[1.4rem] font-medium" style={{ maxWidth: '26rem' }}>
            {DATA.scoreSentence}
          </p>
        </section>
        <WeeklySessionCard />
        <section className="hd-card hd-rise flex flex-col gap-2" aria-labelledby="areas-title">
          <h2 id="areas-title" className="hd-title">
            Your five areas
          </h2>
          {DATA.domains.map((d) => (
            <DomainRow key={d.key} d={d} ring={false} />
          ))}
        </section>
        <CheckInCard />
        <InsightCard />
        <ContextRow />
        <StreakMeter />
      </div>
    </Frame>
  );
}

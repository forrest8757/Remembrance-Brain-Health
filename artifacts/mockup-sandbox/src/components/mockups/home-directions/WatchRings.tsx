// Direction B, "Watch Rings": the ScoreRing with five concentric DomainArcs as the hero (Apple Activity style).
import { CheckInCard, ContextRow, DATA, Frame, Greeting, InsightCard, ScoreRing, StatusChip, StreakMeter, WeeklySessionCard, STATUS_WORD } from './_kit';

export default function WatchRings() {
  return (
    <Frame direction="B · Watch Rings">
      <div className="flex flex-col gap-6">
        <Greeting />
        <section className="hd-card hd-rise grid items-center gap-6 md:grid-cols-[minmax(0,22rem)_1fr]" aria-labelledby="score-label">
          <div className="flex flex-col items-center gap-3 text-center">
            <ScoreRing withDomains />
            <p id="score-label" className="hd-label">
              Remembrance Score
            </p>
            <StatusChip status={DATA.scoreStatus} />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-[1.4rem] font-medium">{DATA.scoreSentence}</p>
            {/* Legend: each ring labeled with name, score and status word, outside the rings. */}
            <ul className="flex flex-col">
              {DATA.domains.map((d, i) => (
                <li key={d.key}>
                  <a href="#" className="hd-tap flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl py-2" aria-label={`${d.name}, ${d.score}, ${STATUS_WORD[d.status]}. Ring ${i + 1} from the outside. See details`}>
                    <span aria-hidden className="h-2 w-8 shrink-0 rounded-full" style={{ background: `var(--d-${d.key})` }} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-semibold">{d.name}</span>
                      <span className="flex flex-wrap items-center gap-3">
                        <span className="text-[1.5rem] font-semibold leading-none">{d.score}</span>
                        <StatusChip status={d.status} />
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="hd-secondary">Outer ring to inner: Memory, Attention, Executive Function, Language, Orientation.</p>
          </div>
        </section>
        <WeeklySessionCard />
        <div className="grid gap-6 md:grid-cols-2">
          <CheckInCard />
          <InsightCard />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <ContextRow />
          <StreakMeter />
        </div>
      </div>
    </Frame>
  );
}

import { useEffect, useState } from 'react';
import { db } from '../../db/schema';
import { getTrainedDays, daysTrainedThisWeek, GOLD_WEEK_DAYS } from '../../services/trainingWeek';
import { loadWhatGotBetter } from '../../services/upNextHome';

/**
 * The week at a glance on the full plan — trained days (5 = a gold week, never
 * a consecutive streak), what the student has proven vs still has to fix, and
 * their Deep Run best. Moved off Home when the ring became a small counter
 * that links here (David 2026-10-02: "Fold into the counter").
 */
export function WeekProgress(): JSX.Element {
  const [days, setDays] = useState(0);
  const [better, setBetter] = useState<{ green: number; red: number; newly: number } | null>(null);
  const [deepBest, setDeepBest] = useState(0);
  useEffect(() => {
    void getTrainedDays().then((d) => setDays(daysTrainedThisWeek(d, new Date()))).catch(() => undefined);
    void loadWhatGotBetter().then(setBetter).catch(() => undefined);
    void db.meta.get('deep_run_best_v1').then((r) => setDeepBest(Number(r?.value) || 0)).catch(() => undefined);
  }, []);
  const gold = days >= GOLD_WEEK_DAYS;
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-theme-border bg-theme-surface/60 px-4 py-3" data-testid="week-progress">
      <div className="flex items-center gap-1" aria-label={`${days} trained days this week`} data-testid="week-dots">
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${i < days ? (gold ? 'bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : 'bg-cyan-300') : 'bg-theme-border'}`}
          />
        ))}
        <span className="ml-1 text-[11px] text-theme-text-muted">
          {gold ? 'Gold week' : `${days}/${GOLD_WEEK_DAYS} days this week`}
        </span>
      </div>
      {better && (better.green > 0 || better.red > 0 || deepBest > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold" data-testid="what-got-better">
          {better.newly > 0 && <span className="text-green-300">{better.newly} skill{better.newly === 1 ? '' : 's'} turned green this week</span>}
          <span className="text-green-300/80">{better.green} proven</span>
          <span className="text-rose-300/80">{better.red} to fix</span>
          {deepBest > 0 && <span className="text-fuchsia-300">Deep Run best {deepBest}</span>}
        </div>
      )}
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import type { UpNextPick } from '../../services/upNextPicker';

/**
 * Today's training, as a small counter in the top-right of Home (David
 * 2026-10-02: "I want small in top Rt corner 0/5 training (something like
 * that)"). It counts today's ring of bites; tapping it opens the full plan,
 * where the week's trained days and proven / to-fix now live (`WeekProgress`).
 * Test hooks `today-ring` / `today-ring-label` are kept so the Up next audit
 * reads the same contract it always has.
 */
export function TodayRing({ ring, done }: {
  ring: readonly UpNextPick[];
  done: ReadonlySet<string>;
}): JSX.Element | null {
  const navigate = useNavigate();
  if (ring.length === 0) return null;
  const filled = ring.filter((p) => done.has(p.key)).length;
  const closed = filled === ring.length;
  return (
    <button
      onClick={() => void navigate('/coach/plan')}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums leading-none transition-colors ${closed ? 'border-amber-300/60 bg-amber-400/15 text-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'border-cyan-300/40 bg-cyan-400/10 text-cyan-100'}`}
      aria-label={`Today's training ${filled} of ${ring.length}. Open the full plan.`}
      data-testid="today-ring"
      data-filled={filled}
    >
      <span data-testid="today-ring-label">{closed ? `${filled}/${ring.length} done` : `${filled}/${ring.length} training`}</span>
    </button>
  );
}

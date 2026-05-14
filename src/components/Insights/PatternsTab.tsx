/**
 * PatternsTab — the "Your Habits" view on /weaknesses.
 *
 * Surfaces the cross-cutting strength/weakness signals from
 * analyticsService.engagementSummary() in a nice readable layout.
 * Engagement-coded: users like seeing their own data, and this tab
 * is the place where the app says "here's what your play looks like
 * from above." Pulls together signals that DON'T fit on a single
 * Overview/Openings/Mistakes/Tactics tab — color-proficiency
 * mismatches, comeback wins, first-try mastery, brilliant
 * distribution, tactic transfer gaps, repeat-of-mistake, streaks.
 *
 * All data is derived (read-only) — no emit sites here. Every row
 * gracefully hides when the underlying sample is too small to be
 * honest.
 */
import { useEffect, useState } from 'react';
import { Flame, TrendingUp, Layers, ArrowDownUp, RotateCw, Star, Repeat, Sparkles, Trophy } from 'lucide-react';
import { engagementSummary, type EngagementSummary } from '../../services/analyticsService';
import { StrengthsCard } from './StrengthsCard';

interface PatternsTabProps {
  /** When provided, parent skipped its own load — render the
   *  pre-computed summary. When null, we load on mount. */
  data?: EngagementSummary | null;
}

const MIN_GAMES_FOR_SIGNAL = 5;

export function PatternsTab({ data: provided }: PatternsTabProps = {}): JSX.Element {
  const [data, setData] = useState<EngagementSummary | null>(provided ?? null);
  const [loading, setLoading] = useState(provided === undefined || provided === null);

  useEffect(() => {
    if (provided !== undefined && provided !== null) {
      setData(provided);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void engagementSummary()
      .then((s) => { if (!cancelled) { setData(s); setLoading(false); } })
      .catch(() => { if (!cancelled) { setLoading(false); } });
    return () => { cancelled = true; };
  }, [provided]);

  if (loading) {
    return (
      <div className="py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }} data-testid="patterns-loading">
        Reading your habits…
      </div>
    );
  }

  if (!data || data.totalGames < MIN_GAMES_FOR_SIGNAL) {
    return (
      <div className="py-10 text-center" data-testid="patterns-empty">
        <Layers size={28} className="mx-auto mb-3 opacity-50" style={{ color: 'var(--color-text-muted)' }} />
        <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Not enough games yet
        </div>
        <div className="text-xs mt-2 max-w-xs mx-auto" style={{ color: 'var(--color-text-muted)' }}>
          Patterns surface after about {MIN_GAMES_FOR_SIGNAL} games. Play or import
          more to unlock the habits view.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="patterns-tab" className="flex flex-col gap-4 pt-2">
      <StreaksRow streak={data.streak} />
      <FirstTryCard firstTry={data.firstTry} />
      <ColorMismatchCard mismatch={data.colorMismatch} />
      <ComebackCard comeback={data.comeback} winShape={data.winShape} />
      <WinShapeCard winShape={data.winShape} />
      <TacticBreadthCard breadth={data.breadth} brilliantShape={data.brilliantShape} />
      <TransferGapCard rows={data.transferGap} />
      <RepeatMistakeCard repeats={data.repeatMistake} />

      {/* Reuse the existing StrengthsCard primitive for one-liner
       *  consolidated strengths derived from this tab's signals. */}
      <StrengthsCard strengths={buildStrengthsList(data)} />
    </div>
  );
}

// ─── Cards ─────────────────────────────────────────────────────────────

function StreaksRow({ streak }: { streak: EngagementSummary['streak'] }): JSX.Element {
  const showWin = streak.longestWinStreak > 0;
  const showSolve = streak.longestSolveStreak > 0;
  if (!showWin && !showSolve) return <></>;
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      data-testid="patterns-streaks"
    >
      <div className="flex items-center gap-2 mb-3">
        <Flame size={16} style={{ color: 'var(--color-warning)' }} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Streaks
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {showWin && (
          <StreakStat
            label="Win streak"
            current={streak.currentWinStreak}
            longest={streak.longestWinStreak}
            color="var(--color-success)"
          />
        )}
        {showSolve && (
          <StreakStat
            label="First-try solves"
            current={streak.currentSolveStreak}
            longest={streak.longestSolveStreak}
            color="#22d3ee"
          />
        )}
      </div>
    </div>
  );
}

function StreakStat({ label, current, longest, color }: {
  label: string; current: number; longest: number; color: string;
}): JSX.Element {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>{current}</span>
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {current === longest ? '· peak' : `· best ${longest}`}
        </span>
      </div>
    </div>
  );
}

function FirstTryCard({ firstTry }: { firstTry: EngagementSummary['firstTry'] }): JSX.Element {
  const totalSamples = firstTry.endgame.total + firstTry.mistakePuzzles.total;
  if (totalSamples === 0) return <></>;
  return (
    <PatternCard
      icon={<Star size={16} style={{ color: '#22d3ee' }} />}
      title="First-try mastery"
      subtitle="Solved on the FIRST attempt"
      bigStat={`${firstTry.overallPct}%`}
      bigStatColor="#22d3ee"
      caption={`${firstTry.endgame.mastered} of ${firstTry.endgame.total} endgames · ${firstTry.mistakePuzzles.firstTry} of ${firstTry.mistakePuzzles.total} mistake puzzles`}
      testId="patterns-first-try"
    />
  );
}

function ColorMismatchCard({ mismatch }: { mismatch: EngagementSummary['colorMismatch'] }): JSX.Element {
  if (!mismatch || !mismatch.isSignificant) return <></>;
  return (
    <PatternCard
      icon={<ArrowDownUp size={16} style={{ color: '#a855f7' }} />}
      title="Color flip"
      subtitle={`You play ${mismatch.preferredColor} more, but ${mismatch.otherColor} wins more`}
      bigStat={`+${mismatch.inversionPoints} pts`}
      bigStatColor="#a855f7"
      caption={`As ${mismatch.preferredColor} (${mismatch.preferredShare}% of games): ${mismatch.preferredWinRate}% win rate · As ${mismatch.otherColor} (${mismatch.otherShare}%): ${mismatch.otherWinRate}% win rate.`}
      testId="patterns-color-flip"
    />
  );
}

function ComebackCard({ comeback, winShape }: { comeback: EngagementSummary['comeback']; winShape: EngagementSummary['winShape'] }): JSX.Element {
  if (comeback.comebackWins === 0) return <></>;
  const deepest = comeback.deepestHoleCp !== null ? Math.abs(comeback.deepestHoleCp) : 0;
  return (
    <PatternCard
      icon={<RotateCw size={16} style={{ color: 'var(--color-success)' }} />}
      title="Comeback wins"
      subtitle="Games won from a losing position (≤−2.00)"
      bigStat={`${comeback.comebackWins}`}
      bigStatColor="var(--color-success)"
      caption={`Deepest hole climbed: ${deepest > 0 ? `−${(deepest / 100).toFixed(2)}` : '—'}. ${winShape.totalWins > 0 ? `${Math.round((comeback.comebackWins / winShape.totalWins) * 100)}% of your wins` : ''}`}
      testId="patterns-comeback"
    />
  );
}

function WinShapeCard({ winShape }: { winShape: EngagementSummary['winShape'] }): JSX.Element {
  if (winShape.totalWins === 0) return <></>;
  const pct = (n: number): number => winShape.totalWins > 0 ? Math.round((n / winShape.totalWins) * 100) : 0;
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      data-testid="patterns-win-shape"
    >
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={16} style={{ color: 'var(--color-warning)' }} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          How you win
        </h3>
      </div>
      <div className="flex gap-2">
        <WinShapeBucket label="Quick" sub="≤20 moves" value={winShape.quickWins} pct={pct(winShape.quickWins)} color="#22d3ee" />
        <WinShapeBucket label="Mid" sub="21-59 moves" value={winShape.midLengthWins} pct={pct(winShape.midLengthWins)} color="#6366f1" />
        <WinShapeBucket label="Grind" sub="≥60 moves" value={winShape.grindWins} pct={pct(winShape.grindWins)} color="#a855f7" />
      </div>
    </div>
  );
}

function WinShapeBucket({ label, sub, value, pct, color }: {
  label: string; sub: string; value: number; pct: number; color: string;
}): JSX.Element {
  return (
    <div className="flex-1 rounded-xl border p-3 text-center" style={{ borderColor: 'var(--color-border)' }}>
      <div className="text-xs font-semibold" style={{ color }}>{label}</div>
      <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{sub}</div>
      <div className="text-xl font-bold tabular-nums mt-1" style={{ color: 'var(--color-text)' }}>{value}</div>
      <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{pct}% of wins</div>
    </div>
  );
}

function TacticBreadthCard({ breadth, brilliantShape }: {
  breadth: EngagementSummary['breadth'];
  brilliantShape: EngagementSummary['brilliantShape'];
}): JSX.Element {
  if (breadth.distinctTypes === 0 && brilliantShape.totalBrilliants === 0) return <></>;
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      data-testid="patterns-breadth"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} style={{ color: '#22d3ee' }} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Brilliance shape
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Tactic types found
          </div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
            {breadth.distinctTypes}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            of 14 patterns
          </div>
        </div>
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Brilliant moves
          </div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: '#22d3ee' }}>
            {brilliantShape.totalBrilliants}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {brilliantShape.shape === 'spread' && 'spread across games'}
            {brilliantShape.shape === 'clustered' && 'clustered in a few games'}
            {brilliantShape.shape === 'insufficient' && 'one bright game'}
          </div>
        </div>
      </div>
    </div>
  );
}

function TransferGapCard({ rows }: { rows: EngagementSummary['transferGap'] }): JSX.Element {
  const significant = rows.filter((r) => r.transferGapPoints !== null && Math.abs(r.transferGapPoints) >= 20);
  if (significant.length === 0) return <></>;
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      data-testid="patterns-transfer"
    >
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={16} style={{ color: 'var(--color-warning)' }} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Puzzle vs game gap
        </h3>
      </div>
      <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Where your puzzle accuracy doesn't match what you do in real games. Positive means
        you nail the puzzle but miss the same idea on the board.
      </p>
      {significant.slice(0, 4).map((r) => (
        <div
          key={r.tacticType}
          className="flex items-center justify-between py-2 border-b text-sm"
          style={{ borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)' }}
        >
          <span className="capitalize" style={{ color: 'var(--color-text)' }}>
            {r.tacticType.replace(/_/g, ' ')}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span style={{ color: '#22d3ee' }}>{r.puzzleAccuracyPct ?? '—'}%</span>
            {' puzzle · '}
            <span style={{ color: 'var(--color-warning)' }}>{r.gameRecognitionPct ?? '—'}%</span>
            {' game · '}
            <span style={{
              color: (r.transferGapPoints ?? 0) > 0 ? 'var(--color-error)' : 'var(--color-success)',
              fontWeight: 600,
            }}>
              {(r.transferGapPoints ?? 0) > 0 ? '+' : ''}{r.transferGapPoints}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function RepeatMistakeCard({ repeats }: { repeats: EngagementSummary['repeatMistake'] }): JSX.Element {
  if (repeats.repeatedMistakes === 0) return <></>;
  const tactics = Object.entries(repeats.byTactic).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        background: 'color-mix(in srgb, var(--color-error) 4%, var(--color-surface))',
        borderColor: 'color-mix(in srgb, var(--color-error) 30%, var(--color-border))',
      }}
      data-testid="patterns-repeat-mistake"
    >
      <div className="flex items-center gap-2 mb-2">
        <Repeat size={16} style={{ color: 'var(--color-error)' }} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Same mistake, twice
        </h3>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--color-error)' }}>
          {repeats.repeatedMistakes}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          of {repeats.totalUnsolved} unsolved mistake puzzles
        </span>
      </div>
      {tactics.length > 0 && (
        <div className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
          Most often: {tactics.map(([t, n]) => `${t.replace(/_/g, ' ')} (${n})`).join(', ')}
        </div>
      )}
    </div>
  );
}

// ─── Reusable primitives ───────────────────────────────────────────────

function PatternCard({ icon, title, subtitle, bigStat, bigStatColor, caption, testId }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bigStat: string;
  bigStatColor: string;
  caption?: string;
  testId: string;
}): JSX.Element {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      data-testid={testId}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          {title}
        </h3>
      </div>
      <div className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</div>
      <div className="text-3xl font-bold tabular-nums" style={{ color: bigStatColor }}>{bigStat}</div>
      {caption && (
        <div className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>{caption}</div>
      )}
    </div>
  );
}

// ─── Strength roll-up ──────────────────────────────────────────────────

function buildStrengthsList(data: EngagementSummary): string[] {
  const out: string[] = [];
  if (data.firstTry.overallPct >= 60 && (data.firstTry.endgame.total + data.firstTry.mistakePuzzles.total) >= 5) {
    out.push(`${data.firstTry.overallPct}% first-try mastery rate`);
  }
  if (data.comeback.comebackWins >= 2) {
    out.push(`${data.comeback.comebackWins} comeback wins from a losing position`);
  }
  if (data.streak.longestWinStreak >= 3) {
    out.push(`Best win streak: ${data.streak.longestWinStreak} games`);
  }
  if (data.streak.longestSolveStreak >= 5) {
    out.push(`Best first-try solve streak: ${data.streak.longestSolveStreak}`);
  }
  if (data.breadth.distinctTypes >= 6) {
    out.push(`Found ${data.breadth.distinctTypes} distinct tactic types in your games`);
  }
  if (data.brilliantShape.shape === 'spread' && data.brilliantShape.totalBrilliants >= 5) {
    out.push(`${data.brilliantShape.totalBrilliants} brilliant moves spread across many games (general sharpness)`);
  }
  if (data.winShape.grindWins >= 3 && data.winShape.totalWins > 0) {
    const pct = Math.round((data.winShape.grindWins / data.winShape.totalWins) * 100);
    if (pct >= 30) out.push(`Strong endgame conversion (${pct}% of wins in 60+ moves)`);
  }
  if (data.winShape.quickWins >= 3 && data.winShape.totalWins > 0) {
    const pct = Math.round((data.winShape.quickWins / data.winShape.totalWins) * 100);
    if (pct >= 30) out.push(`Sharp tactical finisher (${pct}% of wins in ≤20 moves)`);
  }
  return out;
}

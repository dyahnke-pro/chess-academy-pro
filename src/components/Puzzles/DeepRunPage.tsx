import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { seedPuzzles, seedLongPuzzles, recordAttempt } from '../../services/puzzleService';
import { createAdaptiveSession, getNextAdaptivePuzzle } from '../../services/adaptivePuzzleService';
import { solverMoves } from '../../services/puzzleDepth';
import {
  startRun, solve, miss, bestAfter, rankFor, nextRank, START_DEPTH,
  type DeepRunState,
} from '../../services/deepRun';
import { reward } from '../../services/rewardService';
import { logAppAudit } from '../../services/appAuditor';
import { voiceService } from '../../services/voiceService';
import { DEFAULT_STUDENT_RATING } from '../../services/ratingBands';
import type { PuzzleRecord } from '../../types';
import { PuzzleBoard, type PuzzleOutcome } from './PuzzleBoard';
import { RollingNumber } from '../ui/RollingNumber';

/**
 * Deep Run — "How many moves deep can you accumulate!!! That's the one!!!"
 * (David 2026-10-01). Every solve asks for one move deeper; one miss ends the
 * run; the best score is remembered and shown up top. The run logic is the
 * pure `deepRun` computer; this page renders it and fetches what it asks for.
 */

const BEST_KEY = 'deep_run_best_v1';
type Phase = 'intro' | 'loading' | 'running' | 'over';

async function readBest(): Promise<number> {
  const rec = await db.meta.get(BEST_KEY);
  const n = Number(rec?.value);
  return Number.isFinite(n) ? n : 0;
}

export function DeepRunPage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const rating = activeProfile?.puzzleRating ?? DEFAULT_STUDENT_RATING;
  const [phase, setPhase] = useState<Phase>('intro');
  const [best, setBest] = useState(0);
  const [run, setRun] = useState<DeepRunState | null>(null);
  const [puzzle, setPuzzle] = useState<PuzzleRecord | null>(null);
  const runRef = useRef<DeepRunState | null>(null);
  const cappedRef = useRef(false);
  const seenRef = useRef(new Set<string>());
  const [poolReady, setPoolReady] = useState(false);

  useEffect(() => {
    void readBest().then(setBest);
    void seedPuzzles()
      .then(() => seedLongPuzzles())
      .catch((err: unknown) => console.warn('[DeepRun] pool seeding failed:', err))
      .finally(() => setPoolReady(true));
  }, []);

  /** Ask the selector for exactly `depth` solver moves; walk down when the
   *  pool has none at this rating — that is a CAP, and the rating climbs. */
  const fetchFor = useCallback(async (s: DeepRunState): Promise<void> => {
    const session = createAdaptiveSession('hard', undefined, s.targetRating);
    let served: PuzzleRecord | null = null;
    let capped = false;
    for (let d = s.depth; d >= START_DEPTH && !served; d--) {
      served = await getNextAdaptivePuzzle(session, seenRef.current, {
        targetOverride: s.targetRating,
        depth: { min: d, max: d },
      });
      if (!served) capped = true;
    }
    cappedRef.current = capped;
    void logAppAudit({
      kind: 'deep-run-step',
      category: 'subsystem',
      source: 'DeepRunPage.fetchFor',
      summary: served
        ? `asked depth ${s.depth} @${s.targetRating} → served ${solverMoves(served)}${capped ? ' (capped)' : ''}`
        : `asked depth ${s.depth} @${s.targetRating} → nothing`,
      details: JSON.stringify({
        askedDepth: s.depth,
        servedDepth: served ? solverMoves(served) : null,
        puzzleId: served?.id ?? null,
        targetRating: s.targetRating,
        puzzleRating: served?.rating ?? null,
        capped,
        banked: s.banked,
      }),
    });
    if (!served) {
      const over = miss(s);
      runRef.current = over;
      setRun(over);
      setPhase('over');
      return;
    }
    seenRef.current.add(served.id);
    setPuzzle(served);
    setPhase('running');
  }, []);

  const begin = useCallback((): void => {
    voiceService.stop();
    const s = startRun(rating, best);
    seenRef.current = new Set();
    runRef.current = s;
    setRun(s);
    setPuzzle(null);
    setPhase('loading');
    void fetchFor(s);
  }, [rating, best, fetchFor]);

  const handleComplete = useCallback((outcome: PuzzleOutcome): void => {
    const s = runRef.current;
    if (!s || !puzzle || s.over) return;
    void recordAttempt(puzzle.id, outcome.correct, rating, outcome.correct ? 'good' : 'again');
    // A run is clean depth: any wrong try or Show solution ends it.
    const clean = outcome.correct && !outcome.hadRetry && !outcome.showedSolution;
    if (!clean) {
      const over = miss(s);
      runRef.current = over;
      setRun(over);
      const b = bestAfter(over);
      if (b > best) {
        setBest(b);
        void db.meta.put({ key: BEST_KEY, value: String(b) });
      }
      setPhase('over');
      return;
    }
    const r = solve(s, solverMoves(puzzle), cappedRef.current);
    runRef.current = r.state;
    setRun(r.state);
    // The bigger moment wins the banner; each fires once.
    if (r.newBest) {
      reward({ kind: 'newBest', label: `New high score · ${r.state.banked}`, seed: r.state.solved });
      setBest(r.state.banked);
      void db.meta.put({ key: BEST_KEY, value: String(r.state.banked) });
    } else if (r.rankUp) {
      reward({ kind: 'rankUp', label: r.rankUp.name, seed: r.state.solved });
    } else if (r.levelUp) {
      reward({ kind: 'levelUp', label: `Level up · ${r.state.depth} moves`, seed: r.state.solved });
    }
    if (r.state.banked > best) {
      setBest(r.state.banked);
      void db.meta.put({ key: BEST_KEY, value: String(r.state.banked) });
    }
    setPhase('loading');
    void fetchFor(r.state);
  }, [puzzle, rating, best, fetchFor]);

  const banked = run?.banked ?? 0;
  const rank = rankFor(banked);
  const upcoming = nextRank(banked);
  const nearBest = best > 0 && banked >= best * 0.8 && banked <= best;

  const scoreRow = (
    <div className="flex items-end justify-between gap-3 rounded-2xl border-2 border-fuchsia-400/40 bg-black/40 px-4 py-2 shadow-[0_0_22px_rgba(255,61,242,0.25)]" data-testid="deep-run-score">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">Moves banked</span>
        <RollingNumber
          value={banked}
          className={`font-mono text-3xl font-black tabular-nums ${nearBest ? 'animate-pulse text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]' : 'text-fuchsia-200 drop-shadow-[0_0_10px_rgba(255,61,242,0.8)]'}`}
          testId="deep-run-banked"
        />
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Rank</span>
        <span className="text-sm font-black uppercase text-cyan-200" data-testid="deep-run-rank">{rank.name}</span>
        {upcoming && <span className="text-[10px] text-theme-text-muted">{upcoming.min - banked} to {upcoming.name}</span>}
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Best</span>
        <span className="font-mono text-xl font-black tabular-nums text-amber-200" data-testid="deep-run-best">{best}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 gap-4 p-4 md:p-6 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 overflow-y-auto" data-testid="deep-run-page">
      <div className="flex items-center gap-3">
        <button
          onClick={() => { void navigate('/tactics'); }}
          className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
          aria-label="Back to Tactics"
          data-testid="back-button"
        >
          <ArrowLeft size={18} className="text-theme-text" />
        </button>
        <Flame size={24} className="text-fuchsia-400 drop-shadow-[0_0_8px_rgba(255,61,242,0.8)]" />
        <h1 className="text-xl font-black uppercase tracking-wide text-fuchsia-200">Deep Run</h1>
        <div className="flex-1" />
        <span className="text-xs font-bold uppercase tracking-widest text-amber-300" data-testid="deep-run-best-top">Best {best}</span>
      </div>

      {phase === 'intro' && (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 text-center" data-testid="deep-run-intro">
          <p className="text-lg font-bold text-theme-text">How many moves deep can you go?</p>
          <p className="text-sm text-theme-text-muted">
            Each puzzle is one move longer than the last. Every move you find is banked. One miss ends the run.
          </p>
          <button
            onClick={begin}
            disabled={!poolReady}
            className="rounded-2xl border-2 border-fuchsia-300 bg-fuchsia-500/20 px-8 py-3 text-lg font-black uppercase tracking-widest text-fuchsia-100 shadow-[0_0_28px_rgba(255,61,242,0.6)] transition-transform hover:scale-105 disabled:opacity-50"
            data-testid="deep-run-start"
          >
            {poolReady ? 'Start run' : 'Loading…'}
          </button>
        </div>
      )}

      {(phase === 'running' || phase === 'loading' || phase === 'over') && run && (
        <div className="mx-auto w-full max-w-lg">
          {puzzle ? (
            <PuzzleBoard
              key={puzzle.id}
              puzzle={puzzle}
              onComplete={handleComplete}
              maxWrongAttempts={1}
              disabled={phase !== 'running'}
              streak={run.solved}
              headerExtra={scoreRow}
            />
          ) : (
            <>
              {scoreRow}
              <p className="mt-6 text-center text-theme-text-muted" data-testid="deep-run-loading">Finding a {run.depth}-move puzzle…</p>
            </>
          )}
        </div>
      )}

      {phase === 'over' && run && (
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-cyan-400/40 bg-black/40 p-4 text-center" data-testid="deep-run-over">
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">Run over</p>
          <p className="text-theme-text">
            You banked <span className="font-black text-fuchsia-200">{run.banked}</span> moves over {run.solved} puzzle{run.solved === 1 ? '' : 's'} — rank <span className="font-black text-cyan-200">{rankFor(run.banked).name}</span>.
          </p>
          <p className="text-xs text-theme-text-muted">
            {run.banked >= run.bestBefore && run.banked > 0 ? 'That is your best run.' : `Best is ${best}.`}
          </p>
          <button
            onClick={begin}
            className="rounded-2xl border-2 border-fuchsia-300 bg-fuchsia-500/20 px-6 py-2 font-black uppercase tracking-widest text-fuchsia-100 shadow-[0_0_20px_rgba(255,61,242,0.5)]"
            data-testid="deep-run-again"
          >
            Run again
          </button>
        </div>
      )}
    </div>
  );
}

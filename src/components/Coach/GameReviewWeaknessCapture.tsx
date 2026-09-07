// Game Review weakness capture — the M2 faucet's surface. Two jobs:
//  1. "Where you left the book" marker — replays the game vs the masters
//     explorer, shows the FIRST off-book move + what masters play (plain
//     English), and deep-links back to that opening's masterclass.
//  2. "Add this game's mistakes to your weaknesses" — classifies the
//     game's blundered player-moves into closed-set tags and logs them to
//     the shared bucket (guarded against double-logging the same game).
// Self-contained; mounts with one line in CoachGameReview.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Target, Check, Loader2 } from 'lucide-react';
import { scanTheoryDeviation, type TheoryDeviation } from '../../services/theoryDeviationScan';
import { Chess } from 'chess.js';
import { autoAnalyzeBlunders, type BlunderForAnalysis } from '../../services/autoAnalyzeGame';
import { pvUciToSan } from '../../services/principleAttribution';
import { classifyPhase } from '../../services/gamePhaseService';
import { hasMisconceptionsForGame } from '../../services/misconceptionService';
import { resolveOpeningIdFromName } from '../../services/chessConceptService';
import type { CoachGameMove } from '../../types';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface GameReviewWeaknessCaptureProps {
  moves: CoachGameMove[];
  playerColor: 'white' | 'black';
  pgn?: string;
  openingName?: string | null;
  gameId?: string;
}

/** Build the player's blundered/mistaken moves into BlunderForAnalysis,
 *  using the prior move's resulting FEN as the position-before. */
/** Normalize an engine best move to SAN from the position before it, whether it
 *  arrives as UCI ("c7c5") or SAN ("c5"). `CoachGameMove.bestMove` is populated
 *  as UCI on some paths and SAN on others (the review builds the last move's as
 *  UCI, CoachGamePage as SAN) — so the classifier + attributor, which need SAN,
 *  were silently getting UCI on some games and attaching nothing. This is the
 *  connective tissue that makes the whole record→drill chain fire regardless of
 *  which format the caller happened to store. Returns undefined on an illegal /
 *  unparseable value. */
function bestMoveToSan(fenBefore: string, best: string | null): string | undefined {
  if (!best) return undefined;
  try {
    const c = new Chess(fenBefore);
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(best)) {
      const m = c.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best.slice(4, 5) || undefined });
      return m ? m.san : undefined;
    }
    const m = c.move(best.replace(/[+#!?]+$/, ''));
    return m ? m.san : undefined;
  } catch {
    return undefined;
  }
}
export function buildBlunders(moves: CoachGameMove[], playerColor: 'white' | 'black'): BlunderForAnalysis[] {
  const sign = playerColor === 'white' ? 1 : -1;
  const out: BlunderForAnalysis[] = [];
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const side = i % 2 === 0 ? 'white' : 'black';
    if (side !== playerColor) continue;
    if (move.classification !== 'blunder' && move.classification !== 'mistake') continue;
    const cpLoss =
      move.preMoveEval !== null && move.evaluation !== null
        ? (move.preMoveEval - move.evaluation) * sign
        : undefined;
    const fenBefore = i > 0 ? moves[i - 1].fen : START_FEN;
    const bestSan = bestMoveToSan(fenBefore, move.bestMove);
    // History up to AND INCLUDING the played move — lets the classifier run the
    // fundamentals attributor and RECORD its proven fundamental as the weakness
    // tag (the same one the review speaks). Without this the loop was half-wired:
    // the fundamentals were narrated but never became drillable weaknesses.
    const historySans = moves.slice(0, i + 1).map((m) => m.san);
    // Eval (mover POV) + engine lines (SAN) unlock the eval/PV-gated fundamentals
    // on the recording path (overvalued-attack / poisoned-pawn / botched-
    // conversion). pv is UCI on the annotation — convert against the right FEN,
    // mirroring the review narrator (coachFeatureService).
    const evalBefore = move.preMoveEval !== null ? move.preMoveEval * sign : undefined;
    const evalAfterPlayed = move.evaluation !== null ? move.evaluation * sign : undefined;
    let pvAfterPlayed: string[] | undefined;
    let pvAfterBest: string[] | undefined;
    if (move.pv?.afterPlayed?.length) pvAfterPlayed = pvUciToSan(move.fen, move.pv.afterPlayed);
    if (move.pv?.afterBest?.length && bestSan) {
      try {
        const c = new Chess(fenBefore);
        if (c.move(bestSan)) pvAfterBest = pvUciToSan(c.fen(), move.pv.afterBest);
      } catch { /* illegal best (stale analysis) — skip the afterBest line */ }
    }
    out.push({
      fen: fenBefore,
      playedSan: move.san,
      bestSan,
      cpLoss: cpLoss !== undefined && cpLoss > 0 ? cpLoss : undefined,
      // Material-aware phase so endgame slips are filed as endgame.
      gamePhase: classifyPhase(fenBefore, i + 1),
      moveNumber: move.moveNumber,
      historySans,
      pvAfterPlayed,
      pvAfterBest,
      evalBefore,
      evalAfterPlayed,
    });
  }
  return out;
}

export function GameReviewWeaknessCapture({
  moves,
  playerColor,
  pgn,
  openingName,
  gameId,
}: GameReviewWeaknessCaptureProps): JSX.Element | null {
  const navigate = useNavigate();
  const openingId = openingName ? resolveOpeningIdFromName(openingName) : null;
  const [deviation, setDeviation] = useState<TheoryDeviation | null>(null);
  const [captureState, setCaptureState] = useState<'idle' | 'running' | 'done' | 'already'>('idle');
  const [loggedCount, setLoggedCount] = useState(0);

  // Where-you-left-book scan.
  useEffect(() => {
    const gamePgn = pgn ?? moves.map((m) => m.san).join(' ');
    if (!gamePgn.trim()) return;
    let cancelled = false;
    void (async () => {
      try {
        const dev = await scanTheoryDeviation(gamePgn, playerColor);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!cancelled) setDeviation(dev);
      } catch { /* no marker */ }
    })();
    return () => { cancelled = true; };
  }, [pgn, moves, playerColor]);

  // Already-captured check so the button reads "Captured" on revisit.
  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    void (async () => {
      const already = await hasMisconceptionsForGame(gameId);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!cancelled && already) setCaptureState('already');
    })();
    return () => { cancelled = true; };
  }, [gameId]);

  const blunders = buildBlunders(moves, playerColor);

  const capture = useCallback(async (): Promise<void> => {
    if (captureState !== 'idle') return;
    setCaptureState('running');
    const result = await autoAnalyzeBlunders(blunders, {
      openingId: openingId ?? undefined,
      openingName: openingName ?? undefined,
      sourceGameId: gameId,
      // Deliberate user capture of their own game → it counts.
      learned: true,
    });
    setLoggedCount(result.logged);
    setCaptureState('done');
  }, [captureState, blunders, openingId, openingName, gameId]);

  if (!deviation && blunders.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="game-review-weakness-capture">
      {deviation && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3" data-testid="where-you-left-book">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={14} className="text-blue-400" />
            <h4 className="text-sm font-semibold text-theme-text">Where you left the book</h4>
          </div>
          <p className="text-sm text-theme-text-muted leading-relaxed">
            {deviation.source === 'masters'
              ? `At move ${deviation.moveNumber} you left established theory. `
              : `At move ${deviation.moveNumber} you went off the beaten path — past where theory is recorded, here's what players at your level usually do. `}
            {deviation.mastersTop.sentence}
          </p>
          {openingId && (
            <button
              onClick={() => void navigate(`/openings/${openingId}`)}
              className="mt-2 text-xs font-semibold text-blue-400 hover:underline"
              data-testid="deviation-masterclass-link"
            >
              Study this opening →
            </button>
          )}
        </div>
      )}

      {blunders.length > 0 && (
        <button
          onClick={() => void capture()}
          disabled={captureState !== 'idle'}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-theme-surface border border-theme-border text-sm font-semibold text-theme-text hover:border-theme-accent/40 transition-colors disabled:opacity-70"
          data-testid="capture-mistakes-btn"
        >
          {captureState === 'running' && <Loader2 size={15} className="animate-spin" />}
          {(captureState === 'done' || captureState === 'already') && <Check size={15} className="text-emerald-500" />}
          {captureState === 'idle' && <Target size={15} className="text-theme-accent" />}
          {captureState === 'idle' && `Add this game's mistakes to your weaknesses (${blunders.length})`}
          {captureState === 'running' && 'Reviewing your mistakes…'}
          {captureState === 'done' && (loggedCount > 0 ? `Added ${loggedCount} to your weaknesses` : 'No new mistakes — already in your weaknesses')}
          {captureState === 'already' && 'Already in your weaknesses'}
        </button>
      )}
    </div>
  );
}

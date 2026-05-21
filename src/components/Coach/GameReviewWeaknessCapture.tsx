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
import { autoAnalyzeBlunders, type BlunderForAnalysis } from '../../services/autoAnalyzeGame';
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
function buildBlunders(moves: CoachGameMove[], playerColor: 'white' | 'black'): BlunderForAnalysis[] {
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
    out.push({
      fen: i > 0 ? moves[i - 1].fen : START_FEN,
      playedSan: move.san,
      bestSan: move.bestMove ?? undefined,
      cpLoss: cpLoss !== undefined && cpLoss > 0 ? cpLoss : undefined,
      gamePhase: move.moveNumber <= 12 ? 'opening' : 'middlegame',
      moveNumber: move.moveNumber,
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
            At move {deviation.moveNumber} you went your own way. {deviation.mastersTop.sentence}
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
          {captureState === 'done' && (loggedCount > 0 ? `Added ${loggedCount} to your weaknesses` : 'Reviewed — nothing new to drill')}
          {captureState === 'already' && 'Already in your weaknesses'}
        </button>
      )}
    </div>
  );
}

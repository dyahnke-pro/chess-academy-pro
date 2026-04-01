import { useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { stockfishEngine } from '../services/stockfishEngine';
import type { StockfishAnalysis, CoachGameMove } from '../types';

export interface UseCoachTipsConfig {
  fen: string;
  playerColor: 'white' | 'black';
  isPlayerTurn: boolean;
  enabled: boolean;
  moves: CoachGameMove[];
  onTip: (tip: string) => void;
}

interface TipContext {
  analysis: StockfishAnalysis;
  fen: string;
  playerColor: 'white' | 'black';
  moveCount: number;
  prevEval: number | null;
}

const ANALYSIS_DEPTH = 10;
const MIN_MOVES_BEFORE_TIPS = 2;

function detectTacticAvailable(ctx: TipContext): string | null {
  const { analysis, playerColor } = ctx;
  if (analysis.topLines.length < 2) return null;

  const bestEval = analysis.topLines[0].evaluation;
  const secondEval = analysis.topLines[1].evaluation;

  // A tactic exists when the best move is significantly better than alternatives
  const gap = playerColor === 'white'
    ? bestEval - secondEval
    : secondEval - bestEval;

  if (gap >= 150) {
    if (analysis.isMate && analysis.mateIn !== null && Math.abs(analysis.mateIn) <= 5) {
      return 'There is a forced checkmate available. Look carefully!';
    }
    return 'There is a tactic available in this position. Take your time.';
  }
  return null;
}

function detectKeyMoment(ctx: TipContext): string | null {
  const { analysis, prevEval, playerColor } = ctx;
  if (prevEval === null) return null;

  const currentEval = analysis.evaluation;
  // Eval swing from opponent's last move — position changed significantly
  const swing = playerColor === 'white'
    ? currentEval - prevEval
    : prevEval - currentEval;

  // Opponent just blundered — position shifted in player's favor
  if (swing >= 150) {
    return 'This is a key moment — your opponent may have made an error. Look for the best response.';
  }

  // Position becoming critical (close to losing)
  if (swing <= -150) {
    return 'Be careful here — the position has become more difficult. Think defensively.';
  }

  return null;
}

function detectMateThreats(ctx: TipContext): string | null {
  const { analysis, playerColor } = ctx;
  if (!analysis.isMate || analysis.mateIn === null) return null;

  // Mate threat against the player
  const isThreatAgainstPlayer = playerColor === 'white'
    ? analysis.mateIn < 0
    : analysis.mateIn > 0;

  if (isThreatAgainstPlayer && Math.abs(analysis.mateIn) <= 4) {
    return `Watch out — there is a mate threat in ${Math.abs(analysis.mateIn)} moves. Prioritize king safety!`;
  }

  return null;
}

function detectDevelopmentReminder(ctx: TipContext): string | null {
  const { fen, moveCount, playerColor } = ctx;
  if (moveCount > 14) return null; // Only in the opening

  try {
    const chess = new Chess(fen);
    const board = chess.board();
    const color = playerColor === 'white' ? 'w' : 'b';
    const backRank = color === 'w' ? 7 : 0; // board array: row 0 = rank 8

    let undeveloped = 0;
    for (const sq of board[backRank] ?? []) {
      if (sq && sq.color === color && (sq.type === 'n' || sq.type === 'b')) {
        undeveloped++;
      }
    }

    if (undeveloped >= 3) {
      return 'Remember to develop your pieces early. Knights and bishops are most effective when active.';
    }
  } catch {
    // skip
  }
  return null;
}

function detectCenterTension(ctx: TipContext): string | null {
  const { fen, moveCount } = ctx;
  if (moveCount < 4 || moveCount > 20) return null;

  try {
    const chess = new Chess(fen);
    const centralSquares: Array<'d4' | 'd5' | 'e4' | 'e5'> = ['d4', 'd5', 'e4', 'e5'];
    let pawnsInCenter = 0;

    for (const sq of centralSquares) {
      const piece = chess.get(sq);
      if (piece?.type === 'p') pawnsInCenter++;
    }

    if (pawnsInCenter >= 3) {
      return 'There is tension building in the center. Consider how to resolve it to your advantage.';
    }
  } catch {
    // skip
  }
  return null;
}

function detectEndgameTransition(ctx: TipContext): string | null {
  const { fen, moveCount } = ctx;
  if (moveCount < 20) return null;

  try {
    const chess = new Chess(fen);
    const board = chess.board();
    let totalPieces = 0;

    for (const row of board) {
      for (const sq of row) {
        if (sq && sq.type !== 'k' && sq.type !== 'p') totalPieces++;
      }
    }

    if (totalPieces <= 6) {
      return 'The game is entering an endgame. King activity and pawn advancement are now critical.';
    }
  } catch {
    // skip
  }
  return null;
}

function generateTip(ctx: TipContext): string | null {
  // Priority order: mate threats > tactic > key moment > positional guidance
  return (
    detectMateThreats(ctx) ??
    detectTacticAvailable(ctx) ??
    detectKeyMoment(ctx) ??
    detectEndgameTransition(ctx) ??
    detectDevelopmentReminder(ctx) ??
    detectCenterTension(ctx)
  );
}

export function useCoachTips({
  fen,
  playerColor,
  isPlayerTurn,
  enabled,
  moves,
  onTip,
}: UseCoachTipsConfig): void {
  const lastTipFenRef = useRef<string | null>(null);
  const tipCooldownRef = useRef<number>(0);
  const onTipRef = useRef(onTip);
  onTipRef.current = onTip;

  const getLatestEval = useCallback((): number | null => {
    if (moves.length === 0) return null;
    // Get eval from the last move (coach's move that just happened)
    const lastMove = moves[moves.length - 1];
    return lastMove.evaluation;
  }, [moves]);

  useEffect(() => {
    if (!enabled || !isPlayerTurn || moves.length < MIN_MOVES_BEFORE_TIPS) return;
    if (lastTipFenRef.current === fen) return;

    // Cooldown: don't tip every single move — skip every other player turn
    tipCooldownRef.current++;
    if (tipCooldownRef.current % 2 !== 0) {
      lastTipFenRef.current = fen;
      return;
    }

    const abortController = new AbortController();

    const analyzeTip = async (): Promise<void> => {
      try {
        const analysis = await stockfishEngine.analyzePosition(fen, ANALYSIS_DEPTH);

        if (abortController.signal.aborted) return;

        const ctx: TipContext = {
          analysis,
          fen,
          playerColor,
          moveCount: moves.length,
          prevEval: getLatestEval(),
        };

        const tip = generateTip(ctx);
        if (tip) {
          lastTipFenRef.current = fen;
          onTipRef.current(tip);
        }
      } catch {
        // Analysis failed — skip tip
      }
    };

    // Small delay so it doesn't compete with other analysis
    const timer = setTimeout(() => void analyzeTip(), 1200);

    return () => {
      abortController.abort();
      clearTimeout(timer);
    };
  }, [fen, enabled, isPlayerTurn, moves.length, playerColor, getLatestEval]);
}

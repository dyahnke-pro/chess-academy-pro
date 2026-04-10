import { useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { stockfishEngine } from '../services/stockfishEngine';
import {
  detectGameplayTactic,
  scanUpcomingTactic,
  buildTacticAlertMessage,
  getTacticLookahead,
  isTacticWeakness,
  recordTacticOutcome,
} from '../services/tacticAlertService';
import type { StockfishAnalysis, CoachGameMove, TacticType } from '../types';

export interface TacticLineData {
  uciMoves: string[];
  fen: string;
  /** true = player's tactic, false = opponent's tactic */
  forPlayer: boolean;
}

export interface UseCoachTipsConfig {
  fen: string;
  playerColor: 'white' | 'black';
  isPlayerTurn: boolean;
  enabled: boolean;
  moves: CoachGameMove[];
  playerRating: number;
  onTip: (tip: string, tacticLine?: TacticLineData) => void;
  /** Called when the player missed a tactic on the previous move */
  onMissedTactic?: (message: string, tacticType: TacticType) => void;
  /** Per-feature toggles from settings */
  blunderAlerts?: boolean;
  tacticAlerts?: boolean;
  positionalTips?: boolean;
}

interface TipContext {
  analysis: StockfishAnalysis;
  fen: string;
  playerColor: 'white' | 'black';
  moveCount: number;
  prevEval: number | null;
}

/** A tactic that was available but the player hasn't acted on yet */
interface PendingTactic {
  fen: string;
  tacticType: TacticType;
  moveNumber: number;
  isWeakness: boolean;
}

const ANALYSIS_DEPTH = 10;
const MIN_MOVES_BEFORE_TIPS = 2;

function detectKeyMoment(ctx: TipContext): string | null {
  const { analysis, prevEval, playerColor } = ctx;
  if (prevEval === null) return null;

  const currentEval = analysis.evaluation;
  const swing = playerColor === 'white'
    ? currentEval - prevEval
    : prevEval - currentEval;

  if (swing >= 150) {
    return 'This is a key moment — your opponent may have made an error. Look for the best response.';
  }
  if (swing <= -150) {
    return 'Be careful here — the position has become more difficult. Think defensively.';
  }
  return null;
}

function detectMateThreats(ctx: TipContext): string | null {
  const { analysis, playerColor } = ctx;
  if (!analysis.isMate || analysis.mateIn === null) return null;

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
  if (moveCount > 14) return null;

  try {
    const chess = new Chess(fen);
    const board = chess.board();
    const color = playerColor === 'white' ? 'w' : 'b';
    const backRank = color === 'w' ? 7 : 0;

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

function generatePositionalTip(ctx: TipContext): string | null {
  // Priority order: mate threats > key moment > positional guidance
  return (
    detectMateThreats(ctx) ??
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
  playerRating,
  onTip,
  onMissedTactic,
  blunderAlerts = true,
  tacticAlerts = true,
  positionalTips = true,
}: UseCoachTipsConfig): void {
  const lastTipFenRef = useRef<string | null>(null);
  const tipCooldownRef = useRef<number>(0);
  const onTipRef = useRef(onTip);
  onTipRef.current = onTip;
  const onMissedTacticRef = useRef(onMissedTactic);
  onMissedTacticRef.current = onMissedTactic;

  // Track pending tactic that was available but possibly not played
  const pendingTacticRef = useRef<PendingTactic | null>(null);

  const getLatestEval = useCallback((): number | null => {
    if (moves.length === 0) return null;
    const lastMove = moves[moves.length - 1];
    return lastMove.evaluation;
  }, [moves]);

  // Check if the player missed a pending tactic (runs when position changes).
  // This fires for ALL players immediately — the "you missed it, take it back"
  // notification is universal. The proactive "a tactic is coming" alert is what
  // adapts to rating (via lookahead distance).
  useEffect(() => {
    const pending = pendingTacticRef.current;
    if (!pending || !onMissedTacticRef.current) return;

    // If the player moved to a new position without finding the tactic
    if (moves.length > pending.moveNumber && fen !== pending.fen) {
      const message = buildTacticAlertMessage(
        pending.tacticType,
        'missed',
        playerRating,
        pending.isWeakness,
      );

      recordTacticOutcome({
        tacticType: pending.tacticType,
        found: false,
        wasCoached: false,
        context: 'gameplay',
      });

      onMissedTacticRef.current(message, pending.tacticType);
      pendingTacticRef.current = null;
    }
  }, [fen, moves.length, playerRating]);

  useEffect(() => {
    if (!enabled || !isPlayerTurn || moves.length < MIN_MOVES_BEFORE_TIPS) return;
    if (lastTipFenRef.current === fen) return;

    // Cooldown: only throttle positional tips, not tactical/blunder detection
    tipCooldownRef.current++;
    const skipPositionalTips = tipCooldownRef.current > 1 && tipCooldownRef.current % 3 !== 0;

    const abortController = new AbortController();

    const analyzeTip = async (): Promise<void> => {
      try {
        const analysis = await stockfishEngine.analyzePosition(fen, ANALYSIS_DEPTH);

        if (abortController.signal.aborted) return;

        const prevEval = getLatestEval();
        const ctx: TipContext = {
          analysis,
          fen,
          playerColor,
          moveCount: moves.length,
          prevEval,
        };

        // First: detect big eval swing from opponent's last move (opponent blundered)
        if (blunderAlerts && prevEval !== null) {
          const currentEval = analysis.evaluation;
          const swingInFavor = playerColor === 'white'
            ? currentEval - prevEval
            : prevEval - currentEval;

          if (swingInFavor >= 200) {
            lastTipFenRef.current = fen;
            onTipRef.current('Your opponent just made a serious error! Look carefully — there should be a strong move here.');
            return;
          }
        }

        // Second: check for a tactic available RIGHT NOW
        const immediateTactic = tacticAlerts ? detectGameplayTactic(fen, analysis, playerColor) : null;
        if (immediateTactic) {
          const isWeakness = await isTacticWeakness(immediateTactic);
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (abortController.signal.aborted) return;

          // Track as pending — if player doesn't play it, alert after their move
          pendingTacticRef.current = {
            fen,
            tacticType: immediateTactic,
            moveNumber: moves.length,
            isWeakness,
          };

          // Always alert about immediate tactics (all players benefit)
          const message = buildTacticAlertMessage(
            immediateTactic,
            'available',
            playerRating,
            isWeakness,
          );
          lastTipFenRef.current = fen;
          const bestLine = analysis.topLines[0];
          const tacticLine: TacticLineData | undefined = bestLine.moves.length > 0
            ? { uciMoves: bestLine.moves, fen, forPlayer: true }
            : undefined;
          onTipRef.current(message, tacticLine);
          return;
        }

        // Second: scan ahead for upcoming tactics (rating-adaptive lookahead).
        // Weaker players: 1 move ahead. Stronger players: 2-4 moves ahead.
        // This teaches stronger players to plan and weaker players to recognize.
        const lookahead = getTacticLookahead(playerRating);
        const upcoming = tacticAlerts ? scanUpcomingTactic(fen, analysis, playerColor, lookahead) : null;
        if (upcoming) {
          const isWeakness = await isTacticWeakness(upcoming.tacticType);
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (abortController.signal.aborted) return;

          const teaching = isWeakness
            ? `You have a tactic developing — a pattern you've been working on. Look for it in the next ${upcoming.movesAway} move${upcoming.movesAway > 1 ? 's' : ''}.`
            : `You have a tactic building in this position. Think ${upcoming.movesAway} move${upcoming.movesAway > 1 ? 's' : ''} ahead.`;
          lastTipFenRef.current = fen;
          const bestLine = analysis.topLines[0];
          const tacticLine: TacticLineData | undefined = bestLine.moves.length > 0
            ? { uciMoves: bestLine.moves, fen, forPlayer: true }
            : undefined;
          onTipRef.current(teaching, tacticLine);
          return;
        }

        // Third: scan for opponent tactics being set up against the player.
        // Uses the opponent's color to detect threats the player needs to defend.
        const opponentColor = playerColor === 'white' ? 'black' : 'white';
        const opponentTactic = tacticAlerts ? scanUpcomingTactic(fen, analysis, opponentColor, 2) : null;
        if (opponentTactic) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (abortController.signal.aborted) return;

          const warning = `Watch out — your opponent is setting up a tactic against you in ${opponentTactic.movesAway} move${opponentTactic.movesAway > 1 ? 's' : ''}. Look for defensive resources.`;
          lastTipFenRef.current = fen;
          const bestLine = analysis.topLines[0];
          const tacticLine: TacticLineData | undefined = bestLine.moves.length > 0
            ? { uciMoves: bestLine.moves, fen, forPlayer: false }
            : undefined;
          onTipRef.current(warning, tacticLine);
          return;
        }

        // Fall through: positional/strategic tips (throttled to avoid spam)
        if (positionalTips && !skipPositionalTips) {
          const tip = generatePositionalTip(ctx);
          if (tip) {
            lastTipFenRef.current = fen;
            onTipRef.current(tip);
          }
        }
      } catch {
        // Analysis failed — skip tip
      }
    };

    // Short delay so it doesn't compete with the coach's own Stockfish analysis
    const timer = setTimeout(() => void analyzeTip(), 600);

    return () => {
      abortController.abort();
      clearTimeout(timer);
    };
  }, [fen, enabled, isPlayerTurn, moves.length, playerColor, getLatestEval, playerRating, blunderAlerts, tacticAlerts, positionalTips]);
}

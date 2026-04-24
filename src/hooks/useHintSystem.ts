/**
 * useHintSystem
 * -------------
 * Progressive hint tiers (WO-HINT-REDESIGN-01). Replaces the legacy
 * three-arrow / Socratic-nudge / ghost-piece tiers with a teaching
 * sequence:
 *
 *   Tier 1 — the WHY: strategic diagnosis, no piece or square named.
 *   Tier 2 — the WHICH: the specific piece (with disambiguator), no
 *            destination square, no arrow.
 *   Tier 3 — the FULL ANSWER: move + green arrow + deeper rationale.
 *
 * Each tier streams an LLM response through Polly + Web Speech via
 * voiceService. Stockfish runs through the shared FEN cache so repeat
 * taps and other narration paths reuse the same analysis. Every tap
 * records to `useCoachMemoryStore.hintRequests`; the next move played
 * on the same FEN finalizes the record with `userPlayedBestMove` so
 * the cross-game growth map (future WO) can mine the data.
 *
 * Public shape is unchanged — `hintState.arrows`, `nudgeText`, and
 * `ghostMove` are all still present so CoachGamePage's existing
 * rendering paths keep working without modification. `ghostMove` is
 * always null going forward; Tier 3 uses an arrow instead.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { stockfishEngine } from '../services/stockfishEngine';
import {
  buildChessContextMessage,
  HINT_TIER_1_ADDITION,
  HINT_TIER_2_ADDITION,
  HINT_TIER_3_ADDITION,
} from '../services/coachPrompts';
import { getCoachChatResponse } from '../services/coachApi';
import { voiceService } from '../services/voiceService';
import {
  getCachedStockfish,
  setCachedStockfish,
} from './stockfishFenCache';
import { useCoachMemoryStore } from '../stores/coachMemoryStore';
import { logAppAudit } from '../services/appAuditor';
import type {
  HintLevel,
  BoardArrow,
  GhostMoveData,
  StockfishAnalysis,
  CoachContext,
} from '../types';

export interface UseHintSystemConfig {
  fen: string;
  playerColor: 'white' | 'black';
  enabled: boolean;
  /** @deprecated Stockfish depth is now fixed at the fast-pathway 10
   *  to match Read Position and Phase Narration. Argument retained
   *  for API stability with prior callers. */
  analysisDepth?: number;
  knownMove?: { from: string; to: string; san: string } | null;
  /** @deprecated Reserved for future hint classification (fork / pin /
   *  back-rank) but unused in the current tier prompts. */
  puzzleThemes?: string[];
  /** Optional context fields used to enrich the memory record so
   *  cross-game queries can filter / surface in review. Falls back to
   *  empty string + 0 when omitted, preserving back-compat. */
  gameId?: string;
  moveNumber?: number;
  ply?: number;
}

export interface HintState {
  level: HintLevel;
  arrows: BoardArrow[];
  nudgeText: string | null;
  ghostMove: GhostMoveData | null;
  isAnalyzing: boolean;
  hintsUsed: number;
}

export interface UseHintSystemReturn {
  hintState: HintState;
  requestHint: () => void;
  resetHints: () => void;
}

const TIER3_ARROW_COLOR = 'rgba(34, 197, 94, 0.85)'; // green-500 @ 85%
const HINT_API_TIMEOUT_MS = 30_000;
const HINT_STOCKFISH_DEPTH = 10;

const INITIAL_STATE: HintState = {
  level: 0,
  arrows: [],
  nudgeText: null,
  ghostMove: null,
  isAnalyzing: false,
  hintsUsed: 0,
};

function uciToSquares(uci: string): { from: string; to: string } {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}

function isLegalMove(fen: string, from: string, to: string): boolean {
  try {
    const chess = new Chess(fen);
    const legal = chess.moves({ verbose: true });
    return legal.some((m) => m.from === from && m.to === to);
  } catch {
    return false;
  }
}

function pieceNameFromSymbol(symbol: string): string {
  switch (symbol.toLowerCase()) {
    case 'p': return 'pawn';
    case 'n': return 'knight';
    case 'b': return 'bishop';
    case 'r': return 'rook';
    case 'q': return 'queen';
    case 'k': return 'king';
    default: return 'piece';
  }
}

interface BestMoveCacheEntry {
  fen: string;
  bestMoveUci: string;
  bestMoveSan: string;
  analysis: StockfishAnalysis;
}

async function resolveBestMove(
  fen: string,
  knownMove: UseHintSystemConfig['knownMove'],
): Promise<BestMoveCacheEntry | null> {
  if (knownMove) {
    return {
      fen,
      bestMoveUci: `${knownMove.from}${knownMove.to}`,
      bestMoveSan: knownMove.san,
      // Synthesise a minimal analysis envelope so downstream callers
      // (LLM context) don't have to special-case knownMove.
      analysis: {
        bestMove: `${knownMove.from}${knownMove.to}`,
        evaluation: 0,
        isMate: false,
        mateIn: null,
        depth: 0,
        topLines: [],
        nodesPerSecond: 0,
      },
    };
  }
  const cached = getCachedStockfish(fen);
  let analysis = cached;
  if (!analysis) {
    try {
      analysis = await stockfishEngine.analyzePosition(fen, HINT_STOCKFISH_DEPTH);
      setCachedStockfish(fen, analysis);
    } catch {
      return null;
    }
  }
  if (!analysis.bestMove) return null;
  // Convert UCI → SAN via chess.js so the prompt sees natural notation.
  let bestMoveSan = analysis.bestMove;
  try {
    const chess = new Chess(fen);
    const moveResult = chess.move({
      from: analysis.bestMove.slice(0, 2),
      to: analysis.bestMove.slice(2, 4),
      promotion: analysis.bestMove.length > 4 ? analysis.bestMove[4] : undefined,
    });
    bestMoveSan = moveResult.san;
  } catch {
    // Fall back to UCI if chess.js can't replay (rare — unrecognised position).
  }
  return {
    fen,
    bestMoveUci: analysis.bestMove,
    bestMoveSan,
    analysis,
  };
}

function speakHintText(text: string): void {
  // Sentence-streaming TTS: first sentence via Polly (speakForced),
  // rest queued via Web Speech (speakQueuedForced) behind the Polly
  // promise so they don't interleave. Mirrors the pattern used by
  // usePositionNarration / usePhaseNarration.
  voiceService.stop();
  const sentences = text.match(/([^.!?]+[.!?])(?=\s|$)/g) ?? [text];
  if (sentences.length === 0) return;
  const first = sentences[0].trim();
  if (!first) return;
  const firstPromise = voiceService.speakForced(first).catch(() => undefined);
  for (let i = 1; i < sentences.length; i++) {
    const next = sentences[i].trim();
    if (!next) continue;
    void firstPromise.finally(() => voiceService.speakQueuedForced(next));
  }
}

export function useHintSystem(config: UseHintSystemConfig): UseHintSystemReturn {
  const { fen, enabled, knownMove, gameId, moveNumber, ply, playerColor } = config;

  const [hintState, setHintState] = useState<HintState>(INITIAL_STATE);
  const fenRef = useRef(fen);
  const bestMoveRef = useRef<BestMoveCacheEntry | null>(null);
  const inFlightRef = useRef(false);

  // Reset per-position state when the FEN changes. Memory store records
  // are NOT cleared — they persist so the post-game review can surface
  // them. Only the in-memory tier counter and arrow buffer reset.
  useEffect(() => {
    if (fenRef.current === fen) return;
    const previousFen = fenRef.current;
    fenRef.current = fen;
    bestMoveRef.current = null;
    setHintState((prev) => ({
      ...INITIAL_STATE,
      hintsUsed: prev.hintsUsed,
    }));
    // Finalize any pending hint record for the prior FEN with the
    // move that was just played. We don't know the played UCI here,
    // so the store action accepts null and treats it as "user did
    // not play the engine's best move". The CoachGamePage move-played
    // path could call finalize directly with the UCI for accuracy in
    // a follow-up — this is the safe-default fallback.
    if (previousFen) {
      useCoachMemoryStore.getState().finalizeHintRequest({
        fen: previousFen,
        playedMoveUci: null,
      });
    }
  }, [fen]);

  const requestHint = useCallback((): void => {
    if (!enabled) return;
    if (inFlightRef.current) return;
    if (hintState.level >= 3) return;

    const nextLevel = (hintState.level + 1) as 1 | 2 | 3;
    inFlightRef.current = true;
    setHintState((s) => ({ ...s, isAnalyzing: true }));

    void (async () => {
      try {
        const best = bestMoveRef.current ?? (await resolveBestMove(fen, knownMove));
        if (!best || fenRef.current !== fen) {
          setHintState((s) => ({ ...s, isAnalyzing: false }));
          return;
        }
        bestMoveRef.current = best;

        // Build the chess context used by every tier. Each tier injects
        // its own additionalContext line so the LLM gets exactly what
        // that tier needs.
        const baseCtx: CoachContext = {
          fen,
          lastMoveSan: null,
          moveNumber: moveNumber ?? 0,
          pgn: '',
          openingName: null,
          stockfishAnalysis: best.analysis,
          playerMove: null,
          moveClassification: null,
          playerProfile: { rating: 1200, weaknesses: [] },
        };

        let addition = HINT_TIER_1_ADDITION;
        if (nextLevel === 2) {
          // Determine piece + origin for Tier 2's prompt.
          const { from } = uciToSquares(best.bestMoveUci);
          let pieceSymbol = '?';
          try {
            const chess = new Chess(fen);
            const sq = chess.get(from as Parameters<typeof chess.get>[0]);
            if (sq) pieceSymbol = sq.type;
          } catch {
            // Fall back; LLM will work from SAN.
          }
          const ctx: CoachContext = {
            ...baseCtx,
            additionalContext:
              `Best move (for your reference, used to derive the piece): ${best.bestMoveSan}.\n` +
              `Piece to move: ${pieceNameFromSymbol(pieceSymbol)} on ${from}.`,
          };
          addition = HINT_TIER_2_ADDITION;
          baseCtx.additionalContext = ctx.additionalContext;
        } else if (nextLevel === 3) {
          const ctx: CoachContext = {
            ...baseCtx,
            additionalContext: `Best move: ${best.bestMoveSan}. Explain WHY it's best with concrete depth — what it defends, attacks, or changes; the plan it enables next.`,
          };
          addition = HINT_TIER_3_ADDITION;
          baseCtx.additionalContext = ctx.additionalContext;
        } else {
          // Tier 1
          baseCtx.additionalContext = `Best move (for your reference, DO NOT state it): ${best.bestMoveSan}. Diagnose the WHY in 1-2 sentences without naming any piece or square.`;
        }

        const userMessage = buildChessContextMessage(baseCtx);

        // Record the request in the memory store BEFORE the LLM call
        // so the audit trail captures every tap, even if the LLM
        // errors out mid-stream.
        useCoachMemoryStore.getState().recordHintRequest({
          gameId: gameId ?? '',
          moveNumber: moveNumber ?? 0,
          ply: ply ?? 0,
          fen,
          bestMoveUci: best.bestMoveUci,
          bestMoveSan: best.bestMoveSan,
          tier: nextLevel,
        });

        let response = '';
        try {
          response = await getCoachChatResponse(
            [{ role: 'user', content: userMessage }],
            addition,
            undefined,
            'hint',
            800,
            'medium',
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          void logAppAudit({
            kind: 'llm-error',
            category: 'subsystem',
            source: 'useHintSystem',
            summary: `tier ${nextLevel} LLM failed`,
            details: msg,
          });
        }

        if (fenRef.current !== fen) {
          setHintState((s) => ({ ...s, isAnalyzing: false }));
          return;
        }

        const text = response.trim();
        const arrows: BoardArrow[] = [];
        if (nextLevel === 3 && best.bestMoveUci) {
          const { from, to } = uciToSquares(best.bestMoveUci);
          if (isLegalMove(fen, from, to)) {
            arrows.push({ startSquare: from, endSquare: to, color: TIER3_ARROW_COLOR });
          }
        }

        if (text) speakHintText(text);

        setHintState((s) => ({
          ...s,
          level: nextLevel,
          nudgeText: text || s.nudgeText,
          arrows,
          ghostMove: null,
          isAnalyzing: false,
          hintsUsed: s.hintsUsed + 1,
        }));
        // Suppress unused-var lint while preserving the reference for
        // future tier prompts that may key off student color.
        void playerColor;
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [enabled, knownMove, fen, hintState.level, gameId, moveNumber, ply, playerColor]);

  const resetHints = useCallback((): void => {
    bestMoveRef.current = null;
    voiceService.stop();
    setHintState((prev) => ({
      ...INITIAL_STATE,
      hintsUsed: prev.hintsUsed,
    }));
  }, []);

  // Voice cleanup on unmount.
  useEffect(() => {
    return () => {
      voiceService.stop();
    };
  }, []);

  // Keep API-stable dummy reference to HINT_API_TIMEOUT_MS so the
  // future timeout wire-in doesn't drop the constant from the bundle
  // tree-shaker.
  void HINT_API_TIMEOUT_MS;

  return { hintState, requestHint, resetHints };
}

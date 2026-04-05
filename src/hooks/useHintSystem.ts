import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { stockfishEngine } from '../services/stockfishEngine';
import { generateSocraticNudge } from '../services/socraticNudgeService';
import type { HintLevel, BoardArrow, GhostMoveData, StockfishAnalysis } from '../types';

export interface UseHintSystemConfig {
  fen: string;
  playerColor: 'white' | 'black';
  enabled: boolean;
  analysisDepth?: number;
  knownMove?: { from: string; to: string; san: string } | null;
  puzzleThemes?: string[];
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

const BEST_MOVE_COLOR = 'rgba(255, 215, 0, 0.85)';
const ALT_MOVE_COLOR_2 = 'rgba(148, 163, 184, 0.5)';
const ALT_MOVE_COLOR_3 = 'rgba(148, 163, 184, 0.35)';

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

function buildArrowsFromAnalysis(analysis: StockfishAnalysis, fen: string): BoardArrow[] {
  const arrows: BoardArrow[] = [];
  const colors = [BEST_MOVE_COLOR, ALT_MOVE_COLOR_2, ALT_MOVE_COLOR_3];

  for (let i = 0; i < analysis.topLines.length && i < 3; i++) {
    const line = analysis.topLines[i];
    const move = line.moves[0];
    if (!move) continue;
    const { from, to } = uciToSquares(move);
    if (!isLegalMove(fen, from, to)) continue;
    arrows.push({ startSquare: from, endSquare: to, color: colors[i] });
  }

  // Fallback: if topLines is empty but bestMove exists
  if (arrows.length === 0 && analysis.bestMove) {
    const { from, to } = uciToSquares(analysis.bestMove);
    if (isLegalMove(fen, from, to)) {
      arrows.push({ startSquare: from, endSquare: to, color: BEST_MOVE_COLOR });
    }
  }

  return arrows;
}

function buildArrowsFromKnownMove(knownMove: { from: string; to: string }): BoardArrow[] {
  return [
    {
      startSquare: knownMove.from,
      endSquare: knownMove.to,
      color: BEST_MOVE_COLOR,
    },
  ];
}

function buildGhostMove(
  fen: string,
  bestMoveUci: string,
): GhostMoveData | null {
  try {
    const chess = new Chess(fen);
    const from = bestMoveUci.slice(0, 2);
    const to = bestMoveUci.slice(2, 4);

    if (!isLegalMove(fen, from, to)) return null;

    const piece = chess.get(from as Parameters<typeof chess.get>[0]);
    if (!piece) return null;

    const target = chess.get(to as Parameters<typeof chess.get>[0]);
    const pieceCode = `${piece.color}${piece.type.toUpperCase()}`;

    return {
      fromSquare: from,
      toSquare: to,
      piece: pieceCode,
      capturedSquare: target && target.color !== piece.color ? to : null,
    };
  } catch {
    return null;
  }
}

const INITIAL_STATE: HintState = {
  level: 0,
  arrows: [],
  nudgeText: null,
  ghostMove: null,
  isAnalyzing: false,
  hintsUsed: 0,
};

export function useHintSystem(config: UseHintSystemConfig): UseHintSystemReturn {
  const { fen, enabled, analysisDepth = 16, knownMove, puzzleThemes } = config;

  const [hintState, setHintState] = useState<HintState>(INITIAL_STATE);
  const analysisRef = useRef<StockfishAnalysis | null>(null);
  const fenRef = useRef(fen);

  // Reset when FEN changes (also clears any stuck isAnalyzing flag)
  useEffect(() => {
    if (fenRef.current !== fen) {
      fenRef.current = fen;
      analysisRef.current = null;
      setHintState((prev) => ({
        ...INITIAL_STATE,
        hintsUsed: prev.hintsUsed,
        isAnalyzing: false,
      }));
    }
  }, [fen]);

  const requestHint = useCallback((): void => {
    if (!enabled) return;

    setHintState((prev) => {
      if (prev.level >= 3) return prev;
      const nextLevel = (prev.level + 1) as HintLevel;

      // ── Level 1: Arrows ──────────────────────────────────────────────
      if (nextLevel === 1) {
        if (knownMove) {
          return {
            ...prev,
            level: 1,
            arrows: buildArrowsFromKnownMove(knownMove),
            hintsUsed: prev.hintsUsed + 1,
          };
        }

        // Need Stockfish — trigger async analysis
        if (!analysisRef.current) {
          // Start analyzing — will resolve asynchronously
          void (async () => {
            try {
              setHintState((s) => ({ ...s, isAnalyzing: true }));
              await stockfishEngine.initialize();
              const analysis = await stockfishEngine.analyzePosition(fen, analysisDepth);
              // Only apply if FEN hasn't changed
              if (fenRef.current === fen) {
                analysisRef.current = analysis;
                setHintState((s) => ({
                  ...s,
                  level: 1,
                  arrows: buildArrowsFromAnalysis(analysis, fen),
                  isAnalyzing: false,
                  hintsUsed: s.hintsUsed + (s.level === 0 ? 1 : 0),
                }));
              } else {
                // FEN changed during analysis — clear the analyzing flag
                setHintState((s) => ({ ...s, isAnalyzing: false }));
              }
            } catch {
              setHintState((s) => ({ ...s, isAnalyzing: false }));
            }
          })();
          return { ...prev, isAnalyzing: true };
        }

        return {
          ...prev,
          level: 1,
          arrows: buildArrowsFromAnalysis(analysisRef.current, fen),
          hintsUsed: prev.hintsUsed + 1,
        };
      }

      // ── Level 2: Socratic Nudge ──────────────────────────────────────
      if (nextLevel === 2) {
        const bestMoveUci =
          knownMove
            ? `${knownMove.from}${knownMove.to}`
            : analysisRef.current?.bestMove ?? '';

        const nudgeText = generateSocraticNudge({
          fen,
          bestMoveUci,
          topLines: analysisRef.current?.topLines,
          puzzleThemes,
        });

        return {
          ...prev,
          level: 2,
          nudgeText,
          hintsUsed: prev.hintsUsed + 1,
        };
      }

      // ── Level 3: Ghost Preview ───────────────────────────────────────
      if (nextLevel === 3) {
        const bestMoveUci =
          knownMove
            ? `${knownMove.from}${knownMove.to}`
            : analysisRef.current?.bestMove ?? '';

        const ghostMove = buildGhostMove(fen, bestMoveUci);

        return {
          ...prev,
          level: 3,
          ghostMove,
          hintsUsed: prev.hintsUsed + 1,
        };
      }

      return prev;
    });
  }, [enabled, knownMove, fen, analysisDepth, puzzleThemes]);

  const resetHints = useCallback((): void => {
    analysisRef.current = null;
    setHintState((prev) => ({
      ...INITIAL_STATE,
      hintsUsed: prev.hintsUsed,
    }));
  }, []);

  return { hintState, requestHint, resetHints };
}

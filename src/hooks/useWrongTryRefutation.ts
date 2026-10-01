/**
 * useWrongTryRefutation — the ONE wrong-try teacher every Tactics board uses
 * (David 2026-10-01: "Refute it, keep the answer").
 *
 * The board calls `refute(fenBefore, wrongSan)` while the wrong move is still
 * on the board. The engine's reply line is computed (`refuteWrongTry`), its
 * arrows go through the arrow door on the board AFTER the wrong move, and the
 * sentence is returned for the board to show and speak. `clear()` drops the
 * arrows when the board takes the move back; the text stays until the next
 * move so a student with voice off still reads it.
 *
 * Engine reads are QUEUED (never cancel the hint or the coach's read) and
 * capped: a slow engine must never freeze the puzzle. No
 * answer in time → null, and the board keeps its own nudge.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { stockfishEngine } from '../services/stockfishEngine';
import { refuteWrongTry, refutationArrows, solvedDrillConcept, type WrongTryRefutation, type PuzzleLineAnalyser } from '../services/puzzleTeaching';
import type { BoardArrow } from '../types';

const REFUTE_DEPTH = 12;
const REFUTE_BUDGET_MS = 3000;

export const engineLineAnalyser: PuzzleLineAnalyser = async (fen) => {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), REFUTE_BUDGET_MS));
  const read = stockfishEngine.queueAnalysis(fen, REFUTE_DEPTH)
    .then((a) => (a.topLines[0]?.moves?.length ? { moves: a.topLines[0].moves, cpWhite: a.topLines[0].evaluation ?? a.evaluation ?? null } : null))
    .catch(() => null);
  return Promise.race([read, timeout]);
};

export interface WrongTryState {
  text: string | null;
  arrows: BoardArrow[];
  refute: (fenBefore: string, wrongSan: string) => Promise<WrongTryRefutation | null>;
  /** Arrows off (the move is taken back). */
  clearArrows: () => void;
  /** Everything off (the next move, or a new puzzle). */
  clear: () => void;
}

export function useWrongTryRefutation(analyse: PuzzleLineAnalyser = engineLineAnalyser): WrongTryState {
  const [text, setText] = useState<string | null>(null);
  const [arrows, setArrows] = useState<BoardArrow[]>([]);
  const token = useRef(0);
  // WARM THE ENGINE ON MOUNT (hand walk 2026-10-01: the FIRST wrong try of a
  // session drew nothing — the engine was still loading and missed the 3s
  // cap). A depth-1 read of the start position costs nothing and is queued, so
  // it never cancels anything.
  useEffect(() => {
    if (analyse !== engineLineAnalyser) return;
    void stockfishEngine.queueAnalysis('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1).catch(() => null);
  }, [analyse]);

  const refute = useCallback(async (fenBefore: string, wrongSan: string): Promise<WrongTryRefutation | null> => {
    const mine = ++token.current;
    const r = await refuteWrongTry({ fenBefore, wrongSan, analyse });
    if (mine !== token.current) return null; // superseded by a newer try or a clear
    if (!r) { setText(null); setArrows([]); return null; }
    setText(r.text);
    setArrows(refutationArrows(r));
    return r;
  }, [analyse]);

  const clearArrows = useCallback(() => setArrows([]), []);
  const clear = useCallback(() => { token.current += 1; setText(null); setArrows([]); }, []);

  return { text, arrows, refute, clearArrows, clear };
}

/** The concept behind a solved student-to-move drill, through the same door. */
export function useSolvedDrillConcept(solved: boolean, setupFen: string, solutionSan: readonly string[], themes?: string[]): string | null {
  return useMemo(
    () => (solved ? solvedDrillConcept(setupFen, solutionSan, themes)?.spoken ?? null : null),
    [solved, setupFen, solutionSan, themes],
  );
}

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
import { useCallback, useRef, useState } from 'react';
import { stockfishEngine } from '../services/stockfishEngine';
import { refuteWrongTry, type WrongTryRefutation, type PuzzleLineAnalyser } from '../services/puzzleTeaching';
import { admitArrows } from '../services/arrowDoor';
import type { BoardArrow } from '../types';

const REFUTE_DEPTH = 12;
const REFUTE_BUDGET_MS = 3000;

export const engineLineAnalyser: PuzzleLineAnalyser = async (fen) => {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), REFUTE_BUDGET_MS));
  const read = stockfishEngine.queueAnalysis(fen, REFUTE_DEPTH).then((a) => a.topLines[0]?.moves ?? null).catch(() => null);
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

  const refute = useCallback(async (fenBefore: string, wrongSan: string): Promise<WrongTryRefutation | null> => {
    const mine = ++token.current;
    const r = await refuteWrongTry({ fenBefore, wrongSan, analyse });
    if (mine !== token.current) return null; // superseded by a newer try or a clear
    if (!r) { setText(null); setArrows([]); return null; }
    const solver = fenBefore.split(' ')[1] === 'b' ? 'black' : 'white';
    setText(r.text);
    setArrows(admitArrows(r.arrows, { fen: r.fenAfter, studentColor: solver }).arrows);
    return r;
  }, [analyse]);

  const clearArrows = useCallback(() => setArrows([]), []);
  const clear = useCallback(() => { token.current += 1; setText(null); setArrows([]); }, []);

  return { text, arrows, refute, clearArrows, clear };
}

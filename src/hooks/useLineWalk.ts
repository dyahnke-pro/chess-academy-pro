// useLineWalk — ONE line walker for every board (David 2026-10-05: "Button
// tap to play out any lines the user wants"). Moved out of CoachTeachPage so
// the puzzle boards walk lines exactly the way Learn does: the board shows the
// line's start, steps each ply with its arrow, then returns to the live
// position. It never plays into the real game — the surface renders `walkFen`
// on a static board while it is set.
import { useCallback, useRef, useState } from 'react';
import type { BoardArrow, WalkableLine } from '../types';
import { admitArrows, lineClaims } from '../services/arrowDoor';

export interface LineWalk {
  /** The position to show while a line is on the board; null = the live board. */
  walkFen: string | null;
  walkArrows: BoardArrow[];
  /** Step a line move by move, then return to the live board. */
  walk: (line: WalkableLine) => void;
  /** End any line on the board now. */
  clear: () => void;
  /** Every ply's arrow, through the arrow door, coloured by whose move it is. */
  arrowsOf: (line: WalkableLine) => BoardArrow[];
  /** Low-level: show a position + arrows for a while (Learn's hint register). */
  hold: (fen: string, arrows: BoardArrow[], holdMs: number) => void;
  /** Low-level token, for a caller that drives its own timed sequence. */
  tokenRef: React.RefObject<number>;
  setWalkFen: (fen: string | null) => void;
  setWalkArrows: (arrows: BoardArrow[]) => void;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));

export function useLineWalk(studentColor: 'white' | 'black', source = 'lineWalk'): LineWalk {
  const [walkFen, setWalkFen] = useState<string | null>(null);
  const [walkArrows, setWalkArrows] = useState<BoardArrow[]>([]);
  const tokenRef = useRef(0);

  const arrowsOf = useCallback((line: WalkableLine): BoardArrow[] => {
    return admitArrows(
      lineClaims(line.startFen, line.plies, source),
      { fen: line.startFen, studentColor },
    ).arrows;
  }, [studentColor, source]);

  const clear = useCallback((): void => {
    tokenRef.current += 1;
    setWalkFen(null);
    setWalkArrows([]);
  }, []);

  const walk = useCallback((line: WalkableLine): void => {
    const token = ++tokenRef.current;
    void (async () => {
      setWalkFen(line.startFen);
      setWalkArrows([]);
      await sleep(600);
      const plyArrows = arrowsOf(line);
      for (const ply of line.plies) {
        if (tokenRef.current !== token) return;
        setWalkFen(ply.fenAfter);
        const hop = plyArrows.find((a) => a.startSquare === ply.uci.slice(0, 2) && a.endSquare === ply.uci.slice(2, 4));
        setWalkArrows(hop ? [hop] : []);
        await sleep(1000);
      }
      await sleep(900);
      if (tokenRef.current === token) { setWalkFen(null); setWalkArrows([]); }
    })();
  }, [arrowsOf]);

  const hold = useCallback((fen: string, arrows: BoardArrow[], holdMs: number): void => {
    const token = ++tokenRef.current;
    setWalkFen(fen);
    setWalkArrows(arrows);
    window.setTimeout(() => {
      if (tokenRef.current === token) { setWalkFen(null); setWalkArrows([]); }
    }, holdMs);
  }, []);

  return { walkFen, walkArrows, walk, clear, arrowsOf, hold, tokenRef, setWalkFen, setWalkArrows };
}

// useLineWalk — ONE line walker for every board (David 2026-10-05: "Button
// tap to play out any lines the user wants"). Moved out of CoachTeachPage so
// the puzzle boards walk lines exactly the way Learn does: the board shows the
// line's start, steps each ply with its arrow, then returns to the live
// position. It never plays into the real game — the surface renders `walkFen`
// on a static board while it is set.
import { useCallback, useRef, useState } from 'react';
import type { BoardArrow, WalkableLine } from '../types';
import { admitArrows, lineClaims } from '../services/arrowDoor';
import { squaresNamedNotMoves } from '../services/arrowEngine';
import { namedMoveArrows } from '../services/learnBoardTeaching';
import { markItems } from '../services/markAnchors';
import { scheduleMarks } from '../services/markPacing';
import { voiceService } from '../services/voiceService';
import { leadEyeSquareStyle } from './useBoardTheme';

/** The key-square fill Review lights its squares with. */
const KEY_SQUARE_FILL = '#eab308';
/** How long the answer's position stays up after its last mark. */
const MARKS_LINGER_MS = 3500;

/** How long an answer's marks wait for its audio to be on air (a wedged voice
 *  never strands them: they start at the deadline). */
const ON_AIR_WAIT_MS = 4000;

interface LineWalk {
  /** The position to show while a line is on the board; null = the live board. */
  walkFen: string | null;
  walkArrows: BoardArrow[];
  /** Step a line move by move, then return to the live board. */
  walk: (line: WalkableLine) => void;
  /** End any line on the board now. */
  clear: () => void;
  /** Every ply's arrow, through the arrow door, coloured by whose move it is. */
  arrowsOf: (line: WalkableLine) => BoardArrow[];
  /** Low-level token, for a caller that drives its own timed sequence. */
  tokenRef: React.RefObject<number>;
  setWalkFen: (fen: string | null) => void;
  setWalkArrows: (arrows: BoardArrow[]) => void;
  /** The marks a spoken answer has put up so far, on the board showing the
   *  answer's position (`walkFen`) — its arrows, and its squares as styles. */
  markArrows: BoardArrow[];
  markHighlights: string[];
  markSquareStyles: Record<string, React.CSSProperties>;
  /** AN ANSWER'S MARKS, AS THEY ARE STATED (David 2026-11-08: "Key squares get
   *  highlights, moves get arrowed, lines get multiple arrows and a play out
   *  line button, and they ALL appear AS THEY ARE STATED"). Every square the
   *  words name lit, every move they name arrowed, the answer's first line
   *  drawn ply by ply — each going up at the words that state it once the voice
   *  is on air (`markPacing`, the one schedule). The answer is about `fen` —
   *  the question's position, which a solved puzzle's board has moved past —
   *  so the board shows `fen` while its marks are up, then the live board. */
  markAnswer: (text: string, fen: string, lines: readonly WalkableLine[]) => void;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));

export function useLineWalk(studentColor: 'white' | 'black', source = 'lineWalk'): LineWalk {
  const [walkFen, setWalkFen] = useState<string | null>(null);
  const [walkArrows, setWalkArrows] = useState<BoardArrow[]>([]);
  const [markArrows, setMarkArrows] = useState<BoardArrow[]>([]);
  const [markHighlights, setMarkHighlights] = useState<string[]>([]);
  const tokenRef = useRef(0);
  const markTokenRef = useRef(0);

  const arrowsOf = useCallback((line: WalkableLine): BoardArrow[] => {
    return admitArrows(
      lineClaims(line.startFen, line.plies, source),
      { fen: line.startFen, studentColor },
    ).arrows;
  }, [studentColor, source]);

  const clear = useCallback((): void => {
    tokenRef.current += 1;
    markTokenRef.current += 1;
    setWalkFen(null);
    setWalkArrows([]);
    setMarkArrows([]);
    setMarkHighlights([]);
  }, []);

  const markAnswer = useCallback((text: string, fen: string, lines: readonly WalkableLine[]): void => {
    const token = ++markTokenRef.current;
    setMarkArrows([]);
    setMarkHighlights([]);
    if (!text.trim()) return;
    const walkToken = ++tokenRef.current;
    const viewer: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
    const highlights = squaresNamedNotMoves(text, [fen]);
    const arrows = admitArrows(namedMoveArrows(text, fen, viewer), { fen, studentColor }).arrows;
    // The first line, each ply with the arrow the door drew for it.
    const first = lines[0];
    const plyArrows = first ? arrowsOf(first) : [];
    const drawn = first
      ? first.plies.flatMap((p) => {
        const a = plyArrows.find((x) => x.startSquare === p.uci.slice(0, 2) && x.endSquare === p.uci.slice(2, 4));
        return a ? [{ ply: p, arrow: a }] : [];
      })
      : [];
    const line = drawn.length >= 2 ? drawn.map((d) => d.arrow) : [];
    const items = markItems({
      fen,
      viewer,
      highlights,
      arrows: arrows.map((a) => ({ from: a.startSquare, to: a.endSquare })),
      lines: line.length ? [{ moves: drawn.map((d) => ({ from: d.ply.uci.slice(0, 2), to: d.ply.uci.slice(2, 4), fen: d.ply.fenBefore })) }] : [],
    });
    if (items.length === 0) return;
    setWalkFen(fen);
    setWalkArrows([]);
    const shown = new Set<string>();
    const paint = (): void => {
      if (markTokenRef.current !== token) return;
      setMarkHighlights(highlights.filter((_, i) => shown.has(`h${i}`)));
      setMarkArrows([
        ...arrows.filter((_, i) => shown.has(`a${i}`)),
        ...line.filter((_, i) => shown.has(`l0.${i}`)),
      ]);
    };
    void voiceService.untilOnAir(ON_AIR_WAIT_MS).then(() => {
      if (markTokenRef.current !== token) return;
      const events = scheduleMarks(text, items);
      for (const ev of events) {
        window.setTimeout(() => {
          if (ev.kind === 'clear') shown.clear(); else shown.add(ev.id);
          paint();
        }, ev.atMs);
      }
      // Back to the live board once the answer has been said (a walk or a new
      // answer started since owns the board instead).
      const saidMs = Math.max(text.length * 55, ...events.map((e) => e.atMs));
      window.setTimeout(() => {
        if (markTokenRef.current !== token || tokenRef.current !== walkToken) return;
        setWalkFen(null);
        setMarkArrows([]);
        setMarkHighlights([]);
      }, saidMs + MARKS_LINGER_MS);
    });
  }, [studentColor, arrowsOf]);

  const walk = useCallback((line: WalkableLine): void => {
    const token = ++tokenRef.current;
    // A walk takes the board: an answer's marks come down.
    markTokenRef.current += 1;
    setMarkArrows([]);
    setMarkHighlights([]);
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

  const markSquareStyles = Object.fromEntries(markHighlights.map((sq) => [sq, leadEyeSquareStyle(KEY_SQUARE_FILL)]));
  return { walkFen, walkArrows, walk, clear, arrowsOf, tokenRef, setWalkFen, setWalkArrows, markArrows, markHighlights, markSquareStyles, markAnswer };
}

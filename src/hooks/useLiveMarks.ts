// useLiveMarks — WHAT A BOARD'S OWN VOICE SAYS, MARKED AS IT IS SAID, ON THE
// LIVE BOARD (David 2026-11-08: "Key squares get highlights, moves get arrowed
// … and they ALL appear AS THEY ARE STATED"). A puzzle's hint, its wrong-try
// line, the solution clause by clause: each set its arrows before the voice
// started and lit nothing. Now every square the words name is lit and every
// move arrowed (or the arrows the caller computed for the line), each going up
// at the words that state it once the voice is on air (`markPacing`). The board
// stays the live one — the student keeps playing.
import { useCallback, useRef, useState } from 'react';
import type { BoardArrow } from '../types';
import { marksOfWords } from '../services/wordMarks';
import { markItems } from '../services/markAnchors';
import { runMarkSchedule } from '../services/markPacing';
import { voiceService } from '../services/voiceService';
import { leadEyeSquareStyle } from './useBoardTheme';

const ON_AIR_WAIT_MS = 4000;
/** The key-square fill, as Review lights its squares. */
const KEY_SQUARE_FILL = '#eab308';

export interface LiveMarks {
  arrows: BoardArrow[];
  highlights: string[];
  /** The lit squares as board styles / annotation highlights. */
  squareStyles: Record<string, React.CSSProperties>;
  annotationHighlights: Array<{ square: string; color: string }>;
  /** Mark `text` as it is spoken on `fen`. `arrows`, when given, are the
   *  line's own arrows (already through the arrow door); otherwise the moves
   *  the words name are arrowed. `voiced` false puts every mark up now. */
  say: (text: string, fen: string, opts?: { arrows?: BoardArrow[]; prevFen?: string | null; voiced?: boolean }) => void;
  clear: () => void;
}

export function useLiveMarks(studentColor: 'white' | 'black'): LiveMarks {
  const [arrows, setArrows] = useState<BoardArrow[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const tokenRef = useRef(0);

  const clear = useCallback((): void => {
    tokenRef.current += 1;
    setArrows([]);
    setHighlights([]);
  }, []);

  const say = useCallback((text: string, fen: string, opts?: { arrows?: BoardArrow[]; prevFen?: string | null; voiced?: boolean }): void => {
    const token = ++tokenRef.current;
    setArrows([]);
    setHighlights([]);
    if (!text.trim()) return;
    const words = marksOfWords(text, fen, studentColor, opts?.prevFen ?? null);
    const lineArrows = opts?.arrows ?? words.arrows;
    if (opts?.voiced === false) { setArrows(lineArrows); setHighlights(words.highlights); return; }
    const items = markItems({
      fen,
      viewer: studentColor === 'white' ? 'w' : 'b',
      highlights: words.highlights,
      arrows: lineArrows.map((a) => ({ from: a.startSquare, to: a.endSquare })),
    });
    if (items.length === 0) return;
    void voiceService.untilOnAir(ON_AIR_WAIT_MS).then(() => {
      if (tokenRef.current !== token) return;
      runMarkSchedule(text, items, (shown) => {
        setHighlights(words.highlights.filter((_, i) => shown.has(`h${i}`)));
        setArrows(lineArrows.filter((_, i) => shown.has(`a${i}`)));
      }, () => tokenRef.current === token);
    });
  }, [studentColor]);

  const squareStyles = Object.fromEntries(highlights.map((sq) => [sq, leadEyeSquareStyle(KEY_SQUARE_FILL)]));
  const annotationHighlights = highlights.map((square) => ({ square, color: KEY_SQUARE_FILL }));
  return { arrows, highlights, squareStyles, annotationHighlights, say, clear };
}

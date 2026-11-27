// useTheoryView — THE BOARD BAR'S THEORY SLOT (David, the board bar decisions,
// 2026-11-24: "Play line becomes Theory during the opening" → "Pressing Theory
// opens a theory view: your game paused, the idea played forward from where
// you left book (or the move that set the structure), then snap back to your
// game"). Learn and Play: while the game is in the opening the line slot is
// Theory. A press builds the SAME lecture Review's Theory button plays (the
// masters walk along the game's own moves, `buildOpeningTheoryLecture`), keeps
// it from the board the game left book on, and performs it through the one
// runner (`performLecture`) on the line walker's board — the live board is
// not touched, so the game is paused while it plays — then the walker returns
// to the live board.
import { useCallback, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { BoardArrow } from '../types';
import { classifyPhase } from '../services/gamePhaseService';
import { detectOpening } from '../services/openingDetectionService';
import {
  buildOpeningTheoryLecture, buildTheoryLectureBeats, lectureNoteSelector, lectureSequence,
  loadLectureCorpus, resolveCuratedOpeningIdeas,
} from '../services/reviewOpeningTheory';
import { reviewTheoryLookup } from '../services/reviewOpeningsSource';
import { performLecture, theoryViewSteps } from '../services/theoryPlayback';
import { admitArrow } from '../services/arrowDoor';
import { voiceService } from '../services/voiceService';
import { logAppAudit } from '../services/appAuditor';

const START = new Chess().fen();

interface TheoryViewInput {
  /** The game's moves from the starting position. */
  sans: readonly string[];
  studentColor: 'white' | 'black';
  /** The line walker's board — the theory is shown there, never in the game. */
  setWalkFen: (fen: string | null) => void;
  setWalkArrows: (arrows: BoardArrow[]) => void;
  playMoveSound: (san: string) => void;
  /** The surface's name, for the audit row. */
  surface: 'learn' | 'play';
}

export interface TheoryView {
  /** The game is in the opening: the bar's line slot is Theory. */
  inOpening: boolean;
  /** Start the theory view (null while one plays or there is no game yet). */
  play: (() => void) | null;
  playing: boolean;
  stop: () => void;
  /** The line being said, for the screen. */
  caption: string | null;
}

/** The game's boards, one per move (index i = the board before move i), or
 *  null when the moves do not replay from the start. */
function boardsOf(sans: readonly string[]): string[] | null {
  const c = new Chess();
  const fens = [c.fen()];
  for (const s of sans) {
    try { c.move(s); } catch { return null; }
    fens.push(c.fen());
  }
  return fens;
}

export function useTheoryView(o: TheoryViewInput): TheoryView {
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const tokenRef = useRef(0);
  const sansKey = o.sans.join(' ');
  const boards = useMemo(() => boardsOf(sansKey ? sansKey.split(' ') : []), [sansKey]);
  const inOpening = useMemo(() => {
    if (!boards || o.sans.length === 0) return false;
    const fen = boards[boards.length - 1];
    return classifyPhase(fen, { fullMove: Number(fen.split(' ')[5]) || 1 }) === 'opening';
  }, [boards, o.sans.length]);

  const { setWalkFen, setWalkArrows, playMoveSound, studentColor, surface } = o;
  const stop = useCallback((): void => {
    tokenRef.current += 1;
    voiceService.stop();
    setPlaying(false);
    setCaption(null);
    setWalkFen(null);
    setWalkArrows([]);
  }, [setWalkFen, setWalkArrows]);

  const run = useCallback(async (): Promise<void> => {
    if (!boards) return;
    const token = ++tokenRef.current;
    const alive = (): boolean => tokenRef.current === token;
    const sans = o.sans.slice();
    const openingName = detectOpening(sans)?.name ?? 'this opening';
    setPlaying(true);
    voiceService.stop();
    // The game pauses at once: the walker's board shows the game as it stands.
    setWalkFen(boards[boards.length - 1] ?? START);
    setWalkArrows([]);
    try {
      await loadLectureCorpus().catch(() => undefined);
      const lecture = await buildOpeningTheoryLecture(boards, sans, openingName, { lookup: reviewTheoryLookup, studentColor });
      if (!alive()) return;
      if (!lecture) {
        void logAppAudit({ kind: 'theory-view', category: 'subsystem', source: 'useTheoryView', summary: `${surface}: no lecture (${openingName}, ${sans.length} plies)` });
        return;
      }
      const beats = buildTheoryLectureBeats(lecture, resolveCuratedOpeningIdeas(openingName, studentColor) ?? [], studentColor, lectureNoteSelector(openingName, studentColor));
      const departureFen = lecture.departurePly ? boards[lecture.departurePly - 1] ?? null : null;
      const steps = theoryViewSteps(lectureSequence(beats), departureFen);
      void logAppAudit({ kind: 'theory-view', category: 'subsystem', source: 'useTheoryView', summary: `${surface}: ${openingName}, ${steps.length} steps from ${lecture.departurePly ? `ply ${lecture.departurePly}` : 'the start'}` });
      await performLecture(steps, {
        alive,
        show: (fen, _san, arrows) => { setWalkFen(fen); setWalkArrows(arrows ?? []); },
        arrowFor: (fenBefore, uci) => {
          const a = admitArrow({ from: uci.slice(0, 2), to: uci.slice(2, 4), role: 'line', fen: fenBefore, source: `${surface}.theory` }, { fen: fenBefore, studentColor });
          return a ? [a] : null;
        },
        sound: playMoveSound,
        caption: setCaption,
      });
    } finally {
      // Snap back to the game (a newer run or a stop owns the board instead).
      if (alive()) { setPlaying(false); setCaption(null); setWalkFen(null); setWalkArrows([]); }
    }
  }, [boards, o.sans, studentColor, setWalkFen, setWalkArrows, playMoveSound, surface]);

  return {
    inOpening,
    play: boards && o.sans.length > 0 && !playing ? () => { void run(); } : null,
    playing,
    stop,
    caption,
  };
}

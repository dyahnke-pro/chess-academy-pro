// THE TIER MUST NOT OFFER A NOTE ABOUT PIECES THE BOARD DOES NOT HAVE.
//
// The gate that refuses those sentences shipped on 2026-08-16 and worked: one
// 44-ply prod game refused 238 of them. David's answer was the right one —
// "good that gates work, but fix at the root" — because a gate firing 238 times
// in one game is G0's disease, not its cure. Something upstream was handing the
// chokepoint hundreds of sentences about bishops on boards with no bishop.
//
// It was the FIELD, not the test. Every tier asked `namedPiecesExistOnBoard` of
// `n.plans` — a field most notes leave empty and no tier speaks — while the
// student hears `spokenBeatText`. So the ladder asked its truth question of a
// string nobody says.
//
// This file holds the fix where it belongs: at SELECTION. If it ever goes red,
// the gate will still catch the sentence — and that is exactly the state this
// test exists to make visible instead of silent.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import {
  teachingSourceForBoard,
  transitionTeachingSourceForGame,
  spokenBeatText,
  namedPiecesExistOnBoard,
  noteSpeaksOnlyPiecesOnBoard,
  notesForStructure,
} from './danyaTeachingService';

/** Piece-poor boards, where a borrowed note is most likely to name something
 *  that is gone. The first two are David's own — the rook endgame he was
 *  taught about knights and bishops over. */
const BOARDS = [
  '6k1/1p1r2pp/p3p3/8/4P3/1P2QP1P/1q4P1/5RK1 w - - 0 27',        // R+Q, no minors
  '3r2k1/1p1r2pp/p3p3/8/4P3/1P2QP1P/1q4P1/3R1RK1 w - - 4 26',    // RR+Q, no minors
  '8/5pk1/6p1/7p/7P/5PP1/2R2K2/3r4 w - - 0 40',                  // rook ending
  '8/8/4kp2/3p2p1/p1pP2P1/P1P2P2/1P2K3/8 w - - 0 35',            // king and pawn
  '6k1/1p4pp/p3p3/1q6/4P3/1P2QPPP/5R1K/3r4 w - - 1 30',
];

const missingTypes = (fen: string): string[] => {
  const present = new Set(new Chess(fen).board().flat().filter(Boolean).map((p) => p!.type));
  return ['q', 'r', 'b', 'n', 'p'].filter((t) => !present.has(t));
};

describe('note selection is piece-true before the gate ever sees it', () => {
  beforeAll(() => { loadFullCorpus(); loadSpokenBake(); }, 180_000);

  it('the sample boards really are missing pieces (guards the guard)', () => {
    // A test over boards with every piece type present would pass forever
    // while proving nothing.
    expect(BOARDS.filter((f) => missingTypes(f).length > 0).length).toBe(BOARDS.length);
  });

  it.each(BOARDS)('teachingSourceForBoard offers nothing piece-false on %s', (fen) => {
    // No `accept` predicate — deliberately. Production passes the gate in as
    // the predicate, so testing WITH one would test the backup, not the root.
    const src = teachingSourceForBoard([], fen, null);
    if (!src) return;                       // silence is an honest answer
    const spoken = spokenBeatText(src.note);
    expect(
      namedPiecesExistOnBoard(spoken, fen),
      `${src.origin} tier offered: ${spoken}`,
    ).toBe(true);
  });

  it.each(BOARDS)('the transition ritual is held to it too on %s', (fen) => {
    const src = transitionTeachingSourceForGame({ historySans: [], fen, phase: 'endgame' });
    if (!src) return;
    expect(
      namedPiecesExistOnBoard(spokenBeatText(src.note), fen),
      `${src.origin} tier offered: ${spokenBeatText(src.note)}`,
    ).toBe(true);
  });

  it.each(BOARDS)('structure transfer filters its whole result set on %s', (fen) => {
    // Callers `.find()` through this list, so it is not enough for the first
    // entry to be true — any of them can be the one spoken.
    for (const n of notesForStructure(fen, 25)) {
      expect(noteSpeaksOnlyPiecesOnBoard(n, fen), `structure offered: ${spokenBeatText(n)}`).toBe(true);
    }
  });

  it('play surface is position-only on arbitrary boards (the fence, not a bug)', () => {
    // The concept/structure BORROW that used to teach these arbitrary endgames
    // on a play surface came from the farmed anchored notes, now archived, and
    // the borrow tiers are removed (David 2026-08-26: no floating notes in the
    // play surfaces). Silence here is the intended contract — anything the read
    // does return can only be an exact-position voiced note. The teaching itself
    // is not lost: the endgame LESSON surface reaches it via the concept tier
    // (`endgameNoteForLesson`) and the tactics drill via
    // `tacticNoteForPuzzleThemes`, where the floating corpus belongs.
    for (const fen of BOARDS) {
      const src = teachingSourceForBoard([], fen, null);
      if (src) expect(src.origin).toBe('position');
    }
  });

  it('asks the question of the spoken text, not of `plans`', () => {
    // The regression that started all of this. A note whose `plans` is empty
    // (most of them) passed the old check vacuously no matter what it said.
    const note = {
      id: 'test-1', opening: null, phase: 'endgame' as const, lineSan: ['e4'],
      explains: 'The bishop pins the rook to the king.', teaches: '', plans: '',
      concepts: [], source: 'test',
    } as unknown as Parameters<typeof noteSpeaksOnlyPiecesOnBoard>[0];
    expect(namedPiecesExistOnBoard(note.plans ?? '', BOARDS[0])).toBe(true);   // the old, vacuous pass
    expect(noteSpeaksOnlyPiecesOnBoard(note, BOARDS[0])).toBe(false);          // the real question
  });
});

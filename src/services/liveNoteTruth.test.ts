// A floating note may teach a pattern. It may never be announced as a
// description of the board in front of the student.
//
// David played a Pirc on prod, 2026-08-08, and heard three of these in one
// game — each one prefixed "Coaching note for the <pattern> on the board":
//
//   move 3  "The bishop sits undefended because White's bishop controls that
//            square. When the queen steps out with mate threats…"
//            — both queens home, no mate threat anywhere.
//   move 9  "The check pins the knight, so Black's pawn push opens a line…"
//            — nobody is in check.
//   move 10 "The rook arrives with threats that cannot all be met."
//            — no rook has arrived anywhere.
//
// All three came from the TACTIC TAG tier: `detectTactics` proved a pin or a
// hanging piece was present, and the corpus was asked for a note about pins.
// The pattern was real; the note's story was another game's. Baking the notes
// had stripped their squares, which is why every square-anchored gate passed
// them — that made them unfalsifiable, not true. His words: "None of the
// narrations are matching the position!!"
//
// So the lane is gone from live play, and what replaced it is asserted here:
// the COMPUTED read, which is true of this board by construction.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import { detectTactics } from './tacticsDetector';
import { spokenTacticNote } from './danyaTeachingService';
import { buildPlayCommentary } from './playCommentary';

/** David's game, to the move that produced "The rook arrives with threats…". */
const PIRC = ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'c6', 'f4', 'b5',
  'a3', 'Bg7', 'Nf3', 'a5', 'Be2', 'Ng4', 'Bd2', 'O-O'];

const fenAfter = (n: number): string => {
  const c = new Chess();
  for (const san of PIRC.slice(0, n)) c.move(san);
  return c.fen();
};

describe('the live lane speaks about THIS board', () => {
  // 60s: the corpus is 58,124 notes and the bake is an 11 MB JSON parse, which
  // runs past vitest's 10s hook default whenever anything else is running.
  beforeAll(() => { loadFullCorpus(); loadSpokenBake(); }, 60000);

  it('THE REGRESSION: the tag tier selects by TYPE, so it cannot be about a board', () => {
    // The structural proof, and the reason framing — not a better gate — is the
    // fix. Two completely unrelated positions that happen to share a tactic type
    // get the SAME note back. Selection never looked at either board, so the
    // note cannot be a description of one, and announcing it as "the pin on the
    // board" was false for at least one of them by construction.
    const fen = fenAfter(18);
    const types = detectTactics(fen).tactics.map((t) => t.type).filter((t) => t !== 'none');
    expect(types.length).toBeGreaterThan(0);   // a pattern really is on this board

    const here = spokenTacticNote({ types, phase: 'middlegame', fen });
    // A different game entirely — Italian, nothing in common but the tag.
    const other = new Chess();
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'Bg5']) other.move(san);
    const elsewhere = spokenTacticNote({ types, phase: 'middlegame', fen: other.fen() });

    if (here && elsewhere) {
      expect(elsewhere.text).toBe(here.text);
      // …and the two boards are genuinely different, so one of those two
      // "descriptions of the board" was always a lie.
      expect(other.fen()).not.toBe(fen);
    }
  });

  it('the computed read is true of the board, every fact', () => {
    // The replacement lane. Each fact must survive being checked against the
    // FEN it was built from — that is the whole reason it can outrank a note.
    const fen = fenAfter(18);
    const beat = buildPlayCommentary({ fen, studentColor: 'white' });
    if (!beat) return;                          // silence is a valid answer
    const board = new Chess(fen);
    for (const fact of beat.facts) {
      // Every square the fact names must hold a piece.
      for (const sq of fact.match(/\b[a-h][1-8]\b/g) ?? []) {
        expect(board.get(sq as never), `${fact} names empty square ${sq}`).toBeTruthy();
      }
      // And it may not claim a check that is not there.
      if (/\bin check\b/i.test(fact)) expect(board.inCheck()).toBe(true);
    }
  });

  it('says nothing rather than something foreign on a quiet board', () => {
    // Move 3 of the Pirc — the position that got "the queen steps out with mate
    // threats". Nothing is happening, so the honest output is null.
    const fen = fenAfter(4);
    const beat = buildPlayCommentary({ fen, studentColor: 'white' });
    if (beat) {
      const board = new Chess(fen);
      for (const fact of beat.facts) {
        expect(/mate threat|steps out with/i.test(fact)).toBe(false);
        for (const sq of fact.match(/\b[a-h][1-8]\b/g) ?? []) {
          expect(board.get(sq as never), `${fact} names empty square ${sq}`).toBeTruthy();
        }
      }
    }
  });
});

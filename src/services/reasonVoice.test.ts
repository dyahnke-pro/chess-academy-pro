import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { reasonLineFor, reasonsForMove } from './reasonVoice';
import type { Reason } from './reasonCheck';
import teachings from '../data/video-teachings.json';

interface Note { id: string; lineSan: string[]; reasons?: Reason[] }
const notes = (teachings as { notes: Note[] }).notes.filter((n) => n.reasons?.length);

const before = (sans: string[]): string => {
  const c = new Chess();
  for (const s of sans.slice(0, -1)) c.move(s);
  return c.fen();
};

describe('reasonVoice', () => {
  it('speaks a reason at the position it was written for', () => {
    const note = notes[0];
    const line = reasonLineFor(before(note.lineSan), note.lineSan[note.lineSan.length - 1]);
    expect(line).not.toBeNull();
    expect(line?.spoken).toMatch(/\.$/);
    expect(line?.squares.length).toBeGreaterThan(0);
  });

  it('every note can speak at its own anchor', () => {
    // If a note's own reasons cannot produce a sentence on its own board, the
    // phrasing table has a hole — the reasons already verified as TRUE there.
    const silent = notes.filter((n) => !reasonLineFor(before(n.lineSan), n.lineSan[n.lineSan.length - 1]));
    expect(silent.map((n) => n.id)).toEqual([]);
  });

  it('says nothing when the move is not one the corpus reasoned about', () => {
    // Derived, not hard-coded. Twice now a hard-coded "quiet move nobody wrote
    // about" (a3, then h3) became one the corpus DOES reason about as notes
    // were added, and the test failed for a reason that had nothing to do with
    // the behaviour under test.
    const start = new Chess();
    const reasoned = new Set(notes.map((n) => n.lineSan[n.lineSan.length - 1].replace(/[+#]$/, '')));
    const uncovered = start.moves().find((m) => !reasoned.has(m.replace(/[+#]$/, '')));
    expect(uncovered, 'the corpus now reasons about every legal first move').toBeDefined();
    expect(reasonsForMove(start.fen(), uncovered as string)).toEqual([]);
    expect(reasonLineFor(start.fen(), uncovered as string)).toBeNull();
  });

  // The corpus reasons about a3 as a prophylactic move that covers b4. That
  // reason is TRUE from the bare starting position too — and worthless there,
  // which is the whole point: a lone square-control claim is filler, so it does
  // not get a sentence even though it verifies.
  it('will not speak a lone control claim', () => {
    expect(reasonsForMove(new Chess().fen(), 'a3')).toEqual([{ kind: 'controls', square: 'b4' }]);
    expect(reasonLineFor(new Chess().fen(), 'a3')).toBeNull();
  });

  it('drops a reason that is false on THIS board', () => {
    // The corpus reasons about `d5` hitting a bishop on c4. From the bare
    // starting-shape position below there is no bishop on c4, so the claim must
    // not survive — this is the whole point of checking rather than trusting.
    const c = new Chess();
    for (const s of ['e4', 'e6', 'd4']) c.move(s);
    for (const r of reasonsForMove(c.fen(), 'd5')) {
      if (r.kind === 'attacks') expect(r.square).not.toBe('c4');
    }
  });

  // The converse of the test below, and the one that would catch a pooled
  // reason speaking about the wrong board: several notes share a move (four
  // notes anchor on Bc4), so their reasons pool and are checked individually.
  // A "nothing settles on f7" line is correct where f7 is empty and a lie where
  // a pawn stands there — only the per-board check separates them.
  it('never calls a square empty when a piece stands on it', () => {
    for (const n of notes) {
      const fen = before(n.lineSan);
      const san = n.lineSan[n.lineSan.length - 1];
      const line = reasonLineFor(fen, san, 99);
      if (!line) continue;
      const after = new Chess(fen);
      after.move(san);
      for (const [, sq] of line.spoken.matchAll(/(?:Nothing settles on|belongs to you now|takes) ([a-h][1-8])/g)) {
        expect(after.get(sq as never), `${n.id}: ${sq} is occupied but spoken as empty`).toBeFalsy();
      }
    }
  });

  it('never names a square that is empty when it claims a piece', () => {
    for (const n of notes) {
      const fen = before(n.lineSan);
      const san = n.lineSan[n.lineSan.length - 1];
      const line = reasonLineFor(fen, san, 99);
      if (!line) continue;
      const after = new Chess(fen);
      after.move(san);
      // Every "the X on <sq>" the sentence utters must be a piece really there.
      for (const [, sq] of line.spoken.matchAll(/\b(?:pawn|knight|bishop|rook|queen|king) on ([a-h][1-8])\b/g)) {
        const actual = after.get(sq as never) ?? new Chess(fen).get(sq as never);
        expect(actual, `${n.id}: nothing on ${sq}`).toBeTruthy();
      }
    }
  });
});

// Fidelity nets for the house-voice pass, pinned on the exact lines the
// 2026-07-21 scrutiny caught in the Opera walk: a seat flip ("your queen on
// e6" for the OPPONENT's queen) and a fact-number drift ("two more" for a
// 3-point knight). Board accuracy alone passes both — these guards close it.
import { describe, it, expect } from 'vitest';
import { narrationSeatFaithful, narrationNumbersFaithful } from './coachFeatureService';
import { royalDefenderTarget } from './reviewTeachingPoints';
import { seatPieceReferences } from './groundedAnswer';
import { Chess } from 'chess.js';

describe('narrationSeatFaithful (board-truth possessives)', () => {
  // Opera after 14...Qe6 — Black queen on e6, White (student) queen on b3.
  const operaP28 = (() => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6']) c.move(s);
    return c.fen();
  })();

  it('rejects the Opera ply-28 seat flip — their queen voiced as yours', () => {
    const flipped = 'Your queen on e6 skewers your queen on b3 with the pawn on a2 behind it.';
    expect(narrationSeatFaithful(flipped, operaP28, 'w')).toBe(false);
  });

  it('accepts the correctly-seated version of the same claim', () => {
    const ok = 'Their queen on e6 skewers your queen on b3 with the pawn on a2 behind it.';
    expect(narrationSeatFaithful(ok, operaP28, 'w')).toBe(true);
  });

  // Trap after 5.O-O — Black bishop on c5, White (student) bishop on c4:
  // the warm pass invented BOTH possessives inverted (scrutiny 2026-07-21).
  const trapP9 = (() => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'O-O']) c.move(s);
    return c.fen();
  })();

  it('rejects invented possessives the deterministic fact never carried', () => {
    const flipped = "Your bishop on c5 pins the f2-pawn to the king, and your opponent's bishop on c4 pins f7 to the knight.";
    expect(narrationSeatFaithful(flipped, trapP9, 'w')).toBe(false);
  });

  it('accepts the same pins seated correctly', () => {
    const ok = "Their bishop on c5 pins the f2-pawn to the king, and your bishop on c4 pins f7 to the knight.";
    expect(narrationSeatFaithful(ok, trapP9, 'w')).toBe(true);
  });

  it('ignores possessive claims about empty or mismatched squares (board-accuracy guard owns those)', () => {
    const w = 'Your rook on h5 dominates.';
    expect(narrationSeatFaithful(w, trapP9, 'w')).toBe(true);
  });
});

describe('narrationNumbersFaithful', () => {
  it('rejects a material number the fact never stated', () => {
    const det = 'cxb5 captures the knight, wins 3 points of material.';
    const drifted = 'then cxb5 grabs the knight for two more points of material';
    expect(narrationNumbersFaithful(det, drifted)).toBe(false);
  });

  it('accepts spelled-out versions of the same number', () => {
    const det = 'Bxb4+ captures the queen, wins 9 points of material.';
    const ok = 'Bxb4 takes the queen with check — nine points of material in the bag.';
    expect(narrationNumbersFaithful(det, ok)).toBe(true);
  });

  it('leaves meta-counts like "three pins" unguarded', () => {
    const det = 'Bishop pins d7 against the king. Bishop pins f6 against the queen. Rook pins d7 against the rook.';
    const ok = 'Three pins now — d7 held twice, f6 nailed to the queen.';
    expect(narrationNumbersFaithful(det, ok)).toBe(true);
  });
});

describe('seatPieceReferences — the deterministic mine/yours package', () => {
  // Trap after 5.O-O: Black bishop c5, White bishop c4 — the detector's
  // seatless pin descriptions must come out SEATED so the model never
  // invents the possessive (David 2026-07-21: "ship the correct answer").
  const trapP9 = (() => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'O-O']) c.move(s);
    return c.fen();
  })();

  it('stamps computed owners onto seatless detector descriptions', () => {
    const det = 'Bishop on c5 pins pawn on f2 against king on g1. Bishop on c4 pins pawn on f7 against knight on g8.';
    const seated = seatPieceReferences(det, trapP9, 'w');
    expect(seated).toContain('Their bishop on c5');
    expect(seated).toContain('your pawn on f2');
    expect(seated).toContain('your king on g1');
    expect(seated).toContain('Your bishop on c4');
    expect(seated).toContain('their pawn on f7');
  });

  it('leaves already-seated and mismatched references untouched', () => {
    const det = 'Their bishop on c5 is active. Plant a knight on d6 to blockade.';
    const seated = seatPieceReferences(det, trapP9, 'w');
    expect(seated).toContain('Their bishop on c5'); // already seated — unchanged
    expect(seated).toContain('a knight on d6');     // d6 is empty — untouched
  });

  it('absorbs a leading "the" instead of doubling articles', () => {
    const seated = seatPieceReferences('the bishop on c5 eyes f2.', trapP9, 'w');
    expect(seated).toBe('their bishop on c5 eyes f2.');
  });
});

describe('royalDefenderTarget names every royal guard', () => {
  it('says "king and queen" when both guard (Opera after 13.Rxd7)', () => {
    // White rook on d7 attacks the d8 rook; d8 is defended by Ke8 AND Qe7.
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7']) c.move(s);
    const t = royalDefenderTarget(c.fen(), 'w');
    expect(t).toMatch(/guarded only by the king and queen/);
  });
});

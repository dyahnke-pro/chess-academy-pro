/**
 * #12 of the 2026-10-19 hand walk (Keres Sicilian, White): arrows. A green
 * arrow on a student move nobody played (2.Ne2 drew f2–f4, 6.h3 drew d2–d3),
 * the alternative the coach called worse drawn green (29.h4: "Anything else,
 * like b4, gives up about half a point" drew b3–b4), and the lines of the
 * instant and phase waves never drawn at all.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { admitArrows, keptLineArrows, ARROW_COLOR } from './arrowDoor';
import { refutedAlternativeClaims } from './learnBoardTeaching';
import type { DecisiveReason } from './decisiveReason';

const GAME = 'e4 c5 Ne2 Nc6 Nbc3 e5 Ng3 Nf6 Bc4 d6 h3 Be7 Bb5 O-O O-O Nd4 Bc4 Be6 d3 Nd7 Nd5 Bh4 Bb3 Nxb3 axb3 Bxg3 fxg3 Nb8 Qh5 a5 Ne3 b6 Qh4 Nc6 Ra3 Qxh4 gxh4 Rfd8 h5 Nd4 Rf2 Ra7 Rxa5 Rxa5 Bd2 Ra7 h6 gxh6 Nf1 Kg7 Ng3 Rg8 Nh5+ Kf8 Nf6 Rg6 h4 Kg7'.split(' ');
/** The board after `plies` half-moves of the game. */
const at = (plies: number): string => { const c = new Chess(); for (const m of GAME.slice(0, plies)) c.move(m); return c.fen(); };

describe('the arrow door holds every student move on screen, whatever the role', () => {
  it('2.Ne2 Nc6: f2–f4 is not drawn as a sight line or a missed move', () => {
    const fen = at(4);
    for (const role of ['vision', 'missed', 'play', 'line'] as const) {
      const r = admitArrows([{ from: 'f2', to: 'f4', role, fen, source: 'test' }], { fen, studentColor: 'white', holdStudentMoves: true });
      expect(r.arrows, role).toHaveLength(0);
    }
  });
  it('6.h3 Be7: d2–d3 is not drawn — and a true sight line of theirs still is', () => {
    const fen = at(12);
    expect(admitArrows([{ from: 'd2', to: 'd3', role: 'vision', fen, source: 'test' }], { fen, studentColor: 'white', holdStudentMoves: true }).arrows).toHaveLength(0);
    expect(admitArrows([{ from: 'c6', to: 'd4', role: 'vision', fen, source: 'test' }], { fen, studentColor: 'white', holdStudentMoves: true }).arrows).toHaveLength(1);
  });
});

describe('a refuted alternative is red, never green', () => {
  it('29.h4: "Anything else, like b4" draws b3–b4 red on the board it was weighed on', () => {
    const before = at(56); // before 29.h4
    const reason = { tail: ' Anything else, like b4, gives up about half a point.', nextBestSan: 'b4' } as DecisiveReason;
    const claims = refutedAlternativeClaims(reason, before);
    expect(claims).toEqual([expect.objectContaining({ from: 'b3', to: 'b4', role: 'refuted' })]);
    const drawn = admitArrows(claims, { fen: at(58), studentColor: 'white', holdStudentMoves: true }).arrows;
    expect(drawn).toHaveLength(1);
    expect(drawn[0].color).toBe(ARROW_COLOR.theirs);
    // No tail spoken, nothing drawn.
    expect(refutedAlternativeClaims({ ...reason, tail: null }, before)).toEqual([]);
  });
});

describe('keptLineArrows — every wave draws its kept lines one way', () => {
  it("12.Bb3 Nxb3: their line on screen draws red; the student's next ply in it is held", () => {
    const fen = at(24); // after 12.Bb3 Nxb3, White to move
    const c = new Chess(fen);
    const recapture = c.move('axb3');
    const theirs = c.move('Bxg3');
    const drawn = keptLineArrows([{ fen, arrows: [{ from: recapture.from, to: recapture.to }, { from: theirs.from, to: theirs.to }] }], fen, 'white');
    expect(drawn.map((a) => `${a.startSquare}${a.endSquare}`)).toEqual(['h4g3']);
    expect(drawn[0].color).toBe(ARROW_COLOR.theirs);
  });
  it('a line from the board before the move draws only the plies still to come', () => {
    const before = at(22); // before 12.Bb3
    const c = new Chess(before);
    const plies = ['Bb3', 'Nxb3', 'axb3', 'Bxg3'].map((s) => { const m = c.move(s); return { from: m.from, to: m.to }; });
    const now = at(24); // after 12.Bb3 Nxb3
    const drawn = keptLineArrows([{ fen: before, arrows: plies }], now, 'white');
    expect(drawn.map((a) => `${a.startSquare}${a.endSquare}`)).toEqual(['h4g3']);
  });
});

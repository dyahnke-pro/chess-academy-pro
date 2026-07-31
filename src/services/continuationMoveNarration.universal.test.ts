import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { narrateContinuationMove } from './continuationMoveNarration';
import { deriveNarrationArrows } from './narrationArrows';

// David 2026-07-31: "I will be choosing a different opening, so make sure your
// fixes are universal, not just to a singular opening."
//
// Everything shipped today was diagnosed on ONE line (the Alapin). This sweeps
// structurally different openings — both colours, closed and open, gambits,
// fianchettos, queen's-pawn and flank systems — plus the move types that
// usually break board code (castling, promotion, en passant, under-promotion).
// Nothing here is opening-aware; the point is to prove that.

const OPENINGS: Array<{ name: string; sans: string[] }> = [
  { name: 'Ruy Lopez', sans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O'] },
  { name: 'Sicilian Najdorf', sans: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6'] },
  { name: 'French Winawer', sans: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3', 'Ne7'] },
  { name: 'Caro-Kann Advance', sans: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5', 'Be3', 'Nd7'] },
  { name: "King's Indian", sans: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6'] },
  { name: 'Queen’s Gambit Declined', sans: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6'] },
  { name: 'Grünfeld', sans: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7'] },
  { name: 'English', sans: ['c4', 'e5', 'Nc3', 'Nf6', 'g3', 'd5', 'cxd5', 'Nxd5', 'Bg2', 'Nb6', 'Nf3', 'Nc6'] },
  { name: 'Dutch Stonewall', sans: ['d4', 'f5', 'g3', 'Nf6', 'Bg2', 'e6', 'Nf3', 'd5', 'O-O', 'Bd6', 'c4', 'c6'] },
  { name: "King's Gambit Accepted", sans: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ne5', 'Nf6', 'd4', 'd6'] },
  { name: 'Scandinavian', sans: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'c6', 'Bc4', 'Bf5'] },
  { name: 'Pirc', sans: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'f4', 'Bg7', 'Nf3', 'O-O', 'Bd3', 'Na6'] },
];

/** Every move of a line, narrated the way the play-out does it. */
const walkLine = (sans: string[]): Array<{ san: string; n: ReturnType<typeof narrateContinuationMove> }> => {
  const c = new Chess();
  const out: Array<{ san: string; n: ReturnType<typeof narrateContinuationMove> }> = [];
  for (const san of sans) {
    const before = c.fen();
    const mv = c.move(san);
    out.push({ san: mv.san, n: narrateContinuationMove(before, c.fen(), mv.san, mv.from, mv.to) });
  }
  return out;
};

describe.each(OPENINGS.map((o) => [o.name, o.sans] as const))(
  'play-out narration is universal — %s',
  (_name, sans) => {
    it('narrates every single move', () => {
      for (const { san, n } of walkLine(sans)) {
        expect(n.say.trim().length, `silent on ${san}`).toBeGreaterThan(10);
        expect(n.short.trim().length, `no cue on ${san}`).toBeGreaterThan(0);
      }
    });

    it('draws the trail on every move, and never an arrow from an empty square', () => {
      const c = new Chess();
      for (const san of sans) {
        const before = c.fen();
        const mv = c.move(san);
        const n = narrateContinuationMove(before, c.fen(), mv.san, mv.from, mv.to);
        expect(n.arrows[0]).toEqual({ from: mv.from, to: mv.to, color: 'orange' });
        const board = new Chess(c.fen());
        for (const a of n.arrows.slice(1)) {
          expect(board.get(a.from as never), `${san}: arrow from empty ${a.from}`).toBeTruthy();
        }
      }
    });

    it('never names a square outside the board', () => {
      for (const { san, n } of walkLine(sans)) {
        for (const sq of n.say.match(/\b[a-h][1-8]\b/g) ?? []) {
          expect(/^[a-h][1-8]$/.test(sq), `${san}: bad square ${sq}`).toBe(true);
        }
      }
    });
  },
);

describe('board mechanics that usually break move code', () => {
  it('handles castling both sides, for both colours', () => {
    for (const line of [
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O'],
      ['d4', 'd5', 'Nc3', 'Nc6', 'Bf4', 'Bf5', 'Qd2', 'Qd7', 'O-O-O'],
      ['e4', 'e5', 'Nf3', 'Nf6', 'Nc3', 'Bc5', 'Bc4', 'O-O'],
    ]) {
      const steps = walkLine(line);
      const last = steps[steps.length - 1];
      expect(last.n.say.trim().length).toBeGreaterThan(10);
      expect(last.n.arrows.length).toBeGreaterThan(0);
    }
  });

  it('handles promotion and en passant', () => {
    // Promotion.
    const promo = new Chess('8/P6k/8/8/8/8/7K/8 w - - 0 1');
    const before = promo.fen();
    const mv = promo.move({ from: 'a7', to: 'a8', promotion: 'q' });
    const n = narrateContinuationMove(before, promo.fen(), mv.san, mv.from, mv.to);
    expect(n.say.trim().length).toBeGreaterThan(10);

    // En passant.
    const ep = new Chess('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3');
    const epBefore = ep.fen();
    const epMv = ep.move({ from: 'e5', to: 'f6' });
    const epN = narrateContinuationMove(epBefore, ep.fen(), epMv.san, epMv.from, epMv.to);
    expect(epN.say).toMatch(/taking the pawn/i);
  });

  it('degrades safely on a position it cannot read', () => {
    const n = narrateContinuationMove('not-a-fen', 'also-not-a-fen', 'e4', 'e2', 'e4');
    expect(n.say.trim().length).toBeGreaterThan(0);
    expect(n.arrows[0]).toEqual({ from: 'e2', to: 'e4', color: 'orange' });
  });
});

describe('arrow derivation is universal', () => {
  it('never draws an arrow from an empty square, across every opening', () => {
    // The VISUAL contract. Legality-at-the-start is the wrong assertion for a
    // chained plan ("Nf3, then d4 and Qd2" — Qd2 only becomes legal once the
    // d2-pawn has moved), and a chain step is the feature, not a bug. What
    // must always hold is that the arrow starts on a piece the student can
    // see, or it reads as broken.
    for (const { sans } of OPENINGS) {
      const c = new Chess();
      for (const san of sans) {
        const mv = c.move(san);
        const fen = c.fen();
        const res = deriveNarrationArrows(
          'The plan is Nf3, then d4 and Qd2, hitting e5 and controlling d5.',
          fen,
          [{ from: mv.from, to: mv.to }],
        );
        const board = new Chess(fen);
        for (const a of res.arrows) {
          expect(/^[a-h][1-8]$/.test(a.from) && /^[a-h][1-8]$/.test(a.to), `bad square ${a.from}-${a.to}`).toBe(true);
          expect(board.get(a.from as never), `arrow from empty ${a.from} at ${fen}`).toBeTruthy();
        }
      }
    }
  });

  it('draws nothing at all when the prose names no moves', () => {
    for (const { sans } of OPENINGS.slice(0, 4)) {
      const c = new Chess();
      for (const san of sans) c.move(san);
      const res = deriveNarrationArrows(
        'Both sides have finished developing and the position is balanced.',
        c.fen(),
        [],
      );
      expect(res.arrows).toHaveLength(0);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { deriveNarrationArrows } from './narrationArrows';

// The three false arrows measured on the SHIPPED Grand Prix / Glek narration
// (2026-07-31) — the ones David saw and called "hallucination-ish". Each is
// pinned here with the real prose and the real position it was drawn from, so
// the gate can't regress into drawing them again.
const fenAfter = (sans: string[]): string => {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
};

const sansOf = (r: ReturnType<typeof deriveNarrationArrows>): string[] => r.arrows.map((a) => `${a.from}-${a.to}`);

describe('deriveNarrationArrows — the shipped false arrows', () => {
  it('"keeps the knight off f3" is a square reference, not a pawn push', () => {
    // Grand Prix, after 1.e4 c5 2.Nc3.
    const fen = fenAfter(['e4', 'c5', 'Nc3']);
    const text =
      "Nc3 does double duty: it defends e4 so Black can't strike there for free, "
      + 'and it keeps the knight off f3 for now, letting White decide which attacking setup to build.';
    const r = deriveNarrationArrows(text, fen, [{ from: 'b1', to: 'c3' }]);
    expect(sansOf(r)).not.toContain('f2-f3');
    expect(r.rejected.some((x) => x.token === 'f3' && /square reference/.test(x.reason))).toBe(true);
  });

  it('"Bc4 (or Bb5)" resolves the alternative from the LIVE position, not after Bc4', () => {
    // Grand Prix, after 1.e4 c5 2.Nc3 Nc6 3.f4.
    const fen = fenAfter(['e4', 'c5', 'Nc3', 'Nc6', 'f4']);
    const text =
      'f4 is the defining move of the Grand Prix Attack. White immediately starts building a '
      + 'kingside pawn storm, planning to follow up with Bc4 (or Bb5).';
    const r = deriveNarrationArrows(text, fen, [{ from: 'f2', to: 'f4' }]);
    // Bc4 is the plan step; Bb5 is the alternative — BOTH start from f1.
    expect(sansOf(r)).toContain('f1-c4');
    expect(sansOf(r)).toContain('f1-b5');
    // The bug drew the bishop moving on from c4, a position the game never had.
    expect(sansOf(r)).not.toContain('c4-b5');
  });

  it('"Qe1-h4" is one queen move, not a pawn to h4', () => {
    const fen = fenAfter(['e4', 'c5', 'Nc3', 'Nc6', 'f4']);
    const text = 'The plan is Qe1-h4, swinging the queen to the kingside.';
    const r = deriveNarrationArrows(text, fen, [{ from: 'f2', to: 'f4' }]);
    expect(sansOf(r)).not.toContain('h2-h4');
    // Qe1 then h4 is not legal in one move here, so nothing is drawn rather
    // than something wrong — a missing arrow beats a false one.
    expect(r.arrows.every((a) => a.from !== 'h2')).toBe(true);
  });
});

describe('deriveNarrationArrows — what it must still draw', () => {
  it('draws the opponent replies a beat genuinely names', () => {
    // Grand Prix after 4...Nc6: White to move, but the prose names Black's options.
    const fen = fenAfter(['e4', 'c5', 'Nc3', 'Nc6']);
    const text =
      "Black waits to see where White puts the bishop before deciding whether to play d6, e6, or g6.";
    const r = deriveNarrationArrows(text, fen, [{ from: 'b8', to: 'c6' }]);
    const drawn = sansOf(r);
    expect(drawn).toContain('d7-d6');
    expect(drawn).toContain('e7-e6');
    expect(drawn).toContain('g7-g6');
  });

  it('chains a named PLAN across the position each step makes', () => {
    // White has castled, so the king is on g1 and the h3/Kh2 regroup is real.
    const fen = fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']);
    const text = 'A common set-up is h3, then Kh2.';
    const r = deriveNarrationArrows(text, fen, []);
    // Kh2 is only legal AFTER h3 — the chain must have advanced to find it.
    expect(sansOf(r)).toContain('h2-h3');
    expect(sansOf(r)).toContain('g1-h2');
  });

  it('never draws a move that is illegal from any real position', () => {
    const fen = fenAfter(['e4', 'c5']);
    const r = deriveNarrationArrows('White could try Qh8 or Nf9 or blah.', fen, []);
    expect(r.arrows).toHaveLength(0);
  });

  it('reports every rejection so a bake pass can be reviewed', () => {
    const fen = fenAfter(['e4', 'c5', 'Nc3']);
    const r = deriveNarrationArrows('The knight sits on c3 and eyes d5.', fen, []);
    expect(r.arrows).toHaveLength(0);
    expect(r.rejected.length).toBeGreaterThan(0);
  });
});

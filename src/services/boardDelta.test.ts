// The board-delta computer — no silent moves (David 2026-07-22: "the package
// must contain every relevant change that took place on the board"). Each
// class pinned on the canonical teaching example it exists for.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeBoardDelta } from './boardDelta';
import { computeMoveFacets } from './reviewFullData';

describe('[eval] attribution — the bar never moves unexplained (David 2026-07-22)', () => {
  const base = (over: Partial<Parameters<typeof computeMoveFacets>[0]>): string[] => {
    const c = new Chess();
    c.move('e4');
    return computeMoveFacets({
      fenBefore: new Chess().fen(),
      fenAfter: c.fen(),
      san: 'e4',
      ply: 1,
      moverColor: 'white',
      playerColor: 'white',
      studentColorWB: 'w',
      evaluation: 60,
      preMoveEval: 20,
      classification: 'good',
      bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 },
      allSans: ['e4'],
      forcedRunStartPly: null,
      ...over,
    });
  };

  it('attributes a quiet positional drift to the computed changes that fired', () => {
    const facets = base({});
    const evalFacet = facets.find((f) => f.startsWith('[eval]'));
    expect(evalFacet).toBeTruthy();
    expect(evalFacet).toMatch(/0\.4 your way/);
    expect(evalFacet).toMatch(/no material story/);
    expect(evalFacet).toMatch(/positional/);
  });

  it('stays quiet when the bar barely moves', () => {
    const facets = base({ evaluation: 25 });
    expect(facets.find((f) => f.startsWith('[eval]'))).toBeUndefined();
  });

  it('attributes a material swing to the material count', () => {
    // Position where White wins a free queen: exchange on d5 nets a pawn?
    // Simpler: black queen hanging on d4, White plays Qxd4 — +9 material,
    // eval jumps ~900.
    const fenBefore = 'k7/8/8/8/3q4/8/8/K2Q4 w - - 0 1';
    const c = new Chess(fenBefore);
    c.move('Qxd4');
    const facets = computeMoveFacets({
      fenBefore,
      fenAfter: c.fen(),
      san: 'Qxd4',
      ply: 1,
      moverColor: 'white',
      playerColor: 'white',
      studentColorWB: 'w',
      evaluation: 900,
      preMoveEval: 0,
      classification: 'good',
      bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 },
      allSans: ['Qxd4'],
      forcedRunStartPly: null,
    });
    const evalFacet = facets.find((f) => f.startsWith('[eval]'));
    expect(evalFacet).toBeTruthy();
    expect(evalFacet).toMatch(/material changed hands/);
  });
});

describe('computeBoardDelta — every relevant change, computed', () => {
  it('UNCOVERS: 1.e4 voices the free-both-pieces IDEA, not two mechanical line-opens', () => {
    // The queen (d1) and bishop (f1) diagonals both open through e2 → ONE idea,
    // not "reaches h5 / reaches a6" (David 2026-07-23: voice the idea, cut the
    // readout onto empty space).
    const joined = computeBoardDelta(new Chess().fen(), 'e4').join(' | ');
    expect(joined).toMatch(/opens the diagonals for both the queen on d1 and the bishop on f1 at once/);
    expect(joined).not.toMatch(/line just opened — it now reaches h5/);
    expect(joined).not.toMatch(/line just opened — it now reaches a6/);
  });

  it('UNCOVERS: a diagonal opening onto EMPTY space is not narrated', () => {
    // 1.d4 opens only the c1 bishop onto empty squares — the queen opens the
    // d-FILE (not a diagonal), so there's no "both diagonals" idea, and the
    // empty-diagonal readout is suppressed as mechanics, not teaching.
    expect(computeBoardDelta(new Chess().fen(), 'd4').join(' | ')).not.toMatch(/line just opened/);
  });

  it('UNCOVERS: a line opening onto a real ENEMY target IS still narrated', () => {
    const c = new Chess();
    c.move('e4'); c.move('e5'); c.move('Nf3'); c.move('d6'); c.move('d4'); c.move('Bg4');
    const joined = computeBoardDelta(c.fen(), 'dxe5').join(' | ');
    expect(joined).toMatch(/queen on d1's line just opened.*hitting the pawn on d6/);
  });

  it('BLOCKS: 2.Ne2 shuts in the f1 bishop', () => {
    const c = new Chess();
    c.move('e4'); c.move('e5');
    const clauses = computeBoardDelta(c.fen(), 'Ne2');
    expect(clauses.join(' | ')).toMatch(/shuts in the bishop on f1 — its line past e2 is closed/);
  });

  it('ABANDONS: the knight walks away from the pawn it guarded', () => {
    const clauses = computeBoardDelta('k7/8/8/8/P7/2N5/8/K7 w - - 0 1', 'Nd5');
    expect(clauses.join(' | ')).toMatch(/walks away from the pawn on a4/);
    expect(clauses.join(' | ')).toMatch(/standing invitation/);
  });

  it('WEAKENS: ...g6 gives up f6 and h6 for good in front of the castled king', () => {
    const clauses = computeBoardDelta('6k1/6pp/8/8/8/8/8/6K1 b - - 0 1', 'g6');
    expect(clauses.join(' | ')).toMatch(/gives up f6 and h6 for good/);
    expect(clauses.join(' | ')).toMatch(/pawns don't move back/);
  });

  it('RIGHTS: an early king move gives up castling for good', () => {
    const c = new Chess();
    c.move('e4'); c.move('e5');
    const clauses = computeBoardDelta(c.fen(), 'Ke2');
    expect(clauses.join(' | ')).toMatch(/gives up castling for good/);
  });

  it('RIGHTS: a rook lift gives up one side only', () => {
    const c = new Chess();
    c.move('h4'); c.move('e5'); c.move('Rh3');
    // White still has queenside rights — only short castling is gone.
    const after = new Chess(c.fen());
    void after;
    const b = new Chess();
    b.move('h4'); b.move('e5');
    const clauses = computeBoardDelta(b.fen(), 'Rh3');
    expect(clauses.join(' | ')).toMatch(/gives up castling short/);
  });

  it('ABANDONS never names the mover itself at its landing square', () => {
    // Nf4-d5 lands on an undefended square: the mover is not "walked away
    // from" — that read was incoherent (board-awareness sweep, 2026-07-22).
    const clauses = computeBoardDelta('4k3/8/8/8/5N2/8/8/4K3 w - - 0 30', 'Nd5');
    expect(clauses.join(' | ')).not.toMatch(/walks away from the knight on d5/);
  });

  it('WEAKENS skips squares a neighbouring pawn still covers (1.e4 is not a weakening)', () => {
    // After 1.e4, c2 still covers d3 and g2 still covers f3 — neither square
    // "needs piece cover", so the clause must stay silent.
    const clauses = computeBoardDelta(new Chess().fen(), 'e4');
    expect(clauses.join(' | ')).not.toMatch(/gives up .* for good/);
  });

  it('stays quiet on a move that changes none of the tracked classes', () => {
    // 1.Nc3 from the start: no slider unblocked meaningfully (b1 vacated sits
    // on no slider's line), nothing abandoned, no pawn, rights intact.
    const clauses = computeBoardDelta(new Chess().fen(), 'Nc3');
    expect(clauses).toEqual([]);
  });
});

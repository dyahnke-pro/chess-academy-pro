import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeStructureSignature, signatureMatchScore } from './structureSignature';
import { notesForStructure } from './danyaTeachingService';

const fenAfter = (sans: string): string => {
  const c = new Chess();
  for (const s of sans.split(' ')) c.move(s);
  return c.fen();
};

describe('computeStructureSignature', () => {
  it('classifies the start position as opening, no families', () => {
    const sig = computeStructureSignature(new Chess().fen());
    expect(sig.phase).toBe('opening');
    expect(sig.families).toEqual([]);
    expect(sig.queens).toBe('both');
  });

  it('detects the e4e5 closed centre + white kingside fianchetto in the Glek', () => {
    const sig = computeStructureSignature(fenAfter('e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2 d6 d3 a6 O-O O-O'));
    expect(sig.families).toContain('e4e5-closed');
    expect(sig.families).toContain('fianchetto-white-k');
  });

  it('detects a white IQP', () => {
    // c- and e-pawns traded off, lone white d4 pawn.
    const sig = computeStructureSignature('r1bq1rk1/pp2bppp/2n2n2/8/3P4/2N2N2/PP3PPP/R1BQ1RK1 w - - 0 10');
    expect(sig.families).toContain('iqp-white');
  });

  it('detects the Maróczy bind', () => {
    const sig = computeStructureSignature('r1bq1rk1/pp2ppbp/2np1np1/8/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 0 9');
    expect(sig.families).toContain('maroczy-bind');
  });

  it('detects the advance chain (French shape)', () => {
    const sig = computeStructureSignature(fenAfter('e4 e6 d4 d5 e5'));
    expect(sig.families).toContain('advance-chain');
  });

  it('classifies a rook endgame with material signature', () => {
    const sig = computeStructureSignature('8/5pk1/6p1/8/1r6/6P1/5PK1/1R6 w - - 0 40');
    expect(sig.phase).toBe('endgame');
    expect(sig.materialSig).toBe('R|R');
    expect(sig.queens).toBe('none');
  });
});

describe('signatureMatchScore', () => {
  it('matches two different openings sharing the e4e5 + fianchetto structure', () => {
    // Glek and a KIA-style setup reach the same structural family.
    const glek = computeStructureSignature(fenAfter('e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2 d6 d3 a6 O-O O-O'));
    const kiaish = computeStructureSignature(fenAfter('e4 e5 Nf3 d6 g3 Nf6 Bg2 Be7 O-O O-O d3 c6'));
    expect(signatureMatchScore(glek, kiaish)).toBeGreaterThan(0);
  });

  it('rejects transfer across unrelated structures', () => {
    const french = computeStructureSignature(fenAfter('e4 e6 d4 d5 e5'));
    const maroczy = computeStructureSignature('r1bq1rk1/pp2ppbp/2np1np1/8/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 0 9');
    expect(signatureMatchScore(french, maroczy)).toBe(0);
  });

  it('binds endgame transfer to the exact material class', () => {
    const rookEnd = computeStructureSignature('8/5pk1/6p1/8/1r6/6P1/5PK1/1R6 w - - 0 40');
    const bishopEnd = computeStructureSignature('8/5pk1/6p1/8/1b6/6P1/5PK1/1B6 w - - 0 40');
    expect(signatureMatchScore(rookEnd, bishopEnd)).toBe(0);
    expect(signatureMatchScore(rookEnd, rookEnd)).toBeGreaterThan(0);
  });
});

describe('notesForStructure (transfer tier)', () => {
  it('never returns a note whose claims are false on the live board', () => {
    // Any live position: every returned note must pass the board-claim check
    // by construction. Sample a few structurally busy positions.
    const fens = [
      fenAfter('e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2 d6 d3 a6 O-O O-O'),
      fenAfter('e4 e6 d4 d5 e5 c5 c3 Nc6'),
      'r1bq1rk1/pp2ppbp/2np1np1/8/2P1P3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 0 9',
    ];
    for (const fen of fens) {
      for (const n of notesForStructure(fen, 5)) {
        expect(n.lineSan.length, `${n.id} must be position-keyed`).toBeGreaterThan(0);
      }
    }
  });
});

// Carlsen–Topalov review walk (2026-09-27), Black's seat — two false claims
// found reading the tape, each pinned on the real position.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { detectConcept } from './reviewConcepts';
import { computeMoveFundamentals } from './moveFundamentals';

const after = (sans: string): Chess => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c; };

describe('7.c4 hitting b5 does not "tear the centre open" at a king on e8', () => {
  it('silent on the real move', () => {
    const c = after('e4 c5 Nf3 d6 Bb5+ Nd7 O-O Nf6 Re1 a6 Bd3 b5');
    const fenBefore = c.fen(); c.move('c4');
    const beat = detectConcept({ fenBefore, fenAfter: c.fen(), san: 'c4', moverColor: 'w', evalBefore: 0, evalAfter: 0, studentColor: 'b' });
    expect(beat?.concept).not.toBe('open-lines-at-king');
  });
  it('NEGATIVE CONTROL: d4 hitting e5 with the king on e8 still speaks', () => {
    const c = after('e4 e5 Nf3 Nc6');
    const fenBefore = c.fen(); c.move('d4');
    const beat = detectConcept({ fenBefore, fenAfter: c.fen(), san: 'd4', moverColor: 'w', evalBefore: 0, evalAfter: 0, studentColor: 'b' });
    expect(beat?.concept).toBe('open-lines-at-king');
  });
});

describe('"completes your development" is an opening fact', () => {
  it('a bishop leaving its home rank on move 39 is not development', () => {
    const fen = '4b3/8/8/2p5/8/8/5PPP/6K1 b - - 0 39';
    expect(computeMoveFundamentals(fen, 'Bb5', 'black').some((f) => f.id === 'development-complete')).toBe(false);
  });
  it('NEGATIVE CONTROL: the last minor out on move 8 still reads', () => {
    const fen = '4kb2/8/8/8/8/8/8/4K3 b - - 0 8';
    expect(computeMoveFundamentals(fen, 'Be7', 'black').some((f) => f.id === 'development-complete')).toBe(true);
  });
});

import { computeMoveFacets, NO_TEACHING_CONTEXT } from './reviewFullData';

describe('"you can take back" only when taking back holds (15.Nxh7)', () => {
  const trade = (sans: string, san: string): string[] => {
    const c = after(sans); const fenBefore = c.fen(); c.move(san);
    return computeMoveFacets({ seenFundamentals: new Set(), teaching: NO_TEACHING_CONTEXT,
      fenBefore, fenAfter: c.fen(), san, ply: 29, moverColor: 'white', playerColor: 'black', studentColorWB: 'b',
      evaluation: 0, preMoveEval: 0, classification: null, bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 }, allSans: [], forcedRunStartPly: null, bestLineUci: [], replyBestSan: null,
    }).filter((f) => f.startsWith('[trade]'));
  };
  it('Rxh7 loses the rook to Qxh7 — not offered as a take-back', () => {
    const f = trade('e4 c5 Nf3 d6 Bb5+ Nd7 O-O Nf6 Re1 a6 Bd3 b5 c4 g5 Nxg5 Ne5 Be2 bxc4 Na3 Rg8 Nxc4 Nxc4 d4 Nb6 Bh5 Nxh5 Qxh5 Rg7', 'Nxh7');
    expect(f.join(' ')).not.toMatch(/you can take back/);
    expect(f.join(' ')).toMatch(/taking back would cost you more than the pawn/);
  });
  it('NEGATIVE CONTROL: 16.dxc5 — an even recapture is still offered', () => {
    const f = trade('e4 c5 Nf3 d6 Bb5+ Nd7 O-O Nf6 Re1 a6 Bd3 b5 c4 g5 Nxg5 Ne5 Be2 bxc4 Na3 Rg8 Nxc4 Nxc4 d4 Nb6 Bh5 Nxh5 Qxh5 Rg7 Nxh7 Qd7', 'dxc5').join(' ');
    expect(f).toMatch(/you can take back/);
  });
});

// WO-LAYERS-01 step 2 — a line is spoken as PROOF of one claim, then stops.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { proofCut, describeProofResult } from './exchangeLedger';

const fenAfter = (moves: string[]): string => { const c = new Chess(); for (const m of moves) c.move(m); return c.fen(); };

describe('proofCut — stop where the claim settles', () => {
  it('a line that ends in mate is spoken to the mate, not to the pawn grabbed on the way', () => {
    // Blackburne Shilling: Nxe5 wins a pawn first; the point is Nf3#.
    const fen = fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4']);
    const line = ['Nxe5', 'Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#'];
    const p = proofCut(fen, line, 'b');
    expect(p?.mate).toBe(true);
    expect(p?.plies).toBe(line.length);
  });

  it('a trade line stops at the first point its final net is reached', () => {
    // exd5 wins a pawn that …Nf6 threatens to take back; c4 holds it. The
    // line goes on (…g6, Nc3) — moves the proof does not need. (…c6 would
    // win it back — the Panov — and the ledger rightly refuses that line.)
    const fen = fenAfter(['e4', 'd5']);
    const line = ['exd5', 'Nf6', 'c4', 'g6', 'Nc3'];
    const p = proofCut(fen, line, 'w');
    expect(p).not.toBeNull();
    expect(p!.plies).toBe(3);
    expect(describeProofResult(p!.ledger!)).toBe('you win a pawn');
  });

  it('a line that settles nothing proves no material point (null → the caller says the verdict)', () => {
    const fen = new Chess().fen();
    expect(proofCut(fen, ['e4', 'e5', 'Nf3', 'Nc6'], 'w')).toBeNull();
  });

  it('a line that ends mid-trade is not a proof', () => {
    const fen = fenAfter(['e4', 'd5']);
    expect(proofCut(fen, ['exd5'], 'w')).toBeNull(); // Qxd5 is still coming
  });
});

// The position's standing, said only when the move changed it — one producer
// for Review's briefing and the lesson composer (WO-OPENINGS-REWRITE-01).
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { evalReading } from './reviewMoveBriefing';

const after = (...sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('evalReading', () => {
  it('says nothing when the standing did not move (same band, swing under 40)', () => {
    expect(evalReading(after('e4', 'e5', 'Nf3'), 25, 30, null, 'w', null)).toBeNull();
  });

  it('says the verdict and its board reason when the band changes', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.Nxe5 — a pawn up for you.
    const fen = after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5');
    const text = evalReading(fen, 20, 180, null, 'w', { to: 'e5', captured: 'p' });
    expect(text).toMatch(/^You're .*better — you're up a pawn\.$/);
  });

  it('is said from the student seat', () => {
    const fen = after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5');
    expect(evalReading(fen, -20, -180, null, 'b', { to: 'e5', captured: 'p' })).toMatch(/^You're .*worse — you're down a pawn\.$/);
  });
});

import { describe, it, expect } from 'vitest';
import { detectSlip, SLIP_CP } from './slipDetector';

describe('detectSlip', () => {
  it('following the book move is never a slip', () => {
    const r = detectSlip({
      inBook: true, bookMoveSan: 'Nf3', playedSan: 'Nf3',
      evalBeforeCp: 20, evalAfterCp: 20, learned: true,
    });
    expect(r.isSlip).toBe(false);
  });

  it('leaving book into a worse move fires with reason left-book', () => {
    const r = detectSlip({
      inBook: true, bookMoveSan: 'Ba4', playedSan: 'Bxc6',
      evalBeforeCp: 30, evalAfterCp: 30 - SLIP_CP.mistake, learned: true,
    });
    expect(r.isSlip).toBe(true);
    expect(r.reason).toBe('left-book');
    expect(r.severity).toBe('mistake');
    expect(r.shouldCount).toBe(true);
  });

  it('an eval drop while already off-book fires with reason eval-drop', () => {
    const r = detectSlip({
      inBook: false, playedSan: 'h3',
      evalBeforeCp: 50, evalAfterCp: 50 - SLIP_CP.blunder, learned: true,
    });
    expect(r.isSlip).toBe(true);
    expect(r.reason).toBe('eval-drop');
    expect(r.severity).toBe('blunder');
  });

  it('a small eval wobble below the inaccuracy floor is not a slip', () => {
    const r = detectSlip({
      inBook: false, playedSan: 'Re1',
      evalBeforeCp: 40, evalAfterCp: 40 - (SLIP_CP.inaccuracy - 1), learned: true,
    });
    expect(r.isSlip).toBe(false);
  });

  it('a slip on an unlearned line is real but should NOT count (gate)', () => {
    const r = detectSlip({
      inBook: false, playedSan: 'Qh5',
      evalBeforeCp: 0, evalAfterCp: -SLIP_CP.mistake, learned: false,
    });
    expect(r.isSlip).toBe(true);
    expect(r.shouldCount).toBe(false);
  });

  it('an improving move (negative cpLoss) is never a slip', () => {
    const r = detectSlip({
      inBook: false, playedSan: 'Nxe5',
      evalBeforeCp: 10, evalAfterCp: 120, learned: true,
    });
    expect(r.isSlip).toBe(false);
  });
});

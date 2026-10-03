import { describe, it, expect, vi, beforeEach } from 'vitest';

const recordCapabilityEvidence = vi.fn<(args: Record<string, unknown>) => Promise<number>>(async () => 1);
vi.mock('./capabilityEvidence', () => ({
  recordCapabilityEvidence: (args: Record<string, unknown>) => recordCapabilityEvidence(args),
}));

import { isLegalMove, recordCalculationFirstAnswer } from './calculationDrillService';
import { MISTAKE_CP } from './engineConstants';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BLACK_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('recordCalculationFirstAnswer — the Calculation drill writes the student model', () => {
  beforeEach(() => recordCapabilityEvidence.mockClear());

  it('an accepted first answer is a clean (held) puzzle row with the played SAN', async () => {
    await recordCalculationFirstAnswer({ fen: START, from: 'e2', to: 'e4', accepted: true, themes: ['mateIn2'], prompted: false });
    expect(recordCapabilityEvidence).toHaveBeenCalledWith({
      fenBefore: START, playedSan: 'e4', moverColor: 'white', cpLoss: 0, origin: 'puzzle', prompted: false,
    });
  });

  it('a rejected first answer is sized from the puzzle themes, as the puzzle board does', async () => {
    await recordCalculationFirstAnswer({ fen: BLACK_TO_MOVE, from: 'g8', to: 'f6', accepted: false, themes: ['mateIn3'], prompted: false });
    expect(recordCapabilityEvidence).toHaveBeenCalledWith(expect.objectContaining({
      playedSan: 'Nf6', moverColor: 'black', cpLoss: 300,
    }));
    await recordCalculationFirstAnswer({ fen: START, from: 'a2', to: 'a3', accepted: false, themes: ['quietMove'], prompted: false });
    expect(recordCapabilityEvidence).toHaveBeenLastCalledWith(expect.objectContaining({ cpLoss: MISTAKE_CP }));
  });

  it('a hint or Skip/Reveal marks the row prompted', async () => {
    await recordCalculationFirstAnswer({ fen: START, from: 'e2', to: 'e4', accepted: true, themes: [], prompted: true });
    expect(recordCapabilityEvidence).toHaveBeenCalledWith(expect.objectContaining({ prompted: true }));
  });

  it('an illegal drop records nothing', async () => {
    expect(isLegalMove(START, 'e2', 'e5')).toBe(false);
    expect(await recordCalculationFirstAnswer({ fen: START, from: 'e2', to: 'e5', accepted: false, themes: [], prompted: false })).toBe(0);
    expect(recordCapabilityEvidence).not.toHaveBeenCalled();
  });
});

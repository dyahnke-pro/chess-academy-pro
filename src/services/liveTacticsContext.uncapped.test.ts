/**
 * NO CAP ON THE LIVE TACTICS PACKAGE (G4.5). The package used to cut
 * threats, opportunities and the immediate tactics at five each — before the
 * grounded answer (which speaks every one) or the Learn alert ranked them.
 * The detectors are mocked to report seven of each, and all seven arrive.
 */
import { describe, it, expect, vi } from 'vitest';
import type { TacticPattern, UpcomingTactic } from '../types/tacticTypes';

const pattern = (i: number, beneficiary: 'w' | 'b'): TacticPattern => ({
  type: 'pin',
  description: `pattern ${i}`,
  involvedSquares: [`a${(i % 8) + 1}`, `h${(i % 8) + 1}`],
  beneficiary,
} as unknown as TacticPattern);

vi.mock('./tacticsDetector', () => ({
  detectTactics: () => ({ tactics: Array.from({ length: 7 }, (_, i) => pattern(i, 'w')), hangingPieces: [] }),
}));
vi.mock('./tacticClassifier', async (orig) => ({
  ...(await orig<object>()),
  scanUpcomingTactics: (): UpcomingTactic[] => Array.from({ length: 14 }, (_, i) => ({
    pattern: pattern(i, i % 2 === 0 ? 'w' : 'b'),
    beneficiary: i % 2 === 0 ? 'player' : 'opponent',
    depthAhead: 2,
    line: [],
    pv: [],
    fen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
  } as unknown as UpcomingTactic)),
}));
vi.mock('./factStakes', async (orig) => ({ ...(await orig<object>()), isScenicPawnPin: () => false }));

const { buildTacticsLiveContext, detectImmediateTactics } = await import('./liveTacticsContext');

const FEN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

describe('the live tactics package is uncapped (G4.5)', () => {
  it('every immediate tactic arrives — seven, not five', () => {
    expect(detectImmediateTactics(FEN, 'w')).toHaveLength(7);
  });

  it('every upcoming threat and opportunity arrives — seven each, not five', () => {
    const ctx = buildTacticsLiveContext(FEN, {
      bestMove: 'e1e2', evaluation: 0, isMate: false, mateIn: null, depth: 12,
      topLines: [{ rank: 1, evaluation: 0, moves: ['e1e2'], mate: null }], nodesPerSecond: 0,
    }, 'w', 2000);
    expect(ctx.opportunities).toHaveLength(7);
    expect(ctx.threats).toHaveLength(7);
  });
});

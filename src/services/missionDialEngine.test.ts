/**
 * The "no attacks on pieces" dial, through the engine's own door
 * (`getAdaptiveMove`) — WO-MISSIONS-01.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';

const pickBookMoveMock = vi.fn();
vi.mock('./coachBookMove', () => ({ pickBookMove: (...a: unknown[]) => pickBookMoveMock(...a) }));
vi.mock('./masterPlayLookup', () => ({ lookupMasterPlay: vi.fn().mockResolvedValue({ source: 'none', moves: [], totalGames: 0 }) }));
const auditMock = vi.fn();
vi.mock('./appAuditor', () => ({ logAppAudit: (...a: unknown[]) => auditMock(...a) }));
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn(),
    analyzeWithBudget: vi.fn(),
    getBestMove: vi.fn(),
    restartIfUnresponsive: vi.fn().mockResolvedValue(false),
    supportsOption: vi.fn(() => true),
    initialize: vi.fn(),
    stop: vi.fn(),
  },
}));

import { getAdaptiveMove } from './coachGameEngine';
import { stockfishEngine } from './stockfishEngine';

const RUY = (() => { const b = new Chess(); for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']) b.move(s); return b.fen(); })();
const OFF = { dials: { attacksOnPieces: 'off' as const, plannedTrap: 'off' as const }, studentColor: 'white' as const };

describe('getAdaptiveMove under the mission dials', () => {
  beforeEach(() => {
    auditMock.mockReset();
    pickBookMoveMock.mockReset();
    vi.mocked(stockfishEngine).analyzeWithBudget.mockReset();
  });

  it("the band's …a6 kicks the student's bishop: the next quiet road is played instead", async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'a6', uci: 'a7a6', candidates: [{ san: 'a6', uci: 'a7a6', games: 900 }, { san: 'Nf6', uci: 'g8f6', games: 700 }] });
    const r = await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: OFF });
    expect(r.move).toBe('g8f6');
    expect(r.source).toBe('amateur-band');
    expect(auditMock.mock.calls.some(([e]) => (e as { kind: string }).kind === 'mission-dial-swap')).toBe(true);
  });

  it('with the dial on (or no mission), the same reply stands', async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'a6', uci: 'a7a6', candidates: [{ san: 'a6', uci: 'a7a6', games: 900 }, { san: 'Nf6', uci: 'g8f6', games: 700 }] });
    expect((await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: null })).move).toBe('a7a6');
    expect((await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...OFF, dials: { attacksOnPieces: 'on', plannedTrap: 'on' } } })).move).toBe('a7a6');
  });

  it('every acceptable reply attacks a piece: the least costly is played and mission-dial-forced is logged', async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'Nd4', uci: 'c6d4', candidates: [{ san: 'Nd4', uci: 'c6d4', games: 900 }] });
    // White-POV evals, Black to move: …a6 is best (+0.30), …Nd4 costs 30cp,
    // the quiet …Nf6 costs 3 pawns — outside the strength window.
    vi.mocked(stockfishEngine).analyzeWithBudget.mockResolvedValue({
      bestMove: 'a7a6', evaluation: 30, isMate: false, mateIn: null, depth: 10, nodesPerSecond: 1,
      topLines: [
        { rank: 1, evaluation: 30, moves: ['a7a6'], mate: null },
        { rank: 2, evaluation: 60, moves: ['c6d4'], mate: null },
        { rank: 3, evaluation: 330, moves: ['g8f6'], mate: null },
      ],
    });
    const r = await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: OFF });
    expect(r.move).toBe('a7a6');
    const forced = auditMock.mock.calls.map(([e]) => e as { kind: string; summary: string }).find((e) => e.kind === 'mission-dial-forced');
    expect(forced?.summary).toMatch(/c6d4 → a7a6/);
  });

  it('an empty engine read with no other roads: a quiet safe move, never an unweighed "forced"', async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'a6', uci: 'a7a6', candidates: [{ san: 'a6', uci: 'a7a6', games: 900 }] });
    vi.mocked(stockfishEngine).analyzeWithBudget.mockResolvedValue({
      bestMove: '', evaluation: 0, isMate: false, mateIn: null, depth: 0, nodesPerSecond: 0, topLines: [],
    });
    const r = await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: OFF });
    expect(r.move).not.toBe('a7a6');
    const kinds = auditMock.mock.calls.map(([e]) => e as { kind: string; summary: string });
    expect(kinds.some((e) => e.kind === 'mission-dial-forced')).toBe(false);
    expect(kinds.find((e) => e.kind === 'mission-dial-swap')?.summary).toMatch(/no read — quiet safe move/);
  });
});

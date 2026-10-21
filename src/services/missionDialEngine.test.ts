/**
 * The "no attacks on pieces" dial, through the engine's own door
 * (`getAdaptiveMove`) — WO-MISSIONS-01.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    // The dial reads inside an exclusive hold, handed the same analyzePosition.
    holdForQuestion: vi.fn(),
    setMultiPv: vi.fn(),
    getBestMove: vi.fn(),
    restartIfUnresponsive: vi.fn().mockResolvedValue(false),
    supportsOption: vi.fn(() => true),
    initialize: vi.fn(),
    stop: vi.fn(),
  },
}));

import { getAdaptiveMove } from './coachGameEngine';
import { stockfishEngine } from './stockfishEngine';
import { plantCandidates } from '../missions/plantFreePiece';
import { LEVEL_1_DIALS } from '../missions/registry';
import { registerScorer, resetScorersForTest } from '../missions/moveScoring';

const RUY = (() => { const b = new Chess(); for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']) b.move(s); return b.fen(); })();
const DIALS = { ...LEVEL_1_DIALS, attacksOnPieces: 'off' as const };
const OFF = { dials: DIALS, studentColor: 'white' as const, plantArmed: false, pattern: null, phase: 'opening' as const, boss: null };

describe('getAdaptiveMove under the mission dials', () => {
  beforeEach(() => {
    auditMock.mockReset();
    pickBookMoveMock.mockReset();
    vi.mocked(stockfishEngine).analyzePosition.mockReset();
    vi.mocked(stockfishEngine).holdForQuestion.mockImplementation(((work: (e: unknown) => Promise<unknown>) =>
      work({ analyzePosition: vi.mocked(stockfishEngine).analyzePosition })) as never);
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
    expect((await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...OFF, dials: { ...DIALS, attacksOnPieces: 'on', plannedTrap: 'on' } } })).move).toBe('a7a6');
  });

  it('every acceptable reply attacks a piece: the least costly is played and mission-dial-forced is logged', async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'Nd4', uci: 'c6d4', candidates: [{ san: 'Nd4', uci: 'c6d4', games: 900 }] });
    // White-POV evals, Black to move: …a6 is best (+0.30), …Nd4 costs 30cp,
    // the quiet …Nf6 costs 3 pawns — outside the strength window.
    vi.mocked(stockfishEngine).analyzePosition.mockResolvedValue({
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
    vi.mocked(stockfishEngine).analyzePosition.mockResolvedValue({
      bestMove: '', evaluation: 0, isMate: false, mateIn: null, depth: 0, nodesPerSecond: 0, topLines: [],
    });
    const r = await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: OFF });
    expect(r.move).not.toBe('a7a6');
    const kinds = auditMock.mock.calls.map(([e]) => e as { kind: string; summary: string });
    expect(kinds.some((e) => e.kind === 'mission-dial-forced')).toBe(false);
    expect(kinds.find((e) => e.kind === 'mission-dial-swap')?.summary).toMatch(/no read — quiet safe move/);
  });

  it('the dial reads wide (eight lines) and resets the line count after', async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'Nd4', uci: 'c6d4', candidates: [{ san: 'Nd4', uci: 'c6d4', games: 900 }] });
    vi.mocked(stockfishEngine).analyzePosition.mockResolvedValue({
      bestMove: 'a7a6', evaluation: 30, isMate: false, mateIn: null, depth: 10, nodesPerSecond: 1,
      topLines: [{ rank: 1, evaluation: 30, moves: ['a7a6'], mate: null }, { rank: 2, evaluation: 40, moves: ['g8f6'], mate: null }],
    });
    vi.mocked(stockfishEngine).setMultiPv.mockClear();
    const r = await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: OFF });
    expect(r.move).toBe('g8f6');
    expect(vi.mocked(stockfishEngine).setMultiPv.mock.calls.map((c) => c[0])).toEqual([8, 3]);
  });
});

/** Black (the coach) to move, queens off: …Nd5, …Ng4, …Ba3 and …Bg1 each hang a piece. */
const QUIET_BLACK = (() => { const b = new Chess(); for (const s of 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nxd4 Qxd4 Qf6 Qxf6 Nxf6 f3 Bc5 Bd3'.split(' ')) b.move(s); return b.fen(); })();
const MIDDLEGAME = {
  dials: { ...LEVEL_1_DIALS, plantFreePiece: 'on' as const },
  studentColor: 'white' as const,
  plantArmed: true,
  pattern: 'free-piece' as const,
  phase: 'middlegame' as const,
  boss: null,
};
/** A read of a board after a plant: the student's capture of the piece on
 *  `square`, at `takeCp`, beside their best other move at `bestCp` (white POV). */
function readFor(square: string, takeCp: number, bestCp: number) {
  const plants = plantCandidates(QUIET_BLACK).candidates;
  return (fen: string) => {
    const p = plants.find((c) => c.fenAfter === fen);
    if (!p) return Promise.resolve({ bestMove: '', evaluation: 0, isMate: false, mateIn: null, depth: 0, nodesPerSecond: 0, topLines: [] });
    const capture = `xx${p.square}`;
    const lines = p.square === square
      ? [{ rank: 1, evaluation: takeCp, moves: [capture], mate: null }, { rank: 2, evaluation: bestCp, moves: ['h2h3'], mate: null }]
      : [{ rank: 1, evaluation: bestCp, moves: ['h2h3'], mate: null }, { rank: 2, evaluation: -200, moves: [capture], mate: null }];
    lines.sort((a, b) => b.evaluation - a.evaluation);
    return Promise.resolve({ bestMove: lines[0].moves[0], evaluation: lines[0].evaluation, isMate: false, mateIn: null, depth: 10, nodesPerSecond: 1, topLines: lines });
  };
}

describe('getAdaptiveMove plants the free piece (WO-MISSIONS-02)', () => {
  beforeEach(() => {
    auditMock.mockReset();
    pickBookMoveMock.mockReset();
    pickBookMoveMock.mockResolvedValue({ san: 'd6', uci: 'd7d6', candidates: [{ san: 'd6', uci: 'd7d6', games: 500 }] });
    vi.mocked(stockfishEngine).analyzePosition.mockReset();
    vi.mocked(stockfishEngine).setMultiPv.mockClear();
    vi.mocked(stockfishEngine).holdForQuestion.mockImplementation(((work: (e: unknown) => Promise<unknown>) =>
      work({ analyzePosition: vi.mocked(stockfishEngine).analyzePosition })) as never);
  });

  it('an armed move plays the verified gift instead of its own choice, and logs mission-plant', async () => {
    vi.mocked(stockfishEngine).analyzePosition.mockImplementation(readFor('g4', 280, 20) as never);
    const r = await getAdaptiveMove(QUIET_BLACK, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: MIDDLEGAME });
    expect(r).toMatchObject({ move: 'f6g4', source: 'mission-plant', plant: { square: 'g4' } });
    const plant = auditMock.mock.calls.map(([e]) => e as { kind: string; summary: string }).find((e) => e.kind === 'mission-plant');
    expect(plant?.summary).toMatch(/planted f6g4 — the piece on g4 is free/);
    // Four lines per read, reset after; at most three reads.
    expect(vi.mocked(stockfishEngine).setMultiPv.mock.calls.map((c) => c[0])).toEqual([4, 3]);
    expect(vi.mocked(stockfishEngine).analyzePosition.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('a POISONED plant (the engine says taking is not best) is refused: the coach plays its own move', async () => {
    // Every capture sits 2 pawns below the student's best — none is a real gift.
    vi.mocked(stockfishEngine).analyzePosition.mockImplementation(readFor('none', 0, 20) as never);
    const r = await getAdaptiveMove(QUIET_BLACK, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: MIDDLEGAME });
    expect(r.move).toBe('d7d6');
    expect(r.plant).toBeUndefined();
    expect(r.plantScan).toEqual({ 'not-best': 3 });
    expect(auditMock.mock.calls.some(([e]) => (e as { kind: string }).kind === 'mission-plant')).toBe(false);
  });

  it('not armed (or the opening card): no plant is even looked for', async () => {
    const r = await getAdaptiveMove(QUIET_BLACK, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...MIDDLEGAME, plantArmed: false } });
    expect(r.move).toBe('d7d6');
    expect(r.plantScan).toBeUndefined();
    expect(vi.mocked(stockfishEngine).setMultiPv).not.toHaveBeenCalledWith(4);
  });
});

describe('the scorer seam (WO-CAMPAIGN-MASTER)', () => {
  beforeEach(() => {
    auditMock.mockReset();
    pickBookMoveMock.mockReset();
    pickBookMoveMock.mockResolvedValue({ san: 'a6', uci: 'a7a6', candidates: [{ san: 'a6', uci: 'a7a6', games: 900 }] });
    vi.mocked(stockfishEngine).analyzePosition.mockReset();
    vi.mocked(stockfishEngine).setMultiPv.mockClear();
    vi.mocked(stockfishEngine).holdForQuestion.mockImplementation(((work: (e: unknown) => Promise<unknown>) =>
      work({ analyzePosition: vi.mocked(stockfishEngine).analyzePosition })) as never);
    // White-POV, Black to move: …a6 best, …Nf6 20 cp worse, …b5 far outside the window.
    vi.mocked(stockfishEngine).analyzePosition.mockResolvedValue({
      bestMove: 'a7a6', evaluation: 30, isMate: false, mateIn: null, depth: 10, nodesPerSecond: 1,
      topLines: [
        { rank: 1, evaluation: 30, moves: ['a7a6'], mate: null },
        { rank: 2, evaluation: 50, moves: ['g8f6'], mate: null },
        { rank: 3, evaluation: 500, moves: ['b7b5'], mate: null },
      ],
    });
  });
  afterEach(() => resetScorersForTest());

  it("an eager-trades card's scorer re-ranks inside the window and the move is logged", async () => {
    registerScorer('trades', (c) => (c.uci === 'g8f6' || c.uci === 'b7b5' ? 1 : 0));
    const r = await getAdaptiveMove(RUY, 1200, {
      bookPolicy: 'most-played', studentElo: 1200,
      missionDials: { dials: { ...LEVEL_1_DIALS, trades: 'eager' }, studentColor: 'white', plantArmed: false, pattern: null, phase: 'middlegame', boss: null },
    });
    expect(r.move).toBe('g8f6'); // liked AND inside the 80 cp window; b5 is liked but never offered
    expect(auditMock.mock.calls.map(([e]) => e as { kind: string; summary: string }).find((e) => e.kind === 'mission-scored')?.summary).toMatch(/a7a6 → g8f6/);
  });

  it("Level 1's dials weight nothing, so no read is spent and the move stands", async () => {
    registerScorer('trades', () => 1);
    const r = await getAdaptiveMove(RUY, 1200, {
      bookPolicy: 'most-played', studentElo: 1200,
      missionDials: { dials: LEVEL_1_DIALS, studentColor: 'white', plantArmed: false, pattern: null, phase: 'middlegame', boss: null },
    });
    expect(r.move).toBe('a7a6');
    expect(vi.mocked(stockfishEngine).setMultiPv).not.toHaveBeenCalled();
  });

  it("a boss preset's weights apply on top of the dials", async () => {
    registerScorer('trades', (c) => (c.uci === 'g8f6' ? 1 : 0));
    const r = await getAdaptiveMove(RUY, 1200, {
      bookPolicy: 'most-played', studentElo: 1200,
      missionDials: { dials: LEVEL_1_DIALS, studentColor: 'white', plantArmed: false, pattern: null, phase: 'middlegame', boss: { id: 'grabber', weights: { trades: 1 }, targets: [] } },
    });
    expect(r.move).toBe('g8f6');
  });

  it('the strength offset moves the level the coach plays at (the book band it reads)', async () => {
    const play = async (strengthOffset: number): Promise<unknown> => {
      pickBookMoveMock.mockClear();
      await getAdaptiveMove(RUY, 1200, {
        bookPolicy: 'most-played', studentElo: 1200,
        missionDials: { dials: { ...LEVEL_1_DIALS, strengthOffset }, studentColor: 'white', plantArmed: false, pattern: null, phase: 'opening', boss: null },
      });
      return (pickBookMoveMock.mock.calls[0]?.[1] as { ratings?: unknown } | undefined)?.ratings;
    };
    const base = await play(0);
    const stronger = await play(600);
    expect(base).toBeDefined();
    expect(stronger).not.toEqual(base);
  });
});


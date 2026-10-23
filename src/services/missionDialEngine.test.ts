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
import { LEVEL_1_DIALS } from '../missions/registry';
import { FOCUS_DIALS } from '../coach/focus/focusCard';
import { focusScore } from '../missions/scorers/focus';
import { registerScorer, resetScorersForTest } from '../missions/moveScoring';

const RUY = (() => { const b = new Chess(); for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']) b.move(s); return b.fen(); })();
const DIALS = { ...LEVEL_1_DIALS, attacksOnPieces: 'off' as const };
const OFF = { dials: DIALS, studentColor: 'white' as const, plantArmed: false, lineReply: null, pattern: null, phase: 'opening' as const, boss: null, focus: null };

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

/** Black (the coach) to move. …Kc8 is its best; …Ke8 is a natural slip that
 *  hangs nothing, but walks into a knight fork: Nc7+ forks the king and the
 *  rook on a8, the king steps, Nxa8 (every move checked with chess.js). */
const COACH = 'r2k4/8/8/3N4/8/8/8/4K3 b - - 0 1';
const AFTER_SLIP = 'r3k3/8/8/3N4/8/8/8/4K3 w - - 1 2';
const FORK_LINE = ['d5c7', 'e8d7', 'c7a8'];
const MIDDLEGAME = {
  dials: { ...LEVEL_1_DIALS, plantFreePiece: 'on' as const },
  studentColor: 'white' as const,
  plantArmed: true,
  lineReply: null,
  pattern: 'free-piece' as const,
  phase: 'middlegame' as const,
  boss: null,
  focus: null,
};
interface TestLine { rank: number; evaluation: number; moves: string[]; mate: number | null }
const line = (evaluation: number, moves: string[]): TestLine => ({ rank: 1, evaluation, moves, mate: null });
const analysis = (topLines: TestLine[]): { bestMove: string; evaluation: number; isMate: boolean; mateIn: null; depth: number; nodesPerSecond: number; topLines: TestLine[] } =>
  ({ bestMove: topLines[0]?.moves[0] ?? '', evaluation: topLines[0]?.evaluation ?? 0, isMate: false, mateIn: null, depth: 10, nodesPerSecond: 1, topLines });
/** The coach's own wide read (white's point of view: Black's …Kc8 holds 0, the
 *  slip …Ke8 is +500 for White), and the student's read after the slip. */
function reads(studentLine: string[]) {
  return (fen: string) => Promise.resolve(
    fen === COACH ? analysis([line(0, ['d8c8']), line(500, ['d8e8'])])
      : fen === AFTER_SLIP ? analysis([line(450, studentLine)])
        : analysis([]));
}

describe('getAdaptiveMove plays the earned slip (WO-MISSIONS-02, §6a)', () => {
  beforeEach(() => {
    auditMock.mockReset();
    pickBookMoveMock.mockReset();
    pickBookMoveMock.mockResolvedValue({ san: 'Kc8', uci: 'd8c8', candidates: [{ san: 'Kc8', uci: 'd8c8', games: 500 }] });
    // The real scorers registered themselves when the engine loaded; each test
    // here registers its own stand-in.
    resetScorersForTest();
    vi.mocked(stockfishEngine).analyzePosition.mockReset();
    vi.mocked(stockfishEngine).setMultiPv.mockClear();
    vi.mocked(stockfishEngine).holdForQuestion.mockImplementation(((work: (e: unknown) => Promise<unknown>) =>
      work({ analyzePosition: vi.mocked(stockfishEngine).analyzePosition })) as never);
  });

  it('an armed move plays its own natural slip — nothing hangs — and hands the line to the runner', async () => {
    vi.mocked(stockfishEngine).analyzePosition.mockImplementation(reads(FORK_LINE) as never);
    const r = await getAdaptiveMove(COACH, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: MIDDLEGAME });
    expect(r).toMatchObject({ move: 'd8e8', source: 'mission-plant', plant: { square: 'a8', line: FORK_LINE, depth: 1 } });
    const plant = auditMock.mock.calls.map(([e]) => e as { kind: string; summary: string }).find((e) => e.kind === 'mission-plant');
    expect(plant?.summary).toMatch(/slipped d8e8 — nothing hangs; a 1-move line wins the piece on a8/);
    // Ten lines for the coach's candidates, three for the student's answer, reset after.
    // The coach's read covers EVERY legal move on its board (David 2026-10-21:
    // a slip every game — a top-10 read found one in 5 of 10 gate games).
    const legal = new Chess(COACH).moves().length;
    expect(vi.mocked(stockfishEngine).setMultiPv.mock.calls.map((c) => c[0])).toEqual([legal, 3, 3]);
  });

  it('a line deeper or shallower than the dial asks is refused: the coach plays its own move', async () => {
    vi.mocked(stockfishEngine).analyzePosition.mockImplementation(reads(FORK_LINE) as never);
    const r = await getAdaptiveMove(COACH, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...MIDDLEGAME, dials: { ...MIDDLEGAME.dials, plantDepth: 2 } } });
    expect(r.move).toBe('d8c8');
    expect(r.plant).toBeUndefined();
    expect(r.plantScan).toEqual({ 'wrong-depth': 1 });
  });

  it('the student\'s other first moves within 50 cp ride along as alternates; a worse one does not', async () => {
    vi.mocked(stockfishEngine).analyzePosition.mockImplementation(((fen: string) => Promise.resolve(
      fen === COACH ? analysis([line(0, ['d8c8']), line(500, ['d8e8'])])
        : fen === AFTER_SLIP ? analysis([line(450, FORK_LINE), line(410, ['d5f6', 'e8e7']), line(300, ['e1d2'])])
          : analysis([]))) as never);
    const r = await getAdaptiveMove(COACH, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: MIDDLEGAME });
    expect(r.plant).toEqual({ square: 'a8', line: FORK_LINE, depth: 1, alts: ['d5f6'] });
  });

  it('a slip whose best answer wins nothing is no slip', async () => {
    vi.mocked(stockfishEngine).analyzePosition.mockImplementation(reads(['d5f4', 'e8d7', 'f4d5']) as never);
    const r = await getAdaptiveMove(COACH, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: MIDDLEGAME });
    expect(r.move).toBe('d8c8');
    expect(r.plantScan).toEqual({ 'no-line': 1 });
  });

  it('not armed: no slip is even looked for', async () => {
    const r = await getAdaptiveMove(COACH, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...MIDDLEGAME, plantArmed: false } });
    expect(r.move).toBe('d8c8');
    expect(r.plantScan).toBeUndefined();
    expect(vi.mocked(stockfishEngine).setMultiPv).not.toHaveBeenCalledWith(new Chess(COACH).moves().length);
  });

  it('on the line, the coach answers as the line says — no read, no choice of its own', async () => {
    const forked = 'r3k3/2N5/8/8/8/8/8/4K3 b - - 2 2';
    const r = await getAdaptiveMove(forked, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...MIDDLEGAME, plantArmed: false, lineReply: 'e8d7' } });
    expect(r).toMatchObject({ move: 'e8d7', source: 'mission-plant' });
    expect(vi.mocked(stockfishEngine).analyzePosition).not.toHaveBeenCalled();
  });

  it('an illegal line reply is ignored, never played', async () => {
    const forked = 'r3k3/2N5/8/8/8/8/8/4K3 b - - 2 2';
    pickBookMoveMock.mockResolvedValue({ san: 'Kf8', uci: 'e8f8', candidates: [{ san: 'Kf8', uci: 'e8f8', games: 500 }] });
    const r = await getAdaptiveMove(forked, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...MIDDLEGAME, plantArmed: false, lineReply: 'e8e7x' } });
    expect(r.move).not.toBe('e8e7x');
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
      missionDials: { dials: { ...LEVEL_1_DIALS, trades: 'eager' }, studentColor: 'white', plantArmed: false, lineReply: null, pattern: null, phase: 'middlegame', boss: null, focus: null },
    });
    expect(r.move).toBe('g8f6'); // liked AND inside the 80 cp window; b5 is liked but never offered
    expect(auditMock.mock.calls.map(([e]) => e as { kind: string; summary: string }).find((e) => e.kind === 'mission-scored')?.summary).toMatch(/a7a6 → g8f6/);
  });

  it("Level 1's dials weight nothing, so no read is spent and the move stands", async () => {
    registerScorer('trades', () => 1);
    const r = await getAdaptiveMove(RUY, 1200, {
      bookPolicy: 'most-played', studentElo: 1200,
      missionDials: { dials: LEVEL_1_DIALS, studentColor: 'white', plantArmed: false, lineReply: null, pattern: null, phase: 'middlegame', boss: null, focus: null },
    });
    expect(r.move).toBe('a7a6');
    expect(vi.mocked(stockfishEngine).setMultiPv).not.toHaveBeenCalled();
  });

  it("a tie never swaps the coach's own move: nothing liked, the book move stands", async () => {
    // Gate 1's Grabber: score 0 everywhere still replaced the book's …e5 with
    // the engine's …c5. The coach's move is replaced only by one liked MORE.
    pickBookMoveMock.mockResolvedValue({ san: 'h6', uci: 'h7h6', candidates: [{ san: 'h6', uci: 'h7h6', games: 900 }] });
    registerScorer('trades', () => 0);
    const r = await getAdaptiveMove(RUY, 1200, {
      bookPolicy: 'most-played', studentElo: 1200,
      missionDials: { dials: { ...LEVEL_1_DIALS, trades: 'eager' }, studentColor: 'white', plantArmed: false, lineReply: null, pattern: null, phase: 'middlegame', boss: null, focus: null },
    });
    expect(r.move).toBe('h7h6');
  });

  it("a boss preset's weights apply on top of the dials", async () => {
    registerScorer('trades', (c) => (c.uci === 'g8f6' ? 1 : 0));
    const r = await getAdaptiveMove(RUY, 1200, {
      bookPolicy: 'most-played', studentElo: 1200,
      missionDials: { dials: LEVEL_1_DIALS, studentColor: 'white', plantArmed: false, lineReply: null, pattern: null, phase: 'middlegame', boss: { id: 'grabber', weights: { trades: 1 }, targets: [] }, focus: null },
    });
    expect(r.move).toBe('g8f6');
  });

  it('the strength offset moves the level the coach plays at (the book band it reads)', async () => {
    const play = async (strengthOffset: number): Promise<unknown> => {
      pickBookMoveMock.mockClear();
      await getAdaptiveMove(RUY, 1200, {
        bookPolicy: 'most-played', studentElo: 1200,
        missionDials: { dials: { ...LEVEL_1_DIALS, strengthOffset }, studentColor: 'white', plantArmed: false, lineReply: null, pattern: null, phase: 'opening', boss: null, focus: null },
      });
      return (pickBookMoveMock.mock.calls[0]?.[1] as { ratings?: unknown } | undefined)?.ratings;
    };
    const base = await play(0);
    const stronger = await play(600);
    expect(base).toBeDefined();
    expect(stronger).not.toEqual(base);
  });
});


describe('the Learn focus punish (WO-LEARN-FOCUS-01)', () => {
  beforeEach(() => {
    auditMock.mockReset();
    pickBookMoveMock.mockReset();
    vi.mocked(stockfishEngine).analyzePosition.mockReset();
    vi.mocked(stockfishEngine).holdForQuestion.mockImplementation(((work: (e: unknown) => Promise<unknown>) =>
      work({ analyzePosition: vi.mocked(stockfishEngine).analyzePosition })) as never);
  });
  const FOCUS = { dials: LEVEL_1_DIALS, studentColor: 'white' as const, plantArmed: false, lineReply: null, pattern: null, phase: null, boss: null };

  it("a focus miss that stands is punished with the engine's best move, whatever the band chose", async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'a6', uci: 'a7a6', candidates: [{ san: 'a6', uci: 'a7a6', games: 900 }] });
    vi.mocked(stockfishEngine).analyzePosition.mockResolvedValue({ bestMove: 'g8f6', evaluation: -150, isMate: false, mateIn: null, depth: 12, topLines: [], nodesPerSecond: 0 } as never);
    const r = await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...FOCUS, focus: { id: 'tactics', rung: 0, punish: true, levels: ['beginner'], plant: null } } });
    expect(r).toMatchObject({ move: 'g8f6', source: 'focus-punish' });
    expect(auditMock.mock.calls.some(([e]) => (e as { kind: string }).kind === 'focus-punish')).toBe(true);
  });

  it('with no miss standing, the coach plays its own level', async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'a6', uci: 'a7a6', candidates: [{ san: 'a6', uci: 'a7a6', games: 900 }] });
    vi.mocked(stockfishEngine).analyzePosition.mockResolvedValue({ bestMove: 'g8f6', evaluation: 0, isMate: false, mateIn: null, depth: 10, topLines: [], nodesPerSecond: 0 } as never);
    const r = await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...FOCUS, focus: { id: 'tactics', rung: 0, punish: false, levels: ['beginner'], plant: null } } });
    expect(r.source).not.toBe('focus-punish');
    expect(r.move).toBe('a7a6');
  });

  // A STEER IS NEVER A GIFT (WO-FOCUS-TACTICS-01, the 2026-10-22 local audit:
  // …Bxe5 read 50cp on the scorer's shallow read, 375 at depth 12). The band
  // plays …Nf6; the focus scorer prefers …a6 (it hits the b5 bishop).
  const steerReads = (afterA6WhiteCp: number) => {
    const AFTER_A6 = (() => { const b = new Chess(RUY); b.move('a6'); return b.fen(); })();
    return ((fen: string) => Promise.resolve(fen === AFTER_A6
      ? { bestMove: 'b5c6', evaluation: afterA6WhiteCp, isMate: false, mateIn: null, depth: 12, nodesPerSecond: 0, topLines: [{ rank: 1, moves: ['b5c6'], evaluation: afterA6WhiteCp, mate: null }] }
      : { bestMove: 'g8f6', evaluation: 20, isMate: false, mateIn: null, depth: 10, nodesPerSecond: 0, topLines: [
        { rank: 1, moves: ['g8f6'], evaluation: 20, mate: null },
        { rank: 2, moves: ['a7a6'], evaluation: 40, mate: null },
      ] })) as never;
  };
  const steerDials = { ...FOCUS, dials: FOCUS_DIALS, focus: { id: 'tactics' as const, rung: 1 as const, punish: false, levels: ['beginner' as const], plant: null } };
  it('a steer the deeper read says hands the student two pawns is refused — the coach keeps its own move', async () => {
    resetScorersForTest();
    registerScorer('focus', focusScore);
    pickBookMoveMock.mockResolvedValue({ san: 'Nf6', uci: 'g8f6', candidates: [{ san: 'Nf6', uci: 'g8f6', games: 900 }] });
    vi.mocked(stockfishEngine).analyzePosition.mockImplementation(steerReads(400));
    const r = await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: steerDials });
    expect(r.move).toBe('g8f6');
    expect(r.focusSteered).toBeUndefined();
    const row = auditMock.mock.calls.map(([e]) => e as { kind: string; details?: string }).find((e) => e.kind === 'focus-steer');
    expect(JSON.parse(row?.details ?? '{}')).toMatchObject({ refused: 'a7a6', played: 'g8f6', deepCost: 380 });
  });
  it('twin: a steer the deeper read holds is played, and marked steered', async () => {
    resetScorersForTest();
    registerScorer('focus', focusScore);
    pickBookMoveMock.mockResolvedValue({ san: 'Nf6', uci: 'g8f6', candidates: [{ san: 'Nf6', uci: 'g8f6', games: 900 }] });
    vi.mocked(stockfishEngine).analyzePosition.mockImplementation(steerReads(30));
    const r = await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: steerDials });
    expect(r).toMatchObject({ move: 'a7a6', focusSteered: true });
  });

  // THE COACH LEAVES A CHANCE (focusPlant): asked by the runner, the coach
  // plays its slip — …Nf4 drops the knight to the f1 rook — and says so.
  it('a plant asked: the coach plays the slip the lesson reader poses, and the row says so', async () => {
    const FEN = 'r3k3/8/8/3n4/8/8/8/4KR2 b - - 0 30';
    pickBookMoveMock.mockResolvedValue(null);
    vi.mocked(stockfishEngine).analyzePosition.mockImplementation(((fen: string) => Promise.resolve(fen === FEN
      ? { bestMove: 'd5b6', evaluation: -300, isMate: false, mateIn: null, depth: 10, nodesPerSecond: 0, topLines: [
        { rank: 1, moves: ['d5b6', 'f1f7'], evaluation: -300, mate: null },
        { rank: 2, moves: ['d5f4', 'f1f4'], evaluation: 0, mate: null },
      ] }
      : { bestMove: 'f1f4', evaluation: 300, isMate: false, mateIn: null, depth: 12, nodesPerSecond: 0, topLines: [
        { rank: 1, moves: ['f1f4', 'a8a2'], evaluation: 300, mate: null },
        { rank: 2, moves: ['e1e2', 'f4d5'], evaluation: 0, mate: null },
      ] })) as never);
    const r = await getAdaptiveMove(FEN, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...FOCUS, studentColor: 'white', focus: { id: 'tactics', rung: 0, punish: false, levels: ['beginner'], plant: { tag: null, difficulty: 0, extra: false, missStreak: 0 } } } });
    expect(r).toMatchObject({ move: 'd5f4', source: 'focus-plant', focusPlanted: 'exploit' });
    const row = auditMock.mock.calls.map(([e]) => e as { kind: string; details?: string }).find((e) => e.kind === 'focus-plant');
    expect(JSON.parse(row?.details ?? '{}')).toMatchObject({ focus: 'tactics', planted: 'd5f4', seat: 'exploit', tag: 'missed-your-free-piece', rung: 0, extra: false });
  });
  it('NEGATIVE CONTROL — no plant asked: the coach keeps its knight', async () => {
    const FEN = 'r3k3/8/8/3n4/8/8/8/4KR2 b - - 0 30';
    pickBookMoveMock.mockResolvedValue(null);
    vi.mocked(stockfishEngine).analyzePosition.mockResolvedValue({ bestMove: 'd5b6', evaluation: -300, isMate: false, mateIn: null, depth: 10, nodesPerSecond: 0, topLines: [
      { rank: 1, moves: ['d5b6', 'f1f7'], evaluation: -300, mate: null },
      { rank: 2, moves: ['d5f4', 'f1f4'], evaluation: 0, mate: null },
    ] } as never);
    const r = await getAdaptiveMove(FEN, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...FOCUS, studentColor: 'white', focus: { id: 'tactics', rung: 0, punish: false, levels: ['beginner'], plant: null } } });
    expect(r.source).not.toBe('focus-plant');
    expect(r.move).not.toBe('d5f4');
    expect(auditMock.mock.calls.some(([e]) => (e as { kind: string }).kind === 'focus-plant')).toBe(false);
  });
});

describe('the same rules and the best play, through the engine door (2026-10-22)', () => {
  beforeEach(() => {
    auditMock.mockReset();
    pickBookMoveMock.mockReset();
    vi.mocked(stockfishEngine).analyzePosition.mockReset();
    vi.mocked(stockfishEngine).holdForQuestion.mockImplementation(((work: (e: unknown) => Promise<unknown>) =>
      work({ analyzePosition: vi.mocked(stockfishEngine).analyzePosition })) as never);
  });
  const ITALIAN = (() => { const b = new Chess(); for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3']) b.move(s); return b.fen(); })();
  const RULES = { dials: { ...LEVEL_1_DIALS, developRules: 'on' as const }, studentColor: 'white' as const, plantArmed: false, lineReply: null, pattern: null, phase: 'opening' as const, boss: null, focus: null };

  it("the band's …Ng4 moves a knight a second time: the coach develops a new piece instead", async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'Ng4', uci: 'f6g4', candidates: [{ san: 'Ng4', uci: 'f6g4', games: 900 }, { san: 'Bc5', uci: 'f8c5', games: 700 }] });
    const r = await getAdaptiveMove(ITALIAN, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: RULES });
    expect(r.move).toBe('f8c5');
    // Fail twin: the same rule off, the band's move stands.
    const off = await getAdaptiveMove(ITALIAN, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...RULES, dials: LEVEL_1_DIALS } });
    expect(off.move).toBe('f6g4');
  });

  it('best play: the engine\'s best move replaces the level\'s, and is logged', async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'a6', uci: 'a7a6', candidates: [{ san: 'a6', uci: 'a7a6', games: 900 }] });
    vi.mocked(stockfishEngine).analyzePosition.mockResolvedValue({ bestMove: 'g8f6', evaluation: 0, isMate: false, mateIn: null, depth: 12, topLines: [], nodesPerSecond: 0 } as never);
    const best = { ...OFF, dials: { ...LEVEL_1_DIALS, bestPlay: 'on' as const } };
    const r = await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: best });
    expect(r).toMatchObject({ move: 'g8f6', source: 'stockfish-best' });
    expect(auditMock.mock.calls.some(([e]) => (e as { kind: string }).kind === 'mission-best-play')).toBe(true);
  });

  it('best play with no read: the level\'s move stands', async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'a6', uci: 'a7a6', candidates: [{ san: 'a6', uci: 'a7a6', games: 900 }] });
    vi.mocked(stockfishEngine).analyzePosition.mockRejectedValue(new Error('no engine'));
    const best = { ...OFF, dials: { ...LEVEL_1_DIALS, bestPlay: 'on' as const } };
    expect((await getAdaptiveMove(RUY, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: best })).move).toBe('a7a6');
  });
});

describe('the coach keeps its pieces, through the engine door (2026-10-22)', () => {
  beforeEach(() => {
    auditMock.mockReset();
    pickBookMoveMock.mockReset();
    vi.mocked(stockfishEngine).analyzePosition.mockReset();
    vi.mocked(stockfishEngine).holdForQuestion.mockImplementation(((work: (e: unknown) => Promise<unknown>) =>
      work({ analyzePosition: vi.mocked(stockfishEngine).analyzePosition })) as never);
  });
  const GIFT = (() => { const b = new Chess(); for (const s of 'e4 c6 Nc3 e6 Nf3 h6 h3 Ne7 d4 d6 Bf4 d5 a3 Qb6 h4 Bd7 Bd3 h5 O-O a6 Na4 Qa7 b4 f5 exf5 b5 fxe6'.split(' ')) b.move(s); return b.fen(); })();

  it("the band's …Rh6 leaves the exchange: the coach answers the threat instead", async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'Rh6', uci: 'h8h6', candidates: [{ san: 'Rh6', uci: 'h8h6', games: 900 }, { san: 'Bxe6', uci: 'd7e6', games: 400 }] });
    const keep = { dials: LEVEL_1_DIALS, studentColor: 'white' as const, plantArmed: false, lineReply: null, pattern: null, phase: 'middlegame' as const, boss: null, focus: null };
    expect(LEVEL_1_DIALS.keepsPieces).toBe('on');
    const r = await getAdaptiveMove(GIFT, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: keep });
    expect(r.move).toBe('d7e6');
    // Fail twin: a boss that leaves its pieces loose plays the band's move.
    const loose = await getAdaptiveMove(GIFT, 1200, { bookPolicy: 'most-played', studentElo: 1200, missionDials: { ...keep, dials: { ...LEVEL_1_DIALS, keepsPieces: 'off' } } });
    expect(loose.move).toBe('h8h6');
  });
});

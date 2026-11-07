/**
 * "WHY DOES THIS WORK?" ON A TRAINER (2026-11-07). After a puzzle's solution
 * is played or shown, the question box asks about THAT line — but the box told
 * the door nothing about it, so "this" pointed nowhere and the door answered
 * with the stock line ("…Ask for the best move, the plan, or what's hanging").
 * The screen now hands its solution over (`LiveState.shownLine`), the code
 * reader reads the ask as a follow-up about it, and the line computer explains
 * it move by move on the board.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
vi.mock('../services/enginePlanContext', async (o) => ({
  ...(await o<typeof import('../services/enginePlanContext')>()),
  buildEnginePlan: vi.fn(async () => null), buildCandidateEval: vi.fn(async () => null), buildAlternativesContext: vi.fn(async () => null),
}));
import { Chess } from 'chess.js';
import { dispatchCoachTurn, setChatTurnReaderForTests, resetConversations } from './dispatchCoachTurn';
import { readTurnInCode } from './chatTurnCodeReader';
import { shownSolution } from '../services/proof';
import { STOCK_GROUNDING_FALLBACK } from './stockLine';

// Lichess puzzle 0EfEA (src/data/puzzles.json, rated 902, "fork"): the coach's
// …Qc6, then White's Ne7+ forks the king and the queen — …Kh8, Nxc6.
const PUZZLE_FEN = 'r4rk1/pbp2ppp/1p1q1n2/5N2/8/2P1N3/PPQ2PPP/R3R1K1 b - - 3 15';
const PUZZLE_MOVES = 'd6c6 f5e7 g8h8 e7c6'.split(' ');
const SOLVER_FEN = (() => { const c = new Chess(PUZZLE_FEN); c.move(PUZZLE_MOVES[0]); return c.fen(); })();
const SHOWN = shownSolution(SOLVER_FEN, PUZZLE_MOVES.slice(1));

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
  setChatTurnReaderForTests(async () => null as never);
  resetConversations();
});
afterEach(() => { setChatTurnReaderForTests(undefined); vi.restoreAllMocks(); });

const ask = (q: string, shownLine = SHOWN) => dispatchCoachTurn({
  surface: 'standalone-chat', ask: q, origin: 'typed',
  liveState: { surface: 'standalone-chat', fen: SOLVER_FEN, whoseTurn: 'white', studentColor: 'white', currentRoute: '/tactics', userJustDid: q, shownLine },
} as never, { maxToolRoundTrips: 1 });

describe('"why does this work?" after a puzzle\'s solution', () => {
  it('the shown solution is the puzzle\'s line from the solver\'s board', () => {
    expect(SHOWN?.plies.map((p) => p.san)).toEqual(['Ne7+', 'Kh8', 'Nxc6']);
  });

  it('is answered from the line the screen showed, move by move — never the stock line', async () => {
    const a = await ask('Why does this work?');
    expect(a.servedIntent).toBe('explain-last');
    expect(a.text).not.toBe(STOCK_GROUNDING_FALLBACK);
    expect(a.text).toMatch(/Ne7\+/);
    expect(a.text).toMatch(/Kh8/);
    expect(a.text).toMatch(/Nxc6/);
    expect(a.lines?.[0]).toEqual(SHOWN);
  }, 60_000);

  it.each(['why does that work', 'How does it win?', 'why is this the solution?', 'explain the solution', "what's the idea behind it?", 'So why does the combination work?'])('"%s" is read as a question about the shown line', (q) => {
    const t = readTurnInCode(q, { fen: SOLVER_FEN, studentColor: 'white', shownLine: SHOWN });
    expect(t?.kind).toBe('explain-last');
  });

  it.each(['why does this work?', 'explain the solution'])('twin: with no line on the screen, "%s" is not read as one', (q) => {
    expect(readTurnInCode(q, { fen: SOLVER_FEN, studentColor: 'white' })?.kind).not.toBe('explain-last');
  });

  it.each(["what's the best move here?", 'why is Ne7+ best?', 'what if they play Kh8?'])('twin: "%s" keeps its own reading on a solved puzzle', (q) => {
    expect(readTurnInCode(q, { fen: SOLVER_FEN, studentColor: 'white', shownLine: SHOWN })?.kind ?? null).not.toBe('explain-last');
  });
});

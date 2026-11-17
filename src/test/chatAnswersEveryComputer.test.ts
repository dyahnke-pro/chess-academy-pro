import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { answerQuestionThought, type ThoughtQuestion } from '../coach/questionThought';
import { readBoardAll, type ComputerId } from '../services/boardComputers';
import type { IntentReads } from '../services/moveIntent';
import type { AnalysisLine } from '../types';

/**
 * EVERY COMPUTER ANSWERS IN CHAT (David 2026-11-17: "make sure all computers
 * can answer questions from chat properly … UNIFIED COACH!! That way it can
 * also answer questions if asked about by a user"). A student asks "why that
 * move?" (or "why did they play that?") on the board each new computer was
 * built on, and the answer carries that computer's own point — the same fact
 * the lesson, Review and Learn read, with the engine reads the chat surface
 * hands in. The boards are the computers' own real test boards (each test
 * file names its source).
 */
const line = (evaluation: number, moves: string, rank = 1): AnalysisLine => ({ rank, evaluation, mate: null, moves: moves.split(' ') });
const reads = (before: AnalysisLine[], after: AnalysisLine[] = []): IntentReads => ({ before, passBefore: [], after, passAfter: [] });
const play = (moves: readonly string[]): string => { const c = new Chess(); for (const m of moves) c.move(m); return c.fen(); };
const uciOf = (fen: string, san: string): string => { const m = new Chess(fen).move(san); return `${m.from}${m.to}${m.promotion ?? ''}`; };
const sentences = (t: string): string[] => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 24);

interface Case {
  id: ComputerId; q: ThoughtQuestion; history: string[]; fen?: string; san: string; student: 'w' | 'b'; reads: IntentReads | null;
  /** The computer's own read context, for the expected sentence. */
  ctx: Record<string, unknown>;
}

const SCANDI = ['e4', 'd5', 'exd5', 'Qxd5'];
const ALEKHINE = ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'c4', 'Nb6', 'exd6'];
const NXD5 = 'e4 c5 c3 d5 exd5 Nf6 d4 cxd4 cxd4'.split(' ');
const CASES: Case[] = [
  { id: 'queenChased', q: 'why-best-move', history: SCANDI, san: 'Nc3', student: 'w', reads: null, ctx: { history: SCANDI } },
  { id: 'blockade', q: 'why-best-move', history: NXD5, san: 'Nxd5', student: 'b', reads: null, ctx: {} },
  { id: 'pawnMajority', q: 'why-best-move', history: ALEKHINE, san: 'cxd6', student: 'b', reads: null, ctx: { prior: { fenBefore: play(ALEKHINE.slice(0, -1)), san: 'exd6' } } },
  { id: 'stalemateTrick', q: 'why-best-move', history: [], fen: '2k5/P7/1BP5/1K6/6p1/2P5/5P2/8 b - - 0 47', san: 'g3', student: 'b', reads: null, ctx: {} },
  { id: 'intoTheirCamp', q: 'why-best-move', history: [], fen: '4rr2/p6k/1p1N3p/2p5/8/3P4/PPP4P/6RK b - - 2 28', san: 'Re2', student: 'b', reads: null, ctx: {} },
  { id: 'perpetualCheck', q: 'why-best-move', history: [], fen: '6k1/RR4pp/8/8/3q4/6PP/7K/NN6 b - - 0 1', san: 'Qf2+', student: 'b',
    reads: reads([line(0, 'd4f2 h2h1 f2f1 h1h2')], [line(0, 'h2h1 f2f1 h1h2 f1f2')]), ctx: { replies: [{ cp: 0, mate: null, moves: ['h2h1', 'f2f1', 'h1h2', 'f1f2'] }] } },
  { id: 'exchangeSacrifice', q: 'why-best-move', history: [], fen: 'r3r1k1/ppb2pp1/1npq1pp1/8/2PP2B1/1P2B1PP/P4P2/R2Q1RK1 b - - 0 17', san: 'Rxe3', student: 'b',
    reads: reads([line(-210, 'e8e3 d1d2 e3e4 c4c5 d6d4 d2d4 e4d4 c5b6', 1), line(11, 'b6d5 e3d2 d5e7 d2f4 d6d8 f4c7 d8c7 d1d2', 2), line(70, 'b6c8 f1e1 c8e7 h3h4 e7f5 g4f5 g6f5 d1f3', 3)]),
    ctx: { reads: [{ evaluation: -210, mate: null, moves: 'e8e3 d1d2 e3e4 c4c5 d6d4 d2d4 e4d4 c5b6'.split(' ') }, { evaluation: 11, mate: null, moves: 'b6d5 e3d2 d5e7 d2f4 d6d8 f4c7 d8c7 d1d2'.split(' ') }, { evaluation: 70, mate: null, moves: 'b6c8 f1e1 c8e7 h3h4 e7f5 g4f5 g6f5 d1f3'.split(' ') }] } },
  { id: 'flexibleMove', q: 'why-best-move', history: [], fen: 'rnbqk1nr/ppppppbp/6p1/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 1 3', san: 'Nc3', student: 'w',
    reads: reads([line(70, 'b1c3 d7d6', 1), line(66, 'f1e2 d7d6', 2), line(60, 'g1f3 d7d6', 3), line(58, 'h2h3 d7d6', 4), line(56, 'c2c4 d7d6', 5)]),
    ctx: { reads: [[70, 'b1c3 d7d6'], [66, 'f1e2 d7d6'], [60, 'g1f3 d7d6'], [58, 'h2h3 d7d6'], [56, 'c2c4 d7d6']].map(([e, m]) => ({ evaluation: e, mate: null, moves: String(m).split(' ') })) } },
  { id: 'fortress', q: 'why-best-move', history: [], fen: '8/p7/8/1PP1p3/4K3/2b3k1/8/8 w - - 0 49', san: 'c6', student: 'w',
    reads: reads([line(0, 'c5c6 c3a5', 1)], [line(0, 'c3a5', 1)]), ctx: { replies: [{ cp: 0, mate: null, moves: ['c3a5'] }] } },
  { id: 'minorMatchup', q: 'why-best-move', history: [], fen: 'r4rk1/p4ppp/4pn2/2P5/1pp1BP2/4B1P1/PP5P/R2R2K1 b - - 0 17', san: 'Nxe4', student: 'b', reads: null, ctx: {} },
  { id: 'windmill', q: 'why-best-move', history: [], fen: '1q3rk1/1p3pp1/2p4p/3Ppb2/1PP2Q1P/5P2/8/B4BRK b - - 0 29', san: 'exf4', student: 'b', reads: null, ctx: {} },
];

describe('every new computer answers in chat (one coach)', () => {
  for (const c of CASES) {
    it(`${c.id}: "why ${c.san}?" carries its point`, () => {
      const fenBefore = c.fen ?? play(c.history);
      const own = readBoardAll(c.id, { fenBefore, san: c.san, student: c.student, ...c.ctx } as never);
      expect(own.length, `${c.id} reads nothing on its own board`).toBeGreaterThan(0);
      const ans = answerQuestionThought(c.q, {
        fen: fenBefore, history: c.history, studentColor: c.student === 'w' ? 'white' : 'black',
        bestUci: uciOf(fenBefore, c.san), reads: c.reads, reason: null,
      });
      expect(ans, `${c.id}: chat had no answer`).not.toBeNull();
      const said = (ans?.text ?? '').toLowerCase();
      const hit = own.some((f) => [f.text, f.alsoText ?? ''].some((t) => sentences(t).some((s) => said.includes(s.toLowerCase()))));
      expect(hit, `${c.id}: answer "${ans?.text}" — the computer said "${own.map((f) => f.text).join(' | ')}"`).toBe(true);
    });
  }
});

// THE OTHER SEAT: "why did they play that?" — the same computer, said from the
// student's side of the board.
describe('the opponent\'s move is answered by the same computers', () => {
  it('queenChased: "why did they play Nc3?" says their knight hits your queen', () => {
    const history = [...SCANDI, 'Nc3'];
    const ans = answerQuestionThought('opponent-move', { fen: play(history), history, studentColor: 'black', bestUci: null, reads: null, reason: null });
    const own = readBoardAll('queenChased', { history: SCANDI, fenBefore: play(SCANDI), san: 'Nc3', student: 'b' } as never);
    expect(own.length).toBeGreaterThan(0);
    const said = (ans?.text ?? '').toLowerCase();
    expect(own.some((f) => sentences(f.text).some((x) => said.includes(x.toLowerCase()))), `answer: ${ans?.text}`).toBe(true);
  });
});

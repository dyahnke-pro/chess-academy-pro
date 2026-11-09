/**
 * THE REVERSED MATRIX (David 2026-11-06: "help answer questions"): a move
 * question is answered by the one thought a lesson says on the move — the
 * ideas the question asks for, in the thought's order. Real positions from the
 * Learn replay games, with their stored Stockfish reads.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { answerQuestionThought } from './questionThought';
import { decisiveReason } from '../services/decisiveReason';
import { captureRunOfMoves } from '../services/captureRun';
import type { AnalysisLine } from '../types';

interface Read { uci: string; cp: number; mate: number | null; pv: string[] }
const data = JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as {
  games: Array<{ id: string; studentSide: 'white' | 'black'; sans: string[]; reads: Array<{ ply: number; before: Read[]; after: Read[] }> }>;
};
const lines = (rs: Read[] = []): AnalysisLine[] => rs.map((x, i) => ({ rank: i + 1, evaluation: x.cp, mate: x.mate, moves: x.pv }) as unknown as AnalysisLine);

/** "Why is the best move best?" on the board after `k` moves of `id`. */
function whyBest(id: string, k: number): { san: string; text: string | null } {
  const g = data.games.find((x) => x.id === id)!;
  const r = g.reads.find((x) => x.ply === k + 1)!;
  const reads = { before: lines(r.before), after: lines(r.after), passBefore: [], passAfter: [] };
  const board = new Chess();
  for (const s of g.sans.slice(0, k)) board.move(s);
  const uci = r.before[0].uci;
  const san = new Chess(board.fen()).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
  const seat = board.turn() === g.studentSide[0] ? 'student' : 'opponent';
  const reason = decisiveReason({ fenBefore: board.fen(), san, reads, seat, prevCapture: captureRunOfMoves(null, g.sans.slice(0, k)), asksToSee: false, namesPreparedMove: true });
  const a = answerQuestionThought('why-best-move', { fen: board.fen(), history: g.sans.slice(0, k), studentColor: g.studentSide, bestUci: uci, reads, reason });
  return { san, text: a?.text ?? null };
}

describe('"why is it best?" — what the move does, then the other moves', () => {
  it('a close call names the move\'s job, then the other plan and its job', () => {
    const { san, text } = whyBest('colle800', 10);
    expect(san).toBe('Nbd2');
    expect(text).toMatch(/^You play Nbd2 — it develops into the game/);
    expect(text).toMatch(/The other plan is O-O, about as good: it castles your king into safety/);
    // The move's job is said once, never again inside the comparison.
    expect(text!.match(/develops into the game/g)).toHaveLength(1);
  });
  it('a real gap: what the move does, then what anything else gives up', () => {
    const { text } = whyBest('sicilian1200', 36);
    expect(text).toMatch(/^You play Qxc5/);
    expect(text).toMatch(/Anything else, like Ng5, gives up about half a point\.$/);
  });
  it('a choice the board refuses never silences the true one behind it', () => {
    // "h4 or dxc5 — both hold here" leads the choices step and is refused as
    // untrue on the board; the equal move the engine names is still said.
    const { san, text } = whyBest('colle800', 24);
    expect(san).toBe('h4');
    expect(text).toMatch(/Nh5 is about as good/);
    expect(text).not.toMatch(/both hold here/);
  });
});

describe('"why did they play that?"', () => {
  it('answers their move from their side, never the student\'s own move', () => {
    const g = data.games.find((x) => x.id === 'colle800')!;
    const board = new Chess();
    for (const s of g.sans.slice(0, 20)) board.move(s);
    const ctx = { fen: board.fen(), history: g.sans.slice(0, 20), studentColor: g.studentSide, bestUci: null, reads: null, reason: null };
    expect(answerQuestionThought('opponent-move', ctx)?.text).toMatch(/^They play b5/);
    // After the student's own move it is not their move to explain.
    const mine = new Chess(board.fen()); mine.move('Nf1');
    expect(answerQuestionThought('opponent-move', { ...ctx, fen: mine.fen(), history: [...ctx.history, 'Nf1'] })).toBeNull();
  });
  it('a board set up on its own has no last move to explain', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
    expect(answerQuestionThought('opponent-move', { fen, history: ['d4'], studentColor: 'black', bestUci: null, reads: null, reason: null })).toBeNull();
  });
});

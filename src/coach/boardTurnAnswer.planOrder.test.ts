/**
 * THE QUESTION ORDERS ITS ANSWER (the reversed matrix, 2026-11-06). On the
 * prod chat audit "what's the plan here?" opened with a habit check about a
 * pawn kick — "Their pawn on b2 looks like it can chase a piece you post
 * here…" — before the plan. The plan question asks for what cannot wait and
 * the plan; a habit check is said after them, never ahead.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { answerBoardTurn, setBoardEngineForTests } from './boardTurnAnswer';
import { QUESTION_IDEAS, askedRank } from './questionThought';
import type { ResolvedChatTurn } from './chatTurn';

// The Italian after 1.e4 e5 2.Nf3 Nc6 3.Bc4, Black to move (prod audit board).
const HISTORY = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
const ask = { kind: 'plan', referents: [], seat: 'me', topic: null } as unknown as ResolvedChatTurn;

afterEach(() => setBoardEngineForTests(null));

describe('"what\'s the plan?" says the plan first', () => {
  it('the kick habit is said after the plan, never ahead of it', async () => {
    // Stockfish 18, MultiPV 3 (white's view): …Bc5 and …Nf6 a hair apart, the
    // bishop first as on the prod read.
    setBoardEngineForTests({
      analysis: async () => ({ topLines: [
        { rank: 1, evaluation: 15, mate: null, moves: 'f8c5 e1g1 g8f6 d2d3 e8g8 c2c3 c5b6 h2h3 h7h6 f1e1 d7d6'.split(' ') },
        { rank: 2, evaluation: 22, mate: null, moves: 'g8f6 d2d3 f8c5 c2c3 e8g8 e1g1 d7d6 a2a4 a7a5 f1e1 h7h6 h2h3'.split(' ') },
        { rank: 3, evaluation: 46, mate: null, moves: 'f8e7 d2d4 e5d4 f3d4 g8f6 d4c6 b7c6 e4e5 f6d5 d1g4 e8g8'.split(' ') },
      ], evaluation: 15, isMate: false, mateIn: null, depth: 16, seldepth: 16 }),
      candidate: async () => null,
    });
    const a = await answerBoardTurn(ask, { fen: FEN, history: HISTORY, studentColor: 'black' });
    expect(a).toBeTruthy();
    expect(a).toMatch(/^(?:The plan|Here's the plan|The plan from here): bring your other knight and both bishops into the game/);
    // Still said — the question orders its read, it does not cut it.
    expect(a!.search(/looks like it can chase/)).toBeGreaterThan(a!.search(/They have a pawn break available on d4/));
  }, 60_000);
});

describe('the question table', () => {
  it('a board question puts its own ideas first and every other group after, in thought order', () => {
    expect(askedRank('plan', 'danger', 'danger')).toBe(0);
    expect(askedRank('plan', 'story', 'board')).toBeLessThan(askedRank('plan', 'concepts', 'board'));
    expect(askedRank('plan', 'habit', 'habit')).toBeGreaterThan(askedRank('plan', 'concepts', 'board'));
  });
  it('every move question names the move it is about', () => {
    for (const spec of Object.values(QUESTION_IDEAS)) expect(['best', 'their-last', 'board']).toContain(spec.move);
  });
});

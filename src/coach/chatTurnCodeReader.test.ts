import { describe, expect, it } from 'vitest';
import { readTurnInCode, tagSlots } from './chatTurnCodeReader';

// Bishop on g5 and pawn on e5 can both take the knight on f6.
const BOTH_TAKE_F6 = 'rnbqkb1r/pppp1ppp/5n2/4P1B1/8/8/PPP2PPP/RN1QKBNR w KQkq - 0 1';
// After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5: White can castle, push d3/d4, play Nc3…
const ITALIAN = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const ITALIAN_HISTORY = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];

const read = (q: string, fen = ITALIAN, history = ITALIAN_HISTORY) => readTurnInCode(q, { fen, history, studentColor: 'white' });
const moves = (q: string, fen?: string) => read(q, fen)?.referents.map((r) => (r.type === 'move' ? r.san : r.type));

describe('the sentence computer — slots', () => {
  it('fills the slots of a real question', () => {
    const s = tagSlots('Should I take with the bishop or the pond');
    expect(s).toMatchObject({ ask: 'which', action: 'capture', options: true, pieces: ['b', 'p'] });
  });
  it('a voiced move keeps its piece and joins its square', () => {
    expect(tagSlots('Why is night e 4 best?')).toMatchObject({ ask: 'why', pieces: ['n'], squares: ['e4'], judged: true });
  });
  it('past tense is a move already made', () => {
    expect(tagSlots('My knight to d5, was that a good move').past).toBe(true);
    expect(tagSlots('Is Qf3 ok?').past).toBe(false);
  });
});

describe('the sentence computer — real student questions, read on the board', () => {
  it('"Should I take with the bishop or the pond" compares the two captures', () => {
    expect(read('Should I take with the bishop or the pond', BOTH_TAKE_F6)?.kind).toBe('compare-moves');
    expect(moves('Should I take with the bishop or the pond', BOTH_TAKE_F6)).toEqual(['Bxf6', 'exf6']);
  });
  it('"Better to push the e or d pawn?" compares the two pushes', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(moves('Better to push the e or d pawn?', fen)).toEqual(['e3', 'd3']);
  });
  it('"Probably just castle here right" asks about castling now', () => {
    expect(read('Probably just castle here right')).toEqual({ kind: 'candidate-move', referents: [{ type: 'move', san: 'O-O' }], seat: 'me', topic: null });
  });
  it('"Why is night e 4 best?" is about Ne4 — not the engine\'s move — when no knight can reach e4 it is left to the model', () => {
    expect(read('Why is night e 4 best?')).toBeNull();
  });
  it('"Why is Nc3 best?" is about Nc3', () => {
    expect(moves('Why is Nc3 best?')).toEqual(['Nc3']);
  });
  it('"I\'m thinking pawn d3 so I can bring my bishop" weighs d3', () => {
    expect(moves("I'm thinking pawn d3 so i can bring my bishop")).toEqual(['d3']);
  });
  it('"Was Bc4 a good move?" judges it where it was played', () => {
    expect(read('Was Bc4 a good move?')?.kind).toBe('retrospective-move');
  });
  it('two legal moves that fit the words are not one move — left to the model', () => {
    // Both knights cannot be told apart by "move my knight".
    expect(read('should I move my knight?')).toBeNull();
  });
  it('a question with no move in it is left to the model', () => {
    expect(read('What are my weaknesses?')).toBeNull();
    expect(read("What's my plan?")).toBeNull();
  });
});

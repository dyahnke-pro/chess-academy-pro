/**
 * The hand walk of 2026-10-09 (Learn, live prod): every question here was
 * typed by hand into a real game and answered wrong. Each test holds the exact
 * position, and several wordings of the same question.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readTurnInCode } from './chatTurnCodeReader';
import { validateChatTurn } from './chatTurn';
import { theirPlanAnswer } from './boardTurnAnswer';
import { answerIsLoose } from './chatTurnAnswers';

const GAME = 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 h6 O-O d6 c3 Bb6 d4 Na5 Bb5+ c6 Be2 Nf6'.split(' ');
function at(n: number): { fen: string; history: string[] } {
  const c = new Chess();
  for (const m of GAME.slice(0, n)) c.move(m);
  return { fen: c.fen(), history: GAME.slice(0, n) };
}
const board = (n: number) => ({ ...at(n), studentColor: 'white' as const });

describe('a move the student wants to play is never read as a past move', () => {
  // Before 7.d4: the d3 pawn and the f3 knight can both reach d4.
  it.each(['should i push d4 now?', 'can I play d4?', 'should I go d4 here', 'is d4 good now?'])('%s', (q) => {
    const t = readTurnInCode(q, board(12));
    expect(t?.kind).toBe('candidate-move');
    expect(t?.referents).toEqual([{ type: 'move', san: 'd4' }]);
  });
  it('a move already made is still read as made', () => {
    expect(readTurnInCode('why did I play d4?', board(18))?.kind).toBe('retrospective-move');
  });
});

describe('two moves, one typed and one named by its square', () => {
  it.each([
    'is Bb5 check actually good or should i just retreat to d3?',
    'Bb5+ or back to d3?',
    'should I play Bb5 or retreat to d3',
  ])('%s', (q) => {
    const t = readTurnInCode(q, board(14));
    expect(t?.kind).toBe('compare-moves');
    expect(t?.referents.map((r) => (r.type === 'move' ? r.san : ''))).toEqual(['Bb5+', 'Bd3']);
  });
});

describe('their plan — the side named by colour or pronoun', () => {
  it.each([
    'what is black trying to do here?',
    "what's black up to?",
    'what does black want to do?',
    'what are they planning?',
    "what is my opponent's plan?",
  ])('%s → plan, their seat', (q) => {
    const t = readTurnInCode(q, board(18));
    expect(t?.kind).toBe('plan');
    expect(t?.seat).toBe('them');
  });
  it("my own colour is my plan", () => {
    expect(readTurnInCode("what's white's plan here?", board(18))?.seat).toBe('me');
  });
  it('a piece colour is not a side', () => {
    expect(readTurnInCode('what is the black bishop doing?', board(18))?.seat).not.toBe('them');
  });
  it('their plan names what they hit and their levers, never your pieces', () => {
    const text = theirPlanAnswer(board(18)) ?? '';
    expect(text).toContain('Their knight on f6 is after your pawn on e4, which nothing guards.');
    expect(text).not.toMatch(/\byour (?:knight|bishop) on [a-h][1-8] into the game/);
    expect(text).toMatch(/they want to/i);
  });
});

describe('can they take my pawn — the safety of the piece, on whose move', () => {
  it.each(['can they just take my e4 pawn?', 'can black take my pawn on e4?', 'can he win my e4 pawn'])('%s', (q) => {
    const t = readTurnInCode(q, board(18));
    expect(t?.kind).toBe('is-piece-loose');
  });
  it('on your own move the answer says you can still save it — never that it is won now', () => {
    const c = new Chess(at(18).fen);
    const text = answerIsLoose(c, 'e4', 'w');
    expect(text).toBe('Your pawn on e4 is loose and attacked by the knight on f6. It is your move, so you can still save it.');
  });
});

describe('the piece under fire is the one meant', () => {
  it('"the bishop" right after Bb5+ c6 is the attacked bishop on b5', () => {
    const b = board(16);
    const v = validateChatTurn({ kind: 'piece-options', referents: [{ type: 'piece', piece: 'b', square: null, seat: null }], seat: null, topic: null }, b);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.turn.referents[0]).toMatchObject({ type: 'piece', square: 'b5', seat: 'me' });
  });
});

describe('how do I defend it — every move that leaves the piece safe', () => {
  it('the e4 pawn after …Nf6: guard it or move it, each move board-checked', async () => {
    const { answerDefend } = await import('./chatTurnAnswers');
    const c = new Chess(at(18).fen);
    const text = answerDefend(c, 'e4', 'w') ?? '';
    expect(text).toMatch(/^To save your pawn on e4, /);
    // Bd3, Nbd2, Qc2 and Qd3 guard e4 (Re1 does not: the e2 bishop is in the way).
    expect(text).toBe('To save your pawn on e4, guard it with Bd3, Nbd2, Qc2 or Qd3.');
    // A move that leaves e4 en prise is never offered.
    expect(text).not.toContain('a3');
  });
  it('no piece named: the one in danger', async () => {
    const { answerDefend } = await import('./chatTurnAnswers');
    expect(answerDefend(new Chess(at(18).fen), null, 'w')).toMatch(/pawn on e4/);
  });
  it('on their move it says so', async () => {
    const { answerDefend } = await import('./chatTurnAnswers');
    expect(answerDefend(new Chess(at(17).fen), 'e4', 'w')).toMatch(/^It is their move/);
  });
});

describe('defend questions are read as saving a piece', () => {
  it.each(['how do I defend it?', 'how can I save my pawn on e4?', 'what can I do to protect it', 'how should I guard my e4 pawn'])('%s', (q) => {
    expect(readTurnInCode(q, board(18))?.kind).toBe('defend-piece');
  });
  it('king safety is not a single piece', () => {
    expect(readTurnInCode('how do I protect my king?', board(18))?.kind).not.toBe('defend-piece');
  });
});

it('a count of defenders is not a defend question', () => {
  expect(readTurnInCode('how many defend c6', board(18))?.kind).not.toBe('defend-piece');
  expect(readTurnInCode('how many pieces defend my e4 pawn?', board(18))?.kind).not.toBe('defend-piece');
});

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { sharedFactNamesStudentMove, sharedFactsForLearn } from './learnSharedFacts';
import type { ThoughtFact } from './thoughtComposer';

// The Italian after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 — White (the student) to move.
const italian = (): string => {
  const c = new Chess();
  for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']) c.move(san);
  return c.fen();
};

function fact(over: Partial<ThoughtFact>): ThoughtFact {
  return {
    id: 'x', kind: 'tactic', group: 'board', step: 'board', computer: 'desperadoAt', text: '', fen: italian(),
    squares: [], claims: [], stakes: { none: 'unstaked' }, proof: 'description', seat: 'student', namesStudentMove: false,
    thread: 'local', source: 'boardRead', idea: 'tactic', weight: 50, ...over,
  } as ThoughtFact;
}

describe('sharedFactNamesStudentMove — LEARN NAMES NO MOVE UNASKED', () => {
  const fen = italian();
  it('a piece move the student can play is named', () => {
    expect(sharedFactNamesStudentMove({ text: 'Ng5 hits f7 twice.', lines: undefined }, fen, 'w')).toBe(true);
  });
  it('a square alone names no move', () => {
    expect(sharedFactNamesStudentMove({ text: 'The d5 square is weak for them.', lines: undefined }, fen, 'w')).toBe(false);
  });
  it('a pawn push after a word that plays it is named', () => {
    expect(sharedFactNamesStudentMove({ text: 'The plan is to play d4 next.', lines: undefined }, fen, 'w')).toBe(true);
  });
  it('a move the student cannot play here is not', () => {
    expect(sharedFactNamesStudentMove({ text: 'Nd5 would be strong later.', lines: undefined }, fen, 'w')).toBe(false);
  });
  it('a line naming a later student move is named; the first ply (the move just played) is skipped', () => {
    expect(sharedFactNamesStudentMove({ text: 'It prepares the centre.', lines: [{ fen, sans: ['O-O', 'Nf6', 'd3'] }] }, fen, 'w')).toBe(true);
    expect(sharedFactNamesStudentMove({ text: 'It prepares the centre.', lines: [{ fen, sans: ['Nc3', 'Nf6'] }] }, fen, 'w')).toBe(false);
  });
});

describe('sharedFactsForLearn — one coach, nothing said twice', () => {
  const fen = italian();
  it('rides the thought lane with the fact\'s own kind', () => {
    const out = sharedFactsForLearn([fact({ text: 'Their bishop on c5 eyes f2.', kind: 'tactic' })], { fenNow: fen, student: 'w', saidComputers: new Set() });
    expect(out).toHaveLength(1);
    expect(out[0].lane).toBe('thought');
    expect(out[0].factKind).toBe('tactic');
    expect(out[0].namesStudentMove).toBe(false);
  });
  it('drops a computer Learn already said this turn, and a repeated fact', () => {
    const f = fact({ text: 'Their bishop on c5 eyes f2.' });
    expect(sharedFactsForLearn([f], { fenNow: fen, student: 'w', saidComputers: new Set(['desperadoAt']) })).toHaveLength(0);
    expect(sharedFactsForLearn([f, f], { fenNow: fen, student: 'w', saidComputers: new Set() })).toHaveLength(1);
  });
  it('marks a fact that names the student\'s next move', () => {
    const out = sharedFactsForLearn([fact({ text: 'Ng5 hits f7.' })], { fenNow: fen, student: 'w', saidComputers: new Set() });
    expect(out[0].namesStudentMove).toBe(true);
  });
});

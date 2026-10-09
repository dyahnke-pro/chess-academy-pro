import { beforeEach, describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { questionSquares, chatBoardClauses } from './chatBoardRead';
import { rememberPositionFacts, cachedPositionFacts, clearPositionFactsCache } from './positionFactsCache';
import type { PositionFactsResult } from './positionFacts';
import type { ClauseItem } from './positionFacts';

const START = new Chess().fen();
const clause = (text: string, rank: number, squares: string[]): ClauseItem =>
  ({ kind: 'tactic', rank, text, squares } as unknown as ClauseItem);
const result = (clauses: ClauseItem[], candidates: ClauseItem[]): PositionFactsResult =>
  ({ clauses, candidates } as unknown as PositionFactsResult);

beforeEach(() => clearPositionFactsCache());

describe('questionSquares — what the question points at', () => {
  it('reads a named square, spaced or not', () => {
    expect(questionSquares('what about e 4?', START, 'w')).toContain('e4');
  });
  it('reads a named piece on this board, for the right side', () => {
    const sq = questionSquares('is my knight safe?', START, 'w');
    expect(sq.sort()).toEqual(['b1', 'g1']);
    expect(questionSquares('where can their bishop go', START, 'w').sort()).toEqual(['c8', 'f8']);
  });
  it('an open question points at nothing', () => {
    expect(questionSquares("what's going on here?", START, 'w')).toEqual([]);
  });
});

describe('the position-facts cache', () => {
  it('keys on position and seat, not the move counters', () => {
    const r = result([], []);
    rememberPositionFacts(START, 'w', 'walk', r);
    const sameBoardLaterClock = START.replace(/ 0 1$/, ' 3 9');
    expect(cachedPositionFacts(sameBoardLaterClock, 'w')?.result).toBe(r);
    expect(cachedPositionFacts(START, 'b')).toBeNull();
  });
  it('is bounded', () => {
    const c = new Chess();
    const fens: string[] = [];
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O', 'a4', 'a5', 'Re1', 'h6', 'h3', 'Re8', 'Nbd2', 'Be6', 'Bb5', 'Bd7', 'Nf1', 'Nh7', 'Ng3']) {
      c.move(m); fens.push(c.fen()); rememberPositionFacts(c.fen(), 'w', 'walk', result([], []));
    }
    expect(cachedPositionFacts(fens[0], 'w')).toBeNull();
    expect(cachedPositionFacts(fens[fens.length - 1], 'w')).not.toBeNull();
  });
});

describe('chat answers from the computed facts', () => {
  const knight = clause('Your knight on g1 can come to f3.', 40, ['g1', 'f3']);
  const pawn = clause('The e-pawn wants e4.', 60, ['e2', 'e4']);
  it('a question about a piece keeps only the facts that touch it', async () => {
    rememberPositionFacts(START, 'w', 'interrupt', result([], [pawn, knight]));
    const got = await chatBoardClauses({ fen: START, studentColor: 'white', history: [], ask: 'what about my knight on g1?' });
    expect(got?.map((c) => c.text)).toEqual([knight.text]);
  });
  it('an open question reads what the door chose in the student-asked posture', async () => {
    rememberPositionFacts(START, 'w', 'walk', result([pawn], [pawn, knight]));
    const got = await chatBoardClauses({ fen: START, studentColor: 'white', history: [], ask: "what's going on?" });
    expect(got?.map((c) => c.text)).toEqual([pawn.text]);
  });
  it('a silent interrupt result is not an answer — with no engine line it says nothing', async () => {
    rememberPositionFacts(START, 'w', 'interrupt', result([], [pawn]));
    expect(await chatBoardClauses({ fen: START, studentColor: 'white', history: [], ask: "what's going on?" })).toBeNull();
  });
  it('nothing about the asked square is null, never a borrowed fact', async () => {
    rememberPositionFacts(START, 'w', 'walk', result([pawn], [pawn]));
    expect(await chatBoardClauses({ fen: START, studentColor: 'white', history: [], ask: 'what about a3?' })).toBeNull();
  });
});

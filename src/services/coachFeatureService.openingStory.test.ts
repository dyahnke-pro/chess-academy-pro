// BACKLOG §6 (David: "in review, i do want the full theory and main idea of the
// opening explained as each move is being played. like Danya does in his post
// game analysis"). The review WALK reads the same openingStory beats Learn
// reads, on the move they belong to — sized by the student's own record.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegments, STORY_PROVEN_GAMES, type ReviewMoveInput } from './coachFeatureService';
import { setOpeningIdentity } from './openingIdentity';
import { __setLocalDbForTests, type LocalDbMove } from './masterPlayLookup';
import { coldStudent, type StudentNeedContext } from './needScore';

const fixture = JSON.parse(readFileSync('src/services/__fixtures__/opening-story-masters.json', 'utf8')) as { positions: Record<string, LocalDbMove[]> };
const NAJDORF = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5'.split(' ');

function inputs(): ReviewMoveInput[] {
  const chess = new Chess();
  return NAJDORF.map((san, i) => {
    chess.move(san);
    return { ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: i % 2 === 0, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput;
  });
}
const opening = (segs: ReturnType<typeof buildReviewSegments>): string => segs.map((s) => s.narration ?? '').join(' ');

beforeAll(() => {
  setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')));
  __setLocalDbForTests({ positions: fixture.positions } as never);
});
afterAll(() => { __setLocalDbForTests(null); });

describe('review walk — the opening explained as it is played', () => {
  it('a student with no record hears the branch they chose, on the move they chose it', () => {
    const segs = buildReviewSegments(inputs(), 'black', 'Sicilian Defense: Najdorf Variation', true, 1400);
    expect(segs[9].narration ?? '').toMatch(/You chose the Najdorf: …a6 takes b5 away/);
    // Said once: the same beat never comes back on a later move.
    expect(opening(segs).match(/You chose the Najdorf/g)?.length).toBe(1);
    // The structure's cost on …e5, and the move that pays it on …Be6.
    expect(segs[11].narration ?? '').toMatch(/That's the price of …e5: no pawn of yours can cover d5 again/);
    expect(segs[13].narration ?? '').toMatch(/…Be6 pays that price: your bishop now guards d5/);
    // ONE PRODUCER FOR WHAT THE OPENING IS: no sentence twice on one move (the
    // old [opening] name line carried the identity paragraph the story says).
    segs.forEach((s) => {
      const said = (s.narration ?? '').replace(/\[[a-z-]+\] /g, '').split(/(?<=[.!?])\s+/).filter((x) => x.length > 20);
      expect(new Set(said).size).toBe(said.length);
    });
  }, 30_000);

  it('a line the student has proven (played often, never left book) keeps only what the opening is', () => {
    const proven: StudentNeedContext = { ...coldStudent(), bookDepartures: [], openingGames: STORY_PROVEN_GAMES + 3 } as StudentNeedContext;
    const segs = buildReviewSegments(inputs(), 'black', 'Sicilian Defense: Najdorf Variation', true, 1400, [], proven);
    expect(opening(segs)).not.toMatch(/You chose the Najdorf|A real crossroads|That's the price of …e5/);
  }, 30_000);
});

describe('review walk — each book move the student played, with its job', () => {
  it('the masters\' main move the student played is said with what it does (bookMoveWhy)', () => {
    const segs = buildReviewSegments(inputs(), 'black', 'Sicilian Defense: Najdorf Variation', true, 1400);
    // …Be6, the masters' main move: what it does on the board.
    expect(segs[13].narration ?? '').toMatch(/\[move-job\] The masters' main move here: it prepares d5/);
    // A bare development job restates the board and stays quiet.
    expect(segs[19].narration ?? '').not.toMatch(/\[move-job\] (?:[^:.]+: it b|B)rings your knight out\./);
    // THE POINT, NEVER THE MOVE (David: "You play the knight to b4 — redundant").
    segs.forEach((s) => { expect(s.narration ?? '').not.toMatch(/\b(?:You|They) play the\b/); });
  }, 30_000);
});

describe('review walk — one producer for what the opening is', () => {
  it('David\'s Fried Liver: the top-level game is said once on …Nf6, not twice', () => {
    const chess = new Chess();
    const line = 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5'.split(' ');
    const segs = buildReviewSegments(line.map((san, i) => {
      chess.move(san);
      return { ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: i % 2 === 0, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput;
    }), 'black', 'Italian Game: Two Knights Defense', true, 1400);
    const walk = segs.map((s) => s.narration ?? '').join(' ');
    expect(walk.match(/It has been played at the top level/g)?.length ?? 0).toBeLessThanOrEqual(1);
  }, 30_000);
});

describe('review walk — both seats, captures included (BACKLOG §6)', () => {
  it('David\'s Fried Liver: the trade, the fork, the recapture and the king walk each say their job', () => {
    const chess = new Chess();
    const line = 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Nb4'.split(' ');
    const segs = buildReviewSegments(line.map((san, i) => {
      chess.move(san);
      return { ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: i % 2 === 0, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput;
    }), 'black', 'Italian Game: Two Knights Defense', true, 1400);
    const at = (ply: number): string => segs[ply - 1].narration ?? '';
    expect(at(9)).toMatch(/\[move-job\] (?:[^:.]+: it t|T)akes your pawn on d5, and you can take back\./);
    expect(at(11)).toMatch(/\[move-job\] (?:[^:.]+: it t|T)akes on f7 and hits your queen on d8 and your rook on h8 at once\./);
    expect(at(12)).toMatch(/\[move-job\] (?:[^:.]+: it t|T)akes back on f7: you get a knight for the pawn they took\./);
    expect(at(15)).toMatch(/\[move-job\] (?:[^:.]+: it a|A)dds a third attacker on your knight on d5\./);
    expect(at(16)).toMatch(/\[move-job\] (?:[^:.]+: it a|A)dds a third guard to your knight on d5, which their bishop on c4 pins\./);
  }, 30_000);
});

describe('review walk — a move job is ranked by what the move changes', () => {
  const line = 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6'.split(' ');
  const walk = (): string[] => { const chess = new Chess(); return buildReviewSegments(line.map((san, i) => {
    chess.move(san);
    return { ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: i % 2 === 0, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput;
  }), 'black', 'Italian Game: Two Knights Defense', true, 1400).map((s) => s.narration ?? ''); };
  it('4.Ng5: a new attack outranks a guard — the knight joins the c4 bishop against f7', () => {
    expect(walk()[6]).toMatch(/\[move-job\] (?:[^:.]+: it j|J)oins their bishop on c4 against your pawn on f7\./);
  }, 30_000);
  it('7.Qf3+: a check is always said, first', () => {
    expect(walk()[12]).toMatch(/\[move-job\] (?:[^:.]+: it g|G)ives check and joins their bishop on c4 against your knight on d5\./);
  }, 30_000);
  it('7…Ke6: a king says the square it holds first, then the escape', () => {
    expect(walk()[13]).toMatch(/\[move-job\] (?:[^:.]+: it a|A)dds a second guard to your knight on d5, which their bishop on c4 pins, and takes your king out of reach of their queen on f3\./);
  }, 30_000);
});

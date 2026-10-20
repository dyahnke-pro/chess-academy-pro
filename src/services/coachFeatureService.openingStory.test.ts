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
  }, 30_000);

  it('a line the student has proven (played often, never left book) keeps only what the opening is', () => {
    const proven: StudentNeedContext = { ...coldStudent(), bookDepartures: [], openingGames: STORY_PROVEN_GAMES + 3 } as StudentNeedContext;
    const segs = buildReviewSegments(inputs(), 'black', 'Sicilian Defense: Najdorf Variation', true, 1400, [], proven);
    expect(opening(segs)).not.toMatch(/You chose the Najdorf|A real crossroads|That's the price of …e5/);
  }, 30_000);
});

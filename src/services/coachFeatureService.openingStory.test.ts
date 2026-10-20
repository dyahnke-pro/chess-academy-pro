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
    expect(segs[13].narration ?? '').toMatch(/\[move-job\] (?:[^:.]+: it p|P)repares d5/);
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
    // The pin was said with 7…Ke6's guard; 8…Nb4 says only its own guard.
    // 8…Nb4 hits c2 AND holds the pinned knight: both halves.
    expect(at(16)).toMatch(/\[move-job\] (?:[^:.]+: it a|A)ttacks their pawn on c2, and adds a third guard to your knight on d5\./);
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
    expect(walk()[13]).toMatch(/\[move-job\] (?:[^:.]+: it a|A)dds a second guard to your knight on d5, which their bishop on c4 pins, and gets your king out of the check from their queen on f3\./);
  }, 30_000);
});

describe('review walk — said when it changes, never as a formula', () => {
  it('the book standing is said when it changes, not on every book move (Najdorf)', () => {
    const walk = buildReviewSegments(inputs(), 'black', 'Sicilian Defense: Najdorf Variation', true, 1400).map((s) => s.narration ?? '').join(' ');
    const standings = walk.match(/\[move-job\] (?:The masters' main move here|The game is on the masters' main line|A less common book move|A book move here)/g) ?? [];
    expect(standings.length).toBeGreaterThan(0);
    expect(standings.length).toBeLessThanOrEqual(3);
  }, 30_000);
  it('a pin is said once; the next guard of the same pinned knight says only the guard (Fried Liver)', () => {
    const chess = new Chess();
    const line = 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Nb4'.split(' ');
    const walk = buildReviewSegments(line.map((san, i) => {
      chess.move(san);
      return { ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: i % 2 === 0, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput;
    }), 'black', 'Italian Game: Two Knights Defense', true, 1400).map((s) => s.narration ?? '');
    expect(walk.join(' ').match(/which their bishop on c4 pins/g)?.length).toBe(1);
    expect(walk[15]).toMatch(/\[move-job\] (?:[^:.]+: it a|A)ttacks their pawn on c2, and adds a third guard to your knight on d5\./);
  }, 30_000);
});

describe('review walk — the Fried Liver tape, second pass (lead 2026-10-20)', () => {
  const line = 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Nb4'.split(' ');
  const walk = (): string[] => { const chess = new Chess(); return buildReviewSegments(line.map((san, i) => {
    chess.move(san);
    return { ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: i % 2 === 0, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput;
  }), 'black', 'Italian Game: Two Knights Defense', true, 1400).map((s) => s.narration ?? ''); };
  it('2.Nf3 says its attack on e5 — the fact 2…Nc6 answers', () => {
    expect(walk()[2]).toMatch(/\[move-job\] (?:[^:.]+: it a|A)ttacks your pawn on e5\./);
  }, 30_000);
  it('the opening is named as it is identified — the Fried Liver at 6.Nxf7', () => {
    expect(walk()[10]).toMatch(/It's the Fried Liver Attack of the Two Knights Defense\./);
  }, 30_000);
});

describe('review walk — the main line is every move with a real share', () => {
  // A masters file where 1…e5 has a third of the games and 1…d5 a sliver.
  const db = (blackReply: Record<string, number>) => {
    const c = new Chess(); const k = (f: string) => f.split(' ').slice(0, 4).join(' ');
    const start = k(c.fen()); c.move('e4'); const afterE4 = k(c.fen());
    // One more book position after each reply, so the reply is not also the
    // last book move (that standing would win).
    const next: Record<string, unknown[]> = {};
    for (const r of Object.keys(blackReply)) { const d = new Chess(c.fen()); d.move(r); next[k(d.fen())] = [{ san: 'Nc3', games: 500, white: 0, draws: 0, black: 0 }]; }
    return { positions: { [start]: [{ san: 'e4', games: 1000, white: 400, draws: 300, black: 300 }], [afterE4]: Object.entries(blackReply).map(([san, games]) => ({ san, games, white: 0, draws: 0, black: 0 })), ...next } };
  };
  const walk = (reply: string): string => { const c = new Chess(); return buildReviewSegments(['e4', reply, 'Nc3'].map((san, i) => { c.move(san); return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i === 0, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; }), 'black', null, true, 1400)[1].narration ?? ''; };
  it('1…e5 with a third of the games stays on the main line — no "rare"', () => {
    __setLocalDbForTests(db({ c5: 600, e5: 300, d5: 30 }) as never);
    expect(walk('e5')).not.toMatch(/rare|less common/);
  }, 30_000);
  it('1…d5 with a sliver of the games is said to leave the main line', () => {
    __setLocalDbForTests(db({ c5: 600, e5: 300, d5: 30 }) as never);
    expect(walk('d5')).toMatch(/A rare book move — the game leaves the main line here/);
  }, 30_000);
  afterAll(() => { __setLocalDbForTests({ positions: fixture.positions } as never); });
});

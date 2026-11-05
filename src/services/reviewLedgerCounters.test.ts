// THE COUNTERS RIDE THE SEED (review noise #8, the lead 2026-10-20).
// When the deep dive's build replaces the walk mid-way, or a free-board move
// rebuilds the line, the seed says what the walk already SPOKE. The say-once
// keys were carried; the loose-piece count, the motif transfer and the
// standing refrains were not, so each could be said a second time. Since
// WO-STORY-MATRIX-01 P1-8d the seed is the walk's story itself, taken back to
// the ply walked (`storySeed`), and every counter is a ledger in it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, foldReviewRefrains, type ReviewMoveInput, type ReviewMoveSegment } from './coachFeatureService';
import { createStoryStore, storyOf, type StorySeed } from './gameStory';

const ALAPIN = 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 Nc6 Nc3 Nb6 Nf3 d6 exd6 Qxd6 Be2 Bg4 Nb5 Qd7 Bf4 Nd5 Ne5 Bxe2 Qxe2 Nxf4 Nxd7 Nxe2 Nc7+ Kxd7 Nxa8 Nexd4 Rd1 e5 a3 Bc5 b4 Nxb4 axb4 Bxb4+ Kf1 Rxa8 Rb1 a5 h4 Rc8'.split(' ');
const inputs = (): ReviewMoveInput[] => {
  const c = new Chess();
  return ALAPIN.map((san, i) => { c.move(san); return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0, classification: 'good', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; });
};
const build = (seed: StorySeed | null): ReviewMoveSegment[] =>
  buildReviewSegmentsForTests(inputs(), 'black', 'Sicilian Defense: Alapin Variation', true, 1500, [], undefined, null, new Map(), new Map(), seed);
/** A walk that had said these claims by `throughPly`. */
const seedOf = (throughPly: number, claims: string[]): StorySeed => {
  const s = createStoryStore('alapin');
  s.commit(throughPly, { claims });
  return { throughPly, checkpoint: s.serialize() };
};
const at = (segs: ReviewMoveSegment[], ply: number): string => segs.find((s) => s.ply === ply)?.narration ?? '';

describe('the loose-piece count rides the seed', () => {
  it('a loose piece of theirs the walk already named makes the next one the habit, not the bare formula', () => {
    expect(at(build(null), 22)).toMatch(/nothing guards their bishop on f4/);
    const seeded = at(build(seedOf(21, ['l:their#1'])), 22);
    expect(seeded).not.toMatch(/nothing guards their bishop on f4/);
    expect(seeded).toMatch(/that's the second time they've left a piece with no guard/);
  }, 120000);
});

describe('the motif transfer rides the seed', () => {
  it('a pin the walk spoke earlier makes a new pin "the same idea"', () => {
    expect(at(build(null), 33)).not.toMatch(/(same idea as|this idea on|the idea from) move/);
    const seeded = at(build(seedOf(21, ['m:pin@w|9|a1b2c3'])), 33);
    expect(seeded).toMatch(/(same idea as|this idea on|the idea from) move 9\b/);
  }, 120000);
});

describe('every say-once ledger rides the seed (the swap re-said "A rare book move")', () => {
  it('a standing tactic the walk already read is not read again after a swap', () => {
    expect(at(build(null), 33)).toMatch(/pins your knight on d4/);
    const seeded = at(build(seedOf(21, ['ss:rook on d1 pins knight on d4 against king on d7'])), 33);
    expect(seeded).not.toMatch(/pins your knight on d4/);
  }, 120000);
  it('the book standing is a flag in the story', () => {
    const src = readFileSync('src/services/coachFeatureService.ts', 'utf8');
    expect(src).toMatch(/if \(nextStanding\) flags\.add\(`standing=\$\{nextStanding\}`\)/);
    expect(src).toMatch(/const flags = ledger<ReviewFlag>\(REVIEW_SAID\.flag\)/);
  });
});

describe('the standing refrains ride the seed', () => {
  const seg = (ply: number, narration: string): ReviewMoveSegment => ({ ply, narration } as unknown as ReviewMoveSegment);
  const FULL = 'Here you own the open d-file.';
  it('a refrain the walk spoke in full is the callback after a swap, even when the new build lost the early mention', () => {
    const walk = [seg(3, FULL), seg(10, FULL)];
    const walkStory = createStoryStore('g');
    foldReviewRefrains(walk, walkStory, null);
    expect(walk[1].narration).toMatch(/you still own the d-file/);
    // The full form is in the story (its lesson and this instance), at the
    // ply that said it.
    const walkRf = [...walkStory.current().said].filter(([k]) => k.startsWith('rf:'));
    expect(walkRf.length).toBeGreaterThan(0);
    expect(walkRf.every(([, at]) => at === 3)).toBe(true);
    // The deeper build no longer says it at ply 3, so its own fold would say it in full at 10.
    const swapped = [seg(3, 'A quiet move.'), seg(10, FULL)];
    const seed = { throughPly: 5, checkpoint: walkStory.serialize() };
    const rebuilt = createStoryStore('g');
    rebuilt.restore(seed.checkpoint);
    foldReviewRefrains(swapped, rebuilt, seed);
    expect(swapped[1].narration).toMatch(/you still own the d-file/);
    expect(swapped[1].narration).not.toMatch(/you own the open d-file/);
    // …and the seed's past is the walk's: the rebuild's own early fold wrote nothing into it.
    expect([...storyOf(rebuilt.serialize()).said].filter(([k]) => k.startsWith('rf:'))).toEqual(walkRf);
  });
  it('a free-board move folds from the same seed (the explored-line rebuild in review)', () => {
    const src = readFileSync('src/components/Coach/CoachGameReview.tsx', 'utf8');
    const body = src.slice(src.indexOf('const narrateExploredMove'), src.indexOf('const narrateExploredMoveRef'));
    expect(body).toMatch(/exploreSeed\(walkNarration, walkPlyRef\.current, args\.history, moves\)/);
    // The seed and the line's story ride in the call; arguments after them (the
    // known-slip index) do not change what the rebuild folds from.
    expect(body).toMatch(/buildReviewSegmentsYielding\([^;]*, seed, lineStory[,)]/);
    expect(body).toMatch(/foldReviewRefrains\(segs, lineStory, seed\)/);
  });
});

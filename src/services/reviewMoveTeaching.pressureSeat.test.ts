// "Their knight trains on the bishop on f4 — pressure they have to answer" was
// said to the student whose bishop it was (David's Learn game, 2026-10-20). The
// pressure falls on the side being attacked: the student when the opponent moves.
import { describe, it, expect } from 'vitest';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';

// White bishop on f4 with no guard; Black plays …Nh5 at it.
const FEN = '4k3/pppp1ppp/5n2/8/5B2/8/PPPP1PPP/6K1 b - - 0 1';

describe('pressure is answered by the side under attack', () => {
  it("the opponent's knight hitting the student's bishop is pressure YOU have to answer", () => {
    const line = buildReviewMoveTeaching(FEN, 'Nh5', false) ?? '';
    expect(line).toMatch(/pressure you have to answer/);
    expect(line).not.toMatch(/pressure they have to answer/);
  });
  it("NEGATIVE CONTROL: the student's own knight doing it is pressure THEY have to answer", () => {
    expect(buildReviewMoveTeaching(FEN, 'Nh5', true) ?? '').toMatch(/pressure they have to answer/);
  });
});

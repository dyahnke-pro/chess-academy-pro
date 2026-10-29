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

// V7 (Learn 2026-10-29): "Their queen hits your knight on g4." / "Their bishop
// hits your rook on d8." / "Their rook hits your pawn on c4." — the bare stem
// carried no why and, rotating with one other, came back three times a game.
import { newPhraseMemory } from '../utils/phraseMemory';
// @ts-expect-error — plain .mjs audit helper, no types.
import { isWhy as isWhyAny, formulaRepeats as formulaRepeatsAny } from '../../scripts/audit-lib/why-count.mjs';

const isWhy = isWhyAny as (s: string) => boolean;
const formulaRepeats = formulaRepeatsAny as (lines: readonly string[]) => Array<{ formula: string; count: number }>;

// Black knight on h5 hits a LOOSE bishop on f4; a defended rook on d1 under a
// knight (guarded by the king) is worth more than the attacker.
const LOOSE = FEN;
const EXCHANGE = '4k3/pppp1ppp/8/3n4/8/8/PPPP1PPP/2KR4 b - - 0 1';

describe('every pressure saying carries its stake', () => {
  for (const [name, fen, san] of [['loose', LOOSE, 'Nh5'], ['exchange', EXCHANGE, 'Ne3']] as const) {
    it(`${name}: seven sayings in one game each give a why, and no formula repeats more than twice`, () => {
      const mem = newPhraseMemory();
      const lines = Array.from({ length: 7 }, () => buildReviewMoveTeaching(fen, san, false, mem) ?? '');
      for (const l of lines) expect(l).toMatch(name === 'loose' ? /nothing guards|has no guard|hangs/ : /worth more than|wins material/);
      expect(lines.filter((l) => !isWhy(l))).toEqual([]);
      expect(formulaRepeats(lines)).toEqual([]);
    });
  }
});

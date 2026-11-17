import { describe, it, expect } from 'vitest';
import { varyRepeatedStemsForTests } from './coachFeatureService';
import type { ReviewMoveSegment } from './coachFeatureService';
// @ts-expect-error — plain .mjs audit helper, no types.
import { formulaRepeats } from '../../scripts/audit-lib/why-count.mjs';

// The prod Review audit of 2026-11-17 failed "no reason formula said more than
// twice a game" on three shapes, each a real fact on a different move. Every
// fact must stay, said in a shape the game has not worn out.
function seg(ply: number, narration: string): ReviewMoveSegment {
  return { ply, narration } as unknown as ReviewMoveSegment;
}

describe('Review stem variety: the square question, the grade and the pawn damage', () => {
  it('no shape is said more than twice, and every fact survives', () => {
    const segs = [
      seg(10, 'Why that square for your bishop? On d3 it would block your d-pawn.'),
      seg(14, 'Why that square for their knight? On c6 it would block their light-squared bishop.'),
      seg(18, 'Why that square for your knight? On e5 it would hang.'),
      seg(24, 'Why that square for their knight? On g4 it would be kicked by your h-pawn.'),
      seg(20, 'Your Rab1 was an inaccuracy, costing about a point. Qd3 was the better move.'),
      seg(26, 'Your Nf3 was an inaccuracy, costing about a point. Bd2 was stronger.'),
      seg(30, 'Your g4 was an inaccuracy, costing about a point. h3 was stronger.'),
      seg(32, 'You take on d5. It also leaves them with an isolated pawn on the d-file.'),
      seg(36, 'You take on e4. It also leaves them with an isolated pawn on the e-file.'),
      seg(40, 'You take on c5. It also leaves them with an isolated pawn on the c-file.'),
    ];
    varyRepeatedStemsForTests(segs);
    const lines = segs.map((s) => s.narration ?? '');
    expect((formulaRepeats as (l: string[]) => unknown[])(lines)).toEqual([]);
    // The facts are all still there: the squares, the moves, the costs, the files.
    for (const want of ['d3', 'c6', 'e5', 'g4', 'Rab1', 'Nf3', 'about a point', 'd-', 'e-', 'c-']) {
      expect(lines.join(' ')).toContain(want);
    }
    expect(lines.filter((l) => /about a point/.test(l))).toHaveLength(3);
  });
});

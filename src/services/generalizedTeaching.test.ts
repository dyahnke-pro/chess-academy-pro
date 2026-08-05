// Every origin must state what it is before a student hears it.
//
// `generalizedTeaching` is the SPOKEN counterpart to `teachingFactLine`: the
// facts package can afford a header sentence, narration cannot ("Teaching from
// a DIFFERENT position with the same pawn structure —" is absurd out loud). The
// honesty requirement is identical; only the register changes.
//
// This exists because `recent-path` was missing from the union when the helper
// was first written, so a switch with no default would have returned undefined
// and spoken "undefined" mid-game.
import { describe, it, expect } from 'vitest';
import { generalizedTeaching } from './danyaTeachingService';
import type { TeachingOrigin, TransitionOrigin } from './danyaTeachingService';

const ALL: Array<TeachingOrigin | TransitionOrigin> = [
  'position', 'recent-path', 'opening-family', 'structure', 'concept',
];

describe('spoken framing for a borrowed note', () => {
  it('returns real prose for every origin, never undefined', () => {
    for (const origin of ALL) {
      const out = generalizedTeaching(origin, 'the rook belongs behind the passed pawn.');
      expect(out, origin).toBeTruthy();
      expect(out, origin).not.toContain('undefined');
      expect(out, origin).toContain('the rook belongs behind the passed pawn.');
    }
  });

  it('speaks a position-taught note bare, with no frame', () => {
    // It IS about this board, so framing it as an analogy would understate it.
    expect(generalizedTeaching('position', 'Nd5 is the outpost.')).toBe('Nd5 is the outpost.');
  });

  it('frames every borrowed origin as a generalization', () => {
    // The load-bearing property: a note not authored here must never arrive as
    // a bare assertion about this board.
    for (const origin of ALL.filter((o) => o !== 'position')) {
      const out = generalizedTeaching(origin, 'trade into the pawn ending.');
      expect(out, origin).not.toBe('trade into the pawn ending.');
      expect(out.length, origin).toBeGreaterThan('trade into the pawn ending.'.length);
    }
  });
});

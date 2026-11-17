import { describe, expect, it } from 'vitest';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { levelTags } from '../data/tacticMotifs';
import { beginnerPrior, beginnerVerdict } from './beginnerRegister';
import { NEVER_POSED, type HoldRecord } from './holdRate';

function hold(held: number, missed: number): HoldRecord {
  return { posed: held + missed, held, heldWeight: held, missed, rate: held / (held + missed) };
}
/** Every Beginner tag at the same hold. */
function basics(h: HoldRecord): Map<MisconceptionTagId, HoldRecord> {
  return new Map(levelTags('beginner').map((t) => [t, h] as const));
}

describe('the beginner register — the record decides, the rating only before it can', () => {
  it('a 1500-rated student who keeps missing the one-move tactics is taught as a beginner', () => {
    // The old rule read the rating: 1500 is past 1000, so no beginner register.
    const v = beginnerVerdict(basics(hold(3, 7)), beginnerPrior({ currentRating: 1500 }));
    expect(v).toMatchObject({ beginner: true, source: 'record' });
  });

  it('a 600-rated student whose record holds the Beginner tactics is past it', () => {
    // The old rule kept a self-reported beginner below 1000 in the register forever.
    const v = beginnerVerdict(basics(hold(19, 1)), beginnerPrior({ skillBand: 'beginner', currentRating: 600 }));
    expect(v).toMatchObject({ beginner: false, source: 'record' });
  });

  it('one red Beginner motif keeps the register on, as it keeps the next level shut', () => {
    const holds = basics(hold(20, 0));
    holds.set(levelTags('beginner')[0], hold(2, 8));
    expect(beginnerVerdict(holds, false).beginner).toBe(true);
  });

  it('below 8 posed the record cannot say, and the prior answers', () => {
    const thin = new Map<MisconceptionTagId, HoldRecord>([[levelTags('beginner')[0], hold(5, 0)]]);
    expect(beginnerVerdict(thin, true)).toMatchObject({ beginner: true, source: 'prior', posed: 5 });
    expect(beginnerVerdict(new Map([[levelTags('beginner')[0], NEVER_POSED]]), false)).toMatchObject({ beginner: false, source: 'prior' });
  });

  it('the prior: what they told the first-run screen, else the measured rating; an empty record teaches', () => {
    expect(beginnerPrior(null)).toBe(true);
    expect(beginnerPrior({ currentRating: 400 })).toBe(true);
    expect(beginnerPrior({ skillBand: 'skipped', currentRating: 400 })).toBe(true);
    expect(beginnerPrior({ skillBand: 'newcomer', currentRating: 600 })).toBe(true);
    expect(beginnerPrior({ skillBand: 'beginner', currentRating: 1000 })).toBe(false);
    expect(beginnerPrior({ skillBand: 'intermediate', currentRating: 900 })).toBe(false);
    expect(beginnerPrior({ skillBand: 'advanced', currentRating: 900 })).toBe(false);
  });
});

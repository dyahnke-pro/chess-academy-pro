import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  computeGemCrush,
  computeWatchGemAside,
  buildReviewGemSay,
} from './gemCrushLines';
import { getPunishGemsForOpening, isSurfaceableGem } from '../data/lessons/punishGems';

function firstGem(openingId: string) {
  return getPunishGemsForOpening(openingId).filter(isSurfaceableGem)[0] ?? null;
}

describe('computeGemCrush (shared core)', () => {
  it('returns null off-spine / unknown opening / never throws', () => {
    expect(computeGemCrush(null, ['e4'])).toBeNull();
    expect(computeGemCrush('caro-kann', [])).toBeNull();
    expect(computeGemCrush('caro-kann', ['e4'])).toBeNull();
    expect(computeGemCrush('not-real', ['e4', 'e5'])).toBeNull();
  });

  it('finds the gem by spine ALONE — no openingId needed (the Watch wiring path)', () => {
    const gem = firstGem('caro-kann');
    if (!gem) return;
    const bySpine = computeGemCrush(null, gem.lineMoves.split(/\s+/));
    const byId = computeGemCrush('caro-kann', gem.lineMoves.split(/\s+/));
    expect(bySpine).toBeTruthy();
    expect(bySpine!.gemId).toBe(byId!.gemId);
  });

  it('computes crush facts + two arrows on the STATIC board (real data)', () => {
    const gem = firstGem('caro-kann');
    if (!gem) return;
    const crush = computeGemCrush('caro-kann', gem.lineMoves.split(/\s+/));
    expect(crush).toBeTruthy();
    expect(crush!.inaccuracy).toBe(gem.inaccuracy);
    expect(crush!.punish).toBe(gem.punish);
    expect(crush!.arrows).toHaveLength(2);
    expect(crush!.arrows[0].color).toBe('red');
    expect(crush!.arrows[1].color).toBe('green');
    expect(['white', 'black']).toContain(crush!.studentSide);
    expect(crush!.opponentSide).not.toBe(crush!.studentSide);
    // both arrow origins are real pieces on the static board
    for (const a of crush!.arrows) {
      expect(new Chess(crush!.staticFen).get(a.from as never)).toBeTruthy();
    }
  });
});

describe('Watch voicing (present tense)', () => {
  it('reads as a live demo line', () => {
    const gem = firstGem('caro-kann');
    if (!gem) return;
    const aside = computeWatchGemAside('caro-kann', gem.lineMoves.split(/\s+/));
    expect(aside!.say).toMatch(/^If (White|Black) tries /);
    expect(aside!.say).toContain('crushes with');
    expect(aside!.say).toContain(gem.punish.replace(/[!?]+$/g, ''));
  });
});

describe('Review voicing (retrospective)', () => {
  it('frames around what actually happened in the user game — never present-tense demo', () => {
    const gem = firstGem('caro-kann');
    if (!gem) return;
    const crush = computeGemCrush('caro-kann', gem.lineMoves.split(/\s+/))!;
    const missed = buildReviewGemSay(crush, { opponentPlayedInaccuracy: true, studentPlayedPunish: false });
    const found = buildReviewGemSay(crush, { opponentPlayedInaccuracy: true, studentPlayedPunish: true });
    const avoided = buildReviewGemSay(crush, { opponentPlayedInaccuracy: false });
    // retrospective, past tense; never the Watch "If X tries" demo opener
    expect(missed).toContain('played');
    expect(missed).toContain('the crush was');
    expect(missed).not.toMatch(/^If /);
    expect(found).toMatch(/you punished it correctly|Well spotted/);
    expect(avoided).toContain('avoided');
    for (const s of [missed, found, avoided]) expect(s).not.toMatch(/^If /);
  });
});

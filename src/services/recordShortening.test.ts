// THE ONE SHORTENER (David 2026-11-21: "Unify the shortener"). Every door
// reads the student's record the same way: the skill, else the teaching layer
// of the fact's kind. These fail on the old doors — Learn shortened by skill or
// lane tag only, so a lane with neither (the tempo count, 65 of 90 lanes)
// spoke in full to a student whose whole layer was proven.
import { describe, it, expect } from 'vitest';
import { recordLevels, shortenLevel, withLayers, layerKey } from './recordShortening';
import { fadeWhenGreen } from './learnTurnDoor';
import type { LayerStandings } from './teachingLayers';

const PRINCIPLE_GREEN: LayerStandings = { safety: 'grey', principle: 'green', plan: 'grey' };
const TEMPO = "That's their knight's third move already, and you have three minor pieces out to their two — every extra move with one piece is a move you get for free.";

describe('the one shortener', () => {
  it('a fact with no skill shortens by its kind\'s layer', () => {
    const levels = recordLevels(new Map(), PRINCIPLE_GREEN);
    expect(levels.get(layerKey('principle'))).toBe('silent');
    expect(shortenLevel(levels, null, 'opp-dev')).toBe('silent');
    // A layer not proven adds nothing.
    expect(shortenLevel(recordLevels(new Map(), { safety: 'red', principle: 'grey', plan: 'grey' }), null, 'opp-dev')).toBeNull();
  });

  it('the skill decides first', () => {
    const levels = withLayers(new Map([['bad-trade', 'short' as const]]), PRINCIPLE_GREEN);
    expect(shortenLevel(levels, 'bad-trade', 'opp-dev')).toBe('short');
  });

  it('a name never fades by its layer', () => {
    expect(shortenLevel(recordLevels(new Map(), PRINCIPLE_GREEN), null, 'opening')).toBeNull();
  });

  it('Learn: a lane with no tag goes quiet when its layer is proven', () => {
    expect(fadeWhenGreen('tempo', TEMPO, recordLevels(new Map(), PRINCIPLE_GREEN), undefined, 'opp-dev')).toBe('');
    expect(fadeWhenGreen('tempo', TEMPO, new Map(), undefined, 'opp-dev')).toBe(TEMPO);
  });
});

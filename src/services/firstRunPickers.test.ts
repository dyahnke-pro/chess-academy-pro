import { describe, it, expect } from 'vitest';
import {
  FIRST_RUN_OPENER, FIRST_RUN_OPENINGS, FIRST_RUN_NUGGETS, firstRunFollowUp, matchFirstRunChoice, nextFirstRunNugget,
} from './firstRunPickers';
import { resolveOpeningEntry } from './openingDetectionService';
import { resolvePlayName } from '../coach/ask/playName';

describe('first-run pickers', () => {
  it('the opener voices three choices and offers them all as pickers', () => {
    expect(FIRST_RUN_OPENER.chips.slice(0, 3).map(matchFirstRunChoice)).toEqual(['watch', 'play', 'just-play']);
    expect(FIRST_RUN_OPENER.chips.length).toBeGreaterThan(3);
  });

  it('every offered opening resolves through the resolvers the coach uses', () => {
    for (const name of FIRST_RUN_OPENINGS) {
      expect(resolveOpeningEntry(name), name).not.toBeNull();
      expect(resolvePlayName(name).kind, name).toBe('resolved');
    }
  });

  it('watch and play ask which opening; just play hands over the board', () => {
    expect(firstRunFollowUp('watch').chips.every((c) => c.startsWith('Teach me the '))).toBe(true);
    expect(firstRunFollowUp('play').chips.every((c) => c.startsWith('Play the '))).toBe(true);
    expect(firstRunFollowUp('just-play').chips).toEqual([]);
  });

  it('matches typed forms, not unrelated text', () => {
    expect(matchFirstRunChoice('watch an opening.')).toBe('watch');
    expect(matchFirstRunChoice("let's just play")).toBe('just-play');
    expect(matchFirstRunChoice('play the Italian Game')).toBeNull();
  });

  it('a nugget is offered on a nugget move, once each', () => {
    expect(nextFirstRunNugget(2, [])).toBeNull();
    expect(nextFirstRunNugget(3, [])).toBe(FIRST_RUN_NUGGETS[0]);
    expect(nextFirstRunNugget(6, [FIRST_RUN_NUGGETS[0]])).toBe(FIRST_RUN_NUGGETS[1]);
    expect(nextFirstRunNugget(9, [...FIRST_RUN_NUGGETS])).toBeNull();
  });
});

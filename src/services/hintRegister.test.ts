// The dial has to move on the student's play, and it has to hold still.
//
// Those two are in tension and both are the requirement: David asked for the
// register to follow "the amount of times the user finds the right move", but a
// register that answers every move is a coach whose voice changes mid-game for
// no reason the student can perceive. So the tests pin BOTH — it moves on a
// clear run, and it does not move on a mixed one.
import { describe, it, expect } from 'vitest';
import {
  openingRegister, startDial, recordAttempt, hintPlyGap, hintIsDue, scaleGap,
  packageForRegister, readsForRegister, WINDOW,
} from './hintRegister';

const FOUND = 0;     // cpLoss 0 — the engine's own move
const MISSED = 300;  // a blunder by any band

const play = (rating: number | null, losses: number[]) =>
  losses.reduce((d, cp) => recordAttempt(d, cp), startDial(rating));

describe('where the dial opens', () => {
  it('follows the rating bands the slip detector already uses', () => {
    expect(openingRegister(800)).toBe('obvious');
    expect(openingRegister(1200)).toBe('moderate');
    expect(openingRegister(2400)).toBe('subtle');
  });

  it('treats an unknown rating as the middle, not as a beginner', () => {
    // Guessing "beginner" for a player we know nothing about is the more
    // damaging error: it hands a strong player the answer on their first move.
    expect(openingRegister(null)).toBe('moderate');
    expect(openingRegister(undefined)).toBe('moderate');
  });
});

describe('the dial follows the found-the-move rate', () => {
  it('backs off when the student is finding them', () => {
    expect(play(1200, [FOUND, FOUND, FOUND]).register).toBe('subtle');
  });

  it('spells it out when the student is missing them', () => {
    expect(play(1200, [MISSED, MISSED, MISSED]).register).toBe('obvious');
  });

  it('overrides the rating — a 2400 who has stopped finding moves gets help', () => {
    // The whole point of preferring the live read: the profile says this player
    // needs nothing spelled out, and the last few moves say otherwise. One
    // notch per move, so a genuinely bad run walks all the way down rather
    // than stopping politely at the rating's floor.
    expect(play(2400, [MISSED, MISSED, MISSED]).register).toBe('moderate');
    expect(play(2400, [MISSED, MISSED, MISSED, MISSED]).register).toBe('obvious');
  });

  it('moves one notch at a time, never end to end', () => {
    // Three good moves earns some room, not a jump from spelled-out to cryptic.
    expect(play(800, [FOUND, FOUND, FOUND]).register).toBe('moderate');
  });
});

describe('the dial holds still when it should', () => {
  it('ignores the first couple of moves', () => {
    // Two data points is an opening line, not a read on the player.
    expect(play(1200, [MISSED, MISSED]).register).toBe('moderate');
  });

  it('stays put on a mixed run — the dead band', () => {
    // 3 of 6 = 0.5, inside the band. A coach that re-registers here is
    // reacting to noise.
    const dial = play(1200, [FOUND, MISSED, FOUND, MISSED, FOUND, MISSED]);
    expect(dial.register).toBe('moderate');
  });

  it('does not flip back and forth around the boundary', () => {
    // Walk a realistic alternating game and assert the register never changes
    // twice in opposite directions in consecutive moves — the "broken, not
    // adaptive" failure this hysteresis exists to prevent.
    const losses = [FOUND, MISSED, FOUND, FOUND, MISSED, FOUND, MISSED, MISSED, FOUND, MISSED];
    let dial = startDial(1200);
    const seen: string[] = [];
    for (const cp of losses) {
      dial = recordAttempt(dial, cp);
      seen.push(dial.register);
    }
    for (let i = 2; i < seen.length; i += 1) {
      const flipped = seen[i] !== seen[i - 1] && seen[i - 1] !== seen[i - 2] && seen[i] === seen[i - 2];
      expect(flipped, `register oscillated at move ${i + 1}: ${seen.join(' → ')}`).toBe(false);
    }
  });

  it('forgets moves older than the window', () => {
    // A collapse in the opening must not keep the coach loud for the rest of
    // the game once the student has recovered.
    const early = Array.from({ length: WINDOW }, () => MISSED);
    const recovered = Array.from({ length: WINDOW }, () => FOUND);
    const dial = play(1200, [...early, ...recovered]);
    expect(dial.recent.every(Boolean)).toBe(true);
    expect(dial.register).not.toBe('obvious');
  });

  it('keeps only the window', () => {
    const dial = play(1200, Array.from({ length: WINDOW * 3 }, () => FOUND));
    expect(dial.recent).toHaveLength(WINDOW);
  });
});

describe('frequency', () => {
  it('is the inverse of subtlety — weaker player hears more', () => {
    expect(hintPlyGap('obvious')).toBeLessThan(hintPlyGap('moderate'));
    expect(hintPlyGap('moderate')).toBeLessThan(hintPlyGap('subtle'));
  });

  it('holds a hint back until its gap has passed', () => {
    expect(hintIsDue('subtle', 10, 8)).toBe(false);
    expect(hintIsDue('obvious', 10, 8)).toBe(true);
    expect(hintIsDue('subtle', 16, 8)).toBe(true);
  });

  it('lets the first hint of a game through', () => {
    expect(hintIsDue('subtle', 0, -Infinity)).toBe(true);
  });

  it('scales an existing beat\'s cooldown without inverting it', () => {
    // Learn's beats carry gaps tuned against real games (think-aloud 6,
    // priority-first 10). Scaling must keep that ratio — the pattern breathes,
    // it does not get reshuffled.
    expect(scaleGap(6, 'obvious')).toBeLessThan(scaleGap(6, 'moderate'));
    expect(scaleGap(6, 'moderate')).toBeLessThan(scaleGap(6, 'subtle'));
    for (const r of ['obvious', 'moderate', 'subtle'] as const) {
      expect(scaleGap(6, r)).toBeLessThan(scaleGap(10, r));
    }
  });

  it('never scales a cooldown down to per-move chatter', () => {
    expect(scaleGap(1, 'obvious')).toBeGreaterThanOrEqual(1);
    expect(scaleGap(0, 'obvious')).toBeGreaterThanOrEqual(1);
  });
});

describe('near-best is the found/missed line, not a second opinion', () => {
  it('counts a 20cp shed as found and a 21cp shed as missed', () => {
    // Pinned so the boundary can only move by changing GOOD_MOVE_MAX_CPLOSS in
    // one place — the dial must never grow its own definition of a good move.
    expect(play(1200, [20, 20, 20]).register).toBe('subtle');
    expect(play(1200, [21, 21, 21]).register).toBe('obvious');
  });
});

describe('subtlety is WHICH FACTS are handed over, not how they are worded', () => {
  // The first version of this appended "be subtle" to the prompt and let the
  // model decide. That is the thing G0 names as the disease: the LLM still
  // deciding, with a validator bolted on after. The only assertion available
  // was that the prompt contained the word "subtle" — which proves nothing
  // about what the student hears.
  //
  // Now the register picks the TIERS. A subtle hint cannot mention the stakes
  // because the stakes were never in the package, so there is nothing to
  // validate and nothing to strip.
  const PKG = {
    anchor: 'PRIORITY FIRST: the pawn on d5 is isolated.',
    detail: 'Frame it as "our priority is the d5 pawn".',
    stakes: 'A pawn like that cannot run, so every piece aimed at it works for free.',
    withhold: 'Do NOT name the move.',
  };

  it('hands over strictly more as the register gets plainer', () => {
    const subtle = packageForRegister(PKG, 'subtle');
    const moderate = packageForRegister(PKG, 'moderate');
    const obvious = packageForRegister(PKG, 'obvious');
    expect(subtle.length).toBeLessThan(moderate.length);
    expect(moderate.length).toBeLessThan(obvious.length);
  });

  it('OMITS the louder tiers rather than asking for restraint', () => {
    // The load-bearing assertion of the whole rebuild: the fact is ABSENT, not
    // present-with-an-instruction-to-downplay-it.
    expect(packageForRegister(PKG, 'subtle')).not.toContain(PKG.stakes);
    expect(packageForRegister(PKG, 'subtle')).not.toContain(PKG.detail);
    expect(packageForRegister(PKG, 'moderate')).not.toContain(PKG.stakes);
    expect(packageForRegister(PKG, 'obvious')).toContain(PKG.stakes);
  });

  it('speaks the anchor at every register', () => {
    for (const r of ['obvious', 'moderate', 'subtle'] as const) {
      expect(packageForRegister(PKG, r)).toContain(PKG.anchor);
    }
  });

  it('carries the withhold at every register — the contract does not relax', () => {
    // Plain means a shorter walk to the answer, never being handed it.
    for (const r of ['obvious', 'moderate', 'subtle'] as const) {
      expect(packageForRegister(PKG, r)).toContain('Do NOT name the move.');
    }
  });

  it('survives a beat that only has an anchor', () => {
    expect(packageForRegister({ anchor: 'A.' }, 'obvious')).toBe('A.');
  });

  it('weighs fewer reads when the deliberation should be subtle', () => {
    expect(readsForRegister('subtle')).toBeLessThan(readsForRegister('moderate'));
    expect(readsForRegister('moderate')).toBeLessThan(readsForRegister('obvious'));
    expect(readsForRegister('subtle')).toBeGreaterThanOrEqual(1);
  });
});

describe('ADAPTIVE end to end: the package follows the student, not the profile', () => {
  const PKG = {
    anchor: 'The e5 square is the one this position turns on.',
    detail: 'My knight is heading there.',
    stakes: 'And nothing of yours is watching it.',
  };

  it('a student who starts missing hears more of the same fact', () => {
    // One player, one position, one computed fact. What changes is the student.
    let dial = startDial(1200);
    const before = packageForRegister(PKG, dial.register);

    for (const cp of [MISSED, MISSED, MISSED]) dial = recordAttempt(dial, cp);
    const afterMissing = packageForRegister(PKG, dial.register);

    expect(afterMissing.length).toBeGreaterThan(before.length);
    expect(afterMissing).toContain(PKG.stakes);
  });

  it('…and then hears less of it once they recover', () => {
    let dial = startDial(1200);
    for (const cp of [MISSED, MISSED, MISSED]) dial = recordAttempt(dial, cp);
    const loud = packageForRegister(PKG, dial.register);

    // A full window of found moves — enough to flush the bad run out.
    for (let i = 0; i < WINDOW + 2; i += 1) dial = recordAttempt(dial, FOUND);
    const quiet = packageForRegister(PKG, dial.register);

    expect(quiet.length).toBeLessThan(loud.length);
    expect(quiet).toContain(PKG.anchor); // the fact never leaves
  });

  it('the frequency moves with it, in the same direction', () => {
    let dial = startDial(1200);
    for (const cp of [MISSED, MISSED, MISSED]) dial = recordAttempt(dial, cp);
    const loudGap = scaleGap(6, dial.register);
    for (let i = 0; i < WINDOW + 2; i += 1) dial = recordAttempt(dial, FOUND);
    expect(scaleGap(6, dial.register)).toBeGreaterThan(loudGap);
  });
});

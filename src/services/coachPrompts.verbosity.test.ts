import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getVerbosityInstruction } from './coachPrompts';
import type { CoachVerbosity } from '../types';

// ONE DIAL, ONE BLOCK (2026-09-17).
//
// The legacy coachApi path composed TWO length rules into one system prompt: a
// block from `getVerbosityInstruction(coachVerbosity)` and a second from
// `coachResponseLength`. `coachVerbosity`'s Settings row had been removed and
// nothing writes it, so the first was pinned to 'unlimited' for every user —
// "walk through the move, both sides' plans, alternatives... no length cap" —
// while the second carried the student's actual choice. A student on Minimal
// got "at most 8 words, no multi-sentence responses" AND "no length cap" in the
// same prompt. G5: the setting is RESPECTED, not hinted at.
describe('the verbosity block', () => {
  const ALL: CoachVerbosity[] = ['none', 'fast', 'medium', 'slow', 'unlimited'];

  it('gives the capped tiers a NUMBER, not a mood', () => {
    // G5, from a production audit: the brain shipped 497 characters on "brief"
    // while the rule was soft phrasing. A tier that caps must say how much.
    expect(getVerbosityInstruction('fast')).toMatch(/\b8 words\b/);
    expect(getVerbosityInstruction('medium')).toMatch(/\b15 words\b/);
    // The uncapped tiers must NOT invent a number.
    expect(getVerbosityInstruction('unlimited')).toMatch(/no length cap|Length follows content/i);
  });

  it('every tier still carries the no-scaffolding rule', () => {
    for (const v of ALL) {
      if (v === 'none') { expect(getVerbosityInstruction(v)).toBe(''); continue; }
      expect(getVerbosityInstruction(v), `${v} lost NO_SCAFFOLDING_RULE`).toMatch(/BAD:|GOOD:/);
    }
  });

  it('no tier contradicts itself — a cap and a no-cap in one block', () => {
    for (const v of ALL) {
      const block = getVerbosityInstruction(v);
      if (!block) continue;
      const capped = /at most \d+ words/i.test(block);
      const uncapped = /no length cap/i.test(block);
      expect(capped && uncapped, `${v} states both a ceiling and "no length cap"`).toBe(false);
    }
  });

  it('coachApi composes exactly ONE length block into the prompt', () => {
    // The second block is what made the prompt argue with itself. Its loader is
    // deleted; this fails if anything reintroduces a parallel one.
    const src = readFileSync(join(process.cwd(), 'src/services/coachApi.ts'), 'utf-8');
    expect(src.length, 'coachApi.ts not read — vacuous').toBeGreaterThan(10000);
    expect(
      /loadResponseLengthAddition\s*\(/.test(src),
      'a second verbosity block is being composed again — getCoachVerbosity already ' +
      'derives from coachResponseLength, so this one can only contradict it',
    ).toBe(false);
    // ...and the surviving read must be off the LIVE dial, not the dead field.
    expect(
      /coachResponseLength/.test(src),
      'getCoachVerbosity must derive from coachResponseLength — reading the legacy ' +
      'coachVerbosity directly pins every user to the FULL block',
    ).toBe(true);
  });
});

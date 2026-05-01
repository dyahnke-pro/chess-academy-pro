/**
 * Snapshot + structural tests for the personality + dial composition.
 *
 * Snapshot tests pin the assembled prompt for each personality at its
 * default dial settings — a behavioral change to a personality body or
 * a dial modulator will fail the snapshot, forcing the change to be
 * acknowledged in the diff. Structural tests verify each dial's clause
 * lands independently.
 */
import { describe, it, expect } from 'vitest';
import {
  composeIdentityPrompt,
  loadIdentityPrompt,
  loadIdentityPromptForPersonality,
} from './identity';
import { renderPersonalityBlock } from './personalities';
import {
  PERSONALITY_DIAL_DEFAULTS,
  type CoachPersonality,
  type IntensityLevel,
} from '../types';

const PERSONALITIES: readonly CoachPersonality[] = [
  'default',
  'soft',
  'edgy',
  'flirtatious',
  'drill-sergeant',
];

const INTENSITY_LEVELS: readonly IntensityLevel[] = ['none', 'medium', 'hard'];

// ─── Snapshots ──────────────────────────────────────────────────────────────

describe('composeIdentityPrompt — per-personality snapshots at default dials', () => {
  for (const personality of PERSONALITIES) {
    it(`${personality} @ defaults`, () => {
      const prompt = composeIdentityPrompt({
        personality,
        ...PERSONALITY_DIAL_DEFAULTS[personality],
      });
      expect(prompt).toMatchSnapshot();
    });
  }
});

// ─── Structural guarantees ──────────────────────────────────────────────────

describe('composeIdentityPrompt — invariants', () => {
  it('always includes the OPERATOR MODE base body, regardless of personality', () => {
    for (const personality of PERSONALITIES) {
      const prompt = composeIdentityPrompt({
        personality,
        profanity: 'none',
        mockery: 'none',
        flirt: 'none',
      });
      expect(prompt).toMatch(/OPERATOR MODE/);
      expect(prompt).toMatch(/Three hard rules that override anything else/);
      expect(prompt).toMatch(/You're an operator\. Operate/);
    }
  });

  it('renders exactly one PERSONALITY clause and one of each dial clause', () => {
    const prompt = composeIdentityPrompt({
      personality: 'edgy',
      profanity: 'medium',
      mockery: 'hard',
      flirt: 'none',
    });
    expect(prompt.match(/PERSONALITY:/g)?.length).toBe(1);
    expect(prompt.match(/PROFANITY DIAL:/g)?.length).toBe(1);
    expect(prompt.match(/MOCKERY DIAL:/g)?.length).toBe(1);
    expect(prompt.match(/FLIRT DIAL:/g)?.length).toBe(1);
  });

  it('selects the correct dial level body for each setting', () => {
    const prompt = composeIdentityPrompt({
      personality: 'default',
      profanity: 'hard',
      mockery: 'medium',
      flirt: 'none',
    });
    expect(prompt).toMatch(/PROFANITY DIAL: HARD/);
    expect(prompt).toMatch(/MOCKERY DIAL: MEDIUM/);
    expect(prompt).toMatch(/FLIRT DIAL: NONE/);
  });
});

// ─── Dial-level coverage ────────────────────────────────────────────────────

describe('renderPersonalityBlock — every dial level renders distinct text', () => {
  for (const profanity of INTENSITY_LEVELS) {
    it(`profanity=${profanity} produces a distinct clause`, () => {
      const block = renderPersonalityBlock({
        personality: 'default',
        profanity,
        mockery: 'none',
        flirt: 'none',
      });
      expect(block).toMatch(new RegExp(`PROFANITY DIAL: ${profanity.toUpperCase()}`));
    });
  }

  for (const mockery of INTENSITY_LEVELS) {
    it(`mockery=${mockery} produces a distinct clause`, () => {
      const block = renderPersonalityBlock({
        personality: 'default',
        profanity: 'none',
        mockery,
        flirt: 'none',
      });
      expect(block).toMatch(new RegExp(`MOCKERY DIAL: ${mockery.toUpperCase()}`));
    });
  }

  for (const flirt of INTENSITY_LEVELS) {
    it(`flirt=${flirt} produces a distinct clause`, () => {
      const block = renderPersonalityBlock({
        personality: 'default',
        profanity: 'none',
        mockery: 'none',
        flirt,
      });
      expect(block).toMatch(new RegExp(`FLIRT DIAL: ${flirt.toUpperCase()}`));
    });
  }
});

// ─── Hard-rules safety: every personality preserves the contract ────────────

describe('every personality preserves the OPERATOR contract', () => {
  // The whole point of the personality split is voice-only modulation.
  // If a personality body somehow shadows or removes a hard rule, that
  // would let an "edgy" or "drill-sergeant" coach refuse a commanded
  // move — exactly the bug we already shipped a fix for. Pin the rules.
  for (const personality of PERSONALITIES) {
    it(`${personality} keeps "you have hands" + the three hard rules`, () => {
      const prompt = composeIdentityPrompt({
        personality,
        ...PERSONALITY_DIAL_DEFAULTS[personality],
      });
      expect(prompt).toMatch(/You have hands\. They work\. Use them\./);
      expect(prompt).toMatch(/Three hard rules that override anything else/);
      expect(prompt).toMatch(/play_move with that SAN in the same response/);
      expect(prompt).toMatch(/stockfish_eval first/);
    });
  }
});

// ─── Backward-compat with the legacy CoachIdentity entry point ──────────────

describe('loadIdentityPrompt — legacy CoachIdentity callers', () => {
  it('returns a prompt that matches OPERATOR MODE for any legacy identity', () => {
    for (const id of ['danya', 'kasparov', 'fischer'] as const) {
      const prompt = loadIdentityPrompt(id);
      expect(prompt).toMatch(/OPERATOR MODE/);
    }
  });

  it('legacy default == personality "default" with all dials at none', () => {
    const legacy = loadIdentityPrompt('danya');
    const explicit = loadIdentityPromptForPersonality('default');
    expect(legacy).toBe(explicit);
  });
});

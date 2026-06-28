/**
 * Snapshot + structural tests for the personality + dial composition.
 *
 * ALL-AGES CONTRACT (David 2026-06-28): no swearing, no flirting. The
 * profanity and flirt dials are LOCKED to NONE regardless of input, the
 * 'flirtatious' personality is gone, and only the (clean) mockery dial varies.
 * These tests pin that lock so it can't silently regress.
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
      expect(prompt).toMatch(/hard rules that override anything else/);
      expect(prompt).toMatch(/You're an operator\. Operate/);
    }
  });

  it('renders exactly one PERSONALITY clause and one of each dial clause', () => {
    const prompt = composeIdentityPrompt({
      personality: 'edgy',
      profanity: 'hard',
      mockery: 'hard',
      flirt: 'hard',
    });
    expect(prompt.match(/PERSONALITY:/g)?.length).toBe(1);
    expect(prompt.match(/PROFANITY DIAL:/g)?.length).toBe(1);
    expect(prompt.match(/MOCKERY DIAL:/g)?.length).toBe(1);
    expect(prompt.match(/FLIRT DIAL:/g)?.length).toBe(1);
  });

  it('LOCKS profanity + flirt to NONE even when HARD is requested (all-ages)', () => {
    const prompt = composeIdentityPrompt({
      personality: 'default',
      profanity: 'hard',
      mockery: 'medium',
      flirt: 'hard',
    });
    expect(prompt).toMatch(/PROFANITY DIAL: NONE/);
    expect(prompt).not.toMatch(/PROFANITY DIAL: HARD/);
    expect(prompt).toMatch(/FLIRT DIAL: NONE/);
    expect(prompt).not.toMatch(/FLIRT DIAL: HARD/);
    // Mockery still varies.
    expect(prompt).toMatch(/MOCKERY DIAL: MEDIUM/);
  });

  it('never emits swearing or sexual-subtext instructions at any setting', () => {
    for (const profanity of INTENSITY_LEVELS) {
      for (const flirt of INTENSITY_LEVELS) {
        const block = renderPersonalityBlock({ personality: 'edgy', profanity, mockery: 'hard', flirt });
        expect(block).toMatch(/PROFANITY DIAL: NONE/);
        expect(block).toMatch(/FLIRT DIAL: NONE/);
        expect(block.toLowerCase()).not.toContain('swear freely');
        expect(block.toLowerCase()).not.toContain('sexual subtext');
        expect(block.toLowerCase()).not.toContain('promote me, daddy');
      }
    }
  });
});

// ─── Dial-level coverage — only mockery varies now ──────────────────────────

describe('renderPersonalityBlock — mockery is the only live dial', () => {
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

  it('an unknown / removed personality falls back to default (e.g. stored "flirtatious")', () => {
    const block = renderPersonalityBlock({
      // Simulate a stored pre-lock value that no longer exists in the union.
      personality: 'flirtatious' as CoachPersonality,
      mockery: 'none',
    });
    expect(block).toMatch(/PERSONALITY: Default/);
    expect(block).not.toMatch(/Flirtatious/);
  });
});

// ─── Hard-rules safety: every personality preserves the contract ────────────

describe('every personality preserves the OPERATOR contract', () => {
  for (const personality of PERSONALITIES) {
    it(`${personality} keeps "you have hands" + the hard rules`, () => {
      const prompt = composeIdentityPrompt({
        personality,
        ...PERSONALITY_DIAL_DEFAULTS[personality],
      });
      expect(prompt).toMatch(/You have hands\. They work\. Use them\./);
      expect(prompt).toMatch(/hard rules that override anything else/);
      expect(prompt).toMatch(/play_move/);
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

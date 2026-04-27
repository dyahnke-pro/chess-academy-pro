/**
 * Tests for stripCoachOutputTags. WO-COACH-RESILIENCE part C.
 *
 * Audit Finding 32 from production: '[[ACTION:play_move {"san":"e4"}]]
 * Done.' was spoken aloud by Polly because the existing tag-strip
 * regex missed action tags. This file pins the fix.
 */
import { describe, it, expect } from 'vitest';
import { stripCoachOutputTags } from '../stripTags';

describe('stripCoachOutputTags', () => {
  it('strips [[ACTION:...]] (double-bracket canonical form)', () => {
    const input = '[[ACTION:play_move {"san":"e4"}]] Done.';
    expect(stripCoachOutputTags(input)).toBe(' Done.');
  });

  it('strips [ACTION:...] (single-bracket regression form)', () => {
    const input = '[ACTION:play_move {"san":"e4"}] Done.';
    expect(stripCoachOutputTags(input)).toBe(' Done.');
  });

  it('strips both forms when mixed in one stream', () => {
    const input = 'thinking [[ACTION:set_intended_opening {"name":"Italian"}]] then [ACTION:play_move {"san":"e4"}] go';
    expect(stripCoachOutputTags(input)).toBe('thinking  then  go');
  });

  it('strips [BOARD:arrow:e2->e4]', () => {
    const input = '[BOARD:arrow:e2->e4] Watch this';
    expect(stripCoachOutputTags(input)).toBe(' Watch this');
  });

  it('leaves plain text intact', () => {
    const input = 'No tags here, just narration.';
    expect(stripCoachOutputTags(input)).toBe('No tags here, just narration.');
  });

  it('handles multiple tags in one string', () => {
    const input = '[BOARD:highlight:f7] hanging! [[ACTION:play_move {"san":"Bxh7"}]] Sac.';
    expect(stripCoachOutputTags(input)).toBe(' hanging!  Sac.');
  });

  it('case-insensitive — lower-case action tag still strips', () => {
    expect(stripCoachOutputTags('[[action:foo]] x')).toBe(' x');
    expect(stripCoachOutputTags('[action:foo] x')).toBe(' x');
  });
});

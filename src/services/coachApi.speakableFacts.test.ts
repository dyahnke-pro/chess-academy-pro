// A fallback must never speak a DIRECTIVE.
//
// Prod, David 2026-08-02: playing a Vienna against the coach on /coach/teach,
// five replies in one game opened with the coach reading its own prompt aloud —
// "GROUNDED FACTS (voice ONLY these — never invent a capture, check, tactic, or
// threat not listed here): quiet pawn move g7->g6, no capture." The directive
// had been prepended to the facts string, and every net in `voiceFacts` falls
// back to serving the facts verbatim, so any trip spoke the instruction.
import { describe, it, expect } from 'vitest';
import { speakableFacts } from './coachApi';

describe('speakableFacts', () => {
  it('strips the shouted directive header prod actually spoke', () => {
    expect(speakableFacts(
      'GROUNDED FACTS (voice ONLY these — never invent a capture, check, tactic, or threat not listed here): quiet pawn move g7->g6, no capture.',
    )).toBe('quiet pawn move g7->g6, no capture.');
    expect(speakableFacts(
      "GEM ALERT (known verified inaccuracy by the coach's last move): the callout.",
    )).toBe('the callout.');
  });

  it('leaves real facts alone', () => {
    for (const facts of [
      'The student played Ng5. The coach replied Bxg5.',
      'Black is winning (about 7.6 points).',
      'Nf3 develops the knight and eyes e5.',
      'CAPTURED the knight on g5 (bishop from e7).',
    ]) {
      expect(speakableFacts(facts)).toBe(facts);
    }
  });

  it('is safe on empty input', () => {
    expect(speakableFacts('')).toBe('');
    expect(speakableFacts('   ')).toBe('');
  });
});

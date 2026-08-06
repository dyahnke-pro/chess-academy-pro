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
    // "g7->g6" is notation for the eyes; the 2026-08-06 iPhone session heard
    // it read aloud, so arrows are spoken as words now.
    expect(speakableFacts(
      'GROUNDED FACTS (voice ONLY these — never invent a capture, check, tactic, or threat not listed here): quiet pawn move g7->g6, no capture.',
    )).toBe('quiet pawn move g7 to g6, no capture.');
    expect(speakableFacts(
      "GEM ALERT (known verified inaccuracy by the coach's last move): the callout.",
    )).toBe('the callout.');
  });

  it("cleans the exact fallback David heard on 2026-08-06 — headers, arrows, double periods", () => {
    const facts =
      'The student played d3. The coach replied Na5. quiet knight move c6->a5, no capture. ' +
      "Why it's strong: It repositions the knight to a5, eyeing c4.. " +
      'FORK IN THE ROAD — two real options here, near-equal. ' +
      'ROAD CHOSEN: the student took the Bc4 road at the fork.';
    const spoken = speakableFacts(facts);
    expect(spoken).not.toContain('->');
    expect(spoken).not.toContain("Why it's strong:");
    expect(spoken).not.toContain('FORK IN THE ROAD');
    expect(spoken).not.toContain('ROAD CHOSEN');
    expect(spoken).not.toContain('..');
    expect(spoken).toContain('c6 to a5');
    expect(spoken).toContain('It repositions the knight to a5');
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

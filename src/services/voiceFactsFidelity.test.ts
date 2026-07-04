import { describe, it, expect } from 'vitest';
import { numericTokens, introducedNumbers, droppedTokens } from './coachApi';

// The number-fidelity net behind voiceFacts (David 2026-07-04: "make sure the
// CORRECT answer is getting to the user — no good if gates flag wrong answers
// but the brain still pushes them through"). voiceFacts serves the exact
// computed prose whenever the phrasing model introduces/changes a number.

describe('numericTokens', () => {
  it('extracts every digit run, value-normalized', () => {
    expect(numericTokens('6W-4D-10L, a 30% win rate')).toEqual(['6', '4', '10', '30']);
    expect(numericTokens('about 2.50 pawns')).toEqual(['2.5']); // 2.50 -> 2.5
    expect(numericTokens('no numbers here')).toEqual([]);
    expect(numericTokens('rating 1487')).toEqual(['1487']);
  });
});

describe('introducedNumbers — the fidelity check', () => {
  it('returns [] when the phrasing keeps every number (faithful)', () => {
    const facts = "In the Sicilian you're 6W-4D-10L across 20 games — a 30% win rate.";
    const out = "You've won 6, drawn 4, and lost 10 of your 20 Sicilians — a 30% clip.";
    expect(introducedNumbers(facts, out)).toEqual([]);
  });

  it('returns [] when the phrasing OMITS a number (omission is allowed)', () => {
    const facts = 'Your fastest win took 14 moves; your longest game ran 96 moves.';
    const out = 'Your fastest win came in just 14 moves.';
    expect(introducedNumbers(facts, out)).toEqual([]); // 96 dropped, but nothing wrong introduced
  });

  it('catches an INVENTED number (the corruption case → triggers fallback)', () => {
    const facts = "you're 6W-4D-10L — a 30% win rate.";
    const out = "you're crushing it at 60% — 12 wins!"; // 60 and 12 are fabricated
    expect(introducedNumbers(facts, out).sort()).toEqual(['12', '60']);
  });

  it('catches a CHANGED number (rounded/flipped)', () => {
    const facts = 'it cost about 2.5 pawns.';
    const out = 'it cost roughly 3 pawns.'; // 3 not in facts
    expect(introducedNumbers(facts, out)).toEqual(['3']);
  });

  it('treats 2.50 and 2.5 as equal (value-normalized, no false trip)', () => {
    expect(introducedNumbers('cost 2.5 pawns', 'cost 2.50 pawns')).toEqual([]);
  });
});

describe('droppedTokens — critical SAN preservation (move-mentioning verticals)', () => {
  it('returns [] when unset', () => {
    expect(droppedTokens(undefined, 'anything')).toEqual([]);
    expect(droppedTokens([], 'anything')).toEqual([]);
  });
  it('returns [] when every token survives (even wrapped in prose)', () => {
    expect(droppedTokens(['d3', 'd4'], 'd3 is a mistake — the d-pawn to d4 was cleaner.')).toEqual([]);
    // case-insensitive
    expect(droppedTokens(['Nf3'], 'developing with nf3 keeps the edge')).toEqual([]);
  });
  it('catches a file/piece swap the number net misses (d4 → e4 keeps the digit)', () => {
    // facts said the better move was d4; the model voiced e4. Number net sees
    // "4" in both → passes. droppedTokens catches that "d4" is absent.
    expect(introducedNumbers('the engine preferred d4', 'the engine preferred e4')).toEqual([]);
    expect(droppedTokens(['d4'], 'the engine preferred e4')).toEqual(['d4']);
  });
  it('catches a dropped move (prose omitted the SAN entirely)', () => {
    expect(droppedTokens(['d4'], 'a quiet pawn push was better')).toEqual(['d4']);
  });
});

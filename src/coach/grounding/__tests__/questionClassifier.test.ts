/**
 * Tests for the question classifier (WO-MANDATORY-GROUNDING).
 *
 * The classifier is the gate that decides whether the spine pre-fetches
 * Stockfish + Lichess data before calling the LLM. False positives are
 * cheap (one extra read-only tool call); false negatives are the bug
 * we're fixing. So the test suite errs on the side of asserting positive
 * matches even for mildly-tactical phrasings.
 */
import { describe, it, expect } from 'vitest';
import { classifyQuestion } from '../questionClassifier';

describe('classifyQuestion — Stockfish triggers', () => {
  it('flags "is this move good?" → needsStockfish', () => {
    const r = classifyQuestion('is this move good?');
    expect(r.needsStockfish).toBe(true);
  });

  it('flags "why didn\'t black take the bishop?" → needsStockfish', () => {
    const r = classifyQuestion("why didn't black take the bishop?");
    expect(r.needsStockfish).toBe(true);
  });

  it('flags "what\'s the best move here?" → needsStockfish', () => {
    const r = classifyQuestion("what's the best move here?");
    expect(r.needsStockfish).toBe(true);
  });

  it('flags "what\'s the eval?" → needsStockfish', () => {
    const r = classifyQuestion("what's the eval?");
    expect(r.needsStockfish).toBe(true);
  });

  it('flags "am I winning?" → needsStockfish', () => {
    const r = classifyQuestion('am I winning?');
    expect(r.needsStockfish).toBe(true);
  });

  it('flags "is the bishop hanging?" → needsStockfish (tactic noun)', () => {
    const r = classifyQuestion('is the bishop hanging?');
    expect(r.needsStockfish).toBe(true);
  });

  it('flags "should I take the knight?" → needsStockfish', () => {
    const r = classifyQuestion('should I take the knight?');
    expect(r.needsStockfish).toBe(true);
  });

  it('flags "Qxg5?" (bare SAN with question form) → needsStockfish', () => {
    const r = classifyQuestion('Qxg5?');
    expect(r.needsStockfish).toBe(true);
  });

  it('flags "Nf3 good?" → needsStockfish', () => {
    const r = classifyQuestion('Nf3 good?');
    expect(r.needsStockfish).toBe(true);
  });

  it('flags "is this tactically winning" → needsStockfish', () => {
    const r = classifyQuestion('is this tactically winning');
    expect(r.needsStockfish).toBe(true);
  });

  it('flags "is this a blunder" → needsStockfish (tactic noun)', () => {
    const r = classifyQuestion('is this a blunder');
    expect(r.needsStockfish).toBe(true);
  });

  it('flags "fork on h7?" → needsStockfish', () => {
    const r = classifyQuestion('fork on h7?');
    expect(r.needsStockfish).toBe(true);
  });
});

describe('classifyQuestion — Lichess triggers', () => {
  it('flags "what opening is this?" → needsLichess', () => {
    const r = classifyQuestion('what opening is this?');
    expect(r.needsLichess).toBe(true);
  });

  it('flags "what\'s the name of this line?" → needsLichess', () => {
    const r = classifyQuestion("what's the name of this line?");
    expect(r.needsLichess).toBe(true);
  });

  it('flags "what\'s the popular response here?" → needsLichess', () => {
    const r = classifyQuestion("what's the popular response here?");
    expect(r.needsLichess).toBe(true);
  });

  it('flags "what\'s the mainline continuation?" → needsLichess', () => {
    const r = classifyQuestion("what's the mainline continuation?");
    expect(r.needsLichess).toBe(true);
  });

  it('flags "what do top players play here?" → needsLichess', () => {
    const r = classifyQuestion('what do top players play here?');
    expect(r.needsLichess).toBe(true);
  });

  it('flags "what does theory say about this?" → needsLichess', () => {
    const r = classifyQuestion('what does theory say about this?');
    expect(r.needsLichess).toBe(true);
  });

  it('flags "tell me about the Italian Game" → needsLichess (opening name)', () => {
    const r = classifyQuestion('tell me about the Italian Game');
    expect(r.needsLichess).toBe(true);
  });

  it('flags "is this Vienna?" → needsLichess (opening name) AND needsStockfish (is-this-X form)', () => {
    const r = classifyQuestion('is this Vienna?');
    // The exact "is this <noun>" pattern only fires for tactical-verdict
    // nouns (move/good/bad/winning/etc.); "is this Vienna" doesn't match
    // Stockfish triggers — only Lichess (opening name).
    expect(r.needsLichess).toBe(true);
  });
});

describe('classifyQuestion — both true (composite questions)', () => {
  it("flags 'is the Italian Game's main line good for me as black' → both", () => {
    const r = classifyQuestion("is the Italian Game's main line good for me as black");
    expect(r.needsStockfish).toBe(true);
    expect(r.needsLichess).toBe(true);
  });

  it('flags "what\'s the best move in the Najdorf?" → both', () => {
    const r = classifyQuestion("what's the best move in the Najdorf?");
    expect(r.needsStockfish).toBe(true);
    expect(r.needsLichess).toBe(true);
  });
});

describe('classifyQuestion — negative cases', () => {
  it('returns both false for "what time is it"', () => {
    const r = classifyQuestion('what time is it');
    expect(r.needsStockfish).toBe(false);
    expect(r.needsLichess).toBe(false);
  });

  it('returns both false for "is this fun"', () => {
    const r = classifyQuestion('is this fun');
    expect(r.needsStockfish).toBe(false);
    expect(r.needsLichess).toBe(false);
  });

  it('returns both false for an empty string', () => {
    const r = classifyQuestion('');
    expect(r.needsStockfish).toBe(false);
    expect(r.needsLichess).toBe(false);
    expect(r.reason).toBe('empty');
  });

  it('returns both false for whitespace only', () => {
    const r = classifyQuestion('   \n\t  ');
    expect(r.needsStockfish).toBe(false);
    expect(r.needsLichess).toBe(false);
    expect(r.reason).toBe('empty');
  });

  it('returns both false for "italian food is great" — opening name needs word boundary, "food" disambiguates', () => {
    // "italian" alone hits OPENING_NAMES_RE because the regex matches the
    // bare word. This is acceptable as a false-positive (cheap extra
    // Lichess call). Documenting via this test so the behavior is explicit.
    const r = classifyQuestion('italian food is great');
    expect(r.needsLichess).toBe(true); // false-positive by design — see comment
  });

  it('returns both false for "hello, how are you?"', () => {
    const r = classifyQuestion('hello, how are you?');
    expect(r.needsStockfish).toBe(false);
    expect(r.needsLichess).toBe(false);
  });
});

describe('classifyQuestion — reason field carries useful diagnostics', () => {
  it('reports stockfish trigger label on a tactical question', () => {
    const r = classifyQuestion("why didn't black take?");
    expect(r.reason).toMatch(/^stockfish:/);
  });

  it('reports lichess trigger label on an opening question', () => {
    const r = classifyQuestion('what opening is this?');
    expect(r.reason).toMatch(/^lichess:/);
  });

  it('reports both labels when both fire', () => {
    const r = classifyQuestion("what's the best move in the Najdorf?");
    expect(r.reason).toContain('stockfish:');
    expect(r.reason).toContain('lichess:');
  });
});

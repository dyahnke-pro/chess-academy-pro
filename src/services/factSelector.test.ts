// The boards are David's real Alapin game (2026-09-16) — the ply he read back
// where the coach named the pin, the battery, the lone defender and the royal
// guard as four separate findings about ONE diagonal.
import { describe, it, expect } from 'vitest';
import { selectFacts, barForTier, SAME_CLAIM_JACCARD } from './factSelector';

// Verbatim from the shipped ply-23 narration.
const PIN = '[tactic] Your bishop on g4 pins their bishop on e2 against their queen on d1.';
const LONE = '[tactic] Your queen on d7 is the only defender of your bishop on g4 — and it can be taken.';
const BATTERY = '[tactic] Their queen on d1 and their bishop on e2 form a battery on the diagonal, bearing down on your bishop on g4.';
const ROYAL = '[royal] Their bishop on e2 is guarded only by the king and queen — and the king and queen are the worst defenders.';
const TRIVIA = '[consequence] It nudged the balance your way.';

const SQ = new Map<string, readonly string[]>([
  [PIN, ['g4', 'e2', 'd1']],
  [LONE, ['d7', 'g4']],
  [BATTERY, ['d1', 'e2', 'g4']],
  [ROYAL, ['e2']],
]);

describe('factSelector — one claim per geometry', () => {
  it('the pin and the battery are ONE claim; only one speaks', () => {
    const r = selectFacts([PIN, LONE, BATTERY, ROYAL], SQ, 'blunder');
    const bothSpoke = r.spoken.includes(PIN) && r.spoken.includes(BATTERY);
    expect(bothSpoke).toBe(false);
    const sub = r.quiet.find((q) => q.why === 'subsumed');
    expect(sub).toBeDefined();
    // …and the silence is explainable: it names the fact that won the geometry.
    expect([PIN, BATTERY]).toContain(sub?.by);
  });

  it('keeps the genuinely different teachings about the same pieces', () => {
    const r = selectFacts([PIN, LONE, BATTERY, ROYAL], SQ, 'blunder');
    // {d7,g4} and {e2} do not coincide with {g4,e2,d1} — different claims.
    expect(r.spoken).toContain(LONE);
    expect(r.spoken).toContain(ROYAL);
  });

  it('a fact with no coupled squares is never collapsed — silence is never a guess', () => {
    const noSq = new Map<string, readonly string[]>();
    const r = selectFacts([PIN, BATTERY], noSq, 'blunder');
    expect(r.spoken).toHaveLength(2);
    expect(r.quiet).toHaveLength(0);
  });
});

describe('factSelector — the tie-break is a chess judgement', () => {
  it('THE BATTERY BEATS THE PIN: their threat outranks your standing asset', () => {
    // David 2026-09-16: "If the battery is more important than the pin, then the
    // pin stays quiet and the battery wins." Pin and battery carry the same tag
    // and therefore the same rank, so without this the winner was whichever the
    // authoring order emitted first — which was the pin.
    const incoming = new Set([BATTERY]); // beneficiary = the opponent
    const r = selectFacts([PIN, LONE, BATTERY, ROYAL], SQ, 'blunder', [], incoming);
    expect(r.spoken).toContain(BATTERY);
    expect(r.spoken).not.toContain(PIN);
    expect(r.quiet.find((q) => q.text === PIN)?.by).toBe(BATTERY);
  });

  it('with no incoming flag it still collapses — it just falls back to authoring order', () => {
    const r = selectFacts([PIN, BATTERY], SQ, 'blunder');
    expect(r.spoken).toHaveLength(1);
  });
});

describe('factSelector — a BAR, not a cap (G4.5)', () => {
  it('a critical moment speaks every computed fact, however many', () => {
    const many = Array.from({ length: 12 }, (_, i) => `[structure] fact ${i}`);
    const r = selectFacts(many, new Map(), 'blunder');
    expect(r.spoken).toHaveLength(12); // no count ever truncates
  });

  it('a quiet taught moment drops the low-value tail, not a fixed number', () => {
    const r = selectFacts([PIN, TRIVIA], SQ, 'teaching');
    expect(r.spoken).toContain(PIN);
    expect(r.spoken).not.toContain(TRIVIA);
    expect(r.quiet.find((q) => q.text === TRIVIA)?.why).toBe('below-bar');
  });

  it('the bar rises as the moment gets quieter, and never gates a critical one', () => {
    expect(barForTier('mate')).toBe(0);
    expect(barForTier('blunder')).toBe(0);
    expect(barForTier('swing')).toBeLessThan(barForTier('teaching'));
    expect(barForTier('none')).toBeGreaterThan(100); // nothing speaks
  });

  it('every fact is accounted for — spoken or explainably quiet', () => {
    const all = [PIN, LONE, BATTERY, ROYAL, TRIVIA];
    const r = selectFacts(all, SQ, 'teaching');
    expect(r.spoken.length + r.quiet.length).toBe(all.length);
  });

  it('the same-claim threshold is Jaccard, so containment alone never collapses', () => {
    expect(SAME_CLAIM_JACCARD).toBeGreaterThan(0.5);
    // {e2} ⊂ {g4,e2,d1} — containment is 1.0, Jaccard is 0.33. Must NOT collapse.
    const r = selectFacts([PIN, ROYAL], SQ, 'blunder');
    expect(r.spoken).toHaveLength(2);
  });
});

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
    // 'none' is NOT a mute — a per-fact floor may never silence a whole ply;
    // that decision belongs to the need gate (N2). Regressing this cut the
    // Alapin review from 44 narrated plies to 6.
    expect(barForTier('none')).toBeLessThan(30);
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

describe("a surface's own scale — rank and bar travel together", () => {
  it('orders and floors by the SUPPLIED scale, not by the facet tags', () => {
    // Untagged text: `facetRank` knows none of it, so without `order` these
    // would all score the same and the authoring order would decide.
    const facts = ['they are threatening the knight on e5', 'the plan here: take the centre', 'a habit to run next time'];
    const rank = new Map([[facts[0], 75], [facts[1], 38], [facts[2], 10]]);
    const out = selectFacts(facts, new Map(), 'none', [], new Set(), { rank, bar: 0 });
    expect(out.spoken).toEqual(facts);      // 75 > 38 > 10
    expect(out.quiet).toEqual([]);          // bar 0 floors nothing
  });

  it('a bar in the supplied scale sweeps by THAT scale', () => {
    const facts = ['high', 'low'];
    const rank = new Map([['high', 75], ['low', 10]]);
    const out = selectFacts(facts, new Map(), 'none', [], new Set(), { rank, bar: 20 });
    expect(out.spoken).toEqual(['high']);
    expect(out.quiet).toEqual([{ text: 'low', why: 'below-bar' }]);
  });

  it('subsumption still runs under a supplied scale — the winner is the higher rank', () => {
    const facts = ['the pin on the e-file', 'the battery on the e-file'];
    const squares = new Map([[facts[0], ['e1', 'e2', 'e8']], [facts[1], ['e1', 'e2', 'e8']]]);
    const rank = new Map([[facts[0], 40], [facts[1], 70]]);
    const out = selectFacts(facts, squares, 'none', [], new Set(), { rank, bar: 0 });
    expect(out.spoken).toEqual([facts[1]]);
    expect(out.quiet).toEqual([{ text: facts[0], why: 'subsumed', by: facts[1] }]);
  });

  it('a fact with no squares is never collapsed, whatever its rank', () => {
    const facts = ['the pin on the e-file', 'a habit with no geometry'];
    const squares = new Map([[facts[0], ['e1', 'e2', 'e8']]]);
    const rank = new Map([[facts[0], 70], [facts[1], 10]]);
    const out = selectFacts(facts, squares, 'none', [], new Set(), { rank, bar: 0 });
    expect(out.spoken).toEqual(facts);
  });
});

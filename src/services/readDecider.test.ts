import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decideRead, saidRate, type ReadFact } from './readDecider';

// Every fact the app's computers made on Korchnoi's board from Danya's
// "How to avoid blunders" read (the dump's own output, a3 to play), with what
// the old read said (`keptToday`: the composer joined every kept fact in a
// fixed order, a dozen structure plans among them).
interface FixtureFact extends ReadFact { keptToday: boolean }
const board = JSON.parse(readFileSync('src/test/fixtures/read-korchnoi-board.json', 'utf8')) as { facts: FixtureFact[] };
const facts: FixtureFact[] = board.facts.map((f) => ({ ...f, depth: f.depth ?? null, stake: f.stake ?? null }));

describe('the read decider (fitted on his reads of positions)', () => {
  it('says the move that matters on Korchnoi\'s board, not the board\'s generic plans', () => {
    const said = decideRead(facts).map((f) => f.text);
    // His read is about a3 covering b4 before b4 lands. It is said.
    expect(said.some((t) => /a3/.test(t) && /covers b4/.test(t))).toBe(true);
    // The old read also said a minority attack on a board where none is the
    // point, and a structure plan for every piece. The decider says neither.
    const old = facts.filter((f) => f.keptToday).map((f) => f.text);
    expect(old.some((t) => /minority attack/.test(t))).toBe(true);
    expect(said.some((t) => /minority attack/.test(t))).toBe(false);
    expect(said.length).toBeLessThan(old.length / 2);
  });

  it('a kind his reads never say stays quiet; ties keep their order; one statement of each', () => {
    const unseen: ReadFact = { from: 'position', kind: 'no-such-kind', text: 'x', depth: null, stake: null };
    expect(saidRate(unseen)).toBeLessThan(0.3);
    expect(decideRead([unseen])).toEqual([]);
    const keep = facts.find((f) => decideRead([f]).length === 1);
    expect(keep).toBeDefined();
    if (keep) expect(decideRead([keep, { ...keep }])).toHaveLength(1);
  });
});

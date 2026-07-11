import { describe, it, expect } from 'vitest';
import { buildOpeningChainFacts, TRAP_PROXIMITY_MAX_PLIES } from './openingFactChains';
import { getAllVerifiedLines } from './verifiedLineLibrary';

// The opening-phase teaching chain (David 2026-07-11: "the purpose of each
// move and what traps might form"). Everything computed — DB continuations +
// engine-verified trap lines; no invention (G3).

describe('buildOpeningChainFacts — named continuations', () => {
  it('names where the next moves lead from a real DB position', () => {
    const { facts } = buildOpeningChainFacts({ historySans: ['e4', 'e5'], studentColor: 'white' });
    const cont = facts.find((f) => f.startsWith('Named continuations'));
    expect(cont).toBeDefined();
    // 1.e4 e5 has named DB continuations (Nf3 / f4 / Bc4 families).
    expect(cont).toMatch(/heads into the|main line of the/);
  });

  it('returns nothing for an empty history', () => {
    const out = buildOpeningChainFacts({ historySans: [], studentColor: 'white' });
    expect(out.facts).toEqual([]);
    expect(out.trapNames).toEqual([]);
  });

  it('returns no continuation fact once out of book', () => {
    const out = buildOpeningChainFacts({
      historySans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'a4', 'a5', 'h4', 'h5', 'Ra3', 'Ra6'],
      studentColor: 'white',
    });
    expect(out.facts.find((f) => f.startsWith('Named continuations'))).toBeUndefined();
  });
});

describe('buildOpeningChainFacts — lurking verified traps', () => {
  // Find a real verified line from the library so the test tracks the actual
  // data instead of hardcoding a trap that might get re-curated away.
  const line = getAllVerifiedLines().find((l) => !l.setupFen && l.pgn.trim().split(/\s+/).length >= 4);

  it('surfaces a verified line when the game walks its prefix (proximity-gated)', () => {
    if (!line) return; // library empty in this build — nothing to assert
    const tokens = line.pgn.trim().split(/\s+/);
    // Walk far enough into the line that the tail is within proximity.
    const start = Math.max(1, tokens.length - TRAP_PROXIMITY_MAX_PLIES);
    const history = tokens.slice(0, start).map((t) => t.replace(/[+#!?]+$/, ''));
    const out = buildOpeningChainFacts({ historySans: history, studentColor: line.studentColor });
    expect(out.trapNames).toContain(line.name);
    const fact = out.facts.find((f) => f.includes(line.name))!;
    expect(fact).toBeDefined();
    // The fact names the line's next moves — real, from the verified PGN.
    expect(fact).toContain(tokens[start].replace(/[+#!?]+$/, ''));
  });

  it('skips traps already announced this game (dedup contract)', () => {
    if (!line) return;
    const tokens = line.pgn.trim().split(/\s+/);
    const start = Math.max(1, tokens.length - TRAP_PROXIMITY_MAX_PLIES);
    const history = tokens.slice(0, start).map((t) => t.replace(/[+#!?]+$/, ''));
    const out = buildOpeningChainFacts({
      historySans: history,
      studentColor: line.studentColor,
      announcedTraps: new Set([line.name]),
    });
    expect(out.trapNames).not.toContain(line.name);
  });

  it('never surfaces a trap for the wrong student color', () => {
    if (!line) return;
    const tokens = line.pgn.trim().split(/\s+/);
    const start = Math.max(1, tokens.length - TRAP_PROXIMITY_MAX_PLIES);
    const history = tokens.slice(0, start).map((t) => t.replace(/[+#!?]+$/, ''));
    const out = buildOpeningChainFacts({
      historySans: history,
      studentColor: line.studentColor === 'white' ? 'black' : 'white',
    });
    expect(out.trapNames).not.toContain(line.name);
  });

  it('a remote trap (deep tail beyond proximity) stays quiet', () => {
    // From bare 1.e4 the decisive tails are far away — nothing should fire
    // unless a verified line is genuinely ≤ proximity plies from move 1.
    const out = buildOpeningChainFacts({ historySans: ['e4'], studentColor: 'white' });
    for (const name of out.trapNames.filter((n) => !n.startsWith('gem:'))) {
      const l = getAllVerifiedLines().find((x) => x.name === name)!;
      expect(l.pgn.trim().split(/\s+/).length - 1).toBeLessThanOrEqual(TRAP_PROXIMITY_MAX_PLIES);
    }
  });
});

describe('buildOpeningChainFacts — punish-gem heads-ups', () => {
  it('surfaces the Caro-Kann f3 gem when the game walks its spine (student = black)', () => {
    // The real mined gem: e4 c6 d4 d5 Nc3 dxe4, White slips with f3 next.
    const out = buildOpeningChainFacts({
      historySans: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4'],
      studentColor: 'black',
      maxTraps: 3,
    });
    const gemFact = out.facts.find((f) => f.includes('opponents play f3'));
    expect(gemFact).toBeDefined();
    expect(gemFact).toContain('the punish is exf3');
    expect(out.trapNames.some((n) => n.startsWith('gem:caro-kann:f3'))).toBe(true);
  });

  it('stays quiet for the wrong color and off-path histories', () => {
    const onPathWrongColor = buildOpeningChainFacts({
      historySans: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4'],
      studentColor: 'white',
      maxTraps: 3,
    });
    expect(onPathWrongColor.trapNames.some((n) => n.startsWith('gem:caro-kann:f3'))).toBe(false);
    const offPath = buildOpeningChainFacts({
      historySans: ['d4', 'd5', 'c4'],
      studentColor: 'black',
      maxTraps: 3,
    });
    expect(offPath.trapNames.some((n) => n.startsWith('gem:caro-kann:f3'))).toBe(false);
  });

  it('dedups an already-announced gem', () => {
    const first = buildOpeningChainFacts({
      historySans: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4'],
      studentColor: 'black',
      maxTraps: 3,
    });
    const gemKey = first.trapNames.find((n) => n.startsWith('gem:caro-kann:f3'))!;
    const again = buildOpeningChainFacts({
      historySans: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4'],
      studentColor: 'black',
      maxTraps: 3,
      announcedTraps: new Set([gemKey]),
    });
    expect(again.trapNames).not.toContain(gemKey);
  });
});

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { exchangeChain, legalCapturers, legalDefenders } from './thinkingExchangeChain';

// Every fixture is a legal board (checked below with chess.js).
// White to move. Black knight c6, guarded by the b7 pawn; White hits it with
// the d5 pawn and the b4 knight. dxc6 bxc6 Nxc6 nets White three points (pin-aware SEE).
const GUARDED = '4k3/1p6/2n5/3P4/1N6/8/8/6K1 w - - 0 1';
// The same knight, unguarded, hit only by the b4 knight.
const LOOSE = '4k3/8/2n5/8/1N6/8/8/4K3 w - - 0 1';
// The e5 knight points at c6 but is pinned to the king by the e8 rook.
const PINNED_ATTACKER = 'k3r3/1p6/2n5/3PN3/8/8/8/4K3 w - - 0 1';
// White to move, White's c3 knight hit by the b4 pawn, guarded by b2.
const MINE_IN_DANGER = '6k1/8/8/8/1p6/2N5/1P6/6K1 w - - 0 1';
// White is in check from a1: a count on c6 holds for one move only.
const IN_CHECK = '4k3/8/2n5/8/1N6/8/8/r3K3 w - - 0 1';

describe('fixtures are legal boards', () => {
  it.each([GUARDED, LOOSE, PINNED_ATTACKER, MINE_IN_DANGER, IN_CHECK])('%s', (fen) => {
    expect(() => new Chess(fen)).not.toThrow();
  });
});

describe('legalCapturers / legalDefenders', () => {
  it('reads the legal attackers and defenders of a guarded piece', () => {
    expect(new Set(legalCapturers(GUARDED, 'c6', 'w'))).toEqual(new Set(['d5', 'b4']));
    expect(legalDefenders(GUARDED, 'c6', 'b')).toEqual(['b7']);
  });

  it('never counts a pinned attacker', () => {
    expect(legalCapturers(PINNED_ATTACKER, 'c6', 'w')).toEqual(['d5']);
  });

  it('reads the defenders of the side to move', () => {
    expect(legalCapturers(MINE_IN_DANGER, 'c3', 'b')).toEqual(['b4']);
    expect(legalDefenders(MINE_IN_DANGER, 'c3', 'w')).toEqual(['b2']);
  });
});

describe('exchangeChain — their target', () => {
  it('asks attackers, then defenders, then who takes first, and states the computed result', () => {
    const links = exchangeChain(GUARDED, 'c6', 'theirs');
    expect(links.map((l) => l.id)).toEqual(['attackers', 'defenders', 'takes-first']);
    expect(new Set(links[0].key)).toEqual(new Set(['d5', 'b4']));
    expect(links[0].mode).toBe('all');
    expect(links[0].prompt).toMatch(/their knight on c6/);
    expect(links[1].key).toEqual(['b7']);
    expect(links[2].key).toEqual(['d5']);
    expect(links[2].mode).toBe('any');
    expect(links[2].after).toBe('So you win it: take with the pawn first, and when the trades are done you are 3 points up.');
    // The result is said once, at the end of the chain.
    expect(links[0].after).toBeNull();
    expect(links[1].after).toBeNull();
  });

  it('a wrong tap names the method, never the answer', () => {
    const [atk, , first] = exchangeChain(GUARDED, 'c6', 'theirs');
    expect(atk.wrongTapLine('g1')).toMatch(/cannot reach c6/);
    expect(atk.wrongTapLine('b7')).toMatch(/theirs/);
    expect(atk.wrongTapLine('a1')).toMatch(/empty/);
    expect(first.wrongTapLine('b4')).toMatch(/cheapest/);
  });

  it('explains a pinned attacker that does not count', () => {
    const [atk] = exchangeChain(PINNED_ATTACKER, 'c6', 'theirs');
    expect(atk.key).toEqual(['d5']);
    expect(atk.wrongTapLine('e5')).toMatch(/pinned/);
  });

  it('a loose piece skips the empty defenders link, and any attacker takes first', () => {
    const links = exchangeChain(LOOSE, 'c6', 'theirs');
    expect(links.map((l) => l.id)).toEqual(['attackers', 'takes-first']);
    expect(links[1].after).toBe("So it's yours: nothing can take back, and you win 3 points.");
  });

  it('no chain on a board where the count holds for one move only (check)', () => {
    expect(exchangeChain(IN_CHECK, 'c6', 'theirs')).toEqual([]);
  });

  it('no chain on an empty square, own piece, or the king', () => {
    expect(exchangeChain(GUARDED, 'a1', 'theirs')).toEqual([]);
    expect(exchangeChain(GUARDED, 'd5', 'theirs')).toEqual([]);
    expect(exchangeChain(GUARDED, 'e8', 'theirs')).toEqual([]);
  });

  it('phrasing is rotated on the key, never rolled', () => {
    expect(exchangeChain(GUARDED, 'c6', 'theirs', 0)[0].prompt).toBe(exchangeChain(GUARDED, 'c6', 'theirs', 0)[0].prompt);
    expect(exchangeChain(GUARDED, 'c6', 'theirs', 0)[0].prompt).not.toBe(exchangeChain(GUARDED, 'c6', 'theirs', 1)[0].prompt);
  });
});

describe('exchangeChain — my piece in danger', () => {
  it('counts their attackers and your defenders, and says what they win', () => {
    const links = exchangeChain(MINE_IN_DANGER, 'c3', 'mine');
    expect(links.map((l) => l.id)).toEqual(['attackers', 'defenders', 'takes-first']);
    expect(links[0].prompt).toMatch(/your knight on c3/);
    expect(links[0].prompt).toMatch(/theirs/);
    expect(links[0].key).toEqual(['b4']);
    expect(links[1].key).toEqual(['b2']);
    expect(links[2].after).toBe('So they win it: they take with the pawn first and come out 2 points ahead — that is why it is in danger.');
    for (const l of links) expect(`${l.prompt} ${l.after ?? ''}`).not.toMatch(/\b(we|our|us)\b/i);
  });
});

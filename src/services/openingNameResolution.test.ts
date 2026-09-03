/**
 * A NAME THE STUDENT TYPES MUST REACH THE OPENING THEY MEANT — OR NOTHING.
 *
 * David 2026-09-03: he asked the coach for the "traxler counter gambit". It
 * replied "Ready to start the traxler counter gambit" and then taught him the
 * DANISH GAMBIT. `resolveOpeningEntry('traxler counter gambit')` returned null,
 * and something downstream substituted an unrelated opening.
 *
 * The resolver required EVERY query token to appear in the shipped name. The DB
 * calls it "Traxler Counterattack", so `counter` (which appears in ZERO of the
 * 3,654 names) and `gambit` could never match — and a query that names its
 * opening unmistakably resolved to nothing. Bare "traxler" worked; adding two
 * CORRECT words broke it.
 *
 * The rule that fixes the class: when the strict tiers fail, resolve on the
 * RAREST token the query carries — token frequency is what separates a name
 * from a category (`traxler` 5, `najdorf` 28 vs `gambit` 1,207, `variation`
 * 2,019) — and only when that token names ONE opening family.
 */
import { describe, it, expect } from 'vitest';
import { resolveOpeningEntry } from './openingDetectionService';

const TRAXLER = 'Italian Game: Two Knights Defense, Traxler Counterattack';

describe('opening name resolution', () => {
  it.each([
    'traxler',
    'Traxler',
    'traxler counterattack',
    'traxler counter gambit',
    'Traxler Counter Gambit',
    'Traxler Counter-Gambit',
    'traxler counter-attack',
    'wilkes-barre',
    'Wilkes Barre Variation',
  ])('resolves %j to the Traxler', (query) => {
    expect(resolveOpeningEntry(query)?.canonicalName).toBe(TRAXLER);
  });

  it('a query made only of category words never reaches the rare-token tier', () => {
    // `counter` is in ZERO shipped names and `gambit` in 1,207 — neither is
    // rare enough to identify anything, so the tier declines. This is the
    // property that keeps it safe: it resolves on NAMES, never on categories.
    // ("main line variation" is deliberately absent: all three of its tokens
    // really do occur together in "French Defense: Advance Variation, Main
    // Line", so the older token-set tier answers first. Same pre-existing
    // class as the substring case documented below, not this tier's doing.)
    for (const q of ['counter gambit', 'the gambit']) {
      expect(resolveOpeningEntry(q), `"${q}" must not resolve`).toBeNull();
    }
  });

  // ⚠️ PRE-EXISTING, NOT INTRODUCED BY THE RARE-TOKEN TIER — recorded so the
  // behaviour is visible rather than folklore. A bare category word still
  // resolves through the older SUBSTRING tier, which runs first: "gambit"
  // returns Benko Gambit, "variation" returns Ruy Lopez: Brix Variation. That
  // is the same disease as Danish-for-Traxler (a word that names no opening
  // handing back a specific one), one tier up, and it is a separate fix with
  // its own regression surface. This test pins today's behaviour so that fix is
  // a deliberate, visible change rather than an accident.
  it('DOCUMENTS the older substring tier still resolving bare category words', () => {
    expect(resolveOpeningEntry('gambit')?.canonicalName).toBe('Benko Gambit');
    expect(resolveOpeningEntry('defense')?.canonicalName).toBe('Slav Defense');
  });

  it('a rare name shared by unrelated openings resolves to nothing', () => {
    // `gunderam` appears under the Caro-Kann, the Semi-Slav, the
    // Blackmar-Diemer and the King's Pawn Game. Rare, but it names no single
    // opening — so picking one would be the same failure as Danish-for-Traxler.
    expect(resolveOpeningEntry("King's Pawn Game: Gunderam Gambit")).toBeNull();
  });

  it('adding correct words never breaks a name that resolves bare', () => {
    // The exact shape of the bug: extra, CORRECT information made the answer
    // worse. Guard it generally, not just for the Traxler.
    const pairs: [string, string][] = [
      ['najdorf', 'najdorf variation'],
      ['traxler', 'traxler counter gambit'],
      ['vienna game', 'vienna game main line'],
    ];
    for (const [bare, extended] of pairs) {
      const bareHit = resolveOpeningEntry(bare);
      if (!bareHit) continue;
      expect(resolveOpeningEntry(extended), `"${extended}" regressed vs "${bare}"`).not.toBeNull();
    }
  });
});

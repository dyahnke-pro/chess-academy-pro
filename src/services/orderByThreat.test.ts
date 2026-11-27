// Gap B1 — move order read off the board.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { orderByThreat } from './orderByThreat';
import { writerFor } from './writerRegister';

const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('orderByThreat', () => {
  // CORRECTED 2026-11-17: this test asserted "…e5 at once allows Bg5" — but
  // with …e5 played the knight on d4 is attacked, and Bg5 just drops it to
  // …exd4. The reason theory gives (Bb5+) is a check, which this computer does
  // not read; silence is the honest answer.
  it('the Najdorf: never "…e5 at once allows Bg5" — Bg5 drops the d4 knight', () => {
    const p = orderByThreat(after(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3']), 'a6', ['Be3', 'e5'], true, null);
    expect(p?.answer ?? '').not.toBe('Bg5');
  });
  it('a real allowance still speaks: …Bxc3 first, because …Ng6 at once allows Bg5', () => {
    const p = orderByThreat(after(['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'Bb4', 'd5', 'Ne7', 'Bd3', 'd6', 'O-O']), 'Bxc3', ['bxc3', 'Ng6'], true, null);
    expect(p?.answer).toBe('Bg5');
  });
  it('says nothing when the follow-up allows nothing new', () => {
    expect(orderByThreat(after(['e4', 'e5']), 'Nf3', ['Nc6', 'Bc4'], true, null)).toBeNull();
  });
  it('says nothing at the end of a line', () => {
    expect(orderByThreat(new Chess().fen(), 'e4', [], true, null)).toBeNull();
  });
});

describe('the order point never fears a reply that just loses material', () => {
  it('…e5 first allows no Bg5: …exd4 would win the knight (Danya 4T9 9…Nxd4)', () => {
    const r = orderByThreat('r1bq1rk1/pp2ppbp/2np1np1/3p4/2PN4/1N2B3/PPQ1PPPP/R3KB1R b KQ - 1 9', 'Nxd4', ['Bxd4', 'e5'], true, null);
    expect(r?.answer ?? '').not.toMatch(/Bg5/);
  });
});

describe('the order a check decides (David 2026-11-17: "Model Bb5+")', () => {
  // Najdorf: …a6 first, because …e5 at once allows Bb5+ (engine depth 20:
  // after …e5 Bb5+ is best, +0.62; after …a6 the position is -0.38).
  const NAJ = after(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3']);
  it('…e5 at once would allow Bb5+, then the knight comes to f5 hitting d6', () => {
    const p = orderByThreat(NAJ, 'a6', ['Be3', 'e5'], true, ['f1b5', 'b8d7', 'd4f5']);
    expect(p?.answer).toBe('Bb5+');
    expect(p?.follow).toBe('…e5');
    expect(p?.would).toMatch(/give check from b5/);
    expect(p?.would).toMatch(/their knight comes to f5, hitting your d-pawn/);
  });
  it('no engine line, no check claim', () => {
    expect(orderByThreat(NAJ, 'a6', ['Be3', 'e5'], true, null)?.answer ?? '').not.toBe('Bb5+');
  });
  it('a check the move played does not stop is no reason for the order', () => {
    // …g6 does nothing about Bb5+: no order point.
    expect(orderByThreat(NAJ, 'g6', ['Be3', 'e5'], true, ['f1b5', 'b8d7', 'd4f5'])?.answer ?? '').not.toBe('Bb5+');
  });
});


describe('the order and the stop on one reply are one idea (colle800 16.e5)', () => {
  it('"it stops …c4" speaks; "Re1 straight away would allow …c4" is the same idea and is held', async () => {
    const { moveThoughtFacts } = await import('./moveThoughtFacts');
    const { composeThought } = await import('./thoughtComposer');
    const { NO_PREV_CAPTURE } = await import('./captureRun');
    const sans = ['d4', 'd5', 'Nf3', 'Nf6', 'e3', 'e6', 'Bd3', 'c5', 'c3', 'Nc6', 'O-O', 'Be7', 'Nbd2', 'a6', 'e4', 'O-O'];
    const facts = moveThoughtFacts({ register: 'review', soundPlies: new Set<number>(), unpricedCredit: 'refused', moveReads: writerFor('review').moveReads, namesPlayedMove: true, fenBefore: after(sans), san: 'e5', plainThreatsSeen: false, tense: 'past', moverIsStudent: true,
      prev: NO_PREV_CAPTURE, line: ['Nd7', 'Re1', 'b5'], theirLast: null, story: false, history: sans, phrases: null, reads: null, costCp: null, theory: false });
    expect(facts.some((f) => f.computer === 'orderByThreat' && /…c4/.test(f.text))).toBe(true);
    expect(facts.some((f) => f.computer === 'moveStops' && /…c4/.test(f.text))).toBe(true);
    const spoken = composeThought(facts, 'review', null, new Set(), null).spoken;
    expect(spoken).toMatch(/stops …c4/);
    expect(spoken).not.toMatch(/would allow …c4/);
  }, 60_000);
});

// Clean-pass walk 2026-10-03, G1 (lichess SI5q0VJz) 23.Bxf6+: the coach said
// "That trades your active bishop for their passive one" — the bishop took a
// KNIGHT. The verdict names THEIR piece now, and a capture nobody takes back
// is a piece won, not a trade.
import { describe, it, expect } from 'vitest';
import { attributePrinciples } from './principleAttribution';
import { renderFundamentalVerdict } from './principleVoice';

const HIST = ['e4','c6','Nf3','d5','e5','Bf5','d4','e6','Nc3','c5','Bf4','Nc6','dxc5','Bxc5','Bb5','a6','Ba4','b5','Bb3','b4','Na4','Bb6','Nxb6','Qxb6','O-O','a5','a3','a4','Ba2','b3','cxb3','axb3','Bxb3','Na5','Ba2','Qxb2','Qa4+','Ke7','Bg5+','f6','exf6+','Nxf6','Rfc1','Nb7','Bxf6+'];

describe('traded-active-for-passive names the piece it took', () => {
  it('Bxf6+ took a knight: "for their passive knight"', () => {
    const attrs = attributePrinciples({
      replySan: null, historySans: HIST, bestSan: 'Rc7+', classification: 'mistake',
      // The engine's line after 23.Bxf6+ (Stockfish 18, depth 16).
      pvAfterPlayed: ['Kxf6', 'Qh4+', 'Kf7', 'Rc7+', 'Kg8'],
    });
    const a = attrs.find((x) => x.id === 'traded-active-for-passive');
    expect(a?.facts.taken).toBe('knight');
    const line = renderFundamentalVerdict([a!], { ply: 0, seen: new Set(), replySan: null });
    expect(line).toMatch(/your active bishop for their passive knight/);
    expect(line).not.toMatch(/passive one/);
  });
  it('no trade when the line does not take back', () => {
    const attrs = attributePrinciples({ replySan: null, historySans: HIST, bestSan: 'Rc7+', classification: 'mistake', pvAfterPlayed: ['Kf7', 'Qh4'] });
    expect(attrs.some((x) => x.id === 'traded-active-for-passive')).toBe(false);
  });
});

// Clean-pass walk 2026-10-04 (walk 5): the same 23.Bxf6+ said "the wrong side of
// the exchange" — Bxf6+ Qxf6 Rc7+ Kf8 Qxa8+ deflects the queen and wins the rook.
describe('a trade whose line wins is not the wrong side of one', () => {
  it('the played line wins the rook → no traded-active-for-passive', () => {
    const attrs = attributePrinciples({
      replySan: null, historySans: HIST, bestSan: 'Rc7+', classification: 'inaccuracy',
      pvAfterPlayed: ['Qxf6', 'Rc7+', 'Kf8', 'Qxa8+'],
    });
    expect(attrs.some((x) => x.id === 'traded-active-for-passive')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { classifyGameTheme } from './gameThemeClassifier';
import type { ReviewMoveSegment } from './coachFeatureService';

/**
 * The hand-labeled fixture corpus — the Phase-5 ship gate. Every fixture's
 * expected theme is a human judgment; the classifier must agree with ALL
 * of them (the plan's bar: <80% agreement → don't ship; this suite pins
 * 100%). When a predicate changes, re-judge the fixture by hand before
 * touching an expectation.
 */
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const OPP_WINGS = '2kr3r/pppq1ppp/2n2n2/4p3/4P3/2N2N2/PPPQ1PPP/3R1RK1 w - - 0 1';
const RP_ENDGAME = '4k3/1r3ppp/8/8/8/8/R4PPP/4K3 w - - 0 1';

function seg(
  ply: number,
  cls: ReviewMoveSegment['classification'],
  evalAfter: number,
  fen: string = START,
): ReviewMoveSegment {
  return {
    ply,
    moveNumber: Math.ceil(ply / 2),
    san: ply % 2 === 1 ? 'Nf3' : 'Nc6',
    playerColor: ply % 2 === 1 ? 'white' : 'black',
    fenBefore: fen,
    fenAfter: fen,
    classification: cls,
    evalBefore: null,
    evalAfter,
    bestMoveSan: null,
    bestMoveUci: null,
    narration: null,
  };
}

/** Quiet trace builder: n plies, all "good", eval from a function. */
function trace(n: number, evalAt: (ply: number) => number, fen: string = START): ReviewMoveSegment[] {
  return Array.from({ length: n }, (_, i) => seg(i + 1, 'good', evalAt(i + 1), fen));
}

describe('gameThemeClassifier — the emergent thread (Phase 5 fixture corpus)', () => {
  it('F1 squandered-advantage: winning, then handed back by the player', () => {
    const segs = trace(24, (p) => (p <= 12 ? p * 35 : p <= 14 ? 400 : 0));
    segs[14] = { ...segs[14], classification: 'blunder' }; // ply 15, White (the player)
    const r = classifyGameTheme(segs, 'white');
    expect(r?.theme).toBe('squandered-advantage');
    expect(r?.peakPly).toBe(15);
    expect(r?.line).toContain('handed it back');
  });

  it('F2 comeback: lost, then taken back off the opponent’s error', () => {
    const segs = trace(24, (p) => (p <= 12 ? -p * 35 : p <= 14 ? -400 : 300));
    segs[15] = { ...segs[15], classification: 'blunder' }; // ply 16, Black (the opponent)
    const r = classifyGameTheme(segs, 'white');
    expect(r?.theme).toBe('comeback');
    expect(r?.peakPly).toBe(16);
  });

  it('F3 one-slip: clean chess decided by a single moment', () => {
    const segs = trace(28, (p) => (p < 18 ? 20 : 300));
    segs[17] = { ...segs[17], classification: 'blunder' }; // ply 18, Black
    const r = classifyGameTheme(segs, 'white');
    expect(r?.theme).toBe('one-slip');
    expect(r?.peakPly).toBe(18);
  });

  it('F4 tactical-slugfest: errors both ways, advantage swinging', () => {
    const swing = [50, 300, -250, 200, -300, 250, -200, 350];
    const segs = trace(24, (p) => swing[Math.min(Math.floor((p - 1) / 3), swing.length - 1)]);
    segs[3] = { ...segs[3], classification: 'blunder' };   // ply 4  Black
    segs[6] = { ...segs[6], classification: 'blunder' };   // ply 7  White
    segs[9] = { ...segs[9], classification: 'mistake' };   // ply 10 Black
    segs[12] = { ...segs[12], classification: 'mistake' }; // ply 13 White
    const r = classifyGameTheme(segs, 'white');
    expect(r?.theme).toBe('tactical-slugfest');
  });

  it('F5 opposite-wing-race: castled apart, racing, real swing', () => {
    const segs = trace(28, (p) => Math.min(p * 12, 260), OPP_WINGS);
    segs[9] = { ...segs[9], classification: 'mistake' };  // ply 10 Black
    segs[16] = { ...segs[16], classification: 'mistake' }; // ply 17 White
    const r = classifyGameTheme(segs, 'white');
    expect(r?.theme).toBe('opposite-wing-race');
  });

  it('F6 endgame-grind: decided deep in the ending', () => {
    const segs = trace(36, (p) => (p < 24 ? 40 : 40 + (p - 24) * 25), RP_ENDGAME);
    segs[7] = { ...segs[7], classification: 'mistake' };  // ply 8  Black
    segs[10] = { ...segs[10], classification: 'mistake' }; // ply 11 White
    const r = classifyGameTheme(segs, 'white');
    expect(r?.theme).toBe('endgame-grind');
  });

  it('F7 positional-squeeze: no tactics, the eval walks one way', () => {
    const segs = trace(30, (p) => p * 12);
    const r = classifyGameTheme(segs, 'white');
    expect(r?.theme).toBe('positional-squeeze');
    expect(r?.peakPly).toBeGreaterThan(0);
  });

  it('F8 no theme: a quiet balanced draw stays honest — null', () => {
    const segs = trace(30, (p) => (p % 4 < 2 ? 30 : -30));
    expect(classifyGameTheme(segs, 'white')).toBeNull();
  });

  it('F9 too short to have a thread — null', () => {
    expect(classifyGameTheme(trace(8, () => 100), 'white')).toBeNull();
  });

  it('perspective flips: the same trace is a comeback for Black', () => {
    // F1's shape from Black's side: Black falls behind, White blunders it away.
    const segs = trace(24, (p) => (p <= 12 ? p * 35 : p <= 14 ? 400 : -300));
    segs[14] = { ...segs[14], classification: 'blunder' }; // ply 15, White
    const r = classifyGameTheme(segs, 'black');
    expect(r?.theme).toBe('comeback');
  });
});

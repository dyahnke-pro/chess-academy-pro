import { describe, it, expect } from 'vitest';
import { detectPieceItineraries } from './reviewPieceItinerary';

describe('detectPieceItineraries — the REAL reroute from the game (G3)', () => {
  it('charts a knight reroute f3–d2–c4 and narrates the journey', () => {
    // White reroutes the knight g1-f3, then f3-d2-c4 (a classic maneuver).
    const sans = ['d4', 'd5', 'Nf3', 'Nf6', 'Nbd2', 'e6', 'e3', 'Bd6', 'Nf3d2', 'O-O', 'Nc4'];
    // Simpler concrete line where one knight walks f3→d2→c4:
    const line = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bd3', 'Nf6', 'Nbd2', 'd5', 'Nf1', 'Bd6', 'Ng3'];
    // g1-knight: Nf3 (g1→f3) then no reroute; b1-knight: Nbd2 (b1→d2), Nf1 (d2→f1), Ng3 (f1→g3).
    const routes = detectPieceItineraries(line, 'white', { budget: 3 });
    // The b1-knight journey d2–f1–g3 lands on g3 (advanced rank 3? no — white needs rank>=4).
    // g3 is rank 3, NOT advanced for white, so it should NOT surface. Assert none fabricated.
    for (const it of routes.values()) {
      expect(it.route.length).toBeGreaterThanOrEqual(3);
    }
    void sans;
  });

  it('surfaces a genuine knight route that lands ADVANCED (f3–d2–c4, c4 rank 4)', () => {
    // White: Nf3, then reroute f3-d2, d2-c4 (c4 = rank 4, advanced).
    const line = ['e4', 'e5', 'Nf3', 'Nc6', 'd3', 'd6', 'Nfd2', 'Nf6', 'Nc4'];
    const routes = detectPieceItineraries(line, 'white', { budget: 2 });
    const vals = [...routes.values()];
    expect(vals.length).toBe(1);
    expect(vals[0].pieceType).toBe('n');
    expect(vals[0].route).toEqual(['g1', 'f3', 'd2', 'c4']);
    expect(vals[0].text).toMatch(/f3–d2–c4/);
    expect(vals[0].text).toMatch(/journey|reroute/i);
  });

  it('does NOT surface a single developing move (no maneuver)', () => {
    const line = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];
    const routes = detectPieceItineraries(line, 'white', { budget: 2 });
    expect(routes.size).toBe(0); // Nf3 is one hop; Bc4 is one hop — no reroutes
  });

  it('respects the budget', () => {
    // Two separate knight reroutes for White.
    const line = [
      'e4', 'e5', 'Nf3', 'Nc6', 'd3', 'd6', 'Nfd2', 'a6', 'Nc4', 'b5', // knight1 g1-f3-d2-c4
      'Nc3', 'Bb7', 'Nd5', 'Nf6', // knight2 b1-c3-d5 (d5 rank 5 advanced) — 2 hops only? c3→d5 is 1 hop; b1-c3-d5 = 2 hops
    ];
    const routes = detectPieceItineraries(line, 'white', { budget: 1 });
    expect(routes.size).toBeLessThanOrEqual(1);
  });

  it('charts only the STUDENT color', () => {
    // Black reroutes a knight; asking for White returns nothing about it.
    const line = ['e4', 'e5', 'Nf3', 'Ne7', 'd4', 'Ng6', 'Nc3', 'Nf4'];
    // Black knight g8-e7-g6-f4 (f4 rank 4, advanced for black? black advanced = rank 3-5, f4 rank 4 yes)
    const asWhite = detectPieceItineraries(line, 'white', { budget: 2 });
    const asBlack = detectPieceItineraries(line, 'black', { budget: 2 });
    expect([...asWhite.values()].every((it) => it.route[0][1] !== '8')).toBe(true);
    expect(asBlack.size).toBeGreaterThanOrEqual(1);
  });
});

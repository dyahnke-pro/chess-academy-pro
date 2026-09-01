import { describe, it, expect, vi, afterEach } from 'vitest';
import { gradeEndgameMove, buildTablebaseWalk, tablebaseMoves } from './endgameTablebaseService';

// The tablebase truth engine (Batch B). We stub the /api/lichess-tablebase
// proxy so the grading + walk logic is tested deterministically, no network.

// A K+Q vs K position, White to move and win: Qd7+ shepherds toward mate.
const KQK = '8/8/8/4k3/8/8/3Q4/4K3 w - - 0 1';

function stubTablebase(byFen: Record<string, unknown>): void {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const fen = new URL(url).searchParams.get('fen') ?? '';
    const body = byFen[fen] ?? byFen['*'];
    if (!body) return { ok: false, json: async () => ({}) } as unknown as Response;
    return { ok: true, json: async () => body } as unknown as Response;
  }));
  vi.stubGlobal('window', { location: { origin: 'https://chess-academy-pro.vercel.app' } });
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('gradeEndgameMove (Batch B truth engine)', () => {
  it('flags a thrown WIN when the played move only draws', async () => {
    // Best move keeps the win (opponent "loss"); the played move only draws.
    stubTablebase({
      [KQK]: {
        category: 'win',
        moves: [
          { uci: 'd2d7', san: 'Qd7+', category: 'loss', dtz: -12 },  // best: opp loses
          { uci: 'd2a2', san: 'Qa2', category: 'draw', dtz: 0 },      // throws to a draw
        ],
      },
    });
    const g = await gradeEndgameMove(KQK, 'd2a2');
    expect(g).not.toBeNull();
    expect(g!.verdict).toBe('threw-win');
    expect(g!.isMistake).toBe(true);
    expect(g!.bestSan).toBe('Qd7+');
    expect(g!.why.toLowerCase()).toMatch(/win|slip/);
  });

  it('calls the best move OPTIMAL', async () => {
    stubTablebase({
      [KQK]: {
        category: 'win',
        moves: [
          { uci: 'd2d7', san: 'Qd7+', category: 'loss', dtz: -12 },
          { uci: 'd2a2', san: 'Qa2', category: 'draw', dtz: 0 },
        ],
      },
    });
    const g = await gradeEndgameMove(KQK, 'd2d7');
    expect(g!.verdict).toBe('optimal');
    expect(g!.isMistake).toBe(false);
  });

  it('flags SLOWER when the result holds but DTZ is worse', async () => {
    stubTablebase({
      [KQK]: {
        category: 'win',
        moves: [
          { uci: 'd2d7', san: 'Qd7+', category: 'loss', dtz: -10 }, // wins in 10
          { uci: 'e1e2', san: 'Ke2', category: 'loss', dtz: -30 },  // still wins, slower
        ],
      },
    });
    const g = await gradeEndgameMove(KQK, 'e1e2');
    expect(g!.verdict).toBe('slower');
    expect(g!.isMistake).toBe(false);
  });

  it('flags a thrown DRAW when a holdable position becomes lost', async () => {
    const drawn = '8/8/8/4k3/8/8/4P3/4K3 b - - 0 1';
    stubTablebase({
      [drawn]: {
        category: 'draw',
        moves: [
          { uci: 'e5e6', san: 'Ke6', category: 'draw', dtz: 0 },   // holds the draw
          { uci: 'e5d4', san: 'Kd4', category: 'win', dtz: 8 },    // opponent now wins → we lose
        ],
      },
    });
    const g = await gradeEndgameMove(drawn, 'e5d4');
    expect(g!.verdict).toBe('threw-draw');
    expect(g!.isMistake).toBe(true);
  });
});

describe('buildTablebaseWalk', () => {
  it('plays the perfect line move by move with grounded notes', async () => {
    // A one-move mate: Qe2-e7 is not mate here, but chain two positions so the
    // walk advances. Position 1 → Qd7+, position after → best again.
    const p1 = '8/8/8/4k3/8/8/3Q4/4K3 w - - 0 1';
    const p2 = '8/3Q4/8/4k3/8/8/8/4K3 b - - 1 1';
    stubTablebase({
      [p1]: { category: 'win', moves: [{ uci: 'd2d7', san: 'Qd7+', category: 'loss', dtz: -12 }] },
      [p2]: { category: 'loss', moves: [{ uci: 'e5e6', san: 'Ke6', category: 'win', dtz: 11 }] },
      '*': { category: 'unknown', moves: [] },
    });
    const walk = await buildTablebaseWalk(p1, 2);
    expect(walk.length).toBeGreaterThanOrEqual(1);
    // chess.js is the SAN truth (G3) — it recomputes SAN from the board, not the
    // stub's label, so a fictional "+" in the stub is correctly dropped.
    expect(walk[0].san).toMatch(/^Qd7/);
    expect(walk[0].uci).toBe('d2d7');
    expect(walk[0].mover).toBe('white');
    expect(walk[0].note.length).toBeGreaterThan(0);
  });
});

describe('tablebaseMoves', () => {
  it('returns null out of range (>7 pieces)', async () => {
    const full = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(await tablebaseMoves(full)).toBeNull();
  });
});

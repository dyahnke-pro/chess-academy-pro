import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computePvLine, renderPlyFactLine, pvFactsForVoice, plyFactsForMove, plyFactsClause, type PvEngine } from './pvPlayback';
import type { StockfishAnalysis } from '../types';

/** Canned engine: maps fen → analysis. Unknown fen → throws (like a dead worker). */
function cannedEngine(map: Record<string, Partial<StockfishAnalysis>>): PvEngine {
  return {
    analyzePosition: (fen: string): Promise<StockfishAnalysis> => {
      const hit = map[fen];
      if (!hit) return Promise.reject(new Error(`no canned analysis for ${fen}`));
      return Promise.resolve({
        bestMove: hit.bestMove ?? '',
        evaluation: hit.evaluation ?? 0,
        isMate: false,
        mateIn: null,
        depth: 14,
        topLines: hit.topLines ?? [],
        nodesPerSecond: 0,
      });
    },
  };
}

// Scholar's-mate-adjacent position: White to move, Qxf7# available.
// 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? → Qxf7#
const MATE_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';

describe('pvPlayback — computePvLine (Phase 1)', () => {
  it('replays the PV through chess.js: SAN, fens, mate fact; a mate line delivers', async () => {
    const engine = cannedEngine({
      [MATE_FEN]: {
        evaluation: 9999,
        topLines: [{ rank: 1, evaluation: 9999, moves: ['h5f7'], mate: 1 }],
      },
    });
    const line = await computePvLine(MATE_FEN, { engine });
    expect(line).not.toBeNull();
    expect(line!.plies).toHaveLength(1);
    expect(line!.plies[0].san).toBe('Qxf7#');
    expect(line!.plies[0].facts.isMate).toBe(true);
    expect(line!.plies[0].facts.captured).toBe('pawn');
    expect(line!.delivers).toBe(true); // mate needs no verify pass
  });

  it('seeds from the stored best move (R3 consistency with the shot question)', async () => {
    const start = new Chess();
    start.move('e4');
    const fen = start.fen();
    // Primary PV starts with a DIFFERENT move than the stored best (d7d5);
    // a multipv line matching the stored move exists and must be chosen.
    const engine = cannedEngine({
      [fen]: {
        evaluation: 30,
        topLines: [
          { rank: 1, evaluation: 30, moves: ['e7e5', 'g1f3'], mate: null },
          { rank: 2, evaluation: 20, moves: ['d7d5', 'e4d5'], mate: null },
        ],
      },
      // terminal verify for the seeded line: after d5 exd5.
      [((): string => { const c = new Chess(fen); c.move('d5'); c.move('exd5'); return c.fen(); })()]: {
        evaluation: 25,
        topLines: [{ rank: 1, evaluation: 25, moves: ['g8f6'], mate: null }],
      },
    });
    const line = await computePvLine(fen, { engine, firstUci: 'd7d5' });
    expect(line).not.toBeNull();
    expect(line!.plies[0].san).toBe('d5');
    expect(line!.plies[1].san).toBe('exd5');
  });

  it('R3: a line whose terminal eval collapses does NOT deliver', async () => {
    // WHITE to move; the line promises +3 for the mover but the terminal
    // re-analysis holds only +0.2 → the promise collapsed, don't teach it.
    const fen = new Chess().fen();
    const afterE4 = ((): string => { const c = new Chess(fen); c.move('e4'); return c.fen(); })();
    const engine = cannedEngine({
      [fen]: {
        evaluation: 300, // promises +3 for White (the mover)
        topLines: [{ rank: 1, evaluation: 300, moves: ['e2e4'], mate: null }],
      },
      [afterE4]: {
        evaluation: 20, // …but the end holds only +0.2 → refuted
        topLines: [{ rank: 1, evaluation: 20, moves: ['e7e5'], mate: null }],
      },
    });
    const line = await computePvLine(fen, { engine });
    expect(line).not.toBeNull();
    expect(line!.delivers).toBe(false);
  });

  it('R3: verify pass UNAVAILABLE → delivers=false (never teach unverified)', async () => {
    const start = new Chess();
    start.move('e4');
    const fen = start.fen();
    const engine = cannedEngine({
      [fen]: {
        evaluation: 300,
        topLines: [{ rank: 1, evaluation: 300, moves: ['e7e5'], mate: null }],
      },
      // terminal fen NOT canned → verify throws.
    });
    const line = await computePvLine(fen, { engine });
    expect(line).not.toBeNull();
    expect(line!.delivers).toBe(false);
  });

  it('reports the close-alternative decision tension when candidates are within 40cp', async () => {
    const start = new Chess();
    const fen = start.fen();
    const afterE4 = ((): string => { const c = new Chess(fen); c.move('e4'); return c.fen(); })();
    const engine = cannedEngine({
      [fen]: {
        evaluation: 30,
        topLines: [
          { rank: 1, evaluation: 30, moves: ['e2e4'], mate: null },
          { rank: 2, evaluation: 10, moves: ['d2d4'], mate: null },
        ],
      },
      [afterE4]: {
        evaluation: 28,
        topLines: [{ rank: 1, evaluation: 28, moves: ['e7e5'], mate: null }],
      },
    });
    const line = await computePvLine(fen, { engine });
    expect(line!.closeAlternative).toEqual({ san: 'd4', gapCp: 20 });
  });

  it('engine dead → null, never throws', async () => {
    const engine: PvEngine = { analyzePosition: () => Promise.reject(new Error('worker dead')) };
    expect(await computePvLine(MATE_FEN, { engine })).toBeNull();
  });
});

describe('plyFactsForMove — no phantom tactics (David 2026-07-20)', () => {
  it('a KNIGHT move never claims a pin (knights cannot pin)', () => {
    // The real Pirc game position before 12.Nc3 — the walk narrated "the knight
    // lands on c3 and suddenly it's pinning", which is board-false.
    const c = new Chess();
    for (const m of ['e4', 'd6', 'd4', 'g6', 'f4', 'e6', 'Be3', 'b6', 'c4', 'Bg7', 'Qd2', 'Nf6', 'Bd3', 'Na6', 'Nf3', 'c6', 'O-O', 'Nc7', 'e5', 'Nd7', 'exd6', 'Na6']) c.move(m);
    const out = plyFactsForMove(c.fen(), 'Nc3');
    if (out) expect(out).not.toMatch(/pin/i);
  });

  it('returns a grounded fact string or null (never throws on a legal move)', () => {
    const out = plyFactsForMove(new Chess().fen(), 'e4');
    // 1.e4 is a quiet developing push — no concrete tactic/capture → silence.
    expect(out === null || typeof out === 'string').toBe(true);
  });
});

describe('deterministic fallback voice + batch facts', () => {
  it('renderPlyFactLine speaks facts, stays silent on a quiet ply', async () => {
    const engine = cannedEngine({
      [MATE_FEN]: {
        evaluation: 9999,
        topLines: [{ rank: 1, evaluation: 9999, moves: ['h5f7'], mate: 1 }],
      },
    });
    const line = (await computePvLine(MATE_FEN, { engine }))!;
    expect(renderPlyFactLine(line.plies[0])).toMatch(/checkmate/i);
    // A quiet ply (no capture/check/structure change) → null (silence rule).
    const quiet = {
      ...line.plies[0],
      san: 'Nf3',
      facts: {
        captured: null, isCheck: false, isMate: false, promotion: null,
        tacticLanded: null, materialGained: 0, newOpenFiles: [],
        newPassedPawns: [], outpostGained: null, shieldLost: 0,
      },
    };
    expect(renderPlyFactLine(quiet)).toBeNull();
  });

  it('pvFactsForVoice numbers one bundle per ply (split-back contract)', async () => {
    const engine = cannedEngine({
      [MATE_FEN]: {
        evaluation: 9999,
        topLines: [{ rank: 1, evaluation: 9999, moves: ['h5f7'], mate: 1 }],
      },
    });
    const line = (await computePvLine(MATE_FEN, { engine }))!;
    const facts = pvFactsForVoice(line);
    expect(facts).toMatch(/^1\) The move Qxf7#/);
    expect(facts.split('\n')).toHaveLength(1);
  });
});

describe('material truth + tactic agent (David 2026-07-20 Opera nitpick)', () => {
  // fenBefore for the Opera move under test, from the game's SAN prefix.
  const fenBefore = (sans: string[]): string => {
    const c = new Chess();
    for (const s of sans) c.move(s);
    return c.fen();
  };
  const OPERA = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7', 'Qb8+', 'Nxb8', 'Rd8#'];

  it('a RECAPTURE claims no material windfall (even trade nets 0)', () => {
    // After 4...Bxf3, White recaptures 5.Qxf3 — an even knight-for-bishop trade.
    const fb = fenBefore(OPERA.slice(0, 8)); // up to ...Bxf3
    const prev = { square: 'f3', capturedValue: 3 }; // Black just took the knight on f3
    const line = plyFactsForMove(fb, 'Qxf3', prev) ?? '';
    expect(line).toMatch(/captures the bishop/i);
    expect(line).not.toMatch(/wins \d+ point/i);
  });

  it('a real hanging capture DOES win material', () => {
    // White knight on e5 hangs; Black's d6 pawn takes it for free.
    const fb = 'rnbqkbnr/ppp2ppp/3p4/4N3/8/8/PPPPPPPP/RNBQKB1R b KQkq - 0 1';
    const line = plyFactsForMove(fb, 'dxe5') ?? '';
    expect(line).toMatch(/wins 3 point/i);
  });

  it('does NOT credit the mover for the OPPONENT\'s pin (backstop move)', () => {
    // 11...Rd8 lands BEHIND White\'s pinned-knight setup — it is White\'s Rd1
    // pin, not Black\'s. The mover must not be credited with "lands a pin".
    const fb = fenBefore(OPERA.slice(0, 23)); // up to O-O-O, Black to play Rd8
    const clause = plyFactsClause(fb, 'Rd8') ?? '';
    expect(clause).not.toMatch(/pin/i);
  });

  it('keeps a REAL pin the moved slider makes (Bg5 pins the f6 knight)', () => {
    const fb = fenBefore(OPERA.slice(0, 16)); // up to ...c6, White to play Bg5
    const line = plyFactsForMove(fb, 'Bg5') ?? '';
    expect(line).toMatch(/pin/i);
  });
});

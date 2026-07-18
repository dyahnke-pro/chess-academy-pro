import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computePvLine, renderPlyFactLine, pvFactsForVoice, type PvEngine } from './pvPlayback';
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

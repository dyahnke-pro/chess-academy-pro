// refutedAlternative — the composed theory fact (unified-coach N3, plan §3.4):
// DB-popular sibling + engine cost graded at the quiet end + the concept the
// punishment lands. G0/G3: every field computed; positional → concept null.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { refutedAlternative, pickAlternative, candidatesFromMasters, renderRefutedAlternative, candidatesForPosition, type AlternativeCandidate } from './refutedAlternative';
import type { PvEngine } from './pvPlayback';
import type { StockfishAnalysis } from '../types';

/** Canned engine: fen → analysis; unknown fen → a flat 0 read (a quiet end that
 *  does not "deliver", so the root promise is what gets graded). */
function cannedEngine(map: Record<string, Partial<StockfishAnalysis>>): PvEngine {
  return {
    analyzePosition: (fen: string): Promise<StockfishAnalysis> => {
      const hit = map[fen] ?? {};
      return Promise.resolve({
        bestMove: hit.bestMove ?? '', evaluation: hit.evaluation ?? 0, isMate: false, mateIn: null,
        depth: 12, topLines: hit.topLines ?? [], nodesPerSecond: 0,
      });
    },
  };
}

// 1.e4 e5 2.Bc4 Nc6 3.Qh5 — Black to move. Taught: g6. The tempting Nf6??
// walks into Qxf7#.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
/** The position after a UCI line — so the canned engine can answer the R3
 *  terminal verify with the SAME eval the line promised (a quiet end that
 *  holds). Without this the flat default 0 makes every line "deliver" at 0. */
function after(fen: string, ucis: string[]): string {
  const c = new Chess(fen);
  for (const u of ucis) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u.slice(4) : undefined });
  return c.fen();
}
const MASTERS = [{ san: 'g6', games: 400 }, { san: 'Nf6', games: 300 }, { san: 'Qe7', games: 100 }];

describe('pickAlternative / candidatesFromMasters', () => {
  it('picks the most-played sibling that is not the taught move', () => {
    const cands = candidatesFromMasters(MASTERS);
    expect(cands[0]).toEqual({ san: 'g6', games: 400, pct: 50 });
    expect(pickAlternative('g6', cands)?.san).toBe('Nf6');
    expect(pickAlternative('Nf6', cands)?.san).toBe('g6');
  });
  it('no candidates / only the taught move → null', () => {
    expect(pickAlternative('g6', [])).toBeNull();
    expect(pickAlternative('g6', [{ san: 'g6', games: 9, pct: 100 }])).toBeNull();
    expect(candidatesFromMasters(null)).toEqual([]);
  });
});

describe('refutedAlternative', () => {
  it('composes the popular sibling, the engine cost, the punishing line and the concept it lands', async () => {
    const engine = cannedEngine({
      [FEN]: {
        evaluation: 30,
        topLines: [
          { rank: 1, moves: ['g7g6', 'h5f3'], evaluation: 30, mate: null },
          { rank: 2, moves: ['g8f6', 'h5f7'], evaluation: 9999, mate: 1 },
        ],
      },
    });
    const r = await refutedAlternative({ fenBefore: FEN, taughtSan: 'g6', candidates: candidatesFromMasters(MASTERS), studentColor: 'black', engine });
    expect(r).not.toBeNull();
    expect(r!.alt).toBe('Nf6');
    expect(r!.pct).toBe(38);
    expect(r!.costCp).toBeGreaterThan(1000);
    expect(r!.lineSans).toEqual(['Nf6', 'Qxf7#']);
    expect(r!.concept).not.toBeNull();
    expect(r!.text).toMatch(/^38% of masters play Nf6 here/);
    expect(r!.text).toMatch(/g6 keeps that off the board/);
  });

  it('an alternative that does not clear the rating band is NOT a lesson (null)', async () => {
    const engine = cannedEngine({
      [FEN]: {
        evaluation: 30,
        topLines: [
          { rank: 1, moves: ['g7g6', 'h5f3'], evaluation: 30, mate: null },
          { rank: 2, moves: ['g8f6', 'h5f3'], evaluation: 50, mate: null }, // 20cp — a coin flip
        ],
      },
      [after(FEN, ['g7g6', 'h5f3'])]: { evaluation: 30 },
      [after(FEN, ['g8f6', 'h5f3'])]: { evaluation: 50 },
    });
    const r = await refutedAlternative({ fenBefore: FEN, taughtSan: 'g6', candidates: candidatesFromMasters(MASTERS), studentColor: 'black', engine });
    expect(r).toBeNull();
  });

  it('a positional punishment states the cost and never invents a motif', async () => {
    const engine = cannedEngine({
      [FEN]: {
        evaluation: 30,
        topLines: [
          { rank: 1, moves: ['g7g6', 'h5f3'], evaluation: 30, mate: null },
          { rank: 2, moves: ['d8e7', 'h5f3'], evaluation: 130, mate: null }, // 100cp worse, nothing lands
        ],
      },
      [after(FEN, ['g7g6', 'h5f3'])]: { evaluation: 30 },
      [after(FEN, ['d8e7', 'h5f3'])]: { evaluation: 130 },
    });
    const cands: AlternativeCandidate[] = [{ san: 'g6', games: 400, pct: 80 }, { san: 'Qe7', games: 100, pct: 20 }];
    const r = await refutedAlternative({ fenBefore: FEN, taughtSan: 'g6', candidates: cands, studentColor: 'black', engine });
    expect(r).not.toBeNull();
    expect(r!.concept).toBeNull();
    expect(r!.text).toMatch(/costs about 1\.0 points/);
    expect(r!.text).not.toMatch(/fork|pin|mate/i);
  });

  it('a dead engine → null, never a throw', async () => {
    const engine: PvEngine = { analyzePosition: () => Promise.reject(new Error('dead')) };
    await expect(refutedAlternative({ fenBefore: FEN, taughtSan: 'g6', candidates: candidatesFromMasters(MASTERS), studentColor: 'black', engine })).resolves.toBeNull();
  });

  it('renderRefutedAlternative is a template over the facts (pure)', () => {
    const t = renderRefutedAlternative({ alt: 'Nf6', games: 300, pct: 38, costCp: 900, line: null, concept: { id: 'mate', name: 'Checkmate', full: 'The queen lands on f7 with the bishop covering it — mate.', short: 'mate' }, lineSans: ['Nf6', 'Qxf7#'], proofResult: "it's mate" }, 'g6');
    expect(t).toBe("38% of masters play Nf6 here, and it walks into a checkmate: Nf6 and Qxf7# — it's mate. The queen lands on f7 with the bishop covering it — mate. g6 keeps that off the board.");
  });

  it('a line that proves nothing is not recited (the line as proof)', () => {
    const t = renderRefutedAlternative({ alt: 'a6', games: 40, pct: 12, costCp: 150, line: null, concept: null, lineSans: [], proofResult: null }, 'Nf3');
    expect(t).not.toMatch(/line runs/);
    expect(t).toMatch(/costs about 1\.5 points/);
  });

  it('players at the student\'s level come first; masters are the fallback', async () => {
    const { __seedAmateurPlayCache, __clearAmateurPlayCache } = await import('./amateurPlayCache');
    __clearAmateurPlayCache();
    expect(candidatesForPosition(FEN, MASTERS).every((c) => c.source === 'masters')).toBe(true);
    __seedAmateurPlayCache(FEN, { band: '1000,1200', bandLabel: 'around 1000–1200', totalGames: 100, moves: [{ san: 'Nf6', games: 60, pct: 60 }, { san: 'g6', games: 40, pct: 40 }] });
    const c = candidatesForPosition(FEN, MASTERS);
    expect(c[0]).toEqual({ san: 'Nf6', games: 60, pct: 60, source: 'amateur' });
    const t = renderRefutedAlternative({ alt: 'Nf6', games: 60, pct: 60, costCp: 150, line: null, concept: null, lineSans: [], source: 'amateur' }, 'g6');
    expect(t).toMatch(/^Most players at your level play Nf6 here \(60%\)/);
    __clearAmateurPlayCache();
  });

  it('NEGATIVE CONTROL: a stray move is not what people reach for, and "most" means most', () => {
    // 1% alternative → no alternative at all (the prod "Most people … (1%)").
    expect(pickAlternative('e6', [{ san: 'e6', games: 990, pct: 99 }, { san: 'Bg6', games: 10, pct: 1 }])).toBeNull();
    const t = renderRefutedAlternative({ alt: 'Nf6', games: 30, pct: 30, costCp: 150, line: null, concept: null, lineSans: [], source: 'amateur' }, 'g6');
    expect(t).toMatch(/^30% of players at your level play Nf6 here/);
    expect(t).not.toMatch(/^Most/);
  });
});

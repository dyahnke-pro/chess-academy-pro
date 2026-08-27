import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import type { WalkthroughTree, BakedGemLine } from '../types/walkthroughTree';

// Mock the engine + explorer so discovery is deterministic.
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: { analyzeWithBudget: vi.fn() },
}));
vi.mock('./amateurPlayLookup', () => ({ lookupAmateurPlay: vi.fn() }));
vi.mock('../db/schema', () => ({ db: { meta: { get: vi.fn(async () => undefined), put: vi.fn(async () => undefined) } } }));
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn() }));

import { stockfishEngine } from './stockfishEngine';
import { lookupAmateurPlay } from './amateurPlayLookup';

const analyzeMock = () => stockfishEngine.analyzeWithBudget as unknown as ReturnType<typeof vi.fn>;
import {
  collectWalkPositions,
  bakeFoundGemsIntoTree,
  findGemsForLine,
} from './gemFinder';

function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

// Linear tree e4 e5 Nf3 for the pure walkers.
function miniTree(): WalkthroughTree {
  return {
    openingName: 'T', eco: 'C', intro: '', outro: '',
    root: { san: null, movedBy: null, idea: '', children: [
      { node: { san: 'e4', movedBy: 'white', idea: '', children: [
        { node: { san: 'e5', movedBy: 'black', idea: '', children: [
          { node: { san: 'Nf3', movedBy: 'white', idea: '', children: [] } },
        ] } },
      ] } },
    ] },
  } as WalkthroughTree;
}

describe('collectWalkPositions', () => {
  it('marks opponent-to-move correctly for a white student', () => {
    const pos = collectWalkPositions(miniTree(), 'white');
    // after e4 → black (opponent) to move; after e5 → white (student); after Nf3 → black
    expect(pos).toHaveLength(3);
    expect(pos[0].opponentToMove).toBe(true);
    expect(pos[1].opponentToMove).toBe(false);
    expect(pos[2].opponentToMove).toBe(true);
  });
});

describe('bakeFoundGemsIntoTree', () => {
  const detour: BakedGemLine = {
    gemId: 'found:x', kind: 'weapon', title: 't', inaccuracy: 'f6', baseFen: 'x',
    steps: [{ san: 'f6', fen: 'y', idea: 'i', shortIdea: 's', arrows: [] }],
  };
  it('attaches by 4-field position key and dedupes', () => {
    const tree = miniTree();
    const key = fenAfter(['e4']).split(' ').slice(0, 4).join(' ');
    const found = new Map([[key, [detour]]]);
    expect(bakeFoundGemsIntoTree(tree, found)).toBe(1);
    // the e4 node got it
    const e4 = tree.root.children[0].node;
    expect(e4.gems?.[0].gemId).toBe('found:x');
    // second bake is a no-op (already spliced)
    expect(bakeFoundGemsIntoTree(tree, found)).toBe(0);
  });
});

describe('findGemsForLine (mocked engine/explorer)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('discovers a weapon when a human slip has an engine-verified punish', async () => {
    const baseFen = fenAfter(['e4']); // black (opponent) to move
    (lookupAmateurPlay as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      fen: baseFen, totalGames: 1000, source: 'lichess-live',
      moves: [{ san: 'f6', uci: 'f7f6', games: 120, white: 60, draws: 20, black: 40, whitePct: 60, drawPct: 20, blackPct: 40, averageRating: 1800 }],
    });
    // base eval (student ~even) then after-slip eval (student clearly better)
    // whose PV is the punish line (UCI), replayed legally from the after-slip FEN.
    analyzeMock()
      .mockResolvedValueOnce({ evaluation: 20, bestMove: 'g1f3', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 20, moves: ['g1f3'], mate: null }] })
      .mockResolvedValueOnce({ evaluation: 260, bestMove: 'd2d4', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 260, moves: ['d2d4', 'g8f6'], mate: null }] });

    const found = await findGemsForLine([{ fen: baseFen, opponentToMove: true }], 'white', 5000);
    const key = baseFen.split(' ').slice(0, 4).join(' ');
    expect(found.get(key)?.length).toBe(1);
    const gem = found.get(key)![0];
    expect(gem.kind).toBe('weapon');
    expect(gem.inaccuracy).toBe('f6');
    // detour plays [f6, d4] legally from the base.
    const b = new Chess(gem.baseFen);
    for (const s of gem.steps) expect(b.move(s.san)).toBeTruthy();
  });

  it('engine-only fallback: teaches a decisive refutation when the explorer is SILENT', async () => {
    const baseFen = fenAfter(['e4']); // black (opponent) to move, no human sample
    (lookupAmateurPlay as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      fen: baseFen, totalGames: 0, source: 'none', moves: [],
    });
    analyzeMock()
      // 1) engineOnlySlips: black's best (…e5, ~even) + a slip (…f6, white much better).
      .mockResolvedValueOnce({ evaluation: 20, bestMove: 'e7e5', isMate: false, mateIn: null, depth: 12,
        topLines: [ { rank: 1, evaluation: 20, moves: ['e7e5'], mate: null }, { rank: 2, evaluation: 160, moves: ['f7f6'], mate: null } ] })
      // 2) verifySlip base eval (student ~even before the slip)
      .mockResolvedValueOnce({ evaluation: 20, bestMove: 'g1f3', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 20, moves: ['g1f3'], mate: null }] })
      // 3) verifySlip after-slip eval — DECISIVE (≥ +1.0 confirmed tier), PV = the punish
      .mockResolvedValueOnce({ evaluation: 300, bestMove: 'd2d4', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 300, moves: ['d2d4'], mate: null }] });

    const found = await findGemsForLine([{ fen: baseFen, opponentToMove: true }], 'white', 5000);
    const key = baseFen.split(' ').slice(0, 4).join(' ');
    expect(found.get(key)?.length).toBe(1);
    expect(found.get(key)![0].inaccuracy).toBe('f6');
  });

  it('engine-only fallback: REJECTS a merely-inferior slip that only reaches the +0.5 edge (no frequency → confirmed tier only)', async () => {
    const baseFen = fenAfter(['e4']);
    (lookupAmateurPlay as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ fen: baseFen, totalGames: 0, source: 'none', moves: [] });
    analyzeMock()
      .mockResolvedValueOnce({ evaluation: 20, bestMove: 'e7e5', isMate: false, mateIn: null, depth: 12,
        topLines: [ { rank: 1, evaluation: 20, moves: ['e7e5'], mate: null }, { rank: 2, evaluation: 160, moves: ['f7f6'], mate: null } ] })
      .mockResolvedValueOnce({ evaluation: 20, bestMove: 'g1f3', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 20, moves: ['g1f3'], mate: null }] })
      // after-slip only +0.7 — clears the explorer +0.5 tier but NOT the +1.0 confirmed bar the engine-only path demands.
      .mockResolvedValueOnce({ evaluation: 70, bestMove: 'd2d4', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 70, moves: ['d2d4'], mate: null }] });
    const found = await findGemsForLine([{ fen: baseFen, opponentToMove: true }], 'white', 5000);
    expect(found.size).toBe(0);
  });

  it('rejects a slip whose punish is not a real jump', async () => {
    const baseFen = fenAfter(['e4']);
    (lookupAmateurPlay as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      fen: baseFen, totalGames: 1000, source: 'lichess-live',
      moves: [{ san: 'e5', uci: 'e7e5', games: 500, white: 33, draws: 34, black: 33, whitePct: 33, drawPct: 34, blackPct: 33, averageRating: 1800 }],
    });
    analyzeMock()
      .mockResolvedValueOnce({ evaluation: 20, bestMove: 'g1f3', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 20, moves: ['g1f3'], mate: null }] })
      .mockResolvedValueOnce({ evaluation: 25, bestMove: 'g1f3', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 25, moves: ['g1f3'], mate: null }] }); // no jump
    const found = await findGemsForLine([{ fen: baseFen, opponentToMove: true }], 'white', 5000);
    expect(found.size).toBe(0);
  });
});

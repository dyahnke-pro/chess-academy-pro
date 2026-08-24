import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import type { WalkthroughTree, BakedGemLine } from '../types/walkthroughTree';

// Mock the engine + explorer + playout so discovery is deterministic.
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: { analyzePosition: vi.fn() },
}));
vi.mock('./amateurPlayLookup', () => ({ lookupAmateurPlay: vi.fn() }));
vi.mock('./punishPlayout', () => ({
  playOutPunish: vi.fn(),
  advantageAlreadyShown: vi.fn(() => true), // skip the playout in the test
}));
vi.mock('../db/schema', () => ({ db: { meta: { get: vi.fn(async () => undefined), put: vi.fn(async () => undefined) } } }));
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn() }));

import { stockfishEngine } from './stockfishEngine';
import { lookupAmateurPlay } from './amateurPlayLookup';
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
    // base eval (student ~even) then after-slip eval (student clearly better) with a legal punish UCI.
    const analyze = stockfishEngine.analyzePosition as unknown as ReturnType<typeof vi.fn>;
    analyze
      .mockResolvedValueOnce({ evaluation: 20, bestMove: 'g1f3', isMate: false, mateIn: null, depth: 16, topLines: [] })
      .mockResolvedValueOnce({ evaluation: 260, bestMove: 'd2d4', isMate: false, mateIn: null, depth: 16, topLines: [] });

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

  it('rejects a slip whose punish is not a real jump', async () => {
    const baseFen = fenAfter(['e4']);
    (lookupAmateurPlay as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      fen: baseFen, totalGames: 1000, source: 'lichess-live',
      moves: [{ san: 'e5', uci: 'e7e5', games: 500, white: 33, draws: 34, black: 33, whitePct: 33, drawPct: 34, blackPct: 33, averageRating: 1800 }],
    });
    const analyze = stockfishEngine.analyzePosition as unknown as ReturnType<typeof vi.fn>;
    analyze
      .mockResolvedValueOnce({ evaluation: 20, bestMove: 'g1f3', isMate: false, mateIn: null, depth: 16, topLines: [] })
      .mockResolvedValueOnce({ evaluation: 25, bestMove: 'g1f3', isMate: false, mateIn: null, depth: 16, topLines: [] }); // no jump
    const found = await findGemsForLine([{ fen: baseFen, opponentToMove: true }], 'white', 5000);
    expect(found.size).toBe(0);
  });
});

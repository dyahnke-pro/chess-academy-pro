import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import type { WalkthroughTree, BakedGemLine } from '../types/walkthroughTree';

// Mock the engine + explorer so discovery is deterministic.
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: { analyzeWithBudget: vi.fn() },
}));
vi.mock('./amateurPlayLookup', () => ({ lookupAmateurPlay: vi.fn() }));
vi.mock('./masterPlayLookup', () => ({ lookupMasterPlay: vi.fn() }));
vi.mock('../db/schema', () => ({ db: { meta: { get: vi.fn(async () => undefined), put: vi.fn(async () => undefined) } } }));
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn() }));

import { stockfishEngine } from './stockfishEngine';
import { lookupAmateurPlay } from './amateurPlayLookup';
import { lookupMasterPlay } from './masterPlayLookup';

const analyzeMock = () => stockfishEngine.analyzeWithBudget as unknown as ReturnType<typeof vi.fn>;
const masterMock = () => lookupMasterPlay as unknown as ReturnType<typeof vi.fn>;
/** No master pedigree at the position by default — the pedigree gate filters
 *  nothing, so a test's candidate slips reach the engine unless it overrides. */
function noMasterPedigree(fen: string): void {
  masterMock().mockResolvedValue({ fen, totalGames: 0, source: 'none', moves: [] });
}
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

  // A base position (Black/opponent to move) where 2…Qh4?? hangs the queen to
  // 3.Nxh4 — a real MATERIAL win the finder should surface.
  const QUEEN_HANG_FEN = fenAfter(['e4', 'e5', 'Nf3']);

  it('discovers a weapon when a human slip DROPS MATERIAL to an engine-verified punish', async () => {
    const baseFen = QUEEN_HANG_FEN;
    noMasterPedigree(baseFen);
    (lookupAmateurPlay as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      fen: baseFen, totalGames: 1000, source: 'lichess-live',
      moves: [{ san: 'Qh4', uci: 'd8h4', games: 120, white: 70, draws: 10, black: 20, whitePct: 70, drawPct: 10, blackPct: 20, averageRating: 1800 }],
    });
    analyzeMock()
      // base eval (student ~even before the slip)
      .mockResolvedValueOnce({ evaluation: 30, bestMove: 'b1c3', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 30, moves: ['b1c3'], mate: null }] })
      // after-slip screen — decisive, PV wins the queen (Nxh4)
      .mockResolvedValueOnce({ evaluation: 900, bestMove: 'f3h4', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 900, moves: ['f3h4'], mate: null }] })
      // deep confirm — agrees
      .mockResolvedValueOnce({ evaluation: 900, bestMove: 'f3h4', isMate: false, mateIn: null, depth: 16, topLines: [{ rank: 1, evaluation: 900, moves: ['f3h4'], mate: null }] });

    const found = await findGemsForLine([{ fen: baseFen, opponentToMove: true }], 'white', 5000);
    const key = baseFen.split(' ').slice(0, 4).join(' ');
    expect(found.get(key)?.length).toBe(1);
    const gem = found.get(key)![0];
    expect(gem.kind).toBe('weapon');
    expect(gem.inaccuracy).toBe('Qh4');
    // the slip narration is grounded in the real consequence, never "looks natural but a mistake"
    expect(gem.steps[0].idea.toLowerCase()).toContain('drops material');
    expect(gem.steps[0].idea.toLowerCase()).not.toContain('looks natural');
    // detour plays [Qh4, Nxh4] legally from the base.
    const b = new Chess(gem.baseFen);
    for (const s of gem.steps) expect(b.move(s.san)).toBeTruthy();
  });

  it('engine-only fallback: teaches a decisive MATERIAL-winning refutation when the explorer is SILENT', async () => {
    const baseFen = QUEEN_HANG_FEN;
    noMasterPedigree(baseFen);
    (lookupAmateurPlay as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ fen: baseFen, totalGames: 0, source: 'none', moves: [] });
    analyzeMock()
      // 1) engineOnlySlips: black's best (~even) + a slip (…Qh4, white winning)
      .mockResolvedValueOnce({ evaluation: 20, bestMove: 'b8c6', isMate: false, mateIn: null, depth: 12,
        topLines: [ { rank: 1, evaluation: 20, moves: ['b8c6'], mate: null }, { rank: 2, evaluation: 900, moves: ['d8h4'], mate: null } ] })
      // 2) verifySlip base eval
      .mockResolvedValueOnce({ evaluation: 30, bestMove: 'b1c3', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 30, moves: ['b1c3'], mate: null }] })
      // 3) after-slip screen — decisive, PV = Nxh4
      .mockResolvedValueOnce({ evaluation: 900, bestMove: 'f3h4', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 900, moves: ['f3h4'], mate: null }] })
      // 4) deep confirm
      .mockResolvedValueOnce({ evaluation: 900, bestMove: 'f3h4', isMate: false, mateIn: null, depth: 16, topLines: [{ rank: 1, evaluation: 900, moves: ['f3h4'], mate: null }] });

    const found = await findGemsForLine([{ fen: baseFen, opponentToMove: true }], 'white', 5000);
    const key = baseFen.split(' ').slice(0, 4).join(' ');
    expect(found.get(key)?.length).toBe(1);
    expect(found.get(key)![0].inaccuracy).toBe('Qh4');
  });

  it('MASTER-PEDIGREE gate: never flags a move masters play, without touching the engine', async () => {
    const baseFen = fenAfter(['e4']); // 1.e4, Black to move
    // Masters overwhelmingly play …e5 here — so it is NEVER a "slip", even though
    // the explorer offers it as a candidate. This is the c5/e5 fix (David 2026-09-10).
    (lookupAmateurPlay as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      fen: baseFen, totalGames: 1000, source: 'lichess-live',
      moves: [{ san: 'e5', uci: 'e7e5', games: 500, white: 33, draws: 34, black: 33, whitePct: 33, drawPct: 34, blackPct: 33, averageRating: 1800 }],
    });
    masterMock().mockResolvedValue({ fen: baseFen, totalGames: 2000, source: 'local', moves: [{ san: 'e5', games: 1500 }] });
    const found = await findGemsForLine([{ fen: baseFen, opponentToMove: true }], 'white', 5000);
    expect(found.size).toBe(0);
    // The free pedigree gate short-circuited BEFORE any engine work.
    expect(analyzeMock()).not.toHaveBeenCalled();
  });

  it('MATERIAL gate: rejects a decisive-eval slip whose punish wins no material and is not mate', async () => {
    const baseFen = fenAfter(['e4']);
    noMasterPedigree(baseFen);
    (lookupAmateurPlay as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      fen: baseFen, totalGames: 1000, source: 'lichess-live',
      moves: [{ san: 'Na6', uci: 'b8a6', games: 120, white: 55, draws: 20, black: 25, whitePct: 55, drawPct: 20, blackPct: 25, averageRating: 1800 }],
    });
    analyzeMock()
      .mockResolvedValueOnce({ evaluation: 20, bestMove: 'd2d4', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 20, moves: ['d2d4'], mate: null }] })
      .mockResolvedValueOnce({ evaluation: 260, bestMove: 'd2d4', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 260, moves: ['d2d4'], mate: null }] })
      // deep confirm agrees on the eval, but the PV (d4, a pawn push) captures nothing.
      .mockResolvedValueOnce({ evaluation: 260, bestMove: 'd2d4', isMate: false, mateIn: null, depth: 16, topLines: [{ rank: 1, evaluation: 260, moves: ['d2d4'], mate: null }] });
    const found = await findGemsForLine([{ fen: baseFen, opponentToMove: true }], 'white', 5000);
    expect(found.size).toBe(0); // decisive eval, but no material → not a gem
  });

  it('rejects a slip whose punish is not a real jump', async () => {
    const baseFen = fenAfter(['e4']);
    noMasterPedigree(baseFen);
    (lookupAmateurPlay as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      fen: baseFen, totalGames: 1000, source: 'lichess-live',
      moves: [{ san: 'Na6', uci: 'b8a6', games: 500, white: 33, draws: 34, black: 33, whitePct: 33, drawPct: 34, blackPct: 33, averageRating: 1800 }],
    });
    analyzeMock()
      .mockResolvedValueOnce({ evaluation: 20, bestMove: 'g1f3', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 20, moves: ['g1f3'], mate: null }] })
      .mockResolvedValueOnce({ evaluation: 25, bestMove: 'g1f3', isMate: false, mateIn: null, depth: 12, topLines: [{ rank: 1, evaluation: 25, moves: ['g1f3'], mate: null }] }); // no jump
    const found = await findGemsForLine([{ fen: baseFen, opponentToMove: true }], 'white', 5000);
    expect(found.size).toBe(0);
  });
});

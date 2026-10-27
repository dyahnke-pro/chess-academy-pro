// "teach me the a3 Sicilian" (David 2026-10-27): the opening DB stops at
// 1.e4 c5 2.a3, so the lesson's fork tiles come from the games database — the
// masters' replies at that position, each walked down their main line. The
// database is stubbed at its one boundary (`buildExplorerBranches`); the
// generator, the beats and the cache doors are real.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExplorerBranches } from './explorerTeachLine';

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: async () => { throw Object.assign(new Error('401 provider dead'), { status: 401 }); } } };
  },
}));

let branchesResult: ExplorerBranches = { branches: [], source: null, results: null, incomplete: false };
const asked: Array<{ spine: readonly string[]; side: string }> = [];
vi.mock('./explorerTeachLine', async (importActual) => ({
  ...(await importActual<typeof import('./explorerTeachLine')>()),
  buildExplorerBranches: async (spine: readonly string[], side: string) => {
    asked.push({ spine, side });
    return branchesResult;
  },
}));

import { readFileSync } from 'node:fs';
import { generateOpening, cacheOpening, getCachedOpening } from './openingGenerator';
import { setOpeningIdentity } from './openingIdentity';
import type { WalkthroughTree, WalkthroughTreeNode } from '../types/walkthroughTree';

const MENGARINI = { canonicalName: 'Sicilian Defense: Mengarini Variation', eco: 'B20', moves: ['e4', 'c5', 'a3'] };

const MASTERS: ExplorerBranches = {
  source: 'masters',
  results: { white: 132, draws: 262, black: 212 },
  incomplete: false,
  branches: [
    {
      san: 'g6', label: '…g6', fullName: '…g6', count: 306, totalGames: 606, source: 'masters',
      extensionMoves: ['b4', 'Bg7', 'Nc3'],
      teaserLead: 'The most common answer, in 306 of the 606 master games.',
      subtitle: '306 of 606 master games',
      endNote: 'The master games run out here: only 9 reached this position.',
    },
    {
      san: 'Nc6', label: '…Nc6', fullName: '…Nc6', count: 121, totalGames: 606, source: 'masters',
      extensionMoves: ['b4', 'cxb4', 'axb4'],
      teaserLead: 'Played in 121 of the 606 master games.',
      subtitle: '121 of 606 master games',
      endNote: null,
    },
  ],
};

/** The generated tree, or the test fails. */
async function lesson(entry: typeof MENGARINI): Promise<WalkthroughTree> {
  const r = await generateOpening(entry.canonicalName, { mode: 'learn', entryOverride: entry });
  if (!r.ok || !r.tree) throw new Error('no tree');
  return r.tree;
}

/** The spine's last node — where the fork tiles hang. */
function terminus(tree: WalkthroughTree): WalkthroughTreeNode {
  let node: WalkthroughTreeNode = tree.root;
  while (node.children.length === 1 && node.children[0].node.san && !node.children[0].label) node = node.children[0].node;
  return node;
}

function lastOf(node: WalkthroughTreeNode): WalkthroughTreeNode {
  let n = node;
  while (n.children[0]) n = n.children[0].node;
  return n;
}

// The identity file the app fetches at runtime (the masters' plan per line).
setOpeningIdentity(JSON.parse(readFileSync('public/data/opening-identity.json', 'utf8')) as Parameters<typeof setOpeningIdentity>[0]);

beforeEach(() => {
  branchesResult = { branches: [], source: null, results: null, incomplete: false };
  asked.length = 0;
});

describe('a line the opening DB stops on is taught from the masters\' games', () => {
  it('asks the database from the line\'s last position, from the student\'s seat', async () => {
    branchesResult = MASTERS;
    const r = await generateOpening(MENGARINI.canonicalName, { mode: 'learn', entryOverride: MENGARINI });
    expect(r.ok).toBe(true);
    expect(asked).toEqual([{ spine: ['e4', 'c5', 'a3'], side: 'black' }]);
  }, 120_000);

  it('hangs the masters\' replies as fork tiles, the shape every lesson has', async () => {
    branchesResult = MASTERS;
    const tree = await lesson(MENGARINI);
    expect(tree.studentSide).toBe('black');
    const fork = terminus(tree);
    expect(fork.san).toBe('a3');
    expect(fork.children.map((c) => c.label)).toEqual(['…g6', '…Nc6']);
    expect(fork.children.map((c) => c.forkSubtitle)).toEqual(['306 of 606 master games', '121 of 606 master games']);
    const g6 = fork.children[0].node;
    expect(g6.idea.startsWith('The most common answer, in 306 of the 606 master games.')).toBe(true);
    // The masters' main line is walked on the tile, every move a node.
    const line: string[] = [];
    for (let n: WalkthroughTreeNode = g6; n.children.length > 0;) { n = n.children[0].node; line.push(String(n.san)); }
    expect(line).toEqual(['b4', 'Bg7', 'Nc3']);
    // Where the games run out, the last move says so.
    expect(lastOf(g6).idea.endsWith('The master games run out here: only 9 reached this position.')).toBe(true);
    // A branch walked to its end says nothing extra.
    expect(lastOf(fork.children[1].node).idea).not.toContain('run out');
    expect(tree.explorerIncomplete).toBeUndefined();
    // How the database's games scored, from the student's seat.
    expect(tree.intro).toContain('In 606 master games from here, your side wins 35% and theirs 22%; the rest are drawn.');
  }, 120_000);

  it('the move the line is named for says the break it prepares, from the database', async () => {
    branchesResult = MASTERS;
    expect(terminus(await lesson(MENGARINI)).idea).toMatch(/^They play a3 — it prepares b4: their pawn on a3 covers b4, and masters push b4 in \d+% of their games from here\.$/);
  }, 120_000);

  it('a lesson built while the database was unreachable is never cached', async () => {
    branchesResult = { ...MASTERS, incomplete: true };
    const tree = await lesson(MENGARINI);
    expect(tree.explorerIncomplete).toBe(true);
    await cacheOpening('a3 sicilian incomplete', tree);
    expect(await getCachedOpening('a3 sicilian incomplete')).toBeNull();
  }, 120_000);

  it('negative control: a complete lesson IS cached', async () => {
    branchesResult = MASTERS;
    await cacheOpening('a3 sicilian complete', await lesson(MENGARINI));
    expect(await getCachedOpening('a3 sicilian complete')).not.toBeNull();
  }, 120_000);

  it('a line the opening DB already branches on never asks the database', async () => {
    branchesResult = MASTERS;
    const najdorf = { canonicalName: 'Sicilian Defense: Najdorf Variation', eco: 'B90', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] };
    const r = await generateOpening(najdorf.canonicalName, { mode: 'learn', entryOverride: najdorf });
    expect(r.ok).toBe(true);
    expect(asked).toEqual([]);
  }, 120_000);
});

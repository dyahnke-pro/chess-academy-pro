import { describe, it, expect } from 'vitest';
import { buildProOpeningForkTree } from './proOpeningForks';
import { proForkTreeToWalkthrough } from './proForkWalkthrough';
import type { WalkthroughTreeNode } from '../types/walkthroughTree';
import type { ProGameReference } from '../types';

function game(id: string, pgn: string, over: Partial<ProGameReference> = {}): ProGameReference {
  const plies = pgn.trim().split(/\s+/).length;
  return {
    id, playerId: 'naroditsky', openingId: 'caro-kann', proOpeningId: 'pro-naroditsky-caro-kann',
    variation: 'classical', variationLabel: 'Classical (4…Bf5)',
    white: 'opp', black: 'naroditsky', studentSide: 'black', result: '0-1',
    opponentRating: 2500, date: '2024-01-01', source: 'chess.com', url: null,
    eco: 'B10', plyCount: plies, pgn, ...over,
  };
}

/** Walk every node, collecting them (root excluded — it has no move). */
function allMoveNodes(root: WalkthroughTreeNode): WalkthroughTreeNode[] {
  const out: WalkthroughTreeNode[] = [];
  const visit = (n: WalkthroughTreeNode) => {
    if (n.san !== null) out.push(n);
    for (const c of n.children) visit(c.node);
  };
  for (const c of root.children) visit(c.node);
  return out;
}

/** Find the first node whose children form a branch (>1). */
function firstBranch(root: WalkthroughTreeNode): WalkthroughTreeNode | null {
  const stack: WalkthroughTreeNode[] = [root];
  while (stack.length) {
    const n = stack.shift()!;
    if (n.children.length > 1) return n;
    for (const c of n.children) stack.push(c.node);
  }
  return null;
}

describe('proForkTreeToWalkthrough', () => {
  const games: ProGameReference[] = [
    game('a', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6'),
    game('b', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5'),
    game('c', 'e4 c6 d4 d5 Nd2 dxe4 Nxe4 Nd7'),
    game('d', 'e4 c6 d4 g6 Nc3 Bg7 Nf3 d6'),
    game('e', 'e4 c6 d4 g6 Nc3 Bg7 Be3 Nf6'),
  ];

  it('returns null for null input', () => {
    expect(proForkTreeToWalkthrough(null as never)).toBeNull();
  });

  it('builds a valid WalkthroughTree from the pro fork tree', () => {
    const fork = buildProOpeningForkTree(games)!;
    const wt = proForkTreeToWalkthrough(fork)!;
    expect(wt).not.toBeNull();
    expect(wt.derived).toBe(true);
    expect(wt.studentSide).toBe('black');
    expect(wt.openingName).toBe('Classical (4…Bf5)');
    // intro names the pro + frames the fork road
    expect(wt.intro).toMatch(/Naroditsky/i);
    expect(wt.root.san).toBeNull();
    expect(wt.root.children.length).toBeGreaterThan(0);
    // the spine opens with 1.e4
    expect(wt.root.children[0].node.san).toBe('e4');
  });

  it('ALWAYS carries a why on every node (David: "always the why")', () => {
    const fork = buildProOpeningForkTree(games)!;
    const wt = proForkTreeToWalkthrough(fork)!;
    const nodes = allMoveNodes(wt.root);
    expect(nodes.length).toBeGreaterThan(4);
    for (const n of nodes) {
      expect(n.idea.trim().length).toBeGreaterThan(0);
      // a why is more than just the move name — there's an em-dash clause
      expect(n.idea).toContain('—');
    }
  });

  it('forks on the pro move into his real alternatives with frequency labels', () => {
    const fork = buildProOpeningForkTree(games)!;
    const wt = proForkTreeToWalkthrough(fork)!;
    const branch = firstBranch(wt.root);
    expect(branch).toBeTruthy();
    const sans = branch!.children.map((c) => c.node.san).sort();
    expect(sans).toEqual(['d5', 'g6']);
    // each branch names its move + frequency in the fork-tile label
    for (const c of branch!.children) {
      expect(c.label && c.label.length).toBeTruthy();
      expect(c.forkSubtitle && c.forkSubtitle.length).toBeTruthy();
    }
    // the majority line (…d5, 3 games) carries a real count clause
    const d5 = branch!.children.find((c) => c.node.san === 'd5')!;
    expect(d5.label).toMatch(/3 of 5/);
  });

  it('each fork branch continues down its own representative game', () => {
    const fork = buildProOpeningForkTree(games)!;
    const wt = proForkTreeToWalkthrough(fork)!;
    const branch = firstBranch(wt.root)!;
    const g6 = branch.children.find((c) => c.node.san === 'g6')!;
    // …g6 games continue Nc3 Bg7 … — the branch node should have a child
    expect(g6.node.children.length).toBeGreaterThan(0);
  });
});

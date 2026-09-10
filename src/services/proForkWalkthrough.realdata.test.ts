import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildProOpeningForkTree } from './proOpeningForks';
import { proForkTreeToWalkthrough } from './proForkWalkthrough';
import type { WalkthroughTreeNode } from '../types/walkthroughTree';

// Guards W1 against the REAL shipped corpus: for a pro with many games in one
// opening, the fork tree must build and EVERY node must carry a why (David
// 2026-09-10: "always the why"). Skips a key the corpus no longer carries so a
// future re-farm can't red-herring this — the invariant is per-node, not per-key.
function allMoveNodes(root: WalkthroughTreeNode): WalkthroughTreeNode[] {
  const out: WalkthroughTreeNode[] = [];
  const visit = (n: WalkthroughTreeNode) => { if (n.san !== null) out.push(n); for (const c of n.children) visit(c.node); };
  for (const c of root.children) visit(c.node);
  return out;
}

describe('proForkTreeToWalkthrough — real shipped corpus', () => {
  const raw = JSON.parse(fs.readFileSync(path.resolve('public/data/pro-game-references.json'), 'utf8'));
  const games = (Array.isArray(raw) ? raw : raw.games) as Array<Record<string, unknown>>;

  for (const key of ['naroditsky|caro-kann', 'gothamchess|caro-kann', 'caruana|ruy-lopez']) {
    const [playerId, openingId] = key.split('|');
    it(`${key}: fork tree builds with a why on every node`, () => {
      const scoped = games.filter((g) => g.playerId === playerId && g.openingId === openingId) as never[];
      if (scoped.length < 2) return; // corpus no longer carries this pairing — not a failure
      const tree = buildProOpeningForkTree(scoped);
      expect(tree, `${key} should aggregate`).toBeTruthy();
      const wt = proForkTreeToWalkthrough(tree!)!;
      expect(wt).toBeTruthy();
      const nodes = allMoveNodes(wt.root);
      expect(nodes.length).toBeGreaterThan(4);
      for (const n of nodes) {
        expect(n.idea.trim().length, `${key} node ${n.san} empty idea`).toBeGreaterThan(0);
        expect(n.idea, `${key} node ${n.san} no why clause`).toContain('—');
      }
      // EVERY recorded fork is reachable in the walked tree — the majority
      // branch keeps going down the spine to the next fork, so a tree with N
      // forks renders N branch nodes (children.length > 1). (Guards the
      // "spine stops at the first fork" regression.)
      const branchNodes = [wt.root, ...nodes].filter((n) => n.children.length > 1).length;
      expect(branchNodes, `${key} should render all ${tree!.forks.length} forks`).toBe(tree!.forks.length);
    });
  }

  it('does not regress: at least one pairing renders multiple forks', () => {
    const scoped = games.filter((g) => g.playerId === 'caruana' && g.openingId === 'ruy-lopez') as never[];
    if (scoped.length < 2) return;
    const tree = buildProOpeningForkTree(scoped)!;
    const wt = proForkTreeToWalkthrough(tree)!;
    const nodes = allMoveNodes(wt.root);
    const branchNodes = [wt.root, ...nodes].filter((n) => n.children.length > 1).length;
    expect(branchNodes).toBeGreaterThanOrEqual(2);
  });
});

/**
 * Validates the Vienna walkthrough tree: every SAN in the tree has
 * to round-trip through chess.js from its parent's position. Catches
 * typos in the data file (e.g. "Bd3" where the bishop can't reach
 * d3) before the runtime ever touches them.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { VIENNA_GAME } from './vienna';
import type { WalkthroughTreeNode } from '../../types/walkthroughTree';

function walkAndValidate(node: WalkthroughTreeNode, parentFen: string, path: string[]): void {
  if (node.san !== null) {
    const chess = new Chess(parentFen);
    let result;
    try {
      result = chess.move(node.san);
    } catch {
      result = null;
    }
    if (!result) {
      throw new Error(
        `SAN "${node.san}" illegal at path [${path.join(' ')}] from FEN ${parentFen}`,
      );
    }
    const childFen = chess.fen();
    for (const child of node.children) {
      walkAndValidate(child.node, childFen, [...path, node.san]);
    }
  } else {
    // Root — children walk from the start position.
    for (const child of node.children) {
      walkAndValidate(child.node, parentFen, path);
    }
  }
}

describe('Vienna walkthrough tree', () => {
  it('every SAN in the tree is legal from its parent position', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(() => walkAndValidate(VIENNA_GAME.root, startFen, [])).not.toThrow();
  });

  it('branch points (children.length > 1) all have label + forkSubtitle on every child', () => {
    const issues: string[] = [];
    function check(node: WalkthroughTreeNode, path: string[]): void {
      if (node.children.length > 1) {
        node.children.forEach((c, idx) => {
          if (!c.label) issues.push(`branch at [${path.join(' ')}] child ${idx} missing label`);
          if (!c.forkSubtitle)
            issues.push(`branch at [${path.join(' ')}] child ${idx} missing forkSubtitle`);
        });
      }
      node.children.forEach((c) =>
        check(c.node, [...path, node.san ?? '(root)']),
      );
    }
    check(VIENNA_GAME.root, []);
    expect(issues).toEqual([]);
  });

  it('every non-root node has a non-empty `idea`', () => {
    const issues: string[] = [];
    function check(node: WalkthroughTreeNode, path: string[]): void {
      if (node.san !== null && !node.idea.trim()) {
        issues.push(`empty idea at [${path.join(' ')}]`);
      }
      node.children.forEach((c) => check(c.node, [...path, node.san ?? '(root)']));
    }
    check(VIENNA_GAME.root, []);
    expect(issues).toEqual([]);
  });
});

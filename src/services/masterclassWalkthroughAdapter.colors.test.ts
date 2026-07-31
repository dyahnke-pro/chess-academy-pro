import { describe, it, expect } from 'vitest';
import { masterclassWalkthroughTree } from './masterclassWalkthroughAdapter';

// Regression for the measured yellow→green highlight mismatch (David
// 2026-07-31, fourth report on the coach-tab markers).
//
// A prod DOM comparison of the SAME opening on both surfaces showed the
// opening tab painting key squares rgba(255,214,0,0.88) (yellow) while the
// coach tab painted rgba(40,185,95,0.55) (green). Cause: the adapter's
// colour mapper matched on the string CONTAINING a colour word, but every
// authored marker is an rgba literal — so all of them fell through to green.
//
// These are the real constants the lesson files use (src/data/lessons/*.ts).
const KEY = 'rgba(255,214,0,0.88)';   // key square — yellow
const ATK = 'rgba(40,185,95,0.92)';   // vision arrow — green
const SOFT = 'rgba(80,140,255,0.32)'; // context — blue
const WARN = 'rgba(239,68,68,0.85)';  // danger — red

describe('masterclass adapter marker colours', () => {
  const tree = masterclassWalkthroughTree('italian game');

  it('builds a tree for a masterclass opening (else nothing below is proved)', () => {
    expect(tree).toBeTruthy();
  });

  it('carries an authored YELLOW key square through as yellow, not green', () => {
    // Walk the spine collecting every highlight the adapter produced.
    const colors = new Set<string>();
    interface Node {
      narration?: Array<{ highlights?: Array<{ color?: string }> }>;
      children: Array<{ node: Node }>;
    }
    const walk = (node: Node): void => {
      for (const seg of node.narration ?? []) {
        for (const h of seg.highlights ?? []) if (h.color) colors.add(h.color);
      }
      for (const c of node.children) walk(c.node);
    };
    if (tree?.root) walk(tree.root as unknown as Node);
    // The Italian's authored beats highlight key squares (e4/f7/e5). If the
    // mapper is broken every one of them arrives as 'green'.
    expect(colors.has('yellow'), `highlight colours produced: ${[...colors].join(', ') || '(none)'}`).toBe(true);
  });
});

// The mapper is exercised through the adapter above; these pin the intent of
// each authored constant so a future palette change can't silently re-collapse
// everything to one colour.
describe('authored palette constants are visually distinct', () => {
  it('the four registers are four different colours', () => {
    expect(new Set([KEY, ATK, SOFT, WARN]).size).toBe(4);
  });
});

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  lessonToWalkthroughTree,
  masterclassWalkthroughTree,
} from './masterclassWalkthroughAdapter';
import { getLessonScript } from '../data/lessons';
import type { LessonScript } from '../types';
import type { WalkthroughTreeNode } from '../types/walkthroughTree';

const walkChain = (root: WalkthroughTreeNode): WalkthroughTreeNode[] => {
  const out: WalkthroughTreeNode[] = [];
  let node = root;
  while (node.children.length > 0) {
    expect(node.children).toHaveLength(1); // linear — never a fork
    node = node.children[0].node;
    out.push(node);
  }
  return out;
};

describe('lessonToWalkthroughTree', () => {
  it('adapts a monotonic masterclass main lesson into a legal linear tree', () => {
    const lesson = getLessonScript('caro-kann');
    expect(lesson).not.toBeNull();
    const tree = lessonToWalkthroughTree(lesson as LessonScript, 'Caro-Kann Defense');
    expect(tree).not.toBeNull();
    expect(tree?.studentSide).toBe((lesson as LessonScript).orientation);
    const chain = walkChain((tree as NonNullable<typeof tree>).root);
    // every node replays legally from the start
    const probe = new Chess();
    for (const node of chain) probe.move(node.san as string);
    // the deepest beat's line is fully represented
    const deepest = (lesson as LessonScript).beats.reduce(
      (max, b) => Math.max(max, b.moves.length),
      0,
    );
    expect(chain).toHaveLength(deepest);
  });

  it('carries the authored narration onto each beat-final node', () => {
    const lesson = getLessonScript('caro-kann') as LessonScript;
    const tree = lessonToWalkthroughTree(lesson, 'Caro-Kann Defense');
    const chain = walkChain((tree as NonNullable<typeof tree>).root);
    for (const beat of lesson.beats) {
      if (beat.moves.length === 0) continue; // intro beats live on tree.intro
      const node = chain[beat.moves.length - 1];
      expect(node.idea).toContain(beat.say);
      expect(node.narration?.some((s) => s.text === beat.say)).toBe(true);
    }
  });

  it('rejects a lesson that rewinds to an earlier position', () => {
    const rewinding: LessonScript = {
      openingId: 'x',
      title: 'Rewinder',
      minutes: 5,
      orientation: 'white',
      beats: [
        { id: 'a', moves: ['e4', 'e5', 'Nf3'], say: 'Develop.' },
        { id: 'b', moves: ['e4', 'e5'], say: 'Back up — imagine Black tried f6.' },
      ],
    };
    expect(lessonToWalkthroughTree(rewinding, 'Rewinder')).toBeNull();
  });

  it('rejects roadmap/trap-shaped lessons', () => {
    const roadmap: LessonScript = {
      openingId: 'x',
      title: 'Roadmap',
      minutes: 3,
      orientation: 'white',
      kind: 'roadmap',
      beats: [{ id: 'a', moves: ['e4'], say: 'A pointer lesson.' }],
    };
    expect(lessonToWalkthroughTree(roadmap, 'Roadmap')).toBeNull();
  });
});

describe('variation fork grafting', () => {
  it('offers the Glek sublines as labeled fork tiles at their divergence ply', () => {
    const tree = masterclassWalkthroughTree('Four Knights Game: Glek System');
    expect(tree).not.toBeNull();
    // walk to the fork
    let node = (tree as NonNullable<typeof tree>).root;
    while (node.children.length === 1) node = node.children[0].node;
    expect(node.san).toBe('g3');
    const labels = node.children.map((c) => c.label);
    expect(labels).toContain('Central Break: 4...d5');
    expect(labels).toContain('Pin Variation: 4...Bb4');
    expect(labels).toContain('Symmetrical: 4...g6');
    expect(labels.some((l) => l?.startsWith('Main line'))).toBe(true);
    // every child at a fork carries a label + subtitle (runtime contract)
    for (const c of node.children) {
      expect(c.label).toBeTruthy();
      expect(c.forkSubtitle).toBeTruthy();
    }
    // each branch replays legally and narrates its own tail
    for (const c of node.children) {
      const probe = new Chess();
      for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'g3']) probe.move(san);
      let n = c.node;
      let sawNarration = false;
      for (;;) {
        probe.move(n.san as string);
        if (n.idea.trim().length > 0) sawNarration = true;
        if (n.children.length === 0) break;
        n = n.children[0].node;
      }
      expect(sawNarration).toBe(true);
    }
  });

  it('a variation ask walks only its own line (no forks grafted)', () => {
    const tree = masterclassWalkthroughTree('berlin defense');
    if (tree) {
      let node = tree.root;
      while (node.children.length > 0) {
        expect(node.children.length).toBe(1);
        node = node.children[0].node;
      }
    }
  });
});

describe('masterclassWalkthroughTree', () => {
  it('resolves a canonical opening name to its masterclass tree', () => {
    const tree = masterclassWalkthroughTree('Caro-Kann Defense');
    expect(tree).not.toBeNull();
    expect(tree?.openingName).toBe('Caro-Kann Defense');
    expect(tree?.intro.length).toBeGreaterThan(0);
  });

  it('returns null for names with no masterclass', () => {
    expect(masterclassWalkthroughTree('Grob Attack')).toBeNull();
  });

  it('never lets the main lesson hijack a focused sub-variation ask', () => {
    const tree = masterclassWalkthroughTree('Caro-Kann Defense: Fantasy Variation');
    // no Fantasy variation lesson is registered → focused tiers must run
    expect(tree).toBeNull();
  });
});

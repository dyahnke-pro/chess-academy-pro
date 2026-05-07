/**
 * Tests for the auto-repair logic in openingGenerator. The full
 * generator path (LLM call → parse → validate → cache) is integration-
 * level and not covered here; this file locks in the surgical helpers
 * that are pure functions of the parsed tree.
 */
import { describe, it, expect } from 'vitest';
import { repairForkLabels } from './openingGenerator';
import type { WalkthroughTree } from '../types/walkthroughTree';

function makeTree(rootChildren: WalkthroughTree['root']['children']): WalkthroughTree {
  return {
    openingName: 'Test',
    eco: 'X00',
    intro: 'i',
    outro: 'o',
    root: {
      san: null,
      movedBy: null,
      idea: '',
      children: rootChildren,
    },
  };
}

describe('repairForkLabels', () => {
  it('fills missing label + forkSubtitle on a 2-child fork', () => {
    const tree = makeTree([
      {
        node: {
          san: 'e4',
          movedBy: 'white',
          idea: '1.e4',
          children: [
            {
              node: {
                san: 'e5',
                movedBy: 'black',
                idea: 'classical reply. Mirrors the king pawn.',
                children: [],
              },
            },
            {
              node: {
                san: 'c5',
                movedBy: 'black',
                idea: 'Sicilian. Asymmetric counter.',
                children: [],
              },
            },
          ],
        },
      },
    ]);

    const filled = repairForkLabels(tree);

    expect(filled).toBe(4);
    const forkChildren = tree.root.children[0].node.children;
    expect(forkChildren[0].label).toBe('e5');
    expect(forkChildren[0].forkSubtitle).toBe('classical reply.');
    expect(forkChildren[1].label).toBe('c5');
    expect(forkChildren[1].forkSubtitle).toBe('Sicilian.');
  });

  it('leaves existing labels untouched', () => {
    const tree = makeTree([
      {
        node: {
          san: 'e4',
          movedBy: 'white',
          idea: '1.e4',
          children: [
            {
              label: 'Open',
              forkSubtitle: 'symmetric',
              node: {
                san: 'e5',
                movedBy: 'black',
                idea: '...',
                children: [],
              },
            },
            {
              node: {
                san: 'c5',
                movedBy: 'black',
                idea: 'Sicilian.',
                children: [],
              },
            },
          ],
        },
      },
    ]);

    const filled = repairForkLabels(tree);

    expect(filled).toBe(2);
    const forkChildren = tree.root.children[0].node.children;
    expect(forkChildren[0].label).toBe('Open');
    expect(forkChildren[0].forkSubtitle).toBe('symmetric');
    expect(forkChildren[1].label).toBe('c5');
  });

  it('does not touch single-child (linear) sequences', () => {
    const tree = makeTree([
      {
        node: {
          san: 'e4',
          movedBy: 'white',
          idea: '1.e4',
          children: [
            {
              node: {
                san: 'e5',
                movedBy: 'black',
                idea: '...',
                children: [],
              },
            },
          ],
        },
      },
    ]);

    const filled = repairForkLabels(tree);

    expect(filled).toBe(0);
  });

  it('caps long subtitles to 80 chars with ellipsis', () => {
    const longIdea = 'A'.repeat(200) + '. tail';
    const tree = makeTree([
      {
        node: {
          san: 'e4',
          movedBy: 'white',
          idea: '1.e4',
          children: [
            {
              node: { san: 'e5', movedBy: 'black', idea: longIdea, children: [] },
            },
            {
              node: { san: 'c5', movedBy: 'black', idea: 'short.', children: [] },
            },
          ],
        },
      },
    ]);

    repairForkLabels(tree);
    const subtitle = tree.root.children[0].node.children[0].forkSubtitle ?? '';
    expect(subtitle.length).toBe(80);
    expect(subtitle.endsWith('…')).toBe(true);
  });
});

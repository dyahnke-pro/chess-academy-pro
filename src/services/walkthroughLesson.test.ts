import { describe, it, expect } from 'vitest';
import { walkthroughLesson } from './walkthroughLesson';
import type { WalkthroughTree, WalkthroughTreeNode } from '../types/walkthroughTree';

function node(san: string | null, movedBy: 'white' | 'black' | null, idea: string, children: WalkthroughTreeNode[] = [], extra: Partial<WalkthroughTreeNode> = {}): WalkthroughTreeNode {
  return { san, movedBy, idea, children: children.map((n) => ({ node: n })), ...extra } as WalkthroughTreeNode;
}

const tree = {
  openingName: 'Sicilian Defense',
  root: node(null, null, '', [
    node('e4', 'white', 'They take the centre.', [
      node('c5', 'black', '', [
        node('a3', 'white', 'They prepare b4.', [node('g6', 'black', 'You make room for the bishop.')]),
        node('Nf3', 'white', 'The main road.'),
      ]),
    ]),
  ]),
} as unknown as WalkthroughTree;

describe('walkthroughLesson — a generated line as Watch beats', () => {
  it('one beat per move, cumulative moves, the node prose as `say`', () => {
    const s = walkthroughLesson(tree, 'sic', 'Sicilian Defense', 'black')!;
    expect(s.beats.map((b) => b.moves.join(' '))).toEqual(['e4', 'e4 c5', 'e4 c5 a3', 'e4 c5 a3 g6']);
    expect(s.beats[3].say).toBe('You make room for the bishop.');
    expect(s.beats[1].say).toBe(''); // a silent ply stays silent, never filler
    expect(s.orientation).toBe('black');
  });
  it('follows the given line at a fork, not the first child', () => {
    const s = walkthroughLesson(tree, 'sic', 'Sicilian Defense', 'black', ['e4', 'c5', 'Nf3'])!;
    expect(s.beats.at(-1)!.moves).toEqual(['e4', 'c5', 'Nf3']);
    expect(s.beats.at(-1)!.say).toBe('The main road.');
  });
  it('segment arrows and highlights ride on the beat', () => {
    const t = { openingName: 'x', root: node(null, null, '', [node('e4', 'white', '', [], { narration: [{ text: 'The pawn eyes d5.', arrows: [{ from: 'e4', to: 'd5', color: 'green' }], highlights: [{ square: 'd5', color: 'yellow' }] }] })]) } as unknown as WalkthroughTree;
    const s = walkthroughLesson(t, 'x', 'x', 'white')!;
    expect(s.beats[0].say).toBe('The pawn eyes d5.');
    expect(s.beats[0].arrows).toEqual([{ from: 'e4', to: 'd5', color: 'green' }]);
    expect(s.beats[0].highlights).toEqual([{ square: 'd5', color: 'yellow' }]);
  });
  it('null for an empty tree', () => {
    expect(walkthroughLesson({ openingName: 'x', root: node(null, null, '') } as unknown as WalkthroughTree, 'x', 'x', 'white')).toBeNull();
  });
});

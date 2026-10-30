import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { groupReplies } from './replyTree';
import { positionOf } from '../utils/samePosition';
import type { ChapterSubline } from './openingCourse';
import type { FacedIndex } from './facedReplies';

const TAB = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'O-O'];
const row = (moves: string[], atPly: number, pct: number, club?: { reach: number; met: number }): ChapterSubline =>
  ({ tab: 2, triggerMove: moves[atPly], atPly, pct, games: 10, name: '', moves, reachesMiddlegame: true, ...(club ? { club: { ...club, endCp: 0 } } : {}) }) as ChapterSubline;
const board = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return positionOf(c.fen()); };

describe('groupReplies — the tree\'s groups and their order', () => {
  it('groups by the board a reply is made on: the tab\'s line first, then the replies inside a reply', () => {
    const onLine = row([...TAB.slice(0, 7), 'h6'], 7, 5, { reach: 1.6, met: 0 });
    const inside = row(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'h6'], 7, 15, { reach: 1.5, met: 0 });
    const early = row([...TAB.slice(0, 5), 'Nf6'], 5, 30);
    const groups = groupReplies(TAB, [inside, onLine, early], null);
    expect(groups.map((g) => [g.id, g.after])).toEqual([
      ['5', '3.Bc4'],
      ['7', '4.d3'],
      ['7-in-Nf6-d3', '3…Nf6 4.d3'],
    ]);
  });

  it('a reply past the end of the tab\'s line (a folded variation\'s, its lesson runs on) names only the move it answers', () => {
    const past = row([...TAB, 'd6', 'c3', 'a6'], 11, 20);
    const [g] = groupReplies(TAB, [past], null);
    expect(g.after).toBe('6.c3');
    expect(g.id).toBe('11-in-d6-c3');
  });

  it('course replies lead (most played first, the first one Main), then club replies by reach', () => {
    const at = TAB.slice(0, 5);
    const groups = groupReplies(TAB, [
      row([...at, 'h6'], 5, 15, { reach: 17.7, met: 0 }),
      row([...at, 'Be7'], 5, 4),
      row([...at, 'd6'], 5, 7, { reach: 6.9, met: 0 }),
      row([...at, 'Nf6'], 5, 30),
    ], null);
    expect(groups[0].rows.map((r) => [r.subline.triggerMove, r.isTop])).toEqual([
      ['Nf6', true], ['Be7', false], ['h6', false], ['d6', false],
    ]);
  });

  it('puts the replies the student met in their own games first — and never makes one Main for it', () => {
    const at = TAB.slice(0, 5);
    const faced: FacedIndex = new Map([[board(at), new Map([['Be7', 1]])]]);
    const groups = groupReplies(TAB, [
      row([...at, 'Nf6'], 5, 30),
      row([...at, 'Be7'], 5, 4),
      row([...at, 'h6'], 5, 15, { reach: 17.7, met: 3 }),
    ], faced);
    expect(groups[0].rows.map((r) => [r.subline.triggerMove, r.met, r.isTop])).toEqual([
      ['h6', 3, false], ['Be7', 1, false], ['Nf6', 0, true],
    ]);
  });
});

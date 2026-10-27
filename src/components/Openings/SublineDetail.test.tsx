import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SublineDetail } from './SublineDetail';
import type { OpeningRecord } from '../../types';
import type { ChapterSubline } from '../../services/openingCourse';
import { ALL_GEMS, isWeaponGem } from '../../data/lessons/punishGems';

vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: ({ fen }: { fen: string }) => <div data-testid="board" data-fen={fen} />,
}));
vi.mock('../../data/lessons/sublineNarration', () => ({ getSublineNarration: () => null }));

const caro = { id: 'caro-kann', color: 'black', name: 'Caro-Kann Defence' } as unknown as OpeningRecord;
const bd3: ChapterSubline = {
  tab: 1, triggerMove: 'Bd3', atPly: 6, pct: 36, games: 900, reachesMiddlegame: true,
  name: 'Caro-Kann Defense: Advance Variation, Short Variation',
  moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Bd3', 'Bxd3', 'Qxd3', 'e6'],
};

describe('SublineDetail', () => {
  it('shows the reply with its number, the board it leaves, and the four steps', () => {
    const onRung = vi.fn();
    render(<SublineDetail opening={caro} subline={bd3} tabLabel="Advance" isTopOfGroup onBack={vi.fn()} onRung={onRung} />);
    expect(screen.getByTestId('subline-detail').textContent).toContain('4.Bd3');
    expect(screen.getByTestId('board').getAttribute('data-fen')).toContain('rn1qkbnr/pp2pppp/2p5/3pPb2/3P4/3B4/PPP2PPP/RNBQK1NR b KQkq');
    expect(screen.getByTestId('subline-watch-btn').getAttribute('data-primary')).toBe('true');
    fireEvent.click(screen.getByTestId('subline-learn-btn'));
    expect(onRung).toHaveBeenCalledWith('learn');
    expect(screen.getByTestId('subline-review-note').textContent).toContain('Finish Learn');
  });

  it('a learned reply says it is in review and checks its steps', () => {
    const learned = { ...caro, sublineRungs: { 'sub-1::Bd3@6': ['watch', 'learn'] } } as unknown as OpeningRecord;
    render(<SublineDetail opening={learned} subline={bd3} tabLabel="Advance" isTopOfGroup onBack={vi.fn()} onRung={vi.fn()} />);
    expect(screen.getByTestId('subline-done-learn')).toBeTruthy();
    expect(screen.getByTestId('subline-practice-btn').getAttribute('data-primary')).toBe('true');
    expect(screen.getByTestId('subline-review-note').textContent).toContain('In your spaced review');
  });

  it('a reply that is a proven trap names the punishment', () => {
    const trap = ALL_GEMS.find(isWeaponGem)!;
    const line = [...trap.lineMoves.trim().split(/\s+/), trap.inaccuracy];
    const sub: ChapterSubline = { tab: 0, triggerMove: trap.inaccuracy, atPly: line.length - 1, pct: 4, games: 50, reachesMiddlegame: true, name: 'X', moves: line };
    const o = { id: trap.openingId, color: line.length % 2 === 1 ? 'white' : 'black', name: 'X' } as unknown as OpeningRecord;
    render(<SublineDetail opening={o} subline={sub} tabLabel="X" isTopOfGroup={false} onBack={vi.fn()} onRung={vi.fn()} />);
    expect(screen.getByTestId('reply-tag-trap')).toBeTruthy();
    expect(screen.getByTestId('subline-known-mistake').textContent).toContain(trap.punish);
  });
});

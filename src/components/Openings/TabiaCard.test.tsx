import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabiaCard } from './TabiaCard';
import plans from '../../data/middlegame-plans.json';
import type { MiddlegamePlan } from '../../types';

vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: ({ fen }: { fen: string }) => <div data-testid="board" data-fen={fen} />,
}));

const plan = (plans as MiddlegamePlan[]).find((p) => p.pawnBreaks.length > 0 && p.pieceManeuvers.length > 0 && !p.id.endsWith('-endgame'))!;

describe('TabiaCard', () => {
  it('shows the plan\'s own board, its title, breaks and routes, and opens the plan', () => {
    const onWatch = vi.fn();
    render(<TabiaCard fen={plan.criticalPositionFen} studentColor="white" plan={plan} onWatchPlan={onWatch} />);
    expect(screen.getByTestId('board').getAttribute('data-fen')).toBe(plan.criticalPositionFen);
    expect(screen.getByTestId('tabia-your-plan').textContent).toContain(plan.title);
    expect(screen.getByTestId('tabia-breaks').textContent).toContain(plan.pawnBreaks[0].move);
    expect(screen.getByTestId('tabia-maneuvers')).toBeTruthy();
    fireEvent.click(screen.getByTestId('tabia-watch-plan'));
    expect(onWatch).toHaveBeenCalled();
  });

  it('with no curated plan, the structure is read off the board, seated for the student', () => {
    // A French chain: White pawns d4+e5, Black d5+e6.
    const fen = 'r1bqkbnr/pp3ppp/2n1p3/2ppP3/3P4/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 1';
    render(<TabiaCard fen={fen} studentColor="black" plan={null} />);
    expect(screen.queryByTestId('tabia-watch-plan')).toBeNull();
    const text = screen.getByTestId('tabia-structure').textContent ?? '';
    expect(text).toContain('French-type pawn chain');
    expect(text).toMatch(/\byou\b/);
  });

  it('hides when there is neither a plan nor a structure to name', () => {
    const { container } = render(<TabiaCard fen="4k3/8/8/8/8/8/8/4K3 w - - 0 1" studentColor="white" plan={null} />);
    expect(container.firstChild).toBeNull();
  });
});

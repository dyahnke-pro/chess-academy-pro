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

  // 2026-10-29: a line that stops in the opening reaches its middlegame by the
  // games' most-played moves; the card writes them, and its button plays them
  // before the plan.
  it('writes the way from the line\'s end to the tabia, numbered, and says the Watch plays it', () => {
    const computed: MiddlegamePlan = {
      ...plan,
      id: 'computed-italian--1',
      lineMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3'],
      approach: ['d6', 'Nbd2', 'O-O', 'O-O'],
    };
    render(<TabiaCard fen={computed.criticalPositionFen} studentColor="white" plan={computed} onWatchPlan={vi.fn()} />);
    expect(screen.getByTestId('tabia-approach').textContent).toContain('5…d6 6.Nbd2 O-O 7.O-O');
    expect(screen.getByTestId('tabia-watch-plan').textContent).toContain('Watch the way here and the plan');
  });

  it('with an approach but no line to play, the Watch opens the plan from here', () => {
    const study: MiddlegamePlan = { ...plan, approach: ['d6', 'Nbd2'], lineMoves: ['e4'], playableLines: undefined };
    render(<TabiaCard fen={study.criticalPositionFen} studentColor="white" plan={study} onWatchPlan={vi.fn()} />);
    expect(screen.getByTestId('tabia-approach')).toBeTruthy();
    expect(screen.getByTestId('tabia-watch-plan').textContent).toContain('Watch the plan from here');
  });

  it('with no approach, writes none and the Watch starts from the tabia', () => {
    render(<TabiaCard fen={plan.criticalPositionFen} studentColor="white" plan={plan} onWatchPlan={vi.fn()} />);
    expect(screen.queryByTestId('tabia-approach')).toBeNull();
    expect(screen.getByTestId('tabia-watch-plan').textContent).toContain('Watch the plan from here');
  });

  it('hides when there is neither a plan nor a structure to name', () => {
    const { container } = render(<TabiaCard fen="4k3/8/8/8/8/8/8/4K3 w - - 0 1" studentColor="white" plan={null} />);
    expect(container.firstChild).toBeNull();
  });
});

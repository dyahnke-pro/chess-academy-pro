import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CriticalMomentsStrip } from './CriticalMomentsStrip';
import type { KeyMoment, CoachGameMove } from '../../types';

const mockMoves: CoachGameMove[] = [
  { moveNumber: 1, san: 'e4', fen: 'f1', isCoachMove: false, commentary: '', evaluation: 30, classification: 'good', expanded: false, bestMove: null, bestMoveEval: null, preMoveEval: 0 },
  { moveNumber: 2, san: 'e5', fen: 'f2', isCoachMove: true, commentary: '', evaluation: 25, classification: 'good', expanded: false, bestMove: null, bestMoveEval: null, preMoveEval: 30 },
  { moveNumber: 3, san: 'Nf3', fen: 'f3', isCoachMove: false, commentary: '', evaluation: -200, classification: 'blunder', expanded: false, bestMove: 'd2d4', bestMoveEval: 40, preMoveEval: 25 },
  { moveNumber: 4, san: 'Nc6', fen: 'f4', isCoachMove: true, commentary: '', evaluation: -180, classification: 'good', expanded: false, bestMove: null, bestMoveEval: null, preMoveEval: -200 },
  { moveNumber: 5, san: 'Bb5', fen: 'f5', isCoachMove: false, commentary: '', evaluation: 300, classification: 'brilliant', expanded: false, bestMove: 'f1b5', bestMoveEval: 300, preMoveEval: -180 },
];

const mockMoments: KeyMoment[] = [
  { moveNumber: 3, fen: 'f3', explanation: 'This move was a blunder.', type: 'blunder' },
  { moveNumber: 5, fen: 'f5', explanation: 'Brilliant recovery!', type: 'brilliant' },
];

describe('CriticalMomentsStrip', () => {
  it('returns null when no moments', () => {
    const { container } = render(
      <CriticalMomentsStrip moments={[]} moves={mockMoves} currentMoveIndex={0} onMomentClick={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders key moments label and chips', () => {
    render(
      <CriticalMomentsStrip moments={mockMoments} moves={mockMoves} currentMoveIndex={0} onMomentClick={vi.fn()} />,
    );
    expect(screen.getByText('Key Moments')).toBeInTheDocument();
    expect(screen.getByTestId('critical-moment-0')).toBeInTheDocument();
    expect(screen.getByTestId('critical-moment-1')).toBeInTheDocument();
  });

  it('displays move numbers correctly', () => {
    render(
      <CriticalMomentsStrip moments={mockMoments} moves={mockMoves} currentMoveIndex={0} onMomentClick={vi.fn()} />,
    );
    // moveNumber 3 → full move 2, moveNumber 5 → full move 3
    expect(screen.getByText('Move 2')).toBeInTheDocument();
    expect(screen.getByText('Move 3')).toBeInTheDocument();
  });

  it('displays moment type labels', () => {
    render(
      <CriticalMomentsStrip moments={mockMoments} moves={mockMoves} currentMoveIndex={0} onMomentClick={vi.fn()} />,
    );
    expect(screen.getByText('Blunder')).toBeInTheDocument();
    expect(screen.getByText('Brilliant')).toBeInTheDocument();
  });

  it('calls onMomentClick with correct move index', () => {
    const handler = vi.fn();
    render(
      <CriticalMomentsStrip moments={mockMoments} moves={mockMoves} currentMoveIndex={0} onMomentClick={handler} />,
    );
    // Click the blunder chip (moveNumber 3 → index 2 in moves array)
    fireEvent.click(screen.getByTestId('critical-moment-0'));
    expect(handler).toHaveBeenCalledWith(2);
  });

  it('renders turning point moments', () => {
    const turningMoments: KeyMoment[] = [
      { moveNumber: 3, fen: 'f3', explanation: 'Game changed here.', type: 'turning_point' },
    ];
    render(
      <CriticalMomentsStrip moments={turningMoments} moves={mockMoves} currentMoveIndex={0} onMomentClick={vi.fn()} />,
    );
    expect(screen.getByText('Turning Point')).toBeInTheDocument();
  });
});

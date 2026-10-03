import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const logAppAudit = vi.fn(async (_entry: { kind: string; summary: string; details?: string }) => undefined);
vi.mock('../../services/appAuditor', () => ({
  logAppAudit: (entry: { kind: string; summary: string; details?: string }) => logAppAudit(entry),
}));
vi.mock('../../services/findSquareService', () => ({
  drawRandomSquare: () => 'e4',
  recordAttempt: vi.fn(async () => undefined),
  sequenceLengthForStreak: () => 1,
  getBestStreak: vi.fn(async () => 0),
}));
vi.mock('../../services/rewardService', () => ({ reward: vi.fn() }));
vi.mock('../Chessboard/ConsistentChessboard', () => ({
  ConsistentChessboard: ({ onSquareClick }: { onSquareClick: (a: { square: string }) => void }) => (
    <div>
      <button data-testid="sq-e4" onClick={() => onSquareClick({ square: 'e4' })}>e4</button>
      <button data-testid="sq-d5" onClick={() => onSquareClick({ square: 'd5' })}>d5</button>
    </div>
  ),
}));

import { FindSquarePage } from './FindSquarePage';

function resultRows(): Array<{ kind: string; summary: string; details?: string }> {
  return logAppAudit.mock.calls.map((c) => c[0]).filter((e) => e.kind === 'find-square-round-result');
}

describe('FindSquarePage — every round result is recorded', () => {
  beforeEach(() => logAppAudit.mockClear());

  it('logs a completed round', () => {
    render(<MemoryRouter><FindSquarePage /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('sq-e4'));
    const rows = resultRows();
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0].details ?? '{}')).toMatchObject({ outcome: 'completed', found: 1, targets: ['e4'] });
  });

  it('logs a missed round with the target and the click', () => {
    render(<MemoryRouter><FindSquarePage /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('sq-d5'));
    const rows = resultRows();
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0].details ?? '{}')).toMatchObject({ outcome: 'missed', missedTarget: 'e4', clicked: 'd5' });
  });
});

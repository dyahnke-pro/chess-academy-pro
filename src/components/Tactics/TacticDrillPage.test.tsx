// The drill flows: a solve advances on its own, a fail sits with the solution,
// and the post-solve note appears only after grading — never as a mid-solve
// hint. Manual nav always wins over the pending auto-advance.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TacticDrillPage } from './TacticDrillPage';
import type { PuzzleOutcome } from '../Puzzles/PuzzleBoard';
import { buildPuzzleRecord, resetFactoryCounter } from '../../test/factories';

const { getPuzzle, teachingSource } = vi.hoisted(() => ({
  getPuzzle: vi.fn(),
  teachingSource: vi.fn(),
}));

// The board is not under test — a stub that lets each scenario grade the
// puzzle the way a student would finish it.
vi.mock('../Puzzles/PuzzleBoard', () => ({
  PuzzleBoard: ({ onComplete }: { onComplete: (o: PuzzleOutcome) => void }) => (
    <div data-testid="stub-board">
      <button
        data-testid="stub-solve"
        onClick={() => onComplete({ correct: true, usedHint: false, hadRetry: false, showedSolution: false, solveTimeMs: 5000 })}
      >
        solve
      </button>
      <button
        data-testid="stub-fail"
        onClick={() => onComplete({ correct: false, usedHint: false, hadRetry: true, showedSolution: true, solveTimeMs: 9000 })}
      >
        fail
      </button>
    </div>
  ),
}));

vi.mock('../../services/puzzleService', async (orig) => ({
  ...(await orig<typeof import('../../services/puzzleService')>()),
  getPuzzleForThemeAtRating: getPuzzle,
  getPuzzleForOpeningAtRating: getPuzzle,
}));

vi.mock('../../services/danyaTeachingService', async (orig) => ({
  ...(await orig<typeof import('../../services/danyaTeachingService')>()),
  teachingSourceForBoard: teachingSource,
}));

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={["/tactics/drill"]}>
      <TacticDrillPage />
    </MemoryRouter>,
  );
}

describe('TacticDrillPage flow', () => {
  beforeEach(() => {
    resetFactoryCounter();
    vi.useFakeTimers();
    let n = 0;
    getPuzzle.mockImplementation(async () => buildPuzzleRecord({ id: `p-${n += 1}` }));
    teachingSource.mockReturnValue(null);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('auto-advances after a correct solve; a fail stays put', async () => {
    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(screen.getByText('1 / 10')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('stub-solve'));
    // The pre-fetch for puzzle 2 must land before the advance timer fires.
    await act(async () => { await vi.advanceTimersByTimeAsync(3200); });
    expect(screen.getByText('2 / 10'), 'a solve flows to the next puzzle on its own').toBeInTheDocument();

    fireEvent.click(screen.getByTestId('stub-fail'));
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(screen.getByText('2 / 10'), 'a fail sits with the solution — no auto-advance').toBeInTheDocument();
  });

  it('manual nav cancels the pending auto-advance', async () => {
    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    fireEvent.click(screen.getByTestId('stub-solve'));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    // Student steps back to study — the queued advance must die with it.
    fireEvent.click(screen.getByTestId('nav-next'));
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    fireEvent.click(screen.getByTestId('nav-prev'));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText('1 / 10'), 'auto-advance fired after a manual nav').toBeInTheDocument();
  });

  it('shows the post-solve note only after grading, framed by origin', async () => {
    teachingSource.mockReturnValue({
      origin: 'structure',
      note: {
        id: 'n1', lineSan: [], opening: null, phase: 'middlegame',
        explains: 'The rook belongs behind the passed pawn.',
        teaches: '', plans: '', concepts: [], sources: [],
      },
    });
    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    // Mid-solve: no note — it must never function as a hint.
    expect(screen.queryByTestId('post-solve-note')).toBeNull();

    fireEvent.click(screen.getByTestId('stub-fail')); // fail → page holds still
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const note = screen.getByTestId('post-solve-note');
    expect(note.textContent).toContain('The rook belongs behind the passed pawn.');
    // Origin framing — a borrowed-structure note must say so, not pose as
    // a claim authored at this position.
    expect(note.textContent).toContain('The same idea shows up in positions like this:');
  });
});

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
    // ANCHORED fixture (a real lineSan), not a floating one.
    //
    // This used `lineSan: []`, and a FLOATING note with no bake is silent by
    // design — its original prose describes another game's squares, and
    // stripping that geometry is the whole job of the bake. The app fetches
    // the bake at boot; nothing in vitest does, so `spokenBeatText` returned
    // '' and the note never rendered. The test was measuring the harness, not
    // the page — exactly the same blindness that made tacticPuzzleNotes report
    // a 4.75% fire rate.
    //
    // What this test is FOR is the render timing and the origin framing, both
    // of which are independent of the bake. The silence rule for floating
    // notes has its own gate in danyaTeachingService.spokenBeat.test.ts.
    teachingSource.mockReturnValue({
      origin: 'structure',
      note: {
        id: 'n1', lineSan: ['d4', 'd5', 'c4'], opening: null, phase: 'middlegame',
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

// David 2026-08-09, on tactics: "Make sure you can move back and forward with
// arrows. Auto advance. Adaptive rating that increases with solves."
//
// Auto-advance was already pinned above. These cover the other two, which had
// no test at all: the arrows were only ever used to prove they CANCEL the
// auto-advance, never that they actually move between puzzles, and the
// adaptive rating was untested end to end.
describe('the arrows move between puzzles', () => {
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

  it('forward advances and back returns to the puzzle just left', async () => {
    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(screen.getByText('1 / 10')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nav-next'));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.getByText('2 / 10'), 'forward arrow did not advance').toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nav-prev'));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.getByText('1 / 10'), 'back arrow did not return').toBeInTheDocument();

    // …and forward again, so back is not a one-way trip out of the session.
    fireEvent.click(screen.getByTestId('nav-next'));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.getByText('2 / 10')).toBeInTheDocument();
  });

  it('back is disabled on the first puzzle — there is nowhere to go', async () => {
    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(screen.getByTestId('nav-prev')).toBeDisabled();

    fireEvent.click(screen.getByTestId('nav-next'));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.getByTestId('nav-prev'), 'back should enable once there is history').not.toBeDisabled();
  });
});

describe('the adaptive rating rises with solves', () => {
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

  /** The "Target: NNNN" readout is the adaptive rating the next puzzle is
   *  drawn at — the thing the student watches climb. */
  const target = (): number =>
    Number(/Target:\s*(\d+)/.exec(screen.getByText(/Target:/).textContent ?? '')?.[1] ?? NaN);

  it('climbs on each solve, and keeps climbing across a run', async () => {
    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    const start = target();
    expect(Number.isFinite(start)).toBe(true);

    fireEvent.click(screen.getByTestId('stub-solve'));
    await act(async () => { await vi.advanceTimersByTimeAsync(3200); });
    const afterOne = target();
    expect(afterOne, 'rating did not rise after a solve').toBeGreaterThan(start);

    fireEvent.click(screen.getByTestId('stub-solve'));
    await act(async () => { await vi.advanceTimersByTimeAsync(3200); });
    expect(target(), 'rating stopped climbing on the second solve').toBeGreaterThan(afterOne);
  });

  it('falls back on a miss — adaptive means both directions', async () => {
    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    fireEvent.click(screen.getByTestId('stub-solve'));
    await act(async () => { await vi.advanceTimersByTimeAsync(3200); });
    const afterSolve = target();

    fireEvent.click(screen.getByTestId('stub-fail'));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(target(), 'a miss must lower the target, or it is not adaptive').toBeLessThan(afterSolve);
  });

  it('shows the student the delta that moved it', async () => {
    // The climb is only motivating if it is visible — the +NN badge next to
    // the target is the feedback that makes the rating feel earned.
    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    fireEvent.click(screen.getByTestId('stub-solve'));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(screen.getByText(/^[+-]\d+$/), 'no rating delta shown after a solve').toBeInTheDocument();
  });
});

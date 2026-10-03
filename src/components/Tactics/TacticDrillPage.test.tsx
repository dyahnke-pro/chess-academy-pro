// The drill flows: a solve advances on its own, a fail sits with the solution,
// and the post-solve note appears only after grading — never as a mid-solve
// hint. Manual nav always wins over the pending auto-advance.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TacticDrillPage } from './TacticDrillPage';
import type { PuzzleOutcome } from '../Puzzles/PuzzleBoard';
import { buildPuzzleRecord, resetFactoryCounter } from '../../test/factories';

const { getPuzzle, teachingSource, themedNote } = vi.hoisted(() => ({
  getPuzzle: vi.fn(),
  teachingSource: vi.fn(),
  themedNote: vi.fn(),
}));

// The board is not under test — a stub that lets each scenario grade the
// puzzle the way a student would finish it.
vi.mock('../Puzzles/PuzzleBoard', () => ({
  PuzzleBoard: ({ onComplete, focusThemes }: { onComplete: (o: PuzzleOutcome) => void; focusThemes?: readonly string[] }) => (
    <div data-testid="stub-board" data-focus={(focusThemes ?? []).join(',')}>
      <button
        data-testid="stub-solve"
        onClick={() => onComplete({ correct: true, usedHint: false, hadRetry: false, showedSolution: false, cleanMoves: 0, solveTimeMs: 5000 })}
      >
        solve
      </button>
      <button
        data-testid="stub-fail"
        onClick={() => onComplete({ correct: false, usedHint: false, hadRetry: true, showedSolution: true, cleanMoves: 0, solveTimeMs: 9000 })}
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
  tacticNoteForPuzzleThemes: (...a: unknown[]) => themedNote(...a),
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

// Live walk 2026-10-03: a queen-fork puzzle was followed by "The knight jumps
// in, forking king and rook, and the rook falls next" — a theme note written
// for another board. David: "Use computer narrations if they are better".
describe('the computed explanation wins over a theme note', () => {
  beforeEach(() => {
    resetFactoryCounter();
    vi.useFakeTimers();
    teachingSource.mockReturnValue(null);
    themedNote.mockReturnValue({ text: 'The knight jumps in, forking king and rook, and the rook falls next.', id: 't1' });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('hands the note lookup the solution, so it can defer to the computed line', async () => {
    // A real puzzle (0CCT1, Ne2+ Kf1 Nxc3) — the computer explains it.
    getPuzzle.mockImplementation(async () => buildPuzzleRecord({
      id: '0CCT1', fen: '7R/1p4r1/1kp1P3/1p4p1/1q3nBp/5N1P/1PQ2PP1/6K1 w - - 3 33',
      moves: 'c2c3 f4e2 g1f1 e2c3', themes: ['crushing', 'fork', 'middlegame', 'short'],
    }));
    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    fireEvent.click(screen.getByTestId('stub-fail'));
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    // The decision lives in the note lookup (tacticPuzzleNotes.test): the page
    // must hand it the solution so it can see the board explains itself.
    expect(themedNote).toHaveBeenCalledWith(expect.objectContaining({
      solutionUci: ['c2c3', 'f4e2', 'g1f1', 'e2c3'],
    }));
  });

  it('the theme note still fills in where nothing was computed', async () => {
    getPuzzle.mockImplementation(async () => buildPuzzleRecord({ id: 'bad', fen: 'not a fen', moves: 'e2e4 e7e5' }));
    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    fireEvent.click(screen.getByTestId('stub-fail'));
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByTestId('post-solve-note').textContent).toContain('The knight jumps in');
  });
});

describe('a themed drill tells the board which theme it drills', () => {
  beforeEach(() => {
    resetFactoryCounter();
    vi.useFakeTimers();
    teachingSource.mockReturnValue(null);
    getPuzzle.mockImplementation(async () => buildPuzzleRecord({ id: 'p-1' }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('the Discovered Attacks card passes its Lichess themes as the focus', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/tactics/drill', state: { filterThemes: ['discoveredAttack'], filterLabel: 'Discovered Attacks' } }]}>
        <TacticDrillPage />
      </MemoryRouter>,
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(screen.getByTestId('stub-board').getAttribute('data-focus')).toBe('discoveredAttack');
  });
});

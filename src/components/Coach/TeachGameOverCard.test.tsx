// The behavioural half of the black-screen fix.
//
// David reported it once: "Screen went black with checkmate (didn't show the
// final move)." The fix shipped the same night with nothing but a source-grep
// behind it — and this session had already watched a lane look perfectly wired
// and reach nobody for two full rounds, so a grep is not enough for the second
// thing he asked for in the same message.
//
// The live path cannot be driven here: ending a real game needs a real mate,
// and the headless Stockfish worker thrashes badly enough that driven games
// stall around ply 21 (measured — `forceRestart` / `recoverStuckAnalysis` /
// a random last-resort move, twice in a row). So the card is its own component
// and this renders it directly.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { db } from '../../db/schema';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { TeachGameOverCard } from './TeachGameOverCard';

// The card can offer the first-run import, which navigates, so it lives in a
// router like it does in the app.
const render = (ui: ReactElement): ReturnType<typeof rtlRender> => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

describe('the finished game keeps the board', () => {
  // A returning student: the first-run journey is done.
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.meta.put({ key: 'first_run_step', value: 'done' });
  });

  it('offers the review instead of taking it', async () => {
    // THE WHOLE BUG IN ONE ASSERTION: rendering the finished state must not
    // navigate. The old code did it from an effect, so the board was gone
    // before the student could look at the move that ended the game.
    const onReview = vi.fn();
    const onStay = vi.fn();
    render(<TeachGameOverCard result="loss" byMate onReview={onReview} onStay={onStay} />);

    expect(onReview, 'the card left for the review on its own').not.toHaveBeenCalled();
    expect(screen.getByTestId('teach-game-over')).toBeInTheDocument();
    expect(screen.getByTestId('teach-review-game')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('teach-review-game'));
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it('lets the student stay on the board', async () => {
    const onReview = vi.fn();
    const onStay = vi.fn();
    render(<TeachGameOverCard result="win" byMate onReview={onReview} onStay={onStay} />);
    await userEvent.click(await screen.findByTestId('teach-stay-on-board'));
    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onReview).not.toHaveBeenCalled();
  });

  it('says what happened, and names a mate as a mate', () => {
    const cases: Array<[Parameters<typeof TeachGameOverCard>[0]['result'], boolean, string]> = [
      ['win', true, 'Checkmate — you win.'],
      ['win', false, 'You win.'],
      ['loss', true, "Checkmate — that's the game."],
      ['loss', false, "That's the game."],
      ['draw', false, "That's a draw."],
      // A draw is a draw however it arrived; there is no "checkmate draw".
      ['draw', true, "That's a draw."],
      // End Lesson with a game in progress: saved, nobody lost (C7).
      ['ended', false, 'Lesson ended — the game is saved.'],
    ];
    for (const [result, byMate, expected] of cases) {
      const { unmount } = render(
        <TeachGameOverCard result={result} byMate={byMate} onReview={vi.fn()} onStay={vi.fn()} />,
      );
      expect(screen.getByText(expected), `${result}/${byMate}`).toBeInTheDocument();
      unmount();
    }
  });

  it('tells the student the board is still worth looking at', () => {
    // The line that does the actual work of the fix: it points them back at
    // the position they were denied.
    render(<TeachGameOverCard result="loss" byMate onReview={vi.fn()} onStay={vi.fn()} />);
    expect(screen.getByText(/final position is on the board/i)).toBeInTheDocument();
  });
});

describe('the first game ends on Continue', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('Continue leads on, Review stays a choice, Stay is gone', async () => {
    render(<TeachGameOverCard result="win" byMate onReview={vi.fn()} onStay={vi.fn()} />);
    expect(await screen.findByTestId('first-run-continue')).toBeInTheDocument();
    expect(screen.getByTestId('teach-review-game')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('teach-stay-on-board')).toBeNull());
  });

  it('a tap ends the level-up fireworks at once', async () => {
    const { container } = render(
      <TeachGameOverCard result="win" byMate onReview={vi.fn()} onStay={vi.fn()}
        skills={[{ label: 'Tactics', delta: 30, level: 9, levelChange: 1 }]} />,
    );
    const sparks = (): number => container.querySelectorAll('[data-testid="teach-recap-levelup"] span[aria-hidden]').length;
    expect(sparks()).toBeGreaterThan(0);
    fireEvent.pointerDown(screen.getByTestId('teach-game-over'));
    expect(sparks()).toBe(0);
  });
});

// THE FOCUS RECAP (WO-FOCUS-TACTICS-01, David 2026-10-22: "a quick review on
// the end game recap can show where it was with a chance to play out. Never
// show the answer!").
describe('the focus recap', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.meta.put({ key: 'first_run_step', value: 'done' });
  });
  const missed = (ply: number, label: string): import('../../coach/focus/focusRunner').MissedChance => ({
    ply, fenBefore: '4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1', seat: 'defend', kind: 'save', tag: 'missed-opponents-threat',
    difficulty: 1, line: ['e4c3'], solve: 1, label,
  });

  it('the end line, the rung progress, and every miss with Play it out — never the answer', async () => {
    const onPlayOut = vi.fn();
    const m = missed(9, 'Move 5 — your knight on e4 was loose');
    render(<TeachGameOverCard result="loss" byMate={false} onReview={vi.fn()} onStay={vi.fn()}
      focus={{ line: 'Tactics today: you missed your one chance. Review has the rest.', progress: '1 of 3 finds to Intermediate', missed: [m], playedOut: new Set(), onPlayOut }} />);
    expect(screen.getByTestId('teach-recap-focus').textContent).toContain('Tactics today');
    expect(screen.getByTestId('teach-recap-rung').textContent).toBe('1 of 3 finds to Intermediate');
    expect(screen.getByTestId('teach-recap-missed').textContent).toContain('Move 5 — your knight on e4 was loose');
    expect(screen.getByTestId('teach-recap-focus').textContent).not.toMatch(/Nc3|c3/);
    await userEvent.click(screen.getByTestId('teach-recap-play-out'));
    expect(onPlayOut).toHaveBeenCalledWith(m);
  });

  it('a miss already played out says Found; the top rung shows no progress', () => {
    render(<TeachGameOverCard result="win" byMate={false} onReview={vi.fn()} onStay={vi.fn()}
      focus={{ line: 'Tactics today: you found your one chance. Review has the rest.', progress: null, missed: [missed(9, 'Move 5 — a loose piece of theirs'), missed(21, 'Move 11 — a shot that wins material')], playedOut: new Set([9]), onPlayOut: vi.fn() }} />);
    expect(screen.getAllByTestId('teach-recap-played')).toHaveLength(1);
    expect(screen.getAllByTestId('teach-recap-play-out')).toHaveLength(1);
    expect(screen.queryByTestId('teach-recap-rung')).toBeNull();
  });

  it('the tempo run: the longest, and a new best gets the badge (David 2026-10-22)', () => {
    const base = { line: 'Tactics today: you found your one chance. Review has the rest.', progress: null, missed: [], playedOut: new Set<number>(), onPlayOut: vi.fn() };
    const { unmount } = render(<TeachGameOverCard result="win" byMate={false} onReview={vi.fn()} onStay={vi.fn()} focus={{ ...base, tempo: { longest: 3, best: 2, newBest: true } }} />);
    expect(screen.getByTestId('teach-recap-tempo').textContent).toBe('Longest tempo run: 3 — new best!');
    expect(screen.getByTestId('teach-recap-tempo-badge')).toBeTruthy();
    unmount();
    const { unmount: u2 } = render(<TeachGameOverCard result="win" byMate={false} onReview={vi.fn()} onStay={vi.fn()} focus={{ ...base, tempo: { longest: 2, best: 4, newBest: false } }} />);
    expect(screen.getByTestId('teach-recap-tempo').textContent).toBe('Longest tempo run: 2 (best 4)');
    expect(screen.queryByTestId('teach-recap-tempo-badge')).toBeNull();
    u2();
    render(<TeachGameOverCard result="win" byMate={false} onReview={vi.fn()} onStay={vi.fn()} focus={{ ...base, tempo: { longest: 1, best: 0, newBest: false } }} />);
    expect(screen.queryByTestId('teach-recap-tempo'), 'a single tempo move is no run').toBeNull();
  });

  it('no focus, no row', () => {
    render(<TeachGameOverCard result="win" byMate={false} onReview={vi.fn()} onStay={vi.fn()} />);
    expect(screen.queryByTestId('teach-recap-focus')).toBeNull();
  });
});

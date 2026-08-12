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
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeachGameOverCard } from './TeachGameOverCard';

describe('the finished game keeps the board', () => {
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
    await userEvent.click(screen.getByTestId('teach-stay-on-board'));
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

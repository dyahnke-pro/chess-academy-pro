// THE GAME IS OVER AND THE BOARD IS STILL THERE.
//
// 🔒 THE NINETY-ONE SECONDS OF BLACK SCREEN (David 2026-08-11: "Screen went
// black with checkmate (didn't show the final move) I want the board to persist
// and an option to review to pop up instead of transitioning to black without
// showing the final move.").
//
// Learn used to call `navigate('/coach/review/…')` from an effect the instant
// `isGameOver` flipped. He never saw the mating move land, and then sat on an
// empty screen for a minute and a half while the review ran its Stockfish pass
// — measured on his own game: mate at 20:39:22, review usable at 20:40:53.
//
// The record is still written the moment the game ends, so nothing is lost.
// What changed is that LEAVING is a tap rather than a consequence: the mating
// move stays on the squares behind this card until he chooses to go.
//
// WHY THIS IS ITS OWN FILE. It shipped once with no proof and the same class of
// bug — a lane that looked wired and reached nobody — cost two rounds elsewhere
// in the same session. Ending a real game on demand is not reachable from the
// audit container (the headless Stockfish worker thrashes, so games stall out
// around ply 21), so the only way to hold this to a behavioural test rather
// than a source-grep is to make it a component small enough to render on its
// own. See `TeachGameOverCard.test.tsx`.
import { ChevronRight } from 'lucide-react';

export type TeachGameResult = 'win' | 'loss' | 'draw';

export interface TeachGameOverCardProps {
  result: TeachGameResult;
  /** Checkmate rather than resignation / flag / agreement. Only changes the
   *  wording — a mate is worth naming, a draw is a draw. */
  byMate: boolean;
  /** Tapped "Review this game". The ONLY route off this screen. */
  onReview: () => void;
  /** Tapped "Stay here" — dismisses the card and leaves the board. */
  onStay: () => void;
}

function headline(result: TeachGameResult, byMate: boolean): string {
  if (result === 'win') return byMate ? 'Checkmate — you win.' : 'You win.';
  if (result === 'loss') return byMate ? "Checkmate — that's the game." : "That's the game.";
  return "That's a draw.";
}

export function TeachGameOverCard({ result, byMate, onReview, onStay }: TeachGameOverCardProps): JSX.Element {
  return (
    <div className="px-3 pb-2 space-y-2" data-testid="teach-game-over">
      <div className="text-sm font-semibold text-theme-text px-1">{headline(result, byMate)}</div>
      <div className="text-xs text-theme-text-muted px-1">
        The final position is on the board. Take a look before you move on.
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onReview}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-theme-accent text-theme-bg text-sm font-semibold min-h-[44px] transition-colors"
          data-testid="teach-review-game"
        >
          <ChevronRight size={16} />
          Review this game
        </button>
        <button
          onClick={onStay}
          className="px-3 py-2.5 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-bg text-sm font-medium text-theme-text min-h-[44px] transition-colors"
          data-testid="teach-stay-on-board"
        >
          Stay here
        </button>
      </div>
    </div>
  );
}

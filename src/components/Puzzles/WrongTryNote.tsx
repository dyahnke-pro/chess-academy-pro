/** WHY THE WRONG TRY FAILS — the one rendering of `refuteWrongTry`'s sentence
 *  for every board that can't show the wrong move itself (the playout boards
 *  test a move on a copy). On screen, so a student with voice off reads it. */
export function WrongTryNote({ text }: { text: string | null }): JSX.Element | null {
  if (!text) return null;
  return (
    <p className="text-xs text-red-400 px-1 leading-snug" data-testid="wrong-try-refutation">
      {text}
    </p>
  );
}

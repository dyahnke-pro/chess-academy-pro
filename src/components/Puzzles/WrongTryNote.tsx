import { useEffect } from 'react';
import { voiceService } from '../../services/voiceService';

/** WHY THE WRONG TRY FAILS — the one rendering of `refuteWrongTry`'s sentence
 *  for every board that can't show the wrong move itself (the playout boards
 *  test a move on a copy). On screen, so a student with voice off reads it,
 *  and SPOKEN (verbosity-gated), so it reaches the student the way the puzzle
 *  board's refutation does (hand walk 2026-10-01: the four playout boards
 *  showed it in silence). A host that speaks it itself — folding in a line of
 *  its own — passes `speak={false}`. */
export function WrongTryNote({ text, speak = true }: { text: string | null; speak?: boolean }): JSX.Element | null {
  useEffect(() => {
    if (speak && text) void voiceService.speak(text);
  }, [speak, text]);
  if (!text) return null;
  return (
    <p className="text-xs text-red-400 px-1 leading-snug" data-testid="wrong-try-refutation">
      {text}
    </p>
  );
}

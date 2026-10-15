// The sentence that closes a "Show me" better line: where the line leaves the
// side that played it, set against where the game move left them (review tape
// 2026-10-15: "That line still comes out behind, by a little." — behind, and
// better than what?).
import { costWords, isMateEval } from './engineConstants';

/** `lineCp` and `playedCp` are from the mover's side; `playedCp` null when the
 *  game move's eval is unknown or a mate score (no honest comparison). */
export function betterLineClosing(args: { endsInMate: boolean; lineCp: number; playedCp: number | null }): string {
  if (args.endsInMate) return 'That line goes all the way to mate.';
  const where = args.lineCp >= 0
    ? `That line comes out ahead by ${costWords(args.lineCp)}`
    : `That line still comes out behind, by ${costWords(-args.lineCp)}`;
  const gap = args.playedCp === null || isMateEval(args.playedCp) ? 0 : args.lineCp - args.playedCp;
  return `${where}${gap >= 50 ? ` — ${costWords(gap)} better than the move played` : ''}.`;
}

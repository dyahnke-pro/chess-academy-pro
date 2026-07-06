/**
 * moveReasonOptions — deterministic "why did you play that?" reason chips.
 *
 * Part of the coach-voice faucet (CLAUDE.md §"THE APP'S COACH VOICE + THE
 * 'WHY DID YOU PLAY THAT?' FAUCET"; plan:
 * docs/plans/2026-07-06-coach-voice-why-faucet.md).
 *
 * THE HONESTY CONTRACT: the picker must NOT telegraph the answer. These
 * options are plausible INTENTS a player could have had, derived from the
 * move's MECHANICS (chess.js) only — never from whether the move was good or
 * bad, never naming the specific tactic/square. Generic decoys ("I saw a
 * tactic", "It looked natural") are ALWAYS present so the presence of any one
 * chip can't tell the student what the right answer was. The student's honest
 * pick vs. the board's truth is the diagnostic delta (graded in the reveal,
 * never here). Everything is code (G0) — no LLM.
 */
import { Chess } from 'chess.js';

/** Decoys that are ALWAYS present so no chip telegraphs the answer. */
const DECOYS = ['I saw a tactic', 'It looked like the natural move'] as const;

/** Build the reason chips for a played move. The panel appends "Type your
 *  answer" + a Hint button; this returns only the tappable intent chips,
 *  capped so the list stays scannable. */
export function buildMoveReasonOptions(fenBefore: string, playedSan: string): string[] {
  let mv: ReturnType<Chess['move']> | null = null;
  try {
    mv = new Chess(fenBefore).move(playedSan);
  } catch {
    mv = null;
  }
  if (!mv) {
    return dedupeCap(['To make a threat', 'To improve my position', ...DECOYS]);
  }

  const opts: string[] = [];
  const san = mv.san;
  const isCheck = san.includes('+') || san.includes('#');
  const isCastle = mv.isKingsideCastle() || mv.isQueensideCastle();
  const captured = !!mv.captured;
  const piece = mv.piece; // 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

  if (isCastle) opts.push('To get my king safe');
  if (captured) {
    opts.push('To win material');
    opts.push('To trade pieces off');
  }
  if (isCheck) opts.push('To attack the king');
  if ((piece === 'n' || piece === 'b') && !captured && !isCheck) opts.push('To develop a piece');
  if (piece === 'p' && !captured) opts.push('To grab space or open a line');
  if (piece === 'k' && !isCastle) opts.push('To keep my king safe');
  if (isRetreat(mv.color, mv.from, mv.to) && piece !== 'p') opts.push('To move the piece to safety');
  opts.push('To defend');

  // Decoys always included so no chip can telegraph the truth.
  return dedupeCap([...opts, ...DECOYS]);
}

/** A move toward the mover's own back rank reads as a retreat. */
function isRetreat(color: 'w' | 'b', from: string, to: string): boolean {
  const fromRank = Number(from[1]);
  const toRank = Number(to[1]);
  return color === 'w' ? toRank < fromRank : toRank > fromRank;
}

/** Dedupe preserving order, cap at 5 so the picker stays tappable. */
function dedupeCap(all: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of all) {
    if (seen.has(o)) continue;
    seen.add(o);
    out.push(o);
  }
  return out.slice(0, 5);
}

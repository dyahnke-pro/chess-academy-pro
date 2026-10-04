/**
 * wrongTapTag — WHICH wrong square says WHY (Learn how to think C4, 2026-10-04).
 *
 * A wrong tap on a question the coach asked is the most controlled mistake the
 * app ever sees: the position, the question and the key are all known, so the
 * square the student pointed at can name the misconception directly instead of
 * inferring it from a move. ONE computer, shared by every surface that asks a
 * tap question (lessons, Analysis Practice, the Review reading card).
 *
 * CONSERVATIVE BY DESIGN — null whenever the board does not prove the reading.
 * A wrong tag on the spine is worse than no tag: it drills the wrong habit. The
 * readings it makes:
 *
 *  • THEIR piece when the question was about YOURS → they looked for their own
 *    chances and skipped their safety: `missed-opponents-threat`.
 *  • an ATTACKED-BUT-DEFENDED piece of the asked side, on a question about
 *    winning material → they saw the attacker and did not count the defenders:
 *    the question's own tag (a pawn guard is a defender like any other).
 *
 * An empty square, a key with no pieces, a question with no material tag, an
 * unreadable board — all null.
 */
import { Chess } from 'chess.js';
import type { Color, Square } from 'chess.js';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { AnswerHelp } from './capabilityEvidence';
import { logMisconception } from './misconceptionService';
import type { MisconceptionSource } from '../types';

/** Question tags that ask "what can be won" — where an attacked-but-defended
 *  tap means the defenders were not counted. */
const COUNTING_TAGS: ReadonlySet<MisconceptionTagId> = new Set<MisconceptionTagId>(['hung-material', 'missed-tactic']);

export function wrongTapTag(a: {
  fen: string;
  key: readonly Square[];
  square: Square;
  questionTag: MisconceptionTagId | null;
  /** The student's side — "yours" in the question. */
  studentColor: Color;
}): MisconceptionTagId | null {
  if (a.key.includes(a.square)) return null;            // not a wrong tap
  let chess: Chess;
  try { chess = new Chess(a.fen); } catch { return null; }
  const tapped = chess.get(a.square);
  if (!tapped) return null;                               // an empty square proves nothing
  const keyColors = new Set<Color>();
  for (const k of a.key) {
    const p = chess.get(k);
    if (p) keyColors.add(p.color);
  }
  if (keyColors.size === 0) return null;
  const them: Color = a.studentColor === 'w' ? 'b' : 'w';

  // Asked about YOURS, pointed at THEIRS.
  if (keyColors.size === 1 && keyColors.has(a.studentColor) && tapped.color === them) {
    return 'missed-opponents-threat';
  }

  // A defended piece of the side the question asked about, on a counting question.
  if (a.questionTag && COUNTING_TAGS.has(a.questionTag) && keyColors.has(tapped.color) && tapped.type !== 'k') {
    const enemy: Color = tapped.color === 'w' ? 'b' : 'w';
    const attacked = chess.attackers(a.square, enemy).length > 0;
    const defended = chess.attackers(a.square, tapped.color).length > 0;
    if (attacked && defended) return a.questionTag;
  }
  return null;
}

/**
 * Write the misconception each distinct wrong-tap tag names, through the ONE
 * spine writer (`logMisconception`). Returns the tags written. Never stamps a
 * `sourceGameId` (see `MisconceptionSource` 'lesson' / 'reading').
 */
export async function recordWrongTapMisconceptions(args: {
  tags: readonly MisconceptionTagId[];
  fen: string;
  source: Extract<MisconceptionSource, 'lesson' | 'reading'>;
  /** What the student pointed at, for the record. */
  taps: readonly string[];
  help: AnswerHelp;
}): Promise<MisconceptionTagId[]> {
  const written: MisconceptionTagId[] = [];
  for (const tag of new Set(args.tags)) {
    try {
      const rec = await logMisconception({
        tag,
        source: args.source,
        fen: args.fen,
        playedSan: args.taps.join(' '),
        coachNote: args.help === 'none' ? undefined : `answered with help: ${args.help}`,
      });
      if (rec) written.push(tag);
    } catch { /* the record never breaks the question */ }
  }
  return written;
}

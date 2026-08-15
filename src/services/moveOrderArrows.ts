// THE BOARD WALKS THE LINE THE NOTE RECITES.
//
// David 2026-08-15: "The gate should not reject based on length. Or on moves.
// However arrows are needed to illustrate the move order so beginners and
// intermediates do not get lost in the wording."
//
// The bake used to REFUSE a note that walked a line — 567 rejected for "move
// dictation", 566 for ellipsis notation, on top of 1,373 for length. That threw
// away the substantive teaching and kept the trivia: a note rich enough to be
// worth speaking is exactly the one that recites a sequence. dt-48c, heard on
// prod, was one of them, and reached the student as pruned raw transcript
// because it never baked.
//
// So the moves stay in the wording, and the DEFICIT they create is fixed where
// it actually exists — on the board. "After d4 e5 dxe5 Nc6 Nf3, Black's main
// tricky move is Qe7" is four plies a beginner has to hold in their head from
// audio alone. Drawn as arrows in the order spoken, it is something they can
// watch instead.
//
// G0 throughout: every arrow below is chess.js replaying the note's own moves
// from the note's own position. Nothing here decides which moves matter — the
// note already said them, and this only finds where they land.
import { Chess } from 'chess.js';

export interface MoveOrderArrow {
  from: string;
  to: string;
  /** 1-based position in the recited sequence, so a caller can reveal them in
   *  step with the sentence rather than all at once. */
  order: number;
  san: string;
  /** Which side played it — callers colour the two sides differently so a
   *  student can see whose move is whose without being told. */
  color: 'w' | 'b';
}

/** SAN tokens as they appear in note prose. Deliberately strict: a bare square
 *  ("the e5 pawn") is NOT a move and must not become an arrow. */
const SAN_TOKEN = /\b(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

/**
 * The move order a note recites, resolved into board arrows.
 *
 * `fen` is the position the note is anchored at — the moves are replayed FROM
 * there, which is what makes each arrow a real from/to rather than a guess at
 * what square a name refers to.
 *
 * Returns [] when the note recites nothing, when the tokens are not legal from
 * this position, or when only a single move is named (one move is already the
 * move being played; it needs no sequence to follow). Silence rather than a
 * partial walk: half a line drawn is more confusing than none.
 */
export function moveOrderArrows(noteText: string, fen: string, maxPlies = 8): MoveOrderArrow[] {
  if (!noteText) return [];
  let board: Chess;
  try {
    board = new Chess(fen);
  } catch {
    return [];
  }

  SAN_TOKEN.lastIndex = 0;
  const tokens = noteText.match(SAN_TOKEN) ?? [];
  if (tokens.length < 2) return [];

  const out: MoveOrderArrow[] = [];
  for (const raw of tokens) {
    if (out.length >= maxPlies) break;
    let mv;
    try {
      mv = board.move(raw);
    } catch {
      mv = null;
    }
    if (!mv) {
      // THE FIRST ILLEGAL TOKEN ENDS THE WALK, and does not skip past it.
      //
      // A note names moves from more than one line ("if Black plays Bf4 …
      // after Qb4+ Bd2"), so continuing past a token that does not fit would
      // silently splice two different variations into one arrow sequence and
      // present it as the move order. What survives is the prefix that is
      // provably one legal line from this board.
      break;
    }
    out.push({
      from: mv.from,
      to: mv.to,
      order: out.length + 1,
      san: mv.san,
      color: mv.color,
    });
  }

  // One arrow is not a sequence — the move being played is already on the
  // board and drawn by the surface's own move highlight.
  return out.length >= 2 ? out : [];
}

/** Where each recited move sits in the prose, so a caller revealing the note
 *  sentence by sentence can paint each arrow as its move is actually said —
 *  the lead-the-eye rule, applied to a line rather than to a single move. */
export function moveOrderOffsets(noteText: string): number[] {
  if (!noteText) return [];
  const offsets: number[] = [];
  SAN_TOKEN.lastIndex = 0;
  let m = SAN_TOKEN.exec(noteText);
  while (m !== null) {
    offsets.push(m.index);
    m = SAN_TOKEN.exec(noteText);
  }
  return offsets;
}

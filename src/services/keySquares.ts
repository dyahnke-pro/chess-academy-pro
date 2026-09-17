// keySquares — TWO vocabularies, because there are TWO questions and one list
// was answering both (found reading the live merit clause, 2026-09-17).
//
//   Q1  "is this a central PAWN advance?"      → CENTRAL_SQUARES
//   Q2  "what squares does this piece now EYE?" → keyTargetSquares()
//
// They are not the same set, and the difference is the most-taught square in
// the opening. `Ng5` in the Two Knights eyes f7; `Bc4` stares at it; `Qh5` aims
// at it — and every Q2 site filtered the Q1 list, which has no f7 in it, so the
// coach was STRUCTURALLY incapable of naming it. Four sites shared the bug and
// each carried its own copy of the list:
//   groundedAnswer.CENTRAL_SQUARES (×2), moveFundamentals.CENTER,
//   reviewMoveTeaching.BROAD_CENTER.
//
// Lengthening the shared list was the obvious wrong fix: with f7 in it, Q1
// answers "stakes out the centre with the pawn to f7", which is false.
//
// And f7 is NOT special by decree — it is special because it sits BESIDE THE
// ENEMY KING, so Q2's set is COMPUTED from the board. That gets the rest for
// free and keeps moving when the king does: h7 and g7 become the soft squares
// once they castle to g8, f7 stops being one when the king walks away, and a
// hardcoded ['f7','f2'] would have been a fifth thing to drift.
import type { Chess } from 'chess.js';

/** 🔒 Q1 ONLY — the squares worth OCCUPYING with a pawn. Never add to this to
 *  answer Q2; that produces "stakes out the centre with the pawn to f7". */
export const CENTRAL_SQUARES: ReadonlyArray<string> = ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'];

/** The four squares that are the centre proper, for callers that distinguish. */
export const CORE_CENTER: ReadonlyArray<string> = ['d4', 'd5', 'e4', 'e5'];

/** 🔒 THE STANDING HOLES ARE SEAT-RELATIVE — the squares in front of a backward
 *  d- or e-pawn, and only the OPPONENT'S are worth training on.
 *
 *  Caught by reading the output: with these unscoped, `Bc4` produced "fighting
 *  for the center on d5, d3, e6 and f7" — and d3 is WHITE'S OWN hole, which the
 *  white bishop is merely covering on its way home. Naming it is the exact
 *  "trivial square" defect this module exists to remove, arriving through the
 *  fix for it. The seat decides, the way it decides everything else here. */
export function standingHoles(moverColor: 'white' | 'black'): ReadonlyArray<string> {
  return moverColor === 'white' ? ['d6', 'e6'] : ['d3', 'e3'];
}

/** Every square Q2 may name that is NOT king-relative, for this seat — the
 *  centre plus the opponent's standing holes. Exported so `kingZoneAmong` and
 *  its callers agree on which half of an eye-list is "central influence" and
 *  which is "pressure on the king". */
export function positionalTargets(moverColor: 'white' | 'black'): string[] {
  return [...CENTRAL_SQUARES, ...standingHoles(moverColor)];
}

/** Both sides' holes — for the one caller that classifies squares without a
 *  seat in hand. Prefer `positionalTargets`. */
export const POSITIONAL_TARGETS: ReadonlyArray<string> = [...CENTRAL_SQUARES, 'd3', 'e3', 'd6', 'e6'];

/** Where the enemy king stands, or null on an impossible board. */
function enemyKingSquare(board: Chess, moverColor: 'white' | 'black'): string | null {
  const enemy = moverColor === 'white' ? 'b' : 'w';
  for (const row of board.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === enemy) return cell.square;
    }
  }
  return null;
}

/** The up-to-8 squares around the enemy king. NOT the king's own square — a
 *  piece attacking that is giving CHECK, which is a different lane with a
 *  better sentence already. */
export function kingZoneSquares(board: Chess, moverColor: 'white' | 'black'): string[] {
  const k = enemyKingSquare(board, moverColor);
  if (!k) return [];
  const out: string[] = [];
  const f = k.charCodeAt(0);
  const r = Number(k[1]);
  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      if (df === 0 && dr === 0) continue;
      const nf = f + df;
      const nr = r + dr;
      if (nf < 97 || nf > 104 || nr < 1 || nr > 8) continue;
      out.push(`${String.fromCharCode(nf)}${nr}`);
    }
  }
  return out;
}

/**
 * 🔒 Q2 — the squares worth NAMING when a piece trains on them: the centre,
 * plus the squares beside the enemy king.
 *
 * The standing holes (d3/e3/d6/e6) ride along — see STANDING_HOLES. What is
 * still OWED is the POSITION-SPECIFIC hole: a square no pawn can ever again
 * defend, which varies by structure. `boardStructure` computes outposts but
 * only OCCUPIED ones, so empty holes need their own computer first.
 */
export function keyTargetSquares(board: Chess, moverColor: 'white' | 'black'): string[] {
  const out = new Set<string>(positionalTargets(moverColor));
  try {
    for (const s of kingZoneSquares(board, moverColor)) out.add(s);
  } catch { /* the centre alone is still a true answer */ }
  return [...out];
}

/** Which of `eyes` sit beside the enemy king — the half worth calling out as
 *  pressure on the king rather than as central influence. "Eyeing e4 and f7"
 *  buries the entire point of Ng5 in a list. */
export function kingZoneAmong(
  eyes: readonly string[],
  board: Chess,
  moverColor: 'white' | 'black',
): string[] {
  const positional = new Set(positionalTargets(moverColor));
  const zone = new Set(kingZoneSquares(board, moverColor));
  return eyes.filter((s) => zone.has(s) && !positional.has(s));
}

/** The trailing clause naming king-zone pressure, or '' when there is none.
 *  One renderer, so the four call sites cannot phrase it four ways. */
export function kingZoneClause(nearKing: readonly string[]): string {
  if (nearKing.length === 0) return '';
  const list = nearKing.length === 1
    ? nearKing[0]
    : `${nearKing.slice(0, -1).join(', ')} and ${nearKing[nearKing.length - 1]}`;
  return ` — ${list} ${nearKing.length === 1 ? 'sits' : 'sit'} right beside their king`;
}

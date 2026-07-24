/**
 * reviewConcepts — STRATEGIC-CONCEPT detection for the post-game review walk
 * (David 2026-07-24: "build a concept level tool"). This is `detectTactics`
 * moved up one level: from "is there a fork" to "what IDEA does this move
 * express." It is the honest answer to the silent-middle gap the Naroditsky
 * side-by-side exposed — where he teaches the concept ("trading pieces when
 * you're winning is thinking concretely") we used to go silent, because we had
 * no grounded computer for the idea.
 *
 * THE G0 CONTRACT (why this is legal): the CODE decides which concept fires,
 * from a FINITE taxonomy where each entry has a COMPUTABLE precondition on the
 * board + engine eval. The trigger IS the concept's definition, so it is never
 * coincidence — "you traded while up +1.8" is board-true, and "trade when ahead
 * to bring the win closer" is true whenever that holds. When no precondition
 * holds → null → silence (empty > generic > invented). The returned `text` is a
 * fact string the house-voice pass phrases in Danya's register; the LLM never
 * chooses the concept and adds no chess content.
 *
 * Each concept records a `source` (an independent reference per the
 * verification doctrine): a `concept:<id>` into the book corpus where the idea
 * is tagged, or a reputable URL where the pre-1930s books don't state it
 * cleanly (the simplification principle → the Wikipedia endgame article, which
 * states it verbatim: "the player having a material advantage tries to exchange
 * pieces but avoids exchanging pawns").
 */
import { Chess, type Square, type PieceSymbol } from 'chess.js';

export interface ConceptCtx {
  fenBefore: string;
  fenAfter: string;
  san: string;
  /** Side that made this move. */
  moverColor: 'w' | 'b';
  /** Engine eval (White-POV centipawns) BEFORE and AFTER the move. */
  evalBefore: number | null;
  evalAfter: number | null;
  /** The student's side (for "you" vs "your opponent" framing). */
  studentColor: 'w' | 'b';
}

export interface ConceptBeat {
  /** Stable concept key (for the dedup ledger + telemetry). */
  concept: 'simplify-when-ahead' | 'outpost' | 'open-lines-at-king' | 'two-bishops' | 'convert-dont-rush';
  /** The fact string, board-anchored; the house voice phrases it. */
  text: string;
  /** Independent reference (concept:<id> | reputable URL). */
  source: string;
}

const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Total piece count on the board (both sides), pawns included. */
function pieceCount(fen: string): number {
  const rows = fen.split(' ')[0];
  let n = 0;
  for (const ch of rows) if (/[pnbrqkPNBRQK]/.test(ch)) n += 1;
  return n;
}

/** Eval from the mover's point of view (positive = mover better). */
function moverPovCp(cp: number | null, moverColor: 'w' | 'b'): number | null {
  if (cp === null) return null;
  return moverColor === 'w' ? cp : -cp;
}

const MINE = (mover: 'w' | 'b', student: 'w' | 'b'): boolean => mover === student;

/**
 * SIMPLIFY WHEN AHEAD — the `6…dxc6` case. Fires when the mover is CLEARLY
 * ahead and makes an EVEN TRADE (a capture the eval treats as level, reducing
 * material on the board), i.e. simplifying toward a won game rather than winning
 * fresh material. Triggers on board + engine facts only:
 *   • mover ahead ≥ +1.5 both before AND after (already winning, stays winning)
 *   • the eval barely moves (|Δ| ≤ 0.9) — a consolidating trade, not a swing
 *   • the move is a capture that dropped the total piece count
 * A move that WINS material makes the eval jump, so it's excluded here (that's a
 * different beat). Source: the principle is stated verbatim in the Wikipedia
 * endgame article (the classical books demonstrate but don't state it cleanly).
 */
function detectSimplifyWhenAhead(ctx: ConceptCtx): ConceptBeat | null {
  const before = moverPovCp(ctx.evalBefore, ctx.moverColor);
  const after = moverPovCp(ctx.evalAfter, ctx.moverColor);
  if (before === null || after === null) return null;
  if (before < 150 || after < 150) return null;            // must be clearly ahead, and stay ahead
  if (Math.abs(after - before) > 90) return null;          // a consolidating trade, not a material swing
  if (pieceCount(ctx.fenAfter) !== pieceCount(ctx.fenBefore) - 1) return null; // exactly one piece left = a clean capture/trade
  if (!/x/.test(ctx.san)) return null;                     // it was a capture
  // The trigger requires the MOVER to be ahead. If that's the student, it's
  // their winning technique; if it's the opponent, it's the technique that was
  // beating the student (recognise it, don't help it along).
  const mine = MINE(ctx.moverColor, ctx.studentColor);
  const text = mine
    ? `You're clearly ahead here, and when you're ahead the plan is to trade: every pair of pieces off the board strips your opponent's counterplay and carries you toward a won endgame.`
    : `Your opponent's ahead and simplifying — that's the winning side's technique: trade pieces to kill your counterplay. When you're the one behind, you want the opposite — keep pieces on and complicate.`;
  return { concept: 'simplify-when-ahead', text, source: 'https://en.wikipedia.org/wiki/Chess_endgame' };
}

/**
 * OUTPOST — a knight (or bishop) that lands on a square in enemy territory
 * where NO enemy pawn can ever challenge it, and a friendly pawn guards it. The
 * classic "hole they can't kick it off." Fully board-computable from fenAfter.
 * Source: concept:pos-outpost (the book corpus tags this idea).
 */
function detectOutpost(ctx: ConceptCtx): ConceptBeat | null {
  let dest: Square | null = null;
  let piece: PieceSymbol | null = null;
  try {
    const c = new Chess(ctx.fenBefore);
    const mv = c.move(ctx.san);
    if (!mv) return null;
    dest = mv.to as Square;
    piece = mv.piece;
  } catch { return null; }
  if (!dest || (piece !== 'n' && piece !== 'b')) return null;

  const file = dest.charCodeAt(0) - 97;       // 0..7 (a..h)
  const rank = parseInt(dest[1], 10);          // 1..8
  const mover = ctx.moverColor;
  // Outpost zone: advanced into enemy half (white ranks 4-6, black ranks 3-5).
  if (mover === 'w' && !(rank >= 4 && rank <= 6)) return null;
  if (mover === 'b' && !(rank >= 3 && rank <= 5)) return null;

  const board = new Chess(ctx.fenAfter);
  const enemy: 'w' | 'b' = mover === 'w' ? 'b' : 'w';

  // No enemy pawn on an ADJACENT file can ever advance to attack the square
  // (i.e. no enemy pawn currently sits on an adjacent file on a rank from which
  // it could still reach the two squares that guard `dest`).
  for (const df of [-1, 1]) {
    const f = file + df;
    if (f < 0 || f > 7) continue;
    const fileLetter = String.fromCharCode(97 + f);
    for (let r = 1; r <= 8; r++) {
      const sq = `${fileLetter}${r}` as Square;
      const p = board.get(sq);
      if (!p || p.type !== 'p' || p.color !== enemy) continue;
      // An enemy pawn can challenge `dest` if it is still BEHIND the outpost
      // (can advance toward it): white outpost is challenged by black pawns on a
      // higher rank; black outpost by white pawns on a lower rank.
      if (mover === 'w' && r > rank) return null;
      if (mover === 'b' && r < rank) return null;
    }
  }

  // Must be supported by a friendly pawn (a real outpost, not a loose leap).
  const supporters = board.attackers ? board.attackers(dest, mover) : [];
  let pawnGuard = false;
  for (const sq of supporters) {
    const p = board.get(sq as Square);
    if (p && p.type === 'p' && p.color === mover) { pawnGuard = true; break; }
  }
  if (!pawnGuard) return null;

  const pieceWord = piece === 'n' ? 'knight' : 'bishop';
  const mine = MINE(mover, ctx.studentColor);
  const text = mine
    ? `You've planted the ${pieceWord} on ${dest} as an outpost — no pawn can ever kick it off, and a pawn of yours holds it there. A piece that can't be challenged is worth more than the square it stands on.`
    : `Your opponent's ${pieceWord} settles on ${dest} as an outpost — no pawn can chase it off. Worth noting where it can't be challenged, so you can plan around it.`;
  return { concept: 'outpost', text, source: 'concept:pos-outpost' };
}

/** How many bishops `color` has on the board. */
function countBishops(fen: string, color: 'w' | 'b'): number {
  const rows = fen.split(' ')[0];
  const want = color === 'w' ? 'B' : 'b';
  let n = 0;
  for (const ch of rows) if (ch === want) n += 1;
  return n;
}

/** Enemy king still stuck in the centre (d/e files, on or near its back rank) —
 *  never castled to a wing. */
function enemyKingCentral(fen: string, enemy: 'w' | 'b'): boolean {
  const c = new Chess(fen);
  for (let r = 1; r <= 8; r++) {
    for (const f of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const sq = `${f}${r}` as Square;
      const p = c.get(sq);
      if (p && p.type === 'k' && p.color === enemy) {
        const centralFile = f === 'd' || f === 'e';
        const homeRank = enemy === 'w' ? (r === 1 || r === 2) : (r === 7 || r === 8);
        return centralFile && homeRank;
      }
    }
  }
  return false;
}

/**
 * OPEN LINES AT THE KING — the `4.d4` idea. A central PAWN break/capture that
 * cracks the centre open WHILE the enemy king is still stuck there. Board-
 * computable: pawn move on a central file (c-f), a capture (opens a line), and
 * the enemy king sits centrally (d/e, home ranks). Source: concept:pos-open-file.
 */
function detectOpenLinesAtKing(ctx: ConceptCtx): ConceptBeat | null {
  let mv;
  try { const c = new Chess(ctx.fenBefore); mv = c.move(ctx.san); } catch { return null; }
  if (!mv || mv.piece !== 'p' || !mv.captured) return null;      // a pawn capture opens a line
  const fromFile = mv.from[0];
  if (fromFile < 'c' || fromFile > 'f') return null;             // central file
  const enemy: 'w' | 'b' = ctx.moverColor === 'w' ? 'b' : 'w';
  if (!enemyKingCentral(ctx.fenAfter, enemy)) return null;
  const mine = MINE(ctx.moverColor, ctx.studentColor);
  const text = mine
    ? `You're cracking the centre open while their king is still stuck in it — with the files opening, every line runs straight at the uncastled king. Speed matters more than a pawn here.`
    : `Your opponent tears the centre open while your king is still in it — that's the danger of leaving the king in the middle; the open lines all point at it.`;
  return { concept: 'open-lines-at-king', text, source: 'concept:pos-open-file' };
}

/**
 * TWO BISHOPS — the move that trades into the bishop pair (mover ends with both
 * bishops vs the opponent's one-or-none) and DIDN'T have it a move ago. Board-
 * computable from bishop counts before/after. Source: concept:pos-bishop-pair.
 */
function detectTwoBishops(ctx: ConceptCtx): ConceptBeat | null {
  let mv;
  try { const c = new Chess(ctx.fenBefore); mv = c.move(ctx.san); } catch { return null; }
  // Capturing an enemy BISHOP with a non-bishop drops their bishop count THIS
  // move (so the pair is newly established) while keeping ours intact.
  if (!mv || mv.captured !== 'b' || mv.piece === 'b') return null;
  const enemy: 'w' | 'b' = ctx.moverColor === 'w' ? 'b' : 'w';
  const myB = countBishops(ctx.fenAfter, ctx.moverColor);
  const enemyB = countBishops(ctx.fenAfter, enemy);
  if (myB !== 2 || enemyB > 1) return null;                              // clean pair asymmetry now
  // Even trade — the imbalance is the PAIR, not a won piece (a capture that
  // wins material makes the eval jump; that's a different, bigger story).
  const before = moverPovCp(ctx.evalBefore, ctx.moverColor);
  const after = moverPovCp(ctx.evalAfter, ctx.moverColor);
  if (before === null || after === null || Math.abs(after - before) > 110) return null;
  const mine = MINE(ctx.moverColor, ctx.studentColor);
  const text = mine
    ? `That leaves you the two bishops against their single minor — in an open position the pair is a lasting edge, raking both diagonals from long range. Keep the position open for them.`
    : `Your opponent's kept the two bishops against your single minor — a long-term edge in open positions. Closing the position, not opening it, is how you blunt them.`;
  return { concept: 'two-bishops', text, source: 'concept:pos-bishop-pair' };
}

/**
 * CONVERT, DON'T RUSH — up a clear amount, in a simplified position, playing a
 * QUIET improving move (no capture, no check, eval steady). The technique of a
 * won game: improve, trade, don't force. Board + engine computable. Source:
 * concept:pos-centralization (improving the pieces is the corpus-tagged idea).
 */
function detectConvertDontRush(ctx: ConceptCtx): ConceptBeat | null {
  const before = moverPovCp(ctx.evalBefore, ctx.moverColor);
  const after = moverPovCp(ctx.evalAfter, ctx.moverColor);
  if (before === null || after === null) return null;
  if (before < 250) return null;                                 // clearly up
  if (Math.abs(after - before) > 60) return null;                // steady, not a swing
  if (/x|\+|=/.test(ctx.san)) return null;                       // quiet: no capture/check/promo
  if (pieceCount(ctx.fenAfter) > 16) return null;                // simplified enough to be technique
  const mine = MINE(ctx.moverColor, ctx.studentColor);
  if (!mine) return null;                                        // "how to convert" is the student's lesson
  const text = `You're up material with the position simplified — no need to force anything. Improve your worst piece, trade when it's offered, and let the extra material decide. Winning won positions is about patience, not haste.`;
  return { concept: 'convert-dont-rush', text, source: 'concept:pos-centralization' };
}

/**
 * Detect the highest-priority strategic concept this move expresses, or null.
 * Order = teaching specificity: a sharp attacking break or a structural
 * imbalance is a more pointed lesson than the general "trade when ahead", which
 * beats the very general "don't rush". Extend the taxonomy by adding detectors.
 */
export function detectConcept(ctx: ConceptCtx): ConceptBeat | null {
  return detectOpenLinesAtKing(ctx)
    ?? detectOutpost(ctx)
    ?? detectTwoBishops(ctx)
    ?? detectSimplifyWhenAhead(ctx)
    ?? detectConvertDontRush(ctx);
}

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
  concept: 'simplify-when-ahead' | 'outpost' | 'open-lines-at-king' | 'two-bishops'
    | 'convert-dont-rush' | 'passed-pawn-push' | 'rook-seventh' | 'rook-open-file'
    | 'king-safety-castle' | 'centralize-king' | 'space-advantage';
  /** The fact string, board-anchored; the house voice phrases it. */
  text: string;
  /** Independent reference (concept:<id> | reputable URL). */
  source: string;
}

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
    dest = mv.to;
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
    const p = board.get(sq);
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
  if (!mv || mv.piece !== 'p') return null;
  const enemy: 'w' | 'b' = ctx.moverColor === 'w' ? 'b' : 'w';
  // Two ways a central pawn move cracks the centre open:
  //   (a) a CAPTURE on a central file (opens a line immediately), or
  //   (b) a PUSH that is a BREAK — its capture squares hit an enemy pawn, so it
  //       forces lines open (the 4.d4 idea: "tearing the centre apart").
  const fromFile = mv.from[0];
  const toFile = mv.to[0];
  const centralCapture = !!mv.captured && fromFile >= 'c' && fromFile <= 'f';
  let breakPush = false;
  if (!mv.captured && toFile >= 'c' && toFile <= 'f') {
    const after = new Chess(ctx.fenBefore);       // scan the pre-move board for an enemy centre pawn the push attacks
    const tf = toFile.charCodeAt(0) - 97;
    const tr = parseInt(mv.to[1], 10);
    const capRank = ctx.moverColor === 'w' ? tr + 1 : tr - 1;
    for (const df of [-1, 1]) {
      const f = tf + df;
      if (f < 0 || f > 7 || capRank < 1 || capRank > 8) continue;
      const sq = `${String.fromCharCode(97 + f)}${capRank}` as Square;
      const p = after.get(sq);
      if (p && p.type === 'p' && p.color === enemy) breakPush = true;
    }
  }
  if (!centralCapture && !breakPush) return null;
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

/** A pawn on `square` (of `color`) is passed: no enemy pawn on its file or the
 *  adjacent files anywhere AHEAD of it. */
function isPassedPawn(fen: string, square: Square, color: 'w' | 'b'): boolean {
  const c = new Chess(fen);
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10);
  const enemy: 'w' | 'b' = color === 'w' ? 'b' : 'w';
  for (const df of [-1, 0, 1]) {
    const f = file + df;
    if (f < 0 || f > 7) continue;
    for (let r = 1; r <= 8; r++) {
      const ahead = color === 'w' ? r > rank : r < rank;
      if (!ahead) continue;
      const p = c.get(`${String.fromCharCode(97 + f)}${r}` as Square);
      if (p && p.type === 'p' && p.color === enemy) return false;
    }
  }
  return true;
}

/** A file (0..7) with no pawns of either colour. */
function fileIsOpen(fen: string, file: number): boolean {
  const c = new Chess(fen);
  for (let r = 1; r <= 8; r++) {
    const p = c.get(`${String.fromCharCode(97 + file)}${r}` as Square);
    if (p && p.type === 'p') return false;
  }
  return true;
}

/**
 * PASSED-PAWN PUSH — advancing a passed pawn past the midpoint toward promotion.
 * "Passed pawns must be pushed." Board-computable. Source: concept:pawn-passed.
 */
function detectPassedPawnPush(ctx: ConceptCtx): ConceptBeat | null {
  let mv;
  try { const c = new Chess(ctx.fenBefore); mv = c.move(ctx.san); } catch { return null; }
  if (!mv || mv.piece !== 'p' || mv.captured) return null;      // a push, not a capture
  const dest = mv.to;
  const rank = parseInt(dest[1], 10);
  if (ctx.moverColor === 'w' && rank < 4) return null;          // past the midpoint = a real runner
  if (ctx.moverColor === 'b' && rank > 5) return null;
  if (!isPassedPawn(ctx.fenAfter, dest, ctx.moverColor)) return null;
  const mine = MINE(ctx.moverColor, ctx.studentColor);
  const file = dest[0];
  const text = mine
    ? `You're pushing your passed pawn on the ${file}-file — passed pawns are made to be pushed. It ties a piece down to babysit it, and the moment it's ignored, it queens.`
    : `Your opponent's passed pawn on the ${file}-file is rolling — it will tie your pieces down to stop it. Blockade it on a dark/light square a knight or king can hold.`;
  return { concept: 'passed-pawn-push', text, source: 'concept:pawn-passed' };
}

/**
 * ROOK TO THE 7th / OPEN FILE — a rook landing on the 7th rank (2nd for Black)
 * or on a fully open file. Board-computable. Sources: concept:end-rook-7th /
 * concept:pos-open-file.
 */
function detectRookActivation(ctx: ConceptCtx): ConceptBeat | null {
  let mv;
  try { const c = new Chess(ctx.fenBefore); mv = c.move(ctx.san); } catch { return null; }
  if (!mv || mv.piece !== 'r') return null;
  const dest = mv.to;
  const rank = parseInt(dest[1], 10);
  const file = dest.charCodeAt(0) - 97;
  const mine = MINE(ctx.moverColor, ctx.studentColor);
  const seventh = ctx.moverColor === 'w' ? 7 : 2;
  if (rank === seventh) {
    const text = mine
      ? `Your rook reaches the 7th rank — the pigs on the seventh. It rakes their pawns from behind and pins their king to the back rank.`
      : `Your opponent's rook lands on your 2nd rank, raking the pawns from behind. Challenge it or block the file before a second rook joins it.`;
    return { concept: 'rook-seventh', text, source: 'concept:end-rook-7th' };
  }
  // Open file only counts if the rook actually just took it (moved onto it).
  if (fileIsOpen(ctx.fenAfter, file)) {
    const text = mine
      ? `Your rook swings onto the open ${dest[0]}-file — the one highway into their position. Open files belong to rooks; this is how they get into the game.`
      : `Your opponent seizes the open ${dest[0]}-file with the rook — the highway into your camp. Contest the file or your own rooks stay passive.`;
    return { concept: 'rook-open-file', text, source: 'concept:pos-open-file' };
  }
  return null;
}

/**
 * KING SAFETY — castling. Tucks the king away and brings a rook toward the
 * centre. Board-trivial. Source: concept:pos-king-safety.
 */
function detectCastle(ctx: ConceptCtx): ConceptBeat | null {
  if (ctx.san !== 'O-O' && ctx.san !== 'O-O-O') return null;
  const mine = MINE(ctx.moverColor, ctx.studentColor);
  const side = ctx.san === 'O-O' ? 'kingside' : 'queenside';
  const text = mine
    ? `You castle ${side} — the king tucks into safety and the rook swings toward the centre. Castling isn't only defence: it connects the rooks and brings your last piece into the game.`
    : `Your opponent castles ${side}, king to safety and rooks connected. Note which wing — it tells you where to aim your own pawns.`;
  return { concept: 'king-safety-castle', text, source: 'concept:pos-king-safety' };
}

/** Chebyshev distance from a square to the central 4 (d4/e4/d5/e5). */
function distToCentre(square: Square): number {
  const f = square.charCodeAt(0) - 97;
  const r = parseInt(square[1], 10) - 1;
  const df = Math.min(Math.abs(f - 3), Math.abs(f - 4));
  const dr = Math.min(Math.abs(r - 3), Math.abs(r - 4));
  return Math.max(df, dr);
}

/**
 * CENTRALIZE THE KING — in the endgame, a king move toward the centre (it gets
 * more central than it was). Board + piece-count computable. Source:
 * concept:pos-centralization.
 */
function detectCentralizeKing(ctx: ConceptCtx): ConceptBeat | null {
  let mv;
  try { const c = new Chess(ctx.fenBefore); mv = c.move(ctx.san); } catch { return null; }
  if (!mv || mv.piece !== 'k' || mv.san.startsWith('O-O')) return null;
  if (pieceCount(ctx.fenAfter) > 12) return null;                        // endgame
  if (distToCentre(mv.to) >= distToCentre(mv.from)) return null; // must get MORE central
  const mine = MINE(ctx.moverColor, ctx.studentColor);
  const text = mine
    ? `In the endgame the king is a fighting piece — you're marching it to the centre where it shepherds your pawns and pressures theirs. Activating the king is often the whole plan.`
    : `Your opponent brings the king to the centre — in the endgame that's a strong piece, not a liability. You want to do the same, or its activity tells.`;
  return { concept: 'centralize-king', text, source: 'concept:pos-centralization' };
}

/** Pawns of `color` that have crossed into the enemy half (white on ranks 5-8,
 *  black on ranks 1-4). */
function advancedPawns(fen: string, color: 'w' | 'b'): number {
  const c = new Chess(fen);
  let n = 0;
  for (let r = 1; r <= 8; r++) {
    const across = color === 'w' ? r >= 5 : r <= 4;
    if (!across) continue;
    for (const f of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const p = c.get(`${f}${r}` as Square);
      if (p && p.type === 'p' && p.color === color) n += 1;
    }
  }
  return n;
}

/**
 * SPACE ADVANTAGE — a pawn PUSH that crosses into the enemy half and gives the
 * mover a clear space edge (≥2 more advanced pawns than the opponent). Board-
 * computable. Source: concept:pos-space.
 */
function detectSpaceAdvantage(ctx: ConceptCtx): ConceptBeat | null {
  let mv;
  try { const c = new Chess(ctx.fenBefore); mv = c.move(ctx.san); } catch { return null; }
  if (!mv || mv.piece !== 'p' || mv.captured) return null;               // a push
  const dest = mv.to;
  const rank = parseInt(dest[1], 10);
  const crossed = ctx.moverColor === 'w' ? rank >= 5 : rank <= 4;
  if (!crossed) return null;                                             // this push crossed the middle
  const enemy: 'w' | 'b' = ctx.moverColor === 'w' ? 'b' : 'w';
  if (advancedPawns(ctx.fenAfter, ctx.moverColor) - advancedPawns(ctx.fenAfter, enemy) < 2) return null;
  const mine = MINE(ctx.moverColor, ctx.studentColor);
  const text = mine
    ? `That pawn push stakes out space — your pawns are cramping their pieces, leaving them less room to manoeuvre. Space is a slow, real edge: keep it and your pieces breathe while theirs stumble over each other.`
    : `Your opponent's pawns are grabbing space and cramping you. Look to challenge the chain with a break, or trade a pair to get your pieces room to breathe.`;
  return { concept: 'space-advantage', text, source: 'concept:pos-space' };
}

/**
 * Detect the highest-priority strategic concept this move expresses, or null.
 * Order = teaching specificity: a sharp attacking break or a structural
 * imbalance is a more pointed lesson than a general positional theme, which
 * beats the very general "don't rush". Extend the taxonomy by adding detectors.
 */
export function detectConcept(ctx: ConceptCtx): ConceptBeat | null {
  return detectOpenLinesAtKing(ctx)
    ?? detectOutpost(ctx)
    ?? detectRookActivation(ctx)
    ?? detectPassedPawnPush(ctx)
    ?? detectTwoBishops(ctx)
    ?? detectSpaceAdvantage(ctx)
    ?? detectSimplifyWhenAhead(ctx)
    ?? detectCastle(ctx)
    ?? detectCentralizeKing(ctx)
    ?? detectConvertDontRush(ctx);
}

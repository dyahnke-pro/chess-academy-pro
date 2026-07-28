// Misconception classifier — turns a slip (position + played vs best) into
// ONE closed-set misconception tag. FULLY DETERMINISTIC: the tag and the
// spoken teaching note are COMPUTED IN CODE from chess.js board inspection +
// the engine facts the caller already has (best move, eval, phase). There is
// NO LLM here (David 2026-06-11: "remove the LLM. it is all deterministic
// now."). The old LLM path returned null on any garbled/failed brain reply,
// which silently dropped the slip and left the "Thinking Errors" tab empty.
// Computing the tag in code means a real slip ALWAYS produces a tag — the
// pipeline never depends on a model returning parseable JSON. (G0: the LLM
// decides nothing; it voices facts computed in code. Here, even the voicing
// is computed — the note is built from verified squares, true by construction.)
//
// Shared by Discussion Practice (live), Game Review (past games), and
// import-time auto-analysis. All three call captureMisconception → here.

import { Chess, type Color } from 'chess.js';
import { detectTactics } from './tacticsDetector';

export interface ClassifyMisconceptionInput {
  /** Position BEFORE the played move (FEN). */
  fen: string;
  /** The move the student played (SAN). */
  playedSan: string;
  /** Engine best and/or the masters' move, for context. */
  bestSan?: string;
  mastersTopSan?: string;
  /** Plain-English eval summary, e.g. "drops about a pawn and a half". */
  evalSummary?: string;
  gamePhase?: 'opening' | 'middlegame' | 'endgame';
  /** What the student said when asked "why did you play that?" — kept for
   *  API compatibility (the live faucet still collects it), but the
   *  deterministic classifier reads the board, not the reason. */
  userReason?: string;
}

export interface MisconceptionClassification {
  /** Closed-set tag id (always a real id from misconceptionTags). */
  tag: string;
  /** Free-text error label — present only when tag === 'other'. */
  customLabel?: string;
  /** One-line spoken-safe teaching note: names a square, a piece, or a
   *  principle. No SAN read as letters, no digits beyond square labels, no
   *  first person, no interface references. Built from the verified board. */
  coachNote: string;
}

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};
const PIECE_VALUE: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 100,
};

function fileOf(square: string): number {
  return square.charCodeAt(0) - 97; // 'a' → 0
}

/** Locate a colour's king on the board (post-move position). */
function kingSquare(chess: Chess, color: Color): string | null {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  }
  return null;
}

/** A king that has left the central d/e/f files has (effectively) castled or
 *  walked to a wing — its pawn shelter matters there. */
function isWingedKing(square: string): boolean {
  const f = square[0];
  return f === 'a' || f === 'b' || f === 'c' || f === 'g' || f === 'h';
}

/** Count a colour's minor pieces still sitting on their home squares — the
 *  signal for "pieces undeveloped" in the opening. */
function homeMinorCount(chess: Chess, color: Color): number {
  const homes = color === 'w' ? ['b1', 'g1', 'c1', 'f1'] : ['b8', 'g8', 'c8', 'f8'];
  let n = 0;
  for (const sq of homes) {
    const p = chess.get(sq as never);
    if (p && p.color === color && (p.type === 'n' || p.type === 'b')) n += 1;
  }
  return n;
}

/** Does the best move land a concrete tactic the played (quiet) move passed
 *  up? Replays bestSan and looks for a forced mate, a fork/pin/skewer, or a
 *  newly-winnable enemy piece. */
function bestMoveLandsTactic(fen: string, bestSan: string, moverColor: Color): boolean {
  if (/#/.test(bestSan)) return true; // forced mate
  try {
    const chess = new Chess(fen);
    chess.move(bestSan); // throws on an illegal SAN → caught below
    const det = detectTactics(chess.fen());
    if (det.tactics.length > 0) return true; // fork / pin / skewer created
    const opp: Color = moverColor === 'w' ? 'b' : 'w';
    return det.hangingPieces.some((hp) => hp.color === opp && (PIECE_VALUE[hp.piece] ?? 0) >= 3);
  } catch {
    return false;
  }
}

function opponentOf(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

/** Squares from which `color` attacks `square`. Total — an unknown square or a
 *  chess.js version without `attackers` degrades to "no attackers". */
function attackersOf(chess: Chess, square: string, color: Color): string[] {
  try {
    return chess.attackers(square as never, color) as unknown as string[];
  } catch {
    return [];
  }
}

/**
 * The most valuable own piece that is attacked by a STRICTLY cheaper enemy
 * piece — the exchange loses material even when the piece is defended, so the
 * threat had to be met. Returns null when nothing qualifies.
 */
function piecesAttackedByLesser(
  chess: Chess,
  color: Color,
): { square: string; piece: string; byPiece: string } | null {
  let worst: { square: string; piece: string; byPiece: string; loss: number } | null = null;
  try {
    for (const row of chess.board()) {
      for (const sq of row) {
        if (!sq || sq.color !== color || sq.type === 'k') continue;
        const value = PIECE_VALUE[sq.type] ?? 0;
        for (const from of attackersOf(chess, sq.square, opponentOf(color))) {
          const attacker = chess.get(from as never);
          if (!attacker) continue;
          const attackerValue = PIECE_VALUE[attacker.type] ?? 0;
          const loss = value - attackerValue;
          if (loss > 0 && (!worst || loss > worst.loss)) {
            worst = { square: sq.square, piece: sq.type, byPiece: attacker.type, loss };
          }
        }
      }
    }
  } catch {
    return null;
  }
  return worst ? { square: worst.square, piece: worst.piece, byPiece: worst.byPiece } : null;
}

/** How many pawns `color` has on the given file (0-indexed). */
function pawnsOnFile(chess: Chess, color: Color, file: number): number {
  let count = 0;
  try {
    for (const row of chess.board()) {
      for (const sq of row) {
        if (sq && sq.color === color && sq.type === 'p' && fileOf(sq.square) === file) count++;
      }
    }
  } catch {
    return 0;
  }
  return count;
}

/** Whether `color` has a pawn on either file adjacent to `file`. */
function hasPawnOnAdjacentFile(chess: Chess, color: Color, file: number): boolean {
  return pawnsOnFile(chess, color, file - 1) > 0 || pawnsOnFile(chess, color, file + 1) > 0;
}

/** The a/h files and the 1st/8th ranks — where a knight's reach collapses. */
function isRimSquare(square: string): boolean {
  const file = fileOf(square);
  const rank = Number(square[1]);
  return file === 0 || file === 7 || rank === 1 || rank === 8;
}

/** Chebyshev distance from the four central squares — bigger is more passive. */
function centreDistance(square: string): number {
  const file = fileOf(square);
  const rank = Number(square[1]) - 1;
  return Math.max(Math.abs(file - 3.5), Math.abs(rank - 3.5));
}

function phaseLabel(phase: 'opening' | 'middlegame' | 'endgame'): string {
  if (phase === 'opening') return 'Opening slip';
  if (phase === 'endgame') return 'Endgame slip';
  return 'Middlegame slip';
}

/** Classify a slip into the closed-set taxonomy — deterministically. A real
 *  slip always yields a tag (the precise one when the board makes it provable,
 *  an honest phase-bucketed `other` when it doesn't — empty > generic >
 *  invented: we never assert a specific misconception we can't see on the
 *  board). Returns null ONLY when the FEN itself can't be parsed. The work is
 *  synchronous; the public wrapper below keeps the Promise-returning signature
 *  for call-site stability. */
function classifyMisconceptionImpl(
  input: ClassifyMisconceptionInput,
): MisconceptionClassification | null {
  const phase = input.gamePhase ?? 'middlegame';

  let chess: Chess;
  try {
    chess = new Chess(input.fen);
  } catch {
    return null; // unverifiable board — never invent
  }
  const moverColor = chess.turn();

  // Apply the played move so we can inspect the resulting position. If the SAN
  // doesn't fit the FEN (inconsistent input), we can't make board-grounded
  // claims — fall back to an honest, claim-free phase bucket rather than null,
  // so the slip still surfaces in Thinking Errors.
  let move: ReturnType<Chess['move']> | null = null;
  try {
    move = chess.move(input.playedSan);
  } catch {
    move = null;
  }
  if (!move) {
    return { tag: 'other', customLabel: phaseLabel(phase), coachNote: '' };
  }
  const fenAfter = chess.fen();
  const det = detectTactics(fenAfter);

  // (a) HUNG MATERIAL — the move leaves one of your own pieces attacked and
  // undefended. The single biggest blunder class; check it first.
  const ownHanging = det.hangingPieces
    .filter((hp) => hp.color === moverColor && hp.piece !== 'k')
    .sort((x, y) => (PIECE_VALUE[y.piece] ?? 0) - (PIECE_VALUE[x.piece] ?? 0));
  if (ownHanging.length > 0) {
    const hp = ownHanging[0];
    return {
      tag: 'hung-material',
      coachNote: `The ${PIECE_NAMES[hp.piece] ?? 'piece'} on ${hp.square} is undefended and can be taken for free.`,
    };
  }

  // (b) MISSED TACTIC — a forcing best move (capture/check/mate) lands a real
  // tactic, but the played move was quiet and let it slip.
  if (input.bestSan) {
    const playedQuiet = !/[x+#]/.test(input.playedSan);
    const bestForcing = /[x+#]/.test(input.bestSan);
    if (playedQuiet && bestForcing && bestMoveLandsTactic(input.fen, input.bestSan, moverColor)) {
      return {
        tag: 'missed-tactic',
        coachNote: 'A concrete tactic was on the board; the quiet move let the chance slip.',
      };
    }
  }

  // (c) GREEDY PAWN GRAB — in the opening, snatched a pawn (the eval already
  // says it cost you, or we wouldn't be classifying).
  if (phase === 'opening' && move.captured === 'p') {
    return {
      tag: 'greedy-pawn-grab',
      coachNote: `Taking the pawn on ${move.to} costs time and development you needed.`,
    };
  }

  // (d) KING STUCK IN THE CENTER — castling was legal and declined, king still
  // on its home square.
  if ((phase === 'opening' || phase === 'middlegame') && move.san !== 'O-O' && move.san !== 'O-O-O') {
    try {
      const before = new Chess(input.fen);
      const canCastle = before.moves().some((m) => m === 'O-O' || m === 'O-O-O');
      const homeSq = moverColor === 'w' ? 'e1' : 'e8';
      const k = before.get(homeSq as never);
      if (canCastle && k && k.type === 'k' && k.color === moverColor) {
        return {
          tag: 'king-stuck-center',
          coachNote: 'Castling was available — the king stays exposed in the center.',
        };
      }
    } catch {
      /* ignore — fall through */
    }
  }

  // (e) WEAKENED KING SAFETY — pushed a pawn in front of your own winged
  // (castled) king.
  if (move.piece === 'p') {
    const ksq = kingSquare(chess, moverColor);
    if (ksq && isWingedKing(ksq) && Math.abs(fileOf(move.to) - fileOf(ksq)) <= 1) {
      return {
        tag: 'weakened-king-safety',
        coachNote: `Advancing the pawn to ${move.to} loosens the shelter around your king on ${ksq}.`,
      };
    }
  }

  // (f) NEGLECTED DEVELOPMENT — in the opening, moved the queen or pushed a
  // pawn while the minor pieces still sit at home.
  if (phase === 'opening' && (move.piece === 'q' || move.piece === 'p')) {
    try {
      if (homeMinorCount(new Chess(input.fen), moverColor) >= 3) {
        return {
          tag: 'neglected-development',
          coachNote: 'The minor pieces are still at home — develop them before committing pawns or the queen.',
        };
      }
    } catch {
      /* ignore */
    }
  }

  // (g) BAD TRADE — we initiated a capture with a piece worth MORE than what we
  // took, onto a square the opponent still defends, so the recapture nets them
  // material. Distinct from (a): the piece isn't hanging, the exchange is just
  // losing. Board-verified via the recapture defenders, never assumed.
  if (move.captured) {
    const ourValue = PIECE_VALUE[move.piece] ?? 0;
    const tookValue = PIECE_VALUE[move.captured] ?? 0;
    const defenders = attackersOf(chess, move.to, opponentOf(moverColor));
    if (defenders.length > 0 && ourValue > tookValue) {
      return {
        tag: 'bad-trade',
        coachNote: `Trading the ${PIECE_NAMES[move.piece] ?? 'piece'} for the ${PIECE_NAMES[move.captured] ?? 'piece'} on ${move.to} loses material once it's recaptured.`,
      };
    }
  }

  // (h) MISSED OPPONENT'S THREAT — one of our pieces is attacked by a piece
  // worth LESS than it. Even with a defender that exchange loses material, so
  // the threat had to be answered. (a) already covered the undefended case.
  {
    const threatened = piecesAttackedByLesser(chess, moverColor);
    if (threatened) {
      return {
        tag: 'missed-opponents-threat',
        coachNote: `The ${PIECE_NAMES[threatened.piece] ?? 'piece'} on ${threatened.square} is attacked by a ${PIECE_NAMES[threatened.byPiece] ?? 'piece'} — that threat needed answering.`,
      };
    }
  }

  // (i) CREATED PAWN WEAKNESS — a pawn move that leaves that pawn isolated (no
  // friendly pawn on either adjacent file) or doubled, when it wasn't before.
  if (move.piece === 'p') {
    try {
      const before = new Chess(input.fen);
      const wasDoubled = pawnsOnFile(before, moverColor, fileOf(move.to)) >= 1;
      const nowDoubled = pawnsOnFile(chess, moverColor, fileOf(move.to)) >= 2;
      const isolated = !hasPawnOnAdjacentFile(chess, moverColor, fileOf(move.to));
      if (isolated) {
        return {
          tag: 'created-pawn-weakness',
          coachNote: `The pawn on ${move.to} has no friendly pawn beside it — it's isolated and hard to defend.`,
        };
      }
      if (nowDoubled && !wasDoubled) {
        return {
          tag: 'created-pawn-weakness',
          coachNote: `That leaves doubled pawns on the ${move.to[0]}-file, which can't defend each other.`,
        };
      }
    } catch {
      /* ignore — fall through */
    }
  }

  // (j) MISPLACED PIECE — a knight sent to the rim, where it controls far fewer
  // squares than from the centre ("a knight on the rim is dim").
  if (move.piece === 'n' && isRimSquare(move.to)) {
    return {
      tag: 'misplaced-piece',
      coachNote: `The knight on ${move.to} sits on the edge, where it covers only a fraction of the squares it would from the centre.`,
    };
  }

  // (k) PASSIVE KING IN THE ENDGAME — in an endgame the king is a fighting
  // piece; this move walked it further from the centre.
  if (phase === 'endgame' && move.piece === 'k') {
    if (centreDistance(move.to) > centreDistance(move.from)) {
      return {
        tag: 'passive-king-endgame',
        coachNote: `In the endgame the king belongs in the centre — ${move.to} walks it further away.`,
      };
    }
  }

  // Honest fallback — a real slip we can't pin to a specific motif from the
  // board alone. Bucket it by phase (a review-only holding pen) rather than
  // assert a misconception we can't prove.
  return { tag: 'other', customLabel: phaseLabel(phase), coachNote: '' };
}

/** Public entry point. Keeps the Promise-returning signature the three faucets
 *  (Discussion Practice / Game Review / auto-analysis) await, while the
 *  classification itself runs synchronously in code — no LLM, no I/O. */
export function classifyMisconception(
  input: ClassifyMisconceptionInput,
): Promise<MisconceptionClassification | null> {
  return Promise.resolve(classifyMisconceptionImpl(input));
}

import { Chess, type Square, type Color, type PieceSymbol } from 'chess.js';
import type { BoardHighlight } from '../types';
import type { TacticPattern, HangingPiece } from '../types/tacticTypes';
import { findHangingPieces } from './tacticClassifier';

// ─── Constants ──────────────────────────────────────────────────────────────

const PIECE_VALUE: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 100,
};

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

const BISHOP_DIRS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Highlight colors
const HANGING_DANGER_COLOR = 'rgba(239, 68, 68, 0.6)';   // red — piece at risk
const HANGING_TARGET_COLOR = 'rgba(249, 115, 22, 0.6)';   // orange — capturable enemy
const TACTIC_COLOR = 'rgba(234, 179, 8, 0.6)';            // yellow — tactic square

// ─── Result Type ────────────────────────────────────────────────────────────

export interface TacticsDetectionResult {
  highlights: BoardHighlight[];
  hangingPieces: HangingPiece[];
  tactics: TacticPattern[];
  summary: string;
}

// ─── Geometry Helpers ───────────────────────────────────────────────────────

function squareToCoords(sq: Square): [number, number] {
  return [sq.charCodeAt(0) - 97, parseInt(sq[1]) - 1];
}

function coordsToSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${String.fromCharCode(97 + file)}${rank + 1}` as Square;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A list a person would say out loud: "a, b and c" — never "a and b and c". */
function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// ─── Board Helpers ──────────────────────────────────────────────────────────

/**
 * Get squares attacked by a piece at a given square.
 * Temporarily sets side-to-move to the piece's color so chess.js generates
 * legal moves (captures) from that square.
 */
function getAttackedSquares(chess: Chess, square: Square): Square[] {
  const piece = chess.get(square);
  if (!piece) return [];

  const fenParts = chess.fen().split(' ');
  fenParts[1] = piece.color;
  fenParts[3] = '-';

  try {
    const testChess = new Chess(fenParts.join(' '));
    const moves = testChess.moves({ square, verbose: true });
    const attacked = new Set<string>();
    for (const m of moves) {
      attacked.add(m.to);
    }
    return Array.from(attacked) as Square[];
  } catch {
    return [];
  }
}

/**
 * Trace a ray from a square in a given direction, returning pieces found.
 */
function traceRay(
  chess: Chess,
  fromSquare: Square,
  dir: [number, number],
  maxPieces: number = 2,
): Array<{ square: Square; type: PieceSymbol; color: Color }> {
  const [startFile, startRank] = squareToCoords(fromSquare);
  const pieces: Array<{ square: Square; type: PieceSymbol; color: Color }> = [];
  let file = startFile + dir[0];
  let rank = startRank + dir[1];

  while (file >= 0 && file <= 7 && rank >= 0 && rank <= 7) {
    const sq = coordsToSquare(file, rank);
    if (!sq) break;
    const piece = chess.get(sq);
    if (piece) {
      pieces.push({ square: sq, type: piece.type, color: piece.color });
      if (pieces.length >= maxPieces) break;
    }
    file += dir[0];
    rank += dir[1];
  }

  return pieces;
}

// ─── Static Tactic Detectors ────────────────────────────────────────────────

/**
 * Find all active forks: any piece attacking 2+ enemy pieces worth >= knight.
 */
function findForks(chess: Chess): TacticPattern[] {
  const forks: TacticPattern[] = [];
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.type === 'k') continue;

      const sq = coordsToSquare(c, 7 - r);
      if (!sq) continue;

      const attackedSquares = getAttackedSquares(chess, sq);
      const targets: Array<{ square: Square; type: PieceSymbol }> = [];

      for (const aSq of attackedSquares) {
        const target = chess.get(aSq);
        if (target && target.color !== piece.color && PIECE_VALUE[target.type] >= 3) {
          targets.push({ square: aSq, type: target.type });
        }
      }

      if (targets.length >= 2) {
        const forkerName = PIECE_NAMES[piece.type] ?? piece.type;
        const targetDescs = targets.map(
          (t) => `${PIECE_NAMES[t.type] ?? t.type} on ${t.square}`,
        );
        forks.push({
          type: 'fork',
          beneficiary: piece.color,
          involvedSquares: [sq, ...targets.map((t) => t.square)],
          // A three-way fork read out as "and … and …" — David's log:
          // "queen on d3 forks knight on d4 and bishop on e3 and knight on b1".
          // Spoken aloud that is a list with no breath in it.
          description: `${capitalize(forkerName)} on ${sq} forks ${listOf(targetDescs)}`,
        });
      }
    }
  }

  return forks;
}

/**
 * Find all active pins: a sliding piece pinning an enemy piece against a
 * more valuable enemy piece behind it.
 */
function findPins(chess: Chess): TacticPattern[] {
  const pins: TacticPattern[] = [];
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      if (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q') continue;

      const sq = coordsToSquare(c, 7 - r);
      if (!sq) continue;

      const enemyColor: Color = piece.color === 'w' ? 'b' : 'w';
      const dirs =
        piece.type === 'b' ? BISHOP_DIRS
        : piece.type === 'r' ? ROOK_DIRS
        : [...BISHOP_DIRS, ...ROOK_DIRS];

      for (const dir of dirs) {
        const piecesOnRay = traceRay(chess, sq, dir);
        if (piecesOnRay.length < 2) continue;

        const first = piecesOnRay[0];
        const second = piecesOnRay[1];

        if (
          first.color === enemyColor &&
          second.color === enemyColor &&
          PIECE_VALUE[second.type] > PIECE_VALUE[first.type]
        ) {
          pins.push({
            type: 'pin',
            beneficiary: piece.color,
            involvedSquares: [sq, first.square, second.square],
            description: `${capitalize(PIECE_NAMES[piece.type] ?? piece.type)} on ${sq} pins ${PIECE_NAMES[first.type] ?? first.type} on ${first.square} against ${PIECE_NAMES[second.type] ?? second.type} on ${second.square}`,
          });
        }
      }
    }
  }

  return pins;
}

/**
 * Find all active skewers: a sliding piece attacking a valuable enemy piece
 * with a less valuable enemy piece behind it.
 */
function findSkewers(chess: Chess): TacticPattern[] {
  const skewers: TacticPattern[] = [];
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      if (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q') continue;

      const sq = coordsToSquare(c, 7 - r);
      if (!sq) continue;

      const enemyColor: Color = piece.color === 'w' ? 'b' : 'w';
      const dirs =
        piece.type === 'b' ? BISHOP_DIRS
        : piece.type === 'r' ? ROOK_DIRS
        : [...BISHOP_DIRS, ...ROOK_DIRS];

      for (const dir of dirs) {
        const piecesOnRay = traceRay(chess, sq, dir);
        if (piecesOnRay.length < 2) continue;

        const first = piecesOnRay[0];
        const second = piecesOnRay[1];

        if (
          first.color === enemyColor &&
          second.color === enemyColor &&
          PIECE_VALUE[first.type] > PIECE_VALUE[second.type] &&
          PIECE_VALUE[second.type] >= 1
        ) {
          skewers.push({
            type: 'skewer',
            beneficiary: piece.color,
            involvedSquares: [sq, first.square, second.square],
            description: `${capitalize(PIECE_NAMES[piece.type] ?? piece.type)} on ${sq} skewers ${PIECE_NAMES[first.type] ?? first.type} on ${first.square} with ${PIECE_NAMES[second.type] ?? second.type} on ${second.square} behind it`,
          });
        }
      }
    }
  }

  return skewers;
}

// ─── Expanded geometries (David 2026-08-06: "expansive across many tactics
// and fundamentals", not just the video's three). Same discipline as the
// original three: pure chess.js, conservative thresholds, a pattern is only
// reported when it is PLAINLY on the board — a detector that cries wolf gets
// tuned out, which is worse than a narrow one. Every pattern carries its
// beneficiary so playCommentary can speak the student's tactics without
// handing over the opponent's. ────────────────────────────────────────────

/** With `color` to move in `chess`'s position regardless of whose turn the
 *  FEN says it is. Null when the position won't re-parse (rare edge FENs). */
function withTurn(chess: Chess, color: Color): Chess | null {
  const parts = chess.fen().split(' ');
  parts[1] = color;
  parts[3] = '-'; // an en-passant square for the other side breaks parsing
  try { return new Chess(parts.join(' ')); } catch { return null; }
}

/** MATE THREAT: `color` has mate-in-1 available right now. The strongest
 *  possible "something is here" — and the one the old detector missed
 *  entirely, so the coach could name a fork while ignoring a mate. */
function findMateThreats(chess: Chess): TacticPattern[] {
  const out: TacticPattern[] = [];
  for (const color of ['w', 'b'] as Color[]) {
    const probe = withTurn(chess, color);
    if (!probe || probe.isCheck()) continue; // in-check positions: not a quiet threat
    const mate = probe.moves({ verbose: true }).find((m) => m.san.includes('#'));
    if (mate) {
      out.push({
        type: 'mate_threat',
        beneficiary: color,
        involvedSquares: [mate.from, mate.to],
        description: `${color === 'w' ? 'White' : 'Black'} has a checkmate available from ${mate.from}`,
      });
    }
  }
  return out;
}

/** BACK-RANK WEAKNESS: a king sitting on its home rank with no luft while an
 *  enemy heavy piece can legally land on that rank WITH CHECK. Requiring the
 *  actual checking move keeps this a live weakness, not decor. */
function findBackRankWeakness(chess: Chess): TacticPattern[] {
  const out: TacticPattern[] = [];
  const board = chess.board();
  for (const color of ['w', 'b'] as Color[]) {
    const rank = color === 'w' ? 1 : 8;
    let kingSq: Square | null = null;
    for (const row of board) {
      for (const p of row) {
        if (p && p.type === 'k' && p.color === color && rankOfSquare(p.square) === rank) kingSq = p.square;
      }
    }
    if (!kingSq) continue;
    // No luft: every square directly in front of the king (and diagonals
    // forward) is blocked by a friendly piece or off-board.
    const [kf] = squareToCoords(kingSq);
    const forward = color === 'w' ? 1 : -1;
    let luft = false;
    for (const df of [-1, 0, 1]) {
      const sq = coordsToSquare(kf + df, (rank - 1) + forward);
      if (!sq) continue;
      const occ = chess.get(sq);
      if (!occ || occ.color !== color) { luft = true; break; }
    }
    if (luft) continue;
    // An enemy heavy can check on the home rank right now.
    const enemy: Color = color === 'w' ? 'b' : 'w';
    const probe = withTurn(chess, enemy);
    if (!probe) continue;
    const invader = probe.moves({ verbose: true }).find((m) =>
      (m.piece === 'r' || m.piece === 'q') && rankOfSquare(m.to) === rank && m.san.includes('+'));
    if (invader) {
      out.push({
        type: 'back_rank',
        beneficiary: enemy,
        involvedSquares: [kingSq, invader.to, invader.from],
        description: `${color === 'w' ? "White's" : "Black's"} king on ${kingSq} has no escape square and the back rank can be invaded from ${invader.from}`,
      });
    }
  }
  return out;
}

/** TRAPPED PIECE: a knight-or-better piece that is ATTACKED and has no move
 *  to a square that isn't attacked by a CHEAPER enemy piece. Defended-but-
 *  cornered — the class `findHangingPieces` (undefended only) cannot see. */
function findTrappedPieces(chess: Chess): TacticPattern[] {
  const out: TacticPattern[] = [];
  const board = chess.board();
  for (const row of board) {
    for (const p of row) {
      if (!p || p.type === 'k' || p.type === 'p') continue;
      const sq = p.square;
      const enemy: Color = p.color === 'w' ? 'b' : 'w';
      // Trapped means ATTACKED BY CHEAPER with nowhere to run. A piece whose
      // only attacker is pricier (or equal — that is a trade offer) is not
      // trapped when it stands defended, and if it is undefended that is
      // findHangingPieces' pattern, not this one.
      const attackersHere = attackersOfSquare(chess, sq, enemy);
      if (!attackersHere.some((a) => PIECE_VALUE[a] < PIECE_VALUE[p.type])) continue;
      const myView = withTurn(chess, p.color);
      if (!myView) continue;
      const escapes = myView.moves({ square: sq, verbose: true });
      const hasSafeSquare = escapes.some((m) => {
        try {
          const after = new Chess(myView.fen());
          after.move({ from: m.from, to: m.to, promotion: 'q' });
          // Safe = not attackable by a piece CHEAPER than the runner.
          const attackers = attackersOfSquare(after, m.to, enemy);
          return !attackers.some((a) => PIECE_VALUE[a] < PIECE_VALUE[p.type]);
        } catch { return true; }
      });
      if (!hasSafeSquare) {
        out.push({
          type: 'trapped_piece',
          beneficiary: enemy,
          involvedSquares: [sq],
          description: `The ${PIECE_NAMES[p.type]} on ${sq} is attacked and has no safe square — it is trapped`,
        });
      }
    }
  }
  return out;
}

/** Piece types of `by` currently attacking `sq`. */
function attackersOfSquare(chess: Chess, sq: Square, by: Color): PieceSymbol[] {
  const probe = withTurn(chess, by);
  if (!probe) return [];
  return probe.moves({ verbose: true })
    .filter((m) => m.to === sq)
    .map((m) => m.piece);
}

/** DISCOVERED ATTACK available: a piece standing between a friendly line
 *  piece and an enemy ROOK-OR-BETTER target (or king), where the blocker has
 *  at least one move off the ray. Conservative: minor targets excluded — a
 *  discovered hit on a bishop is rarely worth the interruption. */
function findDiscoveredAttacks(chess: Chess): TacticPattern[] {
  const out: TacticPattern[] = [];
  const board = chess.board();
  for (const row of board) {
    for (const p of row) {
      if (!p) continue;
      if (p.type !== 'b' && p.type !== 'r' && p.type !== 'q') continue;
      const sq = p.square;
      const dirs = p.type === 'b' ? BISHOP_DIRS : p.type === 'r' ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS];
      for (const dir of dirs) {
        const ray = traceRay(chess, sq, dir);
        if (ray.length < 2) continue;
        const [blocker, target] = ray;
        if (blocker.color !== p.color) continue;
        if (target.color === p.color) continue;
        if (target.type !== 'r' && target.type !== 'q' && target.type !== 'k') continue;
        // WITH TEMPO, or it isn't worth a word: the blocker must have a move
        // that itself checks or wins a piece while unveiling. The bare
        // "something stands between two pieces" shape fired on 16% of real
        // opening plies (measured 2026-08-06, 1,310 plies) — decor, not a
        // tactic. With the tempo requirement a discovery is an event.
        const myView = withTurn(chess, p.color);
        if (!myView) continue;
        // The tempo move must LEAVE the ray — a capture along the very line
        // it is blocking unveils nothing. (A checking move that stays on the
        // ray keeps blocking, so chess.js gives it no '+' from the unveiled
        // slider either; the collinearity test makes the capture clause
        // honest too.)
        const [sf, sr] = squareToCoords(sq);
        const onRay = (to: Square): boolean => {
          const [tf, tr] = squareToCoords(to);
          const df = tf - sf;
          const dr = tr - sr;
          if (Math.sign(df) !== dir[0] || Math.sign(dr) !== dir[1]) return false;
          return dir[0] === 0 || dir[1] === 0 || Math.abs(df) === Math.abs(dr);
        };
        const withTempo = myView.moves({ square: blocker.square, verbose: true }).some((m) =>
          !onRay(m.to) &&
          (m.san.includes('+') || m.san.includes('#') ||
            (m.captured !== undefined && PIECE_VALUE[m.captured] >= 3)));
        if (!withTempo) continue;
        out.push({
          type: 'discovery',
          beneficiary: p.color,
          involvedSquares: [blocker.square, sq, target.square],
          description: `Moving the ${PIECE_NAMES[blocker.type]} on ${blocker.square} would unveil the ${PIECE_NAMES[p.type]} on ${sq} against the ${PIECE_NAMES[target.type]} on ${target.square}`,
        });
      }
    }
  }
  return out;
}

/** REMOVAL OF THE GUARD: an enemy piece we can capture whose job is defending
 *  an attacked knight-or-better target that has NO other defender. Capturing
 *  the guard wins the guarded piece. */
function findRemovableGuards(chess: Chess): TacticPattern[] {
  const out: TacticPattern[] = [];
  const board = chess.board();
  for (const color of ['w', 'b'] as Color[]) {
    const enemy: Color = color === 'w' ? 'b' : 'w';
    for (const row of board) {
      for (const t of row) {
        if (!t || t.color !== enemy || t.type === 'k' || PIECE_VALUE[t.type] < 3) continue;
        const targetSq = t.square;
        // We attack the target; it has exactly one defender; we can take that defender.
        if (attackersOfSquare(chess, targetSq, color).length === 0) continue;
        // `attackers()` (not `moves()`) — a defender of an own-occupied
        // square has no MOVE there, so a move-based scan sees zero defenders
        // everywhere and this detector never fires.
        const defenders = chess.attackers(targetSq, enemy).filter((d) => d !== targetSq);
        if (defenders.length !== 1) continue;
        const guardSq = defenders[0];
        const takers = attackersOfSquare(chess, guardSq, color);
        if (takers.length === 0) continue;
        // Taking a DEFENDED guard with a pricier piece is a losing trade, not
        // a removal — a pawn guard covered by another pawn is not removable
        // by a knight. Undefended guards are removable by anything.
        const guardVal = PIECE_VALUE[chess.get(guardSq)?.type ?? 'p'];
        const guardIsDefended = chess.attackers(guardSq, enemy).some((d) => d !== guardSq);
        const cheapestTaker = Math.min(...takers.map((p) => PIECE_VALUE[p]));
        if (guardIsDefended && cheapestTaker > guardVal) continue;
        out.push({
          type: 'removal_of_guard',
          beneficiary: color,
          involvedSquares: [guardSq, targetSq],
          description: `The ${PIECE_NAMES[chess.get(guardSq)?.type ?? 'p']} on ${guardSq} is the only defender of the ${PIECE_NAMES[t.type]} on ${targetSq} — and it can be taken`,
        });
      }
    }
  }
  return out;
}

function rankOfSquare(sq: string): number {
  return Number(sq[1]);
}

/** OVERLOADED PIECE: an enemy piece that is currently the SOLE defender of two
 *  or more of its own pieces that WE are attacking right now. Whichever one it
 *  recaptures on, the other falls — the general form of "removal of the
 *  guard" (that detector only covers capturing the single defender itself;
 *  this covers the defender being stretched across two live threats without
 *  needing to touch it at all). */
function findOverloadedPieces(chess: Chess): TacticPattern[] {
  const out: TacticPattern[] = [];
  const board = chess.board();
  for (const color of ['w', 'b'] as Color[]) {
    const enemy: Color = color === 'w' ? 'b' : 'w';
    // defenderSquare -> targets it is the SOLE defender of, among targets WE attack.
    const soleDuty = new Map<Square, Square[]>();
    for (const row of board) {
      for (const t of row) {
        if (!t || t.color !== enemy || t.type === 'k' || PIECE_VALUE[t.type] < 3) continue;
        const targetSq = t.square;
        if (attackersOfSquare(chess, targetSq, color).length === 0) continue;
        const defenders = chess.attackers(targetSq, enemy).filter((d) => d !== targetSq);
        if (defenders.length !== 1) continue;
        const guardSq = defenders[0];
        const list = soleDuty.get(guardSq) ?? [];
        list.push(targetSq);
        soleDuty.set(guardSq, list);
      }
    }
    for (const [guardSq, targets] of soleDuty) {
      if (targets.length < 2) continue;
      const guard = chess.get(guardSq);
      if (!guard) continue;
      const targetDescs = targets.map((sq) => `${PIECE_NAMES[chess.get(sq)?.type ?? 'p']} on ${sq}`);
      out.push({
        type: 'overload',
        beneficiary: color,
        involvedSquares: [guardSq, ...targets],
        description: `The ${PIECE_NAMES[guard.type]} on ${guardSq} is overloaded — it's the only defender of both ${listOf(targetDescs)}`,
      });
    }
  }
  return out;
}

/** BATTERY: two same-color sliding pieces stacked on the same file, rank, or
 *  diagonal with nothing between them — each able to reinforce the other along
 *  that line. A clean, unambiguous formation (doubled rooks, queen behind a
 *  bishop on the long diagonal); deliberately narrower than "x-ray", which has
 *  several conflicting definitions in chess literature and risks false
 *  positives. Reported once per pair (deduped by square pair). */
function findBatteries(chess: Chess): TacticPattern[] {
  const out: TacticPattern[] = [];
  const seen = new Set<string>();
  const board = chess.board();
  for (const row of board) {
    for (const p of row) {
      if (!p || (p.type !== 'r' && p.type !== 'b' && p.type !== 'q')) continue;
      const sq = p.square;
      const dirs = p.type === 'b' ? BISHOP_DIRS : p.type === 'r' ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS];
      for (const dir of dirs) {
        const ray = traceRay(chess, sq, dir, 1);
        if (ray.length < 1) continue;
        const front = ray[0];
        if (front.color !== p.color) continue;
        // The front piece must itself be able to continue this exact ray —
        // a rook behind a knight isn't a battery, the knight can't slide on.
        const straight = dir[0] === 0 || dir[1] === 0;
        const frontCanContinue = straight ? (front.type === 'r' || front.type === 'q') : (front.type === 'b' || front.type === 'q');
        if (!frontCanContinue) continue;
        // 🚨 A BATTERY THAT POINTS AT NOTHING IS FURNITURE, NOT A TACTIC
        // (David 2026-08-16: "the useless rook and queen battery on the 8th
        // rank — we don't need that").
        //
        // His game: "Watch out — the rook on a8 and queen on d8 form a battery
        // on the rank", spoken as a THREAT TO HIM. Those two are sitting on
        // their own back rank behind their own rook on e8. Every condition
        // above was satisfied and not one of them asked the only question that
        // makes a battery worth a warning: what is it AIMED at.
        //
        // So continue the ray past the front piece. An enemy piece in its path
        // is the target and the reason to speak; a friendly piece blocks the
        // battery, and empty board to the edge is a formation the student can
        // see for themselves. Both go unreported — this feeds a tactics ALERT,
        // and a warning about nothing teaches the student to ignore warnings.
        const beyond = traceRay(chess, front.square, dir, 1);
        const target = beyond[0];
        if (!target || target.color === p.color) continue;
        const key = [sq, front.square].sort().join('-');
        if (seen.has(key)) continue;
        seen.add(key);
        const lineWord = straight ? (dir[1] === 0 ? 'rank' : 'file') : 'diagonal';
        out.push({
          type: 'battery',
          beneficiary: p.color,
          involvedSquares: [sq, front.square, target.square],
          description: `The ${PIECE_NAMES[p.type]} on ${sq} and ${PIECE_NAMES[front.type]} on ${front.square} form a battery on the ${lineWord}, bearing down on the ${PIECE_NAMES[target.type]} on ${target.square}`,
        });
      }
    }
  }
  return out;
}

// ─── Main Detection Function ────────────────────────────────────────────────

/**
 * Analyze a position for hanging pieces and simple tactics (forks, pins,
 * skewers). Returns board highlights for visualization plus structured data
 * and a human-readable summary for the coach prompt.
 *
 * Uses only chess.js — no engine required. Deterministic and fast.
 */
/** Detection is a pure function of the FEN and costs ~100ms on a busy middlegame
 *  — enough that repeating it hurts. Callers legitimately ask about the same
 *  position more than once (a review walks a game the eval bar already read;
 *  the live watcher re-reads on every render), so the second ask is free.
 *  Capacity is a few games' worth of plies; insertion order makes the oldest
 *  key the first one out. */
const DETECT_CACHE = new Map<string, TacticsDetectionResult>();
const DETECT_CACHE_MAX = 400;

export function detectTactics(fen: string): TacticsDetectionResult {
  const cached = DETECT_CACHE.get(fen);
  if (cached) return cached;
  const computed = detectTacticsUncached(fen);
  if (DETECT_CACHE.size >= DETECT_CACHE_MAX) {
    const oldest = DETECT_CACHE.keys().next().value;
    if (oldest !== undefined) DETECT_CACHE.delete(oldest);
  }
  DETECT_CACHE.set(fen, computed);
  return computed;
}

function detectTacticsUncached(fen: string): TacticsDetectionResult {
  try {
    const chess = new Chess(fen);
    const turn = chess.turn();

    const hangingPieces = findHangingPieces(chess);
    const forks = findForks(chess);
    const pins = findPins(chess);
    const skewers = findSkewers(chess);
    // The 2026-08-06 expansion — mate threats FIRST so a mate is never
    // shadowed by a mere fork in consumers that read tactics[0].
    const tactics = [
      ...findMateThreats(chess),
      ...forks,
      ...pins,
      ...skewers,
      ...findDiscoveredAttacks(chess),
      ...findBackRankWeakness(chess),
      ...findTrappedPieces(chess),
      ...findRemovableGuards(chess),
      ...findOverloadedPieces(chess),
      ...findBatteries(chess),
    ];

    // Build highlights — hanging pieces first, then tactic squares
    const highlights: BoardHighlight[] = [];
    const highlightedSquares = new Set<string>();

    for (const hp of hangingPieces) {
      if (highlightedSquares.has(hp.square)) continue;
      highlightedSquares.add(hp.square);
      const color = hp.color === turn ? HANGING_DANGER_COLOR : HANGING_TARGET_COLOR;
      highlights.push({ square: hp.square, color });
    }

    for (const tactic of tactics) {
      for (const sq of tactic.involvedSquares) {
        if (highlightedSquares.has(sq)) continue;
        highlightedSquares.add(sq);
        highlights.push({ square: sq, color: TACTIC_COLOR });
      }
    }

    const summary = buildSummary(hangingPieces, tactics, turn);
    return { highlights, hangingPieces, tactics, summary };
  } catch {
    return { highlights: [], hangingPieces: [], tactics: [], summary: '' };
  }
}

// ─── Summary Builder ────────────────────────────────────────────────────────

/**
 * Build a human-readable summary for the coach prompt.
 */
function buildSummary(
  hangingPieces: HangingPiece[],
  tactics: TacticPattern[],
  sideToMove: Color,
): string {
  const lines: string[] = [];

  if (hangingPieces.length > 0) {
    const playerHanging = hangingPieces.filter((hp) => hp.color === sideToMove);
    const opponentHanging = hangingPieces.filter((hp) => hp.color !== sideToMove);

    if (playerHanging.length > 0) {
      const descs = playerHanging.map(
        (hp) => `${PIECE_NAMES[hp.piece] ?? hp.piece} on ${hp.square}`,
      );
      lines.push(`Side to move has hanging pieces: ${descs.join(', ')}`);
    }

    if (opponentHanging.length > 0) {
      const descs = opponentHanging.map(
        (hp) => `${PIECE_NAMES[hp.piece] ?? hp.piece} on ${hp.square}`,
      );
      lines.push(`Opponent has hanging pieces: ${descs.join(', ')}`);
    }
  }

  if (tactics.length > 0) {
    lines.push(`Active tactics: ${tactics.map((t) => t.description).join('; ')}`);
  }

  return lines.join('\n');
}

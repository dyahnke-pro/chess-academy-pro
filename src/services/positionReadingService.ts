/**
 * positionReadingService — the deterministic CORE of the Position-Reading /
 * Analysis-Practice feature (plan: docs/plans/2026-06-27-…position-reading.md).
 *
 * The contract is G0: the LLM never decides chess. Every question this service
 * asks carries a COMPUTED answer key — tactics/threats/hanging/material/mate
 * come from the engine + chess.js, and the grader only matches the student's
 * free-text answer against that key. This module computes the questions + the
 * answer keys + a deterministic grader; the LLM grading (natural-language
 * understanding) layers on top in `gradeReadingAnswer` with this as the
 * offline-testable fallback.
 *
 * The "hanging" answer key uses a proper static-exchange evaluation (SEE), not
 * the attacked-and-undefended heuristic — a defended piece still hangs when a
 * cheaper attacker wins the exchange (David's 2026-06-27 catch: "attacked-and-
 * undefended is *sufficient*, not *necessary* — it's not an iff").
 */
import { Chess } from 'chess.js';
import type { Square, Color, PieceSymbol } from 'chess.js';
import type { TacticsLiveContext } from '../coach/types';
import type { WeaknessCategory } from '../types';

/** Centipawn-free piece values for SEE + material reasoning (king ~ ∞). */
const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/**
 * Static Exchange Evaluation on `square`: the material the side NOT owning the
 * piece there gains by initiating a capture sequence, both sides playing
 * least-valuable-attacker and stopping when the trade turns unfavorable. The
 * classic swap-off algorithm. Returns the net material from the capturing
 * side's perspective; `> 0` ⇒ the piece is effectively hanging (winnable),
 * even if it is defended.
 */
export function seeGain(chess: Chess, square: Square): number {
  const victim = chess.get(square);
  if (!victim) return 0;
  const them: Color = victim.color === 'w' ? 'b' : 'w';
  const us = victim.color;
  const valueAt = (s: Square): number[] => {
    const p = chess.get(s);
    return p ? [PIECE_VALUE[p.type]] : [];
  };
  const attackers = chess.attackers(square, them).flatMap(valueAt).sort((a, b) => a - b);
  const defenders = chess.attackers(square, us).flatMap(valueAt).sort((a, b) => a - b);
  if (attackers.length === 0) return 0;

  // Swap list, from the capturing side's perspective (them captures first).
  const gains: number[] = [];
  let onSquare = PIECE_VALUE[victim.type];
  gains.push(onSquare);          // them captures the victim
  onSquare = attackers[0];       // them's attacker now sits on the square
  let ai = 1;
  let di = 0;
  let usToMove = true;           // us recaptures next
  for (;;) {
    const list = usToMove ? defenders : attackers;
    const idx = usToMove ? di : ai;
    if (idx >= list.length) break;
    gains.push(onSquare - gains[gains.length - 1]);
    onSquare = list[idx];
    if (usToMove) di += 1; else ai += 1;
    usToMove = !usToMove;
  }
  // Minimax the swap list back to the root — either side bails when a deeper
  // capture would lose material.
  for (let i = gains.length - 1; i > 0; i -= 1) {
    gains[i - 1] = -Math.max(-gains[i - 1], gains[i]);
  }
  return gains[0];
}

/**
 * The actual capture SEQUENCE (SAN) of the static exchange on `square` — each
 * side recaptures with its least-valuable attacker, in order. This is the
 * grounded line we PLAY OUT ON THE BOARD so the student SEES why a pawn is
 * poisoned / a piece hangs (David 2026-06-28: "tell AND show the why"). Real,
 * legal moves only (chess.js); capped so a pathological loop can't run away.
 */
export function seeSequence(fen: string, square: Square): string[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const seq: string[] = [];
  for (let guard = 0; guard < 8; guard += 1) {
    const caps = chess.moves({ verbose: true }).filter((m) => m.to === square && m.captured);
    if (caps.length === 0) break;
    caps.sort((a, b) => (PIECE_VALUE[a.piece] ?? 0) - (PIECE_VALUE[b.piece] ?? 0)); // least-valuable attacker
    const mv = caps[0];
    try { chess.move(mv); } catch { break; }
    seq.push(mv.san);
  }
  return seq;
}

export interface HangingPiece {
  square: Square;
  piece: PieceSymbol;
  color: Color;
  /** SEE material the opponent wins by capturing here (≥ 1). */
  gain: number;
}

/**
 * Every piece on the board that is genuinely hanging by SEE — the value-aware
 * answer key for "is anything hanging?". Sorted by gain (biggest blunder
 * first). Unlike `TacticsLiveContext.hanging` (attacked-and-undefended), this
 * also flags defended pieces that lose the exchange to a cheaper attacker.
 */
export function findHangingBySee(fen: string): HangingPiece[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const out: HangingPiece[] = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue;
      const gain = seeGain(chess, cell.square);
      if (gain > 0) out.push({ square: cell.square, piece: cell.type, color: cell.color, gain });
    }
  }
  return out.sort((a, b) => b.gain - a.gain);
}

/**
 * Candidate PAWN BREAKS for the side to move — the deterministic answer key for
 * "what's the right pawn break?". A break here = a legal pawn push that makes
 * pawn-on-pawn contact (the pushed pawn attacks an enemy pawn, or an enemy pawn
 * attacks the square it lands on), i.e. it challenges the opponent's structure.
 * Returns the destination squares (e.g. ['c5', 'f5']).
 */
export function findPawnBreaks(fen: string): Square[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const mover = chess.turn();
  const breaks = new Set<Square>();
  for (const mv of chess.moves({ verbose: true })) {
    if (mv.piece !== 'p') continue;
    // Play the push, then check whether the new pawn touches an enemy pawn.
    const probe = new Chess(fen);
    try { probe.move(mv); } catch { continue; }
    const to: Square = mv.to;
    const file = to.charCodeAt(0) - 97;
    const rank = Number(to[1]);
    const forward = mover === 'w' ? 1 : -1;
    let contact = mv.captured === 'p'; // a capture of a pawn is itself a break
    for (const df of [-1, 1]) {
      const af = file + df;
      const ar = rank + forward;
      if (af < 0 || af > 7 || ar < 1 || ar > 8) continue;
      const sq = `${String.fromCharCode(97 + af)}${ar}` as Square;
      const occ = probe.get(sq);
      if (occ && occ.type === 'p' && occ.color !== mover) contact = true; // our pawn now attacks an enemy pawn
    }
    if (contact) breaks.add(to);
  }
  return [...breaks];
}

export interface PieceQualityNote {
  square: Square;
  piece: PieceSymbol;
  color: Color;
  quality: 'good' | 'bad';
  /** Short reason: 'knight outpost' | 'bad bishop' | 'rook on the open file' | 'rook on a semi-open file'. */
  reason: string;
}

/** Square colour: 'light' | 'dark' (a1 is dark). */
function squareColor(sq: Square): 'light' | 'dark' {
  const file = sq.charCodeAt(0) - 97;
  const rank = Number(sq[1]) - 1;
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

/**
 * Notable GOOD / BAD pieces in the position — the deterministic answer key for
 * "is there a good or bad piece here?". Pure chess.js geometry, no engine:
 *  - knight OUTPOST: a knight in enemy territory, defended by an own pawn, that
 *    no enemy pawn can ever challenge (good).
 *  - BAD bishop: a bishop with ≥4 of its own pawns fixed on its own colour (bad).
 *  - rook on an OPEN / SEMI-OPEN file (good).
 * Returns at most a handful, good ones first.
 */
export function findPieceQuality(fen: string): PieceQualityNote[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const notes: PieceQualityNote[] = [];

  // Pre-index pawns by file for the bad-bishop + rook-file checks.
  const board = chess.board();
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const { square, type, color } = cell;
      const file = square.charCodeAt(0) - 97;
      const rank = Number(square[1]);

      if (type === 'n') {
        const inEnemyHalf = color === 'w' ? rank >= 4 && rank <= 6 : rank >= 3 && rank <= 5;
        if (!inEnemyHalf) continue;
        const pawnDefends = chess.attackers(square, color).some((s) => chess.get(s)?.type === 'p');
        if (!pawnDefends) continue;
        // Can an enemy pawn ever attack this square? Enemy pawns on an adjacent
        // file, ahead of the knight (from their advance direction), could.
        let challengeable = false;
        for (const df of [-1, 1]) {
          const af = file + df;
          if (af < 0 || af > 7) continue;
          const fileLetter = String.fromCharCode(97 + af);
          for (let r = 1; r <= 8; r += 1) {
            const occ = chess.get(`${fileLetter}${r}` as Square);
            if (occ && occ.type === 'p' && occ.color !== color) {
              // white knight challenged by a black pawn on a higher rank; black knight by a white pawn on a lower rank
              if (color === 'w' ? r > rank : r < rank) challengeable = true;
            }
          }
        }
        if (!challengeable) notes.push({ square, piece: 'n', color, quality: 'good', reason: 'knight outpost' });
      }

      if (type === 'b') {
        const bishopColor = squareColor(square);
        let ownPawnsOnColor = 0;
        for (const r2 of board) {
          for (const c2 of r2) {
            if (c2 && c2.type === 'p' && c2.color === color && squareColor(c2.square) === bishopColor) ownPawnsOnColor += 1;
          }
        }
        if (ownPawnsOnColor >= 4) notes.push({ square, piece: 'b', color, quality: 'bad', reason: 'bad bishop (hemmed in by its own pawns)' });
      }

      if (type === 'r') {
        const fileLetter = String.fromCharCode(97 + file);
        let ownPawns = 0;
        let enemyPawns = 0;
        for (let r = 1; r <= 8; r += 1) {
          const occ = chess.get(`${fileLetter}${r}` as Square);
          if (occ && occ.type === 'p') { if (occ.color === color) ownPawns += 1; else enemyPawns += 1; }
        }
        if (ownPawns === 0 && enemyPawns === 0) notes.push({ square, piece: 'r', color, quality: 'good', reason: 'rook on the open file' });
        else if (ownPawns === 0 && enemyPawns > 0) notes.push({ square, piece: 'r', color, quality: 'good', reason: 'rook on a semi-open file' });
      }
    }
  }

  // Good pieces first (more satisfying to spot), then cap.
  return notes.sort((a, b) => (a.quality === b.quality ? 0 : a.quality === 'good' ? -1 : 1)).slice(0, 4);
}

/** Every square a1..h8. */
function allSquares(): Square[] {
  const out: Square[] = [];
  for (let f = 0; f < 8; f += 1) for (let r = 1; r <= 8; r += 1) out.push(`${String.fromCharCode(97 + f)}${r}` as Square);
  return out;
}

/**
 * WEAK SQUARES (holes) for each side — a square in the contestable zone that NO
 * pawn of that side can ever guard (no friendly pawn on an adjacent file able to
 * advance to attack it). These are the squares the OPPONENT wants to occupy. A
 * white hole is a weakness in White's position. Deterministic geometry (G3).
 */
export function findWeakSquares(fen: string): { white: Square[]; black: Square[] } {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return { white: [], black: [] }; }
  const out: { white: Square[]; black: Square[] } = { white: [], black: [] };
  // Index pawns by file for each color.
  const pawns: Record<Color, { file: number; rank: number }[]> = { w: [], b: [] };
  for (const row of chess.board()) for (const cell of row) {
    if (cell && cell.type === 'p') pawns[cell.color].push({ file: cell.square.charCodeAt(0) - 97, rank: Number(cell.square[1]) });
  }
  for (const sq of allSquares()) {
    const file = sq.charCodeAt(0) - 97;
    const rank = Number(sq[1]);
    if (rank < 3 || rank > 6) continue; // only the contestable middle zone matters
    const occ = chess.get(sq);
    for (const color of ['w', 'b'] as Color[]) {
      if (occ && occ.type === 'p' && occ.color === color) continue; // own pawn there → not a hole
      // Can a pawn of `color` ever attack `sq`? White pawns attack one rank UP;
      // a white pawn on an adjacent file at rank ≤ rank-1 could advance to do it.
      const guardRankBound = color === 'w' ? rank - 1 : rank + 1;
      const canGuard = pawns[color].some((p) =>
        Math.abs(p.file - file) === 1 && (color === 'w' ? p.rank <= guardRankBound : p.rank >= guardRankBound),
      );
      if (!canGuard) (color === 'w' ? out.white : out.black).push(sq);
    }
  }
  // Most central first, cap to a handful.
  const central = (s: Square): number => Math.abs((s.charCodeAt(0) - 97) - 3.5) + Math.abs(Number(s[1]) - 4.5);
  out.white.sort((a, b) => central(a) - central(b));
  out.black.sort((a, b) => central(a) - central(b));
  out.white = out.white.slice(0, 4);
  out.black = out.black.slice(0, 4);
  return out;
}

/** How many squares the piece on `sq` attacks (its board scope) — turn-independent
 *  activity proxy. A long-diagonal bishop scores high; a hemmed one scores low. */
export function pieceScope(chess: Chess, sq: Square): number {
  const p = chess.get(sq);
  if (!p) return 0;
  let n = 0;
  for (const t of allSquares()) {
    if (t === sq) continue;
    if (chess.attackers(t, p.color).includes(sq)) n += 1;
  }
  return n;
}

export interface ActivePieceNote { square: Square; piece: PieceSymbol; scope: number }

/** The most- and least-active non-pawn, non-king piece of `color` by board scope.
 *  "Strongest" / "weakest" piece, grounded as activity (G3 — not a vibe). */
export function strongestWeakestPiece(fen: string, color: Color): { strongest: ActivePieceNote | null; weakest: ActivePieceNote | null } {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return { strongest: null, weakest: null }; }
  const notes: ActivePieceNote[] = [];
  for (const row of chess.board()) for (const cell of row) {
    if (!cell || cell.color !== color || cell.type === 'p' || cell.type === 'k') continue;
    notes.push({ square: cell.square, piece: cell.type, scope: pieceScope(chess, cell.square) });
  }
  if (notes.length === 0) return { strongest: null, weakest: null };
  notes.sort((a, b) => b.scope - a.scope);
  return { strongest: notes[0], weakest: notes[notes.length - 1] };
}

/** STRUCTURAL pawn weaknesses for `color` — isolated (no friendly pawn on an
 *  adjacent file) and doubled (≥2 on a file). The squares the opponent targets. */
export function findWeakPawns(fen: string, color: Color): { isolated: Square[]; doubled: Square[] } {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return { isolated: [], doubled: [] }; }
  const byFile: Record<number, Square[]> = {};
  for (const row of chess.board()) for (const cell of row) {
    if (cell && cell.type === 'p' && cell.color === color) {
      const f = cell.square.charCodeAt(0) - 97;
      (byFile[f] ??= []).push(cell.square);
    }
  }
  const isolated: Square[] = [];
  const doubled: Square[] = [];
  for (const fStr of Object.keys(byFile)) {
    const f = Number(fStr);
    const sqs = byFile[f];
    if (sqs.length >= 2) doubled.push(...sqs);
    const hasNeighbor = !!byFile[f - 1] || !!byFile[f + 1];
    if (!hasNeighbor) isolated.push(...sqs);
  }
  return { isolated, doubled };
}

/** The best squares for `attackerColor` to TARGET — the enemy's concrete
 *  weaknesses: loose pieces (SEE), structural weak pawns, and holes the attacker
 *  can occupy. Deterministic; the coach voices these, never invents a target. */
export function findAttackTargets(fen: string, attackerColor: Color): Square[] {
  const enemy: Color = attackerColor === 'w' ? 'b' : 'w';
  const targets: Square[] = [];
  // 1) Loose enemy material (value-aware).
  for (const h of findHangingBySee(fen)) if (h.color === enemy) targets.push(h.square);
  // 2) Enemy structural weak pawns.
  const wp = findWeakPawns(fen, enemy);
  targets.push(...wp.isolated, ...wp.doubled);
  // 3) Enemy holes the attacker can plant a piece on.
  const holes = findWeakSquares(fen);
  targets.push(...(enemy === 'w' ? holes.white : holes.black));
  // Dedupe, preserve priority order.
  return [...new Set(targets)].slice(0, 5);
}

export interface PawnGrabNote {
  /** The enemy pawn's square (the grab target). */
  square: Square;
  /** A legal SAN that captures it. */
  capture: string;
  /** SEE material the side to move nets by grabbing (≤0 ⇒ poisoned/greedy). */
  see: number;
  safe: boolean;
}

/**
 * Capturable enemy PAWNS for the side to move, each graded by SEE — the
 * deterministic answer key for "should you take this pawn, or is it greedy?"
 * (David 2026-06-28). safe = the swap-off wins material; !safe = poisoned (you
 * win the pawn but lose more in the recapture). The positional-greed case
 * (materially fine but the engine prefers another move) layers on top when an
 * eval is supplied — this is the pure-material floor (G3, no engine needed).
 */
export function findPawnGrabs(fen: string): PawnGrabNote[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const bySquare = new Map<Square, PawnGrabNote>();
  for (const mv of chess.moves({ verbose: true })) {
    if (mv.captured !== 'p') continue;
    const to = mv.to as Square;
    if (bySquare.has(to)) continue;
    const see = seeGain(chess, to); // material the side to move wins on that square
    bySquare.set(to, { square: to, capture: mv.san, see, safe: see > 0 });
  }
  // Poisoned (greedy) grabs first — those are the teachable ones.
  return [...bySquare.values()].sort((a, b) => Number(a.safe) - Number(b.safe) || a.see - b.see);
}

export interface KingSafetyNote {
  square: Square;
  castled: boolean;
  inCenter: boolean;
  /** Files adjacent-or-on the king with NO friendly pawn (avenues of attack). */
  openFilesNearKing: string[];
  /** Friendly pawns shielding the king (on the 3 files around it, just ahead). */
  shieldPawns: number;
  exposed: boolean;
}

/** Grounded KING SAFETY read for `color` — castled?, pawn shield, open files
 *  toward the king, king-in-center. Pure chess.js geometry (G3). */
export function kingSafetyRead(fen: string, color: Color): KingSafetyNote | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  let ksq: Square | null = null;
  for (const row of chess.board()) for (const cell of row) if (cell && cell.type === 'k' && cell.color === color) ksq = cell.square;
  if (!ksq) return null;
  const file = ksq.charCodeAt(0) - 97;
  const homeRank = color === 'w' ? 1 : 8;
  const inCenter = (file === 3 || file === 4) && Number(ksq[1]) === homeRank; // d/e on home rank
  const castled = (file >= 6 || file <= 2) && Number(ksq[1]) === homeRank; // king-/queen-side corner-ish
  // Pawn shield: friendly pawns on the king's file ± adjacent, one rank ahead.
  const ahead = color === 'w' ? 1 : -1;
  let shieldPawns = 0;
  const openFilesNearKing: string[] = [];
  for (const df of [-1, 0, 1]) {
    const f = file + df;
    if (f < 0 || f > 7) continue;
    const fileLetter = String.fromCharCode(97 + f);
    const shieldSq = `${fileLetter}${homeRank + ahead}` as Square;
    const occ = chess.get(shieldSq);
    if (occ && occ.type === 'p' && occ.color === color) shieldPawns += 1;
    // Open toward king: no friendly pawn anywhere on this file.
    let hasOwnPawn = false;
    for (let r = 1; r <= 8; r += 1) { const o = chess.get(`${fileLetter}${r}` as Square); if (o && o.type === 'p' && o.color === color) { hasOwnPawn = true; break; } }
    if (!hasOwnPawn) openFilesNearKing.push(fileLetter);
  }
  const exposed = inCenter || shieldPawns <= 1 || openFilesNearKing.length >= 2;
  return { square: ksq, castled, inCenter, openFilesNearKing, shieldPawns, exposed };
}

export interface DevelopmentNote { developedMinors: number; totalMinors: number; castled: boolean }

/** Grounded DEVELOPMENT read for `color` — minor pieces off their home squares
 *  + castled. The answer key for "are you developed?" (neglected-development). */
export function developmentRead(fen: string, color: Color): DevelopmentNote | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const homes: Record<Color, Square[]> = { w: ['b1', 'g1', 'c1', 'f1'], b: ['b8', 'g8', 'c8', 'f8'] };
  let developedMinors = 0;
  let totalMinors = 0;
  for (const row of chess.board()) for (const cell of row) {
    if (!cell || cell.color !== color || (cell.type !== 'n' && cell.type !== 'b')) continue;
    totalMinors += 1;
    if (!homes[color].includes(cell.square)) developedMinors += 1;
  }
  // Castled ≈ king off its home square toward a corner.
  const ks = kingSafetyRead(fen, color);
  return { developedMinors, totalMinors, castled: ks?.castled ?? false };
}

/**
 * GROUNDED reading-facts block for the coach's "Read this position" narration
 * (G0 — the coach VOICES these, never invents beyond them). Complements the
 * tactics sub-block already in `buildChessContextMessage`: that one covers naive
 * (attacked-AND-undefended) hanging + the attack/defense map; THIS one adds the
 * three facts it lacks — SEE-accurate (value-aware) material at risk, candidate
 * pawn breaks, and good/bad piece quality. Framed to REINFORCE, not contradict,
 * the naive block: the SEE list says "loses material in the exchange" (a piece
 * here may be DEFENDED yet still drop material to a cheaper attacker), never
 * "undefended". Returns '' when there's nothing notable to add.
 */
export function formatReadingFacts(fen: string, studentColor: 'white' | 'black'): string {
  const me: Color = studentColor === 'white' ? 'w' : 'b';
  const hanging = findHangingBySee(fen);
  const breaks = findPawnBreaks(fen);
  const quality = findPieceQuality(fen);
  if (hanging.length === 0 && breaks.length === 0 && quality.length === 0) return '';

  const side = (c: Color): string => (c === 'w' ? 'white' : 'black');
  const lines: string[] = [
    'READING FACTS (GROUND TRUTH — Static Exchange Eval + structure, computed in code; VOICE these, never invent beyond them):',
  ];

  // SEE material-at-risk, split by whose piece it is relative to the student.
  const mine = hanging.filter((h) => h.color === me);
  const theirs = hanging.filter((h) => h.color !== me);
  if (mine.length > 0 || theirs.length > 0) {
    lines.push('  MATERIAL AT RISK (SEE — a forced capture sequence wins material here; the piece may be DEFENDED yet still lose to a cheaper attacker — say "loses the exchange", NOT "undefended"):');
    if (mine.length > 0) {
      const list = mine.map((h) => `${PIECE_NAME[h.piece]} on ${h.square} (drops ${h.gain})`).join(', ');
      lines.push(`    YOUR material at risk — WARN the student: ${list}.`);
    }
    if (theirs.length > 0) {
      const list = theirs.map((h) => `${side(h.color)} ${PIECE_NAME[h.piece]} on ${h.square} (wins ${h.gain})`).join(', ');
      lines.push(`    material YOU can win — point out the opportunity: ${list}.`);
    }
  } else {
    lines.push('  MATERIAL AT RISK (SEE): NONE — no piece loses material to a forced exchange.');
  }

  if (breaks.length > 0) {
    lines.push(`  PAWN BREAKS for the side to move (legal pushes that strike the enemy pawn structure): ${breaks.join(', ')}.`);
  }

  if (quality.length > 0) {
    const good = quality.filter((q) => q.quality === 'good').map((q) => `${side(q.color)} ${PIECE_NAME[q.piece]} on ${q.square} (${q.reason})`);
    const bad = quality.filter((q) => q.quality === 'bad').map((q) => `${side(q.color)} ${PIECE_NAME[q.piece]} on ${q.square} (${q.reason})`);
    if (good.length > 0) lines.push(`  GOOD PIECES: ${good.join(', ')}.`);
    if (bad.length > 0) lines.push(`  BAD PIECES: ${bad.join(', ')}.`);
  }

  return lines.join('\n');
}

export interface SampledPosition {
  fen: string;
  /** 1-indexed ply this position is BEFORE (i.e. the side to move is on move). */
  ply: number;
  /** The SAN actually played next in the game (context only — never an answer). */
  playedNext: string | null;
}

/**
 * Sample middlegame positions from a stored game's PGN. Deterministic (NOT the
 * LLM): walk the mainline, collect the position BEFORE each ply in the
 * middlegame band, and evenly pick up to `count`. Positions where the side to
 * move is in check or it's a forced recapture are skipped (poor "read this"
 * material). Returns [] for an unparseable / too-short game.
 */
export function samplePositionsFromGame(
  pgn: string,
  opts: { count?: number; minPly?: number; maxPly?: number } = {},
): SampledPosition[] {
  const count = opts.count ?? 5;
  const minPly = opts.minPly ?? 12;
  const maxPly = opts.maxPly ?? 40;
  let game: Chess;
  try {
    game = new Chess();
    game.loadPgn(pgn);
  } catch { return []; }
  const history = game.history({ verbose: true });
  if (history.length < minPly + 1) return [];

  // Replay to capture the FEN BEFORE each ply.
  const replay = new Chess();
  const candidates: SampledPosition[] = [];
  for (let i = 0; i < history.length; i += 1) {
    const ply = i + 1;
    const before = replay.fen();
    const mv = history[i];
    if (ply >= minPly && ply <= Math.min(maxPly, history.length) && !replay.inCheck()) {
      candidates.push({ fen: before, ply, playedNext: mv.san });
    }
    try { replay.move(mv.san); } catch { break; }
  }
  if (candidates.length === 0) return [];

  // Evenly spread the picks across the band.
  if (candidates.length <= count) return candidates;
  const picks: SampledPosition[] = [];
  const step = candidates.length / count;
  for (let i = 0; i < count; i += 1) picks.push(candidates[Math.floor(i * step)]);
  return picks;
}

/** Minimal annotation shape for mistake-sourcing (matches GameRecord.annotations). */
export interface MistakeAnnotation {
  moveNumber: number;
  color: 'white' | 'black';
  classification: string | null;
}

/**
 * The positions the student faced RIGHT BEFORE their own mistakes — the
 * "analyze positions from games right before a critical mistake" source. Walks
 * the game's annotations, and for each inaccuracy/mistake/blunder on the
 * student's side returns the `fenBefore` (the clean position they had to read).
 * Robust to annotation ordering: matches by (moveNumber, color), not array
 * index. Skips in-check positions (forced) and unparseable games.
 */
export function findMistakePositions(
  pgn: string,
  annotations: MistakeAnnotation[],
  studentColor: 'white' | 'black',
  opts: { count?: number } = {},
): SampledPosition[] {
  const count = opts.count ?? 8;
  let game: Chess;
  try { game = new Chess(); game.loadPgn(pgn); } catch { return []; }
  const history = game.history({ verbose: true });
  if (history.length === 0) return [];

  const flagged = new Set<string>();
  for (const a of annotations) {
    if (a.color !== studentColor) continue;
    if (a.classification === 'inaccuracy' || a.classification === 'mistake' || a.classification === 'blunder') {
      flagged.add(`${a.moveNumber}:${a.color}`);
    }
  }
  if (flagged.size === 0) return [];

  const replay = new Chess();
  const out: SampledPosition[] = [];
  for (let i = 0; i < history.length; i += 1) {
    const ply = i + 1;
    const color: 'white' | 'black' = ply % 2 === 1 ? 'white' : 'black';
    const moveNumber = Math.ceil(ply / 2);
    const before = replay.fen();
    const mv = history[i];
    if (color === studentColor && flagged.has(`${moveNumber}:${color}`) && !replay.inCheck()) {
      out.push({ fen: before, ply, playedNext: mv.san });
    }
    try { replay.move(mv.san); } catch { break; }
  }
  if (out.length <= count) return out;
  // Even spread across the game.
  const picks: SampledPosition[] = [];
  const step = out.length / count;
  for (let i = 0; i < count; i += 1) picks.push(out[Math.floor(i * step)]);
  return picks;
}

export type ReadingQuestionType =
  | 'tactic' | 'threat' | 'hanging' | 'material' | 'mate' | 'check' | 'pawn-break' | 'piece'
  // Positional / discussion dimensions (David 2026-06-28 — "all buckets"):
  | 'weak-square' | 'strong-piece' | 'weak-piece' | 'target' | 'weak-pawn'
  | 'bishop-pair' | 'outpost' | 'space' | 'open-file' | 'king-safety' | 'development' | 'plan' | 'who-is-winning';

export interface ReadingQuestion {
  id: string;
  type: ReadingQuestionType;
  /** Weakness bucket this question trains — maps to the Weaknesses tab taxonomy
   *  so practice targets exactly what the app diagnoses (David 2026-06-28). */
  bucket: WeaknessCategory;
  /** The specific MISCONCEPTION_TAG id this question trains (the granular ~17
   *  buckets the app collects per game), so practice lines up 1:1 with the
   *  weakness data. Optional — a few questions are general (material/who-wins). */
  misconceptionTag?: string;
  /** The prompt shown to the student. */
  prompt: string;
  /** The canonical correct answer, shown when the student is wrong. */
  answer: string;
  /** Lowercased tokens (squares, piece names, motif words) any of which marks a
   *  correct read in the deterministic grader. Empty for a `negative` answer. */
  acceptTokens: string[];
  /** True when the correct answer is "nothing" (no tactic / nothing hanging /
   *  no break) — the student is right to say so. */
  negative: boolean;
  /** Answer SQUARES — the grounded square set, for grading a CLICK answer
   *  (David's "click on the board to ID"). Any clicked square in here is correct. */
  answerSquares?: Square[];
  /** Answer MOVES (SAN) — for grading a played-on-the-board answer (the tactic /
   *  best move). Any of these SANs played is correct. */
  answerMoves?: string[];
  /** A grounded move sequence (SAN) to PLAY OUT on the board while the coach
   *  narrates — the "tell AND show the why" demo (David 2026-06-28). E.g. the
   *  SEE swap-off that proves a pawn is poisoned (Qxb7, Bxb7). Real legal moves
   *  from `fen`; the board animates them and the voice narrates each step. */
  demoLine?: string[];
}

const NEG_TOKENS = ['nothing', 'none', 'no', 'safe', 'fine', 'equal', 'even', 'quiet', "nothing's", 'nope'];

function sq(square: string): string { return square.toLowerCase(); }

/**
 * Build the question set for a position from its computed tactics package.
 * Every question's answer is derived from `tactics` / chess.js — never invented.
 * Returns questions ordered tactic → threat → hanging → break → material so the
 * UI can pick a mix.
 */
export interface ReadingQuestionOpts {
  /** Engine eval (centipawns, White-perspective) — grounds the who's-winning
   *  read. Omit when no analysis is available (the question is then skipped). */
  evalCp?: number | null;
  /** Forced mate distance (+ = side to move mates) — supersedes evalCp. */
  mateIn?: number | null;
  /** Engine principal variation (SAN) — grounds the "what's the plan?" read. */
  pvSan?: readonly string[];
  /** Whether the position is an endgame (few pieces) — gates the endgame bucket
   *  question. Computed by the caller (or left false). */
  isEndgame?: boolean;
}

export function buildReadingQuestions(fen: string, tactics: TacticsLiveContext, opts: ReadingQuestionOpts = {}): ReadingQuestion[] {
  const out: ReadingQuestion[] = [];
  const facts = tactics.boardFacts;
  const sideToMove = facts?.sideToMove ?? 'white';
  const me: Color = sideToMove === 'white' ? 'w' : 'b';
  const enemy: Color = me === 'w' ? 'b' : 'w';

  // ─── TACTICS bucket ───────────────────────────────────────────────────────
  // 1) MATE-IN-ONE — highest priority when present.
  if (facts?.mateInOne) {
    out.push({
      id: 'mate', type: 'mate', bucket: 'tactics',
      prompt: `${sideToMove === 'white' ? 'White' : 'Black'} to move — is there a forced mate in one? If so, what is it?`,
      answer: `Yes — ${facts.mateInOne} is mate.`,
      acceptTokens: [sq(facts.mateInOne), 'mate', 'checkmate', 'yes'],
      answerMoves: [facts.mateInOne],
      negative: false,
    });
  }

  // 2) IMMEDIATE TACTIC on the board.
  if (tactics.immediate.length > 0) {
    const t = tactics.immediate[0];
    out.push({
      id: 'tactic', type: 'tactic', bucket: 'tactics', misconceptionTag: 'missed-tactic',
      prompt: 'Is there a tactic in this position? What is it?',
      answer: t.description,
      acceptTokens: [t.type.replace(/_/g, ' '), ...t.squares.map(sq), ...t.type.split('_')],
      answerSquares: t.squares as Square[],
      negative: false,
    });
  } else {
    out.push({
      id: 'tactic', type: 'tactic', bucket: 'tactics',
      prompt: 'Is there a tactic for the side to move here?',
      answer: 'No concrete tactic — this is a quiet position; play on general principles.',
      acceptTokens: [], negative: true,
    });
  }

  // 3) OPPONENT'S THREAT (PV look-ahead).
  if (tactics.threats.length > 0) {
    const th = tactics.threats[0];
    out.push({
      id: 'threat', type: 'threat', bucket: 'tactics', misconceptionTag: 'missed-opponents-threat',
      prompt: "What is your opponent threatening?",
      answer: th.description,
      acceptTokens: [th.type.replace(/_/g, ' '), ...th.type.split('_'), ...(th.line[0] ? [sq(th.line[0])] : [])],
      negative: false,
    });
  }

  // 4) HANGING (SEE-based) — value-aware, the proper answer key.
  const hanging = findHangingBySee(fen);
  if (hanging.length > 0) {
    const h = hanging[0];
    const where = h.color === me ? 'one of YOUR pieces' : "one of your OPPONENT's pieces";
    out.push({
      id: 'hanging', type: 'hanging', bucket: 'tactics', misconceptionTag: 'hung-material',
      prompt: 'Is any piece hanging — can material be won by force here?',
      answer: `Yes — the ${PIECE_NAME[h.piece]} on ${h.square} (${where}) is hanging; capturing wins about ${h.gain} point${h.gain === 1 ? '' : 's'}.`,
      acceptTokens: [sq(h.square), PIECE_NAME[h.piece], 'hanging', 'yes'],
      answerSquares: [h.square],
      // Play the win out on the board (the capture sequence) — show, don't just tell.
      demoLine: seeSequence(fen, h.square),
      negative: false,
    });
  } else {
    out.push({
      id: 'hanging', type: 'hanging', bucket: 'tactics',
      prompt: 'Is any piece hanging right now?',
      answer: 'No — every attacked piece is adequately defended (nothing wins material by force).',
      acceptTokens: [], negative: true,
    });
  }

  // ─── CALCULATION bucket ───────────────────────────────────────────────────
  // 7) MATERIAL — always answerable from ground truth.
  if (facts?.material) {
    out.push({
      id: 'material', type: 'material', bucket: 'calculation',
      prompt: 'Who is ahead in material, and by how much?',
      answer: facts.material,
      acceptTokens: materialTokens(facts.material),
      negative: false,
    });
  }

  // WHO IS WINNING — grounded in the ENGINE eval (never a vibe). Only asked when
  // an eval was supplied; otherwise skipped (no fabricated assessment, G3).
  const verdict = evalToVerdict(opts.evalCp, opts.mateIn, sideToMove);
  if (verdict) {
    out.push({
      id: 'who-is-winning', type: 'who-is-winning', bucket: 'calculation',
      prompt: 'Who is winning here, and roughly by how much?',
      answer: verdict.answer,
      acceptTokens: verdict.tokens,
      negative: false,
    });
  }

  // PLAN — grounded in the engine PRINCIPAL VARIATION (real, legal moves).
  if (opts.pvSan && opts.pvSan.length > 0) {
    const pv = opts.pvSan.slice(0, 3);
    let firstTo: Square | null = null;
    try { const c = new Chess(fen); const mv = c.move(pv[0]); if (mv) firstTo = mv.to as Square; } catch { firstTo = null; }
    out.push({
      id: 'plan', type: 'plan', bucket: opts.isEndgame ? 'endgame' : 'positional', misconceptionTag: 'no-plan',
      prompt: opts.isEndgame ? "What's the winning plan in this endgame?" : "What's the best plan / continuation here?",
      answer: `The engine's plan starts ${pv.join(' ')}.`,
      acceptTokens: [sq(pv[0]), ...(firstTo ? [sq(firstTo)] : [])],
      answerMoves: [pv[0]],
      answerSquares: firstTo ? [firstTo] : undefined,
      negative: false,
    });
  }

  // ─── POSITIONAL bucket ────────────────────────────────────────────────────
  // 5) PAWN BREAK.
  const breaks = findPawnBreaks(fen);
  if (breaks.length > 0) {
    out.push({
      id: 'pawn-break', type: 'pawn-break', bucket: 'positional', misconceptionTag: 'mistimed-pawn-break',
      prompt: 'What pawn break is available to challenge the structure?',
      answer: `The break${breaks.length > 1 ? 's' : ''} ${breaks.map((b) => `…${b}`).join(' and ')} challenge${breaks.length > 1 ? '' : 's'} the opponent's pawns.`,
      acceptTokens: breaks.map(sq),
      answerSquares: breaks,
      negative: false,
    });
  }

  // 6) GOOD / BAD PIECE — the deterministic piece-quality read.
  const quality = findPieceQuality(fen);
  if (quality.length > 0) {
    const note = quality[0];
    const side = note.color === me ? 'your' : "your opponent's";
    out.push({
      id: 'piece', type: 'piece', bucket: 'positional',
      prompt: 'Is there a notably good or bad piece on the board? Which one?',
      answer: `${side[0].toUpperCase()}${side.slice(1)} ${PIECE_NAME[note.piece]} on ${note.square} is a ${note.reason}.`,
      acceptTokens: [sq(note.square), PIECE_NAME[note.piece], note.quality, ...note.reason.toLowerCase().split(/\s+/).filter((w) => w.length > 3)],
      answerSquares: [note.square],
      negative: false,
    });
    // Knight-outpost variant (a distinct, click-gradable positional read).
    const outpost = quality.find((q) => q.reason === 'knight outpost' && q.color === me);
    if (outpost) {
      out.push({
        id: 'outpost', type: 'outpost', bucket: 'positional',
        prompt: 'Do you have a knight outpost? Which square?',
        answer: `Yes — your knight on ${outpost.square} sits on a protected outpost no enemy pawn can challenge.`,
        acceptTokens: [sq(outpost.square), 'outpost', 'yes'],
        answerSquares: [outpost.square],
        negative: false,
      });
    }
  }

  // WEAK SQUARES — yours and the opponent's (click-to-ID).
  const weak = findWeakSquares(fen);
  const myHoles = me === 'w' ? weak.white : weak.black;
  const oppHoles = me === 'w' ? weak.black : weak.white;
  if (myHoles.length > 0) {
    out.push({
      id: 'weak-square-own', type: 'weak-square', bucket: 'positional',
      prompt: 'Where are the weak squares in YOUR position? (squares your pawns can no longer guard)',
      answer: `Your weak square${myHoles.length > 1 ? 's' : ''}: ${myHoles.join(', ')} — no pawn of yours can defend ${myHoles.length > 1 ? 'them' : 'it'}.`,
      acceptTokens: myHoles.map(sq),
      answerSquares: myHoles,
      negative: false,
    });
  }
  if (oppHoles.length > 0) {
    out.push({
      id: 'weak-square-opp', type: 'weak-square', bucket: 'positional',
      prompt: "Where are your OPPONENT's weak squares — the holes you can occupy?",
      answer: `Your opponent's weak square${oppHoles.length > 1 ? 's' : ''}: ${oppHoles.join(', ')} — land a piece there.`,
      acceptTokens: oppHoles.map(sq),
      answerSquares: oppHoles,
      negative: false,
    });
  }

  // STRONGEST / WEAKEST PIECE (by board scope) — click the piece.
  const activity = strongestWeakestPiece(fen, me);
  if (activity.strongest) {
    const s = activity.strongest;
    out.push({
      id: 'strong-piece', type: 'strong-piece', bucket: 'positional',
      prompt: 'Which of your pieces is the strongest (most active) right now?',
      answer: `Your ${PIECE_NAME[s.piece]} on ${s.square} is your most active piece — it covers ${s.scope} squares.`,
      acceptTokens: [sq(s.square), PIECE_NAME[s.piece]],
      answerSquares: [s.square],
      negative: false,
    });
  }
  if (activity.weakest && (!activity.strongest || activity.weakest.square !== activity.strongest.square)) {
    const w = activity.weakest;
    out.push({
      id: 'weak-piece', type: 'weak-piece', bucket: 'positional', misconceptionTag: 'misplaced-piece',
      prompt: 'Which of your pieces is the weakest (most passive) — the one to improve?',
      answer: `Your ${PIECE_NAME[w.piece]} on ${w.square} is your least active piece — it only covers ${w.scope} squares; reroute it.`,
      acceptTokens: [sq(w.square), PIECE_NAME[w.piece]],
      answerSquares: [w.square],
      negative: false,
    });
  }

  // BEST TARGET TO ATTACK — the opponent's concrete weaknesses.
  const targets = findAttackTargets(fen, me);
  if (targets.length > 0) {
    out.push({
      id: 'target', type: 'target', bucket: 'positional',
      prompt: 'What should you target — where is your opponent weakest?',
      answer: `Target ${targets.join(', ')} — ${targets.length > 1 ? 'these are' : 'this is'} the opponent's weakest point${targets.length > 1 ? 's' : ''} (loose material, weak pawns, or holes).`,
      acceptTokens: targets.map(sq),
      answerSquares: targets,
      negative: false,
    });
  }

  // WEAK PAWNS — your structural weaknesses (isolated / doubled).
  const wp = findWeakPawns(fen, me);
  const weakPawnSquares = [...new Set([...wp.isolated, ...wp.doubled])];
  if (weakPawnSquares.length > 0) {
    out.push({
      id: 'weak-pawn', type: 'weak-pawn', bucket: 'positional', misconceptionTag: 'created-pawn-weakness',
      prompt: 'Do you have any weak pawns? Where are they?',
      answer: `Weak pawn${weakPawnSquares.length > 1 ? 's' : ''}: ${weakPawnSquares.join(', ')}${wp.isolated.length ? ` (isolated: ${wp.isolated.join(', ')})` : ''}${wp.doubled.length ? ` (doubled: ${wp.doubled.join(', ')})` : ''}.`,
      acceptTokens: weakPawnSquares.map(sq),
      answerSquares: weakPawnSquares,
      negative: false,
    });
  }

  // BISHOP PAIR — who holds it (positional asset).
  const bishops: Record<Color, number> = { w: 0, b: 0 };
  try {
    const c = new Chess(fen);
    for (const row of c.board()) for (const cell of row) if (cell && cell.type === 'b') bishops[cell.color] += 1;
  } catch { /* ignore */ }
  if (bishops.w >= 2 && bishops.b < 2) {
    out.push({
      id: 'bishop-pair', type: 'bishop-pair', bucket: 'positional',
      prompt: 'Who has the bishop pair?', answer: 'White has the bishop pair.',
      acceptTokens: ['white'], negative: false,
    });
  } else if (bishops.b >= 2 && bishops.w < 2) {
    out.push({
      id: 'bishop-pair', type: 'bishop-pair', bucket: 'positional',
      prompt: 'Who has the bishop pair?', answer: 'Black has the bishop pair.',
      acceptTokens: ['black'], negative: false,
    });
  }

  // KING SAFETY — weakened-king-safety / king-stuck-center (the 17-tag buckets).
  const ks = kingSafetyRead(fen, me);
  if (ks && ks.exposed) {
    const why = ks.inCenter
      ? 'your king is still in the center — castle before it gets opened up'
      : ks.openFilesNearKing.length >= 2
        ? `the ${ks.openFilesNearKing.join('- and ')}-file${ks.openFilesNearKing.length > 1 ? 's are' : ' is'} open toward your king`
        : 'your king has lost its pawn shield';
    out.push({
      id: 'king-safety', type: 'king-safety', bucket: ks.inCenter ? 'openings' : 'positional',
      misconceptionTag: ks.inCenter ? 'king-stuck-center' : 'weakened-king-safety',
      prompt: 'Is your king safe? If not, what is the problem?',
      answer: `Your king on ${ks.square} is exposed — ${why}.`,
      acceptTokens: [sq(ks.square), 'king', 'exposed', 'unsafe', ...(ks.inCenter ? ['center', 'castle'] : ['open', 'shield', 'weak']), ...ks.openFilesNearKing],
      answerSquares: [ks.square],
      negative: false,
    });
  }

  // GREEDY PAWN GRAB — greedy-pawn-grab (David 2026-06-28). Present a capturable
  // pawn and ask if it's safe to take; SEE grounds greedy vs OK. Prefer a
  // POISONED pawn (the teachable case) when one exists.
  const grabs = findPawnGrabs(fen);
  if (grabs.length > 0) {
    const g = grabs[0]; // poisoned-first ordering
    let firstTo: Square | null = null;
    try { const c = new Chess(fen); const mv = c.move(g.capture); if (mv) firstTo = mv.to as Square; } catch { firstTo = null; }
    out.push({
      id: 'greedy-grab', type: 'target', bucket: 'calculation', misconceptionTag: 'greedy-pawn-grab',
      prompt: `Can you safely grab the pawn on ${g.square}, or is it poisoned?`,
      answer: g.safe
        ? `Yes — ${g.capture} wins a clean pawn (the exchange nets ${g.see}).`
        : `No — ${g.capture} is greedy: the pawn is poisoned and the recapture wins material back (the exchange nets ${g.see} for you).`,
      acceptTokens: g.safe
        ? [sq(g.square), 'yes', 'safe', 'take', 'free', 'clean']
        : [sq(g.square), 'no', 'poisoned', 'greedy', 'trap', 'unsafe', "don't"],
      answerSquares: firstTo ? [firstTo] : [g.square],
      // Play the exchange out so the student SEES the queen come back off (or the
      // clean grab) — tell AND show the why.
      demoLine: seeSequence(fen, g.square),
      negative: false,
    });
  }

  // DEVELOPMENT — neglected-development (opening bucket).
  const devMe = developmentRead(fen, me);
  if (devMe && devMe.totalMinors > 0 && devMe.developedMinors < devMe.totalMinors) {
    const undev = devMe.totalMinors - devMe.developedMinors;
    out.push({
      id: 'development', type: 'development', bucket: 'openings',
      misconceptionTag: 'neglected-development',
      prompt: 'Are all your pieces developed? How many minor pieces are still at home?',
      answer: `${undev} of your ${devMe.totalMinors} minor pieces ${undev === 1 ? 'is' : 'are'} still undeveloped${devMe.castled ? '' : ', and you have not castled yet'}.`,
      acceptTokens: [String(undev), 'undeveloped', 'development', 'develop', ...(devMe.castled ? [] : ['castle'])],
      negative: false,
    });
  }

  return out;
}

/** Translate an ENGINE eval into a grounded who's-winning verdict (words +
 *  accept tokens). Returns null when no eval is available — never a guess (G3). */
function evalToVerdict(
  evalCp: number | null | undefined,
  mateIn: number | null | undefined,
  sideToMove: 'white' | 'black',
): { answer: string; tokens: string[] } | null {
  if (mateIn != null && mateIn !== 0) {
    const winnerWhite = (mateIn > 0) === (sideToMove === 'white');
    const w = winnerWhite ? 'White' : 'Black';
    return { answer: `${w} has a forced mate — completely winning.`, tokens: [winnerWhite ? 'white' : 'black', 'winning', 'mate', 'decisive'] };
  }
  if (evalCp == null) return null;
  const winnerWhite = evalCp > 0;
  const w = winnerWhite ? 'White' : 'Black';
  const tok = winnerWhite ? 'white' : 'black';
  const a = Math.abs(evalCp);
  if (a < 50) return { answer: 'The position is roughly equal.', tokens: ['equal', 'even', 'balanced', 'roughly'] };
  if (a < 150) return { answer: `${w} is slightly better.`, tokens: [tok, 'slightly', 'edge', 'better'] };
  if (a < 400) return { answer: `${w} is clearly better.`, tokens: [tok, 'better', 'clearly'] };
  return { answer: `${w} is winning.`, tokens: [tok, 'winning', 'much'] };
}

/** Tokens that count as a correct material read ("even" / "white up …" / a number). */
function materialTokens(material: string): string[] {
  const lower = material.toLowerCase();
  const toks: string[] = [];
  if (/even|equal/.test(lower)) toks.push('even', 'equal');
  if (/white/.test(lower)) toks.push('white');
  if (/black/.test(lower)) toks.push('black');
  const num = lower.match(/\b(\d+)\b/);
  if (num) toks.push(num[1]);
  if (/up|ahead|more/.test(lower)) toks.push('up', 'ahead');
  if (/down|behind/.test(lower)) toks.push('down', 'behind');
  return toks;
}

export type ReadingVerdict = 'correct' | 'partial' | 'wrong';

export interface ReadingGrade {
  verdict: ReadingVerdict;
  /** The canonical answer to surface to the student. */
  correctAnswer: string;
  /** A short reason, used when the LLM grader is unavailable. */
  note: string;
}

/**
 * Deterministic grader — matches the student's free-text answer against the
 * computed answer key. Offline + testable; the LLM grader (natural language)
 * wraps this for fuzzier reads but the truth is ALWAYS the computed key.
 *
 * Rules:
 *  - A `negative` question (answer is "nothing") → correct iff the student said
 *    nothing/none/safe (and named no specific wrong claim).
 *  - Otherwise → correct iff the answer contains any accept token (a named
 *    square, piece, or motif); wrong if it asserts the negative on a live
 *    position; partial if it's on-topic but names nothing concrete.
 */
export function gradeReadingAnswerDeterministic(q: ReadingQuestion, userAnswer: string): ReadingGrade {
  const a = ` ${userAnswer.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')} `;
  const saidNothing = NEG_TOKENS.some((t) => a.includes(` ${t} `));

  if (q.negative) {
    return saidNothing
      ? { verdict: 'correct', correctAnswer: q.answer, note: 'Right — nothing concrete here.' }
      : { verdict: 'wrong', correctAnswer: q.answer, note: 'There is nothing concrete to find in this position.' };
  }

  const hit = q.acceptTokens.find((t) => t && a.includes(` ${t} `));
  if (hit) {
    return { verdict: 'correct', correctAnswer: q.answer, note: `You spotted it (${hit.trim()}).` };
  }
  if (saidNothing) {
    return { verdict: 'wrong', correctAnswer: q.answer, note: 'There IS something here to find.' };
  }
  return { verdict: 'partial', correctAnswer: q.answer, note: 'On the right track, but name the exact square or idea.' };
}

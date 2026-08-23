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
 *  adjacent file), doubled (≥2 on a file), and backward (no neighboring pawn
 *  can ever support it advancing, AND the square directly ahead is already
 *  controlled by an enemy pawn — so it can neither be defended by a pawn nor
 *  safely pushed). The squares the opponent targets. */
export function findWeakPawns(fen: string, color: Color): { isolated: Square[]; doubled: Square[]; backward: Square[] } {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return { isolated: [], doubled: [], backward: [] }; }
  const byFile: Record<number, number[]> = {};
  const squareByFileRank: Record<string, Square> = {};
  for (const row of chess.board()) for (const cell of row) {
    if (cell && cell.type === 'p' && cell.color === color) {
      const f = cell.square.charCodeAt(0) - 97;
      const r = Number(cell.square[1]);
      (byFile[f] ??= []).push(r);
      squareByFileRank[`${f}:${r}`] = cell.square;
    }
  }
  const isolated: Square[] = [];
  const doubled: Square[] = [];
  const backward: Square[] = [];
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const forward = color === 'w' ? 1 : -1;
  for (const fStr of Object.keys(byFile)) {
    const f = Number(fStr);
    const ranks = byFile[f];
    if (ranks.length >= 2) doubled.push(...ranks.map((r) => squareByFileRank[`${f}:${r}`]));
    const hasNeighbor = !!byFile[f - 1] || !!byFile[f + 1];
    if (!hasNeighbor) isolated.push(...ranks.map((r) => squareByFileRank[`${f}:${r}`]));

    for (const r of ranks) {
      // A neighboring pawn on an adjacent file, level with or behind this one,
      // could one day advance to guard it — that rules out "backward".
      const neighborCouldSupport = [f - 1, f + 1].some((nf) =>
        (byFile[nf] ?? []).some((nr) => (color === 'w' ? nr <= r : nr >= r)));
      if (neighborCouldSupport) continue;
      const pushRank = r + forward;
      if (pushRank < 1 || pushRank > 8) continue;
      const pushSq = `${String.fromCharCode(97 + f)}${pushRank}` as Square;
      const controlledByEnemyPawn = chess.attackers(pushSq, enemy).some((s) => chess.get(s)?.type === 'p');
      if (controlledByEnemyPawn) backward.push(squareByFileRank[`${f}:${r}`]);
    }
  }
  return { isolated, doubled, backward };
}

export type PressureVerdict = 'winnable' | 'balanced-tension' | 'solid' | 'none';

export interface PressureCount {
  square: Square;
  piece: PieceSymbol;
  color: Color;
  /** How many enemy pieces attack the target. */
  attackers: number;
  /** How many friendly pieces defend it. */
  defenders: number;
  attackerSquares: Square[];
  defenderSquares: Square[];
  /**
   * `winnable`  — attackers already outnumber defenders (SEE-confirmed win);
   * `balanced-tension` — equal count, ≥1 each: "one more attacker and it falls"
   *   (Naroditsky's classic d4-pawn read — the pressure frame, not SEE);
   * `solid` — better defended than attacked; `none` — untouched.
   */
  verdict: PressureVerdict;
}

/** ATTACKER-vs-DEFENDER pressure on one square — the deterministic backing for
 *  Naroditsky's "the d4-pawn has two attackers and two defenders; one more
 *  attacker and it falls" teaching frame (#5 in the coverage audit). Counts are
 *  pure chess.js geometry (G3); the `winnable` verdict is SEE-confirmed so the
 *  count heuristic never over-claims a win the exchange doesn't actually give. */
export function pressureCount(fen: string, square: Square): PressureCount | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const piece = chess.get(square);
  if (!piece) return null;
  const enemy: Color = piece.color === 'w' ? 'b' : 'w';
  const attackerSquares = chess.attackers(square, enemy);
  const defenderSquares = chess.attackers(square, piece.color);
  const attackers = attackerSquares.length;
  const defenders = defenderSquares.length;
  let verdict: PressureVerdict = 'none';
  if (attackers === 0) verdict = 'none';
  else if (attackers > defenders && seeGain(chess, square) > 0) verdict = 'winnable';
  else if (attackers >= 1 && attackers === defenders) verdict = 'balanced-tension';
  else if (attackers > defenders) verdict = 'winnable';
  else verdict = 'solid';
  return { square, piece: piece.type, color: piece.color, attackers, defenders, attackerSquares, defenderSquares, verdict };
}

/** Every square carrying an enemy piece under real pressure (≥1 attacker),
 *  sorted so the winnable/tension targets a teacher would name come first.
 *  `attackerColor` is the side doing the pressing (the student). */
export function pressuredTargets(fen: string, attackerColor: Color): PressureCount[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const enemy: Color = attackerColor === 'w' ? 'b' : 'w';
  const out: PressureCount[] = [];
  for (const row of chess.board()) for (const cell of row) {
    if (!cell || cell.color !== enemy) continue;
    const pc = pressureCount(fen, cell.square);
    if (pc && pc.attackers >= 1) out.push(pc);
  }
  const rank: Record<PressureVerdict, number> = { winnable: 0, 'balanced-tension': 1, solid: 2, none: 3 };
  return out.sort((a, b) => rank[a.verdict] - rank[b.verdict] || (b.attackers - a.attackers));
}

/** PASSED PAWNS for `color` — a pawn with no enemy pawn on its own OR either
 *  adjacent file anywhere ahead of it, so nothing can stop it queening by
 *  pawn-capture. Pure file/rank geometry (G3). Backs Naroditsky's "that a-pawn
 *  is a monster passer — push it" (#20/#33). Returns the pawn squares. */
export function findPassedPawns(fen: string, color: Color): Square[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const enemyPawns: { f: number; r: number }[] = [];
  const ownPawns: Square[] = [];
  for (const row of chess.board()) for (const cell of row) {
    if (!cell || cell.type !== 'p') continue;
    const f = cell.square.charCodeAt(0) - 97;
    const r = Number(cell.square[1]);
    if (cell.color === color) ownPawns.push(cell.square);
    else enemyPawns.push({ f, r });
  }
  const forward = color === 'w' ? 1 : -1;
  const passed: Square[] = [];
  for (const sq of ownPawns) {
    const f = sq.charCodeAt(0) - 97;
    const r = Number(sq[1]);
    const blocked = enemyPawns.some((ep) =>
      Math.abs(ep.f - f) <= 1 && (color === 'w' ? ep.r > r : ep.r < r));
    if (!blocked && r + forward >= 1 && r + forward <= 8) passed.push(sq);
  }
  return passed;
}

/** The friendly MINOR piece (bishop/knight) a teacher would tell you to KEEP —
 *  the most active one by board scope, plus whether it markedly out-scopes the
 *  enemy's best minor (Naroditsky's "preserve all light-square bishops → don't
 *  trade your good piece", #14). Reuses `pieceScope` (G3 activity, not a vibe). */
export function bestMinorToKeep(fen: string, color: Color): { note: ActivePieceNote; dominant: boolean } | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const minorsOf = (c: Color): ActivePieceNote[] => {
    const notes: ActivePieceNote[] = [];
    for (const row of chess.board()) for (const cell of row) {
      if (!cell || cell.color !== c || (cell.type !== 'b' && cell.type !== 'n')) continue;
      notes.push({ square: cell.square, piece: cell.type, scope: pieceScope(chess, cell.square) });
    }
    return notes.sort((a, b) => b.scope - a.scope);
  };
  const ours = minorsOf(color);
  if (ours.length === 0) return null;
  const theirs = minorsOf(color === 'w' ? 'b' : 'w');
  const best = ours[0];
  const enemyBest = theirs[0]?.scope ?? 0;
  return { note: best, dominant: best.scope >= enemyBest + 3 };
}

/** BISHOP PAIR — does `color` hold two bishops while the opponent does not?
 *  The classic long-term positional asset Naroditsky names constantly
 *  (concept `bishop-pair`, 191 corpus notes). Pure piece count (G3). */
export function bishopPair(fen: string, color: Color): boolean {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return false; }
  const enemy: Color = color === 'w' ? 'b' : 'w';
  let ours = 0; let theirs = 0;
  for (const row of chess.board()) for (const cell of row) {
    if (!cell || cell.type !== 'b') continue;
    if (cell.color === color) ours += 1; else theirs += 1;
  }
  return ours >= 2 && theirs < 2;
}

export interface OpponentIntent {
  /** The opponent's most dangerous immediate idea (their SAN). */
  san: string;
  /** SEE material it wins (0 for a non-material forcing threat like a fork). */
  gain: number;
  /** 'capture' — wins material outright; 'fork' — hits two valuable pieces. */
  kind: 'capture' | 'fork';
  /** The square the threatened/forking piece lands on. */
  target: Square;
}

/** OPPONENT-INTENT read — "what does the opponent WANT to do next?" — the
 *  deterministic backing for Naroditsky's #1 teaching behavior, PROPHYLAXIS
 *  (927 corpus notes): name the opponent's threat so the student can pre-empt
 *  it. Flips the side to move and finds the opponent's best immediate idea:
 *  a material-winning capture (SEE-confirmed) or a fork that hits two valuable
 *  pieces. Returns null on a quiet position (nothing to anticipate). Pure
 *  chess.js (G3) — no engine, latency-safe on the move hot path. */
export function opponentIntentRead(fen: string, studentColor: Color | 'white' | 'black'): OpponentIntent | null {
  const student: Color = studentColor === 'w' || studentColor === 'white' ? 'w' : 'b';
  const opp: Color = student === 'w' ? 'b' : 'w';
  const parts = fen.split(' ');
  if (parts.length < 6) return null;
  parts[1] = opp;                 // make it the opponent's move
  parts[3] = '-';                 // clear en-passant (side flip invalidates it)
  let chess: Chess;
  try { chess = new Chess(parts.join(' ')); } catch { return null; }
  let best: OpponentIntent | null = null;
  const consider = (cand: OpponentIntent): void => {
    if (!best || cand.gain > best.gain || (cand.gain === best.gain && cand.kind === 'fork' && best.kind !== 'fork')) best = cand;
  };
  // Material-winning captures: SEE the target square with the opponent to move —
  // the swap-off net FROM THE OPPONENT's side (they capture first). >0 ⇒ winnable.
  const seen = new Set<string>();
  for (const mv of chess.moves({ verbose: true })) {
    if (!mv.captured || seen.has(mv.to)) continue;
    seen.add(mv.to);
    const gain = seeGain(chess, mv.to as Square);
    if (gain <= 0) continue;
    // Name it with the least-valuable attacker's capture (the move actually played).
    const caps = chess.moves({ verbose: true }).filter((m) => m.to === mv.to && m.captured);
    caps.sort((a, b) => (PIECE_VALUE[a.piece] ?? 0) - (PIECE_VALUE[b.piece] ?? 0));
    consider({ san: caps[0].san, gain, kind: 'capture', target: mv.to as Square });
  }
  for (const mv of chess.moves({ verbose: true })) {
    // Fork: after the move the moved piece attacks ≥2 student pieces worth ≥3.
    if (mv.piece === 'n' || mv.piece === 'q' || mv.piece === 'b' || mv.piece === 'r' || mv.piece === 'p') {
      let after: Chess;
      try { after = new Chess(chess.fen()); after.move(mv); } catch { continue; }
      const hitFen = after.fen().split(' '); hitFen[1] = opp; // keep opp as attacker to read attacks
      let probe: Chess;
      try { probe = new Chess(hitFen.join(' ')); } catch { continue; }
      let valuableHits = 0;
      for (const row of probe.board()) for (const cell of row) {
        if (!cell || cell.color === opp) continue;
        if (PIECE_VALUE[cell.type] < 3) continue;
        if (probe.attackers(cell.square, opp).includes(mv.to as Square)) valuableHits += 1;
      }
      if (valuableHits >= 2) consider({ san: mv.san, gain: 0, kind: 'fork', target: mv.to as Square });
    }
  }
  return best;
}

export interface OpenFilesInfo {
  /** Files with no pawns of EITHER color — fully open. */
  open: string[];
  /** Files with no WHITE pawns (may still carry black pawns) — open for White's rooks. */
  whiteSemiOpen: string[];
  /** Files with no BLACK pawns (may still carry white pawns) — open for Black's rooks. */
  blackSemiOpen: string[];
}

/** Which files are OPEN or SEMI-OPEN — where rooks belong. Pure pawn-count
 *  geometry (G3); independent of whether a rook currently sits there (that
 *  reactive read lives in `findPieceQuality`). */
export function findOpenFiles(fen: string): OpenFilesInfo {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return { open: [], whiteSemiOpen: [], blackSemiOpen: [] }; }
  const counts: { w: number; b: number }[] = Array.from({ length: 8 }, () => ({ w: 0, b: 0 }));
  for (const row of chess.board()) for (const cell of row) {
    if (cell && cell.type === 'p') counts[cell.square.charCodeAt(0) - 97][cell.color] += 1;
  }
  const open: string[] = [];
  const whiteSemiOpen: string[] = [];
  const blackSemiOpen: string[] = [];
  for (let f = 0; f < 8; f += 1) {
    const letter = String.fromCharCode(97 + f);
    const { w, b } = counts[f];
    if (w === 0 && b === 0) { open.push(letter); continue; }
    if (w === 0) whiteSemiOpen.push(letter);
    if (b === 0) blackSemiOpen.push(letter);
  }
  return { open, whiteSemiOpen, blackSemiOpen };
}

export interface SpaceInfo { white: number; black: number }

/** Whether `rank` sits in the classic "contestable" zone for `color` — the
 *  same band `findPieceQuality` uses for knight outposts, reused here for
 *  consistency across the codebase's structural reads. */
function inContestedZone(rank: number, color: Color): boolean {
  return color === 'w' ? rank >= 4 && rank <= 6 : rank >= 3 && rank <= 5;
}

/** SPACE — how many squares in the opponent's half each side's PAWNS control
 *  (the classic engine space metric: squares a pawn attacks, not squares it
 *  merely occupies). More space = more room to maneuver, less for the
 *  opponent. Pure geometry (G3) — pawn diagonal-attack squares, deduplicated. */
export function computeSpace(fen: string): SpaceInfo {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return { white: 0, black: 0 }; }
  const controlled: Record<Color, Set<string>> = { w: new Set(), b: new Set() };
  for (const row of chess.board()) for (const cell of row) {
    if (!cell || cell.type !== 'p') continue;
    const file = cell.square.charCodeAt(0) - 97;
    const rank = Number(cell.square[1]);
    const forward = cell.color === 'w' ? 1 : -1;
    for (const df of [-1, 1]) {
      const f = file + df;
      const r = rank + forward;
      if (f < 0 || f > 7 || r < 1 || r > 8) continue;
      if (!inContestedZone(r, cell.color)) continue;
      controlled[cell.color].add(`${String.fromCharCode(97 + f)}${r}`);
    }
  }
  return { white: controlled.w.size, black: controlled.b.size };
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
    const to = mv.to;
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

export interface MaterialCount {
  white: Record<string, number>;
  black: Record<string, number>;
}

/** Piece counts + the White-perspective material advantage in points.
 *  Absorbed from the now-deleted positionAssessor.ts (2026-08-14) — that
 *  module had exactly one caller (groundedAnswer's 'material'/'center'
 *  topics) and its OTHER three fields (pawn structure, king safety, piece
 *  development) duplicated this file's richer, already-wired versions
 *  (findWeakPawns/kingSafetyRead/developmentRead) and were never read —
 *  computed and discarded on every call. One file, so nothing sits unused
 *  in a module nobody else reaches. */
export function countMaterial(fen: string): { material: MaterialCount; advantage: number } {
  const white: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  const black: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return { material: { white, black }, advantage: 0 }; }
  for (const row of chess.board()) for (const cell of row) {
    if (!cell || cell.type === 'k') continue;
    const bucket = cell.color === 'w' ? white : black;
    bucket[cell.type] += 1;
  }
  let whiteTotal = 0;
  let blackTotal = 0;
  for (const [type, count] of Object.entries(white)) whiteTotal += (PIECE_VALUE[type as PieceSymbol] ?? 0) * count;
  for (const [type, count] of Object.entries(black)) blackTotal += (PIECE_VALUE[type as PieceSymbol] ?? 0) * count;
  return { material: { white, black }, advantage: whiteTotal - blackTotal };
}

const CENTER_SQUARES = new Set(['d4', 'd5', 'e4', 'e5']);
const EXTENDED_CENTER = new Set(['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6']);

/** How many of each side's non-pawn, non-king pieces bear on the center
 *  (the 4 central squares or the extended ring around them). */
export function centralPieceCount(fen: string): { white: number; black: number } {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return { white: 0, black: 0 }; }
  let white = 0;
  let black = 0;
  for (const row of chess.board()) for (const cell of row) {
    if (!cell || cell.type === 'k' || cell.type === 'p') continue;
    if (!CENTER_SQUARES.has(cell.square) && !EXTENDED_CENTER.has(cell.square)) continue;
    if (cell.color === 'w') white += 1; else black += 1;
  }
  return { white, black };
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

/** A file list a person would say out loud: "d and e" / "c, d and e". */
function listOfFiles(files: readonly string[]): string {
  if (files.length <= 1) return files[0] ?? '';
  return `${files.slice(0, -1).join(', ')} and ${files[files.length - 1]}`;
}

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
  /** Student rating — adapts the CALCULATION drill depth (David 2026-06-28:
   *  weak ~3 plies, intermediate ~4, advanced 6+). */
  rating?: number;
}

/** The FORCING prefix of a line — moves that are a capture or give check, in
 *  order, stopping at the first quiet move. A genuinely forcing sequence the
 *  student can be asked to calculate to its end (G3 — real legal moves only). */
export function forcingPrefix(fen: string, line: readonly string[]): string[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const out: string[] = [];
  for (const san of line) {
    let mv;
    try { mv = chess.move(san); } catch { break; }
    if (!mv) break;
    const isForcing = !!mv.captured || chess.inCheck(); // capture, or it gives check
    if (!isForcing) break;
    out.push(mv.san);
  }
  return out;
}

export interface ForcingCandidate {
  /** Legal SAN of the forcing try. */
  san: string;
  /** Destination square (the reliable click/short-form accept token). */
  to: Square;
  /** CCT class — the calculation method's ordering (checks, then captures, then threats). */
  kind: 'check' | 'capture';
}

/**
 * The CCT candidate moves for the side to move — every CHECK and every CAPTURE
 * legal in the position (David 2026-07-04, calculation-method drill). These are
 * the moves a trained player enumerates FIRST, before calculating any single
 * line ("candidates-first / checks-captures-threats"). Deterministic chess.js —
 * the answer key for "name your candidate forcing moves". Checks before captures
 * (the CCT order), most-forcing first; capped so the list stays teachable.
 */
export function findForcingCandidates(fen: string, cap = 8): ForcingCandidate[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const checks: ForcingCandidate[] = [];
  const captures: ForcingCandidate[] = [];
  for (const mv of chess.moves({ verbose: true })) {
    const gives = mv.san.includes('+') || mv.san.includes('#');
    if (gives) checks.push({ san: mv.san, to: mv.to, kind: 'check' });
    else if (mv.captured) captures.push({ san: mv.san, to: mv.to, kind: 'capture' });
  }
  // A move that is BOTH a check and a capture already counted as a check (more
  // forcing) — dedupe by SAN so it isn't listed twice.
  const seen = new Set(checks.map((c) => c.san));
  const uniqueCaptures = captures.filter((c) => !seen.has(c.san));
  return [...checks, ...uniqueCaptures].slice(0, cap);
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
    try { const c = new Chess(fen); const mv = c.move(pv[0]); if (mv) firstTo = mv.to; } catch { firstTo = null; }
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

  // CALCULATION METHOD DRILL (David 2026-07-04 — "how would you teach someone to
  // calculate"). Not just "grade a rep" — teach the METHOD, in order, on ONE real
  // forcing line: (1) candidates-first — enumerate the forcing tries BEFORE
  // committing; (2) calculate the main line to its quiet end; (3) evaluate the
  // endpoint (who's better?). Three grounded questions on the same line — the
  // ordering IS the lesson. Grounded in the engine PV's forcing prefix (deep
  // combos) or the SEE swap-off (material wins) — real legal moves only (G3).
  {
    const enemyWins = findHangingBySee(fen).filter((h) => h.color === enemy);
    let calcSeq: string[] = [];
    if (opts.pvSan && opts.pvSan.length >= 2) calcSeq = forcingPrefix(fen, opts.pvSan);
    if (calcSeq.length < 2 && enemyWins.length > 0) calcSeq = seeSequence(fen, enemyWins[0].square);
    // Adaptive depth floor: weak ~3 plies, intermediate ~4, advanced 6+.
    const r = opts.rating ?? 1200;
    const minLen = r < 1400 ? 3 : r < 1900 ? 4 : 6;
    if (calcSeq.length >= minLen) {
      const first = calcSeq[0];
      const last = calcSeq[calcSeq.length - 1];
      let lastTo: Square | null = null;
      try { const c = new Chess(fen); for (const m of calcSeq) { const mv = c.move(m); if (mv) lastTo = mv.to; } } catch { /* keep null */ }

      // STEP 1 — CANDIDATES FIRST. Name the forcing tries (checks + captures)
      // before calculating any single line. The grounded key is every CCT move
      // in the position; the RIGHT one to calculate is the line's first move,
      // but naming any real candidate is a correct read of the method.
      const candidates = findForcingCandidates(fen);
      if (candidates.length > 0) {
        const candTokens = [...new Set(candidates.flatMap((c) => [sq(c.to), c.san.toLowerCase()]))];
        out.push({
          id: 'calc-candidates', type: 'plan', bucket: 'calculation', misconceptionTag: 'missed-tactic',
          prompt: 'Calculation, step 1 — candidates first. Before you calculate anything, name a forcing candidate move: a check or a capture worth looking at.',
          answer: `Your forcing candidates: ${candidates.map((c) => c.san).join(', ')}. The one that works starts ${first}.`,
          acceptTokens: candTokens,
          answerSquares: candidates.map((c) => c.to),
          answerMoves: candidates.map((c) => c.san),
          negative: false,
        });
      }

      // STEP 2 — CALCULATE TO THE END. Pick the critical candidate and read it
      // to the quiet end; name the LAST move (visualize the endpoint). The whole
      // line plays out on the board (demoLine) — including the opponent's best
      // replies, so the student SEES the defense held.
      out.push({
        id: 'calculation', type: 'plan', bucket: 'calculation', misconceptionTag: 'missed-tactic',
        prompt: `Calculation, step 2 — calculate it out. Starting with ${first}, read the forcing line to its end. What is the LAST move of the combination?`,
        answer: `The line is ${calcSeq.join(' ')} — it ends with ${last}.`,
        acceptTokens: [sq(last), ...(lastTo ? [sq(lastTo)] : [])],
        answerMoves: [last],
        answerSquares: lastTo ? [lastTo] : undefined,
        demoLine: calcSeq,
        negative: false,
      });

      // STEP 3 — EVALUATE THE ENDPOINT. Calculation isn't done until you JUDGE
      // the final position: don't calculate into something worse. The engine
      // eval (evalToVerdict) is the eval assuming best play — i.e. the eval AT
      // the end of this line — so it grounds who's-better at the endpoint. Only
      // asked when an eval is available (never a guessed verdict, G3).
      const endVerdict = evalToVerdict(opts.evalCp, opts.mateIn, sideToMove);
      if (endVerdict) {
        out.push({
          id: 'calc-evaluate', type: 'who-is-winning', bucket: 'calculation',
          prompt: `Calculation, step 3 — evaluate the endpoint. After ${last}, the smoke clears. Who is better, and by roughly how much?`,
          answer: `${endVerdict.answer} That's the payoff of the line — calculation ends in a JUDGEMENT, not just a move.`,
          acceptTokens: endVerdict.tokens,
          answerSquares: lastTo ? [lastTo] : undefined,
          negative: false,
        });
      }
    }
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

  // WEAK PAWNS — your structural weaknesses (isolated / doubled / backward).
  const wp = findWeakPawns(fen, me);
  const weakPawnSquares = [...new Set([...wp.isolated, ...wp.doubled, ...wp.backward])];
  if (weakPawnSquares.length > 0) {
    out.push({
      id: 'weak-pawn', type: 'weak-pawn', bucket: 'positional', misconceptionTag: 'created-pawn-weakness',
      prompt: 'Do you have any weak pawns? Where are they?',
      answer: `Weak pawn${weakPawnSquares.length > 1 ? 's' : ''}: ${weakPawnSquares.join(', ')}${wp.isolated.length ? ` (isolated: ${wp.isolated.join(', ')})` : ''}${wp.doubled.length ? ` (doubled: ${wp.doubled.join(', ')})` : ''}${wp.backward.length ? ` (backward: ${wp.backward.join(', ')})` : ''}.`,
      acceptTokens: weakPawnSquares.map(sq),
      answerSquares: weakPawnSquares,
      negative: false,
    });
  }

  // SPACE — pawn-controlled squares in the opponent's half.
  const space = computeSpace(fen);
  const mySpace = me === 'w' ? space.white : space.black;
  const theirSpace = me === 'w' ? space.black : space.white;
  if (mySpace !== theirSpace) {
    out.push({
      id: 'space', type: 'space', bucket: 'positional',
      prompt: 'Who has more space, and by how much?',
      answer: mySpace > theirSpace
        ? `You control more space — your pawns cover ${mySpace} squares in enemy territory to your opponent's ${theirSpace}.`
        : `Your opponent controls more space — their pawns cover ${theirSpace} squares in your territory to your ${mySpace}.`,
      acceptTokens: [mySpace > theirSpace ? 'you' : 'opponent', 'space', String(mySpace), String(theirSpace)],
      negative: false,
    });
  }

  // OPEN FILES — where the rooks belong (independent of whether one sits there yet).
  const files = findOpenFiles(fen);
  const myOpen = [...files.open, ...(me === 'w' ? files.whiteSemiOpen : files.blackSemiOpen)];
  if (myOpen.length > 0) {
    out.push({
      id: 'open-file', type: 'open-file', bucket: 'positional',
      prompt: 'Which file(s) should your rooks be heading for?',
      answer: `The ${listOfFiles(myOpen)}-file${myOpen.length > 1 ? 's are' : ' is'} open for your rooks.`,
      acceptTokens: myOpen.map((f) => `${f}-file`).concat(myOpen),
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

  // COUNTING — "calculate the recapture before you take" (David 2026-06-28:
  // this is a COUNTING issue, NOT greedy). The SEE swap-off grounds whether a
  // capturable pawn is actually safe; a POISONED one means you'd lose material
  // back if you miscounted. Plays the exchange out (demoLine) so you SEE it.
  // NOTE: 'counting' isn't one of the current 17 misconception tags — left
  // untagged (flagged to add a counting bucket).
  const grabs = findPawnGrabs(fen);
  const poisoned = grabs.find((x) => !x.safe);
  if (poisoned) {
    let firstTo: Square | null = null;
    try { const c = new Chess(fen); const mv = c.move(poisoned.capture); if (mv) firstTo = mv.to; } catch { firstTo = null; }
    out.push({
      id: 'counting-recapture', type: 'target', bucket: 'calculation',
      prompt: `Calculate it out: is the pawn on ${poisoned.square} actually safe to take?`,
      answer: `No — ${poisoned.capture} loses material: count the recapture (the exchange nets ${poisoned.see} for you).`,
      acceptTokens: [sq(poisoned.square), 'no', 'poisoned', 'unsafe', 'lose', "don't", 'defended'],
      answerSquares: firstTo ? [firstTo] : [poisoned.square],
      demoLine: seeSequence(fen, poisoned.square), // play the recapture out — SEE it
      negative: false,
    });
  }

  // TRUE GREEDY PAWN GRAB — greedy-pawn-grab = "grabbed material, ignored
  // position" (David 2026-06-28): the grab is MATERIALLY SAFE (you don't lose it
  // back — that's counting), but taking it is still WRONG because the position
  // suffers. That's an ENGINE judgement, so it's only asked when an eval + PV
  // are supplied AND the engine's best move is NOT the safe grab.
  const safeGrab = grabs.find((x) => x.safe);
  if (safeGrab && opts.pvSan && opts.pvSan.length > 0 && opts.pvSan[0] !== safeGrab.capture) {
    out.push({
      id: 'greedy-grab', type: 'target', bucket: 'calculation', misconceptionTag: 'greedy-pawn-grab',
      prompt: `The pawn on ${safeGrab.square} can be safely taken — but should you? Is grabbing it greedy here?`,
      answer: `Yes — grabbing on ${safeGrab.square} is greedy: you win the pawn but the engine prefers ${opts.pvSan[0]}; taking neglects the position.`,
      acceptTokens: [sq(safeGrab.square), 'greedy', 'yes', 'no', 'position', 'develop', sq(opts.pvSan[0])],
      answerMoves: [opts.pvSan[0]],
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

/** Board region of a square — for the "narrow it" hint tier. */
function regionOf(square: Square): string {
  const f = square.charCodeAt(0) - 97;
  if (f <= 2) return 'the queenside';
  if (f >= 5) return 'the kingside';
  return 'the center';
}

/** Tier-1 "where to look" cue keyed off the question TYPE — a nudge, never a
 *  specific square. Pure (no board needed). */
const HINT_TIER1: Partial<Record<ReadingQuestionType, string>> = {
  hanging: "Look for a piece that's attacked more times than it's defended.",
  tactic: 'Look for a forcing move — a check, a capture, or a threat.',
  threat: "Pretend it's the opponent's move — what would they hit?",
  mate: 'Is there a forcing check the king cannot escape?',
  'weak-square': 'Find a square no enemy pawn can ever challenge.',
  'strong-piece': 'Which of your pieces sees the most squares?',
  'weak-piece': 'Which of your pieces is doing the least — boxed in or offside?',
  target: "Where is the opponent softest — loose material, a weak pawn, or a hole?",
  'weak-pawn': 'Scan your pawns — any with no friendly pawn on a neighboring file?',
  'pawn-break': "Which pawn push strikes the base of the opponent's chain?",
  'king-safety': 'Look at the shelter directly around your king.',
  development: 'Count the pieces still sitting on their starting squares.',
  outpost: 'Is there a square for a knight that no pawn can ever kick away?',
  'bishop-pair': 'Count the bishops on each side.',
  'who-is-winning': 'Weigh material, king safety, and piece activity together.',
  material: 'Count the points of material on each side.',
  plan: 'Look for the most forcing, most active continuation.',
  space: "Count how far each side's pawns have pushed into enemy territory.",
  'open-file': 'Scan the files for one with no pawns of your color on it.',
};

/**
 * Progressive GROUNDED hint for a reading question (David 2026-06-28). Tier 1 =
 * where to look (type cue); Tier 2 = narrow it to a board region; Tier 3 =
 * almost there (the file of the key square). Derived purely from the COMPUTED
 * answer key — never the LLM, never the exact answer (that's the reveal). Returns
 * null when there's no more to give before showing the answer.
 */
export function readingHint(q: ReadingQuestion, tier: 1 | 2 | 3): string | null {
  if (tier === 1) {
    return HINT_TIER1[q.type] ?? 'Compare the most active piece against the loosest target.';
  }
  const sqs = q.answerSquares ?? [];
  if (tier === 2) {
    if (q.negative) return "Don't force a move — the honest read here may be that there's nothing concrete.";
    if (sqs.length > 0) return `It's on ${regionOf(sqs[0])}.`;
    return HINT_TIER1[q.type] ?? null;
  }
  // tier 3 — almost handing it: the file (still leaves the rank to find).
  if (sqs.length > 0) return `Look hard at the ${sqs[0][0]}-file.`;
  if (q.answerMoves && q.answerMoves.length > 0) {
    const m = q.answerMoves[0];
    const piece = /^[NBRQK]/.test(m)
      ? ({ N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' }[m[0]] ?? 'piece')
      : 'pawn';
    return `The move that starts it is a ${piece} move.`;
  }
  return null;
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

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
import { DEFAULT_STUDENT_RATING } from './ratingBands';

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
 * Pin/legality-aware Static Exchange Evaluation on `square`: the net material
 * the SIDE TO MOVE in `fen` wins by initiating a capture on `square`, playing
 * out ONLY LEGAL captures (least-valuable attacker first) for both sides, with
 * the standing-pat option at every step. Returns the initiator's net gain
 * (`> 0` ⇒ the piece on `square` is effectively hanging to a REAL, legal
 * capture; `0` ⇒ safe — no profitable legal capture exists).
 *
 * This is the pin-safe replacement for `seeGain` at every landing-safety /
 * hanging / "you can win" decision. `seeGain` drives off `chess.attackers()`,
 * which is GEOMETRIC — it counts a PINNED piece as a real attacker or defender,
 * so it (a) invents defenders that can't actually recapture (→ a fork/pin/"wins
 * the piece" claim on a piece that in fact hangs) and (b) invents attackers that
 * can't actually capture (→ a false "your piece is hanging"). Driving off
 * `chess.moves()` instead makes every layer legal by construction, and because
 * captures are regenerated after each ply it also sees discovered/x-ray
 * recapturers correctly.
 *
 * NB: evaluates from the perspective of whoever is to move in `fen`. Callers
 * asking "is MY piece safe here" must pass a position where the OPPONENT is to
 * move (e.g. the position right after the mover's move), so the opponent is the
 * one initiating the capture. `forceTurn` can set the side to move when needed.
 */
export function legalSeeGain(fen: string, square: Square): number {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return 0; }
  return seeCaptureValue(chess, square);
}

/** Same pin-aware SEE as `legalSeeGain`, but for a caller that ALREADY holds a
 *  `Chess` at the right side-to-move — skips the fen serialize+parse round-trip
 *  that dominates the cost in per-ply/per-candidate review loops (2026-09-13
 *  perf fix). `seeCaptureValue` moves+undoes, so `chess` is restored unchanged. */
export function legalSeeGainOn(chess: Chess, square: Square): number {
  try { return seeCaptureValue(chess, square); } catch { return 0; }
}

/** Negamax SEE over LEGAL captures on `square` for the side to move on `chess`.
 *  Mutates + restores `chess` (no per-ply clone). Depth is naturally bounded by
 *  the number of attackers of one square; a hard guard caps pathological cases. */
function seeCaptureValue(chess: Chess, square: Square, depth = 0): number {
  if (depth > 16) return 0;
  const victim = chess.get(square);
  if (!victim) return 0;
  // FAST-PATH (2026-09-13 perf): `attackers()` is a cheap GEOMETRIC superset of
  // the legal capturers, so if the side to move has NONE, no legal capture
  // exists and we can skip the expensive full `moves()` generation. This is the
  // common case in per-ply review loops (a queried square with no attacker).
  const attackerSquares = chess.attackers(square, chess.turn());
  if (attackerSquares.length === 0) return 0;
  // ONLY THE ATTACKERS' MOVES (2026-09-24 perf): generating every legal move on
  // the board at each ply of the exchange was ~70% of the gem-lesson build (the
  // punish-gem tests ran 200s+). `moves({ square })` is still LEGAL — pins and
  // checks are filtered exactly as before — for just the pieces that can reach
  // this square, which `attackers()` already names.
  const caps = attackerSquares
    .flatMap((from) => chess.moves({ square: from, verbose: true }))
    .filter((m) => m.to === square && m.captured);
  if (caps.length === 0) return 0;
  caps.sort((a, b) => (PIECE_VALUE[a.piece] ?? 0) - (PIECE_VALUE[b.piece] ?? 0));
  const cap = caps[0]; // least-valuable legal attacker
  const gain = PIECE_VALUE[victim.type] ?? 0;
  try { chess.move(cap); } catch { return 0; }
  const reply = seeCaptureValue(chess, square, depth + 1);
  chess.undo();
  // Standing pat: the initiator only captures when it nets material.
  return Math.max(0, gain - reply);
}

/** True when a piece the mover just placed on `square` is SAFE there — the
 *  opponent (to move in `fenAfterMove`) has no profitable legal capture of it.
 *  The pin-aware replacement for `seeGain(c, to) <= 0`. */
export function landingIsSafe(fenAfterMove: string, square: Square): boolean {
  return legalSeeGain(fenAfterMove, square) <= 0;
}

/** Pin/legality-aware SEE gain for `capturingColor` capturing on `square` in
 *  `fen`, REGARDLESS of whose turn the FEN records — the honest "how much does
 *  this side win by taking here" used by the safety/hanging/"you-can-win" chat
 *  answers. A pinned attacker or defender is never counted (drives off legal
 *  captures), so it neither invents a hang nor masks one. Returns net material
 *  the capturer wins (`0` = no profitable legal capture). */
export function legalSeeGainFor(fen: string, square: Square, capturingColor: Color): number {
  const parts = fen.split(' ');
  parts[1] = capturingColor;
  parts[3] = '-'; // clear en-passant, which a flipped turn could make illegal
  return legalSeeGain(parts.join(' '), square);
}

/** SIGNED pin/legality-aware SEE: what `capturingColor` NETS by initiating a
 *  capture on `square` — like `legalSeeGainFor` but NOT floored at 0, so a
 *  capture that LOSES material returns a NEGATIVE value. This is the pin-aware
 *  replacement for the geometric `seeGain` at the handful of sites that need the
 *  sign (a negative net — "the defender loses by capturing the attacker" — is
 *  how a kick is proven a real tempo). The root capture is the least-valuable
 *  LEGAL attacker (a pinned one is never counted → 0 when none can legally
 *  take); the recapture swap is the floored `seeCaptureValue`. `0` = no legal
 *  capturer OR an exactly-even trade. */
export function signedLegalSeeFor(fen: string, square: Square, capturingColor: Color): number {
  const parts = fen.split(' ');
  parts[1] = capturingColor;
  parts[3] = '-';
  let chess: Chess;
  try { chess = new Chess(parts.join(' ')); } catch { return 0; }
  const victim = chess.get(square);
  if (!victim || victim.color === capturingColor) return 0;
  if (chess.attackers(square, capturingColor).length === 0) return 0; // cheap superset — no capturer
  const caps = chess.moves({ verbose: true }).filter((m) => m.to === square && m.captured);
  if (caps.length === 0) return 0; // every geometric attacker is pinned
  caps.sort((a, b) => (PIECE_VALUE[a.piece] ?? 0) - (PIECE_VALUE[b.piece] ?? 0));
  try { chess.move(caps[0]); } catch { return 0; }
  const recapture = seeCaptureValue(chess, square); // owner's best floored legal recapture
  chess.undo();
  return (PIECE_VALUE[victim.type] ?? 0) - recapture;
}

/** Would `moverColor` win material by capturing on `square` if it were their
 *  move in `fen`? Pin/legality-aware — the honest "is this fork/attack target
 *  actually winnable" test (a pinned defender of the target no longer makes it
 *  look safe, and a defended equal piece is not "winnable"). */
export function capturesWinMaterial(fen: string, square: Square, moverColor: Color): boolean {
  return legalSeeGainFor(fen, square, moverColor) > 0;
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

/** Rewrite a FEN's side-to-move (and clear en-passant, which a flipped turn
 *  would make illegal) so move generation can answer "what could THIS side do
 *  here?" for a multi-move plan, independent of whose turn it actually is. */
function forceTurn(fen: string, color: Color): string {
  const parts = fen.split(' ');
  parts[1] = color;
  parts[3] = '-';
  return parts.join(' ');
}

/** EXPLOITABILITY — can a knight or bishop of `color` REACH the empty square
 *  `target` (a hole) and hold it within `maxMoves` moves? (David 2026-08-23: a
 *  hole is only worth naming when the student actually has a minor that can get
 *  there in a move or two — otherwise "plant a knight there" is geometry with no
 *  knight.) Turn-independent, so it answers the PLAN, not just "this ply". */
export function minorCanReachSquare(fen: string, target: Square, color: Color, maxMoves = 2): boolean {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return false; }
  if (chess.get(target)) return false; // occupied — not an empty hole to plant on
  const isMinorMove = (m: { piece: PieceSymbol }): boolean => m.piece === 'n' || m.piece === 'b';
  // reach-1: a minor of `color` can move straight onto the hole.
  const gen = (f: string): { from: Square; to: Square; piece: PieceSymbol }[] => {
    try { return new Chess(f).moves({ verbose: true }).filter(isMinorMove); } catch { return []; }
  };
  const start = forceTurn(fen, color);
  const moves1 = gen(start);
  if (moves1.some((m) => m.to === target)) return true;
  if (maxMoves < 2) return false;
  // reach-2: a minor hops to an intermediate square, then onto the hole. Cap the
  // fan-out so a pathological position can't run away.
  for (const m of moves1.slice(0, 24)) {
    let mid: Chess;
    try { mid = new Chess(start); mid.move({ from: m.from, to: m.to }); } catch { continue; }
    if (gen(forceTurn(mid.fen(), color)).some((m2) => m2.to === target)) return true;
  }
  return false;
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
      // 🔴 A KING IS NEVER HANGING — THAT IS CHECK (found 2026-09-21, measured).
      // `legalSeeGainFor` scores with the CAPTURE table, where a king is 100 so
      // an exchange search never trades into it. Read as "what can be won" that
      // is nonsense, and it leaked: on `4r1k1/3b1pB1/1b1p1Qn1/…/4R1K1 w` this
      // returned `g1 piece=k gain=100` — the White KING, listed as hanging
      // material. Worse, the list is sorted by gain DESC, so the king sorts
      // FIRST and four consumers take `hanging[0]`:
      //   · findAttackTargets  — the king enters "loose enemy material"
      //   · formatReadingFacts — it gets narrated as hanging
      //   · the hanging DRILL  — "Is any piece hanging?" answered with the king
      //   · seeSequence        — a capture sequence computed on the king square
      // `findHangingPieces` (tacticClassifier) has always skipped kings; this
      // sibling never did, and the two are otherwise a strict superset pair.
      if (cell.type === 'k') continue;
      // Pin/legality-aware: a piece hangs only if its OWNER's enemy can win it
      // with a REAL, legal capture. Geometric `seeGain` counted pinned attackers
      // (false hang) and pinned defenders (masked a real hang) — 2026-09-13 sweep.
      const enemy: Color = cell.color === 'w' ? 'b' : 'w';
      const gain = legalSeeGainFor(fen, cell.square, enemy);
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
    // A CAPTURE IS NOT A BREAK (hand walk 2026-09-24: "they have a pawn break
    // available on a5" meant …bxa5). The break is the PUSH that creates the
    // tension; taking resolves it and is named as a capture wherever it matters.
    if (mv.captured) continue;
    // Play the push, then check whether the new pawn touches an enemy pawn.
    const probe = new Chess(fen);
    try { probe.move(mv); } catch { continue; }
    const to: Square = mv.to;
    const file = to.charCodeAt(0) - 97;
    const rank = Number(to[1]);
    const forward = mover === 'w' ? 1 : -1;
    let contact = false;
    for (const df of [-1, 1]) {
      const af = file + df;
      const ar = rank + forward;
      if (af < 0 || af > 7 || ar < 1 || ar > 8) continue;
      const sq = `${String.fromCharCode(97 + af)}${ar}` as Square;
      const occ = probe.get(sq);
      if (occ && occ.type === 'p' && occ.color !== mover) contact = true; // our pawn now attacks an enemy pawn
    }
    // A BREAK THAT JUST DROPS THE PAWN IS NOT A PLAN (walk 5, 2026-09-23).
    // After 1.e4 c5 2.Nf3 d6 3.Bc4 Nf6 4.Nc3 the chat plan said "break with
    // d5" — but e4, Nc3 and Bc4 hit d5 against two defenders, so the push
    // loses a pawn and 6…Qxd5 would hang the queen to Bc4. Every consumer of
    // this computer (the plan, "they can break with", think-aloud, the review
    // read) presents a break as ADVICE, so the one test belongs here: the
    // pushed pawn must survive the exchange on its landing square. A break
    // that trades evenly still counts — that IS opening the position.
    if (contact && landingIsSafe(probe.fen(), to)) breaks.add(to);
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
/**
 * THE bad-bishop computer (WO-STANDARD-01 D-1, 2026-09-22). A bishop is bad
 * when its own pawns stop its FORWARD diagonals — the two rays toward the
 * enemy — within two squares. Mobility was the old test, and it called the
 * Italian's …Bb6 "hemmed in behind its own pawns" with the a7–g1 diagonal wide
 * open: after 1.e4 e5 2.Nf3 Bc5 3.Nxe5 d6 4.Nf3 Nf6 5.d4 Bb6 the bishop has
 * three squares (a5, c5, d4) and all of them are forward. Low mobility is a
 * symptom several things share; own pawns on the forward rays is the cause.
 *
 * Returns the squares of the blocking pawns — one per blocked forward ray —
 * so a caller can say which PAWN would free it (and only that pawn). Empty
 * when either forward ray is open. Shared by review, the positional read and
 * the fundamentals attributor: one computer, one vocabulary.
 */
export function bishopBlockingPawns(chess: Chess, square: Square, color: Color): Square[] {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const dr = color === 'w' ? 1 : -1;
  const blockers: Square[] = [];
  for (const df of [-1, 1]) {
    let blocked: Square | null = null;
    for (let step = 1; step <= 2; step += 1) {
      const f = file + df * step;
      const r = rank + dr * step;
      if (f < 0 || f > 7 || r < 1 || r > 8) break;
      const sq = `${String.fromCharCode(97 + f)}${r}` as Square;
      const occ = chess.get(sq);
      if (!occ) continue;
      if (occ.type === 'p' && occ.color === color) blocked = sq;
      break; // any other piece ends the ray, and that is not the bishop's own pawn
    }
    if (!blocked) return []; // one open forward ray and the bishop is not bad
    blockers.push(blocked);
  }
  return blockers;
}

/** True when both forward diagonals are stopped by the bishop's own pawns. */
export function bishopHemmedByOwnPawns(chess: Chess, square: Square, color: Color): boolean {
  return bishopBlockingPawns(chess, square, color).length === 2;
}

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
        // A "bad bishop" is one BLOCKED BEHIND its own pawn chain — not merely a
        // bishop with pawns on its colour. The count-only test branded an active
        // bishop developed OUTSIDE the chain (the Caro's Bf5/Bg4 — the GOOD
        // bishop Naroditsky praises) as bad, and flagged the undeveloped home
        // bishop on move 1. Require all three: developed (off its home square),
        // ≥4 own pawns on its colour, AND its forward diagonals stopped by its
        // own pawns (`bishopHemmedByOwnPawns` — mobility was the old third
        // test and it branded the Italian's active …Bb6, WO-STANDARD-01 D-1).
        const home = color === 'w' ? (square === 'c1' || square === 'f1') : (square === 'c8' || square === 'f8');
        if (home) continue;
        const bishopColor = squareColor(square);
        let ownPawnsOnColor = 0;
        for (const r2 of board) {
          for (const c2 of r2) {
            if (c2 && c2.type === 'p' && c2.color === color && squareColor(c2.square) === bishopColor) ownPawnsOnColor += 1;
          }
        }
        if (ownPawnsOnColor < 4) continue;
        if (bishopHemmedByOwnPawns(chess, square, color)) notes.push({ square, piece: 'b', color, quality: 'bad', reason: 'bad bishop (hemmed in behind its own pawns)' });
      }

      if (type === 'r') {
        const fileLetter = String.fromCharCode(97 + file);
        let ownPawns = 0;
        let enemyPawns = 0;
        for (let r = 1; r <= 8; r += 1) {
          const occ = chess.get(`${fileLetter}${r}` as Square);
          if (occ && occ.type === 'p') { if (occ.color === color) ownPawns += 1; else enemyPawns += 1; }
        }
        // ROOK ON THE (RELATIVE) SEVENTH — a rook on the opponent's 2nd rank
        // that BITES on something: an enemy pawn stuck on that rank, or the
        // enemy king pinned to its back rank. "A rook on the seventh is worth a
        // pawn" only when it has targets; a rook on an empty 7th with the king
        // long gone is just a rook. Guarded by pin-aware safety so a rook that
        // simply hangs there is never praised (2026-09-13). Board geometry (G3).
        const seventh = color === 'w' ? 7 : 2;
        if (rank === seventh) {
          const enemy: Color = color === 'w' ? 'b' : 'w';
          const backRank = color === 'w' ? 8 : 1;
          let enemyPawnOnRank = false;
          for (let f2 = 0; f2 < 8; f2 += 1) {
            const occ = chess.get(`${String.fromCharCode(97 + f2)}${seventh}` as Square);
            if (occ && occ.type === 'p' && occ.color === enemy) { enemyPawnOnRank = true; break; }
          }
          const enemyKing = chess.board().flat().find((c2) => c2 && c2.type === 'k' && c2.color === enemy);
          const kingOnBack = !!enemyKing && Number(enemyKing.square[1]) === backRank;
          if ((enemyPawnOnRank || kingOnBack) && legalSeeGainFor(fen, square, enemy) <= 0) {
            notes.push({ square, piece: 'r', color, quality: 'good', reason: 'rook on the seventh rank' });
          }
        }
        // A file with an ENEMY rook or queen on it is CONTESTED — nobody owns
        // it (walk 3, 2026-09-26: "your rook on f3 owns the open f-file" and
        // "their rook on f8 … owns the open f-file" in one breath).
        const foe: Color = color === 'w' ? 'b' : 'w';
        // Only a fully OPEN file can be contested this way: behind its own
        // pawn on a half-open file an enemy rook contests nothing (13.fxe5's
        // f8-rook behind f7).
        const contested = ownPawns === 0 && enemyPawns === 0
          && chess.board().flat().some((c2) => !!c2 && c2.color === foe && (c2.type === 'r' || c2.type === 'q') && c2.square[0] === square[0]);
        if (contested) { /* neither side's rook owns a file they share */ }
        else if (ownPawns === 0 && enemyPawns === 0) notes.push({ square, piece: 'r', color, quality: 'good', reason: 'rook on the open file' });
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

export interface ColorComplexWeakness {
  /** The side whose complex is weak. */
  side: Color;
  /** The square-colour that is weak in that side's camp. */
  complex: 'light' | 'dark';
  /** The holes of that colour the opponent can settle on. */
  squares: Square[];
}

/**
 * WEAK COLOR COMPLEX — a side that has NO bishop of one square-colour AND has
 * ≥2 holes of that colour in its own camp. With the bishop gone, no piece
 * naturally covers those squares and no pawn ever can (they're holes), so the
 * opponent's knight or surviving bishop settles there unchallenged. The classic
 * "dark-square weakness after the dark-squared bishop is traded." Reuses
 * `findWeakSquares` (pawn-holes) + bishop presence — pure geometry (G3), never
 * an eval guess. Both conditions must hold: a missing bishop alone isn't a
 * weakness, and holes a bishop still covers aren't a complex.
 */
export function findColorComplexWeakness(fen: string): ColorComplexWeakness[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const holes = findWeakSquares(fen);
  const out: ColorComplexWeakness[] = [];
  for (const side of ['w', 'b'] as Color[]) {
    const hasBishopOfColor: Record<'light' | 'dark', boolean> = { light: false, dark: false };
    for (const row of chess.board()) for (const cell of row) {
      if (cell && cell.type === 'b' && cell.color === side) hasBishopOfColor[squareColor(cell.square)] = true;
    }
    // Only holes in the side's OWN half count — a colour-complex weakness is
    // about squares in your camp the opponent settles on, not the shared centre.
    const sideHoles = (side === 'w' ? holes.white : holes.black)
      .filter((sq) => (side === 'w' ? Number(sq[1]) <= 4 : Number(sq[1]) >= 5));
    for (const complex of ['light', 'dark'] as const) {
      if (hasBishopOfColor[complex]) continue; // a bishop of that colour still covers it
      const cHoles = sideHoles.filter((sq) => squareColor(sq) === complex);
      if (cHoles.length >= 2) out.push({ side, complex, squares: cHoles });
    }
  }
  return out;
}

export interface MinorityAttack {
  /** The flank the minority runs on. */
  flank: 'queenside' | 'kingside';
  /** The lever push that makes contact (SAN), e.g. "b5". */
  leverSan: string;
  leverFrom: Square;
  leverTo: Square;
  /** The enemy pawn the lever attacks — the future weakness. */
  target: Square;
}

/**
 * MINORITY ATTACK — `color` has FEWER pawns than the opponent on a flank and can
 * advance one of them to make contact, forcing a trade that leaves the opponent
 * a weak (backward/isolated) pawn on a half-open file. The Carlsbad archetype
 * (White a+b vs Black a+b+c → b4-b5 hits c6). Board-provable and CONSERVATIVE:
 * requires a real minority (≥2 own pawns, strictly fewer than the opponent's,
 * opponent ≥3 on the flank) AND a LEGAL lever push that lands diagonally on an
 * enemy pawn — so it names a concrete move + target, never a vague "play on the
 * queenside". Returns null when no grounded lever exists (empty > invented).
 */
export function findMinorityAttack(fen: string, color: Color): MinorityAttack | null {
  let chess: Chess;
  try { chess = new Chess(forceTurn(fen, color)); } catch { return null; }
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const flanks: { name: 'queenside' | 'kingside'; files: number[] }[] = [
    { name: 'queenside', files: [0, 1, 2] },
    { name: 'kingside', files: [5, 6, 7] },
  ];
  const pawnsOn = (c: Color, files: number[]): Square[] => {
    const out: Square[] = [];
    for (const row of chess.board()) for (const cell of row) {
      if (cell && cell.type === 'p' && cell.color === c && files.includes(cell.square.charCodeAt(0) - 97)) out.push(cell.square);
    }
    return out;
  };
  for (const flank of flanks) {
    const mine = pawnsOn(color, flank.files);
    const theirs = pawnsOn(enemy, flank.files);
    if (mine.length < 2 || theirs.length < 3 || mine.length >= theirs.length) continue; // a real minority only
    // DOUBLED PAWNS ARE NOT A MINORITY — they are a weakness (hand walk
    // 2026-09-24: White's h3+h5 after 22.gxh5 was read as "a minority attack
    // on the kingside").
    if (new Set(mine.map((sq) => sq[0])).size < mine.length) continue;
    // A legal pawn push on the flank that lands diagonally adjacent to an enemy
    // pawn on the flank = the contact lever (…b5 hitting c6).
    for (const push of chess.moves({ verbose: true })) {
      if (push.piece !== 'p' || push.captured) continue;
      const toFile = push.to.charCodeAt(0) - 97;
      const toRank = Number(push.to[1]);
      if (!flank.files.includes(toFile)) continue;
      const fwd = color === 'w' ? 1 : -1;
      for (const df of [-1, 1]) {
        const tf = toFile + df;
        if (tf < 0 || tf > 7) continue;
        const diagSq = `${String.fromCharCode(97 + tf)}${toRank + fwd}` as Square;
        const occ = chess.get(diagSq);
        if (occ && occ.type === 'p' && occ.color === enemy && flank.files.includes(tf)) {
          // No check marks: the lever is read on a board with the side to move
          // FORCED, so a check the OTHER side already stands in rides along —
          // "b3+ is the lever" with Black's king in check from Qh4 (walk 5).
          return { flank: flank.name, leverSan: push.san.replace(/[+#]+$/, ''), leverFrom: push.from, leverTo: push.to, target: diagSq };
        }
      }
    }
  }
  return null;
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

export interface XrayNote {
  /** Your long-range piece doing the x-raying. */
  slider: Square;
  sliderPiece: PieceSymbol;
  /** The enemy piece it x-rays THROUGH the blocker. */
  target: Square;
  targetPiece: PieceSymbol;
  /** The single piece sitting between them. */
  blocker: Square;
}

const KNIGHT_STEPS: readonly [number, number][] = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

/** X-RAY / latent alignment — one of YOUR long-range pieces (R/B/Q) lined up with
 *  an enemy piece of value ≥ its own, with exactly ONE piece between them, so the
 *  moment the blocker shifts a real threat appears. Naroditsky names these
 *  explicitly ("the x-ray between the queen and the bishop" — a relationship that
 *  gets the wheels turning). Gated hard to stay intent-true: the target must be
 *  worth winning (≥ the slider), never a bare pawn, so we don't narrate every
 *  geometric line. Pure ray geometry (G3). */
export function findXrays(fen: string, color: Color): XrayNote[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const out: XrayNote[] = [];
  const DIRS: Record<'r' | 'b', [number, number][]> = {
    r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
    b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  };
  for (const row of chess.board()) for (const cell of row) {
    if (!cell || cell.color !== color) continue;
    if (cell.type !== 'r' && cell.type !== 'b' && cell.type !== 'q') continue;
    const dirsets: [number, number][] = cell.type === 'r' ? DIRS.r : cell.type === 'b' ? DIRS.b : [...DIRS.r, ...DIRS.b];
    const f0 = cell.square.charCodeAt(0) - 97;
    const r0 = Number(cell.square[1]);
    for (const [df, dr] of dirsets) {
      const found: { sq: Square; piece: PieceSymbol; color: Color }[] = [];
      for (let step = 1; step < 8 && found.length < 2; step += 1) {
        const f = f0 + df * step; const r = r0 + dr * step;
        if (f < 0 || f > 7 || r < 1 || r > 8) break;
        const s = `${String.fromCharCode(97 + f)}${r}` as Square;
        const p = chess.get(s);
        if (p) found.push({ sq: s, piece: p.type, color: p.color });
      }
      // slider → [blocker] → enemy target. Intent-gated to a REAL relationship,
      // not "a bishop points at f7": either the target is worth STRICTLY MORE
      // than the slider (removing the blocker wins material), OR it's the enemy
      // KING and the slider is a major piece (a genuine pin/king-file threat).
      // A bishop x-raying an equal-value knight, or any piece x-raying a pawn,
      // is dropped — that was the every-ply noise.
      if (found.length === 2 && found[1].color === enemy && found[1].piece !== 'p') {
        // The king is not "material to win" — only a major piece bearing on it
        // is a real x-ray (else a bishop pointing at f7 fires every ply).
        const winsMaterial = found[1].piece !== 'k' && PIECE_VALUE[found[1].piece] > PIECE_VALUE[cell.type];
        const majorOnKing = found[1].piece === 'k' && (cell.type === 'r' || cell.type === 'q');
        if (!winsMaterial && !majorOnKing) continue;
        // DISCOVERED ATTACK / CHECK ONLY (David 2026-08-23). The line "if that
        // blocker shifts, you win it" describes the STUDENT stepping their OWN
        // piece aside to unveil the slider — a discovered attack. An ENEMY piece
        // wedged in front of a bigger enemy piece is a PIN, which is the pin
        // detector's job, not this one. So require a FRIENDLY blocker.
        const blocker = found[0];
        if (blocker.color !== color) continue;
        // And prove the discovery is REAL: the blocker has a move to a square
        // where it isn't simply lost, and unveiling the slider genuinely wins the
        // target (or, on the king, delivers a discovered check). No safe reveal
        // that wins → it's geometry, not a threat.
        let exploitable = false;
        try {
          const start = forceTurn(fen, color);
          const c0 = new Chess(start);
          for (const bm of c0.moves({ verbose: true }).filter((m) => m.from === blocker.sq)) {
            const probe = new Chess(start);
            probe.move({ from: bm.from, to: bm.to, promotion: bm.promotion });
            // Pin-aware (2026-09-13 sweep): opponent (to move in `probe`) wins
            // the blocker on its new square ⇒ it just hangs; and the student
            // (`color`) genuinely wins the unveiled target with a legal capture.
            if (legalSeeGain(probe.fen(), bm.to) > 0) continue;            // the blocker just hangs
            if (majorOnKing ? probe.isCheck() : capturesWinMaterial(probe.fen(), found[1].sq, color)) { exploitable = true; break; }
          }
        } catch { exploitable = false; }
        if (!exploitable) continue;
        out.push({ slider: cell.square, sliderPiece: cell.type, target: found[1].sq, targetPiece: found[1].piece, blocker: found[0].sq });
      }
    }
  }
  return out;
}

/** KNIGHT REROUTE — a friendly knight on a passive square (rim, or few squares)
 *  that has a clean two-hop path to a genuine OUTPOST (enemy half, empty, and no
 *  enemy pawn can ever attack it). This is Naroditsky's signature maneuver read
 *  ("the knight goes to d7, final destination f5"). Intent-gated: only when the
 *  destination is a real outpost AND the knight is currently passive, so it never
 *  says "reroute" about an already-active knight. Pure geometry (G3). */
export function findKnightReroute(fen: string, color: Color): { from: Square; to: Square; via: Square | null } | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const enemyHalf = (r: number): boolean => (color === 'w' ? r >= 4 && r <= 6 : r >= 3 && r <= 5);
  const knightTo = (from: Square): Square[] => {
    const f0 = from.charCodeAt(0) - 97; const r0 = Number(from[1]);
    const outs: Square[] = [];
    for (const [df, dr] of KNIGHT_STEPS) {
      const f = f0 + df; const r = r0 + dr;
      if (f < 0 || f > 7 || r < 1 || r > 8) continue;
      outs.push(`${String.fromCharCode(97 + f)}${r}` as Square);
    }
    return outs;
  };
  const isOutpost = (s: Square): boolean => {
    if (chess.get(s)) return false;
    if (!enemyHalf(Number(s[1]))) return false;
    if (chess.attackers(s, enemy).some((a) => chess.get(a)?.type === 'p')) return false;
    return chess.attackers(s, color).some((a) => chess.get(a)?.type === 'p');
  };
  // STRICT to keep intent: only a knight genuinely STUCK ON THE RIM (a- or
  // h-file) is a reroute candidate, and only a ONE-HOP jump to a real outpost is
  // suggested. A developed central knight (f3, c3, …) is fine where it is — the
  // earlier "route f3 to f5 by way of h4 every ply" was exactly the generic
  // noise this avoids. Rim knight → central outpost is the honest, rare case.
  for (const row of chess.board()) for (const cell of row) {
    if (!cell || cell.color !== color || cell.type !== 'n') continue;
    const file = cell.square.charCodeAt(0) - 97;
    const onRim = file === 0 || file === 7;
    if (!onRim) continue;
    for (const dest of knightTo(cell.square)) {
      if (isOutpost(dest)) return { from: cell.square, to: dest, via: null };
    }
  }
  return null;
}

/** FIANCHETTO — a bishop on its long-diagonal home (b2/g2 for White, b7/g7 for
 *  Black) with the diagonal genuinely open (rakes ≥3 squares). Naroditsky names
 *  the fianchettoed bishop constantly ("the bishop on the long diagonal"). Pure
 *  geometry (G3). Returns the bishop's square. */
export function findFianchetto(fen: string, color: Color): Square | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const homes: Square[] = color === 'w' ? ['b2', 'g2'] : ['b7', 'g7'];
  for (const sq of homes) {
    const p = chess.get(sq);
    if (p && p.type === 'b' && p.color === color && pieceScope(chess, sq) >= 5) return sq;
  }
  return null;
}

/** ROOK LIFT — a rook on its back rank that can step up to its OWN third rank
 *  (White's rank 3, Black's rank 6) on an OPEN file-square and from there swing
 *  laterally toward the enemy king's side. Naroditsky's "lift the rook and swing
 *  it over" attacking idea. Intent-gated: only when the lift square is empty and
 *  the enemy king is castled to a flank the lifted rook can reach. Returns the
 *  rook square + the lift square. Pure geometry (G3). */
export function findRookLift(fen: string, color: Color): { rook: Square; to: Square } | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const backRank = color === 'w' ? 1 : 8;
  const liftRank = color === 'w' ? 3 : 6;
  // Where is the enemy king? Only worth lifting toward a flanked king.
  let kingFile = -1;
  for (const row of chess.board()) for (const cell of row) {
    if (cell && cell.type === 'k' && cell.color === enemy) kingFile = cell.square.charCodeAt(0) - 97;
  }
  if (kingFile < 0 || (kingFile >= 3 && kingFile <= 4)) return null; // central king — a lift is not the plan
  for (const row of chess.board()) for (const cell of row) {
    if (!cell || cell.color !== color || cell.type !== 'r' || Number(cell.square[1]) !== backRank) continue;
    const f = cell.square[0];
    const liftSq = `${f}${liftRank}` as Square;
    if (chess.get(liftSq)) continue; // path blocked
    // The rank-2 square between must be empty too (rook needs to pass).
    const midSq = `${f}${color === 'w' ? 2 : 7}` as Square;
    if (chess.get(midSq)) continue;
    return { rook: cell.square, to: liftSq };
  }
  return null;
}

/** BLOCKADE — a friendly knight or bishop sitting DIRECTLY in front of an enemy
 *  passed pawn, the square from which it can neither be pushed past nor easily
 *  evicted. Naroditsky's "the knight is a perfect blockader". Returns the
 *  blockading piece's square + the pawn it holds. Pure geometry (G3). */
export function findBlockade(fen: string, color: Color): { blocker: Square; pawn: Square } | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const enemyPassers = findPassedPawns(fen, enemy);
  const enemyForward = enemy === 'w' ? 1 : -1;
  for (const pawn of enemyPassers) {
    const f = pawn.charCodeAt(0) - 97;
    const r = Number(pawn[1]) + enemyForward;
    if (r < 1 || r > 8) continue;
    const front = `${String.fromCharCode(97 + f)}${r}` as Square;
    const p = chess.get(front);
    if (p && p.color === color && (p.type === 'n' || p.type === 'b')) return { blocker: front, pawn };
  }
  return null;
}

/** A NAMED PAWN STRUCTURE + its standing plan — Naroditsky's closing lesson
 *  ("catalogue the typical structures from your openings and their plans"). This
 *  is the deterministic proxy for his "we've move-ordered into a French" teaching:
 *  the pawn SKELETON, not the move order, names the family. Recognises the few
 *  clearest, highest-frequency skeletons; returns null otherwise (empty > vague).
 *  Pure pawn geometry (G3). */
export function namedPawnStructure(
  fen: string,
  /** The student's seat — REQUIRED: "you hold the isolani" is seat-relative, and
   *  it used to be hardcoded to White (a Black student was told they held
   *  White's pawn). */
  studentColor: Color,
): { name: string; plan: string } | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const wp = new Set<string>(); const bp = new Set<string>();
  for (const row of chess.board()) for (const cell of row) {
    if (cell && cell.type === 'p') (cell.color === 'w' ? wp : bp).add(cell.square);
  }
  const w = (s: string): boolean => wp.has(s);
  const b = (s: string): boolean => bp.has(s);
  const fileCount = (set: Set<string>, file: string): number => [...set].filter((s) => s[0] === file).length;
  // FRENCH / ADVANCE CHAIN — White d4+e5 vs Black d5+e6, the locked chain.
  if (w('d4') && w('e5') && b('d5') && b('e6')) {
    // SEATED (hand walk 1600, Caro-Kann as Black: "Black hits d4 with …c5").
    return studentColor === 'w'
      ? { name: 'French-type pawn chain', plan: 'the break comes at the base of the chain — they hit d4 with …c5 and …f6; you defend the head on e5 and play on the kingside' }
      : { name: 'French-type pawn chain', plan: 'the break comes at the base of the chain — you hit d4 with …c5 and …f6; they defend the head on e5 and play on the kingside' };
  }
  // KING'S-INDIAN CLOSED CENTRE — White d5+e4 vs Black d6+e5.
  if (w('d5') && w('e4') && b('d6') && b('e5')) {
    return studentColor === 'w'
      ? { name: 'King’s-Indian closed centre', plan: 'the wings decide: they storm the kingside with …f5-f4 and a pawn avalanche; you break on the queenside with c5' }
      : { name: 'King’s-Indian closed centre', plan: 'the wings decide: you storm the kingside with …f5-f4 and a pawn avalanche; they break on the queenside with c5' };
  }
  // ISOLATED QUEEN’S PAWN — a d-pawn with no friendly c- or e-pawns.
  const holder = (white: boolean): string => ((white ? 'w' : 'b') === studentColor ? 'You hold' : 'They hold');
  for (const [set, white] of [[wp, true], [bp, false]] as const) {
    const dRank = [...set].find((s) => s[0] === 'd');
    // A true isolani: no friendly c/e-pawn, and no enemy d-pawn on the file.
    const enemy = white ? bp : wp;
    if (dRank && fileCount(set, 'c') === 0 && fileCount(set, 'e') === 0 && fileCount(enemy, 'd') === 0) {
      return { name: `${holder(white)} the isolated queen’s pawn`, plan: 'the isolani gives active pieces and the d5/d4 outpost now, but becomes a target in the endgame — the owner attacks, the blockader trades down' };
    }
  }
  // HANGING PAWNS — c- and d-pawns abreast on the 4th/5th with no b/e neighbours.
  if (w('c4') && w('d4') && fileCount(wp, 'b') === 0 && fileCount(wp, 'e') === 0) {
    return studentColor === 'w'
      ? { name: 'You have the hanging pawns', plan: 'they grip the centre and can lunge with d5 or c5 — but if they’re fixed and blockaded they turn into two weaknesses' }
      : { name: 'They have the hanging pawns', plan: 'they grip the centre and threaten a d5 or c5 lunge — provoke and blockade them to make them targets' };
  }
  if (b('c5') && b('d5') && fileCount(bp, 'b') === 0 && fileCount(bp, 'e') === 0) {
    return studentColor === 'w'
      ? { name: 'They have the hanging pawns', plan: 'they grip the centre and threaten a …d4 or …c4 lunge — provoke and blockade them to make them targets' }
      : { name: 'You have the hanging pawns', plan: 'they grip the centre and can lunge with …d4 or …c4 — but if they’re fixed and blockaded they turn into two weaknesses' };
  }
  return null;
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
/** WHY a good piece is good, as a clause after "is your/their best-placed
 *  piece" — ONE wording per reason, shared by every computer that reads
 *  `findPieceQuality` (hand walk 2026-09-24: "rook on f1 — rook on a semi-open
 *  file" was a label glued on with a dash, in two computers). */
export function goodPieceClause(reason: string, square: string): string {
  const file = square[0];
  const said: Record<string, string> = {
    'knight outpost': 'it sits on an outpost no pawn can kick',
    'rook on the open file': `it owns the open ${file}-file`,
    'rook on a semi-open file': `it has the half-open ${file}-file`,
    'rook on the seventh rank': 'it has reached the seventh rank',
  };
  return said[reason] ?? reason;
}

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
      // No neighbour at all is ISOLATED, never backward — backward means the
      // neighbours ADVANCED and left it behind (hand walk 2026-09-24: the lone
      // e5-pawn after 13.fxe5 was called "your backward pawn on e5").
      if (!hasNeighbor) continue;
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
  // PIN/LEGALITY-AWARE verdict (2026-09-13 sweep follow-up). `attackers` /
  // `defenders` are GEOMETRIC counts (chess.attackers), so a PINNED attacker is
  // counted though it can't legally capture, and a piece defended only by a
  // pinned piece looks defended though it hangs. The old `attackers > defenders`
  // fallthrough declared 'winnable' off the raw count, so the coach said
  // "you're pressuring the bishop on f6" when the only attacker was pinned. The
  // 'winnable' verdict is now decided ONLY by whether the enemy can win material
  // with a REAL, legal capture — `capturesWinMaterial` (pin-aware SEE), which
  // also catches the pin-masked hang the count misses. The geometric counts are
  // still reported as informational tension data; they no longer drive the claim.
  const enemyWinsMaterial = capturesWinMaterial(fen, square, enemy);
  let verdict: PressureVerdict = 'none';
  if (enemyWinsMaterial) verdict = 'winnable';
  else if (attackers === 0) verdict = 'none';
  else if (attackers === defenders) verdict = 'balanced-tension';
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

/** KING ACTIVATION — the endgame's first idea (David 2026-08-23). Fires only
 *  when the student's king is still PASSIVE (on its back two ranks) AND has a
 *  legal step toward the centre that is SAFE (the destination isn't attacked).
 *  A king that is already active, or that can only advance into danger, gets no
 *  "march it up" — that would be the platitude the endgame version of geometry.
 *  Returns the best central step. */
export function kingActivation(fen: string, color: Color): { to: Square } | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  let king: Square | null = null;
  for (const row of chess.board()) for (const cell of row) {
    if (cell && cell.type === 'k' && cell.color === color) king = cell.square;
  }
  if (!king) return null;
  const kr = Number(king[1]);
  const passive = color === 'w' ? kr <= 2 : kr >= 7;
  if (!passive) return null;
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const centreDist = (s: Square): number => Math.abs((s.charCodeAt(0) - 97) - 3.5) + Math.abs(Number(s[1]) - 4.5);
  let best: Square | null = null;
  let bestDist = centreDist(king);
  try {
    const c = new Chess(forceTurn(fen, color));
    for (const m of c.moves({ verbose: true })) {
      if (m.piece !== 'k') continue;
      const d = centreDist(m.to);
      if (d >= bestDist) continue;
      const probe = new Chess(forceTurn(fen, color));
      probe.move({ from: m.from, to: m.to });
      if (probe.attackers(m.to, enemy).length === 0) { best = m.to; bestDist = d; }
    }
  } catch { return null; }
  return best ? { to: best } : null;
}

/** ROOK BEHIND THE PASSED PAWN — the Tarrasch rule (David 2026-08-23). Fires
 *  when there is a passed pawn (yours or theirs) and the student has a rook that
 *  can get onto its file BEHIND it (the rear = lower ranks for a white pawn,
 *  higher for a black one) and is not already there. No passer, or no rook that
 *  can reach the rear file, → silent. */
export function rookBehindPasser(fen: string, color: Color): { rook: Square; pawn: Square; own: boolean } | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const rooks: Square[] = [];
  for (const row of chess.board()) for (const cell of row) {
    if (cell && cell.type === 'r' && cell.color === color) rooks.push(cell.square);
  }
  if (rooks.length === 0) return null;
  const reach = (pawn: Square, pawnIsWhite: boolean): Square | null => {
    const file = pawn[0];
    const pr = Number(pawn[1]);
    const behindRank = (r: number): boolean => (pawnIsWhite ? r < pr : r > pr);
    // already correctly placed → nothing to say.
    for (const r of rooks) if (r[0] === file && behindRank(Number(r[1]))) return null;
    try {
      const c = new Chess(forceTurn(fen, color));
      for (const m of c.moves({ verbose: true })) {
        if (m.piece !== 'r' || m.to[0] !== file) continue;
        if (behindRank(Number(m.to[1]))) return m.from;
      }
    } catch { return null; }
    return null;
  };
  for (const p of findPassedPawns(fen, color)) {
    const rk = reach(p, color === 'w');
    if (rk) return { rook: rk, pawn: p, own: true };
  }
  for (const p of findPassedPawns(fen, enemy)) {
    const rk = reach(p, enemy === 'w');
    if (rk) return { rook: rk, pawn: p, own: false };
  }
  return null;
}

/** THE OPPOSITION — a king-and-pawn ending read (David 2026-08-23). Fires only
 *  in a pure pawn ending (kings + pawns) when the kings stand in DIRECT
 *  opposition (same file or rank, one empty square between). The side NOT to
 *  move HOLDS the opposition — that is the whole point, so `holds` is true when
 *  it is the opponent's move. Distant opposition is left out on purpose (it
 *  needs deeper reckoning than a one-line read should claim). */
export function oppositionRead(fen: string, color: Color): { holds: boolean } | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  let wk: Square | null = null;
  let bk: Square | null = null;
  for (const row of chess.board()) for (const cell of row) {
    if (!cell) continue;
    if (cell.type !== 'k' && cell.type !== 'p') return null; // not a pure pawn ending
    if (cell.type === 'k') { if (cell.color === 'w') wk = cell.square; else bk = cell.square; }
  }
  if (!wk || !bk) return null;
  const wf = wk.charCodeAt(0) - 97; const wr = Number(wk[1]);
  const bf = bk.charCodeAt(0) - 97; const br = Number(bk[1]);
  const directFile = wf === bf && Math.abs(wr - br) === 2;
  const directRank = wr === br && Math.abs(wf - bf) === 2;
  if (!directFile && !directRank) return null;
  return { holds: chess.turn() !== color };
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
  /** For a capture, the STUDENT's piece that would be taken on `target` —
   *  read off the board, so a consumer names "your knight on e4" and never
   *  "the piece on e4" (WO-STANDARD-01 D-7: prod said "it would win the
   *  piece on e4" about a pawn). Null for a fork (the landing square holds
   *  nothing of the student's). */
  targetPiece: PieceSymbol | null;
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
    // Opponent is to move here — legal SEE so a pinned student defender can't
    // mask a real win and a pinned opponent attacker can't invent one.
    const gain = legalSeeGain(chess.fen(), mv.to);
    if (gain <= 0) continue;
    // Name it with the least-valuable attacker's capture (the move actually played).
    const caps = chess.moves({ verbose: true }).filter((m) => m.to === mv.to && m.captured);
    caps.sort((a, b) => (PIECE_VALUE[a.piece] ?? 0) - (PIECE_VALUE[b.piece] ?? 0));
    consider({ san: caps[0].san, gain, kind: 'capture', target: mv.to, targetPiece: mv.captured ?? null });
  }
  for (const mv of chess.moves({ verbose: true })) {
    // Fork: after the move the moved piece attacks ≥2 student pieces worth ≥3.
    if (mv.piece === 'n' || mv.piece === 'q' || mv.piece === 'b' || mv.piece === 'r' || mv.piece === 'p') {
      let after: Chess;
      try { after = new Chess(chess.fen()); after.move(mv); } catch { continue; }
      // The forking piece must LAND SAFELY — if the student just wins it back
      // (the student, to move in `after`, has a legal winning capture on the
      // landing square), it is no fork, only a losing check/capture (the
      // "Bxf2+ that just drops the bishop" false-positive). Pin-aware so a
      // pinned student recapturer can't be counted (2026-09-13 sweep).
      if (!landingIsSafe(after.fen(), mv.to)) continue;
      const hitFen = after.fen().split(' '); hitFen[1] = opp; // keep opp as attacker to read attacks
      let probe: Chess;
      try { probe = new Chess(hitFen.join(' ')); } catch { continue; }
      let valuableHits = 0;
      for (const row of probe.board()) for (const cell of row) {
        if (!cell || cell.color === opp) continue;
        if (PIECE_VALUE[cell.type] < 3) continue;
        // The hit piece must be UNDEFENDED or worth more than the forker —
        // a defended equal piece is not actually won.
        const forkerVal = PIECE_VALUE[mv.piece];
        const defended = probe.attackers(cell.square, student).length > 0;
        if (defended && PIECE_VALUE[cell.type] <= forkerVal) continue;
        if (probe.attackers(cell.square, opp).includes(mv.to)) valuableHits += 1;
      }
      if (valuableHits >= 2) consider({ san: mv.san, gain: 0, kind: 'fork', target: mv.to, targetPiece: null });
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
    const see = legalSeeGain(fen, to); // material the side to move wins on that square (pin-aware)
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
    lines.push('  MATERIAL AT RISK (SEE — a forced capture sequence wins material here; the piece may be DEFENDED yet still lose to a cheaper attacker — say "loses material on the swap-off" and give the points below, NOT "undefended", and never "the exchange" unless a rook is traded for a minor piece):');
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
    const r = opts.rating ?? DEFAULT_STUDENT_RATING;
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
  outpost: 'Is there a square for a knight that none of their pawns can attack?',
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

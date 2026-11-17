import { inBetweenMove } from './inBetweenMove';
import { Chess, type Square, type Color, type PieceSymbol } from 'chess.js';
import type { CoachGameMove, MissedTactic, TacticType } from '../types';
import type { TacticPatternType } from '../types/tacticTypes';
import { capEval } from './accuracyService';
import { conceptForLine } from './conceptEngine';
import { computePlyFacts, afterCapture, NO_PREV_CAPTURE, type PrevCaptureContext } from './pvPlayback';
import { MATERIAL_VALUE } from './pieceValues';
import { classifyPosition } from './tacticClassifier';
import { toTacticType } from './tacticVocabulary';
import { geometryMotif } from './tacticGeometry';

/** Minimum centipawn swing to qualify as a missed tactic */
const MIN_EVAL_SWING = 100;

/** Maximum number of missed tactics to return */
const MAX_TACTICS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────




// ─── Tactic Detectors ─────────────────────────────────────────────────────────





// ─── Main Classifier ──────────────────────────────────────────────────────────

/**
 * Detect what type of tactic the best move represents by analyzing the resulting position.
 * Returns the most specific tactic type found, with priority ordering.
 */
// ─── ONE classifier (P4b, 2026-09-15) ────────────────────────────────────────
//
// `detectTacticType` used to be a SECOND, ungated one-ply tactic classifier
// (priority-ordered geometry, no reality gate: a check plus one attacked piece
// read as a "fork"; a fork on two DEFENDED pieces still counted; a smothered
// mate was a "fork"). It tagged every mistake puzzle, the classifiedTactics
// store, the tactical profile, the drill queues, the live Play alerts and the
// "found tactics" analytics — while the coach TAUGHT the concept from
// `conceptEngine` (reality-gated, walks the line). The same board could be a
// "pin" in the student's weakness bucket and a "fork" in the coach's mouth
// (CLAUDE.md 2026-09-08: the silent-mismatch class). David 2026-09-15: "one
// coach system, not 5".
//
// Now there is ONE classifier. The analysis vocabulary (`TacticType`) is a
// PROJECTION of the engine's answer through the canonical bridge
// (`tacticVocabulary.toTacticType`), tiered so the tail can never contradict
// the engine:
//   0. MECHANICS — a board-certain fact of the move itself: promotion.
//   1. ENGINE — `conceptForLine` over [best, ...pv], the same walker that
//      teaches the concept on every surface. A landed tactic → its TacticType;
//      a delivered mate → 'back_rank' when the pattern is the back-rank mate,
//      else 'checkmate'.
//   2. MECHANICS — capture of an undefended piece → 'hanging_piece'.
//   3. 'tactical_sequence' — the honest "no named motif" sentinel.
//
// The old geometry is NOT a tail. The build first kept it for `clearance` /
// `x_ray` (the two motifs the engine has no detector for), but the moment it
// stopped being shadowed by its own priority chain, `detectClearance` fired on
// Rd8+ — a rook simply hanging on a defended square — and `detectXRay` is the
// static "slider behind a friendly piece" shape tacticsDetector had already
// rejected as ambiguous. Empty > generic > invented: those two motifs went
// theme-only (Lichess puzzle tags), and the old geometry was deleted (WO-TIE-01,
// 2026-11-17: it had no product caller — G8.5). Both came back on the
// LINE, never the static shape: clearance from `tacticGeometry` (2026-10-08),
// and the x-ray as the recapture through the screening piece
// (`xRayRecaptureWins`, WO-MOTIFS-01 M3, 2026-10-22).

/** 'geometry' — the line tactics the engine walker has no detector for, read
 *  off the same line by the computer that teaches them (`tacticGeometry`). */
type TacticTypeAuthority = 'mechanics' | 'engine' | 'geometry' | 'theme-only' | 'sentinel';

/** WHO decides each TacticType. Keyed by the FULL union, so a new member fails
 *  to compile until it is given an authority. 'theme-only' members are never
 *  produced by any classifier — they enter only through Lichess puzzle themes
 *  (`LICHESS_THEME_TO_TACTIC`). */
export const TACTIC_TYPE_AUTHORITY: Record<TacticType, TacticTypeAuthority> = {
  promotion: 'mechanics',
  hanging_piece: 'mechanics',
  fork: 'engine',
  pin: 'engine',
  skewer: 'engine',
  discovered_attack: 'engine',
  // Board-certain: a check from an unmasked piece, and the material the line
  // collects in the next three plies (`discoveredCheckWins`).
  discovered_check: 'mechanics',
  back_rank: 'engine',
  double_check: 'engine',
  removing_the_guard: 'engine',
  overloaded_piece: 'engine',
  trapped_piece: 'engine',
  checkmate: 'engine',
  clearance: 'geometry',
  // Board-certain: the recapture through the piece that screened the line.
  x_ray: 'mechanics',
  deflection: 'geometry',
  interference: 'geometry',
  zwischenzug: 'geometry',
  tactical_sequence: 'sentinel',
};

/** `mating-patterns.json` id the engine gives a back-rank mate — the one
 *  delivered mate that already has its own analysis motif. */
const BACK_RANK_MATE_ID = 'back-rank-mate';

/** Does this move deliver a back-rank check (the engine's own move-based
 *  detector, `tacticClassifier.detectBackRank`)? */
function isBackRankPly(before: Chess, uci: string): boolean {
  try {
    const c = new Chess(before.fen());
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
    return classifyPosition(before.fen(), c.fen(), mv.san, 0, 0).tactics.some((t) => t.type === 'back_rank');
  } catch { return false; }
}

/**
 * Classify the tactic a move (or the line it starts) delivers — the ONE
 * classifier behind every `TacticType` the app persists or speaks.
 *
 * @param fen         Position BEFORE the move (mover = side to move).
 * @param bestMoveUci The move to classify (UCI).
 * @param pvUci       Optional continuation starting WITH `bestMoveUci` (a
 *                    puzzle's solution / the engine PV). When present the
 *                    engine walks the whole line, so a mate or tactic that
 *                    lands two plies later is still the move's motif.
 */
export function detectTacticType(
  fen: string,
  bestMoveUci: string,
  pvUci?: readonly string[],
  /** The opponent's move that reached `fen`, when the caller has the game. */
  previous?: { fenBefore: string; san: string },
): TacticType {
  return nameLine(fen, bestMoveUci, pvUci, previous).type;
}

/** A line's motifs: its NAME (what the record has always filed it under) and
 *  the SET-UP it opens with when that is not the name. */
export interface TacticLine {
  tacticType: TacticType;
  /** The deflection (or decoy) or interference the line opens with, when the
   *  line LANDS something else (a fork, a mate) — null otherwise. */
  setup: TacticType | null;
}

/**
 * COUNT BOTH (David 2026-10-22, WO-MOTIFS-01 M3d). A line that opens with a
 * set-up and lands something else — …Rxd8+ pulls the queen off its guard and
 * Nf7+ forks — keeps its name (the fork) and the set-up is counted beside it:
 * the student had to see both. The set-up is read off the SAME line by the
 * reads that teach it (`geometryMotif`: deflection and decoy, interference),
 * only on a line the engine or the first landed tactic named (a line the
 * set-up itself names has no second motif). NOT the in-between move: on the
 * 1,276 deflection puzzles `inBetweenMove` read 200+ plain mates in two (f7,
 * then Rf8#) as one, so it stays a reader of last resort (step 1c). NOT the
 * clearance either (`SETUP_TACTICS`).
 */
export function detectTacticLine(
  fen: string,
  bestMoveUci: string,
  pvUci?: readonly string[],
  previous?: { fenBefore: string; san: string },
): TacticLine {
  const { type, landed } = nameLine(fen, bestMoveUci, pvUci, previous);
  if (!landed || !pvUci || pvUci.length < 3 || pvUci[0] !== bestMoveUci) return { tacticType: type, setup: null };
  let setup: TacticType | null = null;
  // Without the move before: their in-between move is a different question.
  try { setup = geometryMotif(fen, pvUci); } catch { setup = null; }
  return { tacticType: type, setup: setup && SETUP_TACTICS.has(setup) && setup !== type ? setup : null };
}

/** The set-ups counted beside a line's name, by what the 15,000-puzzle measure
 *  proved (WO-MOTIFS-01 M3d, 2026-10-22): the deflection read agreed with the
 *  puzzle's own themes on half its set-ups at 0.7% false alarms; the clearance
 *  read agreed on 4 of 65 — it fires on a piece that simply moves with check
 *  — so it names a line only when nothing else does (step 1b). */
const SETUP_TACTICS: ReadonlySet<TacticType> = new Set<TacticType>(['deflection', 'interference']);

/** The classifier: the line's name, and whether a tactic the line LANDS named
 *  it (steps 1 and 1a — where a set-up can come first). */
function nameLine(
  fen: string,
  bestMoveUci: string,
  pvUci?: readonly string[],
  previous?: { fenBefore: string; san: string },
): { type: TacticType; landed: boolean } {
  const named = (type: TacticType): { type: TacticType; landed: boolean } => ({ type, landed: false });
  const landed = (type: TacticType): { type: TacticType; landed: boolean } => ({ type, landed: true });
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return named('tactical_sequence'); }
  if (bestMoveUci.length < 4) return named('tactical_sequence');
  const from = bestMoveUci.slice(0, 2) as Square;
  const to = bestMoveUci.slice(2, 4) as Square;
  const moving = chess.get(from);
  if (!moving) return named('tactical_sequence');

  // 0. Promotion — certain from the move itself.
  if (bestMoveUci.length > 4 || (moving.type === 'p' && (to[1] === '8' || to[1] === '1'))) {
    return named('promotion');
  }

  // 1. The engine — the same walker the coach teaches from. A mate the line
  // delivers (or threatens) names it; any other tactic the walker names is
  // the one on the line's biggest-gain move, kept as the fallback for 1a.
  const line = pvUci && pvUci.length > 0 && pvUci[0] === bestMoveUci ? [...pvUci] : [bestMoveUci];
  let walkerTactic: TacticType | null = null;
  try {
    for (const c of conceptForLine({ fen, uci: line, studentColor: chess.turn(), max: 4, sources: ['tactic', 'mate'] })) {
      if (c.source === 'mate') return landed(c.id === BACK_RANK_MATE_ID ? 'back_rank' : 'checkmate');
      if (c.source === 'tactic' && walkerTactic === null) {
        // A forced mate THREATENED along the line keeps its back-rank
        // specificity when the threat IS the back rank (Qa8+ Rc8 Qxc8#) — the
        // "Missed back-rank tactics" bucket + drill pool are the more
        // teachable home than the generic "Missed checkmates".
        if (c.id === 'mate_threat' && isBackRankPly(chess, bestMoveUci)) return landed('back_rank');
        const t = toTacticType(c.id as TacticPatternType);
        if (t === 'checkmate') return landed(t);
        if (t) walkerTactic = t;
      }
    }
  } catch { /* an unwalkable line teaches nothing — fall through */ }

  // 1a. THE MOVE THEY HAD TO SEE. The first tactic the mover's own moves land
  // names the line — not the one on its biggest-gain move. Qxc3+ forks the
  // king and the a1 rook; Kf1 Qxa1+ then also skewers the h1 rook, and the
  // walker named the line a skewer. Bxh2+ Kxh2 Qxd4 has its gain on a plain
  // capture, and the walker named nothing at all (WO-MOTIFS-01 M4).
  const first = firstLandedTactic(fen, line);
  if (first) return landed(first);
  if (walkerTactic) return landed(walkerTactic);

  // 1b. THE LINE TACTICS the walker has no detector for — deflection (and the
  // decoy, its analysis home), interference, clearance — read off the SAME
  // line by the computer that teaches them (tacticGeometry, dual-use), so a
  // missed one reaches the record instead of the sentinel. Only on a real line
  // (the reads need the reply and the follow-up), never on a lone move.
  if (pvUci && pvUci.length >= 3 && pvUci[0] === bestMoveUci) {
    const g = geometryMotif(fen, pvUci, previous);
    if (g) return named(g);
  }

  // 1c. THE IN-BETWEEN MOVE (A-plan P7): the best move is a forcing move
  // played INSTEAD of a capture that is still there later in the line — the
  // same detector Learn teaches it from ("not yet — first this").
  if (pvUci && pvUci.length >= 3 && pvUci[0] === bestMoveUci && inBetweenMove(fen, pvUci, 'best')) return named('zwischenzug');


  // 2. A capture of a piece that had no defender — board-certain.
  const victim = chess.get(to);
  if (victim && victim.color !== moving.color && chess.attackers(to, victim.color).length === 0) {
    return named('hanging_piece');
  }

  // 2a. THE PINNED DEFENDER: the capture takes a piece that IS defended, but
  // no defender can legally take back — not because of a check, because each
  // is pinned to its king (Qxh3 with g2 pinned by the rook on g5). Lichess
  // tags these "pin"; the record filed them as an unnamed shot (M4).
  if (victim && victim.color !== moving.color && pinnedDefendersOnly(fen, bestMoveUci, to)) return named('pin');

  // 2b. THE RUN: the best move pushes a pawn, and that same pawn queens later
  // in the line (h4 … h5 … h8=Q). Step 0 sees only a promotion on the move
  // itself, so a run filed as an unnamed shot: 7.5% of the Lichess promotion
  // puzzles were named a promotion (WO-MOTIFS-01 M4).
  if (moving.type === 'p' && pvUci && pvUci[0] === bestMoveUci && runsToPromotion(fen, pvUci)) {
    return named('promotion');
  }

  // 3. Nothing named — the honest sentinel.
  return named('tactical_sequence');
}

/** Is the piece on `to` defended only by pieces that cannot legally take back
 *  — pinned to their king (the board after the capture is not in check, so a
 *  defender with no legal recapture is held by a pin)? */
function pinnedDefendersOnly(fen: string, uci: string, to: Square): boolean {
  let before: Chess;
  try { before = new Chess(fen); } catch { return false; }
  const victim = before.get(to);
  if (!victim) return false;
  const defenders = before.attackers(to, victim.color).filter((sq) => before.get(sq)?.type !== 'k');
  if (defenders.length === 0) return false;
  const after = new Chess(fen);
  try { after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined }); } catch { return false; }
  if (after.inCheck()) return false;
  return !after.moves({ verbose: true }).some((m) => m.to === to);
}

/** The first tactic one of the mover's moves LANDS along the line (the same
 *  board-true read the walker uses per ply), or null. */
function firstLandedTactic(fen: string, line: readonly string[]): TacticType | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const mover = c.turn();
  let prev: PrevCaptureContext = NO_PREV_CAPTURE;
  for (let i = 0; i < line.length; i++) {
    const u = line[i];
    const before = c.fen();
    let mv;
    try { mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined }); } catch { return null; }
    if (mv.color === mover) {
      const landed = computePlyFacts(before, c.fen(), { captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion }, prev).tacticLanded;
      const t = landed ? toTacticType(landed as TacticPatternType) : null;
      if (t) return t;
      if (discoveredCheckWins(c, mv, line.slice(i + 1))) return 'discovered_check';
      if (xRayRecaptureWins(c, mv, line.slice(i + 1))) return 'x_ray';
    }
    prev = afterCapture(prev, mv);
  }
  return null;
}

/** What a discovered check must win over its next three plies (the check, their
 *  answer, your capture, their recapture): more than a pawn — the exchange, a
 *  minor, a queen. A pawn swept up with check is a check, not a tactic. */
const DISCOVERED_CHECK_GAIN = 2;

/**
 * A DISCOVERED CHECK THAT WINS (WO-MOTIFS-01 M3): the move just played (`mv`,
 * on `after`) checks with a piece it UNMASKED — the moved piece is not a
 * checker (a plain check) and is not one of two (a double check, its own
 * motif) — and the line from here nets the mover at least
 * `DISCOVERED_CHECK_GAIN`. Read on the same line the classifier walks, so a
 * discovered check that lands later in the line (Nf6+ Kh8 Nxd7, the bishop
 * behind checking) is found where it lands.
 */
function discoveredCheckWins(after: Chess, mv: { color: Color; to: string; captured?: PieceSymbol; flags: string }, rest: readonly string[]): boolean {
  if (!after.inCheck() || /[kq]/.test(mv.flags)) return false;
  const foe = after.turn();
  let king: Square | null = null;
  for (const row of after.board()) for (const p of row) if (p && p.type === 'k' && p.color === foe) king = p.square;
  if (!king) return false;
  const checkers = after.attackers(king, mv.color);
  if (checkers.length !== 1 || checkers[0] === mv.to) return false;
  let net = mv.captured ? MATERIAL_VALUE[mv.captured] ?? 0 : 0;
  const c = new Chess(after.fen());
  for (const u of rest.slice(0, 3)) {
    let r;
    try { r = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined }); } catch { break; }
    const v = r.captured ? MATERIAL_VALUE[r.captured] ?? 0 : 0;
    net += r.color === mv.color ? v : -v;
  }
  return net >= DISCOVERED_CHECK_GAIN;
}

/**
 * THE X-RAY (WO-MOTIFS-01 M3): your piece lands on a square (a capture, or a
 * sacrifice: Re7+), they take it with a piece that was STANDING ON YOUR LINE
 * to that square, and your line piece takes back through where it stood — it
 * attacked the square through their piece all along (Rxe1 Qxe1 Qxe1, the g3
 * queen behind the f2 queen). Real
 * only if the sequence, with their next recapture on that square, nets at
 * least `DISCOVERED_CHECK_GAIN`: an even trade on a lined-up file is a trade.
 */
function xRayRecaptureWins(after: Chess, mv: { color: Color; to: string; captured?: PieceSymbol }, rest: readonly string[]): boolean {
  if (rest.length < 2) return false;
  const c = new Chess(after.fen());
  const play = (u: string): ReturnType<Chess['move']> | null => { try { return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined }); } catch { return null; } };
  const back = play(rest[0]);
  if (!back || back.to !== mv.to || !back.captured) return false;
  const through = play(rest[1]);
  if (!through || through.to !== mv.to || !through.captured || !'brq'.includes(through.piece)) return false;
  // Their recapturer stood strictly between your line piece and the square.
  const [fx, fy] = [back.from.charCodeAt(0), Number(back.from[1])];
  const [qx, qy] = [through.from.charCodeAt(0), Number(through.from[1])];
  const [sx, sy] = [mv.to.charCodeAt(0), Number(mv.to[1])];
  const dx = Math.sign(sx - qx);
  const dy = Math.sign(sy - qy);
  const steps = Math.max(Math.abs(sx - qx), Math.abs(sy - qy));
  let between = false;
  for (let k = 1; k < steps; k++) if (qx + dx * k === fx && qy + dy * k === fy) between = true;
  if (!between) return false;
  const val = (p: PieceSymbol | undefined): number => (p ? MATERIAL_VALUE[p] ?? 0 : 0);
  let net = val(mv.captured) - val(back.captured) + val(through.captured);
  const again = rest[2] ? play(rest[2]) : null;
  if (again && again.to === mv.to && again.captured) net -= val(again.captured);
  return net >= DISCOVERED_CHECK_GAIN;
}

/** Does the pawn the line's first move pushes go on to promote in that line?
 *  Followed by its square, so a capture on the way (exd7, dxc8=Q) still counts. */
function runsToPromotion(fen: string, line: readonly string[]): boolean {
  let c: Chess;
  try { c = new Chess(fen); } catch { return false; }
  const mover = c.turn();
  let at: string | null = null;
  for (const u of line) {
    let mv;
    try { mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined }); } catch { return false; }
    if (mv.color !== mover) {
      if (at && mv.to === at) return false;   // the pawn was taken
      continue;
    }
    if (at === null) { at = mv.to; continue; }
    if (mv.from === at) {
      if (mv.promotion) return true;
      at = mv.to;
    }
  }
  return false;
}


// ─── Explanation Generator ────────────────────────────────────────────────────

/**
 * Generate a human-readable explanation of the missed tactic.
 */
function generateExplanation(tacticType: TacticType, bestMove: string, evalSwing: number): string {
  const swingPawns = (evalSwing / 100).toFixed(1);
  const descriptions: Record<TacticType, string> = {
    fork: `You missed a fork with ${bestMove}! This would have attacked multiple pieces simultaneously (${swingPawns} pawn advantage).`,
    pin: `You missed a pin with ${bestMove}! A piece is stuck defending something more valuable behind it (${swingPawns} pawn advantage).`,
    skewer: `You missed a skewer with ${bestMove}! The attack goes through a valuable piece to hit another behind it (${swingPawns} pawn advantage).`,
    discovered_attack: `You missed a discovered attack with ${bestMove} — moving this piece reveals an attack from behind (${swingPawns} pawn advantage).`,
    discovered_check: `You missed a discovered check with ${bestMove} — moving this piece uncovers a check, so it is free to win material (${swingPawns} pawn advantage).`,
    back_rank: `You missed a back rank threat with ${bestMove}! The opponent's king was vulnerable on the back rank (${swingPawns} pawn advantage).`,
    hanging_piece: `You missed capturing a hanging piece with ${bestMove} (${swingPawns} pawn advantage).`,
    promotion: `You missed a pawn promotion with ${bestMove} (${swingPawns} pawn advantage).`,
    deflection: `You missed a deflection with ${bestMove}! This forces a key defender away from its post (${swingPawns} pawn advantage).`,
    overloaded_piece: `You missed exploiting an overloaded piece with ${bestMove}! A defender was responsible for too many duties (${swingPawns} pawn advantage).`,
    trapped_piece: `You missed trapping a piece with ${bestMove}! The opponent had a piece with no safe squares (${swingPawns} pawn advantage).`,
    clearance: `You missed a clearance sacrifice with ${bestMove}! Moving this piece opens a powerful line for another (${swingPawns} pawn advantage).`,
    interference: `You missed an interference tactic with ${bestMove}! This disrupts the coordination between enemy pieces (${swingPawns} pawn advantage).`,
    zwischenzug: `You missed a zwischenzug (in-between move) with ${bestMove}! This unexpected intermediate move changes the dynamics (${swingPawns} pawn advantage).`,
    x_ray: `You missed an x-ray attack with ${bestMove}! The attack goes through one piece to target another (${swingPawns} pawn advantage).`,
    double_check: `You missed a double check with ${bestMove}! Two pieces deliver check simultaneously — the king MUST move (${swingPawns} pawn advantage).`,
    removing_the_guard: `You missed removing the guard with ${bestMove}! Capturing that defender leaves another piece unprotected (${swingPawns} pawn advantage).`,
    checkmate: `You missed a forced checkmate starting with ${bestMove} (${swingPawns} pawn advantage).`,
    tactical_sequence: `You missed the tactical sequence starting with ${bestMove} (${swingPawns} pawn advantage).`,
  };

  return descriptions[tacticType];
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Detect missed tactics from a completed game's move list.
 *
 * Scans the player's moves for mistakes/blunders where Stockfish found a significantly
 * better move, then analyzes the best move to identify the tactic pattern.
 */
export function detectMissedTactics(
  moves: CoachGameMove[],
  playerColor: 'white' | 'black',
): MissedTactic[] {
  const tactics: MissedTactic[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];

    // Only analyze player's moves (not coach's)
    if (move.isCoachMove) continue;

    // Filter by player color: odd moveNumber = white, even = black
    const isWhiteMove = move.moveNumber % 2 === 1;
    if ((playerColor === 'white' && !isWhiteMove) || (playerColor === 'black' && isWhiteMove)) {
      continue;
    }

    // Must be a mistake or blunder with a known best move
    const cls = move.classification;
    if (cls !== 'mistake' && cls !== 'blunder') continue;
    if (!move.bestMove || move.bestMoveEval === null || move.evaluation === null) continue;

    // Calculate eval swing — cap each eval first so a mate score (±30000)
    // doesn't inflate the swing (and the avg-cost-per-miss) into nonsense like
    // "30000 cp" (David 2026-09-07). capEval saturates mate at ±1500.
    const evalSwing = Math.abs(capEval(move.bestMoveEval) - capEval(move.evaluation));
    if (evalSwing < MIN_EVAL_SWING) continue;

    // Get the FEN from the previous move (the position before this move was played)
    const preFen = i > 0 ? moves[i - 1].fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    // Detect what type of tactic was missed
    const tacticType = detectTacticType(preFen, move.bestMove);
    const explanation = generateExplanation(tacticType, move.bestMove, evalSwing);

    tactics.push({
      moveIndex: i,
      playerMoved: move.san,
      bestMove: move.bestMove,
      fen: preFen,
      evalSwing,
      tacticType,
      explanation,
    });
  }

  // Sort by eval swing descending and take top N
  tactics.sort((a, b) => b.evalSwing - a.evalSwing);
  return tactics.slice(0, MAX_TACTICS);
}

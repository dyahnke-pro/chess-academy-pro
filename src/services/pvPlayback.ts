/**
 * pvPlayback — compute the full winning/punishment LINE from a review
 * position, with rich per-ply fact bundles for narration (Phase 1 of the
 * Danya review build; David 2026-07-18: lines you can WATCH, not a text
 * list).
 *
 * G0/G3 by construction: the moves are the engine's PV (validated by
 * chess.js replay), the facts are board truth (chess.js + tacticsDetector +
 * boardStructure). The LLM never picks a move and never states a fact —
 * voiceFactsBatch (coachApi) phrases these bundles; `renderPlyFactLine` is
 * the deterministic fallback voice.
 *
 * R3 (PV soundness) is enforced here: the line is seeded from the STORED
 * best move when given (consistency with the shot question), and the
 * terminal position is re-analyzed — a line whose end collapses below the
 * root promise is truncated/refused (`delivers=false`): a line we can't
 * verify is a line we don't teach.
 */
import { fileList } from '../utils/andList';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';
import { detectTactics } from './tacticsDetector';
import { classifyPosition } from './tacticClassifier';
import { describeStructure } from './boardStructure';
import { legalSeeGain, legalSeeGainFor } from './positionReadingService';
import type { StockfishAnalysis } from '../types';
import { MATERIAL_VALUE } from './pieceValues';

/** Face values for the recapture-net calc (mirrors positionReadingService). */
// MATERIAL semantics (k: 0 — a king is never won). One home: `pieceValues.ts`.
// This was one of 53 private copies measured 2026-09-21; the CAPTURE table
// (k: 100) answers a different question and lives beside it there.
const PIECE_POINTS = MATERIAL_VALUE;

function pieceVal(t?: string): number {
  return t ? (PIECE_POINTS[t] ?? 0) : 0;
}

/** The ONE tactic-reality rule (David 2026-07-23): a target is worth naming
 *  only if the attacking piece can actually WIN it — it is worth more than the
 *  attacker, or it hangs. Shared by the board-landed scan and the move-based
 *  motifs in `computePlyFacts`. */
/** Every square strictly between `a` and `b` (same file, rank or diagonal) is
 *  empty — the line of sight a slider needs. False when they are not aligned. */
function rayClear(board: Chess, a: string, b: string): boolean {
  const fa = a.charCodeAt(0), ra = Number(a[1]), fb = b.charCodeAt(0), rb = Number(b[1]);
  const df = Math.sign(fb - fa), dr = Math.sign(rb - ra);
  if (!(df === 0 || dr === 0 || Math.abs(fb - fa) === Math.abs(rb - ra))) return false;
  let f = fa + df, r = ra + dr;
  while (f !== fb || r !== rb) {
    if (board.get(`${String.fromCharCode(f)}${r}` as Square)) return false;
    f += df; r += dr;
  }
  return true;
}

function winnableBy(board: Chess, sq: string, attackerVal: number): boolean {
  const p = board.get(sq as Square);
  if (!p) return false;
  // A king is never WON — the royal-fork rule credits the check separately
  // (one other winnable target suffices). Counting an uncovered king as an
  // "undefended target" let Rc8+ against a defended knight pass as a fork
  // (found 2026-09-15 building the one tactic classifier).
  if (p.type === 'k') return false;
  const undefended = board.attackers(sq as Square, p.color).length === 0;
  return pieceVal(p.type) > attackerVal || undefended;
}

/**
 * 🔴 A TACTIC WHOSE AGENT CAN SIMPLY BE CAPTURED IS NOT LANDING (found
 * 2026-09-21 by `reviewCorpusSweep`, red on `main`: three games narrated "lands
 * a fork" on a move that won nothing).
 *
 * The reality gate above asks whether the TARGETS are winnable and never asks
 * whether the AGENT survives. On `mg-lichess-8I2YuiTC` ply 72 the coach said
 * Qf4+ "lands a fork" — it forks bishop f6, queen h6 and the king, and the
 * royal rule accepted it on the one "winnable" target, the undefended h6 queen.
 * But that queen ATTACKS f4: White answers Qxf4 and the fork wins exactly
 * nothing. A forked piece that can take the forker was never forked.
 *
 * BOARD-TRUE BY LEGALITY, NOT GEOMETRY. `attackers()` reports the white king as
 * an attacker of f2 on ply 50 of the same game, where Kxf2 is ILLEGAL because
 * the queen is defended — a geometric test would have killed that GENUINE royal
 * fork. `board` has the defender to move, so its own legal move list is the
 * honest question.
 *
 * The capture only RESOLVES the tactic when it is not materially bad for them:
 * they gain the agent, and give back the capturer only if we can recapture. Net
 * >= 0 for them means the tactic bought nothing.
 *
 * SCOPED TO FORKS, DELIBERATELY. All three measured violations are forks, and
 * the fork branch is the permissive one — the royal rule accepts a SINGLE
 * winnable target, so an unsafe agent has nothing else holding it back. Skewer
 * and pin share the shape but no run has produced one, and extending it there
 * DID break a real classifier fixture: `tacticTypeUnification`'s skewer case
 * `r6k/8/8/8/q7/8/8/1R5K` plays Ra1 into Qxa1, so the rule fired and dropped the
 * tag. That fixture tests CLASSIFICATION, not soundness. Left for whoever has a
 * measurement, rather than silently overlooked.
 *
 * 🔒 IT LIVES INSIDE THE ONE COMPUTER (merged 2026-09-21). It landed as INLINE
 * logic in `computePlyFacts` at the same time this function was being extracted
 * out of that very block — two sessions fixing one disease from opposite ends.
 * Left inline it would have been invisible to `tacticWinsMaterial`'s other
 * callers and to the corpus sweep's scanner, which is exactly the drift the
 * extraction exists to end.
 */
function agentSurvives(
  board: Chess,
  tactic: { type: string; involvedSquares: readonly string[] },
  agent: string,
): boolean {
  if (tactic.type !== 'fork') return true;
  const attackerVal = pieceVal(board.get(agent as Square)?.type);
  const agentColor = board.get(agent as Square)?.color;
  const weDefendAgent = agentColor
    ? board.attackers(agent as Square, agentColor).length > 0
    : false;
  const answeredByCapture = board
    .moves({ verbose: true })
    .some((m) => m.to === agent
      && attackerVal - (weDefendAgent ? pieceVal(m.piece) : 0) >= 0);
  return !answeredByCapture;
}


/**
 * 🔒 DOES THIS TACTIC ACTUALLY WIN SOMETHING — ONE definition, one place.
 *
 * `detectTactics` reports a bare GEOMETRIC alignment even when every target is
 * defended and of equal-or-greater value, which wins nothing. This is the
 * reality bar on top of it, and it is EXPORTED because it had grown a second,
 * hand-written copy: `reviewCorpusSweep.test.ts` carried its own
 * `tacticIsMeaningful`, and the two silently drifted apart over two corrections
 * made here and not there —
 *
 *   • the ROYAL FORK rule (2026-09-14): one target being the KING makes one
 *     other winnable target enough, because the check forces the king to move
 *     and the other piece falls. Without it the textbook Nc7+ king-and-rook
 *     fork reads as a false alarm.
 *   • `winnableBy`'s king rule (2026-09-15): a king is never WON, so an
 *     uncovered king must not count as an "undefended target".
 *
 * The cost was exactly what the rot rule predicts: the sweep failed three REAL
 * royal forks (Re1+, Qxf2+, Qf4+ — every one a check) as "empty tactics",
 * blaming the product for a rule the scanner had not been told about. The
 * scanner had even half-migrated — it copied the royal carve-out on the SKEWER
 * branch and missed it on the fork.
 *
 * WHAT THE SCANNER KEEPS, and why sharing this is not a tautology: its
 * independence lies in re-deriving the tactic from `detectTactics(fenAfter)`
 * and checking the claimed motif against the square the mover landed on — which
 * is where the PROSE can lie. "What counts as a winning fork" is a product
 * judgement, and a second hand-copy of it never provided independence, only
 * drift.
 *
 * `agentSquare` defaults to the detector's own agent (it puts that square
 * FIRST). Victim-first motifs (`trapped_piece`, `overload`) name the opponent's
 * piece first and pass the mover's landing square explicitly.
 */
export function tacticWinsMaterial(
  board: Chess,
  tactic: { type: string; involvedSquares: readonly string[] },
  agentSquare?: string | null,
): boolean {
  const agent = agentSquare ?? tactic.involvedSquares[0];
  const attackerVal = pieceVal(board.get(agent as Square)?.type);
  const winnable = (sq: string): boolean => winnableBy(board, sq, attackerVal);
  if (tactic.type === 'fork') {
    // A fork wins because the defender cannot save BOTH — so it needs TWO
    // winnable targets, unless one of them is the king (see above).
    const targets = tactic.involvedSquares.slice(1);
    const royal = targets.some((sq) => board.get(sq as Square)?.type === 'k');
    const count = targets.filter(winnable).length;
    if (!(royal ? count >= 1 : count >= 2)) return false;
    return agentSurvives(board, tactic, agent);
  }
  if (tactic.type === 'skewer') {
    // Real only if the FRONT piece can actually be won, or the piece behind is
    // the king (then the front one has to move and the back one is exposed).
    return winnable(tactic.involvedSquares[1])
      || board.get(tactic.involvedSquares[2] as Square)?.type === 'k';
  }
  // A pin immobilizes its front piece against a more valuable one — the
  // detector already requires back > front and filters pins-to-a-pawn, so the
  // pressure is real even when the front cannot be won immediately (Bg5
  // pinning the f6 knight to the queen). Keep it.
  return true;
}

/** Context the material calc needs about the PREVIOUS ply: if the opponent just
 *  captured on the square we're now capturing on, this move is a RECAPTURE and
 *  its honest material figure is the NET of the two-ply swap, not the face value
 *  (David 2026-07-20: "Qxf3 nets three points" was an even recapture). */
/** After an even swap, is `target` still winnable by `mover` whatever the
 *  opponent recaptures on `square` with? With no recapture available, it is
 *  winnable if the mover can take it now. */
function stillFallsAfterRecapture(fenAfter: string, square: Square, target: Square, mover: 'w' | 'b'): boolean {
  let board: Chess;
  try { board = new Chess(fenAfter); } catch { return false; }
  const retakes = board.moves({ verbose: true }).filter((m) => m.to === square && !!m.captured);
  if (retakes.length === 0) return legalSeeGainFor(fenAfter, target, mover) > 0;
  return retakes.every((m) => {
    const sim = new Chess(fenAfter);
    try { sim.move(m); } catch { return false; }
    return legalSeeGainFor(sim.fen(), target, mover) > 0;
  });
}

export interface PrevCaptureContext {
  /** The square the previous ply captured on (its destination), or null. */
  square: string | null;
  /** The value of the piece the previous ply captured (0 if it wasn't a capture). */
  capturedValue: number;
}

/** Minimal engine surface pvPlayback needs — injectable for tests. */
export interface PvEngine {
  analyzePosition(fen: string, depth: number): Promise<StockfishAnalysis>;
}

/** English for a tacticsDetector type. The detector enums are snake_case program
 *  identifiers ('mate_threat', 'removal_of_guard', 'back_rank', 'trapped_piece');
 *  spoken raw they read as the coach saying a variable name — David 2026-09-07
 *  heard "landing a mate_threat" in his own Traxler review on prod. Every site
 *  that voices tacticLanded MUST route through this. A clean single-word type
 *  (fork/pin/skewer) maps to itself; an unknown type falls back to
 *  underscores-to-spaces so a NEW enum never leaks raw. */
const TACTIC_WORD: Record<string, string> = {
  fork: 'fork', pin: 'pin', skewer: 'skewer', discovery: 'discovered attack',
  back_rank: 'back-rank threat', mate_threat: 'mating threat',
  removal_of_guard: 'removal of the defender', trapped_piece: 'piece trap',
  double_check: 'double check', overload: 'overloaded defender',
};
export function tacticWord(type: string): string {
  return TACTIC_WORD[type] ?? type.replace(/_/g, ' ');
}

export interface PlyFacts {
  /** 'capture' facts: what was taken, in plain words ("takes the knight"). */
  captured: string | null;
  isCheck: boolean;
  isMate: boolean;
  promotion: string | null;
  /** Tactic the move LANDS on the resulting board ('fork' | 'pin' | 'skewer'), if any. */
  tacticLanded: string | null;
  /** Material swing this ply in points, mover's perspective (>0 = mover gained). */
  materialGained: number;
  /** Files newly opened by this ply. */
  newOpenFiles: string[];
  /** The MOVER's passed pawns newly created by this ply (squares). Mover-only
   *  since walk 5 (R16): the list used to pool both colours, so exf6 — which
   *  left BLACK a passer on e6 — was voiced "your opponent created a passed
   *  pawn on e6". A consumer that wants the other side's goes to
   *  `passedPawnsHanded`; nothing has to re-check the board for ownership. */
  newPassedPawns: string[];
  /** The OTHER side's passed pawns this ply created (a capture that removed
   *  the last pawn standing in front of one). */
  passedPawnsHanded: string[];
  /** Outpost newly established by the mover (square), if any. */
  outpostGained: string | null;
  /** Defender king-shield pawns lost this ply (>0 = the defense got airier). */
  shieldLost: number;
}

export interface PvPly {
  san: string;
  uci: string;
  moverColor: 'white' | 'black';
  fenBefore: string;
  fenAfter: string;
  facts: PlyFacts;
}

export interface PvLine {
  plies: PvPly[];
  /** Root eval of the line, WHITE POV centipawns (the engine's promise). */
  rootEvalCp: number;
  /** Terminal re-analysis eval, WHITE POV cp (R3 verification), null when
   *  the verify pass could not run. */
  terminalEvalCp: number | null;
  /** R3: the line holds its promise at the end (terminal within 100cp of
   *  root, mover's perspective). A false line should not be TAUGHT as
   *  winning. */
  delivers: boolean;
  /** Root decision tension: the runner-up candidate within 40cp — Danya's
   *  "it's actually hard to decide" moment, as a computable fact. */
  closeAlternative: { san: string; gapCp: number } | null;
}

// THE DEPTH TABLE LIVES IN THE LEAF `ratingBands` (a pure computer that must
// not import the engine reads it too); re-exported so every caller is unchanged.
export { pvDepthForRating, MAX_PV_DEPTH_PLIES } from './ratingBands';

const PIECE_WORD: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** Exported so a surface that already holds a raw PV can replay it with the
 *  SAME facts the engine path computes, instead of a thinner hand-rolled copy
 *  that quietly sees less (see `lookaheadPlan.planFromUci`). */
export function computePlyFacts(fenBefore: string, fenAfter: string, mv: {
  captured?: string; san: string; color: 'w' | 'b'; promotion?: string;
}, prev?: PrevCaptureContext): PlyFacts {
  const before = describeStructure(fenBefore);
  const after = describeStructure(fenAfter);
  const mover = mv.color;
  const defender: 'w' | 'b' = mover === 'w' ? 'b' : 'w';
  // The square this move lands on (SAN's last coordinate) — used by both the
  // tactic-agent check and the material calc below.
  const toSquare = mv.san.replace(/[+#!?]+$/, '').match(/([a-h][1-8])(?!.*[a-h][1-8])/)?.[1] ?? null;

  // A tactic only "landed" if THIS move CREATED it — not one that was already
  // on the board (David 2026-07-20: every PV move narrated "lands a pin"
  // because a full middlegame board almost always has some pre-existing pin;
  // "O-O lands a pin" was the nonsense that resulted). Compare the tactic
  // signatures before vs after and keep only a newly-appeared one whose
  // involved squares include the square the mover just moved to (so it's the
  // move's own doing, not the opponent's standing threat). G0: board-true.
  let tacticLanded: string | null = null;
  try {
    const sig = (t: { type: string; involvedSquares: string[] }): string =>
      `${t.type}:${[...t.involvedSquares].sort().join(',')}`;
    const beforeSigs = new Set(detectTactics(fenBefore).tactics.filter((x) => x.type !== 'none').map(sig));
    // Only the MOVED piece can be the tactic's agent. A pin or skewer is made
    // by a SLIDER (bishop/rook/queen) — a knight/pawn/king move that merely
    // touches a pin's involved squares did NOT "land a pin" (David 2026-07-20:
    // "the knight lands on c3 and suddenly it's pinning" — knights can't pin).
    const isSlider = /^[BRQ]/.test(mv.san); // bishop/rook/queen — the only pinning pieces
    const afterBoard = new Chess(fenAfter);
    // VICTIM-first patterns (P4b, 2026-09-15): a trapped piece and an overload
    // name the OPPONENT's piece first (there is no "agent square" — the trap is
    // the victim's lack of squares, the overload is the guard's two jobs). The
    // agent rule for those is "THIS move added the attack": the landing square
    // must attack the trapped piece / one of the overloaded guard's charges.
    // Without this the mover could never be credited for a trap it just sprang.
    const attacksFrom = (target: string): boolean =>
      toSquare !== null && afterBoard.attackers(target as Square, mover).includes(toSquare as Square);
    const isAgent = (x: { type: string; involvedSquares: string[] }): boolean => {
      if (x.type === 'trapped_piece') return attacksFrom(x.involvedSquares[0]);
      if (x.type === 'overload') return x.involvedSquares.slice(1).some(attacksFrom);
      return toSquare !== null && x.involvedSquares[0] === toSquare;
    };
    const landed = detectTactics(fenAfter).tactics
      .filter((x) => x.type !== 'none')
      .filter((x) => !beforeSigs.has(sig(x)))
      .filter((x) => !((x.type === 'pin' || x.type === 'skewer') && !isSlider))
      // The MOVED piece must be the tactic's AGENT (the maker of the fork/pin/
      // skewer) — not merely a square it involves. detectTactics puts the agent
      // square FIRST, so require involvedSquares[0] === the landing square. Without
      // this the mover was credited for the OPPONENT's pin whenever its move just
      // landed BEHIND the pinned piece (David 2026-07-20 Opera nitpick: Black's
      // "Rd8 lands a pin" was really White's Rd1 pinning Black's own knight).
      .filter(isAgent)
      // Drop a shallow pin whose pinned piece is a mere PAWN (e.g. Qf3 "pinning"
      // the f7 pawn to the bishop) — technically true, not worth a tactic call.
      .filter((x) => !(x.type === 'pin' && afterBoard.get(x.involvedSquares[1] as Square)?.type === 'p'))
      .find(() => true);
    // BOARD-TRUE tactic-reality gate (David 2026-07-23: "Bg7 lands a skewer" /
    // "Qh4 lands a fork" fired on routine developing moves). detectTactics
    // reports a bare geometric alignment even when every target is DEFENDED and
    // of equal-or-greater value — winning nothing. A tactic only "lands" if the
    // moved piece actually threatens to WIN material: a fork needs >=2 winnable
    // targets; a pin/skewer needs its front target winnable (or an absolute pin
    // against the king). "Winnable" = the target is worth more than the mover
    // OR is undefended (it hangs). Kills the false alarms; keeps the real ones.
    if (landed) {
      // ONE definition of "does this actually win something" — see
      // `tacticWinsMaterial`. It used to be written out here AND copied by
      // hand into the corpus sweep's scanner, and the two drifted.
      const agentSquare = (landed.type === 'trapped_piece' || landed.type === 'overload') ? toSquare : landed.involvedSquares[0];
      const real = tacticWinsMaterial(afterBoard, landed, agentSquare);
      tacticLanded = real ? landed.type : null;
    }

    // MOVE-based motifs (P4b, 2026-09-15). The scan above reads the AFTER
    // board, so it can never credit a motif that is a property of the MOVE
    // rather than the position: a discovered attack (the unveiling is the
    // event), a double check, removing the guard (the guard is GONE from the
    // after-board). `classifyPosition` is the engine's own before/after
    // detector for exactly those, in the same vocabulary — without this the
    // coach could not teach "removing the guard" on a puzzle whose solution is
    // exactly that (found wiring the one tactic classifier). Same reality bar
    // as the board scan: the unveiled / unguarded target must be WINNABLE;
    // a double check is decisive by nature. Only consulted when nothing landed.
    if (!tacticLanded && toSquare) {
      try {
        const moved = afterBoard.get(toSquare as Square);
        for (const t of classifyPosition(fenBefore, fenAfter, mv.san, 0, 0).tactics) {
          if (t.type === 'double_check') { tacticLanded = 'double_check'; break; }
          if (t.type === 'discovery') {
            // involvedSquares = [from, revealer, target]. The detector treats the
            // moved piece's landing square as transparent, so a pawn stepping
            // ALONG the queen's file (3.d4 in the Alekhine) "unveiled" the queen
            // through itself. A discovery exists only if the revealer→target ray
            // is actually clear on the after-board — the mover must have LEFT it.
            const revealer = t.involvedSquares[1];
            const target = t.involvedSquares[2];
            const revealerVal = pieceVal(afterBoard.get(revealer as Square)?.type);
            if (rayClear(afterBoard, revealer, target) && winnableBy(afterBoard, target, revealerVal)) { tacticLanded = 'discovery'; break; }
          }
          if (t.type === 'removal_of_guard' && moved && mv.captured) {
            // involvedSquares = [captureSquare, nowUnguarded]. Two things must
            // be true or nothing is won: the capture itself must not LOSE
            // (taking a defended guard with a pricier piece — Rxd5 Qxd5 — is a
            // trade, not a removal), and the formerly-guarded piece must now be
            // under the mover's attack (a guard removed from a piece nobody
            // hits is a fact, not a tactic).
            const unguarded = t.involvedSquares[1] as Square;
            let captureNets = 0;
            try { captureNets = pieceVal(mv.captured) - legalSeeGain(fenAfter, toSquare as Square); } catch { captureNets = 0; }
            // AN EVEN TRADE IS A REMOVAL ONLY IF THE TARGET STILL FALLS (walk
            // 6, R8: the queen trade Qxb5 cxb5 was voiced "landing a removal
            // of the defender" on BOTH moves). A retake nets against what was
            // just taken on that square. When the swap comes out level, the
            // guard is only really gone if the piece it guarded is still
            // winnable after the opponent's recapture — the classic Bxf6 gxf6
            // then the h7 pawn falls; not a plain trade of queens.
            const retake = !!prev?.square && prev.square === toSquare && prev.capturedValue > 0;
            const net = retake ? captureNets - (prev?.capturedValue ?? 0) : captureNets;
            if (net > 0 && afterBoard.attackers(unguarded, mover).length > 0) { tacticLanded = 'removal_of_guard'; break; }
            if (net === 0 && afterBoard.attackers(unguarded, mover).length > 0 && stillFallsAfterRecapture(fenAfter, toSquare as Square, unguarded, mover)) { tacticLanded = 'removal_of_guard'; break; }
          }
        }
      } catch { /* move-based scan failed — facts stay as they are */ }
    }
  } catch { /* facts stay null */ }

  const isCheck = /[+#]$/.test(mv.san);
  const isMate = mv.san.endsWith('#');

  // Material this move HONESTLY wins — never the captured piece's face value,
  // which reads a recapture (even trade) or a sacrifice as a windfall (David
  // 2026-07-20 Opera-game nitpick: "Qxf3 nets three points" on an even trade;
  // "Rxd7 grabs three points" on an exchange sac). Two board-true cases:
  //   • RECAPTURE (opponent just captured on this same square) → the NET of the
  //     two-ply swap (face value taken − value the opponent took last ply). An
  //     even trade → 0, so no "wins material" claim fires.
  //   • fresh capture → static exchange (SEE) on the target: a defended even
  //     trade nets ~0, a hanging piece nets its value, a SACRIFICE nets NEGATIVE
  //     (so it never reads as "wins material" — the sacrifice register handles it).
  let materialGained = 0;
  if (mv.captured && toSquare) {
    const capturedVal = PIECE_POINTS[mv.captured] ?? 0;
    // A RECAPTURE only when the previous ply actually CAPTURED there. A piece
    // that merely MOVED to this square last ply and is now taken must go
    // through the static exchange like any fresh capture — treating it as a
    // "recapture" netted face value minus 0 and bypassed SEE, so an even
    // trade (4.d4 cxd4 5.cxd4) read "you capture the pawn, win material"
    // (David's Alapin, audit 2026-09-06).
    if (prev && prev.square === toSquare && prev.capturedValue > 0) {
      materialGained = capturedVal - prev.capturedValue;
    } else {
      // Signed, pin-aware net: what the mover grabbed minus the opponent's best
      // LEGAL recapture (from fenAfter, where they are to move). A sacrifice
      // nets negative, an even trade ~0, a hanging piece its value — and a
      // pinned recapturer no longer distorts the swap (2026-09-13 sweep).
      try { materialGained = capturedVal - legalSeeGain(fenAfter, toSquare as Square); }
      catch { materialGained = 0; }
    }
  }

  const newOpenFiles = before && after
    ? after.pawns.openFiles.filter((f) => !before.pawns.openFiles.includes(f))
    : [];
  const newPassersFor = (side: 'w' | 'b'): string[] => {
    const had = before ? before.pawns.passedPawns[side] : [];
    return after ? after.pawns.passedPawns[side].filter((sq) => !had.includes(sq)) : [];
  };
  const newPassedPawns = newPassersFor(mover);
  const passedPawnsHanded = newPassersFor(defender);
  const outpostsBefore = before ? before.outposts.filter((o) => o.color === mover).map((o) => o.square) : [];
  const outpostAfterNew = after
    ? after.outposts.find((o) => o.color === mover && !outpostsBefore.includes(o.square))
    : undefined;
  const shieldLost = before && after
    ? Math.max(0, before.kings.shieldPawns[defender] - after.kings.shieldPawns[defender])
    : 0;

  return {
    captured: mv.captured ? PIECE_WORD[mv.captured] ?? null : null,
    isCheck,
    isMate,
    promotion: mv.promotion ? PIECE_WORD[mv.promotion] ?? null : null,
    tacticLanded,
    materialGained,
    newOpenFiles,
    newPassedPawns,
    passedPawnsHanded,
    outpostGained: outpostAfterNew?.square ?? null,
    shieldLost,
  };
}

/**
 * Compute the PV line from `fen`. When `firstUci` is provided (the stored
 * best move the shot question used), the line is seeded from it — R3
 * consistency: the sequence must continue the move the student was just
 * asked to find, never contradict it.
 */
export async function computePvLine(
  fen: string,
  opts: {
    firstUci?: string;
    maxPlies?: number;
    depth?: number;
    engine?: PvEngine;
  } = {},
): Promise<PvLine | null> {
  const engine = opts.engine ?? stockfishEngine;
  const maxPlies = opts.maxPlies ?? 8;
  const depth = opts.depth ?? 14;

  let root: StockfishAnalysis;
  try {
    root = await engine.analyzePosition(fen, depth);
  } catch {
    return null;
  }
  const lines = root.topLines ?? [];
  if (lines.length === 0) return null;

  // Seed from the stored best move when given: prefer the multipv line that
  // starts with it; else analyze the position AFTER it and prepend.
  let uciMoves: string[];
  let rootEvalCp = root.evaluation;
  const primary = lines[0];
  if (opts.firstUci && primary.moves[0] !== opts.firstUci) {
    const seeded = lines.find((l) => l.moves[0] === opts.firstUci);
    if (seeded) {
      uciMoves = seeded.moves.slice(0, maxPlies);
      rootEvalCp = seeded.evaluation;
    } else {
      try {
        const probe = new Chess(fen);
        const applied = probe.move({
          from: opts.firstUci.slice(0, 2),
          to: opts.firstUci.slice(2, 4),
          promotion: opts.firstUci.length > 4 ? opts.firstUci.slice(4) : undefined,
        });
        if (!applied) return null;
        const cont = await engine.analyzePosition(probe.fen(), depth);
        uciMoves = [opts.firstUci, ...(cont.topLines?.[0]?.moves ?? [])].slice(0, maxPlies);
        rootEvalCp = cont.evaluation;
      } catch {
        return null;
      }
    }
  } else {
    uciMoves = primary.moves.slice(0, maxPlies);
    rootEvalCp = primary.evaluation;
  }

  // Replay through chess.js — SAN, fens, facts. Stop at the first illegal
  // (defensive: a PV should always replay, but never trust unreplayed moves).
  const chess = new Chess(fen);
  const plies: PvPly[] = [];
  let prevCap: PrevCaptureContext = { square: null, capturedValue: 0 };
  for (const uci of uciMoves) {
    if (!uci || uci.length < 4) break;
    const fenBefore = chess.fen();
    let mv;
    try {
      mv = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4) : undefined,
      });
    } catch {
      break;
    }
    if (!mv) break;
    const fenAfter = chess.fen();
    plies.push({
      san: mv.san,
      uci,
      moverColor: mv.color === 'w' ? 'white' : 'black',
      fenBefore,
      fenAfter,
      facts: computePlyFacts(fenBefore, fenAfter, mv, prevCap),
    });
    // Carry this ply's capture forward so the NEXT ply can detect a recapture.
    prevCap = { square: mv.to, capturedValue: mv.captured ? (PIECE_POINTS[mv.captured] ?? 0) : 0 };
  }
  if (plies.length === 0) return null;

  // R3 — verify the line DELIVERS: re-analyze the terminal position; the
  // mover's-POV eval must hold within 100cp of the root promise. A mate
  // found on the way trivially delivers.
  const moverIsWhite = plies[0].moverColor === 'white';
  const moverPov = (whitePovCp: number): number => (moverIsWhite ? whitePovCp : -whitePovCp);
  let terminalEvalCp: number | null = null;
  let delivers: boolean;
  const lastPly = plies[plies.length - 1];
  if (lastPly.facts.isMate) {
    delivers = true;
  } else {
    try {
      const term = await engine.analyzePosition(lastPly.fenAfter, Math.max(10, depth - 2));
      terminalEvalCp = term.evaluation;
      delivers = moverPov(terminalEvalCp) >= moverPov(rootEvalCp) - 100;
    } catch {
      // Verify pass unavailable → don't teach an unverified line as winning.
      delivers = false;
    }
  }

  // Root decision tension (Danya's "hard to decide"): runner-up within 40cp.
  let closeAlternative: PvLine['closeAlternative'] = null;
  // A TWO-HORSE RACE, not a flat field (walk 2026-09-23: at the start position
  // and after 2.Nc3 the hedge fired every ply — "the knight to c3 does the same
  // job" — because in a quiet opening EVERY runner-up is within 40cp). The
  // hedge is a decision only when the field behind the two is clearly worse.
  const thirdClearlyWorse = lines.length < 3 || Math.abs(lines[0].evaluation - lines[2].evaluation) >= 80;
  if (lines.length >= 2 && thirdClearlyWorse) {
    const gap = Math.abs(lines[0].evaluation - lines[1].evaluation);
    if (gap <= 40 && lines[1].moves[0]) {
      try {
        const probe = new Chess(fen);
        const alt = probe.move({
          from: lines[1].moves[0].slice(0, 2),
          to: lines[1].moves[0].slice(2, 4),
          promotion: lines[1].moves[0].length > 4 ? lines[1].moves[0].slice(4) : undefined,
        });
        if (alt) closeAlternative = { san: alt.san, gapCp: gap };
      } catch { /* no tension fact */ }
    }
  }

  return { plies, rootEvalCp, terminalEvalCp, delivers, closeAlternative };
}

/**
 * Deterministic per-ply narration — the offline/LLM-failure fallback voice
 * (R1: never the primary; voiceFactsBatch phrases the bundles). States only
 * computed facts; quiet plies (no facts) return null → no line spoken.
 */
export function renderPlyFactLine(ply: PvPly): string | null {
  const f = ply.facts;
  const bits: string[] = [];
  if (f.isMate) return `${ply.san} — checkmate.`;
  if (f.captured) bits.push(`takes the ${f.captured}`);
  if (f.isCheck) bits.push('with check');
  if (f.promotion) bits.push(`promoting to a ${f.promotion}`);
  if (f.tacticLanded) bits.push(`landing a ${tacticWord(f.tacticLanded)}`);
  if (f.outpostGained) bits.push(`planting an outpost on ${f.outpostGained}`);
  if (f.newPassedPawns.length > 0) bits.push(`creating a passed pawn on ${f.newPassedPawns[0]}`);
  if (f.passedPawnsHanded.length > 0) bits.push(`leaving the other side a passed pawn on ${f.passedPawnsHanded[0]}`);
  if (f.newOpenFiles.length > 0) bits.push(`opening the ${f.newOpenFiles[0]}-file`);
  if (f.shieldLost > 0) bits.push('stripping the king cover');
  if (bits.length === 0) return null;
  return `${ply.san}, ${bits.join(', ')}.`;
}

/** One ply's fact bundle as a compact facts string — the voiceFacts input
 *  for that ply's spoken line (per-ply calls, per-ply validation). Returns
 *  null for a quiet ply (no facts → no line — silence, not filler). */
export function plyFactsString(ply: PvPly): string | null {
  const f = ply.facts;
  const parts: string[] = [];
  if (f.captured) parts.push(`captures the ${f.captured}`);
  if (f.isMate) parts.push('checkmate');
  else if (f.isCheck) parts.push('check');
  if (f.promotion) parts.push(`promotes to ${f.promotion}`);
  if (f.tacticLanded) parts.push(`lands a ${tacticWord(f.tacticLanded)}`);
  if (f.outpostGained) parts.push(`outpost established on ${f.outpostGained}`);
  if (f.newPassedPawns.length > 0) parts.push(`creates a passed pawn on ${f.newPassedPawns.join(', ')}`);
  if (f.passedPawnsHanded.length > 0) parts.push(`leaves the other side a passed pawn on ${f.passedPawnsHanded.join(', ')}`);
  if (f.newOpenFiles.length > 0) parts.push(`opens ${fileList(f.newOpenFiles)}`);
  if (f.shieldLost > 0) parts.push(`strips ${f.shieldLost} pawn${f.shieldLost > 1 ? 's' : ''} from the king's cover`);
  // Say "wins material" — NEVER the point count (David 2026-07-24: "we don't need
  // to call out how many points were gained with each capture. Sounds bad").
  if (f.materialGained >= 1) parts.push('wins material');
  if (parts.length === 0) return null;
  return `The move ${ply.san} ${parts.join(', ')}.`;
}

/** The SAME per-move facts as `plyFactsString`, but as a SUBJECT-LESS clause
 *  (no "The move X" prefix) so the caller can frame the subject — "You …" for
 *  the student, "Your opponent …" for the other side (David 2026-07-20: "always
 *  narrate both sides"). Returns e.g. "captures the knight, lands a fork, wins
 *  material", or null on a genuinely quiet move. Board-true (G0).
 *
 *  🔴 The example above used to end "wins 3 POINTS of material". That is the
 *  pre-2026-07-24 wording and the emit site below has said so ever since
 *  ("we don't need to call out how many points were gained … Sounds bad") — a
 *  docstring that shows output the function cannot produce teaches the next
 *  reader a contract that does not exist. */
export function plyFactsClause(fenBefore: string, san: string, prev?: PrevCaptureContext): string | null {
  try {
    const c = new Chess(fenBefore);
    const mv = c.move(san);
    if (!mv) return null;
    const f = computePlyFacts(fenBefore, c.fen(), {
      captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion,
    }, prev);
    const parts: string[] = [];
    if (f.captured) parts.push(`captures the ${f.captured}`);
    if (f.isMate) parts.push('delivers checkmate');
    else if (f.isCheck) parts.push('gives check');
    if (f.promotion) parts.push(`promotes to a ${f.promotion}`);
    if (f.tacticLanded) parts.push(`lands a ${tacticWord(f.tacticLanded)}`);
    if (f.outpostGained) parts.push(`plants an outpost on ${f.outpostGained}`);
    if (f.newPassedPawns.length > 0) parts.push(`creates a passed pawn on ${f.newPassedPawns.join(', ')}`);
    if (f.passedPawnsHanded.length > 0) parts.push(`leaves the other side a passed pawn on ${f.passedPawnsHanded.join(', ')}`);
  if (f.passedPawnsHanded.length > 0) parts.push(`leaves the other side a passed pawn on ${f.passedPawnsHanded.join(', ')}`);
    if (f.newOpenFiles.length > 0) parts.push(`opens ${fileList(f.newOpenFiles)}`);
    if (f.shieldLost > 0) parts.push(`strips ${f.shieldLost} pawn${f.shieldLost > 1 ? 's' : ''} from the king's cover`);
    // "wins material", never the point count (David 2026-07-24 — sounds bad).
    if (f.materialGained >= 1) parts.push('wins material');
    return parts.length === 0 ? null : parts.join(', ');
  } catch {
    return null;
  }
}

/**
 * Rich per-move facts for a REAL game move (fenBefore + SAN) — the SAME deep
 * PlyFacts computer the PV playout narrates (captures, newly-created tactics,
 * outposts, passed pawns, opened files, material, king-shield). The basic walk
 * used only the thinner `buildReviewMoveTeaching`, so quiet-but-eventful moves
 * went silent and read worse than the best-move lines (David 2026-07-20: "the
 * best move lines have way better narration"). Routing the walk through this
 * unifies the quality. Null on a genuinely quiet move (no concrete fact) →
 * silence, per the Narration Voice Rules. Pure — chess.js validates the SAN.
 */
/**
 * THE tactic a move lands, reality-gated — the ONE judgement, for any surface
 * that wants to NAME a tactic to the student.
 *
 * 🔴 WHY THIS IS EXPORTED (2026-09-21, found auditing the unified coach).
 * `guidedFindTheMove` carried its OWN copy: `detectTactics(fenAfter)` filtered
 * only by "the moved piece's square appears in involvedSquares". Measured on
 * one real position (`6k1/5p2/5B1Q/1p1P1q2/4r3/1p6/6PK/6R1 b`, Qf4+):
 *
 *     guidedFindTheMove's copy -> "fork"     computePlyFacts -> no fork
 *
 * So Learn asked "Your queen can land a fork here — what's the square?" and
 * sent the student hunting a fork that wins nothing, while review stayed
 * correctly silent on the same board. One coach, two answers — the exact
 * capability-parity failure the rot rule names, and the reason a judgement
 * gets ONE home rather than a copy per surface.
 *
 * The local copy was missing FOUR guards this path has: the moved piece must be
 * the tactic's AGENT (not merely a participant); the targets must be WINNABLE;
 * a pin must be landed by a SLIDER; and the tactic must be NEW (a pre-existing
 * tactic, often the opponent's, is not something this move landed).
 *
 * This adds no fifth definition — it reads `computePlyFacts`, which is already
 * the single source, so the gate can only ever be improved in one place.
 */
export function landedTacticFor(fenBefore: string, san: string): string | null {
  try {
    const c = new Chess(fenBefore);
    const mv = c.move(san);
    if (!mv) return null;
    return computePlyFacts(fenBefore, c.fen(), {
      captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion,
    }).tacticLanded;
  } catch {
    return null;
  }
}

export function plyFactsForMove(fenBefore: string, san: string, prev?: PrevCaptureContext, moverIsStudent?: boolean): string | null {
  try {
    const c = new Chess(fenBefore);
    const mv = c.move(san);
    if (!mv) return null;
    const f = computePlyFacts(fenBefore, c.fen(), {
      captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion,
    }, prev);

    // Don't RESTATE a bare capture the student watched happen (Narration rule
    // #3 — the board already told that story): if the only fact is the capture
    // itself, no material won and no tactical/structural consequence, stay
    // silent. A capture that WINS material or lands a real tactic still speaks.
    const onlyBareCapture = !!f.captured && f.materialGained < 1 && !f.tacticLanded
      && !f.isCheck && !f.outpostGained && f.newPassedPawns.length === 0 && f.passedPawnsHanded.length === 0
      && f.newOpenFiles.length === 0 && f.shieldLost === 0;

    // Name the PLAYER, not "The move Nxb5 …" (David 2026-07-23: the robotic
    // "The move X …" prefix restated the move). "You capture" (student) /
    // "Your opponent captures" (other side) with correct verb agreement; the
    // subjectless "The move …" only when the seat isn't known (back-compat).
    const isYou = moverIsStudent === true;
    const subject = isYou ? 'You' : moverIsStudent === false ? 'Your opponent' : `The move ${mv.san}`;
    const vb = (base: string, third: string): string => (isYou ? base : third);
    const plural = (n: number): string => (n > 1 ? 's' : '');
    const parts: string[] = [];
    if (f.captured) parts.push(vb(`capture the ${f.captured}`, `captures the ${f.captured}`));
    if (f.isMate) parts.push(vb('deliver checkmate', 'delivers checkmate'));
    else if (f.isCheck) parts.push(vb('give check', 'gives check'));
    if (f.promotion) parts.push(vb(`promote to a ${f.promotion}`, `promotes to a ${f.promotion}`));
    if (f.tacticLanded) parts.push(vb(`land a ${tacticWord(f.tacticLanded)}`, `lands a ${tacticWord(f.tacticLanded)}`));
    if (f.outpostGained) parts.push(vb(`plant an outpost on ${f.outpostGained}`, `plants an outpost on ${f.outpostGained}`));
    if (f.newPassedPawns.length > 0) parts.push(vb(`create a passed pawn on ${f.newPassedPawns[0]}`, `creates a passed pawn on ${f.newPassedPawns[0]}`));
    if (f.passedPawnsHanded.length > 0) parts.push(vb(`hand them a passed pawn on ${f.passedPawnsHanded[0]}`, isYou || moverIsStudent === false ? `hands you a passed pawn on ${f.passedPawnsHanded[0]}` : `leaves the other side a passed pawn on ${f.passedPawnsHanded[0]}`));
    if (f.newOpenFiles.length > 0) parts.push(vb(`open the ${f.newOpenFiles[0]}-file`, `opens the ${f.newOpenFiles[0]}-file`));
    if (f.shieldLost > 0) parts.push(vb(`strip ${f.shieldLost} pawn${plural(f.shieldLost)} from the king's cover`, `strips ${f.shieldLost} pawn${plural(f.shieldLost)} from the king's cover`));
    // "win/wins material", never the point count (David 2026-07-24 — sounds bad).
    if (f.materialGained >= 1) parts.push(vb('win material', 'wins material'));

    if (parts.length === 0 || onlyBareCapture) return null;
    // A check ALONE teaches nothing as bare "gives check" — say what it DOES:
    // forces a reply and hands the checker a free move (David 2026-07-25: TEACH
    // every move, no thin lines). Only when the check is the SOLE fact; joined
    // with a capture/tactic the plain "gives check" clause still reads fine.
    if (parts.length === 1 && f.isCheck && !f.isMate) {
      return `${subject} ${vb('check the king, forcing a reply and taking the initiative for a move', 'checks the king, forcing a reply and taking the initiative for a move')}.`;
    }
    return `${subject} ${parts.join(', ')}.`;
  } catch {
    return null;
  }
}

/** The whole line's facts, one numbered bundle per ply (audit/debug view). */
export function pvFactsForVoice(line: PvLine): string {
  return line.plies
    .map((p, i) => `${i + 1}) ${plyFactsString(p) ?? p.san}`)
    .join('\n');
}

import { logAppAudit } from './appAuditor';
import { isScenicPawnPin } from './factStakes';
import type { PerspectiveMode } from './perspectiveRule';
/**
 * Live tactics context builder — turns the surface's Stockfish read
 * + current FEN + the student's rating into the `TacticsLiveContext`
 * block the brain envelope expects.
 *
 * The job is purely data-prep: detect what's on the board right now
 * (forks/pins/skewers/hanging pieces via `tacticClassifier`), scan
 * Stockfish's principal variation forward by the rating-adaptive
 * lookahead depth (`getTacticLookahead`), and emit the structured
 * block that `formatTacticsSubBlock` renders into the prompt.
 *
 * This module never calls the LLM. The LLM's tactical vocabulary is
 * bounded by what this scan produces — G3 contract — so when the
 * scan finds nothing (quiet position) we return an empty context and
 * the envelope's renderer drops the block entirely.
 *
 * Used by:
 *   - CoachTeachPage (handleSubmit, when building LiveState for the
 *     brain call)
 *   - CoachGamePage (move-time narration build)
 *   - any future surface that wants the coach to name tactics
 *     proactively
 *
 * Stockfish analysis is the SAME analysis the surface already runs
 * for its eval bar — no extra round trip. If the surface doesn't
 * have analysis cached (FEN changed faster than the debounce), pass
 * `null` and the immediate-tactics + hanging-pieces detection still
 * runs (those only need the FEN).
 */
import { Chess } from 'chess.js';
import type { TacticsLiveContext } from '../coach/types';
import type { StockfishAnalysis } from '../types';
import {
  findHangingPieces,
  scanUpcomingTactics,
} from './tacticClassifier';
import { detectTactics } from './tacticsDetector';
import { getTacticLookahead } from './tacticAlertService';
import { stockfishEngine } from './stockfishEngine';
import type { TacticPattern, UpcomingTactic, TacticPatternType } from '../types/tacticTypes';
import { matchTacticPattern, type WeaknessSignal } from './weaknessSignal';
import { conceptForBoard } from './conceptEngine';
import { sayMoveNoun } from './spokenMove';
import { verifyForkOnBoard } from './tacticVerification';

/**
 * Build the `TacticsLiveContext` block for the brain envelope.
 *
 * @param fen           - The position the coach is about to discuss.
 * @param analysis      - Stockfish analysis for `fen` (top-N PV +
 *                        eval). Pass `null` when no analysis is
 *                        cached — immediate tactics + hanging pieces
 *                        still surface from FEN alone.
 * @param playerColor   - 'w' | 'b' — which side the student plays.
 * @param playerRating  - Used to size the lookahead via
 *                        `getTacticLookahead`. David's call: 1-2
 *                        plies for beginners, 4 for intermediate+.
 */
// The identity check belongs beside the builder it protects: a surface asks
// "is this package about my board" where it asks for the package, not from a
// second fact module. Re-exported so CoachTeachPage imports ONE module here
// (`surfaceComposition.scan` ceiling, 2026-09-20).
export { tacticsAreFreshFor } from './tacticsContextIdentity';

export function buildTacticsLiveContext(
  fen: string,
  analysis: StockfishAnalysis | null,
  playerColor: 'w' | 'b',
  playerRating: number,
  tacticsSkill?: number,
): TacticsLiveContext {
  const lookaheadDepth = getTacticLookahead(playerRating, tacticsSkill);

  // 1. Immediate tactics + hanging pieces — no PV needed.
  const immediate = detectImmediateTactics(fen, playerColor);
  const hanging = detectHangingPieces(fen);

  // 2. Forward scan of the PV (threats + opportunities).
  let threats: TacticsLiveContext['threats'] = [];
  let opportunities: TacticsLiveContext['opportunities'] = [];
  if (analysis && analysis.topLines.length > 0) {
    const upcoming = scanUpcomingTactics(
      fen,
      analysis.topLines,
      playerColor,
      lookaheadDepth,
    );
    for (const u of upcoming) {
      const entry = upcomingToEntry(u);
      if (u.beneficiary === 'opponent') threats.push(entry);
      else opportunities.push(entry);
    }
    // Cap each list at 5 — token budget; the brain doesn't need 20
    // upcoming entries to narrate well, and 5 covers the top PV
    // contributors.
    threats = threats.slice(0, 5);
    opportunities = opportunities.slice(0, 5);
  }

  // 3. COMPUTED CONCEPTS — from the SAME analysis this package already holds
  // (David 2026-09-14: one computational system, no function working alone).
  // conceptForBoard is a consumer: geometry now + the engine's PV walked and
  // ranked by its swing when `analysis` is present. Never a second engine read.
  let concepts: TacticsLiveContext['concepts'];
  try {
    const list = conceptForBoard(fen, {
      analysis,
      studentSide: playerColor === 'w' ? 'white' : 'black',
      rating: playerRating,
    });
    concepts = list.length > 0 ? list : undefined;
  } catch { concepts = undefined; }

  return {
    // The package's own identity — the board every fact below is about. Set at
    // the ONE build site so no producer can forget it (see `TacticsLiveContext.fen`).
    fen,
    immediate,
    hanging,
    threats,
    opportunities,
    lookaheadDepth,
    concepts,
    boardFacts: computeBoardFacts(fen),
  };
}

/** Default analyzer for the fed builder — a hang-protected, budgeted engine
 *  read. Bounded (1.5s) so a slow/dead engine rejects fast (the engine now
 *  recovers a stuck worker) and we degrade to the FEN-only context instead of
 *  hanging the coach turn. */
async function defaultFedAnalyze(fen: string): Promise<StockfishAnalysis | null> {
  try {
    // Hard-race the engine read against a 2.5s ceiling so a COLD engine
    // (whose init can take up to 45s, which analyzeWithBudget awaits) can
    // never block the coach turn. On a warm engine the eval-bar already
    // analysed this FEN, so this resolves from the engine cache instantly;
    // a slow/cold/dead engine returns null fast → FEN-only context.
    return await Promise.race([
      stockfishEngine.analyzeWithBudget(fen, 12, 1500),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
  } catch {
    return null;
  }
}

/**
 * buildFedTacticsContext — the ROOT fix for hallucinated tactics (David
 * 2026-06-16). `buildTacticsLiveContext` is only as good as the `analysis` it
 * is handed, and every coach surface was passing the best-effort eval-bar
 * cache — which is `null` on a miss (and the eval bar times out on iOS). A
 * null analysis drops the PV-lookahead tactics, so the LLM gets a thin/empty
 * tactics block and INVENTS one to fill the void ("knight fork").
 *
 * This wrapper GUARANTEES the package is fed: when no fresh analysis is in
 * hand (or the cached one has no PV), it fetches one itself before building
 * the context — so a surface can't starve the package by forgetting to pass
 * an analysis. When the engine is genuinely down it degrades to the FEN-only
 * context (immediate + hanging), which is still grounded — empty > invented.
 * The LLM is HANDED the real tactics; it never has to decide them (G0/G3).
 *
 * `analyze` is injectable for tests; it defaults to the real engine.
 */
export async function buildFedTacticsContext(
  fen: string,
  playerColor: 'w' | 'b',
  playerRating: number,
  cachedAnalysis?: StockfishAnalysis | null,
  analyze: (fen: string) => Promise<StockfishAnalysis | null> = defaultFedAnalyze,
  // Optional adaptive signal (SkillRadar.tactics, 0-100). When supplied, a
  // player strong/improving at tactics gets a deeper PV scan — see
  // getTacticLookahead. Omitted → rating-only baseline (backward compatible).
  // Passed LAST (after `analyze`) so existing 4-arg callers are unaffected;
  // callers that want it but not a custom analyzer pass `undefined` for analyze.
  tacticsSkill?: number,
): Promise<TacticsLiveContext> {
  let analysis = cachedAnalysis ?? null;
  if (!analysis || analysis.topLines.length === 0) {
    analysis = await analyze(fen);
  }
  return buildTacticsLiveContext(fen, analysis, playerColor, playerRating, tacticsSkill);
}

/** Deterministic ground-truth facts from the FEN — king squares, side
 *  to move, who's in check, and a forced mate-in-one if one exists.
 *  Injected so the brain describes from authoritative data instead of
 *  eyeballing the board (audit 2026-06-02: castled-king-on-e8 + a
 *  missed mate-in-one with fabricated escape squares). Returns
 *  `undefined` on an unparseable FEN so the renderer drops the block. */
function computeBoardFacts(fen: string): TacticsLiveContext['boardFacts'] {
  try {
    const chess = new Chess(fen);
    const board = chess.board();
    let whiteKing = '';
    let blackKing = '';
    for (const row of board) {
      for (const sq of row) {
        if (sq && sq.type === 'k') {
          if (sq.color === 'w') whiteKing = sq.square;
          else blackKing = sq.square;
        }
      }
    }
    if (!whiteKing || !blackKing) return undefined;
    const sideToMove = chess.turn() === 'w' ? 'white' : 'black';
    const inCheck = chess.inCheck() ? sideToMove : null;
    const { whitePieces, blackPieces } = pieceInventory(board);
    const material = describeMaterialBalance(board);
    const attackMap = computeAttackMap(chess);
    // Mate-in-one for the side to move: try every legal move; the first
    // that delivers checkmate is the forced mate. chess.js validates
    // legality, so this never reports an illegal "mate".
    let mateInOne: string | null = null;
    for (const m of chess.moves()) {
      const probe = new Chess(fen);
      probe.move(m);
      if (probe.isCheckmate()) { mateInOne = m; break; }
    }
    return { sideToMove, whiteKing, blackKing, inCheck, mateInOne, whitePieces, blackPieces, material, attackMap };
  } catch {
    return undefined;
  }
}

/** Per-piece attack/defense map from chess.js `attackers()` (the same
 *  occupancy-aware primitive the hanging detector now uses). For every
 *  non-king piece the enemy attacks, record the exact squares attacking it
 *  and defending it, so the coach explains the WHY with real pieces instead
 *  of eyeballing the attacker/defender (prod drive 2026-06-05). Hanging-
 *  first, then most-pressured (attackers minus defenders), capped to keep
 *  the envelope tight. */
function computeAttackMap(chess: Chess): NonNullable<TacticsLiveContext['boardFacts']>['attackMap'] {
  const NAMES: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
  const out: NonNullable<TacticsLiveContext['boardFacts']>['attackMap'] = [];
  try {
    for (const row of chess.board()) {
      for (const sq of row) {
        if (!sq || sq.type === 'k') continue;
        const enemy = sq.color === 'w' ? 'b' : 'w';
        const attackedBy = chess.attackers(sq.square, enemy);
        if (attackedBy.length === 0) continue;
        const defendedBy = chess.attackers(sq.square, sq.color);
        out.push({
          square: sq.square,
          piece: NAMES[sq.type] ?? sq.type,
          color: sq.color === 'w' ? 'white' : 'black',
          attackedBy: [...attackedBy],
          defendedBy: [...defendedBy],
        });
      }
    }
  } catch { /* fall through to whatever we collected */ }
  // Hanging pieces (no defenders) first; then by net pressure (attackers −
  // defenders) descending. Cap at 8 so a busy middlegame doesn't bloat the
  // prompt.
  out.sort((a, b) => {
    const ah = a.defendedBy.length === 0 ? 1 : 0;
    const bh = b.defendedBy.length === 0 ? 1 : 0;
    if (ah !== bh) return bh - ah;
    return (b.attackedBy.length - b.defendedBy.length) - (a.attackedBy.length - a.defendedBy.length);
  });
  return out.slice(0, 8);
}

/** Deterministic material balance from the board (chess.js values, kings
 *  excluded), white-perspective, in plain English. The coach intermittently
 *  flips the SIGN when eyeballing a tricky imbalance (R+P=6 vs Q=9: it said
 *  "White is ahead" while actually down 3 — response-loop audit 2026-06-05),
 *  so we hand it the ground-truth direction. Pure material count — NOT a
 *  positional eval. */
function describeMaterialBalance(board: ReturnType<Chess['board']>): string {
  const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const tally = (color: 'w' | 'b'): number => {
    let sum = 0;
    for (const row of board) for (const sq of row) {
      if (sq && sq.color === color && sq.type !== 'k') sum += VAL[sq.type] ?? 0;
    }
    return sum;
  };
  const w = tally('w');
  const b = tally('b');
  const diff = w - b;
  if (diff === 0) return `Material is EVEN (White ${w} vs Black ${b} in piece points).`;
  const side = diff > 0 ? 'White' : 'Black';
  const mag = Math.abs(diff);
  // State it from BOTH perspectives so an "am I (White) ahead or behind?"
  // question can't be answered backwards.
  const whiteDir = diff > 0 ? `White is UP ${mag}` : `White is DOWN ${mag}`;
  return `${whiteDir} in material (White ${w} vs Black ${b} piece points; ${side} is ahead by ${mag}). Use THIS direction for any up/down/ahead/behind material claim.`;
}

/** Plain-English inventory of every piece + its square, per color, so
 *  the brain reads positions from words instead of parsing the raw FEN
 *  (which LLMs do badly). Non-pawn pieces listed K-Q-R-B-N order; pawns
 *  grouped. */
function pieceInventory(board: ReturnType<Chess['board']>): { whitePieces: string; blackPieces: string } {
  const NAMES: Record<string, string> = { p: 'pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };
  const ORDER: Record<string, number> = { King: 0, Queen: 1, Rook: 2, Bishop: 3, Knight: 4 };
  const build = (color: 'w' | 'b'): string => {
    const majors: string[] = [];
    const pawns: string[] = [];
    for (const row of board) {
      for (const sq of row) {
        if (!sq || sq.color !== color) continue;
        if (sq.type === 'p') pawns.push(sq.square);
        else majors.push(`${NAMES[sq.type]} ${sq.square}`);
      }
    }
    majors.sort((a, b) => (ORDER[a.split(' ')[0]] ?? 9) - (ORDER[b.split(' ')[0]] ?? 9));
    const parts = [...majors];
    if (pawns.length) parts.push(`pawns on ${pawns.sort().join(' ')}`);
    return parts.join(', ') || '(no pieces)';
  };
  return { whitePieces: build('w'), blackPieces: build('b') };
}

/** Run `classifyPosition` against the current FEN as a null-move-style
 *  classification to surface tactics already on the board. Uses a
 *  pass-through evalBefore/evalAfter so the function falls through
 *  the eval-swing gating and returns whatever its tactic detectors
 *  find. */
function detectImmediateTactics(
  fen: string,
  playerColor: 'w' | 'b',
): TacticsLiveContext['immediate'] {
  try {
    // ASK THE POSITION DETECTOR, NOT THE MOVE CLASSIFIER (David
    // 2026-08-07: "No tactical alert about the center fork trick. No
    // corpus notes about geometry").
    //
    // This called `classifyPosition(fen, fen, '', 0, 0)` — a MOVE
    // classifier, handed no move — on the theory that its detectors would
    // still scan the position. They do not: every one of its patterns is
    // derived from the move that was played, so with an empty SAN it
    // returns nothing, and `immediate` was EMPTY on every ply of every
    // game. His whole 2026-08-07 log reads `immediate=0`, including the
    // ply where a pawn on d5 forked his bishop on c4 and his knight on
    // e4 — measured:
    //   detectTactics      → "Pawn on d5 forks knight on e4 and bishop on c4"
    //   this function      → 0 tactics
    // That single hole starved three consumers at once: the spoken
    // tactics alert (no tactic to speak), the live-tactic corpus tier
    // (no type to look up, so tactical teaching notes never loaded), and
    // the model's own fact block. `detectTactics` is the position-based
    // geometry detector — the one ground-truth-tested against the 15,000
    // -puzzle corpus, and the one that carries `beneficiary`.
    //
    // Capped like threats/opportunities: a busy middlegame can show
    // several patterns and the envelope is token-bounded.
    const result = detectTactics(fen);
    return result.tactics
      .filter((t) => t.type !== 'none')
      // A pawn pin that wins nothing is scenery — the ONE rule review uses too
      // (`isScenicPawnPin`), applied where the live package is built so no
      // Learn lane has to remember it.
      .filter((t) => !isScenicPawnPin(fen, t.type, t.involvedSquares, t.beneficiary))
      .map((t) => tacticPatternToEntry(t, playerColor, fen))
      .slice(0, 5);
  } catch {
    return [];
  }
}

function detectHangingPieces(fen: string): TacticsLiveContext['hanging'] {
  try {
    const chess = new Chess(fen);
    const hanging = findHangingPieces(chess);
    return hanging.map((h) => ({ square: h.square, piece: h.piece, color: h.color }));
  } catch {
    return [];
  }
}

function tacticPatternToEntry(
  t: TacticPattern,
  playerColor: 'w' | 'b',
  fen?: string,
): TacticsLiveContext['immediate'][number] {
  // 🔴 GEOMETRY IS NOT A TACTIC (2026-09-21). `detectTactics` reports the
  // SHAPE; whether it wins anything is a separate computed question, and until
  // now nobody asked it on this path — the raw list went into the envelope
  // under "NAME the pattern in prose", which handed the MODEL the judgement.
  //
  // `verifyForkOnBoard` is the purpose-built answer (built 2026-07-23, and
  // wired into exactly ONE surface until today). It is tempo-aware and SEE-
  // aware: it distinguishes the owner executing NOW from a threat that must
  // survive every defender reply, which is why it rejects forks that a
  // "is the target undefended right now" check waves through.
  //
  // FORK ONLY, on purpose: no verifier covers pin/skewer here yet, so those
  // stay `undefined` — absent recorded as absent, never as false.
  let wins: 'live' | 'threat' | 'none' | undefined;
  if (fen && t.type === 'fork' && t.involvedSquares.length >= 2) {
    try {
      wins = verifyForkOnBoard(fen, t.involvedSquares[0], t.involvedSquares.slice(1)).status;
    } catch { wins = undefined; }
  }
  return {
    type: t.type,
    description: t.description,
    squares: t.involvedSquares,
    ...(wins ? { wins } : {}),
    // Carry the detector's side through (David 2026-08-07). Dropping it
    // here made every consumer side-blind: a probe of his real game showed
    // pin/fork on almost every position, all of them BLACK's, with nothing
    // to say so.
    ...(t.beneficiary ? { side: t.beneficiary === playerColor ? 'student' as const : 'opponent' as const } : {}),
  };
}

function upcomingToEntry(u: UpcomingTactic): TacticsLiveContext['threats'][number] {
  return {
    type: u.pattern.type,
    description: u.pattern.description,
    depthAhead: u.depthAhead,
    line: u.line,
  };
}

/** Map a single-letter piece type to its full word for prose. */
function pieceFullName(piece: string): string {
  const key = piece.toLowerCase();
  switch (key) {
    case 'p': return 'pawn';
    case 'n': return 'knight';
    case 'b': return 'bishop';
    case 'r': return 'rook';
    case 'q': return 'queen';
    case 'k': return 'king';
    default: return piece;
  }
}

/**
 * speakDeepestLookahead — the DIRECTLY-SPOKEN deep look-ahead (P5, David
 * 2026-07-26: "speak the deep PV look-ahead as computed fact"). The
 * `TacticsLiveContext` PV scan (`scanUpcomingTactics`) is the app's DEEPEST
 * foresight — a rating-adaptive walk of Stockfish's principal variation — but
 * every surface only ever fed it to the LLM prompt (`formatTacticsSubBlock`),
 * where it was diluted: the model might mention the upcoming fork, garble the
 * line, or skip it entirely, and the grounding gate only STRIPS hallucinations,
 * it never GUARANTEES the real foresight is voiced. This renderer turns the top
 * DEEP entry (depthAhead ≥ 2 — the shallow 1-ply delta is already covered by the
 * threat detector) into a grounded spoken sentence so the best look-ahead is
 * spoken as computed FACT, never LLM-mediated (G0: the voice phrases; the engine
 * decided).
 *
 * Register: seat-framed to the student — an OPPORTUNITY (student beneficiary) is
 * empowering ("you've got …"), a THREAT (opponent) is a heads-up ("careful —
 * they're lining up …"). Correct for any surface where the board is the
 * student's own (the "Read this position" tap on Learn/Play/Review). Prefers the
 * student's opportunity over the opponent's threat when both exist. Returns null
 * when no depth-≥2 upcoming tactic exists (empty > generic — a quiet position
 * gets no manufactured foresight).
 */
/** The seat the sentence is SPOKEN FROM. Required — the seat is part of the
 *  selection (CLAUDE.md, 2026-09-17): a threat line that says "they're lining
 *  up a skewer" is the student register, and the on-demand read speaks AS THE
 *  OPPONENT ("my bishop wants g7"), so the same sentence injected there named
 *  the coach's own plan in the third person (prod tape, 2026-09-19). A new
 *  caller must say which seat it speaks from; `spectator` has no "you" and is
 *  deliberately not a member. */
export type LookaheadSeat = Extract<PerspectiveMode, 'student' | 'coach-is-opponent'>;

/** The threat-branch stem per seat — a Record so a new seat fails to compile
 *  until someone writes its sentence. The opportunity branch is the STUDENT's
 *  own shot in both seats ("you've got a … coming"), so it does not vary. */
const THREAT_STEM: Record<LookaheadSeat, (pattern: string, depth: number, line: string) => string> = {
  student: (pattern, depth, line) => `Look ahead — they're lining up a ${pattern} in ${depth}: ${line} — spot it before it lands.`,
  'coach-is-opponent': (pattern, depth, line) => `Look ahead — I'm lining up a ${pattern} in ${depth}: ${line} — spot it before it lands.`,
};

/** How far the live board's spoken foresight reaches — "a couple of moves". */
const SPOKEN_LOOKAHEAD_PLIES = 4;

export function speakDeepestLookahead(
  ctx: TacticsLiveContext,
  seat: LookaheadSeat,
  /** The STUDENT's colour — required, because the line starts at the current
   *  position and its first ply belongs to whoever is to move, which may be the
   *  student. Prod (2026-09-22, WO-STANDARD-01 D-9) said "Look ahead — they're
   *  lining up a pin in 2: Bg5, then Bg4" where Bg5 was the STUDENT's move: the
   *  renderer attributed the whole line to the opponent. Each ply is now
   *  attributed to its seat off `ctx.fen`'s side to move. */
  studentColor: 'w' | 'b',
  /** The student model (Phase 1b) — when a deep tactic's MOTIF is a hole this
   *  student keeps falling in (via the tactic-vocabulary bridge), it is PREFERRED
   *  as the one to speak, and an honest tag names the recurring pattern. Optional/
   *  inert: [] → the previous first-deep-tactic behavior, unchanged. */
  studentWeaknesses: readonly WeaknessSignal[] = [],
): string | null {
  const deep = (
    list: TacticsLiveContext['threats'],
  ): TacticsLiveContext['threats'] =>
    // …and "a couple of moves ahead" means a couple: two moves each side. "A
    // removal of guard coming, 9 deep" and "a skewer coming, 7 deep" over quiet
    // shuffles (hand walk 2340, moves 15-16) are not foresight a listener can
    // follow; the deep line belongs to the review, where the board replays it.
    list.filter((e) => e.depthAhead >= 2 && e.depthAhead <= SPOKEN_LOOKAHEAD_PLIES && e.line.length > 0);
  // e.type is widened to string on TacticsLiveContext; the runtime value is a
  // real TacticPatternType (from UpcomingTactic.pattern.type). An unknown motif
  // would map to null in the bridge anyway, so the cast is safe.
  const isHole = (e: TacticsLiveContext['threats'][number]): boolean =>
    matchTacticPattern(e.type as TacticPatternType, studentWeaknesses) !== null;
  const deepOpps = deep(ctx.opportunities);
  const deepThreats = deep(ctx.threats);
  // Within each seat, a motif the student keeps falling in wins the pick; else
  // the deepest (first) one — the prior behavior. Opportunity still beats threat.
  const opportunity = deepOpps.find(isHole) ?? deepOpps[0] ?? null;
  const threat = deepThreats.find(isHole) ?? deepThreats[0] ?? null;
  const pick = opportunity ?? threat;
  if (!pick) return null;
  const isOpportunity = pick === opportunity;
  const pattern = pick.type.replace(/[-_]/g, ' ');
  // Walk the first few plies of the PV in prose. The SANs come straight from
  // the engine line (chess.js-legal), so naming them is grounded, not invented
  // — and they are SPELLED (D-10): a bare "Bg5" beside the TTS sanitizer's own
  // expansion of it spoke every move twice.
  // Walked to the horizon, which is where the tactic lands.
  const walk = pick.line.slice(0, SPOKEN_LOOKAHEAD_PLIES);
  const spoken = walk.map(sayMoveNoun);
  const lineProse =
    spoken.length === 1
      ? spoken[0]
      : `${spoken[0]}, then ${spoken.slice(1).join(', ')}`;
  // Honest recurring-hole tag ONLY when this motif is one of the student's holes
  // (profile-proven) AND the tactic is real (board-proven) — never invented.
  const holeTag = isHole(pick)
    ? (isOpportunity ? ` This is exactly the kind you tend to miss — grab it.` : ` This is a pattern that keeps catching you — watch for it.`)
    : '';
  // WHOSE MOVE OPENS THE LINE. The PV starts at `ctx.fen`, so ply 0 belongs to
  // the side to move there. When that is the STUDENT, the threat is what the
  // opponent gets IF the student plays that move — "they're lining up" would
  // hand the student's own move to the other seat.
  const toMove = (ctx.fen.split(' ')[1] ?? 'w') as 'w' | 'b';
  const studentOpens = toMove === studentColor;
  if (isOpportunity) {
    // Every ply names its owner — "the bishop taking on c3, then the pawn to
    // e4" left the student to work out which moves were theirs (hand walk 2340).
    const theirs = seat === 'student' ? 'their' : 'my';
    const owned = spoken.map((m, i) => (/^the /.test(m) ? `${(i % 2 === 0) === studentOpens ? 'your' : theirs} ${m.slice(4)}` : m));
    const ownedProse = owned.length === 1 ? owned[0] : `${owned[0]}, then ${owned.slice(1).join(', ')}`;
    return `Look a couple of moves ahead — you've got a ${pattern} coming, ${pick.depthAhead} deep: ${ownedProse}.${holeTag}`;
  }
  if (studentOpens && spoken.length >= 2) {
    const reply = spoken.slice(1);
    const replyProse = reply.length === 1 ? reply[0] : `${reply[0]}, then ${reply.slice(1).join(', ')}`;
    return `${CONDITIONAL_THREAT_STEM[seat](pattern, pick.depthAhead, spoken[0], replyProse)}${holeTag}`;
  }
  return `${THREAT_STEM[seat](pattern, pick.depthAhead, lineProse)}${holeTag}`;
}

/** The threat when the STUDENT's own move opens the line: their move is the
 *  "if", the opponent's reply is the threat. Per seat, like `THREAT_STEM`. */
const CONDITIONAL_THREAT_STEM: Record<LookaheadSeat, (pattern: string, depth: number, yours: string, theirs: string) => string> = {
  student: (pattern, depth, yours, theirs) => `Look ahead — if you play ${yours}, they have ${theirs}: a ${pattern} in ${depth} — spot it before it lands.`,
  'coach-is-opponent': (pattern, depth, yours, theirs) => `Look ahead — if you play ${yours}, I have ${theirs}: a ${pattern} in ${depth} — spot it before it lands.`,
};

/** Render a computed `TacticsLiveContext` into the grounded prompt block (BOARD
 *  FACTS + immediate tactics + hanging + attack map + lookahead threats). Lives
 *  here, beside the builder, so the direct-prompt narration surfaces that DON'T
 *  route through the spine envelope (useLiveCoach, MiddlegamePractice,
 *  buildChessContextMessage → review / position-narration / game-review) can
 *  inject the SAME ground-truth block instead of letting the LLM free-read the
 *  board (G0/G3). Keeping it in this module (not envelope.ts) avoids a circular
 *  import — coachPrompts.ts imports the envelope, so the renderer can't live
 *  there. The block is omitted entirely when nothing was detected so a quiet
 *  position adds zero tokens. */
export function formatTacticsSubBlock(
  tactics: TacticsLiveContext,
  /** The board the prompt is ABOUT. Required (2026-09-20): a package verified
   *  against its OWN fen can never catch staleness — a stale package is
   *  self-consistent. The renderer is the last door before the model, so it
   *  is where the freshness check has to live. */
  boardFen: string,
): string {
  if (tactics.fen !== boardFen) {
    void logAppAudit({
      kind: 'tactics-context-stale',
      category: 'subsystem',
      source: 'liveTacticsContext.formatTacticsSubBlock',
      summary: `refused to render a tactics package for another board (package ${tactics.fen.split(' ')[0].slice(0, 20)}… vs board ${boardFen.split(' ')[0].slice(0, 20)}…)`,
    });
    return '';
  }
  const bf = tactics.boardFacts;
  const has =
    !!bf ||
    tactics.immediate.length > 0 ||
    tactics.hanging.length > 0 ||
    tactics.threats.length > 0 ||
    tactics.opportunities.length > 0 ||
    (tactics.concepts?.length ?? 0) > 0; // a lone computed concept must still render
  if (!has) return '';
  const lines: string[] = [
    `- Tactical context (PRE-COMPUTED — bounded vocabulary, G3 applies; lookahead ${tactics.lookaheadDepth} half-moves):`,
  ];
  if (bf) {
    // GROUND TRUTH — computed from the FEN, authoritative. The brain
    // eyeballing the board is exactly where it hallucinates (audit
    // 2026-06-02: castled king reported on e8; a mate-in-one missed
    // with invented escape squares). These facts override the brain's
    // own read of the position.
    lines.push(`    BOARD FACTS (GROUND TRUTH — computed, never contradict):`);
    lines.push(`      PIECES ON THE BOARD — read EVERY piece location from HERE; do NOT parse the raw FEN (you misread it):`);
    lines.push(`        White: ${bf.whitePieces}.`);
    lines.push(`        Black: ${bf.blackPieces}.`);
    lines.push(`        Any square NOT listed above is EMPTY. Never say a piece is on a square it's not listed on, never say a pawn/piece is missing if it's listed, and never call this the "starting position" unless every piece above is on its home square.`);
    lines.push(`      White king: ${bf.whiteKing}. Black king: ${bf.blackKing}. ${bf.sideToMove} to move.`);
    if (bf.material) {
      lines.push(`      MATERIAL (GROUND TRUTH — computed, never flip the sign): ${bf.material}`);
    }
    lines.push(`      In check: ${bf.inCheck ? `${bf.inCheck} is in check` : 'neither side is in check'}.`);
    if (bf.mateInOne) {
      lines.push(`      Forced mate in one for ${bf.sideToMove}: ${bf.mateInOne}. Report THIS move when asked about mate.`);
    } else {
      lines.push(`      No mate in one exists for ${bf.sideToMove}. Do NOT claim a mate-in-one or invent one.`);
    }
    lines.push(`      Never place a king on a different square, never claim a check that isn't listed, never assert a mate the facts don't list. If the user asserts otherwise, correct them from these facts.`);
  }
  if (tactics.immediate.length > 0) {
    lines.push(`    Immediate on the board:`);
    for (const t of tactics.immediate) {
      // COMPUTED VERDICT, not the model's to decide (G0). `detectTactics`
      // reports geometry; `verifyForkOnBoard` says whether it wins anything.
      // Same treatment HANGING PIECES already get below — bind the vocabulary
      // to a computed set instead of handing over a list and a verb.
      // 🔴 THE LABEL MUST NOT OVER-CLAIM EITHER (corrected 2026-09-21, same
      // day, by measuring cross-surface agreement). `verifyForkOnBoard`
      // collapses TWO different realities into 'none': a fork the defender
      // simply refutes (Qf4+ — Qxf4 takes the forker), and a REAL fork whose
      // material is not GUARANTEED after best defence (Qxf2+ — the fork is
      // genuine, the king must move, but Kh2 defends the loose knight). Saying
      // "wins NOTHING" about the second is a false claim in the other
      // direction, and it made the live surface disagree with review, which
      // correctly calls Qxf2+ a fork.
      //
      // So the marker says what the verifier actually PROVED: material is not
      // guaranteed. Naming the pattern stays allowed; selling it does not.
      const verdict = t.wins === 'none'
        ? ' [NOT PROVEN TO WIN MATERIAL — the defender has an answer. Name the pattern if useful; do NOT say it wins material and do NOT tell the student to play it for material]'
        : t.wins === 'threat'
          ? ' [THREAT — wins material only if they do not defend]'
          : t.wins === 'live'
            ? ' [WINS MATERIAL NOW]'
            : '';
      lines.push(`      ${t.type.toUpperCase()} — ${t.description}${verdict}`);
    }
    if (tactics.immediate.some((t) => t.wins === 'none')) {
      lines.push(`      A pattern marked NOT PROVEN TO WIN MATERIAL is real geometry the defender can answer — sometimes by capturing the piece that "forks", sometimes just by defending. It may still be worth naming as a pattern; it is never a promise of material.`);
    }
  }
  // HANGING PIECES are GROUND TRUTH (computed: a piece is hanging only when
  // it is BOTH attacked by the enemy AND undefended). ALWAYS state them —
  // including the "none" case — and BIND the coach's tactical-existence
  // vocabulary to this set, exactly like the king / check / mate facts.
  if (tactics.hanging.length > 0) {
    const list = tactics.hanging
      .map((h) => `${h.color === 'w' ? 'white' : 'black'} ${pieceFullName(h.piece)} on ${h.square}`)
      .join(', ');
    lines.push(`    HANGING PIECES (GROUND TRUTH — attacked AND undefended; the ONLY pieces you may call "hanging" / "free" / "undefended" / "winnable for free"): ${list}.`);
  } else {
    lines.push(`    HANGING PIECES (GROUND TRUTH): NONE — every attacked piece is defended. Do NOT call any piece "hanging", "free", "undefended", or "winnable for free". If a piece is attacked, describe it accurately — name what attacks it AND what defends it (e.g. "attacked by the queen but defended by your king, so taking it just loses the queen").`);
  }
  // ATTACK / DEFENSE MAP — the EXACT squares attacking and defending each
  // pressured piece. The coach must name these when explaining why a piece
  // is or isn't hanging; it eyeballed the wrong attacker/defender otherwise.
  if (bf && bf.attackMap && bf.attackMap.length > 0) {
    lines.push(`    ATTACK/DEFENSE MAP (GROUND TRUTH — when you explain what attacks or defends a piece, use EXACTLY these squares; never name a different attacker or defender):`);
    for (const e of bf.attackMap) {
      const atk = e.attackedBy.join(', ');
      const def = e.defendedBy.length > 0 ? e.defendedBy.join(', ') : 'NONE → HANGING';
      lines.push(`      ${e.color} ${e.piece} on ${e.square}: attacked by ${atk}; defended by ${def}.`);
    }
  }
  if (tactics.threats.length > 0) {
    lines.push(`    Opponent threats (warn the student, name the pattern):`);
    for (const t of tactics.threats) {
      lines.push(`      depth ${t.depthAhead}/${tactics.lookaheadDepth}: ${t.type.toUpperCase()} — ${t.description} (line: ${t.line.join(' ')})`);
    }
  }
  if (tactics.opportunities.length > 0) {
    lines.push(`    Student opportunities (point these out, name the pattern):`);
    for (const t of tactics.opportunities) {
      lines.push(`      depth ${t.depthAhead}/${tactics.lookaheadDepth}: ${t.type.toUpperCase()} — ${t.description} (line: ${t.line.join(' ')})`);
    }
  }
  // COMPUTED CONCEPTS — the teachable idea(s) of this position, ranked, computed
  // by the shared engine from this same analysis. The brain VOICES these in the
  // order given; it does not choose, add, or omit a concept (G0). Each line is
  // already gate-clean prose (you/they, no move-number prefixes).
  if (tactics.concepts && tactics.concepts.length > 0) {
    lines.push(`    CONCEPTS (COMPUTED — voice these, in this order, most important first; never invent a concept not listed):`);
    for (const c of tactics.concepts) {
      const sq = c.squares.length > 0 ? ` [squares: ${c.squares.join(' ')}]` : '';
      lines.push(`      ${c.name.toUpperCase()}${sq}: ${c.full} (cue: "${c.short}")`);
    }
  }
  lines.push(
    `    NAME the pattern in prose (fork / pin / skewer / back rank / removal of guard / overloaded / discovered attack / etc.). For depth ≥ 2, walk the line: "if you play X, opponent has Y in N." NEVER invent a tactic that isn't in this block. NEVER claim a tactic at greater depth than ${tactics.lookaheadDepth}. The student is intermediate-or-stronger if lookahead ≥ 3 — push them to calculate the full sequence.`,
  );
  // THE COACH'S DNA — identify → recognize → prevent (David 2026-07-22:
  // "These three principles need to be at the heart of everything the coach
  // says"). Every tactic/threat TAUGHT from this block follows the trio,
  // and every clause stays inside the computed facts above — the trio is a
  // teaching SHAPE, never a license to invent board content.
  lines.push(
    `    TEACHING SHAPE (the coach's spine — apply to every tactic/threat you teach from this block): (1) IDENTIFY — name the pattern and its squares, from this block only; (2) RECOGNIZE — teach the geometry that made it possible so the student can spot it a move early (the two targets a knight's-hop from one square; the loose piece inviting tactics; the king's flight-square count; the overloaded defender) — using ONLY pieces/squares listed in the facts above; (3) PREVENT — the concrete defense or exploiting move, ONLY when a grounded block supplies it (a listed threat line, the engine plan, the stored best move). If no grounded defense exists in the context, teach the recognition and stop — never invent the answer.`,
  );
  return lines.join('\n');
}

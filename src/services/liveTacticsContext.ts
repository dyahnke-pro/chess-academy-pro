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
  classifyPosition,
  findHangingPieces,
  scanUpcomingTactics,
} from './tacticClassifier';
import { getTacticLookahead } from './tacticAlertService';
import { stockfishEngine } from './stockfishEngine';
import type { TacticPattern, UpcomingTactic } from '../types/tacticTypes';

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
export function buildTacticsLiveContext(
  fen: string,
  analysis: StockfishAnalysis | null,
  playerColor: 'w' | 'b',
  playerRating: number,
): TacticsLiveContext {
  const lookaheadDepth = getTacticLookahead(playerRating);

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

  return {
    immediate,
    hanging,
    threats,
    opportunities,
    lookaheadDepth,
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
): Promise<TacticsLiveContext> {
  let analysis = cachedAnalysis ?? null;
  if (!analysis || analysis.topLines.length === 0) {
    analysis = await analyze(fen);
  }
  return buildTacticsLiveContext(fen, analysis, playerColor, playerRating);
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
  _playerColor: 'w' | 'b',
): TacticsLiveContext['immediate'] {
  try {
    // classifyPosition expects (fenBefore, fenAfter, san, evalBefore,
    // evalAfter). With fenBefore = fenAfter and no san, the eval-
    // swing math returns 0 (no move quality change), but the tactic
    // detectors still scan the current position for forks, pins,
    // back-rank threats, etc. Wrapped in try because chess.js is
    // strict about input. Filter out 'none' placeholders so the
    // brain envelope only carries real patterns (G3 bounded vocab).
    const result = classifyPosition(fen, fen, '', 0, 0);
    return result.tactics
      .filter((t) => t.type !== 'none')
      .map(tacticPatternToEntry);
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

function tacticPatternToEntry(t: TacticPattern): TacticsLiveContext['immediate'][number] {
  return {
    type: t.type,
    description: t.description,
    squares: t.involvedSquares,
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

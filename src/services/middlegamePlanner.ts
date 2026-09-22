/**
 * middlegamePlanner
 * -----------------
 * Converts existing middlegame-plans.json entries into ready-to-run
 * WalkthroughSessions for the Agent Coach.
 *
 * When the coach chat receives "Run me through the middlegame plans"
 * after an opening walkthrough, we:
 *
 *   1. Look up a matching plan by openingId (or closest FEN match).
 *   2. Pick the first playable line with non-empty annotations.
 *   3. Build a WalkthroughSession via walkthroughAdapter from the
 *      plan's starting FEN.
 *
 * Critically we reuse the starting FEN of the plan rather than
 * resetting to the initial position so the student's board keeps its
 * context when transitioning from opening → middlegame.
 */
import { Chess } from 'chess.js';
import middlegamePlans from '../data/middlegame-plans.json';
import { buildSession } from './walkthroughAdapter';
import { stockfishEngine } from './stockfishEngine';
import { narrateContinuationMove } from './continuationMoveNarration';
import type { WalkthroughSession } from '../types/walkthrough';
import type { OpeningMoveAnnotation } from '../types';

const STANDARD_START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FALLBACK_MAX_PLIES = 10;
const FALLBACK_DEPTH = 18;

// The JSON carries the FULL `MiddlegamePlan` shape (pawnBreaks +
// pieceManeuvers + strategicThemes + endgameTransitions). The planner
// historically used a narrowed local interface that hid those fields
// from downstream consumers — broadened to expose them so the coach
// envelope can ground the brain in the full plan. Defined alongside
// the existing canonical type in `src/types/index.ts:245`.
import type { MiddlegamePlan } from '../types';

const PLANS = middlegamePlans as unknown as MiddlegamePlan[];

/**
 * Find the best middlegame plan for a given openingId (exact match
 * preferred, or fuzzy match on opening name fragments).
 */
export function findPlanForOpening(openingId: string): MiddlegamePlan | null {
  const exact = PLANS.find((p) => p.openingId === openingId);
  if (exact) return exact;

  const lower = openingId.toLowerCase();
  const fuzzy = PLANS.find((p) =>
    p.openingId.toLowerCase().includes(lower) ||
    lower.includes(p.openingId.toLowerCase()),
  );
  return fuzzy ?? null;
}

/**
 * Chess-generic NOISE words that must NOT drive subject→plan matching.
 * The 2026-05-29 audit caught the old loose matcher resolving
 * "Latvian Gambit" (no authored plan) to the ALBIN Countergambit purely
 * on the shared word "gambit", and "Pirc" to a pro-specific tile — the
 * SAME class of confident-wrong-answer bug as the original
 * "Pirc"→"Pierce Defense" fuzzy garbage. Matching on these tokens is
 * banned; only DISTINCTIVE opening-name tokens (pirc, caro, najdorf,
 * latvian, …) count, so an opening's real identity is what resolves it.
 */
const PLAN_SUBJECT_NOISE = new Set<string>([
  'middle', 'middlegame', 'midgame', 'game', 'games', 'plan', 'plans',
  'opening', 'openings', 'defense', 'defence', 'attack', 'attacks',
  'variation', 'variations', 'system', 'line', 'lines', 'main', 'gambit',
  'countergambit', 'counter', 'the', 'and', 'for', 'with', 'teach', 'learn',
  'show', 'walk', 'through', 'want', 'continue', 'explain', 'ideas', 'idea',
  'strategy', 'plans?',
]);

/** Distinctive (non-noise, >2-char) tokens that identify an opening. */
function distinctiveTokens(subject: string): string[] {
  return subject
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !PLAN_SUBJECT_NOISE.has(t));
}

/**
 * Resolve a free-text subject (bare token like "pirc", a full
 * walkthrough name like "Pirc Defense: Austrian Attack", or even a raw
 * ask like "midgame plans caro kann") to the SET of authored plans for
 * that opening — best subject-match first. Used by the Learn-with-Coach
 * in-page middlegame-plan surface to show a picker when an opening
 * carries more than one plan (the Pirc has 8: Austrian, 150, Classical,
 * Czech, …). Empty array = no authored plan for that opening (the
 * caller then says so honestly — never a fuzzy-matched wrong opening).
 */
export function findPlansForOpening(subject: string): MiddlegamePlan[] {
  // Exact openingId wins outright.
  const exact = PLANS.find((p) => p.openingId === subject.trim().toLowerCase());
  const best = exact ?? findPlanBySubject(subject);
  if (!best) return [];
  const siblings = PLANS.filter((p) => p.openingId === best.openingId);
  // Lead with the best subject-match, keep the rest in source order.
  return [best, ...siblings.filter((p) => p.id !== best.id)];
}

/**
 * Find a plan by matching a free-text subject on DISTINCTIVE opening
 * tokens (chess noise words ignored — see PLAN_SUBJECT_NOISE). Returns
 * null when no distinctive token matches, so a subject naming an
 * opening we don't cover ("Latvian Gambit") resolves to NOTHING rather
 * than a wrong opening. Ties prefer the canonical (non-`pro-`) opening
 * so a bare "pirc" lands on the base masterclass plans, not a
 * pro-specific tile — while "gothamchess pirc" still wins the pro one
 * on the extra distinctive token.
 */
export function findPlanBySubject(subject: string): MiddlegamePlan | null {
  if (!subject.trim()) return null;
  const tokens = distinctiveTokens(subject);
  if (tokens.length === 0) return null;

  // A plan you can actually teach (has a usable playable line) beats a
  // data-only tile plan on a score tie — otherwise a free-text subject can
  // resolve to a plan that builds no session (e.g. the older pro-* tiles).
  const hasLine = (p: MiddlegamePlan): boolean =>
    (p.playableLines ?? []).some((l) => l.moves.length > 0 && l.annotations.length === l.moves.length);
  const isPro = (p: MiddlegamePlan): boolean => p.openingId.startsWith('pro-');

  let best: { plan: MiddlegamePlan; score: number; teachable: boolean; pro: boolean } | null = null;
  for (const plan of PLANS) {
    const blob = `${plan.openingId} ${plan.title} ${plan.overview ?? ''}`.toLowerCase();
    const score = tokens.reduce((s, t) => (blob.includes(t) ? s + 1 : s), 0);
    if (score === 0) continue;
    const teachable = hasLine(plan);
    const pro = isPro(plan);
    const better =
      !best ||
      score > best.score ||
      // Same score: prefer canonical (non-pro), then teachable.
      (score === best.score && best.pro && !pro) ||
      (score === best.score && best.pro === pro && teachable && !best.teachable);
    if (better) best = { plan, score, teachable, pro };
  }
  return best?.plan ?? null;
}

/**
 * Build a WalkthroughSession from a middlegame plan. If the plan has
 * no usable playable line, returns null.
 */
export function sessionFromPlan(
  plan: MiddlegamePlan,
  options: { orientation?: 'white' | 'black' } = {},
): WalkthroughSession | null {
  const line = (plan.playableLines ?? []).find(
    (l) => l.moves.length > 0 && l.annotations.length === l.moves.length,
  );
  if (!line) return null;

  const pgn = line.moves.join(' ');
  const annotations = line.moves.map((san, i) => ({
    san,
    annotation: line.annotations[i] ?? '',
    arrows: line.arrows?.[i],
  }));

  const session = buildSession({
    title: plan.title,
    subtitle: line.title ?? 'Middlegame plan',
    pgn,
    startFen: line.fen,
    annotations,
    orientation: options.orientation ?? 'white',
    kind: 'middlegame',
    source: `middlegame-plans.json:${plan.id}`,
  });

  return session;
}

/**
 * Convenience: resolve a session from either openingId or free-text
 * subject in one call.
 */
export function resolveMiddlegameSession(options: {
  openingId?: string;
  subject?: string;
  orientation?: 'white' | 'black';
}): WalkthroughSession | null {
  const plan =
    (options.openingId && findPlanForOpening(options.openingId)) ||
    (options.subject && findPlanBySubject(options.subject)) ||
    null;
  if (!plan) return null;
  return sessionFromPlan(plan, { orientation: options.orientation });
}

// ─── Stockfish fallback ─────────────────────────────────────────────

export interface ResolveMiddlegameOptions {
  openingId?: string;
  subject?: string;
  orientation?: 'white' | 'black';
  /** Starting FEN for the fallback session (defaults to standard start). */
  fen?: string;
}

/**
 * Like `resolveMiddlegameSession` but always returns a session: if no
 * database plan matches, generates one from Stockfish's principal
 * variation at the given FEN, capped at FALLBACK_MAX_PLIES plies, then
 * narrates the line via a single batched LLM call.
 *
 * This is async because it runs Stockfish + a network-bound LLM call.
 * Returns null only when both the DB lookup and the engine fallback
 * fail (e.g. engine unavailable in tests with a bad FEN).
 */
export async function resolveMiddlegameSessionWithFallback(
  options: ResolveMiddlegameOptions,
): Promise<WalkthroughSession | null> {
  const db = resolveMiddlegameSession({
    openingId: options.openingId,
    subject: options.subject,
    orientation: options.orientation,
  });
  if (db) return db;

  return buildStockfishFallbackSession(options);
}

/**
 * Stockfish-derived fallback: analyse the FEN, take the principal
 * variation, convert each UCI move to SAN so chess.js is the truth
 * for notation, and COMPUTE the why behind each move of the line
 * (narrateContinuationMove — G0, WO-STANDARD-01 F3; this used to be one
 * batched chat call asking the model to "explain the idea" of each engine
 * move, board-graded on the way back).
 */
async function buildStockfishFallbackSession(
  options: ResolveMiddlegameOptions,
): Promise<WalkthroughSession | null> {
  const startFen = options.fen ?? STANDARD_START_FEN;
  let chess: Chess;
  try {
    chess = new Chess(startFen);
  } catch {
    return null;
  }

  let pvUciMoves: string[];
  try {
    const analysis = await stockfishEngine.queueAnalysis(startFen, FALLBACK_DEPTH);
    pvUciMoves = analysis.topLines[0]?.moves ?? [];
  } catch (err: unknown) {
    console.warn('[middlegamePlanner] stockfish fallback failed:', err);
    return null;
  }

  if (pvUciMoves.length === 0) return null;

  // Convert UCI → SAN using chess.js (which is the canonical truth).
  // Cap at FALLBACK_MAX_PLIES so the session stays digestible and we
  // don't blow the LLM context with long lines.
  const sanMoves: string[] = [];
  const probe = new Chess(startFen);
  for (const uci of pvUciMoves) {
    if (sanMoves.length >= FALLBACK_MAX_PLIES) break;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
    let move;
    try {
      move = probe.move({ from, to, promotion });
    } catch {
      move = null;
    }
    if (!move) break;
    sanMoves.push(move.san);
  }

  if (sanMoves.length === 0) return null;

  // The why behind every move of the engine's line, computed from the board
  // as the line is replayed — the in-game register, every clause true of
  // THIS move on THIS board (David 2026-07-19: "the lines come from
  // stockfish best moves… we need the why stated behind the best moves").
  const narrations = narratePvLine(startFen, sanMoves);

  // Build annotations array keyed to each move; a ply the computer had
  // nothing to say about keeps the bare SAN rather than filler.
  const annotations: OpeningMoveAnnotation[] = sanMoves.map((san, i) => ({
    san,
    annotation: narrations[i] || `${san}.`,
  }));

  const subtitle = options.subject
    ? `From "${options.subject}"`
    : startFen === STANDARD_START_FEN
      ? 'From the starting position'
      : 'From the current position';

  return buildSession({
    title: 'Engine-suggested plan',
    subtitle,
    pgn: sanMoves.join(' '),
    startFen,
    annotations,
    orientation: options.orientation ?? (chess.turn() === 'w' ? 'white' : 'black'),
    kind: 'middlegame',
    source: 'middlegamePlanner:stockfish-fallback',
  });
}

/**
 * One computed sentence per move of the PV, replayed from `fen` so each
 * sentence describes the board it is spoken on. Same length as `sanMoves`;
 * an entry is '' only when the replay breaks at that ply.
 */
export function narratePvLine(fen: string, sanMoves: string[]): string[] {
  const out: string[] = [];
  let replay: Chess;
  try {
    replay = new Chess(fen);
  } catch {
    return sanMoves.map(() => '');
  }
  for (const san of sanMoves) {
    const fenBefore = replay.fen();
    let mv;
    try {
      mv = replay.move(san);
    } catch {
      mv = null;
    }
    if (!mv) {
      out.push('');
      continue;
    }
    try {
      out.push(narrateContinuationMove(fenBefore, replay.fen(), mv.san, mv.from, mv.to).say);
    } catch {
      out.push('');
    }
  }
  return out;
}

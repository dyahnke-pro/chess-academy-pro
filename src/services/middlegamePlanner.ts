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
import middlegamePlans from '../data/middlegame-plans.json';
import { buildSession } from './walkthroughAdapter';
import type { WalkthroughSession } from '../types/walkthrough';
import type { AnnotationArrow } from '../types';

interface PlayableLine {
  fen: string;
  moves: string[];
  annotations: string[];
  arrows?: AnnotationArrow[][];
  title?: string;
}

interface MiddlegamePlan {
  id: string;
  openingId: string;
  criticalPositionFen: string;
  title: string;
  overview: string;
  playableLines?: PlayableLine[];
}

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
 * Find a plan by matching a free-text subject (e.g. "italian" →
 * mp-italian-d4). Falls back to null if no match.
 */
export function findPlanBySubject(subject: string): MiddlegamePlan | null {
  if (!subject.trim()) return null;
  const tokens = subject
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (tokens.length === 0) return null;

  let best: { plan: MiddlegamePlan; score: number } | null = null;
  for (const plan of PLANS) {
    const blob = `${plan.openingId} ${plan.title} ${plan.overview}`.toLowerCase();
    const score = tokens.reduce((s, t) => (blob.includes(t) ? s + 1 : s), 0);
    if (score > 0 && (!best || score > best.score)) {
      best = { plan, score };
    }
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

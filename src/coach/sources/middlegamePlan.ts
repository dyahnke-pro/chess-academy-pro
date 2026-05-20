/**
 * Middlegame-plan source — pulls the named strategic plan for a
 * known opening from `src/data/middlegame-plans.json` (180 plans
 * across the canonical opening repertoire) and shapes it into a
 * compact envelope sub-block.
 *
 * Each plan carries: title, overview prose, the critical-position
 * FEN where the middlegame really starts, strategic themes (3-5
 * sentences each), pawn-break candidates with explanations, piece
 * maneuvers with routes + rationale, endgame transitions. This is
 * exactly the kind of strategic context the coach LLM needs to
 * answer "what's the plan here?" or "what should I play next?"
 * without freestyling positional prose.
 *
 * Gate: opening must be known (slug derived from `lichessSnapshot.name`
 * or `moveHistory`) AND have a matching entry in middlegame-plans.json.
 * Phase is NOT gated — even a move-5 question about plans is a valid
 * use of this data.
 *
 * Token budget: the full plan can be ~2KB. We ship the title +
 * overview + the first strategic theme + first pawn break + first
 * maneuver. The brain has tools to pull deeper detail if it needs
 * the full plan.
 */
import type { LiveMiddlegamePlan } from '../types';
import { findPlanForOpening } from '../../services/middlegamePlanner';
import { detectOpening } from '../../services/openingDetectionService';

function openingNameToId(name: string): string {
  const base = name.split(':')[0].trim();
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Build the middlegame-plan sub-block when a matching plan exists.
 *  Returns null when no plan is registered for the resolved opening. */
export function loadMiddlegamePlanForLive(args: {
  openingName?: string | null;
  moveHistory: string[];
}): LiveMiddlegamePlan | null {
  let { openingName } = args;
  // Treat bare ECO codes ("B01", "C50") as null so detectOpening
  // takes over — surfaces sometimes pass game.eco when the
  // classified name isn't handy.
  if (openingName && /^[A-E]\d{2}$/.test(openingName.trim())) {
    openingName = null;
  }
  if (!openingName && args.moveHistory.length > 0) {
    const detected = detectOpening(args.moveHistory);
    if (detected?.name) openingName = detected.name;
  }
  if (!openingName) return null;

  const openingId = openingNameToId(openingName);
  if (!openingId) return null;

  // Plan corpus uses British spellings ("french-defence", "kings-
  // indian-defence", "caro-kann") in some entries. The slugifier
  // produces American ("french-defense"). Try both and a no-suffix
  // variant so the lookup hits regardless of which spelling the
  // curator used.
  const candidates = [openingId];
  if (openingId.endsWith('-defense')) candidates.push(openingId.replace(/-defense$/, '-defence'));
  if (openingId.endsWith('-defence')) candidates.push(openingId.replace(/-defence$/, '-defense'));
  // Also try without the "-defense"/"-defence" suffix entirely for
  // entries that use the short form (e.g. "caro-kann" not
  // "caro-kann-defense").
  const stripped = openingId.replace(/-defen[cs]e$/, '');
  if (stripped !== openingId) candidates.push(stripped);
  let plan = null;
  for (const id of candidates) {
    plan = findPlanForOpening(id);
    if (plan) break;
  }
  if (!plan) return null;

  return {
    id: plan.id,
    openingId: plan.openingId,
    title: plan.title,
    overview: plan.overview,
    criticalPositionFen: plan.criticalPositionFen ?? null,
    strategicThemes: plan.strategicThemes ?? [],
    pawnBreaks: (plan.pawnBreaks ?? []).map((b) => ({
      move: b.move,
      explanation: b.explanation,
    })),
    pieceManeuvers: (plan.pieceManeuvers ?? []).map((m) => ({
      piece: m.piece,
      route: m.route,
      explanation: m.explanation,
    })),
    endgameTransitions: plan.endgameTransitions ?? [],
  };
}

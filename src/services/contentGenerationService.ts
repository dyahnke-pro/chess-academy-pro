import { db } from '../db/schema';
import { fetchLichessExplorer } from './lichessExplorerService';
import { voiceFacts } from './coachApi';
import type {
  GeneratedContent,
  GeneratedContentType,
  LichessExplorerResult,
  MiddlegamePlan,
  OpeningRecord,
} from '../types';

// ─── Cache Helpers ──────────────────────────────────────────────────────────

const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function getCachedContent(
  openingId: string,
  type: GeneratedContentType,
): Promise<GeneratedContent | undefined> {
  // Try the compound index first. On older schema versions the
  // `[openingId+type]` index doesn't exist and Dexie THROWS — which
  // used to bubble all the way out of generateSidelineExplanation and
  // show the user "Could not generate explanation. Try again later."
  // Swallow the throw and fall through to a manual filter.
  try {
    const results = await db.generatedContent
      .where('[openingId+type]')
      .equals([openingId, type])
      .toArray();
    if (results.length > 0) {
      const match = results[0];
      const age = Date.now() - new Date(match.generatedAt).getTime();
      return age < CACHE_DURATION_MS ? match : undefined;
    }
  } catch {
    // Compound index unavailable — fall through to manual filter.
  }

  try {
    const all = await db.generatedContent
      .where('openingId')
      .equals(openingId)
      .toArray();
    const match = all.find((r) => r.type === type);
    if (!match) return undefined;
    const age = Date.now() - new Date(match.generatedAt).getTime();
    return age < CACHE_DURATION_MS ? match : undefined;
  } catch {
    return undefined;
  }
}

async function storeContent(
  openingId: string,
  type: GeneratedContentType,
  content: string,
  groundingData: string,
): Promise<void> {
  const record: GeneratedContent = {
    id: `${openingId}-${type}-${Date.now()}`,
    openingId,
    type,
    content,
    groundingData,
    generatedAt: new Date().toISOString(),
  };
  await db.generatedContent.put(record);
}

// ─── Grounding Data Fetchers ────────────────────────────────────────────────

interface GroundingData {
  explorerData: LichessExplorerResult | null;
  topMoves: string;
  gameStats: string;
}

async function fetchGroundingData(fen: string): Promise<GroundingData> {
  let explorerData: LichessExplorerResult | null = null;
  try {
    explorerData = await fetchLichessExplorer(fen, 'lichess');
  } catch {
    // Lichess explorer may be unavailable
  }

  let topMoves = 'No explorer data available.';
  let gameStats = '';

  if (explorerData) {
    const total = explorerData.white + explorerData.draws + explorerData.black;
    gameStats = `Total games in database: ${total}. White wins: ${explorerData.white} (${total > 0 ? Math.round((explorerData.white / total) * 100) : 0}%), Draws: ${explorerData.draws} (${total > 0 ? Math.round((explorerData.draws / total) * 100) : 0}%), Black wins: ${explorerData.black} (${total > 0 ? Math.round((explorerData.black / total) * 100) : 0}%).`;

    if (explorerData.moves.length > 0) {
      topMoves = explorerData.moves.slice(0, 5).map((m) => {
        const moveTotal = m.white + m.draws + m.black;
        const whiteWinPct = moveTotal > 0 ? Math.round((m.white / moveTotal) * 100) : 0;
        return `${m.san}: ${moveTotal} games, ${whiteWinPct}% white wins, avg rating ${m.averageRating}`;
      }).join('\n');
    }
  }

  return { explorerData, topMoves, gameStats };
}

// ─── LLM-Grounded Generation ────────────────────────────────────────────────

/**
 * Generate a middlegame plan explanation grounded in Lichess data.
 * Returns the LLM-generated text or a cached version if available.
 */
export async function generateMiddlegamePlanAnalysis(
  opening: OpeningRecord,
  plan: MiddlegamePlan,
): Promise<string> {
  const cached = await getCachedContent(opening.id, 'middlegame_plan');
  if (cached) return cached.content;

  const grounding = await fetchGroundingData(plan.criticalPositionFen);

  // GROUNDED (David 2026-07-09: one LLM command). The plan's AUTHORED fields
  // (title, overview, pawn-break + maneuver explanations, themes) ARE the facts,
  // plus the real Lichess continuations. voiceFacts weaves them and adds nothing
  // — no free "why/counterplay" reasoning to invent, no board-claim gate needed.
  const facts = [
    `Middlegame plan for the ${opening.name}: "${plan.title}".`,
    plan.overview ? plan.overview : '',
    ...plan.pawnBreaks.map((b) => `Pawn break ${b.move}: ${b.explanation}`),
    ...plan.pieceManeuvers.map((m) => `Maneuver — the ${m.piece} via ${m.route}: ${m.explanation}`),
    ...plan.strategicThemes.map((t) => `Theme: ${t}`),
    grounding.topMoves ? `Most-played continuations from this position:\n${grounding.topMoves}` : '',
  ].filter(Boolean).join('\n');

  const result = (await voiceFacts(facts, { intent: 'middlegame-plan', warm: true })) ?? facts;
  await storeContent(opening.id, 'middlegame_plan', result, JSON.stringify(grounding));
  return result;
}

/**
 * Generate a sideline explanation grounded in Lichess explorer data.
 */
export async function generateSidelineExplanation(
  opening: OpeningRecord,
  sidelinePgn: string,
  sidelineName: string,
  fen: string,
): Promise<string> {
  const cacheKey = `${opening.id}-sideline-${sidelineName}`;
  const cached = await getCachedContent(cacheKey, 'sideline_explanation');
  if (cached) return cached.content;

  const grounding = await fetchGroundingData(fen);

  // GROUNDED (David 2026-07-09: one LLM command). Voice the AUTHORED variation
  // explanation where the opening data has one for this sideline (rich), plus
  // the real Lichess results + continuations. voiceFacts adds nothing — the old
  // free "why/common-mistakes" reasoning (a hallucination surface with no board
  // gate on the invented squares) is gone.
  const authored = (opening.variations ?? []).find(
    (v) => v.name.toLowerCase() === sidelineName.toLowerCase(),
  )?.explanation;
  const facts = [
    `Sideline in the ${opening.name}: "${sidelineName}" (moves ${sidelinePgn}).`,
    authored ? authored : '',
    grounding.gameStats ? `Database results here: ${grounding.gameStats}` : '',
    grounding.topMoves ? `Most-played responses from this position:\n${grounding.topMoves}` : '',
  ].filter(Boolean).join('\n');

  const result = (await voiceFacts(facts, { intent: 'sideline-explanation', warm: true })) ?? facts;
  // Cache writes must not break the user-visible explanation — if the
  // Dexie put fails (quota, schema drift) we still return the text.
  try {
    await storeContent(cacheKey, 'sideline_explanation', result, JSON.stringify(grounding));
  } catch (err: unknown) {
    console.warn('[contentGeneration] sideline cache write failed:', err);
  }
  return result;
}

/**
 * Generate a deep annotation for a critical moment in a model game,
 * grounded in position data from Lichess.
 */
export async function generateModelGameAnnotation(
  openingName: string,
  fen: string,
  _pgn: string,
  moveNumber: number,
  white: string,
  black: string,
): Promise<string> {
  const grounding = await fetchGroundingData(fen);

  // GROUNDED (David 2026-07-09: one LLM command). The annotation voices the real
  // Lichess results + continuations at this position — no free reasoning about
  // "what makes it critical" to invent. voiceFacts adds nothing.
  const facts = [
    `Position from ${white} versus ${black} at move ${moveNumber}, in the ${openingName}.`,
    grounding.gameStats ? `Database results here: ${grounding.gameStats}` : '',
    grounding.topMoves ? `Most-played continuations from this position:\n${grounding.topMoves}` : '',
  ].filter(Boolean).join('\n');

  return (await voiceFacts(facts, { intent: 'model-game-annotation', warm: true })) ?? facts;
}

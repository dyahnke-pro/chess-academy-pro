import { db } from '../db/schema';
import { fetchLichessExplorer } from './lichessExplorerService';
import { getCoachCommentary } from './coachApi';
import type {
  CoachContext,
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
  const results = await db.generatedContent
    .where('[openingId+type]')
    .equals([openingId, type])
    .toArray();

  if (results.length === 0) {
    // Fallback: filter manually (compound index may not exist on older schemas)
    const all = await db.generatedContent
      .where('openingId')
      .equals(openingId)
      .toArray();
    const match = all.find((r) => r.type === type);
    if (!match) return undefined;
    const age = Date.now() - new Date(match.generatedAt).getTime();
    return age < CACHE_DURATION_MS ? match : undefined;
  }

  const match = results[0];
  const age = Date.now() - new Date(match.generatedAt).getTime();
  return age < CACHE_DURATION_MS ? match : undefined;
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

  const context: CoachContext = {
    fen: plan.criticalPositionFen,
    lastMoveSan: null,
    moveNumber: 15,
    pgn: opening.pgn,
    openingName: opening.name,
    stockfishAnalysis: null,
    playerMove: null,
    moveClassification: null,
    playerProfile: { rating: 1400, weaknesses: [] },
    additionalContext: `You are analyzing the middlegame plans for the ${opening.name}.

GROUNDING DATA (from Lichess game database — use ONLY this data for statistics):
${grounding.gameStats}

Top continuation moves from this position:
${grounding.topMoves}

The plan being studied: "${plan.title}"
Strategic themes: ${plan.strategicThemes.join(', ')}
Pawn breaks available: ${plan.pawnBreaks.map((b) => b.move).join(', ')}
Piece maneuvers: ${plan.pieceManeuvers.map((m) => `${m.piece}: ${m.route}`).join(', ')}

Provide a detailed explanation of this middlegame plan. Explain:
1. WHY each pawn break works (referencing the game statistics where relevant)
2. HOW the piece maneuvers support the plan
3. WHAT the opponent's best counterplay is and how to handle it
4. WHEN to transition to an endgame

Be specific and reference actual moves and squares. Do NOT invent statistics — use only the data provided above.`,
  };

  const result = await getCoachCommentary('middlegame_plan_generation', context);
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

  const context: CoachContext = {
    fen,
    lastMoveSan: null,
    moveNumber: 5,
    pgn: sidelinePgn,
    openingName: opening.name,
    stockfishAnalysis: null,
    playerMove: null,
    moveClassification: null,
    playerProfile: { rating: 1400, weaknesses: [] },
    additionalContext: `You are explaining a sideline in the ${opening.name}.

GROUNDING DATA (from Lichess game database):
${grounding.gameStats}

Top moves from this position:
${grounding.topMoves}

Sideline being studied: "${sidelineName}"
Moves: ${sidelinePgn}

Explain:
1. WHY the opponent plays this sideline (what are they hoping for?)
2. What is the BEST response and why (reference the Lichess statistics)
3. What common MISTAKES do players make against this sideline?
4. What is the resulting position's character?

Be concise (3-4 paragraphs). Use ONLY the provided statistics. Do not invent game data.`,
  };

  const result = await getCoachCommentary('sideline_explanation', context);
  await storeContent(cacheKey, 'sideline_explanation', result, JSON.stringify(grounding));
  return result;
}

/**
 * Generate a deep annotation for a critical moment in a model game,
 * grounded in position data from Lichess.
 */
export async function generateModelGameAnnotation(
  openingName: string,
  fen: string,
  pgn: string,
  moveNumber: number,
  white: string,
  black: string,
): Promise<string> {
  const grounding = await fetchGroundingData(fen);

  const context: CoachContext = {
    fen,
    lastMoveSan: null,
    moveNumber,
    pgn,
    openingName,
    stockfishAnalysis: null,
    playerMove: null,
    moveClassification: null,
    playerProfile: { rating: 1400, weaknesses: [] },
    additionalContext: `You are annotating a critical moment in the game ${white} vs ${black}.

GROUNDING DATA (from Lichess game database for this position):
${grounding.gameStats}

Top moves from this position:
${grounding.topMoves}

Explain this critical moment in 2-3 sentences. Focus on:
- What makes this position critical
- What the key decision is
- How this connects to the opening's typical middlegame themes

Use the Lichess data to support your analysis. Be specific about moves and plans.`,
  };

  return getCoachCommentary('model_game_annotation', context);
}

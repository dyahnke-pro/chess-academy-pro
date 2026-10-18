import { db } from '../db/schema';
import { fetchLichessExplorer } from './lichessExplorerService';
import { voiceFacts } from './coachApi';
import type {
  GeneratedContent,
  GeneratedContentType,
  LichessExplorerResult,
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
    const pct = (n: number): number => (total > 0 ? Math.round((n / total) * 100) : 0);
    gameStats = total > 0
      ? `This position has been reached in ${total.toLocaleString('en-US')} games: White wins ${pct(explorerData.white)}%, ${pct(explorerData.draws)}% are drawn, and Black wins ${pct(explorerData.black)}%.`
      : '';

    // A BAR, never a cap (G4.5): every reply played in at least 5% of the
    // games here, however many that is — the old top-5 slice stopped at five
    // regardless of worth.
    const replies = explorerData.moves.filter((m) => total > 0 && (m.white + m.draws + m.black) / total >= 0.05);
    if (replies.length > 0) {
      const named = replies.map((m) => {
        const n = m.white + m.draws + m.black;
        return `${m.san} (${n.toLocaleString('en-US')} games, White scoring ${n > 0 ? Math.round(((m.white + m.draws / 2) / n) * 100) : 0}%)`;
      });
      topMoves = `The most-played replies here are ${named.length === 1 ? named[0] : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`}.`;
    } else {
      topMoves = '';
    }
  }

  return { explorerData, topMoves, gameStats };
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
  const cacheKey = `${opening.id}-sideline-v2-${sidelineName}`;
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
  // COMPUTED PROSE SPEAKS (2026-10-18, David: narration computed-only): the
  // explanation is assembled here as finished sentences and spoken as is —
  // no model rewrite between the verified facts and the student.
  const facts = [
    `${sidelineName}, a sideline of the ${opening.name}: ${sidelinePgn}.`,
    authored ? authored : '',
    grounding.gameStats,
    grounding.topMoves === 'No explorer data available.' ? '' : grounding.topMoves,
  ].filter(Boolean).join(' ');

  const result = (await voiceFacts(facts, { intent: 'sideline-explanation', preferRaw: true })) ?? facts;
  // Cache writes must not break the user-visible explanation — if the
  // Dexie put fails (quota, schema drift) we still return the text.
  try {
    await storeContent(cacheKey, 'sideline_explanation', result, JSON.stringify(grounding));
  } catch (err: unknown) {
    console.warn('[contentGeneration] sideline cache write failed:', err);
  }
  return result;
}

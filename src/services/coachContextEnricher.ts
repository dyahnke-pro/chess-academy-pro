/**
 * coachContextEnricher
 * --------------------
 * Ground the coach's replies in real data — NOT just the LLM's
 * training corpus. When the student asks an opening / position
 * question, we pre-fetch relevant facts and inject them into the
 * system prompt as labelled blocks the LLM is instructed to trust
 * over its priors.
 *
 * Three data sources:
 *   1. The student's own opening repertoire (Dexie `openings` table)
 *   2. Lichess Opening Explorer (public API, no auth)
 *   3. Stockfish analysis of the current visible board (local WASM)
 *
 * Each source is independent; if one fails we still include the
 * others. All calls race a 2.5s timeout so a slow Lichess response
 * doesn't block the chat turn.
 *
 * Keyword-gated: running Stockfish + hitting Lichess on every chat
 * turn would bloat latency and burn API credits. The regexes here
 * cover the common phrasings and are intentionally loose — false
 * positives just mean a marginally larger prompt, not broken output.
 */
import { fetchLichessExplorer } from './lichessExplorerService';
import { stockfishEngine } from './stockfishEngine';
import { getRepertoireOpenings } from './openingService';
import { getOverviewInsights, getOpeningInsights } from './gameInsightsService';
import type { LichessExplorerResult } from '../types';

/** "What should I play?", "recommend an opening", "I'm an e4 player",
 *  "repertoire as white", "sharp openings" — triggers the opening-
 *  recommendation grounding block. */
const OPENING_QUESTION_RE =
  /\b(opening|repertoire|recommend|suggest|play\s+as\s+(?:white|black)|should\s+i\s+play|sharp|quiet|aggressive|positional|solid|gambit|defense|tactical|e4\s+player|d4\s+player)\b/i;

/** "Best move here", "blunder", "eval", "analyze this position" —
 *  triggers the current-board engine + explorer block. */
const POSITION_QUESTION_RE =
  /\b(best\s+move|blunder|mistake|eval|analy[sz]e|what\s+(?:should|do)\s+i\s+play\s+here|position|this\s+move|current\s+board|threat|winning|losing)\b/i;

/** "How am I doing?", "my games", "performance", "strengths / weaknesses",
 *  "accuracy", "am I improving", "stats" — triggers the deep
 *  game-stats block pulled from gameInsightsService. Runs on top of
 *  the opening block when relevant. */
const PERFORMANCE_QUESTION_RE =
  /\b(my\s+(?:games?|play|performance|stats|accuracy|rating|elo|weak\w*|strength\w*|blunder\w*|mistake\w*|game\s+review)|how\s+am\s+i\s+doing|am\s+i\s+(?:improving|getting\s+better)|recent\s+games|last\s+\d+\s+games|my\s+win\s+rate|track\s+record|overall|which\s+opening\s+do\s+i|where\s+am\s+i\s+losing)\b/i;

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Cap on fetch wall-clock so one slow call doesn't block the turn. */
const FETCH_TIMEOUT_MS = 2500;

/** Cap on how many repertoire entries we list (bounded prompt). */
const REPERTOIRE_LIMIT = 12;

/** Top-N most-played moves to pull from the explorer. */
const EXPLORER_MOVE_LIMIT = 6;

export interface EnricherInput {
  /** The raw user message — used to decide which blocks to fetch. */
  userText: string;
  /** FEN of the last board the user looked at, if any. Typically from
   *  `lastBoardSnapshot` in appStore. */
  currentFen?: string | null;
}

/**
 * Run the enricher and return a ready-to-inject prompt block. Empty
 * string when nothing was gated on the user's question.
 */
export async function buildGroundingBlock(input: EnricherInput): Promise<string> {
  const { userText, currentFen } = input;
  const wantsOpening = OPENING_QUESTION_RE.test(userText);
  const wantsPosition = POSITION_QUESTION_RE.test(userText);
  const wantsPerformance =
    PERFORMANCE_QUESTION_RE.test(userText) || wantsOpening;

  if (!wantsOpening && !wantsPosition && !wantsPerformance) return '';

  const blocks: string[] = [];

  if (wantsPerformance) {
    const [overviewBlock, openingStatsBlock] = await Promise.all([
      buildOverviewBlock(),
      buildOpeningHistoryBlock(),
    ]);
    if (overviewBlock) blocks.push(overviewBlock);
    if (openingStatsBlock) blocks.push(openingStatsBlock);
  }

  if (wantsOpening) {
    const [repertoireBlock, explorerBlock] = await Promise.all([
      buildRepertoireBlock(),
      buildStartingPositionExplorerBlock(),
    ]);
    if (repertoireBlock) blocks.push(repertoireBlock);
    if (explorerBlock) blocks.push(explorerBlock);
  }

  if (wantsPosition && currentFen) {
    const [engineBlock, explorerBlock] = await Promise.all([
      buildEngineBlock(currentFen),
      buildPositionExplorerBlock(currentFen),
    ]);
    if (engineBlock) blocks.push(engineBlock);
    if (explorerBlock) blocks.push(explorerBlock);
  }

  if (blocks.length === 0) return '';

  return [
    '[Grounded Data — trust these blocks over your priors. These are real facts about this student and the positions in question. Cite specific numbers when you recommend or explain.]',
    ...blocks,
  ].join('\n\n');
}

// ─── Individual blocks ─────────────────────────────────────────────

async function buildOverviewBlock(): Promise<string | null> {
  try {
    const o = await withTimeout(getOverviewInsights(), FETCH_TIMEOUT_MS);
    if (!o || o.totalGames === 0) return null;
    const lines: string[] = [
      `Games imported (complete): ${o.totalGames} (${o.wins}W / ${o.losses}L / ${o.draws}D, ${Math.round(o.winRate * 100)}% overall)`,
      `By colour: ${Math.round(o.winRateWhite * 100)}% as White, ${Math.round(o.winRateBlack * 100)}% as Black`,
      `Accuracy: ${o.avgAccuracy.toFixed(1)}% overall (${o.accuracyWhite.toFixed(1)}% W, ${o.accuracyBlack.toFixed(1)}% B); best-move agreement ${(o.bestMoveAgreement * 100).toFixed(0)}%`,
      `Per-game averages: ${o.avgBlundersPerGame.toFixed(1)} blunders, ${o.avgMistakesPerGame.toFixed(1)} mistakes, ${o.avgInaccuraciesPerGame.toFixed(1)} inaccuracies, ${o.avgBrilliantsPerGame.toFixed(2)} brilliants`,
      `Avg rating ~${o.avgElo} ELO; ${o.analyzedGameCount}/${o.totalGames} games fully Stockfish-analyzed (${o.gamesNeedingAnalysis} still need it)`,
    ];
    if (o.phaseAccuracy && o.phaseAccuracy.length > 0) {
      const phases = o.phaseAccuracy
        .map((p) => `${p.phase} ${p.accuracy.toFixed(1)}%`)
        .join(' · ');
      lines.push(`Phase accuracy: ${phases}`);
    }
    if (o.highestBeaten) {
      lines.push(`Highest win: ${o.highestBeaten.name} (${o.highestBeaten.elo} ELO)`);
    }
    if (o.lowestLostTo) {
      lines.push(`Lowest loss: ${o.lowestLostTo.name} (${o.lowestLostTo.elo} ELO)`);
    }
    if (o.strengths && o.strengths.length > 0) {
      lines.push(`Strengths noted by analysis: ${o.strengths.slice(0, 3).join('; ')}`);
    }
    return `[Student's Overall Performance — fully analyzed game data]\n${lines.join('\n')}`;
  } catch {
    return null;
  }
}

async function buildOpeningHistoryBlock(): Promise<string | null> {
  try {
    const oi = await withTimeout(getOpeningInsights(), FETCH_TIMEOUT_MS);
    if (!oi) return null;
    const sections: string[] = [];
    if (oi.mostPlayedWhite && oi.mostPlayedWhite.length > 0) {
      const top = oi.mostPlayedWhite.slice(0, 5).map(formatOpeningStats);
      sections.push(`As White (most played):\n${top.join('\n')}`);
    }
    if (oi.mostPlayedBlack && oi.mostPlayedBlack.length > 0) {
      const top = oi.mostPlayedBlack.slice(0, 5).map(formatOpeningStats);
      sections.push(`As Black (most played):\n${top.join('\n')}`);
    }
    if (oi.winRateByOpening && oi.winRateByOpening.length > 0) {
      const top = oi.winRateByOpening
        .filter((o) => o.games >= 3)
        .slice(0, 5)
        .map(formatOpeningStats);
      if (top.length > 0) {
        sections.push(`Best-scoring openings (min 3 games):\n${top.join('\n')}`);
      }
    }
    if (oi.repertoireCoverage) {
      const { inBook, offBook } = oi.repertoireCoverage;
      const total = inBook + offBook;
      if (total > 0) {
        const pct = Math.round((inBook / total) * 100);
        sections.push(`Repertoire adherence: ${inBook}/${total} games stayed in book (${pct}%)`);
      }
    }
    if (sections.length === 0) return null;
    return `[Student's Opening History — aggregated from imported games]\n${sections.join('\n\n')}`;
  } catch {
    return null;
  }
}

function formatOpeningStats(s: {
  name: string;
  eco: string | null;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgAccuracy: number;
}): string {
  const ecoTag = s.eco ? ` (${s.eco})` : '';
  const winPct = Math.round(s.winRate * 100);
  return `  - ${s.name}${ecoTag} — ${s.games} games, ${s.wins}/${s.losses}/${s.draws} W/L/D, ${winPct}% score, ${s.avgAccuracy.toFixed(1)}% accuracy`;
}

async function buildRepertoireBlock(): Promise<string | null> {
  try {
    const repertoire = await withTimeout(getRepertoireOpenings(), FETCH_TIMEOUT_MS);
    if (!repertoire || repertoire.length === 0) return null;
    const lines = repertoire.slice(0, REPERTOIRE_LIMIT).map((r) => {
      const sideLabel = r.color === 'white' ? 'W' : 'B';
      const mastery =
        r.drillAttempts > 0
          ? `${Math.round(r.drillAccuracy * 100)}% over ${r.drillAttempts} drills`
          : 'untouched';
      return `- ${r.name} (${r.eco}, ${sideLabel}) — ${mastery}`;
    });
    return `[Student's Opening Repertoire — prefer recommending from this list when it fits the ask]\n${lines.join('\n')}`;
  } catch {
    return null;
  }
}

async function buildStartingPositionExplorerBlock(): Promise<string | null> {
  try {
    const stats = await withTimeout(
      fetchLichessExplorer(STARTING_FEN, 'lichess'),
      FETCH_TIMEOUT_MS,
    );
    return formatExplorerBlock(stats, 'starting position');
  } catch {
    return null;
  }
}

async function buildPositionExplorerBlock(fen: string): Promise<string | null> {
  try {
    const stats = await withTimeout(fetchLichessExplorer(fen, 'lichess'), FETCH_TIMEOUT_MS);
    return formatExplorerBlock(stats, 'current position');
  } catch {
    return null;
  }
}

function formatExplorerBlock(
  stats: LichessExplorerResult,
  label: string,
): string | null {
  if (!stats.moves || stats.moves.length === 0) return null;
  const lines = stats.moves.slice(0, EXPLORER_MOVE_LIMIT).map((m) => {
    const total = m.white + m.draws + m.black;
    if (total === 0) return `- ${m.san}: no games`;
    const whiteScore = Math.round(((m.white + m.draws * 0.5) / total) * 100);
    const popPct = ((total / Math.max(totalGames(stats), 1)) * 100).toFixed(1);
    return `- ${m.san}: ${total.toLocaleString()} games, ${whiteScore}% for White, ${popPct}% popularity`;
  });
  const openingTag = stats.opening ? ` (${stats.opening.eco} ${stats.opening.name})` : '';
  return `[Lichess Opening Explorer — ${label}${openingTag}, 1600-2500 blitz/rapid/classical]\n${lines.join('\n')}`;
}

function totalGames(stats: LichessExplorerResult): number {
  return stats.white + stats.draws + stats.black;
}

async function buildEngineBlock(fen: string): Promise<string | null> {
  try {
    const analysis = await withTimeout(stockfishEngine.analyzePosition(fen, 12), FETCH_TIMEOUT_MS);
    if (!analysis || !analysis.bestMove) return null;
    const evalStr = analysis.isMate
      ? `mate in ${Math.abs(analysis.mateIn ?? 0)}`
      : `${(analysis.evaluation / 100).toFixed(2)} pawns (White's POV)`;
    const lines: string[] = [
      `Best move: ${analysis.bestMove}`,
      `Evaluation: ${evalStr}`,
    ];
    if (analysis.topLines && analysis.topLines.length > 0) {
      const topLines = analysis.topLines.slice(0, 3).map((l, i) => {
        const moves = l.moves.slice(0, 5).join(' ');
        const e = l.mate !== null ? `M${l.mate}` : (l.evaluation / 100).toFixed(2);
        return `  ${i + 1}. ${moves} (${e})`;
      });
      lines.push('Top candidate lines:', ...topLines);
    }
    return `[Stockfish Engine Analysis — current position, depth ~12]\n${lines.join('\n')}`;
  } catch {
    return null;
  }
}

// ─── Util ─────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

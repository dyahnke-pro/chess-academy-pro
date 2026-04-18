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
import {
  getOverviewInsights,
  getOpeningInsights,
  getMistakeInsights,
  getTacticInsights,
} from './gameInsightsService';
import { db } from '../db/schema';
import type { GameRecord, LichessExplorerResult, MoveAnnotation } from '../types';

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
 *  the opening block when relevant. Also fires on bare greetings so
 *  the coach can compose a grounded welcome ("I see you're scoring
 *  68% as White…") instead of a generic "hi". */
const PERFORMANCE_QUESTION_RE =
  /\b(my\s+(?:games?|play|performance|stats|accuracy|rating|elo|weak\w*|strength\w*|blunder\w*|mistake\w*|game\s+review)|how\s+am\s+i\s+doing|am\s+i\s+(?:improving|getting\s+better)|recent\s+games|last\s+\d+\s+games|my\s+win\s+rate|track\s+record|overall|which\s+opening\s+do\s+i|where\s+am\s+i\s+losing)\b/i;

/** Bare greetings — "hi", "hello", "hey", "what's up", "good morning",
 *  "good evening", "yo". Triggers the same grounded data that a
 *  performance question does, so the coach has real stats to cite in
 *  its welcome message. */
const GREETING_RE =
  /^\s*(hi|hello|hey(?:\s+there)?|yo|howdy|greetings|good\s+(?:morning|afternoon|evening)|what'?s\s+up|sup)\b[\s!.?,]*$/i;

/** Tactics-awareness questions — triggers tacticInsights block with
 *  per-theme missed-tactic counts. */
const TACTICS_QUESTION_RE =
  /\b(tactic\w*|fork\w*|pin\w*|skewer\w*|discover\w*|double\s+attack|mating\s+(?:net|attack)|sacrifice|combination|puzzle\w*|miss(?:ed)?\s+(?:tactic|the\s+win)|brilliant\s+move\w*|great\s+move\w*)\b/i;

/** Phase / blunder / mistake pattern questions — triggers the deep
 *  mistake block with costliest mistakes + per-phase breakdown. */
const MISTAKE_QUESTION_RE =
  /\b(blunder\w*|mistake\w*|miss(?:ed)?\s+(?:wins?|chances?)|costly|hang(?:ing)?|threw\s+(?:away|the)|late[- ]game|collapse|endgame|middlegame|opening\s+phase|phase\s+(?:accuracy|errors?))\b/i;

/** Study / drill / repetition questions — triggers SRS + drill
 *  progress block. */
const STUDY_QUESTION_RE =
  /\b(drill\w*|study|studying|practice|practised|flashcard\w*|repetition|srs|spaced|review\s+deck|memoriz\w*|woodpecker)\b/i;

/** Time-control questions — triggers per-TC breakdown. */
const TIME_CONTROL_QUESTION_RE =
  /\b(blitz|rapid|classical|bullet|time\s+control|tc)\b/i;

/** "Review my last game" / "walk through my games" — triggers the
 *  per-move annotated snapshot of the 3 most-recent analyzed games. */
const RECENT_GAME_DETAIL_RE =
  /\b(my\s+last\s+game|walk\s+(?:me\s+)?through\s+my|recent\s+game|review\s+(?:my|the)\s+game|go\s+over\s+my|move[- ]by[- ]move)\b/i;

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
  const isGreeting = GREETING_RE.test(userText);
  const wantsOpening = OPENING_QUESTION_RE.test(userText);
  const wantsPosition = POSITION_QUESTION_RE.test(userText);
  // Greetings fire the performance blocks so the coach can welcome
  // the student with a concrete observation from their real data.
  const wantsPerformance = PERFORMANCE_QUESTION_RE.test(userText) || wantsOpening || isGreeting;
  const wantsTactics = TACTICS_QUESTION_RE.test(userText);
  const wantsMistakes = MISTAKE_QUESTION_RE.test(userText) || wantsPerformance;
  const wantsStudy = STUDY_QUESTION_RE.test(userText);
  const wantsTimeControl = TIME_CONTROL_QUESTION_RE.test(userText) || wantsPerformance;
  const wantsGameDetail = RECENT_GAME_DETAIL_RE.test(userText);

  if (
    !isGreeting &&
    !wantsOpening &&
    !wantsPosition &&
    !wantsPerformance &&
    !wantsTactics &&
    !wantsMistakes &&
    !wantsStudy &&
    !wantsTimeControl &&
    !wantsGameDetail
  ) {
    return '';
  }

  // Run every requested block in parallel, then filter nulls. Each
  // helper is individually timeout-guarded — a single slow source
  // can't stall the whole turn.
  const [
    overviewBlock,
    openingHistoryBlock,
    repertoireBlock,
    startingExplorerBlock,
    positionExplorerBlock,
    engineBlock,
    tacticsBlock,
    mistakesBlock,
    studyBlock,
    timeControlBlock,
    trendBlock,
    gameDetailBlock,
  ] = await Promise.all([
    wantsPerformance ? buildOverviewBlock() : Promise.resolve(null),
    wantsPerformance ? buildOpeningHistoryBlock() : Promise.resolve(null),
    wantsOpening ? buildRepertoireBlock() : Promise.resolve(null),
    wantsOpening ? buildStartingPositionExplorerBlock() : Promise.resolve(null),
    wantsPosition && currentFen ? buildPositionExplorerBlock(currentFen) : Promise.resolve(null),
    wantsPosition && currentFen ? buildEngineBlock(currentFen) : Promise.resolve(null),
    wantsTactics ? buildTacticsBlock() : Promise.resolve(null),
    wantsMistakes ? buildMistakesBlock() : Promise.resolve(null),
    wantsStudy ? buildStudyProgressBlock() : Promise.resolve(null),
    wantsTimeControl ? buildTimeControlBlock() : Promise.resolve(null),
    wantsPerformance ? buildTrendBlock() : Promise.resolve(null),
    wantsGameDetail ? buildRecentGameDetailBlock() : Promise.resolve(null),
  ]);

  const blocks = [
    overviewBlock,
    trendBlock,
    timeControlBlock,
    openingHistoryBlock,
    repertoireBlock,
    startingExplorerBlock,
    positionExplorerBlock,
    engineBlock,
    tacticsBlock,
    mistakesBlock,
    studyBlock,
    gameDetailBlock,
  ].filter((b): b is string => b !== null && b.length > 0);

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

// ─── Tactics / mistakes / study / trend / time-control blocks ─────

async function buildTacticsBlock(): Promise<string | null> {
  try {
    const t = await withTimeout(getTacticInsights(), FETCH_TIMEOUT_MS);
    if (!t || t.totalGames === 0) return null;
    const lines: string[] = [
      `Awareness rate (found vs missed tactics): ${Math.round(t.awarenessRate * 100)}% (${t.foundVsMissed.found} found / ${t.foundVsMissed.missed} missed)`,
      `Per-game averages: ${t.avgBrilliantsPerGame.toFixed(2)} brilliants, ${t.avgGreatPerGame.toFixed(2)} great moves`,
    ];
    if (t.tacticsByType.length > 0) {
      const top = t.tacticsByType.slice(0, 5).map((x) => `${x.type} ${x.count}`).join(', ');
      lines.push(`Tactics found by type: ${top}`);
    }
    if (t.missedByType.length > 0) {
      const top = t.missedByType
        .slice(0, 5)
        .map((x) => `${x.type} missed ${x.count}× (avg cost ${(x.avgCost / 100).toFixed(1)} pawns)`)
        .join('; ');
      lines.push(`Missed tactics by type: ${top}`);
    }
    if (t.missedByPhase.length > 0) {
      const phases = t.missedByPhase.map((p) => `${p.phase} ${p.count}`).join(', ');
      lines.push(`Missed tactics by phase: ${phases}`);
    }
    return `[Tactical Awareness — analyzed from game history]\n${lines.join('\n')}`;
  } catch {
    return null;
  }
}

async function buildMistakesBlock(): Promise<string | null> {
  try {
    const m = await withTimeout(getMistakeInsights(), FETCH_TIMEOUT_MS);
    if (!m || m.totalGames === 0) return null;
    const lines: string[] = [
      `Error totals: ${m.errorBreakdown.blunders} blunders, ${m.errorBreakdown.mistakes} mistakes, ${m.errorBreakdown.inaccuracies} inaccuracies`,
      `Avg centipawn loss per error: ${m.avgCpLoss.toFixed(0)}cp`,
      `Errors by situation: winning ${m.errorsBySituation.winning}, equal ${m.errorsBySituation.equal}, losing ${m.errorsBySituation.losing}`,
      `Thrown-wins: ${m.thrownWins} — late-game collapses: ${m.lateGameCollapses} — missed wins: ${m.missedWins}`,
    ];
    if (m.errorsByPhase.length > 0) {
      const phases = m.errorsByPhase
        .map((p) => `${p.phase} ${p.errors} errors (avg ${p.avgCpLoss.toFixed(0)}cp)`)
        .join('; ');
      lines.push(`Errors by phase: ${phases}`);
    }
    if (m.costliestMistakes.length > 0) {
      const top = m.costliestMistakes.slice(0, 5).map((c) => {
        const op = c.openingName ? ` in ${c.openingName}` : '';
        return `  - ${c.date} vs ${c.opponentName}${op} — move ${c.moveNumber} ${c.san} (${c.classification}, lost ${(c.cpLoss / 100).toFixed(1)} pawns, ${c.phase})`;
      });
      lines.push(`Costliest recent mistakes:\n${top.join('\n')}`);
    }
    return `[Mistake Patterns — where this student's points go to die]\n${lines.join('\n')}`;
  } catch {
    return null;
  }
}

async function buildStudyProgressBlock(): Promise<string | null> {
  try {
    const [flashcardCount, flashcardsDue, repertoire] = await withTimeout(
      Promise.all([
        db.flashcards.count(),
        db.flashcards.filter((f) => new Date(f.srsDueDate).getTime() <= Date.now()).count(),
        getRepertoireOpenings(),
      ]),
      FETCH_TIMEOUT_MS,
    );
    const lines: string[] = [];
    if (flashcardCount > 0) {
      lines.push(`Flashcards: ${flashcardCount} total, ${flashcardsDue} due for review now`);
    }
    if (repertoire.length > 0) {
      const drilled = repertoire.filter((r) => r.drillAttempts > 0);
      if (drilled.length > 0) {
        const avgAcc = drilled.reduce((s, r) => s + r.drillAccuracy, 0) / drilled.length;
        lines.push(`Repertoire drilling: ${drilled.length}/${repertoire.length} openings attempted, avg ${Math.round(avgAcc * 100)}% drill accuracy`);
      } else {
        lines.push(`Repertoire: ${repertoire.length} openings added, 0 drilled yet`);
      }
    }
    if (lines.length === 0) return null;
    return `[Study / Drill Progress]\n${lines.join('\n')}`;
  } catch {
    return null;
  }
}

async function buildTimeControlBlock(): Promise<string | null> {
  try {
    const [games, usernames] = await withTimeout(
      Promise.all([
        db.games
          .filter((g) => !g.isMasterGame && g.result !== '*')
          .limit(300)
          .toArray(),
        getStudentUsernames(),
      ]),
      FETCH_TIMEOUT_MS,
    );
    if (games.length === 0) return null;
    const buckets: Record<string, { wins: number; losses: number; draws: number }> = {};
    for (const g of games) {
      const tc = inferTimeControl(g);
      if (!tc) continue;
      const side = inferStudentSide(g, usernames);
      if (side === null) continue;
      buckets[tc] ??= { wins: 0, losses: 0, draws: 0 };
      const outcome = studentOutcome(g, side);
      buckets[tc][outcome] += 1;
    }
    const entries = Object.entries(buckets).filter(([, v]) => v.wins + v.losses + v.draws >= 5);
    if (entries.length === 0) return null;
    const lines = entries.map(([tc, v]) => {
      const n = v.wins + v.losses + v.draws;
      const pct = Math.round(((v.wins + v.draws * 0.5) / n) * 100);
      return `- ${tc}: ${n} games, ${pct}% score (${v.wins}W / ${v.losses}L / ${v.draws}D)`;
    });
    return `[Time-Control Breakdown — last 300 games]\n${lines.join('\n')}`;
  } catch {
    return null;
  }
}

function inferTimeControl(g: GameRecord): string | null {
  const event = (g.event ?? '').toLowerCase();
  if (event.includes('bullet')) return 'bullet';
  if (event.includes('blitz')) return 'blitz';
  if (event.includes('rapid')) return 'rapid';
  if (event.includes('classical') || event.includes('standard')) return 'classical';
  return null;
}

/**
 * Pull the student's known usernames off the profile so we can match
 * games by player name. Falls back to whatever the profile has when
 * only one platform is connected.
 */
async function getStudentUsernames(): Promise<string[]> {
  const profile = await db.profiles.get('main').catch(() => undefined);
  const names: string[] = [];
  if (profile?.preferences.lichessUsername) names.push(profile.preferences.lichessUsername);
  if (profile?.preferences.chessComUsername) names.push(profile.preferences.chessComUsername);
  if (profile?.name) names.push(profile.name);
  return names.map((n) => n.toLowerCase());
}

/** 'white' | 'black' | null (null = can't tell — game skipped). */
function inferStudentSide(g: GameRecord, usernames: string[]): 'white' | 'black' | null {
  const white = g.white.toLowerCase();
  const black = g.black.toLowerCase();
  for (const u of usernames) {
    if (white === u) return 'white';
    if (black === u) return 'black';
  }
  return null;
}

function studentOutcome(g: GameRecord, side: 'white' | 'black'): 'wins' | 'losses' | 'draws' {
  if (g.result === '1/2-1/2') return 'draws';
  if (g.result === '1-0') return side === 'white' ? 'wins' : 'losses';
  if (g.result === '0-1') return side === 'black' ? 'wins' : 'losses';
  return 'draws';
}

async function buildTrendBlock(): Promise<string | null> {
  try {
    const [games, usernames] = await withTimeout(
      Promise.all([
        db.games
          .orderBy('date')
          .reverse()
          .filter((g) => !g.isMasterGame && g.result !== '*')
          .limit(40)
          .toArray(),
        getStudentUsernames(),
      ]),
      FETCH_TIMEOUT_MS,
    );
    if (games.length < 10) return null;
    const recent = games.slice(0, 20);
    const prior = games.slice(20, 40);
    const pct = (batch: GameRecord[]): number | null => {
      let totalScore = 0;
      let counted = 0;
      for (const g of batch) {
        const side = inferStudentSide(g, usernames);
        if (side === null) continue;
        const o = studentOutcome(g, side);
        totalScore += o === 'wins' ? 1 : o === 'draws' ? 0.5 : 0;
        counted += 1;
      }
      return counted === 0 ? null : totalScore / counted;
    };
    const recentPct = pct(recent);
    const priorPct = prior.length > 0 ? pct(prior) : null;
    if (recentPct === null) return null;
    const recentRounded = Math.round(recentPct * 100);
    const priorRounded = priorPct === null ? null : Math.round(priorPct * 100);
    const arrow =
      priorRounded === null
        ? ''
        : recentRounded > priorRounded + 3
          ? '↑ improving'
          : recentRounded < priorRounded - 3
            ? '↓ regressing'
            : '→ steady';
    const line =
      priorRounded === null
        ? `Last ${recent.length} games: ${recentRounded}% score`
        : `Last 20 games: ${recentRounded}% score vs prior 20: ${priorRounded}% ${arrow}`;
    return `[Recent Trend]\n${line}`;
  } catch {
    return null;
  }
}

async function buildRecentGameDetailBlock(): Promise<string | null> {
  try {
    const games = await withTimeout(
      db.games
        .orderBy('date')
        .reverse()
        .filter((g) => !g.isMasterGame && g.result !== '*' && g.fullyAnalyzed === true)
        .limit(3)
        .toArray(),
      FETCH_TIMEOUT_MS,
    );
    if (games.length === 0) return null;
    const sections = games.map((g) => {
      const anns = g.annotations ?? [];
      const counts = classificationCounts(anns);
      const heads = anns.slice(0, 15).map((a) => `${a.moveNumber}${a.color === 'white' ? '' : '...'}${a.san}${classificationTag(a.classification)}`).join(' ');
      return [
        `• ${g.date} ${g.white} (${g.whiteElo ?? '?'}) vs ${g.black} (${g.blackElo ?? '?'}) — ${g.result}${g.eco ? ` [${g.eco}]` : ''}`,
        `  counts: ${formatCounts(counts)}`,
        `  first moves: ${heads}`,
      ].join('\n');
    });
    return `[Recent Annotated Games — per-move classifications]\n${sections.join('\n')}`;
  } catch {
    return null;
  }
}

function classificationCounts(anns: MoveAnnotation[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of anns) {
    const k = (a.classification ?? 'unknown').toLowerCase();
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

function formatCounts(counts: Record<string, number>): string {
  const interesting = ['brilliant', 'great', 'best', 'excellent', 'inaccuracy', 'mistake', 'blunder', 'miss'];
  return interesting
    .filter((k) => counts[k])
    .map((k) => `${k}=${counts[k]}`)
    .join(', ') || '—';
}

function classificationTag(c: string | null | undefined): string {
  if (!c) return '';
  const key = c.toLowerCase();
  if (key === 'blunder') return '??';
  if (key === 'mistake') return '?';
  if (key === 'inaccuracy') return '?!';
  if (key === 'brilliant') return '!!';
  if (key === 'great' || key === 'excellent') return '!';
  return '';
}

// ─── Util ─────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

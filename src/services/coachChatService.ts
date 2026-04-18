import { GAME_NARRATION_ADDITION } from './coachPrompts';
import { db } from '../db/schema';
import { getStoredWeaknessProfile } from './weaknessAnalyzer';
import { parseBoardTags } from './boardAnnotationService';
import { uciMoveToSan, uciLinesToSan } from '../utils/uciToSan';
import type { ChatMessage, UserProfile, WeaknessProfile, BoardAnnotationCommand } from '../types';

const MAX_HISTORY_PAIRS = 10;
const MAX_PGN_HALF_MOVES = 20;

interface ParsedAction {
  type: string;
  id: string;
}

interface ParseResult {
  cleanText: string;
  actions: ParsedAction[];
}

// ─── Game Analysis Context ──────────────────────────────────────────────────

export interface RecentGamesSummary {
  totalGames: number;
  dateRange: { from: string; to: string } | null;
  asWhite: { wins: number; losses: number; draws: number };
  asBlack: { wins: number; losses: number; draws: number };
  topOpenings: { eco: string; name: string; count: number; winRate: number }[];
  avgOpponentRating: number | null;
  source: string;
}

const SUMMARY_GAMES_LIMIT = 50;

/**
 * Load the last 50 games from Dexie and compute a summary for chat context.
 */
export async function getRecentGamesSummary(username?: string): Promise<RecentGamesSummary> {
  const games = await db.games.orderBy('date').reverse().limit(SUMMARY_GAMES_LIMIT).toArray();

  if (games.length === 0) {
    return {
      totalGames: 0,
      dateRange: null,
      asWhite: { wins: 0, losses: 0, draws: 0 },
      asBlack: { wins: 0, losses: 0, draws: 0 },
      topOpenings: [],
      avgOpponentRating: null,
      source: '',
    };
  }

  const dates = games.map((g) => g.date).filter(Boolean).sort();
  const dateRange = dates.length > 0 ? { from: dates[0], to: dates[dates.length - 1] } : null;

  const asWhite = { wins: 0, losses: 0, draws: 0 };
  const asBlack = { wins: 0, losses: 0, draws: 0 };
  const openingMap = new Map<string, { eco: string; name: string; count: number; wins: number }>();
  const opponentRatings: number[] = [];

  const lowerUser = username?.toLowerCase() ?? '';

  for (const game of games) {
    const playerIsWhite = lowerUser
      ? game.white.toLowerCase() === lowerUser
      : game.source === 'chesscom' || game.source === 'lichess';

    if (playerIsWhite) {
      if (game.result === '1-0') asWhite.wins++;
      else if (game.result === '0-1') asWhite.losses++;
      else asWhite.draws++;
      if (game.blackElo) opponentRatings.push(game.blackElo);
    } else {
      if (game.result === '0-1') asBlack.wins++;
      else if (game.result === '1-0') asBlack.losses++;
      else asBlack.draws++;
      if (game.whiteElo) opponentRatings.push(game.whiteElo);
    }

    if (game.eco) {
      const existing = openingMap.get(game.eco);
      const isWin = (playerIsWhite && game.result === '1-0') || (!playerIsWhite && game.result === '0-1');
      if (existing) {
        existing.count++;
        if (isWin) existing.wins++;
      } else {
        openingMap.set(game.eco, {
          eco: game.eco,
          name: game.openingId ?? game.eco,
          count: 1,
          wins: isWin ? 1 : 0,
        });
      }
    }
  }

  const topOpenings = [...openingMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((o) => ({ ...o, winRate: o.count > 0 ? Math.round((o.wins / o.count) * 100) : 0 }));

  const avgOpponentRating = opponentRatings.length > 0
    ? Math.round(opponentRatings.reduce((sum, r) => sum + r, 0) / opponentRatings.length)
    : null;

  const sources = [...new Set(games.map((g) => g.source))];

  return {
    totalGames: games.length,
    dateRange,
    asWhite,
    asBlack,
    topOpenings,
    avgOpponentRating,
    source: sources.join(', '),
  };
}

/**
 * Format weakness profile + game summary into a context block for Claude.
 */
export function formatAnalysisContext(
  weaknessProfile: WeaknessProfile | null,
  gameSummary: RecentGamesSummary,
): string {
  const lines: string[] = ['[Game Analysis Data]'];

  if (gameSummary.totalGames > 0) {
    lines.push(`Recent games analyzed: ${gameSummary.totalGames} (from ${gameSummary.source})`);
    if (gameSummary.dateRange) {
      lines.push(`Date range: ${gameSummary.dateRange.from} to ${gameSummary.dateRange.to}`);
    }

    const wTotal = gameSummary.asWhite.wins + gameSummary.asWhite.losses + gameSummary.asWhite.draws;
    const bTotal = gameSummary.asBlack.wins + gameSummary.asBlack.losses + gameSummary.asBlack.draws;

    if (wTotal > 0) {
      const wWinRate = Math.round((gameSummary.asWhite.wins / wTotal) * 100);
      lines.push(`As White (${wTotal} games): ${gameSummary.asWhite.wins}W / ${gameSummary.asWhite.losses}L / ${gameSummary.asWhite.draws}D (${wWinRate}% win rate)`);
    }
    if (bTotal > 0) {
      const bWinRate = Math.round((gameSummary.asBlack.wins / bTotal) * 100);
      lines.push(`As Black (${bTotal} games): ${gameSummary.asBlack.wins}W / ${gameSummary.asBlack.losses}L / ${gameSummary.asBlack.draws}D (${bWinRate}% win rate)`);
    }

    if (gameSummary.avgOpponentRating) {
      lines.push(`Average opponent rating: ${gameSummary.avgOpponentRating}`);
    }

    if (gameSummary.topOpenings.length > 0) {
      lines.push('Most played openings:');
      for (const o of gameSummary.topOpenings) {
        lines.push(`  ${o.eco} — ${o.count} games, ${o.winRate}% win rate`);
      }
    }
  } else {
    lines.push('No recent games in database.');
  }

  if (weaknessProfile) {
    lines.push('');
    lines.push('[Weakness Analysis]');
    lines.push(`Computed: ${weaknessProfile.computedAt}`);
    lines.push(`Overall: ${weaknessProfile.overallAssessment}`);

    if (weaknessProfile.items.length > 0) {
      lines.push('Top weaknesses:');
      for (const item of weaknessProfile.items.slice(0, 5)) {
        lines.push(`  - ${item.label}: ${item.metric} (severity ${item.severity}/100)`);
        lines.push(`    → ${item.detail}`);
      }
    }

    if (weaknessProfile.strengths.length > 0) {
      lines.push(`Strengths: ${weaknessProfile.strengths.join('; ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Load analysis context (weakness profile + game summary) for the chat.
 * Returns a formatted context string, or empty string if no data.
 */
export async function loadAnalysisContext(username?: string): Promise<string> {
  const [weaknessProfile, gameSummary] = await Promise.all([
    getStoredWeaknessProfile(),
    getRecentGamesSummary(username),
  ]);

  if (!weaknessProfile && gameSummary.totalGames === 0) {
    return '';
  }

  return formatAnalysisContext(weaknessProfile, gameSummary);
}

// ─── Build Chat Messages ────────────────────────────────────────────────────

export function buildChatMessages(
  history: ChatMessage[],
  profile: UserProfile,
  analysisContext?: string,
): { role: 'user' | 'assistant'; content: string }[] {
  // Take last N pairs (user+assistant) to keep token budget manageable
  const recentMessages = history.slice(-(MAX_HISTORY_PAIRS * 2));

  const profileContext = [
    `Player: ${profile.name}, ~${profile.currentRating} ELO`,
    `Level: ${profile.level}`,
    profile.badHabits.filter((h) => !h.isResolved).length > 0
      ? `Known weaknesses: ${profile.badHabits.filter((h) => !h.isResolved).map((h) => h.description).join(', ')}`
      : '',
    `Skill radar: Opening ${profile.skillRadar.opening}, Tactics ${profile.skillRadar.tactics}, Endgame ${profile.skillRadar.endgame}, Calculation ${profile.skillRadar.calculation}, Memory ${profile.skillRadar.memory}`,
    analysisContext ? `\n${analysisContext}` : '',
  ].filter(Boolean).join('\n');

  const messages: { role: 'user' | 'assistant'; content: string }[] = [];

  // Inject profile as first user context message if history is short
  if (recentMessages.length <= 2) {
    messages.push({
      role: 'user',
      content: `[Player context]\n${profileContext}\n\n${recentMessages[0]?.content ?? ''}`,
    });
    // Add remaining messages
    for (let i = 1; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      messages.push({ role: msg.role, content: msg.content });
    }
  } else {
    for (const msg of recentMessages) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  return messages;
}

export function parseActionTags(text: string): ParseResult {
  const actions: ParsedAction[] = [];
  const cleanText = text.replace(/\[ACTION:\s*(\w+):([^\]]+)\]/g, (_match, type: string, id: string) => {
    actions.push({ type, id });
    return '';
  }).trim();

  return { cleanText, actions };
}

export interface ParseAllResult {
  cleanText: string;
  actions: ParsedAction[];
  annotations: BoardAnnotationCommand[];
}

export function parseAllTags(text: string): ParseAllResult {
  const { cleanText: textAfterActions, actions } = parseActionTags(text);
  const { cleanText: finalText, commands } = parseBoardTags(textAfterActions);
  return { cleanText: finalText, actions, annotations: commands };
}

export function getChatSystemPromptAdditions(hasAnalysisData?: boolean): string {
  const base = `You are having a conversation with a chess student. Be helpful, engaging, and educational.

You are a capable opening coach. When the student asks about an opening
(especially broad families like "the Sicilian" or "Indian Defenses"), do
not dump a wall of theory. Instead:
- Give a short 1–2 sentence overview of the key idea.
- Ask a clarifying question: which variation, which side, what level, what they want to get out of it.
- Teach conversationally, one idea per turn, inviting the student to respond.
- When the student is ready to play, propose a game with phrasing like "Let's play a game — I'll be White and play the Najdorf". The app listens for that phrasing plus the student's "yes" to open the play board.

Board annotations: while teaching, you can draw arrows on the board to
illustrate ideas. Emit tags inline in your message:
- [BOARD: arrow:e2-e4] — a green arrow from e2 to e4
- [BOARD: arrow:e2-e4:red, arrow:d1-h5:blue] — multiple arrows, any color from green/red/blue/yellow/orange
- [BOARD: highlight:d4:yellow] — highlight a square
- [BOARD: clear] — remove all arrows/highlights
Arrows stack up so you can layer a multi-move plan. Use [BOARD: clear]
when starting a new idea. Prefer arrows over long verbal descriptions
of squares.

When you want to suggest the student try a specific drill or review, include an action tag in your response:
- [ACTION: drill_opening:opening_id] — to suggest an opening drill
- [ACTION: puzzle_theme:theme_name] — to suggest puzzle practice
- [ACTION: review_game:game_id] — to suggest reviewing a game
- [ACTION: analyse_position:fen] — to suggest analysing a position

Keep responses concise (2-4 sentences for casual chat, longer for analysis requests).
Reference the student's profile and weaknesses naturally.
Be warm and encouraging. Use "we" and "let's" language. Celebrate small wins.`;

  if (hasAnalysisData) {
    return base + `

IMPORTANT: You have access to the student's actual game data and weakness analysis in the [Game Analysis Data] and [Weakness Analysis] blocks.
When they ask about their games, performance, or what to work on:
- Reference specific data points (win rates, opening stats, weakness items) from the analysis
- Be specific with numbers and percentages — the data is real, from their imported games
- Identify their top 2-3 areas for improvement with concrete recommendations
- Mention their strengths too, to keep them motivated
- Suggest specific training actions (puzzles, opening drills, endgame practice) based on the weaknesses`;
  }

  return base;
}

// ─── Game-specific chat helpers ──────────────────────────────────────────────

export interface EngineData {
  bestMove: string;
  evaluation: number;
  isMate: boolean;
  mateIn: number | null;
  topLines: { moves: string[]; evaluation: number; mate: number | null }[];
}

export interface GameContext {
  fen: string;
  pgn: string;
  moveNumber: number;
  playerColor: string;
  turn: string;
  isGameOver: boolean;
  gameResult: string;
  lastMove?: { from: string; to: string; san: string } | null;
  history?: string[];
  engineData?: EngineData;
  tacticAnalysis?: TacticAnalysisContext;
  positionAssessment?: PositionAssessmentContext;
}

export interface TacticAnalysisContext {
  moveQuality?: string;
  evalSwing?: number;
  hangingPieces?: Array<{ square: string; piece: string; color: string }>;
  currentTactics?: string[];
  upcomingForPlayer?: string[];
  upcomingForOpponent?: string[];
}

export interface PositionAssessmentContext {
  summary: string;
}

function truncatePgn(pgn: string): string {
  const tokens = pgn.split(/\s+/).filter(Boolean);
  if (tokens.length <= MAX_PGN_HALF_MOVES) return pgn;
  return '...' + tokens.slice(-MAX_PGN_HALF_MOVES).join(' ');
}

function buildProfileContext(profile: UserProfile): string {
  return [
    `Player: ${profile.name}, ~${profile.currentRating} ELO`,
    `Level: ${profile.level}`,
    profile.badHabits.filter((h) => !h.isResolved).length > 0
      ? `Known weaknesses: ${profile.badHabits.filter((h) => !h.isResolved).map((h) => h.description).join(', ')}`
      : '',
    `Skill radar: Opening ${profile.skillRadar.opening}, Tactics ${profile.skillRadar.tactics}, Endgame ${profile.skillRadar.endgame}, Calculation ${profile.skillRadar.calculation}, Memory ${profile.skillRadar.memory}`,
  ].filter(Boolean).join('\n');
}

/**
 * Format the game-state block for injection as a system-prompt
 * addition. Standalone so the agent runner can pass it via
 * `extraSystemPrompt` without going through the legacy two-message
 * priming that `buildGameChatMessages` relies on.
 */
export function buildGameContextBlock(
  gameContext: GameContext,
  profile: UserProfile,
): string {
  const turnLabel = gameContext.turn === 'w' ? 'White' : 'Black';
  const engineBlock = gameContext.engineData
    ? [
        '[Engine Analysis — TRUST THIS DATA]',
        `Best move: ${uciMoveToSan(gameContext.engineData.bestMove, gameContext.fen)}`,
        `Eval: ${gameContext.engineData.isMate ? `Mate in ${gameContext.engineData.mateIn}` : `${(gameContext.engineData.evaluation / 100).toFixed(1)} pawns`}`,
        ...gameContext.engineData.topLines.slice(0, 3).map(
          (l, i) => `Line ${i + 1}: ${uciLinesToSan(l.moves, gameContext.fen, 6)} (${l.mate !== null ? `M${l.mate}` : (l.evaluation / 100).toFixed(1)})`,
        ),
      ].join('\n')
    : '';
  const lastMoveLabel = gameContext.lastMove
    ? `Last move: ${gameContext.lastMove.san} (${gameContext.lastMove.from}-${gameContext.lastMove.to})`
    : '';
  const historyLabel = gameContext.history && gameContext.history.length > 0
    ? `Full SAN: ${gameContext.history.join(' ')}`
    : '';

  const tacticBlock = gameContext.tacticAnalysis
    ? [
        '[Tactic Analysis — TRUST THIS DATA]',
        gameContext.tacticAnalysis.moveQuality
          ? `Move quality: ${gameContext.tacticAnalysis.moveQuality}${gameContext.tacticAnalysis.evalSwing !== undefined ? ` (eval swing: ${gameContext.tacticAnalysis.evalSwing > 0 ? '+' : ''}${gameContext.tacticAnalysis.evalSwing}cp)` : ''}`
          : '',
        gameContext.tacticAnalysis.hangingPieces && gameContext.tacticAnalysis.hangingPieces.length > 0
          ? `Hanging pieces: ${gameContext.tacticAnalysis.hangingPieces.map((p) => `${p.color === 'w' ? 'White' : 'Black'} ${p.piece} on ${p.square}`).join(', ')}`
          : '',
        gameContext.tacticAnalysis.currentTactics && gameContext.tacticAnalysis.currentTactics.length > 0
          ? `Current tactics: ${gameContext.tacticAnalysis.currentTactics.join('; ')}`
          : '',
        gameContext.tacticAnalysis.upcomingForPlayer && gameContext.tacticAnalysis.upcomingForPlayer.length > 0
          ? `FOR PLAYER (opportunity): ${gameContext.tacticAnalysis.upcomingForPlayer.join('; ')}`
          : '',
        gameContext.tacticAnalysis.upcomingForOpponent && gameContext.tacticAnalysis.upcomingForOpponent.length > 0
          ? `AGAINST PLAYER (threat): ${gameContext.tacticAnalysis.upcomingForOpponent.join('; ')}`
          : '',
      ].filter(Boolean).join('\n')
    : '';

  const positionBlock = gameContext.positionAssessment
    ? `[Position Assessment — TRUST THIS DATA]\n${gameContext.positionAssessment.summary}`
    : '';

  const profileContext = buildProfileContext(profile);

  return [
    '[Game Context]',
    `FEN: ${gameContext.fen}`,
    `PGN: ${truncatePgn(gameContext.pgn)}`,
    lastMoveLabel,
    historyLabel,
    `Move: ${gameContext.moveNumber}, Turn: ${turnLabel}`,
    `Player plays: ${gameContext.playerColor}`,
    gameContext.isGameOver ? `Game over — Result: ${gameContext.gameResult}` : '',
    engineBlock,
    tacticBlock,
    positionBlock,
    '',
    '[Player context]',
    profileContext,
  ].filter(Boolean).join('\n');
}

export function buildGameChatMessages(
  history: ChatMessage[],
  gameContext: GameContext,
  profile: UserProfile,
): { role: 'user' | 'assistant'; content: string }[] {
  const recentMessages = history.slice(-(MAX_HISTORY_PAIRS * 2));
  const profileContext = buildProfileContext(profile);

  const turnLabel = gameContext.turn === 'w' ? 'White' : 'Black';
  const engineBlock = gameContext.engineData
    ? [
        '[Engine Analysis — TRUST THIS DATA]',
        `Best move: ${uciMoveToSan(gameContext.engineData.bestMove, gameContext.fen)}`,
        `Eval: ${gameContext.engineData.isMate ? `Mate in ${gameContext.engineData.mateIn}` : `${(gameContext.engineData.evaluation / 100).toFixed(1)} pawns`}`,
        ...gameContext.engineData.topLines.slice(0, 3).map(
          (l, i) => `Line ${i + 1}: ${uciLinesToSan(l.moves, gameContext.fen, 6)} (${l.mate !== null ? `M${l.mate}` : (l.evaluation / 100).toFixed(1)})`,
        ),
      ].join('\n')
    : '';
  const lastMoveLabel = gameContext.lastMove
    ? `Last move: ${gameContext.lastMove.san} (${gameContext.lastMove.from}-${gameContext.lastMove.to})`
    : '';
  const historyLabel = gameContext.history && gameContext.history.length > 0
    ? `Full SAN: ${gameContext.history.join(' ')}`
    : '';

  // Tactic analysis block (deterministic, from Stockfish + classifier)
  const tacticBlock = gameContext.tacticAnalysis
    ? [
        '[Tactic Analysis — TRUST THIS DATA]',
        gameContext.tacticAnalysis.moveQuality
          ? `Move quality: ${gameContext.tacticAnalysis.moveQuality}${gameContext.tacticAnalysis.evalSwing !== undefined ? ` (eval swing: ${gameContext.tacticAnalysis.evalSwing > 0 ? '+' : ''}${gameContext.tacticAnalysis.evalSwing}cp)` : ''}`
          : '',
        gameContext.tacticAnalysis.hangingPieces && gameContext.tacticAnalysis.hangingPieces.length > 0
          ? `Hanging pieces: ${gameContext.tacticAnalysis.hangingPieces.map((p) => `${p.color === 'w' ? 'White' : 'Black'} ${p.piece} on ${p.square}`).join(', ')}`
          : '',
        gameContext.tacticAnalysis.currentTactics && gameContext.tacticAnalysis.currentTactics.length > 0
          ? `Current tactics: ${gameContext.tacticAnalysis.currentTactics.join('; ')}`
          : '',
        gameContext.tacticAnalysis.upcomingForPlayer && gameContext.tacticAnalysis.upcomingForPlayer.length > 0
          ? `FOR PLAYER (opportunity): ${gameContext.tacticAnalysis.upcomingForPlayer.join('; ')}`
          : '',
        gameContext.tacticAnalysis.upcomingForOpponent && gameContext.tacticAnalysis.upcomingForOpponent.length > 0
          ? `AGAINST PLAYER (threat): ${gameContext.tacticAnalysis.upcomingForOpponent.join('; ')}`
          : '',
      ].filter(Boolean).join('\n')
    : '';

  const positionBlock = gameContext.positionAssessment
    ? `[Position Assessment — TRUST THIS DATA]\n${gameContext.positionAssessment.summary}`
    : '';

  const gameContextBlock = [
    '[Game Context]',
    `FEN: ${gameContext.fen}`,
    `PGN: ${truncatePgn(gameContext.pgn)}`,
    lastMoveLabel,
    historyLabel,
    `Move: ${gameContext.moveNumber}, Turn: ${turnLabel}`,
    `Player plays: ${gameContext.playerColor}`,
    gameContext.isGameOver ? `Game over — Result: ${gameContext.gameResult}` : '',
    engineBlock,
    tacticBlock,
    positionBlock,
  ].filter(Boolean).join('\n');

  const messages: { role: 'user' | 'assistant'; content: string }[] = [];

  // First message always includes player profile + game context
  if (recentMessages.length === 0) {
    // No chat history — just inject context as invisible primer
    messages.push({
      role: 'user',
      content: `${gameContextBlock}\n\n[Player context]\n${profileContext}`,
    });
    messages.push({
      role: 'assistant',
      content: 'Ready to chat about the game! Make a move or ask me anything about the position.',
    });
  } else if (recentMessages.length <= 2) {
    messages.push({
      role: 'user',
      content: `${gameContextBlock}\n\n[Player context]\n${profileContext}\n\n${recentMessages[0]?.content ?? ''}`,
    });
    for (let i = 1; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      messages.push({ role: msg.role, content: msg.content });
    }
  } else {
    // Inject game context as first user message, then chat history
    messages.push({
      role: 'user',
      content: gameContextBlock,
    });
    messages.push({
      role: 'assistant',
      content: 'Got it, I can see the position.',
    });
    for (const msg of recentMessages) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  return messages;
}

export function getGameSystemPromptAddition(): string {
  return `${GAME_NARRATION_ADDITION}

CHAT DURING GAME:
- Keep responses under 3 sentences during active play
- Be more detailed when the game is over or the student asks for analysis
- ALWAYS base your analysis on the exact FEN provided in the [Game Context] block — it is the single source of truth for the current board state
- When the game context includes "Last move:", reference it explicitly (e.g., "After ...Nf6") to confirm you are analyzing the correct position
- Reference the current position naturally — you have the FEN, PGN, last move, and full SAN history
- If the student asks "what should I do?" give a hint, not the answer

TACTIC ANALYSIS:
The game context may include a [Tactic Analysis] block with deterministic, Stockfish-verified tactic detection.
CRITICAL: Trust this data completely. NEVER identify tactics from your own chess knowledge — use the labels provided.
- "FOR PLAYER (opportunity)" = tactics the student can exploit. Hint at them based on coaching style.
- "AGAINST PLAYER (threat)" = tactics the opponent threatens. Warn the student proportionally.
- "Hanging pieces" = undefended pieces under attack. Flag these clearly.
- When describing a tactic, use the description from the analysis block verbatim.

ENGINE DATA:
The game context includes Stockfish analysis with the best move and top lines.
CRITICAL: Always base your move suggestions on the engine data provided. NEVER suggest moves from your own chess knowledge alone — LLMs are unreliable at chess tactics. The engine data shows legal, verified moves with evaluations.
- When suggesting a move, use the bestMove or a move from the top engine lines
- When explaining a plan, use the engine lines to show the continuation
- If the student asks you to show them the idea, use [BOARD: position:FEN] to demonstrate. Build the FEN by applying the engine's top line moves to the current position.

BOARD ANNOTATIONS:
You can draw arrows, highlight squares, and show alternative positions on the board.
Use these tags in your responses when visual explanation helps:

- [BOARD: arrow:e2-e4:green] — draw a green arrow from e2 to e4
- [BOARD: arrow:d1-h5:red,e1-g1:blue] — multiple arrows (comma-separated)
- [BOARD: highlight:e4:green,d5:yellow] — highlight squares with colors
- [BOARD: position:FEN_STRING:Label] — show a "what if" position temporarily on the board. The student will see the pieces rearranged. Use this when the student asks you to "show me" or "move the pieces". Build a valid FEN by mentally applying moves to the current position.
- [BOARD: clear] — remove all annotations

Colors: green (good/recommended), red (danger), blue (informational), yellow (key square), orange (alternative)
Keep annotations minimal (2-4 arrows/highlights per message). Always explain what they show in your text.
When the student asks to SEE the move or demonstration, ALWAYS use [BOARD: position:FEN:Label] to show the resulting position.
Annotations auto-clear when the student makes their next move.

PRACTICE POSITIONS:
When the student asks to practice tactics or endgames, use [BOARD: practice:FEN:Label] to set up interactive practice positions.
The board becomes interactive and the student must find the best move. This is different from [BOARD: position:...] which is view-only.

Example: [BOARD: practice:r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 3:Find the checkmate!]

Sources for practice positions:
- If a game just finished, create positions similar to their mistakes
- Reference their weakness profile for targeted practice
- For endgame practice, set up classic endgame positions (K+R vs K, K+Q vs K, etc.)
- For tactical practice, create positions with clear tactical solutions (forks, pins, skewers)

Always explain what the student should look for before setting the position.
After they solve it (or give up), explain the solution and offer another position.`;
}

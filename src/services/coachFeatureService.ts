import { db } from '../db/schema';
import { getCoachChatResponse, getCoachCommentary } from './coachApi';
import { GAME_POST_REVIEW_ADDITION } from './coachPrompts';
import { getThemeSkills } from './puzzleService';
import type { BadHabit, CoachContext, UserProfile } from '../types';

// ─── Bad Habit Detection ────────────────────────────────────────────────────

export async function detectBadHabits(profile: UserProfile): Promise<BadHabit[]> {
  const themeSkills = await getThemeSkills();
  const habits: BadHabit[] = [...profile.badHabits];
  const today = new Date().toISOString().split('T')[0];

  // Check for weak themes (accuracy < 40% with 5+ attempts)
  for (const skill of themeSkills) {
    if (skill.accuracy < 0.4 && skill.attempts >= 5) {
      const existingIdx = habits.findIndex((h) => h.id === `weak-${skill.theme}`);
      if (existingIdx >= 0) {
        habits[existingIdx] = {
          ...habits[existingIdx],
          occurrences: habits[existingIdx].occurrences + 1,
          lastSeen: today,
          isResolved: skill.accuracy >= 0.6,
        };
      } else {
        habits.push({
          id: `weak-${skill.theme}`,
          description: `Struggling with ${skill.theme} puzzles (${Math.round(skill.accuracy * 100)}% accuracy)`,
          occurrences: 1,
          lastSeen: today,
          isResolved: false,
        });
      }
    }
  }

  // Mark habits as resolved if accuracy improved
  for (const habit of habits) {
    if (habit.id.startsWith('weak-')) {
      const theme = habit.id.replace('weak-', '');
      const skill = themeSkills.find((s) => s.theme === theme);
      if (skill && skill.accuracy >= 0.6) {
        habit.isResolved = true;
      }
    }
  }

  return habits;
}

export async function updateBadHabits(profile: UserProfile): Promise<BadHabit[]> {
  const habits = await detectBadHabits(profile);
  await db.profiles.update(profile.id, { badHabits: habits });
  return habits;
}

// ─── Post-Game Analysis ─────────────────────────────────────────────────────

export async function getPostGameAnalysis(
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return getCoachCommentary('post_game_analysis', context, onStream);
}

// ─── Daily Lesson ───────────────────────────────────────────────────────────

export async function getDailyLesson(
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return getCoachCommentary('daily_lesson', context, onStream);
}

// ─── Bad Habit Report ───────────────────────────────────────────────────────

export async function getBadHabitReport(
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return getCoachCommentary('bad_habit_report', context, onStream);
}

// ─── Weekly Report ──────────────────────────────────────────────────────────

export async function getWeeklyReport(
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return getCoachCommentary('weekly_report', context, onStream);
}

// ─── Bad Habit Detection from Coach Game ────────────────────────────────────

export async function detectBadHabitsFromGame(
  moves: { classification: string | null; san: string }[],
  profile: UserProfile,
): Promise<BadHabit[]> {
  const habits = [...profile.badHabits];
  const today = new Date().toISOString().split('T')[0];

  // Count mistakes and blunders
  const blunders = moves.filter((m) => m.classification === 'blunder').length;
  const mistakes = moves.filter((m) => m.classification === 'mistake').length;
  const inaccuracies = moves.filter((m) => m.classification === 'inaccuracy').length;

  // Detect time pressure blunders (blunders in last 10 moves)
  const lastMoves = moves.slice(-10);
  const lateBlunders = lastMoves.filter((m) => m.classification === 'blunder' || m.classification === 'mistake').length;
  if (lateBlunders >= 2) {
    const existingIdx = habits.findIndex((h) => h.id === 'game-time-pressure');
    if (existingIdx >= 0) {
      habits[existingIdx] = {
        ...habits[existingIdx],
        occurrences: habits[existingIdx].occurrences + 1,
        lastSeen: today,
        isResolved: false,
      };
    } else {
      habits.push({
        id: 'game-time-pressure',
        description: 'Tends to blunder in the later stages of the game (possible time pressure)',
        occurrences: 1,
        lastSeen: today,
        isResolved: false,
      });
    }
  }

  // Detect consistently inaccurate play
  if (blunders + mistakes >= 3) {
    const existingIdx = habits.findIndex((h) => h.id === 'game-calculation');
    if (existingIdx >= 0) {
      habits[existingIdx] = {
        ...habits[existingIdx],
        occurrences: habits[existingIdx].occurrences + 1,
        lastSeen: today,
        isResolved: false,
      };
    } else {
      habits.push({
        id: 'game-calculation',
        description: `Frequent calculation errors (${blunders} blunders, ${mistakes} mistakes in last game)`,
        occurrences: 1,
        lastSeen: today,
        isResolved: false,
      });
    }
  }

  // Mark improvement — if no blunders at all, mark calculation habit as resolved
  if (blunders === 0 && mistakes === 0 && inaccuracies <= 1) {
    for (const habit of habits) {
      if (habit.id === 'game-calculation' && !habit.isResolved) {
        habit.isResolved = true;
      }
    }
  }

  await db.profiles.update(profile.id, { badHabits: habits });
  return habits;
}

// ─── Narrative Summary ──────────────────────────────────────────────────────

export interface NarrativeMoveData {
  moveNumber: number;
  san: string;
  classification: string | null;
  commentary: string;
  evaluation: number | null;
  bestMove: string | null;
  isCoachMove: boolean;
}

/** Exact fallback sentence required by WO-REVIEW-01 when the per-move
 *  analysis is empty. The UI surfaces this verbatim — do not prettify. */
export const NARRATIVE_SUMMARY_NO_DATA = 'I need a moment to analyze this game. Tap Full Review for complete analysis.';

/** Format a single move row for the grounded [Per-move analysis] block.
 *  Columns: full move number, color, SAN, eval before, eval after, best,
 *  classification. Every field is either derived from the move record or
 *  explicitly marked "n/a" so the LLM cannot invent the missing value. */
function formatMoveRow(m: NarrativeMoveData, prevEvalCp: number | null, coachColor: 'White' | 'Black'): string {
  const fullMove = Math.ceil(m.moveNumber / 2);
  const moverColor: 'White' | 'Black' = m.moveNumber % 2 === 1 ? 'White' : 'Black';
  const side = m.isCoachMove ? `${moverColor}/coach` : moverColor === coachColor ? `${moverColor}/coach` : `${moverColor}/student`;
  const evalBefore = prevEvalCp !== null ? (prevEvalCp / 100).toFixed(2) : 'n/a';
  const evalAfter = m.evaluation !== null ? (m.evaluation / 100).toFixed(2) : 'n/a';
  const best = m.bestMove ?? 'n/a';
  const classification = m.classification ?? 'unclassified';
  return `Move ${fullMove}. ${m.san} (${side}) — eval before: ${evalBefore}, eval after: ${evalAfter}, best: ${best}, classification: ${classification}`;
}

export async function generateNarrativeSummary(
  pgn: string,
  playerColor: string,
  openingName: string | null,
  result: string,
  playerRating: number,
  onStream?: (chunk: string) => void,
  moveData?: NarrativeMoveData[],
): Promise<string> {
  // No per-move analysis → bail out with the graceful fallback.
  // Writing prose from nothing is exactly the hallucination path
  // WO-REVIEW-01 closes.
  if (!moveData || moveData.length === 0) {
    onStream?.(NARRATIVE_SUMMARY_NO_DATA);
    return NARRATIVE_SUMMARY_NO_DATA;
  }

  // Count errors across ALL student (non-coach) moves for the tone guide.
  let blunderCount = 0;
  let mistakeCount = 0;
  let inaccuracyCount = 0;
  for (const m of moveData) {
    if (m.isCoachMove) continue;
    if (m.classification === 'blunder') blunderCount++;
    else if (m.classification === 'mistake') mistakeCount++;
    else if (m.classification === 'inaccuracy') inaccuracyCount++;
  }
  const totalErrors = blunderCount + mistakeCount + inaccuracyCount;
  const toneGuide = totalErrors === 0
    ? 'The student played cleanly — praise the accuracy without overclaiming brilliance.'
    : totalErrors <= 2
      ? 'Mostly solid play with a couple areas to improve. Be constructive.'
      : `The student made ${totalErrors} errors (${blunderCount} blunders, ${mistakeCount} mistakes, ${inaccuracyCount} inaccuracies). Be honest about what went wrong — do NOT call the game "excellent" or "great". Focus on the specific errors and what to learn from them.`;

  // Build a [Per-move analysis] block with EVERY move. Previously the
  // filter limited this to blunders/mistakes/inaccuracies, which left
  // the LLM free to invent narrative for unanalyzed moves — the
  // hallucination mode WO-REVIEW-01 is fixing. Every move gets a row.
  const coachColor: 'White' | 'Black' = playerColor === 'white' ? 'Black' : 'White';
  const rows: string[] = [];
  let prevEvalCp: number | null = 0;
  for (const m of moveData) {
    rows.push(formatMoveRow(m, prevEvalCp, coachColor));
    prevEvalCp = m.evaluation;
  }

  const perMoveBlock = `[Per-move analysis]\n${rows.join('\n')}`;
  const resultLine = `Game result: ${result}.`;
  const openingLine = openingName
    ? `Opening: ${openingName}.`
    : 'Opening: (not classified).';
  const playerLine = `Student color: ${playerColor}. Student rating: ~${playerRating}.`;
  const errorSummary = `Student errors — blunders: ${blunderCount}, mistakes: ${mistakeCount}, inaccuracies: ${inaccuracyCount}.`;

  const userMessage = [
    playerLine,
    openingLine,
    resultLine,
    errorSummary,
    `Tone: ${toneGuide}`,
    '',
    perMoveBlock,
    '',
    `PGN: ${pgn}`,
  ].join('\n');

  return getCoachChatResponse(
    [{ role: 'user', content: userMessage }],
    GAME_POST_REVIEW_ADDITION,
    onStream,
    'game_narrative_summary',
    // Raised from the default 1024 so the tail of the summary isn't
    // clipped when the model explores the per-move block. Still tight
    // enough to force brevity.
    800,
    // Review length is constrained by the addition, not by the
    // student's global verbosity. Override to 'medium' so a user-
    // level 'none' setting doesn't silently return a blank review
    // (the root cause of today's empty output).
    'medium',
  );
}

// ─── Review Narration Segments ─────────────────────────────────────────────

export interface ReviewNarrationSegments {
  intro: string;
  closing: string;
}

export async function generateReviewNarrationSegments(
  pgn: string,
  playerColor: string,
  openingName: string | null,
  result: string,
  playerRating: number,
  moveData?: NarrativeMoveData[],
): Promise<ReviewNarrationSegments> {
  let analysisContext = '';
  if (moveData && moveData.length > 0) {
    const keyMoves = moveData.filter((m) =>
      !m.isCoachMove && m.classification &&
      m.classification !== 'good' && m.classification !== 'book',
    );
    if (keyMoves.length > 0) {
      analysisContext = '\n\nEngine analysis of key moments:\n' +
        keyMoves.map((m) => {
          const evalText = m.evaluation !== null ? ` (eval: ${(m.evaluation / 100).toFixed(1)})` : '';
          const bestText = m.bestMove ? `, best was ${m.bestMove}` : '';
          return `- Move ${Math.ceil(m.moveNumber / 2)} ${m.san}: ${m.classification}${evalText}${bestText}`;
        }).join('\n');
    }
  }

  const context: CoachContext = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    lastMoveSan: null,
    moveNumber: 0,
    pgn,
    openingName,
    stockfishAnalysis: null,
    playerMove: null,
    moveClassification: null,
    playerProfile: {
      rating: playerRating,
      weaknesses: [],
    },
    additionalContext: `Player color: ${playerColor}. Game result: ${result}.
Generate two short narration segments for a move-by-move game review (2-3 sentences each, spoken aloud):

1. INTRO: Spoken before any moves play. Set the scene — mention the opening, early impressions, and what to watch for.
2. CLOSING: Spoken after the last move. Summarize takeaways — what went well, what to improve, and an encouraging note.

Respond ONLY with valid JSON: {"intro": "...", "closing": "..."}
Do not include any other text outside the JSON.${analysisContext}`,
  };

  const raw = await getCoachCommentary('game_narrative_summary', context);
  try {
    // Extract JSON from the response (may have markdown fences)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { intro: string; closing: string };
      return { intro: parsed.intro, closing: parsed.closing };
    }
  } catch {
    // Fallback: split the text in half
  }
  // Fallback if parsing fails
  return {
    intro: openingName
      ? `Let's review this game. You played the ${openingName}.`
      : `Let's walk through this game together.`,
    closing: 'That wraps up the review. Keep practicing and learning from each game!',
  };
}

// ─── Build Context from Profile ─────────────────────────────────────────────

export function buildProfileContext(profile: UserProfile): CoachContext {
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    lastMoveSan: null,
    moveNumber: 0,
    pgn: '',
    openingName: null,
    stockfishAnalysis: null,
    playerMove: null,
    moveClassification: null,
    playerProfile: {
      rating: profile.currentRating,
      weaknesses: profile.badHabits
        .filter((h) => !h.isResolved)
        .map((h) => h.description),
    },
  };
}

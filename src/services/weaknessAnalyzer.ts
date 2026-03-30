import { db } from '../db/schema';
import { getThemeSkills } from './puzzleService';
import { getRepertoireOpenings } from './openingService';
import type {
  WeaknessProfile,
  WeaknessItem,
  WeaknessCategory,
  WeaknessTrainingAction,
  UserProfile,
  GameRecord,
  SessionRecord,
  OpeningRecord,
  FlashcardRecord,
  MistakePuzzle,
  OpeningWeakSpot,
} from '../types';
import type { ThemeSkill } from './puzzleService';

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_PUZZLE_ATTEMPTS_FOR_WEAKNESS = 5;
const WEAK_THEME_ACCURACY_THRESHOLD = 0.5;
const STRONG_THEME_ACCURACY_THRESHOLD = 0.75;
const WEAK_OPENING_ACCURACY_THRESHOLD = 0.5;
const MIN_OPENING_DRILLS_FOR_ANALYSIS = 3;
const RECENT_GAMES_LIMIT = 50;
const RECENT_SESSIONS_LIMIT = 30;
const MIN_GAMES_FOR_TIME_ANALYSIS = 5;
const LATE_BLUNDER_THRESHOLD = 2;

// ─── Tactical Analysis ─────────────────────────────────────────────────────

function analyzeTactics(themeSkills: ThemeSkill[]): {
  weaknesses: WeaknessItem[];
  strengths: string[];
} {
  const weaknesses: WeaknessItem[] = [];
  const strengths: string[] = [];

  for (const skill of themeSkills) {
    if (skill.attempts < MIN_PUZZLE_ATTEMPTS_FOR_WEAKNESS) continue;

    if (skill.accuracy < WEAK_THEME_ACCURACY_THRESHOLD) {
      const severity = Math.round((1 - skill.accuracy) * 100);
      weaknesses.push({
        category: 'tactics',
        label: `Weak at ${skill.theme}`,
        metric: `${Math.round(skill.accuracy * 100)}% accuracy (${skill.attempts} attempts)`,
        severity,
        detail: `Your ${skill.theme} puzzle accuracy is ${Math.round(skill.accuracy * 100)}%. Focus on recognizing ${skill.theme} patterns in simpler positions first.`,
        trainingAction: {
          route: '/puzzles',
          buttonLabel: `Train ${skill.theme}`,
          state: { forcedWeakThemes: [skill.theme] },
        },
      });
    } else if (skill.accuracy >= STRONG_THEME_ACCURACY_THRESHOLD) {
      strengths.push(`Strong at ${skill.theme} (${Math.round(skill.accuracy * 100)}% accuracy)`);
    }
  }

  // Sort weaknesses by severity (worst first)
  weaknesses.sort((a, b) => b.severity - a.severity);

  return { weaknesses, strengths };
}

// ─── Opening Analysis ───────────────────────────────────────────────────────

function analyzeOpenings(repertoire: OpeningRecord[]): {
  weaknesses: WeaknessItem[];
  strengths: string[];
} {
  const weaknesses: WeaknessItem[] = [];
  const strengths: string[] = [];

  for (const opening of repertoire) {
    if (opening.drillAttempts < MIN_OPENING_DRILLS_FOR_ANALYSIS) continue;

    if (opening.drillAccuracy < WEAK_OPENING_ACCURACY_THRESHOLD) {
      const severity = Math.round((1 - opening.drillAccuracy) * 100);
      weaknesses.push({
        category: 'openings',
        label: `Shaky in ${opening.name}`,
        metric: `${Math.round(opening.drillAccuracy * 100)}% drill accuracy (${opening.drillAttempts} drills)`,
        severity,
        detail: `Your drill accuracy in the ${opening.name} (${opening.eco}) is below 50%. Review the main line and key variations.`,
        trainingAction: {
          route: `/openings/${opening.id}`,
          buttonLabel: `Drill ${opening.name}`,
        },
      });
    } else if (opening.drillAccuracy >= STRONG_THEME_ACCURACY_THRESHOLD) {
      strengths.push(`Solid in ${opening.name} (${Math.round(opening.drillAccuracy * 100)}% drill accuracy)`);
    }
  }

  // Identify openings never drilled
  const neverDrilled = repertoire.filter((o) => o.drillAttempts === 0);
  if (neverDrilled.length > 0) {
    weaknesses.push({
      category: 'openings',
      label: `${neverDrilled.length} openings never drilled`,
      metric: `${neverDrilled.length} of ${repertoire.length} repertoire openings untouched`,
      severity: 40,
      detail: `You have ${neverDrilled.length} openings in your repertoire that you've never drilled: ${neverDrilled.slice(0, 3).map((o) => o.name).join(', ')}${neverDrilled.length > 3 ? '...' : ''}.`,
      trainingAction: neverDrilled.length > 0
        ? { route: `/openings/${neverDrilled[0].id}`, buttonLabel: `Start ${neverDrilled[0].name}` }
        : undefined,
    });
  }

  weaknesses.sort((a, b) => b.severity - a.severity);

  return { weaknesses, strengths };
}

// ─── Game Analysis (Calculation + Time Management) ──────────────────────────

function analyzeGames(games: GameRecord[]): {
  weaknesses: WeaknessItem[];
  strengths: string[];
} {
  const weaknesses: WeaknessItem[] = [];
  const strengths: string[] = [];

  if (games.length === 0) return { weaknesses, strengths };

  let totalBlunders = 0;
  let totalMistakes = 0;
  let totalBrilliant = 0;
  let totalMoves = 0;
  let lateBlunderGames = 0;
  let gamesWithAnnotations = 0;

  for (const game of games) {
    if (!game.annotations || game.annotations.length === 0) continue;
    gamesWithAnnotations++;

    const annotations = game.annotations;
    totalMoves += annotations.length;

    for (const ann of annotations) {
      switch (ann.classification) {
        case 'blunder': totalBlunders++; break;
        case 'mistake': totalMistakes++; break;
        case 'brilliant': totalBrilliant++; break;
      }
    }

    // Check for late-game blunders (last 10 moves)
    const lastMoves = annotations.slice(-10);
    const lateErrors = lastMoves.filter(
      (m) => m.classification === 'blunder' || m.classification === 'mistake',
    ).length;
    if (lateErrors >= LATE_BLUNDER_THRESHOLD) {
      lateBlunderGames++;
    }
  }

  if (gamesWithAnnotations === 0) return { weaknesses, strengths };

  // Calculation weakness
  const errorRate = totalMoves > 0 ? (totalBlunders + totalMistakes) / totalMoves : 0;
  if (errorRate > 0.1) {
    weaknesses.push({
      category: 'calculation',
      label: 'Frequent calculation errors',
      metric: `${totalBlunders} blunders, ${totalMistakes} mistakes in ${gamesWithAnnotations} games`,
      severity: Math.min(90, Math.round(errorRate * 500)),
      detail: `You're averaging ${(errorRate * 100).toFixed(1)}% error rate per move. That's ${((totalBlunders + totalMistakes) / gamesWithAnnotations).toFixed(1)} serious errors per game. Practice calculation exercises with increasing complexity.`,
      trainingAction: {
        route: '/puzzles/mistakes',
        buttonLabel: 'Review My Mistakes',
      },
    });
  } else if (errorRate < 0.03 && gamesWithAnnotations >= MIN_GAMES_FOR_TIME_ANALYSIS) {
    strengths.push(`Clean calculation (only ${totalBlunders + totalMistakes} errors in ${gamesWithAnnotations} games)`);
  }

  // Time management / late-game collapse
  if (lateBlunderGames >= 2 && gamesWithAnnotations >= MIN_GAMES_FOR_TIME_ANALYSIS) {
    const collapseRate = lateBlunderGames / gamesWithAnnotations;
    weaknesses.push({
      category: 'time_management',
      label: 'Late-game collapses',
      metric: `${lateBlunderGames} of ${gamesWithAnnotations} games had multiple errors in the last 10 moves`,
      severity: Math.min(85, Math.round(collapseRate * 200)),
      detail: `In ${Math.round(collapseRate * 100)}% of your recent games, you made multiple blunders or mistakes in the final moves. This often indicates time pressure or fatigue. Try playing with increment or practicing endgame speed drills.`,
      trainingAction: {
        route: '/puzzles',
        buttonLabel: 'Endgame Speed Drills',
        state: { forcedWeakThemes: ['endgame'] },
      },
    });
  }

  // Blunder rate as separate item if very high
  if (totalBlunders > 0 && totalBlunders / gamesWithAnnotations >= 1.5) {
    weaknesses.push({
      category: 'calculation',
      label: 'High blunder rate',
      metric: `${(totalBlunders / gamesWithAnnotations).toFixed(1)} blunders per game`,
      severity: Math.min(95, Math.round((totalBlunders / gamesWithAnnotations) * 40)),
      detail: `Averaging ${(totalBlunders / gamesWithAnnotations).toFixed(1)} blunders per game. Before each move, do a "blunder check" — ask yourself: does my move leave anything hanging or allow a tactic?`,
      trainingAction: {
        route: '/puzzles/mistakes',
        buttonLabel: 'Fix My Blunders',
      },
    });
  }

  // Brilliancy as a strength
  if (totalBrilliant >= 3) {
    strengths.push(`${totalBrilliant} brilliant moves found in recent games`);
  }

  weaknesses.sort((a, b) => b.severity - a.severity);

  return { weaknesses, strengths };
}

// ─── Session Consistency ────────────────────────────────────────────────────

function analyzeSessionConsistency(sessions: SessionRecord[]): {
  weaknesses: WeaknessItem[];
  strengths: string[];
} {
  const weaknesses: WeaknessItem[] = [];
  const strengths: string[] = [];

  if (sessions.length < 3) return { weaknesses, strengths };

  // Check puzzle accuracy trend
  const completedSessions = sessions.filter((s) => s.completed);
  if (completedSessions.length >= 3) {
    const avgAccuracy =
      completedSessions.reduce((sum, s) => sum + s.puzzleAccuracy, 0) / completedSessions.length;

    if (avgAccuracy < 50) {
      weaknesses.push({
        category: 'tactics',
        label: 'Low session puzzle accuracy',
        metric: `${Math.round(avgAccuracy)}% avg accuracy over ${completedSessions.length} sessions`,
        severity: Math.round((1 - avgAccuracy / 100) * 80),
        detail: `Your average puzzle accuracy in training sessions is ${Math.round(avgAccuracy)}%. Consider dropping puzzle difficulty temporarily to build pattern recognition at a comfortable level.`,
        trainingAction: {
          route: '/puzzles',
          buttonLabel: 'Easy Puzzle Session',
        },
      });
    } else if (avgAccuracy >= 75) {
      strengths.push(`Strong session performance (${Math.round(avgAccuracy)}% avg puzzle accuracy)`);
    }
  }

  // Check training consistency (gaps between sessions)
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date).getTime();
    const curr = new Date(sorted[i].date).getTime();
    const dayGap = (curr - prev) / (1000 * 60 * 60 * 24);
    gaps.push(dayGap);
  }

  if (gaps.length > 0) {
    const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
    const maxGap = Math.max(...gaps);

    if (avgGap > 3) {
      weaknesses.push({
        category: 'time_management',
        label: 'Inconsistent training',
        metric: `Avg ${avgGap.toFixed(1)} days between sessions (max gap: ${maxGap} days)`,
        severity: Math.min(60, Math.round(avgGap * 10)),
        detail: `You're training every ${avgGap.toFixed(1)} days on average. Consistent daily practice, even just 15 minutes, is more effective than sporadic longer sessions.`,
        trainingAction: {
          route: '/coach/plan',
          buttonLabel: 'Create Training Plan',
        },
      });
    } else if (avgGap <= 1.5 && sessions.length >= 7) {
      strengths.push(`Excellent training consistency (${avgGap.toFixed(1)} days between sessions)`);
    }
  }

  return { weaknesses, strengths };
}

// ─── Flashcard / Memory Analysis ────────────────────────────────────────────

function analyzeFlashcards(flashcards: FlashcardRecord[]): {
  weaknesses: WeaknessItem[];
  strengths: string[];
} {
  const weaknesses: WeaknessItem[] = [];
  const strengths: string[] = [];

  if (flashcards.length === 0) return { weaknesses, strengths };

  const today = new Date().toISOString().split('T')[0];
  const overdue = flashcards.filter((f) => f.srsDueDate <= today);
  const reviewed = flashcards.filter((f) => f.srsLastReview !== null);

  // Overdue flashcards
  if (overdue.length > 10) {
    const overdueRatio = overdue.length / flashcards.length;
    weaknesses.push({
      category: 'openings',
      label: 'Flashcard backlog',
      metric: `${overdue.length} of ${flashcards.length} flashcards overdue`,
      severity: Math.min(50, Math.round(overdueRatio * 100)),
      detail: `You have ${overdue.length} overdue flashcards. These are opening concepts you've learned but are starting to forget. Spending 5 minutes daily on flashcards maintains long-term retention.`,
      trainingAction: {
        route: '/play',
        buttonLabel: 'Review Flashcards',
      },
    });
  }

  // Good retention
  if (reviewed.length > 0) {
    const avgEase = reviewed.reduce((sum, f) => sum + f.srsEaseFactor, 0) / reviewed.length;
    if (avgEase >= 2.5 && reviewed.length >= 20) {
      strengths.push(`Good opening knowledge retention (${reviewed.length} flashcards reviewed)`);
    }
  }

  return { weaknesses, strengths };
}

// ─── Endgame Analysis ───────────────────────────────────────────────────────

function analyzeEndgame(themeSkills: ThemeSkill[]): {
  weaknesses: WeaknessItem[];
  strengths: string[];
} {
  const weaknesses: WeaknessItem[] = [];
  const strengths: string[] = [];

  const endgameSkill = themeSkills.find((s) => s.theme === 'endgame');

  if (endgameSkill && endgameSkill.attempts >= MIN_PUZZLE_ATTEMPTS_FOR_WEAKNESS) {
    if (endgameSkill.accuracy < WEAK_THEME_ACCURACY_THRESHOLD) {
      weaknesses.push({
        category: 'endgame',
        label: 'Endgame technique needs work',
        metric: `${Math.round(endgameSkill.accuracy * 100)}% endgame puzzle accuracy`,
        severity: Math.round((1 - endgameSkill.accuracy) * 90),
        detail: `Your endgame puzzle accuracy is ${Math.round(endgameSkill.accuracy * 100)}%. Endgames are where games are decided. Focus on king and pawn endgames, then rook endgames — they're the most common.`,
        trainingAction: {
          route: '/puzzles',
          buttonLabel: 'Train Endgames',
          state: { forcedWeakThemes: ['endgame'] },
        },
      });
    } else if (endgameSkill.accuracy >= STRONG_THEME_ACCURACY_THRESHOLD) {
      strengths.push(`Solid endgame technique (${Math.round(endgameSkill.accuracy * 100)}% accuracy)`);
    }
  }

  return { weaknesses, strengths };
}

// ─── Mistake Puzzle Analysis ─────────────────────────────────────────────

function analyzeMistakePuzzles(mistakePuzzles: MistakePuzzle[]): {
  weaknesses: WeaknessItem[];
  strengths: string[];
} {
  const weaknesses: WeaknessItem[] = [];
  const strengths: string[] = [];

  if (mistakePuzzles.length < 3) return { weaknesses, strengths };

  // Phase breakdown: which game phase has the most mistakes?
  const byPhase: Record<string, number> = { opening: 0, middlegame: 0, endgame: 0 };
  for (const p of mistakePuzzles) {
    byPhase[p.gamePhase]++;
  }

  const total = mistakePuzzles.length;
  const phaseLabels: Record<string, string> = {
    opening: 'the opening',
    middlegame: 'the middlegame',
    endgame: 'the endgame',
  };

  for (const [phase, count] of Object.entries(byPhase)) {
    const ratio = count / total;
    if (count >= 3 && ratio > 0.5) {
      const phaseAction: WeaknessTrainingAction = phase === 'opening'
        ? { route: '/openings', buttonLabel: 'Drill Openings' }
        : phase === 'endgame'
          ? { route: '/puzzles', buttonLabel: 'Train Endgames', state: { forcedWeakThemes: ['endgame'] } }
          : { route: '/puzzles/mistakes', buttonLabel: 'Review Mistakes' };
      weaknesses.push({
        category: phase === 'endgame' ? 'endgame' : phase === 'opening' ? 'openings' : 'calculation',
        label: `Most mistakes in ${phaseLabels[phase]}`,
        metric: `${count} of ${total} mistakes (${Math.round(ratio * 100)}%)`,
        severity: Math.round(ratio * 70),
        detail: `Over half your mistakes from real games happen in ${phaseLabels[phase]}. Focus your practice on ${phaseLabels[phase]} patterns and positions.`,
        trainingAction: phaseAction,
      });
    }
  }

  // Blunder ratio: how many mistakes are blunders?
  const blunders = mistakePuzzles.filter((p) => p.classification === 'blunder').length;
  if (blunders >= 3) {
    const blunderRatio = blunders / total;
    if (blunderRatio > 0.4) {
      weaknesses.push({
        category: 'calculation',
        label: 'Frequent blunders in games',
        metric: `${blunders} blunders out of ${total} mistakes (${Math.round(blunderRatio * 100)}%)`,
        severity: Math.min(85, Math.round(blunderRatio * 120)),
        detail: `${Math.round(blunderRatio * 100)}% of your game mistakes are blunders (300+ centipawn loss). Before each move, do a quick blunder check — ask if anything is hanging or if your opponent has a tactic.`,
        trainingAction: {
          route: '/puzzles/mistakes',
          buttonLabel: 'Fix My Blunders',
        },
      });
    }
  }

  // Unsolved ratio: are they actually working on their mistakes?
  const unsolved = mistakePuzzles.filter((p) => p.status === 'unsolved').length;
  if (unsolved >= 5) {
    const unsolvedRatio = unsolved / total;
    if (unsolvedRatio > 0.6) {
      weaknesses.push({
        category: 'tactics',
        label: 'Unresolved game mistakes',
        metric: `${unsolved} of ${total} mistake puzzles still unsolved`,
        severity: Math.round(unsolvedRatio * 50),
        detail: `You have ${unsolved} mistake puzzles from your own games that haven't been solved yet. Reviewing your mistakes is one of the most effective ways to improve. Head to My Mistakes to work through them.`,
        trainingAction: {
          route: '/puzzles/mistakes',
          buttonLabel: 'Solve My Mistakes',
        },
      });
    }
  }

  // Strength: high mastery rate
  const mastered = mistakePuzzles.filter((p) => p.status === 'mastered').length;
  if (mastered >= 5 && mastered / total > 0.4) {
    strengths.push(`Mastered ${mastered} of ${total} mistake puzzles from your games`);
  }

  weaknesses.sort((a, b) => b.severity - a.severity);
  return { weaknesses, strengths };
}

// ─── Overall Assessment Generator ───────────────────────────────────────────

function generateOverallAssessment(
  profile: UserProfile,
  items: WeaknessItem[],
  strengthsList: string[],
): string {
  const lines: string[] = [];

  if (items.length === 0 && strengthsList.length === 0) {
    return `Not enough data yet to generate a meaningful assessment. Play some games, solve puzzles, and drill your openings — then check back for personalised insights.`;
  }

  lines.push(`Rating: ~${profile.currentRating} ELO, Level ${profile.level}.`);

  if (strengthsList.length > 0) {
    lines.push(`Strengths: ${strengthsList.slice(0, 3).join('; ')}.`);
  }

  if (items.length > 0) {
    const topWeakness = items[0];
    lines.push(`Primary focus area: ${topWeakness.label} (${topWeakness.metric}).`);

    if (items.length > 1) {
      lines.push(`Also work on: ${items.slice(1, 3).map((i) => i.label).join(', ')}.`);
    }
  }

  const unresolvedHabits = profile.badHabits.filter((h) => !h.isResolved);
  if (unresolvedHabits.length > 0) {
    lines.push(`Known habits to break: ${unresolvedHabits.map((h) => h.description).join('; ')}.`);
  }

  return lines.join(' ');
}

// ─── Update Skill Radar ─────────────────────────────────────────────────────

function computeSkillRadar(
  themeSkills: ThemeSkill[],
  repertoire: OpeningRecord[],
  _sessions: SessionRecord[],
  flashcards: FlashcardRecord[],
  games: GameRecord[],
): UserProfile['skillRadar'] {
  // Tactics: based on puzzle theme accuracy
  const tacticsSkills = themeSkills.filter((s) => s.attempts >= 3);
  const tacticsScore = tacticsSkills.length > 0
    ? Math.round((tacticsSkills.reduce((sum, s) => sum + s.accuracy, 0) / tacticsSkills.length) * 100)
    : 50;

  // Opening: based on drill accuracy
  const drilledOpenings = repertoire.filter((o) => o.drillAttempts > 0);
  const openingScore = drilledOpenings.length > 0
    ? Math.round((drilledOpenings.reduce((sum, o) => sum + o.drillAccuracy, 0) / drilledOpenings.length) * 100)
    : 50;

  // Memory: based on flashcard retention
  const reviewedCards = flashcards.filter((f) => f.srsLastReview !== null);
  const memoryScore = reviewedCards.length > 0
    ? Math.round(Math.min(100, (reviewedCards.reduce((sum, f) => sum + f.srsEaseFactor, 0) / reviewedCards.length) * 40))
    : 50;

  // Endgame: based on endgame puzzle accuracy
  const endgameSkill = themeSkills.find((s) => s.theme === 'endgame');
  const endgameScore = endgameSkill && endgameSkill.attempts >= 3
    ? Math.round(endgameSkill.accuracy * 100)
    : 50;

  // Calculation: based on game move quality (lower error rate = higher score)
  let calcScore = 50;
  const annotatedGames = games.filter((g) => g.annotations && g.annotations.length > 0);
  if (annotatedGames.length > 0) {
    let totalMoves = 0;
    let totalErrors = 0;
    for (const game of annotatedGames) {
      if (!game.annotations) continue;
      totalMoves += game.annotations.length;
      totalErrors += game.annotations.filter(
        (a) => a.classification === 'blunder' || a.classification === 'mistake',
      ).length;
    }
    if (totalMoves > 0) {
      const errorRate = totalErrors / totalMoves;
      calcScore = Math.round(Math.max(10, Math.min(100, (1 - errorRate * 5) * 100)));
    }
  }

  return {
    opening: Math.max(0, Math.min(100, openingScore)),
    tactics: Math.max(0, Math.min(100, tacticsScore)),
    endgame: Math.max(0, Math.min(100, endgameScore)),
    memory: Math.max(0, Math.min(100, memoryScore)),
    calculation: Math.max(0, Math.min(100, calcScore)),
  };
}

// ─── Main API ───────────────────────────────────────────────────────────────

// ─── Opening Weak Spot Analysis ─────────────────────────────────────────────

function analyzeOpeningWeakSpots(weakSpots: OpeningWeakSpot[]): {
  weaknesses: WeaknessItem[];
  strengths: string[];
} {
  const weaknesses: WeaknessItem[] = [];
  const strengths: string[] = [];

  if (weakSpots.length === 0) return { weaknesses, strengths };

  // Group by opening
  const byOpening = new Map<string, OpeningWeakSpot[]>();
  for (const spot of weakSpots) {
    const existing = byOpening.get(spot.openingId) ?? [];
    existing.push(spot);
    byOpening.set(spot.openingId, existing);
  }

  for (const [openingId, spots] of byOpening) {
    const totalFails = spots.reduce((sum, s) => sum + s.failCount, 0);
    const worstSpot = spots[0]; // already sorted by failCount desc
    const openingName = worstSpot.openingName;

    if (totalFails >= 5) {
      const severity = Math.min(90, 30 + totalFails * 3);
      weaknesses.push({
        category: 'opening_weakspots',
        label: `Recurring mistakes in ${openingName}`,
        metric: `${totalFails} total failures across ${spots.length} positions`,
        severity,
        detail: `You consistently struggle with ${spots.length} position${spots.length > 1 ? 's' : ''} in the ${openingName}. The hardest spot (${worstSpot.correctMoveSan}) has been missed ${worstSpot.failCount} time${worstSpot.failCount > 1 ? 's' : ''}.`,
        trainingAction: {
          route: `/openings/${openingId}`,
          buttonLabel: `Drill ${openingName} Weak Spots`,
        },
      });
    } else if (totalFails >= 3) {
      weaknesses.push({
        category: 'opening_weakspots',
        label: `Shaky positions in ${openingName}`,
        metric: `${totalFails} failures in ${spots.length} positions`,
        severity: 25 + totalFails * 2,
        detail: `You've stumbled on ${spots.length} position${spots.length > 1 ? 's' : ''} in the ${openingName}. Practice these specific moves.`,
        trainingAction: {
          route: `/openings/${openingId}`,
          buttonLabel: `Practice ${openingName}`,
        },
      });
    }
  }

  if (weakSpots.length > 0 && weaknesses.length === 0) {
    strengths.push('Only occasional opening mistakes — keep drilling!');
  }

  return { weaknesses, strengths };
}

/**
 * Computes a full WeaknessProfile from all available data.
 * Reads puzzles, games, sessions, openings, and flashcards from Dexie.
 * Stores the result in the meta table and updates the Zustand store.
 */
export async function computeWeaknessProfile(
  profile: UserProfile,
): Promise<WeaknessProfile> {
  // Gather all data in parallel
  const [themeSkills, repertoire, recentGames, recentSessions, flashcards, mistakePuzzles, weakSpots] = await Promise.all([
    getThemeSkills(),
    getRepertoireOpenings(),
    db.games.orderBy('date').reverse().limit(RECENT_GAMES_LIMIT).toArray(),
    db.sessions.orderBy('date').reverse().limit(RECENT_SESSIONS_LIMIT).toArray(),
    db.flashcards.toArray(),
    db.mistakePuzzles.toArray(),
    db.openingWeakSpots.toArray(),
  ]);

  // Run each analyzer
  const tactics = analyzeTactics(themeSkills);
  const openings = analyzeOpenings(repertoire);
  const gameAnalysis = analyzeGames(recentGames);
  const sessions = analyzeSessionConsistency(recentSessions);
  const flashcardAnalysis = analyzeFlashcards(flashcards);
  const endgame = analyzeEndgame(themeSkills);
  const mistakes = analyzeMistakePuzzles(mistakePuzzles);
  const openingWeakSpots = analyzeOpeningWeakSpots(weakSpots);

  // Merge all items and strengths
  const allItems: WeaknessItem[] = [
    ...tactics.weaknesses,
    ...openings.weaknesses,
    ...openingWeakSpots.weaknesses,
    ...gameAnalysis.weaknesses,
    ...sessions.weaknesses,
    ...flashcardAnalysis.weaknesses,
    ...endgame.weaknesses,
    ...mistakes.weaknesses,
  ].sort((a, b) => b.severity - a.severity);

  const allStrengths: string[] = [
    ...tactics.strengths,
    ...openings.strengths,
    ...openingWeakSpots.strengths,
    ...gameAnalysis.strengths,
    ...sessions.strengths,
    ...flashcardAnalysis.strengths,
    ...endgame.strengths,
    ...mistakes.strengths,
  ];

  // Cap at top 10 weaknesses
  const topItems = allItems.slice(0, 10);

  const weaknessProfile: WeaknessProfile = {
    computedAt: new Date().toISOString(),
    items: topItems,
    strengths: allStrengths,
    overallAssessment: generateOverallAssessment(profile, topItems, allStrengths),
  };

  // Persist to meta table
  await db.meta.put({
    key: 'weakness_profile',
    value: JSON.stringify(weaknessProfile),
  });

  // Update skill radar from real data
  const updatedRadar = computeSkillRadar(themeSkills, repertoire, recentSessions, flashcards, recentGames);
  await db.profiles.update(profile.id, { skillRadar: updatedRadar });

  return weaknessProfile;
}

/**
 * Loads the last computed WeaknessProfile from the meta table.
 * Returns null if no profile has been computed yet.
 */
export async function getStoredWeaknessProfile(): Promise<WeaknessProfile | null> {
  const meta = await db.meta.get('weakness_profile');
  if (!meta) return null;

  try {
    return JSON.parse(meta.value) as WeaknessProfile;
  } catch {
    return null;
  }
}

/**
 * Returns weakness items filtered by category.
 */
export function filterWeaknessesByCategory(
  profile: WeaknessProfile,
  category: WeaknessCategory,
): WeaknessItem[] {
  return profile.items.filter((item) => item.category === category);
}

// Export analyzers for testing
export const _testing = {
  analyzeTactics,
  analyzeOpenings,
  analyzeOpeningWeakSpots,
  analyzeGames,
  analyzeSessionConsistency,
  analyzeFlashcards,
  analyzeEndgame,
  analyzeMistakePuzzles,
  generateOverallAssessment,
  computeSkillRadar,
};

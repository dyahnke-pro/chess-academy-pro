import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { getThemeSkills } from './puzzleService';
import { getRepertoireOpenings } from './openingService';
import { detectTactics } from './tacticsDetector';
import type {
  WeaknessProfile,
  WeaknessItem,
  WeaknessCategory,
  StrengthItem,
  WeaknessTheme,
  WeaknessDrillItem,
  WeaknessDrillSession,
  UserProfile,
  GameRecord,
  MoveAnnotation,
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
          route: '/weaknesses/adaptive',
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
    // Only include fully-analyzed games. Sparse detectBlunders
    // annotations produce false weakness signals because most moves
    // have no classification — same root cause as the 0% accuracy bug.
    if (!game.fullyAnalyzed) continue;
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
        route: '/weaknesses/mistakes',
        buttonLabel: 'Drill my calculation errors',
        state: { initialStatus: 'unsolved' },
      },
    });
  } else if (errorRate < 0.03 && gamesWithAnnotations >= MIN_GAMES_FOR_TIME_ANALYSIS) {
    strengths.push(`Clean calculation (only ${totalBlunders + totalMistakes} errors in ${gamesWithAnnotations} games)`);
  }

  // Late-game collapse
  if (lateBlunderGames >= 2 && gamesWithAnnotations >= MIN_GAMES_FOR_TIME_ANALYSIS) {
    const collapseRate = lateBlunderGames / gamesWithAnnotations;
    weaknesses.push({
      category: 'calculation',
      label: 'Late-game collapses',
      metric: `${lateBlunderGames} of ${gamesWithAnnotations} games had multiple errors in the last 10 moves`,
      severity: Math.min(85, Math.round(collapseRate * 200)),
      detail: `In ${Math.round(collapseRate * 100)}% of your recent games, you made multiple blunders or mistakes in the final moves. This often indicates time pressure or fatigue. Try playing with increment or practicing endgame speed drills.`,
      trainingAction: {
        route: '/weaknesses/mistakes',
        buttonLabel: 'Drill late-game positions',
        state: { initialPhase: 'endgame', initialStatus: 'unsolved' },
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
        route: '/weaknesses/mistakes',
        buttonLabel: 'Fix my blunders',
        state: { initialClassification: 'blunder', initialStatus: 'unsolved' },
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
          route: '/weaknesses/adaptive',
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

  const reviewed = flashcards.filter((f) => f.srsLastReview !== null);
  const today = new Date().toISOString().split('T')[0];
  const overdue = flashcards.filter((f) => f.srsLastReview !== null && f.srsDueDate < today);

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
          route: '/weaknesses/adaptive',
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

const MIN_OPENING_MISTAKES_FOR_WEAKNESS = 2;
const OPENING_MISTAKE_SEVERITY_BASE = 55;

function analyzeMistakePuzzles(mistakePuzzles: MistakePuzzle[]): {
  weaknesses: WeaknessItem[];
  strengths: string[];
} {
  const weaknesses: WeaknessItem[] = [];
  const strengths: string[] = [];

  if (mistakePuzzles.length < 3) return { weaknesses, strengths };

  const total = mistakePuzzles.length;

  // ── Opening-specific mistake clusters ────────────────────────────────
  // Group mistakes by the opening they occurred in and surface the worst ones.
  const byOpening = new Map<string, MistakePuzzle[]>();
  for (const p of mistakePuzzles) {
    if (!p.openingName) continue;
    const existing = byOpening.get(p.openingName);
    if (existing) {
      existing.push(p);
    } else {
      byOpening.set(p.openingName, [p]);
    }
  }

  const openingEntries = [...byOpening.entries()]
    .filter(([, puzzles]) => puzzles.length >= MIN_OPENING_MISTAKES_FOR_WEAKNESS)
    .sort((a, b) => {
      // Sort by total cpLoss descending to surface the most damaging openings first
      const aCpTotal = a[1].reduce((sum, p) => sum + p.cpLoss, 0);
      const bCpTotal = b[1].reduce((sum, p) => sum + p.cpLoss, 0);
      return bCpTotal - aCpTotal;
    });

  for (const [openingName, puzzles] of openingEntries.slice(0, 3)) {
    const blunderCount = puzzles.filter((p) => p.classification === 'blunder').length;
    const unsolvedCount = puzzles.filter((p) => p.status === 'unsolved').length;
    const avgCpLoss = Math.round(puzzles.reduce((sum, p) => sum + p.cpLoss, 0) / puzzles.length);
    const severity = Math.min(90, OPENING_MISTAKE_SEVERITY_BASE + puzzles.length * 5 + blunderCount * 8);

    const phaseCounts: Record<string, number> = { opening: 0, middlegame: 0, endgame: 0 };
    for (const p of puzzles) phaseCounts[p.gamePhase]++;
    const worstPhase = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1])[0][0];

    const detailParts: string[] = [
      `${puzzles.length} mistakes found in the ${openingName} (avg ${avgCpLoss} cp loss).`,
    ];
    if (blunderCount > 0) {
      detailParts.push(`${blunderCount} were blunders.`);
    }
    if (unsolvedCount > 0) {
      detailParts.push(`${unsolvedCount} still unsolved.`);
    }
    detailParts.push(`Most errors happen in the ${worstPhase}. Drill these specific positions from your games.`);

    weaknesses.push({
      category: worstPhase === 'opening' ? 'openings' : worstPhase === 'endgame' ? 'endgame' : 'calculation',
      label: `Mistakes in ${openingName}`,
      metric: `${puzzles.length} errors, ${blunderCount} blunders, avg ${avgCpLoss} cp loss`,
      severity,
      detail: detailParts.join(' '),
      trainingAction: {
        route: '/weaknesses/mistakes',
        buttonLabel: `Drill ${openingName} mistakes`,
        state: { initialOpeningName: openingName, initialStatus: 'unsolved' },
      },
    });
  }

  // ── Phase breakdown (only if no opening-specific items dominate) ──────
  const byPhase: Record<string, number> = { opening: 0, middlegame: 0, endgame: 0 };
  for (const p of mistakePuzzles) {
    byPhase[p.gamePhase]++;
  }

  const phaseLabels: Record<string, string> = {
    opening: 'the opening',
    middlegame: 'the middlegame',
    endgame: 'the endgame',
  };

  for (const [phase, count] of Object.entries(byPhase)) {
    const ratio = count / total;
    if (count >= 3 && ratio > 0.5) {
      weaknesses.push({
        category: phase === 'endgame' ? 'endgame' : phase === 'opening' ? 'openings' : 'calculation',
        label: `Most mistakes in ${phaseLabels[phase]}`,
        metric: `${count} of ${total} mistakes (${Math.round(ratio * 100)}%)`,
        severity: Math.round(ratio * 70),
        detail: `Over half your mistakes from real games happen in ${phaseLabels[phase]}. Focus your practice on ${phaseLabels[phase]} patterns and positions.`,
        trainingAction: {
          route: '/weaknesses/mistakes',
          buttonLabel: `Drill ${phase} mistakes`,
          state: { initialPhase: phase, initialStatus: 'unsolved' },
        },
      });
    }
  }

  // ── Blunder ratio ────────────────────────────────────────────────────
  const blunders = mistakePuzzles.filter((p) => p.classification === 'blunder');
  if (blunders.length >= 3) {
    const blunderRatio = blunders.length / total;
    if (blunderRatio > 0.4) {
      const unsolvedBlunders = blunders.filter((p) => p.status === 'unsolved').length;
      const recentBlunder = blunders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      const blunderContext = recentBlunder.openingName
        ? ` Most recent: move ${recentBlunder.moveNumber} in the ${recentBlunder.openingName}.`
        : ` Most recent: move ${recentBlunder.moveNumber} (${recentBlunder.playerMoveSan} instead of ${recentBlunder.bestMoveSan}).`;

      weaknesses.push({
        category: 'calculation',
        label: 'Frequent blunders in games',
        metric: `${blunders.length} blunders out of ${total} mistakes (${Math.round(blunderRatio * 100)}%)`,
        severity: Math.min(85, Math.round(blunderRatio * 120)),
        detail: `${Math.round(blunderRatio * 100)}% of your game mistakes are blunders (300+ centipawn loss).${blunderContext}${unsolvedBlunders > 0 ? ` ${unsolvedBlunders} blunder positions still unsolved.` : ''} Before each move, do a quick blunder check.`,
        trainingAction: {
          route: '/weaknesses/mistakes',
          buttonLabel: `Fix ${unsolvedBlunders > 0 ? unsolvedBlunders : blunders.length} blunders`,
          state: { initialClassification: 'blunder', initialStatus: unsolvedBlunders > 0 ? 'unsolved' : undefined },
        },
      });
    }
  }

  // ── Due / unsolved mistake puzzles ───────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const dueMistakes = mistakePuzzles.filter(
    (p) => p.status !== 'mastered' && p.srsDueDate <= today,
  );

  if (dueMistakes.length >= 3) {
    const dueBlunders = dueMistakes.filter((p) => p.classification === 'blunder').length;
    const dueSeverity = Math.min(80, 30 + dueMistakes.length * 3 + dueBlunders * 5);

    weaknesses.push({
      category: 'tactics',
      label: `${dueMistakes.length} game mistakes due for review`,
      metric: `${dueMistakes.length} positions from your games need practice${dueBlunders > 0 ? ` (${dueBlunders} blunders)` : ''}`,
      severity: dueSeverity,
      detail: `You have ${dueMistakes.length} mistake positions from your own games that are due for spaced repetition review. These are the exact positions where you went wrong — solving them builds pattern recognition for your real weaknesses.`,
      trainingAction: {
        route: '/weaknesses/mistakes',
        buttonLabel: `Review ${dueMistakes.length} due mistakes`,
        state: { initialStatus: 'unsolved' },
      },
    });
  }

  // ── Unsolved backlog (separate from due — covers all unsolved) ───────
  const unsolved = mistakePuzzles.filter((p) => p.status === 'unsolved');
  if (unsolved.length >= 5) {
    const unsolvedRatio = unsolved.length / total;
    if (unsolvedRatio > 0.6) {
      // Find the most common opening among unsolved
      const unsolvedByOpening = new Map<string, number>();
      for (const p of unsolved) {
        if (p.openingName) {
          unsolvedByOpening.set(p.openingName, (unsolvedByOpening.get(p.openingName) ?? 0) + 1);
        }
      }
      const sortedUnsolvedOpenings = [...unsolvedByOpening.entries()].sort((a, b) => b[1] - a[1]);
      const topUnsolvedOpening = sortedUnsolvedOpenings.length > 0 ? sortedUnsolvedOpenings[0] : undefined;

      weaknesses.push({
        category: 'tactics',
        label: 'Unresolved game mistakes',
        metric: `${unsolved.length} of ${total} mistake puzzles still unsolved`,
        severity: Math.round(unsolvedRatio * 50),
        detail: `You have ${unsolved.length} mistake puzzles from your own games that haven't been solved yet.${topUnsolvedOpening ? ` ${topUnsolvedOpening[1]} are from the ${topUnsolvedOpening[0]}.` : ''} Reviewing your actual mistakes is the fastest way to improve.`,
        trainingAction: {
          route: '/weaknesses/mistakes',
          buttonLabel: 'Solve my mistakes',
          state: { initialStatus: 'unsolved' },
        },
      });
    }
  }

  // ── Strength: high mastery rate ──────────────────────────────────────
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

  lines.push(`Rating: ~${profile.currentRating} ELO.`);

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
  const annotatedGames = games.filter((g) => g.annotations && g.annotations.length > 0);

  // ── Collect per-phase error rates from annotated games ──────────────
  let openingMoves = 0;
  let openingErrors = 0;
  let midgameMoves = 0;
  let midgameErrors = 0;
  let endgameMoves = 0;
  let endgameErrors = 0;
  let totalMoves = 0;
  let totalErrors = 0;

  for (const game of annotatedGames) {
    if (!game.fullyAnalyzed || !game.annotations) continue;
    const len = game.annotations.length;
    totalMoves += len;

    for (let i = 0; i < len; i++) {
      const a = game.annotations[i];
      const isError = a.classification === 'blunder' || a.classification === 'mistake';
      if (isError) totalErrors++;

      // Phase thresholds: opening = first 15 half-moves, endgame = last 20, rest = middlegame
      if (i < 15) {
        openingMoves++;
        if (isError) openingErrors++;
      } else if (i >= len - 20) {
        endgameMoves++;
        if (isError) endgameErrors++;
      } else {
        midgameMoves++;
        if (isError) midgameErrors++;
      }
    }
  }

  const hasGameData = annotatedGames.length > 0 && totalMoves > 0;

  // ── Tactics: puzzle accuracy blended with middlegame error rate ─────
  const tacticsSkills = themeSkills.filter((s) => s.attempts >= 3);
  const puzzleTacticsScore = tacticsSkills.length > 0
    ? Math.round((tacticsSkills.reduce((sum, s) => sum + s.accuracy, 0) / tacticsSkills.length) * 100)
    : null;
  const gameTacticsScore = hasGameData && midgameMoves > 0
    ? Math.round(Math.max(10, (1 - (midgameErrors / midgameMoves) * 6) * 100))
    : null;
  const tacticsScore = blendScores(puzzleTacticsScore, gameTacticsScore, 50);

  // ── Opening: drill accuracy blended with early-game error rate ─────
  const drilledOpenings = repertoire.filter((o) => o.drillAttempts > 0);
  const drillOpeningScore = drilledOpenings.length > 0
    ? Math.round((drilledOpenings.reduce((sum, o) => sum + o.drillAccuracy, 0) / drilledOpenings.length) * 100)
    : null;
  const gameOpeningScore = hasGameData && openingMoves > 0
    ? Math.round(Math.max(10, (1 - (openingErrors / openingMoves) * 8) * 100))
    : null;
  const openingScore = blendScores(drillOpeningScore, gameOpeningScore, 50);

  // ── Memory: flashcard retention (no game component) ────────────────
  const reviewedCards = flashcards.filter((f) => f.srsLastReview !== null);
  const memoryScore = reviewedCards.length > 0
    ? Math.round(Math.min(100, (reviewedCards.reduce((sum, f) => sum + f.srsEaseFactor, 0) / reviewedCards.length) * 40))
    : 50;

  // ── Endgame: puzzle accuracy blended with late-game error rate ─────
  const endgameSkill = themeSkills.find((s) => s.theme === 'endgame');
  const puzzleEndgameScore = endgameSkill && endgameSkill.attempts >= 3
    ? Math.round(endgameSkill.accuracy * 100)
    : null;
  const gameEndgameScore = hasGameData && endgameMoves > 0
    ? Math.round(Math.max(10, (1 - (endgameErrors / endgameMoves) * 6) * 100))
    : null;
  const endgameScore = blendScores(puzzleEndgameScore, gameEndgameScore, 50);

  // ── Calculation: overall game error rate ───────────────────────────
  const calcScore = hasGameData
    ? Math.round(Math.max(10, Math.min(100, (1 - (totalErrors / totalMoves) * 5) * 100)))
    : 50;

  return {
    opening: clampScore(openingScore),
    tactics: clampScore(tacticsScore),
    endgame: clampScore(endgameScore),
    memory: clampScore(memoryScore),
    calculation: clampScore(calcScore),
  };
}

/** Blend two optional score sources (60% weight on primary, 40% on game data). */
function blendScores(primary: number | null, gameScore: number | null, fallback: number): number {
  if (primary !== null && gameScore !== null) {
    return Math.round(primary * 0.6 + gameScore * 0.4);
  }
  return primary ?? gameScore ?? fallback;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
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

// ─── Strength Item Builder ──────────────────────────────────────────────────

function buildStrengthItems(
  themeSkills: ThemeSkill[],
  repertoire: OpeningRecord[],
  games: GameRecord[],
  sessions: SessionRecord[],
  flashcards: FlashcardRecord[],
  mistakePuzzles: MistakePuzzle[],
): StrengthItem[] {
  const items: StrengthItem[] = [];

  // Tactics: find best themes (>= 70% accuracy, >= 5 attempts)
  const strongThemes = themeSkills
    .filter((s) => s.attempts >= 5 && s.accuracy >= 0.7)
    .sort((a, b) => b.accuracy - a.accuracy);
  for (const theme of strongThemes.slice(0, 3)) {
    const pct = Math.round(theme.accuracy * 100);
    items.push({
      title: `${theme.theme.charAt(0).toUpperCase()}${theme.theme.slice(1)} Mastery`,
      detail: `You solve ${theme.theme} puzzles at ${pct}% accuracy across ${theme.attempts} attempts. This is well above average and shows strong pattern recognition for this motif.`,
      category: 'tactics',
      metric: `${pct}% accuracy, ${theme.attempts} attempts`,
    });
  }

  // Openings: find best drilled openings (>= 80% accuracy)
  const strongOpenings = repertoire
    .filter((o) => o.drillAttempts >= 5 && o.drillAccuracy >= 0.8)
    .sort((a, b) => b.drillAccuracy - a.drillAccuracy);
  for (const opening of strongOpenings.slice(0, 3)) {
    const pct = Math.round(opening.drillAccuracy * 100);
    items.push({
      title: opening.name,
      detail: `You recall the main line and key variations at ${pct}% accuracy over ${opening.drillAttempts} drills. This opening is well-prepared and ready for tournament play.`,
      category: 'openings',
      metric: `${pct}% drill accuracy`,
    });
  }

  // Calculation: from game annotation data
  const annotatedGames = games.filter((g) => g.annotations && g.annotations.length > 0);
  if (annotatedGames.length >= 3) {
    let totalMoves = 0;
    let totalErrors = 0;
    let brilliantCount = 0;
    let greatCount = 0;
    for (const game of annotatedGames) {
      if (!game.fullyAnalyzed || !game.annotations) continue;
      totalMoves += game.annotations.length;
      totalErrors += game.annotations.filter(
        (a) => a.classification === 'blunder' || a.classification === 'mistake',
      ).length;
      brilliantCount += game.annotations.filter((a) => a.classification === 'brilliant').length;
      greatCount += game.annotations.filter((a) => a.classification === 'great').length;
    }
    if (totalMoves > 0) {
      const errorRate = totalErrors / totalMoves;
      if (errorRate < 0.05) {
        items.push({
          title: 'Precise Calculation',
          detail: `Only ${totalErrors} mistakes/blunders across ${totalMoves} moves in ${annotatedGames.length} recent games (${(errorRate * 100).toFixed(1)}% error rate). Your move selection is consistently accurate.`,
          category: 'calculation',
          metric: `${(errorRate * 100).toFixed(1)}% error rate`,
        });
      }
      if (brilliantCount + greatCount >= 3) {
        items.push({
          title: 'Creative Play',
          detail: `${brilliantCount} brilliant and ${greatCount} great moves found in your recent games. You regularly find moves that are better than the obvious choice.`,
          category: 'calculation',
          metric: `${brilliantCount + greatCount} strong moves`,
        });
      }
    }
  }

  // Endgame: from endgame puzzle theme
  const endgameSkill = themeSkills.find((s) => s.theme === 'endgame');
  if (endgameSkill && endgameSkill.attempts >= 5 && endgameSkill.accuracy >= 0.7) {
    const pct = Math.round(endgameSkill.accuracy * 100);
    items.push({
      title: 'Endgame Technique',
      detail: `${pct}% accuracy on endgame puzzles across ${endgameSkill.attempts} positions. You reliably convert advantages and know key endgame patterns.`,
      category: 'endgame',
      metric: `${pct}% accuracy`,
    });
  }

  // Session consistency
  if (sessions.length >= 5) {
    const dates = sessions.map((s) => new Date(s.date).getTime()).sort((a, b) => a - b);
    let totalGap = 0;
    for (let i = 1; i < dates.length; i++) {
      totalGap += (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
    }
    const avgGap = totalGap / (dates.length - 1);
    if (avgGap <= 3) {
      items.push({
        title: 'Training Consistency',
        detail: `You train every ${avgGap.toFixed(1)} days on average across ${sessions.length} sessions. Consistent practice is the single biggest predictor of improvement.`,
        category: 'time_management',
        metric: `${avgGap.toFixed(1)} day avg gap`,
      });
    }
  }

  // Mistake puzzle mastery
  const mastered = mistakePuzzles.filter((p) => p.status === 'mastered').length;
  const total = mistakePuzzles.length;
  if (mastered >= 5 && total > 0) {
    const pct = Math.round((mastered / total) * 100);
    items.push({
      title: 'Learning From Mistakes',
      detail: `You've mastered ${mastered} of ${total} mistake puzzles (${pct}%). This means you've corrected these patterns and are unlikely to repeat them in games.`,
      category: 'positional',
      metric: `${mastered}/${total} mastered`,
    });
  }

  // Flashcard retention
  const reviewedCards = flashcards.filter((f) => f.srsLastReview !== null);
  if (reviewedCards.length >= 10) {
    const avgEase = reviewedCards.reduce((sum, f) => sum + f.srsEaseFactor, 0) / reviewedCards.length;
    if (avgEase >= 2.3) {
      items.push({
        title: 'Strong Opening Memory',
        detail: `${reviewedCards.length} flashcards reviewed with a high retention factor (${avgEase.toFixed(1)}). Your spaced repetition is working — key positions are sticking in long-term memory.`,
        category: 'openings',
        metric: `${reviewedCards.length} cards, ${avgEase.toFixed(1)} ease`,
      });
    }
  }

  return items;
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

  // Build detailed strength items from raw data
  const strengthItems = buildStrengthItems(themeSkills, repertoire, recentGames, recentSessions, flashcards, mistakePuzzles);

  // Cap at top 10 weaknesses
  const topItems = allItems.slice(0, 10);

  const weaknessProfile: WeaknessProfile = {
    computedAt: new Date().toISOString(),
    items: topItems,
    strengths: allStrengths,
    strengthItems,
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
    const parsed = JSON.parse(meta.value) as Omit<WeaknessProfile, 'strengthItems'> & { strengthItems?: StrengthItem[] };
    return { ...parsed, strengthItems: parsed.strengthItems ?? [] };
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

// ─── Weakness-to-Drill: analyzeGameMistakes ────────────────────────────────

interface GameMistake {
  fen: string;
  moveNumber: number;
  san: string;
  bestMove: string | null;
  cpLoss: number;
  classification: 'inaccuracy' | 'mistake' | 'blunder';
  gamePhase: 'opening' | 'middlegame' | 'endgame';
  openingName: string | null;
  hasTactics: boolean;
  tacticTypes: string[];
}

function classifyPhase(moveIndex: number, totalMoves: number): 'opening' | 'middlegame' | 'endgame' {
  if (moveIndex < 15) return 'opening';
  if (moveIndex >= totalMoves - 20) return 'endgame';
  return 'middlegame';
}

/**
 * Extracts classified mistakes from a single GameRecord.
 * Works with both imported PGNs (Chess.com, Lichess) and in-app coach games
 * that have annotations attached.
 */
export function analyzeGameMistakes(game: GameRecord): GameMistake[] {
  if (!game.annotations || game.annotations.length === 0) return [];

  const totalMoves = game.annotations.length;
  const mistakes: GameMistake[] = [];

  // Build FEN list from annotations — annotations are in move order
  // We use evaluation deltas to compute cpLoss
  for (let i = 0; i < totalMoves; i++) {
    const ann: MoveAnnotation = game.annotations[i];
    if (
      ann.classification !== 'inaccuracy' &&
      ann.classification !== 'mistake' &&
      ann.classification !== 'blunder'
    ) {
      continue;
    }

    // Compute centipawn loss from adjacent evaluations
    let cpLoss = 0;
    if (ann.evaluation !== null && i > 0) {
      const prevAnn = game.annotations[i - 1];
      if (prevAnn.evaluation !== null) {
        cpLoss = Math.abs(ann.evaluation - prevAnn.evaluation);
      }
    }

    // Default cpLoss estimates when evaluations are missing
    if (cpLoss === 0) {
      switch (ann.classification) {
        case 'inaccuracy': cpLoss = 60; break;
        case 'mistake': cpLoss = 150; break;
        case 'blunder': cpLoss = 350; break;
      }
    }

    const phase = classifyPhase(i, totalMoves);

    // Build a synthetic FEN for tactic detection from the annotation
    // We need a position FEN — try to reconstruct from the annotation data
    // If no FEN is available directly, use the move number as a stand-in
    const positionFen = buildFenFromAnnotationIndex(game, i);
    const tacticsResult = positionFen ? detectTactics(positionFen) : null;
    const tacticTypes = tacticsResult
      ? tacticsResult.tactics.map((t) => t.type)
      : [];

    mistakes.push({
      fen: positionFen ?? '',
      moveNumber: ann.moveNumber,
      san: ann.san,
      bestMove: ann.bestMove,
      cpLoss,
      classification: ann.classification,
      gamePhase: phase,
      openingName: game.openingId,
      hasTactics: tacticTypes.length > 0,
      tacticTypes,
    });
  }

  return mistakes;
}

/**
 * Rebuild a FEN at a given annotation index by replaying the game PGN.
 * Returns null if the PGN can't be replayed.
 */
function buildFenFromAnnotationIndex(game: GameRecord, index: number): string | null {
  try {
    const chess = new Chess();
    chess.loadPgn(game.pgn);
    const history = chess.history();
    chess.reset();

    // Replay up to the move at `index` (the position BEFORE the mistake move)
    for (let i = 0; i < index && i < history.length; i++) {
      chess.move(history[i]);
    }
    return chess.fen();
  } catch {
    return null;
  }
}

// ─── Weakness-to-Drill: detectWeaknessThemes ───────────────────────────────

/**
 * Groups an array of mistake puzzles into weakness themes with frequency,
 * sample FENs, and average centipawn loss.
 *
 * Themes are derived from:
 * 1. Tactic type (fork, pin, etc.) via tacticsDetector
 * 2. Game phase (opening blunders, endgame collapses)
 * 3. Piece-related patterns (hanging pieces)
 */
export function detectWeaknessThemes(mistakes: MistakePuzzle[]): WeaknessTheme[] {
  if (mistakes.length === 0) return [];

  const themeMap = new Map<string, {
    pattern: string;
    fens: string[];
    cpLosses: number[];
  }>();

  function addToTheme(key: string, pattern: string, fen: string, cpLoss: number): void {
    const existing = themeMap.get(key);
    if (existing) {
      if (existing.fens.length < 5) existing.fens.push(fen);
      existing.cpLosses.push(cpLoss);
    } else {
      themeMap.set(key, { pattern, fens: [fen], cpLosses: [cpLoss] });
    }
  }

  for (const mp of mistakes) {
    // 1. Classify by tactic type if available
    if (mp.tacticType) {
      const label = TACTIC_THEME_LABELS[mp.tacticType] ?? mp.tacticType;
      addToTheme(
        `tactic:${mp.tacticType}`,
        `Missed ${label.toLowerCase()} patterns`,
        mp.fen,
        mp.cpLoss,
      );
    }

    // 2. Detect tactics from FEN using the deterministic detector
    const detected = detectTactics(mp.fen);
    for (const tactic of detected.tactics) {
      const tacticKey = `tactic:${tactic.type}`;
      if (!themeMap.has(tacticKey)) {
        const label = TACTIC_THEME_LABELS[tactic.type] ?? tactic.type;
        addToTheme(tacticKey, `Missed ${label.toLowerCase()} patterns`, mp.fen, mp.cpLoss);
      }
    }
    if (detected.hangingPieces.length > 0) {
      addToTheme('hanging_pieces', 'Left pieces undefended', mp.fen, mp.cpLoss);
    }

    // 3. Classify by game phase
    if (mp.gamePhase === 'opening') {
      addToTheme('phase:opening', 'Errors in the opening phase', mp.fen, mp.cpLoss);
    } else if (mp.gamePhase === 'endgame') {
      addToTheme('phase:endgame', 'Errors in endgame positions', mp.fen, mp.cpLoss);
    }

    // 4. Classify by severity
    if (mp.classification === 'blunder') {
      addToTheme('severity:blunder', 'Severe miscalculations (300+ cp)', mp.fen, mp.cpLoss);
    }
  }

  // Convert to WeaknessTheme array sorted by frequency
  const themes: WeaknessTheme[] = [];
  for (const [key, data] of themeMap) {
    const themeName = THEME_DISPLAY_NAMES[key] ?? key.replace(/^(tactic|phase|severity):/, '');
    themes.push({
      theme: themeName,
      specificPattern: data.pattern,
      frequency: data.cpLosses.length,
      sampleFens: data.fens,
      avgCentipawnLoss: Math.round(
        data.cpLosses.reduce((sum, v) => sum + v, 0) / data.cpLosses.length,
      ),
    });
  }

  themes.sort((a, b) => b.frequency - a.frequency);
  return themes;
}

const TACTIC_THEME_LABELS: Record<string, string> = {
  fork: 'Fork',
  pin: 'Pin',
  skewer: 'Skewer',
  discovered_attack: 'Discovered Attack',
  back_rank: 'Back Rank',
  hanging_piece: 'Hanging Piece',
  promotion: 'Promotion',
  deflection: 'Deflection',
  overloaded_piece: 'Overloaded Piece',
  trapped_piece: 'Trapped Piece',
  clearance: 'Clearance',
  interference: 'Interference',
  zwischenzug: 'Zwischenzug',
  x_ray: 'X-Ray',
  double_check: 'Double Check',
  tactical_sequence: 'Tactical Sequence',
};

const THEME_DISPLAY_NAMES: Record<string, string> = {
  'tactic:fork': 'Forks',
  'tactic:pin': 'Pins',
  'tactic:skewer': 'Skewers',
  'tactic:discovered_attack': 'Discovered Attacks',
  'tactic:back_rank': 'Back Rank Threats',
  'tactic:hanging_piece': 'Hanging Pieces',
  'tactic:promotion': 'Promotion Tactics',
  'tactic:deflection': 'Deflection',
  'tactic:overloaded_piece': 'Overloaded Pieces',
  'tactic:trapped_piece': 'Trapped Pieces',
  'tactic:clearance': 'Clearance Sacrifices',
  'tactic:interference': 'Interference',
  'tactic:zwischenzug': 'Zwischenzug',
  'tactic:x_ray': 'X-Ray Attacks',
  'tactic:double_check': 'Double Check',
  'tactic:tactical_sequence': 'Tactical Sequences',
  'hanging_pieces': 'Hanging Pieces',
  'phase:opening': 'Opening Blunders',
  'phase:endgame': 'Endgame Errors',
  'severity:blunder': 'Severe Blunders',
};

// ─── Weakness-to-Drill: generatePersonalizedDrill ──────────────────────────

/**
 * Generates a personalized drill session from the user's past mistakes,
 * grouped by weakness theme. If a specific theme is provided, the drill
 * focuses on that theme; otherwise it creates a mixed session across all
 * weakness themes.
 *
 * Returns drill items referencing real MistakePuzzle records from the
 * user's own games.
 */
export async function generatePersonalizedDrill(
  themeFilter?: string,
  maxItems: number = 20,
): Promise<WeaknessDrillSession> {
  const allMistakes = await db.mistakePuzzles.toArray();
  const nonMastered = allMistakes.filter((mp) => mp.status !== 'mastered');

  // Detect themes from all mistakes
  const themes = detectWeaknessThemes(nonMastered);

  // Build drill items
  let candidates: MistakePuzzle[];

  if (themeFilter) {
    // Filter mistakes relevant to the requested theme
    candidates = filterMistakesByTheme(nonMastered, themeFilter);
  } else {
    // Mixed training: round-robin across themes
    candidates = buildMixedQueue(nonMastered, themes, maxItems);
  }

  // Prioritize: SRS-due first, then unsolved, then by cpLoss desc
  const today = new Date().toISOString().split('T')[0];
  candidates.sort((a, b) => {
    // Due items first
    const aDue = a.srsDueDate <= today ? 0 : 1;
    const bDue = b.srsDueDate <= today ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;
    // Unsolved before solved
    const aStatus = a.status === 'unsolved' ? 0 : 1;
    const bStatus = b.status === 'unsolved' ? 0 : 1;
    if (aStatus !== bStatus) return aStatus - bStatus;
    // Higher cp loss first
    return b.cpLoss - a.cpLoss;
  });

  const selected = candidates.slice(0, maxItems);

  const drillItems: WeaknessDrillItem[] = selected.map((mp) => ({
    mistakePuzzle: mp,
    themeKey: resolveThemeKey(mp),
  }));

  return {
    themes: themeFilter ? themes.filter((t) => t.theme === themeFilter) : themes,
    drillItems,
    generatedAt: new Date().toISOString(),
  };
}

function filterMistakesByTheme(mistakes: MistakePuzzle[], theme: string): MistakePuzzle[] {
  // Reverse-lookup: find which internal key maps to the display name
  const internalKey = Object.entries(THEME_DISPLAY_NAMES).find(
    ([, name]) => name === theme,
  )?.[0];

  return mistakes.filter((mp) => {
    // Check tactic type match
    if (internalKey?.startsWith('tactic:')) {
      const tacticType = internalKey.replace('tactic:', '');
      if (mp.tacticType === tacticType) return true;
      // Also check via detector
      const detected = detectTactics(mp.fen);
      if (detected.tactics.some((t) => t.type === tacticType)) return true;
    }

    // Check hanging pieces
    if (internalKey === 'hanging_pieces' || theme === 'Hanging Pieces') {
      const detected = detectTactics(mp.fen);
      if (detected.hangingPieces.length > 0) return true;
    }

    // Check phase-based themes
    if (internalKey === 'phase:opening' || theme === 'Opening Blunders') {
      return mp.gamePhase === 'opening';
    }
    if (internalKey === 'phase:endgame' || theme === 'Endgame Errors') {
      return mp.gamePhase === 'endgame';
    }

    // Check severity
    if (internalKey === 'severity:blunder' || theme === 'Severe Blunders') {
      return mp.classification === 'blunder';
    }

    return false;
  });
}

function buildMixedQueue(
  mistakes: MistakePuzzle[],
  themes: WeaknessTheme[],
  maxItems: number,
): MistakePuzzle[] {
  if (themes.length === 0) return mistakes.slice(0, maxItems);

  const result: MistakePuzzle[] = [];
  const usedIds = new Set<string>();
  const perTheme = Math.max(2, Math.ceil(maxItems / themes.length));

  for (const theme of themes) {
    const themeItems = filterMistakesByTheme(mistakes, theme.theme);
    let added = 0;
    for (const mp of themeItems) {
      if (added >= perTheme || result.length >= maxItems) break;
      if (usedIds.has(mp.id)) continue;
      result.push(mp);
      usedIds.add(mp.id);
      added++;
    }
  }

  // Backfill if we didn't reach maxItems
  if (result.length < maxItems) {
    for (const mp of mistakes) {
      if (result.length >= maxItems) break;
      if (usedIds.has(mp.id)) continue;
      result.push(mp);
      usedIds.add(mp.id);
    }
  }

  return result;
}

function resolveThemeKey(mp: MistakePuzzle): string {
  if (mp.tacticType) {
    return THEME_DISPLAY_NAMES[`tactic:${mp.tacticType}`] ?? mp.tacticType;
  }
  if (mp.gamePhase === 'opening') return 'Opening Blunders';
  if (mp.gamePhase === 'endgame') return 'Endgame Errors';
  if (mp.classification === 'blunder') return 'Severe Blunders';
  return 'Tactical Oversights';
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
  classifyPhase,
  filterMistakesByTheme,
  buildMixedQueue,
  resolveThemeKey,
};

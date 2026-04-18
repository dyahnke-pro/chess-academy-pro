/**
 * coachContextSnapshot
 * --------------------
 * Builds the per-turn "where is the user, what do they have, what did
 * I just do" block that is injected into the agent coach's system
 * prompt. This is the difference between a chatbot ("share a PGN")
 * and an agent ("I see you have 633 games — opening your last
 * Catalan").
 *
 * The snapshot is small on purpose. We send it on every turn, so it
 * goes into the prompt cache; bloating it would burn tokens.
 */
import { useCoachSessionStore } from '../stores/coachSessionStore';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/schema';
import { getStoredWeaknessProfile } from './weaknessAnalyzer';
import type { GameRecord } from '../types';

export interface CoachContextSnapshot {
  /** Current React Router pathname. */
  route: string;
  /** Current visible board, when one exists. */
  board: { fen: string; label?: string } | null;
  /** What the agent is currently working on. */
  focus: { kind: string; value: string | null; label: string | null } | null;
  /** Dexie game library summary. */
  library: {
    totalGames: number;
    recentGames: { id: string; date: string; eco: string | null; white: string; black: string; result: string }[];
  };
  /** Recent weakness signal, if any. */
  weakness: { topItems: string[]; overallAssessment: string } | null;
  /** Recent agent actions and their results. */
  recentActions: { name: string; result: string; message?: string }[];
  /** Narration mode flag. */
  narrationMode: boolean;
}

const RECENT_GAMES_FOR_SNAPSHOT = 5;
const RECENT_ACTIONS_FOR_SNAPSHOT = 5;
const WEAKNESS_ITEMS_FOR_SNAPSHOT = 3;

/**
 * Gather a fresh snapshot. Cheap (one Dexie count + one games query
 * + one weakness profile read) so it can run on every turn.
 */
export async function buildCoachContextSnapshot(): Promise<CoachContextSnapshot> {
  const sessionState = useCoachSessionStore.getState();
  const appState = useAppStore.getState();

  const [totalGames, recentGames, weaknessProfile] = await Promise.all([
    db.games.filter((g) => !g.isMasterGame && g.result !== '*').count(),
    db.games
      .orderBy('date')
      .reverse()
      .filter((g) => !g.isMasterGame && g.result !== '*')
      .limit(RECENT_GAMES_FOR_SNAPSHOT)
      .toArray(),
    getStoredWeaknessProfile().catch(() => null),
  ]);

  const board = appState.globalBoardContext?.fen
    ? { fen: appState.globalBoardContext.fen }
    : appState.lastBoardSnapshot?.fen
      ? { fen: appState.lastBoardSnapshot.fen, label: appState.lastBoardSnapshot.label }
      : null;

  const focus = sessionState.focus.kind
    ? {
        kind: sessionState.focus.kind,
        value: sessionState.focus.value,
        label: sessionState.focus.label,
      }
    : null;

  const recentActions = sessionState.recentActions
    .slice(-RECENT_ACTIONS_FOR_SNAPSHOT)
    .map((a) => ({ name: a.name, result: a.result, message: a.message }));

  return {
    route: sessionState.currentRoute,
    board,
    focus,
    library: {
      totalGames,
      recentGames: recentGames.map(toRecentGameSummary),
    },
    weakness: weaknessProfile
      ? {
          topItems: weaknessProfile.items
            .slice(0, WEAKNESS_ITEMS_FOR_SNAPSHOT)
            .map((i) => `${i.label} (severity ${i.severity}/100)`),
          overallAssessment: weaknessProfile.overallAssessment,
        }
      : null,
    recentActions,
    narrationMode: sessionState.narrationMode,
  };
}

/**
 * Format the snapshot as a compact text block to inject into the LLM
 * system prompt. The agent prompt grammar (see coachPrompts.ts) tells
 * the model how to read this block.
 */
export function formatCoachContextSnapshot(snapshot: CoachContextSnapshot): string {
  const lines: string[] = ['[Session State]'];
  lines.push(`route: ${snapshot.route}`);

  if (snapshot.board) {
    lines.push(`board fen: ${snapshot.board.fen}${snapshot.board.label ? ` (${snapshot.board.label})` : ''}`);
  } else {
    lines.push('board: none visible');
  }

  if (snapshot.focus) {
    lines.push(`focus: ${snapshot.focus.kind}=${snapshot.focus.value ?? '(empty)'}${snapshot.focus.label ? ` — ${snapshot.focus.label}` : ''}`);
  } else {
    lines.push('focus: none');
  }

  lines.push(`library: ${snapshot.library.totalGames} games imported`);
  if (snapshot.library.recentGames.length > 0) {
    lines.push('recent games (newest first):');
    for (const g of snapshot.library.recentGames) {
      lines.push(`  - id=${g.id} ${g.date} ${g.eco ?? '---'} ${g.white}-${g.black} ${g.result}`);
    }
  }

  if (snapshot.weakness) {
    lines.push(`weakness summary: ${snapshot.weakness.overallAssessment}`);
    if (snapshot.weakness.topItems.length > 0) {
      lines.push(`top weaknesses: ${snapshot.weakness.topItems.join('; ')}`);
    }
  }

  if (snapshot.recentActions.length > 0) {
    lines.push('recent actions:');
    for (const a of snapshot.recentActions) {
      const msg = a.message ? ` — ${a.message}` : '';
      lines.push(`  - ${a.name} → ${a.result}${msg}`);
    }
  }

  lines.push(`narration mode: ${snapshot.narrationMode ? 'on' : 'off'}`);
  return lines.join('\n');
}

function toRecentGameSummary(g: GameRecord): CoachContextSnapshot['library']['recentGames'][number] {
  return {
    id: g.id,
    date: g.date,
    eco: g.eco,
    white: g.white,
    black: g.black,
    result: g.result,
  };
}

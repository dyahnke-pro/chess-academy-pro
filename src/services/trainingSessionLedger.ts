/**
 * trainingSessionLedger — record that a training session happened.
 *
 * THE LOOP THIS CLOSES (David 2026-08-02: "this is important for the circular
 * loop my app is advertised on"). `db.sessions` is the training ledger — one
 * row per session with its duration, how many puzzles were solved, at what
 * accuracy, the XP earned and the coach's summary. `computeWeaknessProfile`
 * reads the most recent rows, the export bundle carries them, and cloud sync
 * restores them. That is the loop: train → the session is recorded → the
 * weakness profile reads it → it picks what to drill next → train.
 *
 * The loop had been open. WO-ROLODEX-UI-01 PR-1 deleted the session-plan
 * generation path when the rolodex took over `/coach/plan`, and it took the
 * only WRITER with it — `createSession` and `completeSession` were left with
 * zero callers, so no row has been created since. The readers all survived and
 * quietly got an empty array, which is why nothing ever looked broken: the
 * weakness profile has simply been computing with no session signal at all.
 * (The in-app diagnostics panel reports the reverse — "written on session end,
 * no surface queries it" — and advises deleting the writer. Both halves are
 * wrong; it is a hand-written note, not a probe.)
 *
 * So this is the writer, put back as a service rather than inline in a surface:
 * a session is a domain event, several surfaces produce one, and the next one
 * should not have to re-derive XP or the record's shape.
 *
 * Best-effort by construction. A training session that cannot be recorded must
 * still be a training session the student completed — every call swallows its
 * error and returns, so a ledger write can never break a lesson.
 */
import { createSession } from './dbService';
import { completeSession } from './sessionGenerator';
import { logAppAudit } from './appAuditor';
import { useAppStore } from '../stores/appStore';
import type { SessionBlockType, SessionPlan } from '../types';

/** A session in flight — hold it and hand it back to `finishTrainingSession`. */
export interface OpenTrainingSession {
  id: string;
  startedAt: number;
}

/** What the student actually did, measured by the surface. */
export interface TrainingSessionResult {
  /** Items completed — cards reviewed, lines drilled, puzzles solved. */
  itemsCompleted: number;
  /** Of those, how many were right first time. Used for the accuracy figure. */
  itemsCorrect: number;
}

function sessionId(): string {
  // Date.now + a short random tail: two sessions can start in the same
  // millisecond across surfaces, and `createSession` uses `add`, which throws
  // on a duplicate key.
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Open a session row. Call when the student STARTS training; hold the returned
 * handle and pass it to `finishTrainingSession`. Returns null when there is no
 * active profile or the write fails — callers treat null as "not recording"
 * and carry on.
 */
export async function beginTrainingSession(args: {
  blockType: SessionBlockType;
  targetMinutes?: number;
  openingId?: string;
  puzzleTheme?: string;
}): Promise<OpenTrainingSession | null> {
  try {
    const profileId = useAppStore.getState().activeProfile?.id;
    if (!profileId) return null;
    const targetMinutes = args.targetMinutes ?? 10;
    const plan: SessionPlan = {
      totalMinutes: targetMinutes,
      blocks: [{
        type: args.blockType,
        targetMinutes,
        completed: false,
        ...(args.openingId ? { openingId: args.openingId } : {}),
        ...(args.puzzleTheme ? { puzzleTheme: args.puzzleTheme } : {}),
      }],
    };
    const id = sessionId();
    await createSession({
      id,
      date: new Date().toISOString(),
      profileId,
      durationMinutes: 0,
      plan,
      completed: false,
      puzzlesSolved: 0,
      puzzleAccuracy: 0,
      xpEarned: 0,
      coachSummary: null,
    });
    return { id, startedAt: Date.now() };
  } catch {
    return null; // the ledger is a record of training, never a gate on it
  }
}

/**
 * Close the session out with what the student did. Duration is measured from
 * the handle rather than trusted from the caller, so it is the real elapsed
 * time. XP is computed by `completeSession`, the one place that owns that
 * formula. A null/absent handle is a no-op.
 */
export async function finishTrainingSession(
  open: OpenTrainingSession | null | undefined,
  result: TrainingSessionResult,
): Promise<void> {
  if (!open) return;
  try {
    const durationMinutes = Math.max(1, Math.round((Date.now() - open.startedAt) / 60_000));
    const puzzleAccuracy = result.itemsCompleted > 0
      ? result.itemsCorrect / result.itemsCompleted
      : 0;
    const xpEarned = await completeSession(open.id, {
      puzzlesSolved: result.itemsCompleted,
      puzzleAccuracy,
      durationMinutes,
    });
    void logAppAudit({
      kind: 'srs-session-complete',
      category: 'subsystem',
      source: 'trainingSessionLedger.finishTrainingSession',
      summary: `session recorded — ${result.itemsCompleted} item(s), ${Math.round(puzzleAccuracy * 100)}% accuracy, ${durationMinutes}m, ${xpEarned} XP`,
    });
  } catch {
    /* a session the student finished is not undone by a failed write */
  }
}

/**
 * autoImportScheduler — weekly background sync of chess.com and
 * lichess games, then auto-analyzes the new ones. Runs once per app
 * boot after the profile loads.
 *
 * Contract: a service is "due" when (a) a username is configured for
 * it, and (b) `lastXxxAutoImportAt` is older than
 * AUTO_IMPORT_INTERVAL_MS (or unset). On a successful run the
 * timestamp is bumped on the profile via `updateProfile` so the next
 * boot won't refire until the interval elapses again.
 *
 * The underlying `importChessComGames` / `importLichessGames`
 * functions dedupe by record id, so re-running them frequently is
 * safe — only NEW games are written. We still gate by timestamp to
 * avoid hammering the public APIs from every cold boot.
 */
import { updateProfile } from './dbService';
import { importChessComGames } from './chesscomService';
import { importLichessGames } from './lichessService';
import { logAppAudit } from './appAuditor';
import type { UserProfile } from '../types';

export const AUTO_IMPORT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (weekly)

export interface AutoImportResult {
  service: 'chesscom' | 'lichess';
  username: string;
  imported: number;
  skipped: 'no-username' | 'too-soon' | null;
  error?: string;
}

interface MaybeOnUpdated {
  onProfileUpdated?: (profile: UserProfile) => void;
  now?: number;
}

let runningPromise: Promise<AutoImportResult[]> | null = null;

function isDue(lastAt: number | null | undefined, now: number): boolean {
  if (!lastAt) return true;
  return now - lastAt >= AUTO_IMPORT_INTERVAL_MS;
}

/**
 * Run the biweekly auto-import for the given profile. Idempotent — if
 * called concurrently the same in-flight promise is returned.
 *
 * `onProfileUpdated` lets the app store rehydrate after the
 * timestamp(s) are persisted, so subsequent reads see the fresh
 * values without a full reload.
 */
export function runAutoImportIfDue(
  profile: UserProfile,
  opts: MaybeOnUpdated = {},
): Promise<AutoImportResult[]> {
  if (runningPromise) return runningPromise;
  runningPromise = (async () => {
    const now = opts.now ?? Date.now();
    const results: AutoImportResult[] = [];
    const updates: Partial<UserProfile['preferences']> = {};

    const ccUser = profile.preferences.chessComUsername?.trim();
    const ccLast = profile.preferences.lastChessComAutoImportAt;
    if (!ccUser) {
      results.push({ service: 'chesscom', username: '', imported: 0, skipped: 'no-username' });
    } else if (!isDue(ccLast, now)) {
      results.push({ service: 'chesscom', username: ccUser, imported: 0, skipped: 'too-soon' });
    } else {
      try {
        // Auto-analyze: let the import run its post-processing (mistake
        // puzzles + background Stockfish analysis → weakness profile), so the
        // new games actually feed the Training Plan. Analysis is backgrounded,
        // singleton-gated, and aborts when the app is backgrounded, so it
        // won't starve the coach. maxArchives=2 covers the weekly window
        // without re-pulling years of games on every boot.
        const imported = await importChessComGames(ccUser, undefined, {
          maxArchives: 2,
        });
        updates.lastChessComAutoImportAt = now;
        results.push({ service: 'chesscom', username: ccUser, imported, skipped: null });
        void logAppAudit({
          kind: 'auto-import-completed',
          category: 'subsystem',
          source: 'autoImportScheduler',
          summary: `chess.com:${ccUser} imported ${imported} new games`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ service: 'chesscom', username: ccUser, imported: 0, skipped: null, error: msg });
        void logAppAudit({
          kind: 'auto-import-failed',
          category: 'subsystem',
          source: 'autoImportScheduler',
          summary: `chess.com:${ccUser} failed: ${msg}`,
        });
      }
    }

    const liUser = profile.preferences.lichessUsername?.trim();
    const liLast = profile.preferences.lastLichessAutoImportAt;
    if (!liUser) {
      results.push({ service: 'lichess', username: '', imported: 0, skipped: 'no-username' });
    } else if (!isDue(liLast, now)) {
      results.push({ service: 'lichess', username: liUser, imported: 0, skipped: 'too-soon' });
    } else {
      try {
        // Same as chess.com — run post-processing so imported games are
        // analyzed and feed the Training Plan.
        const imported = await importLichessGames(liUser, undefined, {});
        updates.lastLichessAutoImportAt = now;
        results.push({ service: 'lichess', username: liUser, imported, skipped: null });
        void logAppAudit({
          kind: 'auto-import-completed',
          category: 'subsystem',
          source: 'autoImportScheduler',
          summary: `lichess:${liUser} imported ${imported} new games`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ service: 'lichess', username: liUser, imported: 0, skipped: null, error: msg });
        void logAppAudit({
          kind: 'auto-import-failed',
          category: 'subsystem',
          source: 'autoImportScheduler',
          summary: `lichess:${liUser} failed: ${msg}`,
        });
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateProfile(profile.id, {
        preferences: { ...profile.preferences, ...updates },
      });
      opts.onProfileUpdated?.({
        ...profile,
        preferences: { ...profile.preferences, ...updates },
      });
    }

    return results;
  })().finally(() => {
    runningPromise = null;
  });
  return runningPromise;
}

/** Test hook — wipe the in-flight singleton between tests. */
export function _resetAutoImportSchedulerForTests(): void {
  runningPromise = null;
}

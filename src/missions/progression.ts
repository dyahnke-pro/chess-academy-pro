/**
 * PROGRESSION — where each card stands, read straight off the record
 * (WO-CAMPAIGN-MASTER, Lane B). PURE: rows in, a status out. Nothing is
 * stored about progression itself, so nothing can drift from the record.
 *
 * Walking a card's rows oldest first:
 *   ACTIVE      the card is the phase's mission. It GRADUATES when its last 5
 *               active games hold `graduate.firstTryPasses` first-try passes
 *               (3 for a beginner card, 4 from Level 19) PLAYED AT ITS
 *               GRADUATION LEVEL — the coach a notch above the card's own
 *               dials (`ladder.ts`; 2026-10-21). Passes at an easier setting
 *               step the coach up instead (`dialState`). Retries, misses and
 *               incomplete games never count.
 *   GRADUATED   it runs as a silent watcher. It is REACTIVATED when 2 of its
 *               last 5 watched games are misses — a pattern of slips, never
 *               one.
 *   REACTIVATED active again: announced as the phase's mission next game.
 *               It graduates again on a fresh window — the games before the
 *               slips do not count twice.
 */
import type { MissionCard, MissionResultRecord } from './missionCard';
import { graduationBar, graduationLevel } from './ladder';

/** How many recent games each window holds. */
export const PROGRESSION_WINDOW = 5;
/** Watched misses in the window that bring a habit back. */
export const REACTIVATE_AT = 2;

export type CardStatus = 'active' | 'graduated' | 'reactivated';

export interface CardProgress {
  status: CardStatus;
  /** Has the card ever graduated? (A prerequisite met once stays met.) */
  everGraduated: boolean;
  /** Active games played, all time — "practice" for sibling rotation. */
  activeGames: number;
  /** First-try passes at the graduation level in the current active window. */
  firstTryInWindow: number;
  /** Misses in the current watched window. */
  watcherMissesInWindow: number;
}

type Row = Pick<MissionResultRecord, 'outcome' | 'at' | 'harder'> & { watcher?: boolean };

const last = <T>(xs: T[]): T[] => xs.slice(-PROGRESSION_WINDOW);

export function cardProgress(card: Pick<MissionCard, 'level' | 'graduate' | 'coachDials'>, rows: readonly Row[]): CardProgress {
  const bar = graduationBar(card);
  const level = graduationLevel(card);
  // A pass counts toward graduation only at the graduation level. Rows from
  // before the dial was recorded on them were played at the card's own dials.
  const counts = (r: Row): boolean => r.outcome === 'pass-first-try' && (r.harder ?? 0) >= level;
  let status: CardStatus = 'active';
  let everGraduated = false;
  let activeGames = 0;
  let active: Row[] = [];
  let watched: boolean[] = [];
  for (const r of [...rows].sort((a, b) => a.at - b.at)) {
    if (r.watcher) {
      if (status !== 'graduated') continue;
      watched = last([...watched, r.outcome === 'missed']);
      if (watched.filter(Boolean).length >= REACTIVATE_AT) {
        status = 'reactivated';
        active = [];
        watched = [];
      }
      continue;
    }
    if (status === 'graduated') continue;
    activeGames += 1;
    active = last([...active, r]);
    if (active.filter(counts).length >= bar) {
      status = 'graduated';
      everGraduated = true;
      watched = [];
    }
  }
  return {
    status,
    everGraduated,
    activeGames,
    firstTryInWindow: active.filter(counts).length,
    watcherMissesInWindow: watched.filter(Boolean).length,
  };
}

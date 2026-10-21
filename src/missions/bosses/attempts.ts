/**
 * WHAT HAPPENS AFTER A BOSS GAME (docs/CAMPAIGN.md §7). PURE.
 *
 *   win          → beaten (it may be played again)
 *   lose         → rematch
 *   lose twice   → the weakest habit it went after comes back as the
 *                  phase's mission for 3 games, then the rematch
 *   draw         → rematch; the losing streak starts again
 */
import type { BossAttemptRecord, MissionCard, MissionId } from '../missionCard';
import type { MissionRecordRow } from '../registry';

export const PRACTICE_GAMES = 3;

export type BossGate =
  | { kind: 'locked' }
  | { kind: 'ready'; attempts: number }
  | { kind: 'practice'; cardId: MissionId; remaining: number }
  | { kind: 'beaten'; attempts: number };

export function bossGate(
  unlocked: boolean,
  attempts: readonly Pick<BossAttemptRecord, 'result' | 'targeted' | 'at'>[],
  record: readonly MissionRecordRow[],
): BossGate {
  if (!unlocked) return { kind: 'locked' };
  const ordered = [...attempts].sort((a, b) => a.at - b.at);
  let streak = 0;
  let beaten = false;
  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i];
    if (a.result !== 'loss') { beaten ||= a.result === 'win'; streak = 0; continue; }
    streak += 1;
    if (streak < 2) continue;
    streak = 0;
    // A later attempt means the practice was already owed and passed.
    if (a.targeted.length === 0 || i < ordered.length - 1) continue;
    const cardId = a.targeted[0];
    const played = record.filter((r) => r.missionId === cardId && !r.watcher && r.at > a.at).length;
    if (played < PRACTICE_GAMES) return { kind: 'practice', cardId, remaining: PRACTICE_GAMES - played };
  }
  return beaten ? { kind: 'beaten', attempts: ordered.length } : { kind: 'ready', attempts: ordered.length };
}

/** A practice card takes its phase's slot for the game, and stops watching. */
export function withPractice(
  cards: readonly MissionCard[],
  watchers: readonly MissionCard[],
  practice: MissionCard | null,
): { cards: MissionCard[]; watchers: MissionCard[] } {
  if (!practice) return { cards: [...cards], watchers: [...watchers] };
  return {
    cards: [...cards.filter((c) => c.phase !== practice.phase), practice],
    watchers: watchers.filter((w) => w.id !== practice.id),
  };
}

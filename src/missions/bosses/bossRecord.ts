/**
 * THE BOSS RECORD — one `bossAttempts` row per boss game (Dexie v44, in the
 * backup). Never throws: the record is a bonus, never a blocker.
 */
import { db } from '../../db/schema';
import { logAppAudit } from '../../services/appAuditor';
import { loadSkillMeters } from '../../services/skillMetersLoader';
import type { BossAttemptRecord, BossId } from '../missionCard';
import type { MissionRecordRow } from '../registry';
import { rankWeaknesses, type WeaknessTarget } from '../weakness';
import { bossCards, type BossPreset } from './index';

/** What this boss goes after, read off the student's record and skill meters
 *  now. A meter read that fails leaves the mission record alone to decide. */
export async function loadBossTargets(preset: BossPreset, record: readonly MissionRecordRow[]): Promise<WeaknessTarget[]> {
  const meters = await loadSkillMeters().catch(() => []);
  return rankWeaknesses(bossCards(preset), Math.max(...preset.levels), record, meters);
}

export async function loadBossAttempts(bossId?: BossId): Promise<BossAttemptRecord[]> {
  try {
    const rows = bossId ? await db.bossAttempts.where('bossId').equals(bossId).toArray() : await db.bossAttempts.toArray();
    return rows.sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}

export async function writeBossAttempt(row: Omit<BossAttemptRecord, 'id'>): Promise<void> {
  const full: BossAttemptRecord = { ...row, id: `${row.bossId}:${row.gameId}` };
  try {
    await db.bossAttempts.put(full);
  } catch { /* the record is a bonus */ }
  void logAppAudit({
    kind: 'boss-result',
    category: 'subsystem',
    source: 'bossRecord.writeBossAttempt',
    summary: `${full.bossId} ${full.result} — went after ${full.targeted.join(', ') || 'nothing'}`,
    details: JSON.stringify(full),
  });
}

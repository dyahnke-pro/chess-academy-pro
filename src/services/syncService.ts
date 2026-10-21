import { db } from '../db/schema';
import { DEVICE_LOCAL_META_KEYS } from './misconceptionRulesBackfill';
import { asOpeningKey } from './openingKey';
import type { CapabilityEvidenceRecord } from './capabilityEvidence';
import type { BossAttemptRecord, DialStateRecord, MissionResultRecord, PatternStatRecord } from '../missions/missionCard';
import type { LearnFocusResultRecord } from './learnFocusRecord';
import { demotedId, type DemotedRowRecord } from './demotedRows';
import { exportUserData } from './dbService';
import { DEVICE_ID_KEY } from './deviceIdentity';
import { decryptApiKey } from './cryptoService';
import type {
  UserProfile,
  PuzzleRecord,
  OpeningRecord,
  SessionRecord,
  FlashcardRecord,
  GameRecord,
  MisconceptionTagRecord,
  MistakePuzzle,
  ClassifiedTactic,
  SetupPuzzle,
  OpeningWeakSpot,
} from '../types';

interface SyncConfig {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  syncUserId: string | null;
}

interface CloudBackup {
  name: string;
  created_at: string;
}

/** Meta table row shape. Keys are domain-scoped strings
 *  (`coachMemory.v1`, `openingProgress`, `app-audit-log.v1`, …);
 *  values are serialized JSON blobs. The store treats them as
 *  opaque on sync — each subsystem re-deserializes its own blob on
 *  next read. */
interface MetaRow {
  key: string;
  value: unknown;
}

interface ImportData {
  profiles?: UserProfile[];
  sessions?: SessionRecord[];
  openings?: OpeningRecord[];
  flashcards?: FlashcardRecord[];
  puzzles?: PuzzleRecord[];
  games?: GameRecord[];
  mistakePuzzles?: MistakePuzzle[];
  classifiedTactics?: ClassifiedTactic[];
  setupPuzzles?: SetupPuzzle[];
  openingWeakSpots?: OpeningWeakSpot[];
  /** WO-ROLODEX-UI-01 PR-4: `db.meta` blob carrying coachMemoryStore
   *  state (intendedOpening, savedPosition, the rolodex's
   *  activeOpeningCardId / lastActiveRolodexColor / favoritedAt /
   *  userOrderedFavorites, etc.) for cross-device sync. */
  meta?: MetaRow[];
  /** The skill record — every question the board posed and how it went. */
  capabilityEvidence?: CapabilityEvidenceRecord[];
  /** The mistakes on the record, with their causes. */
  misconceptionTags?: MisconceptionTagRecord[];
  /** Slips and puzzles the one price demoted (kept, never deleted). */
  demotedRows?: DemotedRowRecord[];
  /** How each Learn mission went (WO-MISSIONS-01). */
  missionResults?: MissionResultRecord[];
  /** The Campaign's auto-dial state, boss games and pattern arrivals
   *  (WO-CAMPAIGN-MASTER). */
  dialState?: DialStateRecord[];
  bossAttempts?: BossAttemptRecord[];
  patternStats?: PatternStatRecord[];
  /** Each Learn focus game's result (WO-LEARN-FOCUS-01). */
  learnFocusResults?: LearnFocusResultRecord[];
}

/** Try-decrypt a (`{key}Encrypted`, `{key}Iv`) pair, falling back to
 *  the legacy plaintext `{key}` field if no encrypted record exists.
 *  Returns null when neither form is available. Symmetric with
 *  `SyncSettingsPanel.handleSaveConfig` which encrypts on save. */
async function readEncryptedOrLegacy(
  prefs: Record<string, unknown>,
  encryptedKey: string,
  ivKey: string,
  plaintextKey: string,
): Promise<string | null> {
  const encrypted = prefs[encryptedKey] as string | null | undefined;
  const iv = prefs[ivKey] as string | null | undefined;
  if (encrypted && iv) {
    try {
      return await decryptApiKey(encrypted, iv);
    } catch {
      // Decrypt failed (key derivation mismatch, corrupt record).
      // Leave null; caller's "sync not configured" path will surface
      // a clean error to the user.
      return null;
    }
  }
  return (prefs[plaintextKey] as string | null) ?? null;
}

export async function getSyncConfig(profile: UserProfile): Promise<SyncConfig> {
  const prefs = profile.preferences as unknown as Record<string, unknown>;
  // All three sync fields are now encrypted on save. Each falls back
  // to the legacy plaintext field for profiles saved before the
  // encryption migration — the next Save Config call upgrades them.
  const [supabaseUrl, supabaseAnonKey, syncUserId] = await Promise.all([
    readEncryptedOrLegacy(prefs, 'supabaseUrlEncrypted', 'supabaseUrlIv', 'supabaseUrl'),
    readEncryptedOrLegacy(prefs, 'supabaseAnonKeyEncrypted', 'supabaseAnonKeyIv', 'supabaseAnonKey'),
    readEncryptedOrLegacy(prefs, 'syncUserIdEncrypted', 'syncUserIdIv', 'syncUserId'),
  ]);
  return { supabaseUrl, supabaseAnonKey, syncUserId };
}

export async function pushToCloud(profile: UserProfile): Promise<void> {
  const config = await getSyncConfig(profile);
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.syncUserId) {
    throw new Error('Sync not configured. Set Supabase URL, anon key, and user ID in settings.');
  }

  const jsonData = await exportUserData();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `${config.syncUserId}/backup-${timestamp}.json`;

  const response = await fetch(
    `${config.supabaseUrl}/storage/v1/object/chess-academy-backups/${path}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        apikey: config.supabaseAnonKey,
      },
      body: jsonData,
      signal: AbortSignal.timeout(20000),
    },
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  // Update last sync date
  const prefs = { ...profile.preferences } as unknown as Record<string, unknown>;
  prefs.lastSyncDate = new Date().toISOString();
  await db.profiles.update(profile.id, { preferences: prefs as unknown as UserProfile['preferences'] });
}

async function listCloudBackups(profile: UserProfile): Promise<CloudBackup[]> {
  const config = await getSyncConfig(profile);
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.syncUserId) {
    return [];
  }

  const response = await fetch(
    `${config.supabaseUrl}/storage/v1/object/list/chess-academy-backups/${config.syncUserId}`,
    {
      headers: {
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        apikey: config.supabaseAnonKey,
      },
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!response.ok) return [];

  const items = (await response.json()) as CloudBackup[];
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function pullFromCloud(profile: UserProfile): Promise<void> {
  const config = await getSyncConfig(profile);
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.syncUserId) {
    throw new Error('Sync not configured.');
  }

  const backups = await listCloudBackups(profile);
  if (backups.length === 0) {
    throw new Error('No backups found.');
  }

  const latest = backups[0];
  const response = await fetch(
    `${config.supabaseUrl}/storage/v1/object/chess-academy-backups/${config.syncUserId}/${latest.name}`,
    {
      headers: {
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        apikey: config.supabaseAnonKey,
      },
      signal: AbortSignal.timeout(20000),
    },
  );

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const text = await response.text();
  await importUserData(text);
}

export async function importUserData(json: string): Promise<void> {
  const data = JSON.parse(json) as ImportData;

  if (data.profiles) {
    await db.profiles.bulkPut(data.profiles);
  }
  if (data.sessions) {
    await db.sessions.bulkPut(data.sessions);
  }
  if (data.openings) {
    await db.openings.bulkPut(data.openings);
  }
  if (data.flashcards) {
    await db.flashcards.bulkPut(data.flashcards);
  }
  if (data.puzzles) {
    await db.puzzles.bulkPut(data.puzzles);
  }
  if (data.games) {
    // The one opening key (A1): a row synced from an older client may carry a
    // NAME here; accept only the minted shape and let the boot backfill re-mint
    // the rest from the PGN.
    await db.games.bulkPut(data.games.map((g) => ({ ...g, openingId: asOpeningKey(g.openingId) })));
  }
  // A demoted row stays demoted: a backup taken before the one price demoted
  // it must not put it back into the live record.
  if (data.demotedRows) await db.demotedRows.bulkPut(data.demotedRows);
  const demoted = new Set((await db.demotedRows.toCollection().primaryKeys()).map(String));
  if (data.mistakePuzzles) {
    await db.mistakePuzzles.bulkPut(data.mistakePuzzles.filter((p) => !demoted.has(demotedId('mistakePuzzles', p.id))));
  }
  if (data.classifiedTactics) {
    await db.classifiedTactics.bulkPut(data.classifiedTactics);
  }
  if (data.setupPuzzles) {
    await db.setupPuzzles.bulkPut(data.setupPuzzles);
  }
  if (data.openingWeakSpots) {
    await db.openingWeakSpots.bulkPut(data.openingWeakSpots);
  }
  if (data.capabilityEvidence) {
    await db.capabilityEvidence.bulkPut(data.capabilityEvidence);
  }
  if (data.missionResults) {
    await db.missionResults.bulkPut(data.missionResults);
  }
  if (data.dialState) await db.dialState.bulkPut(data.dialState);
  if (data.bossAttempts) await db.bossAttempts.bulkPut(data.bossAttempts);
  if (data.patternStats) await db.patternStats.bulkPut(data.patternStats);
  if (data.learnFocusResults) await db.learnFocusResults.bulkPut(data.learnFocusResults);
  if (data.misconceptionTags) {
    await db.misconceptionTags.bulkPut(data.misconceptionTags.filter((t) => !demoted.has(demotedId('misconceptionTags', t.id))));
  }
  if (data.meta) {
    // bulkPut by key — same shape as how the in-app writers persist.
    // Note: the in-memory coachMemoryStore won't see the new blob
    // until its next hydrate() call (typically next app boot), so the
    // import lands but the live store keeps its current state until
    // reload. Acceptable for a manual import flow.
    // MetaRecord.value is `string` (src/types/index.ts:347) — the in-app
    // writers serialize before persist. Cast accordingly so the Dexie
    // type-check passes (prior `value: unknown` cast was too loose and
    // broke every Vercel deploy after commit 719809cf).
    // A pass THIS device ran is not a pass the importing device ran: its
    // "done" markers vouch for a skill record that stays on the device that
    // built it (David's laptop, 2026-10-19: meters blank over 938 games).
    // The device's own id is identity, not data: importing it made a restored
    // laptop BECOME the backup's device (David 2026-10-19: Send my data hid).
    const local = new Set([...DEVICE_LOCAL_META_KEYS, DEVICE_ID_KEY]);
    await db.meta.bulkPut((data.meta as Array<{ key: string; value: string }>).filter((m) => !local.has(m.key)));
  }
}

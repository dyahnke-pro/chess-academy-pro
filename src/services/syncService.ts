import { db } from '../db/schema';
import { exportUserData } from './dbService';
import { decryptApiKey } from './cryptoService';
import type {
  UserProfile,
  PuzzleRecord,
  OpeningRecord,
  SessionRecord,
  FlashcardRecord,
  GameRecord,
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
}

export async function getSyncConfig(profile: UserProfile): Promise<SyncConfig> {
  const prefs = profile.preferences as unknown as Record<string, unknown>;
  // Prefer encrypted form. Fall back to legacy plaintext for users
  // whose config was saved before the encryption migration — next
  // save will upgrade it via SyncSettingsPanel.
  let anonKey: string | null = null;
  const encrypted = prefs.supabaseAnonKeyEncrypted as string | null | undefined;
  const iv = prefs.supabaseAnonKeyIv as string | null | undefined;
  if (encrypted && iv) {
    try {
      anonKey = await decryptApiKey(encrypted, iv);
    } catch {
      // Decrypt failed (key derivation mismatch, corrupt record).
      // Leave anonKey null; caller's "sync not configured" path
      // will surface a clean error to the user.
      anonKey = null;
    }
  } else {
    anonKey = (prefs.supabaseAnonKey as string | null) ?? null;
  }
  return {
    supabaseUrl: (prefs.supabaseUrl as string | null) ?? null,
    supabaseAnonKey: anonKey,
    syncUserId: (prefs.syncUserId as string | null) ?? null,
  };
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

export async function listCloudBackups(profile: UserProfile): Promise<CloudBackup[]> {
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
    await db.games.bulkPut(data.games);
  }
  if (data.mistakePuzzles) {
    await db.mistakePuzzles.bulkPut(data.mistakePuzzles);
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
}

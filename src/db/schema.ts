import Dexie, { type EntityTable } from 'dexie';
import type {
  PuzzleRecord,
  OpeningRecord,
  GameRecord,
  FlashcardRecord,
  UserProfile,
  SessionRecord,
  MetaRecord,
} from '../types';

class ChessAcademyDB extends Dexie {
  puzzles!: EntityTable<PuzzleRecord, 'id'>;
  openings!: EntityTable<OpeningRecord, 'id'>;
  games!: EntityTable<GameRecord, 'id'>;
  flashcards!: EntityTable<FlashcardRecord, 'id'>;
  profiles!: EntityTable<UserProfile, 'id'>;
  sessions!: EntityTable<SessionRecord, 'id'>;
  meta!: EntityTable<MetaRecord, 'key'>;

  constructor() {
    super('ChessAcademyDB');

    this.version(1).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
    });

    this.version(2).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
    });

    this.version(3).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
    }).upgrade(async (tx) => {
      await tx.table('profiles').toCollection().modify((profile: UserProfile) => {
        const prefs = profile.preferences as unknown as Record<string, unknown>;
        if (!('elevenlabsKeyEncrypted' in prefs)) {
          prefs.elevenlabsKeyEncrypted = null;
          prefs.elevenlabsKeyIv = null;
          prefs.voiceIdDanya = 'pNInz6obpgDQGcFmaJgB';
          prefs.voiceIdKasparov = 'VR6AewLTigWG4xSOukaG';
          prefs.voiceIdFischer = 'TxGEqnHWrfWFTfGW9XjX';
        }
      });
    });

    this.version(4).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
    }).upgrade(async (tx) => {
      await tx.table('profiles').toCollection().modify((profile: UserProfile) => {
        const prefs = profile.preferences as unknown as Record<string, unknown>;
        if (!('voiceSpeed' in prefs)) {
          prefs.voiceSpeed = 1.0;
        }
      });
    });
  }
}

export const db = new ChessAcademyDB();

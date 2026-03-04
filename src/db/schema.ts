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
  }
}

export const db = new ChessAcademyDB();

import Dexie, { type EntityTable } from 'dexie';
import type {
  PuzzleRecord,
  OpeningRecord,
  GameRecord,
  FlashcardRecord,
  UserProfile,
  SessionRecord,
  MetaRecord,
  MistakePuzzle,
} from '../types';

class ChessAcademyDB extends Dexie {
  puzzles!: EntityTable<PuzzleRecord, 'id'>;
  openings!: EntityTable<OpeningRecord, 'id'>;
  games!: EntityTable<GameRecord, 'id'>;
  flashcards!: EntityTable<FlashcardRecord, 'id'>;
  profiles!: EntityTable<UserProfile, 'id'>;
  sessions!: EntityTable<SessionRecord, 'id'>;
  meta!: EntityTable<MetaRecord, 'key'>;
  mistakePuzzles!: EntityTable<MistakePuzzle, 'id'>;

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

    this.version(5).stores({
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
        if (!('highlightLastMove' in prefs)) {
          prefs.highlightLastMove = true;
          prefs.showLegalMoves = true;
          prefs.showCoordinates = true;
          prefs.pieceAnimationSpeed = 'medium';
          prefs.boardOrientation = true;
          prefs.moveQualityFlash = false;
          prefs.showHints = true;
          prefs.moveMethod = 'both';
          prefs.moveConfirmation = false;
          prefs.autoPromoteQueen = true;
          prefs.masterAllOff = false;
        }
      });
    });

    this.version(6).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
    }).upgrade(async (tx) => {
      await tx.table('openings').toCollection().modify((opening: OpeningRecord) => {
        const rec = opening as unknown as Record<string, unknown>;
        if (!('isFavorite' in rec)) {
          rec.isFavorite = false;
        }
      });
    });

    this.version(7).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
    }).upgrade(async (tx) => {
      await tx.table('profiles').toCollection().modify((profile: UserProfile) => {
        const prefs = profile.preferences as unknown as Record<string, unknown>;
        if (!('aiProvider' in prefs)) {
          prefs.aiProvider = 'deepseek';
        }
        if (!('anthropicApiKeyEncrypted' in prefs)) {
          prefs.anthropicApiKeyEncrypted = null;
        }
        if (!('anthropicApiKeyIv' in prefs)) {
          prefs.anthropicApiKeyIv = null;
        }
      });
    });

    this.version(8).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode',
    });

    this.version(9).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode',
    }).upgrade(async (tx) => {
      await tx.table('mistakePuzzles').toCollection().modify((puzzle: Record<string, unknown>) => {
        if (!('continuationMoves' in puzzle)) {
          puzzle.continuationMoves = puzzle.bestMove ? [puzzle.bestMove as string] : [];
        }
      });
    });
  }
}

export const db = new ChessAcademyDB();

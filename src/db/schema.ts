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
  ModelGame,
  MiddlegamePlan,
  GeneratedContent,
  OpeningWeakSpot,
  ClassifiedTactic,
  SetupPuzzle,
  OpeningNarration,
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
  modelGames!: EntityTable<ModelGame, 'id'>;
  middlegamePlans!: EntityTable<MiddlegamePlan, 'id'>;
  generatedContent!: EntityTable<GeneratedContent, 'id'>;
  openingWeakSpots!: EntityTable<OpeningWeakSpot, 'id'>;
  classifiedTactics!: EntityTable<ClassifiedTactic, 'id'>;
  setupPuzzles!: EntityTable<SetupPuzzle, 'id'>;
  openingNarrations!: EntityTable<OpeningNarration, 'id'>;

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
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode, gamePhase',
    }).upgrade(async (tx) => {
      await tx.table('mistakePuzzles').toCollection().modify((puzzle: Record<string, unknown>) => {
        const moveNumber = puzzle.moveNumber as number;
        if (moveNumber <= 15) puzzle.gamePhase = 'opening';
        else if (moveNumber <= 35) puzzle.gamePhase = 'middlegame';
        else puzzle.gamePhase = 'endgame';
        if (!puzzle.moves) puzzle.moves = puzzle.bestMove as string;
      });
    });

    this.version(10).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode, gamePhase',
    }).upgrade(async (tx) => {
      await tx.table('profiles').toCollection().modify((profile: UserProfile) => {
        const prefs = profile.preferences as unknown as Record<string, unknown>;
        if (!('kokoroEnabled' in prefs)) {
          prefs.kokoroEnabled = true;
          prefs.kokoroVoiceId = 'af_bella';
        }
        if (!('systemVoiceURI' in prefs)) {
          prefs.systemVoiceURI = null;
        }
      });
    });

    this.version(11).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode, gamePhase',
    }).upgrade(async (tx) => {
      // Reset voiceEnabled to true — was incorrectly left as false by Master All Off toggle.
      // Only reset if masterAllOff is also false (don't fight an intentional override).
      await tx.table('profiles').toCollection().modify((profile: UserProfile) => {
        const prefs = profile.preferences as unknown as Record<string, unknown>;
        if (prefs.voiceEnabled === false && prefs.masterAllOff !== true) {
          prefs.voiceEnabled = true;
        }
      });
    });

    this.version(12).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode, gamePhase',
    }).upgrade(async (tx) => {
      // Add Lichess token fields to existing profiles
      await tx.table('profiles').toCollection().modify((profile: UserProfile) => {
        const prefs = profile.preferences as unknown as Record<string, unknown>;
        if (!('lichessTokenEncrypted' in prefs)) {
          prefs.lichessTokenEncrypted = null;
          prefs.lichessTokenIv = null;
        }
      });
    });

    this.version(13).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode, gamePhase',
    }).upgrade(async (tx) => {
      // Add Amazon Polly TTS fields to existing profiles
      await tx.table('profiles').toCollection().modify((profile: UserProfile) => {
        const prefs = profile.preferences as unknown as Record<string, unknown>;
        if (!('pollyEnabled' in prefs)) {
          prefs.pollyEnabled = true;
          prefs.pollyVoice = 'ruth';
        }
      });
    });

    this.version(14).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode, gamePhase',
    }).upgrade(async (tx) => {
      // Add narration + playerMoveSan to existing mistake puzzles
      await tx.table('mistakePuzzles').toCollection().modify((puzzle: Record<string, unknown>) => {
        if (!('playerMoveSan' in puzzle)) {
          puzzle.playerMoveSan = '';
        }
        if (!('narration' in puzzle)) {
          puzzle.narration = { intro: '', moveNarrations: [], outro: '' };
        }
      });
    });

    this.version(15).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode, gamePhase',
    }).upgrade(async (tx) => {
      // Add game context fields to existing mistake puzzles
      await tx.table('mistakePuzzles').toCollection().modify((puzzle: Record<string, unknown>) => {
        if (!('opponentName' in puzzle)) {
          puzzle.opponentName = null;
          puzzle.gameDate = null;
          puzzle.openingName = null;
          puzzle.evalBefore = null;
        }
      });
    });

    this.version(16).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode, gamePhase',
      modelGames: 'id, openingId',
      middlegamePlans: 'id, openingId',
      generatedContent: 'id, openingId, type, generatedAt',
    });

    this.version(17).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode, gamePhase',
      modelGames: 'id, openingId',
      middlegamePlans: 'id, openingId',
      generatedContent: 'id, openingId, type, generatedAt',
      openingWeakSpots: 'id, openingId, failCount, lastFailedAt',
    });

    this.version(18).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode, gamePhase',
      modelGames: 'id, openingId',
      middlegamePlans: 'id, openingId',
      generatedContent: 'id, openingId, type, generatedAt',
      openingWeakSpots: 'id, openingId, failCount, lastFailedAt',
      classifiedTactics: 'id, sourceGameId, tacticType, playerColor, createdAt',
      setupPuzzles: 'id, tacticType, difficulty, srsDueDate, status, sourceGameId',
    });

    this.version(19).stores({
      puzzles: 'id, rating, *themes, srsDueDate, userRating',
      openings: 'id, eco, name, color, isRepertoire, isFavorite',
      games: 'id, source, eco, date, isMasterGame, openingId',
      flashcards: 'id, openingId, type, srsDueDate',
      profiles: 'id',
      sessions: 'id, date, profileId',
      meta: 'key',
      mistakePuzzles: 'id, sourceGameId, classification, srsDueDate, status, sourceMode, gamePhase',
      modelGames: 'id, openingId',
      middlegamePlans: 'id, openingId',
      generatedContent: 'id, openingId, type, generatedAt',
      openingWeakSpots: 'id, openingId, failCount, lastFailedAt',
      classifiedTactics: 'id, sourceGameId, tacticType, playerColor, createdAt',
      setupPuzzles: 'id, tacticType, difficulty, srsDueDate, status, sourceGameId',
      openingNarrations: 'id, openingName, variation, moveSan, fen, approved',
    });
  }
}

export const db = new ChessAcademyDB();

// THE GATE FOR WO-STANDARD-01 C9 — provenance survives the import path.
//
// Observed on prod 2026-09-22: My Mistakes showed source "Coach", opponent
// "Unknown", date = the import day for slips from the student's chess.com
// games, and Weaknesses printed "vs Unknown · 2026-09-22" under a 2024 game.
// The disease was one builder: `buildMistakePuzzleFromCapture` hard-coded
// `sourceMode: 'coach'`, `opponentName: null`, `gameDate: null`, and every
// analysed import's positional slips go through it
// (`autoAnalyzeGameMisconceptions` → `persistMistakePuzzlesForBlunders`).
//
// NEGATIVE CONTROL: the writer's provenance is a REQUIRED parameter
// (`CapturePuzzleInput.from`, `persistMistakePuzzlesForBlunders(…, from)`), so
// the pre-fix shape — a call with no `from` — no longer compiles; and every
// assertion below is against the OLD values ('coach' / null / null), so a
// builder that quietly went back to its defaults fails each row.
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { annotationsFromEvalComments } from './gameImportUtils';
import { autoAnalyzeGameMisconceptions } from './autoAnalyzeGame';
import {
  addMistakePuzzleFromCapture,
  mistakeProvenanceFromGame,
  provenanceForGameId,
} from './mistakePuzzleService';
import { buildGameRecord } from '../test/factories';
import type { GameRecord, MoveAnnotation } from '../types';

// A real lichess-style export: Black's 2...Nc6 is tagged a blunder by the
// eval curve (+0.1 → +4.0). The analysis sweep is what fills `bestMove`
// on an import (the eval comments never carry one); simulated here on the
// flagged ply only, exactly as the deep dive would.
const PGN = '1. e4 {[%eval 0.2]} e5 {[%eval 0.3]} 2. Nf3 {[%eval 0.1]} Nc6 {[%eval 4.0]} 1-0';

function importedChesscomGame(): GameRecord {
  const annotations = annotationsFromEvalComments(PGN) as MoveAnnotation[];
  expect(annotations).not.toBeNull();
  const flagged = annotations[3];
  expect(flagged.san).toBe('Nc6');
  expect(['blunder', 'mistake']).toContain(flagged.classification);
  flagged.bestMove = 'g8f6';
  return buildGameRecord({
    id: 'cc-2025-03-04-1',
    source: 'chesscom',
    white: 'Opponent_X',
    black: 'knight_mare_01',
    date: '2025-03-04',
    result: '1-0',
    pgn: '1. e4 e5 2. Nf3 Nc6',
    annotations,
    fullyAnalyzed: true,
  });
}

beforeEach(async () => {
  await Promise.all([db.games.clear(), db.mistakePuzzles.clear(), db.misconceptionTags.clear(), db.meta.clear()]);
});

describe('C9 — the import path keeps the game\'s provenance', () => {
  it('an analysed chess.com game writes a puzzle carrying chesscom / the opponent / the game date — never coach / Unknown / today', async () => {
    const game = importedChesscomGame();
    await db.games.add(game);
    await autoAnalyzeGameMisconceptions(game.id, 'knight_mare_01');

    const rows = await db.mistakePuzzles.where('sourceGameId').equals(game.id).toArray();
    expect(rows.length).toBeGreaterThan(0);
    for (const p of rows) {
      expect(p.sourceMode).toBe('chesscom');
      expect(p.opponentName).toBe('Opponent_X');
      expect(p.gameDate).toBe('2025-03-04');
      // The pre-fix shape, named so a regression is legible.
      expect(p.sourceMode).not.toBe('coach');
      expect(p.opponentName).not.toBeNull();
      expect(p.gameDate).not.toBeNull();
      expect(p.gameDate).not.toBe(new Date().toISOString().split('T')[0]);
    }
  });

  it('a pasted PGN (source import) is labelled import, not coach', () => {
    const game = buildGameRecord({ id: 'paste-1', source: 'import', white: 'Me', black: 'Them', date: '2024-12-01' });
    expect(mistakeProvenanceFromGame(game, 'white')).toEqual({
      origin: 'game', gameId: 'paste-1', source: 'import', opponentName: 'Them', gameDate: '2024-12-01', playedAt: Date.parse('2024-12-01'),
    });
  });

  it('a master game is nobody\'s slip: null provenance, and the analyser writes nothing', async () => {
    const game = { ...importedChesscomGame(), id: 'master-1', source: 'master' as const, isMasterGame: true, studentSide: 'black' as const };
    expect(mistakeProvenanceFromGame(game, 'black')).toBeNull();
    await db.games.add(game);
    await autoAnalyzeGameMisconceptions(game.id);
    expect(await db.mistakePuzzles.count()).toBe(0);
  });
});

describe('C9 — the live capture path resolves provenance by game id', () => {
  it('reads the record when it exists (declared seat → the opponent by name)', async () => {
    await db.games.add(buildGameRecord({ id: 'li-1', source: 'lichess', white: 'Rival', black: 'knight_mare_01', date: '2025-06-07', studentSide: 'black' }));
    expect(await provenanceForGameId('li-1')).toEqual({
      origin: 'game', gameId: 'li-1', source: 'lichess', opponentName: 'Rival', gameDate: '2025-06-07', playedAt: Date.parse('2025-06-07'),
    });
  });

  it('a live coach game not yet saved answers honestly: coach, opponent and date unknown', async () => {
    expect(await provenanceForGameId('learn-live-9')).toEqual({
      origin: 'game', gameId: 'learn-live-9', source: 'coach', opponentName: null, gameDate: null,
    });
    expect(await provenanceForGameId(undefined)).toMatchObject({ gameId: '', source: 'coach', opponentName: null });
  });

  it('a record with no resolvable seat keeps its source and date but never guesses the opponent', async () => {
    await db.games.add(buildGameRecord({ id: 'cc-9', source: 'chesscom', white: 'A', black: 'B', date: '2025-01-02' }));
    expect(await provenanceForGameId('cc-9')).toMatchObject({ source: 'chesscom', gameDate: '2025-01-02', opponentName: null });
  });

  it('addMistakePuzzleFromCapture writes exactly the provenance it was handed', async () => {
    const FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
    const p = await addMistakePuzzleFromCapture({
      fen: FEN, playedSan: 'Nc6', bestSan: 'Nf6', cpLoss: 120,
      from: { origin: 'game', gameId: 'cc-7', source: 'chesscom', opponentName: 'Someone', gameDate: '2025-02-03' },
    });
    expect(p).toMatchObject({ sourceGameId: 'cc-7', sourceMode: 'chesscom', opponentName: 'Someone', gameDate: '2025-02-03' });
    const stored = await db.mistakePuzzles.get(p!.id);
    expect(stored).toMatchObject({ sourceMode: 'chesscom', opponentName: 'Someone', gameDate: '2025-02-03' });
  });
});

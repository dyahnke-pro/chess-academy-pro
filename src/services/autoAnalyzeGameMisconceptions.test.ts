import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { autoAnalyzeGameMisconceptions, backfillMisconceptionsFromAnalyzedGames } from './autoAnalyzeGame';
import { buildGameRecord } from '../test/factories';
import type { MoveAnnotation } from '../types';

// Integration: the BULK faucet that fills the Thinking-Errors bucket from a
// game's annotations (David 2026-06-11). Real deterministic classifier, real
// Dexie (fake-indexeddb) — no mocks. Proves importing/analyzing a game now
// populates misconceptionTags (it never did before — interactive-only).

// 1.e4 e5 2.Qh5 Nc6 3.Qxe5+?? hangs the queen to the c6 knight.
const PGN = '1. e4 e5 2. Qh5 Nc6 3. Qxe5+ Be7';

function blunderAnnotations(): MoveAnnotation[] {
  return [
    { moveNumber: 1, color: 'white', san: 'e4', evaluation: 20, bestMove: 'e2e4', bestMoveEval: 20, classification: 'good', comment: null },
    { moveNumber: 3, color: 'white', san: 'Qxe5+', evaluation: -700, bestMove: 'g1f3', bestMoveEval: 25, classification: 'blunder', comment: null },
  ];
}

beforeEach(async () => {
  await db.misconceptionTags.clear();
  await db.games.clear();
  await db.mistakePuzzles.clear();
  await db.meta.delete('misconceptions_backfill_v2');
});

describe('autoAnalyzeGameMisconceptions', () => {
  it('tags a hung queen from a coach game and writes it display-only (counted=false)', async () => {
    const game = buildGameRecord({
      id: 'g-hang-queen',
      source: 'coach',
      white: 'David',
      black: 'Stockfish Bot', // → player is white
      pgn: PGN,
      annotations: blunderAnnotations(),
    });
    await db.games.put(game);

    const result = await autoAnalyzeGameMisconceptions('g-hang-queen');
    expect(result.logged).toBeGreaterThan(0);

    const rows = await db.misconceptionTags.where('sourceGameId').equals('g-hang-queen').toArray();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.tag === 'hung-material')).toBe(true);

    // It ALSO persists a drillable mistakePuzzle for the blunder, so the
    // mistake lands in the My Mistakes / My Weaknesses pool (David 2026-06-11).
    const puzzles = await db.mistakePuzzles.where('sourceGameId').equals('g-hang-queen').toArray();
    expect(puzzles.length).toBeGreaterThan(0);
    expect(puzzles.some((p) => p.playerMoveSan === 'Qxe5+' && p.bestMoveSan === 'Nf3')).toBe(true);
    // Display-only: shows in Thinking Errors but doesn't inflate the weakness profile.
    expect(rows.every((r) => r.counted === false)).toBe(true);
    expect(rows.every((r) => r.source === 'auto-analysis')).toBe(true);
  });

  it('is idempotent — re-running the same game logs nothing new', async () => {
    const game = buildGameRecord({
      id: 'g-idem',
      source: 'coach',
      white: 'David',
      black: 'Stockfish Bot',
      pgn: PGN,
      annotations: blunderAnnotations(),
    });
    await db.games.put(game);

    await autoAnalyzeGameMisconceptions('g-idem');
    const after1 = await db.misconceptionTags.where('sourceGameId').equals('g-idem').count();
    const second = await autoAnalyzeGameMisconceptions('g-idem');
    const after2 = await db.misconceptionTags.where('sourceGameId').equals('g-idem').count();

    expect(after1).toBeGreaterThan(0);
    expect(second).toEqual({ classified: 0, logged: 0, capabilitiesHeld: 0 });
    expect(after2).toBe(after1);
  });

  it('backfills the already-analyzed library once, then short-circuits via the meta flag', async () => {
    for (const id of ['bf-1', 'bf-2']) {
      await db.games.put(buildGameRecord({
        id,
        source: 'coach',
        white: 'David',
        black: 'Stockfish Bot',
        pgn: PGN,
        annotations: blunderAnnotations(),
      }));
    }
    // A game with no annotations is skipped (not yet analyzed).
    await db.games.put(buildGameRecord({ id: 'bf-bare', source: 'coach', white: 'David', black: 'Stockfish Bot', pgn: PGN, annotations: null }));

    const first = await backfillMisconceptionsFromAnalyzedGames();
    expect(first.logged).toBeGreaterThan(0);
    const tagged = await db.misconceptionTags.toArray();
    expect(new Set(tagged.map((r) => r.sourceGameId))).toEqual(new Set(['bf-1', 'bf-2']));

    // Second call short-circuits on the meta flag — no new work.
    const second = await backfillMisconceptionsFromAnalyzedGames();
    expect(second).toEqual({ classified: 0, logged: 0, capabilitiesHeld: 0 });
  });

  it('no-ops on a game with no annotations', async () => {
    const game = buildGameRecord({
      id: 'g-bare',
      source: 'coach',
      white: 'David',
      black: 'Stockfish Bot',
      pgn: PGN,
      annotations: null,
    });
    await db.games.put(game);
    expect(await autoAnalyzeGameMisconceptions('g-bare')).toEqual({ classified: 0, logged: 0, capabilitiesHeld: 0 });
  });
});

// ─── WO-4 J2 (2026-09-19): the recording path passes the AFTER-move eval ──────
// `BlunderForAnalysis.evalAfterPlayed` existed, the annotation carried the number
// (`evaluation`), and the builder never passed it — so `botched-conversion`
// (gated on evalBefore + evalAfterPlayed, no PV) could not fire on a single
// imported or finished game: 0 of 154 flagged moves across 47 real amateur games
// before the fix, 11 after. This fixture IS one of those games: lichess y36gvNEs,
// IcanonlybeatUbytime (1728) as White, depth-12 numbers from the app's own
// Stockfish build — +4.12 with Qd5 on the board, +0.14 after the played Nc3.
describe('autoAnalyzeGameMisconceptions — passes evalAfterPlayed so eval-gated fundamentals record', () => {
  const REAL_PGN = '1. e4 d6 2. Bc4 e5 3. Nf3 Be7 4. d4 Nd7 5. dxe5 dxe5 6. Nc3 Ngf6';
  const realGame = (id: string, evaluation: number | null) => buildGameRecord({
    id, source: 'lichess', white: 'IcanonlybeatUbytime', black: 'Bloodsport55', whiteElo: 1728, blackElo: 1679,
    pgn: REAL_PGN,
    annotations: [
      { moveNumber: 6, color: 'white', san: 'Nc3', evaluation, bestMove: 'd1d5', bestMoveEval: 412, classification: 'blunder', comment: null },
    ],
  });

  it('a thrown winning position on a real imported game is filed under botched-conversion', async () => {
    await db.games.put(realGame('g-botched', 14));
    const r = await autoAnalyzeGameMisconceptions('g-botched', 'IcanonlybeatUbytime');
    expect(r.logged).toBeGreaterThan(0);
    const rows = await db.misconceptionTags.where('sourceGameId').equals('g-botched').toArray();
    expect(rows.map((x) => x.fundamentalId)).toContain('botched-conversion');
    expect(rows.find((x) => x.fundamentalId === 'botched-conversion')?.bestSan).toBe('Qd5');
  });

  it('NEGATIVE CONTROL — no after-eval on the annotation → the eval-gated detector stays silent (never invents)', async () => {
    await db.games.put(realGame('g-botched-noeval', null));
    await autoAnalyzeGameMisconceptions('g-botched-noeval', 'IcanonlybeatUbytime');
    const rows = await db.misconceptionTags.where('sourceGameId').equals('g-botched-noeval').toArray();
    expect(rows.map((x) => x.fundamentalId)).not.toContain('botched-conversion');
  });

  it('NEGATIVE CONTROL — still clearly winning after the move → not a botched conversion (the NUMBER decides, not its presence)', async () => {
    await db.games.put(realGame('g-botched-stillwinning', 250));
    await autoAnalyzeGameMisconceptions('g-botched-stillwinning', 'IcanonlybeatUbytime');
    const rows = await db.misconceptionTags.where('sourceGameId').equals('g-botched-stillwinning').toArray();
    expect(rows.map((x) => x.fundamentalId)).not.toContain('botched-conversion');
  });
});

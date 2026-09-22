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
    expect(second).toEqual({ classified: 0, logged: 0, capabilitiesHeld: 0, reattributed: 0, countedUpgraded: 0 });
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
    expect(second).toEqual({ classified: 0, logged: 0, capabilitiesHeld: 0, reattributed: 0, countedUpgraded: 0 });
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
    expect(await autoAnalyzeGameMisconceptions('g-bare')).toEqual({ classified: 0, logged: 0, capabilitiesHeld: 0, reattributed: 0, countedUpgraded: 0 });
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

// ─── C1 (WO-STANDARD-01, 2026-09-22) — ONE WRITER, and a REVIEWED game COUNTS ──
//
// The review page's mount sweep wrote `counted: false` rows with no positive
// half and then `hasMisconceptionsForGame` read "already" for the capture
// button, so an import-and-review student never wrote a counted row or a held
// row: green was unreachable for the bulk of the userbase. The sweep is now the
// one writer and REVIEWED is a mode of it. Proof is ROWS, not calls.
describe('C1 — the one writer: a reviewed imported game writes COUNTED rows and HELD rows', () => {
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.Nxe5?? — White (the student) drops the
  // knight; the three clean developing moves before it are the positive half.
  const PGN_IMPORT = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Nxe5 Nxe5';
  const importedGame = (id: string) => buildGameRecord({
    id, source: 'chesscom', white: 'knight_mare_01', black: 'someone', pgn: PGN_IMPORT,
    annotations: [
      { moveNumber: 1, color: 'white', san: 'e4', evaluation: 25, bestMove: 'e2e4', bestMoveEval: 25, classification: 'good', comment: null },
      { moveNumber: 2, color: 'white', san: 'Nf3', evaluation: 30, bestMove: 'g1f3', bestMoveEval: 30, classification: 'good', comment: null },
      { moveNumber: 3, color: 'white', san: 'Bc4', evaluation: 20, bestMove: 'f1c4', bestMoveEval: 25, classification: 'good', comment: null },
      { moveNumber: 4, color: 'white', san: 'Nxe5', evaluation: -250, bestMove: 'c2c3', bestMoveEval: 20, classification: 'blunder', comment: null },
    ] as MoveAnnotation[],
  });
  const rowsFor = (id: string) => db.misconceptionTags.where('sourceGameId').equals(id).toArray();
  const heldFor = (id: string) => db.capabilityEvidence.filter((r) => r.sourceGameId === id).toArray();

  beforeEach(async () => { await db.capabilityEvidence.clear(); });

  it('REVIEWED: the slip rows COUNT and the clean plies land as capability evidence', async () => {
    await db.games.put(importedGame('g-c1-reviewed'));
    const r = await autoAnalyzeGameMisconceptions('g-c1-reviewed', 'knight_mare_01', { reviewed: true });
    const rows = await rowsFor('g-c1-reviewed');
    expect(rows.length, 'the slip was not recorded').toBeGreaterThan(0);
    expect(rows.every((x) => x.counted !== false), 'a reviewed game must COUNT toward the profile').toBe(true);
    const held = await heldFor('g-c1-reviewed');
    expect(held.length, 'the positive half never reached capabilityEvidence').toBeGreaterThan(0);
    expect(held.every((h) => h.origin === 'review' && h.prompted === false)).toBe(true);
    expect(r.capabilitiesHeld).toBe(held.length);
  });

  it('NEGATIVE CONTROL — the batch path (not reviewed) writes display-only rows and NO capability evidence', async () => {
    await db.games.put(importedGame('g-c1-batch'));
    const r = await autoAnalyzeGameMisconceptions('g-c1-batch', 'knight_mare_01');
    const rows = await rowsFor('g-c1-batch');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((x) => x.counted === false), 'a library import is not a decision about lines the student knows').toBe(true);
    expect(await heldFor('g-c1-batch')).toEqual([]);
    expect(r.capabilitiesHeld).toBe(0);
  });

  it('THE OLD RACE, CLOSED — batch first, then the review: rows are UPGRADED to counted and the held rows land, once', async () => {
    await db.games.put(importedGame('g-c1-race'));
    await autoAnalyzeGameMisconceptions('g-c1-race', 'knight_mare_01');           // the batch sweep, before any review
    expect((await rowsFor('g-c1-race')).every((x) => x.counted === false)).toBe(true);

    const review = await autoAnalyzeGameMisconceptions('g-c1-race', 'knight_mare_01', { reviewed: true });
    expect(review.countedUpgraded, 'the batch rows were not upgraded').toBeGreaterThan(0);
    expect(review.logged, 'a second tally must never be written').toBe(0);
    expect((await rowsFor('g-c1-race')).every((x) => x.counted !== false)).toBe(true);
    const heldOnce = await heldFor('g-c1-race');
    expect(heldOnce.length).toBeGreaterThan(0);

    // A second review mount owes nothing — no duplicate held rows, no re-upgrade.
    const again = await autoAnalyzeGameMisconceptions('g-c1-race', 'knight_mare_01', { reviewed: true });
    expect(again.countedUpgraded).toBe(0);
    expect(again.capabilitiesHeld).toBe(0);
    expect((await heldFor('g-c1-race')).length).toBe(heldOnce.length);
  });

  it('the review page hands the sweep its reviewed flag, and the capture button routes to the same writer (by statement)', async () => {
    const fs = await import('node:fs');
    const review = fs.readFileSync('src/components/Coach/CoachGameReview.tsx', 'utf8');
    expect(review).toMatch(/autoAnalyzeGameMisconceptions\(gid, username, \{ reviewed: true \}\)/);
    const button = fs.readFileSync('src/components/Coach/GameReviewWeaknessCapture.tsx', 'utf8');
    expect(button).toMatch(/autoAnalyzeGameMisconceptions\(gameId, undefined, \{ reviewed: true \}\)/);
    expect(button, 'the component must not run a second capture beside the sweep').not.toMatch(/autoAnalyzeBlunders\(/);
  });
});

// ─── C2 (WO-STANDARD-01, 2026-09-22) — A TAG WITHOUT A BEST MOVE IS PROVISIONAL ──
//
// A `%eval` import carries the eval curve and NO best move, so the sweep
// classified each slip off the board alone (the attributor needs `bestSan`),
// and then the once-per-game latch made that tag permanent: the deep dive
// landed the engine's move and nothing ever looked again.
describe('C2 — an eval-comment import is re-attributed when the deep dive lands the best move', () => {
  // The review's Alapin fixture: Black (the student) plays 6...Nb6, a flagged
  // move that the attributor files as `same-piece-twice` — but only WITH the
  // best move (e6) in hand.
  const PGN = '1. e4 c5 2. c3 Nf6 3. e5 Nd5 4. d4 cxd4 5. cxd4 Nc6 6. Nc3 Nb6 7. Nf3 d6';
  const evalImport = (id: string, bestMove: string | null) => buildGameRecord({
    id, source: 'lichess', white: 'someone', black: 'knight_mare_01', pgn: PGN,
    fullyAnalyzed: true, analysisDepth: 12,
    annotations: [
      { moveNumber: 6, color: 'black', san: 'Nb6', evaluation: 90, bestMove, bestMoveEval: -30, classification: 'mistake', comment: null },
    ] as MoveAnnotation[],
  });
  const rowsFor = (id: string) => db.misconceptionTags.where('sourceGameId').equals(id).toArray();

  it('no best move → the row is written PENDING, never latched; the deep dive lands it → the real fundamental', async () => {
    await db.games.put(evalImport('g-c2', null));
    await autoAnalyzeGameMisconceptions('g-c2', 'knight_mare_01');
    let rows = await rowsFor('g-c2');
    expect(rows.length, 'the eval-curve slip was not recorded at all').toBe(1);
    expect(rows[0].attributionPending, 'a tag computed without a best move must say so').toBe(true);
    expect(rows[0].fundamentalId).toBeUndefined();

    // THE DEEP DIVE LANDS: the annotation now carries the engine's move.
    await db.games.update('g-c2', { annotations: evalImport('g-c2', 'e7e6').annotations, analysisDepth: 16 });
    const r = await autoAnalyzeGameMisconceptions('g-c2', 'knight_mare_01');
    expect(r.reattributed).toBe(1);
    rows = await rowsFor('g-c2');
    expect(rows.length, 'a second row would be the latch in a new costume').toBe(1);
    expect(rows[0].fundamentalId).toBe('same-piece-twice');
    expect(rows[0].tag).toBe('neglected-development');
    expect(rows[0].bestSan).toBe('e6');
    expect(rows[0].attributionPending).toBeUndefined();
  });

  it('NEGATIVE CONTROL — no deepening → the row stays pending and nothing is re-attributed', async () => {
    await db.games.put(evalImport('g-c2-nodeepen', null));
    await autoAnalyzeGameMisconceptions('g-c2-nodeepen', 'knight_mare_01');
    const r = await autoAnalyzeGameMisconceptions('g-c2-nodeepen', 'knight_mare_01');
    expect(r.reattributed).toBe(0);
    const rows = await rowsFor('g-c2-nodeepen');
    expect(rows.length).toBe(1);
    expect(rows[0].attributionPending).toBe(true);
  });

  it('NEGATIVE CONTROL — a row classified WITH the best move is never pending and a later pass leaves it alone', async () => {
    await db.games.put(evalImport('g-c2-full', 'e7e6'));
    await autoAnalyzeGameMisconceptions('g-c2-full', 'knight_mare_01');
    const first = await rowsFor('g-c2-full');
    expect(first[0].attributionPending).toBeUndefined();
    expect(first[0].fundamentalId).toBe('same-piece-twice');
    const r = await autoAnalyzeGameMisconceptions('g-c2-full', 'knight_mare_01');
    expect(r.reattributed).toBe(0);
    expect(await rowsFor('g-c2-full')).toEqual(first);
  });
});

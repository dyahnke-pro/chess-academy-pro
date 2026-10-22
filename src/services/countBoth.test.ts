// COUNT BOTH (David 2026-10-22, WO-MOTIFS-01 M3d) — the record side: an old
// game gets its line from the engine cache, a missed shot whose line opens
// with a set-up files a second slip row, and every per-motif count reads both.
import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { autoAnalyzeGameMisconceptions } from './autoAnalyzeGame';
import { captureMisconception } from './discussionPractice';
import { aggregateMistakePuzzles, aggregateClassifiedTactics } from './weaknessSpine';
import { tacticTypesOf } from '../data/tacticMotifs';
import { buildGameRecord, buildMistakePuzzle } from '../test/factories';
import { evalCacheKey } from './positionEvalCache';
import type { ClassifiedTactic, MistakePuzzle, MoveAnnotation } from '../types';
import type { PositionEvalRecord } from '../db/schema';

// A Queen's Gambit Declined; Black's 12th move (ply 23, …c5) is the flagged one.
const SANS = ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O',
  'Nf3', 'h6', 'Bh4', 'b6', 'cxd5', 'Nxd5', 'Bxe7', 'Qxe7', 'Nxd5', 'exd5',
  'Rc1', 'Be6', 'Qa4', 'c5', 'Qa3', 'Rc8'];
const FLAGGED = 23;
/** A whole game's record pass: seconds on a loaded machine, not the 5 s default. */
const WHOLE_GAME_MS = 30_000;

function fensOf(sans: readonly string[]): string[] {
  const c = new Chess();
  return [c.fen(), ...sans.map((s) => { c.move(s); return c.fen(); })];
}

describe('an old game gets its line from the engine cache (no engine run)', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('a flagged ply that kept no line takes the cached one when it starts with the best move', async () => {
    const fens = fensOf(SANS);
    const c = new Chess(fens[FLAGGED]);
    const line = ['Bd7', 'Qa3', 'Rc8'].map((san) => { const m = c.move(san); return `${m.from}${m.to}`; });
    const annotations: MoveAnnotation[] = SANS.map((san, i) => ({
      moveNumber: Math.floor(i / 2) + 1, color: i % 2 === 0 ? 'white' : 'black', san,
      evaluation: i === FLAGGED ? 300 : 10, bestMove: i === FLAGGED ? line[0] : null, bestMoveEval: 10,
      classification: i === FLAGGED ? 'mistake' : 'good', comment: null,
      ...(i === FLAGGED ? { pv: { afterPlayed: ['a4a5'], afterBest: [] } } : {}),
    } as MoveAnnotation));
    const pgn = (() => { const g = new Chess(); for (const s of SANS) g.move(s); return g.pgn(); })();
    const game = buildGameRecord({ id: 'cached-line', pgn, white: 'Opponent', black: 'Me', source: 'import', annotations, fullyAnalyzed: true });
    await db.games.put(game);
    const row: PositionEvalRecord = { fen: evalCacheKey(fens[FLAGGED]), evaluation: 10, depth: 18, bestMove: line[0], pv: line, updatedAt: 1 };
    await db.positionEvals.put(row);

    await autoAnalyzeGameMisconceptions(game.id, 'Me');
    const stored = await db.games.get(game.id);
    expect(stored?.annotations?.[FLAGGED].pv?.afterBest).toEqual(line.slice(1));
    expect(stored?.annotations?.[FLAGGED].pv?.afterPlayed, 'the played line is kept').toEqual(['a4a5']);
  }, WHOLE_GAME_MS);

  it('a cached line for another move is not taken (it was searched for something else)', async () => {
    const fens = fensOf(SANS);
    const annotations: MoveAnnotation[] = SANS.map((san, i) => ({
      moveNumber: Math.floor(i / 2) + 1, color: i % 2 === 0 ? 'white' : 'black', san,
      evaluation: i === FLAGGED ? 300 : 10, bestMove: i === FLAGGED ? 'e6d7' : null, bestMoveEval: 10,
      classification: i === FLAGGED ? 'mistake' : 'good', comment: null,
    } as MoveAnnotation));
    const pgn = (() => { const g = new Chess(); for (const s of SANS) g.move(s); return g.pgn(); })();
    const game = buildGameRecord({ id: 'cached-other', pgn, white: 'Opponent', black: 'Me', source: 'import', annotations, fullyAnalyzed: true });
    await db.games.put(game);
    const row: PositionEvalRecord = { fen: evalCacheKey(fens[FLAGGED]), evaluation: 10, depth: 18, bestMove: 'c7c6', pv: ['c7c6', 'a4a3'], updatedAt: 1 };
    await db.positionEvals.put(row);
    await autoAnalyzeGameMisconceptions(game.id, 'Me');
    expect((await db.games.get(game.id))?.annotations?.[FLAGGED].pv?.afterBest ?? []).toEqual([]);
  }, WHOLE_GAME_MS);
});

describe('a set-up row follows its move when the slip is re-read', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('the line no longer opens with a set-up: the derived row goes, the slip stays', async () => {
    const fens = fensOf(SANS);
    const annotations: MoveAnnotation[] = SANS.map((san, i) => ({
      moveNumber: Math.floor(i / 2) + 1, color: i % 2 === 0 ? 'white' : 'black', san,
      evaluation: i === FLAGGED ? 300 : 10, bestMove: i === FLAGGED ? 'e6d7' : null, bestMoveEval: 10,
      classification: i === FLAGGED ? 'mistake' : 'good', comment: null,
    } as MoveAnnotation));
    const pgn = (() => { const g = new Chess(); for (const s of SANS) g.move(s); return g.pgn(); })();
    const game = buildGameRecord({ id: 'resync', pgn, white: 'Opponent', black: 'Me', source: 'import', annotations, fullyAnalyzed: true });
    await db.games.put(game);
    const base = { source: 'auto-analysis' as const, createdAt: 1, fen: fens[FLAGGED], playedSan: 'c5', bestSan: 'Bd7', sourceGameId: game.id, status: 'open' as const, masteryHits: 0, dueAt: 1, counted: true, rulesRev: 'an-older-rev' };
    await db.misconceptionTags.bulkAdd([
      { ...base, id: 'slip', tag: 'missed-tactic' },
      { ...base, id: 'set-up', tag: 'missed-your-deflection', setup: true },
    ]);
    await autoAnalyzeGameMisconceptions(game.id, 'Me');
    const rows = await db.misconceptionTags.where('sourceGameId').equals(game.id).toArray();
    expect(rows.some((r) => r.id === 'slip'), 'the student\'s own slip is never removed').toBe(true);
    expect(rows.some((r) => r.setup), 'Bd7 opens with no set-up: the derived row is gone').toBe(false);
  }, WHOLE_GAME_MS);
});

describe('a missed shot whose line opens with a set-up files a second slip row', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  // Lichess 0Dao0: Rxh7+ Kxh7 Qh5# — b3 walks past the decoy and the mate.
  const MATE = 'r6k/pp2q1pp/2p2p2/4n3/2B1P2R/2P5/PP4PP/3Q2K1 w - - 3 21';

  it('the mate row and a set-up row for the deflection, same move', async () => {
    await captureMisconception({
      classifyInput: { fen: MATE, playedSan: 'b3', bestSan: 'Rxh7+', pvAfterBest: ['Kxh7', 'Qh5#'] },
      source: 'auto-analysis', shouldCount: true,
      context: { fen: MATE, playedSan: 'b3', bestSan: 'Rxh7+', cpLoss: 900, grade: 'blunder', gamePhase: 'middlegame', moveNumber: 21, sourceGameId: 'g1' },
    });
    const rows = await db.misconceptionTags.toArray();
    expect(rows.map((r) => r.tag).sort()).toEqual(['missed-your-deflection', 'missed-your-mate']);
    const setup = rows.find((r) => r.tag === 'missed-your-deflection');
    expect(setup?.setup).toBe(true);
    expect(setup?.playedSan).toBe('b3');
    expect(rows.find((r) => r.tag === 'missed-your-mate')?.setup).toBeUndefined();
  });

  it('without the line, one row (the old record)', async () => {
    await captureMisconception({
      classifyInput: { fen: MATE, playedSan: 'b3', bestSan: 'Rxh7+' },
      source: 'auto-analysis', shouldCount: true,
      context: { fen: MATE, playedSan: 'b3', bestSan: 'Rxh7+', cpLoss: 900, grade: 'blunder', gamePhase: 'middlegame', moveNumber: 21, sourceGameId: 'g1' },
    });
    // Rxh7+ alone mates nothing: named from its first move, the shot is the
    // catch-all, and there is no line to read a set-up from.
    const rows = await db.misconceptionTags.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].setup).toBeUndefined();
  });
});

describe('every per-motif count reads both names', () => {
  it('tacticTypesOf: the name, then the set-up, never twice', () => {
    expect(tacticTypesOf({ tacticType: 'fork', setupTacticType: 'deflection' })).toEqual(['fork', 'deflection']);
    expect(tacticTypesOf({ tacticType: 'fork', setupTacticType: 'fork' })).toEqual(['fork']);
    expect(tacticTypesOf({ tacticType: 'fork' })).toEqual(['fork']);
    expect(tacticTypesOf({ tacticType: null, setupTacticType: null })).toEqual([]);
  });

  it('the weakness spine lists the puzzle under the fork AND the deflection', () => {
    const p: MistakePuzzle = buildMistakePuzzle({ tacticType: 'fork', setupTacticType: 'deflection', positionalMotif: null });
    const keys = aggregateMistakePuzzles([p]).map((w) => w.key).sort();
    expect(keys).toEqual(['analysis:tactic:deflection', 'analysis:tactic:fork']);
  });

  it('…and a missed tactic from a game likewise', () => {
    const t = { id: 'ct', sourceGameId: 'g', moveIndex: 3, fen: '', bestMoveUci: 'e2e4', bestMoveSan: 'e4', playerMoveUci: '', playerMoveSan: 'd4', playerColor: 'white', tacticType: 'checkmate', setupTacticType: 'deflection', evalSwing: 900, explanation: '', createdAt: '2026-10-22T00:00:00Z', puzzleSuccesses: 0 } as unknown as ClassifiedTactic;
    expect(aggregateClassifiedTactics([t]).map((w) => w.key).sort()).toEqual(['analysis:tactic:checkmate', 'analysis:tactic:deflection']);
  });
});

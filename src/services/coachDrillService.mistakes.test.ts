import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { buildMistakeDrillQueue, mistakePuzzleToDrill, hasImportedGames, summarizeWeaknesses } from './coachDrillService';
import type { MistakePuzzle, GameRecord } from '../types';

/** Build a valid-enough MistakePuzzle for the fields the drill code
 *  reads (fen, moves, bestMoveSan, playerColor, tacticType, gamePhase,
 *  cpLoss, id); the rest are filler. */
function mk(over: Partial<MistakePuzzle> & { id: string; fen: string; moves: string }): MistakePuzzle {
  return {
    playerMove: '',
    playerMoveSan: '',
    bestMove: over.moves.split(' ')[0] ?? '',
    bestMoveSan: '',
    cpLoss: 200,
    classification: 'mistake',
    gamePhase: 'middlegame',
    moveNumber: 10,
    sourceGameId: 'g1',
    sourceMode: 'coach',
    playerColor: 'white',
    promptText: '',
    narration: { intro: '', moveNarrations: [], outro: '', conceptHint: '' },
    createdAt: new Date(0).toISOString(),
    opponentName: null,
    gameDate: null,
    openingName: null,
    evalBefore: null,
    srsInterval: 0,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    srsDueDate: '2000-01-01', // date-only, due (app format)
    srsLastReview: null,
    status: 'unsolved',
    attempts: 0,
    successes: 0,
    tacticType: null,
    ...over,
  } as MistakePuzzle;
}

// Legal positions with a legal first move in `moves` (UCI).
const FORK_A = mk({ id: 'm-fork-a', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', moves: 'g1f3', bestMoveSan: 'Nf3', tacticType: 'fork', cpLoss: 300, gamePhase: 'opening' });
const FORK_B = mk({ id: 'm-fork-b', fen: 'rnbqkbnr/ppp2ppp/8/3pp3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', moves: 'e4d5', bestMoveSan: 'exd5', tacticType: 'fork', cpLoss: 500, gamePhase: 'opening' });
const END_A = mk({ id: 'm-end-a', fen: '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', moves: 'e2e4', bestMoveSan: 'e4', tacticType: null, gamePhase: 'endgame', cpLoss: 200 });

describe('buildMistakeDrillQueue — sourced from user mistakes, most common first', () => {
  beforeEach(async () => {
    await db.mistakePuzzles.clear();
  });

  it('returns [] when the user has no mistakes (caller falls back)', async () => {
    expect(await buildMistakeDrillQueue()).toEqual([]);
  });

  it('buckets by missed pattern and ranks most-common → least', async () => {
    await db.mistakePuzzles.bulkAdd([END_A, FORK_A, FORK_B]);
    const queue = await buildMistakeDrillQueue();
    expect(queue.length).toBe(2);
    // Forks (2) outrank Endgame (1).
    expect(queue[0].key).toBe('tactic:fork');
    expect(queue[0].label).toBe('Forks');
    expect(queue[0].count).toBe(2);
    // Endgame mistakes bucket by ENDING TYPE now (David 2026-09-01).
    expect(queue[1].key).toBe('endgame-type:king-pawn');
    expect(queue[1].count).toBe(1);
  });

  it('orders a theme worst-mistake (highest cp loss) first', async () => {
    await db.mistakePuzzles.bulkAdd([FORK_A, FORK_B]); // 300, 500
    const queue = await buildMistakeDrillQueue();
    expect(queue[0].drills[0].puzzleId).toBe('m-fork-b'); // 500 cp first
    expect(queue[0].drills[1].puzzleId).toBe('m-fork-a');
  });

  it('every drill is a legal, playable position', async () => {
    await db.mistakePuzzles.bulkAdd([FORK_A, FORK_B, END_A]);
    const queue = await buildMistakeDrillQueue();
    for (const theme of queue) {
      for (const drill of theme.drills) {
        expect(drill.solutionSan.length).toBeGreaterThan(0);
        const chess = new Chess(drill.setupFen);
        expect(() => chess.move(drill.solutionSan[0])).not.toThrow();
        expect(drill.prompt).toMatch(/your own game/i);
      }
    }
  });

  it('excludes MASTERED mistakes (they tested out via SRS)', async () => {
    await db.mistakePuzzles.bulkAdd([
      FORK_A,
      mk({ id: 'm-fork-mastered', fen: FORK_B.fen, moves: 'e4d5', tacticType: 'fork', status: 'mastered', cpLoss: 900 }),
    ]);
    const queue = await buildMistakeDrillQueue({ today: '2026-07-03' });
    expect(queue.length).toBe(1);
    expect(queue[0].drills.map((d) => d.puzzleId)).toEqual(['m-fork-a']);
  });

  it('excludes NOT-YET-DUE mistakes (SRS pushed them past today)', async () => {
    await db.mistakePuzzles.bulkAdd([
      FORK_A, // due 2000-01-01
      mk({ id: 'm-fork-future', fen: FORK_B.fen, moves: 'e4d5', tacticType: 'fork', srsDueDate: '2099-01-01' }),
    ]);
    const queue = await buildMistakeDrillQueue({ today: '2026-07-03' });
    expect(queue[0].drills.map((d) => d.puzzleId)).toEqual(['m-fork-a']);
  });

  it('returns [] when nothing is due today', async () => {
    await db.mistakePuzzles.bulkAdd([
      mk({ id: 'm-future', fen: FORK_A.fen, moves: 'g1f3', tacticType: 'fork', srsDueDate: '2099-01-01' }),
    ]);
    expect(await buildMistakeDrillQueue({ today: '2026-07-03' })).toEqual([]);
  });

  it('cements the pattern: appends a fresh themed rep AFTER the student\'s own instances', async () => {
    await db.mistakePuzzles.bulkPut([FORK_A, FORK_B]);
    const queue = await buildMistakeDrillQueue({ cementReps: 1, rating: 1500 });
    const fork = queue.find((t) => t.key === 'tactic:fork');
    expect(fork).toBeTruthy();
    // `count` stays the EVIDENCE — the student's own instances — never inflated
    // by the appended pattern rep.
    expect(fork?.count).toBe(2);
    // Exactly one fresh rep, appended LAST, flagged; the own instances lead and
    // are not flagged.
    const cement = fork?.drills.filter((d) => d.isCementRep) ?? [];
    expect(cement.length).toBe(1);
    expect(fork?.drills[fork.drills.length - 1].isCementRep).toBe(true);
    expect(fork?.drills[0].isCementRep).toBeFalsy();
    // The cement rep is a DIFFERENT position than the student's own.
    expect(cement[0].setupFen).not.toBe(FORK_A.fen);
    expect(cement[0].setupFen).not.toBe(FORK_B.fen);
  });

  it('default (no cementReps) appends nothing — behavior unchanged', async () => {
    await db.mistakePuzzles.bulkPut([FORK_A, FORK_B]);
    const queue = await buildMistakeDrillQueue();
    const fork = queue.find((t) => t.key === 'tactic:fork');
    expect(fork?.drills.every((d) => !d.isCementRep)).toBe(true);
  });

  it('never cements a non-tactic (phase / transform) bucket — no themed pool', async () => {
    await db.mistakePuzzles.bulkPut([END_A]);
    const queue = await buildMistakeDrillQueue({ cementReps: 1, rating: 1500 });
    for (const t of queue) expect(t.drills.every((d) => !d.isCementRep)).toBe(true);
  });
});

describe('summarizeWeaknesses — the evidence header, most common first', () => {
  it('groups by weakness bucket, counts live instances, excludes mastered', () => {
    const rows = summarizeWeaknesses([
      FORK_A, FORK_B,
      mk({ id: 'p-back', fen: FORK_A.fen, moves: 'g1f3', tacticType: 'back_rank' }),
      mk({ id: 'p-mastered', fen: FORK_A.fen, moves: 'g1f3', tacticType: 'fork', status: 'mastered' }),
    ]);
    // Forks (2 live) before back-rank (1); the mastered fork is excluded.
    expect(rows[0]).toMatchObject({ key: 'tactic:fork', count: 2 });
    expect(rows.find((r) => r.key === 'tactic:back_rank')?.count).toBe(1);
    expect(rows.reduce((n, r) => n + r.count, 0)).toBe(3);
  });

  it('returns [] for no mistakes', () => {
    expect(summarizeWeaknesses([])).toEqual([]);
  });
});

describe('hasImportedGames — real uploads vs seeded samples', () => {
  function game(over: Partial<GameRecord> & { id: string; source: GameRecord['source'] }): GameRecord {
    return { pgn: '', white: 'a', black: 'b', result: '1-0', date: '2026-01-01', ...over } as GameRecord;
  }
  beforeEach(async () => {
    await db.games.clear();
  });

  it('false when no games', async () => {
    expect(await hasImportedGames()).toBe(false);
  });

  it('false when only seeded sample games are present (sample- ids)', async () => {
    await db.games.bulkAdd([
      game({ id: 'sample-morphy-opera-1858', source: 'lichess' }),
      game({ id: 'sample-italian-amateur-2', source: 'chesscom' }),
    ]);
    expect(await hasImportedGames()).toBe(false);
  });

  it('true when a real lichess/chess.com game is imported', async () => {
    await db.games.bulkAdd([
      game({ id: 'sample-morphy-opera-1858', source: 'lichess' }),
      game({ id: 'lichess_abc123', source: 'lichess' }),
    ]);
    expect(await hasImportedGames()).toBe(true);
  });
});

describe('mistakePuzzleToDrill', () => {
  it('solves directly from mp.fen (no Lichess setup move)', () => {
    const drill = mistakePuzzleToDrill(FORK_B);
    expect(drill).not.toBeNull();
    expect(drill!.setupFen).toBe(FORK_B.fen);
    expect(drill!.solutionSan[0]).toBe('exd5');
    expect(drill!.playerColor).toBe('white');
  });

  it('falls back to bestMoveSan when the line will not replay', () => {
    const bad = mk({ id: 'm-bad', fen: '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1', moves: 'z9z9', bestMoveSan: 'Kd3', tacticType: 'pin' });
    const drill = mistakePuzzleToDrill(bad);
    expect(drill).not.toBeNull();
    expect(drill!.solutionSan).toEqual(['Kd3']);
  });

  it('returns null when neither the line nor the best move is legal', () => {
    const broken = mk({ id: 'm-broken', fen: '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1', moves: '', bestMoveSan: 'Qxh7' });
    expect(mistakePuzzleToDrill(broken)).toBeNull();
  });
});

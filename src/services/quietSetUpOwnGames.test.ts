import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { reconcileTacticTypes, IMMEDIATE_BACKFILL_SCHEDULE, TACTIC_TYPE_REV } from './tacticTypeBackfill';
import { aggregateMistakePuzzles, bucketForMistake } from './weaknessSpine';
import { ownPositionsHole } from '../components/Insights/HeatMapPanel';
import type { MistakePuzzle, TacticType } from '../types';

// THE QUIET SET-UP TAUGHT FROM YOUR OWN MISSES (David 2026-11-08: "Make sure
// the quiet move can also teach from misses in own games"). A missed set-up in
// the student's own game is filed under "Missed quiet set-ups" on My
// Weaknesses, and the heat map's `missed-set-up` row opens exactly those
// positions ("Practice your positions"). Before, every group from the
// student's own games carried no record row, so that button never showed for
// any row, and a quiet set-up fell into "Mistakes in the middlegame".

// A Danya-bench board and the engine's own line (setUpChance.test.ts): Black's
// quiet …Nf3 sets up …Qxf3+ forking king and bishop.
const FORK = 'r4rk1/ppp1pp1p/3p1bp1/5P2/2PnP3/2NB3q/PP3P1P/R2Q1R1K b - - 0 13';
const LINE = (() => {
  const c = new Chess(FORK);
  return ['Nf3', 'Qxf3', 'Qxf3+', 'Kg1', 'c6', 'c5'].map((s) => { const m = c.move(s); return `${m.from}${m.to}`; });
})();

function puzzle(over: Partial<MistakePuzzle>): MistakePuzzle {
  return {
    id: 'su', fen: FORK, playerMove: 'a7a6', playerMoveSan: 'a6', bestMove: LINE[0], bestMoveSan: 'Nf3', moves: LINE.join(' '),
    cpLoss: 400, classification: 'blunder', gamePhase: 'middlegame', moveNumber: 13, sourceGameId: 'g-su', sourceMode: 'lichess',
    playerColor: 'black', promptText: '', narration: { intro: '', moveNarrations: [], conceptHint: '' }, createdAt: new Date().toISOString(),
    opponentName: null, gameDate: null, openingName: null, evalBefore: null, srsInterval: 1, srsEaseFactor: 2.5, srsRepetitions: 0,
    srsDueDate: new Date().toISOString(), srsLastReview: null, status: 'unsolved', attempts: 0, successes: 0,
    ...over,
  };
}

describe('missed quiet set-ups from your own games', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('a puzzle already at the re-tag rev gets its set-up read once, and nothing else changes', async () => {
    await db.mistakePuzzles.put(puzzle({ tacticTypeRev: TACTIC_TYPE_REV, tacticType: null }));
    await reconcileTacticTypes(IMMEDIATE_BACKFILL_SCHEDULE);
    const row = await db.mistakePuzzles.get('su');
    expect(row?.quietSetUp).toBe(true);
    expect(row?.tacticType).toBeNull();
  });

  it('files under "Missed quiet set-ups", the row the heat map drills', () => {
    const b = bucketForMistake(puzzle({ quietSetUp: true }));
    expect(b).toMatchObject({ clusterId: 'analysis:set-up', label: 'Missed quiet set-ups', capability: 'missed-set-up' });
  });

  it('the heat map row opens your own positions — for the set-up and for a motif alike', () => {
    const holes = aggregateMistakePuzzles([
      puzzle({ quietSetUp: true }),
      puzzle({ id: 'fk', quietSetUp: false, tacticType: 'fork' as TacticType }),
    ]);
    expect(ownPositionsHole(holes, 'missed-set-up')?.tag).toBe('analysis:set-up');
    expect(ownPositionsHole(holes, 'missed-your-fork')?.tag).toBe('analysis:tactic:fork');
  });
});

// THE PLAN COMPUTER'S PLANS, BOTH WAYS (plans round 3, capability parity): a
// round-3 plan the board says is posed with its own tag, held by the move
// that plays it, broken by a costly move that does not — written through the
// lane door with the student's seat. Real board: the Sicilian Closed replay
// (lichess vvidmF0a), move 32 — White down four and a half pawns, the best
// line forcing nothing: the plan is to defend.
import { beforeEach, describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import replay from '../test/fixtures/learn-replay-games.json';
import { planKindAnswer, PLAN_KIND_TAG } from './planOf';
import { recordPlanAnswer } from './learnBoardTeaching';
import type { AnalysisLine } from '../types';

interface FixLine { uci: string; cp: number | null; mate: number | null; pv: string[] }
const g = (replay as { games: Array<{ id: string; sans: string[]; reads: Array<{ before: FixLine[] }> }> }).games.find((x) => x.id === 'sicilianClosed1000')!;
const c = new Chess(); for (const s of g.sans.slice(0, 62)) c.move(s);
const FEN = c.fen();
const LINES: AnalysisLine[] = g.reads[62].before.map((l, k) => ({ rank: k + 1, evaluation: l.cp ?? 0, mate: l.mate, moves: l.pv }));
const lash = new Chess(FEN).moves({ verbose: true }).find((m) => !!m.captured || /\+/.test(m.san))!;

describe('the plan computer\'s plans, both ways', () => {
  beforeEach(async () => { await db.capabilityEvidence.clear(); });

  it('every round-3 plan kind has its own record tag', () => {
    expect(Object.keys(PLAN_KIND_TAG).sort()).toEqual(['king-blocked', 'passive-defence', 'regroup', 'two-weaknesses']);
    expect(new Set(Object.values(PLAN_KIND_TAG)).size).toBe(4);
  });

  it('passive defence: the quiet best move holds it, a costly capture or check breaks it', () => {
    expect(planKindAnswer({ fen: FEN, lines: LINES, student: 'w', playedUci: 'h2h4', cpLoss: 0 })).toMatchObject({ tag: 'abandoned-defence', outcome: 'held' });
    expect(lash).toBeTruthy();
    expect(planKindAnswer({ fen: FEN, lines: LINES, student: 'w', playedUci: `${lash.from}${lash.to}`, cpLoss: 300 })).toMatchObject({ tag: 'abandoned-defence', outcome: 'broken' });
    // Not the student's board to answer: nothing posed.
    expect(planKindAnswer({ fen: FEN, lines: LINES, student: 'b', playedUci: 'h2h4', cpLoss: 0 })).toBeNull();
  });

  it('the lane door writes the held row, and refuses it under the other seat', async () => {
    recordPlanAnswer({ fen: FEN, playedSan: 'h4', lines: LINES, cpLoss: 0, prompted: false, gameId: 'g-plan', studentSeat: 'white' });
    recordPlanAnswer({ fen: FEN, playedSan: lash.san, lines: LINES, cpLoss: 300, prompted: false, gameId: 'g-plan-2', studentSeat: 'white' });
    recordPlanAnswer({ fen: FEN, playedSan: 'h4', lines: LINES, cpLoss: 0, prompted: false, gameId: 'g-plan-3', studentSeat: 'black' });
    await new Promise((r) => { setTimeout(r, 100); });
    const rows = await db.capabilityEvidence.toArray();
    expect(rows.map((r) => [r.tag, r.outcome, r.sourceGameId]).sort()).toEqual([
      ['abandoned-defence', 'broken', 'g-plan-2'],
      ['abandoned-defence', 'held', 'g-plan'],
    ]);
  });
});

// A WIRE THAT DOES NOT FIRE IS NOT A WIRE (David 2026-09-23: "Make sure it's
// wired in! So many things get built but not wired properly!").
//
// `factStakes.test.ts` proves the door orders by stakes when it is HANDED
// them. This proves the two real producers HAND them: the live composer
// (`computePositionFacts`, which Learn, phase narration, "read this position"
// and the Why button all call) and review (`buildReviewSegments`, the walk).
// It listens to the door's own emission, the same row the prod audits read,
// so a producer that stops coupling stakes turns this red.
//
// Negative control (run and reverted): delete the `stakes:` line from the
// door call in `positionFacts.ts` (or from the review's decide bundle) and the
// matching test fails on `stakedCount`.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { computePositionFacts } from '../services/positionFacts';
import { buildReviewSegments, type ReviewMoveInput } from '../services/coachFeatureService';
import { coldStudent } from '../services/needScore';
import { onCoachDecision, type CoachDecisionRow } from '../services/coachDecisionEvents';

const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
const flat = { topLines: [line(1, 20), line(2, 15), line(3, 10)], evaluation: 20, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 420, draw: 400, loss: 180 } };

let rows: CoachDecisionRow[] = [];
let off: () => void = () => undefined;
beforeEach(() => { rows = []; off = onCoachDecision((r) => { rows.push(r); }); });
afterEach(() => off());

describe('the computed order is WIRED — both producers hand the door their stakes', () => {
  it('live: a hanging knight reaches the door with its stakes and leads', async () => {
    // White knight on e5 attacked by the d6 pawn; the student is White, to move.
    const r = await computePositionFacts({
      posture: 'walk',
      fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 14',
      moverColor: 'w', studentColor: 'w', analysis: flat,
    });
    const md = r.clauses.find((c) => c.kind === 'must-defend');
    expect(md?.stakes, 'the must-defend clause carries no stakes — the emission site is not coupling them').toEqual({ points: 3, plies: 2 });
    const row = rows.at(-1);
    expect(row?.stakedCount, 'the door received no stakes from the live composer').toBeGreaterThan(0);
    expect(row?.leadStaked).toBe(true);
    expect(r.clauses[0]?.kind).toBe('must-defend');
  });

  it('review: a real blunder reaches the door with the cost it paid, and the cost leads', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Nxe5?? Nxe5 — the knight is lost for a pawn.
    const SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Nxe5', 'Nxe5'];
    const evals = [30, 30, 30, 30, -250, -250];
    const chess = new Chess();
    const moves = SANS.map((san, i) => {
      chess.move(san);
      return {
        ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: i % 2 === 1,
        classification: i === 4 ? 'blunder' : 'book',
        preMoveEval: i === 0 ? 20 : evals[i - 1], evaluation: evals[i],
        bestMove: i === 4 ? 'f1c4' : null,
      } as unknown as ReviewMoveInput;
    });
    const segs = buildReviewSegments(moves, 'white', null, true, 1400, [], coldStudent(1400), 'wired');
    const blunderRow = rows.find((row) => row.stakedCount > 0 && row.speak);
    expect(blunderRow, 'no review decision carried stakes — computeMoveFacets is not coupling them, or the review bundle drops them').toBeDefined();
    expect(blunderRow?.leadStaked).toBe(true);
    // …and it reached what the student hears: the blunder ply speaks its cost.
    const ply5 = segs.find((s) => s.ply === 5);
    expect(ply5?.narration ?? '').toMatch(/blunder|costing/i);
  });
});

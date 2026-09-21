// 🔒 THE SWEEP CARRIES ITS OWN ENGINE LINE (2026-09-21).
//
// `analyzePosition` returns `{evaluation, bestMove, depth, pv}`. BOTH sweeps —
// the review's curve pass (`evaluateFensPooled`) and the batch/import path
// (`analyzeGameOnWorker`) — kept the eval and the depth and dropped the PV on
// the floor. `analyzeGameOnWorker`'s inner `search` helper declared it away in
// its own RETURN TYPE, which is why nobody saw it.
//
// WHAT IT COST. `pvAt` (was `deepPv`) was filled ONLY by the review's
// key-moment dive, and a COLD open runs `{sweepOnly: true}`, which skips that
// dive. So the FIRST review of a game — the one a student actually reads —
// carried no punishing line on any ply, and every PV-gated reasoning
// fundamental declined with "punishing PV is 0 plies, needs 3". A tight gate
// and an absent input look identical from the outside; this was the second.
// PLAN recorded "the batch path carries no PV at all" as a measured BOUND on
// imported games. It was never a property of the batch — just this drop.
//
// Blamed by BEHAVIOUR: the annotation must carry the line, and the attributor's
// own diagnostic must stop reporting an empty PV. Negative-controlled, so a
// regression that re-drops the line fails loudly instead of passing on an
// empty set.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { analyzeGameOnWorker } from './gameAnalysisService';
import { attributePrinciples } from './principleAttribution';
import { buildGameRecord } from '../test/factories';

type Worker = Parameters<typeof analyzeGameOnWorker>[1];

// A Queen's Gambit Declined; ply 23 (index 23, a BLACK move) is the one we
// flag by handing the engine a collapsing eval across it.
const SANS = ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O',
  'Nf3', 'h6', 'Bh4', 'b6', 'cxd5', 'Nxd5', 'Bxe7', 'Qxe7', 'Nxd5', 'exd5',
  'Rc1', 'Be6', 'Qa4', 'c5', 'Qa3', 'Rc8'];

const FLAGGED = 23; // ...c5
/** The line the engine "plays" after the flagged move — quiet, quiet, then a
 *  capture on the third. That SHAPE is what makes it a calculation-depth
 *  candidate rather than a one-move oversight. */
const PUNISH_PV = ['a4a5', 'b8d7', 'a5a6', 'a8b8'];

function fensOf(sans: string[]): string[] {
  const c = new Chess();
  const out = [c.fen()];
  for (const s of sans) { c.move(s); out.push(c.fen()); }
  return out;
}

function pgnOf(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.pgn();
}

/** A worker that returns a flat eval everywhere except across the flagged ply,
 *  where White's advantage jumps — a blunder by Black. `carriesPv` is the
 *  NEGATIVE CONTROL: false reproduces the old dropped-line behaviour. */
function stubWorker(carriesPv: boolean): Worker {
  const fens = fensOf(SANS);
  const byFen = new Map<string, number>();
  fens.forEach((f, i) => byFen.set(f, i <= FLAGGED ? 10 : 420));
  const stub = {
    newGame(): void { /* no hash */ },
    analyzePosition(fen: string, depth: number): Promise<{ evaluation: number; bestMove: string; depth: number; pv: string[] }> {
      const idx = fens.indexOf(fen);
      return Promise.resolve({
        evaluation: byFen.get(fen) ?? 10,
        bestMove: 'c8d7',
        depth,
        // Only the position AFTER the flagged move carries the punishing line,
        // which is exactly what `pv.afterPlayed` is supposed to be.
        pv: carriesPv && idx === FLAGGED + 1 ? PUNISH_PV : [],
      });
    },
    ping(): Promise<boolean> { return Promise.resolve(true); },
    destroy(): void { /* nothing */ },
  };
  return stub as unknown as Worker;
}

async function annotate(carriesPv: boolean) {
  const game = buildGameRecord({ id: `pv-${carriesPv}`, pgn: pgnOf(SANS), source: 'chesscom' });
  await db.games.put(game);
  const res = await analyzeGameOnWorker(game, stubWorker(carriesPv));
  return res?.annotations ?? [];
}

describe('the sweep carries its own engine line', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.games.clear();
    await db.positionEvals.clear();
  });

  it('a flagged ply on the BATCH path carries the punishing line', async () => {
    const anns = await annotate(true);
    expect(anns.length, 'non-vacuous — no annotations means every assertion below is free').toBe(SANS.length);
    const flagged = anns[FLAGGED];
    expect(flagged.classification, 'the fixture must actually flag this ply').not.toBe('good');
    expect(flagged.pv?.afterPlayed, 'the line the engine already computed must reach the annotation').toEqual(PUNISH_PV);
  });

  it('NEGATIVE CONTROL — with the line dropped, only the 1-ply bestMove stub survives', async () => {
    // Sharpened after the first cut expected `[]` and got `['c8d7']`. That was
    // the CONTROL catching the production code, not a bug: when the engine
    // returns no line we fall back to `[bestMove]`, mirroring the review path.
    // Which makes the real contract about DEPTH, not presence — a 1-ply "line"
    // is honest and useless, because `calculation-depth` needs 3 plies to tell
    // a shallow-calculation failure from a one-move oversight. So the control
    // asserts the PUNISHING line specifically fails to arrive.
    const anns = await annotate(false);
    expect(anns[FLAGGED].classification).not.toBe('good');
    const got = anns[FLAGGED].pv?.afterPlayed ?? [];
    expect(got).not.toEqual(PUNISH_PV);
    expect(got.length, 'a bestMove fallback is at most one ply — never a punishing line').toBeLessThan(3);
  });

  it('an UNFLAGGED ply carries no line — the field is for flagged plies only', async () => {
    const anns = await annotate(true);
    const quiet = anns.findIndex((a, i) => i !== FLAGGED && a.classification === 'good');
    expect(quiet, 'fixture must contain at least one quiet ply').toBeGreaterThanOrEqual(0);
    expect(anns[quiet].pv).toBeUndefined();
  });

  it('and the attributor stops reporting an empty PV — the reason this exists', async () => {
    const anns = await annotate(true);
    const withPv: string[] = [];
    attributePrinciples({
      historySans: SANS.slice(0, FLAGGED + 1),
      bestSan: 'Rc8',
      classification: 'blunder',
      evalBefore: -10,
      evalAfterPlayed: -420,
      pvAfterPlayed: anns[FLAGGED].pv?.afterPlayed ?? [],
    }, withPv);
    expect(withPv.join(' | '), 'the whole point: the input is no longer absent')
      .not.toMatch(/punishing PV is 0 plies/);

    // NEGATIVE CONTROL — the same call on a run that dropped the line says so.
    const anns2 = await annotate(false);
    const without: string[] = [];
    attributePrinciples({
      historySans: SANS.slice(0, FLAGGED + 1),
      bestSan: 'Rc8',
      classification: 'blunder',
      evalBefore: -10,
      evalAfterPlayed: -420,
      pvAfterPlayed: anns2[FLAGGED].pv?.afterPlayed ?? [],
    }, without);
    expect(without.join(' | '), 'the shallow fallback must still decline — for the right, stated reason')
      .toMatch(/punishing PV is \d+ plies, needs 3/);
  });
});

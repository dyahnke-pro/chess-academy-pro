// 🔒 THE RECORDING PATH PASSES THE ENGINE LINES (2026-09-20).
//
// Found by taking the section-14 reading on prod: every unnamed slip the muted
// loop audit met printed `calculation-depth: punishing PV is 0 plies, needs 3`.
// ZERO plies, not two — so the gate was never tight, its INPUT was absent. The
// annotation carries the lines (`ann.pv`, persisted by the review's deep dive)
// and `autoAnalyzeGameMisconceptions`'s blunder builder never passed them, so
// the PV-gated fundamentals could not fire on the path that records every
// imported and every finished coach game. `BlunderForAnalysis` has declared
// `pvAfterPlayed`/`pvAfterBest` since 2026-09-06 saying they "unlock the
// eval/PV-gated fundamentals on the recording path" — the fields were there,
// the wire was not. Exactly the defect the two blocks above it already fixed
// for evalBefore and evalAfterPlayed.
//
// Blamed by BEHAVIOUR, not by string: the attributor's own diagnostic must
// stop reporting an empty PV once the annotation carries one. Negative control
// included, so a regression that drops the wire fails loudly rather than
// passing on an empty set.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { attributePrinciples } from './principleAttribution';
import type { MoveAnnotation } from '../types';

// A real game whose ply 13 (…O-O) is the shape the audit met.
const SANS = ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O',
  'Nf3', 'h6', 'Bh4', 'b6', 'cxd5', 'Nxd5', 'Bxe7', 'Qxe7', 'Nxd5', 'exd5',
  'Rc1', 'Be6', 'Qa4', 'c5', 'Qa3', 'Rc8'];

function pgnOf(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.pgn();
}

/** The PV the deep dive would persist at a flagged ply, in UCI. */
const PV_UCI = ['a4a5', 'b8d7', 'a5a6', 'a8b8'];

function annotationsWithPv(pv: boolean): MoveAnnotation[] {
  const c = new Chess();
  const out: MoveAnnotation[] = [];
  SANS.forEach((san, i) => {
    c.move(san);
    const flagged = i === 23; // a black move, deep enough to be past book
    out.push({
      moveNumber: Math.floor(i / 2) + 1,
      color: i % 2 === 0 ? 'white' : 'black',
      san,
      evaluation: flagged ? -260 : 10,
      bestMove: flagged ? 'c8d7' : null,
      bestMoveEval: flagged ? 20 : 10,
      classification: flagged ? 'blunder' : 'good',
      comment: null,
      ...(flagged && pv ? { pv: { afterPlayed: PV_UCI, afterBest: [] } } : {}),
    } as MoveAnnotation);
  });
  return out;
}

async function seed(pv: boolean): Promise<string> {
  const id = `pv-wire-${pv ? 'with' : 'without'}`;
  await db.games.put({
    id, pgn: pgnOf(SANS), source: 'coach', playedAt: Date.now(),
    white: 'student', black: 'student', result: '0-1',
    studentSide: 'black', annotations: annotationsWithPv(pv),
  } as never);
  return id;
}

describe('the recording path passes the engine lines to the attributor', () => {
  beforeEach(async () => { await db.delete(); await db.open(); vi.restoreAllMocks(); });

  it('an annotation carrying a PV reaches the sweep — the attributor stops reporting an empty line', async () => {
    const { autoAnalyzeGameMisconceptions } = await import('./autoAnalyzeGame');
    const why: string[] = [];
    // Spy at the door the sweep calls, so we read the REAL input it assembled.
    const mod = await import('./misconceptionClassifier');
    const spy = vi.spyOn(mod, 'classifyMisconception');

    await autoAnalyzeGameMisconceptions(await seed(true), 'student');

    expect(spy, 'the sweep never classified anything — fixture is wrong, not the wire').toHaveBeenCalled();
    const withPv = spy.mock.calls.map((c) => c[0]).filter((i) => i.playedSan === SANS[23]);
    expect(withPv.length, 'the flagged ply never reached the classifier').toBeGreaterThan(0);
    for (const input of withPv) {
      expect(input.pvAfterPlayed, 'the persisted PV never reached the classifier').toBeTruthy();
      expect((input.pvAfterPlayed ?? []).length).toBeGreaterThanOrEqual(3);
      // SAN, not UCI — the attributor reads SAN.
      expect((input.pvAfterPlayed ?? [])[0]).not.toMatch(/^[a-h][1-8][a-h][1-8]$/);
      // And the attributor's own diagnostic must no longer say the line is empty.
      attributePrinciples({
        historySans: SANS.slice(0, 24),
        bestSan: 'Bd7',
        classification: 'blunder',
        evalBefore: 20,
        evalAfterPlayed: -260,
        pvAfterPlayed: input.pvAfterPlayed,
      }, why);
    }
    expect(why.join(' | '), 'calculation-depth still sees an empty PV').not.toMatch(/punishing PV is 0 plies/);
  });

  it('negative control: no PV on the annotation → none invented downstream', async () => {
    const { autoAnalyzeGameMisconceptions } = await import('./autoAnalyzeGame');
    const mod = await import('./misconceptionClassifier');
    const spy = vi.spyOn(mod, 'classifyMisconception');

    await autoAnalyzeGameMisconceptions(await seed(false), 'student');

    const calls = spy.mock.calls.map((c) => c[0]).filter((i) => i.playedSan === SANS[23]);
    expect(calls.length).toBeGreaterThan(0);
    for (const input of calls) expect(input.pvAfterPlayed).toBeUndefined();
  });
});

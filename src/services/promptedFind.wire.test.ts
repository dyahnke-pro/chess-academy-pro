// T3 (WO-CLOSEOUT-01, 2026-09-20) — a find the coach ANNOUNCED first records as
// PROMPTED, never as unaided evidence. Learn keeps the plies where the deciding
// computer kept a `key-moment` clause, saves them on the game record, and the
// review's capture marks those capability rows prompted. Real code, fake Dexie.
import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { autoAnalyzeBlunders, capabilityPliesFromAnnotations } from './autoAnalyzeGame';
import { movesToAnnotations } from './coachGameAnnotations';
import type { CoachGameMove } from '../types';

// C1 (2026-09-22) deleted the review card's `buildCapabilityPlies` — the ONE
// mirror is the sweep's `capabilityPliesFromAnnotations`; this adapts the
// fixture through the same annotation shape the record carries.
function buildCapabilityPlies(ms: CoachGameMove[], colour: 'white' | 'black', prompted: number[] = []) {
  const c = new Chess();
  const fens = [c.fen(), ...ms.map((m) => m.fen)];
  return capabilityPliesFromAnnotations(movesToAnnotations(ms, colour) ?? [], colour, fens, prompted);
}

const SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5'];
function moves(): CoachGameMove[] {
  const c = new Chess();
  return SANS.map((san, i) => {
    c.move(san);
    // `moveNumber` is the 1-based PLY on a CoachGameMove (the annotation adapter halves it).
    return { san, fen: c.fen(), moveNumber: i + 1, classification: 'good', preMoveEval: 10, evaluation: 10, isCoachMove: i % 2 === 1 } as unknown as CoachGameMove;
  });
}

describe('prompted finds — Learn announced it, so the sweep files it grey', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('buildCapabilityPlies marks exactly the announced plies (1-based) as prompted', () => {
    const plies = buildCapabilityPlies(moves(), 'white', [5]);
    // White's plies are 1,3,5,7 → four capability plies
    expect(plies.map((p) => p.playedSan)).toEqual(['e4', 'Nf3', 'Bc4', 'd3']);
    expect(plies.map((p) => p.prompted)).toEqual([false, false, true, false]);
  });

  it('negative control: no announced plies → nothing is prompted (the old behaviour, exactly)', () => {
    expect(buildCapabilityPlies(moves(), 'white').some((p) => p.prompted)).toBe(false);
  });

  it('autoAnalyzeBlunders writes the prompted flag onto the capability rows it records', async () => {
    const caps = buildCapabilityPlies(moves(), 'white', [5]);
    await autoAnalyzeBlunders([], { learned: true, sourceGameId: 'learn-1', capabilityPlies: caps, playerColor: 'white' });
    const rows = (await db.capabilityEvidence.toArray()).filter((r) => r.sourceGameId === 'learn-1');
    // Only plies that POSED something record at all; every row that did must
    // carry the flag its ply was given, and a prompted ply's rows are prompted.
    for (const r of rows) {
      const ply = caps.find((c) => c.playedSan === r.playedSan); // sans are unique in this fixture
      expect(ply, `row without a source ply: ${r.playedSan}`).toBeTruthy();
      expect(r.prompted).toBe(ply?.prompted ?? false);
    }
  });
});

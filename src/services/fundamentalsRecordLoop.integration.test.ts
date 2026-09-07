import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { buildBlunders } from '../components/Coach/GameReviewWeaknessCapture';
import { autoAnalyzeBlunders } from './autoAnalyzeGame';
import { getUnifiedWeaknessProfile } from './weaknessSpine';
import { resolveRepRoute } from './repRouting';
import type { CoachGameMove } from '../types';

/**
 * THE CONNECTIVE-TISSUE PROOF (David 2026-09-06: "sounds beautiful … then fails
 * because of poor connective tissue. THAT WILL NOT HAPPEN THIS TIME"). A wire
 * that does not fire is not a wire — so this drives the ENTIRE record→drill chain
 * with a REAL blundered game and asserts a poisoned-pawn WEAKNESS comes out the
 * far end and routes to a drill:
 *
 *   real game (CoachGameMove[]) → buildBlunders (history + eval + PV, SAN-normalized)
 *     → autoAnalyzeBlunders → classifyMisconception (eval/PV attributor)
 *     → logMisconception → db.misconceptionTags (Dexie)
 *     → getUnifiedWeaknessProfile (read back) → resolveRepRoute (→ /tactics/adaptive)
 *
 * Every hop is the real production code — no mocks. fake-indexeddb backs Dexie.
 */

// A real legal game whose LAST move (White's Qxh7) grabs a pawn with the queen
// and gets trapped by ...Rxh7 — a poisoned pawn (found by the capture-biased
// fixture search; same line as principleAttributionEvalPv.test.ts).
const HISTORY = ['f3', 'c5', 'b4', 'cxb4', 'Na3', 'bxa3', 'g3', 'Na6', 'Bxa3', 'e5', 'Kf2', 'Bxa3', 'h3', 'e4', 'fxe4', 'Nc7', 'c4', 'Nf6', 'Rh2', 'Nxe4+', 'Ke1', 'Nxg3', 'Qc2', 'Kf8', 'Qxh7'];

function buildGameMoves(): CoachGameMove[] {
  const c = new Chess();
  const moves: CoachGameMove[] = [];
  for (let i = 0; i < HISTORY.length; i += 1) {
    c.move(HISTORY[i]);
    const isLast = i === HISTORY.length - 1;
    moves.push({
      moveNumber: Math.ceil((i + 1) / 2),
      san: HISTORY[i],
      fen: c.fen(),
      isCoachMove: false,
      commentary: '',
      // White (the blundering side) is mover on the last move; evals are
      // white-POV. The queen grab crashes the eval — flagged a blunder.
      evaluation: isLast ? -550 : 0,
      preMoveEval: isLast ? 20 : 0,
      classification: isLast ? 'blunder' : null,
      // pv is UCI on the annotation. afterPlayed: Black plays ...Rxh7 (h8→h7).
      pv: isLast ? { afterPlayed: ['h8h7'], afterBest: [] } : undefined,
      expanded: false,
      // Deliberately UCI ("c4c5") — proves bestMoveToSan normalizes it. The best
      // move is the quiet c5 push instead of the poisoned grab.
      bestMove: isLast ? 'c4c5' : null,
      bestMoveEval: null,
    });
  }
  return moves;
}

describe('fundamentals record→drill loop — the whole chain fires (no mocks)', () => {
  beforeEach(async () => {
    await db.misconceptionTags.clear();
  });

  it('a poisoned-pawn blunder in a real game becomes a drillable weakness end-to-end', async () => {
    const moves = buildGameMoves();

    // 1) buildBlunders — the tissue I added: history + eval (mover POV) + PV (SAN)
    //    + best move NORMALIZED from UCI.
    const blunders = buildBlunders(moves, 'white');
    expect(blunders.length).toBe(1);
    const b = blunders[0];
    expect(b.playedSan).toBe('Qxh7');
    expect(b.bestSan).toBe('c5');                 // UCI "c4c5" → SAN
    expect(b.historySans?.length).toBe(25);
    expect(b.pvAfterPlayed).toEqual(['Rxh7']);    // UCI "h8h7" → SAN, right FEN
    expect(b.evalBefore).toBe(20);
    expect(b.evalAfterPlayed).toBe(-550);

    // 2) autoAnalyzeBlunders → classify → log into Dexie.
    const res = await autoAnalyzeBlunders(blunders, { learned: true, sourceGameId: 'game-1' });
    expect(res.logged).toBeGreaterThanOrEqual(1);

    // 3) the tag actually landed in the weakness store.
    const rows = await db.misconceptionTags.toArray();
    expect(rows.some((r) => r.tag === 'poisoned-pawn')).toBe(true);

    // 4) it reads back through the unified weakness profile WITH its drill themes.
    const profile = await getUnifiedWeaknessProfile();
    const pp = profile.find((w) => w.tag === 'poisoned-pawn');
    expect(pp, `poisoned-pawn not in profile: ${profile.map((w) => w.tag).join(', ')}`).toBeTruthy();
    expect(pp!.puzzleThemes).toContain('trappedPiece');

    // 5) and it routes to a real puzzle drill (not the /weaknesses dead-end).
    const route = resolveRepRoute({
      kind: 'weakness', key: 'w:poisoned-pawn', label: pp!.label, subtitle: '',
      tag: 'poisoned-pawn', puzzleThemes: pp!.puzzleThemes,
    });
    expect(route.path).toBe('/tactics/adaptive');
    expect((route.state as { forcedWeakThemes?: string[] })?.forcedWeakThemes).toContain('trappedPiece');
  });
});

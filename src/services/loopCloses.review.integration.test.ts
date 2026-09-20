// WO-LOOP-01 — THE WHOLE CHAIN, OFFLINE, REAL CODE, NO MOCKS:
//   game A analysed → generateInsightsForGame (the sweep) → misconceptionTags
//   → getUnifiedWeaknessProfile → buildWeaknessSignals (loadWeaknessSignals)
//   → buildReviewSegments for game B → the recurrence clause in B's narration.
// Written because run 4 of `audit-loop-closes-prod` had A recorded and B
// sharing the fundamental, and the sentence still did not appear. Each hop is
// asserted separately so the broken one is NAMED.
import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { generateInsightsForGame } from './gameAnalysisService';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';
import { getUnifiedWeaknessProfile } from './weaknessSpine';
import { loadWeaknessSignals, invalidateWeaknessSignals } from './weaknessSignalLoader';
import { matchFundamental } from './weaknessSignal';
import type { GameRecord, MoveAnnotation } from '../types';

const SANS = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6', 'Nf3'];

function annotations(): MoveAnnotation[] {
  const c = new Chess();
  return SANS.map((san, i) => {
    c.move(san);
    const black = i % 2 === 1;
    const flagged = i === 11;
    return {
      moveNumber: Math.floor(i / 2) + 1, color: black ? 'black' : 'white', san,
      classification: flagged ? 'mistake' : 'book', evaluation: flagged ? 90 : 0, bestMoveEval: flagged ? -20 : 0,
      bestMove: flagged ? 'e7e6' : null, fen: c.fen(),
    } as unknown as MoveAnnotation;
  });
}

function reviewInputs(): ReviewMoveInput[] {
  const chess = new Chess();
  return SANS.map((san, i) => {
    chess.move(san);
    const isBlack = i % 2 === 1;
    return {
      ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: !isBlack,
      classification: i === 11 ? 'mistake' : 'book',
      preMoveEval: i === 11 ? -20 : 0, evaluation: i === 11 ? 90 : 0,
      bestMove: i === 11 ? 'e7e6' : null,
    } as unknown as ReviewMoveInput;
  });
}

const DAY = 24 * 60 * 60 * 1000;
const gameRec = (id: string, white: string, daysAgo: number): GameRecord => ({
  id, pgn: SANS.join(' '), white, black: 'The Student', result: '1-0',
  date: new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10).replace(/-/g, '.'),
  source: 'chesscom', studentSide: 'black', annotations: annotations(), fullyAnalyzed: true,
} as unknown as GameRecord);

describe('THE LOOP, END TO END — a slip recorded in game A is spoken as recurring in game B', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset?.();
    invalidateWeaknessSignals();
  });

  it('every hop, named', async () => {
    // A: analysed + swept
    const A = gameRec('game-A', 'Rossi, Anna', 17);
    await db.games.add(A);
    const swept = await generateInsightsForGame(A.id, A.source, A.annotations ?? [], { habits: false });
    expect(swept.misconceptionsLogged, 'hop 1: the sweep recorded A').toBeGreaterThan(0);
    const rows = await db.misconceptionTags.where('sourceGameId').equals(A.id).toArray();
    expect(rows.map((r) => r.fundamentalId), 'hop 1b: a fundamental on the row').toContain('same-piece-twice');

    // hop 2: the spine carries the fundamental row WITH provenance
    const profile = await getUnifiedWeaknessProfile();
    const row = profile.find((w) => w.tag === 'fundamental:same-piece-twice');
    expect(row, 'hop 2: spine row fundamental:same-piece-twice').toBeTruthy();
    expect(row?.positions[0]?.from.gameId, 'hop 2b: provenance names game A').toBe(A.id);
    expect(row?.positions[0]?.from.opponentName, 'hop 2c: provenance names the opponent').toBe('Rossi, Anna');

    // hop 3: the signals carry games + the join finds it
    const signals = await loadWeaknessSignals();
    const sig = matchFundamental('same-piece-twice', signals);
    expect(sig, 'hop 3: matchFundamental finds the signal').toBeTruthy();
    expect(sig?.games?.map((g) => g.gameId), 'hop 3b: games on the signal').toEqual([A.id]);

    // hop 4: B's review narration carries the clause
    const B = gameRec('game-B', 'Kowalski, Jan', 1);
    await db.games.add(B);
    const segs = buildReviewSegments(reviewInputs(), 'black', 'Sicilian Defense: Alapin Variation', false, 1400, signals, undefined, B.id);
    const text = segs[11].narration ?? '';
    expect(text, 'hop 4: the recurrence clause in B').toMatch(/keeps recurring in your games — same piece twice, the second game now — the last one was against Rossi, Anna/);
  });
});

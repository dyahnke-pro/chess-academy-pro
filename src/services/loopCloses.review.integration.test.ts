// WO-LOOP-01 — THE WHOLE CHAIN, OFFLINE, REAL CODE, NO MOCKS:
//   game A analysed → generateInsightsForGame (the sweep) → misconceptionTags
//   → getUnifiedWeaknessProfile → buildWeaknessSignals (loadWeaknessSignals)
//   → the join and the decider's boost for game B. Each hop is asserted
// separately so the broken one is NAMED.
//
// The record STEERS what B teaches; it is never recited (David 2026-10-28:
// "Remove the 'last mistake narration' … trim out unnecessary statements").
import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import { generateInsightsForGame } from './gameAnalysisService';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';
import { getUnifiedWeaknessProfile } from './weaknessSpine';
import { loadWeaknessSignals, invalidateWeaknessSignals } from './weaknessSignalLoader';
import { matchFundamental, boostFor } from './weaknessSignal';
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

describe('THE LOOP, END TO END — a slip recorded in game A raises what game B teaches', () => {
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

    // hop 3: the join finds it, and it raises the decider
    const signals = await loadWeaknessSignals();
    const sig = matchFundamental('same-piece-twice', signals);
    expect(sig, 'hop 3: matchFundamental finds the signal').toBeTruthy();
    expect(boostFor(sig!), 'hop 3b: the record raises the decider').toBeGreaterThan(0);

    // hop 4: B's review teaches the fundamental, and never recites the record
    const B = gameRec('game-B', 'Kowalski, Jan', 1);
    await db.games.add(B);
    const segs = buildReviewSegmentsForTests(reviewInputs(), 'black', 'Sicilian Defense: Alapin Variation', false, 1400, signals, undefined, B.id);
    const text = segs[11].narration ?? '';
    expect(text, 'hop 4: B still teaches the move').toMatch(/The move was e6\./);
    expect(text, 'hop 4b: no recall of game A').not.toMatch(/keeps recurring|walked into this before|caught you before|held it|Rossi/i);
  });
});

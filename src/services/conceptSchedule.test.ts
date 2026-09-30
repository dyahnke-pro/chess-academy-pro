import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { conceptSiblingsToPull, mistakeConcept } from './conceptSchedule';
import { gradeMistakePuzzle } from './mistakePuzzleService';
import type { MistakePuzzle } from '../types';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
function card(id: string, over: Partial<MistakePuzzle>): MistakePuzzle {
  return {
    id, fen: FEN, playerMove: 'a2a3', playerMoveSan: 'a3', bestMove: 'f3e5', bestMoveSan: 'Nxe5', moves: 'f3e5',
    cpLoss: 150, classification: 'mistake', gamePhase: 'middlegame', moveNumber: 3, sourceGameId: 'g1', sourceMode: 'coach',
    playerColor: 'white', promptText: '', narration: { intro: '', moveNarrations: [], outro: '', conceptHint: '' },
    createdAt: '2026-09-01', opponentName: null, gameDate: null, openingName: null, evalBefore: null,
    srsInterval: 6, srsEaseFactor: 2.5, srsRepetitions: 2, srsDueDate: '2026-12-01', srsLastReview: null,
    status: 'solved', attempts: 1, successes: 1, tacticType: 'fork', ...over,
  } as MistakePuzzle;
}

describe('concept SRS — a miss retests the IDEA, not only the board', () => {
  it('a fork card carries its concept; a phase-only card carries none', () => {
    expect(mistakeConcept(card('a', {}))).toBe('tactic:fork');
    expect(mistakeConcept(card('b', { tacticType: null, gamePhase: 'middlegame' }))).toBeNull();
  });
  it('pulls open cards of the same concept, never other concepts, mastered or already-due cards', () => {
    const missed = card('m', {});
    const all = [missed, card('s1', {}), card('s2', { status: 'mastered' }), card('s3', { srsDueDate: '2026-01-01' }), card('o', { tacticType: 'pin' })];
    expect(conceptSiblingsToPull(missed, all, '2026-09-30')).toEqual(['s1']);
  });
  it('a phase-only miss pulls nothing (negative control)', () => {
    const missed = card('m', { tacticType: null });
    expect(conceptSiblingsToPull(missed, [missed, card('x', { tacticType: null })], '2026-09-30')).toEqual([]);
  });
});

describe('gradeMistakePuzzle wires the concept pull', () => {
  beforeEach(async () => { await db.mistakePuzzles.clear(); });
  it('a wrong answer brings the concept due today; a right one does not', async () => {
    const future = '2099-01-01';
    await db.mistakePuzzles.bulkPut([card('m', {}), card('s1', { srsDueDate: future }), card('o', { tacticType: 'pin', srsDueDate: future })]);
    const today = new Date().toISOString().split('T')[0];
    await gradeMistakePuzzle('m', 'good', true);
    expect((await db.mistakePuzzles.get('s1'))?.srsDueDate).toBe(future);
    await gradeMistakePuzzle('m', 'again', false);
    expect((await db.mistakePuzzles.get('s1'))?.srsDueDate).toBe(today);
    expect((await db.mistakePuzzles.get('o'))?.srsDueDate).toBe(future);
  });
});

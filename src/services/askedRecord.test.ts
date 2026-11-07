/**
 * The questions the student asks feed the need score across games (David
 * 2026-11-07). Proof: a board question is remembered by the skills the board
 * posed; the window keeps only the last games; the need score reads it — and
 * an ask never lowers anything.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { askedTagsAt, rememberAsked, askedCountsSince, askWindowStart, ASK_WINDOW_GAMES } from './askedRecord';
import { asksAboutTheBoard } from '../coach/chatTurn';
import { computeNeed, coldStudent, COLD_START_GAMES, NEED_THRESHOLD, type StudentNeedContext } from './needScore';
import type { MisconceptionTagId } from '../data/misconceptionTags';

// A knight on d5 forks the king on e8 and the rook on a8 (Nc7+).
const FORK = 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1';

beforeEach(async () => { await db.delete(); await db.open(); });

describe('the record of what was asked', () => {
  it('a board question remembers the skills the board posed', () => {
    expect(askedTagsAt(FORK, [], 'd5c7')).toEqual(['missed-tactic']);
  });

  it('twin: a quiet board poses nothing, so nothing is remembered', () => {
    expect(askedTagsAt('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [], 'e2e4')).toEqual([]);
  });

  it('counts each ask, and only those inside the window', async () => {
    await rememberAsked(['missed-tactic'], 1_000);
    await rememberAsked(['missed-tactic', 'king-stuck-center'], 5_000);
    expect(await askedCountsSince(0)).toEqual(new Map([['missed-tactic', 2], ['king-stuck-center', 1]]));
    expect(await askedCountsSince(2_000)).toEqual(new Map([['missed-tactic', 1], ['king-stuck-center', 1]]));
  });

  it(`the window starts at the student's ${ASK_WINDOW_GAMES}th most recent game`, () => {
    const games = Array.from({ length: ASK_WINDOW_GAMES + 5 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}` }));
    expect(new Date(askWindowStart(games)).toISOString().slice(0, 10)).toBe(`2026-10-06`);
    expect(askWindowStart(games.slice(0, 5))).toBe(0);
  });

  it.each([['plan', true], ['tactics', true], ['opponent-move', true], ['whose-turn', false], ['answer', false], ['stats', false], ['concept', false]] as const)('"%s" is a question about the board: %s', (kind, yes) => {
    expect(asksAboutTheBoard(kind)).toBe(yes);
  });
});

describe('the need score reads it', () => {
  const ctx = (asked: Array<[MisconceptionTagId, number]>): StudentNeedContext => ({ ...coldStudent(1200), gamesPlayed: COLD_START_GAMES, asked: new Map(asked) });
  const ply = { ply: 9, studentMove: true, clauseKind: null, fundamentalId: null, posedTags: ['missed-tactic'] as MisconceptionTagId[] };

  it('one ask about the skill the ply poses is half the bar', () => {
    const v = computeNeed(ply, ctx([['missed-tactic', 1]]));
    expect(v.score).toBe(Math.round(NEED_THRESHOLD / 2));
    expect(v.speak).toBe(false);
    expect(v.reasons.some((r) => r.startsWith('asked: missed-tactic'))).toBe(true);
  });

  it('asked twice or more, the ply speaks on that alone', () => {
    expect(computeNeed(ply, ctx([['missed-tactic', 2]])).speak).toBe(true);
  });

  it('twin: an ask about another skill adds nothing', () => {
    expect(computeNeed(ply, ctx([['king-stuck-center', 3]])).score).toBe(0);
  });

  it('twin: no asks, no term', () => {
    expect(computeNeed(ply, ctx([])).score).toBe(0);
  });
});

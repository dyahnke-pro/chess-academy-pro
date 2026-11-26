import { describe, expect, it, vi } from 'vitest';

vi.mock('./appAuditor', () => ({ logAppAudit: () => Promise.resolve() }));

import { learnGoodDecision, learnMistakeTurn, type LearnMistakeInput, type TurnRead } from './learnMistakeTurn';
import { NEW_GAME_MEMORY, nextGameMemory } from './mistakeLesson';
import type { HoldRecord } from './holdRate';

const RED: HoldRecord = { posed: 10, held: 3, heldWeight: 3, missed: 7, rate: 0.3 };
const read = (evaluation: number, moves: string[]): TurnRead => ({ isMate: false, mateIn: null, evaluation, topLines: [{ evaluation, mate: null, moves }] });

// THE APPROVED REFERENCE (David 2026-11-24): chesscom-1001055178 ply 17, 9.Bxf6.
const BXF6 = 'r2qk2r/ppp1bpp1/2n1pn1p/3p2B1/3P4/1P3PP1/P1P2PBP/RN1Q1RK1 w kq - 0 9';
const yours = (over: Partial<LearnMistakeInput> = {}): LearnMistakeInput => ({
  seat: 'you', fenBefore: BXF6, playedSan: 'Bxf6', moverColor: 'white',
  before: read(30, ['g5c1', 'f6d7', 'c1b2', 'e7f6', 'f3f4', 'e8g8']),
  after: read(-42, ['e7f6', 'c2c3', 'c6e7', 'd1d3', 'e8g8', 'b1d2']),
  costCp: 72, bestSan: 'Bc1', priorMove: null, theirReplySan: null, studentReplySan: null,
  holdOf: () => undefined, memory: NEW_GAME_MEMORY, ply: 17, seatLed: false, ...over,
});

describe('the Learn mistake turn', () => {
  it('your mistake: the approved lesson, from the one error computer', () => {
    const out = learnMistakeTurn(yours());
    expect(out.text).toMatch(/dark-squared bishop/);
    expect(out.text).toMatch(/dark squares/);
    // Learn names none of the student's moves.
    expect(out.text).not.toMatch(/Bxf6|Bc1/);
  });

  it('after their lesson, yours opens on "Your"', () => {
    const out = learnMistakeTurn(yours({ seatLed: true }));
    expect(out.slots.lesson).toMatch(/^(Your|You)\b/);
  });

  // 1.e4 d5 2.exd5 Qxd5 3.Nc3 Bg4?? — the queen on d5 was attacked and stays.
  const BG4 = 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3';
  const theirs = (studentReplySan: string): LearnMistakeInput => ({
    seat: 'them', fenBefore: BG4, playedSan: 'Bg4', moverColor: 'black',
    before: read(-40, ['d5a5', 'd2d4', 'g8f6']),
    after: read(900, ['c3d5', 'b8a6', 'f2f3']),
    costCp: 900, bestSan: 'Qa5', priorMove: null, theirReplySan: null, studentReplySan,
    holdOf: () => RED, memory: NEW_GAME_MEMORY, ply: 6, seatLed: false,
  });
  it('their mistake is said after your reply, naming the piece that took', () => {
    const out = learnMistakeTurn(theirs('Nxd5'));
    expect(out.text).not.toBeNull();
    expect(out.text).toMatch(/queen/);
    expect(out.text).not.toMatch(/Nxd5|Qa5/);
  });

  it('the game memory folds both seats, so the next turn never reuses a stem', () => {
    const t = learnMistakeTurn(theirs('Nxd5'));
    const m = nextGameMemory(NEW_GAME_MEMORY, t, BG4, 'w');
    expect(m.recentStems.length).toBe(t.text ? 1 : 0);
  });

  it('a good decision needs a fan of lines and never speaks while the focus owns the move', () => {
    const one = learnGoodDecision({ fenBefore: BXF6, playedSan: 'Bc1', before: read(30, ['g5c1']), holdOf: () => RED, memory: NEW_GAME_MEMORY, ply: 17, priorMove: null, seatLed: false, focusOwnsMove: false });
    expect(one).toBeNull();
    const focus = learnGoodDecision({ fenBefore: BXF6, playedSan: 'Bc1', before: { ...read(30, ['g5c1']), topLines: [{ evaluation: 30, moves: ['g5c1'] }, { evaluation: -300, moves: ['g5f6'] }] }, holdOf: () => RED, memory: NEW_GAME_MEMORY, ply: 17, priorMove: null, seatLed: false, focusOwnsMove: true });
    expect(focus).toBeNull();
  });
});

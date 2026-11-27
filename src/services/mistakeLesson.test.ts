import { describe, it, expect, vi, beforeEach } from 'vitest';

const logged: Array<{ kind: string; context?: string }> = [];
vi.mock('./appAuditor', () => ({ logAppAudit: (e: { kind: string; context?: string }) => { logged.push(e); return Promise.resolve(); } }));

import { allSlots, composeGoodDecision, composeMistakeLesson, nextGameMemory, NEW_GAME_MEMORY, RECIPES, REPAIRS, POSITIONAL, type MistakeLessonInput } from './mistakeLesson';
import { errorWhy, NO_SECOND_READ } from './inaccuracyCall';
import type { HoldRecord } from './holdRate';

const GREEN: HoldRecord = { posed: 20, held: 20, heldWeight: 20, missed: 0, rate: 1 };
const RED: HoldRecord = { posed: 10, held: 3, heldWeight: 3, missed: 7, rate: 0.3 };

beforeEach(() => { logged.length = 0; });

// THE APPROVED REFERENCE (David 2026-11-24): chesscom-1001055178 ply 17.
const BXF6 = 'r2qk2r/ppp1bpp1/2n1pn1p/3p2B1/3P4/1P3PP1/P1P2PBP/RN1Q1RK1 w kq - 0 9';
const BXF6_REPLY = ['e7f6', 'c2c3', 'c6e7', 'd1d3', 'e8g8', 'b1d2'];
const BXF6_BEST = ['g5c1', 'f6d7', 'c1b2', 'e7f6', 'f3f4', 'e8g8'];
const bxf6Why = () => errorWhy({
  secondReads: NO_SECOND_READ, costCp: 72, fenBefore: BXF6, playedSan: 'Bxf6', moverColor: 'white', bestSan: 'Bc1',
  bestLineUci: BXF6_BEST, replyLineUci: BXF6_REPLY, replySan: 'Bxf6',
  missedMate: null, allowedMate: null, bestMate: null, quality: 'inaccuracy', priorMove: null, namesBetterMove: false,
});
const input = (over: Partial<MistakeLessonInput> = {}): MistakeLessonInput => ({
  ew: bxf6Why(), fenBefore: BXF6, playedSan: 'Bxf6', replyLineUci: BXF6_REPLY, bestSan: 'Bc1',
  seat: 'you', costCp: 72, surface: 'learn', holdOf: () => GREEN, memory: NEW_GAME_MEMORY, ...over,
});

const fillAll = (s: string, f: Record<string, string>): string => s.replace(/\{(\w+)\}/g, (_, k: string) => f[k] ?? `{${k}}`);

describe('the approved reference turn, 9.Bxf6', () => {
  const REFERENCE = [
    'Your dark-squared bishop is gone, so d4 has no guard.',
    'Their bishop on f6 will feel at home now.',
    'Put your pawns on dark squares to help regain control of the dark squares.',
  ];
  it('the table holds the exact approved sentences', () => {
    const f = { colour: 'dark', target: 'd4', opSq: 'f6' };
    expect(RECIPES['colour-conceded'].lesson!.stems.map((s) => fillAll(s, f))).toContain(REFERENCE[0]);
    expect(RECIPES['colour-conceded'].consequence!.stems.map((s) => fillAll(s, f))).toContain(REFERENCE[1]);
    expect(REPAIRS['colour-conceded'].stems.map((s) => fillAll(s, f))).toContain(REFERENCE[2]);
  });
  it('the turn is lesson → consequence → repair, in the approved shape', () => {
    const out = composeMistakeLesson(input());
    expect(out.silentWhy).toBeNull();
    expect(Object.keys(out.slots).sort()).toEqual(['consequence', 'lesson', 'repair']);
    const f = { colour: 'dark', target: 'd4', opSq: 'f6' };
    expect(RECIPES['colour-conceded'].lesson!.stems.map((s) => fillAll(s, f))).toContain(out.slots.lesson);
    expect(RECIPES['colour-conceded'].consequence!.stems.map((s) => fillAll(s, f))).toContain(out.slots.consequence);
    expect(REPAIRS['colour-conceded'].stems.map((s) => fillAll(s, f))).toContain(out.slots.repair);
    expect(out.text).toBe(`${out.slots.lesson} ${out.slots.consequence} ${out.slots.repair}`);
    expect(out.repairState).toBe('colour-conceded');
  });
  it('a red record adds the habit; the reply line never reaches the words', () => {
    const out = composeMistakeLesson(input({ holdOf: () => RED }));
    expect(RECIPES['colour-conceded'].habit!.stems).toContain(out.slots.habit);
    expect(out.text).not.toMatch(/[KQRBN][a-h]?[1-8]?x?[a-h][1-8]/);
  });
  it('the row is written: cause, slots, no FEN and no text', () => {
    composeMistakeLesson(input());
    expect(logged).toHaveLength(1);
    expect(logged[0].kind).toBe('mistake-lesson');
    const row = JSON.parse(logged[0].context!) as Record<string, unknown>;
    expect(row).toMatchObject({ seat: 'you', cost_cp: 72, surface: 'learn', cause: 'colour-conceded', spoken: true, silent_why: null, slots_filled: ['lesson', 'consequence', 'repair'] });
    expect(JSON.stringify(row)).not.toMatch(/\//);
    expect(JSON.stringify(row)).not.toMatch(/bishop/);
  });
});

describe('silence is a computed verdict, and it is logged', () => {
  it('unexplained → silent with silent_why no-cause', () => {
    const ew = { ...bxf6Why(), cause: { kind: 'unexplained' as const, motif: null, tag: null, causedByMove: true, detail: null } };
    const out = composeMistakeLesson(input({ ew }));
    expect(out.text).toBeNull();
    expect(out.silentWhy).toBe('no-cause');
    const row = JSON.parse(logged[0].context!) as Record<string, unknown>;
    expect(row).toMatchObject({ cause: null, spoken: false, silent_why: 'no-cause', slots_filled: [] });
  });
  it('a decided game is silent', () => {
    expect(composeMistakeLesson(input({ evalBeforeCp: 900 })).silentWhy).toBe('decided-game');
  });
  it('their mistake on a green skill is silent', () => {
    expect(composeMistakeLesson(input({ seat: 'them' })).silentWhy).toBe('record-green');
  });
  it('their mistake on a red skill is the mirror: their bishop, your plan', () => {
    const out = composeMistakeLesson(input({ seat: 'them', holdOf: () => RED, replyLineUci: BXF6_REPLY }));
    expect(out.slots.lesson).toMatch(/dark/i);
    expect(out.slots.lesson).not.toMatch(/your dark-squared|d4|f6/i);
    expect(out.repairState).toBe('colour-won');
    expect(out.slots.habit).toBeUndefined();
  });
});

describe('the table gate', () => {
  const SAN = /\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|O-O(?:-O)?)\b/;
  const words = (s: string): number => s.replace(/\{\w+\}/g, 'X').split(/\s+/).filter(Boolean).length;
  const blank = (s: string): string => s.toLowerCase().replace(/\{\w+\}/g, '_').replace(/\b(pawn|knight|bishop|rook|queen|king|[a-h][1-8])\b/g, '_').replace(/[^a-z_ ]/g, '').trim();
  for (const { where, stems } of allSlots()) {
    it(`${where}: 5 phrasings, ≤14 words, no move, none the same`, () => {
      expect(stems.length).toBeGreaterThanOrEqual(5);
      for (const s of stems) {
        expect(words(s), s).toBeLessThanOrEqual(14);
        expect(s, s).not.toMatch(SAN);
        expect(s, s).not.toMatch(/eval|engine|centipawn/i);
      }
      expect(new Set(stems.map(blank)).size).toBe(stems.length);
    });
  }
  it('every cause has a row, every positional row a lesson', () => {
    expect(Object.keys(RECIPES)).toHaveLength(24);
    for (const r of Object.values(POSITIONAL)) expect(r!.lesson.stems.length).toBeGreaterThanOrEqual(5);
  });
  it('their seat never names a square the student can now strike', () => {
    for (const { where, stems, seat } of allSlots()) {
      if (seat !== 'them') continue;
      for (const st of stems) expect(st, where).not.toMatch(/\{(target|sq|opSq|king|pawn|checkSq|file|opPiece)\}/);
    }
  });
  it('a turn never repeats the stems of the turn before', () => {
    const first = composeMistakeLesson(input({ holdOf: () => RED }));
    const second = composeMistakeLesson(input({ holdOf: () => RED, memory: { ...NEW_GAME_MEMORY, lastStems: new Set(first.stems) } }));
    for (const st of second.stems) expect(first.stems).not.toContain(st);
  });
});

describe('the four refinements', () => {
  it('a small mistake on a skill taught this game is the lesson alone', () => {
    const first = composeMistakeLesson(input({ holdOf: () => RED }));
    const mem = nextGameMemory(NEW_GAME_MEMORY, first, BXF6, 'w');
    expect(mem.taught.has('bad-trade')).toBe(true);
    const again = composeMistakeLesson(input({ holdOf: () => RED, memory: mem }));
    expect(Object.keys(again.slots)).toEqual(['lesson']);
  });
  it('the repair is said once per state, while it holds', () => {
    const mem = { ...NEW_GAME_MEMORY, repairs: new Set(['colour-conceded' as const]) };
    const out = composeMistakeLesson(input({ memory: mem }));
    expect(out.text).not.toBeNull();
    expect(out.slots.repair).toBeUndefined();
  });
  it('their reply, once played, is said in words', () => {
    const out = composeMistakeLesson(input({ theirReplySan: 'Bxf6' }));
    expect(out.text).not.toMatch(/Bxf6/);
  });
  it('a good decision speaks only while the skill is red or grey', () => {
    const fen2 = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const out = composeGoodDecision({ fenBefore: fen2, playedSan: 'O-O', lines: [{ evaluation: 30, moves: ['e1g1'] }, { evaluation: -250, moves: ['d2d3'] }], holdOf: () => undefined, memory: NEW_GAME_MEMORY, priorMove: null });
    expect(out?.kind).toBe('only-move');
    expect(out?.text).not.toMatch(/O-O|castl/i);
    expect(composeGoodDecision({ fenBefore: fen2, playedSan: 'O-O', lines: [{ evaluation: 30, moves: ['e1g1'] }, { evaluation: -250, moves: ['d2d3'] }], holdOf: () => GREEN, memory: NEW_GAME_MEMORY, priorMove: null })).toBeNull();
  });
});

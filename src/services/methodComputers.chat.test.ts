// THE CHAT ANSWERS WITH THE METHOD COMPUTERS (S4, David 2026-11-17: every
// computer answers in chat). Each asks `questionThought` — the one door the
// chat's move questions go through — about the real board from Danya's
// speedruns, and the computer's line is in the answer's group.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { questionThought } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import type { AnalysisLine } from '../types';
import type { FactGroup } from './coachFact';
import type { ComposedThought } from './thoughtComposer';

const line = (evaluation: number, moves: string[], rank = 1): AnalysisLine => ({ rank, evaluation, moves, mate: null });
const ask = (fenBefore: string, san: string, cont: string[] | null, groups: FactGroup[], reads: { before: AnalysisLine[]; after: AnalysisLine[] } | null): ComposedThought =>
  questionThought({ register: 'review', namesPlayedMove: true, story: false, theory: false, fenBefore, san, moverIsStudent: true, prev: NO_PREV_CAPTURE, line: cont, theirLast: null, history: [],
    reads: reads ? { ...reads, passBefore: [], passAfter: [] } : null, costCp: null, plainThreatsSeen: false }, new Set(groups), null, null);
const textsOf = (c: ComposedThought): string => [c.spoken, ...c.kept.map((f) => f.text), ...c.held.map((h) => h.fact.text)].join(' | ');

describe('the method computers answer in chat (questionThought)', () => {
  it('pieceCage — 32.e4 takes d5 from the b6 knight (S-ZY3)', () => {
    const c = ask('2k5/p4ppp/NnP1p3/4P3/8/1P2P2P/P4PP1/6K1 w - - 3 32', 'e4', null, ['move'], null);
    expect(c.kept.some((f) => f.computer === 'pieceCage')).toBe(true);
    expect(c.spoken).toMatch(/takes d5 from their knight on b6/);
  });

  it('opensCheck — 13…Ne4 opens the queen\'s diagonal to h4 (aEKSP)', () => {
    const c = ask('rn1q1rk1/pp6/2pbbnpp/3p1p2/3P4/2N1PB2/PPP3PP/R1BQK2R b KQ - 0 13', 'Ne4', ['Bxe4', 'fxe4', 'Rf1', 'Qh4+', 'g3'], ['move'], null);
    expect(c.kept.some((f) => f.computer === 'opensCheck')).toBe(true);
    expect(c.spoken).toMatch(/h4/);
  });

  it('captureOrder — 21.Nxb8+ first, then the rook on d5 (J4WzT)', () => {
    const reads = {
      before: [line(939, ['c6b8', 'd7c8', 'c3d5', 'f6d5', 'b8c6', 'a7a6']), line(829, ['c3d5', 'd7c6', 'd5e7', 'c6d7', 'f1e1', 'b8b5'], 2), line(682, ['c6e7', 'd7e7', 'e3a7', 'b8a8'], 3)],
      after: [line(939, ['d7c8', 'c3d5', 'f6d5', 'b8c6'])],
    };
    const c = ask('1r6/p2kbpp1/2Np1n1p/3r4/8/P1N1B3/1PP2PPP/1R3RK1 w - - 0 21', 'Nxb8+', ['Ke6', 'Nxd5', 'Kxd5', 'Bxa7'], ['notYet'], reads);
    expect(c.kept.some((f) => f.computer === 'captureOrder')).toBe(true);
    expect(textsOf(c)).toMatch(/d5/);
  });

  it('knightSquareTaken — 2…c6 blocks the b8 knight, cost read off the reads (NnQmN)', () => {
    const b = new Chess(); for (const s of ['e4', 'e5', 'd4']) b.move(s);
    const reads = { before: [line(0, ['e5d4', 'g1f3', 'f8b4', 'c1d2'])], after: [line(171, ['d4e5', 'd8a5', 'b1c3', 'a5e5'])] };
    const c = ask(b.fen(), 'c6', ['dxe5', 'Qa5+', 'Nc3'], ['move'], reads);
    expect(textsOf(c)).toMatch(/knight on b8/);
  });
});

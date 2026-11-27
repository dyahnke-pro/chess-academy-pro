// The S4 opening computers reach the one composer (Review, lessons, chat): a
// real fact comes out of `moveThoughtFacts` on a real board (G8.5).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { moveThoughtFacts, questionThought } from './moveThoughtFacts';
import { FACT_GROUP, type FactGroup } from './coachFact';
import { NO_PREV_CAPTURE } from './captureRun';
import { writerFor } from './writerRegister';

const fenOf = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const said = (history: string[], san: string, own: boolean): string[] =>
  moveThoughtFacts({ soundPlies: new Set<number>(), unpricedCredit: 'refused', register: 'review', moveReads: writerFor('review').moveReads, namesPlayedMove: true, plainThreatsSeen: false, story: false, theory: false, tense: 'past', fenBefore: fenOf(history), san, moverIsStudent: own, prev: NO_PREV_CAPTURE, line: null, history, theirLast: null, phrases: null, reads: null, costCp: null })
    .map((f) => `${f.computer}: ${f.text}`);

describe('the opening computers in the composer', () => {
  it('Ytkf3 6.f3 — the castling it took away', () => {
    const h = ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Nxc6', 'Qf6'];
    expect(said(h, 'f3', false).some((t) => t.startsWith('castlingTakenAway:'))).toBe(true);
  });
  it('aEKSPF 8.Be2 — the bishop\'s fifth move', () => {
    const h = ['e3', 'e5', 'Nc3', 'd5', 'd4', 'e4', 'Bb5+', 'c6', 'Be2', 'Bd6', 'Bg4', 'f5', 'Bh5+', 'g6'];
    expect(said(h, 'Be2', false).some((t) => t.startsWith('pieceMovedAgain:'))).toBe(true);
  });
  it('PHAm 13.O-O-O — castling away from the open files', () => {
    const h = ['d4', 'g5', 'Bxg5', 'f6', 'e4', 'h5', 'Be2', 'e5', 'Bxh5+', 'Ke7', 'Be3', 'd6', 'Nc3', 'c6', 'Be2', 'Bh6', 'Bxh6', 'Nxh6', 'Nf3', 'Ng4', 'Qd2', 'Na6', 'h3', 'Nh6'];
    expect(said(h, 'O-O-O', true).some((t) => t.startsWith('castlingWing:'))).toBe(true);
  });
});

// David 2026-11-17: every computer answers in CHAT too — Learn's chat answers
// a move question through `questionThought`, the same composer.
describe('the opening computers answer in chat (questionThought)', () => {
  const ask = (history: string[], san: string, own: boolean, groups: FactGroup[]): string[] => {
    const t = questionThought({ register: 'live', namesPlayedMove: true, plainThreatsSeen: false, story: false, theory: false, fenBefore: fenOf(history), san, moverIsStudent: own, prev: NO_PREV_CAPTURE, line: null, history, theirLast: null, reads: null, costCp: null }, new Set(groups), null, null);
    return [...t.kept].filter((f) => groups.includes(f.group)).map((f) => `${f.computer}: ${f.text}`);
  };
  it('Ytkf3 6.f3 — "why f3?" carries the castling it took away', () => {
    const h = ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Nxc6', 'Qf6'];
    expect(ask(h, 'f3', false, [FACT_GROUP['king-read']]).some((t) => /^castlingTakenAway: .*can't castle short/.test(t))).toBe(true);
  });
  it('aEKSPF 8.Be2 — carries the bishop\'s fifth move', () => {
    const h = ['e3', 'e5', 'Nc3', 'd5', 'd4', 'e4', 'Bb5+', 'c6', 'Be2', 'Bd6', 'Bg4', 'f5', 'Bh5+', 'g6'];
    expect(ask(h, 'Be2', false, [FACT_GROUP.fundamental]).some((t) => /^pieceMovedAgain: .*fifth move/.test(t))).toBe(true);
  });
  it('PHAm 13.O-O-O — carries castling away from the open files', () => {
    const h = ['d4', 'g5', 'Bxg5', 'f6', 'e4', 'h5', 'Be2', 'e5', 'Bxh5+', 'Ke7', 'Be3', 'd6', 'Nc3', 'c6', 'Be2', 'Bh6', 'Bxh6', 'Nxh6', 'Nf3', 'Ng4', 'Qd2', 'Na6', 'h3', 'Nh6'];
    expect(ask(h, 'O-O-O', true, [FACT_GROUP['king-read']]).some((t) => /^castlingWing: .*g- and h-files/.test(t))).toBe(true);
  });
});

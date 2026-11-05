// THE KNOWN MISTAKES AND TRAPS REACH REVIEW (David 2026-11-04: "it needs to be
// in review for sure") — on Naroditsky's own Scotch Gambit game
// (src/test/fixtures/danya-scotch-gambit.json) and on real club slips, with
// the club gem index the app fetches. Before `knownSlip`, Review read no gem:
// every line asserted here was absent.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { knownSlipIndexFromDisk, reviewSegments, type ReplayGame } from '../test/replayGame';
import { knownSlip, knownSlipsAt } from './knownSlips';
import { readBoard } from './boardComputers';
import { extractArrowableSans } from './arrowEngine';
import { Chess } from 'chess.js';

const GAME = JSON.parse(readFileSync('src/test/fixtures/danya-scotch-gambit.json', 'utf8')) as ReplayGame;
const said = (game: ReplayGame): Map<number, string> => {
  const out = new Map<number, string>();
  for (const s of reviewSegments(game, 1500)) out.set(s.ply, s.narration ?? '');
  return out;
};
const fenAfter = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ').filter(Boolean)) c.move(s); return c.fen(); };

describe('Review says the known slip ahead, both seats, on his Scotch Gambit game', () => {
  const walk = said(GAME);
  it('2.Nf3 and 3.d4: the mistake the student (Black) could make next — said on the move that reached the board', () => {
    expect(walk.get(3)).toContain('A known mistake here: 2.9% of club players under 1600 play f6, and after Nxe5 they win a pawn.');
    // Its words rotate on how many the game has said: one formula is never
    // said three times a game.
    expect(walk.get(5)).toContain('f6 is a known mistake on this board: 4.6% of club players under 1600 play it, and after Bc4 they have the better game.');
  });
  it('4…Bc5: the trap set for them — called a trap because it clears the trap bar, its material counted off the line', () => {
    expect(walk.get(8)).toContain('A known trap here: 3.4% of club players under 1600 play Nxd4, and after Bxd4 you win two knights for a bishop and a pawn.');
  });
  it('their slip ahead is the student\'s chance ("you"), the student\'s own is "they"', () => {
    expect(walk.get(10)).toContain('Qd5 is a known mistake on this board: 5.4% of club players under 1600 play it, and after Qe7 you have the better game.');
    expect(walk.get(11)).toContain('Here, 13.8% of club players under 1600 play Kf8 — a known mistake: after Bb3 they have the better game.');
  });
  it('one a move, and a board the index holds no slip for says none', () => {
    for (const [ply, text] of walk) {
      expect((text.match(/club players under 1600/g) ?? []).length).toBeLessThanOrEqual(1);
      if (ply > 12) expect(text).not.toMatch(/club players under 1600/);
    }
  });
});

describe('Review says the slip that was played, as why it was a mistake', () => {
  // The Scholar's-mate board: 3…Nf6?? is the index's most-played trap there.
  const SANS = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'];
  it('the student\'s own slip (Black): a known trap, and the mate — said on the move that played it', () => {
    const walk = said({ sans: SANS, studentSide: 'black', reads: [] });
    expect(walk.get(6)).toContain('Here, 6.6% of club players under 1600 play Nf6 — a known trap: Qxf7# is mate.');
    expect(walk.get(5)).not.toMatch(/club players/);
    // A trap's material is counted off its line: g6?? Qxe5+ wins a rook, a
    // knight and a pawn — never "the queen" for nine points.
    expect(walk.get(3)).toContain('A known trap here: 8.6% of club players under 1600 play g6, and after Qxe5+ they win a rook, a knight and a pawn.');
  });
  it('their slip (the student is White): the same trap, said to the student who punishes it', () => {
    const walk = said({ sans: SANS, studentSide: 'white', reads: [] });
    expect(walk.get(6)).toContain('Here, 6.6% of club players under 1600 play Nf6 — a known trap: Qxf7# is mate.');
    expect(walk.get(3)).toContain('after Qxe5+ you win a rook, a knight and a pawn.');
  });
});

describe('the computer, through the registry', () => {
  const index = knownSlipIndexFromDisk();
  const board = fenAfter('e4 e5 Nf3 Nc6 d4');
  it('reads the index board by board, and is the one fact with its proof', () => {
    const f = readBoard('knownSlip', { fen: board, gems: knownSlipsAt(index, board), played: 'exd4', on: 'reached', student: 'b', verdictPunish: null, saidNext: null, told: 0 });
    expect(f?.kind).toBe('refuted');
    expect(f?.seat).toBe('student');
    expect(f?.computer).toBe('knownSlip');
    expect(f && 'line' in f.proof ? f.proof.line?.sans.slice(0, 2) : null).toEqual(['f6', 'Bc4']);
  });
  it('a slip the next move\'s refuted alternative names is said there, not here', () => {
    expect(knownSlip({ fen: board, gems: knownSlipsAt(index, board), played: 'exd4', on: 'reached', student: 'b', verdictPunish: null, saidNext: 'f6', told: 0 })).toBeNull();
  });
  it('a punishment the verdict already named is not said twice: only the slip is named as a known one', () => {
    const r = knownSlip({ fen: board, gems: knownSlipsAt(index, board), played: 'f6', on: 'played', student: 'b', verdictPunish: 'Bc4', saidNext: null, told: 0 });
    expect(r?.text).toBe('That was a known mistake: 4.6% of club players under 1600 play f6 here.');
  });
  it('the slip is said, never arrowed as a move to play — in every rotation', () => {
    for (const told of [0, 1, 2]) {
      for (const [on, played] of [['reached', 'exd4'], ['played', 'f6']] as const) {
        const r = knownSlip({ fen: board, gems: knownSlipsAt(index, board), played, on, student: 'b', verdictPunish: null, saidNext: null, told });
        expect(r).not.toBeNull();
        expect(extractArrowableSans(r?.text ?? '')).not.toContain('f6');
        expect(extractArrowableSans(r?.text ?? '')).toContain('Bc4');
      }
    }
  });
  it('a known mistake under the trap bar is never called a trap', () => {
    const r = knownSlip({ fen: board, gems: knownSlipsAt(index, board), played: 'f6', on: 'played', student: 'b', verdictPunish: null, saidNext: null, told: 0 });
    expect(r?.text).toMatch(/^That was a known mistake:/);
  });
});

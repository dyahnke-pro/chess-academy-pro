// The club-reply builder's pure half (WO-COURSE-01 D): what a walk reply IS
// against the current course, and what makes it into the app's file.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { taughtBoards, pos } from './course-lines.mjs';
import { classifyReply, assembleOpening, bandShare, lineKey } from './club-replies-lib.mjs';

const fen = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const MAIN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'];
const BISHOP_FIRST = ['e4', 'e5', 'Bc4', 'Nc6'];

describe('classifyReply — a walk reply against the CURRENT course', () => {
  const taught = taughtBoards([MAIN, BISHOP_FIRST]);

  it('a new reply on a taught board is a candidate, with the moves of the first line that reaches it', () => {
    expect(classifyReply(taught, { fen: fen(MAIN.slice(0, 5)), san: 'h6' })).toMatchObject({
      status: 'candidate', san: 'h6', path: MAIN.slice(0, 5), line: 0,
    });
  });

  it('a reply the course now teaches there is dropped as taught', () => {
    expect(classifyReply(taught, { fen: fen(MAIN.slice(0, 5)), san: 'Bc5' }).status).toBe('taught');
  });

  it('a reply whose board no taught line reaches any more is off-course', () => {
    expect(classifyReply(taught, { fen: fen(['d4', 'd5']), san: 'c4' }).status).toBe('off-course');
  });

  it('an illegal reply is illegal', () => {
    expect(classifyReply(taught, { fen: fen(MAIN.slice(0, 5)), san: 'Ra6' }).status).toBe('illegal');
  });

  it('a reply into a taught board is a transposition — the student\'s answer is already a taught line', () => {
    // 1.e4 e5 2.Bc4 Nc6 3.Nf3 is the board the main line reaches by 2.Nf3 Nc6 3.Bc4.
    expect(classifyReply(taught, { fen: fen(BISHOP_FIRST), san: 'Nf3' }).status).toBe('transposes');
  });
});

describe('assembleOpening — what reaches the app', () => {
  const bands = ['0,1000', '1200,1400', '1600,1800'];
  const at = fen(MAIN.slice(0, 5));
  const walkReply = (san: string) => ({ fen: at, san, reach: 15, games: 1000, nodeShare: 15.1, bandReach: { '0,1000': 17.7, '1200,1400': 16.7, '1600,1800': 7.1 } });
  const o = { id: 'italian-game', name: 'Italian Game', spine: [MAIN], variations: [], sublines: [], lines: [MAIN] };
  const taught = taughtBoards(o.lines);
  const k = (san: string): string => lineKey(o.id, pos(at), san);

  it('keeps a built, sound line with its band numbers; says why every other reply was dropped', () => {
    const built = new Map([
      [k('h6'), { cont: ['d4', 'exd4', 'O-O', 'd6', 'Nxd4'], endCp: 66, stop: 'middlegame' }],
      [k('f6'), { cont: ['d4', 'd6'], endCp: -150, stop: 'middlegame' }],
      [k('a6'), { cont: [], endCp: null, stop: 'max-plies' }],
    ]);
    const entry = { replies: [walkReply('h6'), walkReply('f6'), walkReply('a6'), walkReply('d6'), walkReply('Bc5')] };
    const cache = { [pos(at)]: { total: 200, moves: [{ san: 'h6', games: 36 }] } };
    const { file, counts } = assembleOpening(o, entry, taught, built, bands, { '0,1000': cache, '1200,1400': null, '1600,1800': null });
    expect(counts).toEqual({ kept: 1, unsound: 1, 'no-continuation': 1, pending: 1, taught: 1 });
    expect(file?.replies).toEqual([{
      board: pos(at), san: 'h6', cont: ['d4', 'exd4', 'O-O', 'd6', 'Nxd4'], games: 1000, pct: 15.1,
      reach: { '0,1000': 17.7, '1200,1400': 16.7, '1600,1800': 7.1 }, share: { '0,1000': 18 },
      endCp: 66, middlegame: true,
    }]);
  });

  it('judges a gambit like the gambit — a line below a pawn is kept, marked', () => {
    const evans = { ...o, name: 'Evans Gambit' };
    const built = new Map([[k('f6'), { cont: ['d4', 'd6'], endCp: -150, stop: 'middlegame' }]]);
    const { file, counts } = assembleOpening(evans, { replies: [walkReply('f6')] }, taught, built, bands, {});
    expect(counts.kept).toBe(1);
    expect(file?.replies[0]).toMatchObject({ san: 'f6', gambit: true });
  });

  it('without the walk\'s explorer cache, a line keeps the share it shipped with', () => {
    const built = new Map([[k('h6'), { cont: ['d4', 'exd4', 'O-O'], endCp: 66, stop: 'middlegame', share: { '1200,1400': 16.7 } }]]);
    const { file } = assembleOpening(o, { replies: [walkReply('h6')] }, taught, built, bands, {});
    expect(file?.replies[0].share).toEqual({ '1200,1400': 16.7 });
  });

  it('an opening with nothing kept writes no file', () => {
    expect(assembleOpening(o, { replies: [walkReply('Bc5')] }, taught, new Map(), bands, {}).file).toBeNull();
  });
});

describe('bandShare', () => {
  it('reads the reply\'s share at its board from the walk\'s own explorer cache', () => {
    const cache = { B: { total: 400, moves: [{ san: 'h6', games: 71 }] } };
    expect(bandShare(cache, 'B', 'h6')).toBe(17.8);
    expect(bandShare(cache, 'B', 'a6')).toBe(0);
    expect(bandShare(cache, 'X', 'h6')).toBeNull();
    expect(bandShare(null, 'B', 'h6')).toBeNull();
  });
});

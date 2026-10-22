import { describe, expect, it } from 'vitest';
import { Chess, type Color } from 'chess.js';
import { kingCutOff } from '../checks/rookCutOff';
import { SCENARIOS, scenarioPosition } from './index';
import library from './rookCutOff.json';

const COLOURS: readonly Color[] = ['w', 'b'];
const uciOf = (m: { from: string; to: string; promotion?: string }): string => `${m.from}${m.to}${m.promotion ?? ''}`;
const mirrorSq = (s: string): string => `${s[0]}${9 - Number(s[1])}`;
const mirrorUci = (u: string): string => `${mirrorSq(u.slice(0, 2))}${mirrorSq(u.slice(2, 4))}${u.slice(4)}`;
function mirrorFen(fen: string): string {
  const [board, turn] = fen.split(' ');
  const rows = board.split('/').reverse().map((row) => row.replace(/[a-zA-Z]/g, (ch) => (ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase())));
  return `${rows.join('/')} ${turn === 'w' ? 'b' : 'w'} - - 0 1`;
}

/** Every rule a library board must meet, read with chess.js — null when it meets them all. */
function violation(row: { fen: string; wins: string[]; push: string }, student: Color): string | null {
  let b: Chess;
  try { b = new Chess(row.fen); } catch { return 'illegal FEN'; }
  if (b.turn() !== student) return 'not the student to move';
  if (b.isGameOver() || b.inCheck()) return 'over or in check';
  const mine = b.board().flat().filter((c) => c && c.color === student).map((c) => c!.type).sort().join('');
  const theirs = b.board().flat().filter((c) => c && c.color !== student).map((c) => c!.type).sort().join('');
  if (mine !== 'kpr' || theirs !== 'kr') return `material ${mine} vs ${theirs}`;
  const moves = b.moves({ verbose: true });
  if (moves.some((m) => m.captured)) return 'a capture is on';
  if (kingCutOff(b, student)) return 'already cut off';
  if (row.wins.length < 1 || row.wins.length > 3) return `${row.wins.length} wins`;
  const legal = new Set(moves.map(uciOf));
  for (const u of row.wins) {
    if (!legal.has(u)) return `win ${u} illegal`;
    const a = new Chess(row.fen);
    const m = a.move({ from: u.slice(0, 2), to: u.slice(2, 4) });
    if (m.piece !== 'r' || !kingCutOff(a, student)) return `win ${u} is no rook cut`;
  }
  // The miss phrase ("cut their king off first") is true of every other move.
  for (const m of moves) {
    if (row.wins.includes(uciOf(m))) continue;
    const a = new Chess(row.fen); a.move(m);
    if (kingCutOff(a, student)) return `non-winning ${m.san} cuts the king off`;
  }
  const push = moves.find((m) => uciOf(m) === row.push);
  if (!push || push.piece !== 'p' || Math.abs(Number(push.to[1]) - Number(push.from[1])) !== 1) return 'the push is not a one-step pawn move';
  if (row.wins.includes(row.push)) return 'the push wins';
  return null;
}

describe('the rook cut-off scenario library', () => {
  it('holds at least 20 boards per colour, distinct', () => {
    for (const colour of COLOURS) {
      expect(library[colour].length).toBeGreaterThanOrEqual(20);
      expect(new Set(library[colour].map((r) => r.fen)).size).toBe(library[colour].length);
    }
  });

  it('every board meets the rule (chess.js)', () => {
    for (const colour of COLOURS) for (const row of library[colour]) expect(violation(row, colour), row.fen).toBeNull();
  });

  it('every board carries its Stockfish proof: the cut clearly wins, the push reads level', () => {
    for (const colour of COLOURS) for (const row of library[colour]) {
      expect(row.sf.cut, row.fen).toBeGreaterThanOrEqual(200);
      expect(row.sf.push, row.fen).toBeLessThanOrEqual(50);
    }
  });

  it('the Black board is the White one mirrored, with the same verdict', () => {
    expect(library.b.length).toBe(library.w.length);
    library.w.forEach((w, i) => {
      expect(library.b[i].fen).toBe(mirrorFen(w.fen));
      expect([...library.b[i].wins].sort()).toEqual(w.wins.map(mirrorUci).sort());
      expect(library.b[i].push).toBe(mirrorUci(w.push));
    });
  });

  it('the provider returns a library board for the student\'s colour, the student to move, deterministically', () => {
    for (const colour of COLOURS) {
      expect(SCENARIOS['rook-cut-off'].size(colour)).toBe(library[colour].length);
      const seen = new Set<string>();
      for (let seed = -100; seed < 100; seed++) {
        const fen = scenarioPosition('rook-cut-off', colour, seed) as string;
        expect(new Chess(fen).turn()).toBe(colour);
        seen.add(fen);
      }
      expect(seen.size).toBe(Math.min(200, library[colour].length));
      expect(scenarioPosition('rook-cut-off', colour, 7)).toBe(scenarioPosition('rook-cut-off', colour, 7));
    }
  });

  it('the rule rejects bad boards (negative control)', () => {
    const w = library.w[0];
    expect(violation({ ...w, wins: [w.push] }, 'w')).toMatch(/no rook cut|push wins/);
    expect(violation(w, 'b')).toMatch(/student to move/);
    expect(violation({ ...w, fen: '4k3/8/8/8/8/8/4P3/4K2R w - - 0 1' }, 'w')).toMatch(/material/);
  });
});

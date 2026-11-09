import { describe, it, expect } from 'vitest';
import { introWithGerund, introWithPredicate } from './moveIntro';
import { introHead } from '../test/introPattern';

describe('moveIntro — the move named, the words around it rotated (David 2026-11-09)', () => {
  const moves = ['Nf3', 'e4', 'Bc4', 'd5', 'Nbd2', 'a6', 'Re1', 'Qe2', 'h3', 'c5', 'Bb5+', 'g6'];
  it('a game does not hear one stem on every move: all three forms come up', () => {
    const heads = moves.map((san) => introWithPredicate('student', san, 'develops into the game').split(san === 'Nbd2' ? 'b-knight' : san)[0]);
    const kinds = new Set(moves.map((san) => {
      const t = introWithPredicate('student', san, 'develops into the game');
      return t.startsWith('You play') ? 'play' : t.startsWith('You go') ? 'go' : 'own';
    }));
    expect(kinds, heads.join(' | ')).toEqual(new Set(['play', 'go', 'own']));
  });
  it('rotated, never rolled: the same move and idea say the same words every time', () => {
    for (const san of moves) expect(introWithPredicate('opponent', san, 'grabs space')).toBe(introWithPredicate('opponent', san, 'grabs space'));
  });
  it('every form names the move, from the right seat', () => {
    for (const san of moves) {
      expect(introWithPredicate('student', san, 'grabs space')).toMatch(new RegExp(`^${introHead('student', san)}grabs space$`));
      expect(introWithPredicate('opponent', san, 'grabs space')).toMatch(new RegExp(`^${introHead('opponent', san)}grabs space$`));
    }
  });
  it('a piece move is said as the piece going there, never "your knight to f3 develops"', () => {
    const owned = moves.map((san) => introWithPredicate('opponent', san, 'develops into the game')).filter((t) => t.startsWith('Their'));
    expect(owned.length).toBeGreaterThan(0);
    for (const t of owned) expect(t).toMatch(/^Their (?:(?:[a-h]-)?(?:knight|bishop|rook|queen|king) goes to [a-h][1-8](?: with check)? and|[a-h][1-8]\S* )/);
  });
  it('a capture is never the subject of its own verb ("your Nxe5 takes back")', () => {
    for (const san of ['Nxe5', 'exd5', 'Bxf7+', 'Qxd4']) {
      expect(introWithPredicate('student', san, 'takes back on e5')).toMatch(/^You (?:play|go) /);
    }
  });
  it('a castle is done, not played, and never "castle … castles"', () => {
    expect(introWithPredicate('opponent', 'O-O', 'castles their king into safety and swings the rook toward the center'))
      .toBe('They castle kingside — it tucks their king into safety and swings the rook toward the center');
    expect(introWithPredicate('student', 'O-O-O', 'brings the rook to d1')).toBe('You castle queenside — it brings the rook to d1');
    expect(introWithGerund('student', 'O-O', 'getting the king safe')).toBe('You castle kingside, getting the king safe');
  });
  it('a rotated form never makes a long sentence (the voice counter\'s 32 words): "Your king goes to h7 and adds one guard…" was 33', () => {
    // 27 words: the dash form fits (32); "Your knight goes to f3 and …" would not.
    const long = 'adds one guard to your pawn on g6, which their pawn on f5 attacks, and gets your king out of the check from their queen';
    for (const san of moves) expect(introWithPredicate('student', san, long).split(/\s+/).length, san).toBeLessThanOrEqual(32);
  });
  it('"goes to g3" is never the third square in its sentence (humanSquares gate)', () => {
    const squares = (t: string): number => new Set(t.match(/\b[a-h][1-8]\b/g) ?? []).size;
    for (const san of ['Qg3', 'Nf3', 'Bc4', 'Re1', 'Bb5+']) {
      const t = introWithPredicate('student', san, 'stops their pawn coming to f6, where it would hit your bishop on g5');
      expect(squares(t), t).toBeLessThanOrEqual(2);
    }
  });
  it('never two which-clauses in a row ("You go e4, which prepares e5, which would kick…")', () => {
    for (const san of moves) {
      const t = introWithPredicate('student', san, 'prepares e5, which would kick their knight on f6');
      expect(t.match(/\bwhich\b/g)?.length ?? 0, t).toBeLessThanOrEqual(1);
    }
  });
  it('one sentence never holds two dashes', () => {
    for (const san of moves) {
      const t = introWithPredicate('student', san, 'wins a knight — if Bxc3, Qxc3+');
      expect(t.split(' — ').length, t).toBeLessThanOrEqual(2);
    }
  });
});

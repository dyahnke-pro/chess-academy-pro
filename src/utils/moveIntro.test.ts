import { describe, it, expect } from 'vitest';
import { introWithGerund, introWithPredicate } from './moveIntro';
import { introHead } from '../test/introPattern';

describe('moveIntro — the move named, the words around it rotated (David 2026-11-09)', () => {
  const moves = ['Nf3', 'e4', 'Bc4', 'd5', 'Nbd2', 'a6', 'Re1', 'Qe2', 'h3', 'c5', 'Bb5+', 'g6'];
  it('a game does not hear one stem on every move: every form comes up', () => {
    const kinds = new Set(moves.map((san) => {
      const t = introWithPredicate('student', san, 'develops into the game', 'now');
      return t.startsWith('You play') ? 'play' : t.startsWith('You go') ? 'go' : 'own';
    }));
    expect(kinds).toEqual(new Set(['play', 'go', 'own']));
  });
  it('rotated, never rolled: the same move and idea say the same words every time', () => {
    for (const san of moves) expect(introWithPredicate('opponent', san, 'grabs space', 'now')).toBe(introWithPredicate('opponent', san, 'grabs space', 'now'));
  });
  it('every form names the move, from the right seat', () => {
    for (const san of moves) {
      expect(introWithPredicate('student', san, 'grabs space', 'now')).toMatch(new RegExp(`^${introHead('student', san)}grabs space$`));
      expect(introWithPredicate('opponent', san, 'grabs space', 'now')).toMatch(new RegExp(`^${introHead('opponent', san)}grabs space$`));
    }
  });
  it('a piece move keeps its name — never "your knight goes to f3 and …", which repeated the square-choice fact ("Their bishop went to c4")', () => {
    for (const san of moves.filter((m) => /^[NBRQK]/.test(m))) {
      expect(introWithPredicate('opponent', san, 'develops into the game', 'now')).toMatch(/^They (?:play|go) /);
    }
    const owned = moves.map((san) => introWithPredicate('opponent', san, 'develops into the game', 'now')).filter((t) => t.startsWith('Their'));
    expect(owned.length).toBeGreaterThan(0);
    for (const t of owned) expect(t).toMatch(/^Their [a-h][1-8]\S* /);
  });
  it('a capture is never the subject of its own verb ("your Nxe5 takes back")', () => {
    for (const san of ['Nxe5', 'exd5', 'Bxf7+', 'Qxd4']) {
      expect(introWithPredicate('student', san, 'takes back on e5', 'now')).toMatch(/^You (?:play|go) /);
    }
  });
  it('a castle is done, not played, and never "castle … castles"', () => {
    expect(introWithPredicate('opponent', 'O-O', 'castles their king into safety and swings the rook toward the center', 'now'))
      .toBe('They castle kingside — it tucks their king into safety and swings the rook toward the center');
    expect(introWithPredicate('student', 'O-O-O', 'brings the rook to d1', 'now')).toBe('You castle queenside — it brings the rook to d1');
    expect(introWithGerund('student', 'O-O', 'getting the king safe', 'now')).toBe('You castle kingside, getting the king safe');
  });
  it('a rotated form never makes a long sentence (the voice counter\'s 32 words)', () => {
    // 27 words: the dash form fits (32).
    const long = 'adds one guard to your pawn on g6, which their pawn on f5 attacks, and gets your king out of the check from their queen';
    for (const san of moves) expect(introWithPredicate('student', san, long, 'now').split(/\s+/).length, san).toBeLessThanOrEqual(32);
  });
  it('the head never adds a square to its sentence (humanSquares gate: "Your queen goes to g3 and stops … f6 … g5" was a list)', () => {
    const squares = (t: string): number => new Set(t.match(/\b[a-h][1-8]\b/g) ?? []).size;
    for (const san of ['Qg3', 'Nf3', 'Bc4', 'Re1', 'Bb5+']) {
      const t = introWithPredicate('student', san, 'stops their pawn coming to f6, where it would hit your bishop on g5', 'now');
      expect(squares(t), t).toBeLessThanOrEqual(2);
    }
  });
  it('never two which-clauses in a row ("You go e4, which prepares e5, which would kick…")', () => {
    for (const san of moves) {
      const t = introWithPredicate('student', san, 'prepares e5, which would kick their knight on f6', 'now');
      expect(t.match(/\bwhich\b/g)?.length ?? 0, t).toBeLessThanOrEqual(1);
    }
  });
  it('Review says a move already played in the past, built where the intro is made — never re-read off the finished sentence (prod Review 2026-11-09: "You played e4 — it and d5 pawns leave …")', () => {
    for (const san of moves) {
      for (const seat of ['student', 'opponent'] as const) {
        const who = seat === 'student' ? 'You' : 'They';
        const t = introWithPredicate(seat, san, 'grabs space', 'past');
        expect(t, t).toMatch(new RegExp(`^${who} (?:played \\S+(?: — it|: it|\\. It)|went for \\S+, which) grabs space$`));
        expect(introWithGerund(seat, san, 'grabbing space', 'past'), san).toMatch(new RegExp(`^${who} (?:played|went for) \\S+, grabbing space$`));
      }
    }
    // The pawn's own form has no past: its slot says the played form, so the
    // rotation picks the same slot in both tenses.
    for (const san of moves) {
      const now = introWithPredicate('student', san, 'grabs space', 'now');
      const past = introWithPredicate('student', san, 'grabs space', 'past');
      if (now.startsWith('You go')) expect(past).toMatch(/^You went for /);
      else expect(past).toMatch(/^You played /);
    }
    expect(introWithPredicate('opponent', 'O-O', 'castles their king into safety', 'past')).toBe('They castled kingside — it tucks their king into safety');
    expect(introWithGerund('student', 'O-O-O', 'bringing the rook to d1', 'past')).toBe('You castled queenside, bringing the rook to d1');
  });
  it('one sentence never holds two dashes', () => {
    for (const san of moves) {
      const t = introWithPredicate('student', san, 'wins a knight — if Bxc3, Qxc3+', 'now');
      expect(t.split(' — ').length, t).toBeLessThanOrEqual(2);
    }
  });
});

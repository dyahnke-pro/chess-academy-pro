import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { dnaMoveClause, narrateDnaLine } from './dnaLineNarrator';

/** Position where Black's knight on d4 hangs — White's Qxd4 wins it clean. */
const HANGING_KNIGHT = '4k3/8/8/8/3n4/8/8/3QK3 w - - 0 1';

describe('dnaMoveClause', () => {
  it('NAMES the piece a winning capture wins — never a bare "wins material"', () => {
    const { text } = dnaMoveClause(HANGING_KNIGHT, 'Qxd4');
    expect(text).toMatch(/winning the knight/);
    // David 2026-09-07: the flat, repeated "wins material" is the disease.
    expect(text).not.toMatch(/wins material/);
  });

  it('an EVEN trade / recapture never reads as winning material', () => {
    // 1.e4 d5 2.exd5 — Black's queen defends d5, so exd5 is an even pawn trade.
    const c = new Chess();
    c.move('e4'); c.move('d5');
    const { text } = dnaMoveClause(c.fen(), 'exd5');
    expect(text).not.toMatch(/wins material/);
    expect(text).not.toMatch(/winning the/);
  });

  it('names checkmate and stops there', () => {
    // Fool\'s mate: 1.f3 e5 2.g4 Qh4#.
    const c = new Chess();
    c.move('f3'); c.move('e5'); c.move('g4');
    const { text } = dnaMoveClause(c.fen(), 'Qh4#');
    expect(text).toMatch(/checkmate/i);
  });

  it('gives a quiet developing move its board-true concept (not a bare SAN)', () => {
    const { text } = dnaMoveClause(new Chess().fen(), 'Nf3');
    expect(text).toContain('Nf3');
    expect(text).toMatch(/bears down|center/i);
    expect(text).not.toMatch(/wins material/);
  });

  it('never throws on an empty / invalid FEN — falls back to the SAN', () => {
    expect(dnaMoveClause('', 'Nf3').text).toBe('Nf3');
    expect(dnaMoveClause('not a fen', 'Bb5').text).toBe('Bb5');
  });
});

describe('narrateDnaLine', () => {
  it('weaves the moves with connectors and NO robotic parentheticals', () => {
    const c = new Chess();
    const p0 = c.fen(); c.move('e4');
    const p1 = c.fen(); c.move('e5');
    const p2 = c.fen(); c.move('Nf3');
    const line = narrateDnaLine([
      { fenBefore: p0, san: 'e4' },
      { fenBefore: p1, san: 'e5' },
      { fenBefore: p2, san: 'Nf3' },
    ]);
    expect(line).toContain('e4');
    expect(line).toContain('Nf3');
    // The old template read "Nf3 (…), then …" — no parentheses in the DNA form.
    expect(line).not.toContain('(');
    expect(line).toMatch(/then/); // an occasional beat, not "then" between every move
  });

  it('empty line → empty string; falls back gracefully on raw PVs', () => {
    expect(narrateDnaLine([])).toBe('');
    // A caller holding only SANs (empty fens) still gets the moves named.
    const line = narrateDnaLine([
      { fenBefore: '', san: 'Nf3' },
      { fenBefore: '', san: 'Nc6' },
    ]);
    expect(line).toContain('Nf3');
    expect(line).toContain('Nc6');
  });

  it('winning captures down a line name each piece, no "wins material" spam', () => {
    const line = narrateDnaLine([{ fenBefore: HANGING_KNIGHT, san: 'Qxd4' }]);
    expect(line).toMatch(/winning the knight/);
    expect(line).not.toMatch(/wins material/);
  });
});

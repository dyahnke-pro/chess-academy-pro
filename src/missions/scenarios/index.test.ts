import { describe, expect, it } from 'vitest';
import { Chess, type Color } from 'chess.js';
import { legalSeeGainFor } from '../../services/positionReadingService';
import { SCENARIOS, SCENARIO_TRANSITION_LABEL, scenarioPosition, seedIndex } from './index';
import kqVsK from './kqVsK.json';

const COLOURS: readonly Color[] = ['w', 'b'];

/** Every rule a K+Q vs K scenario board must meet, read off the board with
 *  chess.js alone — null when it meets them all. */
function kqkViolation(fen: string, student: Color): string | null {
  const key = `${student}|${fen}`;
  if (!VERDICTS.has(key)) VERDICTS.set(key, readViolation(fen, student));
  return VERDICTS.get(key) as string | null;
}
const VERDICTS = new Map<string, string | null>();

function readViolation(fen: string, student: Color): string | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return 'illegal FEN'; }
  const coach: Color = student === 'w' ? 'b' : 'w';
  if (b.turn() !== student) return 'not the student to move';
  if (b.isGameOver()) return 'over';
  if (b.isStalemate()) return 'stalemate';
  const pieces = b.board().flat().filter((c) => c !== null);
  const mine = pieces.filter((p) => p.color === student).map((p) => p.type).sort().join('');
  const theirs = pieces.filter((p) => p.color === coach).map((p) => p.type).join('');
  if (mine !== 'kq' || theirs !== 'k') return `material ${mine} vs ${theirs}`;
  const king = pieces.find((p) => p.color === coach && p.type === 'k');
  const queen = pieces.find((p) => p.color === student && p.type === 'q');
  if (!king || !queen) return 'pieces missing';
  if (b.isAttacked(king.square, student)) return 'their king in check';
  const file = king.square.charCodeAt(0) - 97;
  const rank = Number(king.square[1]);
  if (file < 2 || file > 5 || rank < 3 || rank > 6) return `their king off the centre (${king.square})`;
  if (legalSeeGainFor(fen, queen.square, coach) > 0) return 'the queen hangs';
  for (const m of b.moves()) {
    b.move(m);
    const mates = b.isCheckmate();
    b.undo();
    if (mates) return `mate in one (${m})`;
  }
  return null;
}

describe('the board rule itself (negative control — it must reject bad boards)', () => {
  it.each([
    ['7k/5K2/6Q1/8/8/8/8/8 w - - 0 1', 'w', /centre/], // a corner king, mate in one
    ['8/8/8/3k4/8/8/8/3QK3 w - - 0 1', 'w', /in check/],
    ['8/8/8/3k4/8/8/8/2Q1K3 b - - 0 1', 'w', /student to move/],
    ['8/8/8/3k4/8/8/P7/2Q1K3 w - - 0 1', 'w', /material/],
    ['8/8/8/3k4/8/8/8/2Q1K3 w - - 0 1', 'b', /student to move/],
  ] as const)('%s for %s', (fen, colour, why) => {
    expect(kqkViolation(fen, colour)).toMatch(why);
  });

  it('accepts a good board', () => {
    expect(kqkViolation('8/8/8/3k4/8/8/8/2Q1K3 w - - 0 1', 'w')).toBeNull();
  });
});

describe('the K+Q vs K scenario library', () => {
  it('holds at least 150 distinct boards per colour, each with a recorded mate distance of 8–14', () => {
    // The builder's target is 200 a colour; 150 is the floor below which the
    // library is broken, not merely short.
    for (const colour of COLOURS) {
      const rows = kqVsK[colour];
      expect(rows.length).toBeGreaterThanOrEqual(150);
      expect(new Set(rows.map((r) => r.fen)).size).toBe(rows.length);
      for (const r of rows) {
        expect(r.dtm).toBeGreaterThanOrEqual(8);
        expect(r.dtm).toBeLessThanOrEqual(14);
      }
    }
  });

  it('every board in the library meets the rule', () => {
    for (const colour of COLOURS) {
      for (const { fen } of kqVsK[colour]) expect(kqkViolation(fen, colour), fen).toBeNull();
    }
    // Every board × every legal move through chess.js: ~1.5 s on a quiet
    // machine, far more under load — a real sweep, not a hang.
  }, 60_000);

  it('PROPERTY: over 1,000 seeds `scenarioPosition` never returns an illegal, stalemate or mate-in-one board', () => {
    for (const colour of COLOURS) {
      const seen = new Set<string>();
      for (let seed = -500; seed < 500; seed++) {
        const fen = scenarioPosition('kq-vs-k', colour, seed);
        expect(fen).not.toBeNull();
        expect(kqkViolation(fen as string, colour), `seed ${seed}: ${fen}`).toBeNull();
        seen.add(fen as string);
      }
      // 1,000 seeds reach every board of the colour.
      expect(seen.size).toBe(kqVsK[colour].length);
    }
  }, 60_000);

  it('the same seed gives the same board; any number is a seed', () => {
    expect(scenarioPosition('kq-vs-k', 'w', 42)).toBe(scenarioPosition('kq-vs-k', 'w', 42));
    expect(scenarioPosition('kq-vs-k', 'w', 2 ** 40 + 3)).not.toBeNull();
    expect(scenarioPosition('kq-vs-k', 'b', Number.NaN)).toBe(kqVsK.b[0].fen);
    expect(seedIndex(-1, 10)).toBe(9);
    expect(seedIndex(3.9, 10)).toBe(3);
    expect(seedIndex(Number.POSITIVE_INFINITY, 10)).toBe(0);
    expect(seedIndex(5, 0)).toBe(-1);
  });

  it('a board never comes back for the wrong colour', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(new Chess(scenarioPosition('kq-vs-k', 'w', seed) as string).turn()).toBe('w');
      expect(new Chess(scenarioPosition('kq-vs-k', 'b', seed) as string).turn()).toBe('b');
    }
  });

  it('every scenario id has a provider, and the UI has its label', () => {
    expect(SCENARIOS['kq-vs-k'].size('w')).toBe(kqVsK.w.length);
    expect(SCENARIOS['kq-vs-k'].size('b')).toBe(kqVsK.b.length);
    expect(SCENARIO_TRANSITION_LABEL).toBe('Endgame scene');
  });
});

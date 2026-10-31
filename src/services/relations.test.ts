/**
 * The relation snapshot (WO-STORY-MATRIX-01 P1-7, 2026-10-30): one read of a
 * board's relations, the diff of two boards, and a line read move by move as
 * the diffs of its own boards.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { diff, relationKey, snapshot, RELATION_RENDER, type Relation, type RelationDiff } from './relations';

const keys = (rs: readonly Relation[]): string[] => rs.map(relationKey);

/** A line's boards, then each move's diff and the whole line's diff. */
function diffLine(fen: string, sans: readonly string[]): { steps: RelationDiff[]; whole: RelationDiff } {
  const c = new Chess(fen);
  const snaps = [snapshot(fen)!];
  for (const san of sans) {
    c.move(san);
    snaps.push(snapshot(c.fen())!);
  }
  const steps = snaps.slice(1).map((s, i) => diff(snaps[i], s));
  return { steps, whole: diff(snaps[0], snaps[snaps.length - 1]) };
}

describe('the deflection no tactic detector names (Gotham–Jelena, 13.Bxf7+)', () => {
  // The queen on d8 has one guard, the king. Bxf7+ drags the king to f7, and
  // Qxd8 collects the queen. `detectTactics` finds no tactic on the start board
  // and `computeBoardDelta('Bxf7+')` says nothing; the relations say all of it.
  const FEN = 'rnQqkbnr/p4pp1/2b4p/2p1P3/2B3PP/2N5/PP3P2/R1B1K1NR w KQkq - 3 13';
  const line = diffLine(FEN, ['Bxf7+', 'Kxf7', 'Qxd8']);

  it('the king is the queen\'s only guard on the start board', () => {
    const start = snapshot(FEN);
    const guards = start?.relations.filter((r) => (r.kind === 'guard' || r.kind === 'guard-pinned') && r.square === 'd8');
    expect(keys(guards ?? [])).toEqual(['guard:d8(bq)<e8(bk)']);
  });

  it('Kxf7 loses that guard and leaves the queen loose', () => {
    const kxf7 = line.steps[1];
    expect(keys(kxf7.lost)).toContain('guard:d8(bq)<e8(bk)');
    expect(keys(kxf7.gained)).toContain('loose:d8(bq)');
    expect(keys(kxf7.gained)).toContain('hanging:d8(bq)');
  });

  it('Qxd8 moves material from −1 to +8', () => {
    const qxd8 = line.steps[2];
    expect(keys(qxd8.lost)).toContain('material:-1');
    expect(keys(qxd8.gained)).toContain('material:8');
  });

  it('the whole line loses the guard and the queen with it', () => {
    expect(keys(line.whole.lost)).toEqual(expect.arrayContaining(['guard:d8(bq)<e8(bk)', 'material:1']));
    expect(keys(line.whole.gained)).toContain('material:8');
    // A capture on d8 replaced Black's queen with White's: the key names the
    // piece, so the relation on the square does not survive the swap.
    expect(keys(line.whole.lost).some((k) => k.startsWith('attack:d8(bq)'))).toBe(true);
  });
});

describe('a pinned guard is marked, never counted as a guard', () => {
  it('legal pin: the bishop pinned to its king cannot recapture off the pin line', () => {
    // 3.Bb5+ Bd7 … Nc8: the bishop on d7 sits between the king on e8 and White's
    // bishop on b5; it covers c8 only geometrically.
    const s = snapshot('rnn1kb1r/pppb1ppp/3p1q2/1B2p3/4P1Q1/PPN4P/2PP1PP1/R1B1K1NR b KQkq - 0 7');
    const c8 = s?.relations.filter((r) => (r.kind === 'guard' || r.kind === 'guard-pinned') && r.square === 'c8') ?? [];
    expect(keys(c8)).toEqual(['guard-pinned:c8(bn)<d7(bb)']);
  });

  it('an unpinned guard is a guard', () => {
    // The same board: the queen on d8 guards the d6 pawn, nothing pins it.
    const s = snapshot('rnn1kb1r/pppb1ppp/3p1q2/1B2p3/4P1Q1/PPN4P/2PP1PP1/R1B1K1NR b KQkq - 0 7');
    const d6 = s?.relations.filter((r) => (r.kind === 'guard' || r.kind === 'guard-pinned') && r.square === 'd6' && r.by === 'f6') ?? [];
    expect(keys(d6)).toEqual(['guard:d6(bp)<f6(bq)']);
  });

  it('a pin that bites prices the recapture off its line: guard-pinned', () => {
    // White's bishop on g5 pins the knight on f6 to the queen on d8; the knight
    // covers the pawn on d5 only by leaving the line and dropping the queen.
    const s = snapshot('r2qkb1r/ppp2ppp/2n2n2/3p2B1/3P4/2N5/PPP2PPP/R2QKBNR b KQkq - 0 6');
    const d5 = s?.relations.filter((r) => (r.kind === 'guard' || r.kind === 'guard-pinned') && r.square === 'd5' && r.by === 'f6') ?? [];
    expect(keys(d5)).toEqual(['guard-pinned:d5(bp)<f6(bn)']);
  });
});

describe('snapshot — keys, memo, diff', () => {
  it('every kind has a key, and the keys of one board are unique', () => {
    const s = snapshot('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4');
    expect(s).not.toBeNull();
    expect(s!.byKey.size).toBe(s!.relations.length);
    expect(Object.keys(RELATION_RENDER).sort()).toEqual([
      'attack', 'castling', 'check', 'cover', 'file', 'guard', 'guard-pinned', 'hanging',
      'loose', 'material', 'passer', 'pin', 'reach', 'uncovered', 'zone',
    ]);
  });

  it('is memoised by FEN, and a board diffed with itself changes nothing', () => {
    const fen = new Chess().fen();
    expect(snapshot(fen)).toBe(snapshot(fen));
    const d = diff(snapshot(fen)!, snapshot(fen)!);
    expect(d).toEqual({ gained: [], lost: [] });
  });

  it('a board chess.js will not load has no snapshot', () => {
    expect(snapshot('not a fen')).toBeNull();
  });

  it('a pawn move that gives up squares by the king leaves them uncovered', () => {
    const before = new Chess('r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7');
    const fen0 = before.fen();
    before.move('g3');
    const d = diff(snapshot(fen0)!, snapshot(before.fen())!);
    expect(keys(d.gained)).toEqual(expect.arrayContaining(['uncovered:w:h3']));
  });
});

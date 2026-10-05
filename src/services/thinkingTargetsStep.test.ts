import { describe, it, expect } from 'vitest';
import { Chess, type Color, type Square } from 'chess.js';
import { targetsKey, targetReason, targetsShowLine, targetsWrongTapLine, targetsPrompt, type LooseSquares } from './thinkingTargetsStep';

// Test stand-in for the one loose computer: undefended, non-king.
const loose: LooseSquares = (fen: string, color: Color) => {
  const c = new Chess(fen);
  const out: Square[] = [];
  for (const row of c.board()) for (const cell of row) {
    if (!cell || cell.color !== color || cell.type === 'k') continue;
    if (c.attackers(cell.square, color).length === 0) out.push(cell.square);
  }
  return out;
};

const LOOSE_KNIGHT = '4k3/8/2n5/8/8/8/8/4K3 w - - 0 1';
const LOOSE_PAWN = '4k3/7p/2n5/8/8/8/8/4K3 w - - 0 1';
const QUEEN_LOSES_EXCHANGE = '4k3/8/4p3/3q4/8/2N5/8/4K3 w - - 0 1';
const ALL_GUARDED = '4k3/3p4/2n5/8/8/8/8/4K3 w - - 0 1';

describe('step 5 — their targets: the key', () => {
  it('a loose piece is a target', () => {
    expect(targetsKey(LOOSE_KNIGHT, loose)).toEqual({ key: ['c6'], nearMiss: [] });
  });

  it('a loose pawn makes the board unfair for this first pass', () => {
    expect(targetsKey(LOOSE_PAWN, loose)?.nearMiss).toEqual(['h7']);
  });

  it('a guarded piece that loses the exchange is a target', () => {
    const k = targetsKey(QUEEN_LOSES_EXCHANGE, loose);
    expect(k?.key).toContain('d5');
  });

  it('a guarded piece nobody can win is not a target', () => {
    const k = targetsKey(ALL_GUARDED, loose);
    expect(k?.key).not.toContain('c6');
  });

  it('never lists their king, nor my pieces', () => {
    const k = targetsKey(LOOSE_KNIGHT, loose)!;
    expect(k.key).not.toContain('e8');
    expect(k.key).not.toContain('e1');
  });
});

describe('step 5 — words', () => {
  it('names why each target is one, from the board', () => {
    expect(targetReason(LOOSE_KNIGHT, 'c6')).toMatch(/knight on c6 has no defender/);
    expect(targetReason(QUEEN_LOSES_EXCHANGE, 'd5')).toMatch(/queen on d5 is guarded, but your knight attacks it/);
  });

  it('the Show line teaches the method, then the targets', () => {
    expect(targetsShowLine(LOOSE_KNIGHT, ['c6'], 0)).toMatch(/count who guards each.*knight on c6/);
  });

  it('the prompt never says how many', () => {
    for (let i = 0; i < 3; i++) expect(targetsPrompt(i)).not.toMatch(/\d|one more|two|three|four/i);
  });

  it('a wrong tap names the method, never the answer', () => {
    const line = targetsWrongTapLine(ALL_GUARDED, 'c6');
    expect(line).toMatch(/Count the guards: that knight has 1 defender/);
    expect(line).not.toMatch(/c6|d7/);
    expect(targetsWrongTapLine(LOOSE_KNIGHT, 'e1')).toMatch(/yours/);
    expect(targetsWrongTapLine(LOOSE_KNIGHT, 'e8')).toMatch(/king/);
    expect(targetsWrongTapLine(LOOSE_KNIGHT, 'a4')).toMatch(/empty square/);
  });
});

describe('step 5 — the pinned-piece form (PP on the PP)', () => {
  // Bg5 pins the f6-knight to the queen; e4-e5 piles on with a pawn.
  const PIN = 'rnbqkb1r/ppp2ppp/4pn2/3p2B1/3PP3/2N5/PPP2PPP/R2QKBNR w KQkq - 0 5';

  it('asks where to attack the pinned piece again, keyed by the pile-on squares', async () => {
    const { targetsKit } = await import('./thinkingTargetsStep');
    const kit = targetsKit(() => []);
    const k = kit.keyFor(PIN);
    expect(k?.key).toContain('e5');
    expect(kit.prompt(0, PIN)).toMatch(/knight on f6 is pinned/);
    expect(kit.reasonFor(PIN, 'e5')).toMatch(/attacks the pinned knight again with a pawn/);
    expect(kit.showLine(PIN, k?.key ?? [], 0)).toMatch(/pinned/);
    // A wrong tap never names the answer.
    expect(kit.wrongTapLine(PIN, 'a3')).not.toMatch(/e5/);
  });

  it('an ordinary board keeps the ordinary targets question', async () => {
    const { targetsKit } = await import('./thinkingTargetsStep');
    const kit = targetsKit(() => []);
    expect(kit.prompt(0, '4k3/8/8/8/8/8/8/4K3 w - - 0 1')).not.toMatch(/pinned/);
    expect(kit.prompt(0)).not.toMatch(/pinned/);
  });
});

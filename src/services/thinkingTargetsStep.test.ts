import { describe, it, expect } from 'vitest';
import { Chess, type Color, type Square } from 'chess.js';
import { targetsForm, targetsKey, targetsKit, targetReason, targetsShowLine, targetsWrongTapLine, targetsPrompt, type LooseSquares } from './thinkingTargetsStep';
import type { KeyScorer } from './thinkingKeyCheck';

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

const LOOSE_KNIGHT = '4k3/8/2n5/8/8/8/8/R3K3 w - - 0 1';
const LOOSE_PAWN = '4k3/7p/2n5/8/8/8/8/R3K3 w - - 0 1';
const QUEEN_LOSES_EXCHANGE = '4k3/8/4p3/3q4/8/2N5/8/4K3 w - - 0 1';
const ALL_GUARDED = '4k3/3p4/2n5/8/8/8/8/R3K3 w - - 0 1';

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
    expect(targetsShowLine(LOOSE_KNIGHT, ['c6'], 0, 'loose')).toMatch(/ask who guards each.*knight on c6/);
    expect(targetsShowLine(QUEEN_LOSES_EXCHANGE, ['d5'], 0, 'win')).toMatch(/who attacks and who guards each.*queen on d5/);
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
  const PIN = 'r1bqk2r/p2p1p2/p1n1pn2/6B1/3PP3/2P5/P4PPP/R2QK1NR w KQkq - 0 9';

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
    // The pin form's key is a set of squares, not a piece: no exchange chain.
    expect(kit.followUps?.(PIN, 'e5', 0)).toEqual([]);
  }, 20_000);   // detectTactics per legal move: slow on a loaded machine

  it('an ordinary target is followed by its exchange count (C1)', async () => {
    const { targetsKit } = await import('./thinkingTargetsStep');
    const kit = targetsKit(() => []);
    const links = kit.followUps?.('2k5/1p6/2n5/3P4/1N6/8/8/6K1 w - - 0 1', 'c6', 0) ?? [];
    expect(links.map((l) => l.id)).toEqual(['attackers', 'defenders', 'takes-first']);
  });

  it('an ordinary board keeps the ordinary targets question', async () => {
    const { targetsKit } = await import('./thinkingTargetsStep');
    const kit = targetsKit(() => []);
    expect(kit.prompt(0, '4k3/8/8/8/8/8/8/4K3 w - - 0 1')).not.toMatch(/pinned/);
    expect(kit.prompt(0)).not.toMatch(/pinned/);
  });
});

describe('targetsWrongTapLine — a miss teaches the count', () => {
  it('names the first capture and the recapture when taking costs more than it wins', () => {
    // White to move: rooks on d2 and h5 hit the black knight on d5 (two hits, one guard), but a pawn on e6 guards it.
    const fen = '4k3/8/4p3/3n3R/8/8/3R4/4K3 w - - 0 1';
    expect(targetsWrongTapLine(fen, 'd5')).toMatch(/^Your cheapest way in is the rook on (d2|h5), and their pawn on e6 takes back — you give more than the knight is worth\.$/);
  });
  it('says plainly when nothing attacks the piece', () => {
    expect(targetsWrongTapLine('4k3/8/8/n7/8/8/8/4K2R w - - 0 1', 'a5')).toBe('Nothing of yours attacks that knight yet.');
  });
});

describe('targetsKey — a bare king is never asked for targets', () => {
  it('returns null when the side to move has only its king', () => {
    expect(targetsKey('8/5B2/1K6/4k3/8/8/8/8 b - - 0 1', () => ['f7'] as Square[])).toBeNull();
  });
});

describe('a loose piece says why it matters (prod Learn audit 2026-10-14)', () => {
  it('the reason rides with "loose"', () => {
    expect(targetReason('4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'a1')).toBe("The rook on a1 has no defender — it's loose, so it is the first piece a fork or a double attack goes after.");
  });
});

describe('step 5 asks the question its key answers (2026-10-23)', () => {
  // The old prompt: "Tap every piece of theirs you could win" over a key of
  // every loose piece — 74% of key squares on 400 puzzles were loose pieces
  // nothing attacked, which cannot be won now.
  const UNATTACKED_LOOSE = '4k3/8/2n5/8/8/8/8/4K2R w - - 0 1';   // nothing of White's hits c6
  const ATTACKED_LOOSE = LOOSE_KNIGHT.replace('R3K3', '2R1K3');   // the c1 rook hits c6

  it('a board with a loose piece nothing attacks asks "which pieces does nobody guard?"', () => {
    expect(targetsForm(UNATTACKED_LOOSE, loose)).toBe('loose');
    expect(targetsKey(UNATTACKED_LOOSE, loose)?.key).toEqual(['c6']);
    const kit = targetsKit(loose);
    expect(kit.prompt(0, UNATTACKED_LOOSE)).toMatch(/nobody guards|no defender|no guard/);
    expect(kit.prompt(0, UNATTACKED_LOOSE)).not.toMatch(/win/);
  });

  it('a board whose targets are all attacked asks the counting question (attacked more than guarded)', () => {
    expect(targetsForm(ATTACKED_LOOSE, loose)).toBe('win');
    expect(targetsForm(QUEEN_LOSES_EXCHANGE, loose)).toBe('win');
    expect(targetsKit(loose).prompt(0, QUEEN_LOSES_EXCHANGE)).toMatch(/attacked more (times )?than it is guarded/);
  });

  it('a wrong tap on a guarded piece in the loose question names the guard, not the answer', () => {
    const fen = '4k3/3p4/r1n5/8/8/8/8/4K2R w - - 0 1';   // c6 guarded by d7 and the a6 rook; the rook is loose
    expect(targetsForm(fen, loose)).toBe('loose');
    const line = targetsKit(loose).wrongTapLine(fen, 'c6');
    expect(line).toMatch(/2 defenders/);
    expect(line).not.toMatch(/a6/);
  });

  it('the engine checks the win question and never the loose one', async () => {
    let calls = 0;
    const scorer: KeyScorer = {
      best: async () => { calls += 1; return { cp: 300, uci: 'c1c6' }; },
      bestOf: async () => { calls += 1; return 300; },
    };
    const kit = targetsKit(loose);
    expect(await kit.check!(UNATTACKED_LOOSE, ['c6'], scorer)).toBe(true);
    expect(calls).toBe(0);
    expect(await kit.check!(ATTACKED_LOOSE, ['c6'], scorer)).toBe(true);
    expect(calls).toBeGreaterThan(0);
    // Taking it is far worse than the best move (a mate elsewhere): dropped.
    const mateElsewhere: KeyScorer = { best: async () => ({ cp: 10000, uci: 'c1c8' }), bestOf: async () => 300 };
    expect(await kit.check!(ATTACKED_LOOSE, ['c6'], mateElsewhere)).toBe(false);
  });
});

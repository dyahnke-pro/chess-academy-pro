// Computers batch 2 — looking back over a game, on real chess.js boards.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { whyItEnded, quietDecider, exploreInvite, murkyRead, idlePiece, type GamePly } from './gameEndReads';
import { isProof } from './proof';

function game(sans: string[], evals: Array<number | null>, best: Array<string | null> = []): GamePly[] {
  const c = new Chess();
  return sans.map((s, i) => {
    const fenBefore = c.fen(); c.move(s);
    return { san: s, fenBefore, fenAfter: c.fen(), evalAfter: evals[i] ?? null, bestMoveUci: best[i] ?? null, bestMoveEval: null };
  });
}
const single = (fen: string, evalAfter: number): GamePly[] => [{ san: '-', fenBefore: fen, fenAfter: fen, evalAfter, bestMoveUci: null, bestMoveEval: null }];

// Black to move, every move allows mate (Re8 / Rf8 / Bxh7 with the knight on h5).
const NET = '7k/6pp/8/7N/8/3B4/8/4RRK1 b - - 0 1';

describe('whyItEnded — the finish behind the result', () => {
  it('names the mate threat nothing stops, proven by a legal line', () => {
    const r = whyItEnded(single(NET, 9000), 'w');
    expect(r?.text).toMatch(/you threaten mate with Re8/);
    expect(r?.text).toMatch(/every move they have allows mate/);
    expect(r?.proof.exact).toBe(true);
  });
  it('stays silent when the threat has several defences (the scholar\'s mate set-up)', () => {
    const fen = (() => { const c = new Chess(); ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'].forEach((m) => c.move(m)); return c.fen(); })();
    expect(whyItEnded(single(fen, 300), 'w')).toBeNull();
  });
  it('stays silent on a board that is already mate', () => {
    const c = new Chess(); ['f3', 'e5', 'g4', 'Qh4#'].forEach((m) => c.move(m));
    expect(whyItEnded(single(c.fen(), -100000), 'w')).toBeNull();
  });
});

describe('exploreInvite — set it up and try the defences', () => {
  it('every reply allows mate in one', () => {
    const r = exploreInvite(single(NET, 9000), 0, 'w');
    expect(r?.text).toMatch(/try their defences yourself|whatever they play here, mate follows/);
    expect(r && isProof(r.proof)).toBe(true);
  });
  it('stays silent on a quiet opening board', () => {
    expect(exploreInvite(game(['e4', 'e5', 'Nf3'], [null, null, 30]), 2, 'w')).toBeNull();
  });
});

describe('quietDecider — the quiet move the game turned on', () => {
  const SANS = ['e4', 'e5', 'Nf3', 'Nf6', 'h3', 'Nc6', 'Nc3', 'Bc5'];
  it('h3 took g4 from their knight, and their answer cost them', () => {
    const r = quietDecider(game(SANS, [null, null, null, null, 20, 250, 260, 300], [null, null, null, null, 'h2h3']), 'w');
    expect(r?.text).toMatch(/pawn to h3/);
    expect(r?.text).toMatch(/taking g4 from their knight|took g4 away from their knight/);
    expect(r?.index).toBe(4);
  });
  it('stays silent when the swing never lands on their move', () => {
    expect(quietDecider(game(SANS, [null, null, null, null, 20, 50, 260, 300], [null, null, null, null, 'h2h3']), 'w')).toBeNull();
  });
  it('stays silent when your move was not the engine\'s choice', () => {
    expect(quietDecider(game(SANS, [null, null, null, null, 20, 250, 260, 300], [null, null, null, null, 'd2d4']), 'w')).toBeNull();
  });
});

describe('murkyRead — the engine\'s read would not hold still', () => {
  const g = game(['e4', 'e5', 'Nf3'], [null, null, 150], [null, null, 'g1f3']);
  it('your engine move, two searches in different bands: an honest unclear', () => {
    const r = murkyRead({ ...g[2], bestMoveEval: -40 }, 2, 'w');
    expect(r?.text).toMatch(/unexplored/);
    expect(r?.text).not.toMatch(/(?<![a-h])\d/);
    expect(r?.proof.full).toMatch(/about level/);
  });
  it('stays silent when both reads agree', () => {
    expect(murkyRead({ ...g[2], bestMoveEval: 120 }, 2, 'w')).toBeNull();
  });
  it('stays silent when you did not play the engine\'s move', () => {
    expect(murkyRead({ ...g[2], bestMoveUci: 'b1c3', bestMoveEval: -40 }, 2, 'w')).toBeNull();
  });
});

describe('idlePiece — the knight that never played', () => {
  it('stays silent in a short game', () => {
    expect(idlePiece(game(['e4', 'e5'], [20, 20]), 'w')).toBeNull();
  });
  it('names the knight boxed in by its own pawn in a won game', () => {
    // Black's knight goes to a6 early and never moves; …c5 shuts its road.
    const sans = ['d4', 'Na6', 'e4', 'c5', 'd5', 'Nf6', 'Nc3', 'g6', 'Nf3', 'Bg7', 'Be2', 'O-O', 'O-O', 'd6',
      'Re1', 'Rb8', 'Bf1', 'Bd7', 'a3', 'Qc7', 'h3', 'Rfe8', 'Bf4', 'Bc8', 'Qd2', 'Bd7', 'Rad1', 'Bc8',
      'g3', 'Bd7', 'Kg2', 'Bc8'];
    const evals = sans.map((_, i) => (i === sans.length - 1 ? 400 : 50));
    const r = idlePiece(game(sans, evals), 'w');
    expect(r?.text).toMatch(/knight on a6/);
    expect(r?.text).toMatch(/c5/);
  });
});

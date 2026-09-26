// Learn hand-walk, fresh Nimzo-Indian game (2026-09-26): the same standing
// facts said on three moves through two lanes, each with its own memory.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { phaseVerdictLine, phaseVerdictKeys } from './reviewPositionalAssessment';
import { buildPositionalRead } from './positionalRead';

const GAME = 'd4 Nf6 c4 e6 Nc3 Bb4 Nf3 b6 a3 Bxc3+ bxc3 Bb7 Bb2 O-O e3 d6 Be2 Nbd7 O-O Ne4 Qc2 f5 Rad1 Qe7 Rfe1 Rad8 d5 exd5 cxd5 Ndf6 c4 c6 dxc6 Bxc6 a4 Qe8 Nd4 Bxa4 Qd2'.split(' ');
function fenAt(ply: number): string {
  const c = new Chess();
  for (const m of GAME.slice(0, ply)) c.move(m);
  return c.fen();
}

describe('one say-once ledger across the balance sheet and the positional read', () => {
  // After 7…O-O 8.e3 — the balance sheet named "theirs is still in the centre"
  // and "their pawn on a3 is isolated"; the positional read said both again.
  const fen = fenAt(16);
  it('the balance sheet reports the keys of the reasons it speaks', () => {
    const line = phaseVerdictLine(fen, 'b', 80, 'middlegame', new Set());
    const keys = phaseVerdictKeys(fen, 'b', 80, new Set());
    expect(line).toMatch(/isolated/);
    expect(keys).toContain('opponent-iso-a3');
  });
  it('a reason already heard is not spoken again by the balance sheet', () => {
    const line = phaseVerdictLine(fen, 'b', 80, 'middlegame', new Set(['opponent-iso-a3']));
    expect(line ?? '').not.toMatch(/a3 is isolated/);
  });
  it('the positional read skips a fact the balance sheet already spoke', () => {
    const heard = new Set(phaseVerdictKeys(fen, 'b', 80, new Set()));
    const seen: string[] = [];
    const said = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const o = buildPositionalRead(fen, 'black', said, heard);
      if (!o) break;
      seen.push(o.key);
    }
    for (const k of heard) expect(seen).not.toContain(k);
  });
});

describe('the instant lane states the threat; the move that meets it comes from the engine read', () => {
  // After 18…Qe8 19.Nd4 — "deal with that first" was wrong: Bxa4 ignores Nxf5
  // and is the only move that keeps Black on top.
  const fen = fenAt(37);
  it('the eyeing-a-capture behavior gives the fact without the order', async () => {
    const { detectBehaviors } = await import('./danyaBehaviors');
    const hits = detectBehaviors({ fen, studentColor: 'black', studentLastTo: 'e8' });
    expect(hits.some((h) => /eyeing Nxf5/.test(h.fact))).toBe(true);   // the fact still speaks
    for (const h of hits) expect(h.fact).not.toMatch(/deal with that first/i);
  });
  it('a dictated reply is named, never "that reply"', async () => {
    const { opponentGapClause } = await import('./opponentGap');
    const said = opponentGapClause({ opportunityUci: 'c6a4' } as never, 'dictated', fen, 'b', 'Nd4');
    expect(said).toMatch(/^Nd4 gives you something: Bxa4/);
    expect(said ?? '').not.toMatch(/that reply/i);
  });
});

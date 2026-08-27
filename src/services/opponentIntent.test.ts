import { describe, it, expect } from 'vitest';
import { buildOpponentIntent, opponentIntentFacts } from './opponentIntent';

// Black (the opponent) to move after 1.e4 e5 2.Nf3 Nc6 3.Bb5 (Ruy). Their fan:
// a6 (main) with 4.Ba4 as White's reply; Nf6 (Berlin) with 4.O-O.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
const line = (rank: number, evaluation: number, moves: string[]) => ({ rank, evaluation, moves, mate: null });

describe('buildOpponentIntent — the branched plan, straight from the PVs', () => {
  const analysis = {
    topLines: [
      line(1, 20, ['a7a6', 'b5a4']),   // ...a6, Ba4
      line(2, 25, ['g8f6', 'e1g1']),   // ...Nf6, O-O
    ],
  };

  it('reads the opponent move (ply 1) and the student reply (ply 2) from each line', () => {
    const oi = buildOpponentIntent({ analysis, fen: FEN })!;
    expect(oi.plans[0]).toMatchObject({ opponentMove: 'a6', studentReply: 'Ba4' });
    expect(oi.plans[1]).toMatchObject({ opponentMove: 'Nf6', studentReply: 'O-O' });
  });

  it('teaching disclosure plays the branch out (revealReply)', () => {
    const oi = buildOpponentIntent({ analysis, fen: FEN })!;
    const facts = opponentIntentFacts(oi, { revealReply: true });
    expect(facts).toMatch(/strongest here is a6 — you'll want Ba4 ready/);
    expect(facts).toMatch(/if instead Nf6, then O-O/);
  });

  it('own-game disclosure names the opponent idea but withholds your reply (guide-don\'t-tell)', () => {
    const oi = buildOpponentIntent({ analysis, fen: FEN })!;
    const facts = opponentIntentFacts(oi, { revealReply: false });
    expect(facts).toMatch(/keep an eye on the opponent's a6/);
    expect(facts).not.toMatch(/Ba4/); // reply withheld
  });

  it('caps at the top 2 plans by default', () => {
    const wide = { topLines: [line(1, 20, ['a7a6']), line(2, 25, ['g8f6']), line(3, 30, ['f8c5']), line(4, 40, ['d7d6'])] };
    expect(buildOpponentIntent({ analysis: wide, fen: FEN })!.plans.length).toBe(2);
  });

  it('returns null on an empty fan', () => {
    expect(buildOpponentIntent({ analysis: { topLines: [] }, fen: FEN })).toBeNull();
  });

  it('handles a one-ply line (no reply available)', () => {
    const oi = buildOpponentIntent({ analysis: { topLines: [line(1, 20, ['a7a6'])] }, fen: FEN })!;
    expect(oi.plans[0]).toMatchObject({ opponentMove: 'a6', studentReply: null });
    // revealReply falls back to the guide form when there's no reply to reveal.
    expect(opponentIntentFacts(oi, { revealReply: true })).toMatch(/keep an eye on the opponent's a6/);
  });
});

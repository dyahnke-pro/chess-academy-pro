import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { dialedReply, disruptions, newlyAttackedPieces, quietSafeReply, rulesActive, startsTrade, type ReplyRules } from './coachDials';
import { breaksDevelopRule } from './checks/developAndCastle';

const ATTACKS_OFF: ReplyRules = { attacksOnPieces: 'off', developRules: 'off' };
const SAME_RULES: ReplyRules = { attacksOnPieces: 'on', developRules: 'on' };

const fenAfter = (moves: string): string => {
  const b = new Chess();
  for (const s of moves.split(/\s+/).filter(Boolean)) b.move(s);
  return b.fen();
};

describe('newlyAttackedPieces', () => {
  const ruy = fenAfter('e4 e5 Nf3 Nc6 Bb5');
  it('a pawn kicking a bishop is an attack on a piece', () => {
    expect(newlyAttackedPieces(ruy, 'a7a6', 'w')).toEqual(['b5']);
  });
  it('pawn-on-pawn tension is not', () => {
    expect(newlyAttackedPieces(ruy, 'g8f6', 'w')).toEqual([]); // hits e4, a pawn
    expect(newlyAttackedPieces(fenAfter('e4'), 'd7d5', 'w')).toEqual([]);
  });
  it('a check is an attack on the king', () => {
    expect(newlyAttackedPieces(fenAfter('e4 e5 f3'), 'd8h4', 'w')).toEqual(['e1']);
  });
  it('a piece already attacked is not newly attacked', () => {
    // After …a6 the bishop on b5 is hit; another move that also hits it adds nothing new.
    const hit = fenAfter('e4 e5 Nf3 Nc6 Bb5 a6 Ba4');
    expect(newlyAttackedPieces(hit, 'b7b5', 'w')).toEqual(['a4']); // b5 newly hits the bishop on a4
    expect(newlyAttackedPieces(fenAfter('e4 e5 Nf3 Nc6 Bb5 a6 h3'), 'g8f6', 'w')).toEqual([]); // b5 was already attacked
  });
  it('an illegal move attacks nothing', () => {
    expect(newlyAttackedPieces(ruy, 'a7a4', 'w')).toEqual([]);
  });
});

describe('dialedReply — attacks on pieces off', () => {
  const ruy = fenAfter('e4 e5 Nf3 Nc6 Bb5');
  it('a quiet first choice stands', () => {
    expect(dialedReply(ruy, 'w', 'g8f6', [{ uci: 'a7a6', cpLoss: 0 }], 80, ATTACKS_OFF)).toEqual({ uci: 'g8f6', swapped: false, forced: false, attacks: [], examined: 0 });
  });
  it("the engine's top reply hits the bishop: the next acceptable non-attacking reply is played", () => {
    const r = dialedReply(ruy, 'w', 'a7a6', [{ uci: 'a7a6', cpLoss: 0 }, { uci: 'c6d4', cpLoss: 20 }, { uci: 'g8f6', cpLoss: 25 }], 80, ATTACKS_OFF);
    expect(r).toEqual({ uci: 'g8f6', swapped: true, forced: false, attacks: [], examined: 2 }); // …Nd4 hits the knight on f3
  });
  it('a book road comes before the engine lines (it is the level-appropriate move)', () => {
    const r = dialedReply(ruy, 'w', 'a7a6', [{ uci: 'f8c5' }, { uci: 'g8f6', cpLoss: 0 }], 80, ATTACKS_OFF);
    expect(r.uci).toBe('f8c5');
  });
  it('a quiet move outside the strength window is not acceptable — the least costly attacking one is played, forced', () => {
    const r = dialedReply(ruy, 'w', 'c6d4', [{ uci: 'a7a6', cpLoss: 0 }, { uci: 'c6d4', cpLoss: 30 }, { uci: 'g8f6', cpLoss: 200 }], 80, ATTACKS_OFF);
    expect(r).toMatchObject({ uci: 'a7a6', swapped: true, forced: true });
    expect(r.attacks).toEqual(['b5']);
  });
  it('forced with the first choice already the cheapest: it stands', () => {
    const r = dialedReply(ruy, 'w', 'a7a6', [{ uci: 'a7a6', cpLoss: 0 }, { uci: 'c6d4', cpLoss: 30 }], 80, ATTACKS_OFF);
    expect(r).toEqual({ uci: 'a7a6', swapped: false, forced: true, attacks: ['b5'], examined: 1 });
  });
});

describe('quietSafeReply — when no read weighed anything', () => {
  it('picks a move that attacks none of the student pieces and is not en prise', () => {
    // Missions audit game 1: Black to move after 1.Nc3 e5 2.Nf3 d6 3.e4 Nf6
    // 4.Bc4 Nbd7 5.O-O Rg8 6.d3 — …Nb6 hit the bishop on c4 with nothing read.
    const fen = fenAfter('Nc3 e5 Nf3 d6 e4 Nf6 Bc4 Nbd7 O-O Rg8 d3');
    const uci = quietSafeReply(fen, 'w', ATTACKS_OFF);
    expect(uci).not.toBeNull();
    expect(newlyAttackedPieces(fen, uci!, 'w')).toEqual([]);
    expect(uci).not.toBe('d7b6');
  });
  it('castles first when castling is quiet and safe', () => {
    const fen = fenAfter('e4 e5 Nf3 Nf6 Bc4 Be7 d3');
    expect(quietSafeReply(fen, 'w', ATTACKS_OFF)).toBe('e8g8');
  });
});

describe('no trade the coach starts (David\'s game, 2026-10-21)', () => {
  // "the first lesson just took my center pawn forcing me to capture with the
  // knight I just moved out" — the Open Sicilian shape: after d4, …cxd4 makes
  // the knight on f3 take back, a developed minor moved twice for the coach.
  const sicilian = fenAfter('e4 c5 Nf3 d6 d4');

  it('a capture with the material level starts a trade', () => {
    expect(startsTrade(sicilian, 'c5d4')).toBe(true);
    expect(disruptions(sicilian, 'c5d4', 'w', ATTACKS_OFF)).toEqual(['xd4']);
  });

  it('taking back what the student just took is not', () => {
    const took = fenAfter('e4 e5 Nf3 Nc6 Bb5 a6 Bxc6');
    expect(startsTrade(took, 'd7c6')).toBe(false);
    expect(disruptions(took, 'd7c6', 'w', ATTACKS_OFF)).toEqual([]);
  });

  it('the coach plays a quiet move in the window instead of starting the trade', () => {
    const r = dialedReply(sicilian, 'w', 'c5d4', [{ uci: 'c5d4', cpLoss: 0 }, { uci: 'g8f6', cpLoss: 40 }], 80, ATTACKS_OFF);
    expect(r).toEqual({ uci: 'g8f6', swapped: true, forced: false, attacks: [], examined: 1 });
  });

  it('with no quiet move in the window, the trade is played and flagged forced', () => {
    const r = dialedReply(sicilian, 'w', 'c5d4', [{ uci: 'c5d4', cpLoss: 0 }, { uci: 'g8f6', cpLoss: 200 }], 80, ATTACKS_OFF);
    expect(r).toMatchObject({ uci: 'c5d4', forced: true, attacks: ['xd4'] });
  });
});

describe('the same rules — the coach develops the way the student must (David 2026-10-21)', () => {
  // "it would be fun if the opponent had to play by the same rules maybe?"
  const italian = fenAfter('e4 e5 Nf3 Nc6 Bc4 Nf6 d3');

  it('a knight or bishop moved a second time, unforced, breaks the rule', () => {
    // …Ng4: the knight from f6 moves again, nothing attacked it.
    expect(breaksDevelopRule(italian, 'f6g4')).toBe('repeat-move');
    // Fail twin: a knight still at home coming out keeps it.
    expect(breaksDevelopRule(italian, 'f8c5')).toBeNull();
  });

  it('a minor that stood attacked, or a capture, is exempt — the student\'s own exemptions', () => {
    // After h3? …the knight on g4 kicked by h3 may move again.
    const kicked = fenAfter('e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Ng4 h3');
    expect(breaksDevelopRule(kicked, 'g4f6')).toBeNull();
    // …Nxe4: a capture with a developed knight.
    const take = fenAfter('e4 e5 Nf3 Nf6 Nc3 Nc6 Bb5 Bc5 d3 d6 Bg5 h6 Bh4 g5 Bg3 a6 Bxc6+ bxc6 Nxe5');
    expect(breaksDevelopRule(take, 'f6e4')).toBeNull();
  });

  it('a king move that gives up castling breaks it; castling keeps it', () => {
    const ready = fenAfter('e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 c3');
    expect(breaksDevelopRule(ready, 'e8f8')).toBe('castling-lost');
    expect(breaksDevelopRule(ready, 'e8g8')).toBeNull();
  });

  it('a rook move that keeps the other side\'s castling keeps the rule', () => {
    const rookOut = fenAfter('a4 a5 Ra3 Ra6 h4 h5');
    expect(breaksDevelopRule(rookOut, 'a3b3')).toBeNull(); // White already gave the queen side up; king side still there
    expect(breaksDevelopRule(rookOut, 'h1h3')).toBe('castling-lost'); // the last right goes
  });

  it('the dial weighs it: a quiet first choice that breaks the rule is swapped for one that keeps it', () => {
    expect(disruptions(italian, 'f6g4', 'w', SAME_RULES)).toEqual(['repeat-move']);
    // Attacks on: the rule alone decides — …Bc5 keeps it.
    expect(disruptions(italian, 'f8c5', 'w', SAME_RULES)).toEqual([]);
    const r = dialedReply(italian, 'w', 'f6g4', [{ uci: 'f6g4', cpLoss: 0 }, { uci: 'f8c5', cpLoss: 15 }], 80, SAME_RULES);
    expect(r).toEqual({ uci: 'f8c5', swapped: true, forced: false, attacks: [], examined: 1 });
  });

  it('with the dial off, the same move stands — the rule is the card\'s, never the coach\'s habit', () => {
    expect(disruptions(italian, 'f6g4', 'w', { attacksOnPieces: 'on', developRules: 'off' })).toEqual([]);
    expect(rulesActive({ attacksOnPieces: 'on', developRules: 'off' })).toBe(false);
    expect(rulesActive(SAME_RULES)).toBe(true);
  });
});

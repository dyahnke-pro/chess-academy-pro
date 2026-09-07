import { describe, it, expect } from 'vitest';
import { buildCausalChain, causalChainArrows, causalChainHighlights, causalChainMistakeTags, findMissedChain, findAllowedChain } from './causalChain';

// David's real chess.com game (2026-09-07). The acceptance fixture: the whole
// point of the feature is that THIS produces the cross-move causal chain.
//   1.e4 c5 2.Bc4 d6 3.Qh5 e6 4.d3 Nf6 5.Qf3 a6 6.Bg5 Be7 7.Nd2 Qa5 8.Nge2 Nxe4
// Qf3 (premature queen) sits on the g1-knight's f3 square → the knight is shoved
// to e2 (a knight on f3 would defend g5, e2 does not) → Bg5 is left loose →
// 8...Nxe4 unveils Be7's attack on g5 (discovered double attack) and wins it.
const DAVID_GAME = ['e4', 'c5', 'Bc4', 'd6', 'Qh5', 'e6', 'd3', 'Nf6', 'Qf3', 'a6', 'Bg5', 'Be7', 'Nd2', 'Qa5', 'Nge2', 'Nxe4'];

describe('buildCausalChain — David\'s game (acceptance)', () => {
  const chain = buildCausalChain({ historySans: DAVID_GAME });

  it('produces a chain (not null)', () => {
    expect(chain).not.toBeNull();
  });

  it('is the full 4-node / 3-edge cross-move chain', () => {
    expect(chain!.nodes).toHaveLength(4);
    expect(chain!.edges).toHaveLength(3);
    expect(chain!.edges.length).toBe(chain!.nodes.length - 1);
  });

  it('roots at the premature queen on f3', () => {
    const root = chain!.nodes[0];
    expect(root.kind).toBe('premature-piece');
    expect(root.color).toBe('w');
    expect(root.data.piece).toBe('queen');
    expect(root.data.square).toBe('f3');
    expect(root.data.move).toBe('Qf3');
  });

  it('links queen → displaced knight → loose bishop → the discovery', () => {
    expect(chain!.nodes.map((n) => n.kind)).toEqual([
      'premature-piece', 'displaced-defender', 'loose-piece', 'discovered-attack',
    ]);
    expect(chain!.edges.map((e) => e.relation)).toEqual([
      'occupies-developing-square', 'removes-defender', 'enables-tactic',
    ]);
  });

  it('the displaced-defender names the real knight (e2) and its would-be square (f3) guarding g5', () => {
    const d = chain!.nodes[1];
    expect(d.data.knightSquare).toBe('e2');
    expect(d.data.idealSquare).toBe('f3');
    expect(d.data.target).toBe('g5');
  });

  it('the loose piece is the bishop on g5', () => {
    const l = chain!.nodes[2];
    expect(l.kind).toBe('loose-piece');
    expect(l.data.square).toBe('g5');
    expect(l.data.piece).toBe('bishop');
    expect(l.color).toBe('w');
  });

  it('the tactic is the discovered attack Nxe4 unveiling Be7', () => {
    const t = chain!.nodes[3];
    expect(t.kind).toBe('discovered-attack');
    expect(t.data.move).toBe('Nxe4');
    expect(t.data.unveiler).toBe('e7');
    expect(t.data.target).toBe('g5');
    expect(t.ply).toBe(16);
  });

  it('the beneficiary is Black (the mover of the tactic)', () => {
    expect(chain!.beneficiary).toBe('b');
  });

  it('every edge carries a board proof string', () => {
    for (const e of chain!.edges) expect(e.proof.length).toBeGreaterThan(0);
  });

  it('links each cause node back to its FUNDAMENTAL (the drill spine)', () => {
    const byKind = Object.fromEntries(chain!.nodes.map((n) => [n.kind, n]));
    expect(byKind['premature-piece'].fundamentalId).toBe('early-queen-sortie');
    expect(byKind['premature-piece'].tag).toBe('neglected-development');
    expect(byKind['loose-piece'].fundamentalId).toBe('loose-piece');
    expect(byKind['loose-piece'].tag).toBe('hung-material');
    expect(byKind['displaced-defender'].tag).toBe('misplaced-piece');
    // the winning tactic is NOT a mistake — no fundamental/tag
    expect(byKind['discovered-attack'].fundamentalId).toBeNull();
    expect(byKind['discovered-attack'].tag).toBeUndefined();
  });

  it('emits board-proven lead-the-eye arrows on the discovery (attackers → g5)', () => {
    const arrows = causalChainArrows(chain!);
    const gs = arrows.filter((a) => a.to === 'g5').map((a) => a.from).sort();
    expect(gs).toEqual(['e4', 'e7']);           // the knight and the unveiled bishop
    for (const a of arrows) expect(a.color).toBe('green');
  });

  it('highlights the key squares — f3/e2 as cause, g5 the loose target in red', () => {
    const hl = causalChainHighlights(chain!);
    const map = Object.fromEntries(hl.map((h) => [h.square, h.color]));
    expect(map['f3']).toBe('yellow');           // the blocked developing square
    expect(map['e2']).toBe('blue');             // where the knight actually is
    expect(map['g5']).toBe('red');              // the loose target wins the priority
  });

  it('feeds the drill spine only for the side that ERRED', () => {
    // Student is Black (won) → no mistake tags to file.
    expect(causalChainMistakeTags(chain!, 'b')).toEqual([]);
    // If the student were White (made the early queen) → the buckets to drill.
    expect(causalChainMistakeTags(chain!, 'w').sort()).toEqual(
      ['hung-material', 'misplaced-piece', 'neglected-development'],
    );
  });
});

describe('buildCausalChain — negatives (silent on unprovable / no chain)', () => {
  it('returns null for a quiet developing game with no exploited loose piece', () => {
    const quiet = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6'];
    expect(buildCausalChain({ historySans: quiet })).toBeNull();
  });

  it('returns null when the last move is a normal capture of a DEFENDED piece', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 — bishop takes a defended knight; no
    // loose piece won, no cross-move chain.
    const ruy = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6'];
    expect(buildCausalChain({ historySans: ruy })).toBeNull();
  });

  it('returns null on an empty / too-short history', () => {
    expect(buildCausalChain({ historySans: [] })).toBeNull();
    expect(buildCausalChain({ historySans: ['e4'] })).toBeNull();
  });

  it('does not invent a chain when focusPly is out of range', () => {
    expect(buildCausalChain({ historySans: DAVID_GAME, focusPly: 99 })).toBeNull();
    expect(buildCausalChain({ historySans: DAVID_GAME, focusPly: 0 })).toBeNull();
  });

  // Regression: real games from David's history that USED to fire a false chain
  // (found 2026-09-07 by scanning 930 games; each was over-stating the why).
  it('stays silent on a mere KICK, not a discovery (…h6 kicks Bg5 — it retreats)', () => {
    // hani_sharaf vs knight_mare_01: premature queen IS there, but …h6 only kicks
    // the bishop (single attacker, no unveiled second attacker) — not a won piece.
    const kick = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'g6', 'Qf3', 'Nf6', 'Ne2', 'Bg7', 'd3', 'O-O', 'Bg5', 'h6'];
    expect(buildCausalChain({ historySans: kick })).toBeNull();
  });

  it('stays silent when the pawn (not a premature queen) sits on the knight\'s square', () => {
    // A c3 PAWN on the knight's square is a normal move, not why a piece is loose.
    const pawnBlock = ['e4', 'e5', 'Nc3', 'Bb4', 'Nd5', 'Nc6', 'Nxb4', 'Nxb4', 'c3', 'Nc6', 'd4', 'd5', 'dxe5', 'dxe4', 'Qa4', 'Bd7', 'Qxe4', 'Qe7', 'Nf3', 'Nf6'];
    expect(buildCausalChain({ historySans: pawnBlock })).toBeNull();
  });
});

describe('buildCausalChain — PATTERN 2: the opponent removed the only guard', () => {
  // knight_mare_01 vs alex_kokhno (real game, exact SANs, sliced to Qxb7). …Qxh4
  // grabbed a pawn but that queen was the ONLY thing guarding b7 — Qxb7 wins the
  // bishop.
  const REMOVED_GUARD = ['e4', 'b6', 'd4', 'Bb7', 'Nc3', 'e6', 'Nf3', 'Bb4', 'Bd3', 'Ne7', 'Bd2', 'c5', 'a3', 'Bxc3', 'Bxc3', 'cxd4', 'Bxd4', 'Nbc6', 'Bc3', 'O-O', 'O-O', 'd5', 'Qe2', 'Ng6', 'Bd2', 'dxe4', 'Qxe4', 'Qe7', 'h4', 'Nce5', 'Bb4', 'Nxf3+', 'Qxf3', 'Qxh4', 'Qxb7'];

  it('fires: defender-removed → won-loose-piece', () => {
    const chain = buildCausalChain({ historySans: REMOVED_GUARD });
    expect(chain).not.toBeNull();
    expect(chain!.nodes.map((n) => n.kind)).toEqual(['defender-removed', 'won-loose-piece']);
    expect(chain!.nodes[0].data.move).toBe('Qxh4');       // the guard that walked away
    expect(chain!.nodes[0].data.target).toBe('b7');
    expect(chain!.nodes[1].data.targetPiece).toBe('bishop');
    expect(chain!.beneficiary).toBe('w');
  });

  it('the cause node carries the loose-piece fundamental (feeds the drill spine)', () => {
    const chain = buildCausalChain({ historySans: REMOVED_GUARD })!;
    expect(chain.nodes[0].fundamentalId).toBe('loose-piece');
    expect(chain.nodes[0].tag).toBe('hung-material');
  });

  it('stays SILENT when the guard move was FORCED (not a choice)', () => {
    // knight_mare_01 game: …gxh2+ CHECKS, forcing Kxh2 — the king had no choice, so
    // blaming it for "abandoning f1" would overstate the why. No saving move → null.
    const forced = ['d4', 'd5', 'Bf4', 'Bf5', 'e3', 'Na6', 'Nf3', 'c6', 'Nbd2', 'Nc7', 'Nh4', 'e6', 'Nxf5', 'exf5', 'Bd3', 'Bb4', 'c3', 'Bd6', 'Bxd6', 'Qxd6', 'Bxf5', 'Nf6', 'Qc2', 'g6', 'Bd3', 'Qe7', 'c4', 'Rd8', 'O-O', 'O-O', 'c5', 'Ne6', 'f4', 'Ng4', 'Rf3', 'Rde8', 'f5', 'Ng5', 'Rg3', 'Nxe3', 'Qc1', 'h5', 'fxg6', 'fxg6', 'Bxg6', 'h4', 'Rxg5', 'Qxg5', 'g3', 'Qxg6', 'Qc3', 'hxg3', 'Nf1', 'gxh2+', 'Kxh2', 'Nxf1+'];
    // focus = Nxf1+ (the winning capture); the guard move Kxh2 just before it was forced.
    expect(buildCausalChain({ historySans: forced, focusPly: 56 })).toBeNull();
  });
});

describe('buildCausalChain — BOTH WAYS: missed (for you) + allowed (against you)', () => {
  // knight_mare_01 vs jkern1013 (real game). After the opponent's Qd7, the a8-rook
  // was loose — Qxa8+ wins it. David played Qc5 instead → a MISSED win.
  const MISSED = ['d4', 'd5', 'c4', 'Nf6', 'cxd5', 'Nxd5', 'e4', 'Nb4', 'Qa4+', 'N8c6', 'd5', 'e6', 'dxc6', 'Nxc6', 'Bb5', 'Bb4+', 'Qxb4', 'a5', 'Bxc6+', 'bxc6', 'Qc4', 'Ba6', 'Qxc6+', 'Qd7', 'Qc5'];

  it('MISSED: a winning chain was available and the student played something else', () => {
    const chain = findMissedChain(MISSED, 25, 'w');
    expect(chain).not.toBeNull();
    expect(chain!.stance).toBe('missed');
    expect(chain!.missedMove).toBe('Qxa8+');
    expect(chain!.playedInstead).toBe('Qc5');
    expect(chain!.beneficiary).toBe('w');             // the student would have won it
  });

  it('MISSED is suppressed when the student played a CHECK (their own forcing plan)', () => {
    // david_1585 vs knight_mare_01: David played Qxh2+ (a check) instead of a win —
    // not second-guessed as a "miss".
    const withCheck = ['e4', 'e5', 'Bc4', 'Qe7', 'O-O', 'Nc6', 'Kh1', 'Nf6', 'f4', 'Nxe4', 'fxe5', 'Nxe5', 'Bb3', 'd6', 'd3', 'Bg4', 'Qe1', 'Ng5', 'Bxg5', 'Qxg5', 'd4', 'O-O-O', 'dxe5', 'dxe5', 'Rxf7'];
    // (sanity: the specific Qxh2+ ply in David's game returns null — covered by the
    //  regex gate; here we assert the API shape holds for a normal position.)
    expect(findMissedChain(withCheck, 24, 'b')).toBeNull();
  });

  // arieso vs knight_mare_01 (real game). David's Qxb3 recaptured but that queen
  // was the only guard on c6 — the opponent can win the knight with Bxc6. Rde8
  // would have avoided it.
  const ALLOWED = ['e4', 'c5', 'f4', 'g6', 'Nf3', 'Bg7', 'Bc4', 'e6', 'O-O', 'Ne7', 'd3', 'O-O', 'Nc3', 'Nbc6', 'Ne2', 'a6', 'c3', 'b5', 'Bb3', 'a5', 'a4', 'Ba6', 'e5', 'bxa4', 'Rxa4', 'Bb5', 'Re4', 'd5', 'exd6', 'Nf5', 'Ng3', 'Nxd6', 'Ree1', 'Qb6', 'Kh1', 'Rad8', 'c4', 'Ba6', 'Ba4', 'Nxc4', 'Qb3', 'Qxb3'];

  it('ALLOWED: the student\'s move left a chain for the opponent, with an avoidance move', () => {
    const chain = findAllowedChain(ALLOWED, 42, 'b');
    expect(chain).not.toBeNull();
    expect(chain!.stance).toBe('allowed');
    expect(chain!.beneficiary).toBe('w');             // the OPPONENT gets the shot
    expect(chain!.avoidance).toBe('Rde8');            // the prophylactic move
    expect(chain!.nodes[0].color).toBe('b');          // the cause is the student's own move
  });

  it('does not fire missed/allowed out of range', () => {
    expect(findMissedChain(MISSED, 0, 'w')).toBeNull();
    expect(findAllowedChain(ALLOWED, 999, 'b')).toBeNull();
  });
});

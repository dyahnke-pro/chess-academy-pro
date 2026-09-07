import { describe, it, expect } from 'vitest';
import { buildCausalChain, causalChainArrows, causalChainHighlights, causalChainMistakeTags } from './causalChain';

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
});

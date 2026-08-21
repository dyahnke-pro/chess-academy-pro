/**
 * The Copycat bake resolves, and every board claim in it is true.
 *
 * A BAKE THAT DOES NOT MATCH ITS SPINE IS SILENT. `spineCovers` compares the
 * SAN list exactly — same length, same moves — so a bake keyed to a line the
 * runtime does not walk resolves to null and the lesson quietly falls back to
 * the computed tier with nobody the wiser. That is the failure this pins.
 *
 * The prose was written from a computed fact packet (engine eval per ply, the
 * tempting move and its refutation, the uncertainty signal) and every square it
 * names was checked with chess.js first, per G0.1. These assertions re-check the
 * load-bearing ones so the note cannot drift away from the board it describes.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { bakedNarrationFor } from './bakedWalkthroughNarration';

const SPINE = 'e4 e5 Nc3 Nc6 Bc4 Bc5 Qg4 Qf6 Nd5 Qxf2+ Kd1 Kf8 Nh3 Qd4 d3'.split(' ');
const at = (n: number): Chess => {
  const c = new Chess();
  for (const s of SPINE.slice(0, n)) c.move(s);
  return c;
};

describe('Vienna Copycat bake', () => {
  it('resolves for the taught line', () => {
    const baked = bakedNarrationFor('Vienna Game: Copycat Variation', SPINE);
    expect(baked, 'the bake did not match its own spine — it would be silent').not.toBeNull();
    expect(baked?.ideas).toHaveLength(SPINE.length);
    expect(baked?.studentSide).toBe('white');
  });

  it('resolves under the fuzzy NAME match too, since the runtime names it differently', () => {
    // The name match is fuzzy by design; the spine match never is. A lesson
    // labelled just "Vienna Game" walking this exact line must still find it.
    expect(bakedNarrationFor('Vienna Game', SPINE)).not.toBeNull();
  });

  it('does NOT resolve for a different line — the spine match is exact', () => {
    expect(bakedNarrationFor('Vienna Game: Copycat Variation', SPINE.slice(0, 9))).toBeNull();
  });

  it('every idea carries both registers', () => {
    for (const idea of bakedNarrationFor('Vienna Game: Copycat Variation', SPINE)?.ideas ?? []) {
      expect(idea.text.length).toBeGreaterThan(40);
      expect(idea.shortText?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('the claims the prose leans on are true on the board', () => {
    // "the knight on c6 is not f6, and f6 is the square that guards g7"
    const afterQg4 = at(7);
    expect(afterQg4.isAttacked('g7', 'w'), 'Qg4 must attack g7').toBe(true);
    expect(afterQg4.isAttacked('g7', 'b'), 'g7 must be undefended — the whole point').toBe(false);

    // "the knight jumps to d5 and hits the queen — and behind that, the fork on c7"
    const afterNd5 = at(9);
    expect(afterNd5.isAttacked('f6', 'w'), 'Nd5 must hit the queen').toBe(true);
    const idle = new Chess(afterNd5.fen());
    idle.move('a6');
    expect(idle.moves(), 'the c7 fork must be real').toContain('Nxc7+');

    // "the king steps to f1 and the bishop is simply sitting there attacked"
    const tempt = new Chess(afterNd5.fen());
    tempt.move('Bxf2+');
    tempt.move('Kf1');
    expect(tempt.isAttacked('f2', 'w'), 'the tempting bishop capture must hang').toBe(true);

    // "we both lose the right to castle"
    expect(at(11).fen().split(' ')[2]).not.toMatch(/[KQ]/);
    expect(at(12).fen().split(' ')[2]).toBe('-');

    // "from that unlikely square, attacks the queen on f2"
    expect(at(13).isAttacked('f2', 'w'), 'Nh3 must attack the queen').toBe(true);

    // "it hits the bishop on c4, which nothing is defending, and the pawn on e4"
    const afterQd4 = at(14);
    expect(afterQd4.isAttacked('c4', 'b')).toBe(true);
    expect(afterQd4.isAttacked('e4', 'b')).toBe(true);
    expect(afterQd4.isAttacked('c4', 'w'), 'c4 must be undefended before d3').toBe(false);

    // "gives the bishop on c4 the defender it was missing"
    expect(at(15).isAttacked('c4', 'w')).toBe(true);
  });
});

/**
 * ONE CLAIM, ONE KEY — the instant tactic lane (`buildTacticsLiveContext`) and
 * the composer's concept clause (`conceptForBoard` → positionFacts) must key
 * the same geometry identically, or the speak-time claim ledger in
 * `voicePackage` cannot see that they are one claim.
 *
 * Real position: 1200 Sicilian (lichess 1ZmVtbO3), after 19.Nxc5 Rd8. The
 * walk heard "You have a back-rank threat: the king on g8…" and, in the late
 * package, "Their king on g8 has no escape square…" — the same claim twice.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildTacticsLiveContext } from './liveTacticsContext';
import { conceptForBoard } from './conceptEngine';
import { conceptInstanceKey } from './positionFacts';

const MOVES = 'e4 c5 Nf3 d6 c3 Nc6 d4 cxd4 cxd4 Bg4 Be2 Nf6 Nc3 Bxf3 Bxf3 e6 Qa4 Qd7 Be3 Be7 O-O O-O Rad1 Qc8 Qc2 a6 e5 dxe5 Be4 Nxe4 Nxe4 exd4 Bxd4 e5 Bc5 Bxc5 Nxc5 Rd8';

describe('claim-key parity across the instant and late lanes', () => {
  it('the back-rank threat keys identically on both lanes', () => {
    const c = new Chess();
    for (const m of MOVES.split(' ')) c.move(m);
    const tactic = buildTacticsLiveContext(c.fen(), null, 'w', 1200).immediate.find((t) => t.side === 'student' && t.type === 'back_rank');
    const concept = conceptForBoard(c.fen(), { studentSide: 'white', rating: 1200, max: 3 }).find((k) => k.source === 'tactic');
    expect(tactic).toBeDefined();
    expect(concept).toBeDefined();
    expect(conceptInstanceKey(concept!.id, concept!.squares)).toBe(conceptInstanceKey(tactic!.type, tactic!.squares));
  });
  it('NEGATIVE CONTROL: a different geometry keys differently', () => {
    expect(conceptInstanceKey('back_rank', ['g8', 'd8', 'd1'])).not.toBe(conceptInstanceKey('back_rank', ['g8', 'e8', 'e1']));
  });
});

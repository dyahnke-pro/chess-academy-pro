/**
 * ONE RULE FOR A LOOSE PIECE (#4, 2026-10-20). `loose:<sq>` dropped a repeat
 * on a later turn, while positionFacts' must-defend kept its own per-board key
 * so a piece STILL hanging could say so again — two rules for one fact. Now:
 * one warning within a turn and its waves; if the student moved and left the
 * piece loose, it is said once more in its "still" form under its own key,
 * and never again that spell. g1 13.Rad1 Ng4 → 14 (the tactic said) → 15.
 */
import { describe, it, expect } from 'vitest';
import { buildTacticsLiveContext } from './liveTacticsContext';
import { computePositionFacts } from './positionFacts';
import { conceptInstanceKey, looseClaim, nextLooseSpells, plyOfFen, type LooseSpells } from './conceptKey';
import { decideTurn, spokenSentenceKeys, type LaneInput } from './learnTurnDoor';
import { hangingPieceLine } from './learnBoardTeaching';
import { NO_PROOF } from './proof';
import { NAMES_NO_MOVE } from './studentMoveNaming';

const G1_14 = 'r1b1kr2/pp2p1bp/2np2p1/q5N1/4PBn1/1QN5/PP3PPP/3RR1K1 w - - 10 14';
const G1_15 = 'r1b1kr2/pp2p1bp/2np2p1/3R2N1/1q2PBn1/1QN5/PP3PPP/4R1K1 w - - 12 15';
const mine = (fen: string): Array<{ square: string; piece: string }> =>
  buildTacticsLiveContext(fen, null, 'w', 1500).hanging.filter((h) => h.color === 'w').map((h) => ({ square: h.square, piece: h.piece }));
const threat = (fen: string, spells: LooseSpells): LaneInput => {
  const c = looseClaim('f4', plyOfFen(fen), spells);
  return { lane: 'threat', text: hangingPieceLine('b', 'f4', 0, c.still), fen, squares: ['f4'], claims: [c.key], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE };
};
const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
const flat = { topLines: [line(1, 20), line(2, 15), line(3, 10)], evaluation: 20, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 420, draw: 400, loss: 180 } };

describe('g1 14/15 — the bishop on f4', () => {
  const s14 = nextLooseSpells(new Map(), mine(G1_14), plyOfFen(G1_14));
  const s15 = nextLooseSpells(s14, mine(G1_15), plyOfFen(G1_15));

  it('14: the tactic says it; the threat line on the same turn is the same claim', () => {
    const c = looseClaim('f4', plyOfFen(G1_14), s14);
    expect(c.still).toBe(false);
    const tactic: LaneInput = { lane: 'tactic', text: 'Danger — a whole piece is at stake: your bishop on f4 is the only defender of your knight on g5 — and it can be taken.', fen: G1_14, squares: ['f4', 'g5'], claims: [conceptInstanceKey('removal_of_guard', ['f4', 'g5']), c.key], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE };
    const d = decideTurn([tactic, threat(G1_14, s14)]);
    // One warning: whichever the door ranks first, the other is the same claim.
    expect(d.spoke.filter((l) => l === 'tactic' || l === 'threat')).toHaveLength(1);
  });

  it('15: still loose after the student moved — the "still" line speaks once', () => {
    const d14 = decideTurn([{ lane: 'tactic', text: 'Danger — a whole piece is at stake: your bishop on f4 is the only defender of your knight on g5 — and it can be taken.', fen: G1_14, squares: ['f4', 'g5'], claims: [looseClaim('f4', plyOfFen(G1_14), s14).key], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE }]);
    const ledger = new Set(spokenSentenceKeys(d14.pkg));
    const d15 = decideTurn([threat(G1_15, s15)], '', ledger);
    expect(d15.pkg.spoken).toBe('Your bishop on f4 is still hanging — nothing guards it yet.');
    for (const k of spokenSentenceKeys(d15.pkg)) ledger.add(k);
    // …and only once: the next turn, still loose, says nothing of it.
    const p17 = plyOfFen(G1_15) + 2;
    const s17 = nextLooseSpells(s15, [{ square: 'f4', piece: 'b' }], p17);
    const c17 = looseClaim('f4', p17, s17);
    expect(c17.key).toBe(looseClaim('f4', plyOfFen(G1_15), s15).key);
    const d17 = decideTurn([{ ...threat(G1_15, s15), claims: [c17.key] }], '', ledger);
    expect(d17.pkg.spoken).toBe('');
  });

  it('15: positionFacts\' must-defend is on the same key, in the same "still" form', async () => {
    const r = await computePositionFacts({ boardComputers: 'surface', posture: 'walk', fen: G1_15, moverColor: 'w', studentColor: 'w', analysis: flat, looseSpells: s15 });
    const must = r.clauses.find((c) => c.kind === 'must-defend' && c.squares?.includes('f4'));
    expect(must?.claim).toBe(looseClaim('f4', plyOfFen(G1_15), s15).key);
    expect(must?.text).toMatch(/^Still — /);
  });

  it('a piece that stops being loose ends its spell: loose again later, it is a fresh warning', () => {
    const gone = nextLooseSpells(s15, [], plyOfFen(G1_15) + 2);
    const back = nextLooseSpells(gone, [{ square: 'f4', piece: 'b' }], plyOfFen(G1_15) + 4);
    const c = looseClaim('f4', plyOfFen(G1_15) + 4, back);
    expect(c.still).toBe(false);
    expect(c.key).not.toBe(looseClaim('f4', plyOfFen(G1_14), s14).key);
  });
});

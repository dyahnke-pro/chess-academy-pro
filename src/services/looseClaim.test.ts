// OS-11 #3: a loose piece said three times in two turns (g1 13.Rad1 Ng4 →
// 14.Rd5 Qb4). The tactic warning's proof, the danger stake and the hanging
// line state one fact — the bishop on f4 attacked and unguarded — and now carry
// one claim, `loose:f4`, computed by the one exchange computer.
import { describe, it, expect } from 'vitest';
import { detectTactics } from './tacticsDetector';
import { looseClaims } from './threatProof';
import { looseKey } from './conceptKey';
import { readBoard } from './boardComputers';

const TURN1 = 'r1b1kr2/pp2p1bp/2np2p1/q5N1/4PBn1/1QN5/PP3PPP/3RR1K1 w - - 10 14';
const TURN2 = 'r1b1kr2/pp2p1bp/2np2p1/3R2N1/1q2PBn1/1QN5/PP3PPP/4R1K1 w - - 12 15';

describe('one loose-piece claim across the turns (g1 f4)', () => {
  it('the warning on turn one claims loose:f4 from the tactic\'s own squares', () => {
    const t = detectTactics(TURN1).tactics.find((x) => x.involvedSquares.includes('f4') && x.involvedSquares.includes('g5'));
    expect(t).toBeDefined();
    expect(looseClaims(TURN1, 'w', t!.involvedSquares)).toContain(looseKey('f4'));
  });
  it('the hanging line on turn two claims the same key, so the ledger drops it', () => {
    expect(looseClaims(TURN2, 'w', ['f4'])).toEqual([looseKey('f4')]);
  });
  it('the threat warning carries it through the one threat-cost computer', () => {
    const r = readBoard('threatCost', { line: 'Their knight on g5 attacks your bishop on f4.', fen: TURN2, student: 'w', squares: ['f4', 'g5'] });
    expect(r?.claims).toContain(looseKey('f4'));
  });
  it('NEGATIVE CONTROL: a guarded piece is not loose', () => {
    expect(looseClaims(TURN2, 'w', ['g5', 'c3'])).toEqual([]);
  });
});

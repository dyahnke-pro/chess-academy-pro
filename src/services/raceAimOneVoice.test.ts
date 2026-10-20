// OS-11 item 6a / lead call 3b: the opposite-wings race and the plan thread's
// king-attack plan are one plan. The race carries the plan's aim key, so when
// both fire on one turn the door keeps one.
import { describe, it, expect } from 'vitest';
import { computePositionFacts, clauseClaims } from './positionFacts';
import { planAimKey } from './nextPlans';
import { decideTurn } from './learnTurnDoor';
import { NAMES_NO_MOVE } from './learnBoardTeaching';
import { NO_PROOF } from './proof';

const G2 = 'rn1q1rk1/1p2bppp/3pbn2/pB2p3/4P3/1NN1BP2/PPPQ2PP/2KR3R b - - 1 11';

describe('the race and the king-attack plan speak once', () => {
  it('the race claims plan-aim:king-attack, and beside the plan only one of them speaks', async () => {
    const analysis = { evaluation: 0, bestMove: 'a6', depth: 12, topLines: [{ rank: 1, moves: ['a8a6'], evaluation: 0, mate: null }], nodesPerSecond: 0 } as unknown as Parameters<typeof computePositionFacts>[0]['analysis'];
    const pf = await computePositionFacts({ boardComputers: 'surface', posture: 'walk', fen: G2, moverColor: 'b', studentColor: 'b', analysis, teachingBeat: true });
    const i = pf.clauses.findIndex((c) => c.kind === 'king-read' && /opposite wings/.test(c.text));
    expect(i).toBeGreaterThanOrEqual(0);
    const raceClaims = clauseClaims(pf, i, G2);
    const aim = planAimKey('king-attack', null) as string;
    expect(raceClaims).toContain(aim);
    const d = decideTurn([
      { lane: 'positionFacts', namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.description, text: pf.clauses[i].text, fen: G2, squares: ['g8', 'c1'], claims: raceClaims },
      { lane: 'planArc', namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.description, text: 'The plan from here is to attack their king on the queenside with your pawns.', fen: G2, squares: ['c1'], claims: ['plan:student:struct:king-attack:22', aim] },
    ]);
    expect(d.spoke.filter((l) => l === 'positionFacts' || l === 'planArc')).toHaveLength(1);
  });
});

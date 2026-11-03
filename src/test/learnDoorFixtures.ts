// LEARN FACTS AS A TEST WRITES THEM (WO-STORY-MATRIX-01 P1-6e). A Learn
// producer makes its fact with the one maker (`learnFact`) and answers on it
// the computer that made it and whether it names a move the student has yet
// to find. A test fixture names only what it is about: these helpers answer
// the rest the way a producer does — the moves it names are answered on the
// board (`namesPlayableStudentMove`), a fixture with no computer of its own is
// one of the page's own reads (`learnFact`), and each fact is numbered for
// its door call, as the page numbers its waves.
import {
  decidePhaseWave as decidePhaseWaveOf,
  decideTurn as decideTurnOf,
  learnFact,
  type LaneFact,
  type LearnFactParts,
} from '../services/learnTurnDoor';
import { namesPlayableStudentMove, type NamesStudentMove } from '../services/studentMoveNaming';
import { FACT_ROLE } from '../services/reviewFacetRank';
import type { ComputerName } from '../services/coachFact';
import type { FactStakes } from '../services/factStakes';

/** A Learn fact as a test writes it. */
export type LaneFixture = Omit<LearnFactParts, 'computer' | 'namesStudentMove' | 'stakes'> & {
  id?: string;
  computer?: ComputerName;
  namesStudentMove: NamesStudentMove | boolean;
  stakes?: FactStakes | null;
};

/** A phase report's fact as a test writes it: on the report's board unless
 *  it names its own (`gradeFen`). */
export type PhaseFixture = Omit<LaneFixture, 'lane' | 'fen'> & { gradeFen?: string };

function made(id: string, x: LaneFixture): LaneFact {
  const { id: _id, computer, namesStudentMove, stakes, ...rest } = x;
  return learnFact(id, {
    ...rest,
    computer: computer ?? 'learnFact',
    namesStudentMove: typeof namesStudentMove === 'boolean' ? namesStudentMove : namesPlayableStudentMove(namesStudentMove),
    ...(stakes ? { stakes } : {}),
  });
}

/** The fixtures as the facts a producer hands the door. */
export function laneFacts(xs: readonly LaneFixture[]): LaneFact[] {
  return xs.map((x, i) => made(x.id ?? `lane:${i}`, x));
}

/** The phase report's fixtures as the facts the phase producer makes: lane
 *  `phase`, the role its kind teaches (`FACT_ROLE`). */
export function phaseFacts(xs: readonly PhaseFixture[], readFen: string): LaneFact[] {
  return xs.map((x, i) => {
    const { gradeFen, ...rest } = x;
    return made(x.id ?? `phase:${i}`, {
      ...rest,
      lane: 'phase',
      fen: gradeFen ?? readFen,
      ...(x.factKind && x.factKind in FACT_ROLE ? { role: FACT_ROLE[x.factKind as keyof typeof FACT_ROLE] } : {}),
    });
  });
}

type TurnRest = Parameters<typeof decideTurnOf> extends [unknown, ...infer R] ? R : never;
type PhaseRest = Parameters<typeof decidePhaseWaveOf> extends [unknown, unknown, ...infer R] ? R : never;

/** `decideTurn` over fixtures. */
export function decideTurn(xs: readonly LaneFixture[], ...rest: TurnRest): ReturnType<typeof decideTurnOf> {
  return decideTurnOf(laneFacts(xs), ...rest);
}

/** `decidePhaseWave` over fixtures. */
export function decidePhaseWave(xs: readonly PhaseFixture[], readFen: string, ...rest: PhaseRest): ReturnType<typeof decidePhaseWaveOf> {
  return decidePhaseWaveOf(phaseFacts(xs, readFen), readFen, ...rest);
}

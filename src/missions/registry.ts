/**
 * THE MISSION REGISTRY — every card, in a `Record<MissionId, MissionCard>`, so
 * a new mission id fails to compile until it has a card. A card is data plus
 * one pure check; the runner (`missionRunner`) plays any of them. A card
 * without check tests does not ship (`registry.test.ts`).
 */
import {
  checkDevelopAndCastle,
  developAndCastleProgress,
  developAndCastleShowMove,
} from './checks/developAndCastle';
import type { MissionCard, MissionId, MissionOutcome, MissionPhase } from './missionCard';

export const MISSIONS: Record<MissionId, MissionCard> = {
  'develop-and-castle': {
    id: 'develop-and-castle',
    level: 1,
    phase: 'opening',
    title: 'Develop & Castle',
    announce: "Today's mission: get every knight and bishop out once, then castle.",
    check: checkDevelopAndCastle,
    progress: developAndCastleProgress,
    showMove: developAndCastleShowMove,
    missPhrase: 'One move per piece — bring out a new one.',
    passLine: 'Mission complete — every piece out and your king is safe!',
    coachDials: { attacksOnPieces: 'off', plannedTrap: 'off' },
    unlock: { after: [] },
    graduate: { firstTryPasses: 3 },
    closesAtMove: 15,
    checkModule: 'developAndCastle',
  },
};

/** The order missions are taught in, within a phase. */
const ORDER: readonly MissionId[] = ['develop-and-castle'];

/** The card this phase teaches, given the student's record: the first card
 *  whose prerequisites are graduated and which is not graduated itself. The
 *  RECORD decides, never a rating. With every card graduated the last one
 *  stays live (silent watchers are a later step). */
export function missionForPhase(
  phase: MissionPhase,
  record: ReadonlyArray<{ missionId: MissionId; outcome: MissionOutcome }>,
): MissionCard | null {
  const firstTry = new Map<string, number>();
  for (const r of record) if (r.outcome === 'pass-first-try') firstTry.set(r.missionId, (firstTry.get(r.missionId) ?? 0) + 1);
  const graduated = (id: MissionId): boolean => (firstTry.get(id) ?? 0) >= MISSIONS[id].graduate.firstTryPasses;
  const inPhase = ORDER.map((id) => MISSIONS[id]).filter((c) => c.phase === phase);
  const open = inPhase.find((c) => c.unlock.after.every(graduated) && !graduated(c.id));
  if (open) return open;
  return inPhase.length > 0 ? inPhase[inPhase.length - 1] : null;
}

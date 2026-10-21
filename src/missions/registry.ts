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
import {
  FREE_PIECE_CLOSES_AT_MOVE,
  checkFreePieceStayAhead,
  freePieceStayAheadProgress,
  freePieceStayAheadShowMove,
} from './checks/freePieceStayAhead';
import type { CoachDials, MissionCard, MissionId, MissionOutcome, MissionPhase } from './missionCard';

/** Level 1's coach: attacks on, no planned trap, no plant, normal trades,
 *  every miss rewound, the student's own strength, no steering. A card states
 *  only what it changes. */
export const LEVEL_1_DIALS: CoachDials = {
  attacksOnPieces: 'on',
  plannedTrap: 'off',
  plantFreePiece: 'off',
  trades: 'normal',
  rewinds: 'every-miss',
  strengthOffset: 0,
  steer: 'off',
};

export const MISSIONS: Record<MissionId, MissionCard> = {
  'develop-and-castle': {
    id: 'develop-and-castle',
    level: 1,
    phase: 'opening',
    title: 'Develop & Castle',
    announce: "Today's mission: develop each knight and bishop by moving it only once, then castle.",
    check: checkDevelopAndCastle,
    progress: developAndCastleProgress,
    showMove: developAndCastleShowMove,
    missPhrase: 'One move per piece — bring out a new one.',
    passLine: 'Mission complete — every piece out and your king is safe!',
    coachDials: { ...LEVEL_1_DIALS, attacksOnPieces: 'off' },
    unlock: { after: [] },
    graduate: { firstTryPasses: 3 },
    closesAtMove: 15,
    checkModule: 'developAndCastle',
    classification: 'live',
    arrivalBar: 0.95,
  },
  'free-piece-stay-ahead': {
    id: 'free-piece-stay-ahead',
    level: 1,
    phase: 'middlegame',
    title: 'Take the free piece',
    announce: 'Middlegame mission: win material, then stay ahead.',
    check: checkFreePieceStayAhead,
    progress: freePieceStayAheadProgress,
    showMove: freePieceStayAheadShowMove,
    missPhrase: "There's a win on the board — find it.",
    missPhraseFor: {
      'missed-free-piece': "There's a win on the board — find it.",
      'gave-back-material': "You're ahead — keep every piece safe.",
    },
    passLine: 'Mission complete — you won material and kept it!',
    coachDials: { ...LEVEL_1_DIALS, plantFreePiece: 'on' },
    // Level 1's phases run together; each graduates on its own.
    unlock: { after: [] },
    graduate: { firstTryPasses: 3 },
    closesAtMove: FREE_PIECE_CLOSES_AT_MOVE,
    checkModule: 'freePieceStayAhead',
    classification: 'live',
    arrivalBar: 0.8,
    pattern: 'free-piece',
  },
};

/** The phases of a game, in order — one card each. */
export const PHASE_ORDER: readonly MissionPhase[] = ['opening', 'middlegame', 'endgame'];

/** The order missions are taught in, within a phase. */
const ORDER: readonly MissionId[] = ['develop-and-castle', 'free-piece-stay-ahead'];

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

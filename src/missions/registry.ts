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
import {
  KQ_MATE_BRIEFING,
  KQ_MATE_CLOSES_AFTER_MOVES,
  checkKqMate,
  kqMateProgress,
  kqMateShowMove,
} from './checks/kqMate';
import type { CoachDials, MissionCard, MissionId, MissionPhase, MissionResultRecord } from './missionCard';
import { STRENGTH_RUNG } from './ladder';
import { cardProgress, type CardProgress } from './progression';

/** Level 1's coach: attacks on, no planned trap, no plant, normal trades,
 *  every miss rewound, the student's own strength, no steering. A card states
 *  only what it changes. */
export const LEVEL_1_DIALS: CoachDials = {
  attacksOnPieces: 'on',
  plannedTrap: 'off',
  plantFreePiece: 'off',
  plantDepth: 1,
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
    skill: 'development',
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
    // The record deepens the shot before the coach plays stronger (§6a): one
    // key move, then two, then three — and only then the coach's strength.
    ladder: [
      { dial: 'plantDepth', values: [1, 2, 3] },
      STRENGTH_RUNG,
    ],
    // Level 1's phases run together; each graduates on its own.
    unlock: { after: [] },
    graduate: { firstTryPasses: 3 },
    closesAtMove: FREE_PIECE_CLOSES_AT_MOVE,
    checkModule: 'freePieceStayAhead',
    classification: 'live',
    skill: 'threats',
    arrivalBar: 0.8,
    pattern: 'free-piece',
  },
  'kq-mate': {
    id: 'kq-mate',
    level: 1,
    phase: 'endgame',
    title: 'King and queen mate',
    announce: 'Endgame mission: checkmate with king and queen.',
    check: checkKqMate,
    progress: kqMateProgress,
    showMove: kqMateShowMove,
    missPhrase: 'Leave their king a square.',
    missPhraseFor: {
      stalemate: 'Leave their king a square.',
      'lost-the-queen': 'Keep your queen safe — it does the work.',
    },
    passLine: 'Checkmate — mission complete!',
    coachDials: { ...LEVEL_1_DIALS },
    unlock: { after: [] },
    graduate: { firstTryPasses: 3 },
    // A scenario phase starts at an unknown move: it closes 40 student moves in.
    closesAfterMoves: KQ_MATE_CLOSES_AFTER_MOVES,
    checkModule: 'kqMate',
    classification: 'live',
    skill: 'endgames',
    arrivalBar: 0.95,
    scenario: { providerId: 'kq-vs-k' },
    briefing: KQ_MATE_BRIEFING,
  },
};

/** The phases of a game, in order — one card each. */
export const PHASE_ORDER: readonly MissionPhase[] = ['opening', 'middlegame', 'endgame'];

/** The rows selection reads: one per mission per game. */
export type MissionRecordRow = Pick<MissionResultRecord, 'missionId' | 'outcome' | 'at' | 'harder'> & { watcher?: boolean };

/** The order missions are taught in: by level, then as the registry lists
 *  them (an appended card needs no second list). */
export function inTeachingOrder(phase: MissionPhase, cards: Readonly<Record<string, MissionCard>> = MISSIONS): MissionCard[] {
  return Object.values(cards)
    .map((card, i) => ({ card, i }))
    .filter(({ card }) => card.phase === phase)
    .sort((a, b) => a.card.level - b.card.level || a.i - b.i)
    .map(({ card }) => card);
}

export function progressOf(record: readonly MissionRecordRow[]): (card: MissionCard) => CardProgress {
  const byCard = new Map<MissionId, MissionRecordRow[]>();
  for (const r of record) byCard.set(r.missionId, [...(byCard.get(r.missionId) ?? []), r]);
  const cache = new Map<MissionId, CardProgress>();
  return (card) => {
    const hit = cache.get(card.id);
    if (hit) return hit;
    const p = cardProgress(card, byCard.get(card.id) ?? []);
    cache.set(card.id, p);
    return p;
  };
}

/**
 * The card this phase teaches next game, from the student's RECORD (never a
 * rating): a REACTIVATED habit first; else the first card in teaching order
 * that is not graduated and whose prerequisites have graduated — and when it
 * has siblings, the least-practised of its slot. Null when every card of the
 * phase has graduated: the phase is then only watched.
 */
export function missionForPhase(
  phase: MissionPhase,
  record: readonly MissionRecordRow[],
  source: Readonly<Record<string, MissionCard>> = MISSIONS,
): MissionCard | null {
  const progress = progressOf(record);
  const cards = inTeachingOrder(phase, source);
  const byId = (id: MissionId): MissionCard => source[id] ?? MISSIONS[id];
  const back = cards.find((c) => progress(c).status === 'reactivated');
  if (back) return back;
  const unlocked = (c: MissionCard): boolean => c.unlock.after.every((id) => progress(byId(id)).everGraduated);
  const open = (c: MissionCard): boolean => progress(c).status !== 'graduated' && unlocked(c);
  const first = cards.find(open);
  if (!first) return null;
  const slot = [first, ...(first.siblings ?? []).map(byId)].filter((c) => c.phase === phase && open(c));
  return slot.reduce((best, c) => (progress(c).activeGames < progress(best).activeGames ? c : best), slot[0]);
}

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
  freePieceFoundAt,
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
import {
  WRONG_ROOK_PAWN_BRIEFING,
  WRONG_ROOK_PAWN_CLOSES_AFTER_MOVES,
  checkWrongRookPawn,
  wrongRookPawnProgress,
  wrongRookPawnShowMove,
} from './checks/wrongRookPawn';
import {
  ROOK_CUT_OFF_BRIEFING,
  ROOK_CUT_OFF_CLOSES_AFTER_MOVES,
  checkRookCutOff,
  rookCutOffProgress,
  rookCutOffShowMove,
} from './checks/rookCutOff';
import {
  KP_OUTFLANKING_BRIEFING,
  KP_OUTFLANKING_CLOSES_AFTER_MOVES,
  checkKpOutflanking,
  kpOutflankingFoundAt,
  kpOutflankingProgress,
  kpOutflankingShowMove,
} from './checks/kpOutflanking';
import {
  KP_TRIANGULATION_BRIEFING,
  KP_TRIANGULATION_CLOSES_AFTER_MOVES,
  checkKpTriangulation,
  kpTriangulationFoundAt,
  kpTriangulationProgress,
  kpTriangulationShowMove,
} from './checks/kpTriangulation';
import type { CoachDials, MissionCard, MissionId, MissionPhase, MissionResultRecord } from './missionCard';
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
    // The find is the pass (no earlier moment to pay).
    foundAt: null,
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
    title: 'Tactically win an extra piece',
    announce: 'Middlegame mission: tactically win an extra piece, then maintain the advantage to the end.',
    check: checkFreePieceStayAhead,
    progress: freePieceStayAheadProgress,
    showMove: freePieceStayAheadShowMove,
    missPhrase: "There's a win on the board — find it.",
    missPhraseFor: {
      'missed-free-piece': "There's a win on the board — find it.",
      'gave-back-material': "You're ahead — keep every piece safe.",
    },
    passLine: 'Mission complete — you won an extra piece and maintained the advantage!',
    // Winning the extra piece pays at once; keeping it pays at the pass.
    foundAt: freePieceFoundAt,
    coachDials: { ...LEVEL_1_DIALS, plantFreePiece: 'on' },
    // The record makes the SHOT harder, never the coach (§6a; David
    // 2026-10-21: "not the level of the coach, but the slip becomes more
    // subtle … the focus gets harder to find, but is still there each game"):
    // one key move, then two, then three.
    ladder: [{ dial: 'plantDepth', values: [1, 2, 3] }],
    // Level 1's phases run together; each graduates on its own.
    unlock: { after: [] },
    graduate: { firstTryPasses: 3 },
    closesAtMove: FREE_PIECE_CLOSES_AT_MOVE,
    checkModule: 'freePieceStayAhead',
    classification: 'live',
    skill: 'threats',
    // Every game (David 2026-10-21) — a card that teaches the slip must offer one.
    arrivalBar: 1,
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
    // The find is the pass (no earlier moment to pay).
    foundAt: null,
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
  'wrong-rook-pawn': {
    id: 'wrong-rook-pawn',
    level: 22,
    phase: 'endgame',
    title: 'Wrong rook pawn',
    announce: "Endgame mission: their bishop can't cover the corner — get your king there and it's a draw.",
    check: checkWrongRookPawn,
    progress: wrongRookPawnProgress,
    showMove: wrongRookPawnShowMove,
    missPhrase: 'Race your king to the corner in front of their pawn.',
    passLine: "Your king is in the corner — that's a draw. Mission complete!",
    // The find is the pass (no earlier moment to pay).
    foundAt: null,
    coachDials: { ...LEVEL_1_DIALS },
    unlock: { after: [] },
    graduate: { firstTryPasses: 4 },
    // A scenario phase starts at an unknown move: it closes 12 student moves in.
    closesAfterMoves: WRONG_ROOK_PAWN_CLOSES_AFTER_MOVES,
    checkModule: 'wrongRookPawn',
    classification: 'live',
    skill: 'endgames',
    arrivalBar: 0.95,
    scenario: { providerId: 'wrong-rook-pawn' },
    briefing: WRONG_ROOK_PAWN_BRIEFING,
  },
  'rook-cut-off': {
    id: 'rook-cut-off',
    level: 24,
    phase: 'endgame',
    title: 'Cut the king off',
    announce: 'Endgame mission: before you push your pawn, cut their king off with your rook.',
    check: checkRookCutOff,
    progress: rookCutOffProgress,
    showMove: rookCutOffShowMove,
    missPhrase: 'Cut their king off with your rook first.',
    missPhraseFor: {
      'pushed-before-the-cut': 'Not yet — cut their king off with your rook first.',
      'king-not-cut-off': 'Cut their king off with your rook first.',
    },
    passLine: 'Their king is cut off — mission complete!',
    // The find is the pass (no earlier moment to pay).
    foundAt: null,
    coachDials: { ...LEVEL_1_DIALS },
    unlock: { after: [] },
    graduate: { firstTryPasses: 4 },
    // The decision is the first move; this only closes a board off the library.
    closesAfterMoves: ROOK_CUT_OFF_CLOSES_AFTER_MOVES,
    checkModule: 'rookCutOff',
    classification: 'live',
    skill: 'endgames',
    arrivalBar: 0.95,
    scenario: { providerId: 'rook-cut-off' },
    briefing: ROOK_CUT_OFF_BRIEFING,
  },
  'kp-outflanking': {
    id: 'kp-outflanking',
    level: 19,
    phase: 'endgame',
    title: 'Outflanking',
    announce: 'Endgame mission: the kings face each other — go around their king and queen your pawn.',
    check: checkKpOutflanking,
    progress: kpOutflankingProgress,
    showMove: kpOutflankingShowMove,
    missPhrase: 'Go around their king, not into it.',
    missPhraseFor: {
      'faced-the-king': 'Go around their king, not into it.',
      'kp-win-slipped': 'That lets them hold the draw.',
    },
    passLine: 'Pawn queened — you went around their king. Mission complete!',
    // The sidestep that wins pays at once; the queen pays at the pass.
    foundAt: kpOutflankingFoundAt,
    coachDials: { ...LEVEL_1_DIALS },
    unlock: { after: [] },
    graduate: { firstTryPasses: 4 },
    // A scenario phase starts at an unknown move: it closes 40 student moves in.
    closesAfterMoves: KP_OUTFLANKING_CLOSES_AFTER_MOVES,
    checkModule: 'kpOutflanking',
    classification: 'live',
    skill: 'endgames',
    // The scenario puts the decision on the board by construction.
    arrivalBar: 0.95,
    scenario: { providerId: 'kp-outflanking' },
    briefing: KP_OUTFLANKING_BRIEFING,
  },
  'kp-triangulation': {
    id: 'kp-triangulation',
    level: 21,
    phase: 'endgame',
    title: 'Triangulation',
    announce: 'Endgame mission: hand them the move — walk your king around a triangle, then break through.',
    check: checkKpTriangulation,
    progress: kpTriangulationProgress,
    showMove: kpTriangulationShowMove,
    missPhrase: 'Make them move — walk your king around a triangle.',
    missPhraseFor: {
      'no-triangle': 'Make them move — walk your king around a triangle.',
      'kp-win-slipped': 'That lets them hold the draw.',
    },
    passLine: 'They had to give way — you broke through. Mission complete!',
    // The king home with the move handed over pays at once; the break passes.
    foundAt: kpTriangulationFoundAt,
    coachDials: { ...LEVEL_1_DIALS },
    unlock: { after: [] },
    graduate: { firstTryPasses: 4 },
    // A scenario phase starts at an unknown move: it closes 40 student moves in.
    closesAfterMoves: KP_TRIANGULATION_CLOSES_AFTER_MOVES,
    checkModule: 'kpTriangulation',
    classification: 'live',
    skill: 'endgames',
    // The scenario puts the decision on the board by construction.
    arrivalBar: 0.95,
    scenario: { providerId: 'kp-triangulation' },
    briefing: KP_TRIANGULATION_BRIEFING,
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

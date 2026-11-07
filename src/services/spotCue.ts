/**
 * WHICH WAY TO SPOT IT FITS THIS BOARD (David 2026-11-07: "a sentence as to
 * how to spot it in the future … something specific" → "add all ways to
 * spot. Use data gathered from trusted sources"). `SPOT_CUES` holds every way
 * the sources teach; this decides which one this board shows.
 *
 * 🔒 ONE ANSWER PER CUE (`SPOT_RULES`, checked against the data by
 * `spotCue.test.ts`): a board test (said only when the board shows it), a
 * habit for one seat (true of any board of the motif), or `unread` — no
 * computer can see it yet, so it is never said. A cue said on the wrong board
 * would teach the wrong picture; silence is better than that.
 *
 * The seat: `yours` is a tactic the student had (a shot, a puzzle); `theirs`
 * is one played against them (the defend cues). The order inside a motif is
 * the order of specificity: the first board test that holds wins; with none,
 * the seat's habits take turns, keyed on the board so a position always gets
 * the same line.
 */
import { MOTIF_OF_TACTIC, type MotifId } from '../data/tacticMotifs';
import type { TacticType } from '../types';
import { SPOT_CUES } from '../data/spotCues';
import { spotFacts, type SpotBoard, type SpotFacts, type SpotPiece } from './spotFacts';

export type SpotSeat = 'yours' | 'theirs';

export type SpotRule =
  | { seat: SpotSeat; test: (f: SpotFacts) => boolean }
  | { seat: SpotSeat; habit: true }
  | 'unread';

const yours = (test: (f: SpotFacts) => boolean): SpotRule => ({ seat: 'yours', test });
const HABIT: SpotRule = { seat: 'yours', habit: true };
const THEIRS: SpotRule = { seat: 'theirs', habit: true };

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const hit = (f: SpotFacts, t: string): boolean => f.hits.some((h) => h.type === t);
const forks = (f: SpotFacts): boolean => f.hits.length >= 2;
const pawnEnding = (f: SpotFacts): boolean => f.material.mover.length === 0 && f.material.them.length === 0;
const only = (pieces: readonly string[], t: string): boolean => pieces.length > 0 && pieces.every((p) => p === t);
const target = (f: SpotFacts): SpotPiece | undefined => f.hits.find((h) => h.type !== 'k');
const inMoverHalf = (f: SpotFacts, sq: string): boolean => (f.by === 'w' ? Number(sq[1]) <= 4 : Number(sq[1]) >= 5);
const onRim = (sq: string): boolean => 'ah'.includes(sq[0]) || '18'.includes(sq[1]);
const isMate = (f: SpotFacts, ...ids: string[]): boolean => !!f.mate && ids.includes(f.mate);

/** Every cue's answer, keyed exactly as `SPOT_CUES`, in order of specificity. */
export const SPOT_RULES: Record<MotifId, Record<string, SpotRule>> = {
  'free-piece': {
    'highest-value': yours((f) => f.freeBefore >= 2),
    'false-guard': yours((f) => !!f.captured && f.capturedGuarded && f.guardPinned),
    'attacked-by-smaller': yours((f) => !!f.captured && f.capturedGuarded && 'pnb'.includes(f.piece) && VALUE[f.captured] > VALUE[f.piece]),
    underdefended: yours((f) => !!f.captured && f.capturedGuarded && f.attackersOnCaptured > f.guardsOnCaptured),
    // The free piece comes at the END of the line, not as its first move.
    'after-forcing-line': yours((f) => f.plies >= 3 && !(f.captured && !f.capturedGuarded)),
    loose: 'unread',
    'landing-square': THEIRS,
    'attacked-yours': THEIRS,
    general: HABIT,
  },
  fork: {
    family: yours((f) => hit(f, 'k') && hit(f, 'q') && hit(f, 'r')),
    royal: yours((f) => hit(f, 'k') && hit(f, 'q')),
    'knight-king-rook': yours((f) => f.piece === 'n' && hit(f, 'k') && f.hits.some((h) => h.type === 'r' && ['a1', 'h1', 'a8', 'h8'].includes(h.square))),
    check: yours((f) => f.check === 'direct' && forks(f)),
    knight: yours((f) => f.piece === 'n' && forks(f)),
    pawn: yours((f) => f.piece === 'p' && forks(f)),
    queen: yours((f) => f.piece === 'q' && forks(f) && (f.hitsLoose >= 2 || (hit(f, 'k') && f.hitsLoose >= 1))),
    bishop: yours((f) => f.piece === 'b' && forks(f)),
    rook: yours((f) => f.piece === 'r' && forks(f)),
    'loose-pieces': yours((f) => f.hitsLoose >= 2),
    'mate-threat': 'unread',
    'fork-trick': 'unread',
    defend: THEIRS,
    general: HABIT,
  },
  pin: {
    absolute: yours((f) => f.pin === 'absolute'),
    relative: yours((f) => f.pin === 'relative'),
    'pile-on': HABIT,
    situational: HABIT,
    partial: HABIT,
    'pinned-defender': 'unread',
    'cross-pin': 'unread',
    unpin: THEIRS,
    general: HABIT,
  },
  skewer: {
    'queen-vs-rook': yours((f) => only(f.material.mover, 'q') && only(f.material.them, 'r') && !!f.skewer),
    'rook-ending': yours((f) => only(f.material.mover, 'r') && only(f.material.them, 'r') && !!f.skewer),
    bishop: yours((f) => f.piece === 'b' && f.skewer?.kind === 'absolute' && f.skewer.behind === 'q'),
    'rank-file': yours((f) => f.skewer?.kind === 'absolute' && f.skewer.straight && (f.skewer.behind === 'r' || f.skewer.behind === 'q')),
    absolute: yours((f) => f.skewer?.kind === 'absolute'),
    relative: yours((f) => f.skewer?.kind === 'relative' && f.skewer.front === 'q'),
    defend: THEIRS,
    general: HABIT,
  },
  'discovered-attack': {
    'capture-guarded': yours((f) => (f.uncoveredHits.includes('q') || f.uncoveredHits.includes('k')) && !!f.captured && f.capturedGuarded),
    check: yours((f) => f.check === 'discovered'),
    attack: yours((f) => f.uncovers && f.hits.length >= 1),
    'mate-threat': 'unread',
    battery: HABIT,
    defend: THEIRS,
    general: HABIT,
  },
  'discovered-check': {
    'double-check': yours((f) => f.check === 'double'),
    'queen-target': yours((f) => f.check === 'discovered' && hit(f, 'q')),
    'free-move': yours((f) => f.check === 'discovered' && !!f.captured),
    windmill: 'unread',
    sacrifice: 'unread',
    defend: THEIRS,
    general: HABIT,
  },
  'x-ray': {
    'back-rank': yours((f) => isMate(f, 'back-rank-mate')),
    attack: HABIT,
    'queen-line': HABIT,
    'false-guard': 'unread',
    battery: 'unread',
    defend: THEIRS,
    general: HABIT,
  },
  mate: {
    'smothered-sacrifice': yours((f) => isMate(f, 'smothered-mate') && f.piece === 'q' && f.plies >= 3),
    smothered: yours((f) => isMate(f, 'smothered-mate')),
    'back-rank-guard': yours((f) => isMate(f, 'back-rank-mate') && f.plies >= 3),
    'back-rank': yours((f) => isMate(f, 'back-rank-mate')),
    anastasia: yours((f) => isMate(f, 'anastasias-mate')),
    arabian: yours((f) => isMate(f, 'arabian-mate')),
    boden: yours((f) => isMate(f, 'bodens-mate')),
    'double-bishop': yours((f) => isMate(f, 'double-bishop-mate')),
    epaulette: yours((f) => isMate(f, 'epaulette-mate')),
    dovetail: yours((f) => isMate(f, 'dovetail-mate')),
    hook: yours((f) => isMate(f, 'hook-mate')),
    opera: yours((f) => isMate(f, 'opera-mate')),
    corner: yours((f) => isMate(f, 'corner-mate')),
    'rook-and-bishop': yours((f) => isMate(f, 'morphys-mate', 'pillsburys-mate')),
    'queen-and-pawn': yours((f) => isMate(f, 'lollis-mate')),
    'rooks-seventh': yours((f) => isMate(f, 'blind-swine-mate')),
    'greek-gift': yours((f) => f.piece === 'b' && f.captured === 'p' && f.check === 'direct' && (f.to === 'h7' || f.to === 'h2')),
    'queen-and-king': yours((f) => !!f.mate && only(f.material.mover, 'q') && f.material.them.length === 0),
    'rook-and-king': yours((f) => !!f.mate && only(f.material.mover, 'r') && f.material.them.length === 0),
    ladder: yours((f) => isMate(f, 'two-rook-mate')),
    'weak-pawn-early': 'unread',
    'exposed-king': HABIT,
    luft: THEIRS,
    general: HABIT,
  },
  promotion: {
    'underpromote-knight': yours((f) => f.promotesTo === 'n' && f.knightChecks),
    'underpromote-stalemate': yours((f) => (f.promotesTo === 'r' || f.promotesTo === 'b') && f.queenWouldStalemate),
    'capture-promote': yours((f) => f.capturePromotes),
    'remove-guard': yours((f) => !!f.captured && !!f.promotesTo && f.plies >= 3),
    'deflect-guard': yours((f) => f.check !== 'none' && !!f.promotesTo && f.plies >= 3),
    race: yours((f) => pawnEnding(f)),
    lucena: 'unread',
    'dual-threat': 'unread',
    'advanced-pawn': HABIT,
    defend: THEIRS,
    general: HABIT,
  },
  'double-check': {
    smothered: yours((f) => f.check === 'double' && isMate(f, 'smothered-mate')),
    mate: yours((f) => f.check === 'double' && !!f.mate),
    'discovered-plus-direct': yours((f) => f.check === 'double'),
    'queen-sacrifice': 'unread',
    defend: THEIRS,
    general: HABIT,
  },
  'removing-the-guard': {
    'back-rank': yours((f) => isMate(f, 'back-rank-mate') && !!f.captured),
    'king-cover': yours((f) => !!f.mate && !!f.captured),
    promotion: yours((f) => !!f.promotesTo && !!f.captured),
    capture: yours((f) => !!f.captured),
    'sole-defender': 'unread',
    count: HABIT,
    square: HABIT,
    general: HABIT,
  },
  overload: {
    'back-rank-duty': yours((f) => isMate(f, 'back-rank-mate')),
    'mate-square': yours((f) => !!f.mate),
    'king-endgame': yours((f) => pawnEnding(f)),
    'pinned-guard': 'unread',
    'two-pieces': HABIT,
    'line-duty': HABIT,
    'false-security': HABIT,
    defend: THEIRS,
    general: HABIT,
  },
  deflection: {
    'back-rank': yours((f) => isMate(f, 'back-rank-mate')),
    'attraction-king': yours((f) => f.check === 'direct' && f.kingCanTake && f.plies >= 3),
    check: yours((f) => f.check === 'direct' && f.kingCanTake),
    'endgame-pawn': yours((f) => pawnEnding(f)),
    'guard-of-pawn': HABIT,
    attraction: HABIT,
    overloaded: HABIT,
    line: HABIT,
    general: HABIT,
  },
  zwischenzug: {
    desperado: yours((f) => f.movedWasAttacked && !!f.captured),
    check: yours((f) => f.check !== 'none'),
    threat: yours((f) => f.check === 'none' && f.hits.length > 0),
    chain: HABIT,
    'under-threat': HABIT,
    'their-intermezzo': THEIRS,
    general: HABIT,
  },
  'trapped-piece': {
    'knight-rim': yours((f) => { const t = target(f); return !!t && t.type === 'n' && onRim(t.square); }),
    'queen-greed': yours((f) => { const t = target(f); return !!t && t.type === 'q' && inMoverHalf(f, t.square); }),
    'rook-corner': yours((f) => { const t = target(f); return !!t && t.type === 'r' && ['a1', 'h1', 'a8', 'h8'].includes(t.square); }),
    'bishop-pawn-trap': yours((f) => { const t = target(f); return !!t && t.type === 'b' && 'abgh'.includes(t.square[0]) && inMoverHalf(f, t.square); }),
    overextended: yours((f) => { const t = target(f); return !!t && inMoverHalf(f, t.square); }),
    'end-of-line': HABIT,
    'out-of-play': HABIT,
    desperado: THEIRS,
    'own-greed': THEIRS,
    general: HABIT,
  },
  clearance: {
    pawn: yours((f) => f.piece === 'p' && f.nextMine?.piece === 'n' && f.nextMine.to === f.from),
    tempo: yours((f) => f.check !== 'none' || f.hits.length > 0),
    sacrifice: yours((f) => f.movedEnPrise && !f.captured),
    line: HABIT,
    square: HABIT,
    general: HABIT,
  },
  interference: {
    'king-defense': yours((f) => !!f.mate),
    check: yours((f) => f.check !== 'none'),
    'with-threat': yours((f) => f.hits.length > 0),
    value: HABIT,
    double: 'unread',
    'connected-pieces': 'unread',
    general: HABIT,
  },
};

function lineOf(motif: MotifId, when: string): string {
  const cue = SPOT_CUES[motif].find((c) => c.when === when);
  if (!cue) throw new Error(`spot cue ${motif}/${when} has no line`);
  return cue.line;
}

/** A stable number for a board, so a position always gets the same habit. */
function seedOf(fen: string): number {
  let h = 0;
  for (let i = 0; i < fen.length; i += 1) h = (h * 31 + fen.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface SpotChoice { when: string; line: string; read: 'board' | 'habit' }

/** The way to spot this motif that fits this board, from the seat's side.
 *  Null when the seat has no cue (a motif the sources teach only from the
 *  attacker's side, asked from the defender's). */
export function pickSpotCue(motif: MotifId, seat: SpotSeat, board: SpotBoard | null): SpotChoice | null {
  const rules = SPOT_RULES[motif];
  const facts = seat === 'yours' && board ? spotFacts(board) : null;
  if (facts) {
    for (const [when, rule] of Object.entries(rules)) {
      if (rule !== 'unread' && rule.seat === seat && 'test' in rule && rule.test(facts)) {
        return { when, line: lineOf(motif, when), read: 'board' };
      }
    }
  }
  const habits = Object.entries(rules).filter(([, r]) => r !== 'unread' && r.seat === seat && 'habit' in r).map(([w]) => w);
  if (habits.length === 0) return null;
  const when = habits[seedOf(board?.fen ?? motif) % habits.length];
  return { when, line: lineOf(motif, when), read: 'habit' };
}

/** The line alone. */
export function spotCueLine(motif: MotifId, seat: SpotSeat, board: SpotBoard | null): string | null {
  return pickSpotCue(motif, seat, board)?.line ?? null;
}

/** A mistake puzzle's line: its motif, read off the puzzle's own board and
 *  solution (the student's shot, so the seat is theirs to find). Null for a
 *  sequence with no named motif — empty beats generic. */
export function spotForPuzzle(p: { tacticType?: TacticType | null; fen: string; moves: string }): string | null {
  const m = p.tacticType ? MOTIF_OF_TACTIC[p.tacticType] : null;
  if (!m) return null;
  return spotCueLine(m, 'yours', { fen: p.fen, line: p.moves.split(' ').filter(Boolean) });
}

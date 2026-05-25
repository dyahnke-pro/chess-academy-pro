import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight, PlayableMiddlegameLine } from '../../types';

// Caro-Kann named traps (Black). Hand-authored beat-lessons, DB-grounded +
// chess.js-verified. Warning pattern (playbook §3): show the trap, then snap
// the board back to the avoiding move. Keyed for getCaroTrapsForTab routing.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string; moves: string; say: string; sayShort?: string;
  arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

// The Karpov-line smothered mate (chess.js-verified: Nd6 is checkmate;
// the queen on e2 pins the e7-pawn so it can't recapture). Ngf6 and even
// g6 walk into it; Ndf6 is the only-move fix.
const KARPOV_QE2_MATE: LessonScript = {
  openingId: 'caro-kann',
  title: 'Caro-Kann — Watch out: the Qe2 smothered mate',
  minutes: 4,
  orientation: 'black',
  kind: 'trap',
  beats: [
    b({ id: 'ck-w1', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2',
      say: "In the Karpov line with Nd7, White slips in the quiet-looking Qe2. It seems to do nothing — but the queen now stares straight up the e-file at e7, and a trap is set.",
      sayShort: "Karpov Nd7 — Qe2 eyes e7, setting a trap.",
      highlights: [H('e2', SOFT), H('e7', KEY)] }),
    b({ id: 'ck-w2', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2 Ngf6 Nd6',
      say: "The natural Ngf6 walks straight into Nd6 — checkmate. The queen on e2 pins the e7-pawn to the king, so e7 cannot capture the knight on d6. A smothered mate, in the opening.",
      sayShort: "…Ngf6?? — Nd6 is mate; e7 is pinned.",
      highlights: [H('d6', ATK), H('e7', KEY), H('e2', SOFT)] }),
    b({ id: 'ck-w3', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2 Ndf6',
      say: "So rewind. The fix is Ndf6 — the other knight develops to f6, the king keeps its breathing room, and the Nd6 mate simply does not work. Learn this one move and Qe2 holds no terror.",
      sayShort: "The fix: …Ndf6 — now Nd6 isn't mate.",
      highlights: [H('f6', KEY), H('d6', SOFT)] }),
  ],
};

export const CARO_TRAP_LESSONS: Record<string, LessonScript> = {
  'karpov-qe2-mate': KARPOV_QE2_MATE,
};

export type CaroTrapKind = 'weapon' | 'warning';
export interface CaroTrapDef {
  id: string;
  name: string;
  kind: CaroTrapKind;
  /** Variation tab labels (lowercased) this trap surfaces under. */
  appliesTo: string[];
}

export const CARO_TRAP_DEFS: CaroTrapDef[] = [
  { id: 'karpov-qe2-mate', name: 'The Qe2 Smothered Mate', kind: 'warning', appliesTo: ['main', 'classical'] },
];

export function getCaroTrapsForTab(tabKey: string): CaroTrapDef[] {
  const key = (tabKey || 'main').toLowerCase();
  return CARO_TRAP_DEFS.filter((d) => d.appliesTo.includes(key));
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Learn / Practice line for a Caro named trap. The teaching line is the
// lesson's LAST beat — for a warning that's the FIX (e.g. ...Ndf6), never the
// mate line, so the student practices the move that AVOIDS the trap. Authored
// `say` survives onto its ply (Watch narration); Learn dictates moves only,
// Practice is silent — the WLPP contract is enforced by PlayableLinePlayer.
export function getCaroTrapPlayableLine(id: string): PlayableMiddlegameLine | null {
  const lesson = CARO_TRAP_LESSONS[id];
  if (!lesson || lesson.beats.length === 0) return null;
  const lineBeat = lesson.beats[lesson.beats.length - 1];
  const moves = lineBeat.moves;
  const annotations: string[] = moves.map(() => '');
  const arrows: AnnotationArrow[][] = moves.map(() => []);
  const highlights: AnnotationHighlight[][] = moves.map(() => []);
  for (const beat of lesson.beats) {
    if (beat.moves.length > moves.length) continue;
    if (!beat.moves.every((m, i) => m === moves[i])) continue;
    const ply = beat.moves.length - 1;
    annotations[ply] = beat.say;
    if (beat.arrows) arrows[ply] = beat.arrows;
    if (beat.highlights) highlights[ply] = beat.highlights;
  }
  return { fen: START_FEN, moves, annotations, arrows, highlights, title: lesson.title };
}

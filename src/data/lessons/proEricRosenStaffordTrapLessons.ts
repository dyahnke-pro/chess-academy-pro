import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight, PlayableMiddlegameLine } from '../../types';

// Lead-the-eye colour language (playbook §5a): GREEN arrows = vision/threat,
// YELLOW highlights = key square named in narration, SOFT BLUE = context.
// Move squares auto-painted orange by the player. The Stafford weapon is a
// BLACK punishment: White plays the natural pin Bg5 and the greedy Bxd8, Black
// mates. Mate line chess.js-verified (8...Bg4# is checkmate).
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color: string): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[] }
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

export const PRO_ERICROSEN_STAFFORD_TRAP_LESSONS: Record<string, LessonScript> = {
  'stafford-bxf2-mate': {
    openingId: 'pro-ericrosen-stafford',
    sources: ['https://lichess.org/study/SSWMLB7R/K9ptMklR', 'concept:pos-development'],
    title: 'The Stafford Trap — …Bxf2+ Mate',
    minutes: 4,
    orientation: 'black',
    kind: 'trap',
    beats: [
      b({ id: 'st1', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Bg5', say: "Here is the Stafford's most famous knockout. White develops with the natural-looking Bg5, pinning your f6-knight to the queen. It feels like smooth, principled play. But the e4-pawn is propped up only by the d3-pawn, and that pin is about to backfire spectacularly.", sayShort: 'Bg5 — the natural pin that backfires.', arrows: [A('f6', 'e4', ATK)], highlights: [H('e4', KEY)] }),
      b({ id: 'st2', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Bg5 Nxe4', say: "Nxe4 anyway. The pin was a bluff — the knight jumps into e4, snatching the pawn and attacking the bishop on g5. White's whole idea collapses, and if greed takes over and White grabs the queen, a forced mate is already on the board.", sayShort: '…Nxe4 — the pin was a bluff; hit g5.', arrows: [A('e4', 'g5', ATK)], highlights: [H('g5', KEY)] }),
      b({ id: 'st3', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Bg5 Nxe4 Bxd8 Bxf2+', say: "Bxd8 takes the queen — and walks straight into it. Bxf2 with check! The dark bishop crashes into f2 and the white king has just one flight square: e2. Everything is forced now.", sayShort: '…Bxf2+ — check, king driven to e2.', highlights: [H('e2', KEY)] }),
      b({ id: 'st4', moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Bg5 Nxe4 Bxd8 Bxf2+ Ke2 Bg4#', say: "Ke2 Bg4 — checkmate. The light bishop drops to g4 and checks the king down the diagonal; the knight on e4 seals the d2-escape, the bishop on f2 covers the others, and the king dies in the centre. You handed over your queen and delivered mate. This is why a careless Bg5 is the move Stafford players pray for.", sayShort: '…Bg4# — queen sacrificed, mate delivered.', arrows: [A('e4', 'd2', ATK)], highlights: [H('e4', KEY), H('d2', SOFT)] }),
    ],
  },
};

export type StaffordTrapKind = 'weapon' | 'warning';
export interface StaffordTrapDef { id: string; name: string; kind: StaffordTrapKind; appliesTo: string[] }

export const PRO_ERICROSEN_STAFFORD_TRAP_DEFS: StaffordTrapDef[] = [
  { id: 'stafford-bxf2-mate', name: 'The Stafford Trap (…Bxf2+ Mate)', kind: 'weapon', appliesTo: ['main', 'nxc6 main line'] },
];

export function getStaffordTrapsForTab(tabKey: string): StaffordTrapDef[] {
  return PRO_ERICROSEN_STAFFORD_TRAP_DEFS.filter(
    (t) => t.appliesTo.includes(tabKey) && t.id in PRO_ERICROSEN_STAFFORD_TRAP_LESSONS,
  );
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export function getStaffordTrapPlayableLine(id: string): PlayableMiddlegameLine | null {
  const lesson = PRO_ERICROSEN_STAFFORD_TRAP_LESSONS[id];
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

import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_scotch-content.json (validated against the gate
// suite). Edit the JSON + regenerate, or edit here and keep the JSON in sync.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color: string): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

import type { PlayableMiddlegameLine } from '../../types';

export const SCOTCH_GAME_TRAP_LESSONS: Record<string, LessonScript> = {
  "sea-cadet-mate": {
  openingId: "scotch-game",
  title: "The Sea-Cadet Mate — Göring Gambit",
  minutes: 4,
  orientation: "white",
  kind: "trap",
  beats: [
    b({ id: "sc1", moves: "e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Nxc3 d6 Bc4 Bg4", say: "From the Göring Gambit (c3), White has sacrificed a pawn for blazing development. Black grabs material and pins the f3-knight with …Bg4, banking on the pin to hold things together. As in Légal's immortal trap, that pin is about to become a death sentence — White's pieces are all aimed at f7.", sayShort: "…Bg4 — the pin that walks into Légal's net.", arrows: [A("g4", "f3", ATK)], highlights: [H("g4", KEY), H("f3", SOFT)] }),
    b({ id: "sc2", moves: "e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Nxc3 d6 Bc4 Bg4 O-O Ne5", say: "O-O and Black plays Ne5, attacking the c4-bishop and trusting the pin on f3. The natural-looking move is the fatal one — it assumes White can't move the pinned knight. White is about to prove otherwise, and the queen on d1 is the bait.", sayShort: "O-O Ne5 — Black hits the bishop.", arrows: [A("e5", "c4", ATK)], highlights: [H("e5", KEY), H("c4", SOFT)] }),
    b({ id: "sc3", moves: "e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Nxc3 d6 Bc4 Bg4 O-O Ne5 Nxe5", say: "Nxe5!! The pinned knight captures anyway, offering the queen on d1. If Black declines and plays …dxe5, he's simply down material with a wrecked position. But the queen is right there, and the temptation is irresistible — exactly as Légal designed it two and a half centuries ago.", sayShort: "Nxe5!! — the pinned knight moves, offers the queen.", highlights: [H("e5", KEY), H("d1", SOFT)] }),
    b({ id: "sc4", moves: "e4 e5 Nf3 Nc6 d4 exd4 c3 dxc3 Nxc3 d6 Bc4 Bg4 O-O Ne5 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#", say: "Bxd1?? Bxf7+ Ke7 Nd5# — checkmate, the Sea-Cadet Mate. The bishop checks from f7, the king is forced to e7, and the knight lands on d5 delivering mate: the e5-knight covers the escape squares and Black's king is netted by three minor pieces while his own queen sits useless on d1. The Göring's version of Légal's Mate — proof that in an open, undeveloped position, a pin is no protection at all.", sayShort: "Bxf7+ Ke7 Nd5# — the Sea-Cadet Mate.", highlights: [H("f7", KEY), H("e7", KEY), H("d5", KEY)] }),
  ],
},
};

export type ScotchTrapKind = 'weapon' | 'warning';
export interface ScotchTrapDef {
  id: string;
  name: string;
  kind: ScotchTrapKind;
  /** Hand-picked tab labels (lower-case) this trap appears on. */
  appliesTo: string[];
}

export const SCOTCH_GAME_TRAP_DEFS: ScotchTrapDef[] = [
  { id: 'sea-cadet-mate', name: 'The Sea-Cadet Mate (Göring Gambit)', kind: 'weapon', appliesTo: ['main', 'scotch gambit'] },
];

export function getScotchTrapsForTab(tabKey: string): ScotchTrapDef[] {
  return SCOTCH_GAME_TRAP_DEFS.filter(
    (t) => t.appliesTo.includes(tabKey) && t.id in SCOTCH_GAME_TRAP_LESSONS,
  );
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export function getScotchTrapPlayableLine(id: string): PlayableMiddlegameLine | null {
  const lesson = SCOTCH_GAME_TRAP_LESSONS[id];
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

import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-London (Black): d4 d5 Bf4 Nf6 e3 Bf5 — main-line master class. The student
// plays BLACK. The London's whole edge is its good bishop on f4, developed
// outside the pawn chain; you neutralise it by MIRRORING — get your own light
// bishop out to f5 BEFORE ...e6 locks it in. From there a solid setup with a
// ...c5 break equalises cleanly. Spine both-sides-sound (build-sound-spine.mjs),
// engine-verified (-0.02 = dead equal). Grounded in Naroditsky's anti-London
// ideas (reference only, original prose).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'];

export const ANTI_LONDON_BLACK_LESSON: LessonScript = {
  openingId: 'anti-london-black',
  sources: SRC,
  title: 'Meeting the London — mirror it with ...Bf5',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'lon1', moves: 'd4 d5 Bf4 Nf6 e3 Bf5',
      say: "The London's entire edge is that ONE bishop — developed to f4, outside the pawn chain, before e3 can box it in. So you steal the good idea: …Bf5, getting your OWN light-squared bishop out before you ever touch …e6. It's the exact principle that makes the Caro-Kann so rock-solid, and it pulls the London's one trump straight out at the root.",
      sayShort: "…Bf5 — mirror the bishop before …e6.",
      highlights: [H('f5', ATK), H('e6', SOFT)] }),
    b({ id: 'lon2', moves: 'd4 d5 Bf4 Nf6 e3 Bf5 c4 e6 Nd2 Nbd7',
      say: "NOW you play …e6 — the bishop's already outside, so the move that cramps so many queen's-pawn defenders costs you absolutely nothing. White expands with c4; you develop …Nbd7, calm and flexible. Both light-squared bishops are out and happy, and the position is dead level. That easily, the London's sting is gone.",
      sayShort: "…e6, …Nbd7 — solid, both bishops free.",
      highlights: [H('e6', KEY), H('f5', SOFT)] }),
    b({ id: 'lon3', moves: 'd4 d5 Bf4 Nf6 e3 Bf5 c4 e6 Nd2 Nbd7 Ngf3 a5 Be2 c6',
      say: "…a5 grabs queenside space and puts a stop to White's b4; …c6 shores up the centre and readies the freeing …c5 break — the move that, timed right, gives you full equality and even the initiative. Hear this: you're not defending passively, you're loading up to strike.",
      sayShort: "…a5, …c6 — prep the …c5 break.",
      highlights: [H('a5', KEY), H('c6', KEY)] }),
    b({ id: 'lon4', moves: 'd4 d5 Bf4 Nf6 e3 Bf5 c4 e6 Nd2 Nbd7 Ngf3 a5 Be2 c6 Qb3 Ra7 c5 Be7 O-O Nh5 Be5 Nhf6',
      say: "White probes with Qb3 and c5, grabbing space; you defend b7 with the tidy …Ra7 and challenge the strong e5-bishop with …Nh5. When it backs off, you regroup …Nhf6 and stand dead equal — no weaknesses, both bishops good, and the thematic …c5 and …b6 breaks in your pocket. The London's quiet squeeze, quietly refused.",
      sayShort: "…Ra7, …Nh5 — equal, breaks in hand.",
      highlights: [H('a7', SOFT), H('e5', ATK)] }),
  ],
};

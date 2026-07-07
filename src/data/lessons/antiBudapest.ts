import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Budapest: 4.Bf4 (d4 Nf6 c4 e5 dxe5 Ng4 Bf4) — main-line master class.
// The student plays WHITE. The Budapest sacrifices a pawn with ...e5 and hits
// it with ...Ng4; Bf4 is the critical, greed-free defence — it holds the extra
// e5-pawn AND develops. Black regains the pawn by force, but you emerge with the
// bishop pair and easier development. Spine both-sides-sound (build-sound-
// spine.mjs), engine-verified (+0.35 White — small, pleasant edge).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Budapest_Gambit'];

export const ANTI_BUDAPEST_LESSON: LessonScript = {
  openingId: 'anti-budapest',
  sources: SRC,
  title: 'Meeting the Budapest — 4.Bf4 and the bishop pair',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'bud1', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4',
      say: "The Budapest Gambit throws the e5-pawn at you and then chases it with the knight to g4. The temptation is to cling to the pawn with h3 or Nf3 and get tangled — instead you play the clean, principled Bf4: it defends the e5-pawn a second time and develops a piece. No greed, no weakening. You hold the pawn for now with an active bishop.",
      sayShort: "Bf4 — defend e5, develop, no greed.",
      arrows: [A('f4', 'e5')], highlights: [H('e5', KEY), H('g4', SOFT)] }),
    b({ id: 'bud2', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 e3',
      say: "Black piles onto e5 with Nc6 and Qe7 and throws in the check Bb4+, which you block with Nbd2 — developing, not retreating. Then e3 makes the whole centre granite and shores up the extra pawn. Black has spent several moves attacking one pawn; you have used the same moves to develop your whole army.",
      sayShort: "Nbd2, e3 — develop, hold the pawn.",
      highlights: [H('e5', KEY), H('d2', SOFT)] }),
    b({ id: 'bud3', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 e3 Ngxe5 Nxe5 Nxe5 a3 Bxd2+ Qxd2',
      say: "Black finally regains the pawn: Ngxe5, and after Nxe5 Nxe5 the material is level again. But now you strike with a3, and after Bxd2+ Qxd2 you have won the two bishops — Black has parted with his dark-squared bishop, leaving your Bf4 unopposed on its diagonal. Equal material, superior minor pieces.",
      sayShort: "a3 — win the bishop pair.",
      highlights: [H('f4', KEY), H('e5', SOFT)] }),
    b({ id: 'bud4', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 e3 Ngxe5 Nxe5 Nxe5 a3 Bxd2+ Qxd2 d6 Be2 O-O',
      say: "Black solidifies the knight with d6 and castles; you develop Be2 and are ready to tuck your own king away. The dust has settled on a small but durable edge: the bishop pair, a healthy central pawn on c4, and the freer game. The Budapest's one trick — win the pawn back — succeeded, and you are still pressing. Nurse the two bishops.",
      sayShort: "Be2, O-O — bishop pair, pleasant edge.",
      highlights: [H('c4', KEY), H('f4', SOFT)] }),
  ],
};

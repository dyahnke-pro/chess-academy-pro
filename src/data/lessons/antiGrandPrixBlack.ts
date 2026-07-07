import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Grand-Prix (Black): e4 c5 Nc3 Nc6 f4 g6 — main-line master class. The
// student plays BLACK. Against the Grand Prix Attack, fianchetto, blunt the
// c4-bishop with ...e6, meet the f5 thrust calmly, and hit back on the
// queenside. Spine both-sides-sound (build-sound-spine.mjs), engine-verified
// (+0.25 for Black — Black is comfortable).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'];

export const ANTI_GRAND_PRIX_BLACK_LESSON: LessonScript = {
  openingId: 'anti-grand-prix-black',
  sources: SRC,
  title: 'Defusing the Grand Prix Attack',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'gpa1', moves: 'e4 c5 Nc3 Nc6 f4 g6',
      say: "The Grand Prix Attack throws f4 at you, dreaming of a kingside mating attack with Bc4, f5 and Qe1-h4. You take the wind out of it the modern way: fianchetto with g6. Your Bg7 will guard the dark squares around your king and rake the long diagonal at White's centre — the safest, most reliable setup against the whole system.",
      sayShort: "…g6 — fianchetto, guard the king.",
      highlights: [H('g6', KEY), H('f4', SOFT)] }),
    b({ id: 'gpa2', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6',
      say: "White develops the bishop to c4, aiming at f7. …e6 is the key defensive move: it slams the door on that diagonal AND takes the f5 and d5 squares under control, so White's thematic f5 break loses its bite. A tiny move that quietly defangs the whole attack.",
      sayShort: "…e6 — blunt the c4-bishop and f5.",
      highlights: [H('e6', KEY), H('c4', ATK)] }),
    b({ id: 'gpa3', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5 Nge7 fxe6 dxe6',
      say: "White lunges with f5 anyway; you meet it with the cool …Nge7, defending g6 and eyeing f5. When White trades on e6, you recapture with the d-pawn — dxe6 — and now your centre is solid, the position half-open, and White's attack has spent itself for nothing. The storm has passed and you stand better.",
      sayShort: "…Nge7, …dxe6 — the attack fizzles.",
      highlights: [H('e6', KEY), H('e7', SOFT)] }),
    b({ id: 'gpa4', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5 Nge7 fxe6 dxe6 d3 O-O O-O h6 a4 b6 Ne2 Na5',
      say: "You castle into safety, take luft with h6, and swing the knight to a5 to hit the c4-bishop and trade off White's most dangerous attacker. Your bishop on g7 dominates the long diagonal, your structure is sound, and you have the better share of the centre. The Grand Prix Attack has been defused — and you're the one on top.",
      sayShort: "…Na5 — hit the bishop, take over.",
      highlights: [H('a5', KEY), H('c4', ATK), H('g7', SOFT)] }),
  ],
};

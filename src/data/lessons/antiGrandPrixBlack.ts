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
      say: "Start with what White actually WANTS here, because once you see it, the defense picks itself. The Grand Prix throws out f4 dreaming of one thing — a kingside massacre: Bc4, f5, then Qe1-h4 and mate. So your whole job is simple: don't give him the attack. And the cleanest way, the modern way, is to fianchetto with g6. That bishop is heading to g7, and it's going to be the hero of the entire game — guarding the dark squares around your king and glaring down the long diagonal at White's centre.",
      sayShort: "…g6 — fianchetto, guard the king.",
      highlights: [H('g6', KEY), H('f4', SOFT)] }),
    b({ id: 'gpa2', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6',
      say: "White develops Bc4, pointing at f7 — the standard aggressive square. And here's the key move, so simple you could blow right past it: …e6. It slams the door on that diagonal AND clamps the f5- and d5-squares, so White's dream f5-break loses all its sting. One tiny pawn move, and the whole attack is quietly defanged.",
      sayShort: "…e6 — blunt the c4-bishop and f5.",
      highlights: [H('e6', KEY), H('c4', ATK)] }),
    b({ id: 'gpa3', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5 Nge7 fxe6 dxe6',
      say: "White lunges f5 anyway — and you answer with the coolest move in the line, …Nge7, calmly guarding g6 and eyeing f5. When White grabs on e6, you recapture with the d-pawn, dxe6. Now look at the result: your centre is rock-solid, the position half-open, and White's big attack has spent itself on absolutely nothing. The storm blew through, and you came out the other side better.",
      sayShort: "…Nge7, …dxe6 — the attack fizzles.",
      highlights: [H('e6', KEY), H('e7', SOFT)] }),
    b({ id: 'gpa4', moves: 'e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bc4 e6 f5 Nge7 fxe6 dxe6 d3 O-O O-O h6 a4 b6 Ne2 Na5',
      say: "Now you just tidy up and take over. Castle to safety, …h6 for luft, and then the key idea — …Na5, jumping at the c4-bishop to trade off White's most dangerous attacker. Your bishop on g7 owns the long diagonal, your structure is clean, and you hold the better half of the centre. The Grand Prix has been completely defused — and you're the one pressing.",
      sayShort: "…Na5 — hit the bishop, take over.",
      highlights: [H('a5', KEY), H('c4', ATK), H('g7', SOFT)] }),
  ],
};

import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Owen's Defense — video-grounded Watch build #11 (David 2026-07-15).
// The student plays WHITE. Corpus: 219 games @ 69.4% (data/sources/
// danielnaroditsky-trees/anti-owen.json). The system from his real games:
// full centre, Bd3, the Ne2 pin-sidestep, the e5 space gain, then the
// Nf4/Qg4 kingside attack (his video's exact theme). Engine-verified
// 2026-07-15: +1.70 at 26 plies with best play. Red-target grammar.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const RED = 'rgba(239,68,68,0.72)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = 'green'): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Owen%27s_Defence'];

export const ANTI_OWEN_LESSON: LessonScript = {
  openingId: 'anti-owen',
  sources: SRC,
  title: "Punishing Owen's Defense",
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'aow-1', moves: 'e4 b6 d4 Bb7',
      say: "Owen's Defense: Black fianchettoes the queenside bishop against your e-pawn and concedes the entire centre to do it. The refutation philosophy is the same as against every hypermodern sideline that goes too far — take everything you're offered. Both pawns forward. Across 219 corpus games this scores nearly seventy percent, and the reason is simple: the b7-bishop stares at a wall for the rest of the game.",
      sayShort: "Take the whole centre.",
      arrows: [A('b7', 'e4')],
      highlights: [H('e4', SOFT), H('d4', SOFT), H('b7', RED)] }),
    b({ id: 'aow-2', moves: 'e4 b6 d4 Bb7 Nc3 e6 Bd3',
      say: "Develop the knight to defend e4 twice, and put the bishop on d3 — the aggressive diagonal, ready to rake the kingside the moment the centre advances. Notice the imbalance already: Black's one developed piece bites on your e4-point, which you defend as many times as needed, while every White piece develops toward an attack.",
      sayShort: "Nc3, Bd3 — aim kingside.",
      highlights: [H('d3', SOFT), H('e4', KEY)] }),
    b({ id: 'aow-3', moves: 'e4 b6 d4 Bb7 Nc3 e6 Bd3 Bb4 Ne2',
      say: "Black pins your knight — and the professional response is the quiet knight to e2. The sidestep breaks the pin's teeth before it bites: now the c3-knight can be recaptured by its twin, the doubled-pawn threat evaporates, and Black's proud b4-bishop is suddenly just a piece that moved twice to accomplish nothing. Small move, whole system.",
      sayShort: "Ne2 — the pin bites air.",
      highlights: [H('e2', SOFT), H('b4', RED)] }),
    b({ id: 'aow-4', moves: 'e4 b6 d4 Bb7 Nc3 e6 Bd3 Bb4 Ne2 Nf6 O-O d5 e5',
      say: "Black finally challenges the centre — and the e-pawn advances instead of trading, hitting the knight and slamming the door on the b7-bishop's diagonal permanently. This is the move Owen's Defense dreads: the bishop that was the whole point of Black's setup now stares at its own pawn chain, and the kingside it abandoned is about to receive visitors.",
      sayShort: "e5 — the b7-bishop is walled in.",
      highlights: [H('e5', SOFT), H('b7', RED), H('f6', RED)] }),
    b({ id: 'aow-5', moves: 'e4 b6 d4 Bb7 Nc3 e6 Bd3 Bb4 Ne2 Nf6 O-O d5 e5 Nfd7 Nf4 g6 Qg4',
      say: "The knight retreats, and the attack begins: knight to f4 eyeing the e6- and g6-squares, and when Black weakens with the g-pawn, the queen arrives on g4, piling onto g6 and the whole ring of loosened dark squares. The engine puts White nearly two pawns better here with best play. Owen's Defense in one sentence: Black spent the opening developing one bishop at a wall, and White spent it aiming everything at the king.",
      sayShort: "Nf4, Qg4 — the attack lands.",
      arrows: [A('f4', 'g6'), A('f4', 'e6'), A('g4', 'g6')],
      highlights: [H('g4', SOFT), H('g6', RED), H('e6', RED)] }),
  ],
};

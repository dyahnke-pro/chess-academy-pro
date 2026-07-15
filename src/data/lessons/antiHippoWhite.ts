import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Hippo (White) — video-grounded Watch build #13 (David 2026-07-15).
// The student plays WHITE against the Black Hippo (double fianchetto, pawns
// on the third rank, nothing past move four). Taught scheme from the
// Austrian-attack-vs-hippo video: full centre + f4, Bd3, O-O, the flexible
// Qe1 eyeing h4, the e5 lock that entombs the g7-bishop, then the g4/f5
// crash. Corpus context: 1,483 games in the adjacent 1.e4 g6 tree at 64.8%.
// Engine-verified 2026-07-15: mainline +4.04 at 31 plies (the crash);
// the dxe5 trade +0.93; the h5 stopper +1.10. Red-target grammar.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const RED = 'rgba(239,68,68,0.72)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = 'green'): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Hippopotamus_Defence'];

export const ANTI_HIPPO_WHITE_LESSON: LessonScript = {
  openingId: 'anti-hippo-white',
  sources: SRC,
  title: 'Squeezing the Hippo',
  minutes: 7,
  orientation: 'white',
  beats: [
    b({ id: 'ahw-1', moves: 'e4 g6 d4 Bg7 Nc3 b6 f4 Bb7',
      say: "The Hippo: Black fianchettoes both bishops, tucks everything onto the back two ranks, and waits for you to overreach. The answer starts with geography — take the entire centre, and add f4, the Austrian idea. Three pawns abreast, maximum space. The Hippo's bet is that your big centre becomes a target; your job is to prove it's a weapon. One warning before anything else: patience. Wall-to-wall space converts into an attack, not into a move-ten knockout.",
      sayShort: "Full centre plus f4 — maximum space.",
      highlights: [H('e4', SOFT), H('d4', SOFT), H('f4', SOFT), H('g7', KEY), H('b7', KEY)] }),
    b({ id: 'ahw-2', moves: 'e4 g6 d4 Bg7 Nc3 b6 f4 Bb7 Nf3 e6 Bd3 d6 O-O Ne7 Qe1 Nd7',
      say: "Develop naturally: knight to f3, the bishop to its post on d3 — ready for the moment the e-pawn advances — and castle. Then the signature move of this whole system: queen to e1. It commits to nothing and eyes everything, above all the h4-square, the same swing the Grand Prix attack uses. Meanwhile look at Black's camp: the shell is complete, and not one piece or pawn has crossed the fourth rank. That politeness has a price, and you're about to name it.",
      sayShort: "Qe1 — the flexible swing toward h4.",
      arrows: [A('e1', 'h4')],
      highlights: [H('e1', SOFT), H('h4', KEY)] }),
    b({ id: 'ahw-3', moves: 'e4 g6 d4 Bg7 Nc3 b6 f4 Bb7 Nf3 e6 Bd3 d6 O-O Ne7 Qe1 Nd7 e5 d5',
      say: "Most players reach for a routine developing move here. The stronger idea is e5 — the pawn advances exactly because f4 backs it up. This is the move that turns space into a sentence: the g7-bishop now stares at a granite wall for the rest of the game. And when Black closes with d5, count the wreckage — the g7-bishop stares at your e5 wedge, and the b7-bishop stares at its own d5-pawn. The Hippo's two best pieces just became spectators, and the kingside attack hasn't even started.",
      sayShort: "e5 — both bishops hit walls.",
      highlights: [H('e5', SOFT), H('g7', RED), H('b7', RED)] }),
    b({ id: 'ahw-4', moves: 'e4 g6 d4 Bg7 Nc3 b6 f4 Bb7 Nf3 e6 Bd3 d6 O-O Ne7 Qe1 Nd7 e5 d5 Ne2 c5 c3 Nf5',
      say: "With the centre locked, reroute: the knight steps to e2, heading for g3 where it joins the attack, and c3 keeps the d4-point solid against the c5 chip. Black finally shows activity — the knight lunges to f5, the one square that looks like a real outpost. It isn't. Active-looking and safe are different things, and that knight is about to be asked a question it can't answer.",
      sayShort: "Ne2 heads for g3 — c3 holds d4.",
      arrows: [A('e2', 'g3')],
      highlights: [H('c3', SOFT), H('d4', KEY), H('f5', RED)] }),
    b({ id: 'ahw-5', moves: 'e4 g6 d4 Bg7 Nc3 b6 f4 Bb7 Nf3 e6 Bd3 d6 O-O Ne7 Qe1 Nd7 e5 d5 Ne2 c5 c3 Nf5 g4 Ne7 f5',
      say: "Pawn to g4 — and no, pushing pawns in front of your own king is not brave here, it's free: look across the board and count Black's attackers. Zero. The knight retreats, and now the hammer: f5, ripping at g6 and e6 at once. Every one of White's pieces points at the Black king; every one of Black's sits where it started. The engine already calls this position winning — three pawns' worth and climbing. Space, then squeeze, then storm.",
      sayShort: "g4 boots it — f5 rips open.",
      highlights: [H('f5', SOFT), H('g6', RED), H('e6', RED)] }),
    b({ id: 'ahw-6', moves: 'e4 g6 d4 Bg7 Nc3 b6 f4 Bb7 Nf3 e6 Bd3 d6 O-O Ne7 Qe1 Nd7 e5 d5 Ne2 c5 c3 Nf5 g4 Ne7 f5 gxf5 gxf5 Nxf5 Bxf5 exf5 Ng3',
      say: "The captures run their course, and the accounting is brutal: Black's kingside cover is gone, the f5-pawn is falling to the knight arriving on g3, and the king is stranded on its starting square with the g-file torn open in front of it. The engine reads four pawns of advantage. That's the Hippo squeezed: take all the space it declines, lock its bishops behind their own walls, and when it finally moves a piece — punish the move.",
      sayShort: "Ng3 collects — king stranded, file open.",
      arrows: [A('g3', 'f5')],
      highlights: [H('f5', RED), H('e8', RED)] }),
  ],
};

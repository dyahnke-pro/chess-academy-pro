import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Sicilian: the Rossolimo (3.Bb5 vs 2...Nc6) — the main-line master class.
// The student plays WHITE: board orients white-at-bottom, narration speaks from
// White's side. This is the counter-weapon against the Sicilian's ...Nc6 systems
// — instead of an Open Sicilian theory duel, White trades the light bishop for
// the c6-knight, saddles Black with doubled c-pawns, and plays a clean, low-
// theory positional game. The spine is the masters-DB main line (the most-played
// master move at every ply, so it is DB-grounded by construction), walked to a
// real middlegame. chess.js-legal throughout. Arrows are reserved for non-pawn
// pieces on a clear sight-line (lessonIntegrity); highlights mark squares the
// narration names.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

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

const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Rossolimo_Variation'];

/** Main-line Rossolimo vs the fianchetto (3...g6): Bxc6 doubles Black's pawns,
 *  e5 grabs space, the knight lands on the e4 outpost, and White pressures the
 *  dark squares with Be3/Bh6 — a clean structural plus with almost no theory. */
export const ANTI_SICILIAN_ROSSOLIMO_LESSON: LessonScript = {
  openingId: 'anti-sicilian-rossolimo',
  sources: SRC,
  title: 'The Rossolimo — Beating the Sicilian with 3.Bb5',
  minutes: 8,
  orientation: 'white',
  beats: [
    b({ id: 'ros1', moves: 'e4 c5 Nf3 Nc6 Bb5',
      say: "Against the Sicilian, you sidestep a hundred moves of Najdorf theory with Bb5 — the Rossolimo. The bishop pins its aim on c6, the knight that guards Black's key central squares d4 and e5. You are not playing for a knockout; you are playing to trade that knight, wreck Black's pawns, and grind a healthy structure. Low theory, all understanding.",
      sayShort: "Bb5 — the Rossolimo, target c6.",
      arrows: [A('b5', 'c6')], highlights: [H('c6', KEY), H('d4', SOFT), H('e5', SOFT)] }),
    b({ id: 'ros2', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 Nf6',
      say: "Black fianchettoes with g6 and Bg7, aiming the bishop down the long diagonal. You castle and bring the rook to e1 — quietly loading the e-file behind the e-pawn, because your next idea is to push it. Black develops the knight to f6, hitting your e4-pawn, which is exactly the moment you want.",
      sayShort: "O-O, Re1 — load the e-file for e5.",
      highlights: [H('e1', KEY), H('e4', SOFT)] }),
    b({ id: 'ros3', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 Nf6 e5 Nd5 Nc3 Nc7 Bxc6 dxc6',
      say: "e5 gains space and shoves the knight off f6 to d5. You challenge it with Nc3, it drops back to c7, and now the point of the whole system: Bxc6. You give up the bishop to double Black's pawns — after dxc6 the c-pawns are stacked on c6 and c5. That structural scar is permanent, and the whole middlegame is built on it.",
      sayShort: "e5 then Bxc6 — double the c-pawns.",
      highlights: [H('e5', ATK), H('c6', KEY), H('c5', KEY)] }),
    b({ id: 'ros4', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 Nf6 e5 Nd5 Nc3 Nc7 Bxc6 dxc6 Ne4 Ne6 d3 O-O',
      say: "Now the knight swings to e4 — a magnificent central outpost that Black can never chase with a pawn. You brace it with d3, rock-solid, and Black tucks the king away with castling. Your e5-pawn cramps Black, the e4-knight eyes d6 and f6, and Black's doubled c-pawns have no counterplay to show for the bishop pair.",
      sayShort: "Ne4 — the outpost, braced by d3.",
      arrows: [A('e4', 'd6')], highlights: [H('e4', KEY), H('d3', SOFT), H('d6', ATK)] }),
    b({ id: 'ros5', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 Nf6 e5 Nd5 Nc3 Nc7 Bxc6 dxc6 Ne4 Ne6 d3 O-O Be3 b6 Qd2 Nd4 Nxd4 cxd4',
      say: "Be3 develops with a purpose — it and the queen on d2 are lining up on the dark squares around Black's king. Black tries to free his game with the knight to d4; you trade it off, and after cxd4 Black is left with a weak, advanced d4-pawn that your pieces will swarm and win in the endgame.",
      sayShort: "Be3, Qd2 — pile on the dark squares.",
      arrows: [A('e3', 'h6')], highlights: [H('e3', KEY), H('d2', SOFT), H('d4', ATK)] }),
    b({ id: 'ros6', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 Nf6 e5 Nd5 Nc3 Nc7 Bxc6 dxc6 Ne4 Ne6 d3 O-O Be3 b6 Qd2 Nd4 Nxd4 cxd4 Bh6 c5',
      say: "Bh6 challenges the Dragon bishop — Black's best defender of the dark squares around his king. Trade it and those squares turn to holes. Black grabs space with c5, but you have reached exactly the middlegame the Rossolimo promises: a clean structure, the bishop pair neutralized, a pawn wedge on e5, and permanent targets in Black's camp. This is a game you play for two results.",
      sayShort: "Bh6 — trade off the Dragon bishop.",
      arrows: [A('h6', 'g7')], highlights: [H('h6', KEY), H('g7', ATK), H('e5', SOFT)] }),
  ],
};

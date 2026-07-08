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
      say: "Against the Sicilian, you can sidestep a hundred moves of Najdorf theory in one stroke — Bb5, the Rossolimo. The bishop trains on c6, the knight that guards Black's key squares d4 and e5. You're not swinging for a knockout; you're playing to trade that knight, wreck Black's pawns, and grind a healthy structure for two results. Low theory, all understanding — my favourite kind of position.",
      sayShort: "Bb5 — the Rossolimo, target c6.",
      arrows: [A('b5', 'c6')], highlights: [H('c6', KEY), H('d4', SOFT), H('e5', SOFT)] }),
    b({ id: 'ros2', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 Nf6',
      say: "Black fianchettoes — …g6 and …Bg7, aiming down the long diagonal. You castle and slide the rook to e1, quietly loading the e-file behind the pawn, because the next idea is to push it. Black develops …Nf6, hitting your e4-pawn — and that's exactly the moment you've been waiting for.",
      sayShort: "O-O, Re1 — load the e-file for e5.",
      highlights: [H('e1', KEY), H('e4', SOFT)] }),
    b({ id: 'ros3', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 Nf6 e5 Nd5 Nc3 Nc7 Bxc6 dxc6',
      say: "e5 gains space and boots the knight off f6 to d5. You challenge with Nc3, it retreats to c7, and now the heart of the whole system: Bxc6. You hand over the bishop to double Black's pawns — after …dxc6 they're stacked on c6 and c5. That structural scar is permanent, and every plan you have from here is built on it.",
      sayShort: "e5 then Bxc6 — double the c-pawns.",
      highlights: [H('e5', ATK), H('c6', KEY), H('c5', KEY)] }),
    b({ id: 'ros4', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 Nf6 e5 Nd5 Nc3 Nc7 Bxc6 dxc6 Ne4 Ne6 d3 O-O',
      say: "Now the knight swings to e4 — a gorgeous central outpost Black can never kick with a pawn. You brace it with d3, absolutely solid, and Black castles. Your e5-pawn cramps him, the e4-knight eyes d6 and f6, and those doubled c-pawns have nothing — no counterplay at all to show for the bishop pair they won.",
      sayShort: "Ne4 — the outpost, braced by d3.",
      arrows: [A('e4', 'd6')], highlights: [H('e4', KEY), H('d3', SOFT), H('d6', ATK)] }),
    b({ id: 'ros5', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 Nf6 e5 Nd5 Nc3 Nc7 Bxc6 dxc6 Ne4 Ne6 d3 O-O Be3 b6 Qd2 Nd4 Nxd4 cxd4',
      say: "Be3 develops with a purpose — it and the queen on d2 are lining up on the dark squares around Black's king. Black tries to break free with …Nd4; you simply trade it off, and after …cxd4 he's left with a weak, over-advanced d4-pawn that your pieces will swarm and pick off in the endgame.",
      sayShort: "Be3, Qd2 — pile on the dark squares.",
      arrows: [A('e3', 'h6')], highlights: [H('e3', KEY), H('d2', SOFT), H('d4', ATK)] }),
    b({ id: 'ros6', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 Nf6 e5 Nd5 Nc3 Nc7 Bxc6 dxc6 Ne4 Ne6 d3 O-O Be3 b6 Qd2 Nd4 Nxd4 cxd4 Bh6 c5',
      say: "Bh6 challenges the Dragon bishop — Black's best defender of the dark squares around his king. Trade it, and those squares become permanent holes. Black grabs space with …c5, but look where you've arrived: the exact middlegame the Rossolimo promised — clean structure, bishop pair neutralised, an e5 wedge, and permanent targets in Black's camp. A game you play for two results, and risk nothing.",
      sayShort: "Bh6 — trade off the Dragon bishop.",
      arrows: [A('h6', 'g7')], highlights: [H('h6', KEY), H('g7', ATK), H('e5', SOFT)] }),
  ],
};

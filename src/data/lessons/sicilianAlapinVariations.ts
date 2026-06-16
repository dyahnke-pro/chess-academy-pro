import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_alapin-content.json (validated against the gate
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

export const SICILIAN_ALAPIN_VARIATION_LESSONS: Record<string, LessonScript> = {
  "sicilian-alapin::Alapin: 2...Nf6 3.e5 Nd5 4.d4 cxd4 5.cxd4 d6 (IQP Accepted)": {
    openingId: 'sicilian-alapin', title: 'Alapin — the IQP Accepted (play vs d4)', minutes: 10, orientation: 'black',
    sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Alapin_Variation'],
    beats: [
      b({ id: 'iq1', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6', say: "Black provokes the Alapin's most testing structure on purpose. …Nf6 pokes e5, …Nd5 hops to a fine central square, and after the trades on d4 Black hits the chain with …d6. The plan is clear from move one: liquidate White's centre and leave him with an isolated d-pawn to defend.", sayShort: "…d6 — provoke White's isolated d-pawn.", highlights: [H('d5', SOFT)] }),
      b({ id: 'iq2', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6 Nf3 Nc6 Bc4 Nb6 Bb5 dxe5 Nxe5', say: "…Nc6 develops with a hit on d4, the knight retreats …Nb6 nudging the bishop, and …dxe5 finally dissolves White's spearhead. When the dust settles White is left with the isolated queen's pawn on d4 — exactly the weakness Black has been aiming at the whole time.", sayShort: '…dxe5 — liquidate to the isolated d4-pawn.', highlights: [H('d4')] }),
      b({ id: 'iq3', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6 Nf3 Nc6 Bc4 Nb6 Bb5 dxe5 Nxe5 Bd7 Nxd7 Qxd7 Nc3 e6 O-O Be7', say: "Black trades into the pure structure: …Bd7 and …Qxd7 swap a pair of minors, then …e6 and …Be7 erect the blockade. There is the recommended tabiya: White has the isolated d4-pawn, Black has the ideal blockading squares and the easier middlegame plan — pile on d4, trade pieces, win the endgame. The classic 'play against the IQP' recipe, and the reason this line is a comfortable equaliser.", sayShort: '…Be7 — blockade and besiege d4.', highlights: [H('d4'), H('e6', SOFT)] }),
    ],
  },

  "sicilian-alapin::Alapin: 2...d5 Central Counter (IQP Play)": {
  openingId: "sicilian-alapin",
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Alapin_Variation'],
  title: "Alapin — The 2...d5 Central Counter",
  minutes: 6,
  orientation: "black",
  beats: [
    b({ id: "d5", moves: "e4 c5 c3 d5", say: "The most direct answer: d5, striking the centre at once. Black refuses to let White build the big pawn duo and forces an immediate clarification.", sayShort: "d5 — strike the centre immediately.", highlights: [H("d5", KEY)] }),
    b({ id: "iqp", moves: "e4 c5 c3 d5 exd5 Qxd5 d4 Nf6", say: "After exd5 Qxd5 the queen recaptures actively in the centre, and d4 leaves White with an isolated queen's pawn once the c-pawns come off. Black develops Nf6 with tempo and prepares to blockade and besiege that lone d-pawn.", sayShort: "Qxd5 and Nf6 — target the d-pawn.", highlights: [H("d4", KEY), H("f6", SOFT)] }),
    b({ id: "pieces", moves: "e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6", say: "Black's pieces swarm the isolated pawn — Bg4 pins the f3-knight that defends d4, and e6 secures the d5-blockade square. The recipe against an isolated pawn is timeless: blockade it, pile on it, and trade into a better endgame.", sayShort: "Bg4 pins f3; e6 blockades d5.", arrows: [A("g4", "f3", ATK)], highlights: [H("d4", KEY)] }),
    b({ id: "verdict", moves: "e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6 h3 Bh5 O-O Nc6 Na3 a6 Nc2 cxd4", say: "Black completes development around the isolated pawn and finally captures cxd4, resolving the structure in his favour. The verdict on the central counter: Black gets a clean, principled game against a known weakness — exactly the comfortable equality the Alapin player hoped to avoid conceding.", sayShort: "cxd4 — resolve it; Black is comfortable.", highlights: [H("d4", KEY)] }),
  ],
},
};

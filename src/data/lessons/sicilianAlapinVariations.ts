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

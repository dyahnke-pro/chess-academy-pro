import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pirc Defence — the main-line master class (Black's hypermodern setup).
// The student plays BLACK: board orients black-at-bottom, narration
// speaks from Black's side. Every move is DB-grounded (openings-lichess /
// the curated repertoire.json pirc-defence entry) and chess.js-legal.
// Arrows are reserved for non-pawn pieces with a CLEAR sight-line (the
// lessonIntegrity test enforces it); pawn breaks and key squares use
// highlights.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
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

/** Main-line Pirc: the hypermodern setup, then the central counter-strike. */
export const PIRC_DEFENCE_LESSON: LessonScript = {
  openingId: 'pirc-defence',
  title: 'The Pirc Defence — A Master Class',
  minutes: 9,
  orientation: 'black',
  beats: [
    b({ id: 'p1', moves: 'e4 d6',
      say: "The Pirc begins quietly: against e4, Black answers d6. No fight for the centre yet — that is the whole hypermodern idea. You invite White to build the big pawn centre, planning to undermine it later instead of occupying it now. Vasja Pirc made this respectable; Spassky took it to World Championship matches.",
      sayShort: 'd6 — invite White to build the centre, then strike it down later.',
      highlights: [H('d6', KEY), H('e4', SOFT)] }),
    b({ id: 'p2', moves: 'e4 d6 d4 Nf6 Nc3 g6',
      say: "White takes the centre with d4, and now the Pirc's signature shape appears: Nf6 hits e4 and forces White to defend it, then g6 prepares the fianchetto. This exact picture — pawns on d6 and g6, knight on f6 — is the Pirc. Black concedes space on purpose, betting that the big centre will become a target.",
      sayShort: "Nf6 and g6 — the defining Pirc setup. Concede space, target the centre.",
      highlights: [H('f6', SOFT), H('d4', KEY), H('e4', KEY)] }),
    b({ id: 'p3', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O',
      say: "The bishop slides to g7 — the soul of the position. From this long diagonal it stares all the way down at d4 and the centre, waiting for the knight on f6 to step aside so the bishop's full force is unleashed. Black castles, getting the king safe before the real fight starts.",
      sayShort: 'Bg7 is the soul of the Pirc — it eyes d4 down the long diagonal. Castle, then strike.',
      highlights: [H('g7', KEY), H('d4', SOFT)] }),
    b({ id: 'p4', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6',
      say: "Now c6 — modest-looking, deeply flexible. It takes the b5 and d5 squares away from White's pieces and prepares Black's own breaks: a later d5, or b5 on the queenside, or support for the central e5. The Pirc keeps every option open until White commits.",
      sayShort: 'c6 — flexible: it grabs squares and prepares ...d5, ...b5, or ...e5.',
      highlights: [H('c6', KEY), H('d5', SOFT), H('b5', SOFT)] }),
    b({ id: 'p5', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 Nbd7 h3 e5',
      say: "Here is the moment the whole opening was built for: e5, striking at the heart of White's centre. The knight came to d7 to support it, and now the d4-pawn is challenged head-on. This is the hypermodern payoff — Black let White build, and now Black tears at it.",
      sayShort: 'The payoff break: ...e5 hits d4 head-on. This is what the Pirc was built for.',
      highlights: [H('e5', ATK), H('d4', KEY)] }),
    b({ id: 'p6', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 Nbd7 h3 e5 dxe5 dxe5',
      say: "When White releases the tension with dxe5 dxe5, the centre opens and Black has fully equalised. The d-file swings open for the rooks, Black holds a firm pawn on e5, and the knight on d7 will reroute toward the strong central squares. From a cramped start, Black has reached an easy, healthy game — the Pirc's promise delivered.",
      sayShort: "...dxe5 opens the d-file and leaves Black firmly equal in the centre.",
      highlights: [H('e5', KEY), H('d8', SOFT)] }),
  ],
};

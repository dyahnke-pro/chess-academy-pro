import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_najdorf-content.json (validated against the gate
// suite). Edit the JSON + regenerate, or edit here and keep the JSON in sync.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
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

export const SICILIAN_NAJDORF_LESSON: LessonScript = {
  openingId: "sicilian-najdorf",
  sources: ['concept:att-queenside-attack', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
  title: "The Sicilian Najdorf — A Master Class",
  minutes: 9,
  orientation: "black",
  beats: [
    b({ id: "najdorf", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6", say: "The Najdorf — the most respected of all the Sicilians, the choice of champions from Fischer to Kasparov. The quiet-looking a6 is deeply purposeful: it denies White's pieces the b5-square and prepares Black's two great freeing breaks, e5 and b5. From here Black plays for the full point, never a meek draw.", sayShort: "a6 — the Najdorf, controlling b5.", highlights: [H("a6", KEY), H("b5", SOFT)] }),
    b({ id: "english", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5", say: "Be3 signals the English Attack, White's most dangerous modern try — the plan is f3, Qd2, queenside castling and a pawn avalanche. Black strikes first in the centre with e5, kicking the d4-knight and seizing space. The price is the d5-square; the reward is a free, active game.", sayShort: "e5 — grab the centre, kick the knight.", highlights: [H("e5", KEY), H("d5", SOFT)] }),
    b({ id: "cover-d5", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6", say: "The knight retreats to b3, and Black calmly plugs the hole: Be6 plants the bishop where it guards the sensitive d5-square. This is the bargain Black accepts in the Najdorf — concede d5 as a square, but control it with pieces, and get rapid development and active play in return.", sayShort: "Be6 — cover the d5-square.", arrows: [A("e6", "d5", VIS)], highlights: [H("e6", KEY)] }),
    b({ id: "storm-prep", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O", say: "White builds the battering ram — f3 braces the e4-pawn and clears the path for g4, while Qd2 connects the rooks for queenside castling. Black develops Be7 and castles, eyes open to the coming kingside storm. The Najdorf deal is struck: Black will race on the queenside while White hurls pawns at the king.", sayShort: "f3 and Qd2 — White readies the storm.", highlights: [H("f3", SOFT), H("e4", SOFT)] }),
    b({ id: "race", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7", say: "The kings split — White castles queenside, straight into the path of Black's counterattack. Nbd7 develops with intent: the knight heads for c5 or b6, eyeing the c4 and d5 squares, while Black prepares the thematic b5 and b4 to prise open lines at White's king. Whoever lands first takes the point.", sayShort: "Nbd7 — prep the b5 and b4 storm.", highlights: [H("d7", KEY), H("b5", SOFT)] }),
    b({ id: "verdict", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7", say: "This is the Najdorf in essence: Black accepts a small structural concession on d5 in exchange for the most dynamic counterplay in all of chess. Against the English Attack the race is brutal and concrete — Black's b5-b4 lever and the half-open c-file hunt White's king while White's g- and h-pawns storm the other way. Master the theory, and Black wins the sharpest battles the game has to offer.", sayShort: "Concede d5, win the sharper race.", highlights: [H("d5", KEY), H("b5", SOFT)] }),
  ],
};

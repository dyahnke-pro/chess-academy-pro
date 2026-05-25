import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_dragon-content.json (validated against the gate
// suite). Edit the JSON + regenerate, or edit here and keep the JSON in sync.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
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

export const SICILIAN_DRAGON_LESSON: LessonScript = {
  openingId: "sicilian-dragon",
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation'],
  title: "The Sicilian Dragon — A Master Class",
  minutes: 9,
  orientation: "black",
  beats: [
    b({ id: "born", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6", say: "The Sicilian Dragon — Black's most combative answer to the king's-pawn opening. The c-pawn has already been swapped for White's d-pawn, handing Black a half-open c-file to pour rooks down. Now g6 prepares the fianchetto that names the whole opening, while White's knight sits proudly centralised on d4. Both sides will castle on opposite wings and race to mate.", sayShort: "The Dragon — g6 fianchetto and the c-file.", highlights: [H("g6", KEY), H("d4", SOFT)] }),
    b({ id: "dragonbishop", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7", say: "Bg7 puts the Dragon bishop on the great a1-h8 diagonal — the soul of the opening. Right now its own knight on f6 blocks the view, but the moment the centre cracks open, that bishop will rake straight through d4 toward White's queenside and king. White answers with Be3, the first brick of the Yugoslav Attack.", sayShort: "Bg7 — the Dragon bishop eyes d4 and beyond.", highlights: [H("g7", KEY), H("d4", KEY)] }),
    b({ id: "yugoslav", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O", say: "f3 is the signature of the Yugoslav Attack: it braces the e4-pawn and, more importantly, prepares g4 and h4-h5 to tear open the black king. Black calmly castles into the storm. This is the deal the Dragon strikes — Black accepts the coming kingside avalanche in exchange for a ferocious attack the other way.", sayShort: "f3 readies the storm; Black castles in.", highlights: [H("f3", SOFT), H("e4", SOFT)] }),
    b({ id: "battlelines", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6", say: "Qd2 connects White's plan — it eyes queenside castling and supports the Bh6 trade that strips Black's defender. Black develops with Nc6, leaning on the centralised d4-knight. The architecture is now clear: White castles long and throws the h-pawn; Black castles short and storms down the c-file. Whoever lands first usually wins.", sayShort: "Nc6 hits d4; the two races begin.", arrows: [A("c6", "d4", ATK)], highlights: [H("c6", KEY)] }),
    b({ id: "bishops", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7", say: "Bc4 swings White's bishop onto the a2-g8 diagonal, glaring at f7 and the black king. Black replies with the modest but vital Bd7 — it connects the rooks, guards against tactics, and clears c8 for the rook that will lead Black's counterattack. Every Dragon piece has one job: feed the assault on White's king.", sayShort: "Bc4 eyes f7; Bd7 prepares Rc8.", arrows: [A("c4", "f7", ATK)], highlights: [H("d7", KEY)] }),
    b({ id: "race", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8", say: "The kings split: White castles queenside, straight into Black's line of fire. Rc8 is the move the whole Dragon is built around — the rook crashes onto the half-open c-file, aiming through it at White's king and the c3-knight that shields him. The c3-knight is the target; remove it, and the king is bare.", sayShort: "Rc8 — the rook takes aim at c3.", highlights: [H("c8", KEY), H("c3", KEY)] }),
    b({ id: "ne5", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3 Ne5", say: "White tucks the bishop back to b3, out of the c-file's path. Then comes Ne5, a dream square for the knight: it eyes the c4-square and, crucially, vacates c6 so the rook's pressure on the c3-knight becomes real. Now every black piece points at White's king — the c8-rook down the file, the g7-bishop down the diagonal, the knight ready to leap into c4.", sayShort: "Ne5 unblocks the c-file and eyes c4.", arrows: [A("e5", "c4", ATK), A("c8", "c3", VIS)], highlights: [H("c3", KEY)] }),
    b({ id: "verdict", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3 Ne5", say: "This is the Dragon's bargain in one picture: opposite-side castling where both kings are hunted at once, and the winner is whoever's attack arrives a move sooner. Black's heavy pieces are already aimed — the c-file rook at c3, the bishop down the long diagonal from g7. Know the theory and Black scores brilliantly; play it cold and the king burns. The rest of this masterclass arms you with the lines that make Black faster.", sayShort: "Opposite castling — Black's attack aims first.", highlights: [H("g7", KEY), H("c3", SOFT)] }),
  ],
};

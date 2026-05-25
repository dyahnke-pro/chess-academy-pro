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

export const SICILIAN_DRAGON_VARIATION_LESSONS: Record<string, LessonScript> = {
  "sicilian-dragon::Yugoslav Attack: Soltis Variation": {
  openingId: "sicilian-dragon",
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation'],
  title: "Sicilian Dragon — The Soltis Variation",
  minutes: 7,
  orientation: "black",
  beats: [
    b({ id: "setup", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O", say: "The Soltis is the Yugoslav Dragon with a precise antidote held in reserve. First the familiar build-up: Black fianchettoes the Dragon bishop to g7 and castles, while White assembles the f3 and Be3 battering ram and prepares to storm the kingside.", sayShort: "Yugoslav setup — Black readies the Soltis.", highlights: [H("g7", KEY), H("f3", SOFT)] }),
    b({ id: "mobilize", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8", say: "Black's army funnels toward White's king: Nc6 presses the d4-knight, Bd7 connects the rooks, and Rc8 swings onto the c-file — the highway to White's king now that he has castled long.", sayShort: "Nc6, Bd7, Rc8 — Black aims down the c-file.", arrows: [A("c6", "d4", ATK)], highlights: [H("c8", KEY)] }),
    b({ id: "ne5", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3 Ne5", say: "White slips the bishop back to b3, off the c-file. Ne5 follows — the knight reaches its perfect square, eyeing the c4-outpost and clearing the way so the c8-rook stares straight at the c3-knight that guards White's king.", sayShort: "Ne5 — eye c4, bare the c3-knight.", arrows: [A("e5", "c4", ATK)], highlights: [H("c3", KEY)] }),
    b({ id: "soltis", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 h4 h5", say: "White lunges h4, intending h5 to crack open the h-file against the black king. The Soltis answer is h5 — Black bolts the door. With the h5-pawn nailing White's h-pawn in place, the entire kingside attack jams: no pawn lever, no open file, nothing. Meanwhile Black's queenside assault rolls on at full speed.", sayShort: "h5 — freeze the storm before it starts.", highlights: [H("h5", KEY), H("h4", SOFT)] }),
    b({ id: "verdict", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 h4 h5", say: "That is the Soltis bargain: spend one little pawn move, h5, to neutralise White's entire reason for castling queenside. The storm never comes, and Black is left attacking with rook, knight and the long-diagonal bishop from g7 against a king with no counterplay of its own. Among Dragon players this is the gold standard.", sayShort: "Storm dead; Black attacks for free.", highlights: [H("g7", KEY), H("h5", SOFT)] }),
  ],
},

  "sicilian-dragon::Yugoslav Attack: Chinese Dragon": {
  openingId: "sicilian-dragon",
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation'],
  title: "Sicilian Dragon — The Chinese Dragon",
  minutes: 7,
  orientation: "black",
  beats: [
    b({ id: "setup", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O", say: "The Chinese Dragon is a modern, hyper-aggressive take on the Yugoslav. The early moves are standard — the Dragon bishop to g7 and castling — but Black's queen's rook is headed somewhere unusual, and the whole plan is built on raw speed.", sayShort: "Yugoslav setup — but the rook goes elsewhere.", highlights: [H("g7", KEY)] }),
    b({ id: "rb8", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rb8", say: "There it is: instead of the usual Rc8, the rook drops to b8. The point is brutal and direct — Black is going to ram the b-pawn down the board, b5 then b4, blasting open the b-file straight at White's king. The rook simply waits behind the pawn it will follow.", sayShort: "Rb8 — prep the b5 and b4 battering ram.", highlights: [H("b8", KEY), H("b5", SOFT)] }),
    b({ id: "b5", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rb8 Bb3 b5", say: "Bb3 tucks the bishop away, and Black fires the first shot: b5. The pawn rolls forward threatening b4, kicking the c3-knight and tearing a hole in front of White's king. This is the Chinese Dragon's signature — Black does not maneuver, Black charges.", sayShort: "b5 — charge the b-file at the king.", highlights: [H("b5", KEY), H("c3", SOFT)] }),
    b({ id: "verdict", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rb8 Bb3 b5", say: "The Chinese Dragon trades a little soundness for raw speed: the b-pawn storm often arrives a tempo faster than White's kingside play, and with the rook already on b8 every pawn push comes with heavy backing. It is the weapon of the Dragon player who wants to attack first and ask questions never — the long-diagonal bishop on g7 joining the assault.", sayShort: "Fastest queenside storm in the Dragon.", highlights: [H("b8", KEY), H("g7", SOFT)] }),
  ],
},

  "sicilian-dragon::Classical Variation": {
  openingId: "sicilian-dragon",
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation'],
  title: "Sicilian Dragon — The Classical Variation",
  minutes: 7,
  orientation: "black",
  beats: [
    b({ id: "quiet", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be2", say: "Not every White player wants the chaos of the Yugoslav. The Classical Variation is the calm approach: Be2 and short castling, no pawn storm, no opposite-side race. White settles for a quiet positional game — which suits a well-prepared Dragon player just fine.", sayShort: "Be2 — the calm, no-storm Classical.", highlights: [H("e2", KEY)] }),
    b({ id: "develop", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be2 Bg7 O-O O-O Be3 Nc6", say: "Both sides castle short — no king hunt here. Black develops naturally: the Dragon bishop on g7, the knight to c6 pressing the d4-square. With no storm to fear, Black can simply play chess, and the long-diagonal bishop becomes a lasting asset rather than a harried defender.", sayShort: "Bg7 and Nc6 — Black plays freely.", arrows: [A("c6", "d4", ATK)], highlights: [H("g7", KEY)] }),
    b({ id: "regroup", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be2 Bg7 O-O O-O Be3 Nc6 Nb3 Be6 f4 Na5", say: "White retreats the knight to b3 and grabs space with f4. Black's reply is instructive: Be6 develops the last minor piece, then Na5 heads for the c4-outpost, offering to swap off White's good bishop. Black's pieces find their best squares while White's extra space gains nothing concrete.", sayShort: "Na5 heads to c4; Be6 completes Black.", arrows: [A("a5", "c4", ATK)], highlights: [H("e6", KEY)] }),
    b({ id: "equal", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be2 Bg7 O-O O-O Be3 Nc6 Nb3 Be6 f4 Na5 f5 Bc4", say: "White pushes f5 for kingside space, but Black calmly plants the bishop on c4, trading off White's best minor piece and leaving the structure rock-solid. Notice the contrast with the Yugoslav: no king is in danger, and Black has comfortably equalised simply by putting every piece on a good square.", sayShort: "Bc4 trades; Black is comfortably equal.", highlights: [H("c4", KEY), H("f5", SOFT)] }),
  ],
},

  "sicilian-dragon::Levenfish Variation": {
  openingId: "sicilian-dragon",
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation'],
  title: "Sicilian Dragon — The Levenfish Variation",
  minutes: 7,
  orientation: "black",
  beats: [
    b({ id: "f4", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 f4", say: "The Levenfish is White's most aggressive try: f4 early, carrying the blunt threat of e5 to hit the f6-knight and blow Black off the board before the Dragon gets going. It looks frightening — but there is a clean, well-known antidote.", sayShort: "f4 — White threatens the e5 fork.", highlights: [H("f4", KEY), H("e5", SOFT)] }),
    b({ id: "nbd7", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 f4 Nbd7", say: "Nbd7 — this is the key. The natural Bg7 would walk into e5, but Nbd7 quietly props up the e5-square alongside the d6-pawn, and White's whole point evaporates. The knight sits modestly, yet it kills the venom of the f4-push before Black calmly develops the rest.", sayShort: "Nbd7 — guards e5, defuses f4.", arrows: [A("d7", "e5", ATK)], highlights: [H("e5", KEY)] }),
    b({ id: "develop", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 f4 Nbd7 Nf3 Qc7 Bd3 Bg7", say: "With the threat gone, Black develops smoothly: Qc7 eyes the e5-square and the half-open c-file, and only now Bg7, the Dragon bishop, takes the long diagonal in complete safety. White's early aggression has bought nothing at all.", sayShort: "Qc7 and Bg7 — develop in safety.", highlights: [H("g7", KEY), H("e5", SOFT)] }),
    b({ id: "equal", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 f4 Nbd7 Nf3 Qc7 Bd3 Bg7 O-O O-O Qe1 Nc5", say: "Both sides castle, and Nc5 swings the knight to an active post, hitting White's e4-pawn and the d3-bishop at once. Black has emerged from the Levenfish with a completely sound, comfortable Dragon — the early f4 thrust turned out to be a puff of smoke.", sayShort: "Nc5 hits e4 and d3 — Black's fine.", arrows: [A("c5", "e4", ATK), A("c5", "d3", VIS)] }),
  ],
},

  "sicilian-dragon::Accelerated Dragon": {
  openingId: "sicilian-dragon",
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation'],
  title: "Sicilian Dragon — The Accelerated Dragon",
  minutes: 7,
  orientation: "black",
  beats: [
    b({ id: "accelerate", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6", say: "The Accelerated Dragon plays g6 a move early, before committing the d-pawn. The idea is speed — Black wants the long-diagonal bishop on g7 striking at d4 fast, sometimes saving a whole tempo over the regular Dragon. But the move order hands White one critical extra option.", sayShort: "g6 early — speed, but White gets c4.", highlights: [H("g6", KEY), H("d4", SOFT)] }),
    b({ id: "maroczy", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Nf6 Nc3 d6", say: "c4 — the Maroczy Bind. By planting pawns on c4 and e4, White clamps the d5-square and takes a broad space advantage. This is the price of the Accelerated move order: Black cannot easily free the position with d5, so the game becomes a patient struggle to undermine the bind from the side.", sayShort: "c4 — the Maroczy Bind clamps d5.", highlights: [H("c4", KEY), H("e4", KEY), H("d5", SOFT)] }),
    b({ id: "plan", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Nf6 Nc3 d6 Be2 Bg7 Be3 O-O O-O Nxd4 Bxd4 Bd7", say: "Black develops and trades on d4 with Nxd4, then Bd7 prepares the key regrouping — the bishop heads to c6 to challenge White's e4-pawn and the long light-square diagonal. Against the bind, Black's plan is patient: pressure e4, expand with a5 and b6, and watch for the freeing f5-break.", sayShort: "Bd7 readies c6, pressuring e4.", highlights: [H("d7", KEY), H("e4", SOFT)] }),
    b({ id: "honest", moves: "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Nf6 Nc3 d6 Be2 Bg7 Be3 O-O O-O Nxd4 Bxd4 Bd7", say: "Be honest about the Maroczy: White is a touch more comfortable, with more space and the easier game. But it is far from lost — Black is solid as a rock, and the bind has been the graveyard of impatient White players for decades. Trade, restrain, and strike with f5 or b5 when the moment is right, with the Dragon bishop on g7 always ready.", sayShort: "Solid but cramped — strike with f5 later.", highlights: [H("g7", KEY)] }),
  ],
},

  "sicilian-dragon::Anti-Dragon: Bg5 Line": {
  openingId: "sicilian-dragon",
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation'],
  title: "Sicilian Dragon — The Anti-Dragon Bg5 Line",
  minutes: 7,
  orientation: "black",
  beats: [
    b({ id: "bg5", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Bg5", say: "Instead of the Yugoslav's Be3, White tries Bg5 — a tricky anti-Dragon, eyeing the e7 and f6 squares and hoping to provoke weaknesses around Black's knight. Black should not be impressed: a few active, concrete moves neutralise it cleanly.", sayShort: "Bg5 — a tricky anti-Dragon try.", highlights: [H("g5", KEY), H("f6", SOFT)] }),
    b({ id: "develop", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 Nc6", say: "Black develops with healthy moves — Bg7 grabbing the long diagonal, Nc6 pressing the d4-knight. White lines up Qd2, dreaming of Bh6 to trade off Black's proud bishop. Black must act before that idea gets going.", sayShort: "Bg7 and Nc6 — develop and hit d4.", arrows: [A("c6", "d4", ATK)], highlights: [H("g7", KEY)] }),
    b({ id: "kick", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 Nc6 Nb3 h6 Be3 Ng4", say: "White retreats the knight to b3; Black strikes with h6, putting the question to the g5-bishop. After it drops back to e3, Ng4 jumps in with tempo, hitting the bishop again and forcing yet another concession. Black seizes the initiative against White's slow setup.", sayShort: "h6 and Ng4 kick the bishop, grabbing initiative.", arrows: [A("g4", "e3", ATK)], highlights: [H("h6", KEY)] }),
    b({ id: "comfortable", moves: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 Nc6 Nb3 h6 Be3 Ng4 Bf4 a6", say: "The bishop shuffles to f4 and Black plays the useful a6, preparing b5 and a queenside expansion. The verdict on this anti-Dragon: by meeting it with quick, concrete moves rather than passive defence, Black reaches a comfortable, active Dragon — White's Bg5 sortie achieved nothing lasting.", sayShort: "a6 readies b5 — Black's comfortable.", highlights: [H("f4", KEY), H("a6", SOFT)] }),
  ],
},
};

import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_scotch-content.json (validated against the gate
// suite). Edit the JSON + regenerate, or edit here and keep the JSON in sync.
const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const INTENT = 'rgba(40,185,95,0.92)';
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

export const SCOTCH_GAME_LESSON: LessonScript = {
  openingId: "scotch-game",
  title: "The Scotch Game — A Master Class",
  minutes: 13,
  orientation: "white",
  beats: [
    b({ id: "open", moves: "e4 e5 Nf3 Nc6", say: "Welcome to the Scotch — the opening that asks its question on move three and refuses to wait. We reach the familiar crossroads: 1.e4 e5 2.Nf3 Nc6, White attacking the e5-pawn, Black defending it. The Italian and the Ruy now circle for a slow build. The Scotch does the opposite — it strikes the centre at once.", sayShort: "e5 — the open-game start; the Scotch won't wait.", arrows: [A("f3", "e5", ATK), A("c6", "e5", VIS)], highlights: [H("e5", KEY)] }),
    b({ id: "d4", moves: "e4 e5 Nf3 Nc6 d4", say: "3.d4! This is the whole idea. Instead of bracing the break with c3 like the Italian, White throws the d-pawn at e5 immediately. Black almost always takes — leaving the pawn would just lose it — and the centre cracks wide open on move three. The Scotch trades the slow positional squeeze for fast, free piece play in an open position.", sayShort: "d4! — strike the centre at once.", highlights: [H("d4", KEY), H("e5", SOFT)] }),
    b({ id: "exd4-nxd4", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4", say: "3…exd4 4.Nxd4 — and there sits the Scotch knight, planted on d4 in the centre of the board, eyeing c6, f5, and b5 at once. This is the opening's signature: a beautifully centralised knight and open lines for every piece. Edward Lasker's rule rings true — a knight on a strong central square is worth a tempo of development. The cost is that the symmetry is gone and the game turns sharp.", sayShort: "Nxd4 — the centralised Scotch knight dominates.", arrows: [A("d4", "c6", ATK), A("d4", "f5", INTENT)], highlights: [H("d4", KEY)] }),
    b({ id: "bc5", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5", say: "Black's most principled reply: 4…Bc5, the Classical Variation. The bishop develops with tempo, attacking the d4-knight and pointing menacingly toward f2. White cannot ignore it — the knight is the pride of the position and must be defended. The fight is now about who controls d4.", sayShort: "…Bc5 — the Classical, hitting the d4-knight.", arrows: [A("c5", "d4", ATK)], highlights: [H("d4", KEY), H("f2", SOFT)] }),
    b({ id: "be3-qf6", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6", say: "5.Be3 defends the knight and stares back at the c5-bishop. Black piles on with 5…Qf6, a second attacker on d4 that also eyes f2 and the dark squares. The whole opening now balances on the d4-square — two White defenders, two Black attackers. White's next move is the quiet glue that holds it all together.", sayShort: "Be3 Qf6 — both pile onto d4.", arrows: [A("f6", "d4", ATK)], highlights: [H("d4", KEY), H("f2", SOFT)] }),
    b({ id: "c3", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3", say: "6.c3 — modest but vital. The pawn adds a third support to the d4-knight and quietly takes the d4 and b4 squares away from Black's pieces. Now the tension is stable, and White can finish development knowing the centralised knight is rock-solid. From here the plans diverge into rich, open middlegame play.", sayShort: "c3 — a third support; the d4-knight is solid.", highlights: [H("d4", KEY)] }),
    b({ id: "nge7-bc4", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4", say: "6…Nge7 develops the king-knight toward g6 and keeps the pawn structure intact, and White brings out the Italian bishop with 7.Bc4 — straight at f7, the soft square every open-game attack returns to. The pieces are flowing out fast; this is the Scotch's promise paying off — open lines, active bishops, a dominant knight.", sayShort: "Nge7 Bc4 — develop fast, the bishop eyes f7.", arrows: [A("c4", "f7", ATK)], highlights: [H("f7", KEY)] }),
    b({ id: "castle-d6", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 O-O O-O d6", say: "Both kings reach safety — 7…O-O 8.O-O — and Black plays 8…d6 to free his light-squared bishop and shore up the c5-bishop's diagonal. The position is balanced and tense, every piece nearly developed. Now White begins the trades and the pawn expansion that define the Classical Scotch middlegame.", sayShort: "O-O d6 — kings safe, the fight opens.", highlights: [H("d6", KEY), H("c5", SOFT)] }),
    b({ id: "trades", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 O-O O-O d6 Nxc6 Nxc6 Bxc5 dxc5", say: "9.Nxc6 Nxc6 10.Bxc5 dxc5 — White cashes in the central tension. Trading the knights and the dark-squared bishops leaves Black with doubled c-pawns and hands White the cleaner structure plus the safer king. The dynamic Scotch has steered into a small but durable positional plus — exactly the kind of edge the open centre was meant to produce.", sayShort: "Nxc6, Bxc5 — trade into Black's doubled c-pawns.", highlights: [H("c5", KEY)] }),
    b({ id: "f4", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 O-O O-O d6 Nxc6 Nxc6 Bxc5 dxc5 f4", say: "11.f4 — White claims the initiative on the kingside. The pawn grabs space, prepares f4-f5 to cramp Black further, and opens a future attacking front while Black is busy untangling his doubled queenside pawns. With the bishop pair gone and the better structure secured, White simply plays for the long-term squeeze.", sayShort: "f4 — grab kingside space, prepare f5.", highlights: [H("f4", KEY), H("f5", SOFT)] }),
    b({ id: "be6-bb5", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 O-O O-O d6 Nxc6 Nxc6 Bxc5 dxc5 f4 Be6 Bb5", say: "11…Be6 develops the last minor piece and offers a trade of light-squared bishops; White slides to 12.Bb5, pinning and pressuring the c6-knight that holds Black's position together. The plan is clear and Capablanca-clean: trade into the structure, target the weak doubled pawns, and let the healthier majority decide the game.", sayShort: "Be6 Bb5 — pin and press the c6-knight.", arrows: [A("b5", "c6", ATK)], highlights: [H("c6", KEY)] }),
    b({ id: "close", moves: "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 O-O O-O d6 Nxc6 Nxc6 Bxc5 dxc5 f4 Be6 Bb5 Rad8", say: "12…Rad8 centralises a rook and we reach the Classical Scotch middlegame: White with the sounder structure, the f4-f5 space, and pressure on the c6-knight; Black with the bishop pair gone and doubled c-pawns to nurse. That is the Scotch in one breath — strike d4 early, plant the knight, open the lines, trade into a clean edge. The other tabs show the opening's other faces: the sharp Mieses, the dashing Scotch Gambit, the solid Four Knights, and Kasparov's own Nb3 weapon.", sayShort: "Rad8 — the Classical edge: structure and space.", highlights: [H("d4", SOFT), H("f5", SOFT)] }),
  ],
};

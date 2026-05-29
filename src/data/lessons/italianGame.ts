import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
//
// SPINE IS DATA-DRIVEN (masterclass data-rebuild doctrine, 2026-05-29). The
// move backbone is the most-played master continuation at every ply (the
// modern Giuoco Pianissimo), walked from data/sources/opening-spines/
// italian-game.json — NOT hand-picked. It reaches move 20 with 97 master games
// still on the exact line. The LLM authors prose ONLY; it never chose a move.
// The classical 4.c3 d4 Giuoco Piano (the old main line, less common today)
// now lives as a variation tab.
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

export const ITALIAN_GAME_LESSON: LessonScript = {
  openingId: "italian-game",
  sources: ['book:italian-game', 'concept:pos-center', 'concept:pos-development', 'https://www.chess.com/openings/Italian-Game'],
  title: "The Italian Game — A Master Class",
  minutes: 14,
  orientation: "white",
  beats: [
    b({ id: "open", moves: "e4 e5", say: "The oldest analysed opening in chess — written down by Damiano in 1512, polished by Greco a century later. It begins the way every classical fight begins: e4 meets e5, two pawns claiming the centre, neither giving ground. The Italian's whole personality grows from one question that's about to be asked — which piece points at f7, the one square in front of Black's king that only the king itself defends.", sayShort: "e4 e5 — classical centre, eyes on f7.", highlights: [H("e4", KEY), H("e5", KEY), H("f7", SOFT)] }),
    b({ id: "nf3", moves: "e4 e5 Nf3", say: "Nf3 — develop a piece and attack something at the same time. The knight leaps out and pressures e5, forcing Black to react. No shuffling: White asks a question on move two. Defend the pawn, or lose it.", sayShort: "Nf3 — develop and hit e5.", arrows: [A("f3", "e5", ATK)], highlights: [H("e5", KEY)] }),
    b({ id: "nc6", moves: "e4 e5 Nf3 Nc6", say: "The most natural defence: the queen-knight comes to c6, its best square, propping up e5 a second time. The fight for the centre is joined — and now White makes the move the opening is named for.", sayShort: "…Nc6 — defends e5.", arrows: [A("c6", "e5", ATK)], highlights: [H("e5", KEY)] }),
    b({ id: "bc4", moves: "e4 e5 Nf3 Nc6 Bc4", say: "Bc4 — the Italian bishop. From c4 it stares straight down the long light diagonal at f7, the only square near Black's king defended by nothing but the king. Every plan in the Italian, slow or violent, eventually comes back to pressure on this square.", sayShort: "Bc4 — the Italian bishop drills into f7.", arrows: [A("c4", "f7", ATK)], highlights: [H("f7", KEY)] }),
    b({ id: "bc5", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5", say: "Bc5 — the Giuoco Piano, the \"quiet game.\" Black mirrors, aiming his own bishop at f2 exactly as White aims at f7. The position is symmetrical, both sides pointed at the other's weak f-pawn. Symmetry is an invitation: whoever breaks it first in his own favour takes the initiative.", sayShort: "…Bc5 — the Giuoco mirror; c5 eyes f2.", arrows: [A("c5", "f2", ATK)], highlights: [H("f2", KEY), H("f7", SOFT)] }),
    b({ id: "c3", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3", say: "c3 — modest, and the foundation of the whole plan. The pawn reserves d4 for later and hands the bishop a bolt-hole on c2 if it ever gets kicked. Patience first: build, then strike.", sayShort: "c3 — reserve d4, give the bishop c2.", highlights: [H("d4", SOFT), H("c2", SOFT)] }),
    b({ id: "nf6", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6", say: "Nf6 develops with a threat — the knight eyes e4 — and asks White how to handle the centre. The old masters answered with the immediate d4 break. The modern answer, and the one master games overwhelmingly choose today, is quieter and deeper.", sayShort: "…Nf6 — develops, eyes e4.", arrows: [A("f6", "e4", ATK)], highlights: [H("e4", KEY)] }),
    b({ id: "d3", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3", say: "d3 — the Giuoco Pianissimo, the \"quietest game,\" and the heart of the modern Italian. Instead of the violent d4 break, White underpins e4 and settles in for a long manoeuvring battle: knights rerouted to the kingside, the centre held in reserve, the d4-break saved until everything is aimed at it. This patient squeeze is what the strongest players reach for again and again.", sayShort: "d3 — the Pianissimo: hold, manoeuvre, wait.", highlights: [H("e4", KEY), H("d4", SOFT)] }),
    b({ id: "d6", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6", say: "Black mirrors with d6, bracing his own e5-pawn. The structures are symmetrical and closed; this is a battle of plans and tempo, not tactics — for now.", sayShort: "…d6 — Black mirrors, braces e5.", highlights: [H("e5", SOFT)] }),
    b({ id: "castle", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O", say: "Both kings tuck into safety. With the centre closed there's no rush — castle first, then start the slow build. The middlegame the Pianissimo steers toward is a kingside attack, so getting the king off the centre comes before everything.", sayShort: "O-O O-O — both kings safe, then build." }),
    b({ id: "re1", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1", say: "Re1 does two quiet jobs. It backs up the e4-pawn, and it clears f1 — because the queen-knight is about to take the scenic route to the kingside, and f1 is the first stop. This rook lift is the signature of the modern Italian setup.", sayShort: "Re1 — guard e4, vacate f1 for the knight.", arrows: [A("e1", "e4", VIS)], highlights: [H("e4", KEY), H("f1", SOFT)] }),
    b({ id: "a5", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5", say: "a5 — Black grabs space on the queenside and, just as importantly, stops White's b4. It also reserves a7 as a retreat for the c5-bishop. Both sides are claiming territory on the wing before the centre ever opens.", sayShort: "…a5 — queenside space, stop b4.", highlights: [H("a5", KEY), H("b4", SOFT)] }),
    b({ id: "luft", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6", say: "h3 and …h6 — each side spends a move to deny the other's bishop the g4 and g5 squares. Routine prophylaxis, but it matters: in a slow manoeuvring fight you remove the opponent's cheap activity before you commit your own pieces.", sayShort: "h3 …h6 — deny the g4/g5 pins.", highlights: [H("h3", SOFT), H("h6", SOFT)] }),
    b({ id: "nbd2", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6 Nbd2", say: "Nbd2 — the manoeuvre that defines the whole opening begins. The queen-knight heads for the kingside by the long road: d2, then f1, then on to g3 or e3, where it joins the build-up against Black's king. The Pianissimo is patient, but it is not passive — every quiet move is loading a spring.", sayShort: "Nbd2 — start the knight's trek to the kingside.", arrows: [A("d2", "f1", INTENT)], highlights: [H("f1", KEY)] }),
    b({ id: "be6-bb5", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6 Nbd2 Be6 Bb5", say: "Black offers a trade with Be6, challenging the proud Italian bishop. White declines and slides to b5 — keeping the bishop alive and pinning it against the c6-knight that guards e5. A good bishop is worth a tempo to preserve.", sayShort: "…Be6 Bb5 — dodge the trade, pin c6.", arrows: [A("b5", "c6", ATK)], highlights: [H("c6", KEY)] }),
    b({ id: "queen-reroute", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6 Nbd2 Be6 Bb5 Qb8 Nf1 Qa7", say: "Both sides reroute their heaviest pieces. White's knight reaches f1, one step from g3 or e3. Black answers with a plan of his own: Qb8 then Qa7, lifting the queen onto the a7-g1 diagonal — for now its own bishop on c5 blocks the view of f2, but the moment those bishops trade the queen will glare straight at White's king. Manoeuvre against manoeuvre.", sayShort: "Nf1 …Qa7 — knight up, queen onto a7-g1.", highlights: [H("f1", KEY), H("a7", KEY)] }),
    b({ id: "trade-dark", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6 Nbd2 Be6 Bb5 Qb8 Nf1 Qa7 Be3 Bxe3 Nxe3", say: "Be3 challenges the dark-squared bishops, and after Bxe3 Nxe3 the f1-knight lands on e3 — a superb square, eyeing the d5 and f5 holes in Black's camp. Trading off Black's good bishop while improving White's knight is a small, permanent gain — the kind the Pianissimo accumulates.", sayShort: "Be3 …Bxe3 Nxe3 — knight to e3, eyes d5/f5.", arrows: [A("e3", "d5", VIS), A("e3", "f5", VIS)], highlights: [H("d5", KEY), H("f5", KEY)] }),
    b({ id: "knight-g6", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6 Nbd2 Be6 Bb5 Qb8 Nf1 Qa7 Be3 Bxe3 Nxe3 Ne7 a4 Ng6", say: "Black reroutes too — the c6-knight travels e7 to g6, swinging to the kingside to contest White's build-up. White slips in a4, fixing the queenside so Black's a-pawn can't roll further. Every piece is finding its best square before a single pawn is traded in the centre.", sayShort: "…Ne7-g6, a4 — reroute and fix the queenside.", highlights: [H("g6", KEY), H("a4", SOFT)] }),
    b({ id: "d4-break", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6 Nbd2 Be6 Bb5 Qb8 Nf1 Qa7 Be3 Bxe3 Nxe3 Ne7 a4 Ng6 d4", say: "d4 — at last. The break the whole opening reserved on move nine finally lands, now that every White piece is poised behind it. The pawn strikes at e5 and tears the closed centre open. This is the Pianissimo's secret: it isn't a quiet opening, it's a delayed one — the centre opens on White's terms, with the pieces already aimed at the Black king.", sayShort: "d4 — the long-delayed break, now fully backed.", highlights: [H("d4", KEY), H("e5", KEY)] }),
    b({ id: "tactics", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6 Nbd2 Be6 Bb5 Qb8 Nf1 Qa7 Be3 Bxe3 Nxe3 Ne7 a4 Ng6 d4 Nxe4 Bd3 Nf6 Bxg6 fxg6 dxe5 dxe5 Nxe5", say: "The centre detonates into a forcing sequence. Black grabs e4; White pins and chases with Bd3, trades on g6 to fracture Black's kingside pawns, then liquidates with dxe5 and scoops the pawn back with Nxe5. When the dust settles White holds the better structure — Black's doubled, broken kingside is a lasting scar.", sayShort: "Bd3, Bxg6, Nxe5 — net e5, wreck Black's pawns.", arrows: [A("e5", "g6", VIS)], highlights: [H("g6", KEY), H("e5", KEY)] }),
    b({ id: "close", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6 Nbd2 Be6 Bb5 Qb8 Nf1 Qa7 Be3 Bxe3 Nxe3 Ne7 a4 Ng6 d4 Nxe4 Bd3 Nf6 Bxg6 fxg6 dxe5 dxe5 Nxe5 g5 Nc2", say: "And that is the modern Italian. One idea runs through all of it: develop fast, hold the centre with d3, manoeuvre every piece to its best square — knight to e3, rook to e1, bishop on the f7 diagonal — and only THEN break with d4, with the whole army already aimed at the king. Patient, then sudden. The other tabs are the Italian's louder faces: the classical d4 Giuoco Piano, the sharp Two Knights, the violent Evans. Same target every time — the f7-square you've watched all game.", sayShort: "Hold, manoeuvre, then break d4 — the Pianissimo's soul.", highlights: [H("f7", SOFT), H("e3", SOFT), H("d4", SOFT)] }),
  ],
};

import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_italian-content.json (validated against the gate
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

export const ITALIAN_GAME_VARIATION_LESSONS: Record<string, LessonScript> = {
  "italian-game::Italian: Two Knights with d4": {
  openingId: "italian-game",
  sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
  title: "Italian Game — Two Knights with d4",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "t1", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6", say: "Instead of mirroring with Bc5, Black plays Nf6 — the Two Knights Defence, the aggressive choice. The knight immediately attacks the e4-pawn and dares White to do something about it. This is one of the oldest and sharpest battlegrounds in chess. White has the swashbuckling Ng5 going straight for f7, but here we study the principled centre break: d4.", sayShort: "…Nf6 — the Two Knights hits e4 at once.", arrows: [A("f6", "e4", ATK)], highlights: [H("e4", KEY)] }),
    b({ id: "t2", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O", say: "d4! exd4 O-O — White strikes the centre and then, rather than recapture the pawn on d4, simply castles. This is the modern, dynamic treatment: White hands Black the d4-pawn and in return gets a huge lead in development with open lines toward the Black king. The gambit pawn is irrelevant; the time is everything.", sayShort: "d4 exd4 O-O — gambit the pawn for development.", highlights: [H("d4", KEY)] }),
    b({ id: "t3", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5", say: "Nxe4 grabs a second pawn — and walks into Re1, the rook pinning the e4-knight against the king down the open e-file. Black must defend, and the only move is d5, blocking the file and giving the knight a shield. The position is razor-sharp: Black is two pawns up but every one of his pieces is loose and his king is stuck in the centre.", sayShort: "Nxe4 Re1 d5 — pin and prop the e-file.", arrows: [A("e1", "e4", ATK)], highlights: [H("e4", KEY), H("d5", KEY)] }),
    b({ id: "t4", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5 Bxd5 Qxd5 Nc3", say: "Bxd5! Qxd5 Nc3 — the key tactical point. White sacrifices the bishop to drag Black's queen to d5, then springs Nc3 forking the queen and the e4-knight at the same time. The knight develops with tempo and White is about to regain the material with interest. Watch how every White move comes with a threat — that is the dividend of the development lead.", sayShort: "Bxd5 Qxd5 Nc3 — fork queen and knight.", arrows: [A("c3", "e4", ATK), A("c3", "d5", ATK)], highlights: [H("e4", KEY), H("d5", KEY)] }),
    b({ id: "t5", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5 Bxd5 Qxd5 Nc3 Qa5 Nxe4 Be6 Neg5", say: "Qa5 Nxe4 Be6 Neg5 — Black's queen flees to a5 and White scoops the e4-knight back, restoring material equality. When Black covers f7 with Be6, White redoubles with Neg5, attacking that e6-bishop and renewing the pressure on f7. The forcing sequence is still flowing, and White's pieces remain the more active throughout.", sayShort: "Nxe4 Be6 Neg5 — regain piece, hit e6.", arrows: [A("g5", "e6", ATK)], highlights: [H("e6", KEY)] }),
    b({ id: "t6", moves: "e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5 Bxd5 Qxd5 Nc3 Qa5 Nxe4 Be6 Neg5 O-O-O Nxe6 fxe6 Rxe6 Bd6", say: "O-O-O Nxe6 fxe6 Rxe6 Bd6 — the dust finally settles. Black castles long out of the pin, the knights are traded on e6, and White's rook grabs the e6-pawn, landing actively in the heart of Black's position. The verdict: material is level, but White's better pawn structure and his active rook give a small, lasting pull. Know this forcing line cold — it's how you punish Nxe4 — but understand that with accurate play it leads to a balanced, playable middlegame, not a knockout.", sayShort: "Nxe6 fxe6 Rxe6 — level, but White presses.", arrows: [A("e6", "d6", VIS)], highlights: [H("e6", KEY), H("d6", SOFT)] }),
  ],
},

  "italian-game::Evans Gambit Accepted: Main Line": {
  openingId: "italian-game",
  sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
  title: "Italian Game — The Evans Gambit",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "e1", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4", say: "b4 — the Evans Gambit, the most romantic weapon in the Italian and a favourite of Morphy and, in the modern era, Kasparov. White throws a wing pawn at the c5-bishop. The idea is pure energy: if Black grabs the pawn, White gains the tempo to play c3 and d4, builds a massive centre, and unleashes the c4-bishop and the dark-squared bishop on the long diagonals. A pawn for a head start.", sayShort: "b4! — the Evans: a pawn for the lead.", highlights: [H("b4", KEY), H("c5", SOFT)] }),
    b({ id: "e2", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Bc5", say: "Bxb4 c3 — Black accepts, and White plays the point of the gambit: c3, gaining a tempo by attacking the b4-bishop while preparing the d4 break. The bishop retreats to c5 with Bc5, returning to the diagonal it came from. White has surrendered a pawn but gained exactly what he wanted — the time to seize the centre.", sayShort: "Bxb4 c3 — kick the bishop, prepare d4.", highlights: [H("c3", KEY), H("d4", SOFT)] }),
    b({ id: "e3", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Bc5 d4 exd4 O-O d6 cxd4", say: "d4 exd4 O-O d6 cxd4 — and there it is: the broad pawn centre, pawns on d4 and e4, exactly the structure the gambit paid for. White is down a pawn but his centre is huge, his king is castled, and his pieces are ready to pour out. Black has slowed White with the solid d6, but now White claims the space he bought.", sayShort: "d4 O-O cxd4 — the bought centre stands tall.", highlights: [H("d4", KEY), H("e4", KEY)] }),
    b({ id: "e4", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Bc5 d4 exd4 O-O d6 cxd4 Bb6 d5", say: "Bb6 d5! — the bishop slides back to the safe b6-square, and White lunges forward with d5, gaining space with tempo by hitting the c6-knight. This is the modern engine-approved treatment: rather than keep the tension, White rolls the centre pawn forward, cramps Black, and forces the knight to a miserable square.", sayShort: "Bb6 d5! — roll the pawn, kick the knight.", highlights: [H("d5", KEY), H("c6", SOFT)] }),
    b({ id: "e5", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Bc5 d4 exd4 O-O d6 cxd4 Bb6 d5 Na5 Bb2", say: "Na5 Bb2 — the knight is shoved to the rim on a5, biting on the c4-bishop but doing nothing for Black's king. White answers with the thematic Bb2, planting the dark-squared bishop on the long diagonal where it rakes all the way toward g7 and Black's castled home. The two bishops on c4 and b2 are the Evans Gambit's twin cannons.", sayShort: "Na5 Bb2 — knight to rim; bishop rakes g7.", arrows: [A("b2", "g7", ATK)], highlights: [H("a5", KEY), H("g7", SOFT)] }),
    b({ id: "e6", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Bc5 d4 exd4 O-O d6 cxd4 Bb6 d5 Na5 Bb2 Ne7", say: "Ne7 brings the other knight back toward the defence — the Paulsen Variation — and we reach the Evans tabiya. Survey what White bought with one pawn: a space-gaining centre, two bishops aimed at f7 and g7, an open b-file behind the Bb2, and the half-open c-file for a rook. Black's a5-knight is offside and his king will need careful defending. The plans from here are Nbd2-f3 ideas, Qb3 or Qc2 joining the f7 assault, and a kingside pawn storm. This is why the Evans scores so brutally against the unprepared: every White piece points at the king.", sayShort: "Ne7 — bishops blaze at f7 and g7.", arrows: [A("b2", "g7", ATK)], highlights: [H("f7", KEY), H("g7", KEY)] }),
  ],
},

  "italian-game::Italian: Modern Moller Attack": {
  openingId: "italian-game",
  sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
  title: "Italian Game — The Møller Attack",
  minutes: 12,
  orientation: "white",
  beats: [
    b({ id: "o1", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3", say: "The Møller Attack is the most spectacular line in the entire Italian — a willing sacrifice of a full rook for a raging attack. We branch from the main line at the check: after Bb4+ White plays not the calm Bd2, but the fighting Nc3, defending the check with a piece and keeping the broad d4-e4 centre completely intact. White is offering Black the chance to win material — and inviting him to regret it.", sayShort: "Nc3 — keep the centre, dare Black to grab.", highlights: [H("c3", KEY), H("d4", SOFT)] }),
    b({ id: "o2", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O Nxc3 bxc3 Bxc3", say: "Nxe4 O-O — Black snatches the e4-pawn and White just castles, ignoring it. After Nxc3 bxc3 Bxc3 Black has greedily munched two centre pawns and is now eyeing the rook in the corner. Every Black move has been a capture; not one has developed a new piece or helped his king. White, meanwhile, is fully castled with both bishops loaded. The trap is set.", sayShort: "Nxe4 O-O Bxc3 — Black feasts; White just develops.", highlights: [H("e4", KEY), H("c3", KEY)] }),
    b({ id: "o3", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O Nxc3 bxc3 Bxc3 Qb3", say: "Qb3!! — the move that makes the Møller immortal. The queen leaps out with a double purpose: it attacks the c3-bishop and, far more dangerously, it joins the c4-bishop in a battery firing straight at f7. Two pieces now bear down on the one square the king alone defends. Black's c3-bishop is hanging, but if he stops to save it, the storm on f7 breaks. He is being asked to choose between his pieces and his king.", sayShort: "Qb3!! — queen and bishop double on f7.", arrows: [A("c4", "f7", ATK)], highlights: [H("f7", KEY), H("c3", SOFT)] }),
    b({ id: "o4", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O Nxc3 bxc3 Bxc3 Qb3 Bxa1 Bxf7+ Kf8", say: "Bxa1 — Black takes the rook, winning the exchange and seemingly the game. Bxf7+! White ignores his lost rook and smashes the bishop into f7 with check. The king cannot take — after Kxf7 the queen check on b3 collects everything — so it shuffles to f8 with Kf8, and now Black's king is stranded in the centre, his queenside asleep, and his trophy bishop marooned in the corner on a1.", sayShort: "Bxa1 Bxf7+! — ignore the rook, crack the king.", highlights: [H("f7", KEY), H("f8", SOFT)] }),
    b({ id: "o5", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O Nxc3 bxc3 Bxc3 Qb3 Bxa1 Bxf7+ Kf8 Bg5 Ne7 Ne5", say: "Bg5! Ne7 Ne5 — White brings the reserves with gain of time. The g5-bishop pins and harasses, Black props up with the knight on e7, and Ne5 plants the knight in the centre, supporting the f7-bishop and threatening to leap into d7 or g6 with devastating effect. White is down a whole rook and entirely winning — because every single one of his pieces is attacking and Black's are spectators.", sayShort: "Bg5 Ne7 Ne5 — down a rook, still winning.", arrows: [A("g5", "e7", ATK), A("e5", "f7", VIS)], highlights: [H("e7", KEY), H("e5", KEY)] }),
    b({ id: "o6", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O Nxc3 bxc3 Bxc3 Qb3 Bxa1 Bxf7+ Kf8 Bg5 Ne7 Ne5 Bxd4 Bg6 d5 Qf3+ Bf5 Bxf5", say: "The finish is a hurricane: Bxd4 Bg6! d5 Qf3+ Bf5 Bxf5 — the bishop sacrifices itself again to drag out a defender, the queen swings to f3 with check, and White's attack rolls on with crushing force. Modern analysis has shown that with inhuman precision Black can hold parts of the Møller to a draw — but across the board, against a human, this is one of the deadliest practical weapons in all of chess. The lesson of the Møller: pawns and even rooks are worth nothing next to an attack on a king that cannot run.", sayShort: "Bg6, Qf3+ — the hurricane; an unstoppable attack.", highlights: [H("f5", KEY), H("f3", SOFT)] }),
  ],
},

  "italian-game::Giuoco Piano: Main Line with Nc3": {
  openingId: "italian-game",
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Giuoco_Piano'],
  title: "Italian — Giuoco Piano Main Line (Nc3)",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "gn1", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4", say: "The classical Giuoco Piano main line. White builds the full centre with c3 and d4, the boldest treatment of the Italian. This is no quiet game — White is staking a claim to the whole board and inviting Black into the sharpest theory in the opening.", sayShort: "d4 — the bold central main line.", highlights: [H("d4", KEY)] }),
    b({ id: "gn2", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3", say: "exd4 cxd4 Bb4+ Nc3! — there is the great pawn offer. Rather than block the check meekly with Bd2, White interposes the knight, leaving the e4-pawn hanging. White is betting that a lead in development and the initiative are worth more than a pawn — the spirit of the whole line.", sayShort: "Nc3! — the e4-pawn offered for the initiative.", arrows: [A("b4", "c3", ATK)], highlights: [H("c3", KEY)] }),
    b({ id: "gn3", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O Bxc3 bxc3 d5 Ba3", say: "Nxe4 O-O Bxc3 bxc3 d5 Ba3! — Black grabs the pawn, but White castles, recaptures on c3, and unfurls the key move Ba3. The bishop rakes the long dark diagonal toward f8, freezing Black's king in the centre by taking away castling. White's pieces are humming while Black's king is stranded.", sayShort: "Ba3! — the bishop freezes Black's king.", arrows: [A("a3", "f8", ATK)], highlights: [H("a3", KEY), H("d5", SOFT)] }),
    b({ id: "gn4", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O Bxc3 bxc3 d5 Ba3 dxc4", say: "dxc4 — Black returns material to blunt the attack, and with perfect defence the engine calls Black a touch better. But this is a knife fight: White has the bishop on a3, a lead in development, the half-open b-file, and Black's king nailed to e8. Across the board it scores well over fifty percent for White at club level — an aggressive, principled main line where activity is the currency, not pawns.", sayShort: "dxc4 — a knife fight; activity over material.", highlights: [H("a3", KEY), H("c4", SOFT)] }),
  ],
},

  "italian-game::Giuoco Piano: Greco Attack (Bd2 line)": {
  openingId: "italian-game",
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Giuoco_Piano'],
  title: "Italian — Greco Attack (Bd2)",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "gc1", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2", say: "The Greco Attack with Bd2 — the sound, positional way to handle the Giuoco Piano main line. Instead of the wild piece-offer with Nc3, White simply blocks the check with the bishop, keeping the whole position healthy. The pay-off is a smooth game with a small but lasting structural pull and no risk.", sayShort: "Bd2 — the solid, sound main line.", highlights: [H("d2", KEY)] }),
    b({ id: "gc2", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3", say: "Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3! — the dark bishops come off, Black frees himself with the …d5 break, and after the trade White springs Qb3, hitting the knight on d5 and aiming at f7 at the same time. One developing move, two threats — the tempo-gaining idea at the heart of White's set-up.", sayShort: "Qb3! — hits d5 and eyes f7.", highlights: [H("b3", KEY), H("d5", SOFT)] }),
    b({ id: "gc3", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3 Na5 Qa4+ Nc6 Qb3 Nce7 O-O O-O", say: "Na5 Qa4+ Nc6 Qb3 Nce7 O-O O-O — Black scrambles his knights to neutralise the queen's pressure and both sides castle. White emerges with the freer position, the famous isolated d-pawn giving him active, dynamic piece play rather than a weakness.", sayShort: "O-O — White castles with the freer game.", highlights: [H("e7", KEY)] }),
    b({ id: "gc4", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3 Na5 Qa4+ Nc6 Qb3 Nce7 O-O O-O Rfe1 c6 a4", say: "Rfe1 c6 a4 — White seizes the open e-file with the rook and grabs queenside space with a4. There is the Greco tabiya: the d4-pawn is isolated, but it is a SOURCE of energy — it controls e5 and c5, supports piece activity, and can spearhead a d5 break later. A balanced, sound position where White plays for the initiative with zero opening risk.", sayShort: "Rfe1, a4 — the IQP as a dynamic engine.", highlights: [H("e1", KEY), H("d4", SOFT), H("a4", SOFT)] }),
  ],
},
};

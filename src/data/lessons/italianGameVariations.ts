import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_italian-content.json (validated against the gate
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

export const ITALIAN_GAME_VARIATION_LESSONS: Record<string, LessonScript> = {
  "italian-game::Giuoco Pianissimo: Modern d3 System": {
  openingId: "italian-game",
  sources: ['book:italian-game', 'concept:pos-center', 'https://www.chess.com/openings/Italian-Game'],
  title: "Italian Game — The Modern d3 System",
  minutes: 11,
  orientation: "white",
  beats: [
    b({ id: "m1", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 d3", say: "Welcome to the Giuoco Pianissimo — the \"quietest game\" — and the single most important Italian for the modern player. This is the weapon of Carlsen, Caruana, and So at the very top. Instead of the immediate c3-and-d4 break, White plays d3: a small, patient move that overprotects e4 and refuses to release the central tension. The whole point is to avoid early theory and reach a rich, slow middlegame where understanding beats memorisation.", sayShort: "d3 — the patient modern Italian, no early break.", highlights: [H("e4", KEY), H("d4", SOFT)] }),
    b({ id: "m2", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6", say: "Nf6 O-O d6 — both sides build the same modest structure. Black mirrors with …d6, propping e5 just as White propped e4. Nothing is forced, nothing is resolved. In the Pianissimo the opening doesn't decide the game; the manoeuvring that follows does. White's plan from here is a slow, specific knight journey that every strong player knows by heart.", sayShort: "O-O d6 — quiet symmetry; the manoeuvre decides.", highlights: [H("e5", KEY), H("e4", SOFT)] }),
    b({ id: "m3", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3 a6", say: "c3 — still preparing d4, but on White's own terms, only when the pieces are ready. Black replies a6, a useful little move that takes the b5-square away from White's pieces and prepares to meet a future bishop pin. Both armies are coiling. The tension is the message: whoever forces the d4 break at the right moment gets the better game.", sayShort: "c3 a6 — coil up; d4 comes when ready.", highlights: [H("d4", KEY), H("b5", SOFT)] }),
    b({ id: "m4", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3 a6 a4 Ba7", say: "a4 grabs queenside space and stops Black's …b5 expansion before it starts — pure prophylaxis. Black tucks the bishop away with Ba7, a key Pianissimo idea: the bishop steps off c5 onto a7, out of reach of any future d4-d5 fork, while keeping its glare down the a7-g1 diagonal toward f2 and White's king. Now both bishops sit on the long diagonals, fully loaded, waiting for the centre to open.", sayShort: "a4 Ba7 — stop …b5; bishop hides, eyes f2.", arrows: [A("a7", "f2", ATK)], highlights: [H("a7", KEY), H("f2", SOFT)] }),
    b({ id: "m5", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3 a6 a4 Ba7 Nbd2 O-O", say: "Nbd2 — and here begins the manoeuvre that defines the modern Italian. The queen-knight develops to d2, but d2 is only a waypoint. Its destination is the kingside: d2 to f1 to g3, and from g3 it eyes the beautiful f5-outpost. Edward Lasker's old rule applies word-for-word — a knight on f5 cannot be driven away by a pawn. White is willing to spend three tempi to get there. Black castles into safety; the slow squeeze is on.", sayShort: "Nbd2 — the knight starts the f1-g3-f5 trek.", arrows: [A("d2", "f1", INTENT)], highlights: [H("f1", KEY), H("g3", SOFT)] }),
    b({ id: "m6", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3 a6 a4 Ba7 Nbd2 O-O Re1 Be6", say: "Re1 puts the rook behind the e-pawn, supporting the e4-point and bracing the e-file for when it opens. Black develops Be6, offering to trade the light-squared bishops. This is a critical decision for White: allowing the trade eases Black's game, so White will usually slide his bishop back a square rather than give it up — the same bishop dance you saw in the main line and the Ruy.", sayShort: "Re1 Be6 — brace the e-file; bishops face off.", highlights: [H("e6", KEY), H("e4", SOFT)] }),
    b({ id: "m7", moves: "e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3 a6 a4 Ba7 Nbd2 O-O Re1 Be6 Bb3 h6", say: "Bb3 keeps the bishop alive on its favourite diagonal, still pressuring e6 and f7 and declining the trade. Black plays h6, a typical prophylactic move that denies White's pieces the g5-square and gives the king a flight square. We've arrived at the Pianissimo tabiya — and from here White's plan writes itself: complete the knight's journey to g3 and f5, recoil the bishop if needed, and strike with d4 only when every piece is aimed at the centre and the kingside. This is positional chess at its purest: small moves, deep plans, one eventual break.", sayShort: "Bb3 h6 — the tabiya; now Ng3-f5 and d4.", arrows: [A("b3", "e6", ATK)], highlights: [H("e6", KEY), H("f7", SOFT)] }),
  ],
},

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
};

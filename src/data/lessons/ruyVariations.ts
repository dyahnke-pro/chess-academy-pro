import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Arrows are reserved for PIECES (vision / threat / intent), never pawns.
// Pawn ideas + key squares use highlights.
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const INTENT = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
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

// ── Berlin Defense ────────────────────────────────────────────────
const BERLIN: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Ruy Lopez — The Berlin Defense',
  minutes: 10,
  orientation: 'white',
  beats: [
    b({ id: 'b1', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6',
      say: "In the main Ruy, Black plays a6 to question the bishop. The Berlin skips that entirely and strikes at e4 at once with the knight. This is the wall Vladimir Kramnik used to dethrone Garry Kasparov in 2000.",
      sayShort: 'The Berlin — Black ignores a6 and hits e4 immediately.',
      arrows: [A('f6', 'e4', ATK)], highlights: [H('e4', KEY)] }),
    b({ id: 'b2', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8',
      say: "And here is what makes the Berlin unique: the queens come straight off, and Black's king is dragged to d8, losing the right to castle. In return Black gets the two bishops and a structure that simply will not crack. This queenless middlegame is the whole point.",
      sayShort: 'Queens off, Black loses castling but gets the bishop pair and a rock-solid structure.',
      highlights: [H('d8', KEY), H('c6', SOFT), H('c7', SOFT)] }),
    b({ id: 'b3', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 h3 Ke8 Nc3 h5',
      say: "Look at the imbalance. White owns a healthy kingside pawn majority that can one day make a passed pawn. Black has the bishop pair and the doubled c-pawns. Black tucks the king toward e8 and plays h5 — a key move that stops White's g4 and keeps the f5-knight planted.",
      sayShort: "White's clean kingside majority versus Black's bishop pair and doubled c-pawns.",
      highlights: [H('f5', KEY), H('h5', SOFT)] }),
    b({ id: 'b4', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 h3 Ke8 Nc3 h5 Bf4 Be7 Rad1 Be6',
      say: "White develops to pester the awkward king — knight to c3, bishop to f4, rooks to the center. Black calmly unbundles: the bishop comes to e6, the king walks to safety, and those two bishops start eyeing the long diagonals.",
      sayShort: 'White probes the king; Black untangles and activates the bishop pair.' }),
    b({ id: 'b5', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 h3 Ke8 Nc3 h5 Bf4 Be7 Rad1 Be6 Ng5 Bxg5 Bxg5',
      say: "No queens, no attack, no fireworks — just a long technical endgame. The Berlin poses one question: can White ever convert that structural majority against the bishop pair? At the top level the answer is usually no, and that is exactly why the Berlin is chess's great drawing weapon.",
      sayShort: 'A technical endgame: can White convert the majority against the bishops? Usually not — the great equalizer.',
      highlights: [H('e5', SOFT)] }),
    b({ id: 'b6', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 h3 Ke8 Nc3 h5 Bf4 Be7 Rad1 Be6 Ng5 Bxg5 Bxg5',
      say: "So how does White actually try to win? There is only one path: nurse that clean kingside majority — e5, f2, g2, h3 against f7, g7, h5 — until it births a passed pawn, while the rook on the open d-file and the bishop on g5 stop Black's king from coordinating. Black's whole defence rests on the blockading knight on f5, the bishop on e6, and walking the king to safety. This endgame is decided square by square, not by force.",
      sayShort: "White's only winning try: convert the kingside majority while Black blockades on f5.",
      arrows: [A('d1', 'd8', INTENT)], highlights: [H('e5', KEY), H('f5', KEY)] }),
    b({ id: 'b7', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 h3 Ke8 Nc3 h5 Bf4 Be7 Rad1 Be6 Ng5 Bxg5 Bxg5',
      say: "Do not mistake the Berlin's calm for a lack of importance — it is the most consequential defence in modern chess. Kramnik used this exact endgame to take the crown from Kasparov, and three decades later it is still the first thing every World Championship challenger prepares. Hold it next to the main Closed Ruy: there, White spends forty moves building a kingside attack; here, Black erases the attack before it can begin. Same opening, opposite battle plan — and learning this one is not optional.",
      sayShort: 'The Berlin is championship theory, not a sideline — it dethroned Kasparov.',
      highlights: [H('e5', SOFT)] }),
  ],
};

// ── Open Ruy Lopez ────────────────────────────────────────────────
const OPEN: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Ruy Lopez — The Open Variation',
  minutes: 10,
  orientation: 'white',
  beats: [
    b({ id: 'o1', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4',
      say: "In the main line Black quietly develops with Be7. The Open Ruy is the bold alternative: Black takes the e4-pawn. He isn't trying to keep it — he's buying time to free his pieces and seize the initiative.",
      sayShort: 'The Open Ruy — Black grabs e4 for fast, active piece play.',
      highlights: [H('e4', KEY)] }),
    b({ id: 'o2', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6',
      say: "White strikes back in the center with d4, Black props the knight with b5 and d5, and a sharp pawn chain forms. Black's solid d5-pawn, screened by the e6-bishop, anchors the active knight — the structure that defines the Open Ruy.",
      sayShort: "Black's d5-pawn and e6-bishop anchor the active knight.",
      highlights: [H('d5', KEY), H('e6', KEY), H('e5', SOFT)] }),
    b({ id: 'o3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 Nbd2 Nc5 c3 d4',
      say: "Now the temperaments collide. Black's pieces are active — the knight swings to c5, the pawn pushes to d4 to grab space. White relies on the b3-bishop pressing on e6 and the loose light squares to prove the pawn-grab was premature.",
      sayShort: "Black's pieces stay active; White leans on the b3-bishop and the light squares.",
      arrows: [A('b3', 'e6', ATK)], highlights: [H('e6', KEY), H('d4', SOFT)] }),
    b({ id: 'o4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 Nbd2 Nc5 c3 d4 Ng5 dxc3 Nxe6 fxe6',
      say: "White's knight jumps to g5 and trades itself for the prized e6-bishop, opening the f-file in front of Black's uncastled king. The whole opening, opposite in temperament to the slow main line, comes down to this: Black's activity against White's targets on the light squares.",
      sayShort: "Ng5 trades the e6-bishop and opens the f-file on Black's king.",
      highlights: [H('e6', KEY), H('e5', SOFT)] }),
    b({ id: 'o5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 Nbd2 Nc5 c3 d4 Ng5 dxc3 Nxe6 fxe6',
      say: "Here is the Open Ruy's whole bargain in one frame. Black has handed over the e6-bishop and his king sits on a freshly opened f-file — but in exchange he owns the advanced c3-pawn and two knights biting deep into White's camp. White's plan writes itself: round up that c3-pawn and lean on the light squares the missing bishop left behind, above all the weakened e6-pawn and the long diagonal the b3-bishop already rakes.",
      sayShort: "White hunts the c3-pawn and the light-square holes; Black's activity must pay off fast.",
      arrows: [A('b3', 'e6', ATK)], highlights: [H('c3', KEY), H('e6', KEY)] }),
    b({ id: 'o6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 Nbd2 Nc5 c3 d4 Ng5 dxc3 Nxe6 fxe6',
      say: "This is the Ruy turned inside out, and it matters because it changes the very question of the opening. The main line is patience — Black reroutes and waits for the slow squeeze. The Open Variation flatly refuses: from move five Black trades the centre pawn for piece activity and turns the game into a race. It was Korchnoi's lifelong weapon against the Spanish and remains the answer of every player who finds the Closed Ruy too quiet. Same three opening moves, completely different music.",
      sayShort: "Korchnoi's antidote to the slow Ruy — activity and a race instead of patience.",
      highlights: [H('e5', SOFT)] }),
  ],
};

// ── Marshall Attack ───────────────────────────────────────────────
const MARSHALL: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Ruy Lopez — The Marshall Attack',
  minutes: 10,
  orientation: 'white',
  beats: [
    b({ id: 'm1', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3',
      say: "Everything looks like a normal closed Ruy — until Black, instead of the solid d6, prepares something audacious. Frank Marshall saved this idea for years and unleashed it on Capablanca in 1918.",
      sayShort: 'A normal closed Ruy setup — but Black has a bombshell prepared.',
      highlights: [H('e5', SOFT)] }),
    b({ id: 'm2', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5',
      say: "The bombshell: d5, offering the e5-pawn. Black gives up a centre pawn to blow the position open and pour pieces at White's king. This is the Marshall Attack — one of the most respected gambits in all of chess.",
      sayShort: 'd5! — the Marshall gambit, sacrificing e5 to rip the centre open.',
      highlights: [H('d5', KEY), H('e5', KEY)] }),
    b({ id: 'm3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6',
      say: "White accepts: the pawns come off and White is up a clean pawn. But look at Black's pieces — every one is ready to spring toward the kingside. The pawn was never the point; the open lines are.",
      sayShort: "White is a pawn up, but every black piece is aimed at the king.",
      highlights: [H('d5', SOFT)] }),
    b({ id: 'm4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3',
      say: "Here comes the storm. The bishop swings to d6, the queen leaps to h4 and then h3, glued to White's king. Black threatens mating ideas against g2 and down the h-file; White must defend with absolute precision.",
      sayShort: "Bd6 and Qh4-h3 — Black's attack crashes onto White's king.",
      arrows: [A('d6', 'g3', ATK)], highlights: [H('h3', KEY), H('g2', SOFT)] }),
    b({ id: 'm5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3 Be3 Bg4 Qd3 Rae8',
      say: "White returns the extra pawn for shelter — Be3, Qd3 — while Black keeps pouring fuel on the fire with Bg4 and the rooks. This is the Marshall's bargain: a pawn for a permanent initiative, and a single inaccuracy by White can be fatal. The opposite of the patient main line — here, Black attacks from move eight.",
      sayShort: "A pawn for a lasting initiative — White defends on a knife's edge.",
      arrows: [A('g4', 'd1', VIS)], highlights: [H('e8', SOFT)] }),
    b({ id: 'm6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3 Be3 Bg4 Qd3 Rae8',
      say: "Count the attackers, because that is the entire evaluation. The queen on h3 is glued to g2; the bishop on g4 rakes the back rank; the bishop on d6 and both rooks pour down at the white king. White is a clean pawn up and stands worse — every defensive move from here is an only-move. That is the Marshall's promise: a permanent initiative is worth more than the pawn it cost.",
      sayShort: "Five black pieces swarm the king for one pawn — White must find only-moves.",
      arrows: [A('h3', 'g2', ATK), A('g4', 'd1', VIS)], highlights: [H('g2', KEY), H('h3', KEY)] }),
    b({ id: 'm7', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3 Be3 Bg4 Qd3 Rae8 Nd2',
      say: "Here is the move that saves White — and it is the one piece that has done nothing all game. Nd2! The sleeping knight finally springs off b1, heading for f1 where it becomes the king's bodyguard, plugging the very squares Black is aiming at. Until this knight moves, White is just hanging on; the instant it does, White is defending with a full army.",
      sayShort: "Nd2 — the only-move: the sleeping knight springs out to shield the king.",
      arrows: [A('d2', 'f1', VIS)], highlights: [H('d2', KEY), H('f1', SOFT)] }),
    b({ id: 'm8', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3 Be3 Bg4 Qd3 Rae8 Nd2 Re6 a4',
      say: "Black swings the rook to e6 for the final wave — and now White's whole defensive philosophy in one move: a4! Do not cower; counterattack the OTHER wing. White strikes the b5-pawn, and suddenly Black has problems of his own to solve before any mate arrives. The attack has no forced breakthrough, so White makes threats instead of only parrying them.",
      sayShort: "a4! — the saving idea: counterattack b5 instead of cowering on the kingside.",
      highlights: [H('a4', KEY), H('b5', ATK)] }),
    b({ id: 'm9', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3 Be3 Bg4 Qd3 Rae8 Nd2 Re6 a4 Qh5',
      say: "The queen drops to h5 — the storm is spending itself, and White stands a clean pawn up with the king intact. This is the Spassky main line, and the honest verdict: with these exact only-moves White survives, but a human meeting the storm cold rarely finds every one. That practical terror is why the Marshall has scored for Black for a century, and why many White players sidestep it with the Anti-Marshall. Now you know the moves that hold.",
      sayShort: "Qh5 — the attack burns out; White holds a pawn up. These are the saving only-moves.",
      highlights: [H('h5', SOFT), H('g2', SOFT)] }),
  ],
};

// ── Exchange Variation ────────────────────────────────────────────
const EXCHANGE: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Ruy Lopez — The Exchange Variation',
  minutes: 9,
  orientation: 'white',
  beats: [
    b({ id: 'x1', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6',
      say: "The Exchange Variation, Bobby Fischer's favourite way to play the Ruy. Instead of retreating, White simply takes on c6. He gives up the bishop pair on purpose — to hand Black a permanent structural flaw.",
      sayShort: "Fischer's Exchange — White trades on c6 to inflict doubled pawns.",
      highlights: [H('c6', KEY), H('c7', KEY)] }),
    b({ id: 'x2', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4',
      say: "Here is the whole idea in one picture. White has a healthy four-against-three majority on the kingside — that can make a passed pawn in an endgame. Black's queenside majority is crippled by the doubled c-pawns and can never produce one. White wants to trade pieces and grind that difference home.",
      sayShort: "White's clean kingside majority versus Black's crippled queenside — an endgame edge.",
      highlights: [H('c6', SOFT), H('c7', SOFT)] }),
    b({ id: 'x3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1 Bg4',
      say: "So White steers toward the endgame, even inviting the queens off. Black's compensation is real — the two bishops and a big pawn centre give active play in the middlegame. The fight is a race: can Black's bishops do damage before White's pure structure decides a long ending?",
      sayShort: "Queens come off; Black's bishop pair races White's superior structure.",
      arrows: [A('g4', 'd1', VIS)] }),
    b({ id: 'x4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1 Bg4 f3 Be6 Nc3 Bd6 Be3 b6',
      say: "This is the photographic negative of the Marshall. No sacrifice, no attack — just the purest version of the Ruy's deepest theme: accumulate one small, lasting advantage and convert it over forty moves. Trade down, push the kingside majority, make a passed pawn, win the endgame.",
      sayShort: "Pure technique: trade down, push the kingside majority, make a passed pawn.",
      highlights: [H('e5', SOFT)] }),
    b({ id: 'x5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1 Bg4 f3 Be6 Nc3 Bd6 Be3 b6',
      say: "White's entire game lives in one structural fact: a clean four-against-three majority on the kingside — e4, f3, g2, h2 — that can one day manufacture a passed pawn, against a black queenside crippled by the doubled c-pawns that never can. The plan is mechanical and merciless: trade the pieces, contest the open d-file, roll the kingside pawns, and steer into an ending where that single difference wins. Black must make the two bishops and the broad centre tell before the board empties.",
      sayShort: "White's 4-v-3 kingside majority versus Black's crippled queenside — trade and grind.",
      arrows: [A('d1', 'd6', VIS)], highlights: [H('e4', KEY), H('c5', SOFT), H('c7', SOFT)] }),
    b({ id: 'x6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1 Bg4 f3 Be6 Nc3 Bd6 Be3 b6',
      say: "Fischer chose the Exchange Ruy precisely because it strips the Spanish to its bones — no theory race, no memorized gambit, just a permanent structural edge and the technique to bring it home. Treat it as a lesser line at your peril: it is the photographic negative of everything the Marshall stands for, and underestimating it walks you straight into Fischer's favourite endgame a pawn-structure down. Knowing the Exchange teaches the Ruy's deepest lesson — that a tiny, lasting advantage is often the most dangerous one.",
      sayShort: "Fischer's weapon — the Ruy reduced to pure structure and technique.",
      highlights: [H('c6', SOFT)] }),
  ],
};

// ── Closed: Breyer ────────────────────────────────────────────────
const BREYER: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Ruy Lopez — The Breyer (Closed)',
  minutes: 9,
  orientation: 'white',
  beats: [
    b({ id: 'r1', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8',
      say: "The Breyer is the deepest expression of the closed Ruy — and it features the strangest move in the whole opening: the knight retreats all the way home to b8. It looks like a beginner's blunder; it is one of the most respected ideas in chess.",
      sayShort: 'The Breyer — Black retreats the knight to b8 to reroute it.',
      arrows: [A('b8', 'd7', INTENT)], highlights: [H('d7', KEY)] }),
    b({ id: 'r2', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7',
      say: "The point: the knight reroutes to d7, where it braces e5 and clears the way for the bishop to reach the long diagonal on b7. Capablanca prized exactly this bishop for the great pressure it exerts down the long diagonal.",
      sayShort: "The knight reaches d7 and the bishop takes the long diagonal — Capablanca's harmony.",
      arrows: [A('b7', 'e4', ATK)] }),
    b({ id: 'r3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 Bf8 Ng3 g6',
      say: "Both armies maneuver. White's queen-knight makes its own journey to g3, eyeing the f5 outpost; Black coils up behind g6 and the fianchetto. No contact yet — the Breyer is patience distilled, both sides perfecting their pieces before a single pawn breaks.",
      sayShort: "White's knight heads to g3 and f5; Black coils behind the fianchetto.",
      arrows: [A('g3', 'f5', INTENT)], highlights: [H('f5', KEY)] }),
    b({ id: 'r4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 Bf8 Ng3 g6 a4 c5 d5 c4 Bg5',
      say: "Finally the structure resolves: White clamps the centre with d5 and turns to the wings — a4 against the queenside, Bg5 and the knight, bound for the f5 outpost, toward the king. The Breyer is the closed Ruy at its richest: a slow, two-winged maneuvering battle decided by who improves their pieces best.",
      sayShort: 'd5 locks the centre; the game becomes a two-winged maneuvering battle.',
      highlights: [H('d5', KEY), H('c4', SOFT)] }),
    b({ id: 'r5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 Bf8 Ng3 g6 a4 c5 d5 c4 Bg5',
      say: "With the centre bolted shut by d5, the game splits into two wars on opposite wings. White reroutes the knight toward the f5 outpost and throws the kingside pawns and the g5-bishop at Black's king. Black, having already driven a wedge to c4, answers on the queenside and will pry open the b-file. The fianchettoed bishop on b7 bites on the d5-granite for now, biding its time until the structure cracks. The Breyer rewards the player who perfects every piece before striking.",
      sayShort: 'Opposite wings: White plays Ng3-f5 and the kingside, Black the c4 wedge and b-file.',
      arrows: [A('g3', 'f5', INTENT)], highlights: [H('d5', KEY), H('f5', KEY), H('c4', SOFT)] }),
    b({ id: 'r6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 Bf8 Ng3 g6 a4 c5 d5 c4 Bg5',
      say: "Never file the Breyer under sidelines. It is the Closed Ruy at its deepest — the very same Re1, c3, h3 main line you already know, only with Black's astonishing Nb8 sending the knight home to reroute to its perfect square on d7. Spassky, Karpov and Kasparov all leaned on it in title matches. Where the Chigorin chases the Spanish bishop and the Zaitsev keeps maximum tension, the Breyer answers the same question — how to unbundle harmoniously — with the most refined regrouping in all of chess.",
      sayShort: 'Not a sideline — the deepest Closed Ruy, trusted by Spassky, Karpov and Kasparov.',
      highlights: [H('d7', SOFT)] }),
  ],
};

// ── Closed: Chigorin ──────────────────────────────────────────────
const CHIGORIN: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Ruy Lopez — The Chigorin (Closed)',
  minutes: 9,
  orientation: 'white',
  beats: [
    b({ id: 'c1', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5',
      say: "Where the Breyer reroutes the knight backward, the Chigorin sends it forward to the edge — Na5, straight at White's prized light-squared bishop. Black's plan is concrete: trade or chase that bishop, then expand in the centre with c5.",
      sayShort: 'The Chigorin — Na5 hits the Spanish bishop, then ...c5 follows.',
      arrows: [A('a5', 'b3', ATK)], highlights: [H('b3', KEY)] }),
    b({ id: 'c2', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5',
      say: "The bishop steps back to c2 — still alive, still aiming at the black king down the b1-h7 diagonal. Black gains queenside space with c5, claiming the centre and the d4-square. This is the classic Ruy tension: White's kingside chances against Black's queenside play.",
      sayShort: 'Bc2 keeps the diagonal; Black grabs queenside space with c5.',
      highlights: [H('h7', KEY), H('c5', SOFT)] }),
    b({ id: 'c3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7 Nbd2 Nc6 d5 Nd8 Nf1',
      say: "White builds and pushes d5, clamping the centre. Now the wings divide cleanly: White will play for f5 and a kingside attack, Black for a5-a4 and the half-open b-file. The offside a5-knight reroutes back through c6 and d8 toward better squares — every piece on a long journey, the hallmark of the closed Ruy.",
      sayShort: 'd5 locks the centre; opposite-wing plans — White kingside, Black queenside.',
      highlights: [H('d5', KEY), H('f5', SOFT)] }),
    b({ id: 'c4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7 Nbd2 Nc6 d5 Nd8 Nf1',
      say: "The wings divide as cleanly as in the Breyer, but the flavour differs. Black has already chased the Spanish bishop to c2 with Na5 and seized central space with c5; now that offside knight reroutes home through c6 and d8, hunting a better square. White clamps with d5 and turns to the kingside — the knight heads for f5, and the bishop on c2 waits for the e4-pawn to advance so its diagonal can blaze straight at h7. Opposite-wing chess where a single tempo decides who breaks through first.",
      sayShort: 'Black expands with c5 and reroutes the knight; White clamps d5 and aims at h7.',
      highlights: [H('d5', KEY), H('f5', SOFT), H('h7', KEY)] }),
    b({ id: 'c5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7 Nbd2 Nc6 d5 Nd8 Nf1',
      say: "For decades the Chigorin WAS the main line of the Ruy Lopez — the tabiya through which world titles were fought. So treat it as bedrock, not a branch. Where the Breyer reroutes the knight backward to d7, the Chigorin sends it forward to a5 to settle accounts with White's strong bishop immediately. Same Closed Ruy spine, a different answer to the same eternal question: what do you do about that annoying Spanish bishop?",
      sayShort: 'For decades the main line of the whole Ruy — bedrock theory, not a sideline.',
      highlights: [H('b3', SOFT)] }),
  ],
};

// ── Closed: Zaitsev ───────────────────────────────────────────────
const ZAITSEV: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Ruy Lopez — The Zaitsev (Closed)',
  minutes: 9,
  orientation: 'white',
  beats: [
    b({ id: 'z1', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Bb7',
      say: "The Zaitsev — named for Igor Zaitsev, Karpov's trainer, and a backbone of his career. Black develops the bishop to b7 early, aiming down the long diagonal toward e4, and keeps maximum flexibility before committing the knight.",
      sayShort: "Karpov's Zaitsev — early Bb7 pressures e4 and keeps options open.",
      highlights: [H('e4', KEY)] }),
    b({ id: 'z2', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Bb7 d4 Re8 Nbd2 Bf8',
      say: "Black answers d4 with Re8 and Bf8 — keeping the centre tense and reinforcing e5 to the maximum. The threat is real: capture on d4 followed by Nb4, jabbing at White's light-squared bishop once it tucks back to c2. This razor-sharp move-order precision is why the Zaitsev produced the famous repetition dramas of the Kasparov-Karpov matches.",
      sayShort: 'Re8 and Bf8 keep the tension; Black eyes ...exd4 and ...Nb4.',
      highlights: [H('e5', KEY), H('e4', SOFT)] }),
    b({ id: 'z3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Bb7 d4 Re8 Nbd2 Bf8 a4 h6 Bc2 exd4 cxd4 Nb4 Bb1 c5 d5 Nd7 Ra3',
      say: "The play turns concrete fast: Black releases the tension, jumps the knight to b4 to harass the bishop, and strikes with c5. White clamps with d5 and unveils the signature Zaitsev idea — the rook lift Ra3, swinging across the third rank toward the kingside. A tense, theory-heavy battle where a single tempo decides the evaluation.",
      sayShort: 'The Ra3 rook-lift swings toward the king — sharp, precise, theory-heavy.',
      highlights: [H('d5', KEY), H('g3', SOFT)] }),
    b({ id: 'z4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Bb7 d4 Re8 Nbd2 Bf8 a4 h6 Bc2 exd4 cxd4 Nb4 Bb1 c5 d5 Nd7 Ra3',
      say: "The position bristles with concrete threats. Black's knight has leapt to b4 to harass the bishop and now presses against the d5-clamp; White's signature resource is the rook lift — the rook already on a3, ready to swing along the third rank toward the black king the instant the f3-knight steps aside. A single tempo flips the evaluation here, which is exactly why entire World Championship games dissolved into the move-repetition draws neither Karpov nor Kasparov dared avoid.",
      sayShort: "Black's Nb4 hits d5; White's Ra3 waits to swing at the king — one tempo decides.",
      arrows: [A('b4', 'd5', ATK)], highlights: [H('d5', KEY), H('a3', SOFT), H('g3', SOFT)] }),
    b({ id: 'z5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Bb7 d4 Re8 Nbd2 Bf8 a4 h6 Bc2 exd4 cxd4 Nb4 Bb1 c5 d5 Nd7 Ra3',
      say: "The Zaitsev was Karpov's lifelong main weapon, fed to him by the very trainer it is named for, and it carried the highest-stakes matches in history. So this is not a line to dabble in — it is a line to know cold. It is the sharpest, most theory-soaked branch of the Closed Ruy: the same d6, O-O setup as the Breyer and Chigorin, but with the bishop committed early to b7 and the centre held at maximum tension. Where the Breyer is patience and the Chigorin is queenside space, the Zaitsev is precision under fire.",
      sayShort: "Karpov's main weapon — the sharpest Closed Ruy, to be known cold.",
      highlights: [H('e4', SOFT)] }),
  ],
};

// ── Anti-Marshall (8.a4) ──────────────────────────────────────────
const ANTI_MARSHALL: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Ruy Lopez — The Anti-Marshall (8.a4)',
  minutes: 9,
  orientation: 'white',
  beats: [
    b({ id: 'am1', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4',
      say: "When Black castles and signals the Marshall gambit, many of the world's best simply decline the duel. Instead of allowing d5, White inserts a4 — poking the b5-pawn before Black can fire the gambit. This is the modern mainline choice of Carlsen and Caruana.",
      sayShort: 'The Anti-Marshall — 8.a4 sidesteps the gambit by hitting b5 first.',
      highlights: [H('b5', KEY)] }),
    b({ id: 'am2', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4 b4 d3 d6 Nbd2 Na5 Ba2',
      say: "Edward Lasker noted this exact idea: the a4 advance is strong because it can pressure or weaken Black's queenside pawns, and the b-pawn can become an endgame target. Black closes with b4 and plays for the centre; White settles for the quiet d3 and the slow Spanish maneuvering he wanted all along.",
      sayShort: "Lasker's a4 idea — pressure the queenside; White keeps the slow game.",
      highlights: [H('b4', SOFT), H('d3', SOFT)] }),
    b({ id: 'am3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4 b4 d3 d6 Nbd2 Na5 Ba2 c5 c3 Rb8 Nf1 Bd7',
      say: "The position settles into pure strategy. White reroutes the knight Nbd2-f1-g3 toward the kingside; Black expands with c5 and tends to the queenside. This is the player's choice who loves the Ruy's slow squeeze and simply refuses to be dragged into the Marshall's memorized waterfall.",
      sayShort: 'A quiet strategic battle — exactly what the Anti-Marshall is after.',
      arrows: [A('f1', 'g3', INTENT)], highlights: [H('g3', SOFT)] }),
    b({ id: 'am4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4 b4 d3 d6 Nbd2 Na5 Ba2 c5 c3 Rb8 Nf1 Bd7',
      say: "Having dodged the gambit, White settles into exactly the squeeze he wanted. The knight reroutes Nf1-g3 toward the f5 outpost, the bishop on a2 rakes the long light diagonal straight at f7, and the slow Spanish maneuvering begins. Black has closed the queenside with b4 and plays for c5 and central space. No fireworks here — just the patient accumulation that is the Ruy Lopez's truest nature, the game White was always angling for.",
      sayShort: 'White gets the slow squeeze: Nf1-g3 toward f5, Ba2 raking f7.',
      arrows: [A('f1', 'g3', INTENT), A('a2', 'f7', ATK)], highlights: [H('f7', KEY), H('b4', SOFT)] }),
    b({ id: 'am5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4 b4 d3 d6 Nbd2 Na5 Ba2 c5 c3 Rb8 Nf1 Bd7',
      say: "Do not read the Anti-Marshall as fear. It is the modern elite's preferred answer — Carlsen, Caruana and Nepomniachtchi all play a4 here rather than wade into the Marshall's forced waterfall of memorized moves. The lesson generalizes far beyond this opening: when your opponent owns a beautiful piece of preparation, the strongest reply is often to deny him the position altogether and keep the game in your own slow waters. That is a champion's pragmatism, not timidity.",
      sayShort: "Not fear — the elite's pragmatic choice to deny Black his prepared gambit.",
      highlights: [H('b5', SOFT)] }),
  ],
};

// ── Arkhangelsk ───────────────────────────────────────────────────
const ARKHANGELSK: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Ruy Lopez — The Arkhangelsk',
  minutes: 9,
  orientation: 'white',
  beats: [
    b({ id: 'k1', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O b5 Bb3 Bb7',
      say: "Black's most aggressive legitimate try in the a6 complex. Instead of the modest Be7, Black fianchettoes fast — b5 and Bb7 — aiming the bishop down the long diagonal toward e4. Black doesn't want to sit and reroute; he points everything forward.",
      sayShort: 'The Arkhangelsk — fast ...b5 and ...Bb7, pointing at e4.',
      highlights: [H('e4', KEY)] }),
    b({ id: 'k2', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O b5 Bb3 Bb7 d3 Be7 Nc3 O-O',
      say: "The b7-bishop's pressure on e4 forces White to address the centre before building the usual Spanish structure. White answers in classical style — the solid d3, knight to c3 — defusing the bishop and keeping a small, durable edge rather than chasing complications.",
      sayShort: "The Bb7 pressure forces White into a solid d3, Nc3 setup.",
      highlights: [H('e4', SOFT)] }),
    b({ id: 'k3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O b5 Bb3 Bb7 d3 Be7 Nc3 O-O a3 d6 Ba2',
      say: "White tucks the bishop on a2, still raking the a2-g8 diagonal at f7, and prepares to reroute via Nd5. Black gets active, harmonious piece play with both bishops firing; White banks on the central pawn majority and the bishop pair-versus-activity balance. Aggressive intent for Black, classical control for White.",
      sayShort: "Ba2 keeps the f7 diagonal; active Black pieces versus White's classical control.",
      arrows: [A('a2', 'f7', ATK)], highlights: [H('f7', KEY)] }),
    b({ id: 'k4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O b5 Bb3 Bb7 d3 Be7 Nc3 O-O a3 d6 Ba2',
      say: "The battle lines are drawn. Black's two bishops aim across the board — b7 down the long diagonal, e7 ready to swing — while White builds the classical clamp and sets up the knight reroute to d5. The bishop on b7 wants e4, but its own knight on c6 blocks the view for now, so the pressure is latent. The Arkhangelsk is a straight fight between Black's bishop-pair activity and White's central control: whoever's pieces speak louder wins.",
      sayShort: "Black's two bishops versus White's Nd5 reroute and central control.",
      arrows: [A('c3', 'd5', INTENT), A('a2', 'f7', ATK)], highlights: [H('d5', KEY), H('f7', KEY), H('e4', SOFT)] }),
    b({ id: 'k5', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O b5 Bb3 Bb7 d3 Be7 Nc3 O-O a3 d6 Ba2',
      say: "The Arkhangelsk is the choice for the Black player who simply refuses to sit. Where the main line meets Ba4 with the modest Be7 and a long, patient reroute, here Black throws the bishops forward at once — b5, Bb7, pressure from move six. It is fully sound and richly aggressive, the exact opposite temperament to the Berlin's icy defence. Same Ruy, but Black is playing for the initiative, not the draw — and that is precisely why it belongs in your study, not your blind spot.",
      sayShort: "Black's aggressive answer to the Ruy — the temperamental opposite of the Berlin.",
      highlights: [H('e4', SOFT)] }),
  ],
};

export const RUY_VARIATION_LESSONS: Record<string, LessonScript> = {
  'ruy-lopez::Berlin Defense': BERLIN,
  'ruy-lopez::Open Ruy Lopez': OPEN,
  'ruy-lopez::Marshall Attack': MARSHALL,
  'ruy-lopez::Exchange Variation': EXCHANGE,
  'ruy-lopez::Closed Ruy Lopez (Breyer)': BREYER,
  'ruy-lopez::Closed Ruy Lopez (Chigorin)': CHIGORIN,
  'ruy-lopez::Closed Ruy Lopez (Zaitsev)': ZAITSEV,
  'ruy-lopez::Anti-Marshall (8.a4)': ANTI_MARSHALL,
  'ruy-lopez::Arkhangelsk Variation': ARKHANGELSK,
};

import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): GREEN arrows = vision / threat
// / intent, YELLOW highlights = a key square the narration names, SOFT BLUE =
// secondary context. The orange move-squares are auto-painted by the
// LessonPlayer — we never author those.
const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
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

// The Classical Orthodox / Capablanca spine — the "Main line" pill's PGN.
// d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5
// Bxe7 Qxe7 O-O Nxc3 Rxc3 — the Capablanca Freeing Maneuver line, every move
// masters-backed in the live explorer (see PLAN.md spine table). The deepest
// beat carries it to 23 plies — past the depth gate, inside the middlegame.
const MAIN = 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3';

/**
 * The Queen's Gambit — A Master Class. Story-first: the lecture is the spine
 * and the board obeys it. The Queen's Gambit's pitch is the permanent pull —
 * White offers a pawn he can always reclaim and forces Black to choose between
 * surrendering the centre and accepting a cramped, passive game. Grounded in
 * the public-domain classics: Capablanca on central control and the value of
 * simplification with a space edge, Steinitz on the accumulation of small
 * advantages. The four major replies (Decline, Accept, Slav, Exchange) each
 * own a tab in this masterclass; the main line walks the Orthodox QGD.
 */
export const QUEENS_GAMBIT_LESSON: LessonScript = {
  openingId: 'queens-gambit',
  sources: ['concept:pos-development', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
  title: "The Queen's Gambit — A Master Class",
  minutes: 14,
  orientation: 'white',
  beats: [
    b({
      id: 'open',
      moves: 'd4 d5',
      highlights: [H('d4'), H('d5')],
      say: "Welcome to the Queen's Gambit — documented in Spanish manuscripts five hundred years ago and the backbone of world-championship chess ever since, from Steinitz through Capablanca to Carlsen. It opens 1.d4 d5: the queen's-pawn answer to 1.e4 e5, two pawns locking horns in the centre. Everything White does from here revolves around a single offer he makes on the very next move.",
      sayShort: '1.d4 d5 — the queen’s-pawn centre.',
    }),
    b({
      id: 'the-gambit',
      moves: 'd4 d5 c4',
      highlights: [H('c4'), H('d5')],
      say: "Here is the gambit: c4. White offers the c-pawn — but the name is a beautiful lie, because this is no true sacrifice. If Black snatches it with …dxc4, White wins the pawn back at his leisure every time. The real purpose of c4 is to challenge the d5-pawn from the side: either Black gives ground in the centre, or he props d5 up and lets White build the broader pawn front.",
      sayShort: 'c4 — the gambit that isn’t; hits d5.',
    }),
    b({
      id: 'declined',
      moves: 'd4 d5 c4 e6',
      highlights: [H('e6'), H('d5', SOFT), H('c8')],
      say: "Black declines with e6 — the soundest reply, and the start of the Queen's Gambit Declined. The e6-pawn buttresses d5 so the centre holds firm. But it comes at a price that haunts Black for the whole game: it locks his light-squared bishop in on c8, behind its own pawn chain. That boxed-in c8-bishop is the eternal theme of the QGD, and White's job is to make Black regret it.",
      sayShort: '…e6 — declines; buries the c8-bishop.',
    }),
    b({
      id: 'the-pin',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5',
      arrows: [A('g5', 'f6', ATK)],
      highlights: [H('d5')],
      say: "White develops with intent. Nc3 attacks d5 a second time; Black guards it with Nf6; and now Bg5 — the pin. The bishop pins the f6-knight against the queen behind it, so that knight can no longer help hold d5. This pin is the heartbeat of the classical Queen's Gambit: keep piling pressure on d5 until something cracks.",
      sayShort: 'Bg5 — pins f6, piles onto d5.',
    }),
    b({
      id: 'unpin',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7',
      highlights: [H('e7'), H('f6', SOFT)],
      say: "Black breaks the pin the classical way — Be7, stepping the bishop in front of the queen so the f6-knight breathes again. White is happy enough: the e7-bishop is passive, hemmed in by Black's own pawns, and the pin on g5 has already done its work creating an unbalanced, tense battlefield. Now White simply finishes developing before he commits to a plan.",
      sayShort: '…Be7 — unpins; the f6-knight breathes.',
    }),
    b({
      id: 'modest-e3',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3',
      arrows: [A('f1', 'd3', VIS)],
      highlights: [H('e3'), H('d4', SOFT)],
      say: "e3 — small and humble, but it does three jobs at once: it opens the diagonal for the f1-bishop toward d3, it cements the d4-pawn, and it keeps White's structure flexible. And notice the tempo — White does not rush. The Queen's Gambit is a slow squeeze, not a sprint. Capablanca's method was exactly this: complete your development perfectly, then let the small structural edge grind the win.",
      sayShort: 'e3 — frees the bishop toward d3.',
    }),
    b({
      id: 'develop',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7',
      arrows: [A('f3', 'e5', VIS)],
      highlights: [H('d7')],
      say: "Both sides complete the classical setup. Black castles into safety; White's king-knight comes to f3, eyeing the e5-square; and Black's other knight goes to d7 to reinforce the centre and prepare to reroute. The position looks calm and nearly symmetrical — but the c-file is about to become the whole battlefield.",
      sayShort: 'O-O, Nf3, …Nbd7 — fully developed.',
    }),
    b({
      id: 'the-rook',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6',
      highlights: [H('c1'), H('c6'), H('d5', SOFT)],
      say: "Rc1 — and here is the plan in one move. The rook swings to c1, lining up on the c-file before a single piece has been traded there. This is pure Capablanca: put the rook where the file WILL open, not where it is open now. Black answers c6, the Orthodox setup, reinforcing d5 once more and clearing the d8-square so his queen has a route to safety.",
      sayShort: 'Rc1 — rook to the c-file; …c6.',
    }),
    b({
      id: 'last-bishop',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3',
      arrows: [A('d3', 'h7', ATK)],
      highlights: [H('h7')],
      say: "Bd3 brings out the last minor piece, and it points straight at h7 — the soft square in front of Black's king. Look at the harmony now: the bishop on g5 pins, the rook on c1 waits on the file, the bishop on d3 rakes the kingside. White is fully mobilized, every piece doing a job, and Black must finally resolve the central tension or be slowly strangled.",
      sayShort: 'Bd3 — last piece out, aims at h7.',
    }),
    b({
      id: 'release',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4',
      highlights: [H('c4'), H('d4', SOFT)],
      say: "Black releases the tension with dxc4, and White recaptures Bxc4 — exactly the free developing tempo Capablanca prized, the bishop landing on c4 without losing a move. White now owns more central space behind the d4-pawn while Black still nurses his bad bishop. That little package — more room, a freer game, a worse enemy piece — is the entire prize of the Queen's Gambit.",
      sayShort: '…dxc4 Bxc4 — recapture with tempo.',
    }),
    b({
      id: 'freeing',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5',
      arrows: [A('d5', 'c3', ATK)],
      highlights: [H('c3')],
      say: "Nd5 — the Capablanca Freeing Maneuver, the idea that names this whole line. Cramped for space, Black plants his knight in the centre to force exchanges, because the side with less room always wants pieces off the board. The knight attacks the Nc3 and offers a general liquidation. How White meets it decides whether Black frees himself or stays squeezed.",
      sayShort: '…Nd5 — central knight forces trades.',
    }),
    b({
      id: 'trade-bishops',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7',
      highlights: [H('e7')],
      say: "White strikes first with Bxe7, and Qxe7 recaptures. The order matters: White trades off the dark-squared bishops, removing Black's only actively-placed minor piece, before the knights come off. The pin is gone — but so is Black's best bishop, a more than fair swap for the side that holds the extra space.",
      sayShort: 'Bxe7 — swap the dark bishops first.',
    }),
    b({
      id: 'the-payoff',
      moves: MAIN,
      highlights: [H('d4', SOFT), H('c8', SOFT)],
      say: "O-O tucks the king away, Black trades on c3, and Rxc3 — the rook recaptures and stands proudly on the half-open c-file it was aimed at since move seven. White emerges with no knockout blow, but a lasting trio of tiny edges: more central space behind the d4-pawn, the c-file under his rook, and Black's bishop still boxed on c8. No fireworks — just the Queen's Gambit's quiet, permanent pull, the kind of edge Capablanca converted in his sleep.",
      sayShort: 'Rxc3 — rook seizes the open c-file.',
    }),
    b({
      id: 'branch-accept',
      moves: 'd4 d5 c4 dxc4',
      highlights: [H('c4'), H('c5', SOFT)],
      say: "But Black need not decline. Grabbing the pawn with dxc4 is the Queen's Gambit Accepted — Black gives up the centre for a moment to develop fast and counter-punch with …c5. White just recaptures the pawn and leans on his extra central space. It is a completely different game, and it has its own tab in this masterclass.",
      sayShort: '…dxc4 — the QGA; grab and develop.',
    }),
    b({
      id: 'branch-slav',
      moves: 'd4 d5 c4 c6',
      highlights: [H('c6'), H('d5', SOFT), H('c8')],
      say: "Or Black supports d5 with the pawn instead of the bishop's prison — c6, the Slav Defence. The whole point: the c8-bishop now stays free to come out before …e6 ever shuts it in, curing the QGD's worst headache. White develops with Nf3 and Nc3 and the struggle shifts to the c4-square and the long light diagonal. The Slav earns its own tab too.",
      sayShort: '…c6 — the Slav; free the bishop.',
    }),
    b({
      id: 'branch-exchange',
      moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5',
      highlights: [H('d5'), H('b5', SOFT)],
      say: "And White can change the structure himself: cxd5 exd5, the Exchange Variation. By trading on d5 White fixes Black's pawns and unveils the famous minority attack — a queenside pawn march with b4 and b5 to crack open Black's structure and leave him a weak pawn to besiege. Cold, technical, deeply instructive — and, you guessed it, a tab all its own.",
      sayShort: 'cxd5 — the Exchange; minority attack.',
    }),
    b({
      id: 'close',
      moves: MAIN,
      say: "That is the Queen's Gambit. Offer a pawn you can always win back, and force Black into a choice with no comfortable answer: surrender the centre, or accept a cramped and passive game. Whichever door he opens, White's compass never changes — more space, the open file, the bad bishop, the central majority. Decline, Accept, Slav, Exchange: four doors, one house. Master the tabs that follow, and you hold the opening every world champion has trusted for a hundred and forty years.",
      sayShort: 'Four doors, one house — the lasting pull.',
    }),
  ],
};

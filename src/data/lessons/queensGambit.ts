import type { LessonScript } from '../../types';

// Lead-the-eye colours (playbook §5a): GREEN arrows (vision / intent), YELLOW
// highlights (a key square the narration names), SOFT blue (secondary
// context). Orange move-squares are auto-painted by the LessonPlayer.
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

// The Classical Orthodox Queen's Gambit Declined — the "Main line" pill's PGN
// (matches repertoire.json's queens-gambit.pgn). Every ply masters-backed in
// openings-masters-db.json; chess.js computes the FENs.
// d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5
// Bxe7 Qxe7 O-O Nxc3 Rxc3
const M = 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3'.split(' ');

/**
 * The Queen's Gambit — A Master Class (White). The oldest of the queen's-pawn
 * openings: White offers the c-pawn to pull Black's d5-pawn off the centre,
 * then reclaims it with interest in development and space. Grounded in the
 * public-domain classics — Edward Lasker on WHY the gambit pawn can't be held,
 * Capablanca on the slow positional squeeze of the Orthodox Declined — plus
 * the canonical pawn-structure concepts (minority attack, the half-open
 * c-file, central majority).
 */
export const QUEENS_GAMBIT_LESSON: LessonScript = {
  openingId: 'queens-gambit',
  sources: [
    'book:queens-gambit',
    'concept:pos-center',
    'concept:pos-development',
    'concept:pawn-minority-attack',
    'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined',
  ],
  title: "Queen's Gambit — A Master Class",
  minutes: 13,
  orientation: 'white',
  beats: [
    {
      id: 'open',
      moves: ['d4', 'd5'],
      highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: KEY }],
      say: "Welcome. The Queen's Gambit is the oldest opening in the book — it appears in manuscripts five hundred years old, and it has been the main battleground of world-championship chess from Steinitz to Carlsen. It begins the quietest way imaginable: d4 against d5, two pawns locking horns in the centre. There is no early skirmish here, no immediate threat. What follows is a slow, positional fight for the centre — and the very first shot White fires is an offer that looks like a giveaway.",
      sayShort: 'd5 — the great queen-pawn battleground.',
    },
    {
      id: 'the-offer',
      moves: ['d4', 'd5', 'c4'],
      highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Here is the gambit: c4. White attacks the d5-pawn from the side and dares Black to take. Edward Lasker explained the whole point in one sentence — White offers a pawn to induce Black to give up his centre-pawn. It is NOT a real sacrifice. If Black grabs on c4, White regains the pawn easily and Black has simply traded his proud central pawn for one on the wing. So the gambit is really a question put to Black: will you give up the centre, or fight for it?",
      sayShort: 'c4 — the offer; Black must keep the centre.',
    },
    {
      id: 'declined',
      moves: ['d4', 'd5', 'c4', 'e6'],
      highlights: [{ square: 'd5', color: KEY }, { square: 'e6', color: SOFT }],
      say: "Black answers e6 — the Queen's Gambit DECLINED, the soundest reply and the one a careful opponent reaches for most. The little e6-pawn props up d5 so the centre holds firm. There is a price: it locks Black's own queen-bishop in behind the pawn chain, the famous 'problem bishop' of the Declined. That shut-in bishop is the structural theme of this whole opening, and a good part of White's plan is simply to keep it bad.",
      sayShort: 'e6 — Declined; props d5, shuts in the bishop.',
    },
    {
      id: 'the-pin',
      moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5'],
      arrows: [{ from: 'g5', to: 'f6', color: VIS }, { from: 'c3', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }],
      say: "White develops with purpose. Nc3 adds a second attacker to d5; Black guards with Nf6; and now Bg5 — the signature move of the Orthodox. The bishop pins the f6-knight against the queen, so that knight can no longer help defend d5. White is piling pressure on the one square the whole opening is about. Notice White develops toward the centre and toward Black's stiff point — never a wasted tempo.",
      sayShort: 'Bg5 — pins f6, doubling down on d5.',
    },
    {
      id: 'break-the-pin',
      moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O'],
      highlights: [{ square: 'e3', color: SOFT }, { square: 'f1', color: SOFT }],
      say: "Black breaks the pin with Be7 and tucks his king away. White answers e3 — modest, almost apologetic, but exactly right. It opens the f1-bishop's path and keeps the pawn chain solid. This is the Queen's Gambit's character: White is not hunting for a knockout, he is accumulating tiny, permanent advantages — a freer game, the better bishop, more central space. Capablanca won game after game from positions that looked like nothing.",
      sayShort: 'Be7, O-O, e3 — slow, solid, no hurry.',
    },
    {
      id: 'the-rook-lift',
      moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6'],
      highlights: [{ square: 'c6', color: KEY }, { square: 'c1', color: SOFT }],
      say: "Nf3 finishes the kingside, Nbd7 develops behind the pawns, and then a quietly strategic move: Rc1. The rook slides onto the c-file before a single pawn has been traded there. This is foresight — White expects the c-file to open, and he wants his rook already aimed down it. Black plays c6, the rock-solid Orthodox set-up, bracing d5 a third time. Every piece on both sides is doing centre-work; the tension has not broken yet.",
      sayShort: 'Rc1 — the rook claims the c-file early.',
    },
    {
      id: 'release',
      moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6', 'Bd3', 'dxc4', 'Bxc4'],
      highlights: [{ square: 'c4', color: KEY }, { square: 'e6', color: SOFT }],
      say: "White develops the last minor piece, Bd3, and Black finally resolves the central tension: dxc4, handing White the bishop recapture Bxc4. Look at what just happened to the files. White's c-pawn is gone, traded off, and the c-file has swung half-open — straight under the rook White parked on c1 three moves ago. The patience pays. Black's e6-pawn still hems in his light bishop; White's pieces breathe.",
      sayShort: 'dxc4 Bxc4 — the c-file cracks open.',
    },
    {
      id: 'freeing-maneuver',
      moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6', 'Bd3', 'dxc4', 'Bxc4', 'Nd5', 'Bxe7', 'Qxe7'],
      arrows: [{ from: 'd5', to: 'c3', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }],
      say: "Now Black tries the famous antidote — Capablanca's freeing manoeuvre, Nd5. The knight jumps to the centre and offers a swarm of trades; the cramped side wants to swap pieces to get room to breathe. White obliges where it helps him: Bxe7 removes Black's good bishop, Qxe7 recaptures. Trading is fine for White as long as he keeps the structural plus. The d5-knight now eyes White's c3-knight, inviting the exchange that decides where White's rook lands.",
      sayShort: 'Nd5 — the freeing manoeuvre; trades begin.',
    },
    {
      id: 'the-edge',
      moves: M,
      highlights: [{ square: 'c6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "White castles, Black takes Nxc3, and White recaptures the natural way — Rxc3. Survey the board. White's c3-rook now stares straight up the half-open c-file at Black's backward c6-pawn; White owns a pawn on d4 against Black's none in the centre — a central majority and more space; and Black's surviving bishop is still the bad one. This is the Queen's Gambit's whole promise delivered: no fireworks, just a small, permanent edge that grinds for fifty moves. From here White prepares the minority attack — push the b-pawn to b4-b5 to crack that c6-pawn and leave Black a lasting weakness.",
      sayShort: 'Rxc3 — c-file, central majority, the lasting edge.',
    },
    {
      id: 'the-minority-attack',
      moves: M,
      highlights: [{ square: 'b2', color: KEY }, { square: 'c6', color: KEY }],
      say: "Remember the plan that defines this structure, because it is the engine of half of all Queen's Gambit wins: the minority attack. White has fewer pawns on the queenside, yet he ATTACKS there — pushing b2 to b4 and on to b5, deliberately offering to trade his b-pawn for Black's c6-pawn. When the dust clears Black is left with a backward pawn on an open file and a hole in front of it, and White's rooks pour down the c-file onto it. It is one of the most elegant ideas in chess: you attack with the minority precisely to create a target you then besiege. Learn this, and you understand why the Queen's Gambit has won more world-championship games than any other opening.",
      sayShort: 'b4-b5 — the minority attack makes the target.',
    },
    {
      id: 'branch-exchange',
      moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5'],
      arrows: [{ from: 'c3', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "Black does not have to allow the slow squeeze, and White does not have to wait for it. The most important sister-line is the Exchange Variation — White takes cxd5 early, Black recaptures exd5, and the famous Carlsbad pawn structure is on the board. Now the minority attack is the MAIN event from move eight: a3, b4, b5, and the trade on c6 leaves Black a backward pawn there on the open file. Every tab in this masterclass is a different way to reach the same kind of edge — the Exchange goes straight for the queenside plan; the Tartakower hands Black a freer game but a target; and against Black's gambit-accepting and Slav tries, White claims the centre instead. One offer, many roads, the same patient profit.",
      sayShort: 'cxd5 — the Exchange and the Carlsbad structure.',
    },
    {
      id: 'close',
      moves: M,
      say: "That is the Queen's Gambit. Not a real sacrifice — a question. Offer the c-pawn, and either Black gives up the centre and you seize space, or he declines and you out-develop him toward a structural edge: the half-open c-file, the central majority, the bad bishop he can never quite free. There are no cheap traps here and no need for them. You win the Queen's Gambit the way Capablanca did — by understanding the pawns better than your opponent and squeezing until the position falls apart on its own. The tabs that follow teach each road: the Exchange and its minority attack, the Tartakower, the Accepted, the Slav and Semi-Slav, the Catalan, and the quick Bf4 set-up. Learn them, and you have a weapon for a lifetime.",
      sayShort: 'A question, not a sacrifice — squeeze and win.',
    },
  ],
};

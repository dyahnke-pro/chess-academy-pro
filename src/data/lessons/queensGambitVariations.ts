import type { LessonScript } from '../../types';

// Lead-the-eye colours (playbook §5a). GREEN arrows = vision/intent, YELLOW
// highlights = a key square the narration names, SOFT blue = secondary.
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

// Every variation spine is masters-backed in openings-masters-db.json (G3) and
// reaches >=20 plies (lessonDepth). chess.js computes the FENs. Keys match the
// repertoire.json variation names EXACTLY (getVariationLessonScript lookup).
export const QUEENS_GAMBIT_VARIATION_LESSONS: Record<string, LessonScript> = {
  'queens-gambit::Classical Mainline': {
    openingId: 'queens-gambit',
    sources: ['book:queens-gambit', 'concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
    title: 'Classical Mainline — the Orthodox QGD',
    minutes: 11,
    orientation: 'white',
    beats: [
      { id: 'qcm1', moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7'], highlights: [{ square: 'd5', color: KEY }], say: "The Queen's Gambit in its grandest form — the Orthodox Declined. White's pieces take their classical posts: Bg5 pinning, e3 solidifying, then Nf3 and a battery to come. Black answers with the soundest defence in chess, the d5-pawn held firm, but it is cramped, and White enjoys a risk-free space edge with a clear plan. White presses; Black defends.", sayShort: 'Bg5, e3, Nf3 — the classical bind.' },
      { id: 'qcm2', moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6', 'Bd3', 'dxc4', 'Bxc4', 'Nd5'], highlights: [{ square: 'c1', color: KEY }, { square: 'd5', color: SOFT }], say: "White completes the ideal set-up — Rc1 onto the half-open c-file, Bd3 eyeing the kingside — and stands clearly more comfortable. But Black has the antidote: …Nd5, Capablanca's freeing manoeuvre, offering trades to relieve the cramp. White must accept that precise defence equalises; the practical edge is in making Black find it.", sayShort: 'Rc1, Bd3 — the ideal bind; …Nd5 frees.' },
      { id: 'qcm3', moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6', 'Bd3', 'dxc4', 'Bxc4', 'Nd5', 'Bxe7', 'Qxe7', 'O-O', 'Nxc3', 'Rxc3'], highlights: [{ square: 'c3', color: KEY }], say: "The trades come: Bxe7 takes Black's dark-squared bishop, and after …Nxc3 the rook recaptures on c3, lined up on the half-open file. White still owns a touch more space and the more active rook, but each exchange brings Black closer to comfort. The edge is symbolic now, not structural.", sayShort: 'Rxc3 — the rook holds the c-file.' },
      { id: 'qcm4', moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6', 'Bd3', 'dxc4', 'Bxc4', 'Nd5', 'Bxe7', 'Qxe7', 'O-O', 'Nxc3', 'Rxc3', 'e5', 'dxe5', 'Nxe5', 'Nxe5', 'Qxe5'], highlights: [{ square: 'e5', color: KEY }], say: "Black completes the freeing plan with …e5, and after the exchanges the queen lands on e5 — the centre is liquidated and the position is level. This is the honest verdict on the Orthodox main line: White gets a pleasant, risk-free pull and the easier game, but against accurate defence Black holds the balance. The Queen's Gambit is a positional squeeze, not a knockout — and that squeeze wins plenty of games when Black goes wrong.", sayShort: '…e5 equalises — White had the pull.' },
    ],
  },

  'queens-gambit::Exchange Variation': {
    openingId: 'queens-gambit',
    sources: [
      'book:queens-gambit',
      'concept:pawn-minority-attack',
      'concept:pos-open-file',
      'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined,_Exchange_Variation',
    ],
    title: 'Exchange Variation — the Minority Attack',
    minutes: 9,
    orientation: 'white',
    beats: [
      {
        id: 'carlsbad',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5'],
        highlights: [{ square: 'd5', color: KEY }, { square: 'c7', color: SOFT }],
        say: "The Exchange Variation begins the moment White plays cxd5 and Black recaptures with the e-pawn, exd5. The result is the famous Carlsbad pawn structure — Black's pawns frozen on c7, d5 and the kingside, White's on d4 and the queenside. This is the most instructive structure in all of chess, because the plan for BOTH sides is written into the pawns. White will attack on the queenside; Black must counter in the centre or on the kingside.",
        sayShort: 'cxd5 exd5 — the Carlsbad structure.',
      },
      {
        id: 'battery',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3', 'Nbd7', 'Qc2'],
        arrows: [{ from: 'd3', to: 'h7', color: VIS }],
        highlights: [{ square: 'h7', color: KEY }],
        say: "White develops with a sting in the tail. Bg5 pins, Be7 unpins, e3 opens the bishop, and then Bd3 and Qc2 line up on the same diagonal — a battery aimed straight at h7, the pawn in front of Black's castled king. The Carlsbad isn't only a queenside grind; if Black ever drifts, the battery on the b1-h7 diagonal becomes a real kingside threat. Black must watch both wings.",
        sayShort: 'Bd3 and Qc2 — the battery eyes h7.',
      },
      {
        id: 'reroute',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3', 'Nbd7', 'Qc2', 'Re8', 'Nf3', 'c6', 'O-O', 'Nf8'],
        highlights: [{ square: 'c6', color: KEY }, { square: 'f8', color: SOFT }],
        say: "Both sides finish developing and Black shows his defensive idea: the knight reroutes from d7 to f8 and on toward g6, where it guards the kingside and the e-file. Black plays c6 — the rock of the Carlsbad — bracing d5 and bolstering the very square White intends to attack. The battle lines are drawn: White against the c6-pawn, Black covering his king.",
        sayShort: 'c6 and Nf8 — Black braces d5.',
      },
      {
        id: 'prepare-b4',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3', 'Nbd7', 'Qc2', 'Re8', 'Nf3', 'c6', 'O-O', 'Nf8', 'Rab1', 'a5', 'a3', 'Ng6'],
        highlights: [{ square: 'b4', color: KEY }],
        say: "Here is the minority attack being loaded. Rab1 swings the rook behind the b-pawn; a3 prepares to push it. The plan is b2-b4-b5, throwing White's lone queenside pawn at Black's c6. Black plays a5 to slam the brakes on b4 and brings the knight to g6 to defend — but White has all the time in the world. This is the slowest, surest plan in chess.",
        sayShort: 'Rab1 and a3 — loading the b4 push.',
      },
      {
        id: 'the-push',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3', 'Nbd7', 'Qc2', 'Re8', 'Nf3', 'c6', 'O-O', 'Nf8', 'Rab1', 'a5', 'a3', 'Ng6', 'b4', 'axb4', 'axb4', 'Bd6'],
        highlights: [{ square: 'b4', color: KEY }],
        say: "b4 breaks. Black trades on b4, White recaptures axb4, and now the b-pawn is one square from its goal. Black redeploys the bishop to d6, eyeing the kingside in search of counterplay, because he knows what is coming on the other wing. Everything White has done for fifteen moves was to reach this single pawn lever.",
        sayShort: 'b4 axb4 axb4 — the lever is cocked.',
      },
      {
        id: 'b5-lands',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'O-O', 'Bd3', 'Nbd7', 'Qc2', 'Re8', 'Nf3', 'c6', 'O-O', 'Nf8', 'Rab1', 'a5', 'a3', 'Ng6', 'b4', 'axb4', 'axb4', 'Bd6', 'b5'],
        arrows: [{ from: 'b1', to: 'b5', color: VIS }],
        highlights: [{ square: 'b5', color: KEY }, { square: 'c6', color: KEY }],
        say: "b5! The spearhead lands, supported by the rook behind it on the b-file. Black has two bad choices. If he takes on b5, White recaptures and the c6-pawn is gone — the c-file opens onto Black's position. If he allows b5xc6, the recapture leaves him a backward pawn on c6 sitting on a half-open file, exactly the target White wanted. Either way White gets the lasting weakness, and the rooks pour onto it. That is the minority attack: you push the minority precisely to manufacture the weakness you then besiege.",
        sayShort: 'b5! — the weakness on c6 is made.',
      },
    ],
  },

  'queens-gambit::Tartakower Variation': {
    openingId: 'queens-gambit',
    sources: [
      'book:queens-gambit',
      'concept:pos-development',
      'concept:pawn-hanging',
      'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined',
    ],
    title: 'Tartakower — Freeing the Bad Bishop',
    minutes: 9,
    orientation: 'white',
    beats: [
      {
        id: 'the-idea',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6', 'Bh4', 'b6'],
        highlights: [{ square: 'b6', color: KEY }, { square: 'b7', color: KEY }],
        say: "The Tartakower is Black's most respected solution to the whole Queen's Gambit problem: how to free the bad light-squared bishop locked behind e6. He inserts h6 to question the pin, then plays b6 — fianchetto preparation. The problem bishop will come to b7 and finally breathe on the long diagonal. White must prove that he gets something in return for letting it out.",
        sayShort: 'h6 and b6 — Black frees the bishop.',
      },
      {
        id: 'simplify',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6', 'Bh4', 'b6', 'cxd5', 'Nxd5'],
        arrows: [{ from: 'h4', to: 'e7', color: VIS }],
        highlights: [{ square: 'd5', color: KEY }, { square: 'e7', color: SOFT }],
        say: "White strikes in the centre while the bishop is still on its launch pad: cxd5. Black recaptures with the knight, Nxd5 — and now the h4-bishop stares the length of the diagonal at the e7-bishop, ready to trade off a defender. White's plan is to simplify into a position where Black's freed bishop has less to bite on and his central pawn becomes a target.",
        sayShort: 'cxd5 Nxd5 — White simplifies the centre.',
      },
      {
        id: 'trades',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6', 'Bh4', 'b6', 'cxd5', 'Nxd5', 'Bxe7', 'Qxe7', 'Nxd5', 'exd5'],
        highlights: [{ square: 'd5', color: KEY }],
        say: "The pieces come off: Bxe7 Qxe7, then Nxd5 exd5. Look at the pawn that's left — Black's d5-pawn now stands alone in the centre, with no friend on the c- or e-file to guard it. This is the isolated queen's pawn, and the rest of the game revolves around it. It gives Black active pieces, but it is permanently weak, and White will sit behind a blockade and pick at it.",
        sayShort: 'trades leave Black an isolated d5-pawn.',
      },
      {
        id: 'press',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6', 'Bh4', 'b6', 'cxd5', 'Nxd5', 'Bxe7', 'Qxe7', 'Nxd5', 'exd5', 'Rc1', 'Be6', 'Qa4'],
        arrows: [{ from: 'c1', to: 'c7', color: VIS }],
        highlights: [{ square: 'c7', color: KEY }],
        say: "White goes to work on the open lines. Rc1 seizes the c-file — clear all the way to c7 — and Qa4 swings out to harass and to eye the queenside. Black develops the freed bishop to e6, defending d5. The position is balanced but one-sided in character: Black has the freer bishop, White has the better pawns and the open file. White presses; Black holds.",
        sayShort: 'Rc1 and Qa4 — work the c-file.',
      },
      {
        id: 'hanging',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6', 'Bh4', 'b6', 'cxd5', 'Nxd5', 'Bxe7', 'Qxe7', 'Nxd5', 'exd5', 'Rc1', 'Be6', 'Qa4', 'c5', 'Qa3', 'Rc8', 'Bb5'],
        arrows: [{ from: 'b5', to: 'e8', color: VIS }],
        highlights: [{ square: 'c5', color: KEY }, { square: 'd5', color: KEY }],
        say: "Black breaks with c5 to free his game, and the isolated pawn becomes a pair of hanging pawns on c5 and d5. They look strong — they control key central squares — but they are a pair of targets, advanced and unguarded by other pawns. White answers Qa3, piling onto the c5-pawn, and Bb5 develops with tempo down the diagonal toward Black's back rank on e8. The Tartakower's lesson is exactly this: Black solves his bad bishop, but the price is a long defence of weak central pawns. White's edge is small and permanent — the hallmark of the whole Queen's Gambit.",
        sayShort: 'c5 — hanging pawns become White targets.',
      },
    ],
  },

  "queens-gambit::Queen's Gambit Accepted": {
    openingId: 'queens-gambit',
    sources: [
      'book:queens-gambit',
      'concept:pos-center',
      'concept:pos-development',
      'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted',
    ],
    title: "Queen's Gambit Accepted — Seize the Centre",
    minutes: 9,
    orientation: 'white',
    beats: [
      {
        id: 'accepted',
        moves: ['d4', 'd5', 'c4', 'dxc4'],
        highlights: [{ square: 'c4', color: KEY }, { square: 'd4', color: KEY }],
        say: "When Black plays dxc4 he ACCEPTS the gambit — and gives up the centre to do it. Edward Lasker's verdict is the key to the whole line: Black cannot actually hold the pawn, and there is no good reason to give up the centre for it. So White does not rush to win the c4-pawn back. He develops, builds a big pawn centre with d4 and a coming e4, and trusts that the pawn returns on its own terms.",
        sayShort: 'dxc4 — accepted, but the centre yielded.',
      },
      {
        id: 'natural',
        moves: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5'],
        highlights: [{ square: 'f7', color: KEY }],
        say: "White plays the most natural moves on the board: Nf3 controls the centre and stops Black's freeing break, e3 opens the bishop, and Bxc4 calmly recovers the pawn — the bishop landing on c4 with its eye down the diagonal at f7. Black hits back with c5, striking at White's d4 to stop a giant centre forming. The fight is now about whether White can play the e3-e4 break and dominate.",
        sayShort: 'Bxc4 — pawn back, bishop eyes f7.',
      },
      {
        id: 'expansion',
        moves: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'a6', 'Qe2', 'b5', 'Bb3', 'Bb7'],
        highlights: [{ square: 'b5', color: KEY }, { square: 'b7', color: KEY }],
        say: "Both sides expand. White castles and plays Qe2, quietly preparing the central break e3-e4 and connecting the rooks. Black grabs queenside space with a6 and b5, chasing the bishop to b3, and develops his own light bishop to b7 where it rakes the long diagonal toward White's king. This is the QGA's character: White's centre versus Black's queenside space and active bishop. Tempo decides it.",
        sayShort: 'Qe2 versus b5 — centre versus space.',
      },
      {
        id: 'the-break',
        moves: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'a6', 'Qe2', 'b5', 'Bb3', 'Bb7', 'Rd1', 'Nbd7', 'Nc3', 'Qb8', 'd5'],
        arrows: [{ from: 'd1', to: 'd5', color: VIS }],
        highlights: [{ square: 'd5', color: KEY }],
        say: "Rd1 puts the rook on the half-open d-file behind the pawn, Nc3 completes development, and then the blow lands: d5! White rips the centre open with a pawn break, supported by the rook stacked behind it on d1. The pawn White held back the whole game smashes forward at the perfect moment, when every White piece is ready and Black's queen has just stepped offside to b8.",
        sayShort: 'd5! — the central break detonates.',
      },
      {
        id: 'open-d',
        moves: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'a6', 'Qe2', 'b5', 'Bb3', 'Bb7', 'Rd1', 'Nbd7', 'Nc3', 'Qb8', 'd5', 'exd5', 'Nxd5', 'Nxd5', 'Bxd5', 'Bxd5', 'Rxd5', 'Be7'],
        arrows: [{ from: 'd5', to: 'd7', color: VIS }],
        highlights: [{ square: 'd5', color: KEY }, { square: 'd7', color: SOFT }],
        say: "The break detonates a chain of trades: exd5, Nxd5, Nxd5, Bxd5, Bxd5, Rxd5 — and White's rook lands on d5, dominating the open file in the heart of Black's position and pressing toward d7. White emerges with the more active pieces and the safer king. The QGA's whole story in one diagram: Black accepted the pawn and conceded the centre, and the open d-file is where White collects the debt.",
        sayShort: 'Rxd5 — the rook owns the d-file.',
      },
    ],
  },

  'queens-gambit::Slav Defence Response': {
    openingId: 'queens-gambit',
    sources: [
      'book:queens-gambit',
      'concept:pos-center',
      'concept:pos-development',
      'https://en.wikipedia.org/wiki/Slav_Defense',
    ],
    title: 'Slav Defence — Claim the Centre with e4',
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'the-slav',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4'],
        highlights: [{ square: 'c6', color: KEY }, { square: 'c4', color: SOFT }],
        say: "In the Slav, Black supports d5 with c6 instead of e6 — the great advantage being that his light-squared bishop stays OUTSIDE the pawn chain, free to develop, unlike the bad bishop of the Declined. Then Black takes dxc4, this time intending to hold the pawn with a later …b5 and develop the bishop before locking it in. White's task is to refute that plan and seize the centre.",
        sayShort: 'c6 then dxc4 — the Slav grab.',
      },
      {
        id: 'a4',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5'],
        highlights: [{ square: 'b5', color: KEY }, { square: 'f5', color: KEY }],
        say: "a4! The key move. It stops Black's …b5 in its tracks — Black can no longer hold the extra pawn with a pawn chain. The cost is the b4-square, slightly loosened, but that is a small price. Black gets his bishop out first with Bf5, onto the b1-h7 diagonal, exactly the developing move the Slav is built around. White will simply recapture the c4-pawn next and stand better in the centre.",
        sayShort: 'a4 — stops b5; the bishop emerges.',
      },
      {
        id: 'recapture',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6', 'Bxc4', 'Bb4', 'O-O', 'O-O', 'Qe2'],
        highlights: [{ square: 'c4', color: KEY }, { square: 'e4', color: SOFT }],
        say: "White plays e3 to open his bishop, recaptures the pawn with Bxc4, and both sides castle. Black pins the c3-knight with Bb4 to slow White's central ambitions. White's reply Qe2 has one big idea behind it: it unblocks the e-pawn and clears the way for the e3-e4 break, the move that turns White's space into a real central pawn front.",
        sayShort: 'Bxc4 then Qe2 — preparing e4.',
      },
      {
        id: 'e4',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6', 'Bxc4', 'Bb4', 'O-O', 'O-O', 'Qe2', 'Nbd7', 'e4', 'Bg6', 'Bd3'],
        highlights: [{ square: 'e4', color: KEY }, { square: 'g6', color: KEY }],
        say: "e4! White builds the broad pawn centre — pawns on d4 and e4, the dream of every queen's-pawn player. Black's bishop retreats to g6 to stay on its diagonal, and White immediately challenges it with Bd3, offering to trade off the one good minor piece Black got to develop early. With the big centre and the bishop pair looming, White's opening edge is real and clear. The Slav lesson: meet a solid set-up not with tricks, but with a4 to keep the pawn and e4 to claim the centre.",
        sayShort: 'e4 then Bd3 — big centre, challenge g6.',
      },
    ],
  },

  'queens-gambit::Semi-Slav Response': {
    openingId: 'queens-gambit',
    sources: [
      'book:queens-gambit',
      'concept:pawn-chain',
      'concept:pos-center',
      'https://en.wikipedia.org/wiki/Semi-Slav_Defense',
    ],
    title: 'Semi-Slav — the Central Pawn Storm',
    minutes: 9,
    orientation: 'white',
    beats: [
      {
        id: 'semislav',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6'],
        highlights: [{ square: 'c6', color: KEY }, { square: 'e6', color: KEY }],
        say: "The Semi-Slav is Black's most ambitious defence: he plays BOTH c6 and e6, building a triangle of pawns that holds the centre like a fortress and keeps the option of grabbing on c4 and holding with …b5. It is rock-solid and double-edged. White's most principled answer is the Meran set-up — develop quickly, let Black take the pawn, then blow the centre open while Black is still untangling his queenside.",
        sayShort: 'c6 and e6 — the solid Semi-Slav.',
      },
      {
        id: 'meran',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'dxc4', 'Bxc4', 'b5'],
        arrows: [{ from: 'c4', to: 'b5', color: VIS }],
        highlights: [{ square: 'b5', color: KEY }, { square: 'c4', color: SOFT }],
        say: "The Meran. White develops naturally — e3, Bd3, and when Black takes dxc4, White recaptures Bxc4. Then Black plays b5, gaining queenside space and hitting the bishop. This is the tabiya of the whole variation: Black expands on the wing, but every tempo he spends on …b5 and …a6 and …c5 is a tempo White spends preparing to detonate the centre. It is a race.",
        sayShort: 'Bxc4 b5 — the Meran race begins.',
      },
      {
        id: 'build',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'dxc4', 'Bxc4', 'b5', 'Bd3', 'Bb7', 'O-O', 'a6'],
        arrows: [{ from: 'd3', to: 'h7', color: VIS }],
        highlights: [{ square: 'h7', color: KEY }],
        say: "The bishop drops back to d3, NOT to e2 — because on d3 it points down the b1-h7 diagonal at Black's king, and that diagonal is the whole point. Black develops his freed bishop to b7 and plays a6 to brace b5. Everything is poised. White is castled, his pieces aimed at the kingside; Black has space but a king that has not yet found cover.",
        sayShort: 'Bd3 — the bishop reloads onto h7.',
      },
      {
        id: 'e4-e5',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'dxc4', 'Bxc4', 'b5', 'Bd3', 'Bb7', 'O-O', 'a6', 'e4', 'c5', 'd5', 'e5'],
        highlights: [{ square: 'e4', color: KEY }, { square: 'd5', color: KEY }],
        say: "e4! The centre erupts. Black counters with c5 to hit d4, but White does not capture — he charges past with d5!, locking the centre and gaining a protected passed pawn that cramps Black for the rest of the game. Black bolts the door with e5. Now the position is a knife fight: White's central wedge and the coming kingside push against Black's queenside majority. The Semi-Slav lesson is nerve — meet Black's solidity by storming the centre with e4 and d5 the moment your pieces are ready, and play for the attack the wedge sets up.",
        sayShort: 'e4 then d5! — the central wedge.',
      },
    ],
  },

  'queens-gambit::Catalan Transposition': {
    openingId: 'queens-gambit',
    sources: [
      'book:queens-gambit',
      'concept:pawn-fianchetto',
      'concept:pos-open-file',
      'https://en.wikipedia.org/wiki/Catalan_Opening',
    ],
    title: 'Catalan — the Long Diagonal Squeeze',
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'fianchetto',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nf3', 'Nf6', 'g3'],
        highlights: [{ square: 'g3', color: KEY }, { square: 'g2', color: KEY }],
        say: "With g3, White steers the Queen's Gambit into the Catalan — instead of developing the bishop to d3, he fianchettoes it to g2. From the corner the bishop will rake the entire long light diagonal, a1 to h8, straight through the centre and at Black's queenside. It is the most positional weapon in the whole repertoire: White accepts a slower game in exchange for the most powerful bishop on the board.",
        sayShort: 'g3 — the Catalan fianchetto.',
      },
      {
        id: 'grab',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nf3', 'Nf6', 'g3', 'Be7', 'Bg2', 'O-O', 'O-O', 'dxc4', 'Qc2'],
        arrows: [{ from: 'c2', to: 'c4', color: VIS }],
        highlights: [{ square: 'c4', color: KEY }],
        say: "Black develops and grabs the c4-pawn — the typical Catalan try, betting that White will struggle to win it back. White doesn't chase with a piece; he plays Qc2. Now TWO White forces aim at the loose pawn and the long diagonal at once: the queen on c2 eyes c4 directly, and the g2-bishop waits behind its knight on the long diagonal. The pawn cannot be held for long, and the diagonal springs to life the moment the knight steps aside.",
        sayShort: 'Qc2 — queen and bishop reclaim c4.',
      },
      {
        id: 'regain',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nf3', 'Nf6', 'g3', 'Be7', 'Bg2', 'O-O', 'O-O', 'dxc4', 'Qc2', 'a6', 'Qxc4', 'b5', 'Qc2', 'Bb7'],
        highlights: [{ square: 'b7', color: KEY }],
        say: "Black tries to keep the pawn with a6 and b5, but after Qxc4 and the retreat Qc2 the pawn is back and Black has only loosened his queenside. Black develops the bishop to b7 to contest the long diagonal — and now the two great light-squared bishops face off down the same line. Whoever controls that diagonal controls the game, and White's was there first.",
        sayShort: 'Qxc4 — pawn regained, diagonals clash.',
      },
      {
        id: 'pressure',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nf3', 'Nf6', 'g3', 'Be7', 'Bg2', 'O-O', 'O-O', 'dxc4', 'Qc2', 'a6', 'Qxc4', 'b5', 'Qc2', 'Bb7', 'Bd2', 'Be4'],
        highlights: [{ square: 'e4', color: KEY }],
        say: "White unwinds smoothly — Bd2 develops and clears the back rank for the rooks to come to c1 and d1. Black even offers a bishop trade with Be4 to ease the pressure of that monster on g2. But trading does not solve Black's problem: White still has the freer pieces, the open c-file for his rooks, and a lasting pull on the queenside light squares that a6 and b5 left weak. The Catalan's lesson is patience rewarded — fianchetto, let the pawn come back on its own, and squeeze the long diagonal for the rest of the game.",
        sayShort: 'Bd2 — unwind and squeeze the diagonal.',
      },
    ],
  },

  'queens-gambit::Anti-QGD: Early Bf4 System': {
    openingId: 'queens-gambit',
    sources: [
      'book:queens-gambit',
      'concept:pos-development',
      'concept:pos-open-file',
      'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined',
    ],
    title: 'Early Bf4 — the No-Theory System',
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'bf4',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bf4'],
        arrows: [{ from: 'f4', to: 'c7', color: VIS }],
        highlights: [{ square: 'f4', color: KEY }, { square: 'c7', color: KEY }],
        say: "Bf4 instead of Bg5 is the practical player's Queen's Gambit. The bishop develops OUTSIDE the pawn chain — it will never be locked behind its own e-pawn the way the Orthodox bishop is — and it eyes the long diagonal toward c7. There is far less theory here than in the pinning lines, which is exactly the appeal: White gets a sound, easy-to-play position and an active bishop with almost no memorisation.",
        sayShort: 'Bf4 — develop the bishop outside the chain.',
      },
      {
        id: 'trade-offer',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bf4', 'Bd6', 'Bg3'],
        arrows: [{ from: 'g3', to: 'd6', color: VIS }],
        highlights: [{ square: 'd6', color: KEY }, { square: 'g3', color: KEY }],
        say: "Black challenges the bishop with Bd6, offering a trade. White sidesteps with Bg3 — keeping the bishop and keeping the tension on the diagonal, still looking at the d6-bishop and the kingside. If Black ever trades on g3, White recaptures toward the centre and opens the h-file for his rook. The little bishop dance keeps White's structure flawless.",
        sayShort: 'Bg3 — keep the bishop and the tension.',
      },
      {
        id: 'develop',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bf4', 'Bd6', 'Bg3', 'O-O', 'e3', 'c5', 'dxc5', 'Bxc5', 'a3'],
        highlights: [{ square: 'c5', color: KEY }, { square: 'b4', color: SOFT }],
        say: "Both sides develop briskly. Black castles and strikes at the centre with c5; White takes dxc5 and after Bxc5 plays a3 — a useful little move that prepares b4 to gain queenside space and chase the c5-bishop. White's whole set-up is low-maintenance: good bishop outside the chain, solid pawns, and a small space plan on the queenside. No sharp theory required.",
        sayShort: 'dxc5 then a3 — develop, prepare b4.',
      },
      {
        id: 'harmonious',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bf4', 'Bd6', 'Bg3', 'O-O', 'e3', 'c5', 'dxc5', 'Bxc5', 'a3', 'Nc6', 'Nf3', 'Be7', 'Qc2', 'Bd7'],
        arrows: [{ from: 'c2', to: 'h7', color: VIS }],
        highlights: [{ square: 'h7', color: KEY }],
        say: "White finishes harmoniously: Nf3 develops, and Qc2 lines up with the g3-bishop — both pointing down the diagonals toward h7 and Black's king. Black tucks the bishop back to e7 and develops with Bd7. White has reached a model position — every piece on a good square, the bishop pair pointed at the king, no weaknesses, and a queenside space plan in hand. The Early Bf4 lesson is simple: you don't need to memorise the Orthodox to play the Queen's Gambit well — develop the bishop outside the chain, keep your structure clean, and let good moves do the work.",
        sayShort: 'Nf3 and Qc2 — a model, low-theory game.',
      },
    ],
  },
};

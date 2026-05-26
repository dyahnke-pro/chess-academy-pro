import type { LessonScript } from '../../types';

// Lead-the-eye colours (playbook §5a). Bird's narration grounded on universal
// principles (concept corpus) + a reputable ref + DB moves. Highlights lead the
// eye to the key squares the narration names.
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const BIRD = 'https://en.wikipedia.org/wiki/Bird%27s_Opening';

export const BIRDS_OPENING_VARIATION_LESSONS: Record<string, LessonScript> = {
  "birds-opening::Bird's: Leningrad Formation": {
    openingId: 'birds-opening',
    sources: ['concept:pos-space', 'concept:pos-development', BIRD],
    title: 'Leningrad — the Double Fianchetto',
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'fianchetto',
        moves: ['f4', 'd5', 'Nf3', 'g6', 'g3', 'Bg7', 'Bg2', 'Nf6', 'O-O', 'O-O'],
        highlights: [{ square: 'g2', color: KEY }, { square: 'e5', color: SOFT }],
        say: "In the Leningrad set-up White fianchettoes the king-bishop to g2 instead of dropping it on e2. Now White has both the f4-grip on e5 AND a bishop raking the long light diagonal. Black mirrors with his own fianchetto. The result is a flexible, double-edged middlegame where White's pieces all point toward the centre and the queenside.",
        sayShort: 'Bg2 — fianchetto plus the f4 grip.',
      },
      {
        id: 'queenside',
        moves: ['f4', 'd5', 'Nf3', 'g6', 'g3', 'Bg7', 'Bg2', 'Nf6', 'O-O', 'O-O', 'd3', 'c5', 'c3', 'Nc6', 'Na3', 'Rb8', 'Nc2'],
        highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
        say: "White's plan shifts to the queenside and centre. c3 prepares to meet a black ...d4 break and supports a future d3-d4; the knight takes the scenic route Na3-c2, where it bolsters the central squares and eyes the b4- and e3-squares. Black readies his own queenside expansion with Rb8 and ...b5. A rich strategic battle on both wings.",
        sayShort: 'c3 and Na3-c2 — shore up the centre.',
      },
      {
        id: 'balanced',
        moves: ['f4', 'd5', 'Nf3', 'g6', 'g3', 'Bg7', 'Bg2', 'Nf6', 'O-O', 'O-O', 'd3', 'c5', 'c3', 'Nc6', 'Na3', 'Rb8', 'Nc2', 'b5', 'Be3', 'Qd6'],
        highlights: [{ square: 'e3', color: KEY }, { square: 'c5', color: SOFT }],
        say: "Black expands with b5; White completes his harmonious set-up with Be3, eyeing the c5-pawn and the dark squares, while the queen and rooks await the central break. The Leningrad Bird is the positional face of the opening — no early attack, just a sound, flexible structure where White's fianchettoed bishop and central control give him a comfortable, easy-to-play game.",
        sayShort: 'Be3 — harmonious, eyeing c5.',
      },
    ],
  },

  "birds-opening::Bird's: From's Gambit Accepted": {
    openingId: 'birds-opening',
    sources: ['concept:pos-initiative', 'concept:pawn-majority', BIRD],
    title: "From's Gambit — Accept, Survive, Win",
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'accept',
        moves: ['f4', 'e5', 'fxe5', 'd6', 'exd6', 'Bxd6'],
        highlights: [{ square: 'd6', color: KEY }, { square: 'h2', color: SOFT }],
        say: "From's Gambit is Black's sharpest try against the Bird: 1...e5, throwing a pawn at f4 to rip open lines toward White's king before he is developed. White ACCEPTS — fxe5 — and after exd6 Bxd6 Black has the bishop pointed menacingly at h2. The whole line is a test of nerve: hold the extra pawn, weather the attack, and win the endgame.",
        sayShort: 'fxe5 — accept the gambit, hold firm.',
      },
      {
        id: 'defuse',
        moves: ['f4', 'e5', 'fxe5', 'd6', 'exd6', 'Bxd6', 'Nf3', 'g5', 'd4', 'g4', 'Ne5', 'Bxe5', 'dxe5'],
        highlights: [{ square: 'e5', color: KEY }],
        say: "Black storms with g5-g4 to chase the f3-knight and open the g-file. White's key resource: Ne5! The knight jumps INTO the attack, and after Bxe5 dxe5 White has a healthy extra pawn on e5, has traded off Black's dangerous dark-squared bishop, and the attack has lost its sharpest piece. The gambit's fire is being smothered.",
        sayShort: 'Ne5! — trade off the attacker.',
      },
      {
        id: 'endgame',
        moves: ['f4', 'e5', 'fxe5', 'd6', 'exd6', 'Bxd6', 'Nf3', 'g5', 'd4', 'g4', 'Ne5', 'Bxe5', 'dxe5', 'Qxd1+', 'Kxd1', 'Nc6', 'Bf4', 'Bf5', 'Nc3', 'O-O-O+'],
        highlights: [{ square: 'e5', color: KEY }, { square: 'f4', color: SOFT }],
        say: "Black trades queens with Qxd1+ — but that is exactly what White wants. After Kxd1 there is no attack left without queens, and White simply remains a clean pawn up with the extra e5-pawn and the better structure. He finishes developing with Bf4 and Nc3; Black checks with O-O-O+ but it is harmless. The lesson of From's Gambit is calm: accept the pawn, trade the attackers, reach the endgame, and convert the extra material.",
        sayShort: 'Qxd1+ Kxd1 — queens off, a pawn up.',
      },
    ],
  },

  "birds-opening::Bird's: Nimzo-Larsen Hybrid": {
    openingId: 'birds-opening',
    sources: ['concept:pos-bishop-pair', 'concept:pos-space', BIRD],
    title: 'Nimzo-Larsen Hybrid — b3 and the Long Diagonal',
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'b3',
        moves: ['f4', 'd5', 'Nf3', 'Nf6', 'b3', 'g6', 'Bb2', 'Bg7'],
        highlights: [{ square: 'b2', color: KEY }, { square: 'e5', color: SOFT }],
        say: "Here White blends the Bird with Larsen's b3 system: the dark-squared bishop goes to b2, raking the long diagonal from a1 to h8 — straight at e5 and the heart of Black's position. Combined with the f4-pawn, White has a double grip on e5. Black fianchettoes too, and the two long-diagonal bishops stare each other down through the centre.",
        sayShort: 'Bb2 — the long diagonal meets f4.',
      },
      {
        id: 'queen-lift',
        moves: ['f4', 'd5', 'Nf3', 'Nf6', 'b3', 'g6', 'Bb2', 'Bg7', 'e3', 'O-O', 'Be2', 'c5', 'O-O', 'Nc6', 'Qe1'],
        highlights: [{ square: 'e1', color: KEY }, { square: 'h4', color: SOFT }],
        say: "The set-up is completed with e3, Be2 and castling — and then the familiar Bird idea returns: Qe1, preparing the queen lift to h4 and a kingside attack. Now White has it all: the b2-bishop on the long diagonal, the f4-grip on e5, and the queen swinging toward Black's king. Three ideas working together from one quiet structure.",
        sayShort: 'Qe1 — the queen lift returns.',
      },
      {
        id: 'space',
        moves: ['f4', 'd5', 'Nf3', 'Nf6', 'b3', 'g6', 'Bb2', 'Bg7', 'e3', 'O-O', 'Be2', 'c5', 'O-O', 'Nc6', 'Qe1', 'd4', 'Na3', 'Nd5', 'Bc4', 'Rb8'],
        highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: SOFT }],
        say: "Black grabs space with d4, but White keeps developing actively — Na3 heading for the centre, then Bc4 hitting the d5-knight and the a2-g8 diagonal. White's pieces are all working: two active bishops, a knight rerouting, and the queen poised for the kingside. The Nimzo-Larsen Bird gives White a sound, harmonious position with multiple plans and almost no theory to memorise.",
        sayShort: 'Bc4 — active pieces, eyeing d5.',
      },
    ],
  },

  "birds-opening::Bird's: Stonewall Formation": {
    openingId: 'birds-opening',
    sources: ['concept:pawn-chain', 'concept:pos-outpost', BIRD],
    title: 'Stonewall — the e5 Outpost and Kingside Attack',
    minutes: 8,
    orientation: 'white',
    beats: [
      {
        id: 'wall',
        moves: ['f4', 'd5', 'e3', 'Nf6', 'Nf3', 'e6', 'd4', 'c5', 'c3', 'Nc6', 'Bd3'],
        highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
        say: "The Stonewall Bird builds a wall of pawns on d4, e3 and f4 — rigid, but it grips e5 with iron and clamps the centre shut. The bishop comes to d3, pointing down the b1-h7 diagonal toward Black's king. White's structure tells him exactly what to do: occupy e5, attack the kingside.",
        sayShort: 'd4-e3-f4 — the wall grips e5.',
      },
      {
        id: 'outpost',
        moves: ['f4', 'd5', 'e3', 'Nf6', 'Nf3', 'e6', 'd4', 'c5', 'c3', 'Nc6', 'Bd3', 'Bd6', 'O-O', 'O-O', 'Ne5'],
        highlights: [{ square: 'e5', color: KEY }],
        say: "Both sides castle, and White plants the knight on the dream square: Ne5. From e5 it dominates — supported by the d4- and f4-pawns, it cannot be driven off by a pawn, and it sits right in front of Black's king. This is the Stonewall's whole purpose realised: the immovable e5-knight, the launch-pad for everything to come.",
        sayShort: 'Ne5 — the immovable outpost lands.',
      },
      {
        id: 'attack',
        moves: ['f4', 'd5', 'e3', 'Nf6', 'Nf3', 'e6', 'd4', 'c5', 'c3', 'Nc6', 'Bd3', 'Bd6', 'O-O', 'O-O', 'Ne5', 'Ne7', 'Nd2', 'b6', 'Rf3', 'h6'],
        highlights: [{ square: 'f3', color: KEY }, { square: 'h6', color: SOFT }],
        say: "Now the attack rolls. Nd2 supports the e5-knight and heads for f3 or the kingside; the rook lifts to f3, ready to swing to g3 or h3. Black's ...h6 to make luft only gives the attack a hook. This is the classic Stonewall assault: pieces pile toward the king behind the pawn wall, and the f-file is the highway. White attacks while Black defends — exactly the game the structure promised.",
        sayShort: 'Rf3 — the rook lifts for the attack.',
      },
    ],
  },

  "birds-opening::Bird's: Williams Variation": {
    openingId: 'birds-opening',
    sources: ['concept:pos-development', 'concept:pos-bishop-pair', BIRD],
    title: 'Williams — b3 with an Early …Bf5',
    minutes: 7,
    orientation: 'white',
    beats: [
      {
        id: 'setup',
        moves: ['f4', 'd5', 'Nf3', 'Nf6', 'b3', 'Bf5', 'Bb2', 'e6'],
        highlights: [{ square: 'b2', color: KEY }, { square: 'f5', color: SOFT }],
        say: "In the Williams, Black hurries his light bishop out to f5 before locking it in behind ...e6 — sensible development against a b3 Bird. White continues with the b2-bishop on the long diagonal and the f4-grip on e5. The position is quiet and manoeuvring; White's edge is small but real, built on the e5-square and the harmonious piece placement.",
        sayShort: 'Bb2 vs early …Bf5 — quiet manoeuvring.',
      },
      {
        id: 'challenge',
        moves: ['f4', 'd5', 'Nf3', 'Nf6', 'b3', 'Bf5', 'Bb2', 'e6', 'e3', 'Be7', 'Be2', 'O-O', 'O-O', 'Nbd7', 'Nh4'],
        highlights: [{ square: 'h4', color: KEY }, { square: 'f5', color: KEY }],
        say: "White finishes developing and then strikes at Black's best piece: Nh4, attacking the f5-bishop and offering to trade it off or win the bishop pair. Removing that bishop leaves Black a touch passive and hands White the two bishops. It is a small, typical Bird's manoeuvre — improve your worst prospects by trading Black's best.",
        sayShort: 'Nh4 — hit the f5-bishop.',
      },
      {
        id: 'edge',
        moves: ['f4', 'd5', 'Nf3', 'Nf6', 'b3', 'Bf5', 'Bb2', 'e6', 'e3', 'Be7', 'Be2', 'O-O', 'O-O', 'Nbd7', 'Nh4', 'Ne4', 'Nf3', 'Bg6', 'd3', 'Nd6'],
        highlights: [{ square: 'g6', color: KEY }, { square: 'e4', color: SOFT }],
        say: "Black sidesteps with ...Ne4 and retreats the bishop to g6; White returns the knight to f3 and plays d3, hitting the e4-knight and keeping a pleasant grip. White has the slightly freer game, the e5-square in hand, and the bishop pair as a long-term asset. The Williams shows the Bird's positional side: no fireworks, just a steady accumulation of small advantages.",
        sayShort: 'd3 — challenge e4, keep the edge.',
      },
    ],
  },
};

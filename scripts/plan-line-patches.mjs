// Authored, grounded rewrites for middlegame-plan playableLines that did not
// demonstrate their plan. Each patch is validated by apply-plan-line-patches.mjs
// (legality from the line's FEN, a student move landing on a declared
// break/maneuver goal square, no promise ending, lead-eye markers) and REJECTED
// if unsound — so nothing ungrounded ships. Narration: full = Watch (vivid,
// names squares/ideas), short = Learn cue (3-5 words). Authored 2026-05-25.
export const patches = [
  // ── Promise-enders: line already shows the theme; concrete narration, no promise ──
  {
    key: 'mp-italiangame-evans#0',
    moves: ['d5', 'Na5', 'Bb2', 'Ne7', 'Bd3', 'O-O', 'Nc3'],
    full: [
      'd5 slams the centre forward with tempo, kicking the c6-knight and seizing space for the gambit.',
      '…Na5 — the knight flees to the rim, hitting the c4-bishop but abandoning the kingside.',
      'Bb2 plants the dark-squared bishop on the long diagonal, x-raying through to g7.',
      '…Ne7 scrambles the other knight back to guard the kingside light squares.',
      'Bd3 reloads the bishop toward h7 — both bishops now trained on the black king.',
      '…O-O tucks the king away, but it castles straight into the crossfire of the two bishops.',
      'Nc3 brings up the last piece: a full pawn centre, two raking bishops, every piece aimed at the king — full value for the pawn.',
    ],
    short: ['d5 — centre forward', 'Na5 — knight to the rim', 'Bb2 — long diagonal', 'Ne7 — scramble back', 'Bd3 — aim at h7', 'O-O — into the crossfire', 'Nc3 — full attack'],
    yellow: [['c6'], ['c4'], ['g7'], [], ['h7'], [], []],
  },
  {
    key: 'mp-catalanopening-slav#0',
    moves: ['Na6', 'Na3', 'O-O', 'Rd1', 'Nb4', 'Qe2'],
    full: [
      '…Na6 eyes the c4-pawn, daring White to prove the gambit of a tempo.',
      'Na3 — the knight begins its journey to c4 to round up the extra pawn.',
      '…O-O tucks the king safely behind the fianchetto.',
      'Rd1 swings the rook behind the d-pawn, bracing the broad centre.',
      '…Nb4 lunges at c2 and d3, but leaves the c4-pawn undefended.',
      'Qe2 connects the rooks; the centre stands broad and the a3-knight scoops up c4 — a pawn and a mobile mass for White.',
    ],
    short: ['Na6 — eye c4', 'Na3 — heading to c4', 'O-O — king safe', 'Rd1 — brace the centre', 'Nb4 — hit c2/d3', 'Qe2 — pawn and centre'],
    yellow: [['c4'], ['c4'], [], [], ['c4'], ['c4']],
  },
  {
    key: 'mp-scandinaviandefence-modern#0',
    moves: ['Nc3', 'Nc6', 'd5', 'Ne5'],
    full: [
      'Nc3 develops and bolsters the broad e4-d4 centre.',
      '…Nc6 leans straight on d4, the front pawn of White’s big centre.',
      'd5 lunges forward, kicking the c6-knight and grabbing space.',
      '…Ne5 bounds to the central outpost, eyeing c4 and the kingside dark squares the fianchettoed bishop already rakes.',
    ],
    short: ['Nc3 — back the centre', 'Nc6 — lean on d4', 'd5 — kick and grab', 'Ne5 — central outpost'],
    yellow: [['d4'], ['d4'], ['c6'], ['c4']],
  },
  {
    key: 'mp-alekhinedefence-exchange#0',
    moves: ['Nc3', 'Bg4', 'b3', 'Bf6'],
    full: [
      'Nc3 defends the d4-c4 centre and eyes d5.',
      '…Bg4 pins the f3-knight, leaning on the d4-pawn behind it.',
      'b3 props up the c4-pawn and frees the c1-bishop.',
      '…Bf6 swings onto the long diagonal, doubling the pressure on d4 — Black is fully active and the centre is under siege.',
    ],
    short: ['Nc3 — guard the centre', 'Bg4 — pin f3', 'b3 — prop c4', 'Bf6 — siege d4'],
    yellow: [['d5'], ['d4'], ['c4'], ['d4']],
  },
  {
    key: 'mp-dutchdefence-classical#0',
    moves: ['Bd7', 'Nbd2', 'Be8', 'Ne5', 'Ne4'],
    full: [
      '…Bd7 unpins and begins the bishop’s reroute toward the kingside.',
      'Nbd2 develops behind the centre.',
      '…Be8 — the bishop heads for h5, swinging around the pawn chain to the attack.',
      'Ne5 plants a knight in the centre, contesting the key square.',
      '…Ne4 seizes the eternal outpost — the knight sits unevictable on e4, the springboard for every Stonewall kingside attack.',
    ],
    short: ['Bd7 — start the reroute', 'Nbd2 — develop', 'Be8 — head for h5', 'Ne5 — contest the centre', 'Ne4 — eternal outpost'],
    yellow: [[], [], ['h5'], [], ['e4']],
  },
  {
    key: 'mp-nimzoindian-main#0',
    moves: ['Bg5', 'Ba6', 'Qa4', 'h6'],
    full: [
      'Bg5 pins the f6-knight and leans on the weakened light squares.',
      '…Ba6 spears the c4-pawn down the a6-f1 diagonal, hitting White where the doubled pawns ache.',
      'Qa4 props up the loose c4-pawn.',
      '…h6 puts the question to the g5-bishop; either way Black owns the light squares around c4 and e4.',
    ],
    short: ['Bg5 — pin f6', 'Ba6 — spear c4', 'Qa4 — defend c4', 'h6 — own the light squares'],
    yellow: [['f6'], ['c4'], ['c4'], ['e4']],
  },
  {
    key: 'mp-nimzoindian-leningrad#0',
    moves: ['Qc2', 'Qe7', 'Nf3', 'Nbd7', 'Bd3', 'g5'],
    full: [
      'Qc2 eyes the c-file and the e4-square.',
      '…Qe7 connects the rooks and clears d8.',
      'Nf3 develops toward the centre.',
      '…Nbd7 finishes development — every black piece is home and the doubled c-pawns are blockaded.',
      'Bd3 eyes the kingside, but the position is bolted shut.',
      '…g5 — the storm breaks. The pawn lunges at the h4-bishop and rolls toward g4, prying open the kingside where every black trump lies.',
    ],
    short: ['Qc2 — eye e4', 'Qe7 — connect rooks', 'Nf3 — develop', 'Nbd7 — blockade set', 'Bd3 — locked out', 'g5 — the storm breaks'],
    yellow: [['e4'], ['d8'], [], [], [], ['h4', 'g4']],
  },

  // ── Theme-empty: author a sound student move onto a goal square ──
  {
    key: 'mp-siciliannajdorf-6g3#0',
    moves: ['Be3', 'b5', 'axb5', 'axb5'],
    full: [
      'Be3 develops, but Black already has the queenside in his sights.',
      '…b5 — the thematic Najdorf lever, striking at a4 and prying open the queenside where the b8-rook already waits.',
      'axb5 opens the a-file.',
      '…axb5 — the a-file is Black’s, the b8-rook rakes the half-open b-file, and the queenside initiative rolls at White’s king.',
    ],
    short: ['Be3 — develop', 'b5 — the lever', 'axb5 — open the a-file', 'axb5 — queenside rolls'],
    yellow: [[], ['a4'], [], []],
  },
  {
    key: 'mp-benkogambit-declined#0',
    moves: ['Re1', 'e6', 'dxe6', 'Bxe6'],
    full: [
      'Re1 backs the e4-pawn.',
      '…e6 challenges the d5-spearhead at its base.',
      'dxe6 opens the centre.',
      '…Bxe6 recaptures, and the light-squared bishop rakes the long diagonal while the half-open files fall to Black — risk-free Benko pressure, the gambit pawn long forgotten.',
    ],
    short: ['Re1 — back e4', 'e6 — hit the base', 'dxe6 — open it', 'Bxe6 — rake the diagonal'],
    yellow: [['e4'], ['d5'], [], []],
  },
  // NOTE: mp-nimzoindian-huebner#0 intentionally left flagged — in its critical
  // FEN, …e4 appears to win a piece (Bxe4 Nxe4), so the "positional wedge" line
  // is not verified-sound. Per the cardinal rule (when unsure, leave flagged,
  // never invent), it stays in the baseline pending a hand-verified line.
  {
    key: 'mp-nimzoindian-kasparov#0',
    moves: ['O-O', 'e5', 'Nf3', 'Bxc3'],
    full: [
      'O-O castles, but the d4-knight sits loose in the centre.',
      '…e5 strikes the centre, kicking the d4-knight and seizing space.',
      'Nf3 retreats the knight.',
      '…Bxc3 fractures White’s queenside, fixing the doubled c-pawns as permanent targets while Black keeps the bishop pair.',
    ],
    short: ['O-O — loose knight', 'e5 — strike the centre', 'Nf3 — retreat', 'Bxc3 — fracture the pawns'],
    yellow: [['d4'], ['d4'], [], []],
  },
  {
    key: 'mp-alekhinedefence-fourpawns#0',
    moves: ['Nf3', 'f6', 'exf6', 'gxf6'],
    full: [
      'Nf3 develops, defending the d4- and e5-pawns.',
      '…f6 detonates the e5-spearhead, the head of White’s proud pawn chain.',
      'exf6 — White’s centre starts to crumble.',
      '…gxf6 — the four-pawn centre is broken, the g-file opens for the rook, and Black’s pieces pour into the loosened position.',
    ],
    short: ['Nf3 — defend the centre', 'f6 — detonate e5', 'exf6 — crumbling', 'gxf6 — centre broken'],
    yellow: [['e5'], ['e5'], [], []],
  },
  {
    key: 'mp-frenchdefence-fortknox#0',
    moves: ['Bg5', 'O-O', 'Rad1', 'Re8'],
    full: [
      'Bg5 pins the f6-knight.',
      '…O-O brings the king to safety; the structure is flawless, with nothing for White to attack.',
      'Rad1 piles onto the d-file.',
      '…Re8 seizes the e-file, the one open line in this fortress — Black trades down it and holds the balance with ease.',
    ],
    short: ['Bg5 — pin f6', 'O-O — king safe', 'Rad1 — the d-file', 'Re8 — seize the e-file'],
    yellow: [['f6'], [], [], []],
  },
  {
    key: 'mp-scandinaviandefence-portuguese#0',
    moves: ['Be3', 'e5', 'dxe5', 'Nxe5'],
    full: [
      'Be3 develops and bolsters d4.',
      '…e5 strikes the d4-pawn, opening the position for the bishop pair and the active queen.',
      'dxe5 — the centre opens.',
      '…Nxe5 seizes the central outpost; with the bishop pair and a lead in development, the gambit pawn has bought a roaring initiative.',
    ],
    short: ['Be3 — bolster d4', 'e5 — strike d4', 'dxe5 — open it', 'Nxe5 — central outpost'],
    yellow: [['d4'], ['d4'], [], []],
  },
  {
    key: 'mp-retiopening-antislav#0',
    moves: ['d3', 'e6', 'Bf4'],
    full: [
      'd3 opens the c1-bishop’s diagonal and stakes a modest centre.',
      '…e6 shores up the d5-pawn but locks in the c8-bishop.',
      'Bf4 rakes toward c7 and the soft dark squares left by Black’s doubled b-pawns — the targets of the whole Anti-Slav plan.',
    ],
    short: ['d3 — free the bishop', 'e6 — shore up d5', 'Bf4 — rake to c7'],
    yellow: [[], ['d5'], ['c7']],
  },
];

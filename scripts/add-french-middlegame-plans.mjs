import { readFileSync, writeFileSync } from 'node:fs';

const PATH = 'src/data/middlegame-plans.json';

// Black-oriented French middlegame plans, one per variation tab. Lines are the
// masters top-continuation from each variation's tabiya (grounded, verified).
// Annotations name the key squares so add-leadeye-to-plans.mjs paints the
// lead-the-eye markers (orange move squares + yellow named squares + green
// vision arrows). arrows/highlights left empty here — the generator fills them.
const PLANS = [
  {
    id: 'mp-frenchdefence-advance',
    openingId: 'french-defence',
    criticalPositionFen: 'r3kb1r/pp1b1pp1/1q2p2p/n2pPn2/2pP2P1/P1P2N2/1PQNBP1P/1RB2RK1 b kq - 0 12',
    title: 'Advance: The Queenside Clamp',
    overview: "Black has locked the queenside with …c4 and parked a knight on the great f5-square. With the centre fixed, the plan plays itself: keep the clamp, route the king to safety away from White's kingside pawns, and lean on the b3-outpost. Black is never worse here — the space and the structure are permanent.",
    pawnBreaks: ['…b5–b4 to open the queenside behind the clamp', "White's g4/f4 against the f5-knight"],
    pieceManeuvers: ['…Na5–b3 outpost', '…Nf5/Ne7 rerouting around the kingside pawns', '…O-O-O into the safe queenside'],
    strategicThemes: ['The fixed chain dictates the wings', 'Permanent queenside space', 'The unkickable f5-knight'],
    endgameTransitions: ['The queenside space edge carries into any ending'],
    playableLines: [{
      fen: 'r3kb1r/pp1b1pp1/1q2p2p/n2pPn2/2pP2P1/P1P2N2/1PQNBP1P/1RB2RK1 b kq - 0 12',
      moves: ['Ne7', 'Nh4', 'O-O-O', 'Bd1'],
      annotations: [
        'Black tucks the knight back to e7, sidestepping the g4-pawn while keeping an eye on f5 and d5 — the clamp on c4 is permanent, so there is no rush.',
        "White's knight hops to h4, eyeing f5 and g6 to trade off Black's active light-squared pieces and ease the cramp.",
        'Black castles queenside — the king is perfectly safe behind the c4-clamp, far from any kingside pawn storm.',
        'White reroutes the bishop; the picture is set — Black owns the queenside space and the b3-outpost, the durable Advance edge.',
      ],
      title: 'The Queenside Clamp',
    }],
  },
  {
    id: 'mp-frenchdefence-winawer',
    openingId: 'french-defence',
    criticalPositionFen: 'r3k1r1/ppqbnp2/4p3/4P3/3Q1P2/P1p5/2P3PP/R1B1KB1R w KQq - 1 15',
    title: 'Winawer: The c3-Passer and the Open File',
    overview: "Out of the Poisoned-Pawn chaos, the dust settles in Black's favour: the passed pawn on c3 is a thorn one step from White's king, the g-file is open for the rook, and the knight is heading to the dominant f5-square. Black's pieces all point at the white king while the c3-pawn ties White down.",
    pawnBreaks: ['The passed …c3-pawn cramps and ties down White', '…f6 to open lines if needed'],
    pieceManeuvers: ['…Ne7–f5 to the dominant square', '…Qc6 centralising on the long diagonal', '…O-O-O onto the open files'],
    strategicThemes: ['Initiative over material', 'The passed c3-pawn', 'Open g-file pressure'],
    endgameTransitions: ['If queens come off, the c3-passer decides'],
    playableLines: [{
      fen: 'r3k1r1/ppqbnp2/4p3/4P3/3Q1P2/P1p5/2P3PP/R1B1KB1R w KQq - 1 15',
      moves: ['Rg1', 'Nf5', 'Qf2', 'Qc6'],
      annotations: [
        'White contests the open g-file with Rg1, trying to blunt the rook on g8.',
        'Black plants the knight on f5 — the dream square, hitting d4 and the dark squares around White, impossible to chase with a pawn.',
        'White untangles with Qf2, eyeing the f-file and the kingside.',
        'Black centralises with …Qc6, raking the long light diagonal toward g2 and supporting the passed c3-pawn — every piece now points at White.',
      ],
      title: 'The c3-Passer Attack',
    }],
  },
  {
    id: 'mp-frenchdefence-classical',
    openingId: 'french-defence',
    criticalPositionFen: 'r1b2rk1/pp1n2pp/2n1pq2/2pp4/3P1P2/2N2N2/PPPQ2PP/2KR1B1R w - - 0 12',
    title: 'Classical: The Opposite-Wing Race',
    overview: "Kings on opposite wings means a pure attacking race. White's king sits on c1, so Black throws the queenside pawns and pieces at it: open the centre with …cxd4, swing the knight to b6 and c4, and roll …b5–b4. Speed beats material here — Black does not defend, Black attacks first.",
    pawnBreaks: ['…cxd4 to open the centre', '…b5–b4 the queenside storm at the c1-king'],
    pieceManeuvers: ['…Nb6–c4 into the white camp', '…Rc8 and …a5–b5 down the c- and b-files', '…Qf6 hitting d4'],
    strategicThemes: ['Opposite-side attacks', 'Speed over material', 'The half-open c-file at the c1-king'],
    endgameTransitions: ['Rare — the attacks decide before an ending'],
    playableLines: [{
      fen: 'r1b2rk1/pp1n2pp/2n1pq2/2pp4/3P1P2/2N2N2/PPPQ2PP/2KR1B1R w - - 0 12',
      moves: ['g3', 'cxd4', 'Nxd4', 'Nb6'],
      annotations: [
        "White plays g3 to shelter the king and free the f1-bishop.",
        'Black opens the centre with …cxd4, prising lines toward the white king on c1.',
        'White recaptures on d4; the centre is open and the race is on.',
        'Black swings the knight to b6, heading for c4 and the queenside attack — the storm rolls toward c1 while White is still organising.',
      ],
      title: 'The Queenside Storm',
    }],
  },
  {
    id: 'mp-frenchdefence-tarrasch',
    openingId: 'french-defence',
    criticalPositionFen: 'r1b1k2r/ppq3pp/2nbpn2/3p4/3P4/3B1N2/PP2NPPP/R1BQ1RK1 w kq - 4 12',
    title: 'Tarrasch: Siege of the Isolated Pawn',
    overview: "The exchanges have left White with an isolated d4-pawn — the strategic heart of the Tarrasch. Black's plan is textbook: blockade the d5-square, line up against d4, and aim the …Bd6/…Qc7 battery at h2. The isolated pawn is a long-term target Black can press for the whole game.",
    pawnBreaks: ['Black restrains White\'s d4–d5 break and blockades d5', '…e5 only once d4 is safely won'],
    pieceManeuvers: ['…Nf6 and …Bd7 blockading d5', '…Bd6 + …Qc7 battery on h2', '…Nh5 eyeing f4'],
    strategicThemes: ['Play against the isolated d4-pawn', 'Blockade the d5-square', 'The h2 battery'],
    endgameTransitions: ['Trade pieces — the weak d4-pawn falls in the ending'],
    playableLines: [{
      fen: 'r1b1k2r/ppq3pp/2nbpn2/3p4/3P4/3B1N2/PP2NPPP/R1BQ1RK1 w kq - 4 12',
      moves: ['Bg5', 'O-O', 'Bh4', 'Nh5'],
      annotations: [
        'White pins the f6-knight with Bg5, leaning on the blockade of d5.',
        'Black castles into safety, ready to pile on the isolated d4-pawn.',
        'White keeps the pin with Bh4.',
        'Black breaks free with …Nh5, eyeing the f4-square and unmasking the …Bd6/…Qc7 battery on h2 — the d4-pawn stays a permanent target.',
      ],
      title: 'Siege of the d4-Pawn',
    }],
  },
  {
    id: 'mp-frenchdefence-exchange',
    openingId: 'french-defence',
    criticalPositionFen: 'r2qr1k1/pp1n1pp1/2pb1n1p/3p4/3P2bB/2PB1N2/PPQN1PPP/R4RK1 w - - 0 12',
    title: 'Exchange: Seize the Only Open File',
    overview: "The symmetrical Exchange offers one trump: the open e-file. Black's whole plan is to grab it first with …Re8, trade off the heavy pieces down it, and nurse a tiny initiative. There are no weaknesses — so respect the balance, take the small edge, and never overpress.",
    pawnBreaks: ['…c5 only if it creates a target, else keep the structure sound', 'Avoid loosening pawn moves in a symmetric position'],
    pieceManeuvers: ['…Re8 grabbing the e-file', '…Bd6 + …Qc7 toward h2', '…Bg4 pinning the f3-knight'],
    strategicThemes: ['The open e-file is the only imbalance', 'Symmetry — patience over force', 'First to the file holds the edge'],
    endgameTransitions: ['Often drawish, but the e-file can yield a small endgame pull'],
    playableLines: [{
      fen: 'r2qr1k1/pp1n1pp1/2pb1n1p/3p4/3P2bB/2PB1N2/PPQN1PPP/R4RK1 w - - 0 12',
      moves: ['Rfe1', 'Qc7', 'Bg3', 'Bxg3'],
      annotations: [
        'White contests the open e-file with Rfe1 — whoever owns it owns the only imbalance.',
        'Black redeploys …Qc7, lining the queen up behind the d6-bishop toward h2.',
        'White offers a trade of dark-squared bishops with Bg3.',
        'Black takes on g3 — trading into a clean, level structure where the e-file and a flexible position give Black the more comfortable side.',
      ],
      title: 'The e-File Edge',
    }],
  },
  {
    id: 'mp-frenchdefence-burn',
    openingId: 'french-defence',
    criticalPositionFen: 'r2q1rk1/pbpnbppp/1p2p3/8/3PN3/3B1N2/PPPQ1PPP/1K1R3R w - - 2 12',
    title: 'Burn: The Bishop Pair Unleashed',
    overview: "Black has the two bishops and a flawless structure; White has castled queenside and will storm the kingside. The plan: complete the fianchetto on b7, redeploy the knight, and break with …c5 to rip open lines for the bishop pair against White's king on b1. The bishops do the talking.",
    pawnBreaks: ['…c5 to open lines for the bishops at the b1-king', '…b5–b4 the queenside lever'],
    pieceManeuvers: ['…Bb7 on the long diagonal', '…Nf6 hitting the e4-knight', '…Qb8/…Rc8 down the c-file'],
    strategicThemes: ['The bishop pair', 'Opposite-side attacks', 'No weaknesses, only targets'],
    endgameTransitions: ['The two bishops shine in an open ending'],
    playableLines: [{
      fen: 'r2q1rk1/pbpnbppp/1p2p3/8/3PN3/3B1N2/PPPQ1PPP/1K1R3R w - - 2 12',
      moves: ['Qf4', 'Nf6', 'c4', 'Qb8'],
      annotations: [
        'White centralises the queen on f4, preparing the kingside advance.',
        'Black challenges the centre with …Nf6, hitting the e4-knight and gaining time.',
        'White grabs space with c4 to blunt the b7-bishop.',
        'Black regroups …Qb8, clearing d8 for a rook and eyeing the b-file — the bishop pair and the …c5 break give Black a rich, target-rich middlegame.',
      ],
      title: 'The Two Bishops',
    }],
  },
  {
    id: 'mp-frenchdefence-fortknox',
    openingId: 'french-defence',
    criticalPositionFen: 'r2qk2r/pp2bppp/2p1pn2/8/3P4/2PB1Q2/PP3PPP/R1B1R1K1 w kq - 0 12',
    title: 'Fort Knox: The Impregnable Setup',
    overview: "The bad bishop is gone — traded on f3 — and Black is left with a symmetrical, weakness-free fortress. There is nothing for White to attack. The plan is patient: complete development, castle, contest the e-file, and prepare a freeing …c5 or …e5 break at leisure. Offer White nothing.",
    pawnBreaks: ['…c5 or …e5 freeing break, once fully developed', 'Keep the structure flawless'],
    pieceManeuvers: ['…O-O and …Re8 to the e-file', '…Qc7 and …Rad8 centralising', '…Nd7–f6 covering e4 and d5'],
    strategicThemes: ['A fortress with no weaknesses', 'Patient development', 'Trade into safe equality'],
    endgameTransitions: ['Comfortable, balanced endings — Black is rock-solid'],
    playableLines: [{
      fen: 'r2qk2r/pp2bppp/2p1pn2/8/3P4/2PB1Q2/PP3PPP/R1B1R1K1 w kq - 0 12',
      moves: ['a4', 'a5', 'g3', 'O-O'],
      annotations: [
        'White probes the queenside with a4, gaining a little space.',
        'Black answers …a5, fixing the queenside and denying White the b5-square.',
        'White fianchettoes ideas with g3.',
        'Black castles — the fortress is complete: no weaknesses, the e-file ready to contest, and a …c5 or …e5 break in hand whenever Black chooses.',
      ],
      title: 'The Fortress',
    }],
  },
  {
    id: 'mp-frenchdefence-milnerbarry',
    openingId: 'french-defence',
    criticalPositionFen: 'r3kb1r/1p1b1ppp/p3p3/3pP3/3q1P2/2Nn4/PP2Q1PP/R1BR3K w kq - 0 15',
    title: 'Milner-Barry: Convert the Extra Pawn',
    overview: "Black accepted the gambit and defended accurately with …Bd7 and …a6, defusing the Nb5 and Bb5+ tricks. Now Black is simply a clean pawn up. The plan is the conversion: trade off White's attacking pieces — especially the d3-bishop — neutralise the initiative, and steer into a winning endgame.",
    pawnBreaks: ['Keep the centre closed while consolidating', '…f6 only when fully safe'],
    pieceManeuvers: ['…Nb4xd3 trading the attacking bishop', '…Bc5 trading the dark-squared bishops', '…O-O-O or …Ne7–c6 to safety'],
    strategicThemes: ['Up a clean pawn', 'Trade the attackers, kill the initiative', 'Technique converts the material'],
    endgameTransitions: ['The extra pawn wins the endgame once the queens come off'],
    playableLines: [{
      fen: 'r3kb1r/1p1b1ppp/p3p3/3pP3/3q1P2/2Nn4/PP2Q1PP/R1BR3K w kq - 0 15',
      moves: ['Rxd3', 'Qb6', 'Be3', 'Bc5'],
      annotations: [
        'White recaptures the knight on d3, but the dangerous light-squared bishop — the engine of the attack — is gone.',
        'Black retreats the queen to b6, safe and eyeing b2, holding firmly onto the extra pawn.',
        'White develops Be3 with a hit on the queen.',
        'Black offers the trade with …Bc5 — swapping the dark-squared bishops kills the last attacking piece and leaves Black a clean pawn up into the endgame.',
      ],
      title: 'Converting the Gambit Pawn',
    }],
  },
  {
    id: 'mp-frenchdefence-mccutcheon',
    openingId: 'french-defence',
    criticalPositionFen: 'rn1qk2r/pp1b1p2/4p1pp/2ppP3/3P2Q1/2PB1N2/P1PK1PPP/R6R w kq - 2 12',
    title: 'McCutcheon: Exploit the Wrecked Structure',
    overview: "Black has bartered the dark-squared bishop to cripple White's queenside — doubled c-pawns — and to drag the white king out to d2, where it cannot castle. The plan is to convert those long-term gains: strike d4 with …c5, activate the light-squared bishop via …Bc6, and keep the badly-placed white king under pressure.",
    pawnBreaks: ['…c5 hitting d4 while the king is stuck', '…f6 to open lines at the centralised king'],
    pieceManeuvers: ['…Bc6 activating the light bishop', '…Qe7 and …Nd7 developing', '…O-O-O onto the open files'],
    strategicThemes: ["White's doubled c-pawns", "The white king stuck on d2", 'Better structure, safer king'],
    endgameTransitions: ['The doubled, weak c-pawns tell in the endgame'],
    playableLines: [{
      fen: 'rn1qk2r/pp1b1p2/4p1pp/2ppP3/3P2Q1/2PB1N2/P1PK1PPP/R6R w kq - 2 12',
      moves: ['h4', 'Qe7', 'Qf4', 'Bc6'],
      annotations: [
        'White lashes out with h4, hunting kingside play to distract from the structural damage.',
        'Black calmly develops …Qe7, connecting and preparing to castle long onto the open files.',
        'White centralises the queen on f4.',
        'Black activates the once-bad bishop with …Bc6, raking the long diagonal — the wrecked white c-pawns and the king stranded near d2 are the lasting targets.',
      ],
      title: 'Punishing the Structure',
    }],
  },
  {
    id: 'mp-frenchdefence-rubinstein',
    openingId: 'french-defence',
    criticalPositionFen: 'r2q1rk1/pb3ppp/1p2pn2/2b3B1/8/3B1N2/PPP1QPPP/R4RK1 w - - 2 12',
    title: 'Rubinstein: Sound, Solid, and Symmetric',
    overview: "Black gave up the centre but reached a position with no weaknesses, both bishops active and the long-diagonal bishop finally on b7. The plan is calm and clear: contest the open files with …Rfd8 and …Rac8, keep the structure flawless, and look for the …c5 or …e5 break to free the position. Black is never worse than a shade.",
    pawnBreaks: ['…c5 to challenge the centre', '…e5 freeing break when prepared'],
    pieceManeuvers: ['…Bb7 on the long diagonal', '…Rfd8 and …Rac8 to the centre files', '…Qc7 centralising'],
    strategicThemes: ['No weaknesses', 'Both bishops active', 'Solid equality with easy play'],
    endgameTransitions: ['Comfortable, balanced endings — the sound structure holds'],
    playableLines: [{
      fen: 'r2q1rk1/pb3ppp/1p2pn2/2b3B1/8/3B1N2/PPP1QPPP/R4RK1 w - - 2 12',
      moves: ['Rad1', 'Qc7', 'Bxf6', 'gxf6'],
      annotations: [
        'White centralises a rook on d1, eyeing the d-file.',
        'Black redeploys …Qc7, connecting the rooks and eyeing the half-open c-file.',
        'White trades on f6 to damage Black\'s kingside pawns.',
        'Black recaptures …gxf6 — the doubled f-pawns control the centre, the half-open g-file opens for the rook, and the b7-bishop and the sound structure keep Black fully comfortable.',
      ],
      title: 'Sound Equality',
    }],
  },
];

const data = JSON.parse(readFileSync(PATH, 'utf-8'));
const existing = new Set(data.map((p) => p.id));
let added = 0;
for (const p of PLANS) {
  if (existing.has(p.id)) { console.log('skip (exists):', p.id); continue; }
  // empty per-move marker arrays — the lead-the-eye generator fills them
  for (const line of p.playableLines) {
    line.arrows = line.moves.map(() => []);
    line.highlights = line.moves.map(() => []);
  }
  data.push(p);
  added++;
}
writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log('added', added, 'french plans; total now', data.length);

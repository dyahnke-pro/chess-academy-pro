import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';

// Caro-Kann (Black) middlegame plans — one per masterclass tab + main.
// Each plan's critical position is reached by replaying its variation
// lesson's DB-anchored spine (setup), then a short thematic continuation
// demonstrates the plan. chess.js validates legality here; lead-the-eye
// arrows/highlights are generated afterward by add-leadeye-to-plans.mjs.

const PLANS = [
  {
    id: 'mp-carokann-main',
    title: 'Caro Classical: The …c5 Counter-Race',
    overview:
      "Black has traded the problem light-bishop and built the c6-d5-e6 wall with no weak pieces. White castles long for a kingside storm; Black's answer is the …c5 break, prising open the c-file and the b-file at White's king while the rock-solid structure shrugs off the attack the other way.",
    pawnBreaks: ['…c5 to open lines at White’s king', '…b5-b4 to follow up on the queenside'],
    pieceManeuvers: ['…Nc5 hitting the d3-queen with tempo', '…Rc8/…Qa5 on the queenside', '…Nb6-c4 to the outpost'],
    strategicThemes: ['Opposite-side castling race', 'Open the c-file at the king', 'A structure with no weaknesses'],
    endgameTransitions: ['Black’s sound pawns outlast the spent attack'],
    setup: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7 Kb1 O-O',
    cont: ['Rhe1', 'c5', 'dxc5', 'Nxc5'],
    ann: [
      'Rhe1 swings the rook to the centre.',
      '…c5 is the thematic break, striking d4 and opening the c-file toward White’s king.',
      'dxc5 accepts.',
      '…Nxc5 recaptures and hits the queen on d3 with tempo — Black is first in the race.',
    ],
  },
  {
    id: 'mp-carokann-advance',
    title: 'Caro Advance: Pressure the e5-Chain',
    overview:
      "Black has undermined White's chain with …c5, freed the light bishop to e4, and stands well coordinated. The plan: train the dark bishop on the e5-pawn, pile the queen behind it, and use the half-open c-file — Black presses the over-extended chain rather than defending.",
    pawnBreaks: ['…f6 to challenge the e5-pawn later', 'keep the c-file half-open'],
    pieceManeuvers: ['…Bd6 hitting e5', '…Qe7 behind the break', '…Rc8 on the c-file'],
    strategicThemes: ['Besiege the e5-spearhead', 'Dominate the e4-square', 'Half-open c-file pressure'],
    endgameTransitions: ['The free pieces and better bishop tell in simplification'],
    setup: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 cxd4 Nxd4 Ne7 Nd2 Nbc6 N2f3 Be4 O-O Ng6',
    cont: ['c3', 'Bd6', 'Bf4', 'Qe7'],
    ann: [
      'c3 shores up the queenside.',
      '…Bd6 trains the dark bishop on the e5-pawn — the head of White’s chain.',
      'Bf4 defends e5.',
      '…Qe7 lines the queen up behind the pressure on e5; Black has the easier game.',
    ],
  },
  {
    id: 'mp-carokann-exchange',
    title: 'Caro Exchange: Own the c-File',
    overview:
      "After the Exchange, Black has a sound symmetrical centre, the bishop pair traded down, and the open c-file. The plan is simple and strong: contest and own the c-file, trade White's only active piece, and let the weakness-free structure do the rest.",
    pawnBreaks: ['…e5 once prepared', 'the c-file is the main road'],
    pieceManeuvers: ['…Rfc8 onto the open file', '…Qc7 leading the file', 'trade off White’s active knight'],
    strategicThemes: ['Own the open c-file', 'A structure with no targets', 'Trade into a better ending'],
    endgameTransitions: ['c-file control converts in the rook ending'],
    setup: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bd6 Bxd6 Qxd6 O-O O-O Rfe1 Qc7',
    cont: ['Ne5', 'Nxe5', 'Rxe5', 'Rfc8'],
    ann: [
      'Ne5 jumps to the central square.',
      '…Nxe5 trades the active knight off.',
      'Rxe5 recaptures.',
      '…Rfc8 seizes the open c-file behind the queen on c7 — Black controls the only open road.',
    ],
  },
  {
    id: 'mp-carokann-two-knights',
    title: 'Caro Two Knights: Strike with …c5',
    overview:
      "Pieces have come off and Black sits behind a granite e6-wall with no weaknesses. The plan: complete the fianchetto-free setup and break with …c5, challenging White's centre and freeing every piece for full, easy equality.",
    pawnBreaks: ['…c5 to challenge d4', '…cxd4 to open the position'],
    pieceManeuvers: ['…c5 the freeing break', '…Nbd7-b6 to c4', '…Rc8 on the c-file'],
    strategicThemes: ['Free the position with …c5', 'No structural weaknesses', 'Easy piece play'],
    endgameTransitions: ['The sound structure equalises smoothly'],
    setup: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 Be2 Nf6 O-O Nbd7 d4 dxe4 Nxe4 Nxe4 Qxe4 Nf6 Qd3 Be7 c4 O-O',
    cont: ['b3', 'c5', 'Bb2', 'cxd4'],
    ann: [
      'b3 prepares the long-diagonal bishop.',
      '…c5 strikes at d4 — the freeing break the Two Knights invites.',
      'Bb2 develops.',
      '…cxd4 opens the centre on Black’s terms, activating the pieces for full equality.',
    ],
  },
  {
    id: 'mp-carokann-panov',
    title: 'Caro Panov: Blockade the Isolani',
    overview:
      "Against the Panov's isolated d-pawn, Black has blockaded d5 with the knight and pointed the bishop at d4. The plan: pile up on the isolated pawn, trade White's attacking pieces, and prove the isolani a long-term weakness rather than a source of activity.",
    pawnBreaks: ['restrain the d4-d5 push', 'fix d4 as the target'],
    pieceManeuvers: ['blockade d5', '…Bf6 and …Rc8 pressing d4', '…Bd7-c6 reinforcing the blockade'],
    strategicThemes: ['Blockade the isolani on d5', 'Besiege the fixed d4-pawn', 'Trade off White’s activity'],
    endgameTransitions: ['The isolated pawn falls in the ending'],
    setup: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 cxd5 Nxd5 Bd2 Nc6 Bd3 O-O O-O Be7 a3 Bf6 Qc2 g6',
    cont: ['h3', 'Bd7', 'Rfe1', 'Rc8'],
    ann: [
      'h3 makes luft.',
      '…Bd7 develops, eyeing c6 to reinforce the d5-blockade.',
      'Rfe1 centralises.',
      '…Rc8 takes the c-file; with the d5-blockade and pressure on d4, Black is the one playing for the win.',
    ],
  },
  {
    id: 'mp-carokann-fantasy',
    title: 'Caro Fantasy: Open the Centre',
    overview:
      "Black's early …e5 has handed back a free, classical game with the better coordination. The plan: complete development, keep the pin on f3 alive, and open the centre with …exd4 at the right moment so the active pieces and rooks crash down the e-file.",
    pawnBreaks: ['…exd4 to open the centre', '…f6 only if needed to bolster e5'],
    pieceManeuvers: ['…Rae8 down the e-file', '…Bh5 keeping the f3-pin', '…Bd6 aiming at the kingside'],
    strategicThemes: ['Open the centre while better developed', 'Pin and pressure f3', 'Active classical piece play'],
    endgameTransitions: ['The freer position favours Black if it simplifies'],
    setup: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 O-O Ngf6 c3 Bd6 Bg5 O-O Nbd2 Qc7 Qe1 Bh5',
    cont: ['Kh1', 'exd4', 'cxd4', 'Rae8'],
    ann: [
      'Kh1 steps off the diagonal.',
      '…exd4 opens the centre while Black is the better-developed side.',
      'cxd4 recaptures.',
      '…Rae8 swings the rook to the e-file, bearing down on e4 — Black’s pieces spring to life.',
    ],
  },
  {
    id: 'mp-carokann-tartakower',
    title: 'Caro Tartakower: The Doubled-Pawn Clamp',
    overview:
      "Black paid with doubled f-pawns for the bishop pair, the open e-file, and a structure White cannot attack. The plan: clamp White's king with …h4-h3, reroute the knight to the kingside, and use the bishop pair and the e-file to seize the initiative.",
    pawnBreaks: ['…f5 to roll the kingside majority later', 'the doubled f-pawns clamp e5 and g5'],
    pieceManeuvers: ['…Nf8-g6 to the kingside', '…Be6 developing the bishop pair', '…Re8 on the open file'],
    strategicThemes: ['Clamp the king with …h4-h3', 'The bishop pair and open e-file', 'Doubled pawns as central clamps'],
    endgameTransitions: ['The two bishops shine as the position opens'],
    setup: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 Bd3 O-O Qc2 Re8+ Ne2 h5 O-O h4 h3 Nd7 Bd2 Nf8',
    cont: ['Rae1', 'Ng6', 'Ng3', 'Be6'],
    ann: [
      'Rae1 contests the open e-file.',
      '…Ng6 reroutes the knight to the kingside, eyeing f4 and h4.',
      'Ng3 covers f5.',
      '…Be6 develops the second bishop; with the bishop pair and the cramping h3-pawn, Black holds the initiative.',
    ],
  },
];

const data = JSON.parse(readFileSync(PATH, 'utf-8'));
const existing = new Set(data.map((p) => p.id));
let added = 0;
let failed = 0;

for (const p of PLANS) {
  // Build the critical position by replaying the setup spine.
  const c = new Chess();
  for (const san of p.setup.trim().split(/\s+/)) {
    const mv = c.move(san);
    if (!mv) { console.error(`SETUP ILLEGAL in ${p.id}: ${san}`); failed++; break; }
  }
  const critFen = c.fen();
  // Validate the continuation is legal from the critical position.
  const probe = new Chess(critFen);
  let ok = true;
  for (const san of p.cont) {
    const mv = probe.move(san);
    if (!mv) { console.error(`CONT ILLEGAL in ${p.id}: ${san} (fen ${probe.fen()})`); ok = false; failed++; break; }
  }
  if (!ok) continue;
  if (p.cont.length !== p.ann.length) { console.error(`ANN LENGTH mismatch in ${p.id}`); failed++; continue; }
  if (existing.has(p.id)) { console.log(`skip existing ${p.id}`); continue; }

  data.push({
    id: p.id,
    openingId: 'caro-kann',
    criticalPositionFen: critFen,
    title: p.title,
    overview: p.overview,
    pawnBreaks: p.pawnBreaks,
    pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes,
    endgameTransitions: p.endgameTransitions,
    playableLines: [
      {
        fen: critFen,
        moves: p.cont,
        annotations: p.ann,
        title: p.title,
        arrows: p.cont.map(() => []),
        highlights: p.cont.map(() => []),
      },
    ],
  });
  added++;
}

if (failed > 0) {
  console.error(`\n${failed} plan(s) failed validation — NOT writing.`);
  process.exit(1);
}
writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`added ${added} caro-kann plans; total ${data.length}`);

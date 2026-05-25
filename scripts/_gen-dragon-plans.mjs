// Build the 7 Sicilian Dragon middlegame plans (one per tab) from legal,
// real-theory lines. BLACK-oriented — every plan teaches the STUDENT's
// (Black's) counterplay. Annotations name key squares so
// add-leadeye-to-plans.mjs can ground vision arrows + highlights. Merges into
// middlegame-plans.json (keeps other openings' plans). Move-count-free prose.
import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'node:fs';

function build(prefix, lineMoves) {
  const c = new Chess();
  for (const m of prefix.split(' ')) { const b = c.fen(); c.move(m); if (c.fen() === b) throw new Error('illegal prefix ' + m); }
  const fen = c.fen();
  const sans = [];
  for (const m of lineMoves) { const b = c.fen(); const r = c.move(m); if (!r || c.fen() === b) throw new Error('illegal line move ' + m + ' from ' + c.fen()); sans.push(r.san); }
  return { fen, moves: sans };
}

const PLANS = [
  {
    id: 'mp-siciliandragon-main',
    title: "Yugoslav: Black's c-File Attack",
    overview: "The Dragon's core plan: Black piles down the half-open c-file, swings the knight into the c4 outpost, and trades into a raging attack on White's queenside king. Speed is everything — Black aims to crash through before White's h-pawn arrives.",
    pawnBreaks: [{ move: 'b5-b4', explanation: 'Black often follows with b5 and b4 to pry the c3-knight away and open more lines at the king.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Nc6-e5-c4', explanation: 'The knight reroutes to the c4 outpost, where it pressures b2, e3 and the king.' }],
    strategicThemes: [
      'The half-open c-file is the highway to White\'s king.',
      'The knight on c4 is the Dragon\'s spearhead.',
      'Trade pieces toward the king — speed beats material.',
    ],
    endgameTransitions: ['The attack usually decides; if it simplifies, Black\'s active rook holds the edge.'],
    prefix: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O',
    line: ['Rc8', 'Bb3', 'Ne5', 'h4', 'Nc4', 'Bxc4', 'Rxc4'],
    annotations: [
      'Rc8 — the rook seizes the half-open c-file, aimed at the king.',
      'Bb3 — White tucks the bishop off the c-file.',
      'Ne5 — the knight heads for the c4 outpost.',
      'h4 — White begins the kingside storm.',
      'Nc4 — the knight leaps in, hitting the queen on d2 and b2.',
      'Bxc4 — White trades off the powerful knight.',
      'Rxc4 — the rook recaptures, pressure pouring down the c-file.',
    ],
  },
  {
    id: 'mp-siciliandragon-soltis',
    title: 'Soltis: Freeze the Storm, then Strike',
    overview: "The Soltis plan: meet White's h4 with h5, nailing the kingside shut, then turn the full force of the c-file and the c4-knight against White's king with no counterplay coming the other way.",
    pawnBreaks: [{ move: 'h5', explanation: 'h5 freezes White\'s h-pawn and kills the entire kingside storm before it begins.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Ne5-c4', explanation: 'Once the kingside is locked, the knight jumps to c4 to spearhead the attack.' }],
    strategicThemes: [
      'h5 neutralises White\'s whole reason for castling long.',
      'With the storm frozen, Black attacks for free.',
      'The c-file and the c4-knight do the work.',
    ],
    endgameTransitions: ['A frozen kingside leaves Black pressing risk-free on the queenside.'],
    prefix: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3 Ne5',
    line: ['h4', 'h5', 'Kb1', 'Nc4', 'Bxc4', 'Rxc4'],
    annotations: [
      'h4 — White lunges, intending h5 to crack the king open.',
      'h5 — Black slams the door; the storm is frozen.',
      'Kb1 — White tucks the king and waits.',
      'Nc4 — Black switches the attack to the queenside.',
      'Bxc4 — White trades the strong knight.',
      'Rxc4 — the rook pours down the open c-file.',
    ],
  },
  {
    id: 'mp-siciliandragon-chinese',
    title: 'Chinese Dragon: the b-File Avalanche',
    overview: "The Chinese Dragon plan: with the rook already on b8, Black charges the b-pawn — b5 then b4 — to blast open the b-file straight at White's king, often a full tempo faster than White's kingside play.",
    pawnBreaks: [{ move: 'b4', explanation: 'b4 hits the c3-knight and rips the b-file open in front of White\'s king.' }],
    pieceManeuvers: [{ piece: 'Rook', route: 'Rb8 behind the b-pawn', explanation: 'The rook waits on b8 so every pawn push comes with heavy support.' }],
    strategicThemes: [
      'The b-pawn storm arrives with the rook already behind it.',
      'b4 tears open the file at the king.',
      'Raw speed — attack first, ask questions never.',
    ],
    endgameTransitions: ['The open b-file gives Black a lasting initiative even if pieces come off.'],
    prefix: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rb8 Bb3',
    line: ['b5', 'h4', 'b4', 'Nd5', 'Nxd5', 'Bxd5'],
    annotations: [
      'b5 — the b-pawn charges, the rook waiting behind it.',
      'h4 — White races on the other wing.',
      'b4 — the pawn hits the c3-knight, tearing open the b-file.',
      'Nd5 — White jumps the knight in rather than retreat.',
      'Nxd5 — Black trades it off.',
      'Bxd5 — and the b-file stands open at the king.',
    ],
  },
  {
    id: 'mp-siciliandragon-classical',
    title: 'Classical: Comfortable Equality',
    overview: "Against the quiet Be2 Classical, Black has no storm to fear. The plan is simple good chess: the knight reroutes to the c4 outpost via a5, trades off White's strong bishop, and Black equalises with every piece on a fine square.",
    pawnBreaks: [{ move: 'a5-a4', explanation: 'a5 and a4 gain queenside space and harass the b3-knight in some lines.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Nc6-a5-c4', explanation: 'The knight swings to the c4 outpost to trade White\'s good light-squared bishop.' }],
    strategicThemes: [
      'No king hunt — Black simply plays solid chess.',
      'The c4 outpost trades White\'s best minor piece.',
      'The long-diagonal bishop is a lasting asset.',
    ],
    endgameTransitions: ['A sound structure and the strong bishop give Black a pleasant endgame.'],
    prefix: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be2 Bg7 O-O O-O Be3 Nc6 Nb3 Be6',
    line: ['f4', 'Na5', 'f5', 'Bc4', 'Bxc4', 'Nxc4'],
    annotations: [
      'f4 — White grabs kingside space.',
      'Na5 — the knight heads for the c4 outpost.',
      'f5 — White pushes on, hitting the e6-bishop.',
      'Bc4 — Black trades off White\'s good bishop.',
      'Bxc4 — White recaptures on c4.',
      'Nxc4 — Black is comfortably equal, every piece placed.',
    ],
  },
  {
    id: 'mp-siciliandragon-levenfish',
    title: 'Levenfish: Develop and Equalise',
    overview: "After the Nbd7 antidote has defused White's early f4, Black develops smoothly and swings the knight to the active c5 square, hitting e4, then expands on the queenside with full, comfortable equality.",
    pawnBreaks: [{ move: 'b5-b4', explanation: 'b5 and b4 expand on the queenside and harass the c3-knight.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Nd7-c5', explanation: 'The knight jumps to c5, hitting e4 and eyeing d3.' }],
    strategicThemes: [
      'Nbd7 already killed the f4-push\'s venom.',
      'The c5-knight is active, pressing e4.',
      'Queenside expansion gives Black the easier game.',
    ],
    endgameTransitions: ['Sound and active, Black is at least equal heading into the endgame.'],
    prefix: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 f4 Nbd7 Nf3 Qc7 Bd3 Bg7 O-O O-O',
    line: ['Qe1', 'Nc5', 'Be2', 'b5', 'Qh4', 'b4'],
    annotations: [
      'Qe1 — White reroutes the queen toward the kingside.',
      'Nc5 — the knight jumps to an active post, hitting e4.',
      'Be2 — White preserves the light-squared bishop.',
      'b5 — Black expands on the queenside.',
      'Qh4 — White eyes the kingside.',
      'b4 — the pawn hits the c3-knight; Black is fully equal.',
    ],
  },
  {
    id: 'mp-siciliandragon-accelerated',
    title: 'Accelerated: Squeeze the Maroczy Bind',
    overview: "Against the Maroczy Bind, Black plays the patient anti-bind plan: the bishop to c6 pressures e4, the a-pawn grabs queenside space, and the knight reroutes toward c5, building slowly toward the freeing f5 break.",
    pawnBreaks: [{ move: 'f5', explanation: 'The f5 break is Black\'s thematic freeing lever against the bind once the pieces are ready.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Nf6-d7-c5', explanation: 'The knight reroutes toward the c5 outpost to pressure e4 and the queenside.' }],
    strategicThemes: [
      'Pressure the e4-pawn down the long diagonal.',
      'Expand with a5 and reroute the knight to c5.',
      'Patience: trade, restrain, then break with f5.',
    ],
    endgameTransitions: ['Solid as a rock — the bind has been the graveyard of impatient White players.'],
    prefix: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Nf6 Nc3 d6 Be2 Bg7 Be3 O-O O-O Nxd4 Bxd4 Bd7',
    line: ['Qd2', 'Bc6', 'f3', 'a5', 'b3', 'Nd7'],
    annotations: [
      'Qd2 — White consolidates the bind.',
      'Bc6 — the bishop targets the e4-pawn down the long diagonal.',
      'f3 — White props up e4.',
      'a5 — Black grabs queenside space, eyeing a4.',
      'b3 — White restrains the a-pawn.',
      'Nd7 — the knight reroutes toward the c5 outpost.',
    ],
  },
  {
    id: 'mp-siciliandragon-antibg5',
    title: 'Anti-Dragon Bg5: Seize the Initiative',
    overview: "Against the Bg5 sideline Black plays actively: a6 prepares the b5 expansion, the knight returns to the strong e5 square, and Black charges the queenside while White's slow setup achieves nothing.",
    pawnBreaks: [{ move: 'b5', explanation: 'b5 launches the queenside expansion that gives Black the initiative.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Ng4-e5', explanation: 'The knight returns from g4 to the strong central e5 square.' }],
    strategicThemes: [
      'Active, concrete play neutralises the Bg5 try.',
      'The knight belongs on the strong e5 square.',
      'a6 and b5 hand Black the initiative.',
    ],
    endgameTransitions: ['Having seized the initiative, Black carries the easier game forward.'],
    prefix: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 Nc6 Nb3 h6 Be3 Ng4 Bf4',
    line: ['a6', 'O-O-O', 'Nge5', 'h4', 'b5', 'Kb1'],
    annotations: [
      'a6 — Black prepares the b5 queenside expansion.',
      'O-O-O — White commits the king to the queenside.',
      'Nge5 — the knight returns to the strong e5 square.',
      'h4 — White gestures at the kingside.',
      'b5 — Black\'s queenside attack rolls forward.',
      'Kb1 — White tucks the king as Black charges.',
    ],
  },
];

const out = [];
for (const p of PLANS) {
  const { fen, moves } = build(p.prefix, p.line);
  if (moves.length !== p.annotations.length) throw new Error(`${p.id}: ${moves.length} moves vs ${p.annotations.length} annotations`);
  out.push({
    id: p.id,
    openingId: 'sicilian-dragon',
    title: p.title,
    criticalPositionFen: fen,
    overview: p.overview,
    pawnBreaks: p.pawnBreaks.map((pb) => ({ ...pb, fen })),
    pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes,
    endgameTransitions: p.endgameTransitions,
    playableLines: [{ title: p.title, fen, moves, annotations: p.annotations, arrows: moves.map(() => []), highlights: moves.map(() => []) }],
  });
  console.log(`${p.id}: ok ${moves.length} moves`);
}

const path = 'src/data/middlegame-plans.json';
const existing = JSON.parse(readFileSync(path, 'utf-8')).filter((p) => p.openingId !== 'sicilian-dragon');
writeFileSync(path, JSON.stringify([...existing, ...out], null, 2) + '\n');
console.log(`merged ${out.length} dragon plans into ${path}`);

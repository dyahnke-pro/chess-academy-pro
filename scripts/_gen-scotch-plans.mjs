// Build the 5 Scotch middlegame plans from the validated lesson spines
// (guaranteed legal + real theory). Annotations name key squares so
// add-leadeye-to-plans.mjs can ground the vision arrows + highlights.
// Merges into src/data/middlegame-plans.json (keeps other openings' plans).
import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'node:fs';

function build(prefix, lineMoves) {
  const c = new Chess();
  for (const m of prefix.split(' ')) { const b = c.fen(); c.move(m); if (c.fen() === b) throw new Error('illegal prefix ' + m); }
  const fen = c.fen();
  const sans = [];
  for (const m of lineMoves) { const b = c.fen(); const r = c.move(m); if (!r || c.fen() === b) throw new Error('illegal line move ' + m + ' from ' + fen); sans.push(r.san); }
  return { fen, moves: sans };
}

const PLANS = [
  {
    id: 'mp-scotchgame-main',
    title: 'Classical Scotch: Trade into the Better Structure',
    overview: "The Classical Scotch middlegame: White trades the centralised knight and the dark-squared bishops to saddle Black with doubled c-pawns, then claims kingside space with f4 and pins the c6-knight with Bb5. A clean, Capablanca-style plan — convert the healthier structure.",
    pawnBreaks: [{ move: 'f4-f5', explanation: 'After f4, the f5 push cramps Black and opens an attacking front while Black untangles the doubled pawns.' }],
    pieceManeuvers: [
      { piece: 'Bishop', route: 'Bc4-b5', explanation: 'The light-squared bishop swings to b5 to pin and pressure the c6-knight holding Black together.' },
    ],
    strategicThemes: [
      'Trade into Black\'s doubled c-pawns — the recurring Scotch dividend.',
      'f4-f5 grabs kingside space and an attacking front.',
      'Pile on the weak c6-knight and the split queenside pawns.',
    ],
    endgameTransitions: ['The healthier majority and safer king carry into a pleasant endgame for White.'],
    prefix: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 O-O O-O d6',
    line: ['Nxc6', 'Nxc6', 'Bxc5', 'dxc5', 'f4', 'Be6', 'Bb5', 'Rad8'],
    annotations: [
      'Nxc6 — trade the centralised knight to damage Black\'s pawns.',
      '…Nxc6 — Black recaptures on c6.',
      'Bxc5 — remove the dark-squared bishop, the bishop pair gone.',
      '…dxc5 — and Black is left with doubled c-pawns.',
      'f4 — claim kingside space and prepare the f5 cramp.',
      '…Be6 — Black develops the last piece, offering a trade.',
      'Bb5 — pin and pressure the c6-knight that holds Black together.',
      '…Rad8 — Black centralises; White presses the better structure.',
    ],
  },
  {
    id: 'mp-scotchgame-mieses',
    title: 'Mieses: Space, the c4 Clamp, and the Bishop Pair Fight',
    overview: "The Mieses middlegame: White rides the e5-spearhead and the c4-clamp to bind Black's wrecked queenside pawns, while Black counts on the bishop pair and the …Ba6 pin for activity. A genuinely double-edged modern struggle (Kasparov's choice).",
    pawnBreaks: [{ move: 'c4 clamp', explanation: 'c4 kicks the d5-knight and locks down the queenside light squares.' }],
    pieceManeuvers: [
      { piece: 'Bishop', route: 'Bc1-a3', explanation: 'The dark-squared bishop fianchettoes via b2 to a3, spearing the queen on e7.' },
    ],
    strategicThemes: [
      'The e5-pawn cramps Black; the doubled c-pawns are a long-term target.',
      'c4 + b3 build a queenside clamp.',
      'Ba3 hits the e7-queen and the dark squares.',
    ],
    endgameTransitions: ['If Black\'s activity fades, the structural edge tells in the endgame.'],
    prefix: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2',
    line: ['Nd5', 'c4', 'Ba6', 'b3', 'g6', 'Ba3', 'd6'],
    annotations: [
      '…Nd5 — the knight hops to the strong central d5 square.',
      'c4 — kick the d5-knight and clamp the queenside.',
      '…Ba6 — the thematic pin, pressuring the c4-pawn.',
      'b3 — calmly prop c4 and prepare Ba3.',
      '…g6 — Black prepares to fianchetto and blunt the light squares.',
      'Ba3 — spear the queen on e7 down the diagonal.',
      '…d6 — Black strikes the e5-spearhead to free the game.',
    ],
  },
  {
    id: 'mp-scotchgame-gambit',
    title: 'Scotch Gambit: Develop with Threats, Regain the Pawn',
    overview: "The Scotch Gambit's modern verdict: the early Bc4 and e5 win time, and after Bb5 + Nxd4 White simply regains the gambit pawn with a grip on the centre and Black's doubled c-pawns. A clever move-order into a pressable position.",
    pawnBreaks: [{ move: 'e5', explanation: 'The e5 push gains space and forces Black\'s …d5 break, opening the position for White\'s lead in development.' }],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nf3xd4', explanation: 'The knight reaches the central d4 square, regaining the gambit pawn.' },
    ],
    strategicThemes: [
      'A lead in development is the compensation for the pawn.',
      'Bb5 pins the c6-knight; Nxd4 recovers material.',
      'Black\'s doubled c-pawns give White the cleaner structure.',
    ],
    endgameTransitions: ['Level material but the better structure presses in the endgame.'],
    prefix: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4',
    line: ['Bd7', 'Bxc6', 'bxc6', 'O-O', 'Bc5', 'Be3', 'Bxd4'],
    annotations: [
      '…Bd7 — Black unpins the c6-knight.',
      'Bxc6 — trade on c6 to inflict the doubled pawns.',
      '…bxc6 — Black recaptures, structure compromised.',
      'O-O — bring the king to safety, fully coordinated.',
      '…Bc5 — Black develops with a hit on the d4-knight.',
      'Be3 — defend the knight and offer a trade.',
      '…Bxd4 — Black trades; White owns the better structure.',
    ],
  },
  {
    id: 'mp-scotchgame-fourknights',
    title: 'Four Knights: Press the Hanging d5-Pawn',
    overview: "The Scotch Four Knights middlegame: a near-symmetrical structure where White leans on Black's split queenside pawns and the d5-point with Bg5 and a knight rerouted via e2 to g3 toward f5. Quiet, classical, structure-driven chess.",
    pawnBreaks: [{ move: 'minority pressure', explanation: 'White targets the d5-pawn and the doubled c-pawns rather than pushing a break of his own.' }],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Ne2-g3', explanation: 'The knight reroutes via e2 to g3, heading for the f5 outpost.' },
    ],
    strategicThemes: [
      'Pin and pile on the d5-pawn with Bg5.',
      'Reroute the knight to g3 and f5.',
      'The split queenside pawns are the long-term target.',
    ],
    endgameTransitions: ['The structural pressure on d5 and the c-pawns favours White in a long game.'],
    prefix: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5 exd5 cxd5 O-O O-O',
    line: ['Bg5', 'c6', 'Ne2', 'Bd6', 'Ng3', 'h6'],
    annotations: [
      'Bg5 — pin the f6-knight and lean on the d5-pawn.',
      '…c6 — Black braces the d5-pawn.',
      'Ne2 — reroute the knight toward greener squares.',
      '…Bd6 — Black\'s bishop eyes the kingside.',
      'Ng3 — the knight lands, pressuring f5 and the kingside.',
      '…h6 — Black makes luft; White probes the d5 weakness.',
    ],
  },
  {
    id: 'mp-scotchgame-kasparov',
    title: 'Kasparov Nb3: Opposite Castling, the Pawn-Storm Race',
    overview: "Kasparov's Nb3 Scotch: White trades the dark-squared bishops, castles long, and races his kingside pawns at Black's king while Black storms the queenside. A sharp, opposite-side-castling middlegame from a 'quiet' opening.",
    pawnBreaks: [{ move: 'g4-g5', explanation: 'After f3 anchors e4, White rolls the g-pawn to pry open Black\'s kingside.' }],
    pieceManeuvers: [
      { piece: 'Queen', route: 'Qe2-e3', explanation: 'The queen recaptures on e3 after the bishop trade and supports the long castle.' },
    ],
    strategicThemes: [
      'Trade the dark-squared bishops, then castle queenside.',
      'Race the kingside pawns (f3, g4-g5) at Black\'s king.',
      'The half-open d-file pressures the d6-pawn.',
    ],
    endgameTransitions: ['Sharp middlegame; the attack usually decides before an endgame.'],
    prefix: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Nb3 Bb6 Nc3 Nf6 Qe2 d6 Be3',
    line: ['Bxe3', 'Qxe3', 'O-O', 'O-O-O', 'Be6', 'f3'],
    annotations: [
      '…Bxe3 — Black trades the dark-squared bishops.',
      'Qxe3 — the queen recaptures, eyeing the kingside.',
      '…O-O — Black castles kingside, into the coming storm.',
      'O-O-O — White castles long; the d-file points at d6.',
      '…Be6 — Black develops and challenges the c5 outpost.',
      'f3 — anchor e4 and prepare the g4-g5 pawn storm.',
    ],
  },
  {
    id: 'mp-scotchgame-steinitz',
    title: 'Steinitz 4...Qh4: Punish the Early Queen with Development',
    overview: "Black's premature ...Qh4 is met by Nb5! and rapid development. Black grabs a pawn on e4 but cannot castle, and White's lead in development against the stranded king on d8 is worth far more than the pawn.",
    pawnBreaks: [{ move: 'e5 / f4', explanation: 'Once developed, White opens lines toward the stuck king with central and kingside pawn breaks.' }],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nb5-d2-f3', explanation: 'The knight harasses c7, recaptures on d2, and redeploys via f3 toward the e5 and g5 outposts.' },
    ],
    strategicThemes: [
      'Nb5 threatens the Nxc7 fork and exploits the early queen.',
      'Black cannot castle; the king is stranded on d8.',
      'A development lead beats Black\'s extra pawn.',
    ],
    endgameTransitions: ['White converts the development lead before Black ever coordinates.'],
    prefix: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Qh4 Nb5 Bb4+ Bd2 Qxe4+ Be2 Kd8',
    line: ['O-O', 'Bxd2', 'Nxd2', 'Qg6', 'Nf3', 'Nf6'],
    annotations: [
      'O-O — tuck the king safely away while Black\'s king is stuck on d8.',
      'Bxd2 — Black trades the dark-squared bishops.',
      'Nxd2 — recapture; the b5-knight still eyes the c7 fork.',
      'Qg6 — the overworked queen retreats to g6 to consolidate.',
      'Nf3 — redeploy the knight toward the e5 and g5 outposts.',
      'Nf6 — Black finally develops a piece; White is a step from converting.',
    ],
  },
];

const out = [];
for (const p of PLANS) {
  const { fen, moves } = build(p.prefix, p.line);
  if (moves.length !== p.annotations.length) throw new Error(`${p.id}: ${moves.length} moves vs ${p.annotations.length} annotations`);
  out.push({
    id: p.id,
    openingId: 'scotch-game',
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
const existing = JSON.parse(readFileSync(path, 'utf-8')).filter((p) => p.openingId !== 'scotch-game');
writeFileSync(path, JSON.stringify([...existing, ...out], null, 2) + '\n');
console.log(`merged ${out.length} scotch plans into ${path}`);

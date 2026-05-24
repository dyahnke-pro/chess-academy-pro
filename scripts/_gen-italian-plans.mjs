// Build the 5 Italian middlegame plans, deriving each playable line's FEN +
// moves from the validated lesson spines (guaranteed legal + real theory).
// Annotations name the key squares so add-leadeye-to-plans.mjs can ground the
// vision arrows + highlights. Merges into src/data/middlegame-plans.json.
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
    id: 'mp-italiangame-main',
    title: 'Giuoco Piano: the Isolani Initiative',
    overview: "The classical Giuoco Piano middlegame: White accepts an isolated d4-pawn in return for open lines and active pieces. The rook seizes the e-file, the bishop reroutes Bb3-toward f7, and the queen swings to c2 eyeing h7. White hands back the pawn to keep a lasting initiative against the Black king.",
    pawnBreaks: [{ move: 'd4-d5', explanation: 'When Black is tied to blockading d4, a timely d5 frees the bishop on b3 and opens the centre against the king.' }],
    pieceManeuvers: [
      { piece: 'Bishop', route: 'Bc4-b3', explanation: 'The bishop steps to b3 to stay on the a2-g8 diagonal aimed at f7 after Black harasses it.' },
      { piece: 'Knight', route: 'Nd2-e4', explanation: 'The d2-knight jumps into e4, eyeing f6 and d6 and joining the kingside build-up.' },
    ],
    strategicThemes: [
      'The isolated d4-pawn is a dynamic asset, not a weakness: it grants open lines and active pieces.',
      'White trades the pawn for a sustained initiative; the e-file and the b3-c2 diagonals do the work.',
      'Every minor piece is aimed at f7 and h7 — the Italian target squares.',
    ],
    endgameTransitions: ['If Black neutralises the initiative, the queenless middlegame still favours White thanks to the freer pieces.'],
    prefix: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 O-O O-O',
    line: ['Re1', 'Nb6', 'Bb3', 'Nxd4', 'Nxd4', 'Qxd4', 'Qc2', 'c6', 'Ne4'],
    annotations: [
      'Re1 — the rook seizes the open e-file, pointing down at e8 and the Black king.',
      '…Nb6 — Black nudges the c4-bishop and eyes the d5 and c4 squares.',
      'Bb3 — the bishop slides to b3, staying on the diagonal that aims at f7.',
      '…Nxd4 — Black grabs the isolated d4-pawn, the trade White has been inviting.',
      'Nxd4 — recapturing on d4 with the knight, opening lines toward the king.',
      '…Qxd4 — the queen takes on d4, walking into White’s development.',
      'Qc2 — the queen swings to c2, unveiling the b3-bishop on f7 and loading the b1-h7 diagonal toward h7.',
      '…c6 — Black shores up the d5 and b5 light squares.',
      'Ne4 — the knight leaps to e4, eyeing f6 and d6 as the initiative rolls on.',
    ],
  },
  {
    id: 'mp-italiangame-modern',
    title: 'Modern d3: the Nf1-g3-f5 Manoeuvre',
    overview: "The Giuoco Pianissimo plan: White re-routes the queen-knight Nbd2-f1-g3 toward the f5 outpost, recoils the bishop to b3, and prepares the slow d4 break. Patient build-up, then a decisive central strike when every piece is coordinated.",
    pawnBreaks: [{ move: 'd3-d4', explanation: 'Once the knight reaches g3 and the pieces are coordinated, d4 opens the centre on White’s terms.' }],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nd2-f1-g3', explanation: 'The signature modern-Italian re-route: the knight heads for the f5 outpost via f1 and g3.' },
      { piece: 'Bishop', route: 'Bc4-b3', explanation: 'The bishop recoils to b3 to dodge the trade and keep the a2-g8 diagonal.' },
    ],
    strategicThemes: [
      'The f5 outpost is the prize — a knight there cannot be chased by a pawn.',
      'White avoids early theory and squeezes from a fully-developed setup.',
      'The d4 break is held back until the pieces are optimally placed.',
    ],
    endgameTransitions: ['The space edge from a4 and the centre often carries into a pleasant endgame for White.'],
    prefix: 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3 a6 a4 Ba7 Nbd2 O-O Re1',
    line: ['Be6', 'Bb3', 'h6', 'Nf1', 'Bxb3', 'Qxb3', 'Re8', 'Ng3'],
    annotations: [
      '…Be6 — Black offers to trade the light-squared bishops on e6.',
      'Bb3 — White declines, sliding the bishop to b3 to keep it on the f7 diagonal.',
      '…h6 — Black takes the g5-square away from White’s pieces.',
      'Nf1 — the knight begins its journey, stepping to f1 on the way to g3.',
      '…Bxb3 — Black trades on b3 to release the tension.',
      'Qxb3 — the queen recaptures on b3, eyeing b7 and the f7-square.',
      '…Re8 — Black centralises the rook on e8 behind the e-pawn.',
      'Ng3 — the knight reaches g3, one leap from the f5 outpost; d4 is next.',
    ],
  },
  {
    id: 'mp-italiangame-twoknights',
    title: 'Two Knights with d4: the Forcing Sequence',
    overview: "The dynamic 4.d4 line: White gambits a pawn for a development lead, pins the e4-knight on the e-file, and uses the Bxd5/Nc3 fork to regain material. Precise play leads to a balanced middlegame where White’s rook and structure give a small, lasting pull.",
    pawnBreaks: [{ move: 'd4 gambit', explanation: 'The early d4 surrenders a pawn to open lines toward Black’s uncastled king.' }],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nc3-e4', explanation: 'The c3-knight forks the queen on d5 and the e4-knight, regaining the piece.' },
      { piece: 'Rook', route: 'Re1xe6', explanation: 'The e1-rook lands on e6 deep in Black’s camp after the knights trade.' },
    ],
    strategicThemes: [
      'A development lead is the compensation for the gambit pawn.',
      'The pin on the e-file is the engine of every White threat.',
      'After the smoke clears White has the better structure and the active rook.',
    ],
    endgameTransitions: ['The resulting near-endgame is level material but White’s active rook on e6 presses Black’s weaknesses.'],
    prefix: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5 Bxd5 Qxd5 Nc3',
    line: ['Qa5', 'Nxe4', 'Be6', 'Neg5', 'O-O-O', 'Nxe6', 'fxe6', 'Rxe6', 'Bd6'],
    annotations: [
      '…Qa5 — the queen flees the c3-fork to a5.',
      'Nxe4 — White scoops the e4-knight back, restoring material equality.',
      '…Be6 — Black covers f7 and develops the bishop to e6.',
      'Neg5 — the knight hops to g5, attacking the e6-bishop and f7 again.',
      '…O-O-O — Black castles long out of the pin.',
      'Nxe6 — White trades on e6 to damage Black’s structure.',
      '…fxe6 — recapturing on e6 leaves Black with a weak e-pawn.',
      'Rxe6 — the rook grabs e6, landing actively in Black’s position.',
      '…Bd6 — Black develops the bishop to d6 and the dust settles, White slightly better.',
    ],
  },
  {
    id: 'mp-italiangame-evans',
    title: 'Evans Gambit: the Big Centre Attack',
    overview: "The romantic gambit pays for a broad centre and two raking bishops. White rolls d4-d5 to gain space, plants the dark-squared bishop on b2 aimed at g7, and throws the c4-bishop and queen at f7. One pawn for a ferocious attack on the king.",
    pawnBreaks: [{ move: 'd4-d5', explanation: 'd5 gains space with tempo, kicking the c6-knight to the rim and cramping Black.' }],
    pieceManeuvers: [
      { piece: 'Bishop', route: 'Bc1-b2', explanation: 'The dark-squared bishop goes to b2, raking the long diagonal toward g7.' },
      { piece: 'Knight', route: 'Nb1-c3', explanation: 'The queen-knight develops to c3, supporting the centre and the kingside push.' },
    ],
    strategicThemes: [
      'The gambit pawn buys time to build the d4-e4 centre.',
      'Two bishops on c4 and b2 aim straight at f7 and g7.',
      'White’s open b- and c-files feed the attack while Black’s a5-knight sits offside.',
    ],
    endgameTransitions: ['If Black survives the attack the extra pawn matters, so White must press while the initiative lasts.'],
    prefix: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Bc5 d4 exd4 O-O d6 cxd4 Bb6',
    line: ['d5', 'Na5', 'Bb2', 'Ne7', 'Bd3', 'O-O', 'Nc3'],
    annotations: [
      'd5 — the centre pawn rolls forward, hitting the c6-knight with tempo.',
      '…Na5 — the knight is shoved to the rim on a5, biting at the c4-bishop.',
      'Bb2 — the bishop takes the long diagonal, raking toward g7 and the Black king.',
      '…Ne7 — Black’s knight returns toward the defence on e7.',
      'Bd3 — the bishop reroutes to d3, joining the attack on the b1-h7 diagonal toward h7.',
      '…O-O — Black castles into the line of fire.',
      'Nc3 — the queen-knight develops to c3, ready to swing to the kingside.',
    ],
  },
  {
    id: 'mp-italiangame-moller',
    title: 'Møller Attack: the Exchange Sacrifice',
    overview: "The Italian’s sharpest line: after grabbing the rook on a1 Black is invited to drown. White sacrifices the exchange, smashes Bxf7+, and brings every piece to the uncastled king. Pawns and rooks count for nothing next to an attack on a king that cannot run.",
    pawnBreaks: [{ move: 'd4-d5', explanation: 'The d-pawn joins the assault, opening lines for the f3-queen and the bishops.' }],
    pieceManeuvers: [
      { piece: 'Bishop', route: 'Bc4xf7', explanation: 'The bishop crashes into f7 with check, dragging the king out and ignoring the lost rook.' },
      { piece: 'Knight', route: 'Nf3-e5', explanation: 'The knight lands on e5, supporting the f7-bishop and threatening d7 and g6.' },
    ],
    strategicThemes: [
      'White trades a whole rook for an attack on a king stuck in the centre.',
      'Every White piece attacks; Black’s queenside is asleep and his a1-bishop is marooned.',
      'The attack rolls with checks so Black never gets a move to consolidate.',
    ],
    endgameTransitions: ['There is no endgame — the Møller is decided in the middlegame by the attack.'],
    prefix: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 Nxe4 O-O Nxc3 bxc3 Bxc3 Qb3',
    line: ['Bxa1', 'Bxf7+', 'Kf8', 'Bg5', 'Ne7', 'Ne5', 'Bxd4', 'Bg6'],
    annotations: [
      '…Bxa1 — Black takes the rook on a1, winning the exchange and the bait.',
      'Bxf7+ — the bishop smashes into f7 with check, ignoring the lost rook.',
      '…Kf8 — the king shuffles to f8, stranded in the centre.',
      'Bg5 — the bishop swings to g5 with tempo, harassing the kingside.',
      '…Ne7 — Black props up with the knight on e7.',
      'Ne5 — the knight lands on e5, supporting f7 and eyeing d7 and g6.',
      '…Bxd4 — Black grabs the d4-pawn, but the attack is already decisive.',
      'Bg6 — the bishop sacrifices again on g6 to rip open the king; the hurricane rolls on.',
    ],
  },
];

const out = [];
for (const p of PLANS) {
  const { fen, moves } = build(p.prefix, p.line);
  if (moves.length !== p.annotations.length) throw new Error(`${p.id}: ${moves.length} moves vs ${p.annotations.length} annotations`);
  out.push({
    id: p.id,
    openingId: 'italian-game',
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
const existing = JSON.parse(readFileSync(path, 'utf-8')).filter((p) => p.openingId !== 'italian-game');
writeFileSync(path, JSON.stringify([...existing, ...out], null, 2) + '\n');
console.log(`merged ${out.length} italian plans into ${path}`);

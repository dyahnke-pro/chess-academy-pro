// Build the 9 Sicilian Najdorf middlegame plans (one per tab) — BLACK-oriented,
// teaching the student's counterplay. Legal real-theory lines; annotations
// name key squares for add-leadeye-to-plans.mjs. Replaces any pre-existing
// najdorf plans. Move-count-free prose.
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

const N = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6';
const PLANS = [
  {
    id: 'mp-siciliannajdorf-main', title: "English Attack: Black's b-File Race",
    overview: "The English Attack race: White storms with g4-g5, Black answers with b5 and b4, prising open the b-file at the long-castled king. Black's attack is famously fast.",
    pawnBreaks: [{ move: 'b5-b4', explanation: 'b5 then b4 rips open lines at White\'s queenside king.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Nbd7-b6-c4', explanation: 'The knight heads for the c4 outpost via b6.' }],
    strategicThemes: ['b5-b4 opens the b-file at the king.', 'Trade off the d5-knight, keep attacking.', 'Speed beats material in the race.'],
    endgameTransitions: ['The attack usually decides before an endgame.'],
    prefix: `${N} Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7`,
    line: ['Kb1', 'b5', 'g4', 'b4', 'Nd5', 'Bxd5', 'exd5'],
    annotations: [
      'Kb1 — White tucks the king and prepares the storm.',
      'b5 — Black\'s queenside avalanche begins.',
      'g4 — White races on the kingside.',
      'b4 — the pawn hits the c3-knight, tearing open the b-file.',
      'Nd5 — White jumps the knight in rather than retreat.',
      'Bxd5 — Black trades it off.',
      'exd5 — and the b-file stands open at White\'s king.',
    ],
  },
  {
    id: 'mp-siciliannajdorf-classical', title: 'Classical 6.Be2: Cover d5, Play for Equality',
    overview: "Against the quiet Be2, Black trades off the d5-knight, accepts a small structural concession, and plays comfortably on the queenside with a5 and the half-open c-file.",
    pawnBreaks: [{ move: 'a5-a4', explanation: 'a5 and a4 gain queenside space and harass the b3-knight.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Nb8-d7', explanation: 'The knight develops to d7, heading for c5 or b6.' }],
    strategicThemes: ['No king hunt — solid positional play.', 'Trade the d5-knight to ease the position.', 'Queenside space with a5.'],
    endgameTransitions: ['A sound structure gives Black a pleasant endgame.'],
    prefix: `${N} Be2 e5 Nb3 Be7 O-O O-O Be3 Be6`,
    line: ['Nd5', 'Bxd5', 'exd5', 'Nbd7', 'c4', 'a5'],
    annotations: [
      'Nd5 — White occupies the d5 outpost.',
      'Bxd5 — Black trades it off at once.',
      'exd5 — White recaptures, closing the centre.',
      'Nbd7 — the knight reroutes toward c5.',
      'c4 — White grabs queenside space.',
      'a5 — Black expands and is comfortably equal.',
    ],
  },
  {
    id: 'mp-siciliannajdorf-6bg5', title: '6.Bg5 Main: the b-File Counter',
    overview: "In the 6.Bg5 main line White storms with g4-g5; Black counters down the queenside with b5 and b4 and the half-open c-file, in one of the sharpest races in chess.",
    pawnBreaks: [{ move: 'b5-b4', explanation: 'b5 and b4 open lines at White\'s king.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Nf6-d7', explanation: 'After the Bxf6 trade the knight reroutes via d7.' }],
    strategicThemes: ['b5-b4 races White\'s g-pawn storm.', 'The half-open c-file feeds the attack.', 'A single tempo decides.'],
    endgameTransitions: ['Sharp middlegame; the attack usually decides.'],
    prefix: `${N} Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7`,
    line: ['g4', 'b5', 'Bxf6', 'Nxf6', 'g5', 'Nd7'],
    annotations: [
      'g4 — White launches the kingside storm.',
      'b5 — Black fires the queenside counter.',
      'Bxf6 — White trades to loosen Black\'s grip.',
      'Nxf6 — Black recaptures naturally.',
      'g5 — White kicks the knight.',
      'Nd7 — the knight reroutes; b4 comes next.',
    ],
  },
  {
    id: 'mp-siciliannajdorf-poisoned', title: 'Poisoned Pawn: Grab and Hold',
    overview: "Black snatches the b2-pawn and weathers the storm: precise defence, untangle with Nfd7, and emerge a clean pawn up — the boldest material grab in the openings.",
    pawnBreaks: [{ move: 'e5 (White)', explanation: 'White strikes with e5 to open lines; Black trades and untangles.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Nf6-d7', explanation: 'Nfd7 retreats to untangle and blunt the attack.' }],
    strategicThemes: ['A clean extra pawn is the prize.', 'Defend precisely, then convert.', 'Trade pieces toward the endgame.'],
    endgameTransitions: ['The extra pawn tells once the attack is blunted.'],
    prefix: `${N} Bg5 e6 f4 Qb6 Qd2 Qxb2 Rb1 Qa3`,
    line: ['e5', 'dxe5', 'fxe5', 'Nfd7', 'Be2', 'Bb4'],
    annotations: [
      'e5 — White blows open the centre for the attack.',
      'dxe5 — Black takes calmly.',
      'fxe5 — White recaptures, lines opening.',
      'Nfd7 — the knight retreats to untangle.',
      'Be2 — White develops toward the attack.',
      'Bb4 — Black develops with a pin, a pawn up.',
    ],
  },
  {
    id: 'mp-siciliannajdorf-6f3', title: '6.f3 Move Order: the English Race',
    overview: "The f3 move order transposes to the English Attack — Black covers d5, castles, and runs the b5-b4 queenside attack against White's long-castled king.",
    pawnBreaks: [{ move: 'b5-b4', explanation: 'b5 and b4 open the b-file at the king.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Nbd7-b6', explanation: 'The knight heads for c4 via b6.' }],
    strategicThemes: ['Transposes to the English Attack race.', 'b5-b4 opens lines.', 'Cover d5, then attack.'],
    endgameTransitions: ['The attack usually decides.'],
    prefix: `${N} f3 e5 Nb3 Be6 Be3 Be7 Qd2 O-O O-O-O Nbd7`,
    line: ['Kb1', 'b5', 'g4', 'b4', 'Nd5', 'Bxd5'],
    annotations: [
      'Kb1 — White tucks the king away.',
      'b5 — Black\'s queenside storm begins.',
      'g4 — White races on the kingside.',
      'b4 — the pawn hits the c3-knight.',
      'Nd5 — White jumps in rather than retreat.',
      'Bxd5 — Black trades it; the b-file opens.',
    ],
  },
  {
    id: 'mp-siciliannajdorf-fischer', title: 'Fischer-Sozin: Queenside Counterattack',
    overview: "Against the Bc4 battery aimed at f7, Black walls up with e6 and counterattacks fast with b5 and b4, opening the b-file and the long diagonal before White's kingside play lands.",
    pawnBreaks: [{ move: 'b5-b4', explanation: 'b4 chases the c3-knight and opens lines.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Nf6-d5', explanation: 'After b4 hits c3, exchanges on d5 open the position.' }],
    strategicThemes: ['Wall off the c4-bishop with e6.', 'b5-b4 counterattacks fast.', 'Open the b-file at the king.'],
    endgameTransitions: ['The queenside initiative carries into the endgame.'],
    prefix: `${N} Bc4 e6 Bb3 Be7 f3 O-O Qe2 b5 Be3 b4`,
    line: ['Nd5', 'Nxd5', 'Bxd5', 'exd5'],
    annotations: [
      'Nd5 — the attacked knight jumps to d5.',
      'Nxd5 — Black trades it off.',
      'Bxd5 — White recaptures with the bishop.',
      'exd5 — Black opens the e-file, queenside rolling.',
    ],
  },
  {
    id: 'mp-siciliannajdorf-6g3', title: '6.g3 Fianchetto: Easy Equality',
    overview: "Against the quiet g3 fianchetto Black takes the centre with e5, develops smoothly, and reroutes the rook to b8 to prepare the b5 break despite a4 — comfortable equality with all the winning chances.",
    pawnBreaks: [{ move: 'b5', explanation: 'b5 expands once prepared, even after White\'s a4.' }],
    pieceManeuvers: [{ piece: 'Rook', route: 'Ra8-b8', explanation: 'The rook swings to b8 to back the b5 break.' }],
    strategicThemes: ['Take the centre against the slow setup.', 'Prepare b5 behind the rook.', 'Comfortable, with winning chances.'],
    endgameTransitions: ['A sound Najdorf structure presses in the endgame.'],
    prefix: `${N} g3 e5 Nde2 Be7 Bg2 O-O O-O Nbd7 a4 Rb8`,
    line: ['h3', 'b6', 'Be3', 'Bb7', 'Qd2', 'Re8'],
    annotations: [
      'h3 — White makes luft, no storm coming.',
      'b6 — Black prepares the long-diagonal bishop.',
      'Be3 — White develops quietly.',
      'Bb7 — Black\'s bishop eyes the centre and e4.',
      'Qd2 — White centralises.',
      'Re8 — Black backs the centre, fully equal.',
    ],
  },
  {
    id: 'mp-siciliannajdorf-ng4', title: '6.Be3 Ng4: Bishop Pair and Space',
    overview: "The Ng4 try chases White's dark-squared bishop to g3, gaining kingside space, then Black fianchettoes and storms the queenside — an aggressive, double-edged Najdorf.",
    pawnBreaks: [{ move: 'b5-b4', explanation: 'b5 and b4 open the queenside at White\'s king.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Ng4-e5', explanation: 'The provoking knight returns to the strong e5 square.' }],
    strategicThemes: ['Chase the bishop, grab kingside space.', 'The knight belongs on e5.', 'Storm the queenside with b5-b4.'],
    endgameTransitions: ['The space and bishop pair carry forward.'],
    prefix: `${N} Be3 Ng4 Bg5 h6 Bh4 g5 Bg3 Bg7 Qd2 Nc6`,
    line: ['Nb3', 'Nge5', 'O-O-O', 'b5', 'Kb1', 'b4'],
    annotations: [
      'Nb3 — White retreats the knight.',
      'Nge5 — the knight returns to the strong e5 square.',
      'O-O-O — White commits the king to the queenside.',
      'b5 — Black\'s queenside storm begins.',
      'Kb1 — White tucks the king as Black charges.',
      'b4 — the pawn opens lines at the king.',
    ],
  },
  {
    id: 'mp-siciliannajdorf-6a4', title: 'Anti-Najdorf 6.a4: Central Play',
    overview: "With b5 restrained by a4, Black shifts plans — the rook to c8 for the half-open file, trade off the d5-knight, and reroute toward c5 and the central d5 break, keeping a sound equal game.",
    pawnBreaks: [{ move: 'd5 (eventual)', explanation: 'With b5 held back, Black aims for the central d5 break instead.' }],
    pieceManeuvers: [{ piece: 'Knight', route: 'Nd7-b6', explanation: 'The knight reroutes to b6, pressing d5 and a4.' }],
    strategicThemes: ['a4 stops b5, so play the centre and the c-file.', 'Trade the d5-knight.', 'Reroute toward c5 and b6.'],
    endgameTransitions: ['A sound structure equalises comfortably.'],
    prefix: `${N} a4 e5 Nb3 Be7 Be2 O-O O-O Be6 Be3 Nbd7`,
    line: ['a5', 'Rc8', 'Nd5', 'Bxd5', 'exd5', 'Nb6'],
    annotations: [
      'a5 — White clamps the queenside.',
      'Rc8 — Black takes the half-open c-file.',
      'Nd5 — White occupies the outpost.',
      'Bxd5 — Black trades it off.',
      'exd5 — White recaptures, closing the centre.',
      'Nb6 — the knight presses d5 and the a4-pawn.',
    ],
  },
];

const out = [];
for (const p of PLANS) {
  const { fen, moves } = build(p.prefix, p.line);
  if (moves.length !== p.annotations.length) throw new Error(`${p.id}: ${moves.length} moves vs ${p.annotations.length} annotations`);
  out.push({
    id: p.id, openingId: 'sicilian-najdorf', title: p.title, criticalPositionFen: fen, overview: p.overview,
    pawnBreaks: p.pawnBreaks.map((pb) => ({ ...pb, fen })), pieceManeuvers: p.pieceManeuvers,
    strategicThemes: p.strategicThemes, endgameTransitions: p.endgameTransitions,
    playableLines: [{ title: p.title, fen, moves, annotations: p.annotations, arrows: moves.map(() => []), highlights: moves.map(() => []) }],
  });
  console.log(`${p.id}: ok ${moves.length} moves`);
}
const path = 'src/data/middlegame-plans.json';
const existing = JSON.parse(readFileSync(path, 'utf-8')).filter((p) => p.openingId !== 'sicilian-najdorf');
writeFileSync(path, JSON.stringify([...existing, ...out], null, 2) + '\n');
console.log(`merged ${out.length} najdorf plans (replaced pre-existing)`);

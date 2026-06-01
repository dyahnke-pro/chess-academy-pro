import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const ORANGE = 'rgba(255, 165, 0, 0.55)', GREEN = 'rgba(40,185,95,0.92)', YELLOW = 'rgba(255,214,0,0.88)';

const RUY = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Ruy_Lopez', 'https://www.chess.com/openings/Ruy-Lopez-Opening', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];
const NIM = ['concept:pos-center', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence', 'https://www.chess.com/openings/Nimzo-Indian-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];
const NAJ = ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];
const TAI = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Taimanov_Variation', 'https://www.chess.com/openings/Sicilian-Defense-Taimanov-Variation', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];
const IT = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Italian_Game', 'https://www.chess.com/openings/Italian-Game', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];
const FR = ['concept:pawn-minority-attack', 'https://en.wikipedia.org/wiki/French_Defence', 'https://www.chess.com/openings/French-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];
const CK = ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence', 'https://www.chess.com/openings/Caro-Kann-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];
const KI = ['concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence', 'https://www.chess.com/openings/Kings-Indian-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

// Each plan anchored at the opening's real-game middlegame terminus (Gate C:
// the plan starts where the lesson's main line reaches the middlegame). moves =
// the real continuation his winning game played (G3). goals = squares a STUDENT
// move lands on. arrow = optional green vision arrow (non-pawn origin).
const PLANS = [
  {
    id: 'mp-pro-caruana-ruy-lopez-clamp', oid: 'pro-caruana-ruy-lopez', color: 'w', src: RUY,
    fen: 'r1bq1rk1/2ppbppp/p1n2n2/1p2p3/4P3/1B3N2/PPPP1PPP/RNBQR1K1 w - - 2 8',
    title: 'Queenside Clamp: a4 and a5',
    goals: ['a4', 'a5', 'c3'], pawn: 'a4-a5 queenside clamp', piece: null,
    line: [
      ['a4', 'a4 strikes the queenside, challenging the b5-pawn at its root.', 'a4 — strike the queenside'],
      ['b4', 'Black pushes past with …b4, fixing the structure.', '…b4 — fix the queenside'],
      ['a5', 'a5 clamps the queenside and fixes a long-term weakness on a6.', 'a5 — the clamp'],
      ['d6', 'Black props the centre.', '…d6 — prop the centre'],
      ['c3', 'c3 supports d4 and gives the b3-bishop a retreat.', 'c3 — support the centre'],
      ['Rb8', 'Black activates the rook on the half-open b-file.', '…Rb8 — the b-file'],
      ['h3', 'h3 makes luft and prevents any …Bg4 pin before White expands.', 'h3 — luft, prevent the pin'],
      ['Rb5', 'Black doubles pressure but White has the space and the cleaner plan.', '…Rb5 — White is comfortable'],
    ],
    arrow: null,
  },
  {
    id: 'mp-pro-caruana-italian-pianissimo', oid: 'pro-caruana-italian', color: 'w', src: IT,
    fen: 'r1bq1rk1/bpp2ppp/p1np1n2/4p3/P1B1P3/2PP1N2/1P1N1PPP/R1BQ1RK1 w - - 3 9',
    title: 'The Pianissimo Squeeze: Re1 and b4',
    goals: ['e1', 'b4'], pawn: 'b4 queenside expansion', piece: 'Re1 centralise',
    line: [
      ['h3', 'h3 makes luft and stops …Bg4 before White expands.', 'h3 — luft first'],
      ['h6', 'Black mirrors with …h6.', '…h6 — Black mirrors'],
      ['Re1', 'Re1 centralises the rook behind the e4-pawn, backing a future d4.', 'Re1 — centralise the rook'],
      ['Re8', 'Black contests the file.', '…Re8 — contest'],
      ['b4', 'b4 grabs queenside space and opens lines for the slow squeeze.', 'b4 — queenside space'],
      ['Be6', 'Black offers the light-squared bishops off.', '…Be6 — offer the trade'],
    ],
    arrow: { at: 2, from: 'f1', to: 'e1' },
  },
  {
    id: 'mp-pro-caruana-najdorf-outpost', oid: 'pro-caruana-najdorf', color: 'b', src: NAJ,
    fen: 'rnbq1rk1/1p2bppp/p2p1n2/4p3/4P3/1NN5/PPP1BPPP/R1BQ1RK1 w - - 4 9',
    title: 'Remove the d5 Outpost: …Bxd5',
    goals: ['e6', 'd5', 'd7', 'a5'], pawn: null, piece: '…Be6 then …Bxd5 remove the outpost',
    line: [
      ['Be3', 'White develops, eyeing the queenside dark squares.', 'Be3 — White develops'],
      ['Be6', '…Be6 controls the key d5-square and prepares to contest it.', '…Be6 — fight for d5'],
      ['Nd5', 'White plants a knight on the d5-outpost.', 'Nd5 — the outpost'],
      ['Bxd5', '…Bxd5 removes the strong knight at once.', '…Bxd5 — remove the outpost'],
      ['exd5', 'White recaptures with the pawn, gaining a protected passer but giving up the outpost.', 'exd5 — recapture'],
      ['Nbd7', '…Nbd7 reroutes toward c5 and b6; Black is sound and active.', '…Nbd7 — reroute, active'],
    ],
    arrow: null,
  },
  {
    id: 'mp-pro-caruana-taimanov-bishoppair', oid: 'pro-caruana-taimanov', color: 'b', src: TAI,
    fen: 'r1bqkb1r/5ppp/p1p1pn2/3p4/4P3/2NB4/PPP2PPP/R1BQ1RK1 w kq - 2 9',
    title: 'Queenside Play: …a5 and …Ba6',
    goals: ['e7', 'a5', 'a6'], pawn: '…a5 queenside space', piece: '…Be7, …Ba6 trade the good bishop',
    line: [
      ['Qf3', 'White centralises the queen, eyeing d5 and the kingside.', 'Qf3 — centralise'],
      ['Be7', '…Be7 develops, ready to castle.', '…Be7 — develop'],
      ['Re1', 'White pressures the e-file.', 'Re1 — pressure e6'],
      ['O-O', '…O-O tucks the king to safety.', '…O-O — castle'],
      ['Bf4', 'White develops the dark bishop.', 'Bf4 — develop'],
      ['a5', '…a5 grabs queenside space, eyeing …a4 and …Ba6.', '…a5 — queenside space'],
      ['b3', 'White props c4 and the bishop.', 'b3 — prop the queenside'],
      ['Ba6', '…Ba6 trades off White’s strong light-squared bishop and frees Black’s game.', '…Ba6 — trade the good bishop'],
    ],
    arrow: { at: 7, from: 'c8', to: 'a6' },
  },
  {
    id: 'mp-pro-caruana-nimzo-isolani', oid: 'pro-caruana-nimzo-indian', color: 'b', src: NIM,
    fen: 'rnbq1rk1/pp3ppp/4pn2/2p5/1bBP4/2N1PN2/PP3PPP/R1BQK2R w KQ - 1 8',
    title: 'Play Against the Centre: …Nc6 and …Ba5',
    goals: ['c6', 'a5', 'e7'], pawn: null, piece: '…Nc6 pressure d4, …Ba5 keep the pin',
    line: [
      ['O-O', 'White castles to safety.', 'O-O — White castles'],
      ['Nc6', '…Nc6 develops and presses the d4-pawn.', '…Nc6 — pressure d4'],
      ['a3', 'a3 questions the b4-bishop.', 'a3 — question the bishop'],
      ['Ba5', '…Ba5 keeps the pin on the c3-knight, holding the tension.', '…Ba5 — keep the pin'],
      ['Qc2', 'White connects and eyes the kingside.', 'Qc2 — connect'],
      ['Qe7', '…Qe7 connects the rooks and eyes the centre; Black has comfortable, active play against the isolated d4-pawn.', '…Qe7 — active and sound'],
    ],
    arrow: { at: 1, from: 'b8', to: 'c6' },
  },
  {
    id: 'mp-pro-caruana-french-storm', oid: 'pro-caruana-french', color: 'b', src: FR,
    fen: 'rnb1k2r/pppnqpp1/4p2p/3pP3/3P3P/2N5/PPP2PP1/R2QKBNR w KQkq - 0 8',
    title: 'Counter the Storm: …Nb6 and …h5',
    goals: ['g6', 'b6', 'h5'], pawn: '…h5 stop the storm', piece: '…Nb6 develop',
    line: [
      ['Qg4', 'White swings the queen out toward the kingside.', 'Qg4 — eye the kingside'],
      ['g6', '…g6 blunts the queen and shores up the dark squares.', '…g6 — blunt the queen'],
      ['O-O-O', 'White castles long, committing to the attack.', 'O-O-O — opposite wings'],
      ['Nb6', '…Nb6 develops the knight toward c4 and the queenside.', '…Nb6 — develop, eye c4'],
      ['f4', 'White builds the kingside pawn storm.', 'f4 — build the storm'],
      ['h5', '…h5 slams the door, fixing White’s g-pawn and stopping the storm cold while Black plays on the queenside.', '…h5 — slam the door'],
    ],
    arrow: { at: 3, from: 'd7', to: 'b6' },
  },
  {
    id: 'mp-pro-caruana-caro-solid', oid: 'pro-caruana-caro-kann', color: 'b', src: CK,
    fen: 'r2qkbnr/pp1n1ppp/2p1p3/3p3b/3PP3/2N2N1P/PPP1BPP1/R1BQK2R w KQkq - 1 7',
    title: 'Solid and Flexible: …Ne7 and …h6',
    goals: ['a6', 'h6', 'e7'], pawn: '…a6 queenside space', piece: '…Ne7 develop',
    line: [
      ['a3', 'White grabs a little queenside space.', 'a3 — White expands'],
      ['a6', '…a6 mirrors, keeping the queenside flexible.', '…a6 — flexible space'],
      ['Be3', 'White develops the dark bishop.', 'Be3 — develop'],
      ['h6', '…h6 makes a safe square and stops Ng5 ideas.', '…h6 — make a safe square'],
      ['Bd3', 'White redeploys the bishop toward the kingside.', 'Bd3 — redeploy'],
      ['Ne7', '…Ne7 develops the knight toward f5 or g6; Black is rock-solid with no weaknesses.', '…Ne7 — rock-solid'],
    ],
    arrow: null,
  },
  {
    id: 'mp-pro-caruana-kid-storm', oid: 'pro-caruana-kid', color: 'b', src: KI,
    fen: 'rnbq1rk1/ppp1ppbp/3p1np1/8/2PPP3/2N5/PP2BPPP/R1BQK1NR w KQ - 2 6',
    title: 'The King’s Indian Break: …e5 and …a5',
    goals: ['e5', 'a5', 'h6'], pawn: '…e5 central break, …a5 queenside', piece: null,
    line: [
      ['h3', 'White props the centre and prevents …Ng4.', 'h3 — prevent …Ng4'],
      ['e5', '…e5 strikes the centre — the soul of the King’s Indian.', '…e5 — the break'],
      ['d5', 'White closes with d5, locking the centre.', 'd5 — close the centre'],
      ['a5', '…a5 grabs queenside space and fixes White’s pawns before the kingside storm.', '…a5 — queenside space'],
      ['Bg5', 'White pins the f6-knight.', 'Bg5 — pin'],
      ['h6', '…h6 questions the g5-bishop; with the centre locked, Black has the kingside play and White the queenside — the classic King’s Indian battle.', '…h6 — the King’s Indian battle'],
    ],
    arrow: null,
  },
];

const out = [];
for (const p of PLANS) {
  const c = new Chess(p.fen);
  const moves = [], annotations = [], learnCues = [], arrows = [], highlights = [];
  let demo = false;
  p.line.forEach(([san, ann, cue], i) => {
    const mover = c.turn();
    let m; try { m = c.move(san); } catch (e) { throw new Error(`${p.id} illegal ${san}: ${e.message}`); }
    moves.push(m.san); annotations.push(ann); learnCues.push(cue);
    if (mover === p.color && p.goals.includes(m.to)) demo = true;
    const hl = [{ square: m.to, color: ORANGE }];
    if (mover === p.color && p.goals.includes(m.to)) hl.push({ square: m.to, color: YELLOW });
    highlights.push(hl);
    arrows.push(p.arrow && p.arrow.at === i ? [{ from: p.arrow.from, to: p.arrow.to, color: GREEN }] : []);
  });
  if (!demo) throw new Error(`${p.id} theme not demonstrated on ${p.goals.join('/')}`);
  if (p.arrow) {
    const cc = new Chess(p.fen);
    for (let i = 0; i < p.arrow.at; i++) cc.move(p.line[i][0]);
    const pc = cc.get(p.arrow.from);
    if (!pc || pc.type === 'p') throw new Error(`${p.id} arrow origin ${p.arrow.from} is ${pc ? pc.type : 'empty'} (must be non-pawn)`);
    if (!cc.moves({ verbose: true }).some((m) => m.from === p.arrow.from && m.to === p.arrow.to)) throw new Error(`${p.id} arrow ${p.arrow.from}->${p.arrow.to} no clear sight-line`);
  }
  const pawnBreaks = [], pieceManeuvers = [];
  if (p.pawn) pawnBreaks.push({ move: p.pawn, explanation: p.title, fen: '' });
  if (p.piece) pieceManeuvers.push({ piece: '', route: p.piece, explanation: p.title });
  out.push({
    id: p.id, openingId: p.oid, criticalPositionFen: p.fen, title: p.title,
    overview: `${p.title} — a data-derived plan from Caruana's games, picking up exactly where the opening leaves off.`,
    pawnBreaks, pieceManeuvers, strategicThemes: [p.title], endgameTransitions: [],
    playableLines: [{ fen: p.fen, moves, annotations, learnCues, arrows, highlights, title: p.title, intro: p.title, sources: p.src }],
  });
}
const path = 'src/data/middlegame-plans.json';
const all = JSON.parse(readFileSync(path, 'utf8'));
const kept = all.filter((x) => !(x.openingId || '').startsWith('pro-caruana'));
writeFileSync(path, JSON.stringify([...kept, ...out], null, 2) + '\n');
console.error(`wrote ${out.length} caruana plans | ${kept.length + out.length} total`);
for (const p of out) console.error('  ' + p.id);

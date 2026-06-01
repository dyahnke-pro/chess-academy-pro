import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const ORANGE = 'rgba(255, 165, 0, 0.55)', GREEN = 'rgba(40,185,95,0.92)', YELLOW = 'rgba(255,214,0,0.88)';

const NAJ = ['concept:pos-king-safety', 'concept:pos-material', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];
const RUY = ['concept:pos-material', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Ruy_Lopez', 'https://www.chess.com/openings/Ruy-Lopez-Opening', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];
const IT = ['concept:pos-material', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Italian_Game', 'https://www.chess.com/openings/Italian-Game', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];
const FR = ['concept:pos-material', 'concept:pawn-minority-attack', 'https://en.wikipedia.org/wiki/French_Defence', 'https://www.chess.com/openings/French-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];
const KI = ['concept:pos-material', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence', 'https://www.chess.com/openings/Kings-Indian-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

// Endgame plans, grounded in a REAL Caruana game that played the same variation,
// anchored at the transition FEN, teaching the conversion. id suffix -endgame.
const PLANS = [
  {
    id: 'mp-pro-caruana-najdorf-endgame', oid: 'pro-caruana-najdorf', color: 'b', src: NAJ,
    fen: '8/6k1/3p2p1/3Pnp1p/2P5/8/2B3PP/7K w - - 0 40',
    title: 'Najdorf ENDGAME — the Dominant Knight (vs KChor05)',
    overview: "From his Najdorf, Caruana converts a knight-versus-bishop ending: with the pawns fixed on both colours the knight is the better piece. The king marches into the centre — …Kf6-e5-d4 — while the knight on d3 ties White down, and Black simply collects the c4-pawn. The lesson: in a fixed-pawn ending the knight outshines the bishop, and the king is a fighting piece.",
    goals: ['f6', 'd3', 'e5', 'd4', 'c4'], pawn: null, piece: '…Kf6-e5-d4 king march, …Nd3 dominant knight',
    line: [
      ['Bb3', 'White tries to activate the bishop.', 'Bb3 — White activates'],
      ['Kf6', '…Kf6 begins the king march toward the centre.', '…Kf6 — march the king'],
      ['g3', 'White makes luft.', 'g3 — White waits'],
      ['Nd3', '…Nd3 plants the knight on a dominant central square, tying White down.', '…Nd3 — the dominant knight'],
      ['Kg2', 'White shuffles the king.', 'Kg2 — White shuffles'],
      ['Ke5', '…Ke5 — the king strides into the centre, a fighting piece in the ending.', '…Ke5 — the king fights'],
      ['Kf3', 'White tries to hold.', 'Kf3 — White holds'],
      ['Kd4', '…Kd4 — the king reaches the heart of the board, attacking c4.', '…Kd4 — into the heart'],
      ['Ba4', 'White cannot defend everything.', 'Ba4 — White is stretched'],
      ['Kxc4', '…Kxc4 collects the pawn; the king-and-knight duo wins the ending.', '…Kxc4 — collect the pawn'],
    ],
    arrow: { at: 3, from: 'e5', to: 'd3' },
  },
  {
    id: 'mp-pro-caruana-ruy-lopez-endgame', oid: 'pro-caruana-ruy-lopez', color: 'w', src: RUY,
    fen: 'k6r/1pp2p2/p1p1r3/4N3/4nP1p/2P5/PP5p/3R1R1K w - - 0 43',
    title: 'Ruy ENDGAME — the Octopus Knight (vs Abund)',
    overview: "Out of his d3 Ruy, Caruana shows how an active knight rules a rook ending. The knight tours the board — Ng6, Nf8, Nd7, Ne5 — hopping into Black's camp, hitting pawns and harassing the rooks, while White's rooks own the open files. The lesson: in a rook ending a centralised, infiltrating knight is worth a tempo a move; keep it dancing.",
    goals: ['h2', 'g6', 'f8', 'd7', 'e5'], pawn: null, piece: 'Ng6-Nf8-Nd7-Ne5 knight tour',
    line: [
      ['Kxh2', 'White first collects the loose h2-pawn.', 'Kxh2 — grab the pawn'],
      ['Ng3', 'Black tries to activate his own knight.', '…Ng3 — Black activates'],
      ['Rf2', 'Rf2 keeps the rook active and shields the king.', 'Rf2 — active rook'],
      ['f6', 'Black props his structure.', '…f6 — prop the pawns'],
      ['Ng6', 'Ng6 — the knight begins its tour into Black’s position.', 'Ng6 — the knight tours'],
      ['Rh6', 'Black contests with the rook.', '…Rh6 — contest'],
      ['Nf8', 'Nf8 — the knight hops deeper, eyeing d7 and Black’s weak pawns.', 'Nf8 — hop deeper'],
      ['Re8', 'Black shuffles.', '…Re8 — Black shuffles'],
      ['Nd7', 'Nd7 — the octopus knight lands in the heart of Black’s camp, forking the pawns and dominating. White is winning.', 'Nd7 — the octopus knight'],
    ],
    arrow: { at: 8, from: 'f8', to: 'd7' },
  },
  {
    id: 'mp-pro-caruana-italian-endgame', oid: 'pro-caruana-italian', color: 'w', src: IT,
    fen: '6k1/1p3pp1/p1p2nnp/P3p3/1PN1P3/2Pr2PP/3N1P1K/4R3 w - - 0 29',
    title: 'Italian ENDGAME — King and Rook Activity (vs michaelq2d5)',
    overview: "From his Pianissimo, Caruana converts a knight ending the modern way: activate the king. With queens off, the king walks up the board — Kg2-f1-e2 — to support the rook and the queenside majority, while the c4-knight blockades. The lesson: in a same-material ending the player whose king joins the fight first usually wins.",
    goals: ['c1', 'g2', 'f1', 'e2', 'h4'], pawn: 'h4 fix the kingside', piece: 'Kg2-f1-e2 king march',
    line: [
      ['Rc1', 'Rc1 swings the rook to the half-open c-file behind the passed a-pawn.', 'Rc1 — the c-file'],
      ['Kf8', 'Black brings his king toward the centre too.', '…Kf8 — Black’s king comes'],
      ['Kg2', 'Kg2 — the king starts its march to support the queenside.', 'Kg2 — march the king'],
      ['Ke7', 'Black hurries his king up.', '…Ke7 — Black hurries'],
      ['Kf1', 'Kf1 — the king keeps walking toward the centre.', 'Kf1 — keep walking'],
      ['h5', 'Black grabs kingside space.', '…h5 — Black expands'],
      ['Ke2', 'Ke2 — the king reaches the centre, ready to escort the queenside pawns.', 'Ke2 — into the centre'],
      ['Rd8', 'Black contests the d-file.', '…Rd8 — contest'],
      ['h4', 'h4 fixes the kingside; with the active king and the a-pawn, White presses for the win.', 'h4 — fix and press'],
    ],
    arrow: null,
  },
  {
    id: 'mp-pro-caruana-french-endgame', oid: 'pro-caruana-french', color: 'b', src: FR,
    fen: '2k2r1r/1pp1np2/1n2p1p1/1p1pP1Np/3P1P1P/PP6/2P1N1P1/2KR3R b - - 0 19',
    title: 'French ENDGAME — the …Nf5 Outpost (vs ilqar_74)',
    overview: "From his Classical French, Caruana simplifies early into a maneuvering ending and shows the French dream square: …Nf5. The knight lands on the hole in front of White's chain, untouchable and dominant, while the king walks to c7 and the knights reroute. The lesson: in the French, the f5-outpost for a knight is worth a pawn — plant it and the position plays itself.",
    goals: ['f5', 'c6', 'c7', 'c8', 'e7'], pawn: null, piece: '…Nf5 outpost, …Kc7 king march, …Nc8-e7 reroute',
    line: [
      ['Nf5', '…Nf5 — the knight occupies the great French outpost, dominant and immune.', '…Nf5 — the French outpost'],
      ['Rh3', 'White shuffles the rook.', 'Rh3 — White shuffles'],
      ['c6', '…c6 shores up the centre and the d5-pawn.', '…c6 — shore up d5'],
      ['Kb2', 'White tucks the king.', 'Kb2 — White tucks'],
      ['Kc7', '…Kc7 — the king walks toward the centre, a fighting piece.', '…Kc7 — march the king'],
      ['Nc1', 'White reroutes his knight.', 'Nc1 — White reroutes'],
      ['Nc8', '…Nc8 reroutes the other knight toward the kingside via e7.', '…Nc8 — reroute the knight'],
      ['c3', 'White props his structure.', 'c3 — White props'],
      ['Nce7', '…Nce7 completes the regrouping; Black’s pieces are perfectly placed and he presses the win.', '…Nce7 — perfectly placed'],
    ],
    arrow: { at: 0, from: 'e7', to: 'f5' },
  },
  {
    id: 'mp-pro-caruana-kid-endgame', oid: 'pro-caruana-kid', color: 'b', src: KI,
    fen: 'r5k1/1ppb4/3p2p1/2nPp1b1/p1P1P1P1/P1N4P/1PB2rN1/1K1R3R w - - 0 27',
    title: 'KID ENDGAME — the …Nd3 Infiltration (vs rpragchess)',
    overview: "From his King's Indian, Caruana converts a heavy-piece ending with a knight infiltration. The …Nd3 jump forces a favourable trade, and the …Bd4 outpost dominates the dark squares while the rook doubles to the 2nd rank. The lesson: a knight on d3 (or the dark-squared bishop on d4) deep in the enemy camp is a permanent thorn that wins the ending.",
    goals: ['e3', 'd3', 'd4'], pawn: null, piece: '…Be3 outpost, …Nxd3 trade, …Bd4 dominance',
    line: [
      ['Ne1', 'White reroutes the knight to challenge Black’s active rook.', 'Ne1 — reroute'],
      ['Be3', '…Be3 — the bishop seizes a strong outpost, eyeing the queenside.', '…Be3 — the bishop outpost'],
      ['Nd3', 'White’s knight jumps to d3, offering a trade.', 'Nd3 — White offers a trade'],
      ['Nxd3', '…Nxd3 — Black takes on Black’s terms, eliminating White’s active piece.', '…Nxd3 — take the knight'],
      ['Rxd3', 'White recaptures with the rook.', 'Rxd3 — recapture'],
      ['Bd4', '…Bd4 — the dark-squared bishop dominates the long diagonal, an unassailable monster. With the better minor piece and active rooks, Black presses the win.', '…Bd4 — the dominant bishop'],
    ],
    arrow: { at: 3, from: 'c5', to: 'd3' },
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
    if (!pc || pc.type === 'p') throw new Error(`${p.id} arrow origin ${p.arrow.from} is ${pc ? pc.type : 'empty'}`);
    if (!cc.moves({ verbose: true }).some((m) => m.from === p.arrow.from && m.to === p.arrow.to)) throw new Error(`${p.id} arrow no sight-line`);
  }
  const pawnBreaks = [], pieceManeuvers = [];
  if (p.pawn) pawnBreaks.push({ move: p.pawn, explanation: p.title, fen: '' });
  if (p.piece) pieceManeuvers.push({ piece: '', route: p.piece, explanation: p.title });
  out.push({
    id: p.id, openingId: p.oid, criticalPositionFen: p.fen, title: p.title, overview: p.overview,
    pawnBreaks, pieceManeuvers, strategicThemes: [p.title],
    endgameTransitions: ['The opening structure converts directly into this winning ending.'],
    playableLines: [{ fen: p.fen, moves, annotations, learnCues, arrows, highlights, title: p.title, intro: p.overview, sources: p.src }],
  });
}
const path = 'src/data/middlegame-plans.json';
const all = JSON.parse(readFileSync(path, 'utf8'));
const kept = all.filter((x) => !(x.id || '').match(/^mp-pro-caruana-.*-endgame$/));
writeFileSync(path, JSON.stringify([...kept, ...out], null, 2) + '\n');
console.error('wrote ' + out.length + ' caruana endgame plans | ' + (kept.length + out.length) + ' total');

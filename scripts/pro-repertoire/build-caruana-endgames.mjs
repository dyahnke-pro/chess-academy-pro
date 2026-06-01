import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const ORANGE = 'rgba(255, 165, 0, 0.55)', GREEN = 'rgba(40,185,95,0.92)', YELLOW = 'rgba(255,214,0,0.88)';

const NAJ = ['concept:pos-king-safety', 'concept:pos-material', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

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

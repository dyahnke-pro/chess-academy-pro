#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-anti-caro';
const scan = JSON.parse(fs.readFileSync('/tmp/aman-model-games.json', 'utf8'))[ID];
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const VIS = 'rgba(40,185,95,0.92)';
const SRC = ['book:caro-kann', 'concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense-Two-Knights-Attack'];

const REP = {
  id: ID, playerId: 'aman', eco: 'B11', name: 'Caro-Kann Two Knights (White) (Aman)',
  color: 'white', style: 'Easy, Effective',
  pgn: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 dxe4 Qxe4 Nf6 Qd3 Nbd7 Be2 Bd6 O-O O-O Rd1',
  overview: "Aman Hambleton's best-scoring White opening — an eye-popping 83.5% across 448 games — the Two Knights Attack against the Caro-Kann (2.Nc3 and 3.Nf3). It sidesteps the heavy Caro main lines entirely for fast, natural development: both knights out, meet the …Bg4 pin with h3 and Qxf3 to grab the bishop pair, then centralise the queen and reach a comfortable middlegame with more space and the better structure. No memorization, just good moves that score — the purest expression of the Building-Habits philosophy.",
  keyIdeas: [
    'Develop both knights fast with Nc3 and Nf3 — sidestep the Caro theory.',
    'Meet …Bg4 with h3 and Qxf3 to win the bishop pair.',
    'Centralise the queen and keep a small, durable space edge.',
    'Castle and press with central pressure — simple and effective.',
  ],
  traps: [], warnings: ['The Two Knights is about smooth development, not a quick knockout — don’t over-press for an attack; convert the bishop pair and the space slowly.'],
  trapLines: [], warningLines: [],
  sources: ['book:caro-kann', 'concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense-Two-Knights-Attack', 'https://api.chess.com/pub/player/chessbrah/games/archives'],
  variations: [
    { name: 'Two Knights (…Bg4)', pgn: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 dxe4 Qxe4 Nf6 Qd3 Nbd7 Be2 Bd6 O-O O-O Rd1',
      explanation: 'His main line (94 games). h3 and Qxf3 win the bishop pair; White centralises and presses with a comfortable space edge.', sources: SRC },
    { name: 'vs …dxe4', pgn: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4 Nf6 Ne5 e6 Qe2 Bd6 d4 O-O O-O',
      explanation: 'When Black trades …dxe4 directly, White centralises the queen, plants a knight on e5, and reaches a dominant positional bind.', sources: SRC },
  ],
};

function recompute(g) { const w = (g.white || '').toLowerCase() === 'chessbrah'; return { opp: w ? g.black : g.white, oppElo: w ? g.blackElo : g.whiteElo }; }
const VLAB = { 'two-knights-bg4': 'Two Knights vs …Bg4', 'two-knights-dxe4': 'Two Knights vs …dxe4', 'g6-line': 'Two Knights vs …g6' };
const VSTORY = {
  'two-knights-bg4': 'the h3/Qxf3 bishop-pair grab and the comfortable central squeeze',
  'two-knights-dxe4': 'the centralised queen, the e5-knight outpost, and the positional bind',
  'g6-line': 'the fast development and the easy space edge against the fianchetto',
};
const models = [];
for (const [vk, arr] of Object.entries(scan)) arr.forEach((g, i) => {
  const r = recompute(g); const yr = (g.date || '').slice(0, 4);
  models.push({ id: `mg-${ID}-${vk}-${i}`, openingId: ID, white: g.white, black: g.black, whiteElo: g.whiteElo, blackElo: g.blackElo, result: g.result, year: +yr || undefined, event: `chess.com ${g.timeClass} (${g.date})`, pgn: g.pgn, sourceUrl: g.url, studentSide: 'white',
    overview: `Hambleton's ${VLAB[vk] || 'Two Knights'} in action: a ${g.timeClass} win over ${r.opp} (${r.oppElo}) in ${yr}. Watch ${VSTORY[vk] || 'the Two Knights squeeze'}. A clean model of the plan working against a strong opponent.` });
});

function planLine(fen, tail, ann, cues, arrSpec) {
  const c = new Chess(fen); const arrows = []; const hl = [];
  for (let i = 0; i < tail.length; i++) { const mv = c.move(tail[i]); hl.push([{ square: mv.to, color: ORANGE }]); arrows.push(arrSpec[i] ? [{ from: arrSpec[i][0], to: arrSpec[i][1], color: VIS }] : []); }
  return { fen, moves: tail, annotations: ann, learnCues: cues, arrows, highlights: hl, sources: SRC };
}

// from his win vs Sammed_Shete (anchor 18): real legal tail O-O/Rd1/Ne4/Qxe4.
const PLANS = [
  { id: 'mp-proamananticaro-bg4', openingId: ID, title: 'Centralise, Castle, and Press the d-file',
    overview: "With the bishop pair in hand, White castles, lifts the rook to d1 to back the centre, and re-routes the knight to e4 to dominate the central squares. The small space edge and the better minor pieces add up to a comfortable, pressing middlegame.",
    pawnBreaks: [], pieceManeuvers: [{ piece: 'knight', route: 'Nc3-e4 central post', explanation: 'The knight jumps to e4, dominating the centre and eyeing key squares.' }],
    strategicThemes: ['Castle, take the d-file, and post the knight on e4'], endgameTransitions: [],
    fen: 'r2qk2r/pp1n1ppp/2pbpn2/8/3P4/2NQ3P/PPP1BPP1/R1B1K2R w KQkq - 5 10',
    tail: ['O-O', 'O-O', 'Rd1', 'Re8', 'Ne4', 'Nxe4', 'Qxe4', 'Nf6'],
    ann: ['O-O tucks the king away safely.', '…O-O Black castles too.', 'Rd1 backs the d4-pawn and takes the file.', '…Re8 contests the e-file.', 'Ne4 jumps to the dominant central post.', '…Nxe4 trades it off.', 'Qxe4 recaptures, keeping the queen centralised.', '…Nf6 hits the queen.'],
    cues: ['O-O — king safe', '…O-O — Black castles', 'Rd1 — take the d-file', '…Re8 — contest e-file', 'Ne4 — central post', '…Nxe4 — trade', 'Qxe4 — centralise', '…Nf6 — hit the queen'],
    arrSpec: [null, null, ['f1', 'd1'], null, ['c3', 'e4'], null, ['d3', 'e4'], null] },
];

const reps = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8'));
reps.openings = reps.openings.filter((x) => x.id !== ID); reps.openings.push(REP);
fs.writeFileSync('src/data/pro-repertoires.json', JSON.stringify(reps, null, 2) + '\n');
const mg = JSON.parse(fs.readFileSync('src/data/model-games.json', 'utf8'));
const keep = mg.filter((x) => x.openingId !== ID);
// only keep models for the two tabs that have lessons (bg4, dxe4)
fs.writeFileSync('src/data/model-games.json', JSON.stringify([...keep, ...models.filter((m) => m.id.includes('two-knights'))], null, 2) + '\n');
const plans = JSON.parse(fs.readFileSync('src/data/middlegame-plans.json', 'utf8'));
const kept = plans.filter((p) => p.openingId !== ID);
for (const P of PLANS) { const { fen, tail, ann, cues, arrSpec, ...meta } = P; kept.push({ ...meta, playableLines: [planLine(fen, tail, ann, cues, arrSpec)] }); }
fs.writeFileSync('src/data/middlegame-plans.json', JSON.stringify(kept, null, 2) + '\n');
console.log(`ANTI-CARO: entry + ${models.filter((m) => m.id.includes('two-knights')).length} model games + ${PLANS.length} plan written & verified`);

#!/usr/bin/env node
// Caro-Kann data layers for Aman: pro-repertoires.json entry, model games,
// 2 middlegame plans (continuations verified legal). Idempotent.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-caro-kann';
const scan = JSON.parse(fs.readFileSync('/tmp/aman-model-games.json', 'utf8'))[ID];
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const VIS = 'rgba(40,185,95,0.92)';
const SRC = ['book:chess-fundamentals', 'concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense'];
function fenAfter(s) { const c = new Chess(); for (const m of s) c.move(m); return c.fen(); }

const REP = {
  id: ID, playerId: 'aman', eco: 'B12', name: 'Caro-Kann Defense (Aman)',
  color: 'black', style: 'Solid, Classical',
  pgn: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7 O-O Ne7 Nh4 Bg6',
  overview: "Aman Hambleton's solid Black backup (986 games, 75.3%) — the Caro-Kann, his choice for a quieter, low-risk game. The whole point shows in the Advance: after e5 he plays the classical …Bf5, developing the light-squared bishop OUTSIDE the pawn chain — the very piece that stays trapped in the French. Black builds a solid wall behind the freed bishop, reroutes the knight toward g6, and plays for the …c5 and …f6 breaks against White's centre. Comfortable equality with no weaknesses.",
  keyIdeas: [
    'Get the light bishop OUT to f5 before building the pawn chain.',
    'Build the wall with …e6 and reroute …Ne7-g6 to pressure e5.',
    'Break with …c5 and …f6 to challenge White’s advanced centre.',
    'Low-risk, no weaknesses — outplay from a sound base.',
  ],
  traps: [], warnings: ['In the Advance, never lock the light bishop in with an early …e6 before …Bf5 — that turns the Caro into a bad French.'],
  trapLines: [], warningLines: [],
  sources: ['book:chess-fundamentals', 'concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense', 'https://api.chess.com/pub/player/chessbrah/games/archives'],
  variations: [
    { name: 'Advance (…Bf5)', pgn: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7 O-O Ne7 Nh4 Bg6',
      explanation: 'His main line. The classical …Bf5 frees the bishop; Black builds the wall, reroutes …Ne7-g6, and keeps the bishop with …Bg6 when White tries Nh4.', sources: SRC },
    { name: 'vs Two Knights (2.Nf3)', pgn: 'e4 c6 Nf3 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6 d4 O-O Bd3 Re8+ Be3 Bg4 Qc2 Nd7',
      explanation: '235 games. Trade in the centre with …dxe4, challenge with …Nf6, recapture …exf6, and develop …Bd6/…Re8/…Bg4 into an easy, sound middlegame.', sources: SRC },
    { name: 'vs Exchange (3.exd5)', pgn: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Qc7 Ne2 Bg4',
      explanation: '125 games. Symmetrical and easy: …Nc6, …Qc7 on the half-open c-file, and the active …Bg4 pin for full equality.', sources: SRC },
  ],
};

function recompute(g) { const w = (g.white || '').toLowerCase() === 'chessbrah'; return { opp: w ? g.black : g.white, oppElo: w ? g.blackElo : g.whiteElo }; }
const VLAB = { 'advance-bf5': 'Advance', 'two-knights': 'Two Knights', 'exchange': 'Exchange' };
const VSTORY = {
  'advance-bf5': 'the freed …Bf5 bishop, the solid wall, and the …c5 break against White’s centre',
  'two-knights': 'the clean central trade and easy development to full equality',
  'exchange': 'turning the symmetrical Exchange into an active, comfortable game with the …Bg4 pin',
};
const models = [];
for (const [vk, arr] of Object.entries(scan)) arr.forEach((g, i) => {
  const r = recompute(g); const yr = (g.date || '').slice(0, 4);
  models.push({ id: `mg-${ID}-${vk}-${i}`, openingId: ID, white: g.white, black: g.black, whiteElo: g.whiteElo, blackElo: g.blackElo, result: g.result, year: +yr || undefined, event: `chess.com ${g.timeClass} (${g.date})`, pgn: g.pgn, sourceUrl: g.url, studentSide: 'black',
    overview: `Hambleton's ${VLAB[vk]} Caro in action: a ${g.timeClass} win over ${r.opp} (${r.oppElo}) in ${yr}. Watch ${VSTORY[vk]}. A clean model of the plan working against a strong opponent.` });
});

function planLine(spine, tail, ann, cues, arr) {
  const fen = fenAfter(spine); const c = new Chess(fen); const arrows = []; const hl = [];
  for (let i = 0; i < tail.length; i++) { const mv = c.move(tail[i]); hl.push([{ square: mv.to, color: ORANGE }]); arrows.push(arr[i] ? [{ from: arr[i][0], to: arr[i][1], color: VIS }] : []); }
  return { fen, moves: tail, annotations: ann, learnCues: cues, arrows, highlights: hl, sources: SRC };
}

const PLANS = [
  { id: 'mp-proamancaro-advance', openingId: ID, title: 'The …c5 Break Against the Advance',
    overview: "With the bishop already outside and the wall built, Black hits White's centre with …c5. The break opens lines for the pieces and dissolves White's space — the comfortable Caro plan in action.",
    pawnBreaks: ['...c5 central break'], pieceManeuvers: [{ piece: 'knight', route: '...Nc6 pressure', explanation: 'The knight comes to c6 to hit d4.' }],
    strategicThemes: ['Break with …c5 to challenge White’s advanced centre'], endgameTransitions: [],
    spine: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7 O-O Ne7 Nh4 Bg6'.split(' '),
    tail: ['Nxg6', 'hxg6', 'Nd2', 'c5', 'c3', 'Nc6', 'dxc5', 'Nxc5'],
    ann: ['White trades the bishop.', '…hxg6 recaptures, opening the h-file.', 'White redeploys.', '…c5 strikes the centre.', 'White props d4.', '…Nc6 piles on d4.', 'White takes.', '…Nxc5 recaptures with a fine knight.'],
    cues: ['Nxg6 — trade', '…hxg6 — open h-file', 'Nd2 — redeploy', '…c5 — strike centre', 'c3 — prop d4', '…Nc6 — pile on', 'dxc5 — White takes', '…Nxc5 — recapture'],
    arr: [null, null, null, null, null, ['d7', 'c6'], null, ['d7', 'c5']] },
  { id: 'mp-proamancaro-twoknights', openingId: ID, title: 'Easy Development and the …Bg4 Pin',
    overview: "In the Two Knights structure Black completes development smoothly — castle, rook to the half-open e-file, and the active …Bg4 pin. The harmonious pieces and sound structure give comfortable equality.",
    pawnBreaks: [], pieceManeuvers: [{ piece: 'bishop', route: '...Bg4 pin', explanation: 'The bishop develops actively to g4, pinning a knight.' }],
    strategicThemes: ['Develop smoothly and activate the bishop with …Bg4'], endgameTransitions: [],
    spine: 'e4 c6 Nf3 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 c3 Bd6'.split(' '),
    tail: ['d4', 'O-O', 'Bd3', 'Re8+', 'Be3', 'Bg4', 'Qc2', 'Nd7'],
    ann: ['White builds the centre.', '…O-O tucks the king away.', 'White develops.', '…Re8+ uses the half-open file with check.', 'White blocks.', '…Bg4 develops with a pin.', 'White connects.', '…Nd7 completes development.'],
    cues: ['d4 — build centre', '…O-O — king safe', 'Bd3 — develop', '…Re8+ — use the file', 'Be3 — block', '…Bg4 — active pin', 'Qc2 — connect', '…Nd7 — complete'],
    arr: [null, null, null, ['f8', 'e8'], null, ['c8', 'g4'], null, ['b8', 'd7']] },
];

const reps = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8'));
reps.openings = reps.openings.filter((x) => x.id !== ID); reps.openings.push(REP);
fs.writeFileSync('src/data/pro-repertoires.json', JSON.stringify(reps, null, 2) + '\n');
const mg = JSON.parse(fs.readFileSync('src/data/model-games.json', 'utf8'));
fs.writeFileSync('src/data/model-games.json', JSON.stringify([...mg.filter((x) => x.openingId !== ID), ...models], null, 2) + '\n');
const plans = JSON.parse(fs.readFileSync('src/data/middlegame-plans.json', 'utf8'));
const kept = plans.filter((p) => p.openingId !== ID);
for (const P of PLANS) { const { spine, tail, ann, cues, arr, ...meta } = P; kept.push({ ...meta, playableLines: [planLine(spine, tail, ann, cues, arr)] }); }
fs.writeFileSync('src/data/middlegame-plans.json', JSON.stringify(kept, null, 2) + '\n');
console.log(`CARO: entry + ${models.length} model games + ${PLANS.length} plans written & verified`);

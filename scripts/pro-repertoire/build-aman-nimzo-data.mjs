#!/usr/bin/env node
// Nimzo-Indian data layers for Aman: pro-repertoires.json entry, model games,
// 2 middlegame plans (continuations verified legal via chess.js). Idempotent.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-nimzo-indian';
const scan = JSON.parse(fs.readFileSync('/tmp/aman-model-games.json', 'utf8'))[ID];
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const VIS = 'rgba(40,185,95,0.92)';
const SRC = ['book:chess-fundamentals', 'concept:pos-development', 'https://www.chess.com/openings/Nimzo-Indian-Defense'];

function fenAfter(sans) { const c = new Chess(); for (const m of sans) c.move(m); return c.fen(); }

const REP = {
  id: ID, playerId: 'aman', eco: 'E32', name: 'Nimzo-Indian Defense (Aman)',
  color: 'black', style: 'Hypermodern, Positional',
  pgn: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 dxc4 Bxc4 c5',
  overview: "Aman Hambleton's second Black weapon (1,140 games, 73.9%) — the Nimzo-Indian, the most respected answer to 1.d4. The defining move …Bb4 pins the c3-knight, fighting for the e4-square with pieces instead of pawns and threatening to wreck White's structure by trading on c3. In the main Rubinstein lines Black follows with …d5, …dxc4 and the freeing …c5 break, reaching a dynamic, comfortable middlegame where the pin still bites. Pure hypermodern chess: control the centre with pressure, then strike.",
  keyIdeas: [
    'Pin the c3-knight with …Bb4 to fight for the e4-square.',
    'Trade on c3 only when it damages White’s pawns or wins control of e4.',
    'Break with …d5 and …c5 to open the position for the active pieces.',
    'Keep the structure sound — equalise from a solid base, then outplay.',
  ],
  traps: [], warnings: ['The …Bb4 bishop is your trump — don’t trade it off cheaply; trade only to damage White’s pawns or win the e4-square.'],
  trapLines: [], warningLines: [],
  sources: ['book:chess-fundamentals', 'concept:pos-development', 'https://www.chess.com/openings/Nimzo-Indian-Defense', 'https://api.chess.com/pub/player/chessbrah/games/archives'],
  variations: [
    { name: 'Rubinstein (e3)', pgn: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 dxc4 Bxc4 c5',
      explanation: 'His main line. Against the solid e3, Black castles, plays …d5, captures …dxc4 with tempo, and breaks with …c5 for a comfortable, dynamic game.', sources: SRC },
    { name: 'Bogo-Indian (3.Nf3 Bb4+)', pgn: 'd4 Nf6 c4 e6 Nf3 Bb4+ Bd2 Be7 g3 d5 Bg2 O-O',
      explanation: '477 games. When White plays Nf3 first, …Bb4+ provokes Bd2, then …Be7 keeps a sound Catalan-style structure with the bishop pair intact.', sources: SRC },
    { name: 'Classical (4.Qc2)', pgn: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O e4 d6 e5 Nfd7',
      explanation: '121 games. Against Qc2 Black castles and meets the big e4-centre with …d6 and …Nfd7, ready to undermine with …c5 or …f6.', sources: SRC },
  ],
};

function recompute(g) { const w = (g.white || '').toLowerCase() === 'chessbrah'; return { opp: w ? g.black : g.white, oppElo: w ? g.blackElo : g.whiteElo }; }
const VLAB = { 'rubinstein-e3': 'Rubinstein', 'bogo-nf3': 'Bogo-Indian', 'classical-qc2': 'Classical Qc2' };
const VSTORY = {
  'rubinstein-e3': 'the …d5/…c5 break dissolving White’s centre while the …Bb4 pin keeps biting',
  'bogo-nf3': 'the …Bb4+ / …Be7 setup reaching a sound, comfortable structure with the bishop pair',
  'classical-qc2': 'meeting the big e4-centre with …d6 and …Nfd7, then chipping away at it',
};
const models = [];
for (const [vk, arr] of Object.entries(scan)) arr.forEach((g, i) => {
  const r = recompute(g); const yr = (g.date || '').slice(0, 4);
  models.push({ id: `mg-${ID}-${vk}-${i}`, openingId: ID, white: g.white, black: g.black, whiteElo: g.whiteElo, blackElo: g.blackElo, result: g.result, year: +yr || undefined, event: `chess.com ${g.timeClass} (${g.date})`, pgn: g.pgn, sourceUrl: g.url, studentSide: 'black',
    overview: `Hambleton's ${VLAB[vk]} Nimzo in action: a ${g.timeClass} win over ${r.opp} (${r.oppElo}) in ${yr}. Watch ${VSTORY[vk]}. A model of the plan converting against a strong opponent.` });
});

function planLine(spine, tail, annotations, learnCues, arrowSpec) {
  const fen = fenAfter(spine); const c = new Chess(fen); const arrows = []; const highlights = [];
  for (let i = 0; i < tail.length; i++) { const mv = c.move(tail[i]); highlights.push([{ square: mv.to, color: ORANGE }]); arrows.push(arrowSpec[i] ? [{ from: arrowSpec[i][0], to: arrowSpec[i][1], color: VIS }] : []); }
  return { fen, moves: tail, annotations, learnCues, arrows, highlights, sources: SRC };
}

const PLANS = [
  {
    id: 'mp-proamannimzo-rubinstein', openingId: ID,
    spine: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 dxc4 Bxc4'.split(' '),
    title: 'The …c5 Break and Pressure on d4',
    overview: "After …dxc4 lures the bishop to c4, Black strikes with …c5 to hit d4. With …Nc6 piling on and the trades opening the centre, Black reaches the comfortable, active Nimzo middlegame.",
    pawnBreaks: ['...c5 central break'],
    pieceManeuvers: [{ piece: 'knight', route: '...Nc6 pressure on d4', explanation: 'The knight develops to c6, adding a hit on the d4-pawn.' }],
    strategicThemes: ['Break with …c5 and pressure White’s d-pawn'],
    endgameTransitions: [],
    tail: ['c5', 'O-O', 'Nc6', 'a3', 'cxd4', 'exd4', 'Be7', 'd5'],
    annotations: ['…c5 strikes the d4-pawn.', 'White castles.', '…Nc6 piles on d4.', 'White gains space with a3.', '…cxd4 opens the centre.', 'White recaptures.', '…Be7 keeps the bishop, eyeing the d-pawn.', 'White pushes d5 to free himself.'],
    learnCues: ['…c5 — strike d4', 'O-O — castle', '…Nc6 — pile on d4', 'a3 — gain space', '…cxd4 — open centre', 'exd4 — recapture', '…Be7 — keep the bishop', 'd5 — White frees'],
    arrowSpec: [null, null, ['b8', 'c6'], null, null, null, ['b4', 'e7'], null],
  },
  {
    id: 'mp-proamannimzo-classical', openingId: ID,
    spine: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O e4 d6 e5 Nfd7'.split(' '),
    title: 'Undermining the Big Centre with …c5 and …Bxc3',
    overview: "Against the Qc2 big-centre setup, the knight sits on d7 and the break comes with …c5. The well-timed …Bxc3 damages White's pawns, and …dxe5 dissolves the centre before White's space can be made to count.",
    pawnBreaks: ['...c5 central break'],
    pieceManeuvers: [{ piece: 'bishop', route: '...Bxc3 structural trade', explanation: 'The bishop takes on c3 to inflict doubled pawns when the moment is right.' }],
    strategicThemes: ['Undermine the e4/d4 centre with …c5 and the well-timed …Bxc3'],
    endgameTransitions: [],
    tail: ['Bd3', 'c5', 'dxc5', 'Bxc3+', 'bxc3', 'dxe5', 'Nf3', 'Nc6'],
    annotations: ['White develops the bishop.', '…c5 hits the centre.', 'White takes on c5.', '…Bxc3+ damages the pawns.', 'White recaptures, doubling pawns.', '…dxe5 dissolves the big centre.', 'White develops.', '…Nc6 targets the weakened pawns.'],
    learnCues: ['Bd3 — develop', '…c5 — hit the centre', 'dxc5 — White takes', '…Bxc3 — damage pawns', 'bxc3 — doubled', '…dxe5 — dissolve centre', 'Nf3 — develop', '…Nc6 — target the pawns'],
    arrowSpec: [null, null, null, ['b4', 'c3'], null, null, null, ['b8', 'c6']],
  },
];

const reps = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8'));
reps.openings = reps.openings.filter((x) => x.id !== ID); reps.openings.push(REP);
fs.writeFileSync('src/data/pro-repertoires.json', JSON.stringify(reps, null, 2) + '\n');

const mg = JSON.parse(fs.readFileSync('src/data/model-games.json', 'utf8'));
fs.writeFileSync('src/data/model-games.json', JSON.stringify([...mg.filter((x) => x.openingId !== ID), ...models], null, 2) + '\n');

const plans = JSON.parse(fs.readFileSync('src/data/middlegame-plans.json', 'utf8'));
const keptPlans = plans.filter((p) => p.openingId !== ID);
for (const P of PLANS) { const { spine, tail, annotations, learnCues, arrowSpec, ...meta } = P; keptPlans.push({ ...meta, playableLines: [planLine(spine, tail, annotations, learnCues, arrowSpec)] }); }
fs.writeFileSync('src/data/middlegame-plans.json', JSON.stringify(keptPlans, null, 2) + '\n');

console.log(`NIMZO: entry + ${models.length} model games + ${PLANS.length} plans written & verified`);

#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-ruy-lopez';
const scan = JSON.parse(fs.readFileSync('/tmp/aman-model-games.json', 'utf8'))[ID];
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const VIS = 'rgba(40,185,95,0.92)';
const SRC = ['book:ruy-lopez', 'concept:pos-development', 'https://www.chess.com/openings/Ruy-Lopez-Opening'];

const REP = {
  id: ID, playerId: 'aman', eco: 'C84', name: 'Ruy Lopez (Aman)',
  color: 'white', style: 'Classical, Positional',
  pgn: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O h3 d6 c3',
  overview: "Aman Hambleton's main weapon against 1…e5 (552 games, 75.5%) — the Ruy Lopez, the oldest and most respected open-game opening. Bb5 pressures the e5-defender from move three, and in the Closed Morphy lines White builds the big centre slowly with h3, c3 and the eventual d4, leaving Black cramped. The Spanish bishop reroutes Ba4-b3-c2, always finding a useful diagonal, while the knights manoeuvre toward the kingside. A long-term squeeze that rewards patience and good habits over memorized tactics.",
  keyIdeas: [
    'Pin pressure on the c6-knight, the defender of e5.',
    'Reroute the bishop Ba4-Bb3-Bc2 to keep it active and aimed at the king.',
    'Build the big centre with h3, c3 and d4 — the Closed Ruy plan.',
    'Manoeuvre the knights toward the kingside and squeeze.',
  ],
  traps: [], warnings: ['The Ruy is a slow squeeze, not a quick attack — keep the centre tension, complete the c3/d4 build-up, and don’t release the pressure prematurely.'],
  trapLines: [], warningLines: [],
  sources: ['book:ruy-lopez', 'concept:pos-development', 'https://www.chess.com/openings/Ruy-Lopez-Opening', 'https://api.chess.com/pub/player/chessbrah/games/archives'],
  variations: [
    { name: 'Morphy (…a6)', pgn: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O h3 d6 c3 Na5 Bc2 c5 d4',
      explanation: 'The Closed Morphy main line. White reroutes the bishop to c2 and plays the big d4 break for a space-rich, comfortable squeeze.', sources: SRC },
    { name: 'Berlin (…Nf6)', pgn: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 c3 O-O O-O d6 h3 a6 Bxc6 bxc6 Re1 Ba7 Be3 Bxe3 Rxe3',
      explanation: '73 games. The modern d3 anti-Berlin avoids the drawish endgame and squeezes Black’s doubled c-pawns in a quiet middlegame.', sources: SRC },
  ],
};

function recompute(g) { const w = (g.white || '').toLowerCase() === 'chessbrah'; return { opp: w ? g.black : g.white, oppElo: w ? g.blackElo : g.whiteElo }; }
const VLAB = { 'morphy-a6': 'Closed Morphy', 'berlin': 'Anti-Berlin', 'exchange-a6': 'Exchange' };
const VSTORY = {
  'morphy-a6': 'the slow Closed-Ruy squeeze, the Ba4-Bb3-Bc2 reroute, and the big d4 break',
  'berlin': 'the d3 anti-Berlin squeezing Black’s doubled pawns in a quiet game',
  'exchange-a6': 'the Exchange structure with the long-term kingside pawn majority',
};
const models = [];
for (const [vk, arr] of Object.entries(scan)) arr.forEach((g, i) => {
  const r = recompute(g); const yr = (g.date || '').slice(0, 4);
  models.push({ id: `mg-${ID}-${vk}-${i}`, openingId: ID, white: g.white, black: g.black, whiteElo: g.whiteElo, blackElo: g.blackElo, result: g.result, year: +yr || undefined, event: `chess.com ${g.timeClass} (${g.date})`, pgn: g.pgn, sourceUrl: g.url, studentSide: 'white',
    overview: `Hambleton's ${VLAB[vk] || 'Ruy'} in action: a ${g.timeClass} win over ${r.opp} (${r.oppElo}) in ${yr}. Watch ${VSTORY[vk] || 'the Spanish squeeze'}. A clean model of the plan working against a strong opponent.` });
});

function planLine(fen, tail, ann, cues, arrSpec) {
  const c = new Chess(fen); const arrows = []; const hl = [];
  for (let i = 0; i < tail.length; i++) { const mv = c.move(tail[i]); hl.push([{ square: mv.to, color: ORANGE }]); arrows.push(arrSpec[i] ? [{ from: arrSpec[i][0], to: arrSpec[i][1], color: VIS }] : []); }
  return { fen, moves: tail, annotations: ann, learnCues: cues, arrows, highlights: hl, sources: SRC };
}

// Morphy plan: from his win vs PSGLGD (anchor 18), real legal tail.
const PLANS = [
  { id: 'mp-proamanruy-morphy', openingId: ID, title: 'The Bc2 Reroute and the d4 Break',
    overview: "The Spanish bishop slides to c2 and White plays the central d4 push — the engine of the Closed Ruy. With the knights ready to swing toward the kingside, White converts the space edge into a lasting squeeze.",
    pawnBreaks: ['d4 central break'], pieceManeuvers: [{ piece: 'knight', route: 'Nb1-d2 toward the kingside', explanation: 'The queen’s knight reroutes via d2 toward f1-g3, the classic Ruy manoeuvre.' }],
    strategicThemes: ['Reroute the bishop to c2 and play the big d4 break'], endgameTransitions: [],
    fen: 'r1bq1rk1/2p1bppp/p2p1n2/np2p3/4P3/1BP2N1P/PP1P1PP1/RNBQR1K1 w - - 1 10',
    tail: ['Bc2', 'c5', 'd4', 'Nd7', 'Nbd2', 'exd4', 'cxd4', 'Nc6'],
    ann: ['Bc2 reroutes the bishop toward the kingside.', '…c5 fights for the centre.', 'd4 plays the big central break.', '…Nd7 reroutes the knight.', 'Nbd2 heads for f1-g3.', '…exd4 opens the centre.', 'cxd4 recaptures, holding the big pawn centre.', '…Nc6 pressures d4.'],
    cues: ['Bc2 — reroute', '…c5 — fight centre', 'd4 — the big break', '…Nd7 — reroute', 'Nbd2 — toward g3', '…exd4 — open', 'cxd4 — hold the centre', '…Nc6 — pressure d4'],
    arrSpec: [['b3', 'c2'], null, null, null, ['b1', 'd2'], null, null, null] },
];

const reps = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8'));
reps.openings = reps.openings.filter((x) => x.id !== ID); reps.openings.push(REP);
fs.writeFileSync('src/data/pro-repertoires.json', JSON.stringify(reps, null, 2) + '\n');
const mg = JSON.parse(fs.readFileSync('src/data/model-games.json', 'utf8'));
fs.writeFileSync('src/data/model-games.json', JSON.stringify([...mg.filter((x) => x.openingId !== ID), ...models], null, 2) + '\n');
const plans = JSON.parse(fs.readFileSync('src/data/middlegame-plans.json', 'utf8'));
const kept = plans.filter((p) => p.openingId !== ID);
for (const P of PLANS) { const { fen, tail, ann, cues, arrSpec, ...meta } = P; kept.push({ ...meta, playableLines: [planLine(fen, tail, ann, cues, arrSpec)] }); }
fs.writeFileSync('src/data/middlegame-plans.json', JSON.stringify(kept, null, 2) + '\n');
console.log(`RUY: entry + ${models.length} model games + ${PLANS.length} plan written & verified`);

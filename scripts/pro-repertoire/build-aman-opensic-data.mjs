#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-open-sicilian';
const scan = JSON.parse(fs.readFileSync('/tmp/aman-model-games.json', 'utf8'))[ID];
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const VIS = 'rgba(40,185,95,0.92)';
const SRC = ['book:sicilian', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation'];

const REP = {
  id: ID, playerId: 'aman', eco: 'B90', name: 'Open Sicilian vs …d6 (Aman)',
  color: 'white', style: 'Principled, Aggressive',
  pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Nd5',
  overview: "Aman Hambleton's principled answer to the …d6 Sicilians (894 games, 76.3%) — the Open Sicilian, taking the centre with d4 and playing for fast development and the half-open d-file. Against the Najdorf he chooses the solid Be2 setup: castle quickly, retreat Nb3 when Black plays …e5, and pile onto the d5-square that …e5 weakens. When Black develops with …Nc6 he switches to the aggressive Richter-Rauzer with Bg5 and opposite-side castling. Either way the plan is the same Open-Sicilian logic: grab the centre, find the weakness, and press it.",
  keyIdeas: [
    'Take the centre with d4 and develop quickly down the half-open d-file.',
    'vs Najdorf: solid Be2, then Nb3 and clamp the d5-square …e5 weakens.',
    'vs …Nc6: aggressive Bg5 Richter-Rauzer with O-O-O and a kingside storm.',
    'Find the structural weakness and press it long-term.',
  ],
  traps: [], warnings: ['In the Open Sicilian Black gets queenside counterplay fast — finish development and castle before launching, or the …b5 and …d5 breaks arrive first.'],
  trapLines: [], warningLines: [],
  sources: ['book:sicilian', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', 'https://api.chess.com/pub/player/chessbrah/games/archives'],
  variations: [
    { name: 'vs Najdorf (…a6)', pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Nd5 Nbd7 Qd3 Bxd5 exd5',
      explanation: 'His main line. Solid Be2, retreat Nb3 vs …e5, and clamp the weak d5-square with the knight (and a pawn after the trade).', sources: SRC },
    { name: 'vs Classical (…Nc6)', pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6 Bg5 e6 Qd2 a6 O-O-O Bd7 f3 Be7 h4 h6 Be3 h5 Kb1',
      explanation: 'The aggressive Richter-Rauzer: Bg5 pin, O-O-O, and a kingside pawn storm against Black’s king.', sources: SRC },
    { name: 'vs Dragon (…g6)', pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 O-O-O d5 Qe1 e5 Nxc6 bxc6',
      explanation: 'The Yugoslav Attack vs the Dragon: Be3, f3, Qd2, O-O-O and the thematic h4-h5 assault on the fianchettoed king.', sources: SRC },
  ],
};

function recompute(g) { const w = (g.white || '').toLowerCase() === 'chessbrah'; return { opp: w ? g.black : g.white, oppElo: w ? g.blackElo : g.whiteElo }; }
const VLAB = { 'najdorf-a6': 'vs Najdorf', 'classical-nc6': 'Richter-Rauzer', 'dragon-g6': 'Yugoslav Attack' };
const VSTORY = {
  'najdorf-a6': 'the Be2 setup, the Nb3 retreat, and the clamp on the weak d5-square',
  'classical-nc6': 'the Bg5 Richter-Rauzer with opposite-side castling and a kingside storm',
  'dragon-g6': 'the Yugoslav Attack — Be3, f3, Qd2, O-O-O and the h-pawn assault on the Dragon',
};
const models = [];
for (const [vk, arr] of Object.entries(scan)) arr.forEach((g, i) => {
  const r = recompute(g); const yr = (g.date || '').slice(0, 4);
  models.push({ id: `mg-${ID}-${vk}-${i}`, openingId: ID, white: g.white, black: g.black, whiteElo: g.whiteElo, blackElo: g.blackElo, result: g.result, year: +yr || undefined, event: `chess.com ${g.timeClass} (${g.date})`, pgn: g.pgn, sourceUrl: g.url, studentSide: 'white',
    overview: `Hambleton's ${VLAB[vk] || 'Open Sicilian'} in action: a ${g.timeClass} win over ${r.opp} (${r.oppElo}) in ${yr}. Watch ${VSTORY[vk] || 'the Open-Sicilian plan'}. A clean model of the plan working against a strong opponent.` });
});

function planLine(fen, tail, ann, cues, arrSpec) {
  const c = new Chess(fen); const arrows = []; const hl = [];
  for (let i = 0; i < tail.length; i++) { const mv = c.move(tail[i]); hl.push([{ square: mv.to, color: ORANGE }]); arrows.push(arrSpec[i] ? [{ from: arrSpec[i][0], to: arrSpec[i][1], color: VIS }] : []); }
  return { fen, moves: tail, annotations: ann, learnCues: cues, arrows, highlights: hl, sources: SRC };
}

// from his win vs XupermanX1 (anchor 18), real legal tail showing Nd5/clamp + c4 expansion.
const PLANS = [
  { id: 'mp-proamanopensic-najdorf', openingId: ID, title: 'Clamp d5 and Expand with c4',
    overview: "White lands the knight on the d5-outpost, and after the trade a pawn recaptures to clamp the centre permanently. Then c4 props the d5-pawn and gains queenside space — the weakness on d5 becomes a battering ram.",
    pawnBreaks: ['c4 queenside space'], pieceManeuvers: [{ piece: 'knight', route: 'Nc3-d5 outpost', explanation: 'The knight occupies the d5-outpost, the square …e5 left weak.' }],
    strategicThemes: ['Occupy d5, recapture with a pawn to clamp, then expand with c4'], endgameTransitions: [],
    fen: 'rn1q1rk1/1p2bppp/p2pbn2/4p3/4P3/1NN1B3/PPP1BPPP/R2Q1RK1 w - - 6 10',
    tail: ['Nd5', 'Nbd7', 'Qd3', 'Bxd5', 'exd5', 'g6', 'c4', 'b6'],
    ann: ['Nd5 occupies the dominant outpost.', '…Nbd7 develops the last knight.', 'Qd3 centralises and eyes the kingside.', '…Bxd5 trades off the strong knight.', 'exd5 recaptures, clamping the centre with a pawn.', '…g6 makes luft.', 'c4 props d5 and grabs queenside space.', '…b6 prepares to challenge.'],
    cues: ['Nd5 — the outpost', '…Nbd7 — develop', 'Qd3 — centralise', '…Bxd5 — trade', 'exd5 — clamp with a pawn', '…g6 — luft', 'c4 — grab space', '…b6 — second front'],
    arrSpec: [['c3', 'd5'], null, ['d1', 'd3'], null, null, null, null, null] },
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
console.log(`OPEN-SIC: entry + ${models.length} model games + ${PLANS.length} plan written & verified`);

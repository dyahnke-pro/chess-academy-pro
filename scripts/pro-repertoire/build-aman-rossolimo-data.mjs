#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-rossolimo';
const scan = JSON.parse(fs.readFileSync('/tmp/aman-model-games.json', 'utf8'))[ID];
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const VIS = 'rgba(40,185,95,0.92)';
const SRC = ['book:sicilian-rossolimo', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'];

const REP = {
  id: ID, playerId: 'aman', eco: 'B31', name: 'Rossolimo / Moscow (Aman)',
  color: 'white', style: 'Structural, Low-theory',
  pgn: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 bxc6 O-O Bg7 Re1 Nf6 e5 Nd5 c4 Nc7 d4',
  overview: "Aman Hambleton's clean Anti-Sicilian (214+ games, ~79%) — the Rossolimo (Bb5 vs …Nc6) and its Moscow cousin (Bb5+ vs …d6). It sidesteps the vast Open-Sicilian theory in favour of one simple, powerful idea: trade Bxc6 to double Black's pawns, then take the centre with e5, c4 and d4. The cramping pawns blunt the fianchettoed Dragon bishop and the doubled c-pawns become a permanent target. Against …e6 White keeps the bishop pair with Bf1; against …d6 the Moscow steers into a quiet Spanish-style squeeze. Low theory, clear plans, lasting structural edge.",
  keyIdeas: [
    'Trade Bxc6 to inflict doubled pawns and a permanent target.',
    'Take the centre with e5, c4 and d4 to cramp Black.',
    'Blunt the fianchettoed g7-bishop with the e5-pawn wall.',
    'vs …e6 keep the bishop pair (Bf1); vs …d6 play the Moscow squeeze.',
  ],
  traps: [], warnings: ['You give up the bishop pair for the doubled pawns — make the structural damage count by clamping the centre, or Black’s two bishops come alive.'],
  trapLines: [], warningLines: [],
  sources: ['book:sicilian-rossolimo', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation', 'https://api.chess.com/pub/player/chessbrah/games/archives'],
  variations: [
    { name: 'vs …g6 (Bxc6)', pgn: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 bxc6 O-O Bg7 Re1 Nf6 e5 Nd5 c4 Nc7 d4 cxd4 Qxd4',
      explanation: 'His main line. Bxc6 doubles the pawns; e5/c4/d4 clamps the centre and blunts the Dragon bishop for a lasting squeeze.', sources: SRC },
    { name: 'vs …e6', pgn: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4 Nf6 Be3 Be7 c4 O-O Nc3 cxd4 Nxd4',
      explanation: '97 games. Keep the bishop pair with Bf1 and reach an open classical centre with a small, comfortable edge.', sources: SRC },
    { name: 'Moscow vs …d6', pgn: 'e4 c5 Nf3 d6 Bb5+ Nd7 c3 Nf6 Qe2 a6 Ba4 b5 Bc2 Bb7 O-O g6 d4 Bg7 Rd1',
      explanation: 'The Moscow Bb5+: a quiet Spanish-style squeeze with the Ba4-Bc2 reroute and central pressure.', sources: SRC },
  ],
};

function recompute(g) { const w = (g.white || '').toLowerCase() === 'chessbrah'; return { opp: w ? g.black : g.white, oppElo: w ? g.blackElo : g.whiteElo }; }
const VLAB = { 'g6-fianch': 'Rossolimo vs …g6', 'e6-line': 'Rossolimo vs …e6', 'd6-moscow': 'Moscow' };
const VSTORY = {
  'g6-fianch': 'the Bxc6 doubling, the e5/c4/d4 clamp, and the blunted Dragon bishop',
  'e6-line': 'the Bf1 bishop-pair retreat and the comfortable open centre',
  'd6-moscow': 'the Moscow Bb5+ and the quiet Spanish-style central squeeze',
};
const models = [];
for (const [vk, arr] of Object.entries(scan)) arr.forEach((g, i) => {
  const r = recompute(g); const yr = (g.date || '').slice(0, 4);
  models.push({ id: `mg-${ID}-${vk}-${i}`, openingId: ID, white: g.white, black: g.black, whiteElo: g.whiteElo, blackElo: g.blackElo, result: g.result, year: +yr || undefined, event: `chess.com ${g.timeClass} (${g.date})`, pgn: g.pgn, sourceUrl: g.url, studentSide: 'white',
    overview: `Hambleton's ${VLAB[vk] || 'Rossolimo'} in action: a ${g.timeClass} win over ${r.opp} (${r.oppElo}) in ${yr}. Watch ${VSTORY[vk] || 'the Anti-Sicilian squeeze'}. A clean model of the plan working against a strong opponent.` });
});

function planLine(fen, tail, ann, cues, arrSpec) {
  const c = new Chess(fen); const arrows = []; const hl = [];
  for (let i = 0; i < tail.length; i++) { const mv = c.move(tail[i]); hl.push([{ square: mv.to, color: ORANGE }]); arrows.push(arrSpec[i] ? [{ from: arrSpec[i][0], to: arrSpec[i][1], color: VIS }] : []); }
  return { fen, moves: tail, annotations: ann, learnCues: cues, arrows, highlights: hl, sources: SRC };
}

// from his win vs SantoBlue (anchor 16): real legal tail d4/Qxd4/Qh4/Nc3 (Qh4 = queen maneuver).
const PLANS = [
  { id: 'mp-proamanross-g6', openingId: ID, title: 'Take d4 and Activate the Queen',
    overview: "After the centre is clamped, White grabs d4, recaptures with the queen, and swings it to h4 to eye the kingside dark squares Black weakened with …g6. The space edge plus active pieces give White a clear, lasting initiative.",
    pawnBreaks: ['d4 central break'], pieceManeuvers: [{ piece: 'queen', route: 'Qd4-h4 toward the kingside', explanation: 'The queen centralises on d4, then swings to h4 to pressure the weakened dark squares.' }],
    strategicThemes: ['Play d4, recapture with the queen, and swing it to h4'], endgameTransitions: [],
    fen: 'r1bqk2r/p1npppbp/2p3p1/2p1P3/2P5/5N2/PP1P1PPP/RNBQR1K1 w kq - 1 9',
    tail: ['d4', 'cxd4', 'Qxd4', 'O-O', 'Qh4', 'Ne6', 'Nc3', 'Re8'],
    ann: ['d4 plays the central break.', '…cxd4 trades.', 'Qxd4 centralises the queen.', '…O-O tucks the king away.', 'Qh4 swings toward the kingside.', '…Ne6 develops, eyeing d4.', 'Nc3 develops the last knight.', '…Re8 contests the e-file.'],
    cues: ['d4 — central break', '…cxd4 — trade', 'Qxd4 — centralise', '…O-O — king safe', 'Qh4 — swing to the kingside', '…Ne6 — develop', 'Nc3 — develop', '…Re8 — contest e-file'],
    arrSpec: [null, null, ['d1', 'd4'], null, ['d4', 'h4'], null, ['b1', 'c3'], null] },
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
console.log(`ROSSOLIMO: entry + ${models.length} model games + ${PLANS.length} plan written & verified`);

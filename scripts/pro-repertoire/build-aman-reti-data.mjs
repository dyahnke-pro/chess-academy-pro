#!/usr/bin/env node
// Réti / KIA data layers for Aman (WHITE): pro-repertoires entry, model games,
// 2 plans (continuations pulled from his real winning games, verified legal).
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-reti';
const scan = JSON.parse(fs.readFileSync('/tmp/aman-model-games.json', 'utf8'))[ID];
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const VIS = 'rgba(40,185,95,0.92)';
const SRC = ['book:chess-fundamentals', 'concept:pos-development', 'https://www.chess.com/openings/Reti-Opening'];

const REP = {
  id: ID, playerId: 'aman', eco: 'A07', name: 'Réti / King’s Indian Attack (Aman)',
  color: 'white', style: 'Flexible, Universal',
  pgn: 'Nf3 d5 d4 Nf6 c4 e6 e3 Be7 Nc3 O-O Bd3 b6 cxd5 exd5 O-O',
  overview: "Aman Hambleton's biggest White system (4,993 games, 77.5%) — the Nf3 move-order that becomes the Réti or King's Indian Attack depending on what Black does. The whole idea is flexibility: develop the knight, watch Black's setup, then choose the ideal structure — a classical d4/c4 centre against …d5, a big e4 centre against …g6, or the hypermodern double fianchetto. Low theory, high understanding: White reaches sound, comfortable positions on White's own terms and outplays from there. The Building-Habits philosophy applied to the whole opening.",
  keyIdeas: [
    'Develop Nf3 first and keep every structure available.',
    'Against …d5, transpose to a sound QGD with d4 and c4.',
    'Against …g6, build the big e4 centre and aim at the king.',
    'Or fianchetto with g3/Bg2 and pressure the long diagonal.',
  ],
  traps: [], warnings: ['The Réti is about move-order flexibility — don’t commit the centre too early; let Black show a plan, then pick the structure that punishes it.'],
  trapLines: [], warningLines: [],
  sources: ['book:chess-fundamentals', 'concept:pos-development', 'https://www.chess.com/openings/Reti-Opening', 'https://api.chess.com/pub/player/chessbrah/games/archives'],
  variations: [
    { name: 'vs …d5 (QGD structure)', pgn: 'Nf3 d5 d4 Nf6 c4 e6 e3 Be7 Nc3 O-O Bd3 b6 cxd5 exd5 O-O',
      explanation: 'His main response to …d5: a sound Queen’s-Gambit-Declined structure with a small, durable edge and a target on d5.', sources: SRC },
    { name: 'vs …g6 (KIA)', pgn: 'Nf3 g6 d4 Bg7 e4 d6 c3 Nf6 Bd3 O-O O-O Nc6 h3 e5 Re1',
      explanation: '537 games. Against the King’s-Indian setup, White builds the big d4/e4 centre and plays for space and a kingside expansion.', sources: SRC },
    { name: 'Double Fianchetto (g3)', pgn: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 Nbd2 Nbd7 e4 e5 h3',
      explanation: '455 games. The hypermodern Réti: fianchetto, then break with e4 into a rich King’s-Indian-Attack middlegame.', sources: SRC },
  ],
};

function recompute(g) { const w = (g.white || '').toLowerCase() === 'chessbrah'; return { opp: w ? g.black : g.white, oppElo: w ? g.blackElo : g.whiteElo }; }
const VLAB = { 'vs-d5-qgd': 'Réti vs …d5', 'vs-g6-kia': 'KIA vs …g6', 'double-fianch': 'Double Fianchetto' };
const VSTORY = {
  'vs-d5-qgd': 'the sound QGD structure, the small durable edge, and pressure on the d5-pawn',
  'vs-g6-kia': 'the big d4/e4 centre and the space-gaining kingside plan against the King’s Indian',
  'double-fianch': 'the hypermodern fianchetto and the e4 break into a rich attacking middlegame',
};
const models = [];
for (const [vk, arr] of Object.entries(scan)) arr.forEach((g, i) => {
  const r = recompute(g); const yr = (g.date || '').slice(0, 4);
  models.push({ id: `mg-${ID}-${vk}-${i}`, openingId: ID, white: g.white, black: g.black, whiteElo: g.whiteElo, blackElo: g.blackElo, result: g.result, year: +yr || undefined, event: `chess.com ${g.timeClass} (${g.date})`, pgn: g.pgn, sourceUrl: g.url, studentSide: 'white',
    overview: `Hambleton's ${VLAB[vk]} in action: a ${g.timeClass} win over ${r.opp} (${r.oppElo}) in ${yr}. Watch ${VSTORY[vk]}. A clean model of the plan working against a strong opponent.` });
});

function planLine(fen, tail, ann, cues, arrSpec) {
  const c = new Chess(fen); const arrows = []; const hl = [];
  for (let i = 0; i < tail.length; i++) { const mv = c.move(tail[i]); hl.push([{ square: mv.to, color: ORANGE }]); arrows.push(arrSpec[i] ? [{ from: arrSpec[i][0], to: arrSpec[i][1], color: VIS }] : []); }
  return { fen, moves: tail, annotations: ann, learnCues: cues, arrows, highlights: hl, sources: SRC };
}

const PLANS = [
  { id: 'mp-proamanreti-d5', openingId: ID, title: 'Knight to e5 and Central Pressure',
    overview: "From the QGD structure White expands the queenside with b3 and Bb2, then plants the knight on the dominant e5-outpost. The pieces pressure the centre and the slightly loose d5-pawn — the small, durable Réti edge made concrete.",
    pawnBreaks: [], pieceManeuvers: [{ piece: 'knight', route: 'Nf3-e5 outpost', explanation: 'The knight jumps to the e5-outpost, the engine of White’s pressure.' }],
    strategicThemes: ['Fianchetto with b3/Bb2 and post the knight on e5'], endgameTransitions: [],
    fen: 'rnbq1rk1/p3bppp/1p3n2/2pp4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 9',
    tail: ['b3', 'Nc6', 'Bb2', 'Bg4', 'Be2', 'Rc8', 'Ne5', 'Bxe2'],
    ann: ['b3 prepares the queenside fianchetto.', '…Nc6 develops, hitting d4.', 'Bb2 takes the long diagonal.', '…Bg4 pins the f3-knight.', 'Be2 breaks the pin.', '…Rc8 loads the c-file.', 'Ne5 lands on the dominant outpost.', '…Bxe2 trades off the bishop.'],
    cues: ['b3 — prep fianchetto', '…Nc6 — hit d4', 'Bb2 — long diagonal', '…Bg4 — pin', 'Be2 — break pin', '…Rc8 — load c-file', 'Ne5 — the outpost', '…Bxe2 — trade'],
    arrSpec: [null, null, ['c1', 'b2'], null, ['d3', 'e2'], null, ['f3', 'e5'], null] },
  { id: 'mp-proamanreti-g6', openingId: ID, title: 'The d5 Space-Gaining Break',
    overview: "In the King's-Indian-Attack structure White finishes development and gains space with the d5 push, locking the centre on White's terms. The clamp gives White a free hand to expand where Black is weakest.",
    pawnBreaks: ['d5 central push'], pieceManeuvers: [{ piece: 'knight', route: 'Nb1-d2 reroute', explanation: 'The knight reroutes via d2 to support the centre and the e4-square.' }],
    strategicThemes: ['Reroute Nbd2 and gain space with the d5 push'], endgameTransitions: [],
    fen: 'r1bq1rk1/ppp2pb1/2np1npp/4p3/3PP3/2PB1N1P/PP3PP1/RNBQR1K1 w - - 0 9',
    tail: ['Nbd2', 'a5', 'a3', 'a4', 'd5', 'Ne7', 'c4', 'b6'],
    ann: ['Nbd2 reroutes the knight toward the centre.', '…a5 grabs queenside space.', 'a3 restrains the pawn.', '…a4 fixes the queenside.', 'd5 gains central space and clamps.', '…Ne7 reroutes the knight.', 'c4 props the d5-pawn.', '…b6 opens a second front on the queenside.'],
    cues: ['Nbd2 — reroute', '…a5 — grab space', 'a3 — restrain', '…a4 — fix', 'd5 — clamp the centre', '…Ne7 — reroute', 'c4 — prop d5', '…b6 — second front'],
    arrSpec: [['b1', 'd2'], null, null, null, null, null, null, null] },
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
console.log(`RETI: entry + ${models.length} model games + ${PLANS.length} plans written & verified`);

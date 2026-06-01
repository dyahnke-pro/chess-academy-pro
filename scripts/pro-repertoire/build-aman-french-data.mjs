#!/usr/bin/env node
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-french-white';
const scan = JSON.parse(fs.readFileSync('/tmp/aman-model-games.json', 'utf8'))[ID];
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const VIS = 'rgba(40,185,95,0.92)';
const SRC = ['book:french-defence', 'concept:pos-development', 'https://www.chess.com/openings/French-Defense'];

const REP = {
  id: ID, playerId: 'aman', eco: 'C18', name: 'French Defense (White) (Aman)',
  color: 'white', style: 'Ambitious, Attacking',
  pgn: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 h4 Qc7 Nf3',
  overview: "Aman Hambleton's ambitious answer to the French (448 games, 76.3%) — meet it with the full classical centre, d4 and Nc3, and against the Winawer pin …Bb4 push e5 to lock the centre and cramp Black. After …c5, a3 and the Bxc3 trade, White takes the bishop pair and a big pawn centre in exchange for doubled c-pawns — the Winawer bargain. The thematic h4 grabs kingside space and launches an attack while the centre stays locked. Against the Classical …Nf6 he plays Bg5 to shatter Black's kingside; against the Rubinstein …dxe4 he simply enjoys the freer, more developed game. Ambition over caution — take the centre and attack.",
  keyIdeas: [
    'Build the full classical centre with d4 and Nc3.',
    'vs Winawer: push e5 and accept doubled pawns for the bishop pair and a big centre.',
    'Play the thematic h4 for kingside space and attack.',
    'vs Classical: Bg5 to shatter the kingside; vs Rubinstein: enjoy the freer game.',
  ],
  traps: [], warnings: ['The Winawer gives Black queenside counterplay on the doubled c-pawns — get your kingside attack rolling with h4-h5 before Black’s …Qa5 / …c4 pressure arrives.'],
  trapLines: [], warningLines: [],
  sources: ['book:french-defence', 'concept:pos-development', 'https://www.chess.com/openings/French-Defense', 'https://api.chess.com/pub/player/chessbrah/games/archives'],
  variations: [
    { name: 'Winawer (…Bb4)', pgn: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 h4 Qc7 Nf3 b6',
      explanation: 'His main line. e5 locks the centre, bxc3 takes the bishop pair, and h4 launches the thematic kingside attack.', sources: SRC },
    { name: 'Classical (…Nf6)', pgn: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 dxe4 Nxe4 Be7 Bxf6 gxf6 Nf3 f5 Nc3 a6 g3 b5 Bg2 Bb7 O-O O-O Qe2',
      explanation: '111 games. Bg5 shatters Black’s kingside; White fianchettoes to g2 and presses the broken pawns.', sources: SRC },
    { name: 'Rubinstein (…dxe4)', pgn: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Bd7 Nf3 Bc6 Bd3 Nd7 O-O Ngf6 Ned2 Be7 Re1 O-O Ne5 Nxe5 dxe5 Qd5 Nf3',
      explanation: '119 games. Black concedes the centre; White enjoys more space, smoother development, and a small lasting initiative.', sources: SRC },
  ],
};

function recompute(g) { const w = (g.white || '').toLowerCase() === 'chessbrah'; return { opp: w ? g.black : g.white, oppElo: w ? g.blackElo : g.whiteElo }; }
const VLAB = { 'winawer-bb4': 'Winawer', 'classical-nf6': 'Classical', 'rubinstein-dxe4': 'Rubinstein' };
const VSTORY = {
  'winawer-bb4': 'the e5 clamp, the bishop pair, and the h4-h5 kingside storm',
  'classical-nf6': 'the Bg5 trade shattering Black’s kingside and the Bg2 pressure',
  'rubinstein-dxe4': 'the free development edge and the cramping e5-pawn',
};
const models = [];
for (const [vk, arr] of Object.entries(scan)) arr.forEach((g, i) => {
  const r = recompute(g); const yr = (g.date || '').slice(0, 4);
  models.push({ id: `mg-${ID}-${vk}-${i}`, openingId: ID, white: g.white, black: g.black, whiteElo: g.whiteElo, blackElo: g.blackElo, result: g.result, year: +yr || undefined, event: `chess.com ${g.timeClass} (${g.date})`, pgn: g.pgn, sourceUrl: g.url, studentSide: 'white',
    overview: `Hambleton's ${VLAB[vk] || 'French'} in action: a ${g.timeClass} win over ${r.opp} (${r.oppElo}) in ${yr}. Watch ${VSTORY[vk] || 'the central squeeze'}. A clean model of the plan working against a strong opponent.` });
});

function planLine(fen, tail, ann, cues, arrSpec) {
  const c = new Chess(fen); const arrows = []; const hl = [];
  for (let i = 0; i < tail.length; i++) { const mv = c.move(tail[i]); hl.push([{ square: mv.to, color: ORANGE }]); arrows.push(arrSpec[i] ? [{ from: arrSpec[i][0], to: arrSpec[i][1], color: VIS }] : []); }
  return { fen, moves: tail, annotations: ann, learnCues: cues, arrows, highlights: hl, sources: SRC };
}

// from his win vs DominguezOnYoutube (anchor 14): real legal tail Nf3/h5/a4/Bb5+.
const PLANS = [
  { id: 'mp-proamanfrench-winawer', openingId: ID, title: 'The h4-h5 Kingside Storm',
    overview: "With the bishop pair and a locked centre, White rolls the h-pawn to h5 — gaining space, cramping Black's kingside, and opening lines for the attack. The thematic Winawer plan: lock the centre, then storm the king.",
    pawnBreaks: ['h5 kingside storm'], pieceManeuvers: [{ piece: 'bishop', route: 'Bf1-b5 active check', explanation: 'The bishop swings to b5 with check, developing with tempo toward the queenside.' }],
    strategicThemes: ['Roll the h-pawn to h5 and storm the kingside'], endgameTransitions: [],
    fen: 'rnb1k2r/ppq1nppp/4p3/2ppP3/3P3P/P1P5/2P2PP1/R1BQKBNR w KQkq - 1 8',
    tail: ['Nf3', 'b6', 'h5', 'h6', 'a4', 'Ba6', 'Bb5+', 'Bxb5'],
    ann: ['Nf3 defends the e5-pawn and develops.', '…b6 prepares the bishop.', 'h5 storms forward, cramping the kingside.', '…h6 tries to slow the pawn.', 'a4 gains queenside space.', '…Ba6 develops, hitting f1.', 'Bb5+ develops with check.', '…Bxb5 trades the bishops.'],
    cues: ['Nf3 — defend e5', '…b6 — prepare bishop', 'h5 — storm forward', '…h6 — slow it', 'a4 — grab space', '…Ba6 — develop', 'Bb5+ — check', '…Bxb5 — trade'],
    arrSpec: [['g1', 'f3'], null, null, null, null, null, ['f1', 'b5'], null] },
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
console.log(`FRENCH: entry + ${models.length} model games + ${PLANS.length} plan written & verified`);

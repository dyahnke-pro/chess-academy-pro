#!/usr/bin/env node
// Sicilian Kan endgame plan (id suffix -endgame) into middlegame-plans.json.
// Real Taimanov model game (Konavets 3008, Black win) walked to the opening→
// endgame transition (queens off, ply>=24); the real tail authored with
// lead-the-eye + two registers. Everything computed/verified internally.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-sicilian-kan';
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const VIS = 'rgba(40,185,95,0.92)';
const SRC = ['concept:endgame-rook', 'book:chess-fundamentals', 'https://www.chess.com/openings/Sicilian-Defense-Taimanov-Variation'];

const deep = JSON.parse(fs.readFileSync('data/sources/chessbrah-deep/aman-sicilian-kan-taimanov-nc6.json', 'utf8'));
const game = deep.topModelGames[0]; // Konavets, Black win
let body = game.pgn.replace(/\[[^\]]*\]\s*/g, '').replace(/\{[^}]*\}/g, '').replace(/\d+\.(\.\.)?/g, '').replace(/\s+/g, ' ').replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
const sans = body.split(' ').filter(Boolean);

const c = new Chess();
let tp = -1;
for (let i = 0; i < sans.length; i++) {
  c.move(sans[i]);
  if (c.board().flat().filter((p) => p && p.type === 'q').length === 0 && i + 1 >= 24) { tp = i + 1; break; }
}
if (tp === -1) throw new Error('no transition');
const c2 = new Chess();
for (let i = 0; i < tp; i++) c2.move(sans[i]);
const fen = c2.fen();
const tail = sans.slice(tp, tp + 8);

// hand-authored to match the REAL tail: Nc3 Rdd2 Nxa2 Rxa2 Kf7 Bb2 Kg6 Bd4
// (Black wins the exchange with the knight, then marches the king up).
const annotations = [
  '…Nc3 forks both rooks from deep in White’s camp.',
  'White saves the d1-rook to d2.',
  '…Nxa2 wins the exchange — knight takes the other rook.',
  'White recaptures with the other rook.',
  '…Kf7 activates the king now that the queens are gone.',
  'White redeploys the bishop.',
  '…Kg6 marches the king toward the kingside pawns.',
  'White centralises the bishop.',
];
const learnCues = [
  '…Nc3 — fork both rooks', 'Rdd2 — White saves one', '…Nxa2 — win the exchange', 'Rxa2 — recapture',
  '…Kf7 — activate the king', 'Bb2 — redeploy', '…Kg6 — march in', 'Bd4 — centralise',
];

const c3 = new Chess(fen);
const arrows = []; const highlights = [];
const realTail = [];
for (let i = 0; i < tail.length; i++) {
  const mover = c3.turn();
  const verbose = c3.moves({ verbose: true }).find((mm) => mm.san === tail[i]);
  if (!verbose) throw new Error(`illegal tail move ${tail[i]} at ${i}`);
  const mv = c3.move(tail[i]);
  realTail.push(tail[i]);
  highlights.push([{ square: mv.to, color: ORANGE }]);
  if (mover === 'b' && mv.piece !== 'p') arrows.push([{ from: mv.from, to: mv.to, color: VIS }]);
  else arrows.push([]);
}
if (annotations.length !== realTail.length || learnCues.length !== realTail.length) {
  throw new Error(`length mismatch tail=${realTail.length} ann=${annotations.length} cues=${learnCues.length}`);
}

const PLAN = {
  id: 'mp-proamansiciliankan-taimanov-endgame', openingId: ID, criticalPositionFen: fen,
  title: 'Taimanov Endgame — Converting the Rook-and-Knight',
  overview: "The Taimanov often simplifies into a rook-and-minor endgame where Black's active pieces decide. From Hambleton's win over Konavets (3008): the knight leaps to c3, forks the rooks, and grabs the exchange on a2 — then the king marches up to convert the extra material. Activity and a tactical knight win the day.",
  pawnBreaks: [],
  pieceManeuvers: [{ piece: 'knight', route: '...Nc3 then ...Nxa2 wins the exchange', explanation: 'The knight forks the rooks from c3 and grabs the exchange on a2 — the decisive material gain.' }],
  strategicThemes: ['Win the exchange with the …Nc3 fork, then activate the king to convert'],
  endgameTransitions: ['Rook-and-knight endgame from the Taimanov middlegame'],
  playableLines: [{ fen, moves: realTail, annotations, learnCues, arrows, highlights, sources: SRC }],
};

const path = 'src/data/middlegame-plans.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const kept = data.filter((p) => p.id !== PLAN.id);
kept.push(PLAN);
fs.writeFileSync(path, JSON.stringify(kept, null, 2) + '\n');
console.log(`endgame plan: ${PLAN.id} (tail ${realTail.join(' ')})`);

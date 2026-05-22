#!/usr/bin/env node
// Builder — Caro-Kann model games (Black wins, one per first-class variation).
// Exports each game's PGN via the prod proxy, derives metadata + the EXACT
// FEN at each curated keystone (so the Hole-5 gate passes by construction),
// and appends ModelGame entries to model-games.json. Keystone annotations
// are anchored to the variation's verified lesson idea — not move-by-move,
// per the playbook (reinforce the key principle at the keystone).
//
// Run: node scripts/add-caro-model-games.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { Chess } from 'chess.js';

const EXPORT = 'https://chess-academy-pro.vercel.app/api/lichess-game-export?id=';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Curated: id + keystone(s). moveNumber/color identify the half-move AFTER
// which the FEN is taken; annotation is grounded in the variation's idea.
const GAMES = [
  { id: 'ydlFwo0O', variation: 'Classical', theme: 'Solid structure, no bad pieces',
    keystones: [
      { moveNumber: 11, color: 'black', concept: 'The freed bishop',
        annotation: "Black has done the Caro's signature work: the light bishop came out to f5 and was traded off, and only then did e6 lock the chain. No bad bishop, no weaknesses — just a sound structure to play from." },
    ] },
  { id: 'tPeuj1h3', variation: 'Advance', theme: 'Undermine the chain',
    keystones: [
      { moveNumber: 10, color: 'black', concept: 'The c5 break',
        annotation: "Black strikes the base of White's d4-e5 chain with c5. This is the Advance Caro's whole plan — undermine, don't sit. The bishop is already outside on f5, so Black plays with freedom the French never gets." },
    ] },
  { id: 'CuQmjkwk', variation: 'Exchange', theme: 'Symmetry then outplay',
    keystones: [
      { moveNumber: 10, color: 'black', concept: 'Healthy symmetry',
        annotation: "The Exchange hands Black an open c-file and a sound, symmetrical centre. With the bishop developed and nothing to defend, the better-prepared side simply outplays the other — here Black does, against the World Champion." },
    ] },
  { id: '35nNrI3L', variation: 'Two Knights', theme: 'Granite structure',
    keystones: [
      { moveNumber: 12, color: 'black', concept: 'No weaknesses',
        annotation: "Black traded the light bishop on f3 and built a granite wall with e6. The bishop pair is White's, but there is no target in Black's camp — and a structure with no weaknesses is the Caro's standing offer." },
    ] },
  { id: 'AY124uKf', variation: 'Panov', theme: 'Blockade the isolani',
    keystones: [
      { moveNumber: 12, color: 'black', concept: 'The d5 blockade',
        annotation: "Against the Panov's isolated d-pawn, Black plants a knight on d5 — the perfect blockading square — and leans on d4. Blockade in front, pressure behind: the textbook way to play against the isolani, and Black is the one pressing." },
    ] },
  { id: 'cd322YTs', variation: 'Fantasy', theme: 'Open it before they are ready',
    keystones: [
      { moveNumber: 8, color: 'black', concept: 'The e5 strike',
        annotation: "Against the Fantasy's f3, Black takes on e4 and strikes with e5 at once, prising the centre open before White is developed. The reward is a free, classical game with every piece active." },
    ] },
  { id: 'pZpMgHRG', variation: 'Tartakower', theme: 'Doubled pawns, real assets',
    keystones: [
      { moveNumber: 12, color: 'black', concept: 'The half-open e-file',
        annotation: "Black accepted doubled f-pawns for the bishop pair and the half-open e-file — and now the rooks pour down it. The doubled pawns clamp e5 and g5; far from a weakness, they are the engine of Black's play." },
    ] },
];

function cleanPgnMoves(pgn) {
  return pgn
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\d+\.(\.\.)?/g, '')
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, '')
    .replace(/[!?]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function header(pgn, key) {
  const m = pgn.match(new RegExp(`\\[${key} "([^"]*)"`));
  return m ? m[1] : '';
}
/** FEN after the (moveNumber, color) half-move. */
function fenAt(sans, moveNumber, color) {
  const targetPly = (moveNumber - 1) * 2 + (color === 'white' ? 1 : 2);
  const c = new Chess();
  let ply = 0;
  for (const san of sans) {
    try { c.move(san); } catch { break; }
    ply++;
    if (ply >= targetPly) break;
  }
  return c.fen();
}

async function main() {
  const path = 'src/data/model-games.json';
  const games = JSON.parse(await readFile(path, 'utf8'));
  // Drop any prior caro-kann model games (the old White-side ones) so this
  // is the canonical Black-win set.
  const kept = games.filter((g) => g.openingId !== 'caro-kann');
  const added = [];
  for (const g of GAMES) {
    const pgn = await fetch(EXPORT + g.id).then((r) => r.text());
    const moves = cleanPgnMoves(pgn);
    const sans = moves.split(' ').filter(Boolean);
    const result = header(pgn, 'Result');
    if (result !== '0-1') { console.log(`SKIP ${g.id} (${g.variation}): result ${result} not a Black win`); continue; }
    const white = header(pgn, 'White'), black = header(pgn, 'Black');
    const year = parseInt((header(pgn, 'Date') || '0').slice(0, 4), 10) || null;
    const entry = {
      id: `mg-caro-${g.variation.toLowerCase().replace(/\s+/g, '-')}`,
      openingId: 'caro-kann',
      white, black,
      whiteElo: parseInt(header(pgn, 'WhiteElo'), 10) || null,
      blackElo: parseInt(header(pgn, 'BlackElo'), 10) || null,
      result,
      year,
      event: header(pgn, 'Event') || 'Master game',
      pgn: moves,
      overview: `${g.variation} Caro-Kann — Black wins. ${g.theme}.`,
      criticalMoments: g.keystones.map((k) => ({
        moveNumber: k.moveNumber, color: k.color,
        fen: fenAt(sans, k.moveNumber, k.color),
        annotation: k.annotation, concept: k.concept,
      })),
      middlegameTheme: g.theme,
      lessonSummary: `The ${g.variation} variation, played out to a Black win at the top level.`,
    };
    added.push(entry);
    console.log(`OK ${entry.id}: ${white} vs ${black} ${year} (${sans.length} plies)`);
    await sleep(200);
  }
  await writeFile(path, JSON.stringify([...kept, ...added], null, 2) + '\n');
  console.log(`\nWrote ${added.length} caro model games; ${kept.length} non-caro retained.`);
}
main();

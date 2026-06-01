#!/usr/bin/env node
// Print authoring data for a deep-build file (real schema: spineMoves,
// openingTerminusPly, endgameTypeBreakdown, topModelGames).
// Computes terminus FEN + student landing squares in the rep game's continuation.
// Usage: _print-deep.mjs <opening> <variation>
import fs from 'node:fs';
import { Chess } from 'chess.js';

const [, , op, va] = process.argv;
const t = JSON.parse(fs.readFileSync(`data/sources/${'chessbrah'}-deep/${op}-${va}.json`, 'utf8'));
const studentColor = t.variation?.color || (op.includes('caro') || op.includes('nimzo') || op.includes('sicilian-kan') ? 'black' : 'white');

console.log(`# ${op}/${va}  totalGames=${t.totalGames} W${t.wins}/D${t.draws}/L${t.losses} gamesAtTerminus=${t.gamesAtTerminus}`);
console.log(`SPINE (${t.spineMoves.length} plies, terminus@ply${t.openingTerminusPly}): ${t.spineMoves.join(' ')}`);

// terminus FEN
const c = new Chess();
for (const m of t.spineMoves) { try { c.move(m); } catch { break; } }
console.log(`TERMINUS_FEN: ${c.fen()}`);

console.log(`ENDGAME breakdown: ${JSON.stringify(t.endgameTypeBreakdown)}`);

// model games: header parse + first 24 SAN + the endgame tail
console.log(`MODEL GAMES (${t.topModelGames.length}):`);
for (const m of t.topModelGames) {
  const w = (m.pgn.match(/\[White "([^"]+)"\]/) || [])[1] || '?';
  const b = (m.pgn.match(/\[Black "([^"]+)"\]/) || [])[1] || '?';
  const r = (m.pgn.match(/\[Result "([^"]+)"\]/) || [])[1] || '?';
  const we = (m.pgn.match(/\[WhiteElo "([^"]+)"\]/) || [])[1] || '?';
  const be = (m.pgn.match(/\[BlackElo "([^"]+)"\]/) || [])[1] || '?';
  const cbColor = w.toLowerCase() === 'chessbrah' ? 'white' : 'black';
  const won = (r === '1-0' && cbColor === 'white') || (r === '0-1' && cbColor === 'black');
  let body = m.pgn.replace(/\[[^\]]*\]\s*/g, '').replace(/\{[^}]*\}/g, '').replace(/\d+\.(\.\.)?/g, '').replace(/\s+/g, ' ').replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  const sans = body.split(' ').filter(Boolean);
  console.log(`  chessbrah(${cbColor}) vs ${cbColor === 'white' ? b + '(' + be + ')' : w + '(' + we + ')'} ${r} ${won ? 'WIN' : 'NOTWIN'} ${m.plyCount}p ${m.url}`);
  console.log(`    SAN[0..24]: ${sans.slice(0, 24).join(' ')}`);
}

// Middlegame continuation: take the deepest WIN model game on the student color,
// play spine, then print next ~12 plies + student landing squares.
const repGame = t.topModelGames.find((m) => {
  const w = (m.pgn.match(/\[White "([^"]+)"\]/) || [])[1] || '';
  const r = (m.pgn.match(/\[Result "([^"]+)"\]/) || [])[1] || '';
  const cbColor = w.toLowerCase() === 'chessbrah' ? 'white' : 'black';
  return (r === '1-0' && cbColor === 'white') || (r === '0-1' && cbColor === 'black');
}) || t.topModelGames[0];
if (repGame) {
  let body = repGame.pgn.replace(/\[[^\]]*\]\s*/g, '').replace(/\{[^}]*\}/g, '').replace(/\d+\.(\.\.)?/g, '').replace(/\s+/g, ' ').replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  const sans = body.split(' ').filter(Boolean);
  const cc = new Chess();
  const land = [];
  for (let i = 0; i < Math.min(sans.length, t.openingTerminusPly + 14); i++) {
    let mv; try { mv = cc.move(sans[i]); } catch { break; }
    const mover = i % 2 === 0 ? 'white' : 'black';
    if (i >= t.openingTerminusPly && mover === studentColor) land.push(`${sans[i]}->${mv.to}`);
  }
  console.log(`MIDDLEGAME continuation (rep game, plies ${t.openingTerminusPly}..+14):`);
  console.log(`  moves: ${sans.slice(t.openingTerminusPly, t.openingTerminusPly + 14).join(' ')}`);
  console.log(`  student landings: ${land.join('  ')}`);
}

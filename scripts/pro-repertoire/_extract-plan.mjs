#!/usr/bin/env node
// Extract a real plan continuation from a chessbrah WIN model game.
// Usage: node _extract-plan.mjs <deepfile-basename> <studentColor white|black> <anchorPly> <n>
// Prints: anchor FEN + the real n-ply tail + student landing squares (for authoring).
import fs from 'node:fs';
import { Chess } from 'chess.js';

const [, , base, color, anchorStr, nStr] = process.argv;
const anchorPly = +anchorStr; const n = +(nStr || 8);
const t = JSON.parse(fs.readFileSync(`data/sources/chessbrah-deep/${base}.json`, 'utf8'));
const want = color === 'white' ? '1-0' : '0-1';

for (const m of t.topModelGames) {
  const w = (m.pgn.match(/\[White "([^"]+)"\]/) || [])[1] || '';
  const res = (m.pgn.match(/\[Result "([^"]+)"\]/) || [])[1] || '';
  const cbWhite = w.toLowerCase() === 'chessbrah';
  if ((cbWhite ? 'white' : 'black') !== color) continue;
  if (res !== want) continue;
  let body = m.pgn.replace(/\[[^\]]*\]\s*/g, '').replace(/\{[^}]*\}/g, '').replace(/\d+\.(\.\.)?/g, '').replace(/\s+/g, ' ').replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  const sans = body.split(' ').filter(Boolean);
  if (sans.length < anchorPly + n) continue;
  const c = new Chess();
  let ok = true;
  for (let i = 0; i < anchorPly; i++) { try { c.move(sans[i]); } catch { ok = false; break; } }
  if (!ok) continue;
  const fen = c.fen();
  const tail = sans.slice(anchorPly, anchorPly + n);
  const land = []; const cc = new Chess(fen);
  const studentChar = color === 'white' ? 'w' : 'b';
  let legal = true;
  for (let i = 0; i < tail.length; i++) { const mover = cc.turn(); let mv; try { mv = cc.move(tail[i]); } catch { legal = false; break; } if (mover === studentChar) land.push(`${tail[i]}>${mv.to}`); }
  if (!legal) continue;
  const opp = cbWhite ? (m.pgn.match(/\[Black "([^"]+)"\]/) || [])[1] : w;
  console.log(`FEN ${fen}`);
  console.log(`TAIL ${tail.join(' ')}`);
  console.log(`LAND ${land.join('  ')}`);
  console.log(`OPP ${opp}`);
  process.exit(0);
}
console.log('NO matching win game with enough depth');

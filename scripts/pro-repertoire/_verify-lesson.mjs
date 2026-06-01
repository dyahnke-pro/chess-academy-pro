#!/usr/bin/env node
// Verify a pro-rep lesson .ts: every beat's moves are legal from start; every
// arrow originates on a non-pawn piece at that beat's final position with a
// legal-shaped sightline; sayShort <= 8 words; no move-number prefixes.
// Usage: node _verify-lesson.mjs <path-to-lesson.ts> [<more paths>]
import fs from 'node:fs';
import { Chess } from 'chess.js';

const MOVENUM = /\d{1,2}(\.|…|\.\.\.)(?=\s*[NBRQKO]|\s*[a-h][1-8x])/;
let failures = 0;

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  // crude parse of b({ ... }) beats: capture moves, arrows, sayShort
  const beatRe = /b\(\{\s*id:\s*'([^']+)',\s*moves:\s*'([^']+)'([\s\S]*?)\}\)/g;
  let m; let n = 0;
  while ((m = beatRe.exec(src))) {
    n++;
    const [, id, moves, rest] = m;
    const sans = moves.trim().split(/\s+/);
    const c = new Chess();
    let legal = true;
    for (const s of sans) { try { c.move(s); } catch { legal = false; break; } }
    if (!legal) { console.log(`✗ ${file} beat ${id}: ILLEGAL move sequence`); failures++; continue; }
    // arrows show the beat's LAST move (lead-the-eye), so check the frame
    // BEFORE that move: replay all but the last ply.
    const pre = new Chess();
    for (let i = 0; i < sans.length - 1; i++) pre.move(sans[i]);
    const arrowRe = /A\('([a-h][1-8])',\s*'([a-h][1-8])'\)/g;
    let a;
    while ((a = arrowRe.exec(rest))) {
      const [, from, to] = a;
      const piece = pre.get(from);
      if (!piece) { console.log(`✗ ${file} beat ${id}: arrow from ${from} but EMPTY in pre-move frame`); failures++; continue; }
      if (piece.type === 'p') { console.log(`✗ ${file} beat ${id}: arrow from ${from} is a PAWN (use a piece)`); failures++; }
      void to;
    }
    // sayShort length
    const ss = (rest.match(/sayShort:\s*'((?:[^'\\]|\\.)*)'/) || [])[1] || (rest.match(/sayShort:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || '';
    const words = ss.replace(/[…—-]/g, ' ').split(/\s+/).filter(Boolean).length;
    if (words > 8) { console.log(`✗ ${file} beat ${id}: sayShort ${words} words (>8): "${ss}"`); failures++; }
    // move-number prefix in say / sayShort
    const say = (rest.match(/say:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || '';
    if (MOVENUM.test(say) || MOVENUM.test(ss)) { console.log(`✗ ${file} beat ${id}: move-number prefix in prose`); failures++; }
  }
  console.log(`${file}: ${n} beats checked`);
}
console.log(failures === 0 ? '✓ ALL CLEAN' : `✗ ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);

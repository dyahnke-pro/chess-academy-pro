#!/usr/bin/env node
// Usage: echo "<pgn moves>" | node validate-pgn.mjs
// Or:    node validate-pgn.mjs "e4 e5 Nf3 ..."
import { Chess } from 'chess.js';
import fs from 'node:fs';

let input = process.argv[2] || fs.readFileSync(0, 'utf8');
input = input.trim();

// Strip PGN headers and comments
input = input.replace(/\[[^\]]*\]/g, '');
input = input.replace(/\{[^}]*\}/g, '');
input = input.replace(/\([^)]*\)/g, ''); // variations
input = input.replace(/\d+\.+/g, ''); // move numbers like "1." or "1..."
input = input.replace(/\s+/g, ' ').trim();

// Strip result token
const resultMatch = input.match(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/);
const result = resultMatch ? resultMatch[1] : null;
if (resultMatch) input = input.slice(0, resultMatch.index).trim();

const tokens = input.split(/\s+/).filter(Boolean);
const chess = new Chess();
let i = 0;
for (const tok of tokens) {
  let r;
  try { r = chess.move(tok); } catch { r = null; }
  if (!r) {
    console.log('FAIL: illegal at ply', i + 1, '"' + tok + '" — preceding tokens:', tokens.slice(Math.max(0, i - 3), i).join(' '));
    process.exit(1);
  }
  i++;
}
const last = tokens[tokens.length - 1];
const endsMate = last.endsWith('#');
const endsCheck = last.endsWith('+');
const gameOver = chess.isGameOver();
const isCheckmate = chess.isCheckmate();
const isStalemate = chess.isStalemate();
const isDraw = chess.isDraw();

console.log('OK: plies =', tokens.length);
console.log('Result tag:', result ?? '(none)');
console.log('Last token:', last);
console.log('Ends with #:', endsMate);
console.log('chess.js isCheckmate:', isCheckmate);
console.log('chess.js isStalemate:', isStalemate);
console.log('chess.js isDraw:', isDraw);
console.log('chess.js isGameOver:', gameOver);
console.log('Final FEN:', chess.fen());
console.log('Final ply token (clean for JSON):', tokens.join(' '));

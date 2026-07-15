// Walk a player tree's most-played path from a given SAN prefix while
// games >= MIN, printing per-ply counts + the terminal FEN. Usage:
//   node tree-continue.mjs <treeFile> "<prefix sans>" [maxPlies] [min]
import { Chess } from 'chess.js';
import fs from 'fs';
const [file, prefixStr, maxStr, minStr] = process.argv.slice(2);
const t = JSON.parse(fs.readFileSync(file, 'utf8'));
const pre = t.minPrefix ?? [];
const prefix = prefixStr.trim().split(/\s+/);
const MAX = Number(maxStr ?? 12); const MIN = Number(minStr ?? 5);
let node = t.tree;
const rel = prefix.slice(pre.length);
for (const san of rel) { node = (node.children ?? {})[san]; if (!node) { console.log('prefix breaks at', san); process.exit(1); } }
const c = new Chess();
for (const m of prefix) c.move(m);
const added = [];
for (let i = 0; i < MAX; i++) {
  const kids = Object.entries(node.children ?? {}).sort((a, b) => (b[1].games ?? 0) - (a[1].games ?? 0));
  if (!kids.length || (kids[0][1].games ?? 0) < MIN) break;
  const [san, child] = kids[0];
  if (!c.move(san)) break;
  added.push(`${san}(${child.games})`);
  node = child;
}
console.log('continuation:', added.join(' '));
console.log('full line:', prefix.join(' '), added.map((x) => x.split('(')[0]).join(' '));
console.log('terminal fen:', c.fen());
console.log('W/L at node:', node.wins, '/', node.losses, 'of', node.games);

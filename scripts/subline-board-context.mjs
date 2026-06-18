// Prints ground-truth board context for a subline's moves so narration beats
// are authored from the real position (data-first, G3). Usage:
//   node scripts/subline-board-context.mjs <openingId> [moveSigPrefix]
import fs from 'node:fs';
import { Chess } from 'chess.js';

const [,, openingId, sigPrefix] = process.argv;
const data = JSON.parse(fs.readFileSync('src/data/course-sublines.json','utf8'));
const vars = data[openingId];
if (!vars) { console.error('no opening', openingId); process.exit(1); }

// Collect unique lines (by move signature) + their keys.
const uniq = new Map();
for (const [vi, list] of Object.entries(vars)) {
  for (const s of list) {
    const sig = s.moves.join(' ');
    const e = uniq.get(sig) ?? { keys:[], moves:s.moves, atPly:s.atPly, trigger:s.triggerMove, pct:s.pct, games:s.games };
    e.keys.push(`${openingId}::${vi}::${s.triggerMove}@${s.atPly}`);
    uniq.set(sig, e);
  }
}

for (const [sig, e] of uniq) {
  if (sigPrefix && !sig.startsWith(sigPrefix)) continue;
  console.log('\n==================================================================');
  console.log('KEYS:', e.keys.join('  '));
  console.log(`trigger ${e.trigger}@${e.atPly}  pct=${e.pct}% games=${e.games}`);
  const c = new Chess();
  const rows = [];
  for (let i=0;i<e.moves.length;i++){
    const before = c.fen();
    const mv = c.move(e.moves[i]);
    const tag = i===e.atPly ? '  <-- TRIGGER (opponent deviation)' : '';
    rows.push(`  [${i}] ${(i%2===0?'W':'B')} ${e.moves[i].padEnd(7)} ${mv.from}->${mv.to}${mv.captured?` x${mv.captured}`:''}${tag}`);
  }
  console.log(rows.join('\n'));
  console.log('  FINAL FEN:', c.fen());
}

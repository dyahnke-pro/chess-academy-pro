// Ply-by-ply board facts for punish-gems, so narration names what is actually
// on the board. Usage: node scripts/gem-study.mjs <openingId> [maxUnnarrated]
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const opening = process.argv[2];
const max = Number(process.argv[3] ?? 99);
const gems = JSON.parse(readFileSync('src/data/punish-gems.json', 'utf8'));
const nsrc = readFileSync('src/data/lessons/punishGemNarration.ts', 'utf8');
const narrated = new Set([...nsrc.matchAll(/^  .([a-z0-9-]+:[^'"`]+).:\s*\{/gm)].map((m) => m[1]));
const idOf = (g) => `${g.openingId}:${g.lineMoves.replace(/ /g, '_')}:${g.inaccuracy}`;

const list = gems.filter((g) => g.openingId === opening && !narrated.has(idOf(g))).slice(0, max);
console.log(`${opening}: ${list.length} un-narrated gems\n`);

const PIECE = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
for (const g of list) {
  const id = idOf(g);
  const plies = g.playLine.split(' ');
  const inaccPly = g.lineMoves.split(' ').length; // 0-based index of the inaccuracy
  console.log(`\n══ ${id}`);
  console.log(`   tier=${g.tier} cp=${g.engineCp} | inaccuracy "${g.inaccuracy}" @ply${inaccPly} | punish "${g.punish}"`);
  const c = new Chess();
  plies.forEach((san, i) => {
    const mover = c.turn() === 'w' ? 'W' : 'B';
    let mv;
    try { mv = c.move(san); } catch { console.log(`   ply${i} ${san} ILLEGAL`); return; }
    const tags = [];
    if (i === inaccPly) tags.push('◀INACCURACY');
    if (i === inaccPly + 1) tags.push('◀PUNISH');
    if (mv.captured) tags.push(`x${PIECE[mv.captured]}`);
    if (mv.san.includes('+')) tags.push('check');
    if (mv.san.includes('#')) tags.push('MATE');
    // what does the moved piece now attack? (enemy pieces it hits)
    const hits = [];
    for (const sq of c.moves({ verbose: true }).filter((m) => m.from === mv.to && (m.captured))) hits.push(`${PIECE[sq.captured]}@${sq.to}`);
    console.log(`   ply${i} ${mover} ${mv.san}${tags.length ? '  ' + tags.join(' ') : ''}${hits.length ? '  attacks: ' + hits.join(',') : ''}`);
  });
}

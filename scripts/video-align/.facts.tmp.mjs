/* What is TRUE about the move this note is written on?
 *
 * Retrofitting reasons onto a note written before the checker existed is not a
 * memory exercise: the facts are computed here and the author only picks which
 * of them the prose actually claims. Anything not on this list cannot be a
 * reason, which is the point. */
import { readFileSync, readdirSync } from 'node:fs';
import { Chess } from 'chess.js';

const only = process.argv[2];
const ids = process.argv.slice(3);
const SQ = [];
for (const f of 'abcdefgh') for (const r of '12345678') SQ.push(f + r);
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

for (const file of readdirSync('data/video-notes').filter((f) => f.endsWith('.json'))) {
  if (only && !file.startsWith(only)) continue;
  for (const n of JSON.parse(readFileSync(`data/video-notes/${file}`, 'utf8'))) {
    if (ids.length && !ids.includes(n.id)) continue;
    if (n.reasons?.length) continue;
    const sans = n.line.trim().split(/\s+/);
    const before = new Chess();
    for (const s of sans.slice(0, -1)) before.move(s);
    const after = new Chess(before.fen());
    const played = after.move(sans[sans.length - 1]);
    const me = played.color, them = me === 'w' ? 'b' : 'w';
    const landed = played.to;
    const hits = SQ.filter((s) => after.attackers(s, me).includes(landed));
    const attacks = hits.filter((s) => after.get(s)?.color === them);
    const defends = hits.filter((s) => after.get(s)?.color === me);
    const controls = hits.filter((s) => !after.get(s));
    // What can the opponent no longer play?
    const parts = before.fen().split(' '); parts[1] = them; parts[3] = '-';
    let wasLegal = new Set();
    try { wasLegal = new Set(new Chess(parts.join(' ')).moves()); } catch { /* unreadable from their side */ }
    const nowLegal = new Set(after.moves());
    const prevented = [...wasLegal].filter((m) => !nowLegal.has(m));
    console.log(`\n### ${n.id}   [${file.replace('.json','')}]`);
    console.log(`  line   : ${n.line}`);
    console.log(`  move   : ${played.san}  (${NAME[played.piece]} ${played.from}->${played.to})`);
    console.log(`  attacks: ${attacks.map((s) => s + '(' + NAME[after.get(s).type] + ')').join(' ') || '-'}`);
    console.log(`  defends: ${defends.map((s) => s + '(' + NAME[after.get(s).type] + ')').join(' ') || '-'}`);
    console.log(`  controls: ${controls.join(' ') || '-'}`);
    console.log(`  prevents: ${prevented.slice(0, 14).join(' ') || '-'}${prevented.length > 14 ? ' …' : ''}`);
    console.log(`  teaches: ${n.teaches.slice(0, 150)}`);
    console.log(`  explains: ${n.explains.slice(0, 260)}`);
  }
}

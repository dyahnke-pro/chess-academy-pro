// Inspect a banked video's timeline while authoring.
//   node scripts/voiced-authoring/inspect.mjs <id>                → idx | ply | line | said
//   node scripts/voiced-authoring/inspect.mjs <id> 3 14 24        → full FEN for those array indices
import { readBank } from './lib.mjs';
const [id, ...idxArgs] = process.argv.slice(2);
const b = readBank(id);
console.log(`# ${id} | ${b.title} | ${b.moves.length} moves`);
if (idxArgs.length) {
  for (const i of idxArgs.map(Number)) {
    const m = b.moves[i];
    const line = Array.isArray(m.line) ? m.line.join(' ') : String(m.line || '');
    console.log(`idx${i} ply${m.ply} line=${line}\n  fen=${m.fen}`);
  }
} else {
  b.moves.forEach((m, i) => {
    const said = (m.said || '').replace(/\s+/g, ' ').trim().slice(0, 130);
    const line = Array.isArray(m.line) ? m.line.join(' ') : String(m.line || '');
    console.log(`${String(i).padStart(3)} p${String(m.ply).padStart(2)} ${line.slice(-24).padStart(24)} | ${said}`);
  });
}

import { readBank } from './lib.mjs';
const id = process.argv[2];
const b = readBank(id);
console.log(`# ${id} | title=${JSON.stringify(b.title)} | ${b.moves.length} moves`);
let maxPly = 0;
b.moves.forEach((m, i) => {
  const line = Array.isArray(m.line) ? m.line.join(' ') : String(m.line || '');
  const re = (typeof m.ply === 'number' && m.ply <= maxPly) ? ' *REANCHOR' : '';
  if (typeof m.ply === 'number' && m.ply > maxPly) maxPly = m.ply;
  const said = (m.said || '').replace(/\s+/g, ' ').trim();
  console.log(`#${i} p${m.ply}${re} [${line}]\n  ${said || '(silent)'}`);
});

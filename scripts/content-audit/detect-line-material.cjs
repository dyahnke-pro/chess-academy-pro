// Flag curated variation/main lines that END with the STUDENT down material —
// the "line ends on a blunder" class (e.g. Italian Ba3 dxc4 hung the bishop).
// chess.js-only (no engine). A negative balance may be a real gambit/sac, so
// these are REVIEW flags, not auto-fixes. Sorted worst-first.
const fs = require('fs');
const { Chess } = require('chess.js');
const dir = 'audit-reports/content-packets';
const ids = JSON.parse(fs.readFileSync(`${dir}/_manifest.json`, 'utf8')).map((m) => m.id);
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function balance(fen, studentColor) {
  // material from the student's perspective at this FEN
  const board = new Chess(fen).board();
  let white = 0, black = 0;
  for (const row of board) for (const sq of row) {
    if (!sq) continue;
    const v = VAL[sq.type];
    if (sq.color === 'w') white += v; else black += v;
  }
  const diff = white - black;
  return studentColor === 'white' ? diff : -diff;
}
function replayFen(pgn) {
  const g = new Chess();
  const moves = String(pgn || '').trim().split(/\s+/).map((m) => m.replace(/^\d+\.+/, '')).filter((m) => m && !/^\d+\.+$/.test(m));
  for (const m of moves) { try { if (!g.move(m)) return null; } catch { return null; } }
  return g.fen();
}

const flags = [];
for (const id of ids) {
  const p = JSON.parse(fs.readFileSync(`${dir}/${id}.json`, 'utf8'));
  const color = p.color;
  if (!color) continue;
  const lines = [{ name: '(main spine)', pgn: p.spinePgn }, ...(p.variations || []).map((v) => ({ name: v.name, pgn: v.pgn }))];
  for (const ln of lines) {
    const fen = replayFen(ln.pgn);
    if (!fen) continue;
    const bal = balance(fen, color);
    if (bal <= -2) flags.push({ id, line: ln.name, studentBalance: bal });
  }
}
flags.sort((a, b) => a.studentBalance - b.studentBalance);
console.log(`lines ending with student down >=2 material: ${flags.length}`);
for (const f of flags) console.log(`  ${f.studentBalance >= 0 ? '+' : ''}${f.studentBalance}  ${f.id} :: ${f.line}`);
fs.writeFileSync('audit-reports/content-audit/_line-material.json', JSON.stringify(flags, null, 2));

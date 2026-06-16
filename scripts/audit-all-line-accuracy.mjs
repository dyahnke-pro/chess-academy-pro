// WHOLE-PROGRAM line accuracy audit — every recommended line is sold, so every
// one must be legal + not losing. Covers repertoire + pro-repertoires + gambits
// + anti-openings (mains + variations + trapLines) and ALL course sublines.
// chess.js legality + Stockfish terminus eval from the student's side. Role-aware:
//   play lines (main/var/sub): FLAG if student < -1.0 (and not a gambit)
//   trapLines (weapons):       FLAG if student < 0 (toothless / mis-oriented)
//   warningLines (anti-traps): student is MEANT to be worse — not audited here
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
const SF = '/usr/games/stockfish';
const root = new URL('..', import.meta.url).pathname;
const load = (p) => { try { const j = JSON.parse(readFileSync(root + p, 'utf8')); return j.openings || j; } catch { return []; } };
const rep = load('src/data/repertoire.json'), pro = load('src/data/pro-repertoires.json'), gam = load('src/data/gambits.json'), anti = load('src/data/anti-openings.json');
const sublines = JSON.parse(readFileSync(root + 'src/data/course-sublines.json', 'utf8'));
const colorOf = {}, gambitOf = {};
for (const o of rep) if (o && o.id) { colorOf[o.id] = o.color; gambitOf[o.id] = !!o.isGambit; }
for (const o of pro) if (o && o.id) { colorOf[o.id] = o.color; gambitOf[o.id] = !!o.isGambit; }
for (const o of gam) if (o && o.id) { colorOf[o.id] = o.color; gambitOf[o.id] = true; }
for (const o of anti) if (o && o.id) { colorOf[o.id] = o.color; gambitOf[o.id] = false; }
function sans(pgn) { if (!pgn) return null; const t = pgn.trim().split(/\s+/).map((x) => x.replace(/^\d+\.(\.\.)?/, '')).filter((x) => x && !/^\d+\.?$/.test(x)); const c = new Chess(); const o = []; for (const m of t) { try { o.push(c.move(m).san); } catch { return null; } } return o; }
function ev(fen, d = 12) { return new Promise((res) => { const p = spawn(SF); let b = 0, o = ''; p.stdout.on('data', (x) => { o += x; let i; while ((i = o.indexOf('\n')) >= 0) { const ln = o.slice(0, i); o = o.slice(i + 1); const m = /score (cp|mate) (-?\d+)/.exec(ln); if (m) b = m[1] === 'mate' ? (+m[2] > 0 ? 1000 : -1000) : +m[2]; if (ln.startsWith('bestmove')) { p.kill(); res(b); } } }); p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${d}\n`); }); }
const lines = [];
for (const o of [...rep, ...pro, ...gam, ...anti]) { if (!o || !o.id) continue;
  if (o.pgn) lines.push({ id: o.id, role: 'play', kind: 'main', label: 'main', moves: sans(o.pgn), raw: o.pgn });
  for (const v of (o.variations || [])) lines.push({ id: o.id, role: 'play', kind: 'var', label: v.name, moves: sans(v.pgn), raw: v.pgn });
  for (const t of (o.trapLines || [])) lines.push({ id: o.id, role: 'trap', kind: 'trap', label: t.name || 'trap', moves: sans(t.pgn), raw: t.pgn });
}
for (const [id, perVar] of Object.entries(sublines)) for (const subs of Object.values(perVar)) for (const s of subs) lines.push({ id, role: 'play', kind: 'sub', label: s.name, moves: s.moves, raw: s.moves.join(' ') });
console.log(`auditing ${lines.length} lines (whole program)…`);
const illegal = [], losing = [], toothless = [], noColor = new Set();
let done = 0;
for (const L of lines) { done++; if (done % 500 === 0) console.log(`  ${done}/${lines.length}`);
  const color = colorOf[L.id]; if (!color) { noColor.add(L.id); continue; }
  if (!L.moves) { illegal.push(L); continue; }
  const c = new Chess(); let ok = true; for (const m of L.moves) { try { c.move(m); } catch { ok = false; break; } }
  if (!ok) { illegal.push(L); continue; }
  const stm = c.turn() === 'w' ? 'white' : 'black'; const raw = await ev(c.fen()); const se = (stm === color ? raw : -raw) / 100;
  if (L.role === 'play') { if (se < -1.0 && !gambitOf[L.id]) losing.push({ id: L.id, kind: L.kind, label: L.label, eval: +se.toFixed(2), line: L.raw }); }
  else if (L.role === 'trap') { if (se < 0) toothless.push({ id: L.id, label: L.label, eval: +se.toFixed(2), line: L.raw }); }
}
losing.sort((a, b) => a.eval - b.eval); toothless.sort((a, b) => a.eval - b.eval);
const dir = `audit-reports/all-line-accuracy-${new Date().toISOString().replace(/[:.]/g, '-')}`; mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/report.json`, JSON.stringify({ total: lines.length, illegal: illegal.map((x) => ({ id: x.id, kind: x.kind, label: x.label, line: x.raw })), losing, toothless, noColor: [...noColor] }, null, 2));
console.log(`\n=== WHOLE-PROGRAM LINE ACCURACY ===`);
console.log(`total: ${lines.length} | unknown-color(skipped): ${noColor.size}`);
console.log(`ILLEGAL: ${illegal.length}`); for (const x of illegal.slice(0, 25)) console.log(`  ! ${x.id} [${x.kind}] ${x.label}: ${x.raw}`);
console.log(`LOSING play-lines (student < -1.0, non-gambit): ${losing.length}`); for (const x of losing.slice(0, 50)) console.log(`  X ${x.id} [${x.kind}] ${x.label} ${x.eval} | ${x.line}`);
console.log(`TOOTHLESS traps (student < 0): ${toothless.length}`); for (const x of toothless.slice(0, 30)) console.log(`  ~ ${x.id} ${x.label} ${x.eval} | ${x.line}`);
console.log(`\nDONE. report: ${dir}/report.json`);
EOF

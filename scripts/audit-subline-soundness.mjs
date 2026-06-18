// Soundness audit for ALL course sublines (David 2026-06-18): are we teaching a
// losing position? Engine-evals the TERMINUS of every subline from the STUDENT's
// perspective and flags any clearly worse than the bar. Gambit openings get a
// lenient bar (a sacrificed pawn is the point); quiet lines must not be losing.
//   node scripts/audit-subline-soundness.mjs            (full, ~20-30 min)
//   AUDIT_DEPTH=10 AUDIT_LIMIT=400 node scripts/audit-subline-soundness.mjs   (fast sample)
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';

const SF = '/usr/games/stockfish';
const DEPTH = Number(process.env.AUDIT_DEPTH || 12);
const LIMIT = Number(process.env.AUDIT_LIMIT || 0); // 0 = all
const QUIET_BAR = -1.5;   // pawns: quiet line worse than this = flag
const LOSING_BAR = -2.5;  // clearly losing
const GAMBIT_BAR = -3.5;  // gambit lines get slack (they sacrificed)

function colorMap() {
  const m = {};
  for (const f of ['repertoire.json', 'anti-openings.json', 'gambits.json']) {
    try {
      const raw = JSON.parse(fs.readFileSync('src/data/' + f, 'utf8'));
      const arr = Array.isArray(raw) ? raw : raw.openings || Object.values(raw);
      for (const o of arr) if (o && o.id && o.color) m[o.id] = o.color;
    } catch { /* skip */ }
  }
  return m;
}
const COLOR = colorMap();
const isGambit = (id) => /gambit/.test(id) || ['evans-gambit', 'kings-gambit', 'danish-gambit', 'budapest-gambit', 'benko-gambit', 'albin-countergambit', 'englund-gambit', 'stafford-gambit', 'smith-morra-gambit', 'scotch-gambit', 'vienna-gambit', 'schliemann-defence', 'marshall-attack'].includes(id);

function ev(fen) {
  return new Promise((res) => {
    const sf = spawn(SF); let cp = null;
    sf.stdout.on('data', (d) => {
      const s = d.toString();
      const m = s.match(/score cp (-?\d+)/g); if (m) cp = parseInt(m[m.length - 1].match(/-?\d+/)[0]);
      const mt = s.match(/score mate (-?\d+)/); if (mt) cp = parseInt(mt[1]) > 0 ? 10000 : -10000;
      if (/bestmove/.test(s)) { sf.kill(); res(cp); }
    });
    sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
    setTimeout(() => { try { sf.kill(); } catch { /* */ } res(cp); }, 6000);
  });
}

const d = JSON.parse(fs.readFileSync('src/data/course-sublines.json', 'utf8'));
const jobs = [];
for (const [openingId, vars] of Object.entries(d)) {
  const color = COLOR[openingId] || 'white';
  for (const [vi, list] of Object.entries(vars)) {
    for (const s of list) {
      const c = new Chess(); let ok = true;
      for (const mv of s.moves) { try { c.move(mv); } catch { ok = false; break; } }
      if (!ok) continue;
      jobs.push({ openingId, vi, color, fen: c.fen(), key: `${openingId}::${vi}::${s.triggerMove}@${s.atPly}` });
    }
  }
}
const all = LIMIT ? jobs.slice(0, LIMIT) : jobs;
console.error(`[soundness] evaluating ${all.length} subline termini at depth ${DEPTH}…`);

const flagged = [];
let done = 0;
for (const j of all) {
  const cp = await ev(j.fen);
  done++;
  if (done % 250 === 0) console.error(`  ${done}/${all.length}`);
  if (cp == null) { flagged.push({ ...j, studentEval: 'no-eval' }); continue; }
  const stm = j.fen.split(' ')[1] === 'w' ? 'white' : 'black';
  const studentEval = (stm === j.color ? cp : -cp) / 100;
  const bar = isGambit(j.openingId) ? GAMBIT_BAR : QUIET_BAR;
  if (studentEval < bar) flagged.push({ ...j, studentEval, bar, losing: studentEval < LOSING_BAR });
}

flagged.sort((a, b) => (a.studentEval === 'no-eval' ? -99 : a.studentEval) - (b.studentEval === 'no-eval' ? -99 : b.studentEval));
const byOpening = {};
for (const f of flagged) byOpening[f.openingId] = (byOpening[f.openingId] || 0) + 1;
const out = { evaluated: all.length, flagged: flagged.length, depth: DEPTH, byOpening, worst: flagged.slice(0, 40) };
fs.writeFileSync('audit-reports/subline-soundness.json', JSON.stringify(out, null, 2));
console.log(`\n[soundness] ${flagged.length} / ${all.length} termini below bar`);
console.log('by opening:', Object.entries(byOpening).sort((a, b) => b[1] - a[1]).map(([o, n]) => `${o}:${n}`).join('  ') || '(none)');
console.log('\nworst 20 (student eval in pawns):');
for (const f of flagged.slice(0, 20)) console.log(`  ${String(f.studentEval).padStart(7)}  ${f.key}`);
console.log('\nfull report: audit-reports/subline-soundness.json');

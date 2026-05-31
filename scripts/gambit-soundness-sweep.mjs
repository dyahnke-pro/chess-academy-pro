#!/usr/bin/env node
// Gambit soundness sweep (David 2026-05-31: "we cannot teach losing positions").
// Engine-evals, from the STUDENT's perspective: (1) every gambit opening-spine
// terminus, (2) every endgame-plan criticalPositionFen + its line's final
// position. Flags anything clearly losing. Sharp-gambit compensation (~−0.5) is
// expected/honest; clearly losing (worse than FLAG cp) is a defect to fix or
// relabel — never teach a losing line as winning/equal.
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const SF = ['/usr/games/stockfish', '/usr/bin/stockfish', process.env.STOCKFISH_PATH].filter(Boolean).find((p) => existsSync(p));
const DEPTH = Number(process.env.DEPTH ?? 18);
const FLAG = Number(process.env.FLAG ?? -120); // worse than this (cp, student POV) = flagged

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
    setTimeout(() => { try { sf.kill(); } catch {} res(cp); }, 15000);
  });
}
const WHITE = new Set(['kg', 'ev', 'sc', 'vi', 'da', 'sm']);
const studentOf = (id) => (WHITE.has(id.split('__')[0]) ? 'w' : 'b');
// student-POV cp: positive = good for student
const persp = (cp, fen, student) => { const turn = new Chess(fen).turn(); return turn === student ? cp : -cp; };

async function fenAfter(moves) { const c = new Chess(); for (const m of moves) c.move(m); return c.fen(); }

(async () => {
  if (!SF) { console.error('no stockfish'); process.exit(1); }
  const rows = [];
  // 1) opening-spine termini (variation spines)
  for (const f of readdirSync('data/sources/opening-spines').filter((x) => x.includes('__'))) {
    const s = JSON.parse(readFileSync('data/sources/opening-spines/' + f));
    const student = studentOf(s.openingId);
    const fen = await fenAfter(s.spine);
    const cp = persp(await ev(fen), fen, student);
    rows.push({ kind: 'spine', id: f.replace('.json', ''), student, cp, plies: s.spine.length });
  }
  // 2) endgame-plan positions (gambit + the 5 canonical, in middlegame-plans.json + gambit-plans.json)
  const plans = [];
  for (const pf of ['src/data/middlegame-plans.json', 'src/data/gambit-plans.json']) {
    const a = JSON.parse(readFileSync(pf, 'utf8')); for (const p of (Array.isArray(a) ? a : a.plans || [])) plans.push(p);
  }
  const GAMBIT_OPENINGS = new Set(['kings-gambit', 'evans-gambit', 'benko-gambit', 'budapest-gambit', 'albin-countergambit', 'scotch-gambit', 'vienna-gambit', 'danish-gambit', 'smith-morra-gambit', 'stafford-gambit', 'marshall-attack', 'englund-gambit']);
  for (const p of plans) {
    if (!GAMBIT_OPENINGS.has(p.openingId) || !(p.id || '').includes('-endgame')) continue;
    const blackOpenings = new Set(['benko-gambit', 'budapest-gambit', 'albin-countergambit', 'stafford-gambit', 'marshall-attack', 'englund-gambit']);
    const student = blackOpenings.has(p.openingId) ? 'b' : 'w';
    const line = p.playableLines?.[0];
    const startCp = persp(await ev(p.criticalPositionFen), p.criticalPositionFen, student);
    let endCp = startCp;
    if (line) { const c = new Chess(line.fen); for (const m of line.moves) c.move(m); const fen = c.fen(); endCp = persp(await ev(fen), fen, student); }
    rows.push({ kind: 'endgame', id: p.id, student, cp: endCp, start: startCp });
  }
  rows.sort((a, b) => a.cp - b.cp);
  console.log('\n=== STUDENT-POV EVAL (cp; negative = student worse) — worst first ===');
  for (const r of rows) {
    const flag = r.cp < FLAG ? '  ◄◄ LOSING' : (r.cp < -50 ? '  ~ sharp/worse' : '');
    console.log(`  ${r.kind.padEnd(7)} ${r.student} ${String(r.cp).padStart(6)}cp  ${r.id.padEnd(28)}${r.start !== undefined ? '(start ' + r.start + ')' : ''}${flag}`);
  }
  const bad = rows.filter((r) => r.cp < FLAG);
  console.log(`\n${bad.length} positions are LOSING for the student (worse than ${FLAG}cp) — fix or relabel:`);
  for (const r of bad) console.log(`  ${r.id} (${r.cp}cp)`);
})();

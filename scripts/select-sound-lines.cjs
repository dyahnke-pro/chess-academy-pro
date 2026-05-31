// Eval-select the soundest REAL line per plan. For each plan we already have a
// set of candidate real winning-game segments (grounded-plan-candidates.json).
// We eval each candidate's move-~17 endpoint from the STUDENT's side and keep the
// one where the student is genuinely on top (David: "use a winning position").
// Every move is still a real game move — Stockfish only PICKS which real line.
// Writes the winners back into grounded-plan-lines.json.
const fs = require('fs');
const { spawn } = require('child_process');

const result = JSON.parse(fs.readFileSync('audit-reports/grounded-plan-lines.json', 'utf8'));
const candidates = JSON.parse(fs.readFileSync('audit-reports/grounded-plan-candidates.json', 'utf8'));
const repo = require('../src/data/pro-repertoires.json');
const mp = require('../src/data/middlegame-plans.json');
const plans = Array.isArray(mp) ? mp : (mp.plans || []);

function studentColor(planId) {
  const plan = plans.find((p) => p.id === planId);
  const op = repo.openings.find((o) => o.id === (plan && plan.openingId));
  return (op && op.color) === 'black' ? 'b' : 'w';
}
function evalFen(fen) {
  return new Promise((res) => {
    const sf = spawn('/usr/games/stockfish'); let out = '';
    sf.stdout.on('data', (d) => { out += d.toString(); });
    sf.stdin.write('uci\n');
    setTimeout(() => sf.stdin.write(`position fen ${fen}\ngo depth 16\n`), 150);
    setTimeout(() => {
      const ls = out.split('\n').filter((l) => l.includes('score cp') || l.includes('score mate'));
      const m = (ls[ls.length - 1] || '').match(/score (cp|mate) (-?\d+)/);
      const stm = fen.split(' ')[1];
      let cp = m ? (m[1] === 'cp' ? parseInt(m[2], 10) : (m[2] > 0 ? 1000 : -1000)) : 0;
      sf.kill();
      res(stm === 'w' ? cp : -cp); // white POV
    }, 1600);
  });
}

(async () => {
  const ids = Object.keys(result);
  let improved = 0, flagged = [];
  for (const id of ids) {
    const sc = studentColor(id);
    const toStudent = (whiteCp) => (sc === 'w' ? whiteCp : -whiteCp);
    // current pick
    const curCp = toStudent(await evalFen(result[id].endFen || result[id].fen));
    if (curCp >= -30) continue; // already sound for the student
    // try candidates, pick best student-eval
    const cands = candidates[id] || [];
    let best = { line: result[id], cp: curCp };
    for (const cand of cands) {
      if (!cand.endFen) continue;
      const cp = toStudent(await evalFen(cand.endFen));
      if (cp > best.cp) best = { line: cand, cp };
      if (cp >= 50) break; // clearly winning — good enough
    }
    if (best.line !== result[id]) { result[id] = best.line; improved++; }
    if (best.cp < -50) flagged.push(`${id} (best student cp ${best.cp})`);
  }
  fs.writeFileSync('audit-reports/grounded-plan-lines.json', JSON.stringify(result, null, 2));
  console.log(`re-selected ${improved} plans to a sounder real line`);
  console.log(`still not-sound (no winning real segment found): ${flagged.length}`);
  flagged.slice(0, 20).forEach((f) => console.log('  FLAG', f));
})();

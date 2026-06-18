// Soundness sweep for the extended course sublines (David 2026-06-18: "never
// teach the student into a losing position"). Evals the TERMINUS of every
// subline from the STUDENT's perspective and flags any worse than the bar.
// The student is the side to move at the deviation's atPly (the line is built
// so the deviation is the OPPONENT's move; the student replies next). A line
// is unsound if the final position is clearly lost for the student and the
// line is NOT a deliberate gambit/sacrifice showcase.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname + '/';
const data = JSON.parse(readFileSync(ROOT + 'src/data/course-sublines.json', 'utf8'));
const only = process.env.OPENINGS ? new Set(process.env.OPENINGS.split(',')) : null;
const SF = '/usr/games/stockfish';
const MS = Number(process.env.MS || 700);
const BAR = Number(process.env.BAR || -1.2); // pawns; worse than this = flagged
const CONCURRENCY = 4;

function makeEngine() {
  const p = spawn(SF);
  let resolver = null, buf = '';
  p.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (/^bestmove/.test(line) && resolver) {
        const r = resolver; resolver = null; r({ cp: eng.cp, mate: eng.mate });
      }
      let m = line.match(/score cp (-?\d+)/); if (m) eng.cp = +m[1];
      m = line.match(/score mate (-?\d+)/); if (m) { eng.mate = +m[1]; eng.cp = null; }
    }
  });
  const eng = {
    cp: null, mate: null,
    eval(fen) {
      return new Promise((res) => {
        eng.cp = null; eng.mate = null; resolver = res;
        const t = setTimeout(() => { if (resolver === res) { resolver = null; res({ cp: null, mate: null }); } }, MS + 4000);
        const orig = res; resolver = (v) => { clearTimeout(t); orig(v); };
        p.stdin.write(`position fen ${fen}\ngo movetime ${MS}\n`);
      });
    },
    quit() { try { p.stdin.write('quit\n'); p.kill(); } catch { /* noop */ } },
  };
  p.stdin.write('uci\nisready\nucinewgame\n');
  return eng;
}

const jobs = [];
for (const o of Object.keys(data)) {
  if (only && !only.has(o)) continue;
  for (const v of Object.keys(data[o])) for (const s of data[o][v]) {
    jobs.push({ o, v, s });
  }
}
const total = jobs.length; let done = 0;
const flagged = [];
async function worker() {
  const eng = makeEngine();
  while (jobs.length) {
    const { o, v, s } = jobs.pop();
    const c = new Chess();
    let ok = true;
    for (const mv of s.moves) { try { c.move(mv); } catch { ok = false; break; } }
    if (!ok) { flagged.push({ key: `${o}::${v}::${s.triggerMove}@${s.atPly}`, reason: 'ILLEGAL' }); done++; continue; }
    // The deviation at index atPly is the OPPONENT's move (even index = White's
    // move → student is Black; odd index = Black's move → student is White).
    const studentWhite = s.atPly % 2 === 1;
    const { cp, mate } = await eng.eval(c.fen());
    const turn = c.turn(); // side to move at terminus
    // engine score is from side-to-move POV; convert to WHITE POV.
    // mate>0 = stm wins; mate<=0 (incl 0 = mated now) = stm loses.
    let whiteCp = null;
    if (mate != null) {
      const stmWins = mate > 0;
      const whiteWins = turn === 'w' ? stmWins : !stmWins;
      whiteCp = whiteWins ? 1000 : -1000;
    } else if (cp != null) {
      whiteCp = turn === 'w' ? cp : -cp;
    }
    const studentCp = whiteCp == null ? null : (studentWhite ? whiteCp : -whiteCp) / 100;
    if (studentCp != null && studentCp < BAR) {
      flagged.push({ key: `${o}::${v}::${s.triggerMove}@${s.atPly}`, studentCp: studentCp.toFixed(2), line: s.moves.join(' ') });
    }
    done++;
    if (done % 200 === 0) console.error(`  ${done}/${total} (flagged ${flagged.length})`);
  }
  eng.quit();
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
flagged.sort((a, b) => (a.studentCp ?? 0) - (b.studentCp ?? 0));
console.log(JSON.stringify(flagged, null, 2));
console.error(`\nDONE ${done}/${total} — ${flagged.length} flagged worse than ${BAR}`);

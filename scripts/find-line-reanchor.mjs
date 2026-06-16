// Re-anchor finder — for each flagged losing line, find the FIRST student move
// that leaves clear value on the table vs the engine's best, and propose the
// better move. A clear culprit = fixable defect (re-anchor there). No culprit
// (every student move ~best, still worse) = the opening's nature, not a bug.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
const SF = '/usr/games/stockfish';
const root = new URL('..', import.meta.url).pathname;
const REPORT = process.argv[2];
const rep = JSON.parse(readFileSync(REPORT, 'utf8'));
const load = (p) => { try { const j = JSON.parse(readFileSync(root + p, 'utf8')); return j.openings || j; } catch { return []; } };
const all = [...load('src/data/repertoire.json'), ...load('src/data/pro-repertoires.json'), ...load('src/data/gambits.json'), ...load('src/data/anti-openings.json')];
const colorOf = {}; for (const o of all) if (o && o.id) colorOf[o.id] = o.color;
const GAMBITRE = /gambit|muzio|max lange|halloween|counter-?gambit|allgaier|king'?s gambit|stafford|cochrane|danish|smith-morra|albin|schliemann|englund|latvian|elephant/i;
function sans(p) { const t = p.trim().split(/\s+/).map((x) => x.replace(/^\d+\.(\.\.)?/, '')).filter((x) => x && !/^\d+\.?$/.test(x)); const c = new Chess(); const o = []; for (const m of t) { try { o.push(c.move(m).san); } catch { return null; } } return o; }
// best move + its cp (side-to-move POV) at depth d
function best(fen, d = 18) { return new Promise((res) => { const p = spawn(SF); let cp = 0, mv = null, o = ''; p.stdout.on('data', (x) => { o += x; let i; while ((i = o.indexOf('\n')) >= 0) { const ln = o.slice(0, i); o = o.slice(i + 1); const m = /score (cp|mate) (-?\d+)/.exec(ln); if (m) cp = m[1] === 'mate' ? (+m[2] > 0 ? 1000 : -1000) : +m[2]; const bm = /^bestmove (\S+)/.exec(ln); if (bm) { mv = bm[1]; p.kill(); res({ cp, uci: mv }); } } }); p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${d}\n`); }); }
const isStudent = (ply, color) => (ply % 2 === 0) === (color === 'white');
function uciToSan(fen, u) { const c = new Chess(fen); const mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); return mv ? mv.san : u; }

console.log('id | culprit? | first sub-optimal student move -> engine best (gain)');
for (const L of rep.losing) {
  const color = colorOf[L.id]; const s = sans(L.line); if (!s || !color) continue;
  if (GAMBITRE.test(L.id) || GAMBITRE.test(L.label)) continue;
  const c = new Chess(); let culprit = null;
  for (let i = 0; i < s.length; i++) {
    if (isStudent(i, color) && i <= 14) { // re-anchorable culprits live in the opening phase
      const fenBefore = c.fen();
      const b = await best(fenBefore, 12); // best for student (side to move)
      const bestStudentCp = b.cp; // side-to-move = student
      // student's actual move eval
      const probe = new Chess(fenBefore); probe.move(s[i]);
      const after = await best(probe.fen(), 12); // opponent to move; negate for student
      const studentCp = -after.cp;
      const gain = (bestStudentCp - studentCp) / 100;
      if (gain > 0.7 && bestStudentCp / 100 > -0.8) { // a clearly better move existed that keeps it playable
        culprit = { ply: i, move: s[i], better: uciToSan(fenBefore, b.uci), studentEval: (studentCp / 100).toFixed(2), betterEval: (bestStudentCp / 100).toFixed(2), gain: gain.toFixed(2) };
        break;
      }
    }
    c.move(s[i]);
  }
  if (culprit) console.log(`  ${L.id} [${L.kind}] ${L.label}  | FIXABLE @move${Math.ceil((culprit.ply + 1) / 2)}: ${culprit.move}(${culprit.studentEval}) -> ${culprit.better}(${culprit.betterEval})  gain ${culprit.gain}`);
  else console.log(`  ${L.id} [${L.kind}] ${L.label}  | opening-nature (no single better move; best-play still worse)`);
}
console.log('DONE-REANCHOR');

#!/usr/bin/env node
// Re-validate every allowlisted ("broken") trap/warning line against good data
// (David 2026-05-31: "rerun the broken to make sure we have good data. remine,
// if still not a valid trap then toss"). For each flagged line: replay it,
// engine-eval the FINAL position from the student's perspective, and record
// whether it is a genuine winning trap. Output drives keep/fix/toss.
//   PASS  = student eval >= +2.0 (or mate) — a real trap (crude proxy was wrong)
//   WEAK  = +0.5..+2.0 — positional edge, not a forced material trap
//   FAIL  = < +0.5 — not a trap at all
//   PARSE = illegal PGN
// Writes /tmp/trap-reval.json.
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const SF = '/usr/games/stockfish';
const DEPTH = 16;
function evalFen(fen) {
  return new Promise((resolve) => {
    const sf = spawn(SF);
    let best = null;
    const to = setTimeout(() => { try { sf.kill(); } catch {} resolve(best); }, 12000);
    sf.stdout.on('data', (buf) => {
      const s = buf.toString();
      const cp = s.match(/score cp (-?\d+)/g);
      const mate = s.match(/score mate (-?\d+)/g);
      if (cp) best = { type: 'cp', val: parseInt(cp[cp.length - 1].match(/-?\d+/)[0], 10) };
      if (mate) best = { type: 'mate', val: parseInt(mate[mate.length - 1].match(/-?\d+/)[0], 10) };
      if (/bestmove/.test(s)) { clearTimeout(to); sf.kill(); resolve(best); }
    });
    sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
  });
}

const repertoire = JSON.parse(await readFile(new URL('../src/data/repertoire.json', import.meta.url)));
const baseline = JSON.parse(await readFile(new URL('../src/data/repertoire-orientation-baseline.json', import.meta.url))).allowlist;
const flaggedKeys = new Set(Object.keys(baseline));

const results = [];
for (const op of repertoire) {
  const studentChar = op.color === 'white' ? 'w' : 'b';
  for (const role of ['trap', 'warning']) {
    const lines = op[role === 'trap' ? 'trapLines' : 'warningLines'] ?? [];
    for (const line of lines) {
      const key = `${op.id}::${role}::${line.name}`;
      if (!flaggedKeys.has(key)) continue;
      const c = new Chess();
      let ok = true;
      try {
        if (line.setupFen) { c.load(line.setupFen); for (const t of line.pgn.trim().split(/\s+/).filter(Boolean)) c.move(t.replace(/^\d+\.+/, '').replace(/[+#!?]+$/, '')); }
        else c.loadPgn(line.pgn);
      } catch { ok = false; }
      if (!ok) { results.push({ key, verdict: 'PARSE', cp: null }); continue; }
      // Terminal-position handling FIRST (chess.js, not the engine — Stockfish
      // can't score a checkmated position and returns nothing, which would
      // mis-score a real mating trap). The student delivered mate iff the
      // position is checkmate and the side-to-move is NOT the student.
      let verdict, studentCp;
      if (c.isCheckmate()) {
        const matedSide = c.turn();
        if (matedSide !== studentChar) { verdict = 'PASS'; studentCp = 10000; }
        else { verdict = 'FAIL'; studentCp = -10000; }
        results.push({ key, verdict, cp: studentCp, flags: baseline[key] });
        process.stdout.write(`${verdict} ${String(studentCp).padStart(6)}  ${key}\n`);
        continue;
      }
      const ev = await evalFen(c.fen());
      const stm = c.turn(); // side to move
      let mate = false; studentCp = 0;
      if (ev?.type === 'mate') { mate = true; const m = stm === studentChar ? ev.val : -ev.val; studentCp = m > 0 ? 10000 : -10000; }
      else if (ev?.type === 'cp') { studentCp = stm === studentChar ? ev.val : -ev.val; }
      if (mate && studentCp > 0) verdict = 'PASS';
      else if (mate && studentCp < 0) verdict = 'FAIL';
      else if (studentCp >= 200) verdict = 'PASS';
      else if (studentCp >= 50) verdict = 'WEAK';
      else verdict = 'FAIL';
      results.push({ key, verdict, cp: studentCp, flags: baseline[key] });
      process.stdout.write(`${verdict} ${String(studentCp).padStart(6)}  ${key}\n`);
    }
  }
}
await writeFile('/tmp/trap-reval.json', JSON.stringify(results, null, 1));
const by = results.reduce((a, r) => { a[r.verdict] = (a[r.verdict] || 0) + 1; return a; }, {});
console.log('\nSUMMARY', JSON.stringify(by), 'total', results.length);

#!/usr/bin/env node
// Comprehensive lesson-line verifier (David 2026-06-22: "verify every main line
// and variation … we do not teach bad/losing positions … check against database
// to make sure the lines are accurate"). For every curated lesson (masterclass +
// pro, main + variation tabs) it checks the line Practice/Learn/Watch teaches —
// the deepest-beat spine — on three axes:
//   1. LEGALITY   — every move legal from the prior position (chess.js). An
//                   illegal move = fabrication (G3 violation).
//   2. DB ANCHOR  — walk the spine through the masters DB (openings-masters-db.json,
//                   FEN-keyed move aggregates). Reports book depth and flags an
//                   OFF-BOOK move: the position IS in the masters DB but the
//                   taught move was NEVER played by a master from it (a real
//                   accuracy red flag — a deviation that may be invented/unsound).
//                   Going PAST the DB's coverage (deep middlegame) is expected.
//   3. SOUNDNESS  — engine-eval the terminus from the STUDENT's perspective;
//                   flag worse than -1.0 (the hidden-dubious defect class). Sharp
//                   gambits/sacrifices are expected-negative (flagged separately).
// Run: node scripts/verify-lesson-lines.mjs [--no-engine] [--depth=16]
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const NO_ENGINE = process.argv.includes('--no-engine');
const DEPTH = Number((process.argv.find((a) => a.startsWith('--depth=')) || '').split('=')[1] || 16);
const SF = ['/usr/games/stockfish', '/usr/bin/stockfish', process.env.STOCKFISH_PATH].find((p) => p && existsSync(p));
if (!NO_ENGINE && !SF) { console.error('no stockfish binary — pass --no-engine or install it'); process.exit(2); }

function evalCp(fen) {
  return new Promise((res) => {
    const sf = spawn(SF); let cp = null;
    sf.stdout.on('data', (d) => {
      const s = d.toString();
      const m = s.match(/score cp (-?\d+)/g); if (m) cp = parseInt(m[m.length - 1].match(/-?\d+/)[0], 10);
      const mt = s.match(/score mate (-?\d+)/); if (mt) cp = parseInt(mt[1], 10) > 0 ? 10000 : -10000;
      if (/bestmove/.test(s)) { sf.kill(); res(cp); }
    });
    sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
    setTimeout(() => { try { sf.kill(); } catch { /* */ } res(cp); }, 12000);
  });
}

// Masters DB: FEN (placement side castling ep) → [{san, games, rating}]
const masters = JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8')).positions;
const bookKey = (fen) => fen.split(' ').slice(0, 4).join(' ');

// Gambit / sacrifice showcases: a negative student eval is an HONEST historical
// showcase here, not a defect (CLAUDE.md soundness doctrine).
const GAMBIT = /gambit|muzio|allgaier|kieseritzky|traxler|max lange|evans|danish|smith-morra|englund|cochrane|fried liver|stafford|morra|from'?s|göring|goring|belgrade|halloween|vaganian|raptor|compromised|king'?s gambit|latvian|albin|blackmar|wing gambit|benko/i;

const out = join(tmpdir(), `ll-${Date.now()}.mjs`);
await build({ entryPoints: ['src/data/lessons/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out, loader: { '.json': 'json' }, logLevel: 'error' });
const { getAllLessonScripts } = await import(out);

const rows = [];
for (const { key, lesson } of getAllLessonScripts()) {
  let bt = lesson.beats[0];
  for (const x of lesson.beats) if (x.moves.length > bt.moves.length) bt = x;
  const moves = bt.moves;

  // 1. LEGALITY + 2. DB ANCHOR (single replay)
  const c = new Chess();
  let illegalAt = -1, bookDepth = 0, offBook = null;
  for (let i = 0; i < moves.length; i++) {
    const fenBefore = c.fen();
    const entry = masters[bookKey(fenBefore)];
    let played;
    try { played = c.move(moves[i]); } catch { illegalAt = i; break; }
    if (entry) {
      const known = entry.some((e) => e.san === played.san);
      if (known && offBook === null) bookDepth = i + 1;
      else if (!known && offBook === null) offBook = { ply: i, san: played.san, alts: entry.slice(0, 3).map((e) => e.san) };
    }
    // position not in DB → past book coverage; stop counting (expected)
  }
  const student = lesson.orientation === 'black' ? 'b' : 'w';
  rows.push({ key, plies: moves.length, student, illegalAt, bookDepth, offBook, termFen: illegalAt < 0 ? c.fen() : null, isGambit: GAMBIT.test(key) });
}

// 3. SOUNDNESS (engine) — only for legal lines
if (!NO_ENGINE) {
  let done = 0;
  for (const r of rows) {
    if (r.illegalAt >= 0) { r.cp = null; continue; }
    const cp = await evalCp(r.termFen);
    const turn = r.termFen.split(' ')[1];
    r.cp = cp === null ? null : (turn === r.student ? cp : -cp);
    if (++done % 50 === 0) process.stderr.write(`  …evaluated ${done}/${rows.length}\n`);
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
const illegal = rows.filter((r) => r.illegalAt >= 0);
const offbook = rows.filter((r) => r.offBook);
const losing = rows.filter((r) => r.cp !== null && r.cp !== undefined && r.cp < -100 && !r.isGambit);
const gambitNeg = rows.filter((r) => r.cp !== null && r.cp !== undefined && r.cp < -100 && r.isGambit);

const fmt = (r) => `${r.student} ${String(r.cp ?? '—').padStart(6)}cp book=${String(r.bookDepth).padStart(2)}/${String(r.plies).padStart(2)}  ${r.key}`;

console.log(`\n=== LESSON-LINE VERIFICATION (${rows.length} lines) ===`);

console.log(`\n[1] ILLEGAL MOVES (fabrication — must be 0): ${illegal.length}`);
for (const r of illegal) console.log(`  ✗ ${r.key} — illegal move at ply ${r.illegalAt}`);

console.log(`\n[2] OFF-BOOK DEVIATIONS (position in masters DB but taught move never played by a master): ${offbook.length}`);
for (const r of offbook.sort((a, b) => a.offBook.ply - b.offBook.ply)) {
  console.log(`  • ${r.key} @ply ${r.offBook.ply}: taught "${r.offBook.san}", masters played [${r.offBook.alts.join(', ')}]`);
}

if (!NO_ENGINE) {
  console.log(`\n[3] LOSING FOR STUDENT (< -1.0, NON-gambit — genuine defects to fix/verify): ${losing.length}`);
  for (const r of losing.sort((a, b) => a.cp - b.cp)) console.log(`  ✗ ${fmt(r)}`);
  console.log(`\n[3b] negative-eval GAMBIT/sacrifice showcases (expected — verify each is honest): ${gambitNeg.length}`);
  for (const r of gambitNeg.sort((a, b) => a.cp - b.cp)) console.log(`  ~ ${fmt(r)}`);
}

writeFileSync('audit-reports/lesson-line-verification.json', JSON.stringify(rows, null, 2));
console.log(`\nreport → audit-reports/lesson-line-verification.json`);
console.log(`SUMMARY: ${illegal.length} illegal, ${offbook.length} off-book, ${NO_ENGINE ? '(engine skipped)' : `${losing.length} losing(non-gambit), ${gambitNeg.length} gambit-neg`}`);

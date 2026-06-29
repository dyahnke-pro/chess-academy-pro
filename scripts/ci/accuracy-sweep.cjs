#!/usr/bin/env node
/*
 * accuracy-sweep — DETERMINISTIC opening-accuracy audit. NO LLM judgment.
 *
 * For every curated opening line (main + variations from repertoire.json +
 * gambits.json), and every deepest curated LESSON line (the move strings in
 * src/data/lessons/*.ts), it:
 *   1. Replays the moves with chess.js  → legality + terminal FEN.
 *   2. Engine-evals the terminal with Stockfish 18 (asm build, runs in Node)
 *      from the STUDENT's perspective.
 *   3. Flags structural problems: a student piece that is attacked and
 *      undefended (hanging) at the terminal.
 *
 * Flags, worst first:
 *   ILLEGAL      — chess.js rejected a move (a fabricated/typo'd line).
 *   LOSING       — student eval < LOSE_CP and not a known sharp gambit.
 *   DUBIOUS      — student eval < DUBIOUS_CP.
 *   HANGING      — a student piece is attacked & undefended at the terminal.
 *
 * Output: audit-reports/accuracy-sweep.json + a ranked console summary.
 *
 * Usage: node scripts/ci/accuracy-sweep.cjs [--depth 16] [--limit N] [--only <substr>]
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Chess } = require('chess.js');

const ROOT = path.resolve(__dirname, '..', '..');
const ENGINE = path.join(ROOT, 'node_modules/stockfish/bin/stockfish-18-asm.js');
const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DEPTH = Number(getArg('--depth', 16));
const LIMIT = Number(getArg('--limit', 0));
const ONLY = getArg('--only', '');
const LOSE_CP = -150;     // student worse than -1.5 → losing
const DUBIOUS_CP = -70;   // worse than -0.7 → dubious

// ── persistent engine ──────────────────────────────────────────────────────
function makeEngine() {
  const proc = spawn(process.execPath, [ENGINE]);
  let buf = '';
  const waiters = [];
  proc.stdout.on('data', (d) => {
    buf += d.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
      for (const w of waiters) w(line);
    }
  });
  const onLine = (fn) => { waiters.push(fn); return () => { const i = waiters.indexOf(fn); if (i >= 0) waiters.splice(i, 1); }; };
  const send = (s) => proc.stdin.write(s + '\n');
  send('uci'); send('setoption name Hash value 64'); send('setoption name Threads value 1');
  function evalFen(fen, depth) {
    return new Promise((resolve) => {
      const turn = fen.split(' ')[1];
      let cp = null, mate = null, best = null;
      const off = onLine((line) => {
        let m;
        if ((m = line.match(/score cp (-?\d+)/))) cp = parseInt(m[1], 10);
        if ((m = line.match(/score mate (-?\d+)/))) { mate = parseInt(m[1], 10); cp = mate > 0 ? 100000 : -100000; }
        if (line.startsWith('bestmove')) {
          best = line.split(' ')[1];
          off();
          const cpWhite = cp == null ? null : (turn === 'w' ? cp : -cp);
          resolve({ cpWhite, mate: mate == null ? null : (turn === 'w' ? mate : -mate), best });
        }
      });
      send(`position fen ${fen}`);
      send(`go depth ${depth}`);
    });
  }
  return { evalFen, quit: () => { try { send('quit'); proc.kill(); } catch { /* */ } } };
}

// ── line sources ───────────────────────────────────────────────────────────
function loadStructured() {
  const lines = [];
  const add = (id, color, name, pgn, kind) => { if (pgn && pgn.trim()) lines.push({ id, color: color || 'white', name, pgn: pgn.trim(), kind }); };
  for (const file of ['repertoire.json', 'gambits.json']) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data', file), 'utf8'));
    const arr = Array.isArray(data) ? data : (data.openings || []);
    for (const o of arr) {
      if (!o || typeof o !== 'object') continue;
      add(o.id, o.color, `${o.name} — main`, o.pgn, `${file}:main`);
      for (const v of o.variations || []) add(o.id, o.color, `${o.name} :: ${v.name}`, v.pgn || v.moves, `${file}:variation`);
    }
  }
  return lines;
}
// Deepest curated LESSON line per .ts file (the Watch/Learn/Practice spine).
function loadLessonLines(colorById) {
  const dir = path.join(ROOT, 'src/data/lessons');
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    // collect every moves: '...' literal, keep the longest few distinct
    const found = [...txt.matchAll(/moves:\s*'([^']+)'/g)].map((m) => m[1].trim());
    const idm = txt.match(/openingId:\s*'([^']+)'/);
    const id = idm ? idm[1] : f.replace(/\.ts$/, '');
    if (!found.length) continue;
    const longest = found.sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length)[0];
    // Color: prefer the structured map; else infer from a black-opening id/name
    // substring (so eval perspective doesn't flip and false-flag a Black line);
    // else read the orientation field; else default white.
    const blackRe = /caro|sicilian|najdorf|dragon|french|pirc|scandinav|alekhine|king'?s.?indian|kingsindian|grunfeld|gruenfeld|benoni|dutch|modern|nimzo|slav|qgd|semi.?slav|petroff|philidor|owen|robatsch/i;
    const orientM = txt.match(/orientation:\s*'(white|black)'/);
    const color = colorById[id] || (blackRe.test(id) || blackRe.test(f) ? 'black' : (orientM ? orientM[1] : 'white'));
    out.push({ id, color, name: `${id} (deepest lesson line, ${f})`, pgn: longest, kind: 'lesson' });
  }
  return out;
}

function hangingStudentPieces(chess, studentColor) {
  // a student piece on a square that is attacked by the opponent and NOT
  // defended by any student piece — at the terminal, with the opponent to move
  const flags = [];
  const opp = studentColor === 'white' ? 'b' : 'w';
  const me = studentColor === 'white' ? 'w' : 'b';
  if (typeof chess.attackers !== 'function') return flags;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq || sq.color !== me || sq.type === 'k') continue;
      const attackers = chess.attackers(sq.square, opp);
      if (attackers.length === 0) continue;
      const defenders = chess.attackers(sq.square, me);
      if (defenders.length === 0) flags.push({ square: sq.square, piece: sq.type, attackers });
    }
  }
  return flags;
}

const GAMBIT_RE = /gambit|muzio|allgaier|max.?lange|counter.?gambit|sacrifice|king'?s.?gambit|evans|smith.?mor|danish|halloween/i;

async function main() {
  const structured = loadStructured();
  const colorById = {};
  for (const l of structured) colorById[l.id] = l.color;
  const lessons = loadLessonLines(colorById);
  let all = [...structured, ...lessons];
  if (ONLY) all = all.filter((l) => (l.id + ' ' + l.name).toLowerCase().includes(ONLY.toLowerCase()));
  if (LIMIT) all = all.slice(0, LIMIT);

  console.log(`Sweeping ${all.length} lines at depth ${DEPTH} (student-perspective eval)…\n`);
  const eng = makeEngine();
  const results = [];
  let n = 0;
  for (const L of all) {
    n++;
    const chess = new Chess();
    let illegalAt = null, plies = 0;
    for (const san of L.pgn.split(/\s+/)) {
      try { const mv = chess.move(san); if (!mv) { illegalAt = san; break; } plies++; }
      catch { illegalAt = san; break; }
    }
    if (illegalAt) {
      results.push({ ...L, flag: 'ILLEGAL', detail: `illegal move "${illegalAt}" at ply ${plies + 1}`, plies });
      process.stdout.write(`  [${n}/${all.length}] ILLEGAL ${L.name}\n`);
      continue;
    }
    const fen = chess.fen();
    const { cpWhite, mate, best } = await eng.evalFen(fen, DEPTH);
    const studentCp = cpWhite == null ? null : (L.color === 'white' ? cpWhite : -cpWhite);
    const hanging = hangingStudentPieces(chess, L.color);
    const isGambit = GAMBIT_RE.test(L.name) || GAMBIT_RE.test(L.id);
    // Engine eval is the PRIMARY accuracy signal. Hanging is demoted: only a
    // genuine concern when a NON-pawn student piece is undefended AND the
    // position isn't already clearly winning (a winning eval already proves the
    // "hang" is illusory — capturing it loses). Pawns + winning positions are
    // noise the engine has already priced in.
    const realHang = hanging.filter((h) => h.piece !== 'p');
    let flag = 'ok';
    if (studentCp != null && studentCp <= LOSE_CP && !isGambit) flag = 'LOSING';
    else if (studentCp != null && studentCp <= DUBIOUS_CP && !isGambit) flag = 'DUBIOUS';
    else if (realHang.length && studentCp != null && studentCp < 50) flag = 'HANGING';
    results.push({ ...L, flag, plies, studentCp, mate, best, isGambit, hanging: hanging.map((h) => `${h.piece}@${h.square}`), fen });
    if (flag !== 'ok') process.stdout.write(`  [${n}/${all.length}] ${flag} ${L.name} (student ${studentCp != null ? (studentCp / 100).toFixed(2) : '?'}${hanging.length ? `, hanging ${results[results.length - 1].hanging.join(',')}` : ''})\n`);
  }
  eng.quit();

  const order = { ILLEGAL: 0, LOSING: 1, DUBIOUS: 2, HANGING: 3, ok: 9 };
  results.sort((a, b) => (order[a.flag] - order[b.flag]) || ((a.studentCp ?? 0) - (b.studentCp ?? 0)));
  const flagged = results.filter((r) => r.flag !== 'ok');
  const outDir = path.join(ROOT, 'audit-reports'); fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'accuracy-sweep.json');
  fs.writeFileSync(outPath, JSON.stringify({ depth: DEPTH, total: results.length, flagged: flagged.length, results }, null, 2));

  console.log(`\n=== Accuracy sweep: ${flagged.length}/${results.length} flagged (depth ${DEPTH}) ===`);
  const by = (f) => flagged.filter((r) => r.flag === f);
  for (const f of ['ILLEGAL', 'LOSING', 'DUBIOUS', 'HANGING']) {
    const g = by(f); if (!g.length) continue;
    console.log(`\n${f} (${g.length}):`);
    for (const r of g) console.log(`  ${r.studentCp != null ? (r.studentCp / 100).toFixed(2).padStart(6) : '   ?  '}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}${r.hanging?.length ? ` [${r.hanging.join(',')}]` : ''}`);
  }
  console.log(`\nFull report: ${outPath}`);
}
main().catch((e) => { console.error(e); process.exit(1); });

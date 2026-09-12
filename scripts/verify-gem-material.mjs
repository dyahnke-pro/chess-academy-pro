#!/usr/bin/env node
/**
 * verify-gem-material — the "must win material (or mate)" gate for the STATIC
 * punish gems, matching the live gemFinder rule (WEAPON_CP=100 AND a real
 * material win at the quiet terminus, OR a forced mate — David 2026-09-12:
 * "must win material under learn with coach", mate counts because a bishop sac
 * that draws the king into a mating net IS a gem).
 *
 * For each gem: replay lineMoves → the position BEFORE the opponent's slip
 * (M0), then play inaccuracy + punishSeq → the terminus. materialGain =
 * studentMaterial(terminus) − M0 (pure chess.js, values q9 r5 b3 n3 p1). Keep
 * iff materialGain ≥ 2 (won ≥ a minor's worth) OR the terminus is a forced mate
 * FOR THE STUDENT (chess.js checkmate, or Stockfish mate score — only consulted
 * when material isn't already won, so the engine work is bounded).
 *
 *   node scripts/verify-gem-material.mjs            # dry-run report
 *   node scripts/verify-gem-material.mjs --write     # stamp materialWin into the JSON
 */
import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const WRITE = process.argv.includes('--write');
const MATERIAL_GAIN_MIN = 2;
const PIECE = { q: 9, r: 5, b: 3, n: 3, p: 1 };
const SF = '/usr/games/stockfish';

const FILES = ['src/data/punish-gems.json', 'src/data/gambit-punish-gems.json'];

function materialAdv(fen) { // white-POV pawns, same as boardUtils.getMaterialAdvantage
  const board = fen.split(' ')[0];
  let w = 0, b = 0;
  for (const ch of board) {
    const v = PIECE[ch.toLowerCase()];
    if (!v) continue;
    if (ch === ch.toUpperCase()) w += v; else b += v;
  }
  return w - b;
}

// One long-lived Stockfish process, queried only for the mate rescue.
let sf = null, sfBuf = '';
function startSf() {
  sf = spawn(SF, [], { stdio: ['pipe', 'pipe', 'ignore'] });
  sf.stdout.on('data', (d) => { sfBuf += d.toString(); });
  sf.stdin.write('uci\n');
}
function sfSend(s) { sf.stdin.write(s + '\n'); }
async function sfMateForStudent(fen, studentColor) {
  // Returns true iff there is a forced mate for the student at `fen`.
  sfBuf = '';
  sfSend('position fen ' + fen);
  sfSend('go movetime 1000'); // a forced mate at a punish terminus is shallow (mate in 1-5) — found fast
  const deadline = Date.now() + 3000;
  await new Promise((res) => {
    const iv = setInterval(() => {
      if (/bestmove/.test(sfBuf) || Date.now() > deadline) { clearInterval(iv); res(); }
    }, 50);
  });
  // last "score mate N" before bestmove; score is from side-to-move POV.
  const lines = sfBuf.split('\n').filter((l) => l.includes('score mate'));
  if (lines.length === 0) return false;
  const m = lines[lines.length - 1].match(/score mate (-?\d+)/);
  if (!m) return false;
  const n = Number(m[1]);
  const sideToMove = fen.split(' ')[1]; // 'w' | 'b'
  const stmMates = n > 0;
  const studentIsStm = sideToMove === studentColor;
  return (studentIsStm && stmMates) || (!studentIsStm && !stmMates && n < 0);
}

function replay(gem) {
  const c = new Chess();
  const setup = (gem.lineMoves || '').trim().split(/\s+/).filter(Boolean);
  for (const san of setup) { if (!c.move(san)) return { err: `illegal setup ${san}` }; }
  const p0Fen = c.fen();
  const studentColor = c.turn() === 'w' ? 'b' : 'w'; // opponent (to move at P0) plays the slip
  const M0 = studentColor === 'w' ? materialAdv(p0Fen) : -materialAdv(p0Fen);
  const punish = [gem.inaccuracy, ...(gem.punishSeq || [])].filter(Boolean);
  for (const san of punish) { if (!c.move(san)) return { err: `illegal punish ${san}` }; }
  const ptFen = c.fen();
  const Mt = studentColor === 'w' ? materialAdv(ptFen) : -materialAdv(ptFen);
  const chessMate = c.isCheckmate() && (c.turn() !== studentColor); // side to move is mated; keep if that's the opponent
  return { p0Fen, ptFen, studentColor, materialGain: Mt - M0, chessMate };
}

const results = [];
for (const file of FILES) {
  let json;
  try { json = JSON.parse(readFileSync(file, 'utf-8')); } catch { console.log(`(skip ${file} — not present)`); continue; }
  const arr = Array.isArray(json) ? json : (json.gems || []);
  results.push({ file, json, arr });
}

startSf();
await new Promise((r) => setTimeout(r, 400));

let kept = 0, dropped = 0, mateKept = 0, errs = 0;
const perOpening = {};
for (const { arr } of results) {
  for (const gem of arr) {
    const r = replay(gem);
    if (r.err) { gem.materialWin = false; errs++; dropped++; continue; }
    let win = false, reason = '';
    if (r.materialGain >= MATERIAL_GAIN_MIN) { win = true; reason = `material +${r.materialGain}`; }
    else if (r.chessMate) { win = true; reason = 'checkmate'; mateKept++; }
    else {
      // material not won and not an immediate checkmate → consult the engine
      // for a forced mate (the sac-into-a-mating-net rescue).
      const mate = await sfMateForStudent(r.ptFen, r.studentColor);
      if (mate) { win = true; reason = 'forced-mate'; mateKept++; }
      else reason = `drop (gain ${r.materialGain}, no mate)`;
    }
    gem.materialWin = win;
    if (win) kept++; else dropped++;
    (perOpening[gem.openingId] ??= { kept: 0, dropped: 0 })[win ? 'kept' : 'dropped']++;
    if (!win && (gem.tier === 'confirmed')) {
      console.log(`  [confirmed→DROP] ${gem.openingId}: ${gem.inaccuracy}→${gem.punish} (${reason})`);
    }
  }
}
sfSend('quit'); sf.stdin.end();

console.log(`\n=== per-opening (kept/dropped) ===`);
for (const [oid, v] of Object.entries(perOpening).sort()) console.log(`  ${oid}: ${v.kept} kept / ${v.dropped} dropped`);
console.log(`\nTOTAL: ${kept} kept, ${dropped} dropped (mate-rescued: ${mateKept}, replay errors: ${errs})`);

if (WRITE) {
  for (const { file, json, arr } of results) {
    const out = Array.isArray(json) ? arr : { ...json, gems: arr };
    writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
    console.log(`wrote ${file}`);
  }
} else {
  console.log('\n(dry run — pass --write to stamp materialWin into the JSON)');
}
process.exit(0);

#!/usr/bin/env node
/**
 * Complete-or-cull the BROKEN trap entries flagged by
 * audit-traps-stockfish. For each broken trap (student NOT winning
 * at the stored PGN's final position):
 *
 *   1. From the final position, ask Stockfish for its principal
 *      variation (the forcing best line)
 *   2. Walk the PV up to MAX_EXTENSION plies, checking after each
 *      ply whether the student reaches a decisive advantage
 *      (>= +DECISIVE_CP or mate)
 *   3. If reached → the trap was just cut off before the punishment.
 *      Append the PV up to that ply, KEEP the trap (now complete).
 *   4. If even the engine's best line never gets the student to
 *      winning → the trap is genuinely bad. CULL it.
 *
 * Only operates on entries the audit flagged BROKEN. WEAK (positional
 * traps) and OK are left untouched.
 *
 * chess.js validates every completed PGN end-to-end. Writes to
 * STAGING — David reviews before merge.
 *
 *   node scripts/complete-or-cull-traps.mjs <audit-report-dir>
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const STOCKFISH = '/usr/games/stockfish';
const SF_DEPTH = 20;
const MAX_EXTENSION = 8;       // plies of PV to try appending
const DECISIVE_CP = 300;       // student must reach >= +3.0 or mate
const CONCURRENCY = 4;
const STAGING_DIR = 'audit-reports/staged';
mkdirSync(STAGING_DIR, { recursive: true });

const reportDir = process.argv[2];
if (!reportDir) {
  console.error('usage: node complete-or-cull-traps.mjs <audit-report-dir>');
  process.exit(1);
}
const report = JSON.parse(readFileSync(`${reportDir}/report.json`, 'utf-8'));
const broken = report.results.filter((r) => r.status === 'BROKEN' && r.role === 'trap');

console.log(`Broken trap entries to process: ${broken.length}`);

// Stockfish: return { pvUci: string[], eval } for a position.
async function analyzePv(fen) {
  return new Promise((resolve) => {
    const sf = spawn(STOCKFISH);
    let buf = '';
    let lastPv = [];
    let lastEval = null;
    let done = false;
    sf.stdout.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('info depth ')) {
          const cp = line.match(/score cp (-?\d+)/);
          const mate = line.match(/score mate (-?\d+)/);
          if (mate) lastEval = { type: 'mate', value: parseInt(mate[1], 10) };
          else if (cp) lastEval = { type: 'cp', value: parseInt(cp[1], 10) };
          const pvMatch = line.match(/ pv (.+)$/);
          if (pvMatch) lastPv = pvMatch[1].trim().split(/\s+/);
        }
        if (line.startsWith('bestmove')) {
          done = true;
          sf.kill();
          resolve({ pvUci: lastPv, eval: lastEval });
        }
      }
    });
    sf.on('error', () => resolve({ pvUci: [], eval: null }));
    sf.on('close', () => { if (!done) resolve({ pvUci: lastPv, eval: lastEval }); });
    sf.stdin.write('uci\n');
    sf.stdin.write(`position fen ${fen}\n`);
    sf.stdin.write(`go depth ${SF_DEPTH}\n`);
    setTimeout(() => { try { sf.stdin.write('stop\nquit\n'); } catch {} }, 12000);
  });
}

function studentEval(raw, sideToMove, studentColor) {
  if (!raw) return null;
  const flip = sideToMove !== studentColor;
  if (raw.type === 'cp') return { type: 'cp', value: flip ? -raw.value : raw.value };
  return { type: 'mate', value: flip ? -raw.value : raw.value };
}

function isDecisive(se) {
  if (!se) return false;
  if (se.type === 'mate') return se.value > 0;
  return se.value >= DECISIVE_CP;
}

// Walk the trap's PGN (from setupFen-or-start) to the final position.
function getFinalFen(entry) {
  const c = entry.finalFen ? new Chess(entry.finalFen) : null;
  if (c) return { fen: entry.finalFen, sideToMove: entry.sideToMove };
  return null;
}

async function processBroken(entry) {
  // The audit already computed finalFen + sideToMove.
  const fen = entry.finalFen;
  const studentColor = entry.studentColor;
  if (!fen) return { ...entry, decision: 'CULL', reason: 'no finalFen' };

  // Walk Stockfish PV from the final position, checking for a forced
  // student win within MAX_EXTENSION plies.
  const c = new Chess(fen);
  const { pvUci } = await analyzePv(fen);
  if (pvUci.length === 0) return { ...entry, decision: 'CULL', reason: 'no PV' };

  const extensionSans = [];
  let reachedDecisive = false;
  for (let i = 0; i < Math.min(MAX_EXTENSION, pvUci.length); i += 1) {
    const uci = pvUci[i];
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promo = uci.length === 5 ? uci[4] : undefined;
    let move;
    try {
      move = c.move({ from, to, promotion: promo });
    } catch {
      break;
    }
    extensionSans.push(move.san);
    // After this move, evaluate from the resulting position.
    const stmAfter = c.turn() === 'w' ? 'white' : 'black';
    // Only check at student-just-moved points (lastMover === student)
    const lastMover = stmAfter === 'white' ? 'black' : 'white';
    if (lastMover === studentColor) {
      const { eval: rawEval } = await analyzePv(c.fen());
      const se = studentEval(rawEval, stmAfter, studentColor);
      if (isDecisive(se)) { reachedDecisive = true; break; }
    }
  }

  if (reachedDecisive) {
    return {
      ...entry,
      decision: 'COMPLETE',
      extensionSans,
      newPgn: `${entry.pgn} ${extensionSans.join(' ')}`.trim(),
    };
  }
  return { ...entry, decision: 'CULL', reason: 'no forced student win in PV' };
}

async function pConcurrency(items, fn, n) {
  const results = new Array(items.length);
  let i = 0, done = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const myI = i++;
      results[myI] = await fn(items[myI]);
      done++;
      if (done % 15 === 0) process.stdout.write(`  processed ${done}/${items.length}\n`);
    }
  }));
  return results;
}

async function main() {
  const results = await pConcurrency(broken, processBroken, CONCURRENCY);
  const complete = results.filter((r) => r.decision === 'COMPLETE');
  const cull = results.filter((r) => r.decision === 'CULL');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = `${STAGING_DIR}/trap-completion-${stamp}.json`;
  writeFileSync(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary: { total: broken.length, complete: complete.length, cull: cull.length },
    complete: complete.map((r) => ({
      source: r.source, openingId: r.openingId, name: r.name,
      oldPgn: r.pgn, newPgn: r.newPgn, extension: r.extensionSans,
    })),
    cull: cull.map((r) => ({
      source: r.source, openingId: r.openingId, name: r.name,
      pgn: r.pgn, reason: r.reason, evalDesc: r.evalDesc,
    })),
  }, null, 2));

  console.log('\n=== TRAP COMPLETION SUMMARY ===');
  console.log(`Broken processed: ${broken.length}`);
  console.log(`  COMPLETE (append forced win): ${complete.length}`);
  console.log(`  CULL (genuinely bad):         ${cull.length}`);
  console.log(`\nStaging: ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

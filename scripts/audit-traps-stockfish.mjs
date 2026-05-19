#!/usr/bin/env node
/**
 * Deep trap & warning audit — runs Stockfish on every trapLine /
 * warningLine final position to verify the line actually benefits
 * the student (traps) or punishes the student (warnings).
 *
 * Existing orientation audits (audit-trap-orientation.mjs,
 * audit-repertoire-orientation.mjs) only check material count at
 * the final position. That misses:
 *   - Sacrificial mating attacks where eval is decisively winning
 *     despite material down
 *   - Positional traps where the student is "only" +1 material but
 *     has a crushing position
 *   - "Traps" where material is even but the position is actually
 *     equal or worse for the student
 *
 * Stockfish eval rules (from student's perspective):
 *   kind=trap     : expect ≥ +200cp (2 pawns) OR mate
 *   kind=mistake  : expect ≥ +50cp  (0.5 pawns)
 *   kind=theme    : skip eval (positional long-term)
 *   warning       : expect ≤ -100cp (-1 pawn) — student is supposed to be LOSING
 *
 * Output:
 *   audit-reports/traps-stockfish-<iso>/report.json
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const STOCKFISH = '/usr/games/stockfish';
const DEPTH = 16;
const CONCURRENCY = 4;
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/traps-stockfish-${STAMP}`;

const THRESHOLDS = {
  trap:    { minCp: 200, allowMate: true,  expectedDir: 'student-winning' },
  mistake: { minCp: 50,  allowMate: true,  expectedDir: 'student-better' },
  theme:   { minCp: 0,   allowMate: true,  expectedDir: 'not-losing' },
  warning: { maxCp: -100, allowMate: false, expectedDir: 'student-losing' },
};

async function evaluateFen(fen) {
  return new Promise((resolve) => {
    const sf = spawn(STOCKFISH);
    let buf = '';
    let bestmoveSeen = false;
    let lastEval = null;
    const onData = (d) => {
      buf += d.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('info depth ')) {
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          if (mateMatch) lastEval = { type: 'mate', value: parseInt(mateMatch[1], 10) };
          else if (cpMatch) lastEval = { type: 'cp', value: parseInt(cpMatch[1], 10) };
        }
        if (line.startsWith('bestmove')) {
          bestmoveSeen = true;
          sf.kill();
          resolve(lastEval);
        }
      }
    };
    sf.stdout.on('data', onData);
    sf.on('error', () => resolve(null));
    const cleanup = () => {
      if (!bestmoveSeen) { sf.kill(); resolve(lastEval); }
    };
    sf.on('close', cleanup);
    sf.stdin.write('uci\n');
    sf.stdin.write(`position fen ${fen}\n`);
    sf.stdin.write(`go depth ${DEPTH}\n`);
    setTimeout(() => {
      try { sf.stdin.write('stop\nquit\n'); } catch {}
    }, 10000);
  });
}

function evalFromStudentPerspective(rawEval, sideToMove, studentColor) {
  if (!rawEval) return null;
  // SF reports from side-to-move perspective. Flip if side-to-move != student.
  const flip = sideToMove !== studentColor;
  if (rawEval.type === 'cp') {
    return { type: 'cp', value: flip ? -rawEval.value : rawEval.value };
  }
  // Mate
  const mateVal = flip ? -rawEval.value : rawEval.value;
  return { type: 'mate', value: mateVal };
}

function classify(entry, studentEval) {
  const role = entry.role; // 'trap' or 'warning'
  const kind = entry.kind ?? 'trap';
  const lookupKind = role === 'warning' ? 'warning' : kind;
  const thresh = THRESHOLDS[lookupKind] ?? THRESHOLDS.trap;
  if (!studentEval) {
    return { status: 'unevaluated', reason: 'stockfish-no-eval' };
  }
  if (studentEval.type === 'mate') {
    if (studentEval.value > 0) {
      // Mate FOR student
      return lookupKind === 'warning'
        ? { status: 'BROKEN', reason: 'student-mating-in-own-warning', evalDesc: `M${studentEval.value} for student` }
        : { status: 'OK', reason: 'student-mate', evalDesc: `M${studentEval.value} for student` };
    }
    // Mate AGAINST student
    return lookupKind === 'warning'
      ? { status: 'OK', reason: 'student-being-mated', evalDesc: `M${-studentEval.value} against student` }
      : { status: 'BROKEN', reason: 'student-mated-in-trap', evalDesc: `M${-studentEval.value} against student` };
  }
  // cp
  const cp = studentEval.value;
  if (lookupKind === 'warning') {
    if (cp <= thresh.maxCp) return { status: 'OK', reason: 'student-losing-as-expected', evalDesc: `${cp}cp` };
    return { status: cp >= 50 ? 'BROKEN' : 'WEAK', reason: 'warning-not-punishing', evalDesc: `${cp}cp` };
  }
  if (cp >= thresh.minCp) return { status: 'OK', reason: 'eval-passes-threshold', evalDesc: `+${cp}cp` };
  if (cp >= 0) return { status: 'WEAK', reason: 'eval-not-decisive', evalDesc: `+${cp}cp` };
  return { status: 'BROKEN', reason: 'eval-favors-opponent', evalDesc: `${cp}cp` };
}

function parsePgnToFinalFen(pgn) {
  const c = new Chess();
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    try {
      c.move(tok.replace(/[+#!?]+$/, ''));
    } catch {
      return { fen: null, sideToMove: null, plyCount: 0, error: `illegal: ${tok}` };
    }
  }
  return {
    fen: c.fen(),
    sideToMove: c.turn() === 'w' ? 'white' : 'black',
    plyCount: tokens.length,
  };
}

function collectEntries() {
  const entries = [];

  // pro-repertoires
  const pro = JSON.parse(readFileSync('src/data/pro-repertoires.json', 'utf-8'));
  for (const op of pro.openings ?? []) {
    for (const t of op.trapLines ?? []) {
      entries.push({
        source: 'pro-repertoires',
        openingId: op.id,
        openingName: op.name,
        studentColor: op.color,
        role: 'trap',
        kind: t.kind ?? null,
        name: t.name,
        pgn: t.pgn,
      });
    }
    for (const w of op.warningLines ?? []) {
      entries.push({
        source: 'pro-repertoires',
        openingId: op.id,
        openingName: op.name,
        studentColor: op.color,
        role: 'warning',
        kind: 'warning',
        name: w.name,
        pgn: w.pgn,
      });
    }
  }

  // repertoire
  const rep = JSON.parse(readFileSync('src/data/repertoire.json', 'utf-8'));
  const repArr = Array.isArray(rep) ? rep : Object.values(rep);
  // sidecar classifications (trap kind: trap/mistake/theme)
  let classifications = {};
  try {
    classifications = JSON.parse(readFileSync('src/data/trap-line-classifications.json', 'utf-8'));
  } catch {}
  for (const op of repArr) {
    for (const t of op.trapLines ?? []) {
      const key = `${op.id}::${t.name}`;
      entries.push({
        source: 'repertoire',
        openingId: op.id,
        openingName: op.name,
        studentColor: op.color,
        role: 'trap',
        kind: classifications[key]?.kind ?? null,
        name: t.name,
        pgn: t.pgn,
      });
    }
    for (const w of op.warningLines ?? []) {
      entries.push({
        source: 'repertoire',
        openingId: op.id,
        openingName: op.name,
        studentColor: op.color,
        role: 'warning',
        kind: 'warning',
        name: w.name,
        pgn: w.pgn,
      });
    }
  }
  return entries;
}

async function processEntry(entry) {
  const parsed = parsePgnToFinalFen(entry.pgn);
  if (!parsed.fen) {
    return { ...entry, status: 'BROKEN', reason: 'pgn-parse-error', detail: parsed.error };
  }
  const rawEval = await evaluateFen(parsed.fen);
  const studentEval = evalFromStudentPerspective(rawEval, parsed.sideToMove, entry.studentColor);
  const verdict = classify(entry, studentEval);
  return {
    ...entry,
    finalFen: parsed.fen,
    plyCount: parsed.plyCount,
    sideToMove: parsed.sideToMove,
    studentEval,
    rawEval,
    status: verdict.status,
    reason: verdict.reason,
    evalDesc: verdict.evalDesc,
  };
}

async function processWithConcurrency(items, fn, n) {
  const results = new Array(items.length);
  let idx = 0;
  let done = 0;
  const total = items.length;
  const workers = Array.from({ length: n }, async () => {
    while (idx < total) {
      const myIdx = idx++;
      try {
        results[myIdx] = await fn(items[myIdx]);
      } catch (e) {
        results[myIdx] = { ...items[myIdx], status: 'BROKEN', reason: 'eval-threw', detail: String(e) };
      }
      done++;
      if (done % 25 === 0 || done === total) {
        process.stdout.write(`  evaluated ${done}/${total}\n`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('Collecting trap + warning entries...');
  const entries = collectEntries();
  console.log(`  total: ${entries.length}`);
  console.log(`Stockfish depth=${DEPTH} concurrency=${CONCURRENCY}`);
  console.log('Estimated runtime: ~' + Math.ceil(entries.length * 2.5 / CONCURRENCY / 60) + 'min');

  const results = await processWithConcurrency(entries, processEntry, CONCURRENCY);

  // Summarize
  const byStatus = { OK: 0, WEAK: 0, BROKEN: 0, unevaluated: 0 };
  const broken = [];
  const weak = [];
  for (const r of results) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.status === 'BROKEN') broken.push(r);
    if (r.status === 'WEAK') weak.push(r);
  }

  const summary = {
    timestamp: new Date().toISOString(),
    depth: DEPTH,
    total: entries.length,
    byStatus,
    byKindSourceStatus: results.reduce((acc, r) => {
      const key = `${r.source}::${r.role}::${r.kind ?? '-'}::${r.status}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  };

  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ summary, results }, null, 2));
  await writeFile(`${OUT_DIR}/broken.json`, JSON.stringify(broken, null, 2));
  await writeFile(`${OUT_DIR}/weak.json`, JSON.stringify(weak, null, 2));

  console.log('\n=== STOCKFISH AUDIT SUMMARY ===');
  console.log(`total entries: ${entries.length}`);
  console.log(`  OK:          ${byStatus.OK}`);
  console.log(`  WEAK:        ${byStatus.WEAK}`);
  console.log(`  BROKEN:      ${byStatus.BROKEN}`);
  console.log(`  unevaluated: ${byStatus.unevaluated}`);
  console.log(`\nReport: ${OUT_DIR}/report.json`);
  console.log(`Broken: ${OUT_DIR}/broken.json (${broken.length} entries)`);
  console.log(`Weak:   ${OUT_DIR}/weak.json (${weak.length} entries)`);
}

main().catch(e => { console.error(e); process.exit(1); });

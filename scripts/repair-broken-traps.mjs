#!/usr/bin/env node
/**
 * Repair the 169 broken trap entries flagged by audit-traps-stockfish.
 *
 * For each broken entry, try ONE of three repair paths in order:
 *   A. PGN extension — if the line cuts off mid-sequence (last move
 *      is the opponent), check whether the openings-lichess DB has
 *      a deeper entry that adds the student's punishment move.
 *      Append it and re-evaluate with Stockfish.
 *   B. Reclassification — if extended position is ≥ -50cp but not
 *      decisively winning, downgrade kind from 'trap' to 'theme'
 *      (positional understanding, not a forced material gain).
 *   C. Demotion — if the student is decisively losing in their own
 *      "trap" line, move the entry to warningLines (a line to AVOID,
 *      not one to play for).
 *   D. Drop — if no repair lands.
 *
 * NOTHING gets written to src/data/*. All output → staging file
 * audit-reports/staged/<batch>.json. David reviews the staged file
 * before any merge. Per CLAUDE.md directive 2026-05-19:
 *   "we need all lines completed and 100% accurate before writing
 *    anything"
 *
 * Run:
 *   node scripts/repair-broken-traps.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const STOCKFISH = '/usr/games/stockfish';
const DEPTH = 16;
const CONCURRENCY = 4;

const STAGING_DIR = 'audit-reports/staged';
mkdirSync(STAGING_DIR, { recursive: true });

// ─── Inputs ────────────────────────────────────────────────────────
const BROKEN_REPORT = 'audit-reports/traps-stockfish-2026-05-19T20-10-18-008Z/broken.json';
const broken = JSON.parse(readFileSync(BROKEN_REPORT, 'utf-8'));
const lichess = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf-8'));
const LICHESS = Array.isArray(lichess) ? lichess : Object.values(lichess);

// Build a PGN-prefix index: for any pgn string, find all DB entries
// that start with that prefix. Returns sorted by depth descending so
// longer extensions come first.
function findDbExtensions(pgnPrefix) {
  const prefixTokens = pgnPrefix.trim().split(/\s+/).filter(Boolean);
  const matches = [];
  for (const entry of LICHESS) {
    const entryTokens = (entry.pgn || '').trim().split(/\s+/).filter(Boolean);
    if (entryTokens.length <= prefixTokens.length) continue;
    let isPrefix = true;
    for (let i = 0; i < prefixTokens.length; i += 1) {
      // Strip annotations and compare
      const a = prefixTokens[i].replace(/[+#!?]+$/, '');
      const b = entryTokens[i].replace(/[+#!?]+$/, '');
      if (a !== b) { isPrefix = false; break; }
    }
    if (isPrefix) {
      matches.push({ entry, extension: entryTokens.slice(prefixTokens.length) });
    }
  }
  // Sort by extension length descending — longer continuation = better
  // candidate for repair (gets us closer to a decisive position).
  matches.sort((a, b) => b.extension.length - a.extension.length);
  return matches;
}

// ─── Stockfish wrapper (same shape as audit-traps-stockfish) ──────
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
    sf.on('close', () => { if (!bestmoveSeen) resolve(lastEval); });
    sf.stdin.write('uci\n');
    sf.stdin.write(`position fen ${fen}\n`);
    sf.stdin.write(`go depth ${DEPTH}\n`);
    setTimeout(() => { try { sf.stdin.write('stop\nquit\n'); } catch {} }, 10000);
  });
}

function studentEval(raw, sideToMove, studentColor) {
  if (!raw) return null;
  const flip = sideToMove !== studentColor;
  if (raw.type === 'cp') return { type: 'cp', value: flip ? -raw.value : raw.value };
  return { type: 'mate', value: flip ? -raw.value : raw.value };
}

function parsePgn(pgn) {
  const c = new Chess();
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    try { c.move(tok.replace(/[+#!?]+$/, '')); }
    catch { return { error: `illegal: ${tok}`, plyCount: tokens.length }; }
  }
  return {
    fen: c.fen(),
    sideToMove: c.turn() === 'w' ? 'white' : 'black',
    plyCount: tokens.length,
  };
}

// ─── Repair pipeline per entry ────────────────────────────────────
async function repair(entry) {
  const proposals = [];

  // Path A: try DB extensions if the line ends mid-sequence
  const parsed = parsePgn(entry.pgn);
  if (parsed.error) {
    return { ...entry, repairStatus: 'PGN_PARSE_ERROR', detail: parsed.error };
  }

  // Try each possible extension (limit to 3 to save Stockfish time)
  const extensions = findDbExtensions(entry.pgn).slice(0, 3);
  for (const ext of extensions) {
    // Try just adding the NEXT 1-3 plies until we get a complete sequence
    // (last move is the student's punishment).
    for (const extDepth of [1, 2, 3]) {
      if (ext.extension.length < extDepth) continue;
      const slice = ext.extension.slice(0, extDepth);
      const extendedPgn = (entry.pgn + ' ' + slice.join(' ')).trim();
      const p = parsePgn(extendedPgn);
      if (p.error) continue;
      // Last move's mover
      const lastMover = p.plyCount % 2 === 1 ? 'white' : 'black';
      // For a "trap" we want the line to END with the student's move
      if (entry.role === 'trap' && lastMover !== entry.studentColor) continue;
      const raw = await evaluateFen(p.fen);
      const studentE = studentEval(raw, p.sideToMove, entry.studentColor);
      proposals.push({
        path: `A-extend-${extDepth}`,
        extendedPgn,
        fromDbEntry: { eco: ext.entry.eco, name: ext.entry.name },
        finalFen: p.fen,
        sideToMove: p.sideToMove,
        lastMover,
        plyCount: p.plyCount,
        studentEval: studentE,
        rawEval: raw,
      });
      // Stop if we found a clearly good repair (≥ +200cp for student)
      if (studentE?.type === 'cp' && studentE.value >= 200) break;
      if (studentE?.type === 'mate' && studentE.value > 0) break;
    }
  }

  // Pick the BEST proposal (highest student eval)
  proposals.sort((a, b) => {
    const av = a.studentEval?.type === 'mate'
      ? (a.studentEval.value > 0 ? 100000 - a.studentEval.value : -100000 - a.studentEval.value)
      : (a.studentEval?.value ?? -100000);
    const bv = b.studentEval?.type === 'mate'
      ? (b.studentEval.value > 0 ? 100000 - b.studentEval.value : -100000 - b.studentEval.value)
      : (b.studentEval?.value ?? -100000);
    return bv - av;
  });
  const best = proposals[0];

  // ─── Classify the repair outcome ──────────────────────────────
  if (best) {
    const se = best.studentEval;
    // Path A succeeded: keep as trap
    if (se?.type === 'mate' && se.value > 0) {
      return { ...entry, repairStatus: 'REPAIRED', proposedAction: 'extend-as-trap',
        newKind: 'trap', proposedPgn: best.extendedPgn,
        evalAfter: `M${se.value}`, repairProposal: best };
    }
    if (se?.type === 'cp' && se.value >= 200) {
      return { ...entry, repairStatus: 'REPAIRED', proposedAction: 'extend-as-trap',
        newKind: 'trap', proposedPgn: best.extendedPgn,
        evalAfter: `+${se.value}cp`, repairProposal: best };
    }
    // Mid-eval: positional advantage → reclassify
    if (se?.type === 'cp' && se.value >= 50) {
      return { ...entry, repairStatus: 'REPAIRED', proposedAction: 'extend-as-mistake',
        newKind: 'mistake', proposedPgn: best.extendedPgn,
        evalAfter: `+${se.value}cp`, repairProposal: best };
    }
    // Equal-ish: positional theme
    if (se?.type === 'cp' && se.value >= -50) {
      return { ...entry, repairStatus: 'REPAIRED', proposedAction: 'extend-as-theme',
        newKind: 'theme', proposedPgn: best.extendedPgn,
        evalAfter: `${se.value}cp`, repairProposal: best };
    }
  }

  // Path C: student is decisively losing — move to warningLines
  // (the line shows the student getting punished, useful as a
  // cautionary tale)
  const origParsed = parsePgn(entry.pgn);
  const origRaw = await evaluateFen(origParsed.fen);
  const origStudent = studentEval(origRaw, origParsed.sideToMove, entry.studentColor);
  if (origStudent?.type === 'cp' && origStudent.value <= -100) {
    return { ...entry, repairStatus: 'DEMOTE-TO-WARNING',
      proposedAction: 'move-to-warningLines',
      reasoning: `student is ${origStudent.value}cp at final position — should be a warningLine, not a trapLine`,
      originalEval: `${origStudent.value}cp` };
  }
  if (origStudent?.type === 'mate' && origStudent.value < 0) {
    return { ...entry, repairStatus: 'DEMOTE-TO-WARNING',
      proposedAction: 'move-to-warningLines',
      reasoning: `student is mated in ${-origStudent.value} — should be a warningLine`,
      originalEval: `M${-origStudent.value}` };
  }

  // Path D: drop — no repair path worked
  return { ...entry, repairStatus: 'DROP',
    proposedAction: 'remove',
    reasoning: 'no DB extension produced a favorable position; not decisively losing either',
    originalEval: origStudent ? `${origStudent.value}cp` : '?' };
}

// ─── Concurrency runner ───────────────────────────────────────────
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
        results[myIdx] = { ...items[myIdx], repairStatus: 'ERROR', detail: String(e) };
      }
      done++;
      if (done % 10 === 0 || done === total) {
        process.stdout.write(`  processed ${done}/${total}\n`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log(`Repairing ${broken.length} broken trap entries...`);
  console.log(`Stockfish depth=${DEPTH} concurrency=${CONCURRENCY}`);
  const results = await processWithConcurrency(broken, repair, CONCURRENCY);

  const byStatus = {};
  for (const r of results) {
    byStatus[r.repairStatus] = (byStatus[r.repairStatus] ?? 0) + 1;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = `${STAGING_DIR}/repaired-traps-${stamp}.json`;
  writeFileSync(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    inputCount: broken.length,
    byStatus,
    results,
  }, null, 2));

  console.log('\n=== REPAIR PROPOSAL SUMMARY ===');
  for (const [status, count] of Object.entries(byStatus).sort()) {
    console.log(`  ${status.padEnd(22)} ${count}`);
  }
  console.log(`\nStaging file: ${outPath}`);
  console.log('NO DATA FILES WRITTEN. Review staging before merge.');
}

main().catch(e => { console.error(e); process.exit(1); });

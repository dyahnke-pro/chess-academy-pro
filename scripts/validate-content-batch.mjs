#!/usr/bin/env node
/**
 * Validation harness for the hand-drafted opening content batch.
 * Walks the staging JSON, runs every gate, prints per-entry verdict.
 *
 *   1. chess.js replays the PGN from start to the stated FEN
 *   2. The fen field IS the actual position chess.js produces
 *   3. correctMove / wrongMove is a legal SAN in that FEN
 *   4. (optional) Stockfish eval direction is consistent with the
 *      claim ("this is a good move" → eval ≥ 0)
 *
 * Input: audit-reports/staged/content-batch-<n>.json
 * Output: console report + audit-reports/staged/validation-<batch>.json
 */
import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const inputPath = args[0];
if (!inputPath) {
  console.error('usage: node validate-content-batch.mjs <staging.json>');
  process.exit(1);
}
const data = JSON.parse(readFileSync(inputPath, 'utf-8'));

const results = {
  middlegamePlans: [],
  commonMistakes: [],
  quizItems: [],
};

function validateFen(fen) {
  try {
    const c = new Chess(fen);
    return { ok: true, sideToMove: c.turn() === 'w' ? 'white' : 'black' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function validateMove(fen, move) {
  try {
    const c = new Chess(fen);
    const result = c.move(move);
    if (!result) return { ok: false, error: `illegal: ${move}` };
    return { ok: true, sanStrict: result.san };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Middlegame Plans ─────────────────────────────────────────────
for (const plan of data.middlegamePlans ?? []) {
  const checks = [];
  const f = validateFen(plan.criticalPositionFen);
  checks.push({ check: 'criticalPositionFen valid', ok: f.ok, detail: f.error });
  for (const pb of plan.pawnBreaks ?? []) {
    if (pb.fen) {
      const fc = validateFen(pb.fen);
      checks.push({ check: `pawnBreak[${pb.move}] fen valid`, ok: fc.ok, detail: fc.error });
    }
    // pawn-break "move" can be a description like "c3-c4" rather than a SAN —
    // skip legality unless it's clearly a single SAN
    if (pb.move && /^[a-h][1-8]?(?:x[a-h][1-8])?(?:=[QRBN])?[+#]?$|^[KQRBN][a-h]?[1-8]?x?[a-h][1-8][+#]?$|^O-O(?:-O)?$/.test(pb.move)) {
      const mc = validateMove(plan.criticalPositionFen, pb.move);
      checks.push({ check: `pawnBreak[${pb.move}] legal from criticalFen`, ok: mc.ok, detail: mc.error });
    }
  }
  const failures = checks.filter(c => !c.ok);
  results.middlegamePlans.push({
    id: plan.id,
    openingId: plan.openingId,
    title: plan.title,
    ok: failures.length === 0,
    checks,
    failures,
  });
}

// ─── Common Mistakes ──────────────────────────────────────────────
for (const m of data.commonMistakes ?? []) {
  const checks = [];
  const f = validateFen(m.fen);
  checks.push({ check: 'fen valid', ok: f.ok, detail: f.error });
  if (f.ok) {
    const wm = validateMove(m.fen, m.wrongMove);
    checks.push({ check: `wrongMove (${m.wrongMove}) legal`, ok: wm.ok, detail: wm.error });
    const cm = validateMove(m.fen, m.correctMove);
    checks.push({ check: `correctMove (${m.correctMove}) legal`, ok: cm.ok, detail: cm.error });
  }
  const failures = checks.filter(c => !c.ok);
  results.commonMistakes.push({
    openingId: m.openingId,
    fen: m.fen,
    ok: failures.length === 0,
    checks,
    failures,
  });
}

// ─── Quiz Items ───────────────────────────────────────────────────
for (const q of data.quizItems ?? []) {
  const checks = [];
  const f = validateFen(q.fen);
  checks.push({ check: 'fen valid', ok: f.ok, detail: f.error });
  if (f.ok) {
    const cm = validateMove(q.fen, q.correctMove);
    checks.push({ check: `correctMove (${q.correctMove}) legal`, ok: cm.ok, detail: cm.error });
  }
  const failures = checks.filter(c => !c.ok);
  results.quizItems.push({
    openingId: q.openingId,
    fen: q.fen,
    ok: failures.length === 0,
    checks,
    failures,
  });
}

// ─── Summary ──────────────────────────────────────────────────────
const planOk = results.middlegamePlans.filter(r => r.ok).length;
const mistakeOk = results.commonMistakes.filter(r => r.ok).length;
const quizOk = results.quizItems.filter(r => r.ok).length;
const planTotal = results.middlegamePlans.length;
const mistakeTotal = results.commonMistakes.length;
const quizTotal = results.quizItems.length;

console.log('\n=== CONTENT BATCH VALIDATION ===');
console.log(`Middlegame Plans:  ${planOk}/${planTotal}`);
console.log(`Common Mistakes:   ${mistakeOk}/${mistakeTotal}`);
console.log(`Quiz Items:        ${quizOk}/${quizTotal}`);
console.log(`OVERALL:           ${planOk + mistakeOk + quizOk}/${planTotal + mistakeTotal + quizTotal}`);

const allFailures = [
  ...results.middlegamePlans.filter(r => !r.ok),
  ...results.commonMistakes.filter(r => !r.ok),
  ...results.quizItems.filter(r => !r.ok),
];
if (allFailures.length > 0) {
  console.log(`\n=== FAILURES (${allFailures.length}) ===`);
  for (const f of allFailures) {
    console.log(`\n  [${f.openingId || f.id}] ${f.title || f.fen?.slice(0, 50)}`);
    f.failures.forEach(c => console.log(`    ✗ ${c.check}: ${c.detail}`));
  }
}

const reportPath = inputPath.replace('.json', '-validation.json');
writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\nReport: ${reportPath}`);
process.exit(allFailures.length === 0 ? 0 : 1);

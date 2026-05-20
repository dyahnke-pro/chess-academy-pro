#!/usr/bin/env node
/**
 * Merge audit-reports/staged/content-batch-1.json into the three
 * target data files:
 *   - src/data/middlegame-plans.json   (array of plans)
 *   - src/data/common-mistakes.json    (object keyed by openingId)
 *   - src/data/checkpoint-quizzes.json (object keyed by openingId)
 *
 * Idempotent: skips entries whose id is already present.
 *
 * Drafted + validated previously through:
 *   - chess.js legality (all 135 entries passed FEN + move gates)
 *   - Stockfish ≥30cp gate on common mistakes (20/36 strict pass;
 *     16/36 are engine-equivalent pedagogical choices, kept per
 *     David's directive WITH practical-edge explanations rewritten)
 *
 * Per CLAUDE.md "100% accurate before writing" — staging file was
 * reviewed; David approved merge. This script just flushes it.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const STAGING = 'audit-reports/staged/content-batch-1.json';
const PLANS_PATH = 'src/data/middlegame-plans.json';
const MISTAKES_PATH = 'src/data/common-mistakes.json';
const QUIZ_PATH = 'src/data/checkpoint-quizzes.json';

const staged = JSON.parse(readFileSync(STAGING, 'utf-8'));
const plans = JSON.parse(readFileSync(PLANS_PATH, 'utf-8'));
const mistakes = JSON.parse(readFileSync(MISTAKES_PATH, 'utf-8'));
const quizzes = JSON.parse(readFileSync(QUIZ_PATH, 'utf-8'));

let plansAdded = 0, plansSkipped = 0;
const existingPlanIds = new Set(plans.map((p) => p.id));
for (const p of staged.middlegamePlans ?? []) {
  if (existingPlanIds.has(p.id)) { plansSkipped++; continue; }
  plans.push(p);
  plansAdded++;
}

let mistakesAdded = 0;
for (const m of staged.commonMistakes ?? []) {
  if (!Array.isArray(mistakes[m.openingId])) mistakes[m.openingId] = [];
  // Skip if same fen + wrongMove combo already present
  const dup = mistakes[m.openingId].some((e) => e.fen === m.fen && e.wrongMove === m.wrongMove);
  if (dup) continue;
  mistakes[m.openingId].push({
    fen: m.fen,
    wrongMove: m.wrongMove,
    correctMove: m.correctMove,
    explanation: m.explanation,
  });
  mistakesAdded++;
}

let quizAdded = 0;
for (const q of staged.quizItems ?? []) {
  if (!Array.isArray(quizzes[q.openingId])) quizzes[q.openingId] = [];
  // Skip if same fen + correctMove already present
  const dup = quizzes[q.openingId].some((e) => e.fen === q.fen && e.correctMove === q.correctMove);
  if (dup) continue;
  quizzes[q.openingId].push({
    fen: q.fen,
    correctMove: q.correctMove,
    hint: q.hint,
    concept: q.concept,
  });
  quizAdded++;
}

writeFileSync(PLANS_PATH, JSON.stringify(plans, null, 2) + '\n');
writeFileSync(MISTAKES_PATH, JSON.stringify(mistakes, null, 2) + '\n');
writeFileSync(QUIZ_PATH, JSON.stringify(quizzes, null, 2) + '\n');

console.log('=== CONTENT BATCH 1 MERGED ===');
console.log(`Middlegame plans added: ${plansAdded} (skipped ${plansSkipped})`);
console.log(`Common mistakes added: ${mistakesAdded}`);
console.log(`Quiz items added: ${quizAdded}`);
console.log(`Totals now:`);
console.log(`  plans: ${plans.length}`);
console.log(`  mistakes: ${Object.values(mistakes).reduce((s, arr) => s + arr.length, 0)}`);
console.log(`  quiz: ${Object.values(quizzes).reduce((s, arr) => s + arr.length, 0)}`);

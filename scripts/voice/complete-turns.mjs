#!/usr/bin/env node
// COMPLETE TURNS on a facts dump (renderDump.measure): per alone-read, the
// move's job said, the main tempting try refuted WITH a why (a second
// sentence after its lead), and the line's point (a plan, a line or a
// technique fact). The right move is the puzzles5 answer-key test's.
import { readFileSync } from 'node:fs';
const JOB = new Set(['move-job', 'route', 'judgement', 'aspect-threat', 'aspect-prepares', 'aspect-tactic-lands', 'aspect-wins', 'aspect-tactic-set-up', 'aspect-opens-king', 'stop', 'stopped', 'board-teacher', 'fundamental', 'technique', 'sac-why', 'checkmate', 'pawn-break', 'trade', 'provoke', 'aspect-prepares']);
const sents = (t) => t.split(/(?<=[.!?])\s+/).filter(Boolean).length;
// A TRY WITH A MECHANISM (2026-11-20): since a try's one cost rides on the
// sentence before it, "two sentences" no longer means "a why". Clauses
// (sentences, ": " and ", and " halves) that are neither the lead nor a cost
// are its why.
const LEAD = /(looks natural|is the obvious try|is tempting|looked natural|was the obvious|was tempting|goes straight at|storms|directly runs? into|fail the same way|would run into|If they try|ran into|runs into|doesn't work|doesn't hold up)/;
const COST = /^(?:(?:it|[…]?[KQRBN]?[a-h]?x?[a-h][1-8][+#]?|either|each|after \S+) )?(hands (them|you)|leaves (you|them)|gives back|throws the win|lets the win slip|loses (them )?the game|makes (your|their) position|achieves nothing)|^(they|you) win .* in the line|^(?:after \S+ )?(your|their) edge is gone|^the game is level|^you're (only|losing)|^they're/i;
const hasMech = (t) => t.split(/(?<=[.!?])\s+|: |, and /).map((c) => c.trim().replace(/[.]$/, '')).filter(Boolean).some((c) => !LEAD.test(c) && !COST.test(c));
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(f, 'utf8'));
  let n = 0; const c = { job: 0, tryWhy: 0, tryMech: 0, point: 0, all: 0, allMech: 0 };
  for (const [id, r] of Object.entries(d)) {
    if (!id.startsWith('alone:')) continue;
    n++;
    const job = r.kept.some((x) => JOB.has(x.kind));
    const tryWhy = r.kept.some((x) => x.from === 'tempting' && sents(x.text) >= 2);
    const tryMech = r.kept.some((x) => x.from === 'tempting' && hasMech(x.text));
    const point = r.kept.some((x) => ['picturePlan', 'planOfTheBoard', 'defenderCheckRun'].includes(x.computer) || ['plan-now', 'plan-steps', 'structure-plan', 'siege', 'technique', 'mate-pattern'].includes(x.kind));
    c.job += job; c.tryWhy += tryWhy; c.tryMech += tryMech; c.point += point; c.all += job && tryWhy && point; c.allMech += job && tryMech && point;
  }
  console.log(f, `reads ${n}: job ${c.job}, try+why ${c.tryWhy} (with a mechanism ${c.tryMech}), point ${c.point}, complete ${c.all} (with a mechanism ${c.allMech})`);
}

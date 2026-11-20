#!/usr/bin/env node
// COMPLETE TURNS on a facts dump (renderDump.measure): per alone-read, the
// move's job said, the main tempting try refuted WITH a why (a second
// sentence after its lead), and the line's point (a plan, a line or a
// technique fact). The right move is the puzzles5 answer-key test's.
import { readFileSync } from 'node:fs';
const JOB = new Set(['move-job', 'route', 'judgement', 'aspect-threat', 'aspect-prepares', 'aspect-tactic-lands', 'aspect-wins', 'aspect-tactic-set-up', 'aspect-opens-king', 'stop', 'stopped', 'board-teacher', 'fundamental', 'technique', 'sac-why', 'checkmate', 'pawn-break', 'trade', 'provoke', 'aspect-prepares']);
const sents = (t) => t.split(/(?<=[.!?])\s+/).filter(Boolean).length;
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(f, 'utf8'));
  let n = 0; const c = { job: 0, tryWhy: 0, point: 0, all: 0 };
  for (const [id, r] of Object.entries(d)) {
    if (!id.startsWith('alone:')) continue;
    n++;
    const job = r.kept.some((x) => JOB.has(x.kind));
    const tryWhy = r.kept.some((x) => x.from === 'tempting' && sents(x.text) >= 2);
    const point = r.kept.some((x) => ['picturePlan', 'planOfTheBoard', 'defenderCheckRun'].includes(x.computer) || ['plan-now', 'plan-steps', 'structure-plan', 'siege', 'technique', 'mate-pattern'].includes(x.kind));
    c.job += job; c.tryWhy += tryWhy; c.point += point; c.all += job && tryWhy && point;
  }
  console.log(f, `reads ${n}: job ${c.job}, try+why ${c.tryWhy}, point ${c.point}, complete ${c.all}`);
}

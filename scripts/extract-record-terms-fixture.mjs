#!/usr/bin/env node
// Slice David's data drop down to what learnRecordTerms.test.ts reads: every
// capability-evidence row and every slip for the skills the test names, with
// only the fields the heat map reads. Run after `read-data-drop.mjs --latest`.
//   node scripts/extract-record-terms-fixture.mjs [drop.json]
import { readFileSync, writeFileSync } from 'node:fs';

const TAGS = ['missed-opponents-threat', 'king-stuck-center'];
const src = process.argv[2] ?? 'audit-reports/.fixtures/data-drop-david.json';
const d = JSON.parse(readFileSync(src, 'utf8'));
// Compact tuples (the test expands them): game ids become indexes into `games`.
const games = [];
const gi = (id) => { if (!id) return -1; let i = games.indexOf(id); if (i < 0) { games.push(id); i = games.length - 1; } return i; };
// [tag index, 'h'|'b', origin, prompted 0/1, posedImportance, game index, recordedAt]
const evidence = d.stores.capabilityEvidence
  .filter((r) => TAGS.includes(r.tag))
  .map((r) => [TAGS.indexOf(r.tag), r.outcome === 'held' ? 'h' : 'b', r.origin, r.prompted ? 1 : 0, r.posedImportance ?? 0, gi(r.sourceGameId), r.recordedAt]);
// [tag index, source, game index, dueAt|null, grade|null]
const slips = d.stores.misconceptionTags
  .filter((r) => TAGS.includes(r.tag))
  .map((r) => [TAGS.indexOf(r.tag), r.source, gi(r.sourceGameId), r.dueAt ?? null, r.grade ?? null]);
const out = 'src/services/__fixtures__/davidRecord.recordTerms.json';
writeFileSync(out, JSON.stringify({ exportedAt: d.exportedAt, build: d.build, tags: TAGS, games, evidence, slips }));
console.log(`${evidence.length} evidence rows, ${slips.length} slips → ${out}`);

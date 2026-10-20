#!/usr/bin/env node
// Slice David's data drop down to what the record tests read: every
// capability-evidence row and every slip for the skills the tests name, with
// only the fields the heat map reads. Run after `read-data-drop.mjs --latest`.
// The threat motifs (missed-their-fork / -pin) come from the engine-graded
// replay of his games (`threatAnswerEvidence.measure.test.ts` shards), since
// his device has not run that half yet.
//   node scripts/extract-record-terms-fixture.mjs [drop.json]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const TAGS = ['missed-opponents-threat', 'king-stuck-center', 'hung-material', 'missed-tactic', 'missed-their-fork', 'missed-their-pin'];
const src = process.argv[2] ?? 'audit-reports/.fixtures/data-drop-david.json';
const d = JSON.parse(readFileSync(src, 'utf8'));
const replay = [1, 2, 3, 4].map((i) => `audit-reports/.fixtures/threat-answer-rows-${i}of4.json`)
  .filter(existsSync).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')).rows);
// Compact tuples (the test expands them): game ids and ply keys become indexes.
const games = [];
const plies = [];
const idx = (arr, v) => { if (!v) return -1; let i = arr.indexOf(v); if (i < 0) { arr.push(v); i = arr.length - 1; } return i; };
// Game + ply, the dedupe key's half: board, side, castling, ep, move number.
const ply = (fen) => { const p = fen.split(' '); return `${p[0]} ${p[1]} ${p[2]} ${p[3]} 0 ${p[5]}`; };
// [tag index, 'h'|'b', origin, prompted 0/1, posedImportance, game index, recordedAt, ply index]
const evidence = [...d.stores.capabilityEvidence, ...replay]
  .filter((r) => TAGS.includes(r.tag))
  .map((r) => [TAGS.indexOf(r.tag), r.outcome === 'held' ? 'h' : 'b', r.origin, r.prompted ? 1 : 0, r.posedImportance ?? 0, idx(games, r.sourceGameId), r.recordedAt, idx(plies, ply(r.fen))]);
// A slip is dated by its GAME (`playedAt`), as `repairSlipDates` stamps the
// rows on his device: the game's date + the ply.
const plyOf = (fen) => { const p = fen.split(' '); return (Math.max(1, Number(p[5]) || 1) - 1) * 2 + (p[1] === 'b' ? 1 : 0); };
const gameDate = new Map(d.stores.games.map((g) => [g.id, g.date ? Date.parse(String(g.date).replace(/\./g, '-')) : NaN]));
const playedAt = (r) => r.playedAt ?? (Number.isFinite(gameDate.get(r.sourceGameId)) ? gameDate.get(r.sourceGameId) + plyOf(r.fen) : null);
// [tag index, source, game index, dueAt|null, grade|null, createdAt, ply index, playedAt|null]
const slips = d.stores.misconceptionTags
  .filter((r) => TAGS.includes(r.tag))
  .map((r) => [TAGS.indexOf(r.tag), r.source, idx(games, r.sourceGameId), r.dueAt ?? null, r.grade ?? null, r.createdAt, idx(plies, ply(r.fen)), playedAt(r)]);
const out = 'src/services/__fixtures__/davidRecord.recordTerms.json';
writeFileSync(out, JSON.stringify({ exportedAt: d.exportedAt, build: d.build, tags: TAGS, games, plies, evidence, slips }));
console.log(`${evidence.length} evidence rows, ${slips.length} slips, ${plies.length} plies → ${out}`);

#!/usr/bin/env node
// cpu-profile-map — read a page CPU profile back in SOURCE terms: busy time,
// the heaviest functions (self and inclusive), and a 2-second timeline of the
// task that held the screen.
//
// The Review freeze (2026-10-21) was found this way: AUTO_PROFILE=1 on
// `audit-review-overhaul-prod.mjs` records the main thread from Start, and a
// local production build WITH source maps names the code (prod ships none):
//
//   npx vite build --sourcemap --outDir /tmp/dist-prof
//   npx vite preview --outDir /tmp/dist-prof --port 5181 --strictPort &
//   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5181 AUTO_PROFILE=1 AUTO_ONLY=1 \
//     node scripts/audit-review-overhaul-prod.mjs
//   node scripts/audit-lib/cpu-profile-map.mjs audit-reports/review-start-profile-*.cpuprofile /tmp/dist-prof
//
// Load David's record first (audit-reports/.fixtures/data-drop-david.json) —
// an empty device hides the background work a real record carries.
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { SourceMapConsumer } = require('source-map-js');

const [file, dist, topArg] = process.argv.slice(2);
if (!file || !dist) {
  console.error('usage: cpu-profile-map.mjs <profile.cpuprofile> <distDir with .map files> [top]');
  process.exit(2);
}
const top = Number(topArg ?? 25);
const profile = JSON.parse(readFileSync(file, 'utf8'));

const consumers = new Map();
const consumer = (url) => {
  const m = /\/assets\/([^?#]+\.js)/.exec(url ?? '');
  if (!m) return null;
  if (!consumers.has(m[1])) {
    const p = `${dist}/assets/${m[1]}.map`;
    consumers.set(m[1], existsSync(p) ? new SourceMapConsumer(JSON.parse(readFileSync(p, 'utf8'))) : null);
  }
  return consumers.get(m[1]);
};
const label = (cf) => {
  const c = consumer(cf.url);
  if (!c) return `${cf.functionName || '(anon)'}`;
  const pos = c.originalPositionFor({ line: cf.lineNumber + 1, column: cf.columnNumber });
  return `${pos.name || cf.functionName || '(anon)'} ${(pos.source ?? '?').replace(/^.*\/(src|node_modules)\//, '$1/')}:${pos.line}`;
};

const parent = new Map();
for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const labels = new Map(profile.nodes.map((n) => [n.id, label(n.callFrame)]));
const idle = (id) => /^\((idle|program)\)/.test(labels.get(id));
const selfUs = new Map();
profile.samples.forEach((id, i) => selfUs.set(id, (selfUs.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)));

const self = new Map();
const incl = new Map();
for (const [id, us] of selfUs) {
  self.set(labels.get(id), (self.get(labels.get(id)) ?? 0) + us);
  const seen = new Set();
  for (let cur = id; cur !== undefined; cur = parent.get(cur)) {
    const l = labels.get(cur);
    if (!seen.has(l)) { incl.set(l, (incl.get(l) ?? 0) + us); seen.add(l); }
  }
}
const total = [...selfUs.values()].reduce((a, b) => a + b, 0);
const quiet = [...selfUs.entries()].filter(([id]) => idle(id)).reduce((a, [, us]) => a + us, 0);
const ms = (us) => String(Math.round(us / 1e3)).padStart(7);
console.log(`sampled ${(total / 1e6).toFixed(1)} s, busy ${((total - quiet) / 1e6).toFixed(1)} s`);
console.log('\n== SELF ==');
[...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).forEach(([k, us]) => console.log(`${ms(us)} ms  ${k}`));
console.log('\n== INCLUSIVE (src) ==');
[...incl.entries()].filter(([k]) => / src\//.test(k)).sort((a, b) => b[1] - a[1]).slice(0, top).forEach(([k, us]) => console.log(`${ms(us)} ms  ${k}`));

// What held the screen WHEN: per 2 s window, the outermost src task.
let t = profile.startTime;
const win = new Map();
profile.samples.forEach((id, i) => {
  t += profile.timeDeltas[i] ?? 0;
  if (idle(id)) return;
  let outer = '(no src frame)';
  for (let cur = id; cur !== undefined; cur = parent.get(cur)) if (/ src\//.test(labels.get(cur))) outer = labels.get(cur);
  const s = Math.floor((t - profile.startTime) / 2e6) * 2;
  const w = win.get(s) ?? new Map();
  w.set(outer, (w.get(outer) ?? 0) + (profile.timeDeltas[i] ?? 0));
  win.set(s, w);
});
console.log('\n== TIMELINE (2 s windows: busy ms, outermost src task) ==');
for (const [s, w] of [...win.entries()].sort((a, b) => a[0] - b[0])) {
  const sum = [...w.values()].reduce((a, b) => a + b, 0);
  const lead = [...w.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, us]) => `${k} ${Math.round(us / 1e3)}`).join(' | ');
  console.log(`${String(s).padStart(4)}s ${String(Math.round(sum / 1e3)).padStart(5)}ms  ${lead}`);
}

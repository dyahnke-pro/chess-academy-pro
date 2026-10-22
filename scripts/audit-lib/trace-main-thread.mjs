#!/usr/bin/env node
/**
 * Read a Chrome trace (Playwright `browser.startTracing`) and say what the
 * renderer's main thread spent its time on — the half a CPU profile files under
 * "(program)": layout, style recalculation, paint, GC, script.
 *
 *   node scripts/audit-lib/trace-main-thread.mjs <trace.json> [--long 500] [--dist /tmp/dist-prof]
 *
 * Prints the totals by event name for the page's main thread, then each task
 * at or over the `--long` bar (ms) with its own breakdown, so a 6 s task reads
 * as "5.4 s Layout, 0.3 s script" instead of a single number. When the trace
 * carries the V8 sampler (`disabled-by-default-v8.cpu_profiler`) and `--dist`
 * names a build with source maps, each long task also lists the source
 * functions its samples fell in — on the trace's own clock.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const file = process.argv[2];
if (!file) { console.error('usage: trace-main-thread.mjs <trace.json> [--long ms] [--dist dir]'); process.exit(2); }
const flag = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const LONG_MS = Number(flag('--long') ?? 500);
const DIST = flag('--dist');

const raw = JSON.parse(readFileSync(file, 'utf8'));
const events = Array.isArray(raw) ? raw : raw.traceEvents ?? [];

// The page's main thread: the CrRendererMain with the most task time.
const mains = events.filter((e) => e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain');
const taskTime = new Map();
for (const e of events) {
  if (e.ph === 'X' && e.name === 'RunTask' && typeof e.dur === 'number') {
    const k = `${e.pid}:${e.tid}`;
    taskTime.set(k, (taskTime.get(k) ?? 0) + e.dur);
  }
}
let main = null;
for (const m of mains) {
  const k = `${m.pid}:${m.tid}`;
  if (!main || (taskTime.get(k) ?? 0) > (taskTime.get(main) ?? 0)) main = k;
}
if (!main) { console.error('no renderer main thread in the trace'); process.exit(1); }
const [pid, tid] = main.split(':').map(Number);
const onMain = events.filter((e) => e.pid === pid && e.tid === tid && e.ph === 'X' && typeof e.dur === 'number')
  .sort((a, b) => a.ts - b.ts || b.dur - a.dur);

const tasks = onMain.filter((e) => e.name === 'RunTask');
const t0 = tasks.length ? tasks[0].ts : 0;
const ms = (us) => Math.round(us / 1000);

// SELF time per event name: an event's duration minus its direct children's.
// Children are found by nesting on the one thread (complete events nest).
function selfTimes(list) {
  const self = new Map();
  const stack = [];
  for (const e of list) {
    while (stack.length && stack[stack.length - 1].ts + stack[stack.length - 1].dur <= e.ts) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) parent.childDur = (parent.childDur ?? 0) + e.dur;
    stack.push(e);
  }
  for (const e of list) {
    const s = e.dur - (e.childDur ?? 0);
    if (s > 0) self.set(e.name, (self.get(e.name) ?? 0) + s);
  }
  return self;
}

const total = tasks.reduce((s, e) => s + e.dur, 0);
const span = tasks.length ? tasks[tasks.length - 1].ts + tasks[tasks.length - 1].dur - t0 : 0;
console.log(`main thread ${pid}:${tid} — ${tasks.length} tasks, busy ${ms(total)} ms over ${ms(span)} ms`);
console.log('\n== SELF TIME BY EVENT (main thread) ==');
for (const [name, us] of [...selfTimes(onMain.map((e) => ({ ...e })))].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log(`  ${String(ms(us)).padStart(7)} ms  ${name}`);
}

// ── The sampler, if the trace carries it: every sample on the main thread's
// clock, as the chain of source frames it fell in (innermost first).
const samples = [];
{
  const profiles = new Map();
  for (const e of events) {
    if (e.pid !== pid) continue;
    if (e.name === 'Profile' && e.args?.data?.startTime != null) profiles.set(e.id, { tid: e.tid, t: e.args.data.startTime, nodes: new Map(), times: [], ids: [] });
  }
  for (const e of events) {
    if (e.pid !== pid || e.name !== 'ProfileChunk') continue;
    const p = profiles.get(e.id);
    const d = e.args?.data;
    if (!p || !d) continue;
    for (const n of d.cpuProfile?.nodes ?? []) p.nodes.set(n.id, n);
    const ids = d.cpuProfile?.samples ?? [];
    const deltas = d.timeDeltas ?? [];
    for (let i = 0; i < ids.length; i++) { p.t += deltas[i] ?? 0; p.times.push(p.t); p.ids.push(ids[i]); }
  }
  // The main thread's own profile. Engine workers live in the same renderer
  // process and can carry their own, busier, sampler — so the thread decides,
  // and the busiest profile is only the fallback when no profile names it.
  const all = [...profiles.values()].sort((a, b) => b.ids.length - a.ids.length);
  const main = all.find((p) => p.tid === tid) ?? all[0];
  if (main && main.tid !== tid) console.log(`\n(sampler: no profile on the main thread's tid — using the busiest, tid ${main.tid})`);
  if (main && main.ids.length > 0) {
    const require = createRequire(import.meta.url);
    let Consumer = null;
    try { Consumer = require('source-map-js').SourceMapConsumer; } catch { Consumer = null; }
    const maps = new Map();
    const consumer = (url) => {
      const m = /\/assets\/([^?#]+\.js)/.exec(url ?? '');
      if (!m || !DIST || !Consumer) return null;
      if (!maps.has(m[1])) {
        const p = `${DIST}/assets/${m[1]}.map`;
        maps.set(m[1], existsSync(p) ? new Consumer(JSON.parse(readFileSync(p, 'utf8'))) : null);
      }
      return maps.get(m[1]);
    };
    const frameName = new Map();
    const nameOf = (node) => {
      if (frameName.has(node.id)) return frameName.get(node.id);
      const cf = node.callFrame ?? {};
      let name = cf.functionName || '(anon)';
      const c = consumer(cf.url);
      if (c && cf.lineNumber >= 0) {
        const o = c.originalPositionFor({ line: cf.lineNumber + 1, column: Math.max(0, cf.columnNumber ?? 0) });
        if (o?.source) name = `${o.name ?? name} ${o.source.replace(/^.*?(src\/|node_modules\/)/, '$1')}:${o.line}`;
      } else if (!cf.url) {
        name = cf.functionName ? `(${cf.functionName})` : '(native)';
      }
      frameName.set(node.id, name);
      return name;
    };
    for (let i = 0; i < main.ids.length; i++) {
      const chain = [];
      for (let n = main.nodes.get(main.ids[i]); n; n = n.parent != null ? main.nodes.get(n.parent) : null) chain.push(nameOf(n));
      samples.push({ t: main.times[i], chain });
    }
    samples.sort((a, b) => a.t - b.t);
    console.log(`\nsampler: ${samples.length} samples on the main thread${DIST ? ` (mapped through ${DIST})` : ' (pass --dist to map to source)'}`);
  }
}

/** The source functions a window's samples fell in: inclusive (any frame on
 *  the stack, counted once per sample) and self (the innermost frame). */
function samplesIn(from, to) {
  let lo = 0, hi = samples.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (samples[mid].t < from) lo = mid + 1; else hi = mid; }
  const incl = new Map();
  const self = new Map();
  let n = 0;
  for (let i = lo; i < samples.length && samples[i].t <= to; i++) {
    n += 1;
    const s = samples[i];
    self.set(s.chain[0], (self.get(s.chain[0]) ?? 0) + 1);
    for (const f of new Set(s.chain)) if (f.includes('src/')) incl.set(f, (incl.get(f) ?? 0) + 1);
  }
  return { n, incl, self };
}

const longTasks = tasks.filter((t) => t.dur >= LONG_MS * 1000);
console.log(`\n== TASKS ≥ ${LONG_MS} ms (${longTasks.length}) ==`);
for (const t of longTasks) {
  const inside = onMain.filter((e) => e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur).map((e) => ({ ...e }));
  const parts = [...selfTimes(inside)].sort((a, b) => b[1] - a[1]).filter(([, us]) => us >= 20_000).slice(0, 6);
  // The script entry points inside the task, with their source when the trace carries it.
  const calls = inside.filter((e) => e.name === 'FunctionCall' || e.name === 'TimerFire' || e.name === 'FireAnimationFrame' || e.name === 'EventDispatch')
    .sort((a, b) => b.dur - a.dur).slice(0, 3)
    .map((e) => {
      const d = e.args?.data ?? {};
      const where = d.url ? `${String(d.url).split('/').pop()}:${d.lineNumber ?? ''}` : d.type ?? d.functionName ?? '';
      return `${e.name}${where ? ` ${where}` : ''} ${ms(e.dur)}ms`;
    });
  console.log(`  @${(ms(t.ts - t0) / 1000).toFixed(1)}s  ${ms(t.dur)} ms  — ${parts.map(([n, us]) => `${n} ${ms(us)}`).join(', ')}${calls.length ? `\n      ${calls.join(' | ')}` : ''}`);
  if (samples.length > 0) {
    const w = samplesIn(t.ts, t.ts + t.dur);
    if (w.n > 0) {
      const pct = (c) => `${Math.round((100 * c) / w.n)}%`;
      const incl = [...w.incl].sort((a, b) => b[1] - a[1]).slice(0, 10);
      const self = [...w.self].sort((a, b) => b[1] - a[1]).slice(0, 5);
      console.log(`      ${w.n} samples · self: ${self.map(([f, c]) => `${f} ${pct(c)}`).join(' | ')}`);
      for (const [f, c] of incl) console.log(`        ${pct(c).padStart(4)}  ${f}`);
    }
  }
}

// The whole game's source functions, inclusive — what the main thread spent
// its JavaScript on overall, beside the long tasks.
if (samples.length > 0) {
  const w = samplesIn(-Infinity, Infinity);
  console.log(`\n== WHOLE GAME, SOURCE FUNCTIONS (inclusive, % of ${w.n} samples) ==`);
  for (const [f, c] of [...w.incl].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`  ${String(Math.round((1000 * c) / w.n) / 10).padStart(5)}%  ${f}`);
}

#!/usr/bin/env node
/**
 * audit-acceptance-compare — BEFORE vs AFTER for the acceptance runs, per
 * key (item kind), per game and item by item where it moved.
 *
 *   node scripts/audit-acceptance-compare.mjs --before before-1,before-2 --after after-1
 *   node scripts/audit-acceptance-compare.mjs --before golden-before-1,golden-before-2,golden-before-3 \
 *        --after golden-after-1,golden-after-2,golden-after-3 --out golden
 *
 * An item MOVED when every BEFORE run agreed on it and the AFTER majority
 * says the opposite; an item the BEFORE runs disagreed on is noise and is
 * listed separately, never counted as a move.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const R = 'audit-reports/acceptance/runs/';
const load = (r) => JSON.parse(readFileSync(`${R}${r}/score.json`, 'utf8'));
const before = opt('before').split(',').map(load);
const after = opt('after').split(',').map(load);
const out = opt('out') ?? 'six-game';

const status = (runs, id) => runs.map((s) => s.items.find((x) => x.id === id)?.status ?? 'absent');
const majority = (sts) => { const met = sts.filter((x) => x === 'met').length; const miss = sts.filter((x) => x === 'missed').length; return met > miss ? 'met' : miss > met ? 'missed' : 'tie'; };
const avg = (runs, f) => runs.reduce((n, s) => n + f(s), 0) / runs.length;
const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

const items = before[0].items;
const moved = []; const noise = [];
for (const it of items) {
  const b = status(before, it.id); const a = status(after, it.id);
  if (b.includes('absent') || a.includes('absent') || b.includes('not-reached') || a.includes('not-reached')) continue;
  if (new Set(b).size > 1) { noise.push({ it, b, a }); continue; }
  const am = majority(a);
  if (am !== 'tie' && am !== b[0]) moved.push({ it, b, a, dir: am === 'met' ? 'up' : 'down' });
}
const kinds = Object.keys(before[0].summary.perKind);
const games = Object.keys(before[0].summary.perGame);
const lineOf = (runs, id) => { for (const s of runs) { const x = s.items.find((y) => y.id === id); if (x?.heard) return Array.isArray(x.heard) ? x.heard[0] : x.heard; } return null; };
const md = [
  `# Acceptance BEFORE → AFTER (${out})`, '',
  `BEFORE: ${opt('before')} · AFTER: ${opt('after')}`, '',
  `**Total: ${before.map((s) => s.summary.met).join(' / ')} → ${after.map((s) => s.summary.met).join(' / ')} of ${before[0].summary.of}.** Moved up ${moved.filter((m) => m.dir === 'up').length}, down ${moved.filter((m) => m.dir === 'down').length}; ${noise.length} items were already unstable across the BEFORE runs.`, '',
  '| key | BEFORE (avg) | AFTER (avg) | of |', '|---|---|---|---|',
  ...kinds.map((k) => `| ${k} | ${fmt(avg(before, (s) => s.summary.perKind[k]?.met ?? 0))} | ${fmt(avg(after, (s) => s.summary.perKind[k]?.met ?? 0))} | ${before[0].summary.perKind[k].of} |`), '',
  '| game | BEFORE (avg) | AFTER (avg) | of |', '|---|---|---|---|',
  ...games.map((g) => `| ${g} | ${fmt(avg(before, (s) => s.summary.perGame[g]?.met ?? 0))} | ${fmt(avg(after, (s) => s.summary.perGame[g]?.met ?? 0))} | ${before[0].summary.perGame[g].of} |`), '',
  '## Moved', '',
  ...moved.map(({ it, b, a, dir }) => {
    const mustNot = /NOT/.test(it.say);
    const metRuns = (runs) => runs.filter((s) => s.items.find((x) => x.id === it.id)?.status === 'met');
    const missRuns = (runs) => runs.filter((s) => s.items.find((x) => x.id === it.id)?.status === 'missed');
    // A MUST NOT carries its offending line on the MISSED side; a MUST SAY its matching line on the MET side.
    const line = mustNot
      ? (dir === 'up' ? `was heard BEFORE, now gone: “${String(lineOf(missRuns(before), it.id) ?? '').slice(0, 260)}”` : `now heard: “${String(lineOf(missRuns(after), it.id) ?? '').slice(0, 260)}”`)
      : (dir === 'up' ? `now heard: “${String(lineOf(metRuns(after), it.id) ?? '').slice(0, 260)}”` : `BEFORE heard: “${String(lineOf(metRuns(before), it.id) ?? '').slice(0, 260)}”`);
    return `- ${dir === 'up' ? '⬆' : '⬇'} **${it.id}** (${it.say}, ${it.move}) — ${it.what}\n  - BEFORE ${b.join('/')} → AFTER ${a.join('/')}\n  - ${line}`;
  }),
  '', '## Unstable in BEFORE (not counted)', '', ...noise.map(({ it, b, a }) => `- ${it.id}: BEFORE ${b.join('/')} → AFTER ${a.join('/')}`), '',
];
writeFileSync(`audit-reports/acceptance/AFTER-${out}.md`, md.join('\n'));
console.log(md.slice(0, 6 + kinds.length + games.length + 6).join('\n'));
console.log(`moved: ${moved.map((m) => `${m.dir === 'up' ? '+' : '-'}${m.it.id}`).join(' ')}`);

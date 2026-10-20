#!/usr/bin/env node
/**
 * audit-acceptance-list — plays the six fixed Learn games through the hand
 * driver (MUTED, David's record loaded) and scores every spoken line against
 * the acceptance answer key, `audit-reports/acceptance/learn-list.json`, which
 * was written before any run.
 *
 *   node scripts/audit-acceptance-list.mjs --run before-1                 all six games
 *   node scripts/audit-acceptance-list.mjs --run before-1 --games g1,g3   some games
 *   node scripts/audit-acceptance-list.mjs --score audit-reports/acceptance/runs/before-1
 *
 * The student's moves go on the board (`/turn`); the opponent's are dictated
 * ("play X"). Only lines the voice SPOKE count (`voiceService.speakCloud`), cut
 * into one window per student move: from that move to the next one. A tape is
 * saved per game, so `--score` re-scores a run without replaying it.
 *
 * Env: HAND_PORT (default 7777) — a hand driver already listening there is
 * used; otherwise one is started (AUDIT_SMOKE_URL, AUDIT_SANDBOX, AUDIT_PROXY
 * pass through). MIN_THINK_MS (default 20000) — the least time spent on a move.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
import { isWhy, isTeachingLine } from './audit-lib/why-count.mjs';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
// --list picks the answer key: the six-game list (default) or the golden speedrun.
const LIST = opt('list') ?? 'audit-reports/acceptance/learn-list.json';
const list = JSON.parse(readFileSync(LIST, 'utf8'));
const PORT = Number(process.env.HAND_PORT ?? 7777);
const DRIVER = `http://localhost:${PORT}`;
const MIN_THINK = Number(process.env.MIN_THINK_MS ?? 20000);
// --turns N stops each game after N student moves (a smoke test of the harness).
const MAX_TURNS = Number(opt('turns') ?? Infinity);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (path, body) => (await fetch(`${DRIVER}${path}`, body != null ? { method: 'POST', body } : {})).json();
const words = (t) => String(t).split(/\s+/).filter(Boolean).length;
const lineMs = (t) => Math.min(12000, Math.max(400, Math.round((words(t) / 150) * 60000)));
// The dictation's own acknowledgement is the instrument, not the coach.
const INSTRUMENT = /^Got it — after your move, they play\b|^Got it\b.*\bif it'?s still legal\b/i;

// ── the tape ────────────────────────────────────────────────────────────────
async function spokenSince(t0) {
  const rows = await call(`/events?n=1000000&t=1&grep=${encodeURIComponent('coach-narration-spoken')}`);
  const out = [];
  for (const r of rows) {
    const [ts, kind, source, ...rest] = r.split(' | ');
    if (kind !== 'coach-narration-spoken' || source !== 'voiceService.speakCloud') continue;
    if (Number(ts) < t0) continue;
    out.push({ ts: Number(ts), text: rest.join(' | ').trim() });
  }
  return out;
}
/** Wait until the voice has run out and stayed quiet, and at least MIN_THINK
 *  has passed since `tMove` (at most 100 s). */
async function settle(tMove) {
  const t0 = Date.now();
  for (;;) {
    const lines = await spokenSince(tMove);
    const lastEnd = lines.reduce((m, l) => Math.max(m, l.ts + lineMs(l.text)), tMove);
    const now = Date.now();
    if (now - tMove >= MIN_THINK && now - lastEnd >= 4000) return;
    if (now - t0 > 100000) return;
    await sleep(1000);
  }
}

async function ensureDriver() {
  try { await call('/state'); return null; } catch { /* start one */ }
  const child = spawn(process.execPath, ['scripts/audit-lib/hand-driver.mjs'], { env: { ...process.env, HAND_PORT: String(PORT) }, stdio: ['ignore', 'inherit', 'inherit'] });
  for (let i = 0; i < 120; i += 1) { await sleep(1000); try { await call('/state'); return child; } catch { /* not yet */ } }
  throw new Error('hand driver did not start');
}

const IDB = "const r = indexedDB.open('ChessAcademyDB'); const db = await new Promise((res) => { r.onsuccess = () => res(r.result); });";
async function playGame(id, outDir) {
  const g = list.games[id];
  const sans = g.sans; const seat = g.seat;
  console.log(`\n[${id}] ${seat}, ${sans.length} plies`);
  await call('/open');
  const fx = await call('/fixture');
  console.log(`[${id}] fixture ${fx.loaded ? `${fx.wrote} rows` : `NOT LOADED (${fx.reason})`}`);
  // The fixture's profile carries David's own stream settings; clear them so
  // the page reports to this run's listener only.
  await call('/js', `${IDB} return await new Promise((res) => { const tx = db.transaction('profiles','readwrite'); const st = tx.objectStore('profiles'); const q = st.getAll(); q.onsuccess = () => { for (const p of q.result) { p.preferences = p.preferences || {}; p.preferences.auditStreamUrl = null; p.preferences.auditStreamSecret = null; st.put(p); } tx.oncomplete = () => res(q.result.length); }; });`);
  const gameStart = Date.now();
  await call('/open');
  const tape = { id, seat, sans, fixture: fx.loaded ? fx.wrote : null, gameStart, turns: [], errors: [] };
  if (seat === 'black') {
    await call('/type', `play ${sans[0]}`);
    let mv = (await call('/type', 'I want to play black')).moves;
    for (let i = 0; i < 30 && !mv; i += 1) mv = (await call('/wait?ms=1500')).moves;
    if (mv !== sans[0]) tape.errors.push(`coach opened ${mv}, wanted ${sans[0]}`);
    await settle(gameStart);
  }
  for (let i = 0; i < sans.length; i += 1) {
    const studentPly = (seat === 'white') === (i % 2 === 0);
    if (!studentPly) continue;
    if (tape.turns.length >= MAX_TURNS) break;
    const reply = sans[i + 1] ?? null;
    const tStart = Date.now();
    if (reply) await call('/type', `play ${reply}`);
    const tMove = Date.now();
    const r = await call(`/turn?san=${encodeURIComponent(sans[i])}`);
    const turn = { ply: i + 1, san: sans[i], expectedReply: reply, reply: r.reply ?? null, tStart, tMove, replyAt: r.replyMs != null ? tMove + r.replyMs : null, error: r.error ?? null };
    tape.turns.push(turn);
    process.stdout.write(`[${id}] ${i + 1}. ${sans[i]} → ${turn.reply ?? '-'}${reply && turn.reply !== reply ? ` (EXPECTED ${reply})` : ''}\n`);
    if (r.error) { tape.errors.push(`ply ${i + 1}: ${r.error}`); break; }
    if (reply && turn.reply !== reply) { tape.errors.push(`ply ${i + 2}: coach played ${turn.reply}, wanted ${reply}`); break; }
    await settle(tMove);
  }
  tape.gameEnd = Date.now();
  tape.lines = (await spokenSince(gameStart)).filter((l) => l.ts <= tape.gameEnd);
  writeFileSync(`${outDir}/${id}.json`, JSON.stringify(tape, null, 1));
  return tape;
}

// ── scoring ─────────────────────────────────────────────────────────────────
const norm = (t) => String(t).replace(/\b([a-h]) ([1-8])\b/g, '$1$2').replace(/\s+/g, ' ').trim();
const sentences = (t) => norm(t).split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 1);
const key = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const rx = (srcs) => srcs.map((s) => new RegExp(s, 'i'));
const PIECE = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const CLAIM = /\b(your|their)\s+(pawn|knight|bishop|rook|queen|king)\s+on\s+([a-h][1-8])\b/gi;
const HYPOTHETICAL = /\b(if|would|could|after|once|when|then|line|was|were|had|used to|until)\b/i;

function windowsOf(tape) {
  const turns = tape.turns;
  const lines = tape.lines.filter((l) => !INSTRUMENT.test(l.text));
  const byPly = new Map();
  turns.forEach((t, k) => {
    const end = turns[k + 1]?.tStart ?? tape.gameEnd + 1;
    const own = lines.filter((l) => l.ts >= t.tStart && l.ts < end);
    const after = t.replyAt ? own.filter((l) => l.ts >= t.replyAt - 300) : [];
    byPly.set(t.ply, { lines: own, after, played: true });
  });
  const intro = lines.filter((l) => l.ts < (turns[0]?.tStart ?? Infinity));
  return { byPly, intro, lines };
}

function scoreGame(id, tape) {
  const items = list.items.filter((it) => it.game === id);
  const seat = list.games[id].seat === 'white' ? 'w' : 'b';
  const { byPly, intro } = windowsOf(tape);
  const results = [];
  // sentences heard earlier in the game, for noRepeat (in hearing order)
  const seenBefore = new Map();
  const order = [...intro.map((l) => ({ l, ply: 0 })), ...[...byPly.entries()].flatMap(([ply, w]) => w.lines.map((l) => ({ l, ply })))];
  const firstHeard = new Map();
  for (const { l, ply } of order) for (const s of sentences(l.text)) {
    if (words(s) < 6) continue;
    const k = key(s);
    if (!firstHeard.has(k)) firstHeard.set(k, { ply, ts: l.ts });
  }
  for (const it of items) {
    const w = byPly.get(it.ply);
    const res = { id: it.id, kind: it.kind, say: it.say, move: it.move, what: it.what, soft: !!it.soft };
    if (it.window === 'byPly') {
      const heard = [...intro, ...[...byPly.entries()].filter(([p]) => p <= it.ply).flatMap(([, x]) => x.lines)];
      const maxPly = Math.max(0, ...byPly.keys());
      if (!(maxPly >= it.ply || (maxPly > 0 && tape.errors.length === 0))) { results.push({ ...res, status: 'not-reached' }); continue; }
      const re = rx(it.anyOf);
      const hit = heard.flatMap((l) => sentences(l.text)).find((s) => re.some((r) => r.test(s)));
      results.push({ ...res, status: hit ? 'met' : 'missed', heard: hit ?? null });
      continue;
    }
    if (!w) { results.push({ ...res, status: 'not-reached' }); continue; }
    const pool = it.window === 'afterReply' ? w.after : w.lines;
    const sens = pool.flatMap((l) => sentences(l.text).map((s) => ({ s, line: l.text, ts: l.ts })));
    const show = () => pool.map((l) => norm(l.text).slice(0, 300));
    switch (it.kind) {
      case 'reason': {
        const refs = rx(it.refers);
        const hit = pool.filter((l) => isTeachingLine(l.text)).flatMap((l) => sentences(l.text)).find((s) => isWhy(s) && refs.some((r) => r.test(s)));
        results.push({ ...res, status: hit ? 'met' : 'missed', heard: hit ?? show() });
        break;
      }
      case 'verdict': case 'danger': case 'beat': {
        const any = rx(it.anyOf ?? []); const all = rx(it.allOf ?? []);
        const hit = sens.find(({ s }) => all.every((r) => r.test(s)) && (any.length === 0 || any.some((r) => r.test(s))));
        results.push({ ...res, status: hit ? 'met' : 'missed', heard: hit ? hit.s : show() });
        break;
      }
      case 'noLeak': case 'noStat': case 'banned': {
        const ban = rx(it.ban);
        // "their knight takes d4" is the opponent's move, not the student's.
        const theirs = (s, r) => { const m = r.exec(s); return m && it.kind === 'noLeak' && /\b(their|they)\b[^.,;—]{0,12}$/i.test(s.slice(0, m.index)); };
        const hit = sens.find(({ s }) => ban.some((r) => r.test(s) && !theirs(s, r)));
        results.push({ ...res, status: hit ? 'missed' : 'met', heard: hit ? hit.s : null });
        break;
      }
      case 'once': {
        const c = rx(it.count);
        const hits = sens.filter(({ s }) => c.some((r) => r.test(s)));
        results.push({ ...res, status: hits.length > it.max ? 'missed' : 'met', heard: hits.length > it.max ? hits.map((h) => h.s) : null });
        break;
      }
      case 'noRepeat': {
        const rep = sens.filter(({ s, ts }) => { if (words(s) < 6) return false; const f = firstHeard.get(key(s)); return f && f.ts < ts; });
        results.push({ ...res, status: rep.length ? 'missed' : 'met', heard: rep.length ? rep.map((r) => r.s) : null });
        break;
      }
      case 'boardTrue': {
        const bad = [];
        for (const { s } of sens) {
          if (HYPOTHETICAL.test(s)) continue;
          for (const m of s.matchAll(CLAIM)) {
            const color = m[1].toLowerCase() === 'your' ? seat : (seat === 'w' ? 'b' : 'w');
            const type = PIECE[m[2].toLowerCase()];
            const ok = it.boards.some((f) => { const p = new Chess(f).get(m[3]); return p && p.type === type && p.color === color; });
            if (!ok) bad.push(`"${m[0]}" ⟵ ${s}`);
          }
        }
        results.push({ ...res, status: bad.length ? 'missed' : 'met', heard: bad.length ? bad : null });
        break;
      }
      default: results.push({ ...res, status: 'unknown-kind' });
    }
  }
  return results;
}

function report(dir, games) {
  const all = [];
  const perGame = {};
  for (const id of games) {
    const f = `${dir}/${id}.json`;
    if (!existsSync(f)) continue;
    const tape = JSON.parse(readFileSync(f, 'utf8'));
    const r = scoreGame(id, tape);
    all.push(...r.map((x) => ({ ...x, game: id })));
    const scored = r.filter((x) => (x.status === 'met' || x.status === 'missed') && !x.soft);
    perGame[id] = { met: scored.filter((x) => x.status === 'met').length, of: scored.length, notReached: r.length - scored.length, errors: tape.errors };
  }
  // A soft item is reported but does not count toward the score.
  const scored = all.filter((x) => (x.status === 'met' || x.status === 'missed') && !x.soft);
  const perKind = {};
  for (const x of scored) { const k = (perKind[x.kind] ??= { met: 0, of: 0 }); k.of += 1; if (x.status === 'met') k.met += 1; }
  const summary = { list: LIST, listWritten: list.written, met: scored.filter((x) => x.status === 'met').length, of: scored.length, perGame, perKind };
  writeFileSync(`${dir}/score.json`, JSON.stringify({ summary, items: all }, null, 1));
  const md = [`# Acceptance score — ${dir.split('/').pop()}`, '', `**${summary.met} of ${summary.of} items met.**`, '',
    '| game | met | of | not reached | replay errors |', '|---|---|---|---|---|',
    ...Object.entries(perGame).map(([g, v]) => `| ${g} | ${v.met} | ${v.of} | ${v.notReached} | ${v.errors.join('; ') || '—'} |`), '',
    '| kind | met | of |', '|---|---|---|', ...Object.entries(perKind).map(([k, v]) => `| ${k} | ${v.met} | ${v.of} |`), '',
    '## Misses', '', ...all.filter((x) => x.status === 'missed').map((x) => `- **${x.id}** (${x.say}, ${x.move}) — ${x.what}\n  - heard: ${Array.isArray(x.heard) ? x.heard.map((h) => `“${h}”`).join(' ‖ ') || '(nothing)' : `“${x.heard}”`}`)];
  writeFileSync(`${dir}/score.md`, `${md.join('\n')}\n`);
  console.log(`\n${summary.met} of ${summary.of} items met`);
  for (const [g, v] of Object.entries(perGame)) console.log(`  ${g}: ${v.met}/${v.of}${v.notReached ? ` (${v.notReached} not reached)` : ''}${v.errors.length ? ` errors: ${v.errors.join('; ')}` : ''}`);
  for (const [k, v] of Object.entries(perKind)) console.log(`  ${k}: ${v.met}/${v.of}`);
  return summary;
}

// ── main ────────────────────────────────────────────────────────────────────
const games = (opt('games') ?? Object.keys(list.games).join(',')).split(',');
if (opt('score')) {
  const dir = opt('score');
  report(dir, games.filter((g) => existsSync(`${dir}/${g}.json`)).length ? games : readdirSync(dir).filter((f) => /^[a-zA-Z0-9]+\.json$/.test(f) && f !== 'score.json').map((f) => f.replace('.json', '')));
  process.exit(0);
}
const run = opt('run') ?? `run-${Date.now()}`;
const outDir = `audit-reports/acceptance/runs/${run}`;
mkdirSync(outDir, { recursive: true });
const child = await ensureDriver();
for (const id of games) {
  try { await playGame(id, outDir); } catch (e) { console.log(`[${id}] FAILED ${e}`); writeFileSync(`${outDir}/${id}.error.txt`, String(e)); }
}
report(outDir, games);
if (child) { await call('/quit').catch(() => {}); }
process.exit(0);

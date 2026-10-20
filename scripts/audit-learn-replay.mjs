#!/usr/bin/env node
// LEARN REPLAY ON THE STUDENT'S OWN RECORD (David 2026-10-19: "remember to use
// the data when testing … so you dont get a fresh build"). Replays one of his
// real Learn games move for move on /coach/teach with his data drop loaded:
// his moves on the board, the coach's moves DICTATED ("play c5") so the game is
// the one he played. Every spoken line is saved per move, with the measured
// reply time, and at the end the game's own transcript (learnTranscript) is
// read back out of the page — so the audit reads what the coach said, in what
// order, with which seat, and how long the board waited.
//
// Needs a running hand driver pointed at the build under test:
//   AUDIT_SMOKE_URL=http://localhost:5174 node scripts/audit-lib/hand-driver.mjs &
//   node scripts/audit-learn-replay.mjs [gameId] [--from N] [--to N]
// gameId defaults to the newest Learn game in the drop.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';

const DRIVER = `http://localhost:${process.env.HAND_PORT ?? 7777}`;
const DROP = process.env.AUDIT_FIXTURE ?? 'audit-reports/.fixtures/data-drop-david.json';
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? Number(args[i + 1]) : d; };
const FROM = opt('from', 1);
const TO = opt('to', 999);
// `--profile N`: sample the page's main thread through move N's turn and print
// what held it, per 250 ms window from the move (OS-18, 2026-10-20).
const PROFILE = opt('profile', 0);

const k4 = (f) => String(f ?? '').split(' ').slice(0, 4).join(' ');
/** One turn's stages, from the driver's raw record. Engine searches are named
 *  by the position they read: the price (searchmoves on the board before the
 *  move), the mid-turn read (after the student's move), the coach's reply
 *  search, the warm read (after the reply), and the rest. */
function stageSummary(s, fens) {
  const cls = (e) => (e.kind === 'bestmove' ? 'reply' : e.searchmoves ? 'price'
    : k4(e.fen) === k4(fens.after) ? 'mid' : fens.afterReply && k4(e.fen) === k4(fens.afterReply) ? 'warm'
      : k4(e.fen) === k4(fens.before) ? 'before' : 'other');
  const engine = {};
  for (const e of s.engine ?? []) {
    const k = cls(e);
    const g = (engine[k] ??= { n: 0, searchMs: 0, waitMs: 0, doneBy: 0, shared: 0, carried: 0 });
    g.n += 1;
    if (e.outcome === 'shared') g.shared += 1;
    if (e.carried) g.carried += 1;
    if (e.startedAt && e.doneAt) g.searchMs += e.doneAt - e.startedAt;
    if (e.startedAt) g.waitMs += Math.max(0, e.startedAt - e.askedAt);
    if (e.doneAt) g.doneBy = Math.max(g.doneBy, e.doneAt - (s.t0 ?? e.askedAt));
  }
  const price = (s.door ?? []).map((d) => d.price).find(Boolean) ?? null;
  return {
    replyMs: s.replyMs, firstWordMs: s.firstWordMs, engine, price,
    doorMs: (s.door ?? []).reduce((a, d) => a + (d.ms ?? 0), 0), doorAt: (s.door ?? []).map((d) => `${d.kind}@${d.at}`),
    longTaskMs: (s.longTasks ?? []).reduce((a, x) => a + x.ms, 0), longTaskMax: Math.max(0, ...(s.longTasks ?? []).map((x) => x.ms)),
  };
}
function stageLine(x) {
  const e = Object.entries(x.engine).map(([k, g]) => `${k} ${g.n}×${g.shared ? `(${g.shared} shared)` : ''} q${g.waitMs} s${g.searchMs} →+${g.doneBy}`).join(' | ');
  const p = x.price ? `price d${x.price.baseDepth}→${x.price.depthReached}${x.price.deepened ? ' DEEPENED' : ''} ${x.price.searchMs}ms` : 'price —';
  return `reply +${x.replyMs ?? '?'} first word +${x.firstWordMs ?? '?'} | ${p} | engine: ${e || 'none'} | door ${x.doorMs}ms [${x.doorAt.join(' ')}] | long tasks ${x.longTaskMs}ms (max ${x.longTaskMax})`;
}

const call = async (path, body) => {
  const r = await fetch(`${DRIVER}${path}`, body ? { method: 'POST', body } : {});
  return r.json();
};

const drop = JSON.parse(readFileSync(DROP, 'utf8'));
const learnGames = drop.stores.games.filter((g) => g.source === 'coach' && String(g.id).startsWith('teach-'))
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));
// `--sans "e4 c5 …" --seat white` replays a move list that is not a saved
// Learn game (a hand walk's free-played game), on the same record.
const sansArg = (() => { const i = args.indexOf('--sans'); return i >= 0 ? args[i + 1] : null; })();
const seatArg = (() => { const i = args.indexOf('--seat'); return i >= 0 ? args[i + 1] : null; })();
const game = sansArg
  ? { id: 'sans', studentSide: seatArg ?? 'white', pgn: sansArg }
  : args[0] && !args[0].startsWith('--') ? drop.stores.games.find((g) => g.id === args[0]) : learnGames[0];
if (!game) { console.error('no Learn game in the drop'); process.exit(1); }
const seat = game.studentSide ?? 'white';
const c = new Chess(); if (sansArg) { for (const m of sansArg.split(/\s+/).filter(Boolean)) c.move(m); } else c.loadPgn(game.pgn);
const sans = c.history();
console.log(`replaying ${game.id} — ${sans.length} plies, student plays ${seat}`);

await call('/open');
const fx = await call('/fixture');
console.log(`[fixture] ${fx.loaded ? `${fx.wrote} rows / ${fx.stores} stores` : `NOT LOADED (${fx.reason}) — this is not a real-record run`}`);
await call('/open');
if (seat === 'black') await call('/type', 'I want to play black');

const turns = [];
for (let i = 0; i < sans.length; i += 1) {
  const studentPly = (seat === 'white') === (i % 2 === 0);
  if (!studentPly) continue;
  const moveNo = Math.floor(i / 2) + 1;
  if (moveNo < FROM || moveNo > TO) continue;
  const reply = sans[i + 1];
  // A student does not type between moves: let the turn's late wave land
  // before the next dictation, or the typed line cuts it (REPLAY_SETTLE_MS).
  if (turns.length) await new Promise((r) => setTimeout(r, Number(process.env.REPLAY_SETTLE_MS ?? 0)));
  if (reply) await call('/type', `play ${reply}`);
  const profiling = moveNo === PROFILE;
  const movedAt = Date.now();
  if (profiling) await call('/profile?action=start');
  const t = await call(`/turn?san=${encodeURIComponent(sans[i])}`);
  if (profiling) {
    const p = await call(`/profile?action=stop&out=${encodeURIComponent(`audit-reports/learn-replay-${game.id}-move${moveNo}.cpuprofile`)}`);
    console.log(`\n[profile] move ${moveNo} — main thread per 250 ms from the move (raw: ${p.out})`);
    for (const w of p.windows ?? []) if (w.busyMs >= 60) console.log(`  +${w.at - movedAt}ms busy ${w.busyMs}ms  ${w.top.join(' | ')}`);
  }
  const fens = (() => { const b = new Chess(); for (const s of sans.slice(0, i)) b.move(s); const before = b.fen(); b.move(sans[i]); const after = b.fen(); if (reply) b.move(reply); return { before, after, afterReply: reply ? b.fen() : null }; })();
  turns.push({ move: `${moveNo}${seat === 'white' ? '.' : '...'}${sans[i]}`, reply: reply ?? null, replyMs: t.replyMs ?? null, words: t.words ?? null, lines: t.lines ?? t.spoken ?? [], timeline: t.timeline ?? [], onAir: t.onAir ?? [], stages: t.stages ? stageSummary(t.stages, fens) : null, error: t.error ?? null });
  const last = turns[turns.length - 1];
  console.log(`\n${last.move}${reply ? ` → ${reply}` : ''}  (${last.replyMs ?? '?'}ms, ${last.words ?? '?'} words)`);
  for (const l of last.lines) console.log(`   • ${l}`);
  for (const v of last.onAir ?? []) console.log(`   ▶ +${v.ms}ms on air: ${v.text}`);
  if (last.stages) console.log(`   ⏱ ${stageLine(last.stages)}`);
  if (last.error) console.log(`   ✗ ${last.error}`);
}

// THE TURN, BY STAGE (Learn speed, 2026-10-20): student move → board reply →
// first spoken word, and what the engine, the door and the main thread did in
// between — every number read off the app's own record.
{
  const st = turns.map((t) => t.stages).filter(Boolean);
  const mean = (xs) => { const v = xs.filter((x) => typeof x === 'number'); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const pick = (k) => st.map((s) => s[k]);
  console.log(`\n⏱ MEAN over ${st.length} turns: reply +${mean(pick('replyMs'))}ms, first word +${mean(pick('firstWordMs'))}ms`);
  for (const k of ['price', 'mid', 'reply', 'warm', 'before', 'other']) {
    console.log(`   ${k.padEnd(6)} searches ${mean(st.map((s) => s.engine?.[k]?.n ?? 0))}/turn, search ${mean(st.map((s) => s.engine?.[k]?.searchMs))}ms, queued ${mean(st.map((s) => s.engine?.[k]?.waitMs))}ms, done by +${mean(st.map((s) => s.engine?.[k]?.doneBy))}ms`);
  }
  console.log(`   price deepened on ${st.filter((s) => s.price?.deepened).length}/${st.filter((s) => s.price).length} priced turns, price ms ${mean(st.map((s) => s.price?.searchMs))}`);
  console.log(`   door ${mean(pick('doorMs'))}ms/turn; main-thread long tasks ${mean(pick('longTaskMs'))}ms/turn (max task ${Math.max(0, ...st.map((s) => s.longTaskMax ?? 0))}ms)`);
}

const transcript = await call('/js', "const r = indexedDB.open('ChessAcademyDB'); const db = await new Promise((res) => { r.onsuccess = () => res(r.result); }); return await new Promise((res) => { const q = db.transaction('meta').objectStore('meta').get('learn-transcript.current'); q.onsuccess = () => res(q.result ? JSON.parse(q.result.value) : null); });");
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync('audit-reports', { recursive: true });
const out = `audit-reports/learn-replay-${game.id}-${stamp}.json`;
writeFileSync(out, JSON.stringify({ game: game.id, seat, turns, transcript }, null, 2));
console.log(`\n→ ${out}`);

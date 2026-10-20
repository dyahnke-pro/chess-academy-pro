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
  if (reply) await call('/type', `play ${reply}`);
  const t = await call(`/turn?san=${encodeURIComponent(sans[i])}`);
  turns.push({ move: `${moveNo}${seat === 'white' ? '.' : '...'}${sans[i]}`, reply: reply ?? null, replyMs: t.replyMs ?? null, words: t.words ?? null, lines: t.lines ?? t.spoken ?? [], timeline: t.timeline ?? [], error: t.error ?? null });
  const last = turns[turns.length - 1];
  console.log(`\n${last.move}${reply ? ` → ${reply}` : ''}  (${last.replyMs ?? '?'}ms, ${last.words ?? '?'} words)`);
  for (const l of last.lines) console.log(`   • ${l}`);
  if (last.error) console.log(`   ✗ ${last.error}`);
}

const transcript = await call('/js', "const r = indexedDB.open('ChessAcademyDB'); const db = await new Promise((res) => { r.onsuccess = () => res(r.result); }); return await new Promise((res) => { const q = db.transaction('meta').objectStore('meta').get('learn-transcript.current'); q.onsuccess = () => res(q.result ? JSON.parse(q.result.value) : null); });");
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync('audit-reports', { recursive: true });
const out = `audit-reports/learn-replay-${game.id}-${stamp}.json`;
writeFileSync(out, JSON.stringify({ game: game.id, seat, turns, transcript }, null, 2));
console.log(`\n→ ${out}`);

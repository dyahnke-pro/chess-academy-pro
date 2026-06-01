#!/usr/bin/env node
// Pull a player's lichess games into the same <player>-chesscom/*.jsonl corpus
// shape the rest of the pro-rep pipeline reads (so lichess games merge in for
// tree/model extraction). Public games, no auth; rate-limited so we cap.
//   node scripts/pro-repertoire/fetch-lichess.mjs <appPlayer> <lichessUser> [<lichessUser2> ...]
// e.g. node scripts/pro-repertoire/fetch-lichess.mjs samayraina SamayRaina SamayRainaa Samay_Raina
import fs from 'node:fs';
import path from 'node:path';

const APP = process.argv[2];
const USERS = process.argv.slice(3);
if (!APP || USERS.length === 0) { console.error('usage: fetch-lichess.mjs <appPlayer> <lichessUser...>'); process.exit(1); }
const OUT_DIR = path.join('data', 'sources', `${APP}-chesscom`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const RESULT_FOR = (winner, side) => {
  if (!winner) return 'agreed';            // draw
  return winner === side ? 'win' : 'resigned';
};

for (const user of USERS) {
  const url = `https://lichess.org/api/games/user/${user}?max=600&pgnInJson=true&clocks=false&evals=false&opening=false&rated=true`;
  process.stdout.write(`[lichess] ${user} ... `);
  let text;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/x-ndjson' } });
    if (!res.ok) { console.log(`HTTP ${res.status}`); continue; }
    text = await res.text();
  } catch (e) { console.log(`fetch failed: ${e.message}`); continue; }
  const lines = text.split('\n').filter(Boolean);
  const out = [];
  for (const line of lines) {
    let g; try { g = JSON.parse(line); } catch { continue; }
    if (g.variant && g.variant !== 'standard') continue;
    if (!g.pgn) continue;
    const w = g.players?.white?.user?.name || g.players?.white?.aiLevel ? 'AI' : null;
    const b = g.players?.black?.user?.name || null;
    const whiteName = g.players?.white?.user?.name || 'anonymous';
    const blackName = g.players?.black?.user?.name || 'anonymous';
    out.push(JSON.stringify({
      url: `https://lichess.org/${g.id}`,
      pgn: g.pgn,
      end_time: g.lastMoveAt ? Math.floor(g.lastMoveAt / 1000) : (g.createdAt ? Math.floor(g.createdAt / 1000) : null),
      rules: 'chess',
      time_class: g.speed || 'blitz',
      white: { username: whiteName, rating: g.players?.white?.rating ?? 0, result: RESULT_FOR(g.winner, 'white') },
      black: { username: blackName, rating: g.players?.black?.rating ?? 0, result: RESULT_FOR(g.winner, 'black') },
      _source: 'lichess',
    }));
  }
  const file = path.join(OUT_DIR, `lichess-${user.toLowerCase()}.jsonl`);
  fs.writeFileSync(file, out.join('\n') + (out.length ? '\n' : ''));
  console.log(`${out.length} games -> ${path.basename(file)}`);
}

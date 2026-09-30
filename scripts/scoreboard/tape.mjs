// Record what Learn SPEAKS at every ply of real games, through the real page
// (muted), by driving hand-driver.mjs. Opponent moves are dictated to the coach.
//   node scripts/audit-lib/hand-driver.mjs &   (against a dev server)
//   node scripts/scoreboard/tape.mjs <games.json> <out.json> [elo]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const [src, OUT, ELO = '1500'] = process.argv.slice(2);
const H = `http://localhost:${process.env.HAND_PORT ?? 7777}`;
const games = JSON.parse(readFileSync(src, 'utf8'));
const tape = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(path, body) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`${H}/${path}`, { method: body ? 'POST' : 'GET', body, signal: AbortSignal.timeout(120_000) });
      return await r.json();
    } catch (e) { if (a === 2) return { error: String(e) }; await sleep(2000); }
  }
}
const count = (s) => (s.moves ? s.moves.split(' ').length : 0);
for (const g of games) {
  const id = g.id.replace(/^naro-/, '');
  if (tape[id]?.done) continue;
  const sans = g.plies.map((p) => p.san).filter(Boolean);
  const seat = g.white === g.us ? 'white' : 'black';
  const rec = { seat, plies: {}, done: false };
  await call('open'); await call(`rating?elo=${ELO}`); await call('setline?moves=');
  let st = await call('state');
  let i = seat === 'white' ? 0 : 1;
  if (seat === 'black') {
    await call('type', `play ${sans[0]}`);
    for (let t = 0; t < 60 && count(st) < 1; t++) { await sleep(1000); st = await call('state'); }
    if (count(st) < 1) { rec.error = 'coach never played the first move'; tape[id] = rec; writeFileSync(OUT, JSON.stringify(tape)); continue; }
  }
  const limit = Math.min(sans.length, 80);
  while (i < limit) {
    if (i + 1 < limit) await call('type', `play ${sans[i + 1]}`);
    st = await call(`move?san=${encodeURIComponent(sans[i])}`);
    if (st.error) { rec.error = `ply ${i + 1}: ${st.error}`; break; }
    const spoken = [...(st.spoken ?? [])];
    // Every arrow seen on the board while this beat plays (David 2026-09-30:
    // arrows must illustrate what is spoken).
    const arrows = new Set(st.arrows ?? []);
    const want = Math.min(i + 2, limit);
    let quiet = 0;
    for (let t = 0; t < 40; t++) {
      await sleep(1000);
      st = await call('state');
      const fresh = st.spoken ?? [];
      spoken.push(...fresh);
      for (const a of st.arrows ?? []) arrows.add(a);
      quiet = fresh.length ? 0 : quiet + 1;
      if (count(st) >= want && quiet >= 5) break;
    }
    if (count(st) < want) { rec.error = `ply ${i + 2}: coach did not play ${sans[i + 1]} (board ${st.moves})`; rec.plies[i + 1] = [...new Set(spoken)]; break; }
    // THE BOARD MUST BE THE GAME. When the coach plays its own reply instead of
    // the dictated one, every later line is about a board the checker does not
    // have — scored against the recorded game it reads false (run G walk,
    // U8zArIhxato ply 17), and the walk later stalls clicking a move that is no
    // longer legal. Stop at the first divergence; the lines from it are dropped.
    const expect = sans.slice(0, want).join(' ');
    // The coach plays on once the recorded game ends — only the game's own
    // length is compared.
    if ((st.moves ?? '').split(' ').slice(0, want).join(' ') !== expect) { rec.error = `ply ${i + 2}: board diverged from the game (board ${st.moves} / game ${expect})`; break; }
    rec.plies[i + 1] = [...new Set(spoken)]; // 1-based ply of the student's move; the beat covers it and the reply
    (rec.arrows ??= {})[i + 1] = [...arrows];
    i += 2;
  }
  rec.done = !rec.error;
  tape[id] = rec;
  writeFileSync(OUT, JSON.stringify(tape));
  console.log(`${id} ${seat} plies=${Object.keys(rec.plies).length} lines=${Object.values(rec.plies).flat().length} ${rec.error ?? 'ok'}`);
}

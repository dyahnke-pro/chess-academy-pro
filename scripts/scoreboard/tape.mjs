// Record what Learn SPEAKS at every ply of real games, through the real page
// (muted), by driving hand-driver.mjs. Opponent moves are dictated to the coach.
//   node scripts/audit-lib/hand-driver.mjs &   (against a dev server)
//   node scripts/scoreboard/tape.mjs <games.json> <out.json> [elo]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
// QUESTIONS PER GAME (David 2026-09-30: "asking questions on the board to see
// how they hold up… maybe 3-5 per game"). Asked at evenly spread student-to-move
// points, one question KIND per point, rotating, from the board-adapted set in
// QGEN (qgen.cjs — every SAN and square in a question is legal on this board).
const ASK = Number(process.env.QUESTIONS ?? 0);
const QGEN = process.env.QGEN ?? new URL('./qgen.cjs', import.meta.url).pathname;
const [src, OUT, ELO = '1500'] = process.argv.slice(2);
const H = `http://localhost:${process.env.HAND_PORT ?? 7777}`;
const games = JSON.parse(readFileSync(src, 'utf8'));
const tape = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// A HUNG CALL IS A FINDING, NEVER SILENCE (2026-10-01: a walk printed nothing
// for 38 minutes while every driver call timed out — a frozen page looked like a
// slow one). Any call slower than 20s, and every failure, is logged with its ply.
let where = '';
async function call(path, body) {
  for (let a = 0; a < 3; a++) {
    const t0 = Date.now();
    try {
      const r = await fetch(`${H}/${path}`, { method: body ? 'POST' : 'GET', body, signal: AbortSignal.timeout(120_000) });
      const j = await r.json();
      if (Date.now() - t0 > 20_000) console.error(`[tape] SLOW ${path} ${Date.now() - t0}ms at ${where}`);
      return j;
    } catch (e) {
      console.error(`[tape] FAIL ${path} attempt ${a + 1} after ${Date.now() - t0}ms at ${where}: ${String(e).slice(0, 120)}`);
      if (a === 2) return { error: String(e) }; await sleep(2000);
    }
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
  // The engine lines each spoken mistake line was read from, this game only.
  const srcStart = Array.isArray(await call('sources')) ? (await call('sources')).length : 0;
  let st = await call('state');
  let i = seat === 'white' ? 0 : 1;
  if (seat === 'black') {
    await call('type', `play ${sans[0]}`);
    for (let t = 0; t < 60 && count(st) < 1; t++) { await sleep(1000); st = await call('state'); }
    if (count(st) < 1) { rec.error = 'coach never played the first move'; tape[id] = rec; writeFileSync(OUT, JSON.stringify(tape)); continue; }
  }
  const limit = Math.min(sans.length, 80);
  const askAt = new Set(ASK > 0 ? Array.from({ length: ASK }, (_, k) => {
    let p = Math.round(((k + 1) * limit) / (ASK + 1));
    if ((p % 2 === 0) !== (seat === 'white')) p += 1; // student to move
    return p;
  }) : []);
  let asked = 0;
  while (i < limit) {
    where = `${id} ply ${i + 1} (${sans[i]})`;
    console.error(`[tape] ${where}`);
    if (askAt.has(i)) {
      try {
        const mf = `/tmp/claude-0/q-moves-${id}.txt`;
        writeFileSync(mf, sans.join(' '));
        const qs = execFileSync(process.execPath, [QGEN, mf, String(i), seat === 'white' ? 'w' : 'b', String(asked)], { encoding: 'utf8' })
          .split('\n').filter(Boolean).map((l) => l.split('|').slice(1).join('|'))
          .filter((x) => !/^Why is that\b/.test(x)); // needs the previous answer as context
        const q = qs[(asked * 5 + id.length) % qs.length];
        const before = (await call('state')).lastChat ?? '';
        await call('type', q);
        let a = before; let busy = true; let voice = [];
        for (let t = 0; t < 60; t++) {
          await sleep(1000);
          const s2 = await call('state');
          voice.push(...(s2.spoken ?? []));
          a = s2.lastChat ?? ''; busy = s2.inputBusy;
          if (!busy && a !== before) break;
        }
        (rec.questions ??= []).push({ ply: i, moves: sans.slice(0, i).join(' '), q, a: a === before ? '(no answer)' : a, voice: [...new Set(voice)] });
      } catch (e) { (rec.questions ??= []).push({ ply: i, q: '(generator failed)', a: String(e).slice(0, 200) }); }
      asked += 1;
    }
    if (i + 1 < limit) await call('type', `play ${sans[i + 1]}`);
    st = await call(`move?san=${encodeURIComponent(sans[i])}`);
    if (st.error) { rec.error = `ply ${i + 1}: ${st.error}`; break; }
    const spoken = [...(st.spoken ?? [])];
    // Board tags (plan 1.6): the board each spoken fact was graded on.
    const tagged = [...(st.boards ?? [])];
    // Every arrow seen on the board while this beat plays (David 2026-09-30:
    // arrows must illustrate what is spoken).
    const arrows = new Set(st.arrows ?? []);
    const want = Math.min(i + 2, limit);
    let quiet = 0;
    for (let t = 0; t < 40; t++) {
      await sleep(1000);
      st = await call('state');
      if (st.error) break;
      const fresh = st.spoken ?? [];
      spoken.push(...fresh);
      tagged.push(...(st.boards ?? []));
      for (const a of st.arrows ?? []) arrows.add(a);
      quiet = fresh.length ? 0 : quiet + 1;
      if (count(st) >= want && quiet >= 5) break;
    }
    if (st.error) { rec.error = `ply ${i + 2}: the page stopped answering (${st.error.slice(0, 80)}) — a frozen page is a finding`; rec.plies[i + 1] = [...new Set(spoken)]; break; }
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
    if (tagged.length) (rec.boards ??= {})[i + 1] = tagged;
    (rec.arrows ??= {})[i + 1] = [...arrows];
    i += 2;
  }
  const srcAll = await call('sources');
  if (Array.isArray(srcAll)) rec.sources = srcAll.slice(srcStart);
  rec.done = !rec.error;
  tape[id] = rec;
  writeFileSync(OUT, JSON.stringify(tape));
  console.log(`${id} ${seat} plies=${Object.keys(rec.plies).length} lines=${Object.values(rec.plies).flat().length} ${rec.error ?? 'ok'}`);
}

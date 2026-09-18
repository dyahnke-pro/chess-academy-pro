// MEASURE BEFORE YOU BUILD — the three numbers the critical-moment design rests
// on (PLAN.md "THE CRITICAL MOMENT — one computer, two registers").
//
//   1. how many critical moments a real game has, under a PERSONAL tolerance
//      vs the hand-typed rating band  (teach, or nag?)
//   2. how often the MultiPV=3 cap bites (3 of 3 within tolerance, so the true
//      count is unknowable without a wider fan)
//   3. what a real player's cp-loss distribution actually looks like — the
//      first time this app computes a student's own error size
//
// Real games, real engine, no fixtures: games are pulled at a REQUESTED RATING
// BAND through the app's own explorer proxy, so the strong and weak cohorts are
// genuinely different players rather than the same game re-labelled.
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const PROXY = 'https://chess-academy-pro.vercel.app/api';
const DEPTH = Number(process.env.DEPTH ?? 12);
const MULTIPV = Number(process.env.MULTIPV ?? 3);
const PER_BAND = Number(process.env.GAMES ?? 3);
const BANDS = [
  { label: 'amateur ~1200', ratings: '1000,1200' },
  { label: 'strong ~2000', ratings: '2000,2200' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The rating-scaled ladder the app uses TODAY (criticalityScan.ts). */
function bandThresholds(rating) {
  const critical = rating < 1000 ? 200 : rating < 2000 ? 100 : 50;
  return { notable: Math.round(critical * 0.6), critical, onlyMove: Math.max(250, critical * 2) };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[i];
}

// ── the engine ──────────────────────────────────────────────────────────────
function engine() {
  const p = spawn('/usr/games/stockfish');
  let buf = '';
  const waiters = [];
  p.stdout.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      for (const w of [...waiters]) if (w.test(line)) { waiters.splice(waiters.indexOf(w), 1); w.done(line); }
      if (line.startsWith('info ')) p.emit('info', line);
    }
  });
  const send = (s) => p.stdin.write(`${s}\n`);
  const until = (re) => new Promise((res) => waiters.push({ test: (l) => re.test(l), done: res }));
  return { p, send, until, kill: () => p.kill() };
}

/** MultiPV fan at one position, mover-POV centipawns, best-first. */
async function fan(e, fen) {
  const lines = new Map();
  const onInfo = (l) => {
    const mv = /multipv (\d+)/.exec(l);
    const cp = /score cp (-?\d+)/.exec(l);
    const mate = /score mate (-?\d+)/.exec(l);
    const dep = /depth (\d+)/.exec(l);
    if (!mv || !dep || Number(dep[1]) < DEPTH) return;
    if (mate) lines.set(Number(mv[1]), mate[1] > 0 ? 100000 : -100000);
    else if (cp) lines.set(Number(mv[1]), Number(cp[1]));
  };
  e.p.on('info', onInfo);
  e.send('ucinewgame');
  e.send(`position fen ${fen}`);
  e.send(`go depth ${DEPTH}`);
  await e.until(/^bestmove/);
  e.p.off('info', onInfo);
  return [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, cp]) => cp); // already mover-POV
}

// ── real games at a requested rating band ───────────────────────────────────
async function gameIds(ratings, want) {
  const c = new Chess();
  const ids = [];
  for (const san of ['e4', 'e5', 'Nf3', 'Nc6']) {
    if (ids.length >= want) break;
    c.move(san);
    const url = `${PROXY}/lichess-explorer?source=lichess&fen=${encodeURIComponent(c.fen())}&ratings=${ratings}&speeds=blitz,rapid&recentGames=4`;
    const r = await fetch(url).then((x) => x.json()).catch(() => null);
    for (const g of r?.recentGames ?? []) if (g.id && !ids.includes(g.id)) ids.push(g.id);
    await sleep(400);
  }
  return ids.slice(0, want);
}

async function pgnOf(id) {
  const r = await fetch(`${PROXY}/lichess-game-export?id=${id}`).then((x) => x.text()).catch(() => '');
  return r || '';
}

function sansOf(pgn) {
  const body = pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ');
  return body.split(/\s+/).filter((t) => /^[NBRQKO][^\s]*|^[a-h][1-8x=+#][^\s]*|^[a-h]x?[a-h][1-8]/.test(t) && !/^(1-0|0-1|1\/2)/.test(t));
}

// ── the pass ────────────────────────────────────────────────────────────────
async function main() {
  const e = engine();
  e.send('uci'); await e.until(/uciok/);
  e.send(`setoption name MultiPV value ${MULTIPV}`);
  e.send('isready'); await e.until(/readyok/);

  for (const band of BANDS) {
    const ids = await gameIds(band.ratings, PER_BAND);
    console.log(`\n═══ ${band.label}  (${ids.length} real games: ${ids.join(', ')})`);
    const losses = [];          // this cohort's own per-ply cp loss
    const perGame = [];
    for (const id of ids) {
      const pgn = await pgnOf(id);
      const sans = sansOf(pgn);
      if (sans.length < 20) { console.log(`  ${id}: unreadable (${sans.length} moves)`); continue; }
      const c = new Chess();
      const plies = [];
      for (let i = 0; i < Math.min(sans.length, 60); i += 1) {
        const before = c.fen();
        let mv; try { mv = c.move(sans[i]); } catch { break; }
        if (!mv) break;
        if (i % 2 !== 0) continue;                 // one seat only — White
        const f = await fan(e, before);
        if (f.length < 2) continue;
        const played = f[0];                        // best, mover-POV
        // cp loss of the move actually played: re-read from the child position
        const after = await fan(e, c.fen());
        const afterMoverPov = after.length ? -after[0] : null;   // flip: opponent to move
        const loss = afterMoverPov == null ? null : Math.max(0, played - afterMoverPov);
        plies.push({ ply: i + 1, fan: f, gap12: f[0] - f[1], loss });
        if (loss != null) losses.push(loss);
      }
      perGame.push({ id, plies });
      process.stdout.write(`  ${id}: ${plies.length} own-side plies analysed\n`);
    }

    const sorted = [...losses].sort((a, b) => a - b);
    const p50 = percentile(sorted, 50), p75 = percentile(sorted, 75), p90 = percentile(sorted, 90);
    const mean = Math.round(sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1));
    console.log(`\n  CP-LOSS DISTRIBUTION (n=${sorted.length}): p50=${p50}  p75=${p75}  p90=${p90}  mean=${mean}`);
    console.log(`  → mean/median ratio ${(mean / (p50 || 1)).toFixed(1)}x  (why a MEAN is the wrong statistic)`);

    const ratingGuess = Number(band.ratings.split(',')[0]) + 100;
    const bandTh = bandThresholds(ratingGuess);
    for (const [name, tol] of [[`BAND(${ratingGuess})`, bandTh.critical], ['PERSONAL p50', p50 || 1], ['PERSONAL p75', p75 || 1]]) {
      let crit = 0, only = 0, capped = 0, total = 0;
      for (const g of perGame) for (const p of g.plies) {
        total += 1;
        const within = p.fan.filter((cp) => p.fan[0] - cp <= tol).length;
        if (within === 1) only += 1;
        if (p.gap12 >= tol) crit += 1;
        if (within >= MULTIPV) capped += 1;
      }
      const games = perGame.length || 1;
      console.log(`  ${name.padEnd(14)} tol=${String(tol).padStart(4)}cp  critical ${crit} (${(crit / games).toFixed(1)}/game)  only-one-move ${only}  3-of-3 cap ${capped}/${total} (${Math.round(100 * capped / total)}%)`);
    }
  }
  e.kill();
}
main().catch((err) => { console.error('fatal:', err.message); process.exit(1); });

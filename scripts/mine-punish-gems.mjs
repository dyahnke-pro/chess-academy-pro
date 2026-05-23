#!/usr/bin/env node
// Punish-the-inaccuracy miner (WO: docs/plans/2026-05-23-punish-gems-wo.md).
//
// The amateur DB finds the COMMON move the opponent actually plays that scores
// badly for them (a real, faced-at-your-level inaccuracy). The student's best
// reply (masters→amateur) is the punish. Stockfish — when an engine is present
// (CI / STOCKFISH_PATH) — confirms the punish leaves the student clearly
// better and promotes the gem to tier 'confirmed'; in the web sandbox (no
// engine) gems stay tier 'practical' (DB-scored only). NOTHING invented —
// every move comes from the DB; every claim from explorer numbers / the engine.
//
// Run: node scripts/mine-punish-gems.mjs        (writes src/data/punish-gems.json)
import { Chess } from 'chess.js';
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const RATINGS = '2000,2200,2500';
const SPEEDS = 'blitz,rapid,classical';
const FREQ_FLOOR = 0.04;     // opponent move ≥4% common
const MIN_GAMES = 400;       // …with real sample
const EDGE = 0.06;           // ≥6 percentage-pts better student score than main
const ENGINE_CP = 35;        // confirmed = student ≥ +35cp after the punish
const SF_DEPTH = 16;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Stockfish (optional — promotes practical → confirmed) ───────────────
function resolveStockfish() {
  const cands = [process.env.STOCKFISH_PATH, '/usr/games/stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish'].filter(Boolean);
  for (const p of cands) if (existsSync(p)) return p;
  try { return execSync('which stockfish', { encoding: 'utf-8' }).trim() || null; } catch { return null; }
}
const STOCKFISH = resolveStockfish();
function evalFen(bin, fen) {
  return new Promise((resolve) => {
    const sf = spawn(bin); let last = null, done = false, buf = '';
    const fin = (v) => { if (!done) { done = true; try { sf.kill(); } catch {} resolve(v); } };
    sf.stdout.on('data', (d) => {
      buf += d.toString(); const lines = buf.split('\n'); buf = lines.pop() ?? '';
      for (const l of lines) {
        const cp = l.match(/score cp (-?\d+)/), mt = l.match(/score mate (-?\d+)/);
        if (mt) last = parseInt(mt[1], 10) > 0 ? 100000 : -100000; else if (cp) last = parseInt(cp[1], 10);
        if (l.startsWith('bestmove')) fin(last);
      }
    });
    sf.on('error', () => fin(null));
    sf.stdin.write(`uci\nposition fen ${fen}\ngo depth ${SF_DEPTH}\n`);
    setTimeout(() => fin(last), 12000);
  });
}

function toUci(sans) { const c = new Chess(); return sans.map((m) => { const mv = c.move(m); return mv.from + mv.to + (mv.promotion ?? ''); }); }
async function explorer(source, sans) {
  const extra = source === 'lichess' ? `&ratings=${RATINGS}&speeds=${SPEEDS}` : '';
  const r = await fetch(`${PROXY}?source=${source}&play=${toUci(sans).join(',')}${extra}`);
  return r.ok ? r.json() : null;
}
function gamesOf(m) { return m.white + m.draws + m.black; }
function studentScore(m, sc) { const t = gamesOf(m); return t ? ((sc === 'w' ? m.white : m.black) + m.draws / 2) / t : 0; }

async function mine(openingId, studentChar, seed, maxPlies = 14) {
  const gems = []; const line = [...seed];
  for (let depth = 0; depth < maxPlies; depth++) {
    const c = new Chess(); for (const m of line) c.move(m);
    const j = await explorer('lichess', line); await sleep(160);
    if (!j || !(j.moves || []).length) break;
    const total = (j.white || 0) + (j.draws || 0) + (j.black || 0);
    const main = j.moves[0];
    if (c.turn() !== studentChar) {
      const mainS = studentScore(main, studentChar);
      const bad = j.moves
        .map((m) => ({ san: m.san, games: gamesOf(m), pct: gamesOf(m) / total, s: studentScore(m, studentChar) }))
        .filter((m) => m.san !== main.san && m.pct >= FREQ_FLOOR && m.games >= MIN_GAMES && m.s >= mainS + EDGE)
        .sort((a, b) => b.s - a.s)[0];
      if (bad) {
        // PLAY THE PUNISH OUT until the line resolves (David: "play the line
        // out until the capture line is complete, then let the user try it").
        // Follow the masters top move both sides until the sample thins out
        // (past book) or a depth cap — that's the punishing sequence the user
        // Watches, then Learns/Practices/Plays (same WLPP, via PlayableLinePlayer).
        const punishSeq = [];               // moves AFTER the inaccuracy
        const cur = [...line, bad.san];
        let firstPunish = null;
        for (let k = 0; k < 8; k++) {
          const pm = (await explorer('masters', cur)) ?? (await explorer('lichess', cur));
          await sleep(160);
          const top = pm?.moves?.[0];
          if (!top || gamesOf(top) < 15) break;   // past book / line resolved
          punishSeq.push(top.san); cur.push(top.san);
          if (k === 0) firstPunish = top.san;
        }
        let engineCp = null, tier = 'practical';
        if (firstPunish && STOCKFISH) {
          const pc = new Chess(); for (const m of cur) pc.move(m);  // end of the played-out line
          const cp = await evalFen(STOCKFISH, pc.fen());
          if (cp !== null) { engineCp = studentChar === pc.turn() ? cp : -cp; tier = engineCp >= ENGINE_CP ? 'confirmed' : 'weak'; }
        }
        if (firstPunish && (!STOCKFISH || tier !== 'weak')) {
          // playLine = full sequence from move 1 → feeds PlayableLinePlayer (WLPP).
          const playLine = [...line, bad.san, ...punishSeq];
          gems.push({
            openingId, lineMoves: line.join(' '), inaccuracy: bad.san,
            freqPct: +(bad.pct * 100).toFixed(1), games: bad.games,
            practicalScore: +(bad.s * 100).toFixed(0), mainMove: main.san,
            punish: firstPunish, punishSeq, playLine: playLine.join(' '),
            engineCp, tier,
            why: `At your level White plays ${bad.san} here in ${(bad.pct * 100).toFixed(0)}% of games, but Black scores ${(bad.s * 100).toFixed(0)}% against it. Punish with ${firstPunish} — ${engineCp !== null ? `Black is clearly better (${engineCp >= 0 ? '+' : ''}${(engineCp / 100).toFixed(1)})` : 'Black is comfortably on top in practice'}.`,
          });
        }
      }
    }
    line.push(main.san);
  }
  return gems;
}

(async () => {
  console.log(`[mine] stockfish: ${STOCKFISH ?? 'NONE (sandbox → practical tier)'}`);
  const gems = await mine('caro-kann', 'b', ['e4', 'c6']);
  await writeFile('src/data/punish-gems.json', JSON.stringify(gems, null, 2) + '\n');
  console.log(`[mine] wrote ${gems.length} gems → src/data/punish-gems.json`);
  for (const g of gems) console.log(`  ${g.lineMoves} | ${g.inaccuracy} (${g.freqPct}%) → ${g.punish} [${g.tier}${g.engineCp !== null ? ` ${g.engineCp}cp` : ''}]`);
})();

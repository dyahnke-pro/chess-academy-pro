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
import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const RATINGS = '2000,2200,2500';
const SPEEDS = 'blitz,rapid,classical';
const FREQ_FLOOR = 0.04;     // opponent move ≥4% common
const MIN_GAMES = 400;       // …with real sample
const EDGE = 0.06;           // ≥6 percentage-pts better student score than main
const ENGINE_CP = 35;        // confirmed = student ≥ +35cp after the punish
const SF_DEPTH = 16;
const MIN_SPINE = 6;         // opening spine must DB-anchor ≥6 plies (G3)

// G3 DB-anchor — mirror of src/utils/dbAnchor.ts. A gem's spine must match a
// real openings-lichess.json move-prefix of ≥MIN_SPINE plies, or it isn't
// grounded (an explorer transposition in a non-DB move order doesn't count).
let DB_PREFIXES = null;
function dbPrefixSet() {
  if (DB_PREFIXES) return DB_PREFIXES;
  const set = new Set();
  const db = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf-8'));
  for (const e of db) {
    if (!e?.pgn) continue;
    const moves = e.pgn.split(' ');
    for (let k = 1; k <= moves.length; k++) set.add(moves.slice(0, k).join(' '));
  }
  DB_PREFIXES = set;
  return set;
}
function longestAnchorPly(sans) {
  const set = dbPrefixSet();
  const c = new Chess();
  const clean = [];
  for (const m of sans) { try { clean.push(c.move(m).san); } catch { break; } }
  for (let k = clean.length; k >= 1; k--) if (set.has(clean.slice(0, k).join(' '))) return k;
  return 0;
}
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
        // The opening spine must DB-ANCHOR ≥6 plies (G3) — not merely BE 6
        // plies long. A transposition the explorer reaches in a different
        // move order than the DB stores (e.g. Caro Two Knights via Nf3-first
        // instead of the DB's Nc3-first) fails this, exactly like the gate.
        if (firstPunish && longestAnchorPly(line) >= MIN_SPINE && (!STOCKFISH || tier !== 'weak')) {
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

// The masterclass openings to mine. baseSeed = the opening's canonical first
// moves; studentChar = the side the student plays (matches repertoire.json
// `color`). Per-variation seeds are derived from repertoire.json below so the
// miner walks EACH variation's line (not just the amateur trunk) — that's how
// variation tabs get their own gems. Every gem is DB-anchored by the gate
// regardless — a wrong seed just yields fewer gems, never invents one.
// Override the set with OPENINGS=caro-kann,ruy-lopez to mine a subset.
const OPENING_SEEDS = {
  'caro-kann':    { studentChar: 'b', baseSeed: ['e4', 'c6'] },
  'ruy-lopez':    { studentChar: 'w', baseSeed: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  'pirc-defence': { studentChar: 'b', baseSeed: ['e4', 'd6'] },
  'vienna-game':  { studentChar: 'w', baseSeed: ['e4', 'e5', 'Nc3'] },
};
const SEED_PLIES = 6; // how deep each variation seed goes before the miner walks

function loadRepertoire() {
  try {
    const raw = JSON.parse(readFileSync('src/data/repertoire.json', 'utf-8'));
    return Array.isArray(raw) ? raw : raw.openings ?? [];
  } catch { return []; }
}
function variationSeeds(opening) {
  // Each variation's first SEED_PLIES SAN moves → a seed the miner walks from.
  const seeds = [];
  for (const v of opening?.variations ?? []) {
    const moves = v.pgn.replace(/\d+\.(\.\.)?/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (moves.length >= SEED_PLIES) seeds.push(moves.slice(0, SEED_PLIES));
  }
  return seeds;
}
const seedKey = (s) => s.join(' ');

(async () => {
  console.log(`[mine] stockfish: ${STOCKFISH ?? 'NONE (sandbox → practical tier)'}`);
  const repertoire = loadRepertoire();
  const only = (process.env.OPENINGS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ids = only.length ? only : Object.keys(OPENING_SEEDS);
  const all = [];
  const seen = new Set(); // dedupe gems across overlapping seeds
  for (const id of ids) {
    const cfg = OPENING_SEEDS[id];
    if (!cfg) { console.warn(`[mine] no seed config for "${id}" — skipping`); continue; }
    const opening = repertoire.find((o) => o.id === id);
    const seeds = [cfg.baseSeed, ...variationSeeds(opening)];
    const uniqueSeeds = [...new Map(seeds.map((s) => [seedKey(s), s])).values()];
    console.log(`[mine] ${id} (student=${cfg.studentChar}) — ${uniqueSeeds.length} seeds`);
    for (const seed of uniqueSeeds) {
      const gems = await mine(id, cfg.studentChar, seed);
      for (const g of gems) {
        const key = `${g.openingId}|${g.lineMoves}|${g.inaccuracy}`;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(g);
      }
      if (gems.length) console.log(`[mine]   seed "${seedKey(seed)}" → ${gems.length}`);
    }
  }
  await writeFile('src/data/punish-gems.json', JSON.stringify(all, null, 2) + '\n');
  console.log(`[mine] wrote ${all.length} gems → src/data/punish-gems.json`);
  for (const g of all) console.log(`  ${g.openingId} | ${g.lineMoves} | ${g.inaccuracy} (${g.freqPct}%) → ${g.punish} [${g.tier}${g.engineCp !== null ? ` ${g.engineCp}cp` : ''}]`);
})();

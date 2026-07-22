/**
 * REVIEW FLEET — NEW GAMES (David 2026-07-22: "a full audit again of review on
 * NEW games that have never been audited before... new edge cases").
 *
 * Sources REAL master games at runtime from the app's own proxies (G3 — never
 * a PGN from memory): the masters explorer picks the games, the game-export
 * proxy delivers the full PGN, chess.js verifies legality before a game is
 * allowed into the fleet. Each game then runs the LOCKED real-game experience
 * audit (scripts/audit-review-real-game.mjs) end-to-end against prod.
 *
 * On top of the per-game verdicts, this wrapper aggregates PASS-FIRING
 * STATISTICS — the grounding data for the claim that engine lines are
 * narrated as threats/plans/punishments (David: "Do we have grounding
 * statistical data for this claim?"): how often each computed pass actually
 * fired across the fleet, counted from the per-ply narration lines the child
 * audit logs.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-review-fleet-newgames.mjs
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';

// Diverse profiles: both colors, wins AND losses AND a draw, different
// openings, different game lengths. The explorer decides WHICH games —
// we only declare the opening seed + what result the student side needs.
const SEEDS = [
  { name: 'Najdorf (student=White, win)',      play: 'e2e4,c7c5,g1f3,d7d6,d2d4,c5d4,f3d4,g8f6,b1c3,a7a6', student: 'white', want: 'white' },
  { name: 'Caro-Kann (student=Black, win)',    play: 'e2e4,c7c6,d2d4,d7d5', student: 'black', want: 'black' },
  { name: 'QGD (student=Black, LOSS)',         play: 'd2d4,d7d5,c2c4,e7e6,b1c3,g8f6', student: 'black', want: 'white' },
  { name: "King's Indian (student=White, LOSS)", play: 'd2d4,g8f6,c2c4,g7g6,b1c3,f8g7,e2e4,d7d6', student: 'white', want: 'black' },
  { name: 'Ruy Lopez (student=White, DRAW)',   play: 'e2e4,e7e5,g1f3,b8c6,f1b5,a7a6', student: 'white', want: 'draw' },
  { name: 'English (student=Black, win)',      play: 'c2c4,e7e5,b1c3,g8f6', student: 'black', want: 'black' },
];

const seen = new Set();

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

/** Strip headers/comments/NAGs from an exported PGN → bare movetext + result. */
function movetextOf(raw) {
  const noHeaders = raw.replace(/^\[.*\]\s*$/gm, '').trim();
  const clean = noHeaders
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean;
}

/** Legality gate (G3): every SAN must replay. Returns the CANONICAL
 *  chess.js-regenerated movetext (clean numbering, no annotation residue —
 *  the same string the app AND the child audit both parse) + ply count,
 *  or null on any illegal token. */
function verifyLegal(movetext) {
  const sans = movetext.replace(/\d+\.(\.\.)?\s*/g, '').replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim()
    .split(/\s+/).filter((t) => t && !/^\.+$/.test(t));
  const c = new Chess();
  for (const s of sans) {
    try { c.move(s.replace(/[?!]+$/, '')); } catch { return null; }
  }
  return { plyCount: sans.length, canonical: c.pgn() };
}

async function pickGame(seed) {
  const ex = await fetchJson(`${BASE}/api/lichess-explorer?source=masters&play=${seed.play}`);
  const candidates = (ex.topGames || []).filter((g) => {
    const res = g.winner === 'white' ? 'white' : g.winner === 'black' ? 'black' : 'draw';
    return res === seed.want && g.id && !seen.has(g.id);
  });
  for (const g of candidates) {
    try {
      const raw = await fetchText(`${BASE}/api/lichess-game-export?id=${g.id}`);
      const legal = verifyLegal(movetextOf(raw));
      if (!legal || legal.plyCount < 16) continue; // too short / illegal — next candidate
      seen.add(g.id);
      const result = seed.want === 'draw' ? '1/2-1/2' : seed.want === 'white' ? '1-0' : '0-1';
      return { id: g.id, players: `${g.white?.name ?? '?'} vs ${g.black?.name ?? '?'}`, movetext: legal.canonical, plyCount: legal.plyCount, result };
    } catch { /* next candidate */ }
  }
  return null;
}

function runChild(env, logPath) {
  return new Promise((resolve) => {
    let out = '';
    const child = spawn(process.execPath, ['scripts/audit-review-real-game.mjs'], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const cap = (b) => { out += b.toString(); };
    child.stdout.on('data', cap);
    child.stderr.on('data', cap);
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* already gone */ } }, 15 * 60 * 1000);
    child.on('close', (code) => {
      clearTimeout(t);
      writeFileSync(logPath, out);
      resolve({ code, out });
    });
  });
}

// The computed-pass markers — each maps to one grounded narration pass.
const MARKERS = {
  'threat: student static call-out':        /you're now threatening/g,
  'threat: opponent call-out (identify)':   /Careful — their move threatens/g,
  'threat: recognition taught':             /knight's-hop|standing invitation|flight square/g,
  'threat: prevention taught':              /The answer:/g,
  'threat: engine CONFIRMS static':         /The engine confirms it/g,
  'threat: engine REPLACES static':         /the real threat here, per the engine/g,
  'threat: deep FOR student (2-5 moves)':   /deeper threat brewing/g,
  'threat: deep AGAINST student (2-5 mv)':  /Watch what they're building/g,
  'better-line why (engine line + whys)':   /was better — the line runs/g,
  'punishment projection':                  /how it gets punished/g,
  'plan played out (plan-line)':            /the plan runs/g,
  'consequence projection':                 /Follow it up and it goes/g,
};

const iso = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = `audit-reports/review-fleet-newgames-${iso}`;
mkdirSync(outDir, { recursive: true });

const results = [];
const totals = Object.fromEntries(Object.keys(MARKERS).map((k) => [k, 0]));

for (let i = 0; i < SEEDS.length; i++) {
  const seed = SEEDS[i];
  console.log(`\n━━━ Game ${i + 1}/${SEEDS.length}: ${seed.name} ━━━`);
  let game = null;
  try { game = await pickGame(seed); } catch (e) { console.log(`  source error: ${e.message}`); }
  if (!game) { console.log('  ✗ no legal candidate game — SKIPPED (reported honestly)'); results.push({ seed: seed.name, verdict: 'NO-GAME' }); continue; }
  console.log(`  ${game.players} (${game.id}, ${game.plyCount} plies, ${game.result})`);
  const logPath = `${outDir}/game-${i + 1}.log`;
  writeFileSync(`${outDir}/game-${i + 1}.json`, JSON.stringify({ seed: seed.name, ...game }, null, 2));
  const { out } = await runChild({
    AUDIT_GID: `fleet-new-${iso}-${i + 1}`,
    AUDIT_PGN: `${game.movetext.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '')} ${game.result}`.trim(),
    AUDIT_STUDENT: seed.student,
    AUDIT_RESULT: game.result,
  }, logPath);
  const meets = /VERDICT: ✅ MEETS STANDARD/.test(out);
  const fails = [...out.matchAll(/❌ FAIL\s+(\S+)/g)].map((m) => m[1]);
  const counts = {};
  for (const [k, re] of Object.entries(MARKERS)) {
    const n = (out.match(re) || []).length;
    counts[k] = n; totals[k] += n;
  }
  results.push({ seed: seed.name, game: game.players, id: game.id, plies: game.plyCount, verdict: meets ? 'MEETS' : 'FAIL', fails, counts });
  console.log(`  ${meets ? '✅ MEETS' : `❌ FAIL (${fails.join(', ') || 'see log'})`}  → ${logPath}`);
}

console.log('\n═════ FLEET VERDICTS ═════');
for (const r of results) console.log(`  ${r.verdict.padEnd(7)} ${r.seed}${r.game ? ` — ${r.game}` : ''}${r.fails?.length ? ` [${r.fails.join(', ')}]` : ''}`);

console.log('\n═════ PASS-FIRING STATISTICS (the grounding data) ═════');
for (const [k, n] of Object.entries(totals)) console.log(`  ${String(n).padStart(3)}×  ${k}`);

writeFileSync(`${outDir}/report.json`, JSON.stringify({ results, totals }, null, 2));
console.log(`\nreport: ${outDir}/report.json`);
const allMeet = results.every((r) => r.verdict === 'MEETS');
console.log(`\n===== NEW-GAMES FLEET: ${allMeet ? '✅ ALL MEET' : '❌ NOT ALL MEET'} =====`);
process.exit(allMeet ? 0 : 1);

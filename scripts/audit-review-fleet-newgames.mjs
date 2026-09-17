/**
 * REVIEW FLEET — NEW GAMES (David 2026-07-22: "a full audit again of review on
 * NEW games that have never been audited before... new edge cases").
 *
 * Sources REAL master games at runtime from the app's own proxies (G3 — never
 * a PGN from memory): the masters explorer picks the games, the game-export
 * proxy delivers the full PGN, chess.js verifies legality before a game is
 * allowed into the fleet. Each game then runs the LOCKED real-game experience
 * audit (scripts/audit-review-overhaul-prod.mjs) end-to-end against prod.
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
// The picker moved to audit-lib so the live review audit can rotate games too —
// one copy, because two would drift the moment one grew a bound or a seed.
import { SEEDS, pickRealGame } from './audit-lib/source-real-game.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';

const seen = new Set();

function runChild(env, logPath) {
  return new Promise((resolve) => {
    let out = '';
    // ⚠️ THIS USED TO SPAWN `audit-review-real-game.mjs`, WHICH HAS BEEN STALE
    // SINCE THE 2026-09-05 REVIEW OVERHAUL — its own header says the ply readout
    // moved and it reads "Ply 0/0", every rubric row false-fails, and it encodes
    // R2, which the 2026-09-15 need standard RETIRED. So this wrapper faithfully
    // sourced a fresh real game for every seed and then fed it to a dead script:
    // the rotation never reached a working audit, and every review run anyone
    // actually read was the one hardcoded Alapin fixture (David 2026-09-17: "I
    // want new games audited each time... It doesn't tell us anything new").
    const child = spawn(process.execPath, ['scripts/audit-review-overhaul-prod.mjs'], {
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
  try { game = await pickRealGame(BASE, seed, seen); } catch (e) { console.log(`  source error: ${e.message}`); }
  if (!game) { console.log('  ✗ no legal candidate game — SKIPPED (reported honestly)'); results.push({ seed: seed.name, verdict: 'NO-GAME' }); continue; }
  console.log(`  ${game.players} (${game.id}, ${game.plyCount} plies, ${game.result})`);
  const logPath = `${outDir}/game-${i + 1}.log`;
  writeFileSync(`${outDir}/game-${i + 1}.json`, JSON.stringify({ seed: seed.name, ...game }, null, 2));
  const { out } = await runChild({
    AUDIT_GID: `fleet-new-${iso}-${i + 1}`,
    AUDIT_PGN: `${game.movetext.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '')} ${game.result}`.trim(),
    AUDIT_STUDENT: seed.student,
    AUDIT_RESULT: game.result,
    AUDIT_WHITE: game.white ?? '?',
    AUDIT_BLACK: game.black ?? '?',
    AUDIT_SEED_NAME: seed.name,
    AUDIT_SOURCE_ID: game.id,   // so the child can print a REPRODUCIBLE command
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

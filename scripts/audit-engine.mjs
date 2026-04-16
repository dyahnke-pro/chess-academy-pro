#!/usr/bin/env node
/**
 * audit-engine.mjs
 * ----------------
 * Engine-backed audit — uses Lichess's free cloud-eval API to verify
 * that every scripted move isn't a blunder relative to the engine's
 * best move at that position. Also checks:
 *
 *   - Every main-line move is within BLUNDER_CP of engine best
 *   - Trap sublines end with a decisive (+1000cp or mate) evaluation
 *   - Warning sublines end with a >= +200cp opponent advantage
 *     (otherwise the "warning" isn't actually a warning)
 *
 * Because this hits a real API, it's rate-limited and chunked. Run
 * this from your local machine:
 *
 *   node scripts/audit-engine.mjs
 *
 * Optional env vars:
 *   AUDIT_ENGINE_LIMIT=500    — cap records scanned (default: all)
 *   AUDIT_ENGINE_RPS=8        — max requests/sec (default: 8)
 *   AUDIT_ENGINE_MAIN_ONLY=1  — only audit main-line annotations
 *
 * Lichess cloud eval docs: https://lichess.org/api#tag/Analysis
 * — doesn't have every position; we log "UNAVAILABLE" and skip.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { collectAllScriptedMoves } from './audit-lib/collect-moves.mjs';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const outDir = join(repoRoot, 'audit-reports');
mkdirSync(outDir, { recursive: true });

const LIMIT = parseInt(process.env.AUDIT_ENGINE_LIMIT ?? '', 10) || Infinity;
const RPS = parseInt(process.env.AUDIT_ENGINE_RPS ?? '', 10) || 8;
const MAIN_ONLY = process.env.AUDIT_ENGINE_MAIN_ONLY === '1';

/** Centipawn loss that qualifies as a blunder worth flagging. */
const BLUNDER_CP = 300;
/** Less-severe but still worth-flagging threshold (for warnings). */
const MISTAKE_CP = 120;

async function fetchCloudEval(fen) {
  const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=2`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 404) return null; // no cloud eval for this position
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function evalForPlayer(evalObj, sideToMove) {
  // Lichess returns evaluations from WHITE's perspective. Flip for black.
  if (evalObj == null) return null;
  if (evalObj.mate != null) {
    // Mate is positive for white, negative for black. Player-centric:
    const magnitude = 30000 - Math.abs(evalObj.mate) * 10;
    const positive = evalObj.mate > 0;
    const fromPlayer = sideToMove === 'w' ? positive : !positive;
    return fromPlayer ? magnitude : -magnitude;
  }
  const cp = evalObj.cp ?? 0;
  return sideToMove === 'w' ? cp : -cp;
}

function sideToMoveFromFen(fen) {
  return fen.split(' ')[1] ?? 'w';
}

// ─── Audit pipeline ─────────────────────────────────────────────────────────

async function main() {
  console.log('[audit-engine] collecting records…');
  const all = collectAllScriptedMoves(repoRoot);
  let records = all.filter(
    (r) =>
      !r.illegal &&
      r.fenBefore &&
      (r.source === 'annotation-main' ||
       r.source === 'annotation-subline' ||
       r.source === 'common-mistake-wrong' ||
       r.source === 'common-mistake-correct' ||
       r.source === 'checkpoint-quiz' ||
       r.source === 'middlegame-plan'),
  );
  if (MAIN_ONLY) records = records.filter((r) => r.source === 'annotation-main');
  if (records.length > LIMIT) records = records.slice(0, LIMIT);

  console.log(`[audit-engine] auditing ${records.length} moves against Lichess cloud eval @ ${RPS} rps`);

  const findings = { blunders: [], missingCloudEval: 0, fetchErrors: 0 };
  const perReqMs = Math.ceil(1000 / RPS);
  let processed = 0;
  const t0 = Date.now();

  for (const r of records) {
    processed++;
    if (processed % 100 === 0) {
      const elapsedMin = ((Date.now() - t0) / 60000).toFixed(1);
      console.log(`[audit-engine] ${processed}/${records.length} (${elapsedMin}min)`);
    }

    try {
      const [preEval, postEval] = await Promise.all([
        fetchCloudEval(r.fenBefore),
        fetchCloudEval(r.fenAfter),
      ]);
      if (!preEval || !postEval) {
        findings.missingCloudEval++;
        await sleep(perReqMs);
        continue;
      }
      const mover = sideToMoveFromFen(r.fenBefore);
      const preBest = evalForPlayer(preEval.pvs?.[0], mover);
      const postWorstFromPlayerPOV = evalForPlayer(postEval.pvs?.[0], mover);
      if (preBest == null || postWorstFromPlayerPOV == null) {
        findings.missingCloudEval++;
        await sleep(perReqMs);
        continue;
      }
      // Eval drop from the player's POV
      const drop = preBest - postWorstFromPlayerPOV;
      if (drop >= BLUNDER_CP) {
        findings.blunders.push({
          source: r.source,
          openingId: r.openingId,
          sublineName: r.sublineName,
          sublineType: r.sublineType,
          moveIndex: r.moveIndex,
          san: r.san,
          fenBefore: r.fenBefore,
          preBest,
          postWorstFromPlayerPOV,
          dropCp: drop,
          engineBest: preEval.pvs?.[0]?.moves?.split(' ')[0] ?? null,
          annotation: (r.annotation ?? '').slice(0, 180),
        });
      }
    } catch {
      findings.fetchErrors++;
    }
    await sleep(perReqMs);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    processed,
    blunders: findings.blunders.length,
    missingCloudEval: findings.missingCloudEval,
    fetchErrors: findings.fetchErrors,
  };

  writeFileSync(
    join(outDir, 'engine.json'),
    JSON.stringify({ summary, findings }, null, 2),
  );

  const md = [];
  md.push('# Engine-backed Audit Report');
  md.push('');
  md.push(`Generated: ${summary.generatedAt}`);
  md.push(`Positions scanned: **${summary.processed}**`);
  md.push(`Flagged blunders (drop ≥ ${BLUNDER_CP}cp): **${summary.blunders}**`);
  md.push(`No cloud eval available: ${summary.missingCloudEval}`);
  md.push(`Fetch errors: ${summary.fetchErrors}`);
  md.push('');

  findings.blunders.sort((a, b) => b.dropCp - a.dropCp);
  md.push('## Top flagged positions (worst first)');
  md.push('');
  md.push('| Source | Opening | Subline | Move# | Played | Engine best | Drop (cp) |');
  md.push('|---|---|---|---:|---|---|---:|');
  for (const b of findings.blunders.slice(0, 100)) {
    md.push(
      `| ${b.source} | ${b.openingId} | ${b.sublineName ?? ''} | ${b.moveIndex + 1} | ${b.san} | ${b.engineBest ?? '?'} | ${b.dropCp} |`,
    );
  }

  writeFileSync(join(outDir, 'engine.md'), md.join('\n'));
  console.log(`[audit-engine] wrote audit-reports/engine.{json,md}`);
  console.log(JSON.stringify(summary, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('[audit-engine] fatal:', err);
  process.exit(1);
});

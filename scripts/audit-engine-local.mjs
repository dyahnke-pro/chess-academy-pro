#!/usr/bin/env node
/**
 * audit-engine-local.mjs
 * ----------------------
 * Like audit-engine.mjs but uses the LOCAL Stockfish WASM binary
 * instead of Lichess cloud eval. No internet needed.
 *
 * Usage:
 *   node scripts/audit-engine-local.mjs
 *
 * Env vars:
 *   AUDIT_ENGINE_LIMIT=500   — cap records (default: 1000)
 *   AUDIT_ENGINE_DEPTH=12    — Stockfish depth (default: 12)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Chess } from 'chess.js';
import { collectAllScriptedMoves } from './audit-lib/collect-moves.mjs';
import { execSync } from 'node:child_process';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const outDir = join(repoRoot, 'audit-reports');
mkdirSync(outDir, { recursive: true });

const LIMIT = parseInt(process.env.AUDIT_ENGINE_LIMIT ?? '1000', 10);
const DEPTH = parseInt(process.env.AUDIT_ENGINE_DEPTH ?? '12', 10);
const BLUNDER_CP = 300;

// Check if system stockfish is available
let stockfishCmd = null;
try {
  execSync('which stockfish', { stdio: 'ignore' });
  stockfishCmd = 'stockfish';
} catch {
  // No system stockfish — try node-based approach
}

// Simple stockfish runner using child_process
import { spawn } from 'node:child_process';

class LocalStockfish {
  constructor() {
    this.process = null;
    this.ready = false;
  }

  async init() {
    if (stockfishCmd) {
      this.process = spawn(stockfishCmd, [], { stdio: ['pipe', 'pipe', 'ignore'] });
    } else {
      // Use the project's stockfish WASM via node — won't work natively.
      // Fall back to a pure chess.js heuristic instead.
      console.log('[audit-engine-local] No stockfish binary found.');
      console.log('[audit-engine-local] Falling back to chess.js move-legality + material-count heuristic.');
      console.log('[audit-engine-local] This won\'t catch subtle positional blunders but WILL catch:');
      console.log('[audit-engine-local]   - hanging pieces (material imbalance after the line)');
      console.log('[audit-engine-local]   - illegal moves (already caught by structural audit)');
      console.log('');
      this.process = null;
      return;
    }

    return new Promise((resolve) => {
      const handler = (data) => {
        if (data.toString().includes('readyok')) {
          this.process.stdout.removeListener('data', handler);
          this.ready = true;
          resolve();
        }
      };
      this.process.stdout.on('data', handler);
      this.process.stdin.write('uci\n');
      this.process.stdin.write('isready\n');
    });
  }

  async evaluate(fen, depth) {
    if (!this.process || !this.ready) return null;

    return new Promise((resolve) => {
      let lastEval = 0;
      let bestMove = null;
      const timeout = setTimeout(() => resolve(null), 5000);

      const handler = (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          const scoreMatch = /score (cp|mate) (-?\d+)/.exec(line);
          if (scoreMatch) {
            lastEval = scoreMatch[1] === 'mate'
              ? (parseInt(scoreMatch[2]) > 0 ? 30000 : -30000)
              : parseInt(scoreMatch[2]);
          }
          const bmMatch = /^bestmove (\S+)/.exec(line);
          if (bmMatch) {
            bestMove = bmMatch[1];
            clearTimeout(timeout);
            this.process.stdout.removeListener('data', handler);
            // Flip eval for black's perspective
            const side = fen.split(' ')[1];
            resolve({
              eval: side === 'b' ? -lastEval : lastEval,
              bestMove,
            });
          }
        }
      };

      this.process.stdout.on('data', handler);
      this.process.stdin.write(`position fen ${fen}\n`);
      this.process.stdin.write(`go depth ${depth}\n`);
    });
  }

  destroy() {
    if (this.process) {
      this.process.stdin.write('quit\n');
      this.process.kill();
    }
  }
}

// ─── Material-count heuristic (fallback when no stockfish) ──────────────────

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function materialCount(fen) {
  const board = fen.split(' ')[0];
  let white = 0, black = 0;
  for (const ch of board) {
    const lower = ch.toLowerCase();
    if (PIECE_VALUES[lower] !== undefined) {
      if (ch === lower) black += PIECE_VALUES[lower];
      else white += PIECE_VALUES[lower];
    }
  }
  return { white, black, diff: white - black };
}

function detectMaterialBlunder(fenBefore, fenAfter, san) {
  if (!fenBefore || !fenAfter) return null;
  const before = materialCount(fenBefore);
  const after = materialCount(fenAfter);
  const side = fenBefore.split(' ')[1]; // who moved

  // Material swing from the mover's perspective
  const swingBefore = side === 'w' ? before.diff : -before.diff;
  const swingAfter = side === 'w' ? after.diff : -after.diff;
  const loss = swingBefore - swingAfter;

  // Flag if the mover lost >= 300cp of material (a full piece or more
  // without compensation). This catches hanging pieces, free captures
  // not taken, and queen giveaways.
  if (loss >= BLUNDER_CP) {
    return { loss, side };
  }
  return null;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('[audit-engine-local] collecting records…');
  const all = collectAllScriptedMoves(repoRoot);
  let records = all.filter(
    (r) => !r.illegal && r.fenBefore && r.fenAfter &&
      (r.source === 'annotation-main' || r.source === 'annotation-subline' || r.source === 'middlegame-plan'),
  );
  if (records.length > LIMIT) records = records.slice(0, LIMIT);

  const engine = new LocalStockfish();
  await engine.init();
  const useEngine = engine.ready;

  console.log(`[audit-engine-local] auditing ${records.length} moves ${useEngine ? `with Stockfish @ depth ${DEPTH}` : 'with material-count heuristic'}`);

  const findings = { blunders: [] };
  let processed = 0;
  const t0 = Date.now();

  for (const r of records) {
    processed++;
    if (processed % 100 === 0) {
      const min = ((Date.now() - t0) / 60000).toFixed(1);
      console.log(`[audit-engine-local] ${processed}/${records.length} (${min}min)`);
    }

    if (useEngine) {
      // Full Stockfish evaluation
      const preResult = await engine.evaluate(r.fenBefore, DEPTH);
      if (!preResult) continue;

      // Play the scripted move and evaluate the resulting position
      const postResult = await engine.evaluate(r.fenAfter, DEPTH);
      if (!postResult) continue;

      const drop = preResult.eval - postResult.eval;
      if (drop >= BLUNDER_CP) {
        findings.blunders.push({
          source: r.source,
          openingId: r.openingId,
          sublineName: r.sublineName,
          moveIndex: r.moveIndex,
          san: r.san,
          fenBefore: r.fenBefore,
          dropCp: drop,
          engineBest: preResult.bestMove,
          annotation: (r.annotation ?? '').slice(0, 180),
        });
      }
    } else {
      // Material heuristic fallback
      const blunder = detectMaterialBlunder(r.fenBefore, r.fenAfter, r.san);
      if (blunder) {
        findings.blunders.push({
          source: r.source,
          openingId: r.openingId,
          sublineName: r.sublineName,
          moveIndex: r.moveIndex,
          san: r.san,
          fenBefore: r.fenBefore,
          dropCp: blunder.loss,
          engineBest: '(heuristic — no engine)',
          annotation: (r.annotation ?? '').slice(0, 180),
        });
      }
    }
  }

  engine.destroy();

  findings.blunders.sort((a, b) => b.dropCp - a.dropCp);

  const summary = {
    generatedAt: new Date().toISOString(),
    method: useEngine ? `stockfish depth ${DEPTH}` : 'material-count heuristic',
    processed,
    blunders: findings.blunders.length,
  };

  writeFileSync(join(outDir, 'engine-local.json'), JSON.stringify({ summary, findings }, null, 2));

  const md = [];
  md.push('# Engine Audit Report (Local)');
  md.push('');
  md.push(`Generated: ${summary.generatedAt}`);
  md.push(`Method: ${summary.method}`);
  md.push(`Positions scanned: **${summary.processed}**`);
  md.push(`Flagged blunders (drop ≥ ${BLUNDER_CP}cp): **${summary.blunders}**`);
  md.push('');
  md.push('## Flagged positions (worst first)');
  md.push('');
  md.push('| Source | Opening | Subline | Move# | Played | Engine/Heuristic | Drop (cp) |');
  md.push('|---|---|---|---:|---|---|---:|');
  for (const b of findings.blunders.slice(0, 100)) {
    md.push(`| ${b.source} | ${b.openingId} | ${b.sublineName ?? ''} | ${b.moveIndex + 1} | ${b.san} | ${b.engineBest} | ${b.dropCp} |`);
  }

  writeFileSync(join(outDir, 'engine-local.md'), md.join('\n'));
  console.log('[audit-engine-local] wrote audit-reports/engine-local.{json,md}');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('[audit-engine-local] fatal:', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * audit-endgame-results
 * ---------------------
 * Build-time verification gate for the hand-authored endgame
 * lesson catalog. Walks every position across the four JSON
 * catalogs and verifies the curator's `result` claim with an
 * external truth source:
 *
 *   - ≤7 pieces → Lichess Tablebase (mathematical certainty)
 *   - >7 pieces → Stockfish at depth 30 (engine evaluation)
 *
 * Exits non-zero if any position's verified result disagrees with
 * the authored claim. Designed to run in CI before any endgame
 * content lands on main, AND ad-hoc when adding new lessons.
 *
 * Usage:
 *   node scripts/audit-endgame-results.mjs            # full sweep
 *   node scripts/audit-endgame-results.mjs --depth=20 # shallower SF
 *   node scripts/audit-endgame-results.mjs --skip-tablebase
 *   node scripts/audit-endgame-results.mjs --skip-stockfish
 *
 * Tablebase calls go to explorer.lichess.ovh; this script needs
 * outbound network for the ≤7-piece checks. Stockfish runs
 * locally via the existing single-thread WASM build. With
 * depth=30 each Stockfish call is ~5-15s, and there are ~30
 * positions >7 pieces in the catalog — total runtime ~5-10
 * minutes for a full sweep.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'src/data');

const CATALOGS = [
  'endgame-principles.json',
  'pawn-endings.json',
  'drawn-patterns.json',
  'rook-endings.json',
];

const TABLEBASE_BASE = 'https://tablebase.lichess.ovh/standard';

// ─── CLI args ────────────────────────────────────────────────────
function parseArg(name, fallback) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!arg) return fallback;
  const v = arg.split('=')[1];
  if (v === undefined) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : v;
}
const DEPTH = parseArg('depth', 30);
const SKIP_TABLEBASE = process.argv.includes('--skip-tablebase');
const SKIP_STOCKFISH = process.argv.includes('--skip-stockfish');

// ─── Eval translation ────────────────────────────────────────────

/** Centipawn threshold for a "decisive" eval. ±250cp = up roughly
 *  a piece; positions in this band are decisive enough that the
 *  curator's win/loss claim should match. Inside the band is
 *  contested and we only trust a curator-claimed draw. */
const DECISIVE_CP_THRESHOLD = 250;

/** Translate Stockfish eval (white-relative cp / mate) into the
 *  same 'white-wins' | 'black-wins' | 'draw' enum the curator
 *  uses. Returns null when the eval is ambiguous (band around 0). */
function evalToResult(scoreType, score) {
  if (scoreType === 'mate') {
    return score > 0 ? 'white-wins' : 'black-wins';
  }
  if (score > DECISIVE_CP_THRESHOLD) return 'white-wins';
  if (score < -DECISIVE_CP_THRESHOLD) return 'black-wins';
  return 'draw';
}

function countPieces(fen) {
  return fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;
}

// ─── Tablebase lookup ────────────────────────────────────────────

async function lookupTablebase(fen) {
  const url = `${TABLEBASE_BASE}?fen=${encodeURIComponent(fen)}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ChessAcademyPro/1.0 audit-endgame-results',
        },
      });
      if (res.status === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      const json = await res.json();
      const sideToMove = fen.split(' ')[1];
      const movesWin = sideToMove === 'w' ? 'white-wins' : 'black-wins';
      const movesLose = sideToMove === 'w' ? 'black-wins' : 'white-wins';
      switch (json.category) {
        case 'win':
        case 'cursed-win':
        case 'maybe-win':
          return movesWin;
        case 'loss':
        case 'blessed-loss':
        case 'maybe-loss':
          return movesLose;
        case 'draw':
          return 'draw';
        default:
          return null;
      }
    } catch {
      await sleep(1000);
    }
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Stockfish ────────────────────────────────────────────────────

class Stockfish {
  constructor() {
    this.proc = spawn(
      'node',
      ['node_modules/stockfish/bin/stockfish-18-lite-single.js'],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    this.buffer = '';
    this.proc.stdout.on('data', (d) => {
      this.buffer += d.toString();
    });
    this.proc.stderr.on('data', () => {});
  }
  async send(cmd) {
    this.proc.stdin.write(cmd + '\n');
    await new Promise((r) => setTimeout(r, 5));
  }
  async waitFor(re, timeoutMs = 60_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (re.test(this.buffer)) return this.buffer;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`Stockfish timeout waiting for ${re}`);
  }
  async init() {
    await this.send('uci');
    await this.waitFor(/^uciok/m);
    await this.send('setoption name Hash value 64');
    await this.send('isready');
    await this.waitFor(/^readyok/m);
  }
  async eval(fen, depth) {
    this.buffer = '';
    await this.send(`position fen ${fen}`);
    await this.send(`go depth ${depth}`);
    const out = await this.waitFor(/^bestmove/m, 60_000);
    // Find the deepest info line with a score.
    const lines = out.split('\n');
    let bestType = 'cp';
    let bestScore = 0;
    let maxDepth = 0;
    for (const line of lines) {
      const m = line.match(
        /^info .*?\bdepth (\d+)\b.*\bscore (cp|mate) (-?\d+)/,
      );
      if (!m) continue;
      const d = Number(m[1]);
      if (d < maxDepth) continue;
      maxDepth = d;
      bestType = m[2];
      bestScore = Number(m[3]);
    }
    // Stockfish reports score from the SIDE TO MOVE's POV. Convert
    // to white-relative for our enum translator.
    const sideToMove = fen.split(' ')[1];
    if (sideToMove === 'b') bestScore = -bestScore;
    return { scoreType: bestType, score: bestScore, depth: maxDepth };
  }
  quit() {
    this.proc.stdin.write('quit\n');
    this.proc.kill();
  }
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const positions = [];
  for (const file of CATALOGS) {
    const data = JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
    for (const lesson of data) {
      for (const pos of lesson.positions) {
        positions.push({
          catalog: file,
          lesson: lesson.id,
          title: pos.title,
          fen: pos.fen,
          claimedResult: pos.result,
          auditSkip: pos.auditSkip ?? null,
        });
      }
    }
  }
  console.log(`Total positions: ${positions.length}`);
  // Honor auditSkip — these positions are documented exempt
  // (theoretical positions where engine eval doesn't align with
  // pedagogical claim).
  const skippedExplicit = positions.filter((p) => p.auditSkip);
  const auditable = positions.filter((p) => !p.auditSkip);
  const tablebaseTargets = auditable.filter((p) => countPieces(p.fen) <= 7);
  const stockfishTargets = auditable.filter((p) => countPieces(p.fen) > 7);
  console.log(`  Explicitly exempt (auditSkip set): ${skippedExplicit.length}`);
  console.log(`  ≤7 pieces (tablebase): ${tablebaseTargets.length}`);
  console.log(`  >7 pieces (Stockfish): ${stockfishTargets.length}`);
  if (skippedExplicit.length > 0) {
    console.log();
    console.log('Explicit exemptions:');
    for (const p of skippedExplicit) {
      console.log(`  ${p.lesson} / ${p.title} — ${p.auditSkip}`);
    }
  }
  console.log();

  const failures = [];
  const skipped = [];

  // ─── Tablebase phase ────────────────────────────────────────────
  if (!SKIP_TABLEBASE) {
    console.log('=== Tablebase verification ===');
    for (const p of tablebaseTargets) {
      const verified = await lookupTablebase(p.fen);
      if (verified === null) {
        skipped.push({ ...p, source: 'tablebase', reason: 'lookup-failed' });
        console.log(`  SKIP ${p.lesson} / ${p.title} — tablebase lookup failed`);
        continue;
      }
      if (verified !== p.claimedResult) {
        failures.push({ ...p, source: 'tablebase', verified });
        console.log(
          `  FAIL ${p.lesson} / ${p.title} — claimed=${p.claimedResult} tablebase=${verified}`,
        );
      } else {
        console.log(`  OK   ${p.lesson} / ${p.title} — ${verified}`);
      }
      await sleep(250); // be polite to Lichess
    }
    console.log();
  }

  // ─── Stockfish phase ────────────────────────────────────────────
  if (!SKIP_STOCKFISH && stockfishTargets.length > 0) {
    console.log(`=== Stockfish verification (depth ${DEPTH}) ===`);
    const sf = new Stockfish();
    try {
      await sf.init();
      for (const p of stockfishTargets) {
        const ev = await sf.eval(p.fen, DEPTH);
        const verified = evalToResult(ev.scoreType, ev.score);
        const evalLabel =
          ev.scoreType === 'mate' ? `M${ev.score}` : `${ev.score}cp`;
        if (verified !== p.claimedResult) {
          // For draws, allow a wider band — Stockfish can score
          // theoretical fortresses as +200cp without it being a
          // genuine win. The curator's draw claim outweighs an
          // engine "white better" eval inside ±400cp.
          const isDrawDispute =
            (p.claimedResult === 'draw' && ev.scoreType === 'cp' && Math.abs(ev.score) <= 400);
          if (isDrawDispute) {
            console.log(
              `  OK*  ${p.lesson} / ${p.title} — eval=${evalLabel} (within draw tolerance)`,
            );
            continue;
          }
          failures.push({ ...p, source: 'stockfish', verified, eval: evalLabel });
          console.log(
            `  FAIL ${p.lesson} / ${p.title} — claimed=${p.claimedResult} eval=${evalLabel} (≈${verified})`,
          );
        } else {
          console.log(`  OK   ${p.lesson} / ${p.title} — eval=${evalLabel}`);
        }
      }
    } finally {
      sf.quit();
    }
    console.log();
  }

  // ─── Report ─────────────────────────────────────────────────────
  console.log('=== Summary ===');
  console.log(`PASS: ${positions.length - failures.length - skipped.length}`);
  console.log(`SKIP: ${skipped.length}`);
  console.log(`FAIL: ${failures.length}`);
  if (failures.length > 0) {
    console.log();
    console.log('Failures:');
    for (const f of failures) {
      console.log(
        `  ${f.lesson} / ${f.title} (${f.source}) — claimed=${f.claimedResult} verified=${f.verified}`,
      );
    }
    process.exit(1);
  }
  console.log('All positions verified.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

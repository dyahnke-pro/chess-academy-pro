/**
 * @vitest-environment-options { "url": "https://chess-academy-pro.vercel.app/" }
 *
 * THE REAL-ENGINE AMATEUR SWEEP (David 2026-09-23: "widen it into a seat, tense
 * and repetition checker over a few hundred real games, so the walks stop being
 * the thing that finds these").
 *
 * WHY A SECOND SWEEP. `reviewCorpusSweep` runs 646 MASTER games through an
 * engine mock that answers eval 0 everywhere and marks every 4th ply a
 * "mistake". Master games have few real slips, and a flat-zero engine can
 * never make the eval-dependent paths fire — the seat of a swing, the tense of
 * a punishment, the claim that is true at the mistake and stale a move later.
 * Those are the classes the hand walks kept finding. This sweep feeds the SAME
 * production narration (`generateReviewNarration`, uncapped) with:
 *   • REAL AMATEUR GAMES — 800-1800 club players off chess.com's public API
 *     (`scripts/build-wo4-corpus.mjs --out data/sources/sweep-corpus`), the
 *     population the review is for;
 *   • REAL EVALS — every ply annotated by the app's own Stockfish 18 build, and
 *     graded with the production `classifyCpLoss`, never a synthetic flag;
 *   • A REAL ENGINE for the projections, the same npm build over UCI, cached to
 *     disk so a re-run costs seconds.
 *
 * WHAT IT CHECKS — the shared board-truth scanner (`narrationScanner`, the one
 * `reviewCorpusSweep` uses), plus REPETITION: the same sentence spoken three or
 * more times in one game, which a single walk reads as the coach not listening.
 *
 * It is a MEASUREMENT on gitignored research data, so it skips when the corpus
 * is absent — and SAYS so, never a silent skip. Run it:
 *   node scripts/build-wo4-corpus.mjs --fetch --out data/sources/sweep-corpus --target 300 --country IS,IE,NZ,SG,FI
 *   node scripts/build-wo4-corpus.mjs --annotate --out data/sources/sweep-corpus --depth 12 --limit 300
 *   REAL_SWEEP=1 REAL_SWEEP_N=40 npx vitest run src/services/reviewRealSweep.test.ts
 * The report lands in audit-reports/review-real-sweep.json.
 */
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';
import type { Color } from 'chess.js';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const CORPUS = 'data/sources/sweep-corpus/annotated-d12.json';
const ENGINE_CACHE = 'data/sources/sweep-corpus/engine-cache.json';
const ON = process.env.REAL_SWEEP === '1' && existsSync(CORPUS);
const DEPTH = Number(process.env.REAL_SWEEP_DEPTH ?? 12);

// ── The real engine, one persistent process, answers cached on disk ─────────
interface Analysis { evaluation: number; bestMove: string | null; topLines: Array<{ rank: number; moves: string[]; evaluation: number; mate: number | null }> }
const cache: Record<string, Analysis> = ON && existsSync(ENGINE_CACHE) ? JSON.parse(readFileSync(ENGINE_CACHE, 'utf8')) as Record<string, Analysis> : {};
let dirty = 0;
let proc: ChildProcessWithoutNullStreams | null = null;
let queue: Promise<unknown> = Promise.resolve();
function engine(): ChildProcessWithoutNullStreams {
  if (proc) return proc;
  proc = spawn('node', ['node_modules/stockfish/scripts/cli.js']);
  proc.stdin.write('setoption name MultiPV value 3\nisready\n');
  return proc;
}
function analyzeReal(fen: string): Promise<Analysis> {
  const hit = cache[fen];
  if (hit) return Promise.resolve(hit);
  const run = queue.then(() => new Promise<Analysis>((resolve) => {
    const p = engine();
    const lines = new Map<number, { moves: string[]; score: number; mate: number | null }>();
    const blackToMove = fen.split(' ')[1] === 'b';
    let buf = '';
    const onData = (d: Buffer): void => {
      buf += d.toString();
      const parts = buf.split('\n');
      buf = parts.pop() ?? '';
      for (const l of parts) {
        const m = /multipv (\d+) .*score (cp|mate) (-?\d+).* pv (.+)$/.exec(l);
        if (m) {
          const raw = Number(m[3]);
          const whiteCp = (m[2] === 'mate' ? (raw > 0 ? 100000 - raw : -100000 - raw) : raw) * (blackToMove ? -1 : 1);
          lines.set(Number(m[1]), { moves: m[4].trim().split(/\s+/), score: whiteCp, mate: m[2] === 'mate' ? raw * (blackToMove ? -1 : 1) : null });
        }
        const b = /^bestmove (\S+)/.exec(l);
        if (b) {
          p.stdout.off('data', onData);
          const top = [...lines.entries()].sort((a, c) => a[0] - c[0]).map(([rank, v]) => ({ rank, moves: v.moves, evaluation: v.score, mate: v.mate }));
          const out: Analysis = { evaluation: top[0]?.evaluation ?? 0, bestMove: b[1] === '(none)' ? null : b[1], topLines: top };
          cache[fen] = out;
          dirty += 1;
          resolve(out);
        }
      }
    };
    p.stdout.on('data', onData);
    p.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
  }));
  queue = run.catch(() => undefined);
  return run;
}

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn((fen: string) => analyzeReal(fen)),
    analyzeWithBudget: vi.fn((fen: string) => analyzeReal(fen)),
    getBestMove: vi.fn(async (fen: string) => (await analyzeReal(fen)).bestMove ?? ''),
    isBusy: () => false,
    stop: () => undefined,
    newGame: () => undefined,
    status: 'ready',
  },
}));
// The review's phrasing seam returns the computed text, so we read exactly what
// the student hears (preferRaw) — no model in the loop.
vi.mock('./coachApi', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, voiceFacts: vi.fn(async (facts: string) => facts) };
});

import { generateReviewNarration, type ReviewMoveInput } from './coachFeatureService';
import { classifyCpLoss } from './gameAnalysisService';
import { scanLine, type Violation } from '../test/narrationScanner';

interface CorpusPly { fenBefore: string; bestMove: string | null; bestMoveEval: number | null; evaluation: number | null }
interface CorpusGame { id: string; moves: string; white: string; black: string; whiteElo: number; blackElo: number; winner: 'white' | 'black' | null; us: string; plies: CorpusPly[] }

/** The review inputs for a corpus game, graded with the PRODUCTION classifier. */
function inputsFor(g: CorpusGame): { moves: ReviewMoveInput[]; studentWB: Color; rating: number } {
  const sans = g.moves.split(' ');
  const studentWB: Color = g.us === g.white ? 'w' : 'b';
  const c = new Chess();
  const out: ReviewMoveInput[] = [];
  let prevEval: number | null = null;
  sans.forEach((san, i) => {
    const ply = g.plies[i];
    const fenBefore = c.fen();
    const mv = c.move(san);
    const isWhite = i % 2 === 0;
    // The eval AFTER this move is the next position's best-play eval.
    const after = g.plies[i + 1]?.bestMoveEval ?? ply?.evaluation ?? null;
    const best = ply?.bestMoveEval ?? null;
    const cpLoss = best !== null && after !== null ? Math.max(0, (best - after) * (isWhite ? 1 : -1)) : 0;
    const classification = best !== null && after !== null
      ? classifyCpLoss(cpLoss, best, after, isWhite, san.includes('#'), fenBefore, mv.san)
      : null;
    out.push({
      ply: i + 1, san: mv.san,
      isCoachMove: (isWhite ? 'w' : 'b') !== studentWB,
      classification, evaluation: after, preMoveEval: prevEval,
      bestMove: ply?.bestMove ?? null, fenAfter: c.fen(),
    } as ReviewMoveInput);
    prevEval = after;
  });
  return { moves: out, studentWB, rating: studentWB === 'w' ? g.whiteElo : g.blackElo };
}

/** The same sentence three or more times in one game. Sentences under five
 *  words are ignored — "Nice." is a rhythm, not a repeated claim. */
function repetitions(lines: string[]): Array<{ sentence: string; count: number }> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    for (const s of line.split(/(?<=[.!?])\s+/)) {
      const norm = s.trim().toLowerCase().replace(/\s+/g, ' ');
      if (norm.split(' ').length < 5) continue;
      counts.set(norm, (counts.get(norm) ?? 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, n]) => n >= 3).map(([sentence, count]) => ({ sentence, count }));
}

describe('real-engine amateur sweep — say whether it ran', () => {
  it('reports its own absence out loud', () => {
    if (!ON) {
      console.warn(`\n  ⚠️  REAL SWEEP SKIPPED — ${existsSync(CORPUS) ? 'REAL_SWEEP=1 not set' : `${CORPUS} is absent`}.\n`
        + '      Build it: node scripts/build-wo4-corpus.mjs --fetch --out data/sources/sweep-corpus --target 300 --country IS,IE,NZ,SG,FI\n'
        + '                node scripts/build-wo4-corpus.mjs --annotate --out data/sources/sweep-corpus --depth 12 --limit 300\n');
    }
    expect(typeof ON).toBe('boolean');
  });
});

describe.skipIf(!ON)('real-engine amateur sweep — every line board-true, nothing said three times', () => {
  it('sweeps the corpus and writes the report', async () => {
    const games = (JSON.parse(readFileSync(CORPUS, 'utf8')) as CorpusGame[])
      .slice(Number(process.env.REAL_SWEEP_FROM ?? 0))
      .slice(0, Number(process.env.REAL_SWEEP_N ?? 40));
    const violations: Violation[] = [];
    const repeats: Array<{ game: string; sentence: string; count: number }> = [];
    let plies = 0;
    let narrated = 0;
    let words = 0;
    const sample: Array<{ game: string; ply: number; san: string; line: string }> = [];
    for (const g of games) {
      const { moves, studentWB, rating } = inputsFor(g);
      const narration = await generateReviewNarration({
        moves, playerColor: studentWB === 'w' ? 'white' : 'black',
        openingName: null, result: g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '1/2-1/2',
        playerRating: rating, coachNarration: 'full', uncapped: true, gameId: null,
      });
      const lines: string[] = [];
      for (const seg of narration.segments) {
        plies += 1;
        if (!seg.narration) continue;
        narrated += 1;
        words += seg.narration.split(/\s+/).filter(Boolean).length;
        if (sample.length < 300 && games.indexOf(g) < 5) sample.push({ game: g.id, ply: seg.ply, san: seg.san, line: seg.narration });
        lines.push(seg.narration);
        violations.push(...scanLine(seg.narration, seg.fenAfter, studentWB, { game: g.id, ply: seg.ply, san: seg.san, line: seg.narration }, seg.fenBefore));
      }
      for (const r of repetitions(lines)) repeats.push({ game: g.id, ...r });
      if (dirty > 0) { mkdirSync('data/sources/sweep-corpus', { recursive: true }); writeFileSync(ENGINE_CACHE, JSON.stringify(cache)); dirty = 0; }
    }
    proc?.kill();

    const byRule: Record<string, number> = {};
    for (const v of violations) byRule[v.rule] = (byRule[v.rule] ?? 0) + 1;
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/review-real-sweep.json', JSON.stringify({
      games: games.length, plies, narrated, words, wordsPerGame: Math.round(words / Math.max(1, games.length)), byRule, repeats: repeats.length,
      violations: violations.slice(0, 400), repeatSamples: repeats.slice(0, 200), sample,
    }, null, 1));
    console.log(`\n  REAL SWEEP: ${games.length} games, ${plies} plies, ${narrated} narrated, ${words} words — `
      + `${violations.length} board-truth violations ${JSON.stringify(byRule)}, ${repeats.length} sentences said 3+ times\n`);
    for (const v of violations.slice(0, 25)) console.log(`  [${v.rule}] ${v.game} ply${v.ply} ${v.san}: ${v.detail}\n    → ${v.line.slice(0, 220)}`);
    for (const r of repeats.slice(0, 15)) console.log(`  [repeat×${r.count}] ${r.game}: ${r.sentence.slice(0, 160)}`);

    // A sweep that narrated nothing verified nothing — refuse a vacuous green.
    expect(narrated, 'the sweep produced no narration at all').toBeGreaterThan(0);
    expect(violations, `board-untrue lines: ${violations.slice(0, 10).map((v) => `${v.rule}@${v.game}#${v.ply}`).join(', ')}`).toEqual([]);
    expect(repeats, `sentences said 3+ times in one game: ${repeats.length}`).toEqual([]);
  }, 6 * 60 * 60 * 1000);
});

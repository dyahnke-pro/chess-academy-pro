/**
 * R1 ON DAVID'S OWN GAMES (PLAN.md § PHASE 2 REDESIGN, R1): does Review SAY
 * the tempting move refuted, the move of the same worth and the square choice
 * once a game graded before the candidate reads existed is topped up?
 *
 * Each game is one of his from the data drop, graded at review depth and
 * carrying no reads (0 of 966 do). The app's own top-up (`topUpWeighedReads`)
 * reads it on a native Stockfish standing in for the pool worker (the same
 * `analyzeFan` contract: MultiPV, searchmoves, White's view, bounds), then
 * Review's own walk (`buildReviewSegmentsForTests`, uncapped as production)
 * runs twice over the same record — without the reads, as the game opens
 * today, and with them. Every line the reads added is printed with its move.
 *
 *   REVIEW_WEIGHED_REAL=1 [WEIGH_GAMES=3] [WEIGH_ONLY=id,…] npx vitest run src/services/reviewWeighed.realGame.measure.test.ts
 *
 * Writes audit-reports/review-weighed-real.json.
 */
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { db } from '../db/schema';
import { topUpWeighedReads } from './gameAnalysisService';
import { adaptGameRecord } from './reviewGameAdapter';
import { reviewMoveInputsFrom } from './reviewNarrationBuild';
import { buildReviewSegmentsForTests } from './coachFeatureService';
import type { GameRecord } from '../types';

const SF = '/usr/games/stockfish';
const DROP = 'audit-reports/.fixtures/data-drop-david.json';
const ON = process.env.REVIEW_WEIGHED_REAL === '1' && existsSync(SF) && existsSync(DROP);
const GAMES = Number(process.env.WEIGH_GAMES ?? 3);
const ONLY = new Set((process.env.WEIGH_ONLY ?? '').split(',').filter(Boolean));
const ME = 'knight_mare_01';

type FanLine = { rank: number; evaluation: number; mate: number | null; bound: 'lower' | 'upper' | null; moves: string[]; depth: number };

/** One native search, parsed the way `DedicatedWorker.analyzeFanNow` parses
 *  the pool's: deepest per MultiPV rank, a bound never replacing an exact
 *  score, eight plies of each line, White's view. Fixed depth, one thread. */
function nativeFan(fen: string, lines: number, depth: number, searchmoves: readonly string[] | null): Promise<FanLine[]> {
  return new Promise((resolve) => {
    const sf = spawn(SF);
    const flip = fen.split(' ')[1] === 'b' ? -1 : 1;
    const best = new Map<number, { depth: number; cp: number; mate: number | null; bound: 'lower' | 'upper' | null; pv: string[] }>();
    let buf = '';
    sf.stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString();
      let nl = buf.indexOf('\n');
      while (nl >= 0) {
        const data = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        nl = buf.indexOf('\n');
        if (data.startsWith('info ')) {
          const mv = /\bmultipv (\d+)/.exec(data);
          const d = /\bdepth (\d+)/.exec(data);
          const sc = /\bscore (cp|mate) (-?\d+)/.exec(data);
          if (!mv || !d || !sc) continue;
          const rank = Number(mv[1]);
          const seen = Number(d[1]);
          const bd = /\b(lowerbound|upperbound)\b/.exec(data);
          const bound: 'lower' | 'upper' | null = bd ? (bd[1] === 'lowerbound' ? 'lower' : 'upper') : null;
          const prev = best.get(rank);
          if (prev && bound !== null && prev.bound === null) continue;
          if (prev && !(seen > prev.depth || (seen === prev.depth && prev.bound !== null && bound === null))) continue;
          const pvm = / pv (.+)$/.exec(data);
          best.set(rank, { depth: seen, cp: sc[1] === 'cp' ? Number(sc[2]) : 0, mate: sc[1] === 'mate' ? Number(sc[2]) : null, bound, pv: pvm ? pvm[1].trim().split(/\s+/).slice(0, 8) : [] });
        } else if (data.startsWith('bestmove')) {
          try { sf.kill(); } catch { /* gone */ }
          resolve([...best.entries()].sort((a, b) => a[0] - b[0]).map(([rank, v]) => ({
            rank, evaluation: v.cp * flip, mate: v.mate == null ? null : v.mate * flip, bound: v.bound, moves: v.pv, depth: v.depth,
          })));
        }
      }
    });
    const only = searchmoves && searchmoves.length ? ` searchmoves ${searchmoves.join(' ')}` : '';
    sf.stdin.write(`setoption name Threads value 1\nsetoption name Hash value 64\nsetoption name MultiPV value ${Math.max(2, lines)}\nposition fen ${fen}\ngo depth ${depth}${only}\n`);
  });
}

const nativeWorker = { dead: false, newGame: (): void => {}, analyzeFan: (fen: string, lines: number, depth: number, _budget: number, searchmoves: readonly string[] | null) => nativeFan(fen, lines, depth, searchmoves) };

const WEIGH_LINE = /is tempting here, but it fails|looks natural, but it doesn't work|was tempting for them, but it fails|looked natural for them, but it doesn't work|Another move was worth the same|keeps .* guarded, and .* leaves it loose|does more on [a-h][1-8]|Why that square for|The other squares for/;

describe.skipIf(!ON)('R1 on David\'s games: Review says what the candidate reads add', () => {
  it('tops up real graded games and reads the walk with and without the reads', async () => {
    const drop = JSON.parse(readFileSync(DROP, 'utf8')) as { stores: { games: GameRecord[] } };
    const mine = drop.stores.games
      .filter((g) => !g.isMasterGame && (g.analysisDepth ?? 0) >= 16 && (g.annotations?.length ?? 0) >= 30)
      .filter((g) => [g.white, g.black].some((n) => n?.toLowerCase() === ME))
      .sort((a, b) => a.id.localeCompare(b.id));
    const picked = ONLY.size ? mine.filter((g) => ONLY.has(g.id)) : mine.slice(0, GAMES);
    const report: Array<{ id: string; seat: string; posed: number; read: number; added: Array<{ ply: number; san: string; line: string }>; before: number; after: number; ms: number }> = [];
    for (const g of picked) {
      const t0 = Date.now();
      await db.games.clear();
      await db.games.put(g);
      const seat: 'white' | 'black' = g.white.toLowerCase() === ME ? 'white' : 'black';
      const rating = (seat === 'white' ? g.whiteElo : g.blackElo) ?? 1500;
      const annotations = await topUpWeighedReads(g.id, { worker: async () => nativeWorker as never });
      const stored = await db.games.get(g.id);
      const walk = (rec: GameRecord): Array<{ ply: number; san: string; text: string }> => {
        const adapted = adaptGameRecord(rec, seat);
        if (!adapted) return [];
        const inputs = reviewMoveInputsFrom(adapted.moves);
        return buildReviewSegmentsForTests(inputs, seat, null, true, rating)
          .map((s) => ({ ply: s.ply, san: inputs[s.ply - 1]?.san ?? '?', text: (s.narration ?? '').replace(/\[[a-z0-9-]+\]\s*/gi, '') }));
      };
      const before = walk(g);
      const after = stored ? walk(stored) : [];
      const sentences = (t: string): string[] => t.split(/(?<=[.!?])\s+/).filter(Boolean);
      const beforeSet = new Set(before.flatMap((s) => sentences(s.text).map((x) => `${s.ply}|${x}`)));
      const added = after.flatMap((s) => sentences(s.text).filter((x) => WEIGH_LINE.test(x) && !beforeSet.has(`${s.ply}|${x}`)).map((line) => ({ ply: s.ply, san: s.san, line })));
      const count = (segs: typeof before): number => segs.flatMap((s) => sentences(s.text)).filter((x) => WEIGH_LINE.test(x)).length;
      const posed = (stored?.annotations ?? []).filter((a) => a.classification !== 'book').length;
      const read = (annotations ?? []).filter((a) => a.weighed).length;
      report.push({ id: g.id, seat, posed, read, added, before: count(before), after: count(after), ms: Date.now() - t0 });
      console.log(`\n[weigh-real] ${g.id} (${seat}): ${read} of ${posed} moves read · weighing lines before ${count(before)}, after ${count(after)} · ${Math.round((Date.now() - t0) / 1000)}s`);
      for (const a of added) console.log(`  ply ${a.ply} ${a.san}: ${a.line}`);
      writeFileSync('audit-reports/review-weighed-real.json', `${JSON.stringify(report, null, 1)}\n`);
    }
    expect(report.length).toBeGreaterThan(0);
    // Not vacuous: the reads were taken on a live engine.
    expect(report.some((r) => r.read > 0)).toBe(true);
  }, 3_600_000);
});

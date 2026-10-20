// MEASUREMENT (L6): David's stored record, re-priced with ONE search.
//   RECORD_REPRICE=1 SHARD=0/4 npx vitest run src/services/recordReprice.measure.test.ts
// Reads audit-reports/.fixtures/data-drop-david.json, prices every student move
// of every analysed game with native Stockfish at the review depth (the same
// `repriceAnnotations` the boot backfill runs), and checkpoints each game to
// audit-reports/record-reprice/shard-<i>.jsonl as it goes, so a kill keeps the
// finished games. The counts are summed by scripts/record-reprice-report.mjs.
import { describe, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import type { GameRecord, MoveAnnotation } from '../types';
import type { MoveScorer, ScoredMove } from './pvPlayback';
import { repriceAnnotations } from './annotationReprice';
import { determinePlayerColor, replayPgnToFens } from './mistakePuzzleService';
import { REVIEW_READ_DEPTH } from './engineConstants';

const RUN = process.env.RECORD_REPRICE === '1';
const DROP = 'audit-reports/.fixtures/data-drop-david.json';

/** A native Stockfish that scores the given moves in ONE search (`searchmoves`). */
class NativeScorer implements MoveScorer {
  private p: ChildProcessWithoutNullStreams;
  private buf = '';
  private waiter: ((line: string) => boolean) | null = null;
  constructor() {
    this.p = spawn('/usr/games/stockfish');
    this.p.stdout.on('data', (d: Buffer) => {
      this.buf += d.toString();
      let nl: number;
      while ((nl = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, nl).trim();
        this.buf = this.buf.slice(nl + 1);
        if (this.waiter && this.waiter(line)) this.waiter = null;
      }
    });
    this.p.stdin.write('uci\nsetoption name Threads value 1\nsetoption name Hash value 64\n');
  }
  async scoreMoves(fen: string, ucis: readonly string[], depth: number): Promise<readonly ScoredMove[]> {
    const last = new Map<number, ScoredMove>();
    const done = new Promise<void>((resolve) => {
      this.waiter = (line) => {
        const m = /^info .*\bdepth (\d+) .*\bmultipv (\d+) .*\bscore (cp|mate) (-?\d+).*\bpv (.+)$/.exec(line);
        if (m && Number(m[1]) === depth) {
          const sideSign = fen.split(' ')[1] === 'w' ? 1 : -1;
          const v = Number(m[4]);
          last.set(Number(m[2]), m[3] === 'cp'
            ? { evaluation: v * sideSign, mate: null, moves: m[5].split(' ') }
            : { evaluation: 0, mate: v * sideSign, moves: m[5].split(' ') });
        }
        if (line.startsWith('bestmove')) { resolve(); return true; }
        return false;
      };
    });
    this.p.stdin.write(`setoption name MultiPV value ${ucis.length}\nucinewgame\nposition fen ${fen}\ngo depth ${depth} searchmoves ${ucis.join(' ')}\n`);
    await done;
    return [...last.values()];
  }
  close(): void { this.p.stdin.write('quit\n'); }
}

describe.skipIf(!RUN)('L6 — David\'s record re-priced with one search', () => {
  it('prices every student move of the shard and checkpoints per game', async () => {
    const [shard, of] = (process.env.SHARD ?? '0/1').split('/').map(Number);
    const raw = JSON.parse(readFileSync(DROP, 'utf8')) as { stores?: Record<string, unknown[]> } & Record<string, unknown[]>;
    const t = (raw.stores ?? raw);
    const games = (t.games as GameRecord[]).filter((g) => g.fullyAnalyzed && (g.annotations?.length ?? 0) > 0);
    const user = ((t.profiles as Array<{ preferences?: { chessComUsername?: string } }>)[0]?.preferences?.chessComUsername) ?? undefined;
    if (!existsSync('audit-reports/record-reprice')) mkdirSync('audit-reports/record-reprice', { recursive: true });
    const out = `audit-reports/record-reprice/shard-${shard}.jsonl`;
    const done = new Set<string>(existsSync(out) ? readFileSync(out, 'utf8').split('\n').filter(Boolean).map((l) => (JSON.parse(l) as { id: string }).id) : []);
    const scorer = new NativeScorer();
    const mine = games.filter((_, i) => i % of === shard);
    let n = 0;
    const t0 = Date.now();
    for (const g of mine) {
      n++;
      if (done.has(g.id)) continue;
      const color = determinePlayerColor(g, g.source === 'chesscom' ? user : undefined);
      if (!color) { appendFileSync(out, `${JSON.stringify({ id: g.id, skipped: 'no-seat' })}\n`); continue; }
      const fens = replayPgnToFens(g.pgn);
      const r = await repriceAnnotations({ annotations: g.annotations as MoveAnnotation[], fens, playerColor: color, scorer, depth: REVIEW_READ_DEPTH });
      const costs = r.annotations
        .map((a, i) => ({ i, a }))
        .filter(({ a }) => a.color === color && typeof a.costCp === 'number')
        .map(({ i, a }) => ({ i, san: a.san, fen: fens[(a.moveNumber - 1) * 2 + (a.color === 'black' ? 1 : 0)], cost: a.costCp, cls: a.classification, old: (g.annotations as MoveAnnotation[])[i].classification }));
      appendFileSync(out, `${JSON.stringify({ id: g.id, color, priced: r.priced, changes: r.changes, costs })}\n`);
      if (n % 5 === 0) console.log(`[shard ${shard}] ${n}/${mine.length} games, ${Math.round((Date.now() - t0) / 1000)}s`);
    }
    scorer.close();
  }, 3 * 60 * 60 * 1000);
});

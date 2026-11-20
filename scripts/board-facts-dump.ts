// BOARD FACTS DUMP (research, WO-DECIDER) — every fact every computer makes on a board, with its kind,
// group, step, depth, stakes and the teaching moves its kind makes; and what today's door kept.
// Derived from board-read-dump.ts.
// BOARD READ DUMP — everything the coach's computers say about one board, for
// the side to move: the position read chat gives (`assemblePositionAssessment`,
// fed the live tactics context), and the shared fact set (`moveThoughtFacts`)
// for the engine's best move. Research tool for the read-this-position work:
// it shows what the computers have on a board, so a benchmark position's ideas
// can be checked against them. Never part of the app.
//
//   npx tsx scripts/board-read-dump.ts <in.jsonl> <out.jsonl> [depth]
//   each input line: {"id": "...", "fen": "..."}
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
import { TEACHING_MOVES } from '../src/services/teachingMoves';
import { boardReadFacts } from '../src/services/boardReadFacts';
import type { AnalysisLine } from '../src/types';

const [, , inPath, outPath, depthArg] = process.argv;
const DEPTH = Number(depthArg ?? 16);

class Engine {
  private proc = spawn('/usr/games/stockfish');
  private buf = '';
  private waiters: Array<(line: string) => boolean> = [];
  constructor() {
    this.proc.stdout.on('data', (d: Buffer) => {
      this.buf += d.toString();
      let i: number;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        this.waiters = this.waiters.filter((w) => !w(line));
      }
    });
    this.send('uci');
    this.send('setoption name MultiPV value 3');
  }
  send(s: string): void { this.proc.stdin.write(`${s}\n`); }
  /** MultiPV lines at DEPTH, white-POV centipawns. */
  analyse(fen: string): Promise<AnalysisLine[]> {
    return new Promise((resolve) => {
      const best = new Map<number, AnalysisLine>();
      const early = new Map<number, string[]>();
      const reached = new Map<number, number>();
      const white = fen.split(' ')[1] === 'w';
      this.waiters.push((line) => {
        // `^info depth`, never `.*depth`: a greedy `.*` lands on `seldepth`, and
        // the lines kept were whichever iteration searched 16 deep selectively.
        const m = /\b(lower|upper)bound\b/.test(line) ? null : /^info depth (\d+) .*?multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)$/.exec(line);
        // The app's second read: a shallower iteration of the same search (`earlier`).
        if (m && Number(m[1]) === Math.max(1, DEPTH - 4)) early.set(Number(m[2]), m[5].split(' '));
        // The deepest iteration each line reached: a forced mate ends the
        // search before DEPTH (the Opera game finish read no lines at all).
        if (m && Number(m[1]) <= DEPTH && Number(m[1]) >= (reached.get(Number(m[2])) ?? 0)) {
          reached.set(Number(m[2]), Number(m[1]));
          const raw = Number(m[4]);
          const pov = white ? raw : -raw;
          best.set(Number(m[2]), { rank: Number(m[2]), evaluation: m[3] === 'cp' ? pov : (pov > 0 ? 100000 : -100000), mate: m[3] === 'mate' ? pov : null, moves: m[5].split(' '), earlier: early.has(Number(m[2])) ? { moves: early.get(Number(m[2])) } : undefined } as unknown as AnalysisLine);
        }
        if (line.startsWith('bestmove')) { resolve([...best.values()].sort((a, b) => a.rank - b.rank)); return true; }
        return false;
      });
      this.send(`position fen ${fen}`);
      this.send(`go depth ${DEPTH}`);
    });
  }
  quit(): void { this.send('quit'); }
}



const codes = (k: string): readonly string[] => (TEACHING_MOVES as Record<string, readonly string[]>)[k] ?? [];
async function main(): Promise<void> {
  const cache = new Map<string, AnalysisLine[]>();
  const rows = readFileSync(inPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { id: string; fen: string });
  const done = new Set(existsSync(outPath) ? readFileSync(outPath, 'utf8').split('\n').filter(Boolean).map((l) => (JSON.parse(l) as { id: string }).id) : []);
  if (!existsSync(outPath)) writeFileSync(outPath, '');
  const engine = new Engine();
  // One process runs one search: the board read asks its tries together, so
  // they queue here, one at a time.
  let queue: Promise<unknown> = Promise.resolve();
  const read = (fen: string): Promise<AnalysisLine[]> => {
    const run = queue.then(async () => { const c = cache.get(fen); if (c) return c; const r = await engine.analyse(fen); cache.set(fen, r); return r; });
    queue = run.catch(() => undefined);
    return run;
  };
  let n = 0;
  for (const r of rows) {
    n += 1;
    if (done.has(r.id)) continue;
    const out: Record<string, unknown> = { id: r.id, fen: r.fen };
    try {
      // A fresh search per board, so a board's read never depends on the boards before it.
      engine.send('ucinewgame');
      cache.clear();
      const side = new Chess(r.fen).turn();
      const before = await read(r.fen);
      out.lines = before.map((l) => ({ moves: l.moves.slice(0, 10), cp: l.evaluation, mate: l.mate }));
      // The SAME facts the app reads (`boardReadFacts`), built 'past' as the fitter's tables were.
      const pf = await boardReadFacts({ fen: r.fen, studentColor: side, rating: 1800, before, read, withhold: false, readTempting: true, story: null,
        tense: 'now', history: [], theory: false, studentNeedContext: null });
      const facts = pf.facts.map((f) => ({ ...f, codes: codes(f.kind) }));
      const bestUci = before[0]?.moves[0];
      if (bestUci) out.best = new Chess(r.fen).move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] ?? 'q' }).san;
      out.facts = facts;
    } catch (e) { out.error = String(e).slice(0, 300); }
    appendFileSync(outPath, `${JSON.stringify(out)}\n`);
    if (n % 10 === 0) console.log(`${n}/${rows.length}`);
  }
  engine.quit();
  console.log('DONE');
}
void main();

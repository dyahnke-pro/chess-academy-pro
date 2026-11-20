// Today's read of each article board, from the STORED engine lines (no engine run).
// The board's own lines are the stored depth-16 reads; every other board the read asks for
// (the tries, the futures) is read live at depth 16, as the dump did.
//   npx tsx stored-read.ts <article-reads.jsonl> <out.jsonl>
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
const DEPTH = 16;
import { boardReadFacts } from '../src/services/boardReadFacts';
import { decideRead, readContextOf } from '../src/services/readDecider';
import { readHasShot } from '../src/services/positionReadComposer';
import type { AnalysisLine } from '../src/types';

const [, , inPath, outPath] = process.argv;
interface Row { id: string; fen: string; lines: Array<{ moves: string[]; cp: number; mate: number | null }> }
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

const key = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

async function main(): Promise<void> {
  const rows = readFileSync(inPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Row);
  const stored = new Map<string, AnalysisLine[]>();
  for (const r of rows) stored.set(key(r.fen), r.lines.map((l, i) => ({ rank: i + 1, evaluation: l.cp, mate: l.mate, moves: l.moves }) as unknown as AnalysisLine));
  writeFileSync(outPath, '');
  const engine = new Engine();
  let queue: Promise<unknown> = Promise.resolve();
  const live = (fen: string): Promise<AnalysisLine[]> => { const run = queue.then(async () => { const c = stored.get(key(fen)); if (c) return c; const a = await engine.analyse(fen); stored.set(key(fen), a); return a; }); queue = run.catch(() => undefined); return run as Promise<AnalysisLine[]>; };
  let n = 0; let missed = 0;
  for (const r of rows) {
    n += 1;
    const out: Record<string, unknown> = { id: r.id, fen: r.fen };
    try {
      const side = new Chess(r.fen).turn();
      const before = stored.get(key(r.fen)) ?? [];
      const read = (fen: string): Promise<AnalysisLine[] | null> => { if (!stored.has(key(fen))) missed += 1; return live(fen); };
      const pf = await boardReadFacts({ fen: r.fen, studentColor: side, rating: 1800, before, read, withhold: false, readTempting: true, engineFutures: false, story: null,
        tense: 'now', history: [], theory: false, studentNeedContext: null } as unknown as Parameters<typeof boardReadFacts>[0]);
      const decided = decideRead(pf.facts, readContextOf({
        fen: r.fen,
        top: before[0] ? { evaluation: before[0].evaluation, mate: before[0].mate ?? null } : null,
        bestUci: before[0]?.moves[0] ?? null,
        withheld: null,
        studentShot: readHasShot(r.fen, side, before, false),
      }));
      out.read = [...decided.facts.map((f) => f.text), decided.habit ?? ''].map((t) => t.trim()).filter(Boolean).join(' ');
      out.facts = pf.facts.map((f) => ({ kind: f.kind, text: f.text }));
    } catch (e) { out.error = String(e).slice(0, 300); }
    appendFileSync(outPath, `${JSON.stringify(out)}\n`);
    if (n % 20 === 0) console.log(`${n}/${rows.length} reads-missing=${missed}`);
  }
  engine.quit();
  console.log(`DONE engine-reads=${missed}`);
}
void main();

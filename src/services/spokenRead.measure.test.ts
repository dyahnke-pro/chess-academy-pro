// THE SPOKEN READ ON DANYA'S BOARDS — what "Read this position" says, by the
// app's own read (`boardReadFacts`) and decider (`decideRead`), with native
// Stockfish. Replaces scripts/danya/narrate-reads.mts, which called
// composePositionRead and spoke nothing in node (the read runs in a browser
// worker there). RECORD=1 saves every engine read a board needs to
// audit-reports/spoken-reads/<id>.json; REPLAY=1 reads them back, so a spoken
// line is reproduced exactly and a fix can be proven on the same board.
//   SPOKEN_READ=1 [RECORD=1|REPLAY=1] [ONLY=id,id] [N=30] [OUT=file] npx vitest run src/services/spokenRead.measure.test.ts
import { it } from 'vitest';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { boardReadFacts } from './boardReadFacts';
import { decideRead, readContextOf } from './readDecider';
import type { AnalysisLine } from '../types';
function engine() {
  const p = spawn('/usr/games/stockfish');
  let buf = ''; let waiter: ((l: string[]) => void) | null = null; let acc: string[] = [];
  p.stdout.on('data', (d: Buffer) => { buf += d.toString(); let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); acc.push(l); if (l.startsWith('bestmove') && waiter) { const w = waiter; waiter = null; const a = acc; acc = []; w(a); } } });
  const send = (s: string) => p.stdin.write(s + '\n'); send('uci');
  const read = (fen: string, multipv: number, depth: number): Promise<AnalysisLine[]> => new Promise((res) => {
    acc = []; waiter = (lines) => { const best = new Map<number, AnalysisLine>();
      for (const l of lines) { const m = l.match(/ depth (\d+) .*multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)$/); if (!m || Number(m[1]) < depth) continue;
        const v = Number(m[4]); const white = fen.split(' ')[1] === 'w' ? 1 : -1; const mate = m[3] === 'mate' ? v * white : null;
        best.set(Number(m[2]), { rank: Number(m[2]), evaluation: mate != null ? (mate > 0 ? 100000 : -100000) : v * white, moves: m[5].split(' '), mate, depth } as AnalysisLine); }
      res([...best.values()].sort((a, b) => a.rank - b.rank)); };
    send(`setoption name MultiPV value ${multipv}`); send(`position fen ${fen}`); send(`go depth ${depth}`); });
  let chain: Promise<unknown> = Promise.resolve();
  return { read: (f: string, m: number, d: number): Promise<AnalysisLine[]> => { const r = chain.then(() => read(f, m, d)); chain = r.catch(() => null); return r; }, quit: () => p.kill() };
}
it.skipIf(!process.env.SPOKEN_READ)('spoken', async () => {
  const boards = fs.readFileSync('audit-reports/danya-havecheck/board-facts-2026-11-19-unlocked.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((b) => !process.env.ONLY || process.env.ONLY.split(',').includes(b.id)).slice(0, Number(process.env.N ?? 30));
  const e = engine(); const out: string[] = [];
  const FIX = process.env.FIX_DIR ?? 'audit-reports/spoken-reads';
  fs.mkdirSync(FIX, { recursive: true });
  for (const b of boards) {
    // RECORD then REPLAY: every engine read a board needs is saved, so the
    // spoken read can be reproduced exactly in a test (fixture per board).
    const file = `${FIX}/${b.id.replace(/[^a-z0-9#-]/gi, '_')}.json`;
    const saved: Record<string, AnalysisLine[]> = process.env.REPLAY && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    const rec: Record<string, AnalysisLine[]> = {};
    const get = async (fen: string, mpv: number, depth: number): Promise<AnalysisLine[]> => {
      const k = `${fen}|${mpv}|${depth}`;
      const v = saved[k] ?? await e.read(fen, mpv, depth);
      rec[k] = v; return v;
    };
    const before = await get(b.fen, 8, 12);
    const r = await boardReadFacts({ fen: b.fen, studentColor: b.fen.split(' ')[1], rating: 1600, before, read: (fen) => get(fen, 3, 11), withhold: false, tense: 'now' as never, history: [], theory: false, readTempting: true, engineFutures: true, studentNeedContext: null, story: null });
    const ctx = readContextOf({ fen: b.fen, top: before[0] ?? null, bestUci: before[0]?.moves[0] ?? null, withheld: null, studentShot: false, said: null, line: before[0]?.moves });
    const d = decideRead(r.facts, ctx);
    if (process.env.RECORD) fs.writeFileSync(file, JSON.stringify(rec));
    out.push(JSON.stringify({ id: b.id, built: r.facts.length, said: d.facts.map((f) => `[${(f as {kind:string}).kind}] ${(f as {text:string}).text}`) }));
  }
  fs.writeFileSync(process.env.OUT ?? 'audit-reports/spoken-read.jsonl', out.join('\n')); e.quit();
}, 3600000);

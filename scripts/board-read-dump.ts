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
import { assemblePositionAssessment } from '../src/services/groundedAnswer';
import { buildTacticsLiveContext } from '../src/services/liveTacticsContext';
import { moveThoughtFacts } from '../src/services/moveThoughtFacts';
import { candidateMoves, type WeighRead } from '../src/services/weighedMoves';
import { NO_PREV_CAPTURE } from '../src/services/captureRun';
import type { AnalysisLine, StockfishAnalysis } from '../src/types';

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
      const white = fen.split(' ')[1] === 'w';
      this.waiters.push((line) => {
        // `^info depth`, never `.*depth`: a greedy `.*` lands on `seldepth`, and
        // the lines kept were whichever iteration searched 16 deep selectively.
        const m = /\b(lower|upper)bound\b/.test(line) ? null : /^info depth (\d+) .*?multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)$/.exec(line);
        if (m && Number(m[1]) === DEPTH) {
          const raw = Number(m[4]);
          const pov = white ? raw : -raw;
          best.set(Number(m[2]), { rank: Number(m[2]), evaluation: m[3] === 'cp' ? pov : (pov > 0 ? 100000 : -100000), mate: m[3] === 'mate' ? pov : null, moves: m[5].split(' ') } as AnalysisLine);
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

function asAnalysis(lines: AnalysisLine[]): StockfishAnalysis {
  const top = lines[0];
  return { bestMove: top?.moves[0] ?? '', evaluation: top?.evaluation ?? 0, isMate: top?.mate != null, mateIn: top?.mate ?? null, depth: DEPTH, topLines: lines, nodesPerSecond: 0 } as StockfishAnalysis;
}

async function main(): Promise<void> {
  const rows = readFileSync(inPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { id: string; fen: string });
  const done = new Set(existsSync(outPath) ? readFileSync(outPath, 'utf8').split('\n').filter(Boolean).map((l) => (JSON.parse(l) as { id: string }).id) : []);
  if (!existsSync(outPath)) writeFileSync(outPath, '');
  const engine = new Engine();
  let n = 0;
  for (const r of rows) {
    n += 1;
    if (done.has(r.id)) continue;
    const out: Record<string, unknown> = { id: r.id, fen: r.fen };
    try {
      const board = new Chess(r.fen);
      const side = board.turn();
      const before = await engine.analyse(r.fen);
      out.lines = before.map((l) => ({ moves: l.moves.slice(0, 8), cp: l.evaluation, mate: l.mate }));
      const tactics = buildTacticsLiveContext(r.fen, asAnalysis(before), side, 1800);
      // The tempting moves' reads, as the app takes them (`temptingReads`):
      // the best line and the board after each move the eye weighs.
      const tempting: WeighRead[] = before[0] ? [{ evaluation: before[0].evaluation, mate: before[0].mate, moves: before[0].moves }] : [];
      for (const c of before[0] ? candidateMoves(r.fen, 1800, { played: null, scored: null }) : []) {
        if (c.uci === before[0].moves[0]) continue;
        const after = new Chess(r.fen);
        after.move({ from: c.from, to: c.to, promotion: c.uci[4] });
        if (after.isGameOver()) continue;
        const top = (await engine.analyse(after.fen()))[0];
        if (top) tempting.push({ evaluation: top.evaluation, mate: top.mate, moves: [c.uci, ...top.moves] });
      }
      const read = assemblePositionAssessment({ evalCp: before[0]?.evaluation ?? null, mateIn: before[0]?.mate ?? null, tactics, studentColor: side === 'w' ? 'white' : 'black', fen: r.fen, bestUci: before[0]?.moves[0] ?? null, tempting: tempting.length >= 2 ? { rating: 1800, reads: tempting } : null });
      out.positionRead = read?.facts ?? null;
      const bestUci = before[0]?.moves[0];
      if (bestUci) {
        const mv = new Chess(r.fen).move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] ?? 'q' });
        const afterFen = new Chess(r.fen);
        afterFen.move(mv.san);
        const after = await engine.analyse(afterFen.fen());
        out.best = mv.san;
        const facts = moveThoughtFacts({
          fenBefore: r.fen, san: mv.san, moverIsStudent: true, plainThreatsSeen: false, tense: 'past', theory: false, story: false,
          prev: NO_PREV_CAPTURE, line: before[0].moves, history: [], theirLast: null, phrases: null,
          reads: { before, after, passBefore: [], passAfter: [] }, costCp: 0,
        });
        out.bestMoveFacts = facts.map((f) => ({ computer: f.computer, idea: f.idea, text: f.text }));
      }
    } catch (e) {
      out.error = String(e);
    }
    appendFileSync(outPath, `${JSON.stringify(out)}\n`);
    if (n % 10 === 0) console.log(`${n}/${rows.length}`);
  }
  engine.quit();
  console.log('DONE');
}
void main();

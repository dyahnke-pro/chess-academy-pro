import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';

// "Read this position", the first word in about half a second (Coach Build
// Board): the read's OPENING is composed off the board's own engine lines and
// never waits on another board's read; the deep part follows and never says the
// opening again. Eleven real boards from Danya's videos (the latency audit's
// boards, `scripts/audit-read-latency.mjs`), each with its stored engine lines.

const engine = vi.hoisted(() => ({ hang: true }));
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    // Every other board's read: never answers while `hang` is set.
    analyzeWithBudget: () => (engine.hang ? new Promise(() => {}) : Promise.resolve({ topLines: [] })),
    evalBoard: () => Promise.resolve('0'),
  },
}));
vi.mock('./gameAnalysisService', () => ({ acquirePvEngines: () => Promise.resolve(null) }));

const { composePositionReadStaged, FIRST_WORDS_STEPS } = await import('./positionReadComposer');
const { READ_STEPS } = await import('./readDecider');

interface Row { id: string; fen: string; lines: Array<{ moves: string[]; cp: number; mate: number | null }> }
const ALL: Row[] = fs.readFileSync('audit-reports/danya-havecheck/board-facts-2026-11-19-unlocked.jsonl', 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l) as Row)
  .filter((b) => !new Chess(b.fen).inCheck());
const BOARDS = ALL.slice(0, 11);
// Boards no other test reads: a read that hung in another test is remembered
// (the try-read cache), so the deep part is read on fresh boards.
const FRESH = ALL.slice(11, 13);

const analysisOf = (b: Row): StockfishAnalysis => ({
  bestMove: b.lines[0].moves[0], evaluation: b.lines[0].cp, isMate: b.lines[0].mate !== null, mateIn: b.lines[0].mate,
  depth: 14, nodesPerSecond: 0,
  topLines: b.lines.map((l, k) => ({ rank: k + 1, evaluation: l.cp, moves: l.moves, mate: l.mate })),
}) as unknown as StockfishAnalysis;

const staged = (b: Row) => composePositionReadStaged({
  fen: b.fen, pgn: '', playerColor: b.fen.split(' ')[1] === 'w' ? 'white' : 'black', openingName: null, rating: 1600,
  analysis: analysisOf(b), tacticsSkill: undefined, studentWeaknesses: [], studentNeedContext: null,
  evalBoard: () => Promise.resolve('0'), isCancelled: () => false, corpusNotes: false, withhold: null,
  readTempting: true, surface: 'play', story: null,
});

const sentences = (t: string): string[] => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

it.skipIf(!process.env.READ_DUMP)('dump', async () => {
  const { boardReadFacts } = await import('./boardReadFacts');
  const { decideRead, readContextOf } = await import('./readDecider');
  for (const b of BOARDS) {
    const a = analysisOf(b);
    const set = await boardReadFacts({ stage: 'first', fen: b.fen, studentColor: b.fen.split(' ')[1] as 'w' | 'b', rating: 1600, before: a.topLines, read: () => Promise.resolve(null), withhold: false, tense: 'now', history: [], theory: true, readTempting: true, engineFutures: false, studentNeedContext: null, story: null });
    const d = decideRead(set.facts, readContextOf({ fen: b.fen, top: { evaluation: a.topLines[0].evaluation, mate: a.topLines[0].mate ?? null }, bestUci: a.topLines[0].moves[0], withheld: null, studentShot: false, said: null, line: a.topLines[0].moves }));
    console.log('###', b.id, '\n facts:', set.facts.map((f) => `[${f.kind}] ${f.text}`).join('\n   '), '\n decided:', d.facts.map((f) => `[${f.kind}] ${f.text}`).join(' | '), '\n habit:', d.habit, '\n first:', await staged(b).first);
  }
}, 300_000);

it.skipIf(!process.env.READ_THEIRS)('their tries: produced vs decided (native engine)', async () => {
  const { spawn } = await import('node:child_process');
  const { boardReadFacts } = await import('./boardReadFacts');
  const { decideRead, readContextOf } = await import('./readDecider');
  const p = spawn('/usr/games/stockfish'); let buf = ''; let waiter: ((l: string[]) => void) | null = null; let acc: string[] = [];
  p.stdout.on('data', (d: Buffer) => { buf += d.toString(); let k; while ((k = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, k); buf = buf.slice(k + 1); acc.push(l); if (l.startsWith('bestmove') && waiter) { const w = waiter; waiter = null; const a = acc; acc = []; w(a); } } });
  const send = (x: string) => p.stdin.write(x + '\n'); send('uci');
  let chain: Promise<unknown> = Promise.resolve();
  const read = (fen: string): Promise<{ rank: number; evaluation: number; moves: string[]; mate: number | null }[]> => { const r = chain.then(() => new Promise<{ rank: number; evaluation: number; moves: string[]; mate: number | null }[]>((res) => { acc = []; waiter = (lines) => { const best = new Map<number, { rank: number; evaluation: number; moves: string[]; mate: number | null }>(); for (const l of lines) { const m = l.match(/ depth (\d+) .*multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)$/); if (!m || Number(m[1]) < 10) continue; const v = Number(m[4]); const w = fen.split(' ')[1] === 'w' ? 1 : -1; const mate = m[3] === 'mate' ? v * w : null; best.set(Number(m[2]), { rank: Number(m[2]), evaluation: mate != null ? (mate > 0 ? 100000 : -100000) : v * w, moves: m[5].split(' '), mate }); } res([...best.values()].sort((a, b) => a.rank - b.rank)); }; send('setoption name MultiPV value 3'); send(`position fen ${fen}`); send('go depth 10'); })); chain = r.catch(() => null); return r; };
  for (const b of BOARDS) {
    const a = analysisOf(b);
    const set = await boardReadFacts({ stage: 'full', fen: b.fen, studentColor: b.fen.split(' ')[1] as 'w' | 'b', rating: 1600, before: a.topLines, read: (f) => read(f), withhold: false, tense: 'now', history: [], theory: true, readTempting: true, engineFutures: false, studentNeedContext: null, story: null });
    const d = decideRead(set.facts, readContextOf({ fen: b.fen, top: { evaluation: a.topLines[0].evaluation, mate: a.topLines[0].mate ?? null }, bestUci: a.topLines[0].moves[0], withheld: null, studentShot: false, said: null, line: a.topLines[0].moves }));
    console.log('THEIRS', b.id, 'produced', set.facts.filter((f) => f.kind === 'their-refuted').map((f) => f.text).join(' | ') || '-', '|| decided', d.facts.filter((f) => f.kind === 'their-refuted' || f.kind === 'watch-for').map((f) => f.text).join(' | ') || 0);
  }
  p.kill();
}, 900_000);

describe('Read this position: the opening never waits on another board', () => {
  beforeEach(() => { engine.hang = true; });

  it('on all eleven boards the opening is ready while every other board read hangs', async () => {
    const said: string[] = [];
    for (const b of BOARDS) {
      const first = await Promise.race([staged(b).first, new Promise<string>((r) => setTimeout(() => r('__TIMEOUT__'), 8000))]);
      expect(first, b.id).not.toBe('__TIMEOUT__');
      said.push(first);
    }
    // Every board but the level one whose board gives the standing no reason
    // yet (how-to-ruin-your-pawn-structure#1) opens at once.
    expect(said.filter((t) => t.length > 0).length).toBeGreaterThanOrEqual(10);
  }, 120_000);

  it('the opening is in one order: their threat, the standing, the plans, then the habit', () => {
    expect([...FIRST_WORDS_STEPS]).toEqual(['their-move', 'verdict', 'character', 'plan', 'their-plan']);
    for (const step of FIRST_WORDS_STEPS) expect(READ_STEPS.some((r) => r.step === step), step).toBe(true);
  });

  it('the standing with its why opens the read whenever the board gives it a why', async () => {
    const { boardReadFacts } = await import('./boardReadFacts');
    let reasoned = 0;
    for (const b of BOARDS) {
      const a = analysisOf(b);
      const set = await boardReadFacts({ stage: 'first', fen: b.fen, studentColor: b.fen.split(' ')[1] as 'w' | 'b', rating: 1600, before: a.topLines, read: () => Promise.reject(new Error('the opening reads no other board')), withhold: false, tense: 'now', history: [], theory: true, readTempting: true, engineFutures: false, studentNeedContext: null, story: null });
      const standing = set.facts.find((f) => f.kind === 'standing');
      if (!standing) continue;
      reasoned += 1;
      const first = await staged(b).first;
      // Their threat may come first; then the standing.
      const threat = set.facts.find((f) => f.kind === 'must-defend');
      expect(first.startsWith(standing.text) || (!!threat && first.startsWith(threat.text)), b.id).toBe(true);
    }
    expect(reasoned).toBeGreaterThanOrEqual(6);
  }, 120_000);

  it('the deep part never repeats a sentence of the opening', async () => {
    engine.hang = false;
    let deepSaid = 0;
    for (const b of FRESH) {
      const r = staged(b);
      const [first, deep] = await Promise.all([r.first, r.deep]);
      const opening = new Set(sentences(first));
      for (const s of sentences(deep)) expect(opening.has(s), `${b.id}: ${s}`).toBe(false);
      deepSaid += sentences(deep).length;
    }
    expect(deepSaid).toBeGreaterThan(0);
  }, 400_000);
});

describe('the "watch for" line is said as an "if", from the student\'s seat', () => {
  it('names the best move, their reply with its "…", and the answer', async () => {
    const { renderWatchFor } = await import('./teachingSentence');
    const t = renderWatchFor({ best: 'Rd3', reply: 'd4', because: 'you play Rxd4 — you win a pawn.', mover: 'w', key: 0 });
    expect(t).toBe('After Rd3, watch for …d4: you play Rxd4 — you win a pawn.');
    const b = renderWatchFor({ best: 'Be6', reply: 'c4', because: 'you play Bxc4+', mover: 'b', key: 1 });
    expect(b).toBe('Watch for c4 after …Be6: you play Bxc4+.');
  });
});

// NARRATION TEST — what "Read this position" SAYS on Danya's boards (saved
// engine lines, no engine) and on app puzzles ("Teach me this position":
// the answer withheld). Research tool, never part of the app.
//   npx tsx scripts/danya/narrate-reads.mts <out.jsonl>
import fs from 'node:fs';
import { Chess } from 'chess.js';
import { composePositionRead } from '../../src/services/positionReadComposer';

const out = process.argv[2] ?? 'audit-reports/danya-havecheck/narration-reads.jsonl';
const boards = fs.readFileSync('audit-reports/danya-havecheck/board-facts-2026-11-19-unlocked.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const analysisOf = (lines: Array<{ moves: string[]; cp: number | null; mate: number | null }>) => {
  const top = lines.map((l, i) => ({ rank: i + 1, evaluation: l.mate != null ? (l.mate > 0 ? 100000 : -100000) : (l.cp ?? 0), moves: l.moves, mate: l.mate }));
  const t = top[0];
  return { bestMove: t?.moves[0] ?? '', evaluation: t?.evaluation ?? 0, isMate: t?.mate != null, mateIn: t?.mate ?? null, depth: 16, nodesPerSecond: 0, topLines: top } as never;
};
const read = (fen: string, analysis: never, withhold: string | null) => composePositionRead({
  fen, pgn: '', playerColor: fen.split(' ')[1] === 'w' ? 'white' : 'black', openingName: null, rating: 1400,
  analysis, tacticsSkill: undefined, studentWeaknesses: [], studentNeedContext: null,
  evalBoard: () => Promise.resolve('0'), isCancelled: () => false, corpusNotes: false, withhold, readTempting: withhold === null,
});
const w = fs.createWriteStream(out);
let n = 0;
for (const b of process.env.PUZZLES_ONLY ? [] : boards) {
  const t0 = Date.now();
  let text = '';
  try { text = await read(b.fen, analysisOf(b.lines ?? []), null); } catch (e) { text = `ERROR ${String(e).slice(0, 120)}`; }
  w.write(JSON.stringify({ kind: 'board', id: b.id, fen: b.fen, best: b.best, ms: Date.now() - t0, read: text }) + '\n');
  if (++n % 20 === 0) console.log('boards', n);
}
const puzzles = JSON.parse(fs.readFileSync('src/data/puzzles.json', 'utf8')) as Array<{ id: string; fen: string; moves: string; rating: number; themes: string[] }>;
const pick = [400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200].flatMap((r) => puzzles.filter((p) => p.rating >= r && p.rating < r + 200).slice(0, 4));
for (const p of pick) {
  const ms = p.moves.split(' ');
  const c = new Chess(p.fen);
  try { c.move({ from: ms[0].slice(0, 2), to: ms[0].slice(2, 4), promotion: ms[0][4] }); } catch { continue; }
  const fen = c.fen();
  let sol = '';
  try { sol = new Chess(fen).move({ from: ms[1].slice(0, 2), to: ms[1].slice(2, 4), promotion: ms[1][4] }).san; } catch { continue; }
  const mate = p.themes.includes('mate') ? Math.ceil((ms.length - 1) / 2) : null;
  let text = '';
  // Scores are White's point of view (the app's StockfishAnalysis): the
  // solver wins, so the sign follows the side to move.
  const sgn = fen.split(' ')[1] === 'w' ? 1 : -1;
  try { text = await read(fen, analysisOf([{ moves: ms.slice(1), cp: mate ? null : 400 * sgn, mate: mate ? mate * sgn : null }]), sol); } catch (e) { text = `ERROR ${String(e).slice(0, 120)}`; }
  w.write(JSON.stringify({ kind: 'puzzle', id: p.id, rating: p.rating, themes: p.themes, fen, answer: sol, read: text }) + '\n');
}
w.end();
console.log('done', n, 'boards', pick.length, 'puzzles');

// FAMOUS-TRAP RECALL: of the traps every club player is told about, how many the
// one trap computer calls a TRAP (a piece or mate by the engine at the quiet end
// of the forced line) — and for each, the sentence `trapLine` writes. A trap the
// computer calls a known mistake (Blackburne, Mortimer, Noah's Ark, Fried Liver:
// the engine reads under +3) is reported as such, never forced over the bar.
//   TRAP_RECALL=1 npx vitest run src/services/trapRecall.measure.test.ts
import { describe, it } from 'vitest';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync, appendFileSync, readFileSync } from 'node:fs';
import { classifySlip } from './trapComputer';
import { trapLine } from './trapLine';
import { MATE_CP } from './mateScale';
import { knownSlipsAt, knownSlipIndexNow, setKnownSlipIndexForTests } from './knownSlips';
import { ITALIAN_GAME_TRAP_LESSONS } from '../data/lessons/italianGameTrapLessons';
import { RUY_TRAP_LESSONS } from '../data/lessons/ruyTrapLessons';
import { CARO_TRAP_LESSONS } from '../data/lessons/caroKannTrapLessons';
import type { LessonScript } from '../types';

import { FAMOUS, WIKI_LIST, WIKI_EXTRA } from '../test/famousTrapRecallSet';

// THE NAMED-TRAP LESSONS: each lesson's slip, from the seat the lesson teaches
// (a weapon: the opponent slips; a warning: the student must not). The line is
// checked against the lesson's own moves so the measure cannot drift from it.
interface Lesson { id: string; line: string; slip: string; seat: 'student' | 'opponent' }
const LESSONS: Lesson[] = [
  { id: 'legals-mate', line: 'e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4 h3', slip: 'Bh5', seat: 'opponent' },
  { id: 'fried-liver', line: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5', slip: 'Nxd5', seat: 'opponent' },
  { id: 'tarrasch', line: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 c3 Be7 Re1 O-O Nd4', slip: 'Qd7', seat: 'opponent' },
  { id: 'blackburne-shilling', line: 'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5 Qg5', slip: 'Nxf7', seat: 'student' },
  { id: 'noahs-ark', line: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 b5 Bb3 d6 d4 Nxd4 Nxd4 exd4', slip: 'Qxd4', seat: 'student' },
  { id: 'mortimer', line: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Ne7', slip: 'Nxe5', seat: 'student' },
  { id: 'fishing-pole', line: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Ng4 h3 h5', slip: 'hxg4', seat: 'student' },
  { id: 'karpov-qe2-mate', line: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2', slip: 'Ngf6', seat: 'student' },
];

// The full network, not the lite one: the bar is read by the strongest engine
// the repo ships (the lite net read the Halosar at +2.8, the full one +3.3).
const ENGINE = 'node_modules/stockfish/bin/stockfish-18-single.js';
const DEPTH = Number(process.env.TRAP_RECALL_DEPTH ?? 20);
/** One engine read, waited on to its bestmove (the bar is read at depth, not a
 *  timer): the score for the side to move and its line. */
const stockfish = (fen: string): Promise<{ cp: number; best: string[] }> => new Promise((resolve) => {
  const p = spawn('node', [ENGINE]);
  let out = '';
  const done = (): void => {
    const last = [...out.matchAll(/info depth \d+ .*?score (cp|mate) (-?\d+).*? pv ([^\n]+)/g)].pop();
    p.kill();
    if (!last) { resolve({ cp: 0, best: [] }); return; }
    const v = Number(last[2]);
    resolve({ cp: last[1] === 'mate' ? (v > 0 ? MATE_CP : -MATE_CP) : v, best: last[3].trim().split(/\s+/).slice(0, 10) });
  };
  const timer = setTimeout(done, 180_000);
  p.stdout.on('data', (d: Buffer) => { out += d.toString(); if (/\nbestmove /.test(out)) { clearTimeout(timer); done(); } });
  p.stdin.write(`uci\nsetoption name Hash value 64\nposition fen ${fen}\ngo depth ${DEPTH}\n`);
});
/** The punisher's read AT THE QUIET END OF THE FORCED LINE (the bar's own
 *  definition): the engine's line from the board after the slip, played
 *  while its moves capture or check, then read again on that quiet board —
 *  from the punisher's seat. */
const punishAfter = async (fen: string): Promise<{ cp: number; seq: string[] }> => {
  const read = await stockfish(fen);
  const seq: string[] = []; const p = new Chess(fen);
  for (const u of read.best) { try { seq.push(p.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; } }
  if (Math.abs(read.cp) >= MATE_CP / 10) return { cp: read.cp, seq };
  const q = new Chess(fen);
  let forced = 0;
  for (const san of seq) {
    const m = q.move(san);
    if (!m.captured && !q.inCheck()) { q.undo(); break; }
    forced += 1;
  }
  if (forced === 0) return { cp: read.cp, seq };
  const quiet = await stockfish(q.fen());
  // The quiet board's side to move is the punisher after an even count of
  // forced plies, the slipper after an odd one.
  return { cp: forced % 2 === 0 ? quiet.cp : -quiet.cp, seq };
};
const lessonMoves = (l: LessonScript | undefined): string => {
  const last = l?.beats[l.beats.length - 1] as unknown as { moves?: string[] | string } | undefined;
  return Array.isArray(last?.moves) ? last.moves.join(' ') : (last?.moves ?? '');
};

describe.runIf(!!process.env.TRAP_RECALL && existsSync('node_modules/stockfish/bin/stockfish-18-single.js'))('famous-trap recall', () => {
  it('reports which the one computer calls a trap', async () => {
    const rows: string[] = [];
    let traps = 0;
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/theory-trap-recall.progress', '');
    setKnownSlipIndexForTests((JSON.parse(readFileSync('public/data/club-gems.json', 'utf8')) as { boards: never }).boards);
    let wikiTraps = 0;
    for (const f of [...FAMOUS, ...WIKI_EXTRA]) {
      const c = new Chess();
      let ok = true;
      for (const s of f.line.split(' ')) { try { c.move(s); } catch { ok = false; break; } }
      if (!ok) { rows.push(`${f.name}: LINE DOES NOT PLAY`); continue; }
      const fenBefore = c.fen();
      try { c.move(f.slip); } catch { rows.push(`${f.name}: SLIP ILLEGAL`); continue; }
      // The punisher's read, from their own seat (the side to move now).
      // THE APP'S OWN READ FIRST: the known-slip index the Theory lecture and
      // Review speak from (`knownSlipsAt`, its quiet-end reads at depth 22).
      // Only a slip the index does not hold is read by the engine here.
      const indexed = knownSlipsAt(knownSlipIndexNow(), fenBefore).find((g) => g.slip.replace(/[+#]$/, '') === f.slip.replace(/[+#]$/, ''));
      const pr = indexed ? { cp: indexed.mate ? MATE_CP : indexed.endCp, seq: indexed.punish.split(' ') } : await punishAfter(c.fen());
      const read = { cp: pr.cp };
      const punishSeq = f.punish ? f.punish.split(' ') : pr.seq;
      const source = indexed ? 'index' : 'engine';
      const kind = classifySlip({ engineCp: read.cp, line: { fen: fenBefore, slip: f.slip, punish: punishSeq } });
      if (kind === 'trap' && FAMOUS.includes(f)) traps += 1;
      if (kind === 'trap' && WIKI_LIST.has(f.name)) wikiTraps += 1;
      const sentence = trapLine({ fen: fenBefore, slip: f.slip, punish: punishSeq, slipBy: 'opponent' })?.text ?? '(no blow to name)';
      appendFileSync('audit-reports/theory-trap-recall.progress', `${f.name}\n`);
      rows.push(`${f.name}: ${kind ?? 'not a slip'} (${read.cp >= MATE_CP / 10 ? 'mate' : `${read.cp}cp`}, ${source}) — ${sentence}`);
    }
    // The named-trap lessons: the lesson's slip is called a slip by the one
    // computer, and worded from the lesson's seat ("trap" never for the student).
    const all = { ...ITALIAN_GAME_TRAP_LESSONS, ...RUY_TRAP_LESSONS, ...CARO_TRAP_LESSONS } as Record<string, LessonScript>;
    let work = 0;
    const lrows: string[] = [];
    for (const l of LESSONS) {
      const own = lessonMoves(all[l.id]);
      // The lesson's own moves up to the slip: a warning lesson plays the right
      // move where the slip would go, so the line may leave it in its last two
      // plies (the slip's own approach), never before.
      const ownMoves = own.split(' ');
      const mine = l.line.split(' ');
      const firstDiff = mine.findIndex((m, k) => ownMoves[k] !== m);
      const shared = own.length > 0 && (firstDiff === -1 || firstDiff >= mine.length - 2);
      const c = new Chess();
      for (const s of l.line.split(' ')) c.move(s);
      const fenBefore = c.fen();
      c.move(l.slip);
      const r = await punishAfter(c.fen());
      const kind = classifySlip({ engineCp: r.cp, line: { fen: fenBefore, slip: l.slip, punish: r.seq } });
      const t = trapLine({ fen: fenBefore, slip: l.slip, punish: r.seq, slipBy: l.seat });
      const seatOk = !t || l.seat === 'opponent' || !/trap/i.test(t.text);
      const ok = shared && !!kind && !!t && seatOk;
      if (ok) work += 1;
      lrows.push(`${l.id}: ${ok ? 'works' : 'FAILS'} (${kind ?? 'not a slip'}${shared ? '' : ', line not the lesson\'s'}${seatOk ? '' : ', wrong-seat wording'}) — ${t?.text ?? '(no sentence)'}`);
    }
    mkdirSync('audit-reports', { recursive: true });
    const text = `Famous traps called a trap: ${traps} of ${FAMOUS.length}\nWikipedia's List of chess traps called a trap: ${wikiTraps} of ${WIKI_LIST.size}\n${rows.join('\n')}\n\nNamed-trap lessons that work: ${work} of ${LESSONS.length}\n${lrows.join('\n')}\n`;
    writeFileSync('audit-reports/theory-trap-recall.md', text);
    console.log(text);
  }, 7_200_000);
});

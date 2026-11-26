// FAMOUS-TRAP RECALL: of the traps every club player is told about, how many the
// one trap computer calls a TRAP (a piece or mate by the engine at the quiet end
// of the forced line) — and for each, the sentence `trapLine` writes. A trap the
// computer calls a known mistake (Blackburne, Mortimer, Noah's Ark, Fried Liver:
// the engine reads under +3) is reported as such, never forced over the bar.
//   TRAP_RECALL=1 npx vitest run src/services/trapRecall.measure.test.ts
import { describe, it } from 'vitest';
import { Chess } from 'chess.js';
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { classifySlip } from './trapComputer';
import { trapLine } from './trapLine';
import { MATE_CP } from './mateScale';

interface Famous { name: string; line: string; slip: string; slipBy: 'w' | 'b' }
const FAMOUS: Famous[] = [
  { name: "Légal's mate", line: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5', slip: 'Bxd1', slipBy: 'b' },
  { name: "Scholar's mate", line: 'e4 e5 Bc4 Nc6 Qh5', slip: 'Nf6', slipBy: 'b' },
  { name: "Fool's mate", line: 'f3 e5', slip: 'g4', slipBy: 'w' },
  { name: 'Elephant Trap', line: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5', slip: 'Nxd5', slipBy: 'w' },
  { name: 'Englund Gambit trap', line: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Bc3 Bb4 Qd2', slip: 'Bxc3', slipBy: 'b' },
  { name: 'Lasker Trap (Albin)', line: 'd4 d5 c4 e5 dxe5 d4 e3 Bb4+ Bd2 dxe3', slip: 'Bxb4', slipBy: 'w' },
  { name: 'Blackburne Shilling', line: 'e4 e5 Nf3 Nc6 Bc4', slip: 'Nd4', slipBy: 'b' },
  { name: "Noah's Ark", line: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 d4 b5 Bb3 Nxd4 Nxd4 exd4 Qxd4 c5 Qd5 Be6 Qc6+ Bd7 Qd5', slip: 'c4', slipBy: 'b' },
  { name: 'Fried Liver', line: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5', slip: 'Nxf7', slipBy: 'w' },
  { name: 'Damiano Defence', line: 'e4 e5 Nf3', slip: 'f6', slipBy: 'b' },
  { name: 'Parham Attack (Qh5)', line: 'e4 e5 Qh5', slip: 'Nc6', slipBy: 'b' },
  { name: 'Monkey Trap', line: 'e4 e5 Nf3 d6 Bc4 Nc6 Nc3 Bg4', slip: 'Nxe5', slipBy: 'w' },
];
const ENGINE = 'node_modules/stockfish/bin/stockfish-18-lite-single.js';
const stockfish = (fen: string): { cp: number; best: string[] } => {
  // The WASM build reads UCI from stdin and quits at EOF, so stdin is held open
  // while the search runs.
  const out = execFileSync('bash', ['-c', `(printf 'uci\\nposition fen ${fen}\\ngo depth 14\\n'; sleep 9) | timeout 30 node ${ENGINE}`], { timeout: 60_000, maxBuffer: 64 * 1024 * 1024 }).toString();
  const last = [...out.matchAll(/info depth 14 .*?score (cp|mate) (-?\d+).*? pv ([^\n]+)/g)].pop();
  if (!last) return { cp: 0, best: [] };
  const v = Number(last[2]);
  return { cp: last[1] === 'mate' ? (v > 0 ? MATE_CP : -MATE_CP) : v, best: last[3].trim().split(/\s+/).slice(0, 8) };
};

describe.runIf(!!process.env.TRAP_RECALL && existsSync('node_modules/stockfish/bin/stockfish-18-lite-single.js'))('famous-trap recall', () => {
  it('reports which the one computer calls a trap', () => {
    const rows: string[] = [];
    let traps = 0;
    for (const f of FAMOUS) {
      const c = new Chess();
      let ok = true;
      for (const s of f.line.split(' ')) { try { c.move(s); } catch { ok = false; break; } }
      if (!ok) { rows.push(`${f.name}: LINE DOES NOT PLAY`); continue; }
      const fenBefore = c.fen();
      try { c.move(f.slip); } catch { rows.push(`${f.name}: SLIP ILLEGAL`); continue; }
      // The punisher's read, from their own seat (the side to move now).
      const read = stockfish(c.fen());
      const punishSeq = []; const p = new Chess(c.fen());
      for (const u of read.best) { try { const m = p.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); punishSeq.push(m.san); } catch { break; } }
      const kind = classifySlip({ engineCp: read.cp, line: { fen: fenBefore, slip: f.slip, punish: punishSeq } });
      if (kind === 'trap') traps += 1;
      const sentence = trapLine({ fen: fenBefore, slip: f.slip, punish: punishSeq, slipBy: 'opponent' })?.text ?? '(no blow to name)';
      rows.push(`${f.name}: ${kind ?? 'not a slip'} (${read.cp >= MATE_CP / 10 ? 'mate' : `${read.cp}cp`}) — ${sentence}`);
    }
    mkdirSync('audit-reports', { recursive: true });
    const text = `Famous traps called a trap: ${traps} of ${FAMOUS.length}\n${rows.join('\n')}\n`;
    writeFileSync('audit-reports/theory-trap-recall.md', text);
    console.log(text);
  }, 600_000);
});

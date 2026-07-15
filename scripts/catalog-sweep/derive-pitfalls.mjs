// Pitfall derivation for the 6 openings missing common-mistakes entries.
// At each student-to-move ply on the mainline: MultiPV scan; candidate
// wrong moves = natural-looking alternatives (captures/checks/castle/minor
// developments/central pushes) whose eval drops >=100cp vs the line move.
import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import fs from 'fs';

const SF = '/usr/games/stockfish';
function evalMulti(fen, ms = 7000, lines = 10) {
  return new Promise((res) => {
    const sf = spawn(SF);
    const pv = {};
    sf.stdout.on('data', (d) => {
      for (const line of d.toString().split('\n')) {
        const m = line.match(/multipv (\d+) score (cp|mate) (-?\d+).* pv (\S+)(?: (\S+))?(?: (\S+))?/);
        if (m) pv[m[4]] = { score: m[2] === 'mate' ? (Number(m[3]) > 0 ? 9999 : -9999) : Number(m[3]), reply: m[5] ?? '', reply2: m[6] ?? '' };
        if (line.startsWith('bestmove')) { sf.kill(); res(pv); }
      }
    });
    sf.stdin.write(`setoption name MultiPV value ${lines}\nposition fen ${fen}\ngo movetime ${ms}\n`);
  });
}
const TARGETS = [
  { id: 'schliemann-defence', pgn: 'e4 e5 Nf3 Nc6 Bb5 f5 Nc3 fxe4 Nxe4 d5 Nxe5 dxe4 Nxc6 Qg5 Qe2 Nf6 f4 Qxf4 Nxa7+ c6', student: 'b' },
  { id: 'pro-caruana-nimzo-indian', pgn: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d6 Bg5 h6 Bh4 g5 Bg3 Ne4', student: 'b' },
  { id: 'pro-caruana-french', pgn: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 a6 Nf3 c5', student: 'b' },
  { id: 'pro-caruana-kid', pgn: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6', student: 'b' },
  { id: 'pro-carlsen-caro-kann', pgn: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 a5 O-O a4 Nc3 Nd7', student: 'b' },
  { id: 'pro-carlsen-reti', pgn: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4 Nc6', student: 'w' },
];
function isNaturalSan(san) {
  if (san.includes('x') || san.includes('+') || san === 'O-O' || san === 'O-O-O') return true;
  if (/^[NB][a-h]?[1-8]?[a-h][1-8]$/.test(san)) return true; // minor development/hop
  if (/^[cde][45]$/.test(san) || /^[cdef][3-6]$/.test(san)) return true; // central-ish pushes
  if (/^Q[a-h][1-8]$/.test(san)) return true; // queen sorties (classic mistakes)
  return false;
}
const out = {};
for (const t of TARGETS) {
  const sans = t.pgn.trim().split(/\s+/);
  const cands = [];
  const c = new Chess();
  for (let i = 0; i < sans.length; i++) {
    if (c.turn() === t.student && i >= 4) {
      const fen = c.fen();
      const pv = await evalMulti(fen, 6000, 10);
      // uci of the line move
      const lineMove = c.move(sans[i]);
      const lineUci = lineMove.from + lineMove.to + (lineMove.promotion ?? '');
      c.undo();
      const lineScore = pv[lineUci]?.score;
      if (lineScore != null) {
        for (const [uci, rec] of Object.entries(pv)) {
          if (uci === lineUci) continue;
          const drop = lineScore - rec.score; // both from side-to-move POV
          if (drop >= 100) {
            const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
            if (!mv) continue;
            const san = mv.san;
            c.undo();
            if (isNaturalSan(san)) cands.push({ ply: i, fen, wrongSan: san, correctSan: sans[i], dropCp: drop, refute: rec.reply });
          }
        }
      }
    }
    c.move(sans[i]);
  }
  cands.sort((a, b) => b.dropCp - a.dropCp);
  out[t.id] = cands.slice(0, 8);
  console.log(`\n=== ${t.id}: ${cands.length} candidates`);
  for (const x of out[t.id]) console.log(`  ply${x.ply} ${x.wrongSan} (drop ${x.dropCp}cp, refuted by ${x.refute}) — correct ${x.correctSan}`);
}
fs.writeFileSync('audit-reports/masterclass-sweep/pitfall-candidates.json', JSON.stringify(out, null, 1));
console.log('\nDONE');

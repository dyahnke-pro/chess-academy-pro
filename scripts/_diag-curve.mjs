#!/usr/bin/env node
// READ-ONLY: full per-ply eval curve (student perspective) for specific lines.
// At every STUDENT ply, also report engine-best move + its eval, so the first
// ply where best-play still held but the taught move dropped it = the true break.
import { Chess } from 'chess.js'; import { spawn } from 'child_process';
const SF = '/usr/games/stockfish';
function engine(fen, depth = 18, ms = 8000) {
  return new Promise(res => { const sf = spawn(SF); let cp = null, best = null;
    sf.stdout.on('data', d => { const s = d.toString();
      const m = s.match(/score cp (-?\d+)/g); if (m) cp = parseInt(m[m.length-1].match(/-?\d+/)[0]);
      const mt = s.match(/score mate (-?\d+)/); if (mt) cp = parseInt(mt[1])>0?10000:-10000;
      const bm = s.match(/bestmove (\w+)/); if (bm) { best = bm[1]; sf.kill(); res({cp,best}); } });
    sf.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
    setTimeout(()=>{try{sf.kill()}catch{};res({cp,best})}, ms); });
}
const sanOf = (fen,uci)=>{const c=new Chess(fen);const mv=c.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});return mv?mv.san:uci;};

const LINES = {
  'Pirc Austrian':       {s:'b', m:'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5 Nc7 a4 Rb8 Qe1 b6'},
  'Pirc Czech':          {s:'b', m:'e4 d6 d4 Nf6 Nc3 c6 f4 Qa5 Bd3 e5 Nf3 Bg4 Be3 Nbd7 O-O Be7 h3 Bxf3 Qxf3 O-O'},
  'Old Indian Be2':      {s:'b', m:'d4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Qc2 Re8 Rd1 Bf8 d5 c5'},
  'Old Indian Czech':    {s:'b', m:'d4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Re1 Qc7 Bf1 Re8 d5 c5'},
  'Benoni Taimanov':     {s:'b', m:'d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7 a4 O-O Nf3 Na6 O-O Nc7 Bd3 a6'},
  'Chinese Dragon':      {s:'b', m:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rb8 Bb3 b5'},
};
for (const [name, {s, m}] of Object.entries(LINES)) {
  const moves = m.split(' '); const c = new Chess(); const row = [];
  for (let i=0;i<moves.length;i++){
    const before = c.fen();
    const mv = c.move(moves[i]);
    const after = c.fen();
    let tag = '';
    if (mv.color === s) { // student just moved: was a better move available at `before`?
      const { cp: bcp, best } = await engine(before, 20, 9000);
      const bp = (new Chess(before).turn()===s)?bcp:-bcp;
      const { cp: acp } = await engine(after, 18, 7000);
      const ap = (c.turn()===s)?acp:-acp;
      const bestSan = best?sanOf(before,best):'?';
      const loss = bp - ap;
      tag = `  best=${bestSan}(${bp}) taught=${moves[i]}(${ap}) ${loss>=40?`<<< -${loss}cp`:''}`;
      row.push(`  ${String(i+1).padStart(2)}. ${moves[i].padEnd(6)} ${String(ap).padStart(5)}cp${tag}`);
    }
  }
  console.log(`\n### ${name} (student=${s})`);
  console.log(row.join('\n'));
}
console.log('\n[curve complete]');

// COACH REPLAY (David 2026-10-05: "go through a video speed run and see how
// close we are to his narrations"). Replays a real speed-run game ply by ply and
// prints what the insight computers say — the hint register (positionAsk) before
// every student move, what their move changed, and moveMissed on a student
// slip. Opt-in (spawns an engine): REPLAY_LINE="e4 e5 ..." REPLAY_SIDE=white.
import { it } from 'vitest';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { moveMissed, positionAsk, theirMoveChanged } from './moveInsight';
import { depthClauses } from './thinkAloud';
import { moveWhy } from './deliberation';

function engine() {
  const p = spawn('node', ['/home/user/wt-upnext/node_modules/stockfish/bin/stockfish-18-lite-single.js']);
  let buf = ''; let pv: string[] = []; let cp: number | null = null; let mate: number | null = null; let second: { pv: string[]; cp: number | null; mate: number | null } | null = null; let res: ((v: { pv: string[]; cp: number | null; mate: number | null; second: { pv: string[]; cp: number | null; mate: number | null } | null }) => void) | null = null;
  p.stdout.on('data', (d) => {
    buf += String(d); let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const l = buf.slice(0, i); buf = buf.slice(i + 1);
      const m = l.match(/ pv (.+)$/); if (m) { const c = l.match(/score cp (-?\d+)/); const mt = l.match(/score mate (-?\d+)/); const v = { pv: m[1].trim().split(' '), cp: c ? +c[1] : null, mate: mt ? +mt[1] : null }; if (/ multipv 2 /.test(l)) second = v; else { pv = v.pv; cp = v.cp; mate = v.mate; } }
      if (/^bestmove/.test(l) && res) { const r = res; res = null; r({ pv, cp, mate, second }); }
    }
  });
  p.stdin.write('uci\nsetoption name MultiPV value 2\nisready\n');
  return {
    go: (fen: string) => new Promise<{ pv: string[]; cp: number | null; mate: number | null; second: { pv: string[]; cp: number | null; mate: number | null } | null }>((r) => { pv = []; cp = null; mate = null; second = null; res = r; p.stdin.write(`position fen ${fen}\ngo depth 12\n`); }),
    quit: () => p.kill(),
  };
}
const score = (r: { cp: number | null; mate: number | null }): number => r.mate != null ? (r.mate > 0 ? 10000 : -10000) : r.cp ?? 0;

it.skipIf(!process.env.REPLAY_LINE)('replay a speed-run game through the coach', async () => {
  const sans = (process.env.REPLAY_LINE ?? '').trim().split(/\s+/);
  const student = (process.env.REPLAY_SIDE ?? 'white') === 'white' ? 'w' : 'b';
  const e = engine();
  const c = new Chess();
  const out: string[] = [];
  let prev: { fenBefore: string; san: string } | undefined;
  let fenTwoBack: string | undefined;
  let fenOneBack: string | undefined;
  for (let i = 0; i < sans.length; i += 1) {
    const fen = c.fen();
    const mover = c.turn();
    const before = await e.go(fen);
    const bestUci = before.pv[0];
    const bestSan = (() => { try { return new Chess(fen).move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci[4] }).san; } catch { return undefined; } })();
    const mv = c.move(sans[i]);
    const ply = `${Math.floor(i / 2) + 1}${mover === 'w' ? '.' : '...'}${mv.san}`;
    const lines: string[] = [];
    if (mover === student) {
      const ask = positionAsk(fen, { bestSan, lastMove: prev });
      if (ask.text) lines.push(`ASK[${ask.mode}] ${ask.text}`);
      // THE DOOR'S PIECES: the best move's why (deliberation) + the depth facts.
      const pv = before.pv;
      const why = bestSan ? moveWhy(fen, bestSan, student, null) : null;
      const critical = !!before.second && Math.abs(score(before) - score(before.second)) >= 80 && Math.abs(score(before)) < 500;
      const depth = depthClauses({ fen, history: sans.slice(0, i), topLines: [{ moves: pv, evaluation: score(before) * (student === 'w' ? 1 : -1), mate: null }], studentColor: student, nameMove: critical, ...(i >= 2 ? { lastStudentMove: { fenBefore: fenTwoBack ?? fen, san: sans[i - 2] } } : {}) });
      const said = [why ? `The move is ${bestSan} — it ${why}.` : '', ...depth.map((d) => d.text)].filter(Boolean).join(' ');
      if (said) lines.push(`THINK${critical ? '*' : ''}(${said.split(/\s+/).length}w) ${said}`);
      const after = await e.go(c.fen());
      const loss = score(before) + score(after);   // both from the mover's view: before (mover) vs after (opponent)
      // A decided position (mate or ±5 either side) is not a slip worth naming.
      const decided = Math.abs(score(before)) >= 500 && Math.abs(score(after)) >= 500 && Math.sign(score(before)) === -Math.sign(score(after));
      if (loss >= 100 && !decided) {
        const miss = moveMissed(fen, mv.san, after.pv);
        lines.push(`SLIP ${loss}cp (best ${bestSan}) ${miss ? `${miss.text} [${miss.tag}]` : '(no miss sentence)'}`);
      }
    } else {
      const ch = theirMoveChanged(fen, mv.san, student);
      if (ch) lines.push(`THEIR MOVE ${ch.text}`);
    }
    out.push(`${ply}${lines.length ? `\n  ${lines.join('\n  ')}` : ''}`);
    prev = { fenBefore: fen, san: mv.san };
    fenTwoBack = fenOneBack;
    fenOneBack = fen;
  }
  e.quit();
  writeFileSync(process.env.REPLAY_OUT ?? '/tmp/replay.txt', out.join('\n'));
}, 1800000);

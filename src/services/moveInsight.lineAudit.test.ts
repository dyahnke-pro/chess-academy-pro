// LINE AUDIT (David 2026-10-05: "Play the line out, is the narration accurate to
// the longer line?"). Real puzzles from puzzles.json; the natural wrong tries
// (checks, captures); Stockfish extends each to depth 12; every moveMissed claim
// is checked against the FULL line. Opt-in (spawns an engine): LINE_AUDIT=1.
// Measured 2026-10-05: 12/45 wrong when the claim read 5 plies → 0/46 after.
import { it } from 'vitest';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
import puzzles from '../data/puzzles.json';
import { moveMissed } from './moveInsight';
import { settledNetForLine } from './exchangeLedger';

function engine() {
  const p = spawn('node', ['/home/user/wt-upnext/node_modules/stockfish/bin/stockfish-18-lite-single.js']);
  let buf = ''; let pv: string[] = []; let cp: number | null = null; let mate: number | null = null; let res: ((v: { pv: string[]; cp: number | null; mate: number | null }) => void) | null = null;
  p.stdout.on('data', (d) => {
    buf += String(d); let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const l = buf.slice(0, i); buf = buf.slice(i + 1);
      const m = l.match(/ pv (.+)$/); if (m && / multipv 1 | depth /.test(l)) { pv = m[1].trim().split(' '); const c = l.match(/score cp (-?\d+)/); const mt = l.match(/score mate (-?\d+)/); cp = c ? +c[1] : null; mate = mt ? +mt[1] : null; }
      if (/^bestmove/.test(l) && res) { const r = res; res = null; r({ pv, cp, mate }); }
    }
  });
  p.stdin.write('uci\nisready\n');
  return {
    go: (fen: string) => new Promise<{ pv: string[]; cp: number | null; mate: number | null }>((r) => { pv = []; cp = null; mate = null; res = r; p.stdin.write(`position fen ${fen}\ngo depth 12\n`); }),
    quit: () => p.kill(),
  };
}
function sans(fen: string, ucis: string[]): string[] { const c = new Chess(fen); const o: string[] = []; for (const u of ucis) { try { const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); if (!m) break; o.push(m.san); } catch { break; } } return o; }

it.skipIf(!process.env.LINE_AUDIT)('narration vs the longer line', async () => {
  const e = engine();
  const list = (puzzles as Array<{ fen: string; moves: string }>).slice(0, 60);
  let claims = 0; const bad: string[] = []; const counts: Record<string, number> = {};
  for (const pz of list) {
    const c = new Chess(pz.fen); const ms = pz.moves.split(' ');
    try { c.move({ from: ms[0].slice(0, 2), to: ms[0].slice(2, 4), promotion: ms[0][4] }); } catch { continue; }
    const P = c.fen(); const me = c.turn();
    const tries = c.moves({ verbose: true }).filter((m) => (m.captured || m.san.includes('+')) && `${m.from}${m.to}` !== ms[1].slice(0, 4)).slice(0, 3);
    for (const t of tries) {
      const after = new Chess(P); after.move(t.san);
      if (after.isGameOver()) continue;
      const r = await e.go(after.fen());
      const m = moveMissed(P, t.san, r.pv);
      if (!m) continue;
      claims += 1;
      const full = [t.san, ...sans(after.fen(), r.pv)];
      const net = settledNetForLine(P, full, me);
      const evalMe = r.mate != null ? (r.mate > 0 ? -10000 : 10000) : r.cp != null ? -r.cp : 0; // engine scores the side to move (them)
      const kind = /checks, but the king steps/.test(m.text) ? 'check-nothing' : /come out/.test(m.text) ? 'down' : /trap it/.test(m.text) ? 'trap' : /takes, but they take back/.test(m.text) ? 'takeback' : /with no guard|short of guards/.test(m.text) ? 'drawback' : 'other';
      counts[kind] = (counts[kind] ?? 0) + 1;
      let wrong = '';
      if (kind === 'check-nothing' && (evalMe > 150 || (net ?? 0) > 0)) wrong = `says nothing follows; full line net=${net} eval=${evalMe}`;
      if (kind === 'down') { const said = m.text.match(/come out (.+?) down/)?.[1]; if ((net ?? 0) > -1) wrong = `says "${said}" down; full line net=${net}`; else if (said && !said.startsWith('more than a queen') && !said.includes(String(-(net ?? 0))) && !(said === 'a pawn' && net === -1) && !(said === 'two pawns' && net === -2)) wrong = `says "${said}" down; full line net=${net}`; }
      if (kind === 'takeback' && (net ?? 0) > 0) wrong = `says gained nothing; full net=${net}`;
      if (kind === 'drawback' && (net ?? 0) >= 0 && evalMe > -100) wrong = `says the reply takes it; full net=${net} eval=${evalMe}`;
      if (wrong) bad.push(`${P} | ${t.san} | ${m.text} || ${wrong} || line ${full.slice(0, 10).join(' ')}`);
    }
  }
  e.quit();
  console.log('CLAIMS', claims, JSON.stringify(counts), 'MISMATCH', bad.length);
  for (const b of bad) console.log('BAD', b);
  if (bad.length > 0) throw new Error(`${bad.length} claims disagree with the longer line`);
}, 600000);

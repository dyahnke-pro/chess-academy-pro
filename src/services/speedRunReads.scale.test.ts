// THE SCALE REPLAY (opt-in: SCALE=1, spawns an engine): his real games, every
// student-to-move position through the real position-facts door and the voice's
// board check. Fails if any speed-run read is rejected as untrue on the board.
import { it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { computePositionFacts } from './positionFacts';
import { buildVoicePackage } from './voicePackage';
it.skipIf(!process.env.SCALE)('every speed-run read survives the board check across his games', async () => {
  const all = JSON.parse(readFileSync('public/data/pro-game-references.json', 'utf8')) as Array<{ playerId: string; studentSide: string; pgn: string }>;
  const games = all.filter((g) => g.playerId === 'naroditsky').filter((_, i) => i % 25 === 0).slice(0, Number(process.env.N ?? 20));
  const sf = spawn('node', ['/home/user/wt-upnext/node_modules/stockfish/bin/stockfish-18-lite-single.js']);
  let buf = ''; sf.stdout.on('data', (d: Buffer) => { buf += d.toString(); });
  const send = (c: string) => sf.stdin.write(c + '\n');
  send('uci'); send('setoption name MultiPV value 3'); send('isready');
  const analyse = (fen: string) => new Promise<Array<{ rank: number; moves: string[]; evaluation: number; mate: number | null }>>((res) => {
    buf = ''; send(`position fen ${fen}`); send('go depth 9');
    const t = setInterval(() => {
      if (!buf.includes('bestmove')) return;
      clearInterval(t);
      const L: Record<number, { moves: string[]; evaluation: number; mate: number | null }> = {};
      const w = fen.split(' ')[1] === 'w';
      for (const l of buf.split('\n')) { const m = l.match(/multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)$/); if (m) { const v = Number(m[3]); L[Number(m[1])] = { moves: m[4].trim().split(' '), evaluation: m[2] === 'cp' ? (w ? v : -v) : (w ? 1 : -1) * Math.sign(v) * 10000, mate: m[2] === 'mate' ? (w ? v : -v) : null }; } }
      res(Object.keys(L).sort().map((k, i) => ({ rank: i + 1, ...L[Number(k)] })));
    }, 15);
  });
  const kinds: Record<string, number> = {}; const drops: Record<string, number> = {}; let positions = 0; let words = 0;
  for (const g of games) {
    const me = g.studentSide === 'white' ? 'w' : 'b';
    const c = new Chess(); const sans = g.pgn.trim().split(/\s+/).slice(0, 80);
    for (let i = 0; i < sans.length; i++) {
      if (c.turn() === me && !c.isGameOver()) {
        positions++;
        const tl = await analyse(c.fen());
        if (tl.length) {
          const pf = await computePositionFacts({ posture: 'walk', fen: c.fen(), moverColor: me, studentColor: me, rating: 1200, history: sans.slice(0, i), analysis: { bestMove: tl[0].moves[0], evaluation: tl[0].evaluation, isMate: tl[0].mate != null, mateIn: tl[0].mate, depth: 9, topLines: tl, nodesPerSecond: 0 } as never, evalBoard: async () => null, studentWeaknesses: [] } as never).catch(() => null);
          for (const cl of pf?.clauses ?? []) {
            kinds[cl.kind] = (kinds[cl.kind] ?? 0) + 1;
            words += cl.text.split(/\s+/).length;
            const pkg = buildVoicePackage([{ kind: 'computed', text: cl.text, fen: c.fen(), squares: cl.squares }]);
            if (!pkg.kept.length || pkg.spoken.length < cl.text.length * 0.6) { const k = `${cl.kind} | ${cl.text.slice(0, 110)} | ${c.fen()}`; drops[k] = (drops[k] ?? 0) + 1; }
          }
        }
      }
      try { c.move(sans[i]); } catch { break; }
    }
  }
  sf.kill();
  console.log('POS', positions, 'words/pos', Math.round(words / positions), 'KINDS', JSON.stringify(kinds));
  for (const [k, n] of Object.entries(drops)) console.log('DROP', n, k);
  expect(Object.keys(drops).filter((k) => k.startsWith('speedrun-read'))).toEqual([]);
}, 1800000);

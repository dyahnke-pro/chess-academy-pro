import { it } from 'vitest';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { tacticalReadFromLines, temptingTurnClause, uncertaintyClause, narrateTacticalRead, candidateCompareRead } from './tacticalRead';
import { buildFedTacticsContext, openThreatLine } from './liveTacticsContext';
import { buildVoicePackage } from './voicePackage';
it('lanes', async () => {
  const all = JSON.parse(readFileSync('public/data/pro-game-references.json', 'utf8')) as Array<{ playerId: string; studentSide: string; pgn: string }>;
  const games = all.filter((g) => g.playerId === 'naroditsky').filter((_, i) => i % 5 === 0).slice(0, Number(process.env.N ?? 30));
  const sf = spawn('node', ['/home/user/wt-upnext/node_modules/stockfish/bin/stockfish-18-lite-single.js']);
  let buf = ''; sf.stdout.on('data', (d: Buffer) => { buf += d.toString(); });
  const send = (c: string) => sf.stdin.write(c + '\n');
  send('uci'); send('setoption name MultiPV value 3'); send('isready');
  const analyse = (fen: string) => new Promise<Array<{ rank: number; moves: string[]; evaluation: number; mate: number | null }>>((res) => {
    buf = ''; send(`position fen ${fen}`); send('go depth 9');
    const t = setInterval(() => {
      if (!buf.includes('bestmove')) return; clearInterval(t);
      const L: Record<number, { moves: string[]; evaluation: number; mate: number | null }> = {}; const w = fen.split(' ')[1] === 'w';
      for (const l of buf.split('\n')) { const m = l.match(/multipv (\d+) score (cp|mate) (-?\d+).* pv (.+)$/); if (m) { const v = Number(m[3]); L[Number(m[1])] = { moves: m[4].trim().split(' '), evaluation: m[2] === 'cp' ? (w ? v : -v) : (w ? 1 : -1) * Math.sign(v) * 10000, mate: m[2] === 'mate' ? (w ? v : -v) : null }; } }
      res(Object.keys(L).sort().map((k, i) => ({ rank: i + 1, ...L[Number(k)] })));
    }, 15);
  });
  const drops: string[] = []; const count: Record<string, number> = {}; let pos = 0;
  const check = (lane: string, text: string | null | undefined, fen: string, extra = '') => {
    if (!text) return; count[lane] = (count[lane] ?? 0) + 1;
    const p = buildVoicePackage([{ kind: 'computed', text, fen }]);
    if (!p.kept.length || p.spoken.length < text.length * 0.9) drops.push(`${lane} | ${text.slice(0, 140)} | ${fen}${extra}`);
  };
  for (const g of games) {
    const me = g.studentSide === 'white' ? 'w' : 'b'; const color = me === 'w' ? 'white' : 'black';
    const c = new Chess(); const sans = g.pgn.trim().split(/\s+/).slice(0, 80);
    for (let i = 0; i < sans.length; i++) {
      if (c.turn() === me && !c.isGameOver()) {
        pos++; const fen = c.fen(); const tl = await analyse(fen);
        if (tl.length) {
          const read = tacticalReadFromLines(fen, tl, color);
          if (read) { check('tempting', temptingTurnClause(read, { spoken: true }), fen); check('uncertainty', uncertaintyClause(read, { spoken: true }), fen); check('tacticalRead', narrateTacticalRead(read, { spoken: true }), fen); }
          check('compare', candidateCompareRead(fen, tl, color, { spoken: true })?.text, fen);
          const analysis = { bestMove: tl[0].moves[0], evaluation: tl[0].evaluation, isMate: tl[0].mate != null, mateIn: tl[0].mate, depth: 9, topLines: tl, nodesPerSecond: 0 };
          const tctx = await buildFedTacticsContext(fen, me, 1500, analysis as never, () => Promise.resolve(null)).catch(() => null);
          for (const t of tctx?.threats ?? []) if (t.spoken) check('threatSoon', openThreatLine(`Watch out — ${t.spoken}.`, fen, me, (t.description.match(/\b[a-h][1-8]\b/g) ?? []), i), fen);
          for (const t of tctx?.opportunities ?? []) if ((t as { spoken?: string }).spoken) check('opportunity', (t as { spoken?: string }).spoken, fen);
        }
      }
      try { c.move(sans[i]); } catch { break; }
    }
  }
  sf.kill();
  console.log('POS', pos, 'COUNTS', JSON.stringify(count), 'DROPS', drops.length);
  for (const d of drops) console.log('DROP', d);
}, 7200000);

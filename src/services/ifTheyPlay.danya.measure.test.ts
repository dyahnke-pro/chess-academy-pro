// REPLY TREE ON HIS GAMES — how often the tree walks the reply Danya named in
// an "if they X, …" clause, and how often its answer is his (and true at a
// deeper read). Rows from `scripts/bench/if-they-play-reads.mjs` (moves only —
// his words never leave the bank).
//
//   IF_THEY_PLAY_BENCH=<reads.json> npx vitest run src/services/ifTheyPlay.danya.measure.test.ts
//
// Measured, not gated: it prints the rates and writes them to
// audit-reports/if-they-play-bench.json.
import { describe, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
import { ifTheyPlay, treeSentence, sayable, type ReplyRead } from './ifTheyPlay';
import { humanMoveProbabilities } from './humanMove';

const FILE = process.env.IF_THEY_PLAY_BENCH;
const RUN = !!FILE && existsSync(FILE);
const ENGINE = existsSync('/usr/games/stockfish') ? '/usr/games/stockfish' : 'stockfish';

interface Row { video: string; ply: number; fen: string; x: string; y: string | null; read: Array<[string, number, number | null, string[]]> }

/** One UCI engine, one question at a time: the best move's score and each
 *  asked move's score on `fen` (side to move's view, cp; a mate folded). */
function engine(): { scores(fen: string, depth: number): Promise<Map<string, number>>; quit(): void } {
  const sf = spawn(ENGINE);
  let buf = '';
  let waiter: ((l: string) => void) | null = null;
  sf.stdout.on('data', (d: Buffer) => {
    buf += d.toString();
    let i: number;
    while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); waiter?.(l); }
  });
  const send = (c: string): void => { sf.stdin.write(`${c}\n`); };
  send('uci'); send('setoption name Threads value 1'); send('setoption name Hash value 32');
  return {
    scores: (fen, depth) => new Promise((res) => {
      const n = new Chess(fen).moves().length;
      const got = new Map<string, number>();
      waiter = (l) => {
        if (l.startsWith('info') && / multipv /.test(l)) {
          const sc = / score (cp|mate) (-?\d+)/.exec(l); const pv = / pv (\S+)/.exec(l);
          if (sc && pv) { const v = Number(sc[2]); got.set(pv[1], sc[1] === 'cp' ? v : Math.sign(v || 1) * (2000 + 100 - Math.min(99, Math.abs(v)))); }
        }
        if (l.startsWith('bestmove')) { waiter = null; res(got); }
      };
      send(`setoption name MultiPV value ${n}`); send(`position fen ${fen}`); send(`go depth ${depth}`);
    }),
    quit: () => send('quit'),
  };
}

describe.runIf(RUN)('the reply tree on Danya\'s branches', () => {
  it('walks his reply and answers it as he does', async () => {
    const rows = JSON.parse(readFileSync(FILE as string, 'utf8')) as Row[];
    const eng = engine();
    const out: Record<string, unknown> = {};
    const examples: string[] = [];
    for (const rating of process.env.IF_THEY_PLAY_SKIP_BROAD ? [] : [1500, 2000]) {
      let n = 0; let walked = 0; let branch = 0; let said = 0; let top3 = 0;
      let withY = 0; let ySaid = 0; let yMatch = 0; let yTrue = 0; let yChecked = 0;
      for (const r of rows) {
        if (!r.read.length) continue;
        n += 1;
        const replies: ReplyRead[] = r.read.map(([uci, cp, mate, pv]) => ({ uci, cp, mate, pv }));
        const byCp = [...replies].sort((a, b) => b.cp - a.cp).slice(0, 3).map((q) => q.uci);
        if (byCp.includes(r.x)) top3 += 1;
        const turn = new Chess(r.fen).turn();
        const student = turn === 'w' ? 'b' : 'w';
        const t = ifTheyPlay({ fen: r.fen, replies, rating, student, seconds: [], played: null });
        if (!t) continue;
        const seen = new Set([...t.branches.map((b) => b.reply.uci), ...t.held.map((h) => h.uci)]);
        if (seen.has(r.x)) walked += 1;
        const b = t.branches.find((q) => q.reply.uci === r.x);
        if (b) branch += 1;
        const ok = b && sayable(t, b, student, 'live');
        if (ok) said += 1;
        if (r.y) {
          withY += 1;
          if (b && ok) {
            ySaid += 1;
            if (b.answer.uci === r.y) yMatch += 1;
            // TRUE at a deeper read: the answer is within half a pawn of the best
            // answer on the board after the reply, depth 16.
            if (rating === 1500) {
              const fenX = (() => { const c = new Chess(r.fen); c.move({ from: r.x.slice(0, 2), to: r.x.slice(2, 4), promotion: r.x[4] }); return c.fen(); })();
              const s = await eng.scores(fenX, 16);
              const bestS = Math.max(...s.values());
              const mine = s.get(b.answer.uci);
              yChecked += 1;
              if (mine !== undefined && bestS - mine <= 50) yTrue += 1;
            }
          }
        }
        if (rating === 1500 && ok && examples.length < 40) {
          examples.push(`${r.video}@${r.ply} his X=${r.x} Y=${r.y ?? '-'} :: ${treeSentence(t, t.branches.filter((q) => sayable(t, q, student, 'live')), student, 'live')}`);
        }
      }
      out[`r${rating}`] = { rows: n, xInEngineTop3: top3, walked, branch, said, withY, ySaid, yMatch, yChecked, yTrue };
      console.log(`[reply-tree] rating ${rating}: rows ${n} · his reply in engine top-3 ${top3} · walked ${walked} · a proven branch ${branch} · said ${said} · with his answer ${withY}: said ${ySaid}, same answer ${yMatch}, true at depth 16 ${yTrue}/${yChecked}`);
    }
    // THE HAND-CHECKED SET: branches whose reply and answer were read against
    // his words by hand (the parse is noisy; this is the honest recall).
    const VER = process.env.IF_THEY_PLAY_VERIFIED;
    if (VER && existsSync(VER)) {
      const ver = JSON.parse(readFileSync(VER, 'utf8')) as Array<{ video: string; ply: number; x: string; y: string | null }>;
      for (const rating of [1200, 1500, 2000]) {
        let n = 0; let walked = 0; let said = 0; let withY = 0; let ySaid = 0; let yMatch = 0; let yTrue = 0; let hisTrue = 0;
        const ranks: number[] = [];
        for (const v of ver) {
          const r = rows.find((q) => q.video === v.video && q.ply === v.ply && q.x === v.x);
          if (!r?.read.length) continue;
          n += 1;
          const replies: ReplyRead[] = r.read.map(([uci, cp, mate, pv]) => ({ uci, cp, mate, pv }));
          const student = new Chess(r.fen).turn() === 'w' ? 'b' : 'w';
          const probs = humanMoveProbabilities(r.fen, replies.map((q) => ({ uci: q.uci, cp: q.cp })), rating).sort((a, b) => b.p - a.p);
          ranks.push(probs.findIndex((q) => q.uci === v.x) + 1);
          const t = ifTheyPlay({ fen: r.fen, replies, rating, student, seconds: [], played: null });
          if (!t) continue;
          if ([...t.branches.map((b) => b.reply.uci), ...t.held.map((h) => h.uci)].includes(v.x)) walked += 1;
          const b = t.branches.find((q) => q.reply.uci === v.x);
          const ok = !!b && sayable(t, b, student, 'live');
          if (ok) said += 1;
          if (v.y) {
            withY += 1;
            if (b && ok) {
              ySaid += 1;
              if (b.answer.uci === v.y) yMatch += 1;
              if (rating === 1500) {
                const c = new Chess(r.fen); c.move({ from: v.x.slice(0, 2), to: v.x.slice(2, 4), promotion: v.x[4] });
                const sc = await eng.scores(c.fen(), 16);
                const bestS = Math.max(...sc.values());
                if (bestS - (sc.get(b.answer.uci) ?? -99999) <= 50) yTrue += 1;
                if (bestS - (sc.get(v.y) ?? -99999) <= 50) hisTrue += 1;
              }
            }
          }
          if (rating === 1500) {
            const one = b && ok ? treeSentence(t, [b], student, 'live') : null;
            console.log(`[if-they-play] verified ${v.video}@${v.ply} X=${v.x} his Y=${v.y ?? '-'} human rank ${ranks[ranks.length - 1]} :: ${one ?? `(not said: ${t.held.find((h) => h.uci === v.x)?.why ?? 'not walked'})`}`);
          }
        }
        const sorted = [...ranks].sort((a, b) => a - b);
        out[`verified-r${rating}`] = { rows: n, walked, said, withY, ySaid, yMatch, yTrue, hisTrue, ranks: sorted };
        console.log(`[if-they-play] verified rating ${rating}: ${n} branches · walked ${walked} · said ${said} · his answer known ${withY}: said ${ySaid}, same answer ${yMatch}, ours true at depth 16 ${yTrue}, his true ${hisTrue} · his reply's human rank ${sorted.join(',')}`);
      }
    }
    eng.quit();
    for (const e of examples) console.log(`[reply-tree] ${e}`);
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/if-they-play-bench.json', JSON.stringify({ ...out, examples }, null, 2));
  }, 3_600_000);
});

// Fix-finder for the 7 flagged lines: from each opening's defining seed, walk the
// masters-MOST-PLAYED mainline (the practically-best line) to a middlegame
// terminus, then judge it by the win% gate (masters + club score) + eval. If the
// best available line clears the gate -> that's the re-anchor fix; if even it
// fails -> opening ceiling (keep-with-label or cut). Grounded (masters DB +
// explorer + Stockfish).
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';
const SF = '/usr/games/stockfish';
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const root = new URL('..', import.meta.url).pathname;
const db = JSON.parse(readFileSync(root + 'public/data/openings-masters-db.json', 'utf8')).positions;
const key = (f) => f.split(' ').slice(0, 4).join(' ');
const movesAt = (f) => db[key(f)] || [];
function sans(p) { const t = p.trim().split(/\s+/); const c = new Chess(); const o = []; for (const m of t) { try { o.push(c.move(m).san); } catch { return null; } } return o; }
function ev(fen, d = 20) { return new Promise((res) => { const p = spawn(SF); let b = 0, o = ''; p.stdout.on('data', (x) => { o += x; let i; while ((i = o.indexOf('\n')) >= 0) { const ln = o.slice(0, i); o = o.slice(i + 1); const m = /score (cp|mate) (-?\d+)/.exec(ln); if (m) b = m[1] === 'mate' ? (+m[2] > 0 ? 1000 : -1000) : +m[2]; if (ln.startsWith('bestmove')) { p.kill(); res(b); } } }); p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${d}\n`); }); }
function walk(start, maxPlies = 24) { const c = new Chess(); for (const s of start) c.move(s); const o = [...start]; while (o.length < maxPlies) { if (reachesMiddlegame(o.join(' ')).pass && o.length >= 16) break; const ms = movesAt(c.fen()); if (!ms.length) break; const top = ms.slice().sort((a, b) => b.games - a.games)[0]; if (top.games < 5) break; try { c.move(top.san); o.push(top.san); } catch { break; } } return o; }
function uci(s) { const c = new Chess(); const u = []; for (const m of s) { const r = c.move(m); u.push(r.from + r.to + (r.promotion || '')); } return u; }
async function score(u, src) { try { const extra = src === 'lichess' ? '&ratings=1400,1600,1800,2000&speeds=blitz,rapid' : ''; const r = await fetch(`${PROXY}?source=${src}&play=${u.join(',')}${extra}`); const d = await r.json(); return { w: d.white || 0, dr: d.draws || 0, b: d.black || 0, tot: (d.white || 0) + (d.draws || 0) + (d.black || 0) }; } catch { return null; } }
async function pct(u, color, src) { for (let k = u.length; k >= 6; k--) { const s = await score(u.slice(0, k), src); await new Promise((r) => setTimeout(r, 200)); if (s && s.tot >= (src === 'lichess' ? 30 : 8)) { const sw = color === 'white' ? s.w : s.b; return { score: (sw + 0.5 * s.dr) / s.tot * 100, ply: k, games: s.tot }; } } return null; }

const SEEDS = [
  ['Philidor (Lion fix)', 'e4 e5 Nf3 d6', 'black'],
  ['Alekhine main', 'e4 Nf6', 'black'],
  ['Petrov', 'e4 e5 Nf3 Nf6', 'black'],
  ['KID main', 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6', 'black'],
  ['KID vs Sämisch', 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3', 'black'],
  ['Philidor (Nimzowitsch)', 'e4 e5 Nf3 d6 d4 Nf6', 'black'],
  ["Bird's", 'f4', 'white'],
];
for (const [name, seed, color] of SEEDS) {
  const s = sans(seed); const line = walk(s); const u = uci(line);
  const c = new Chess(); for (const m of line) c.move(m);
  const stm = c.turn() === 'w' ? 'white' : 'black'; const raw = await ev(c.fen(), 20); const se = (stm === color ? raw : -raw) / 100;
  const m = await pct(u, color, 'masters'); const a = await pct(u, color, 'lichess');
  const ms = m ? `${m.score.toFixed(0)}% (${m.games}g@${m.ply})` : 'n/a'; const as = a ? `${a.score.toFixed(0)}% (${a.games}g@${a.ply})` : 'n/a';
  const good = se >= -2.0 && ((m && m.score >= 45) || (a && a.score >= 45));
  console.log(`\n${name} [${color}]\n  best mainline: ${line.join(' ')}\n  eval ${se >= 0 ? '+' : ''}${se.toFixed(2)} | masters ${ms} | club ${as} | ${good ? 'FIXABLE -> re-anchor here' : 'OPENING CEILING (best line still fails gate)'}`);
}
console.log('\nDONE-BESTLINE');

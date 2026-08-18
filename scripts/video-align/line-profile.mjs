#!/usr/bin/env node
/**
 * line-profile — how master results move, ply by ply, along a line.
 *
 * `fork-check` answers "is this branch worse than the fork it leaves"; this
 * answers "WHERE does it go wrong", which is the question you need before you
 * can fix it. A branch that scores badly is rarely bad all the way down — it is
 * usually one move, and truncating before that move keeps the teaching while
 * dropping the position nobody should be walked into.
 *
 * It also shows the alternatives at each ply, so the replacement continuation is
 * chosen from the data rather than from the line you were hoping to keep.
 *
 * Usage:
 *   node scripts/video-align/line-profile.mjs "<san moves>" <white|black>
 */
import { Chess } from 'chess.js';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const [pgn, side = 'white'] = process.argv.slice(2);
if (!pgn) { console.error('usage: line-profile.mjs "<san moves>" <white|black>'); process.exit(1); }

const sans = pgn.trim().split(/\s+/).filter((t) => !/^\d+\.+$/.test(t));
const board = new Chess();
const uci = sans.map((m) => { const x = board.move(m); return x.from + x.to + (x.promotion ?? ''); });
const games = (m) => (m.white || 0) + (m.draws || 0) + (m.black || 0);

for (let depth = 1; depth <= uci.length; depth++) {
  const res = await fetch(`${PROXY}?source=masters&play=${uci.slice(0, depth).join(',')}`);
  if (!res.ok) { console.log(`ply ${depth}  HTTP ${res.status}`); await new Promise((r) => setTimeout(r, 1000)); continue; }
  const j = await res.json();
  const total = (j.white || 0) + (j.draws || 0) + (j.black || 0);
  if (!total) { console.log(`ply ${String(depth).padStart(2)}  ${sans[depth - 1]}  — no master games past here`); break; }
  const wins = side === 'black' ? j.black : j.white;
  const score = Math.round(((wins + (j.draws || 0) / 2) / total) * 100);
  const alts = (j.moves ?? []).slice(0, 3).map((m) => `${m.san}:${games(m)}`).join(' ');
  console.log(`ply ${String(depth).padStart(2)} ${sans[depth - 1].padEnd(7)} ${String(total).padStart(6)}g  ${side} ${String(score).padStart(3)}%   next: ${alts}`);
  await new Promise((r) => setTimeout(r, 250));
}

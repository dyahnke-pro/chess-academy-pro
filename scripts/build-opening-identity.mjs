// Build public/data/opening-identity.json — the FACTS behind "what is this
// opening about", computed offline for every Lichess DB opening. No prose is
// stored: `openingIdentity.ts` renders the sentence in code at speak time.
//   provokes  — the most common answer to the opening's defining move, and what
//               kind of answer it is (a pawn that hits the piece, a capture of
//               an offered pawn, a trade)
//   aims      — the structure the MAIN master line reaches (boardStructure)
//   gambit    — the defining side is a pawn or more down at the end of that line
//   sharp     — the main line's forcing rate (captures+checks) and theory depth
//   famous    — real master games (model-games.json) that reached this opening
// Sources: src/data/openings-lichess.json (names, G3), the masters position
// index (public/data/openings-masters-db.json), chess.js. Re-run when any
// changes; `openingIdentity.test.ts` fails on a stale file.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const db = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8'));
const masters = JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8')).positions;
const models = JSON.parse(readFileSync('src/data/model-games.json', 'utf8'));
const positions = JSON.parse(readFileSync('public/data/opening-positions.json', 'utf8'));
const key = (c) => c.fen().split(' ').slice(0, 4).join(' ');
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const MIN_GAMES = 20;
const material = (c, col) => c.board().flat().filter((p) => p && p.color === col).reduce((s, p) => s + VAL[p.type], 0);

function play(pgn) {
  const c = new Chess();
  for (const san of pgn.split(/\s+/).filter(Boolean)) { try { c.move(san); } catch { return null; } }
  return c;
}

/** What kind of answer the reply is to the defining move. */
function replyKind(c, reply, defMove) {
  const x = new Chess(c.fen());
  let mv; try { mv = x.move(reply); } catch { return null; }
  if (mv.captured && mv.to === defMove.to && defMove.piece === 'p') {
    // Taken back at once (the Scandinavian's exd5 Qxd5) is a TRADE the opening
    // invites; not taken back is a pawn given.
    // …and "taken back" means the MASTERS take it back: the Smith-Morra's
    // Qxd4 is legal but White plays c3, so that pawn is given, not traded.
    const top = masters[key(x)]?.[0]?.san ?? '';
    const back = x.moves({ verbose: true }).some((m) => m.to === mv.to && m.captured && m.san === top);
    return { kind: back ? 'invites-trade' : 'takes-offered-pawn' };
  }
  if (mv.captured) return { kind: 'capture', piece: mv.captured };
  if (mv.piece === 'p') {
    // does the pushed pawn now hit an enemy piece (not a pawn)?
    const hit = x.moves({ square: mv.to, verbose: true }).filter((m) => m.captured && m.captured !== 'p');
    if (hit.length === 0) {
      const f = mv.to.charCodeAt(0), r = +mv.to[1], dir = mv.color === 'w' ? 1 : -1;
      for (const df of [-1, 1]) {
        const sq = String.fromCharCode(f + df) + (r + dir);
        const p = /^[a-h][1-8]$/.test(sq) ? x.get(sq) : null;
        // PROVOKED only when a centre pawn is drawn over the middle (the
        // Alekhine's e5); a flank pawn asking the question (the Ruy's …a6) is
        // just the usual answer.
        const centre = 'cdef'.includes(mv.to[0]) && (mv.color === 'w' ? r >= 5 : r <= 4);
        if (p && p.color !== mv.color && p.type !== 'p' && p.type !== 'k') return { kind: 'pawn-hits', piece: p.type, square: sq, provoked: centre };
      }
    }
  }
  return { kind: 'other' };
}

function mainLine(c0) {
  const c = new Chess(c0.fen());
  const sans = [];
  let quiet = null;
  let downSince = null; // the ply a quiet imbalance first appeared
  const base = (() => { const b = new Chess(c0.fen()); b.undo(); return b; })();
  const bal = (x) => material(x, 'w') - material(x, 'b');
  for (let i = 0; i < 40; i++) {
    const row = masters[key(c)];
    if (!row || !row[0] || row[0].games < MIN_GAMES) break;
    try { c.move(row[0].san); } catch { break; }
    sans.push(row[0].san);
    // QUIET = two non-captures in a row: no exchange is half-done.
    const n = sans.length;
    if (n >= 2 && !/x/.test(sans[n - 1]) && !/x/.test(sans[n - 2])) {
      quiet = new Chess(c.fen());
      const sw = bal(quiet) - bal(base);
      if (Math.abs(sw) >= 1) downSince ??= n; else downSince = null;
    }
  }
  // A pawn given only counts when it STAYS given for six plies of main line —
  // a pawn the line is about to win back (the Botvinnik's …dxc4, cut off at
  // the database's depth) is not a gambit.
  const lasting = downSince !== null && sans.length - downSince >= 6;
  return { c, sans, quiet: lasting ? quiet : null, downPlies: lasting ? sans.length - downSince : 0 };
}

function structureAt(c) {
  const b = c.board();
  const at = (sq) => c.get(sq);
  const out = [];
  // closed centre: a locked pawn pair on the d or e file
  for (const f of ['d', 'e']) {
    // A CHAIN, not a standoff: e4 vs e5 (or d4 vs d5) is the ordinary open
    // centre. Locked means a pawn has crossed the middle — White on the 5th
    // (e5 vs e6) or Black on the 4th (d4 vs d3).
    for (const [r, who] of [[5, 'w'], [3, 'b']]) {
      const w = at(f + r), bl = at(f + (r + 1));
      if (w && bl && w.type === 'p' && bl.type === 'p' && w.color === 'w' && bl.color === 'b') out.push({ kind: 'locked-centre', advanced: who, squares: [f + r, f + (r + 1)] });
    }
  }
  // isolated d-pawn
  for (const col of ['w', 'b']) {
    const pawns = b.flat().filter((p) => p && p.type === 'p' && p.color === col);
    const files = new Set(pawns.map((p) => p.square[0]));
    const d = pawns.find((p) => p.square[0] === 'd');
    if (d && !files.has('c') && !files.has('e')) out.push({ kind: 'isolated-d-pawn', side: col, squares: [d.square] });
  }
  // fianchetto: bishop on g2/b2/g7/b7 with the knight-pawn pushed one
  for (const [bs, ps, col] of [['g2', 'g3', 'w'], ['b2', 'b3', 'w'], ['g7', 'g6', 'b'], ['b7', 'b6', 'b']]) {
    const bp = at(bs), pp = at(ps);
    if (bp && bp.type === 'b' && bp.color === col && pp && pp.type === 'p' && pp.color === col) out.push({ kind: 'fianchetto', side: col, squares: [bs] });
  }
  return out;
}

// Famous games: the deepest named opening each master model game passes through.
const famous = {};
for (const g of models) {
  if (!g.year || !g.white || !g.black || !g.pgn) continue;
  // Over-the-board master history only — an online blitz game is not "played
  // at the top level" (chess.com usernames, blitz/rapid/bullet events).
  if (/chess\.com|lichess|blitz|bullet|rapid|titled|online/i.test(g.event ?? '')) continue;
  if (!/[ ,]/.test(g.white) || !/[ ,]/.test(g.black)) continue;
  const c = new Chess();
  let deepest = null;
  const sans = g.pgn.replace(/\{[^}]*\}/g, '').replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/).filter((s) => s && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(s));
  for (const san of sans.slice(0, 40)) {
    try { c.move(san); } catch { break; }
    const hit = positions[key(c)];
    if (hit) deepest = hit[0];
  }
  if (!deepest) continue;
  (famous[deepest] ??= []).push({ white: g.white, black: g.black, year: g.year, event: g.event ?? null, result: g.result ?? null });
}

const out = {};
for (const e of db) {
  const c = play(e.pgn);
  if (!c) continue;
  const hist = c.history({ verbose: true });
  const def = hist[hist.length - 1];
  if (!def) continue;
  const defColor = def.color;
  const replies = masters[key(c)] ?? [];
  const total = replies.reduce((s, r) => s + r.games, 0);
  let provokes = null;
  if (replies[0] && total >= MIN_GAMES && replies[0].games / total >= 0.4) {
    const k = replyKind(c, replies[0].san, def);
    if (k && k.kind !== 'other') provokes = { reply: replies[0].san, share: Math.round((100 * replies[0].games) / total), ...k };
  }
  const { c: end, sans, quiet, downPlies } = mainLine(c);
  const forcing = sans.filter((s) => /[x+#]/.test(s)).length;
  const before = new Chess(); for (const h of hist.slice(0, -1)) before.move(h.san);
  const balance = (x) => material(x, 'w') - material(x, 'b');
  const swing = quiet ? balance(quiet) - balance(before) : 0; // quiet is set only for a lasting imbalance
  const rec = {
    side: defColor,
    defining: def.san,
    provokes,
    aims: sans.length >= 4 ? structureAt(end) : [],
    gambit: quiet && Math.abs(swing) >= 1 ? { side: swing < 0 ? 'w' : 'b', down: Math.abs(swing), forPlies: downPlies } : null,
    theoryPlies: sans.length,
    forcing: sans.length ? Math.round((100 * forcing) / sans.length) : 0,
    famous: (famous[e.name] ?? []).sort((a, b) => a.year - b.year).slice(0, 3),
  };
  if (!rec.provokes && !rec.aims.length && !rec.gambit && !rec.famous.length && rec.theoryPlies < 4) continue;
  const prev = out[e.name];
  if (!prev || e.pgn.split(/\s+/).length < prev.plies) out[e.name] = { ...rec, plies: e.pgn.split(/\s+/).length };
}
writeFileSync('public/data/opening-identity.json', JSON.stringify(out));
const n = Object.values(out);
console.log(`${n.length} openings · provokes ${n.filter((r) => r.provokes).length} · aims ${n.filter((r) => r.aims.length).length} · gambit ${n.filter((r) => r.gambit).length} · famous ${n.filter((r) => r.famous.length).length}`);

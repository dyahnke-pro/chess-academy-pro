#!/usr/bin/env node
// Gambit endgame extractor (David 2026-05-30 — "use the games that actually led
// to the opening and middlegame positions; just walk those games forward").
// Per variation spine: seed the masters explorer at the on-variation wide-corpus
// middlegame entry, pull the real games that reached it (topGames+recentGames),
// fetch each full PGN, WALK IT INTO ITS ENDING, classify the endgame structure,
// and frequency-rank. Each type reached by >= EG_PCT of the games = a candidate
// endgame plan (G9.1 #5 / the endgame-layer rule). For each candidate it also
// captures a REPRESENTATIVE real game (prefer a student-side decisive result,
// deepest) with the transition FEN + endgame move tail, so the plan is authored
// from REAL moves (G3), opening->middlegame->endgame as one continuous line.
//
// Output: data/sources/gambit-endgames/<id>.json
// Run: node scripts/gambit-endgame-extract.mjs [one__variation]
import { Chess } from 'chess.js';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const EXPORT = 'https://chess-academy-pro.vercel.app/api/lichess-game-export';
const EG_PCT = Number(process.env.EG_PCT ?? 0.15);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uci = (ms) => { const c = new Chess(); return ms.map((m) => { const x = c.move(m); return x.from + x.to + (x.promotion ?? ''); }); };
async function fetchT(u) { for (let i = 0; i < 5; i++) { try { const r = await fetch(u); if (r.ok) return r.text(); } catch { /* transient */ } await sleep(350 * (i + 1)); } return null; }
async function fetchJ(u) { const t = await fetchT(u); try { return t ? JSON.parse(t) : null; } catch { return null; } }

function classify(chess) {
  const c = { wP:0,wN:0,wB:0,wR:0,wQ:0,bP:0,bN:0,bB:0,bR:0,bQ:0 };
  for (const row of chess.board()) for (const sq of row) { if (sq) c[sq.color + sq.type.toUpperCase()]++; }
  const majors = c.wQ + c.bQ, rooks = c.wR + c.bR, minors = c.wN + c.bN + c.wB + c.bB, total = majors + rooks + minors;
  if (total > 6) return null;
  if (majors) return rooks || minors ? 'Q+pieces' : 'Q+P';
  if (rooks && minors) return 'R+minor+P';
  if (rooks) return rooks >= 3 ? 'double-rook+P' : 'R+P';
  if (minors) { const { wB, bB, wN, bN } = c; return (wB === 1 && bB === 1 && !wN && !bN) ? 'opp/same-bishop' : 'minor+P'; }
  return 'K+P';
}

const WHITE_PREFIX = new Set(['kg', 'ev', 'sc', 'vi', 'da', 'sm']);

async function run(file) {
  const id = file.replace(/\.json$/, '');
  const planFile = `data/sources/gambit-plans/${file}`;
  const spine = JSON.parse(readFileSync(`data/sources/opening-spines/${file}`)).spine;
  let mgEntry = 0; try { mgEntry = JSON.parse(readFileSync(planFile)).mgEntryMove; } catch { /* fall back below */ }
  const student = WHITE_PREFIX.has(id.split('__')[0]) ? 'w' : 'b';
  // Seed on-variation but back off toward the variation's NAMED depth until the
  // real-game sample is healthy (deep positions return few topGames; the wider-
  // corpus rule wants the variation's games, not the 3 deepest). Floor = 8 plies
  // so we stay past the bare opening move-order.
  const MIN_SAMPLE = Number(process.env.MIN_SAMPLE ?? 12), FLOOR = 8;
  let plies = Math.min(spine.length, Math.max(FLOOR, mgEntry * 2));
  let games = [], j = null;
  for (; plies >= FLOOR; plies -= 2) {
    j = await fetchJ(`${PROXY}?source=masters&play=${uci(spine.slice(0, plies)).join(',')}`);
    games = ((j?.topGames) || []).concat(j?.recentGames || []).filter((g) => g.id);
    if (games.length >= MIN_SAMPLE || plies <= FLOOR) break;
    await sleep(120);
  }
  const tally = {}; const byType = {};
  for (const g of games) {
    await sleep(120);
    const pgn = await fetchT(`${EXPORT}?id=${g.id}`);
    if (!pgn) continue;
    const c = new Chess(); try { c.loadPgn(pgn); } catch { continue; }
    const type = classify(c); if (!type) { tally['middlegame'] = (tally['middlegame'] || 0) + 1; continue; }
    tally[type] = (tally[type] || 0) + 1;
    const hist = c.history(); const re = new Chess(); let entryPly = -1, entryFen = '';
    for (let i = 0; i < hist.length; i++) { re.move(hist[i]); if (classify(re) === type) { entryPly = i + 1; entryFen = re.fen(); break; } }
    const res = (pgn.match(/\[Result "([^"]+)"\]/) || [])[1] || '';
    const W = (pgn.match(/\[White "([^"]+)"\]/) || [])[1] || '?', B = (pgn.match(/\[Black "([^"]+)"\]/) || [])[1] || '?';
    const yr = (pgn.match(/\[Date "(\d{4})/) || [])[1] || '';
    const studentWon = (student === 'w' && res === '1-0') || (student === 'b' && res === '0-1');
    (byType[type] = byType[type] || []).push({ id: g.id, W, B, res, yr, studentWon, entryPly, entryFen, totalPlies: hist.length, tail: hist.slice(entryPly).join(' ') });
  }
  const sampled = games.length || 0;
  const candidates = Object.entries(tally)
    .filter(([t, n]) => t !== 'middlegame' && sampled && n / sampled >= EG_PCT)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => {
      const pool = (byType[type] || []).sort((a, b) => (b.studentWon - a.studentWon) || (b.totalPlies - a.totalPlies));
      const rep = pool[0] || null;
      return { type, pct: Math.round(n / sampled * 100), games: n, rep };
    });
  const out = { id, openingId: JSON.parse(readFileSync(`data/sources/opening-spines/${file}`)).openingId, student, seededAtMove: Math.ceil(plies / 2), sampledGames: sampled, tally, candidateEndgames: candidates, generatedAt: new Date().toISOString() };
  mkdirSync('data/sources/gambit-endgames', { recursive: true });
  writeFileSync(`data/sources/gambit-endgames/${id}.json`, JSON.stringify(out, null, 2) + '\n');
  const cs = candidates.map((c) => `${c.type} ${c.pct}%${c.rep?.studentWon ? '(win✓)' : ''}`).join(', ') || 'none ≥15%';
  console.log(`[eg] ${id.padEnd(22)} sampled=${String(sampled).padStart(2)}  → ${cs}`);
}

(async () => {
  const only = process.argv[2];
  const files = only ? [`${only}.json`] : readdirSync('data/sources/gambit-plans').filter((f) => f.endsWith('.json'));
  for (const f of files) { try { await run(f); } catch (e) { console.log(`[eg] ${f} ERROR ${e.message}`); } }
  console.log('[eg] done');
})();

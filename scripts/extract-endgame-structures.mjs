#!/usr/bin/env node
// Endgame structure extractor (masterclass data-rebuild, doctrine G9.1 #5).
// Given an opening line, pull master topGames, walk each to its FINAL position,
// classify the endgame type, and frequency-rank. Types reached by >=~15% are
// candidate endgame plans. Run: node scripts/extract-endgame-structures.mjs "<seed moves>"
import { Chess } from 'chess.js';
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const EXPORT = 'https://chess-academy-pro.vercel.app/api/lichess-game-export';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const uci = (ms) => { const c = new Chess(); return ms.map(m => { const x = c.move(m); return x.from + x.to + (x.promotion ?? ''); }); };
function classify(chess) {
  const counts = { wP:0,wN:0,wB:0,wR:0,wQ:0,bP:0,bN:0,bB:0,bR:0,bQ:0 };
  for (const row of chess.board()) for (const sq of row) { if (!sq) continue; counts[(sq.color)+sq.type.toUpperCase()]++; }
  const majors = counts.wQ+counts.bQ, rooks = counts.wR+counts.bR, minors = counts.wN+counts.bN+counts.wB+counts.bB;
  const totalPieces = majors+rooks+minors;
  if (totalPieces > 6) return 'middlegame (no endgame reached)';
  let t = '';
  if (majors) t = rooks||minors ? 'Q+pieces' : 'Q+P';
  else if (rooks && minors) t = 'R+minor+P';
  else if (rooks) t = rooks>=3 ? 'double-rook+P' : 'R+P';
  else if (minors) {
    const wb=counts.wB,bb=counts.bB,wn=counts.wN,bn=counts.bN;
    if (wb===1&&bb===1&&!wn&&!bn) t='opposite/same-bishop'; else t = 'minor+P';
  } else t = 'K+P';
  return t;
}
(async () => {
  const seed = process.argv[2].trim().split(/\s+/);
  const play = uci(seed).join(',');
  const j = await fetch(`${PROXY}?source=masters&play=${play}`).then(r=>r.json());
  const games = (j.topGames || []).concat(j.recentGames || []).filter(g=>g.id);
  console.log(`[endgame] "${seed.join(' ')}" — ${games.length} master games`);
  const tally = {}; const decisive = {};
  for (const g of games) {
    await sleep(120);
    const pgn = await fetch(`${EXPORT}?id=${g.id}`).then(r=>r.text()).catch(()=>null);
    if (!pgn) continue;
    const c = new Chess(); try { c.loadPgn(pgn); } catch { continue; }
    const type = classify(c);
    tally[type] = (tally[type]||0)+1;
    const res = (pgn.match(/\[Result "([^"]+)"\]/)||[])[1] || '';
    if (res !== '1/2-1/2') decisive[type] = (decisive[type]||0)+1;
  }
  console.log('endgame types at final position:', JSON.stringify(tally));
  console.log('among decisive games:', JSON.stringify(decisive));
})();

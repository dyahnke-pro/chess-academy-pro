#!/usr/bin/env node
// Pick a SPECIFIC real master game in the variation being taught and surface
// its endgame, so an endgame plan can be authored from REAL moves (G3 — never
// from memory). David 2026-05-30: "find an [opening] game with the same
// variation as being taught and then use that endgame." Continuity (G9.3 Gate
// C extended): opening -> taught middlegame -> endgame is ONE continuous real
// line.
//
// Seeds the masters explorer on the taught variation, pulls topGames, fetches
// each full PGN through the lichess-game-export proxy, classifies the final
// position, and for games reaching the target endgame type prints: header
// (players/result/year), full SAN, the ply where the endgame structure is
// first reached + that FEN, and the endgame move tail. Prefer the requested
// result (draw for a HOLDING lesson, win for a CONVERSION lesson).
//
// Run: node scripts/pick-endgame-game.mjs "<seed SAN>" [type=R+minor+P] [result=draw|win|any]
import { Chess } from 'chess.js';
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const EXPORT = 'https://chess-academy-pro.vercel.app/api/lichess-game-export';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const uci = (ms) => { const c = new Chess(); return ms.map(m => { const x = c.move(m); return x.from + x.to + (x.promotion ?? ''); }); };

function classifyBoard(chess) {
  const c = { wP:0,wN:0,wB:0,wR:0,wQ:0,bP:0,bN:0,bB:0,bR:0,bQ:0 };
  for (const row of chess.board()) for (const sq of row) { if (sq) c[sq.color+sq.type.toUpperCase()]++; }
  const majors=c.wQ+c.bQ, rooks=c.wR+c.bR, minors=c.wN+c.bN+c.wB+c.bB, total=majors+rooks+minors;
  if (total>6) return null; // not yet an endgame
  if (majors) return rooks||minors ? 'Q+pieces' : 'Q+P';
  if (rooks && minors) return 'R+minor+P';
  if (rooks) return rooks>=3 ? 'double-rook+P' : 'R+P';
  if (minors) { const {wB,bB,wN,bN}=c; return (wB===1&&bB===1&&!wN&&!bN)?'opposite/same-bishop':'minor+P'; }
  return 'K+P';
}

const seed = process.argv[2].trim().split(/\s+/);
const wantType = process.argv[3] || 'R+minor+P';
const wantResult = process.argv[4] || 'any'; // draw | win (white) | any
const play = uci(seed).join(',');
const j = await fetch(`${PROXY}?source=masters&play=${play}`).then(r=>r.json());
const games = (j.topGames||[]).concat(j.recentGames||[]).filter(g=>g.id);
console.log(`[pick] "${seed.join(' ')}" — ${games.length} master games, target=${wantType}, result=${wantResult}\n`);

const hits = [];
for (const g of games) {
  await sleep(120);
  const pgn = await fetch(`${EXPORT}?id=${g.id}`).then(r=>r.text()).catch(()=>null);
  if (!pgn) continue;
  const c = new Chess(); try { c.loadPgn(pgn); } catch { continue; }
  const finalType = classifyBoard(c);
  if (finalType !== wantType) continue;
  // Replay to find the ply where the endgame structure is FIRST reached.
  const hist = c.history(); const re = new Chess(); let entryPly=-1, entryFen='';
  for (let i=0;i<hist.length;i++){ re.move(hist[i]); if (classifyBoard(re)===wantType){ entryPly=i+1; entryFen=re.fen(); break; } }
  const res = (pgn.match(/\[Result "([^"]+)"\]/)||[])[1]||'';
  const W=(pgn.match(/\[White "([^"]+)"\]/)||[])[1]||'?', B=(pgn.match(/\[Black "([^"]+)"\]/)||[])[1]||'?';
  const ev=(pgn.match(/\[Event "([^"]+)"\]/)||[])[1]||'', yr=(pgn.match(/\[Date "(\d{4})/)||[])[1]||'';
  hits.push({ id:g.id, W, B, res, ev, yr, finalType, entryPly, entryFen, hist, totalPlies:hist.length });
}

const ok = (h) => wantResult==='any' || (wantResult==='draw'&&h.res==='1/2-1/2') || (wantResult==='win'&&h.res==='1-0') || (wantResult==='loss'&&h.res==='0-1');
const ranked = hits.filter(ok).sort((a,b)=>b.totalPlies-a.totalPlies);
const show = (ranked.length?ranked:hits).slice(0,3);
console.log(`${hits.length} games reach ${wantType}; ${ranked.length} match result=${wantResult}\n`);
for (const h of show) {
  console.log(`=== ${h.W} vs ${h.B} — ${h.res} (${h.ev} ${h.yr}) [lichess ${h.id}] ${h.totalPlies} plies ===`);
  console.log(`endgame (${wantType}) first reached at ply ${h.entryPly} (move ${Math.ceil(h.entryPly/2)})`);
  console.log(`entry FEN: ${h.entryFen}`);
  // SAN with move numbers, splitting opening / endgame-tail at entryPly
  const sanNum = (arr, startPly) => arr.map((m,i)=>{ const ply=startPly+i; return ply%2===1?`${Math.ceil(ply/2)}.${m}`:m; }).join(' ');
  console.log(`opening->entry: ${sanNum(h.hist.slice(0,h.entryPly),1)}`);
  console.log(`endgame tail:   ${sanNum(h.hist.slice(h.entryPly), h.entryPly+1)}`);
  console.log('');
}

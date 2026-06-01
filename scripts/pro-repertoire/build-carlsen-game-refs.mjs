// Build the BREADTH layer (STEP 11.5) for Carlsen: per opening + per variation,
// his real WINS/draws from the chess.com corpus + OTB, bounded, wins-first.
// Output merges into src/data/pro-game-references.json. Wins/draws only (never
// the student side losing — orientation doctrine). Source "chess.com" / "otb".
import fs from 'node:fs';
import { Chess } from 'chess.js';
const ALIASES=new Set(['magnuscarlsen','drnykterstein','drdrunkenstein','manwithavan','drgrekenstein','stl_carlsen']);
const isMagnus=(n)=>{n=(n||'').toLowerCase();return ALIASES.has(n)||n.includes('carlsen');};
const tag=(pgn,t)=>{const m=pgn.match(new RegExp('\\['+t+' "([^"]*)"\\]'));return m?m[1]:'';};
function cleanSan(rawPgn){ const c=new Chess(); try{ c.loadPgn(rawPgn,{sloppy:true}); }catch{ return null; } const h=c.history(); if(h.length<12) return null; return {pgn:h.join(' '), plies:h.length}; }
function* corpus(){
  for(const f of fs.readdirSync('data/sources/magnuscarlsen-chesscom')){
    for(const line of fs.readFileSync('data/sources/magnuscarlsen-chesscom/'+f,'utf8').split('\n')){
      if(!line.trim())continue;let o;try{o=JSON.parse(line)}catch{continue;}if(o.pgn)yield {raw:o.pgn,src:'chess.com',url:o.url||'chess.com'};}}
  const otb=fs.readFileSync('data/sources/carlsen-otb/Carlsen.pgn','utf8');
  for(const p of otb.split(/\n\n(?=\[Event)/)) if(p.includes('[Event')) yield {raw:p,src:'otb',url:'twic/otb'};
}
const clean=(p)=>(p||'').trim().split(/\s+/).map(x=>x.replace(/^\d+\.+/,'')).filter(Boolean);
const pr=JSON.parse(fs.readFileSync('src/data/pro-repertoires.json','utf8'));
const opens=pr.openings.filter(o=>o.playerId==='carlsen');
// build the (proOpeningId, studentSide, [{label, slug, prefix[]}]) targets
const slug=(s)=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const targets=[];
for(const o of opens){
  const side=o.color;
  targets.push({proOpeningId:o.id, base:o.id.replace('pro-carlsen-',''), side, label:'Main line', slug:'main', prefix:clean(o.pgn).slice(0,Math.min(8,clean(o.pgn).length))});
  for(const v of (o.variations||[])){ const pf=clean(v.pgn); targets.push({proOpeningId:o.id, base:o.id.replace('pro-carlsen-',''), side, label:v.name, slug:slug(v.name), prefix:pf.slice(0,Math.min(8,pf.length))}); }
}
// bucket games per target
const MAX=5;
const buckets=new Map(); // key -> array of candidate entries
for(const t of targets) buckets.set(t.proOpeningId+'::'+t.slug, {t, games:[]});
let scanned=0;
for(const g of corpus()){
  const W=tag(g.raw,'White'),B=tag(g.raw,'Black');if(isMagnus(W)===isMagnus(B))continue;
  const side=isMagnus(W)?'white':'black';
  const R=tag(g.raw,'Result'); if(R!=='1-0'&&R!=='0-1'&&R!=='1/2-1/2')continue;
  // wins or draws only (never losing)
  const lost=(side==='white'&&R==='0-1')||(side==='black'&&R==='1-0'); if(lost)continue;
  const cs=cleanSan(g.raw); if(!cs)continue; scanned++;
  const sans=cs.pgn.split(' ');
  for(const t of targets){ if(t.side!==side)continue;
    if(t.prefix.length<4)continue;
    if(sans.slice(0,t.prefix.length).join(' ')!==t.prefix.join(' '))continue;
    const bk=buckets.get(t.proOpeningId+'::'+t.slug);
    const win=(side==='white'&&R==='1-0')||(side==='black'&&R==='0-1');
    bk.games.push({
      white:W,black:B,result:R,studentSide:side,
      opponentRating:+(tag(g.raw,side==='white'?'BlackElo':'WhiteElo'))||0,
      studentRating:+(tag(g.raw,side==='white'?'WhiteElo':'BlackElo'))||0,
      date:(tag(g.raw,'Date')||tag(g.raw,'UTCDate')||'').slice(0,7).replace(/\./g,'-'),
      source:g.src, url:g.url, eco:tag(g.raw,'ECO')||'', plyCount:cs.plies, pgn:cs.pgn, win,
    });
    break; // one bucket per game (most-specific would be better but main+var overlap; first match = main-or-var by order)
  }
}
// emit bounded: wins first, then by opponent rating desc, then deepest
const out=[];let seq=0;
for(const [,bk] of buckets){
  const sorted=bk.games.sort((a,b)=>(b.win-a.win)||(b.opponentRating-a.opponentRating)||(b.plyCount-a.plyCount));
  const seen=new Set();
  for(const e of sorted){ if(out.filter(x=>x.proOpeningId===bk.t.proOpeningId&&x.variation===bk.t.slug).length>=MAX)break;
    const sig=e.pgn.slice(0,60); if(seen.has(sig))continue; seen.add(sig);
    out.push({
      id:`pgref-carlsen-${bk.t.base}-${bk.t.slug}-${String(seq++).padStart(4,'0')}`,
      playerId:'carlsen', openingId:bk.t.base, proOpeningId:bk.t.proOpeningId,
      variation:bk.t.slug, variationLabel:bk.t.label,
      white:e.white, black:e.black, studentSide:e.studentSide, result:e.result,
      opponentRating:e.opponentRating, date:e.date, source:e.source, url:e.url,
      eco:e.eco, plyCount:e.plyCount, pgn:e.pgn,
    });
  }
}
// merge into existing (drop any existing carlsen refs, append new)
const path='src/data/pro-game-references.json';
const existing=JSON.parse(fs.readFileSync(path,'utf8')).filter(g=>g.playerId!=='carlsen');
const merged=existing.concat(out);
fs.writeFileSync(path, JSON.stringify(merged,null,2)+'\n');
const byOpen={};for(const e of out)byOpen[e.proOpeningId]=(byOpen[e.proOpeningId]||0)+1;
console.log(`scanned ${scanned} non-losing games; wrote ${out.length} carlsen refs across ${Object.keys(byOpen).length} openings; total file=${merged.length}`);
console.log(Object.entries(byOpen).map(([k,v])=>k.replace('pro-carlsen-','')+':'+v).join('  '));

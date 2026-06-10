#!/usr/bin/env node
// Swindle/trap detector v5 — FAST + cross-band noise filter.
// Detection = punish-gem condition (common opponent move that Stockfish
// punishes), run over a walk that branches on the TRAPPER's aggressive tries.
// NO escape filter (refutation is RECORDED to teach, never to drop a trap).
// SPEED: shallow scan (depth 14) to spot the +1.2 blunder, deep confirm (20) on
// hits. NOISE FILTER (David 2026-06-10): include the 0 bucket for DISCOVERY but
// require the bait to ALSO appear at 1000+ (cross-band) — a real natural mistake
// shows across levels; a random 400-move lives only in the 0 bucket → dropped.
import { Chess } from 'chess.js';
import { spawn } from 'child_process';
const SF = process.env.STOCKFISH_PATH || '/usr/games/stockfish';
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const DISCOVER = process.env.DISCOVER || '0,1000,1200,1400,1600,1800,2000'; // includes the low end
const VALIDATE = process.env.VALIDATE || '1000,1200,1400,1600,1800,2000';   // coherent-play floor
const WALK_PLIES = Number(process.env.WALK_PLIES ?? 10);
const KW = Number(process.env.KW ?? 4), KB = Number(process.env.KB ?? 2);
const MIN_GAMES = Number(process.env.MIN_GAMES ?? 30);
const PUNISH = Number(process.env.PUNISH ?? 120), GAP = Number(process.env.GAP ?? 120);
const MIN_BAIT = Number(process.env.MIN_BAIT ?? 20); // bait must be played in >= this many games
const NODE_CAP = Number(process.env.NODE_CAP ?? 60);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
process.on('unhandledRejection',e=>console.error('[warn]',String(e).slice(0,100)));
const log=s=>{process.stdout.write(s+'\n');};

function multipv(fen, depth, n=4, ms=8000){return new Promise((res)=>{let sf;try{sf=spawn(SF);}catch{return res([]);}const map=new Map();const done=()=>{try{sf.kill();}catch{}};sf.on('error',()=>res([]));sf.stdout.on('data',(d)=>{for(const ln of d.toString().split('\n')){const mp=ln.match(/ multipv (\d+) /),sc=ln.match(/score (cp|mate) (-?\d+)/),pv=ln.match(/ pv (.+)/);if(mp&&sc&&pv){const cp=sc[1]==='mate'?(parseInt(sc[2])>0?1e5:-1e5):parseInt(sc[2]);map.set(parseInt(mp[1]),{cp,pv:pv[1].trim()});}}if(/bestmove/.test(d.toString())){done();fin();}});let f=false;const fin=()=>{if(f)return;f=true;const out=[...map.entries()].sort((a,b)=>a[0]-b[0]).map(([,v])=>{const c=new Chess(fen);const u=v.pv.split(' ')[0];let san=u;try{san=c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}).san;}catch{}return{san,cp:v.cp,pv:v.pv};});res(out);};sf.stdin.write(`setoption name MultiPV value ${n}\nposition fen ${fen}\ngo depth ${depth}\n`);setTimeout(()=>{done();fin();},ms);});}
async function expl(sanPath,ratings){try{const c=new Chess();const uci=sanPath.map(m=>{const x=c.move(m);return x.from+x.to+(x.promotion??'');});const r=await fetch(`${PROXY}?source=lichess&ratings=${ratings}&speeds=blitz,rapid,classical&play=${uci.join(',')}`);if(!r.ok)return null;const j=await r.json();const tot=(j.white||0)+(j.draws||0)+(j.black||0);return{tot,moves:(j.moves||[]).map(m=>({san:m.san,games:(m.white||0)+(m.draws||0)+(m.black||0),pct:tot?((m.white||0)+(m.draws||0)+(m.black||0))/tot:0}))};}catch{return null;}}
function sanPV(fen,pv,n=6){const c=new Chess(fen);const o=[];for(const u of pv.split(' ').slice(0,n)){try{o.push(c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}).san);}catch{break;}}return o.join(' ');}
const NATURAL=san=>/^O-O/.test(san)||/x/.test(san)||/^[NB][a-h]?[1-8]?[a-h][1-8]/.test(san)||/^[a-h][45]$/.test(san)||/^d|^e/.test(san); // dev/castle/capture/central
const RANDOMISH=san=>/^[a-h][3-6]$/.test(san)&&/^[ah]/.test(san); // a/h pawn pushes = edge noise candidates

async function checkNode(sanPath, exDisc, exVal, trapper){
  const c=new Chess(); for(const m of sanPath)c.move(m); const fen=c.fen();
  // shallow scan first
  const shallow=await multipv(fen,14,4,6000); if(shallow.length<2)return null;
  const best=shallow[0]; const smap=new Map(shallow.map(m=>[m.san,m]));
  const valSet=new Set((exVal?.moves||[]).map(m=>m.san)); // moves coherent players also make
  for(const hm of (exDisc.moves||[]).slice(0,3)){
    const d=smap.get(hm.san); if(!d||hm.san===best.san) continue;
    if((hm.games||0)<MIN_BAIT) continue; // too thin to be a real trap
    if((-d.cp)<PUNISH || (best.cp-d.cp)<GAP) continue;          // not a real blunder
    // NOISE FILTER: bait must be natural AND survive into 1000+ play (cross-band)
    const crossBand = valSet.has(hm.san);
    if(!NATURAL(hm.san) && !crossBand) continue;                 // random-ish + 0-only → noise
    // CONFIRM deep
    const deep=await multipv(fen,20,4,9000); const dm=new Map(deep.map(m=>[m.san,m]));
    const db=dm.get(hm.san), dbest=deep[0]; if(!db) continue;
    if((-db.cp)<PUNISH || (dbest.cp-db.cp)<GAP) continue;        // washed out deep → skip
    const c2=new Chess(fen); c2.move(hm.san); const pun=await multipv(c2.fen(),18,1,7000);
    const valPct=exVal?.moves?.find(m=>m.san===hm.san)?.pct ?? 0;
    return { sanPath:[...sanPath],
             baitMove: sanPath[sanPath.length-1],   // YOUR lure (the trapper's last move)
             error:hm.san, errorPctAll:hm.pct, errorGames:hm.games, errorPct1000:valPct, // THEIR common wrong reply
             studentAfter:-db.cp, refutation:dbest.san,                                   // their only correct move
             punish:pun[0]?sanPV(c2.fen(),pun[0].pv,6):'',
             crossBand, natural:NATURAL(hm.san) };
  }
  return null;
}
async function walkCfg(name, seed, trapper, WP, NC, GLOBAL){
  const found=[]; let nodes=0;
  async function rec(path, depth){
    if(depth>=WP || nodes>=NC) return;
    const c=new Chess(); for(const m of path)c.move(m);
    const exD=await expl(path,DISCOVER); await sleep(25);
    if(!exD||exD.tot<MIN_GAMES||!exD.moves.length) return;
    if(c.turn()!==trapper){
      const k=c.fen().split(' ').slice(0,2).join(' ');
      if(!GLOBAL.has(k)){ GLOBAL.add(k); nodes++;
        try{ const exV=await expl(path,VALIDATE); await sleep(20);
          const sN=await checkNode(path,exD,exV,trapper);
          if(sN){ sN.opening=name; found.push(sN); log(`  ✦ ${name} @ ${path.join(' ')} | bait ${sN.baitMove} → error ${sN.error}(${sN.errorGames}g) +${sN.studentAfter}cp | punish ${sN.punish.split(' ').slice(0,2).join(' ')} | refutation ${sN.refutation}`); }
        }catch(e){}
      }
      for(const m of exD.moves.slice(0,KB)) await rec([...path,m.san],depth+1);
    } else { for(const m of exD.moves.slice(0,KW)) await rec([...path,m.san],depth+1); }
  }
  await rec(seed, seed.length);
  return found;
}
async function walk(name, seed, trapper){
  log(`\n########## ${name} (trapper=${trapper}) ##########`);
  const found=[]; const seen=new Set(); let nodes=0;
  async function rec(path, depth){
    if(depth>=WALK_PLIES || nodes>=NODE_CAP) return;
    const c=new Chess(); for(const m of path)c.move(m);
    const exD=await expl(path,DISCOVER); await sleep(30);
    if(!exD||exD.tot<MIN_GAMES||!exD.moves.length) return;
    if(c.turn()!==trapper){
      const k=c.fen().split(' ').slice(0,2).join(' ');
      if(!seen.has(k)){ seen.add(k); nodes++;
        try{ const exV=await expl(path,VALIDATE); await sleep(25);
          const s=await checkNode(path, exD, exV, trapper);
          if(s){found.push(s); log(`  ✦ TRAP @ ${path.join(' ')}\n      bait ${s.baitMove} → error ${s.error} (all:${(s.errorPctAll*100).toFixed(0)}% ${s.errorGames}g | 1000+:${(s.errorPct1000*100).toFixed(0)}%) → +${s.studentAfter}cp | punish ${s.punish} | refutation ${s.refutation} ${s.crossBand?'[cross-band✓]':'[0-only]'} ${s.natural?'':'[unnatural!]'}`);}
        }catch(e){ log(`  [node err] ${String(e).slice(0,60)}`); }
      }
      for(const m of exD.moves.slice(0,KB)) await rec([...path,m.san],depth+1);
    } else { for(const m of exD.moves.slice(0,KW)) await rec([...path,m.san],depth+1); }
  }
  await rec(seed, seed.length);
  log(`  → ${found.length} trap(s) / ${nodes} nodes checked.`);
  return found;
}
// Tactical openings where trapper-aggression swindles concentrate (trapper=White).
const TACTICAL=[
 ["Bishop's Opening",['e4','e5','Bc4'],'w'], ['Italian Game',['e4','e5','Nf3','Nc6','Bc4'],'w'],
 ['Two Knights/Fried Liver',['e4','e5','Nf3','Nc6','Bc4','Nf6'],'w'], ['Evans Gambit',['e4','e5','Nf3','Nc6','Bc4','Bc5','b4'],'w'],
 ['Scotch',['e4','e5','Nf3','Nc6','d4'],'w'], ['Ponziani',['e4','e5','Nf3','Nc6','c3'],'w'],
 ['Vienna',['e4','e5','Nc3'],'w'], ["King's Gambit",['e4','e5','f4'],'w'],
 ['Danish/Center',['e4','e5','d4'],'w'], ['Alapin Sicilian',['e4','c5','c3'],'w'],
 ['Smith-Morra',['e4','c5','d4'],'w'], ['Rossolimo',['e4','c5','Nf3','Nc6','Bb5'],'w'],
 ['Grand Prix',['e4','c5','Nc3'],'w'], ['Blackmar-Diemer',['d4','d5','e4'],'w'],
 ['Scandinavian Trap',['e4','d5','exd5'],'w'], ['Stafford-prone Petrov',['e4','e5','Nf3','Nf6'],'w'],
];
const SET=process.env.SET||'demo';
import {readFileSync as _rd, writeFileSync as _wr} from 'fs';
function loadAll(){
  const ld=p=>{const d=JSON.parse(_rd(p,'utf8'));return d.openings??d;};
  const ops=[...ld('src/data/repertoire.json'),...ld('src/data/gambits.json'),...ld('src/data/pro-repertoires.json')];
  const roots=[];
  for(const o of ops){ const col=(o.color||'white')[0]; const pgn=(o.pgn||'').trim().split(/\s+/).filter(Boolean);
    if(pgn.length>=3) roots.push({name:o.id,seed:pgn.slice(0,4),col,kind:'main'});
    for(const v of (o.variations||[])){ const vp=(v.pgn||'').trim().split(/\s+/).filter(Boolean);
      if(vp.length>=4) roots.push({name:`${o.id}::${(v.name||'var').slice(0,28)}`,seed:vp,col,kind:'var'}); } }
  return roots;
}
const OUT='/tmp/swindle-all.json';
const all=[];
const persist=()=>{ try{ _wr(OUT, JSON.stringify(all,null,1)); }catch{} };
if(SET==='all'){
  const roots=loadAll(); log(`loaded ${roots.length} walk roots (mains+variations) from 130 openings`);
  const GLOBAL=new Set();   // global FEN dedup across all roots
  let done=0;
  for(const r of roots){
    // shallower caps for variation roots (just probe past the tabiya); cheap dedup
    process.env.__='';
    const capWP = r.kind==='var' ? 4 : 9;  const capN = r.kind==='var' ? 6 : 22;
    try{ const f=await walkCfg(r.name,r.seed,r.col,capWP,capN,GLOBAL); all.push(...f); }catch(e){ log(`[${r.name} err] `+String(e).slice(0,70)); }
    if(++done%10===0){ persist(); log(`  …${done}/${roots.length} roots, ${all.length} traps so far`); }
  }
  persist();
  log(`\n==================== TOTAL: ${all.length} traps across ${roots.length} roots ====================`);
} else {
  const targets = SET==='tactical' ? TACTICAL : [["Bishop's Opening",['e4','e5','Bc4'],'w'],['Alapin Sicilian',['e4','c5','c3'],'w']];
  for(const [name,seed,col] of targets){ try{ all.push(...await walk(name,seed,col)); }catch(e){ log(`[${name} err] `+String(e).slice(0,80)); } }
  log(`\n==================== TOTAL: ${all.length} traps across ${targets.length} openings ====================`);
  for(const s of all) log(`  ${s.sanPath.join(' ')} | bait ${s.baitMove} → error ${s.error} (${s.errorGames}g) +${s.studentAfter}cp | punish ${s.punish.split(' ').slice(0,2).join(' ')} | refutation ${s.refutation}`);
}

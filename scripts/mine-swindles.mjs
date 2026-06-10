#!/usr/bin/env node
// Swindle/trap detector v4 — CORRECTED per David 2026-06-10.
// The detection is the SAME as the punish-gem miner (common opponent move that
// Stockfish punishes). The NEW part is the WALK: branch on the TRAPPER's
// aggressive/sac/gambit tries (not just the sound spine), where these traps
// live. NO escape-difficulty filter — a trap is valuable even if some opponents
// refute it (that 10% who don't = wins). The refutation is RECORDED to TEACH
// alongside, never to filter. All ratings (RATINGS overridable), low freq floor.
import { Chess } from 'chess.js';
import { spawn } from 'child_process';
const SF = process.env.STOCKFISH_PATH || '/usr/games/stockfish';
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const RATINGS = process.env.RATINGS || '1200,1400,1600,1800,2000'; // all-ratings by default
const WALK_PLIES = Number(process.env.WALK_PLIES ?? 12);
const KW = Number(process.env.KW ?? 5);     // trapper branch width (catch aggressive tries)
const KB = Number(process.env.KB ?? 2);     // opponent continuation width
const MIN_GAMES = Number(process.env.MIN_GAMES ?? 30);
const PUNISH = Number(process.env.PUNISH ?? 120);  // student ≥ +1.2 after the bait
const GAP = Number(process.env.GAP ?? 120);        // bait is ≥120cp worse than opponent's best
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
process.on('unhandledRejection',e=>console.error('[warn] unhandledRejection',String(e).slice(0,120)));

function multipv(fen, depth, n=6, ms=12000){return new Promise((res)=>{const sf=spawn(SF);const map=new Map();sf.stdout.on('data',(d)=>{for(const ln of d.toString().split('\n')){const mp=ln.match(/ multipv (\d+) /),sc=ln.match(/score (cp|mate) (-?\d+)/),pv=ln.match(/ pv (.+)/);if(mp&&sc&&pv){const cp=sc[1]==='mate'?(parseInt(sc[2])>0?1e5:-1e5):parseInt(sc[2]);map.set(parseInt(mp[1]),{cp,pv:pv[1].trim()});}}if(/bestmove/.test(d.toString())){sf.kill();fin();}});let done=false;const fin=()=>{if(done)return;done=true;const out=[...map.entries()].sort((a,b)=>a[0]-b[0]).map(([,v])=>{const c=new Chess(fen);const u=v.pv.split(' ')[0];let san=u;try{san=c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}).san;}catch{}return{uci:u,san,cp:v.cp,pv:v.pv};});res(out);};sf.stdin.write(`setoption name MultiPV value ${n}\nposition fen ${fen}\ngo depth ${depth}\n`);setTimeout(fin,ms);});}
async function expl(sanPath){try{const c=new Chess();const uci=sanPath.map(m=>{const x=c.move(m);return x.from+x.to+(x.promotion??'');});const r=await fetch(`${PROXY}?source=lichess&ratings=${RATINGS}&speeds=blitz,rapid,classical&play=${uci.join(',')}`);if(!r.ok)return null;const j=await r.json();const tot=(j.white||0)+(j.draws||0)+(j.black||0);return{tot,moves:(j.moves||[]).map(m=>({san:m.san,games:(m.white||0)+(m.draws||0)+(m.black||0),pct:tot?((m.white||0)+(m.draws||0)+(m.black||0))/tot:0}))};}catch{return null;}}
function sanPV(fen,pv,n=6){const c=new Chess(fen);const o=[];for(const u of pv.split(' ').slice(0,n)){try{o.push(c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}).san);}catch{break;}}return o.join(' ');}

async function checkNode(sanPath, trapper, ex){
  const c=new Chess(); for(const m of sanPath)c.move(m); const fen=c.fen();
  const deep=await multipv(fen,22,6); if(deep.length<2)return null;
  const best=deep[0]; const dmap=new Map(deep.map(m=>[m.san,m]));
  // check the opponent's COMMON human moves (not just #1) for a punishable blunder
  for(const hm of ex.moves.slice(0,3)){
    const d=dmap.get(hm.san); if(!d) continue;             // bait outside top-6 deep
    if(hm.san===best.san) continue;                         // their best move, no trap
    const studentAfter = -d.cp;                             // student's eval after the bait
    if(studentAfter>=PUNISH && (best.cp - d.cp)>=GAP){
      // the punishment = student's best reply after the bait
      const c2=new Chess(fen); c2.move(hm.san);
      const pun=await multipv(c2.fen(),20,1);
      return { sanPath:[...sanPath], bait:hm.san, baitPct:hm.pct, baitGames:hm.games,
               studentAfter, refutation:best.san, refutationCp:best.cp,
               punish: pun[0]?sanPV(c2.fen(),pun[0].pv,6):'', punishCp: pun[0]?-pun[0].cp:null };
    }
  }
  return null;
}

async function walk(name, seed, trapper){
  console.log(`\n########## ${name} (trapper=${trapper}) ##########`);
  const found=[]; const seen=new Set(); let nodes=0;
  async function rec(path, depth){
    if(depth>=WALK_PLIES) return;
    const c=new Chess(); for(const m of path)c.move(m);
    const ex=await expl(path); await sleep(35);
    if(!ex||ex.tot<MIN_GAMES||!ex.moves.length) return;
    if(c.turn()!==trapper){ // opponent to move → check + continue down their replies
      const k=c.fen().split(' ').slice(0,2).join(' ');
      if(!seen.has(k)){ seen.add(k); nodes++;
        const s=await checkNode(path, trapper, ex);
        if(s){found.push(s); console.log(`  ✦ TRAP @ ${path.join(' ')}\n      bait ${s.bait} (${(s.baitPct*100).toFixed(0)}%, ${s.baitGames}g) → student +${s.studentAfter}cp | punish: ${s.punish} (+${s.punishCp}) | better was ${s.refutation}`);}
      }
      for(const m of ex.moves.slice(0,KB)) await rec([...path,m.san],depth+1);
    } else { for(const m of ex.moves.slice(0,KW)) await rec([...path,m.san],depth+1); }
  }
  await rec(seed, seed.length);
  console.log(`  → ${found.length} trap node(s) / ${nodes} opponent nodes checked.`);
  return found;
}
const all=[];
try{ all.push(...await walk("Bishop's Opening", ['e4','e5','Bc4'], 'w')); }catch(e){ console.error('[Bishop walk error]', String(e).slice(0,160)); }
try{ all.push(...await walk("Alapin Sicilian", ['e4','c5','c3'], 'w')); }catch(e){ console.error('[Alapin walk error]', String(e).slice(0,160)); }
console.log(`\n==================== TOTAL: ${all.length} trap nodes ====================`);

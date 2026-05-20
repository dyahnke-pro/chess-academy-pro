#!/usr/bin/env node
/**
 * Generic trap+pitfall miner for arbitrary opening-entry files
 * (gambits.json, pro-repertoires.json). Resolves Lichess opening
 * tags from each entry's NAME, mines puzzles in both directions,
 * Stockfish-verifies (trap >= +150 / mate-for-student; pitfall
 * <= -150 / mated), and writes the entries back in place with
 * setupFen (pending the lead-in fetch).
 *
 *   node scripts/mine-entries.mjs <file> <openingsAccessor>
 *     file: src/data/gambits.json | src/data/pro-repertoires.json
 *     accessor: 'array' | 'openings'
 *
 * Idempotent (skips puzzle IDs already present by source). Aims for
 * up to TARGET of each per entry.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const STOCKFISH='/usr/games/stockfish', DEPTH=14, CONC=6, BAR=150, TARGET=5;
const [,, FILE, ACCESSOR] = process.argv;
if (!FILE) { console.error('usage: mine-entries.mjs <file> <array|openings>'); process.exit(1); }

const puzzles = JSON.parse(readFileSync('src/data/puzzles.json','utf-8'));
const PUZZLES = Array.isArray(puzzles) ? puzzles : Object.values(puzzles);

// Name → Lichess opening-tag regexes. Covers gambit + pro entry names.
const NAME_TAGS = [
  [/king'?s gambit/i, /Kings_Gambit/i],
  [/evans gambit/i, /Evans_Gambit/i],
  [/scotch/i, /Scotch_Game|Scotch_Gambit/i],
  [/vienna/i, /Vienna_Game|Vienna_Gambit/i],
  [/danish/i, /Danish_Gambit/i],
  [/smith.?morra/i, /Smith-Morra|Sicilian.*Smith/i],
  [/stafford/i, /Russian_Game|Petrov/i],
  [/marshall/i, /Ruy_Lopez.*Marshall|Marshall_Attack/i],
  [/englund/i, /Englund/i],
  [/budapest/i, /Budapest/i],
  [/albin/i, /Albin/i],
  [/benko|volga/i, /Benko|Volga/i],
  [/blackmar/i, /Blackmar/i],
  [/alapin|fantasy.*caro|caro.?kann/i, /Sicilian_Defense_Alapin|Caro-Kann/i],
  [/najdorf/i, /Sicilian_Defense_Najdorf/i],
  [/dragon/i, /Sicilian_Defense_Dragon/i],
  [/sveshnikov/i, /Sveshnikov|Lasker_Pelikan/i],
  [/king'?s indian/i, /Kings_Indian/i],
  [/grunfeld|grünfeld/i, /Gru.nfeld/i],
  [/semi.?slav/i, /Semi-Slav|Meran/i],
  [/\bslav\b/i, /Slav_Defense/i],
  [/jobava|london/i, /London|Jobava/i],
  [/italian/i, /Italian_Game/i],
  [/ruy lopez|spanish/i, /Ruy_Lopez/i],
  [/french/i, /French_Defense/i],
  [/nimzo/i, /Nimzo/i],
  [/queen'?s indian/i, /Queens_Indian/i],
  [/catalan/i, /Catalan/i],
  [/queen'?s gambit declined|qgd/i, /Queens_Gambit_Declined/i],
  [/queen'?s gambit accepted|qga/i, /Queens_Gambit_Accepted/i],
  [/queen'?s gambit/i, /Queens_Gambit/i],
  [/pirc/i, /Pirc/i],
  [/dutch/i, /Dutch/i],
  [/trompowsky/i, /Trompowsky/i],
  [/scandinavian/i, /Scandinavian/i],
  [/petrov|petroff|russian game/i, /Russian_Game|Petrov/i],
  [/four knights/i, /Four_Knights/i],
  [/two knights/i, /Two_Knights/i],
  [/philidor/i, /Philidor/i],
  [/english/i, /English_Opening/i],
  [/reti|réti/i, /Reti|Zukertort/i],
  [/bird/i, /Bird/i],
  [/benoni/i, /Benoni/i],
  [/old indian/i, /Old_Indian/i],
];
function tagsFor(name){ const out=[]; for(const [n,t] of NAME_TAGS) if(n.test(name)) out.push(t); return out; }

const TRAP_THEMES=new Set(['fork','pin','skewer','mate','mateIn1','mateIn2','mateIn3','sacrifice','hangingPiece','attractionDeflection','attraction','deflection','attackingF2F7','exposedKing','kingsideAttack','queensideAttack','discoveredAttack','doubleCheck','smotheredMate','opening','trappedPiece','capturingDefender']);
const THEME_NAMES={mate:'Mating Strike',mateIn1:'Mate in One',mateIn2:'Mate in Two',mateIn3:'Mate in Three',fork:'Fork',pin:'Pin',skewer:'Skewer',sacrifice:'Sacrifice',hangingPiece:'Hanging Piece',attractionDeflection:'Attraction',attraction:'Attraction',deflection:'Deflection',attackingF2F7:'F-pawn Strike',exposedKing:'King Hunt',kingsideAttack:'Kingside Attack',queensideAttack:'Queenside Attack',discoveredAttack:'Discovered Attack',doubleCheck:'Double Check',smotheredMate:'Smothered Mate',trappedPiece:'Trapped Piece',capturingDefender:'Removing the Defender'};
const PRIORITY=['smotheredMate','mateIn1','mateIn2','mateIn3','mate','fork','skewer','pin','sacrifice','discoveredAttack','doubleCheck','attractionDeflection','attraction','deflection','attackingF2F7','kingsideAttack','queensideAttack','exposedKing','hangingPiece','trappedPiece','capturingDefender'];
function primary(themes){for(const p of PRIORITY)if(themes.includes(p)&&THEME_NAMES[p])return THEME_NAMES[p];return null;}

function matches(p,regexes){ if(typeof p.openingTags!=='string')return false; return regexes.some(re=>re.test(p.openingTags)); }
function isTrappy(p){ return Array.isArray(p.themes)&&p.themes.some(t=>TRAP_THEMES.has(t)); }
function recon(p){ const c=new Chess(p.fen); const sans=[]; for(const u of p.moves.trim().split(/\s+/)){const f=u.slice(0,2),t=u.slice(2,4),pr=u.length===5?u[4]:undefined;try{sans.push(c.move({from:f,to:t,promotion:pr}).san);}catch{return null;}} return {startFen:p.fen,sans,finalFen:c.fen(),finalSTM:c.turn()==='w'?'white':'black',ply:p.moves.trim().split(/\s+/).length}; }

async function evalFen(fen){return new Promise(res=>{const sf=spawn(STOCKFISH);let buf='',ev=null,seen=false;sf.stdout.on('data',d=>{buf+=d;const ls=buf.split('\n');buf=ls.pop()??'';for(const l of ls){if(l.startsWith('info depth ')){const c=l.match(/score cp (-?\d+)/),m=l.match(/score mate (-?\d+)/);if(m)ev={type:'mate',value:+m[1]};else if(c)ev={type:'cp',value:+c[1]};}if(l.startsWith('bestmove')){seen=true;sf.kill();res(ev);}}});sf.on('error',()=>res(null));sf.on('close',()=>{if(!seen)res(ev);});sf.stdin.write(`uci\nposition fen ${fen}\ngo depth ${DEPTH}\n`);setTimeout(()=>{try{sf.stdin.write('stop\nquit\n');}catch{}},8000);});}
function persp(raw,stm,color){if(!raw)return null;const flip=stm!==color;return raw.type==='cp'?{type:'cp',value:flip?-raw.value:raw.value}:{type:'mate',value:flip?-raw.value:raw.value};}
async function pconc(items,fn,n){const r=new Array(items.length);let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<items.length){const k=i++;r[k]=await fn(items[k]);}}));return r;}

const data=JSON.parse(readFileSync(FILE,'utf-8'));
const arr = ACCESSOR==='openings' ? (data.openings??[]) : (Array.isArray(data)?data:Object.values(data));

let addedT=0, addedP=0, terminalMate=0;
for (const op of arr) {
  const regexes=tagsFor(op.name||'');
  if(regexes.length===0){ continue; }
  const color=op.color;
  const cands=PUZZLES.filter(p=>matches(p,regexes)&&isTrappy(p)).map(recon).filter(Boolean)
    .map((r,i)=>({...r,puzzle:PUZZLES.filter(p=>matches(p,regexes)&&isTrappy(p))[i]}));
  // recompute cleanly to keep puzzle ref
  const pool=PUZZLES.filter(p=>matches(p,regexes)&&isTrappy(p));
  const reconned=pool.map(p=>({p,r:recon(p)})).filter(x=>x.r);
  // sort by rating*plays
  reconned.sort((a,b)=>(b.p.rating*10+(b.p.nbPlays||0))-(a.p.rating*10+(a.p.nbPlays||0)));
  const top=reconned.slice(0,40);
  const evaled=await pconc(top, async ({p,r})=>{
    const startSide=r.startFen.split(' ')[1]==='w'?'white':'black';
    const lastMover=r.ply%2===1?startSide:(startSide==='white'?'black':'white');
    let se;
    const term=new Chess(r.finalFen);
    if(term.isCheckmate()){ const loser=r.finalSTM; se={type:'mate',value:loser===color?-1:1}; }
    else { se=persp(await evalFen(r.finalFen),r.finalSTM,color); }
    return {p,r,lastMover,se};
  },CONC);

  if(!Array.isArray(op.trapLines))op.trapLines=[];
  if(!Array.isArray(op.warningLines))op.warningLines=[];
  const haveT=new Set(op.trapLines.filter(t=>t.source).map(t=>t.source));
  const haveP=new Set(op.warningLines.filter(w=>w.source).map(w=>w.source));

  for(const {p,r,lastMover,se} of evaled){
    if(!se)continue;
    const src=`lichess-puzzle:${p.id}`;
    const trapOK = lastMover===color && (se.type==='mate'?se.value>0:se.value>=BAR);
    const pitOK  = lastMover!==color && (se.type==='mate'?se.value<0:se.value<=-BAR);
    const ev = se.type==='mate'?(se.value>0?'mate':'mated-in-'+(-se.value)):`${se.value}cp`;
    if(trapOK && op.trapLines.length<TARGET && !haveT.has(src)){
      const nm=primary(p.themes)||'Tactic';
      op.trapLines.push({name:`${nm} #${op.trapLines.filter(t=>t.source).length+1}`,pgn:r.sans.join(' '),setupFen:r.startFen,explanation:`${nm}: Stockfish confirms the student wins (${ev}). From a real Lichess game (rating ${p.rating}).`,source:src,verifiedEval:ev});
      haveT.add(src); addedT++;
    } else if(pitOK && op.warningLines.length<TARGET && !haveP.has(src)){
      const nm=primary(p.themes)||'Tactic';
      op.warningLines.push({name:`Pitfall: ${nm.toLowerCase()} #${op.warningLines.filter(w=>w.source).length+1}`,pgn:r.sans.join(' '),setupFen:r.startFen,explanation:`Pitfall: if the student walks into this, Stockfish confirms they end ${ev}. From a real Lichess game (rating ${p.rating}).`,source:src,verifiedEval:ev});
      haveP.add(src); addedP++;
    }
  }
}

writeFileSync(FILE, JSON.stringify(data,null,2)+'\n');
console.log(`${FILE}: added ${addedT} traps, ${addedP} pitfalls`);
let gaps=0;
for(const op of arr){const t=(op.trapLines||[]).length,w=(op.warningLines||[]).length;if(t<3||w<3){gaps++;}}
console.log(`entries still <3+3: ${gaps}/${arr.length}`);

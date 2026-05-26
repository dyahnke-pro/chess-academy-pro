// Audits ORIGINAL (pre-change) plan lines against the playbook's real bar:
// a past-book ply is legitimate if MASTER-PLAYED (local masters DB) OR
// ENGINE-SOUND (<=120cp loss). Only "neither" = genuinely wrong.
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
const DB=JSON.parse(readFileSync('public/data/openings-masters-db.json','utf8')).positions;
const SF='/usr/games/stockfish';const D=16;const k4=f=>f.split(' ').slice(0,4).join(' ');
const orig=JSON.parse(readFileSync('/tmp/orig-plans.json','utf8'));
const rep=JSON.parse(readFileSync('src/data/repertoire.json','utf8'));
const pro=JSON.parse(readFileSync('src/data/pro-repertoires.json','utf8'));
const color={};for(const s of [rep,pro])if(Array.isArray(s))for(const o of s)if(o&&o.id&&o.color)color[o.id]=o.color;
function ev(fen,sm){return new Promise(res=>{const sf=spawn(SF);let last=null,done=false;const fin=v=>{if(!done){done=true;try{sf.kill();}catch{}res(v);}};let buf='';sf.stdout.on('data',d=>{buf+=d.toString();const ls=buf.split('\n');buf=ls.pop()??'';for(const line of ls){const cp=line.match(/score cp (-?\d+)/);const m=line.match(/score mate (-?\d+)/);if(m)last=parseInt(m[1])>0?1e5:-1e5;else if(cp)last=parseInt(cp[1]);if(line.startsWith('bestmove'))fin(last);}});sf.on('error',()=>fin(null));sf.stdin.write(`position fen ${fen}\ngo depth ${D}${sm?` searchmoves ${sm}`:''}\n`);setTimeout(()=>fin(last),12000);});}
const ids=process.argv.slice(2);
for(const id of ids){
  const p=orig.find(x=>x.id===id);if(!p){console.log(`\n### ${id}: NOT IN ORIGINAL`);continue;}
  const stud=color[p.openingId]||'?';const sc=stud==='black'?'b':stud==='white'?'w':null;
  const l=p.playableLines[0];const c=new Chess(l.fen);
  console.log(`\n### ${id} (student=${stud}) | "${l.title}"\n   line: ${l.moves.join(' ')}`);
  let wrong=0, studentWrong=0;
  for(let i=0;i<l.moves.length;i++){
    const before=c.fen();const mover=c.turn();let mv;try{mv=c.move(l.moves[i]);}catch{console.log(`   ${i+1}. ${l.moves[i]} ILLEGAL`);break;}
    const entry=DB[k4(before)];
    const inDB=Array.isArray(entry);
    const mEntry=inDB?entry.find(e=>e.san===mv.san):null;
    const masterPlayed=!!mEntry;
    const best=await ev(before);const played=await ev(before,mv.from+mv.to+(mv.promotion??''));
    const loss=(best!=null&&played!=null)?best-played:null;
    const engineSound=loss!=null&&loss<=120;
    const isStudent=sc?mover===sc:true;
    const ok = masterPlayed || engineSound;
    if(!ok){wrong++;if(isStudent)studentWrong++;}
    const tag = masterPlayed?`MASTER(${mEntry.games}g)`:(inDB?`not-in-DB-list`:`pos-not-in-DB`);
    console.log(`   ${i+1}. ${mv.san} [${isStudent?'STU':'opp'}] ${tag} | loss ${loss} | ${ok?'OK':'**WRONG**'}`);
  }
  const verdict = studentWrong>0 ? 'ACTUALLY WRONG (student ply neither master-played nor sound) -> KEEP FIX'
    : wrong>0 ? 'opp-only-wrong (bait-like) -> likely REVERT'
    : 'LEGIT (every ply master-played or engine-sound) -> REVERT my change';
  console.log(`   ==> ${verdict}`);
}

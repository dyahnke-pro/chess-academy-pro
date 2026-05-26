// Grounded audit of ALL current middlegame plans against the playbook bar:
// a ply is wrong only if NEITHER master-played (local DB) NOR engine-sound
// (<=120cp). Reports STUDENT-side wrongs (real problems) vs opp-only.
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
const DB=JSON.parse(readFileSync('public/data/openings-masters-db.json','utf8')).positions;
const SF='/usr/games/stockfish';const D=16;const k4=f=>f.split(' ').slice(0,4).join(' ');
const plans=JSON.parse(readFileSync('src/data/middlegame-plans.json','utf8'));
const rep=JSON.parse(readFileSync('src/data/repertoire.json','utf8'));
const pro=JSON.parse(readFileSync('src/data/pro-repertoires.json','utf8'));
const color={};for(const s of [rep,pro])if(Array.isArray(s))for(const o of s)if(o&&o.id&&o.color)color[o.id]=o.color;
function ev(fen,sm){return new Promise(res=>{const sf=spawn(SF);let last=null,done=false;const fin=v=>{if(!done){done=true;try{sf.kill();}catch{}res(v);}};let buf='';sf.stdout.on('data',d=>{buf+=d.toString();const ls=buf.split('\n');buf=ls.pop()??'';for(const line of ls){const cp=line.match(/score cp (-?\d+)/);const m=line.match(/score mate (-?\d+)/);if(m)last=parseInt(m[1])>0?1e5:-1e5;else if(cp)last=parseInt(cp[1]);if(line.startsWith('bestmove'))fin(last);}});sf.on('error',()=>fin(null));sf.stdin.write(`position fen ${fen}\ngo depth ${D}${sm?` searchmoves ${sm}`:''}\n`);setTimeout(()=>fin(last),12000);});}
let studWrong=[],oppOnly=[];
for(const p of plans){
  const sc=color[p.openingId]==='black'?'b':color[p.openingId]==='white'?'w':null;
  for(const l of p.playableLines??[]){
    const c=new Chess(l.fen);let sW=0,oW=0,detail=[];
    for(let i=0;i<l.moves.length;i++){const before=c.fen();const mover=c.turn();let mv;try{mv=c.move(l.moves[i]);}catch{break;}
      const entry=DB[k4(before)];const masterPlayed=Array.isArray(entry)&&entry.some(e=>e.san===mv.san);
      const best=await ev(before);const played=await ev(before,mv.from+mv.to+(mv.promotion??''));
      const loss=(best!=null&&played!=null)?best-played:null;const sound=loss!=null&&loss<=120;
      if(!masterPlayed&&!sound){const isS=sc?mover===sc:true;if(isS){sW++;detail.push(`${i+1}.${mv.san}[STU]${loss}cp`);}else{oW++;}}
    }
    if(sW>0)studWrong.push(`${p.id} (${p.openingId})  ${detail.join(' ')}`);
    else if(oW>0)oppOnly.push(`${p.id} (${p.openingId})`);
  }
}
console.log(`\n===== STUDENT-SIDE WRONG (real problems): ${studWrong.length} =====`);
studWrong.forEach(s=>console.log('  '+s));
console.log(`\n===== opp-only-wrong (likely fine / bait-like): ${oppOnly.length} =====`);
oppOnly.forEach(s=>console.log('  '+s));

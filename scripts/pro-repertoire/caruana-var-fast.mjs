import fs from 'node:fs';
import { Chess } from 'chess.js';
const raw = fs.readFileSync('data/sources/caruana-pgnmentor/Caruana.pgn','utf8').replace(/\r\n/g,'\n');
const H=(g,k)=>{const m=g.match(new RegExp(`\\[${k} "([^"]*)"\\]`));return m?m[1]:null;};
// pre-parse ONCE
const parsed=[];
for(const g of raw.split(/\n\n(?=\[Event )/)){
  const w=H(g,'White'),b=H(g,'Black');
  const cw=(w||'').toLowerCase().includes('caruana'),cb=(b||'').toLowerCase().includes('caruana');
  if(!cw&&!cb)continue;
  let c=new Chess(),sans;try{c.loadPgn(g,{sloppy:true});sans=c.history();}catch{continue;}
  if(sans.length<14)continue;
  parsed.push({side:cw?'white':'black',sans});
}
const PLAN={
 french:{color:'black',vars:{'Advance (3.e5)':['e4','e6','d4','d5','e5'],'Tarrasch (3.Nd2)':['e4','e6','d4','d5','Nd2'],'Exchange (3.exd5)':['e4','e6','d4','d5','exd5'],'Winawer (3.Nc3 Bb4)':['e4','e6','d4','d5','Nc3','Bb4'],'Classical (3.Nc3 Nf6)':['e4','e6','d4','d5','Nc3','Nf6']}},
 'caro-kann':{color:'black',vars:{'Advance (3.e5)':['e4','c6','d4','d5','e5'],'Exchange (3.exd5)':['e4','c6','d4','d5','exd5'],'Two Knights':['e4','c6','Nf3','d5','Nc3'],'Classical (4…Bf5)':['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Bf5'],'Fantasy (3.f3)':['e4','c6','d4','d5','f3']}},
 kid:{color:'black',vars:{'Classical (Nf3 …e5)':['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5'],'Saemisch (5.f3)':['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3'],'Four Pawns (5.f4)':['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f4'],'Fianchetto (g3)':['d4','Nf6','c4','g6','Nf3','Bg7','g3']}},
};
for(const [oid,{color,vars}] of Object.entries(PLAN)){
 console.log('\n######## '+oid.toUpperCase());
 for(const [name,prefix] of Object.entries(vars)){
   const matched=parsed.filter(p=>p.side===color && prefix.every((m,i)=>p.sans[i]===m)).map(p=>p.sans);
   if(matched.length<12){console.log('  [skip '+matched.length+'g] '+name);continue;}
   const spine=prefix.slice();
   while(spine.length<24){
     const on=matched.filter(s=>spine.every((m,i)=>s[i]===m)&&s.length>spine.length);
     if(on.length<3)break;const counts={};for(const s of on)counts[s[spine.length]]=(counts[s[spine.length]]||0)+1;
     const [best,n]=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];if(n<3)break;spine.push(best);
   }
   console.log('  ['+matched.length+'g] '+name+'\n     '+spine.join(' '));
 }
}

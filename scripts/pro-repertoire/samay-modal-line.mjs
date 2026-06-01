import fs from 'node:fs';
import { Chess } from 'chess.js';
const SRC='data/sources/samayraina-chesscom'; const PLAYER='samayraina';
const color=process.argv[2]||'black'; const seed=process.argv.slice(3);
function pgnToSan(t){const i=t.search(/\n\n/);if(i<0)return null;let b=t.slice(i).replace(/\{[^}]*\}/g,'');let p;do{p=b;b=b.replace(/\([^()]*\)/g,'')}while(b!==p);b=b.replace(/\b\d+\.+\s*/g,'').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/,'').trim();return b?b.split(/\s+/).filter(Boolean):null;}
function matches(m,p){if(m.length<p.length)return false;for(let i=0;i<p.length;i++)if(m[i]!==p[i])return false;return true;}
const games=[];
for(const f of fs.readdirSync(SRC).filter(x=>x.endsWith('.jsonl'))){
  for(const line of fs.readFileSync(`${SRC}/${f}`,'utf8').split('\n').filter(Boolean)){
    let g;try{g=JSON.parse(line)}catch{continue}
    if(!g.pgn||(g.rules&&g.rules!=='chess'))continue;
    const meW=(g.white?.username||'').toLowerCase()===PLAYER;
    if(!meW&&(g.black?.username||'').toLowerCase()!==PLAYER)continue;
    if((meW?'white':'black')!==color)continue;
    const s=pgnToSan(g.pgn); if(s)games.push(s);
  }
}
let cur=games.filter(s=>matches(s,seed)); let pfx=[...seed];
console.log(`seed [${seed.join(' ')}] (${color}): ${cur.length} games`);
for(let ply=seed.length; ply<seed.length+14; ply++){
  const t={}; for(const s of cur){const m=s[ply]; if(m)t[m]=(t[m]||0)+1;}
  const top=Object.entries(t).sort((a,b)=>b[1]-a[1]).slice(0,4);
  if(!top.length)break;
  const side=ply%2===0?'W':'B';
  console.log(`  ply${ply}(${side}): `+top.map(([m,c])=>`${m}:${c}`).join('  ')+`   [on-path ${cur.length}]`);
  cur=cur.filter(s=>s[ply]===top[0][0]); pfx.push(top[0][0]);
}
console.log('MODAL:', pfx.join(' '));

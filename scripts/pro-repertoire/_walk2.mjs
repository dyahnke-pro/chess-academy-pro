import fs from 'node:fs';import { Chess } from 'chess.js';
const A=new Set(['magnuscarlsen','drnykterstein','drdrunkenstein','manwithavan','drgrekenstein','stl_carlsen']);
const isM=n=>{n=(n||'').toLowerCase();return A.has(n)||n.includes('carlsen');};
const tag=(p,t)=>{const m=p.match(new RegExp('\\['+t+' "([^"]*)"\\]'));return m?m[1]:'';};
const bare=pgn=>{const i=pgn.search(/\n\n/);let b=i<0?pgn:pgn.slice(i);b=b.replace(/\{[^}]*\}/g,'');let p;do{p=b;b=b.replace(/\([^()]*\)/g,'')}while(b!==p);return b.replace(/\$\d+/g,'').replace(/\b\d+\.+\s*/g,'').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/,'').replace(/\s+/g,' ').trim();};
function* cc(){for(const f of fs.readdirSync('data/sources/magnuscarlsen-chesscom')){for(const l of fs.readFileSync('data/sources/magnuscarlsen-chesscom/'+f,'utf8').split('\n')){if(!l.trim())continue;let o;try{o=JSON.parse(l)}catch{continue;}if(o.pgn)yield o.pgn;}}
  for(const p of fs.readFileSync('data/sources/carlsen-otb/Carlsen.pgn','utf8').split(/\n\n(?=\[Event)/)) if(p.includes('[Event'))yield p;}
const board=f=>f.split(' ')[0];
const targets=JSON.parse(fs.readFileSync('/tmp/strong2.json','utf8'));
const data=targets.map(t=>({...t,bp:board(t.fen),seqs:[]}));
for(const pgn of cc()){const W=tag(pgn,'White'),B=tag(pgn,'Black');if(isM(W)===isM(B))continue;const sc=isM(W)?'w':'b';
  let sans;try{sans=bare(pgn).split(' ').filter(Boolean);}catch{continue;}const c=new Chess();
  try{for(let i=0;i<sans.length;i++){if(!c.move(sans[i]))break;const bp=board(c.fen());for(const t of data){if(t.sc!==sc)continue;if(bp===t.bp)t.seqs.push(sans.slice(i+1,i+13));}}}catch{continue;}}
for(const t of data){const c=new Chess(t.fen);const moves=[],lands=[];let pool=t.seqs.filter(s=>s.length>0);
  for(let ply=0;ply<10&&pool.length>=3;ply++){const cnt={};for(const s of pool)if(s[ply])cnt[s[ply]]=(cnt[s[ply]]||0)+1;const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];if(!top||top[1]<3)break;const mv=c.move(top[0]);if(!mv)break;moves.push(top[0]);if(mv.color===t.sc)lands.push(top[0]+'>'+mv.to);pool=pool.filter(s=>s[ply]===top[0]);}
  console.log(`\n### ${t.key} base=${t.seqs.length}\n  FEN: ${t.fen}\n  LINE: ${moves.join(' ')}\n  LANDS: ${lands.join('  ')}`);}

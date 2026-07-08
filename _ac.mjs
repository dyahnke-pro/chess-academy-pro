import { Chess } from 'chess.js';
import fs from 'fs';
const src=fs.readFileSync('./src/data/lessons/sublineNarrationD4Flank.ts','utf8');
const seqs=JSON.parse(fs.readFileSync('./_seqs.json','utf8'));
function pc(f,fr,to){const F='abcdefgh';const f1=F.indexOf(fr[0]),r1=+fr[1],f2=F.indexOf(to[0]),r2=+to[1];const adf=Math.abs(f2-f1),adr=Math.abs(r2-r1);if(!(adf===adr||f1===f2||r1===r2))return true;const df=Math.sign(f2-f1),dr=Math.sign(r2-r1);const c=new Chess(f);let cf=f1+df,cr=r1+dr,st=Math.max(adf,adr);for(let i=1;i<st;i++){if(c.get(F[cf]+cr))return false;cf+=df;cr+=dr;}return true;}
let iss=0;
for(const [n,seq] of Object.entries(seqs)){const moves=seq.split(' ');const m=src.match(new RegExp('const '+n+': SublineNarration = \\{[\\s\\S]*?\\n\\};'));if(!m){console.log(n,'NOT FOUND');iss++;continue;}
 for(const bm of m[0].matchAll(/atMove: (\d+),[\s\S]*?\}/g)){const at=+bm[1];const c=new Chess();let ok=true;for(let i=0;i<=at;i++){try{c.move(moves[i]);}catch(e){console.log(n+' illegal move idx '+i+': '+moves[i]);iss++;ok=false;break;}}if(!ok)continue;const fen=c.fen();const arrows=[...bm[0].matchAll(/_A\('([a-h][1-8])',\s*'([a-h][1-8])'/g)];for(const a of arrows){const p=new Chess(fen).get(a[1]);if(!p){console.log(n+'@'+at+' '+a[1]+' NO PIECE');iss++;continue;}if('nkp'.includes(p.type))continue;if(!pc(fen,a[1],a[2])){console.log(n+'@'+at+' '+a[1]+'->'+a[2]+' BLOCKED');iss++;}}}}
console.log(iss?iss+' ISSUES':'clean');

import fs from 'node:fs';import { Chess } from 'chess.js';
const A=new Set(['magnuscarlsen','drnykterstein','drdrunkenstein','manwithavan','drgrekenstein','stl_carlsen']);
const isM=n=>{n=(n||'').toLowerCase();return A.has(n)||n.includes('carlsen');};
const tag=(p,t)=>{const m=p.match(new RegExp('\\['+t+' "([^"]*)"\\]'));return m?m[1]:'';};
const clean=raw=>{const c=new Chess();try{c.loadPgn(raw,{sloppy:true});}catch{return null;}const h=c.history();return h.length<24?null:h;};
function* cc(){for(const f of fs.readdirSync('data/sources/magnuscarlsen-chesscom')){for(const l of fs.readFileSync('data/sources/magnuscarlsen-chesscom/'+f,'utf8').split('\n')){if(!l.trim())continue;let o;try{o=JSON.parse(l)}catch{continue;}if(o.pgn)yield o.pgn;}}}
const heavy=c=>c.board().flat().filter(Boolean).filter(p=>'qrnb'.includes(p.type)).length;
const qoff=c=>c.board().flat().filter(Boolean).filter(p=>p.type==='q').length===0;
const lbl=c=>{const b=c.board().flat().filter(Boolean);const f=col=>['q','r','n','b','p'].map(t=>{const k=b.filter(p=>p.type===t&&p.color===col).length;return k?k+t.toUpperCase():'';}).filter(Boolean).join('+');return 'W:'+f('w')+' B:'+f('b');};
const PV={p:1,n:3,b:3,r:5,q:9};const md=(c,sc)=>{let w=0,b=0;for(const r of c.board())for(const s of r){if(!s)continue;const v=PV[s.type]||0;if(s.color==='w')w+=v;else b+=v;}return sc==='w'?w-b:b-w;};
const sc='b';const pref=['e4','e6','d4','d5'];const found=[];
for(const raw of cc()){const W=tag(raw,'White'),B=tag(raw,'Black');if(isM(W)===isM(B))continue;const side=isM(W)?'w':'b';if(side!==sc)continue;const R=tag(raw,'Result');if(R!=='0-1')continue;const s=clean(raw);if(!s)continue;if(s.slice(0,4).join(' ')!==pref.join(' '))continue;const c=new Chess();let tr=-1,ok=true;for(let i=0;i<s.length;i++){try{c.move(s[i]);}catch{ok=false;break;}const rk=c.board().flat().filter(Boolean).filter(p=>p.type==='r').length,mn=c.board().flat().filter(Boolean).filter(p=>'nb'.includes(p.type)).length;if(tr<0&&i>=34&&qoff(c)&&heavy(c)<=4&&heavy(c)>=2&&rk<=2&&mn<=2)tr=i;}if(!ok||tr<0)continue;const c2=new Chess();for(let i=0;i<=tr;i++)c2.move(s[i]);found.push({s,tr,opp:B,elo:+tag(raw,'WhiteElo')||0,total:s.length,fen:c2.fen(),mat:md(c2,sc),lbl:lbl(c2)});}
found.sort((a,b)=>{const am=a.mat>=1&&a.mat<=6?0:1,bm=b.mat>=1&&b.mat<=6?0:1;if(am!==bm)return am-bm;return (b.elo-a.elo)||(b.total-a.total);});
console.log(`french: ${found.length} wins reaching a clean ending`);
for(const g of found.slice(0,3)){const c2=new Chess();for(let i=0;i<=g.tr;i++)c2.move(g.s[i]);const tail=[],land=[];for(let i=g.tr+1;i<Math.min(g.tr+11,g.s.length);i++){const mv=c2.move(g.s[i]);tail.push(g.s[i]);if(mv.color===sc)land.push(g.s[i]+'>'+mv.to);}console.log(`  vs ${g.opp}(${g.elo}) plies=${g.total} ${g.lbl} matΔ=${g.mat}\n    FEN: ${g.fen}\n    TAIL: ${tail.join(' ')}\n    LANDS: ${land.join('  ')}`);}

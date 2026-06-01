import fs from 'node:fs';
import { Chess } from 'chess.js';
const ALIASES=new Set(['magnuscarlsen','drnykterstein','drdrunkenstein','manwithavan','drgrekenstein','stl_carlsen']);
const isMagnus=(n)=>{n=(n||'').toLowerCase();return ALIASES.has(n)||n.includes('carlsen');};
const tag=(pgn,t)=>{const m=pgn.match(new RegExp('\\['+t+' "([^"]*)"\\]'));return m?m[1]:'';};
function cleanSan(raw){const c=new Chess();try{c.loadPgn(raw,{sloppy:true});}catch{return null;}const h=c.history();return h.length<24?null:h;}
function* cc(){for(const f of fs.readdirSync('data/sources/magnuscarlsen-chesscom')){for(const line of fs.readFileSync('data/sources/magnuscarlsen-chesscom/'+f,'utf8').split('\n')){if(!line.trim())continue;let o;try{o=JSON.parse(line)}catch{continue;}if(o.pgn)yield o.pgn;}}
  for(const p of fs.readFileSync('data/sources/carlsen-otb/Carlsen.pgn','utf8').split(/\n\n(?=\[Event)/)) if(p.includes('[Event'))yield p;}
function heavy(c){return c.board().flat().filter(Boolean).filter(p=>'qrnb'.includes(p.type)).length;}
function qoff(c){return c.board().flat().filter(Boolean).filter(p=>p.type==='q').length===0;}
function lbl(c){const b=c.board().flat().filter(Boolean);const f=col=>['q','r','n','b','p'].map(t=>{const k=b.filter(p=>p.type===t&&p.color===col).length;return k?k+t.toUpperCase():'';}).filter(Boolean).join('+');return 'W:'+f('w')+' B:'+f('b');}
const PV={p:1,n:3,b:3,r:5,q:9};const md=(c,sc)=>{let w=0,b=0;for(const row of c.board())for(const sq of row){if(!sq)continue;const v=PV[sq.type]||0;if(sq.color==='w')w+=v;else b+=v;}return sc==='w'?w-b:b-w;};
// targets: opening prefix (taught main) + student side
const T={
 'open-sicilian':{sc:'w',prefix:['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4']},
 'sicilian':{sc:'b',prefix:['e4','c5','Nf3','e6']},   // his ...e6 Sicilian
 'kid':{sc:'b',prefix:['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6']},
 'french':{sc:'b',prefix:['e4','e6','d4','d5']},
};
for(const [id,cfg] of Object.entries(T)){
  const found=[];
  for(const raw of cc()){
    const W=tag(raw,'White'),B=tag(raw,'Black');if(isMagnus(W)===isMagnus(B))continue;
    const side=isMagnus(W)?'w':'b';if(side!==cfg.sc)continue;
    const R=tag(raw,'Result');const win=(side==='w'&&R==='1-0')||(side==='b'&&R==='0-1');if(!win)continue;
    const sans=cleanSan(raw);if(!sans)continue;
    if(sans.slice(0,cfg.prefix.length).join(' ')!==cfg.prefix.join(' '))continue;
    // walk to clean technical ending
    const c=new Chess();let tr=-1;let ok=true;
    for(let i=0;i<sans.length;i++){try{c.move(sans[i]);}catch{ok=false;break;}if(tr<0&&i>=34&&qoff(c)&&heavy(c)<=4&&heavy(c)>=2&&c.board().flat().filter(Boolean).filter(p=>p.type==='r').length<=2&&c.board().flat().filter(Boolean).filter(p=>'nb'.includes(p.type)).length<=2)tr=i;}
    if(!ok||tr<0)continue;
    const c2=new Chess();for(let i=0;i<=tr;i++)c2.move(sans[i]);
    found.push({sans,tr,opp:side==='w'?B:W,elo:+tag(raw,side==='w'?'BlackElo':'WhiteElo')||0,total:sans.length,fen:c2.fen(),mat:md(c2,cfg.sc),lbl:lbl(c2)});
  }
  // prefer student materially ahead but reasonable, deep, strong opp
  found.sort((a,b)=>{const am=a.mat>=1&&a.mat<=6?0:1,bm=b.mat>=1&&b.mat<=6?0:1;if(am!==bm)return am-bm;return (b.elo-a.elo)||(b.total-a.total);});
  console.log(`\n#### ${id} (student=${cfg.sc}) — ${found.length} wins reaching a clean ending`);
  for(const g of found.slice(0,3)){
    const c2=new Chess();for(let i=0;i<=g.tr;i++)c2.move(g.sans[i]);
    const tail=[],land=[];for(let i=g.tr+1;i<Math.min(g.tr+11,g.sans.length);i++){const mv=c2.move(g.sans[i]);tail.push(g.sans[i]);if(mv.color===cfg.sc)land.push(g.sans[i]+'>'+mv.to);}
    console.log(`  vs ${g.opp}(${g.elo}) plies=${g.total} tr=${g.tr} ${g.lbl} matΔ=${g.mat}`);
    console.log(`    FEN: ${g.fen}`);
    console.log(`    TAIL: ${tail.join(' ')}`);
    console.log(`    LANDS: ${land.join('  ')}`);
  }
}

import { spawn } from 'node:child_process';import { existsSync, readFileSync } from 'node:fs';import { Chess } from 'chess.js';
const PROXY='https://chess-academy-pro.vercel.app/api/lichess-explorer';const SF=22;
const bin=['/usr/games/stockfish'].find(existsSync);const sf=spawn(bin);let buf='',cp=null,res=null;
sf.stdout.on('data',d=>{buf+=d;const ls=buf.split('\n');buf=ls.pop()??'';for(const l of ls){const m=l.match(/score cp (-?\d+)/),mt=l.match(/score mate (-?\d+)/);if(mt)cp=parseInt(mt[1])>0?1e5:-1e5;else if(m)cp=parseInt(m[1]);const b=l.match(/^bestmove (\S+)/);if(b&&res){const r=res;res=null;r({cp,best:b[1]==='(none)'?null:b[1]});}}});
sf.stdin.write('uci\nisready\n');
const ev=f=>new Promise(r=>{cp=null;res=r;sf.stdin.write(`position fen ${f}\ngo depth ${SF}\n`);setTimeout(()=>{if(res===r){res=null;r({cp,best:null});}},25000);});
const toUci=s=>{const c=new Chess();return s.map(m=>{const mv=c.move(m);return mv.from+mv.to+(mv.promotion??'');});};
async function expl(s){const r=await fetch(`${PROXY}?source=lichess&ratings=1600,1800,2000&speeds=blitz,rapid,classical&play=${toUci(s).join(',')}`);return r.ok?r.json():null;}
const ap=(c,u)=>c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u.length>4?u[4]:undefined});
const PV={p:1,n:3,b:3,r:5,q:9};const md=(c,sc)=>{let w=0,b=0;for(const r of c.board())for(const s of r){if(!s)continue;const v=PV[s.type]||0;if(s.color==='w')w+=v;else b+=v;}return sc==='w'?w-b:b-w;};
const C=JSON.parse(readFileSync(process.argv[2],'utf8'));
for(const t of C){const c=new Chess();let ok=true;for(const m of t.spine){try{c.move(m);}catch{ok=false;break;}}
  console.log(`\n### ${t.id} | ${t.label}`);if(!ok){console.log('  SPINE ILLEGAL');continue;}
  const j=await expl(t.spine);const tot=j?(j.white+j.draws+j.black):0;const sm=j&&j.moves?j.moves.find(m=>m.san===t.slip):null;
  console.log(`  toMove=${c.turn()} (opp=${t.sc==='w'?'b':'w'}) SLIP ${t.slip}: ${sm?((sm.white+sm.draws+sm.black)/tot*100).toFixed(2)+'%':'NOT in explorer'}`);
  let cc=new Chess(c.fen());let mv;try{mv=cc.move(t.slip);}catch{console.log('  SLIP ILLEGAL');continue;}
  const af=await ev(cc.fen());const bestSan=af.best?ap(new Chess(cc.fen()),af.best).san:null;
  console.log(`  studentAdv=${af.cp} ENGINE-PUNISH=${bestSan} (proposed ${t.punish}${t.punish===bestSan?' ✓':''})`);
  if(af.best){const pc=new Chess(cc.fen());for(let k=0;k<8;k++){const e=await ev(pc.fen());if(!e.best)break;ap(pc,e.best);}const fin=await ev(pc.fen());const q=(pc.turn()===t.sc)?fin.cp:-fin.cp;console.log(`  quiet=${q} matΔ=${md(pc,t.sc)} => ${q>=100?'CONFIRMED':q>=50?'positional':'drop'}`);}
}
sf.stdin.write('quit\n');sf.kill();console.log('\n[done]');

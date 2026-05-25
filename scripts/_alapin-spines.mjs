import fs from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { Chess } from '/home/user/chess-academy-pro/node_modules/chess.js/dist/esm/chess.js';
const db = JSON.parse(fs.readFileSync('/home/user/chess-academy-pro/public/data/openings-masters-db.json','utf8')).positions;
const key = (c) => c.fen().split(' ').slice(0,4).join(' ');
function resolveSF(){for(const p of ['/usr/games/stockfish'])if(existsSync(p))return p;return null;}
function startEngine(bin){const sf=spawn(bin);let buf='',lastCp=null,resolver=null;
  sf.stdout.on('data',d=>{buf+=d;const ls=buf.split('\n');buf=ls.pop()??'';for(const l of ls){const cp=l.match(/score cp (-?\d+)/),mt=l.match(/score mate (-?\d+)/);if(mt)lastCp=parseInt(mt[1])>0?100000:-100000;else if(cp)lastCp=parseInt(cp[1]);const bm=l.match(/^bestmove (\S+)/);if(bm&&resolver){const r=resolver;resolver=null;r({cp:lastCp,best:bm[1]==='(none)'?null:bm[1]});}}});
  sf.stdin.write('uci\nisready\n');
  return {eval:(fen)=>new Promise(res=>{lastCp=null;resolver=res;sf.stdin.write(`position fen ${fen}\ngo depth 16\n`);setTimeout(()=>{if(resolver===res){resolver=null;res({cp:lastCp,best:null});}},15000);}),quit(){try{sf.stdin.write('quit\n');sf.kill();}catch{}}};
}
function walk(prefix, prefer={}, target=22, min=4){const c=new Chess();const line=[];const tag=[];for(const m of prefix){c.move(m);line.push(m);}while(line.length<target){const e=db[key(c)];if(!e||!e.length)break;const f=prefer[line.length];let p=f?e.find(x=>x.san===f):e[0];if(f&&!p){tag.push(`[MISS ${f}:top ${e.slice(0,3).map(x=>x.san).join(',')}]`);break;}if(!p||p.games<min)break;c.move(p.san);line.push(p.san);tag.push(`${p.san}(${p.games})`);}return{chess:c,line,tag};}
async function ext(state,eng,target=20){const {chess:c,line,tag}=state;while(line.length<target){const {cp,best}=await eng.eval(c.fen());if(!best)break;const mv=c.move({from:best.slice(0,2),to:best.slice(2,4),promotion:best.length>4?best[4]:undefined});const bcp=c.turn()==='b'?-cp:cp;tag.push(`${mv.san}{${(bcp/100).toFixed(2)}b}`);line.push(mv.san);}return{line,tag};}
const VARS={
  '2.Nf6 Main (PILL)':[['e4','c5','c3','Nf6','e5','Nd5','d4','cxd4','Nf3','Nc6','cxd4','d6'],{}],
  '2.d5 IQP':[['e4','c5','c3','d5','exd5','Qxd5','d4','Nf6','Nf3','Bg4','Be2','e6'],{}],
  '2.e6 French':[['e4','c5','c3','e6','d4','d5','e5','Nc6','Nf3','Qb6'],{}],
  '2.g6 Fianchetto':[['e4','c5','c3','g6','d4','cxd4','cxd4','d5','e5','Nc6'],{}],
  '2.Nf6 IQP Accepted':[['e4','c5','c3','Nf6','e5','Nd5','d4','cxd4','cxd4','d6','Nf3','Nc6'],{}],
};
const eng=startEngine(resolveSF());
for(const [name,[prefix,prefer]] of Object.entries(VARS)){
  const st=walk(prefix,prefer); const before=st.line.length;
  const {line,tag}=await ext(st,eng,20);
  console.log(`\n=== ${name} === masters ${before}, total ${line.length} ${line.length>=20?'OK':'SHORT'}`);
  console.log('  '+line.join(' '));
  console.log('  '+tag.join(' '));
}
eng.quit();

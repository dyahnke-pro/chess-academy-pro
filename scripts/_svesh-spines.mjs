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
const S=['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','Nf6','Nc3','e5','Ndb5','d6','Bg5','a6','Na3','b5'];
const VARS={
  'Main 9.Nd5 (PILL)':[[...S,'Nd5','Be7','Bxf6','Bxf6','c3','O-O','Nc2','Bg5'],{24:'a4',25:'bxa4'}],
  '9.Bxf6 gxf6':[[...S,'Bxf6','gxf6','Nd5','f5','Bd3','Be6','Qh5','Bg7'],{24:'O-O',25:'Ne7'}],
  'Chelyabinsk c4':[[...S,'Nd5','Be7','Bxf6','Bxf6','c4','b4','Nc2','O-O'],{24:'a4',25:'a5'}],
  'Novosibirsk Bg5':[[...S,'Nd5','Be7','Bxf6','Bxf6','c3','Bg5'],{22:'Qa4',23:'Bd7'}],
  'Anti-Svesh 6.Nf3':[['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','Nf6','Nc3','e5','Nf3','h6','Bc4','Be7','O-O','O-O'],{16:'Re1',17:'d6'}],
  '11.c4 Queenside Grip':[[...S,'Nd5','Be7','Bxf6','Bxf6','c4','b4','Nc2','a5'],{24:'Be2',25:'Bg5'}],
  'Kalashnikov':[['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','e5','Nb5','d6','c4','Be7','N1c3','a6','Na3','Be6'],{16:'Nd5',17:'Bxd5'}],
  'Rb8 Expansion':[[...S,'Nd5','Be7','Bxf6','Bxf6','c3','O-O','Nc2','Rb8'],{24:'a4',25:'bxa4'}],
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

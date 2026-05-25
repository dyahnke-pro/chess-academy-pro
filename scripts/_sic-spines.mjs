// Sicilian spine builder (reusable). Walk the LOCAL masters-db from each
// variation's defining prefix, steering canonical branch points (every steered
// move verified present in the db, game count printed), then Stockfish-extend
// to >=20 plies (evals printed, Black perspective since student=Black).
import fs from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { Chess } from '/home/user/chess-academy-pro/node_modules/chess.js/dist/esm/chess.js';
const db = JSON.parse(fs.readFileSync('/home/user/chess-academy-pro/public/data/openings-masters-db.json','utf8')).positions;
const key = (c) => c.fen().split(' ').slice(0,4).join(' ');
const SF_DEPTH = 16;
function resolveSF(){const c=[process.env.STOCKFISH_PATH,'/usr/games/stockfish','/usr/bin/stockfish'].filter(Boolean);for(const p of c)if(existsSync(p))return p;try{return execSync('which stockfish',{encoding:'utf8'}).trim();}catch{return null;}}
function startEngine(bin){const sf=spawn(bin);let buf='',lastCp=null,resolver=null;
  sf.stdout.on('data',d=>{buf+=d;const ls=buf.split('\n');buf=ls.pop()??'';for(const l of ls){const cp=l.match(/score cp (-?\d+)/),mt=l.match(/score mate (-?\d+)/);if(mt)lastCp=parseInt(mt[1])>0?100000:-100000;else if(cp)lastCp=parseInt(cp[1]);const bm=l.match(/^bestmove (\S+)/);if(bm&&resolver){const r=resolver;resolver=null;r({cp:lastCp,best:bm[1]==='(none)'?null:bm[1]});}}});
  sf.stdin.write('uci\nisready\n');
  return {eval:(fen)=>new Promise(res=>{lastCp=null;resolver=res;sf.stdin.write(`position fen ${fen}\ngo depth ${SF_DEPTH}\n`);setTimeout(()=>{if(resolver===res){resolver=null;res({cp:lastCp,best:null});}},15000);}),quit(){try{sf.stdin.write('quit\n');sf.kill();}catch{}}};
}
function mastersWalk(prefix, prefer={}, target=22, minGames=4){
  const c=new Chess(); const line=[]; const tag=[];
  for(const m of prefix){c.move(m);line.push(m);}
  while(line.length<target){const e=db[key(c)];if(!e||!e.length)break;const f=prefer[line.length];let p=f?e.find(x=>x.san===f):e[0];if(f&&!p){tag.push(`[MISS ${f}]`);p=e[0];}if(!p||p.games<minGames)break;c.move(p.san);line.push(p.san);tag.push(`${p.san}(${p.games})`);}
  return {chess:c,line,tag};
}
async function extend(state, eng, target=20){
  const {chess:c,line,tag}=state;
  while(line.length<target){const {cp,best}=await eng.eval(c.fen());if(!best)break;const mv=c.move({from:best.slice(0,2),to:best.slice(2,4),promotion:best.length>4?best[4]:undefined});const bcp=c.turn()==='b'?-cp:cp;tag.push(`${mv.san}{${bcp>=0?'+':''}${(bcp/100).toFixed(2)}b}`);line.push(mv.san);}
  return {line,tag};
}
// Dragon base: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6
const D=['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','g6'];
const VARS={
  'Yugoslav Main (PILL)':[ [...D,'Be3','Bg7','f3','O-O','Qd2','Nc6','Bc4','Bd7','O-O-O','Rc8','Bb3','Ne5'], {} ],
  'Yugoslav: Soltis':[ [...D,'Be3','Bg7','f3','O-O','Qd2','Nc6','Bc4','Bd7','O-O-O','Rc8','Bb3','Ne5','h4','h5'], {} ],
  'Yugoslav: Chinese Dragon':[ [...D,'Be3','Bg7','f3','O-O','Qd2','Nc6','Bc4','Bd7','O-O-O','Rb8'], {20:'Bb3',21:'b5'} ],
  'Classical':[ [...D,'Be2','Bg7','O-O','O-O','Be3','Nc6'], {16:'Nb3',17:'Be6',18:'f4',19:'Na5'} ],
  'Levenfish':[ ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','g6','f4'], {11:'Bg7',12:'e5',13:'dxe5',14:'fxe5',15:'Nfd7'} ],
  'Accelerated Dragon':[ ['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','g6','c4','Nf6','Nc3','d6'], {12:'Be2',13:'Nxd4',14:'Bxd4',15:'Bg7'} ],
  'Dragadorf':[ [...D,'Be3','Bg7','f3','O-O','Qd2','Nc6','Bc4','Bd7','O-O-O','a6'], {20:'Bb3',21:'b5'} ],
  'Anti-Dragon: Bg5':[ [...D,'Bg5'], {11:'Bg7',12:'Qd2',13:'Nc6',14:'O-O-O',15:'O-O',16:'Nb3',17:'a5'} ],
};
const eng=startEngine(resolveSF());
for(const [name,[prefix,prefer]] of Object.entries(VARS)){
  const st=mastersWalk(prefix,prefer);
  const before=st.line.length;
  const {line,tag}=await extend(st,eng,20);
  console.log(`\n=== ${name} === masters ${before} ply, total ${line.length} ${line.length>=20?'OK':'SHORT'}`);
  console.log('  LINE:',line.join(' '));
  console.log('  trail:',tag.join(' '));
}
eng.quit();

// QG spine builder: masters-walk (steered, Harrwitz-anchored) as deep as the
// local masters-db allows, THEN extend with Stockfish-sound moves to >=20
// plies. Every masters move shows its game count; every engine-extended move
// shows its eval (cp, White perspective) so the spine stays balanced and
// auditable. Grounded per playbook 0.6 (masters-backed OR engine-sound).
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
  while(line.length<target){const e=db[key(c)];if(!e||!e.length)break;const f=prefer[line.length];let p=f?e.find(x=>x.san===f):e[0];if(f&&!p)p=e[0];if(!p||p.games<minGames)break;c.move(p.san);line.push(p.san);tag.push(`${p.san}(${p.games})`);}
  return {chess:c,line,tag};
}
async function extend(state, eng, target=20){
  const {chess:c,line,tag}=state;
  while(line.length<target){const {cp,best}=await eng.eval(c.fen());if(!best)break;const mv=c.move({from:best.slice(0,2),to:best.slice(2,4),promotion:best.length>4?best[4]:undefined});const wcp=c.turn()==='w'?-cp:cp;tag.push(`${mv.san}{${wcp>=0?'+':''}${(wcp/100).toFixed(2)}}`);line.push(mv.san);}
  return {line,tag};
}
const VARS={
  'Classical (MAIN pill)':[['d4','d5','c4','e6'],{5:'Nf6',6:'Bg5',7:'Be7',8:'e3',9:'O-O',10:'Nf3',11:'Nbd7',12:'Rc1',13:'c6',14:'Bd3',15:'dxc4',16:'Bxc4',17:'Nd5',18:'Bxe7',19:'Qxe7',20:'O-O',21:'Nxc3'}],
  'Exchange':[['d4','d5','c4','e6','Nc3','Nf6','cxd5','exd5','Bg5','c6','e3','Be7'],{12:'Bd3',13:'O-O',14:'Qc2',15:'Nbd7',16:'Nge2',17:'Re8'}],
  'Tartakower':[['d4','d5','c4','e6','Nc3','Be7','Nf3','Nf6','Bg5','h6','Bh4','O-O','e3','b6'],{}],
  'QGA':[['d4','d5','c4','dxc4','Nf3','Nf6','e3','e6','Bxc4','c5','O-O','a6'],{12:'Qe2',13:'b5',14:'Bb3',15:'Bb7',16:'Rd1',17:'Nbd7',18:'Nc3',19:'Qb8'}],
  'Slav':[['d4','d5','c4','c6','Nf3','Nf6','Nc3','dxc4','a4','Bf5'],{10:'e3',11:'e6',12:'Bxc4',13:'Bb4',14:'O-O',15:'Nbd7',16:'Qe2',17:'Bg6'}],
  'Semi-Slav':[['d4','d5','c4','c6','Nf3','Nf6','Nc3','e6','e3'],{9:'Nbd7',10:'Bd3',11:'dxc4',12:'Bxc4',13:'b5',14:'Bd3',15:'Bb7',16:'O-O',17:'a6',18:'e4'}],
  'Catalan':[['d4','Nf6','c4','e6','g3','d5','Bg2','Be7','Nf3','O-O','O-O','dxc4'],{12:'Qc2',13:'a6',14:'a4',15:'Bd7'}],
  'Anti-QGD Bf4 (Harrwitz)':[['d4','d5','c4','e6','Nf3','Nf6','Nc3','Be7','Bf4'],{9:'O-O',10:'e3',11:'Nbd7',12:'c5',13:'dxc5',14:'Nxc5',15:'cxd5',16:'exd5',17:'Be2',18:'Be6'}],
};
const eng=startEngine(resolveSF());
for(const [name,[prefix,prefer]] of Object.entries(VARS)){
  const st=mastersWalk(prefix,prefer);
  const before=st.line.length;
  const {line,tag}=await extend(st,eng,20);
  console.log(`\n=== ${name} === masters-anchored ${before} ply, total ${line.length} ${line.length>=20?'OK':'STILL SHORT'}`);
  console.log('  LINE:',line.join(' '));
  console.log('  trail:',tag.join(' '));
}
eng.quit();

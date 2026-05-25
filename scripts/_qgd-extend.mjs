// QGD (BLACK) masterclass spines — walk the LIVE masters explorer from each
// variation's defining position to >=20 plies. Student = BLACK (defending).
// Every ply masters-backed (game counts printed). Steering keeps each line on
// its identity where the raw most-played would drift.
import { Chess } from '../node_modules/chess.js/dist/esm/chess.js';
const PROXY='https://chess-academy-pro.vercel.app/api/lichess-explorer';
async function masters(u){const r=await fetch(`${PROXY}?source=masters&play=${u}`,{headers:{'user-agent':'Mozilla/5.0'}});if(!r.ok)throw new Error('http '+r.status);return r.json();}
async function walk(prefix,prefer={},target=22,minG=8){
  const c=new Chess();const uci=[];for(const m of prefix){const mv=c.move(m);uci.push(mv.from+mv.to+(mv.promotion??''));}
  const line=[...prefix];const trail=[];
  while(line.length<target){let d;try{d=await masters(uci.join(','));}catch(e){trail.push('[err]');break;}
    const moves=d.moves??[];if(!moves.length){trail.push('[dead]');break;}
    const f=prefer[line.length];let pick=f?moves.find(m=>m.san===f):moves[0];if(f&&!pick){trail.push('[MISS '+f+']');pick=moves[0];}
    const g=(pick.white??0)+(pick.draws??0)+(pick.black??0);if(g<minG){trail.push('[thin '+pick.san+'('+g+')]');break;}
    const mv=c.move(pick.san);uci.push(mv.from+mv.to+(mv.promotion??''));line.push(pick.san);trail.push(pick.san+'('+g+')');}
  return {line,trail,ply:line.length};
}
const VARS={
  'Orthodox (MAIN pill)': [['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7','e3','O-O','Nf3','Nbd7','Rc1','c6','Bd3','dxc4','Bxc4','Nd5'], {}],
  'Lasker Defense': [['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7','e3','O-O','Nf3','h6','Bh4','Ne4'], {}],
  'Tartakower': [['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7','e3','O-O','Nf3','h6','Bh4','b6'], {}],
  'Exchange': [['d4','d5','c4','e6','Nc3','Nf6','cxd5','exd5','Bg5','c6','e3','Bf5'], {}],
  'Ragozin': [['d4','d5','c4','e6','Nc3','Nf6','Nf3','Bb4'], {}],
  'Vienna': [['d4','d5','c4','e6','Nc3','Nf6','Bg5','Bb4'], {}],
  'Cambridge Springs': [['d4','d5','c4','e6','Nc3','Nf6','Bg5','Nbd7','e3','c6','Nf3','Qa5'], {}],
  'Bf4 QGD': [['d4','d5','c4','e6','Nc3','Nf6','Bf4'], {}],
};
const only=process.argv[2];
for(const [name,[prefix,prefer]] of Object.entries(VARS)){
  if(only&&name!==only)continue;
  const {line,trail,ply}=await walk(prefix,prefer);
  console.log('\n=== '+name+' === ('+ply+'p) '+(ply>=20?'OK':'SHORT'));
  console.log('LINE:',line.join(' '));
  console.log('walk:',trail.join(' '));
}

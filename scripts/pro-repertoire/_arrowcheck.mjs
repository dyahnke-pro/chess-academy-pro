import { Chess } from 'chess.js';
// node _arrowcheck.mjs "<sans>" <from> <to> : valid vision arrow = non-pawn on
// `from`, `to` reachable along the piece's geometry with a clear path (target
// may hold an enemy). Side-to-move independent.
const [line,from,to]=process.argv.slice(2);
const c=new Chess();
for(const s of line.split(/\s+/)){ if(!c.move(s)){console.log('ILLEGAL line at',s);process.exit(1);} }
const pc=c.get(from);
const f=(s)=>[s.charCodeAt(0)-97, s.charCodeAt(1)-49]; // file,rank 0-7
const [ff,fr]=f(from),[tf,tr]=f(to);
const df=tf-ff,dr=tr-fr;
function clear(stepF,stepR){let x=ff+stepF,y=fr+stepR;while(x!==tf||y!==tr){if(c.get(String.fromCharCode(97+x)+String.fromCharCode(49+y)))return false;x+=stepF;y+=stepR;}return true;}
let ok=false,why='';
if(!pc){why='EMPTY';}
else if(pc.type==='p'){why='PAWN-ORIGIN';}
else{
  const adf=Math.abs(df),adr=Math.abs(dr);
  const sgn=v=>v===0?0:v>0?1:-1;
  if(pc.type==='n'){ ok=(adf===1&&adr===2)||(adf===2&&adr===1); why=ok?'knight':'not-knight-hop'; }
  else if(pc.type==='b'){ ok=adf===adr&&adf>0&&clear(sgn(df),sgn(dr)); why=ok?'bishop-clear':'bishop-blocked/offdiag'; }
  else if(pc.type==='r'){ ok=(df===0||dr===0)&&(adf+adr>0)&&clear(sgn(df),sgn(dr)); why=ok?'rook-clear':'rook-blocked/offline'; }
  else if(pc.type==='q'){ ok=((adf===adr&&adf>0)||((df===0||dr===0)&&adf+adr>0))&&clear(sgn(df),sgn(dr)); why=ok?'queen-clear':'queen-blocked/offline'; }
  else if(pc.type==='k'){ ok=adf<=1&&adr<=1&&adf+adr>0; why='king'; }
}
const tgt=c.get(to);
console.log(`${from}=${pc?pc.color+pc.type:'-'} -> ${to}${tgt?'('+tgt.color+tgt.type+')':''}: ${ok?'OK':'BAD'} [${why}]`);

import { Chess } from 'chess.js';
const sans=process.argv.slice(2);
const c=new Chess();const out=[];
for(let i=0;i<sans.length;i++){
  const mv=c.move(sans[i]);
  if(!mv){console.log('ILLEGAL at',i+1,sans[i]);process.exit(1);}
  out.push(`${i+1}. ${sans[i]} (${mv.color==='w'?'W':'B'}) ${mv.from}-${mv.to}${mv.piece!=='p'?' ['+mv.piece.toUpperCase()+']':''}${mv.captured?' x'+mv.captured:''}`);
}
console.log(out.join('\n'));console.log('FEN:',c.fen());

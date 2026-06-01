import { Chess } from 'chess.js';
// args: studentColor(w/b) then "spine pgn" "||" "continuation pgn"
const [side, full] = [process.argv[2], process.argv.slice(3).join(' ')];
const [spine, cont] = full.split('||').map(s=>s.trim());
const c=new Chess();
for(const m of spine.split(/\s+/)){ if(!c.move(m)){console.log('ILLEGAL spine',m);process.exit(1);} }
const termFen=c.fen();
const land=[];
for(const m of cont.split(/\s+/).filter(Boolean)){
  const mv=c.move(m);
  if(!mv){console.log('ILLEGAL cont',m);process.exit(1);}
  if(mv.color===side) land.push(`${m}->${mv.to}`);
}
console.log('TERMINUS:',termFen);
console.log('STUDENT LANDS:',land.join(' '));

const fs=require('fs');
const { Chess }=require('chess.js');
const cfg=JSON.parse(fs.readFileSync('/tmp/hikaru-var-config.json','utf8'));

// describe a move's role generically + accurately (no false square-piece claims)
const PIECE={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
function beatSay(r,chess){
  const pc=PIECE[r.piece];
  if(r.san==='O-O'||r.san==='O-O-O') return `castling to safety — the king tucks away and the rook joins the game.`;
  if(r.captured) return `${cap(pc)} takes on ${r.to}, opening lines and shifting the material balance.`;
  if(r.piece==='p') return `the pawn advances to ${r.to}, fighting for space in the centre.`;
  return `the ${pc} develops to ${r.to}, improving its activity.`;
}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}

function buildLesson(name,deepFile,openingId,color,src){
  const j=JSON.parse(fs.readFileSync('data/sources/hikaru-deep/'+deepFile+'.json'));
  const spine=(j.spineMoves||[]).map(m=>m.san||m);
  // build 4 beats: chunk the spine into ~ growing prefixes ending at moves 3,5,7,terminus
  const stops=[Math.min(5,spine.length),Math.min(9,spine.length),Math.min(13,spine.length),spine.length].filter((v,i,a)=>a.indexOf(v)===i);
  const c=new Chess();
  // verify full spine legal
  const verify=new Chess(); for(const m of spine){ if(!verify.move(m)) throw new Error('illegal in '+deepFile+': '+m); }
  const beats=[];
  stops.forEach((stop,bi)=>{
    const moves=spine.slice(0,stop);
    // narrate the LAST move of this chunk
    const tmp=new Chess(); let last=null; for(const m of moves){last=tmp.move(m);}
    const lastSan=moves[moves.length-1];
    const sideWord = last.color==='w'?'White':'Black';
    const sayMove = last.color==='w'?lastSan:'…'+lastSan;
    const say = `${sayMove} — ${beatSay(last,tmp)}`;
    const short = `${sayMove} — ${last.captured?'open lines':(last.san.startsWith('O-O')?'king safe':(last.piece==='p'?'gain space':'develop'))}.`;
    beats.push({id:'b'+bi,moves:moves,say,sayShort:short});
  });
  return {openingId,title:`Hikaru — ${name}`,minutes:7,orientation:color,kind:'variation',sources:src,beats};
}

for(const [openingId,o] of Object.entries(cfg)){
  let out=`import type { LessonScript } from '../../types';\n`;
  out+=`// Pro Hikaru — ${openingId} per-variation Watch lessons. Each walks his real\n// data spine (data/sources/hikaru-deep/) to a middlegame. Board-accurate by\n// construction (moves from his games), voice-clean (G9.4). Student = ${o.color}.\n\n`;
  const entries=[];
  for(const [name,deepFile] of o.vars){
    const L=buildLesson(name,deepFile,openingId,o.color,o.src);
    entries.push([`${openingId}::${name}`,L]);
  }
  out+=`export const ${o.constName}: Record<string, LessonScript> = ${JSON.stringify(Object.fromEntries(entries),null,2)};\n`;
  fs.writeFileSync('src/data/lessons/'+o.file+'.ts',out);
  console.log('wrote '+o.file+'.ts ('+entries.length+' variations)');
}

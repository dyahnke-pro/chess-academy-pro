import fs from 'node:fs';import path from 'node:path';
const DIR='data/sources/magnuscarlsen-chesscom';const ME='magnuscarlsen';
const STD='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const CLOCK=/\{[^}]*\}/g,MN=/\b\d+\.+\s*/g,RES=/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/,VAR=/\([^()]*\)/g;
function sans(pgn){const i=pgn.search(/\n\n/);if(i<0)return null;let b=pgn.slice(i).replace(CLOCK,'');let p;do{p=b;b=b.replace(VAR,'')}while(b!==p);b=b.replace(MN,'').replace(RES,'').replace(/\s+/g,' ').trim();return b?b.split(' ').filter(Boolean):null;}
const RT={win:'win',checkmated:'loss',resigned:'loss',timeout:'loss',abandoned:'loss',agreed:'draw',stalemate:'draw',insufficient:'draw','50move':'draw',repetition:'draw',timevsinsufficient:'draw'};
// opening prefixes (student to identify the opening)
const OPEN={
 'pro-carlsen-open-sicilian':{c:'w',pre:['e4','c5','Nf3'],sub:['d6','d4'],min:16},
 'pro-carlsen-ruy-lopez':{c:'w',pre:['e4','e5','Nf3','Nc6','Bb5'],min:16},
 'pro-carlsen-queens-pawn':{c:'w',pre:['d4','Nf6','c4'],min:16},
 'pro-carlsen-sicilian':{c:'b',pre:['e4','c5','Nf3','d6'],min:16},
 'pro-carlsen-1e5':{c:'b',pre:['e4','e5','Nf3','Nc6'],min:16},
 'pro-carlsen-nimzo':{c:'b',pre:['d4','Nf6','c4','e6'],min:16},
 'pro-carlsen-kid':{c:'b',pre:['d4','Nf6','c4','g6'],min:16},
 'pro-carlsen-french':{c:'b',pre:['e4','e6'],min:16},
};
const games=[];
for(const f of fs.readdirSync(DIR).filter(f=>f.endsWith('.jsonl'))){
  for(const l of fs.readFileSync(path.join(DIR,f),'utf8').split('\n').filter(Boolean)){
    let g;try{g=JSON.parse(l)}catch{continue}
    if(g.rules&&g.rules!=='chess')continue; if(g.initial_setup&&g.initial_setup!==STD)continue;
    const isW=(g.white?.username||'').toLowerCase()===ME,isB=(g.black?.username||'').toLowerCase()===ME;
    if(!isW&&!isB)continue;
    const me=isW?g.white:g.black, opp=isW?g.black:g.white;
    if((RT[me.result]||'?')!=='win')continue; // WINS only
    const m=sans(g.pgn||''); if(!m||m.length<OPEN['pro-carlsen-open-sicilian'].min)continue;
    games.push({isW,m,opp:opp.username,oppElo:opp.rating||0,classical:g._source==='otb'||g.time_class==='classical'||g.time_class==='rapid',pgn:g.pgn,plies:m.length});
  }
}
function matches(m,o){ if(o.c==='w'&&m[0]!=='e4'&&m[0]!=='d4'&&m[0]!=='c4'&&m[0]!=='Nf3'){} for(let i=0;i<o.pre.length;i++) if(m[i]!==o.pre[i])return false; if(o.sub){ // sub must appear somewhere after pre
   for(const s of o.sub) if(!m.slice(o.pre.length,o.pre.length+6).includes(s)) return false;} return true; }
const out={};
for(const [id,o] of Object.entries(OPEN)){
  const cand=games.filter(g=>(g.isW===(o.c==='w'))&&matches(g.m,o));
  // rank: classical first, then opp elo, then depth
  cand.sort((a,b)=>(b.classical-a.classical)||(b.oppElo-a.oppElo)||(b.plies-a.plies));
  out[id]=cand.slice(0,3).map(g=>({opp:g.opp,oppElo:g.oppElo,classical:g.classical,plies:g.plies,isW:g.isW,pgn:g.pgn}));
  console.log(`${id}: ${cand.length} wins -> top3:`, out[id].map(x=>`${x.opp}(${x.oppElo})${x.classical?'C':'o'}/${x.plies}`).join('  '));
}
fs.writeFileSync('data/sources/magnuscarlsen-model-wins.json',JSON.stringify(out,null,1));

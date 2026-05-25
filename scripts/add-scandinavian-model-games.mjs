import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const PATH = 'src/data/model-games.json';
const EX = 'https://chess-academy-pro.vercel.app/api/lichess-game-export?id=';
async function get(id){for(let i=0;i<6;i++){try{const r=await fetch(EX+id);if(r.ok)return await r.text();}catch(e){}await new Promise(s=>setTimeout(s,800));}return null;}

const GAMES = [
  { id:'mg-scandi-main', gameId:'zgmWk42F', cmMove:12, concept:'The good bishop on f5',
    overview:'Qa5 Main Line — Fressinet outplays Leko from the Black side, the light-squared bishop active on f5 the whole game.',
    theme:'Active queen on a5 and the unproblematic f5-bishop', summary:'A model Qa5 Scandinavian: recapture with the queen, get the bishop out to f5, and play a clean, weakness-free game.',
    cmNote:'Black has the Scandinavian dream: the queen active, the light-squared bishop developed OUTSIDE the chain on f5, and not a weakness in the camp — the early …Qxd5/…Bf5 plan delivered.' },
  { id:'mg-scandi-qa5', gameId:'JRVTn6oG', cmMove:13, concept:'Opposite-side race',
    overview:'Qa5 with …c6 — Peter Heine Nielsen beats Svidler from the Black side in the solid main line.',
    theme:'Solid …c6 setup turning into a queenside attack', summary:'The patient …c6 Qa5: rock-solid structure, then a queenside pawn storm when the kings go opposite ways.',
    cmNote:'The solid …c6 Qa5 structure is set — no weaknesses, the queen poised on a5, and with opposite-side castling Black turns the patient setup into a queenside attack.' },
  { id:'mg-scandi-modern', gameId:'t3sV3cgb', cmMove:12, concept:'The fianchetto vs the centre',
    overview:'…Nf6 Modern — Stefansson defeats Hodgson from the Black side with the King’s-Indian-style fianchetto.',
    theme:'…g6/Bg7 fianchetto pressuring White’s big centre', summary:'The Modern Scandinavian: recapture with the knight, fianchetto, and swarm White’s centre with the pieces.',
    cmNote:'Black has the Modern setup — knight recaptured and centralised, bishop fianchettoed on g7 raking the long diagonal at White’s broad but targetable centre.' },
  { id:'mg-scandi-icelandic', gameId:'ukKcGWvV', cmMove:12, concept:'Gambit initiative',
    overview:'Icelandic Gambit — Speelman beats Andrei Sokolov from the Black side, the development lead worth far more than the pawn.',
    theme:'A pawn sacrificed for a raging development lead', summary:'The Icelandic: give the pawn, develop with checks, castle long, and pile every piece onto the open central files.',
    cmNote:'A pawn down, but every black piece is active, the bishops rake the board, and White is still untangling — the textbook Icelandic Gambit initiative.' },
  { id:'mg-scandi-tiviakov', gameId:'wLt4Cd3U', cmMove:12, concept:'The flexible queen',
    overview:'…Qd6 Tiviakov — Gashimov beats Jakovenko from the Black side with the modern flexible queen retreat.',
    theme:'…Qd6 — safe, flexible, no harassment', summary:'The Tiviakov: retreat the queen to d6, take the sting out with …a6, and play a safe, flexible, weakness-free game.',
    cmNote:'The …Qd6 queen sits flexible and untouchable, …a6 has snuffed out White’s tricks, and Black develops a sound, comfortable position — the Tiviakov recipe.' },
  { id:'mg-scandi-portuguese', gameId:'J8Wp7kt5', cmMove:12, concept:'Pin to regain the pawn',
    overview:'Portuguese Gambit — Adhiban beats Andriasian from the Black side, the …Bg4 pin regaining the pawn with activity.',
    theme:'…Bg4 pin, rapid development, pawn recovered', summary:'The Portuguese: …Bg4 pins instead of recapturing, then Black regains the pawn with an active, equal game.',
    cmNote:'The …Bg4 pin has done its work: Black regains the gambit pawn with the queen active and the pieces developed — full equality out of the Portuguese.' },
  { id:'mg-scandi-gubinsky', gameId:'Ehvx4Qco', cmMove:12, concept:'Patient solidity',
    overview:'…Qd8 Gubinsky-Melts — Carlsen beats Caruana from the Black side, the queen home and the position impregnable.',
    theme:'…Qd8 — patient, solid, no target', summary:'The Gubinsky-Melts: retreat the queen all the way home, develop smoothly, and offer White nothing to attack.',
    cmNote:'The queen sits patiently on d8 — never to be harassed again — while Black develops a solid, weakness-free structure with the light bishop already active.' },
];

function parse(text){
  const h=(k)=>(text.match(new RegExp(`\\[${k} "([^"]+)"\\]`))||[])[1];
  const body=text.split(/\n\n/).slice(1).join('\n');
  const sans=body.replace(/\{[^}]*\}/g,'').replace(/\[%[^\]]*\]/g,'').replace(/\d+\.(\.\.)?/g,'').replace(/\s+/g,' ').trim().split(' ').filter(x=>x&&!/^(1-0|0-1|1\/2-1\/2|\*)$/.test(x));
  return {white:h('White'),black:h('Black'),whiteElo:Number(h('WhiteElo'))||undefined,blackElo:Number(h('BlackElo'))||undefined,result:h('Result'),year:Number((h('Date')||'').slice(0,4))||undefined,event:h('Event'),sans};
}
function fenAt(sans,mn){const ply=(mn-1)*2+1;const c=new Chess();for(let i=0;i<=ply&&i<sans.length;i++)c.move(sans[i]);return c.fen();}

const data=JSON.parse(readFileSync(PATH,'utf-8'));
const existing=new Set(data.map(g=>g.id));
let added=0;
for(const g of GAMES){
  if(existing.has(g.id)){console.log('skip',g.id);continue;}
  const t=await get(g.gameId); if(!t){console.log('FAIL fetch',g.id);continue;}
  const p=parse(t.replace(/\s\(%[^)]*\)/g,''));
  p.white=(p.white||'').replace(/\s*\(%[^)]*\)/g,''); p.black=(p.black||'').replace(/\s*\(%[^)]*\)/g,'');
  if(p.result!=='0-1'){console.log('NOT BLACK WIN',g.id,p.result);continue;}
  data.push({id:g.id,openingId:'scandinavian-defence',studentSide:'black',white:p.white,black:p.black,whiteElo:p.whiteElo,blackElo:p.blackElo,result:p.result,year:p.year,event:p.event,pgn:p.sans.join(' '),overview:g.overview,criticalMoments:[{moveNumber:g.cmMove,color:'black',fen:fenAt(p.sans,g.cmMove),annotation:g.cmNote,concept:g.concept}],middlegameTheme:g.theme,lessonSummary:g.summary});
  added++; console.log('added',g.id,`(${p.white} v ${p.black}, ${p.sans.length}p)`);
}
writeFileSync(PATH,JSON.stringify(data,null,2)+'\n');
console.log('total',data.length,'added',added);

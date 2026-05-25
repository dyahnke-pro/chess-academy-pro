import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const PATH='src/data/model-games.json';
const EX='https://chess-academy-pro.vercel.app/api/lichess-game-export?id=';
async function get(id){for(let i=0;i<6;i++){try{const r=await fetch(EX+id);if(r.ok)return await r.text();}catch(e){}await new Promise(s=>setTimeout(s,800));}return null;}
const G=[
 {id:'mg-alekhine-main',gameId:'GN1YZfh9',cmMove:12,concept:'Undermining the centre',
  overview:"Modern Alekhine — Abasov outplays Lagarde from the Black side, dismantling White's big centre with the pieces.",
  theme:"Hypermodern: let White build, then tear the centre down",summary:"The Modern Alekhine: solid …Bg4/…e6/…Be7, then chip at the over-extended centre until it falls.",
  cmNote:"Black has the Modern setup — pieces developed and aimed at White's broad centre, ready to undermine it with …dxe5 and …c5. The hypermodern plan in action."},
 {id:'mg-alekhine-fourpawns',gameId:'zrC5ked6',cmMove:12,concept:'Punishing over-extension',
  overview:"Four Pawns Attack — Svidler beats Grischuk from the Black side, the massive centre collapsing under fire.",
  theme:"Surround and break the four-pawn centre",summary:"The Four Pawns Attack invites the maximal centre; Black undermines with …dxe5, …Nc6, …Bf5/…Bb4 and …f6 to crack it open.",
  cmNote:"White's four-pawn centre looks huge, but every pawn is under fire from Black's pieces — the over-extension is about to be punished, exactly the Alekhine idea."},
 {id:'mg-alekhine-exchange',gameId:'xO7iFggk',cmMove:12,concept:'Active equality',
  overview:"Exchange Variation — Zherebukh outplays Kosintseva from the Black side, the better-coordinated army telling.",
  theme:"Free development and the …d5 break vs White's space",summary:"The Exchange is comfortable: Black develops actively, plays …Bf5/…Bf6 and the …d5 break, and equalises fully.",
  cmNote:"The Exchange structure is set — White has a little space, but Black's pieces are free and active, heading for the …d5 freeing break and full equality."},
 {id:'mg-alekhine-chase',gameId:'14bedvHw',cmMove:12,concept:'Punishing wasted tempi',
  overview:"Chase Variation — Lalith beats Atabayev from the Black side, exploiting White's tempo-wasting pawn chase.",
  theme:"White chases the knight; Black collects the tempi",summary:"The Chase wastes White's time hunting the knight; Black liquidates the over-reach and emerges with the initiative and the bishop pair.",
  cmNote:"White spent tempo after tempo chasing the knight; Black has liquidated the over-extended pawns and the squandered time has flowed into a Black initiative."},
 {id:'mg-alekhine-scandtrans',gameId:'SlIY9u31',cmMove:12,concept:'Simplified safety',
  overview:"The …dxe5 simplification — Nevanlinna wins from the Black side after trading into a clean, safe structure.",
  theme:"Early trades neutralise White's space",summary:"Black resolves the tension with …dxe5, trades pieces, and reaches a sound, weakness-free position with easy equality.",
  cmNote:"The early …dxe5 trades have simplified the position — White's space edge is gone and Black has a clean, weakness-free structure with active bishops."},
 {id:'mg-alekhine-voronezh',gameId:'7Dbasb1N',cmMove:12,concept:'KID-style fianchetto',
  overview:"Voronezh — Carlsen beats Aronian from the Black side with the King's-Indian-style fianchetto and …e5 break.",
  theme:"…g6/Bg7 fianchetto and the …e5 central strike",summary:"The Voronezh: recapture …cxd6, fianchetto with …g6/Bg7, and strike the centre with …e5 for dynamic King's-Indian play.",
  cmNote:"Black has the Voronezh setup — the fianchettoed g7-bishop raking the long diagonal and the …e5 break ready, a dynamic King's-Indian-style position Carlsen rode to victory."},
];
function parse(t){const h=(k)=>(t.match(new RegExp(`\\[${k} "([^"]+)"\\]`))||[])[1];const body=t.split(/\n\n/).slice(1).join('\n');const sans=body.replace(/\{[^}]*\}/g,'').replace(/\[%[^\]]*\]/g,'').replace(/\d+\.(\.\.)?/g,'').replace(/\s+/g,' ').trim().split(' ').filter(x=>x&&!/^(1-0|0-1|1\/2-1\/2|\*)$/.test(x));return {white:(h('White')||'').replace(/\s*\(%[^)]*\)/g,''),black:(h('Black')||'').replace(/\s*\(%[^)]*\)/g,''),whiteElo:Number(h('WhiteElo'))||undefined,blackElo:Number(h('BlackElo'))||undefined,result:h('Result'),year:Number((h('Date')||'').slice(0,4))||undefined,event:h('Event'),sans};}
function fenAt(sans,mn){const ply=(mn-1)*2+1;const c=new Chess();for(let i=0;i<=ply&&i<sans.length;i++)c.move(sans[i]);return c.fen();}
const data=JSON.parse(readFileSync(PATH,'utf-8'));const ex=new Set(data.map(g=>g.id));let added=0;
for(const g of G){if(ex.has(g.id)){console.log('skip',g.id);continue;}const t=await get(g.gameId);if(!t){console.log('FAIL',g.id);continue;}const p=parse(t);if(p.result!=='0-1'){console.log('NOT BLACK WIN',g.id,p.result);continue;}data.push({id:g.id,openingId:'alekhine-defence',studentSide:'black',white:p.white,black:p.black,whiteElo:p.whiteElo,blackElo:p.blackElo,result:p.result,year:p.year,event:p.event,pgn:p.sans.join(' '),overview:g.overview,criticalMoments:[{moveNumber:g.cmMove,color:'black',fen:fenAt(p.sans,g.cmMove),annotation:g.cmNote,concept:g.concept}],middlegameTheme:g.theme,lessonSummary:g.summary});added++;console.log('added',g.id,`(${p.white} v ${p.black}, ${p.sans.length}p)`);}
writeFileSync(PATH,JSON.stringify(data,null,2)+'\n');console.log('total',data.length,'added',added);

import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const PATH='src/data/model-games.json';
const EX='https://chess-academy-pro.vercel.app/api/lichess-game-export?id=';
async function get(id){for(let i=0;i<6;i++){try{const r=await fetch(EX+id);if(r.ok)return await r.text();}catch(e){}await new Promise(s=>setTimeout(s,800));}return null;}
const G=[
 {id:'mg-dutch-main',gameId:'2MCztuWR',cmMove:13,concept:'The Leningrad attack',
  overview:"Leningrad Dutch — Svidler beats Eljanov from the Black side, the …f5 spearhead and rerouted queen powering a kingside attack.",theme:"…f5 storm and the …Qe8 reroute against the king",summary:"The Leningrad: fianchetto, reroute the queen with …Qe8, and storm the kingside while the centre stays fluid.",
  cmNote:"Black has the Leningrad setup — the g7-bishop on the long diagonal, the f5-pawn spearheading, and the queen rerouted via …Qe8 to power the kingside attack."},
 {id:'mg-dutch-stonewall',gameId:'YSvU3Ibw',cmMove:13,concept:'The Stonewall fortress',
  overview:"Stonewall — Carlsen outplays Caruana from the Black side, the e4-knight and d6-bishop the heart of a fortress that attacks.",theme:"The d5/e6/f5 wall, the e4 outpost and …Bd6 battery",summary:"The Stonewall: build the wall, plant a knight on e4, and attack the king with the d6-bishop while the structure stays unbreakable.",
  cmNote:"Black has the Stonewall structure — the immovable wall clamping e4, the d6-bishop aimed at h2, and a knight heading for the eternal e4 outpost. A fortress that attacks."},
 {id:'mg-dutch-classical',gameId:'K5jru1eI',cmMove:13,concept:'Flexible activity',
  overview:"Classical Dutch — Sadler beats Mikhalevski from the Black side with the flexible …Be7 setup and the e4 outpost.",theme:"Flexible …Be7/…d5 and the …Ne4/…fxe4 cramp",summary:"The Classical: develop flexibly with …Be7 and …d5, plant the e4-knight, and recapture …fxe4 for a cramping pawn and a kingside attack.",
  cmNote:"Black has the flexible Classical structure — …Be7, …d5 clamping e4, and the knight heading for the central outpost, with the kingside attack in reserve."},
 {id:'mg-dutch-ilyinzhenevsky',gameId:'LVDt8hv9',cmMove:13,concept:'Play on both wings',
  overview:"Ilyin-Zhenevsky — Speelman beats Illescas from the Black side, the …Qe8 reroute and …b5 break giving play across the board.",theme:"…Qe8 kingside reroute plus the …b5 queenside break",summary:"The Ilyin-Zhenevsky: solid Classical base, reroute the queen with …Qe8 for a kingside attack, and break with …b5 on the queenside.",
  cmNote:"Black has the Ilyin-Zhenevsky setup — the solid …e6/…Be7/…d5 base, the queen rerouted via …Qe8 for the kingside, and queenside expansion with …a5/…b5 brewing."},
 {id:'mg-dutch-leningrade5',gameId:'uYI2AWLC',cmMove:13,concept:'The central counterstrike',
  overview:"Leningrad …e5 break — Caruana beats Kramnik from the Black side, meeting White's space with a central counterstrike.",theme:"The …c6 and …e5 central break in the Leningrad",summary:"The Leningrad …e5 plan: prepare with …c6, strike the centre with …e5, and reach an open, active position with the fianchettoed bishop.",
  cmNote:"Black has met White's central space with the …c6/…e5 counterstrike — the centre opens, the g7-bishop's diagonal clears, and Black has free, active piece play."},
];
function parse(t){const h=(k)=>(t.match(new RegExp(`\\[${k} "([^"]+)"\\]`))||[])[1];const body=t.split(/\n\n/).slice(1).join('\n');const sans=body.replace(/\{[^}]*\}/g,'').replace(/\[%[^\]]*\]/g,'').replace(/\d+\.(\.\.)?/g,'').replace(/\s+/g,' ').trim().split(' ').filter(x=>x&&!/^(1-0|0-1|1\/2-1\/2|\*)$/.test(x));return {white:(h('White')||'').replace(/\s*\(%[^)]*\)/g,''),black:(h('Black')||'').replace(/\s*\(%[^)]*\)/g,''),whiteElo:Number(h('WhiteElo'))||undefined,blackElo:Number(h('BlackElo'))||undefined,result:h('Result'),year:Number((h('Date')||'').slice(0,4))||undefined,event:h('Event'),sans};}
function placementFen(sans,mn,color){const c=new Chess();let moveNo=1;for(const tok of sans){const turn=c.turn();c.move(tok);const col=turn==='w'?'white':'black';if(moveNo===mn&&col===color)return c.fen();if(turn==='b')moveNo+=1;}return null;}
const data=JSON.parse(readFileSync(PATH,'utf-8'));const ex=new Set(data.map(g=>g.id));let added=0;
for(const g of G){if(ex.has(g.id)){console.log('skip',g.id);continue;}const t=await get(g.gameId);if(!t){console.log('FAIL',g.id);continue;}const p=parse(t);if(p.result!=='0-1'){console.log('NOT BLACK WIN',g.id,p.result);continue;}const fen=placementFen(p.sans,g.cmMove,'black');if(!fen){console.log('CM past end',g.id);continue;}data.push({id:g.id,openingId:'dutch-defence',studentSide:'black',white:p.white,black:p.black,whiteElo:p.whiteElo,blackElo:p.blackElo,result:p.result,year:p.year,event:p.event,pgn:p.sans.join(' '),overview:g.overview,criticalMoments:[{moveNumber:g.cmMove,color:'black',fen,annotation:g.cmNote,concept:g.concept}],middlegameTheme:g.theme,lessonSummary:g.summary});added++;console.log('added',g.id,`(${p.white} v ${p.black}, ${p.sans.length}p)`);}
writeFileSync(PATH,JSON.stringify(data,null,2)+'\n');console.log('total',data.length,'added',added);

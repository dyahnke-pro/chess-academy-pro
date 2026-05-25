import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const PATH='src/data/model-games.json';
const EX='https://chess-academy-pro.vercel.app/api/lichess-game-export?id=';
async function get(id){for(let i=0;i<6;i++){try{const r=await fetch(EX+id);if(r.ok)return await r.text();}catch(e){}await new Promise(s=>setTimeout(s,800));}return null;}
const G=[
 {id:'mg-benko-main',gameId:'OAqIpO80',cmMove:13,concept:'The Benko grip',
  overview:"Fully Accepted Benko — Carlsen grinds down Gelfand from the Black side, the open files and queenside pressure doing the work.",theme:"Open a-/b-files and lasting queenside pressure for the pawn",summary:"The classic Benko: sacrifice the b-pawn, fianchetto, and squeeze White's queenside with the rooks, queen and g7-bishop.",
  cmNote:"Black has the full Benko grip — the open a- and b-files, the g7-bishop on the long diagonal, and the queen swinging to the queenside. The pawn is gone but the pressure is permanent."},
 {id:'mg-benko-declined',gameId:'5OQhB4gr',cmMove:13,concept:'The grip without risk',
  overview:"Benko Declined — Fominyh beats Tunik from the Black side; declining the gambit just hands Black an easy, comfortable game.",theme:"…bxc4 and the fianchetto when White declines",summary:"When White declines with Nf3, Black takes on c4, fianchettoes, and gets the Benko pressure with none of the gambit risk.",
  cmNote:"White declined the pawn, but Black still has the fianchettoed bishop, the half-open b-file, and easy queenside pressure — the Benko grip with no risk."},
 {id:'mg-benko-zaitsev',gameId:'AmKi1ztz',cmMove:13,concept:'The b4-pawn cramp',
  overview:"Zaitsev Variation — Zvjaginsev outplays Seliverstov from the Black side after White tries to keep the extra pawn.",theme:"…b4 cramps White's queenside; full compensation",summary:"When White clings to the pawn, Black pushes …b4 to cramp the queenside, fianchettoes, and gets full compensation on the a-file.",
  cmNote:"White nominally keeps the pawn, but the …b4-pawn cramps his queenside, the a-file is Black's, and the g7-bishop rakes the centre — full Benko compensation."},
 {id:'mg-benko-halfaccepted',gameId:'HjAFQKCf',cmMove:13,concept:'Initiative with the pawn returned',
  overview:"Half-Accepted — Praggnanandhaa beats Wesley So from the Black side; the e3 line returns the pawn and Black seizes the initiative.",theme:"…Qa5+, …Bb7 and …Nxd5 active play",summary:"Against the modest e3, Black grabs the initiative with …Qa5+ and …Bb7, regains the pawn with …Nxd5, and stays active.",
  cmNote:"White returned the pawn with e3, but Black's pieces are the active ones — the queen on a5, the bishop on the long diagonal, and …Nxd5 regaining material with the initiative."},
];
function parse(t){const h=(k)=>(t.match(new RegExp(`\\[${k} "([^"]+)"\\]`))||[])[1];const body=t.split(/\n\n/).slice(1).join('\n');const sans=body.replace(/\{[^}]*\}/g,'').replace(/\[%[^\]]*\]/g,'').replace(/\d+\.(\.\.)?/g,'').replace(/\s+/g,' ').trim().split(' ').filter(x=>x&&!/^(1-0|0-1|1\/2-1\/2|\*)$/.test(x));return {white:(h('White')||'').replace(/\s*\(%[^)]*\)/g,''),black:(h('Black')||'').replace(/\s*\(%[^)]*\)/g,''),whiteElo:Number(h('WhiteElo'))||undefined,blackElo:Number(h('BlackElo'))||undefined,result:h('Result'),year:Number((h('Date')||'').slice(0,4))||undefined,event:h('Event'),sans};}
function fenAt(sans,mn){const ply=(mn-1)*2+1;const c=new Chess();for(let i=0;i<=ply&&i<sans.length;i++)c.move(sans[i]);return c.fen();}
const data=JSON.parse(readFileSync(PATH,'utf-8'));const ex=new Set(data.map(g=>g.id));let added=0;
for(const g of G){if(ex.has(g.id)){console.log('skip',g.id);continue;}const t=await get(g.gameId);if(!t){console.log('FAIL',g.id);continue;}const p=parse(t);if(p.result!=='0-1'){console.log('NOT BLACK WIN',g.id,p.result);continue;}data.push({id:g.id,openingId:'benko-gambit',studentSide:'black',white:p.white,black:p.black,whiteElo:p.whiteElo,blackElo:p.blackElo,result:p.result,year:p.year,event:p.event,pgn:p.sans.join(' '),overview:g.overview,criticalMoments:[{moveNumber:g.cmMove,color:'black',fen:fenAt(p.sans,g.cmMove),annotation:g.cmNote,concept:g.concept}],middlegameTheme:g.theme,lessonSummary:g.summary});added++;console.log('added',g.id,`(${p.white} v ${p.black}, ${p.sans.length}p)`);}
writeFileSync(PATH,JSON.stringify(data,null,2)+'\n');console.log('total',data.length,'added',added);

import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const PATH='src/data/model-games.json';
const EX='https://chess-academy-pro.vercel.app/api/lichess-game-export?id=';
async function get(id){for(let i=0;i<6;i++){try{const r=await fetch(EX+id);if(r.ok)return await r.text();}catch(e){}await new Promise(s=>setTimeout(s,800));}return null;}
const G=[
 {id:'mg-nimzo-main',gameId:'lfr3M0an',cmMove:12,concept:'Control over conquest',
  overview:"Classical 4.Qc2 — Aronian outplays Kasparov from the Black side, trading the bishop for structure and the better files.",theme:"Trade …Bxc3, control e4, dominate the open files",summary:"The Classical Nimzo: give up the bishop pair for control of e4 and the files, then outplay from the better structure.",
  cmNote:"Black has the Classical Nimzo bargain — the bishop traded for control of e4 and the light squares, the pieces heading for the open files. Control over conquest."},
 {id:'mg-nimzo-rubinstein',gameId:'tFSF4kUK',cmMove:12,concept:'Active equality',
  overview:"Rubinstein 4.e3 — Caruana beats Le Quang Liem from the Black side, the b7-bishop and central breaks doing the work.",theme:"…d5/…c5 and the …Bb7 fianchetto vs e3",summary:"Against 4.e3, Black contests the centre with …d5/…c5, fianchettoes, and trades on c3 at the right moment.",
  cmNote:"The Rubinstein structure is set — Black contesting the centre with …d5/…c5, the pieces harmonious and the …Bxc3 trade held in reserve for when it damages White."},
 {id:'mg-nimzo-huebner',gameId:'vYkjHnUY',cmMove:12,concept:'Doubled-pawn blockade',
  overview:"Hübner — Ivanchuk beats Laznicka from the Black side, the doubled c-pawns blockaded and besieged.",theme:"…Bxc3 doubling, …d6/…e5 blockade",summary:"The Hübner: double White's c-pawns with …Bxc3, clamp the centre with …d6/…e5, and besiege the weakness.",
  cmNote:"The Hübner blockade is in place — White's doubled c-pawns fixed as a chronic weakness, the centre clamped, and Black's knights the better minor pieces. Nimzowitsch's dream."},
 {id:'mg-nimzo-leningrad',gameId:'FKzZmlKr',cmMove:12,concept:'Blockade + kingside storm',
  overview:"Leningrad 4.Bg5 — Karpov beats Jussupow from the Black side, blockading the doubled pawns and storming the kingside.",theme:"…Bxc3 doubling, …e5 clamp, …g5 space",summary:"Against 4.Bg5, Black doubles the c-pawns, clamps with …e5, and grabs kingside space with …g5 to entomb the bishop.",
  cmNote:"The Leningrad blockade holds — doubled white c-pawns, a clamped centre, and Black gaining kingside space with …g5 to shut out the h4-bishop. All the trumps are Black's."},
 {id:'mg-nimzo-kasparov',gameId:'zXUf5STt',cmMove:12,concept:'Structure vs the fianchetto',
  overview:"Kasparov 4.Nf3 — Kramnik beats Kasparov himself from the Black side, equalising against the fianchetto.",theme:"…d5 central strike, …Bxc3 + …Ba6",summary:"Against 4.Nf3/g3, Black strikes with …d5, trades on c3 to fracture the queenside, and activates …Ba6 on the light squares.",
  cmNote:"Black has met the fianchetto head-on with …d5, and the …Bxc3 trade plus …Ba6 gives the doubled-c-pawn target and active light-squared play — full equality against the smoothest setup."},
 {id:'mg-nimzo-saemisch',gameId:'lo1wGh6G',cmMove:12,concept:'Blockade vs the big centre',
  overview:"Sämisch 4.a3 — Nakamura beats Carlsen from the Black side, blockading the doubled pawns against White's centre and bishop pair.",theme:"Blockade the doubled c-pawns vs centre + bishops",summary:"Against the Sämisch, Black blockades White's doubled c-pawns and big centre with pieces on the light squares, then converts the structural edge.",
  cmNote:"The Sämisch battle is joined — White's big centre and bishop pair against Black's blockade of the doubled c-pawns. Hold the blockade, trade the attackers, and the structure tells."},
 {id:'mg-nimzo-f3',gameId:'MXF8wCPS',cmMove:12,concept:'Punishing over-ambition',
  overview:"4.f3 — Carlsen beats Anand from the Black side, punishing White's over-ambitious central plan.",theme:"…d5/…c4 clamp vs the 4.f3 centre",summary:"Against 4.f3, Black challenges with …d5, clamps with …c4, and exploits White's doubled pawns and slow development.",
  cmNote:"White's grand 4.f3 central ambitions have backfired — doubled c-pawns and slow development, while Black clamps the queenside and develops against the static weaknesses."},
 {id:'mg-nimzo-fischer',gameId:'sXtdyjIi',cmMove:12,concept:'Light-square control',
  overview:"Fischer 4.e3 b6 — Karjakin beats Grischuk from the Black side with the light-squared fianchetto setup.",theme:"…b6/…Bb7 control e4, …Bd6 bishop pair",summary:"The Fischer …b6 setup: control e4 with the b7-bishop, keep the bishop pair with …Bd6, and play actively on both wings.",
  cmNote:"Black has the Fischer setup — the b7-bishop controlling e4, the dark bishop kept active on d6, and a sound centre. Light-square control and the two bishops give an easy, fighting game."},
];
function parse(t){const h=(k)=>(t.match(new RegExp(`\\[${k} "([^"]+)"\\]`))||[])[1];const body=t.split(/\n\n/).slice(1).join('\n');const sans=body.replace(/\{[^}]*\}/g,'').replace(/\[%[^\]]*\]/g,'').replace(/\d+\.(\.\.)?/g,'').replace(/\s+/g,' ').trim().split(' ').filter(x=>x&&!/^(1-0|0-1|1\/2-1\/2|\*)$/.test(x));return {white:(h('White')||'').replace(/\s*\(%[^)]*\)/g,''),black:(h('Black')||'').replace(/\s*\(%[^)]*\)/g,''),whiteElo:Number(h('WhiteElo'))||undefined,blackElo:Number(h('BlackElo'))||undefined,result:h('Result'),year:Number((h('Date')||'').slice(0,4))||undefined,event:h('Event'),sans};}
function fenAt(sans,mn){const ply=(mn-1)*2+1;const c=new Chess();for(let i=0;i<=ply&&i<sans.length;i++)c.move(sans[i]);return c.fen();}
const data=JSON.parse(readFileSync(PATH,'utf-8'));const ex=new Set(data.map(g=>g.id));let added=0;
for(const g of G){if(ex.has(g.id)){console.log('skip',g.id);continue;}const t=await get(g.gameId);if(!t){console.log('FAIL',g.id);continue;}const p=parse(t);if(p.result!=='0-1'){console.log('NOT BLACK WIN',g.id,p.result);continue;}data.push({id:g.id,openingId:'nimzo-indian',studentSide:'black',white:p.white,black:p.black,whiteElo:p.whiteElo,blackElo:p.blackElo,result:p.result,year:p.year,event:p.event,pgn:p.sans.join(' '),overview:g.overview,criticalMoments:[{moveNumber:g.cmMove,color:'black',fen:fenAt(p.sans,g.cmMove),annotation:g.cmNote,concept:g.concept}],middlegameTheme:g.theme,lessonSummary:g.summary});added++;console.log('added',g.id,`(${p.white} v ${p.black}, ${p.sans.length}p)`);}
writeFileSync(PATH,JSON.stringify(data,null,2)+'\n');console.log('total',data.length,'added',added);

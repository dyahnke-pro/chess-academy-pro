import fs from 'node:fs'; import { Chess } from 'chess.js';
const EXPORT='https://chess-academy-pro.vercel.app/api/lichess-game-export';
const meta=(p,k)=>(p.match(new RegExp(`\\[${k} "([^"]+)"\\]`))||[])[1]||'';
const stripPgn=(p)=>{const c=new Chess();c.loadPgn(p);return c.history().join(' ');};
const pgn=await fetch(`${EXPORT}?id=xC3D4wps`).then(r=>r.text());
if(meta(pgn,'Result')!=='1-0'){ console.error('not white win'); process.exit(1); }
// add model game
const mgFile='src/data/model-games.json'; const mg=JSON.parse(fs.readFileSync(mgFile,'utf8'));
const gameId='mg-four-knights-game-rubinstein-variation-4-bb5-nd4';
if(!mg.some(x=>x.id===gameId)){
  mg.push({ id:gameId, openingId:'four-knights-game', white:meta(pgn,'White'), black:meta(pgn,'Black'),
    whiteElo:parseInt(meta(pgn,'WhiteElo')||'0',10)||null, blackElo:parseInt(meta(pgn,'BlackElo')||'0',10)||null,
    result:'1-0', year:parseInt((meta(pgn,'Date').match(/^(\d{4})/)||[])[1]||'0',10), event:meta(pgn,'Event'),
    pgn:stripPgn(pgn), studentSide:'white', variation:'Rubinstein Variation: 4.Bb5 Nd4',
    overview:"Morozevich shows how to handle the Rubinstein's 4...Nd4: rather than the drawish trade, he keeps pieces on with Ba4 and Nxe5, accepts a gambit-style structure, and outplays Svidler with active piece play and the e5-wedge. A model of fighting for the advantage against Black's equalizing try.",
    criticalMoments:[], middlegameTheme:'Keep pieces on, the e5-wedge, active fighting play.',
    lessonSummary:'Avoid the trade with Ba4, grab e5, and play for the initiative.' });
  fs.writeFileSync(mgFile, JSON.stringify(mg,null,2)+'\n');
  console.log('added model game', gameId);
}
// re-anchor plan
const O='rgba(255, 165, 0, 0.55)', Y='rgba(255, 235, 59, 0.5)';
const H=(s,c=O)=>({square:s,color:c});
const ENTRY='r1bqk2r/pppp1ppp/5n2/1B2p3/3nP3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5';
const moves=['Ba4','Bc5','Nxe5','O-O','Nd3','Bb6','e5','Ne8'];
const annotations=[
 "Ba4! Avoiding the drawish trade on d4 — White keeps the bishop and plays for more, the ambitious answer to the Rubinstein.",
 "Black develops the bishop actively to c5.",
 "Nxe5! White snatches the central pawn, accepting some structural risk for a clear extra pawn and the e5-wedge.",
 "Black castles, seeking development for the pawn.",
 "White repositions the knight to d3, holding the extra material and shoring up the position.",
 "…Bb6 retreats the bishop to safety.",
 "e5! White expands, the central pawn cramping Black and gaining space for the pieces.",
 "…Ne8 retreats the harassed knight. White is a clean pawn up with the e5-wedge and the more active game — Morozevich converted exactly this against Svidler.",
];
const learnCues=[
 "Ba4 — avoid the trade, keep the bishop","…Bc5 — Black develops",
 "Nxe5 — grab the central pawn","…O-O — Black castles",
 "Nd3 — hold the extra pawn","…Bb6 — retreat",
 "e5 — expand, cramp Black","…Ne8 — Black retreats",
];
const highlights=[[H('a4')],[H('c5')],[H('e5')],[H('g8')],[H('d3')],[H('b6')],[H('e5')],[H('e8')]];
const arrows=moves.map(()=>[]);
const c=new Chess(ENTRY);
for(const m of moves){ const mv=c.move(m); if(!mv){ console.error('ILLEGAL',m); process.exit(1); } }
for(const [n,a] of [['ann',annotations],['cue',learnCues],['hl',highlights],['arr',arrows]]) if(a.length!==moves.length){ console.error('LEN',n,a.length); process.exit(1); }
const SRC=["concept:pos-initiative","concept:pos-center","https://en.wikipedia.org/wiki/Four_Knights_Game"];
const planFile='src/data/middlegame-plans.json'; const data=JSON.parse(fs.readFileSync(planFile,'utf8'));
const p=data.find(x=>x.id==='mp-fourknightsgame-rubinstein');
p.criticalPositionFen=ENTRY;
p.pawnBreaks=[{move:'e4-e5 — the central wedge',explanation:'White expands in the centre to cramp Black and convert the extra pawn.',fen:ENTRY}];
p.pieceManeuvers=[
 {piece:'Bishop',route:'Bb5-a4 — keep the tension',explanation:'The bishop avoids the trade to play for the advantage rather than equality.'},
 {piece:'Knight',route:'Nf3xe5-d3 — grab and hold the pawn',explanation:'The knight wins the central pawn, then reroutes to d3 to consolidate.'},
];
p.playableLines=[{fen:ENTRY,moves,annotations,arrows,title:'Fighting the Rubinstein (Morozevich–Svidler)',highlights,intro:"White avoids the trade and plays for the extra pawn.",sources:SRC,learnCues}];
fs.writeFileSync(planFile, JSON.stringify(data,null,2)+'\n');
console.log('re-anchored mp-fourknightsgame-rubinstein,',moves.length,'plies | end',c.fen());

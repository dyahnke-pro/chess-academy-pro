import fs from 'node:fs'; import { Chess } from 'chess.js';
const EXPORT='https://chess-academy-pro.vercel.app/api/lichess-game-export';
const meta=(p,k)=>(p.match(new RegExp(`\\[${k} "([^"]+)"\\]`))||[])[1]||'';
const stripPgn=(p)=>{const c=new Chess();c.loadPgn(p);return c.history().join(' ');};
const pgn=await fetch(`${EXPORT}?id=tAGz6kYG`).then(r=>r.text());
if(meta(pgn,'Result')!=='0-1'){ console.error('not black win'); process.exit(1); }
const mgFile='src/data/model-games.json'; const mg=JSON.parse(fs.readFileSync(mgFile,'utf8'));
const gameId='mg-sicilian-najdorf-najdorf-adams-attack-6-g3-fianchetto';
if(!mg.some(x=>x.id===gameId)){
  mg.push({ id:gameId, openingId:'sicilian-najdorf', white:meta(pgn,'White'), black:meta(pgn,'Black'),
    whiteElo:parseInt(meta(pgn,'WhiteElo')||'0',10)||null, blackElo:parseInt(meta(pgn,'BlackElo')||'0',10)||null,
    result:'0-1', year:parseInt((meta(pgn,'Date').match(/^(\d{4})/)||[])[1]||'0',10), event:meta(pgn,'Event'),
    pgn:stripPgn(pgn), studentSide:'black', variation:'Najdorf: Adams Attack (6.g3 Fianchetto)',
    overview:"Vachier-Lagrave shows the Najdorf's resources against the quiet 6.g3 fianchetto: the ...e5 wedge claims the centre, ...b5 expands, and Black's harmonious development neutralizes White's setup before taking over with active piece play. A model of meeting a positional anti-Najdorf with energetic central and queenside play.",
    criticalMoments:[], middlegameTheme:'The ...e5 wedge, ...b5 expansion vs the fianchetto.',
    lessonSummary:'Plant ...e5, expand with ...b5, and outplay the quiet g3 setup.' });
  fs.writeFileSync(mgFile, JSON.stringify(mg,null,2)+'\n');
  console.log('added model game', gameId);
}
const O='rgba(255, 165, 0, 0.55)', Y='rgba(255, 235, 59, 0.5)';
const H=(s,c=O)=>({square:s,color:c});
const ENTRY='r1bqkb1r/1p3ppp/p2p1n2/8/3NP3/2N3P1/PPP2P1P/R1BQKB1R b KQkq - 0 7';
const moves=['e5','Nde2','Be7','Bg2','b5','Nd5','Nbd7','Nec3'];
const annotations=[
 "…e5! The Najdorf's central thrust, claiming space and kicking the d4-knight even against the quiet fianchetto setup.",
 "White retreats the knight to e2, planning to reroute it.",
 "…Be7 develops, readying castling and keeping the dark squares solid.",
 "White completes the fianchetto with Bg2.",
 "…b5! Black expands on the queenside, gaining space and preparing …Bb7 and …b4 — the standard Najdorf counterplay.",
 "White posts the knight on the d5-outpost.",
 "…Nbd7 develops and prepares to challenge or trade the d5-knight, completing Black's harmonious setup.",
 "White's other knight returns to c3 to support d5. Black has the ideal Najdorf-vs-fianchetto picture: the e5 wedge, queenside space, and easy development — Vachier-Lagrave outplayed Giri from here.",
];
const learnCues=[
 "…e5 — the central wedge","Nde2 — White reroutes",
 "…Be7 — develop, ready to castle","Bg2 — the fianchetto",
 "…b5 — queenside expansion","Nd5 — White's outpost",
 "…Nbd7 — challenge the d5-knight","Nec3 — White supports d5",
];
const highlights=[[H('e5')],[H('e2')],[H('e7')],[H('g2')],[H('b5')],[H('d5')],[H('d7')],[H('c3')]];
const arrows=moves.map(()=>[]);
const c=new Chess(ENTRY);
for(const m of moves){ const mv=c.move(m); if(!mv){ console.error('ILLEGAL',m); process.exit(1); } }
for(const [n,a] of [['ann',annotations],['cue',learnCues],['hl',highlights],['arr',arrows]]) if(a.length!==moves.length){ console.error('LEN',n,a.length); process.exit(1); }
const SRC=["concept:pos-center","concept:pos-space","https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation"];
const planFile='src/data/middlegame-plans.json'; const data=JSON.parse(fs.readFileSync(planFile,'utf8'));
const p=data.find(x=>x.id==='mp-siciliannajdorf-6g3');
p.criticalPositionFen=ENTRY;
p.pawnBreaks=[{move:'…b5-b4 — the queenside lever',explanation:'Black expands with …b5 and can push …b4 to challenge the c3-knight, the Najdorf counterplay even against the fianchetto.',fen:ENTRY}];
p.pieceManeuvers=[
 {piece:'Knight',route:'…Nb8-d7 — challenge the d5-outpost',explanation:'The knight develops to contest or trade White’s strong d5-knight.'},
 {piece:'Pawn',route:'…e5 and …b5 — claim the centre and queenside',explanation:'The …e5 wedge plus …b5 expansion gives Black space on both fronts.'},
];
p.playableLines=[{fen:ENTRY,moves,annotations,arrows,title:'Najdorf vs the Fianchetto (Giri–Vachier-Lagrave)',highlights,intro:"Black answers 6.g3 with the ...e5 wedge and ...b5 expansion.",sources:SRC,learnCues}];
fs.writeFileSync(planFile, JSON.stringify(data,null,2)+'\n');
console.log('re-anchored mp-siciliannajdorf-6g3,',moves.length,'plies | end',c.fen());

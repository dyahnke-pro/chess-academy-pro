import fs from 'node:fs'; import { Chess } from 'chess.js';
const EXPORT='https://chess-academy-pro.vercel.app/api/lichess-game-export';
const meta=(p,k)=>(p.match(new RegExp(`\\[${k} "([^"]+)"\\]`))||[])[1]||'';
const stripPgn=(p)=>{const c=new Chess();c.loadPgn(p);return c.history().join(' ');};
const pgn=await fetch(`${EXPORT}?id=HSJKsqHS`).then(r=>r.text());
if(meta(pgn,'Result')!=='0-1'){ console.error('not black win'); process.exit(1); }
const mgFile='src/data/model-games.json'; const mg=JSON.parse(fs.readFileSync(mgFile,'utf8'));
const gameId='mg-sicilian-dragon-classical-variation';
if(!mg.some(x=>x.id===gameId)){
  mg.push({ id:gameId, openingId:'sicilian-dragon', white:meta(pgn,'White'), black:meta(pgn,'Black'),
    whiteElo:parseInt(meta(pgn,'WhiteElo')||'0',10)||null, blackElo:parseInt(meta(pgn,'BlackElo')||'0',10)||null,
    result:'0-1', year:parseInt((meta(pgn,'Date').match(/^(\d{4})/)||[])[1]||'0',10), event:meta(pgn,'Event'),
    pgn:stripPgn(pgn), studentSide:'black', variation:'Classical Variation',
    overview:"Carlsen shows the Classical Dragon (Be2 rather than the sharp Yugoslav) is no easy ride for White: the fianchettoed bishop on g7 and the ...a6/...b5 queenside expansion give Black a smooth, dynamic game, and he gradually outplays Svidler. A model of the Dragon's positional resources when White declines the main-line attack.",
    criticalMoments:[], middlegameTheme:'The g7-bishop, ...a6/...b5 queenside expansion.',
    lessonSummary:'Fianchetto, expand with ...a6/...b5, and use the Dragon bishop.' });
  fs.writeFileSync(mgFile, JSON.stringify(mg,null,2)+'\n');
  console.log('added model game', gameId);
}
const O='rgba(255, 165, 0, 0.55)', Y='rgba(255, 235, 59, 0.5)';
const H=(s,c=O)=>({square:s,color:c});
const ENTRY='rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6';
const moves=['Be2','Bg7','O-O','O-O','Be3','Nc6','Nb3','a6'];
const annotations=[
 "Be2 — White chooses the Classical Dragon, a calmer setup than the sharp Yugoslav Attack with its opposite-side castling race.",
 "…Bg7! The Dragon bishop takes its post on the long diagonal, raking toward White's queenside — the soul of the whole opening.",
 "White castles kingside, signalling a positional game.",
 "…O-O — Black castles too; with both kings safe this becomes a manoeuvring battle, not a slugfest.",
 "White develops the bishop to e3.",
 "…Nc6 develops and eyes the d4- and b4-squares.",
 "White repositions the knight to b3 to free the d-file and discourage …d5.",
 "…a6! Black begins the queenside expansion, preparing …b5-b4 to attack on the wing where the Dragon bishop already points. Black has a comfortable, dynamic game with the easier plan — Carlsen outplayed Svidler from here.",
];
const learnCues=[
 "Be2 — the Classical Dragon","…Bg7 — the Dragon bishop",
 "O-O — White castles short","…O-O — Black castles",
 "Be3 — White develops","…Nc6 — develop, eye b4",
 "Nb3 — White repositions","…a6 — start the queenside expansion",
];
const highlights=[[H('e2')],[H('g7')],[H('g1')],[H('g8')],[H('e3')],[H('c6')],[H('b3')],[H('a6')]];
const arrows=moves.map(()=>[]);
const c=new Chess(ENTRY);
for(const m of moves){ const mv=c.move(m); if(!mv){ console.error('ILLEGAL',m); process.exit(1); } }
for(const [n,a] of [['ann',annotations],['cue',learnCues],['hl',highlights],['arr',arrows]]) if(a.length!==moves.length){ console.error('LEN',n,a.length); process.exit(1); }
const SRC=["concept:pos-development","concept:pos-space","https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation"];
const planFile='src/data/middlegame-plans.json'; const data=JSON.parse(fs.readFileSync(planFile,'utf8'));
const p=data.find(x=>x.id==='mp-siciliandragon-classical');
p.criticalPositionFen=ENTRY;
p.pawnBreaks=[{move:'…b5-b4 — the queenside expansion',explanation:'Black gains space and prepares …b4 to hit the c3-knight, attacking on the wing the Dragon bishop rakes.',fen:ENTRY}];
p.pieceManeuvers=[
 {piece:'Bishop',route:'…Bf8-g7 — the Dragon bishop',explanation:'The fianchettoed bishop dominates the long diagonal toward White’s queenside.'},
 {piece:'Pawn',route:'…a6 and …b5 — the queenside lever',explanation:'Black expands to open lines on the wing where his bishop points.'},
];
p.playableLines=[{fen:ENTRY,moves,annotations,arrows,title:'The Classical Dragon (Svidler–Carlsen)',highlights,intro:"Black fianchettoes and expands on the queenside.",sources:SRC,learnCues}];
fs.writeFileSync(planFile, JSON.stringify(data,null,2)+'\n');
console.log('re-anchored mp-siciliandragon-classical,',moves.length,'plies | end',c.fen());

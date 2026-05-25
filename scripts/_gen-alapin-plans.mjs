import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'node:fs';
function build(prefix, lineMoves){const c=new Chess();for(const m of prefix.split(' ')){const b=c.fen();c.move(m);if(c.fen()===b)throw new Error('illegal prefix '+m);}const fen=c.fen();const sans=[];for(const m of lineMoves){const b=c.fen();const r=c.move(m);if(!r||c.fen()===b)throw new Error('illegal '+m+' from '+c.fen());sans.push(r.san);}return{fen,moves:sans};}
const PLANS=[
 {id:'mp-sicilianalapin-main',title:'Alapin: Undermine the Centre',
  overview:"Black's plan against the Alapin: hit e4 with Nf6, strike with cxd4 and d6 to undermine White's e5-spearhead, and trade the centre away into a comfortable, equal game.",
  pawnBreaks:[{move:'d6',explanation:'d6 challenges the e5-spearhead directly.'}],
  pieceManeuvers:[{piece:'Knight',route:'Nb8-c6',explanation:'Nc6 leans on the d4-pawn.'}],
  strategicThemes:['Hit e4 with Nf6.','Undermine the centre with cxd4 and d6.','Trade White\'s space into equality.'],
  endgameTransitions:['Trades lead to a level endgame.'],
  prefix:'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6',
  line:['Bb5','dxe5','Nxe5','Bd7','Nxd7','Qxd7'],
  annotations:['Bb5 — White pins the c6-knight.','dxe5 — Black removes the spearhead.','Nxe5 — White recaptures.','Bd7 — Black offers trades to ease the game.','Nxd7 — pieces come off.','Qxd7 — Black is fully equal, the queen active.']},
 {id:'mp-sicilianalapin-d5',title:'Alapin 2...d5: Blockade the Isolated Pawn',
  overview:"After 2...d5 Black plays against White's isolated queen's pawn: develop with tempo, pin the f3-knight, blockade d5, and pile on the lone d-pawn.",
  pawnBreaks:[{move:'cxd4 (resolve)',explanation:'Black resolves the structure favourably once developed.'}],
  pieceManeuvers:[{piece:'Bishop',route:'Bc8-g4',explanation:'Bg4 pins the knight defending d4.'}],
  strategicThemes:['Blockade the d5-square.','Pin and pile on the isolated d-pawn.','Trade into a better endgame.'],
  endgameTransitions:['The isolated pawn is a long-term target.'],
  prefix:'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6 h3 Bh5 O-O',
  line:['Nc6','Na3','a6','Nc2','cxd4'],
  annotations:['Nc6 — develop, pressing d4.','Na3 — White reroutes awkwardly.','a6 — Black denies b5 and prepares.','Nc2 — White eyes the d4-pawn.','cxd4 — Black resolves it, comfortable against the weakness.']},
];
const out=[];
for(const p of PLANS){const {fen,moves}=build(p.prefix,p.line);if(moves.length!==p.annotations.length)throw new Error(p.id+' mismatch');
 out.push({id:p.id,openingId:'sicilian-alapin',title:p.title,criticalPositionFen:fen,overview:p.overview,pawnBreaks:p.pawnBreaks.map(pb=>({...pb,fen})),pieceManeuvers:p.pieceManeuvers,strategicThemes:p.strategicThemes,endgameTransitions:p.endgameTransitions,playableLines:[{title:p.title,fen,moves,annotations:p.annotations,arrows:moves.map(()=>[]),highlights:moves.map(()=>[])}]});
 console.log(p.id+': ok '+moves.length);}
const path='src/data/middlegame-plans.json';const ex=JSON.parse(readFileSync(path,'utf-8')).filter(p=>p.openingId!=='sicilian-alapin');
writeFileSync(path,JSON.stringify([...ex,...out],null,2)+'\n');console.log('merged '+out.length+' alapin plans');

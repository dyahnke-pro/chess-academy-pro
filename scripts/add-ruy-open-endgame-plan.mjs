import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const JSON_PATH='src/data/middlegame-plans.json';
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const lineSan='e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 c3 Be7 Nbd2 O-O';
const annMap={
 9:"The Open Ruy — Black grabs the e4-pawn instead of defending it. The position cracks open; this is the most active, least patient way to meet the Spanish.",
 10:"White strikes the centre back at once — in the Open, the open lines are worth far more than a pawn.",
 13:"Black props the knight with d5, claiming the centre and the e6-square for the bishop. Here is the structure that defines the Open: Black's mobile d5-pawn against White's e5 wedge.",
 19:"Nbd2 — the knight reroutes to b3 to bear down on c5 and the d5/c5 light squares.",
 20:"Both sides castle into a sharp, open middlegame — no slow manoeuvring here. The ending the Open steers toward is pure activity: White's e5-wedge and bishop pair against Black's free d5-pawn and busy pieces. Whoever's army is better placed when the queens vanish takes the point.",
};
const c=new Chess(); const moves=[]; const arrows=[];
lineSan.split(' ').forEach(s=>{const m=c.move(s); if(!m)throw new Error('illegal '+s); moves.push(m.san); arrows.push([{from:m.from,to:m.to}]);});
const finalFen=c.fen();
const annotations=moves.map((_,i)=>annMap[i]??'');
const plans=JSON.parse(readFileSync(JSON_PATH,'utf-8'));
if(plans.some(p=>p.id==='mp-ruylopez-open-endgame')){console.log('exists');process.exit(0);}
plans.push({
 id:'mp-ruylopez-open-endgame', openingId:'ruy-lopez', criticalPositionFen:finalFen,
 title:'Open Ruy: Activity into the Ending',
 overview:"The Open Ruy is the antithesis of the closed manoeuvring lines — Black takes on e4 and the game opens at once. The structure that results, Black's mobile d5-pawn against White's e5 wedge, carries straight into a piece-activity endgame: not patience, but coordination.",
 pawnBreaks:[{move:'d4 / c3-c4',explanation:'Open the centre with d4, then challenge d5 with c4 to clarify the structure for the ending.',fen:finalFen},{move:'f2-f4-f5',explanation:'Support and expand the e5-wedge to cramp Black before trading down.',fen:finalFen}],
 pieceManeuvers:[{piece:'Knight',route:'Nb1-d2-b3',explanation:'Reroute to b3, eyeing c5 and d4 and contesting the light squares.'},{piece:'Bishop',route:'Bb3 stays active',explanation:'The Spanish bishop keeps the a2-g8 diagonal — a long-term trump into the ending.'}],
 strategicThemes:["The Open is activity, not patience — the better-coordinated army wins the ending.","Black's mobile d5-pawn vs White's e5-wedge is the defining imbalance, all the way down.","The bishop pair and open lines favour White if the position stays sharp into the endgame."],
 endgameTransitions:["An open, piece-active ending: White's bishop pair and the e5-wedge tell if coordination holds.","If Black's d5-pawn becomes weak rather than mobile, White's pressure converts the endgame."],
 playableLines:[{fen:START,moves,annotations,arrows,title:'The Open Structure into the Ending'}],
});
writeFileSync(JSON_PATH,JSON.stringify(plans,null,2)+'\n');
console.log('added mp-ruylopez-open-endgame —',moves.length,'plies →',finalFen);

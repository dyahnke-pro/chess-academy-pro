// Print the board after each ply of a line, + a verifier for proposed beats.
import { Chess } from 'chess.js';
// usage: node tmp_board.mjs "e4 e5 Nf3 Nc6 ..."  [ply]
const moves = process.argv[2].split(/\s+/);
const onlyPly = process.argv[3] ? Number(process.argv[3]) : null;
const c = new Chess();
moves.forEach((m,i)=>{
  const mv=c.move(m);
  if(onlyPly===null || i===onlyPly){
    // list piece squares
    const board=c.board(); const pieces=[];
    for(const row of board) for(const sq of row) if(sq) pieces.push(`${sq.color}${sq.type}@${sq.square}`);
    console.log(`ply ${i} ${mv.color==='w'?'W':'B'} ${m} -> dest ${mv.to}; turn:${c.turn()}`);
    if(onlyPly!==null) console.log('  pieces:', pieces.join(' '));
  }
});

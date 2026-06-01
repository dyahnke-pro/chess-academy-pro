import fs from 'node:fs';import { Chess } from 'chess.js';import { spawn } from 'node:child_process';
const SF='/usr/games/stockfish';
function best(fen,depth=16){return new Promise((res)=>{const p=spawn(SF);let out='';p.stdout.on('data',d=>out+=d);p.on('close',()=>{const m=out.match(/bestmove (\w+)/);res(m?m[1]:null);});p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${depth}\n`);setTimeout(()=>p.stdin.write('quit\n'),3500);})}
// per opening: setup SANs + the wrong student move + name + explanation
const W={
 'pro-carlsen-open-sicilian':{setup:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 Ng4',wrong:'Bd2',plies:3,name:'Passive Bd2 vs ...Ng4',exp:"Watch out: when ...Ng4 hits the e3-bishop, the passive retreat Bd2 surrenders White's whole initiative. The active Bg5 is far stronger — here Black equalises comfortably and the English-Attack pressure evaporates."},
 'pro-carlsen-ruy-lopez':{setup:'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6',wrong:'Nxe5',plies:3,name:'Nxe5 walks into ...Qd4',exp:"Watch out: after the early exchange on c6, grabbing the e5-pawn with Nxe5 runs into ...Qd4!, forking the knight and the e4-pawn. Black regains the pawn with the bishop pair and an easy game — White had nothing to gain."},
 'pro-carlsen-sicilian':{setup:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5',wrong:'Nxe4',plies:3,name:'...Nxe4 drops the queen',exp:"Watch out: against the Bg5 Najdorf, the greedy ...Nxe4 loses on the spot to Bxd8, and after ...Nxc3 Bxc7 White is a clean piece up. Always meet Bg5 with the solid ...e6."},
 'pro-carlsen-1e5':{setup:'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4',wrong:'Nf6',plies:3,name:'Retreating ...Nf6 hands White the centre',exp:"Watch out: in the Open Berlin, retreating the knight with ...Nf6 allows dxe5 and a big, free White centre. The whole point is ...Nd6!, hitting the b5-bishop and steering into the famous balanced endgame."},
 'pro-carlsen-kid':{setup:'d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Nf3 e5 O-O',wrong:'Nxe4',plies:2,name:'...Nxe4 drops a piece',exp:"Watch out: in the Classical King's Indian, the natural-looking ...Nxe4 just drops a piece to Nxe4. Develop with ...Nc6 and play for the thematic ...f5 kingside storm instead."},
 'pro-carlsen-nimzo':{setup:'d4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O e4',wrong:'Nxe4',plies:2,name:'...Nxe4 loses material',exp:"Watch out: in this sharp Nimzo with an early e4, grabbing the pawn with ...Nxe4 loses material to Nxe4. Hit the centre the right way with ...d5."},
};
const d=JSON.parse(fs.readFileSync('src/data/pro-repertoires.json','utf8'));
const byId=new Map(d.openings.map(o=>[o.id,o]));
for(const [id,w] of Object.entries(W)){
  const c=new Chess();for(const m of w.setup.split(' '))c.move(m);
  const wm=c.move(w.wrong); if(!wm){console.log(id,'illegal wrong');continue;}
  // engine plays the punishment for `plies` half-moves
  for(let i=0;i<w.plies;i++){const bm=await best(c.fen());if(!bm)break;const mv=c.move({from:bm.slice(0,2),to:bm.slice(2,4),promotion:bm.slice(4)||undefined});if(!mv)break;}
  // build SAN pgn from start
  const pgn=c.history().join(' ');
  const o=byId.get(id); if(!o){console.log(id,'no entry');continue;}
  o.warningLines=[{name:w.name,pgn,explanation:w.exp}];
  console.log(`${id}: ${pgn}`);
}
fs.writeFileSync('src/data/pro-repertoires.json',JSON.stringify(d,null,2)+'\n');
console.log('warnings written');

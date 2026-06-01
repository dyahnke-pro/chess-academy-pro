import { Chess } from 'chess.js';
// usage: node _arrowcheck.mjs "<sans...>" <from> <to>
const args=process.argv.slice(2);
const sans=args[0].split(/\s+/); const from=args[1],to=args[2];
const c=new Chess();
for(const s of sans){ if(!c.move(s)){console.log('ILLEGAL line at',s);process.exit(1);} }
const pc=c.get(from);
const legal=c.moves({verbose:true}).some(m=>m.from===from&&m.to===to);
console.log(`from ${from}=${pc?pc.color+pc.type:'EMPTY'} to ${to}: legalMove=${legal} nonPawn=${pc&&pc.type!=='p'}`);

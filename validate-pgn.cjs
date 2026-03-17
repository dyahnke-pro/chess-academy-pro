const { Chess } = require('chess.js');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8'));

let errors = 0;
let total = 0;

for (const opening of data.openings) {
  const allLines = [
    { name: `${opening.name} (main)`, pgn: opening.pgn },
    ...(opening.variations || []).map(v => ({ name: `${opening.name} > ${v.name}`, pgn: v.pgn })),
    ...(opening.trapLines || []).map(t => ({ name: `${opening.name} > TRAP: ${t.name}`, pgn: t.pgn })),
    ...(opening.warningLines || []).map(w => ({ name: `${opening.name} > WARNING: ${w.name}`, pgn: w.pgn })),
  ];

  for (const line of allLines) {
    total++;
    const chess = new Chess();
    const moves = line.pgn.split(/\s+/).filter(m => m.length > 0);
    for (let i = 0; i < moves.length; i++) {
      try {
        chess.move(moves[i]);
      } catch (e) {
        console.error(`ILLEGAL MOVE in "${line.name}": move ${i + 1} "${moves[i]}" after position:`);
        console.error(`  FEN: ${chess.fen()}`);
        console.error(`  PGN so far: ${moves.slice(0, i).join(' ')}`);
        console.error(`  Legal moves: ${chess.moves().join(', ')}`);
        console.error('');
        errors++;
        break;
      }
    }
  }
}

console.log(`\nValidated ${total} lines. ${errors} errors found.`);
if (errors > 0) process.exit(1);

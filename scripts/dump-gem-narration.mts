// Throwaway review aid: for every hand-authored gem narration, print the board
// facts at the inaccuracy ply + the Watch/Learn text on the inaccuracy and the
// punish moves, so a human review can verify the narration explains WHY the
// move is an inaccuracy and WHY the punish works. Not a gate — a review lens.
import { Chess } from 'chess.js';
import gems from '../src/data/punish-gems.json' assert { type: 'json' };
import { GEM_NARRATION } from '../src/data/lessons/punishGemNarration.ts';
import { gemId, type PunishGem } from '../src/data/lessons/punishGems.ts';

const byId = new Map((gems as PunishGem[]).map((g) => [gemId(g), g]));
const onlyOpening = process.argv[2]; // optional filter by openingId prefix

let n = 0;
for (const [id, narr] of Object.entries(GEM_NARRATION)) {
  const g = byId.get(id);
  if (!g) { console.log(`!! ORPHAN narration id (no gem): ${id}`); continue; }
  if (onlyOpening && !g.openingId.startsWith(onlyOpening)) continue;
  n++;
  const play = g.playLine.split(' ');
  const i = g.lineMoves.split(' ').length; // inaccuracy ply index
  const c = new Chess();
  for (let k = 0; k < i; k++) c.move(play[k]);
  const fenBefore = c.fen();
  // what the inaccuracy move does
  const inaccMv = c.move(play[i]);
  const fenAfterInacc = c.fen();
  const punishMv = play[i + 1] ? c.move(play[i + 1]) : null;

  console.log(`\n==== [${n}] ${g.openingId} | tier=${g.tier} cp=${g.engineCp} ====`);
  console.log(`spine: ${g.lineMoves}`);
  console.log(`inaccuracy: ${g.inaccuracy} (ply ${i + 1})  punish: ${g.punish}`);
  console.log(`FEN before inaccuracy: ${fenBefore.split(' ')[0]}  (${fenBefore.split(' ')[1]} to move)`);
  console.log(`  WATCH @inacc : ${JSON.stringify(narr.watch[i])}`);
  console.log(`  LEARN @inacc : ${JSON.stringify(narr.learn[i])}`);
  console.log(`  WATCH @punish: ${JSON.stringify(narr.watch[i + 1])}`);
  console.log(`  LEARN @punish: ${JSON.stringify(narr.learn[i + 1])}`);
  if (g.why) console.log(`  why(auto)    : ${g.why}`);
}
console.log(`\n\nTOTAL reviewed: ${n}`);

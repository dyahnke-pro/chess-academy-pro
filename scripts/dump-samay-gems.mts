import { Chess } from 'chess.js';
import gems from '../src/data/punish-gems.json' assert { type: 'json' };
import { GEM_NARRATION } from '../src/data/lessons/punishGemNarration.ts';
import { gemId, type PunishGem } from '../src/data/lessons/punishGems.ts';

const byId = new Map((gems as PunishGem[]).map((g) => [gemId(g), g]));

for (const [id, narr] of Object.entries(GEM_NARRATION)) {
  const all = [...narr.watch, ...narr.learn].join(' ');
  if (!/There is a concrete punishment|wins material or breaks through by force|the strong reply that leaves/.test(all)) continue;
  const g = byId.get(id)!;
  const play = g.playLine.split(' ');
  const i = g.lineMoves.split(' ').length;
  const c = new Chess();
  for (let k = 0; k < i; k++) c.move(play[k]);
  const fen = c.fen();
  // continuation detail
  const cont: string[] = [];
  const c2 = new Chess(fen);
  for (let k = i; k < play.length; k++) {
    const mv = c2.move(play[k]);
    cont.push(`${play[k]}(${mv.from}${mv.to}${mv.captured ? 'x' + mv.captured : ''}${mv.san.includes('+') ? '+' : ''})`);
  }
  console.log(`\n### ${id}`);
  console.log(`spine: ${g.lineMoves}`);
  console.log(`studentSide: ${g.openingId.includes('black') || g.openingId.includes('sicilian-black') ? '?' : ''} | tier=${g.tier} cp=${g.engineCp}`);
  console.log(`FEN(before ${g.inaccuracy}): ${fen}`);
  console.log(`inacc=${g.inaccuracy}  punish=${g.punish}`);
  console.log(`continuation: ${cont.join(' ')}`);
  console.log(`watch[i]=${JSON.stringify(narr.watch[i])}`);
  console.log(`watch[i+1]=${JSON.stringify(narr.watch[i + 1])}`);
}

import { Chess } from 'chess.js';
import gems from '../src/data/punish-gems.json' assert { type: 'json' };
import { GEM_NARRATION } from '../src/data/lessons/punishGemNarration.ts';
import { gemId, type PunishGem } from '../src/data/lessons/punishGems.ts';

const byId = new Map((gems as PunishGem[]).map((g) => [gemId(g), g]));

// Words that signal the prose is FLAGGING the move as an error / explaining it.
const FAULT = /(\?|loses|losing|mistake|inaccura|too slow|too greedy|greedy|but |walks into|drops|blunder|weak|passive|natural[- ]looking|tempting|careless|overlook|misses|fatal|punish|exploit|wrong|premature|hands|gives up|costs|trap|undermin|backfire|invites|allows|neglect|ignore|wander|wastes|loosen|exposed|fork|pin|skewer|sac|snap|crash|rip|win)/i;

let empty = 0, noFault = 0, ok = 0;
const flags: string[] = [];
for (const [id, narr] of Object.entries(GEM_NARRATION)) {
  const g = byId.get(id);
  if (!g) { flags.push(`ORPHAN ${id}`); continue; }
  const i = g.lineMoves.split(' ').length;
  const wInacc = (narr.watch[i] ?? '').trim();
  const wPunish = (narr.watch[i + 1] ?? '').trim();
  if (!wInacc) { empty++; flags.push(`EMPTY-INACC  ${g.openingId} :: ${g.inaccuracy}→${g.punish} :: ${id}`); continue; }
  if (!FAULT.test(wInacc) && !FAULT.test(wPunish)) {
    noFault++;
    flags.push(`NO-FAULT-WORD ${g.openingId} :: ${g.inaccuracy}→${g.punish}\n   inacc: ${JSON.stringify(wInacc)}\n   pun:   ${JSON.stringify(wPunish)}`);
    continue;
  }
  ok++;
}
console.log(flags.join('\n'));
console.log(`\n=== ${ok} ok | ${empty} empty-inacc | ${noFault} no-fault-word ===`);

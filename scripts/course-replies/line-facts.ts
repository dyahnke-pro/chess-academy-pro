// THE FACT SHEET a narration writer works from (WO-COURSE-01 E). Hand-written
// narration is written FROM computed facts, never from memory (G0/G3): every
// move of the line with its board, the engine's read from the student's seat,
// the known mistake at the trigger and its punishment, what players at three
// ratings answer there (from the explorer cache) and the engine's read where
// the line lands.
//
//   npx tsx scripts/course-replies/line-facts.ts <openingId> <varIndex> <trigger@atPly>
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { Engine } from './engine.mjs';
import { indexKnownMistakes } from './line-walk.mjs';
import { numberedMove } from '../../src/utils/numberedMove';
import { pinsOf, looseOf, materialFor, hitsFrom, evalWords, PIECE_NAME as NAME } from './boardFacts';

const root = new URL('../..', import.meta.url).pathname;
const [openingId, varIndex, tk] = process.argv.slice(2);
const [trigger, atPlyS] = tk.split('@');
const atPly = Number(atPlyS);
const pos = (f: string): string => f.split(' ').slice(0, 4).join(' ');
const subs = JSON.parse(readFileSync(root + 'src/data/course-sublines.json', 'utf8'));
const s = subs[openingId]?.[varIndex]?.find((x: { triggerMove: string; atPly: number }) => x.triggerMove === trigger && x.atPly === atPly);
if (!s) throw new Error(`no subline ${openingId}::${varIndex}::${tk}`);
const color = (() => {
  for (const f of ['repertoire.json', 'pro-repertoires.json', 'gambits.json', 'anti-openings.json']) {
    const raw = JSON.parse(readFileSync(root + 'src/data/' + f, 'utf8'));
    const arr = Array.isArray(raw) ? raw : raw.openings ?? raw.gambits ?? Object.values(raw);
    const o = arr.find((x: { id?: string }) => x?.id === openingId);
    if (o) return o.color as 'white' | 'black';
  }
  return 'white';
})();
const me = color === 'white' ? 'w' : 'b';

// ── board facts, so a writer never needs a tool call to check a claim — the
// ONE module both fact sheets read (`boardFacts.ts`).
export { evalWords };

const engine = new Engine();
const c = new Chess();
console.log(`# ${openingId} · var ${varIndex} · ${numberedMove(atPly, trigger)} · student ${color} · ${s.name} · ${s.pct}% (${s.games} games)`);
const known = indexKnownMistakes([
  ...JSON.parse(readFileSync(root + 'src/data/punish-gems.json', 'utf8')),
  ...JSON.parse(readFileSync(root + 'src/data/gambit-punish-gems.json', 'utf8')),
]);
const beforeTrigger = new Chess();
for (const m of s.moves.slice(0, atPly)) beforeTrigger.move(m);
const gem = known.get(`${openingId}|${pos(beforeTrigger.fen())}|${trigger}`);
if (gem) console.log(`KNOWN MISTAKE: ${gem.inaccuracy} — punished by ${gem.punish} (engine ${gem.engineCp}cp, ${gem.tier}); line ${gem.punishSeq.join(' ')}`);
for (const band of ['1000-1200', '1400-1600', '1800-2000']) {
  const f = `${root}data/sources/explorer-cache/amateur-${band}.json`;
  if (!existsSync(f)) continue;
  const cache = JSON.parse(readFileSync(f, 'utf8'));
  const after = new Chess();
  for (const m of s.moves.slice(0, atPly + 1)) after.move(m);
  const at = cache[pos(after.fen())];
  if (at) console.log(`AT ${band}: after ${trigger}, players answer ${at.moves.slice(0, 5).map((m: { san: string; games: number }) => `${m.san} ${Math.round((m.games / at.total) * 100)}%`).join(', ')} (${at.total} games)`);
}
for (let i = 0; i < s.moves.length; i++) {
  const fen = c.fen();
  const mover = c.turn();
  const read = mover === me ? await engine.analyse(fen, { depth: 14 }) : null;
  const mv = c.move(s.moves[i]);
  const flags = [mv.captured ? `takes ${mv.captured}` : '', c.inCheck() ? 'check' : '', i === atPly ? 'TRIGGER' : ''].filter(Boolean).join(', ');
  const best = read?.best ? new Chess(fen).move({ from: read.best.slice(0, 2), to: read.best.slice(2, 4), promotion: read.best[4] }).san : null;
  console.log(`[${i}] ${numberedMove(i, mv.san)} ${mover === me ? 'YOU ' : 'THEM'}${flags ? ` (${flags})` : ''}${read ? ` · eval before ${read.score}cp you (${evalWords(read.score ?? 0)}) · engine best ${best}${best === mv.san ? ' (played)' : ''}` : ''}\n     ${c.fen()}`);
  const hits = hitsFrom(c, mv.to, mover);
  const pinned = pinsOf(c, me);
  const hang = looseOf(c, me, pinned.pinned);
  const mat = materialFor(c, me);
  console.log(`     the ${NAME[mv.piece]} on ${mv.to} hits: ${hits.join(', ') || 'nothing of theirs'} · loose (attacked, unguarded): ${hang.join(', ') || 'none'} · pins: ${pinned.text.join('; ') || 'none'} · material ${mat >= 0 ? '+' : ''}${mat} for you · side marker: ${mover === 'b' ? '"…' + mv.san + '"' : '"' + mv.san + '" (no dots)'}`);
}
const end = c.fen();
const final = await engine.analyse(end, { depth: 16 });
const finalCp = c.turn() === me ? final.score ?? 0 : -(final.score ?? 0);
console.log(`FINAL eval: ${finalCp}cp from your seat — say "${evalWords(finalCp)}", no stronger`);
engine.quit();

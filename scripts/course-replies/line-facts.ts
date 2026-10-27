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

// ── board facts, so a writer never needs a tool call to check a claim ──────
// The pilot's second reader (2026-10-27) found a pinned knight credited with
// an attack, "slightly better" on +0.23, a "…" on a White move: each is read
// off the board or the eval here, in fixed words.
const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
type Sq = Parameters<Chess['get']>[0];
const SQS = [...'abcdefgh'].flatMap((f) => [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${f}${r}` as Sq));
const side = (col: string): string => (col === me ? 'your' : 'their');
function loose(b: Chess, pinnedSqs: Set<string>): string[] {
  const out: string[] = [];
  for (const sq of SQS) {
    const q = b.get(sq);
    if (!q || q.type === 'k') continue;
    const foe = q.color === 'w' ? 'b' : 'w';
    const by = b.attackers(sq, foe);
    if (!by.length || b.attackers(sq, q.color).length) continue;
    const onlyPinned = by.every((a) => pinnedSqs.has(a));
    out.push(`${side(q.color)} ${NAME[q.type]} ${sq}${onlyPinned ? ' (but only a pinned piece attacks it)' : ''}`);
  }
  return out;
}
const pinnedAt = new Set<string>();
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function pins(b: Chess): string[] {
  const out: string[] = [];
  pinnedAt.clear();
  for (const sq of SQS) {
    const att = b.get(sq);
    if (!att || !'brq'.includes(att.type)) continue;
    for (const [df, dr] of DIRS) {
      const diag = df !== 0 && dr !== 0;
      if ((att.type === 'b' && !diag) || (att.type === 'r' && diag)) continue;
      let f = sq.charCodeAt(0) - 97 + df; let r = Number(sq[1]) + dr;
      let first: { sq: string; t: string } | null = null;
      while (f >= 0 && f < 8 && r >= 1 && r <= 8) {
        const s2 = `${String.fromCharCode(97 + f)}${r}` as Sq;
        const q = b.get(s2);
        if (q) {
          if (q.color === att.color) break;
          if (!first) first = { sq: s2, t: q.type };
          // A pin holds when the piece behind is the king, or worth more than
          // both the pinned piece and the pinner (queen behind knight, with a
          // queen pinning, is a trade, not a pin).
          else { if (VAL[q.type] > VAL[first.t] && (q.type === 'k' || VAL[q.type] > VAL[att.type])) { out.push(`${side(q.color)} ${NAME[first.t]} ${first.sq} pinned to the ${NAME[q.type]} ${s2} by the ${NAME[att.type]} ${sq}`); pinnedAt.add(first.sq); } break; }
        }
        f += df; r += dr;
      }
    }
  }
  return out;
}
function material(b: Chess): number {
  let d = 0;
  for (const sq of SQS) { const q = b.get(sq); if (q && q.type !== 'k') d += (q.color === me ? 1 : -1) * VAL[q.type]; }
  return d;
}
/** The words a narration may use for an eval from the student's seat. */
export function evalWords(cp: number): string {
  const a = Math.abs(cp);
  if (a < 35) return 'about level';
  const who = cp > 0 ? 'you' : 'they';
  if (a < 90) return `${who} are a little better`;
  if (a < 200) return `${who} are clearly better`;
  return `${who} are winning`;
}

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
  const hits = SQS.filter((sq) => { const q = c.get(sq); return q && q.color !== mover && c.attackers(sq, mover).includes(mv.to as Sq); }).map((sq) => `${NAME[c.get(sq)!.type]} ${sq}`);
  const pinned = pins(c);
  const hang = loose(c, pinnedAt);
  console.log(`     the ${NAME[mv.piece]} on ${mv.to} hits: ${hits.join(', ') || 'nothing of theirs'} · loose (attacked, unguarded): ${hang.join(', ') || 'none'} · pins: ${pinned.join('; ') || 'none'} · material ${material(c) >= 0 ? '+' : ''}${material(c)} for you · side marker: ${mover === 'b' ? '"…' + mv.san + '"' : '"' + mv.san + '" (no dots)'}`);
}
const end = c.fen();
const final = await engine.analyse(end, { depth: 16 });
const finalCp = c.turn() === me ? final.score ?? 0 : -(final.score ?? 0);
console.log(`FINAL eval: ${finalCp}cp from your seat — say "${evalWords(finalCp)}", no stronger`);
engine.quit();

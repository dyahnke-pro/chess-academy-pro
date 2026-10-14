// MEASUREMENT, not a gate (run with BOOK_WHY_MEASURE=1): our computed jobs for
// a move against his own read of that move (the voiced corpus — our reworded
// notes from his videos, keyed to the exact position). The corpus is the
// answer key only; nothing from it is spoken by this computer.
import { it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { moveJobs, type BookJobKind } from './bookMoveWhy';

type His = BookJobKind | 'break' | 'trade' | 'tempo' | 'space';
const RULES: Array<[His, RegExp]> = [
  ['guard', /\b(defend|defends|protect|protects|guard|guards|support|supports|shore[sd]? up)\b/i],
  ['stopsPin', /\b(pin|pins|prevent|prevents|stop|stops|rules? out|takes? away|denies|deny|keeps? .{0,20}\b(off|out of))\b/i],
  ['castle', /\bcastl/i],
  ['develop', /\bdevelop/i],
  ['center', /\bcent(re|er)\b/i],
  ['break', /\bbreak\b|\bstrike[s]? (at|back)\b|\bchalleng/i],
  ['trade', /\b(trade|trades|exchange|swap)\b/i],
  ['tempo', /\btempo\b|\bkick|\bchases?\b|\bharass/i],
  ['space', /\bspace\b|\bgains? ground\b/i],
];

it.runIf(process.env.BOOK_WHY_MEASURE === '1')('our jobs vs his read of the same move', () => {
  const raw = JSON.parse(readFileSync('public/data/voiced-teachings.json', 'utf8'));
  const notes: Array<{ id: string; lineSan: string[] | null; explains: string; teaches: string; phase: string }> = Object.values(raw.notes ?? raw);
  let scored = 0; let recall = 0; let top = 0; let hisNone = 0; let oursNone = 0; let ruleOnly = 0;
  const hisCount: Record<string, number> = {}; const missBy: Record<string, number> = {};
  const misses: string[] = []; const others: string[] = []; const extras: string[] = [];
  for (const n of notes) {
    if (!n.lineSan || n.lineSan.length < 2 || n.lineSan.length > 30 || n.phase !== 'opening') continue;
    const c = new Chess();
    try { for (const s of n.lineSan.slice(0, -1)) c.move(s); } catch { continue; }
    const fen = c.fen(); const mover = c.turn(); const san = n.lineSan[n.lineSan.length - 1];
    const text = `${n.explains} ${n.teaches}`;
    const his = new Set<His>(RULES.filter(([, re]) => re.test(text)).map(([k]) => k));
    let ours: BookJobKind[];
    try { ours = moveJobs(fen, san, mover); } catch { continue; }
    for (const h of his) hisCount[h] = (hisCount[h] ?? 0) + 1;
    if (his.size === 0) { hisNone += 1; if (others.length < 12 && Math.random() < 0.03) others.push(`${san}: ${n.explains.slice(0, 180)}`); continue; }
    const computable = [...his].filter((h) => ['guard', 'stopsPin', 'castle', 'develop', 'center'].includes(h));
    if (computable.length === 0) { ruleOnly += 1; continue; }
    scored += 1;
    if (ours.length === 0) oursNone += 1;
    if (ours.some((o) => his.has(o))) recall += 1;
    else { for (const h of computable) missBy[h] = (missBy[h] ?? 0) + 1; if (misses.length < 14 && Math.random() < 0.05) misses.push(`[his ${computable.join(',')} | ours ${ours.join(',') || '-'}] ${san}: ${n.explains.slice(0, 160)}`); }
    if (ours[0] && his.has(ours[0])) top += 1;
    else if (ours[0] && extras.length < 8 && Math.random() < 0.03) extras.push(`[ours-top ${ours[0]} | his ${[...his].join(',')}] ${san}: ${n.explains.slice(0, 140)}`);
  }
  console.log(JSON.stringify({ scored, recall, recallShare: +(recall / scored).toFixed(3), topMatch: top, topShare: +(top / scored).toFixed(3), oursNone, hisNone, ruleOnly, hisCount, missBy }, null, 1));
  console.log('--- MISSES'); for (const m of misses) console.log('·', m);
  console.log('--- OUR TOP DIFFERS'); for (const m of extras) console.log('·', m);
  console.log('--- HIS REASON IN NO CATEGORY'); for (const m of others) console.log('·', m);
}, 900_000);

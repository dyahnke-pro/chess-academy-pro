// THE MISSION'S FIXED LINES, read off the code — so an audit that asks "was
// only a mission line spoken?" can never fall behind a wording change or a new
// clause. Two sources: every card's announce / miss / pass phrase in
// `src/missions/registry.ts`, and the fixed clause a free-piece pass closes on
// for the pattern that won it (`SHOT_WON` in `src/missions/earnedSlip.ts`:
// "The pin won it."). A pass line plus one of those clauses is a mission line.
// (2026-10-22: the gate audit's hand-kept list lacked "… The pin won it." and
// failed a correct game.)
import { readFileSync } from 'node:fs';

const quoted = /(['"])((?:\\.|(?!\1).)*)\1/;

function phrases(root) {
  const src = readFileSync(`${root}/src/missions/registry.ts`, 'utf8');
  const out = new Set();
  for (const m of src.matchAll(/(?:announce|missPhrase|passLine|'[a-z-]+'):\s*(['"])((?:\\.|(?!\1).)*)\1/g)) out.add(m[2].replace(/\\'/g, "'"));
  const passes = new Set([...src.matchAll(/passLine:\s*(['"])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2].replace(/\\'/g, "'")));
  const slip = readFileSync(`${root}/src/missions/earnedSlip.ts`, 'utf8');
  const block = slip.slice(slip.indexOf('export const SHOT_WON'), slip.indexOf('};', slip.indexOf('export const SHOT_WON')));
  const clauses = block.split('\n').map((l) => l.split(':').slice(1).join(':').match(quoted)?.[2]).filter(Boolean);
  return { lines: out, passes, clauses };
}

/** A predicate: is this spoken text one of the mission's fixed lines? */
export function missionLineReader(root = '.') {
  const { lines, passes, clauses } = phrases(root);
  const isLine = (text) => lines.has(text) || [...passes].some((p) => clauses.some((c) => text === `${p} ${c}`));
  return { isLine, count: lines.size, clauses };
}

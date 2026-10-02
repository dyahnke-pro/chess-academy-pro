import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import walkthroughs from './voiced-walkthroughs.json';
import matchups from './voiced-matchups.json';

// David 2026-08-26: "we cannot speak like it's coming from someone other than
// our coach." The voiced corpus is farmed from a pro's videos and must be
// DEPERSONALIZED before it ships — no reference to the pro's own speedrun,
// games, course, or first-person history. `depersonalize.mjs` strips these at
// build time; this gate fails the build if any leaked into the shipped data.
const BANNED: Array<[string, RegExp]> = [
  ['speedrun', /\bspeedruns?\b/i],
  ['my real stuff', /\bmy real stuff\b/i],
  ['I feel like', /\bI feel like\b/i],
  ['my game against', /\bmy game against\b/i],
  ['from his course', /\bfrom his course\b/i],
  ['As I said/showed', /\bAs I (said|showed|mentioned)\b/i],
  ["I've played in the", /\bI['’]ve (already )?played (it )?in\b/i],
  // STREAM RESIDUE (WO-TEACH-GAPS P5 #55, measured 2026-09-30: five notes
  // still addressed a live audience).
  ['viewers', /\bviewers?\b/i],
  ['these guys', /\bthese guys\b/i],
  ['any one video', /\bany one video\b/i],
  ['One comment:', /\bOne comment:/],
];

function ideasOf(node: { idea?: string; children?: Array<{ node: unknown }> }): string[] {
  const out: string[] = [];
  const walk = (n: { idea?: string; children?: Array<{ node: unknown }> }): void => {
    if (n.idea) out.push(n.idea);
    for (const c of n.children ?? []) walk(c.node as typeof n);
  };
  walk(node);
  return out;
}

describe('voiced narration is depersonalized (no pro-personal references)', () => {
  const corpus: Array<{ id: string; texts: string[] }> = [];
  for (const w of walkthroughs as unknown as Array<{ openingName: string; intro?: string; outro?: string; tree: { root: never } }>) {
    corpus.push({ id: w.openingName, texts: [w.intro ?? '', w.outro ?? '', ...ideasOf(w.tree.root)] });
  }
  for (const m of matchups as unknown as Array<{ matchupName: string; intro?: string; outro?: string; tree: { root: never } }>) {
    corpus.push({ id: m.matchupName, texts: [m.intro ?? '', m.outro ?? '', ...ideasOf(m.tree.root)] });
  }
  // teachings ship from public/data (fetched at runtime) — scan the raw file.
  const teachingsRaw = readFileSync(join(process.cwd(), 'public/data/voiced-teachings.json'), 'utf8');

  for (const [label, re] of BANNED) {
    it(`no walkthrough/matchup narration contains "${label}"`, () => {
      const hits = corpus.flatMap((c) => c.texts.filter((t) => re.test(t)).map((t) => `${c.id}: ${t.slice(0, 80)}`));
      expect(hits, hits.join('\n')).toHaveLength(0);
    });
    it(`no voiced teaching note contains "${label}"`, () => {
      expect(re.test(teachingsRaw), `voiced-teachings.json still contains ${label}`).toBe(false);
    });
  }
});

// FIRST PERSON — the coach is the voice, not the pro (David 2026-08-26). 700
// voiced notes still say "I"/"my" (measured 2026-09-30, P5 #55): "I have to
// recapture with the knight", "I'll admit I missed it". Each needs an authoring
// decision — flip to "you" or drop the sentence — so it is not bulk-rewritten;
// it is held to a ceiling that can only SHRINK as the authoring pass lands.
const FIRST_PERSON_CEILING = 700;
describe('voiced teaching notes — first person only shrinks', () => {
  it(`at most ${FIRST_PERSON_CEILING} notes speak in the first person`, () => {
    const raw = JSON.parse(readFileSync(join(process.cwd(), 'public/data/voiced-teachings.json'), 'utf8')) as { notes: Array<{ explains?: unknown; teaches?: unknown; plans?: unknown }> };
    const arr = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : typeof x === 'string' ? [x] : []);
    const fp = raw.notes.filter((n) => /\b(I|I'm|I'll|I've|I'd|my|me|mine)\b/.test([...arr(n.explains), ...arr(n.teaches), ...arr(n.plans)].join(' ')));
    expect(raw.notes.length).toBeGreaterThan(1000);   // non-vacuous: the file was read
    expect(fp.length).toBeLessThanOrEqual(FIRST_PERSON_CEILING);
  });
});

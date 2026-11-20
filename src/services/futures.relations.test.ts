// ONE BOARD-DIFFER: `whatChanged` reads the relations diff (`relations.ts`)
// for every fact that states a board relation (a piece loose or hanging, a
// passed pawn), and matches the rest by claims and words as before. Real rows:
// the recorded engine futures (`__fixtures__/engineFutures.json`).
import { describe, it, expect } from 'vitest';
import fixture from './__fixtures__/engineFutures.json';
import { whatChanged, futureBoards, bundleAt, relationsOfFact, type LineRead } from './futures';
import { readEveryComputer } from './boardBundle';
import { snapshot, diff, relationKey } from './relations';
import { PICTURE_ROLE } from './positionPicture';
import type { CoachFact } from './coachFact';
import type { Color } from 'chess.js';

interface Args { fen: string; student: Color; rating: number; tryLine: LineRead; bestLine: LineRead }
const rows = (fixture as unknown as { rows: Array<{ id: string; args: Args }> }).rows;
const ROLES = new Set(['threat', 'resource', 'asset', 'weakness', 'board', 'standing']);
const key = (f: CoachFact): string => `${f.computer}|${[...f.claims].sort().join(',') || f.text}`;

describe('whatChanged reads the one relations diff', { timeout: 120_000 }, () => {
  it('turn-off-the-autopilot#1: the knight on a6 is loose on BOTH quiet boards — not something the try gave up', () => {
    const r = rows.find((x) => x.id === 'turn-off-the-autopilot#1');
    if (!r) throw new Error('fixture row missing');
    const t = futureBoards(r.args.fen, r.args.tryLine.moves).quiet;
    const b = futureBoards(r.args.fen, r.args.bestLine.moves).quiet;
    if (!t || !b) throw new Error('no quiet boards');
    // The relation is on both boards (the old claim/word match said "lost":
    // the two boards worded it differently).
    expect(snapshot(t.fen)?.byKey.has('loose:a6(bn)')).toBe(true);
    expect(snapshot(b.fen)?.byKey.has('loose:a6(bn)')).toBe(true);
    const wc = whatChanged(r.args);
    expect(wc.lost.some((c) => c.fact.squares.includes('a6') && c.fact.computer === 'computeMustDefend')).toBe(false);
  });

  it('every row: a relation fact is a change exactly when the diff has it; every other fact is matched as before', () => {
    let relationFacts = 0;
    for (const r of rows) {
      const wc = whatChanged(r.args);
      const t = futureBoards(r.args.fen, r.args.tryLine.moves);
      const b = futureBoards(r.args.fen, r.args.bestLine.moves);
      for (const at of ['reply', 'quiet'] as const) {
        const tf = t[at];
        const bf = b[at];
        if (!tf || !bf) continue;
        const ts = snapshot(tf.fen);
        const bs = snapshot(bf.fen);
        if (!ts || !bs) continue;
        const d = diff(bs, ts);
        const gained = new Set(d.gained.map(relationKey));
        const lostRel = new Set(d.lost.map(relationKey));
        const onTry = readEveryComputer(bundleAt(tf, r.args.tryLine, r.args.student, r.args.rating)).filter((f) => ROLES.has(PICTURE_ROLE[f.computer] ?? 'board'));
        const onBest = readEveryComputer(bundleAt(bf, r.args.bestLine, r.args.student, r.args.rating)).filter((f) => ROLES.has(PICTURE_ROLE[f.computer] ?? 'board'));
        const idx = (xs: CoachFact[]) => ({ keys: new Set(xs.map(key)), texts: new Set(xs.map((f) => `${f.computer}|${f.text}`)) });
        const bi = idx(onBest);
        const ti = idx(onTry);
        const inAppeared = new Set(wc.appeared.filter((c) => c.at === at).map((c) => key(c.fact)));
        const inLost = new Set(wc.lost.filter((c) => c.at === at).map((c) => key(c.fact)));
        for (const f of onTry) {
          const rels = relationsOfFact(f, ts);
          const expected = rels ? rels.some((k) => gained.has(k)) : !(bi.keys.has(key(f)) || bi.texts.has(`${f.computer}|${f.text}`));
          if (rels) relationFacts += 1;
          // A change can be dropped only as a repeat of one already listed (`once`).
          if (!expected) expect(wc.appeared.some((c) => c.at === at && c.fact.computer === f.computer && c.fact.text === f.text)).toBe(false);
          // Listed once across both lists (`once`): a change is in one of them.
          if (expected) expect(inAppeared.has(key(f)) || [...wc.appeared, ...wc.lost].some((c) => key(c.fact) === key(f))).toBe(true);
        }
        for (const f of onBest) {
          const rels = relationsOfFact(f, bs);
          const expected = rels ? rels.some((k) => lostRel.has(k)) : !(ti.keys.has(key(f)) || ti.texts.has(`${f.computer}|${f.text}`));
          if (!expected) expect(wc.lost.some((c) => c.at === at && c.fact.computer === f.computer && c.fact.text === f.text)).toBe(false);
          if (expected) expect(inLost.has(key(f)) || [...wc.appeared, ...wc.lost].some((c) => key(c.fact) === key(f))).toBe(true);
        }
      }
    }
    // NON-VACUOUS: the relation path was taken.
    expect(relationFacts).toBeGreaterThan(0);
  });
});

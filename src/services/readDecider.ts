/**
 * THE READ DECIDER — which of a board's facts a read says, and in what order
 * (David 2026-11-18: "get the decider working" → "feed danya's reads of the
 * positions into the decider to train it").
 *
 * The board's facts come from every computer (`boardReadFacts`). Whether a
 * fact is said is how often HIS reads of positions say that kind of fact when
 * the app has it on the board: a rate fitted on his reads
 * (`scripts/scoreboard/fit-read-decider.py` → `read-decider.json`), looked up
 * by where the fact came from, how deep it is and how much rides on it, backing
 * off to the kind alone when a finer cell has too few boards. The order is the
 * place each kind takes in his reads. Pure: no engine, no store.
 */
import table from '../data/read-decider.json';
import type { FactDepth } from './thoughtComposer';

/** Where a board fact came from: the board's own reads, a tempting move
 *  refuted, or what the engine's best move does. */
export type ReadFactFrom = 'position' | 'tempting' | 'bestMove';

export interface ReadFact {
  from: ReadFactFrom;
  kind: string;
  text: string;
  /** Only the best move's facts carry a depth. */
  depth: FactDepth | null;
  /** Centipawn-weighted stakes (`stakeValue`), null when nothing is staked. */
  stake: number | null;
}

interface ReadTable {
  prior: number;
  minN: number;
  keep: number;
  rates: Record<string, [number, number]>;
  order: Record<string, number>;
}

const T = table as unknown as ReadTable;

function stakeBand(s: number | null): 'none' | 'hi' | 'mid' | 'lo' {
  if (s === null) return 'none';
  return s >= 2000 ? 'hi' : s >= 1200 ? 'mid' : 'lo';
}

/** The cells a fact is looked up in, finest first. The `None` spelling of a
 *  missing depth is the fitter's (Python `str(None)`), so the two agree. */
function cells(f: ReadFact): string[] {
  return [
    `k|${f.from}|${f.kind}`,
    `kd|${f.kind}|${f.depth ?? 'None'}`,
    `ks|${f.kind}|${stakeBand(f.stake)}`,
    `k1|${f.kind}`,
  ];
}

/** How often his reads say this fact when it is on the board. */
export function saidRate(f: ReadFact, t: ReadTable = T): number {
  const smooth = ([y, n]: [number, number]): number => (y + 2 * t.prior) / (n + 2);
  for (const c of cells(f)) {
    const r = t.rates[c];
    if (r && r[1] >= t.minN) return smooth(r);
  }
  return smooth(t.rates[`k1|${f.kind}`] ?? [0, 0]);
}

/** The read: the facts his reads say, in his order, one statement of each. */
export function decideRead<F extends ReadFact>(facts: readonly F[], t: ReadTable = T): F[] {
  const kept = facts
    .map((f, i) => ({ f, i, p: saidRate(f, t) }))
    .filter((x) => x.p >= t.keep)
    .sort((a, b) => (t.order[a.f.kind] ?? 0.5) - (t.order[b.f.kind] ?? 0.5) || b.p - a.p || a.i - b.i);
  const seen = new Set<string>();
  const out: F[] = [];
  for (const { f } of kept) {
    const key = `${f.kind}|${f.text.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

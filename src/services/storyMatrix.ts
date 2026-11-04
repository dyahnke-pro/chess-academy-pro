// storyMatrix — THE BRACKET (WO-STORY-MATRIX-01 Phase 2, PLAN "PHASE 2 — the
// matrix"). The facts a move earned run one tournament, the same on every
// surface (one settings row while it is built — David 2026-10-30: "One voice
// right now until we get this working"):
//   1 QUALIFY — words to say;
//   2 MERGE   — one claim from two computers is one entry (same step, same idea);
//   3 STORY   — a fact already said this game/lesson is out;
//   4 REGION FINAL — five regions in Danya's bundles (A the story, B the threat,
//     C the decision, D the knowledge, E the habit); each crowns its champion by
//     score = stakes × story × proof (the student term rides the stakes: the
//     door's value already carries the student's hole);
//   5 THE FINAL — the champions meet; the top score LEADS and sets the thread;
//   6 THE THREAD — each next seat, in Danya's order, goes to a champion LINKED
//     to what was already said (cause → effect 3, same line 2, same decision 2,
//     same thread 1, the same square only `squareLink`); no link, no seat.
// The bench decides every number (`scripts/bench/matrix_replay.py`, held-out
// half of his videos) — never set by hand.
// A LEAF over the fact shape, the stakes and the relations reader.
import type { FactGroup } from './coachFact';
import { LOCAL_THREAD } from './coachFact';
import { stakeValue } from './factStakes';
import { causeEffect } from './factRelations';
import { isProof } from './proof';
import { sameIdea } from './ideaKind';
import { THOUGHT_ORDER, type ThoughtFact } from './thoughtComposer';

/** THE FIVE REGIONS (PLAN regions table) — every group in one. A `Record`, so a
 *  new group fails to compile until it is placed. */
export type MatrixRegion = 'story' | 'threat' | 'decision' | 'knowledge' | 'habit';
export const GROUP_REGION: Record<FactGroup, MatrixRegion> = {
  story: 'story', name: 'story', structure: 'story', verdict: 'story',
  danger: 'threat', theirSide: 'threat', notYet: 'threat',
  move: 'decision', choices: 'decision', line: 'decision',
  tactics: 'knowledge', technique: 'knowledge', concepts: 'knowledge',
  habit: 'habit',
};

/** One section's settings — fitted on the bench, one row everywhere for now. */
export interface MatrixSettings {
  /** How many champions a region may send to the final. */
  perRegion: number;
  /** Co-champions: within this share of the region's top score. */
  tie: number;
  /** The weakest link that earns a seat (0 seats an unlinked champion). */
  minLink: number;
  /** What a shared square alone is worth as a link. */
  squareLink: number;
  /** A fact on an open story thread scores this much more. */
  threadBonus: number;
  /** The proof term: an engine line, and no line at all, against an exact one. */
  engineProof: number;
  noProof: number;
}

/** WHAT LINKS TWO FACTS (PLAN link table): cause → effect 3, same line 2, same
 *  decision 2, same thread 1, the same square `squareLink`. */
export function linkStrength(a: ThoughtFact, b: ThoughtFact, s: MatrixSettings): number {
  if (causeEffect(a, b)) return 3;
  const la = lineKey(a);
  const lb = lineKey(b);
  if (la && lb && (la.includes(lb) || lb.includes(la))) return 2;
  const da = 'decision' in a.stakes ? a.stakes.decision : undefined;
  const db = 'decision' in b.stakes ? b.stakes.decision : undefined;
  if (da && da === db) return 2;
  if (a.thread !== LOCAL_THREAD && a.thread === b.thread) return 1;
  if (a.squares.some((sq) => b.squares.includes(sq))) return s.squareLink;
  return 0;
}

function lineKey(f: ThoughtFact): string | null {
  if (isProof(f.proof) && f.proof.line && f.proof.line.sans.length) return f.proof.line.sans.join(' ');
  const l = f.lines?.[0];
  return l && l.sans.length ? l.sans.join(' ') : null;
}

/** A fact's score in its region: what rides on it (or its weight, below every
 *  staked fact), its story, its proof. */
export function matrixScore(f: ThoughtFact, weight: number, s: MatrixSettings): number {
  const base = stakeValue(f.stakes) ?? weight;
  const story = f.thread !== LOCAL_THREAD ? 1 + s.threadBonus : 1;
  const proof = isProof(f.proof) ? (f.proof.exact ? 1 : s.engineProof) : s.noProof;
  return base * story * proof;
}

export interface MatrixResult {
  /** The facts that speak, in Danya's order; the first spoken step's lead is `lead`. */
  seated: ThoughtFact[];
  lead: ThoughtFact | null;
  /** Why each other fact did not speak. */
  held: Array<{ fact: ThoughtFact; why: 'merged' | 'said' | 'region' | 'unlinked' }>;
}

/** THE BRACKET over one move's facts. `weightOf` is the composer's fitted
 *  weight; `said` tells a fact the story already heard. */
export function runMatrix(
  facts: readonly ThoughtFact[],
  s: MatrixSettings,
  weightOf: (f: ThoughtFact) => number,
  said: (f: ThoughtFact) => boolean,
): MatrixResult {
  const held: MatrixResult['held'] = [];
  const score = (f: ThoughtFact): number => matrixScore(f, weightOf(f), s);
  // 1 qualify, 3 story.
  const live = facts.filter((f) => f.text.trim().length > 0 && f.restates !== true)
    .filter((f) => { if (said(f)) { held.push({ fact: f, why: 'said' }); return false; } return true; })
    .sort((a, b) => score(b) - score(a));
  // 2 merge.
  const merged: ThoughtFact[] = [];
  for (const f of live) {
    if (merged.some((m) => m.step === f.step && sameIdea(m, f))) { held.push({ fact: f, why: 'merged' }); continue; }
    merged.push(f);
  }
  // 4 region final.
  const byRegion = new Map<MatrixRegion, ThoughtFact[]>();
  for (const f of merged) {
    const r = GROUP_REGION[f.group];
    byRegion.set(r, [...(byRegion.get(r) ?? []), f]);
  }
  const champions: ThoughtFact[] = [];
  for (const fs of byRegion.values()) {
    const top = score(fs[0]);
    const crowned = fs.filter((f) => score(f) >= top * (1 - s.tie)).slice(0, s.perRegion);
    champions.push(...crowned);
    for (const f of fs) if (!crowned.includes(f)) held.push({ fact: f, why: 'region' });
  }
  if (champions.length === 0) return { seated: [], lead: null, held };
  // 5 the final.
  champions.sort((a, b) => score(b) - score(a));
  const lead = champions[0];
  // 6 the thread — in Danya's order, each seat linked to what was said.
  const seated: ThoughtFact[] = [lead];
  const rest = champions.slice(1).sort((a, b) => (THOUGHT_ORDER[a.step] - THOUGHT_ORDER[b.step]) || (score(b) - score(a)));
  for (const f of rest) {
    if (Math.max(...seated.map((x) => linkStrength(f, x, s))) >= s.minLink) seated.push(f);
    else held.push({ fact: f, why: 'unlinked' });
  }
  seated.sort((a, b) => THOUGHT_ORDER[a.step] - THOUGHT_ORDER[b.step]);
  return { seated, lead, held };
}

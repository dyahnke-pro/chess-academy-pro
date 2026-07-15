import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import middlegamePlans from './middlegame-plans.json';
import repertoire from './repertoire.json';
import proRepertoires from './pro-repertoires.json';
import antiOpenings from './anti-openings.json';
import baselineJson from './middlegamePlanContinuity.baseline.json';

// ── Gate C — plan↔opening continuity (David 2026-07-15: "handle gate C") ──
// A middlegame plan picks up where the opening leaves off (G9.3 Gate C).
// Enforced check: the plan's criticalPositionFen must share its PAWN
// SKELETON (diff <= 3 — a trade or push of drift) with SOME position along
// its opening's main or variation lines. The pawn structure is the opening's
// identity: a plan whose skeleton departs further is teaching from a
// different game. Endgame plans (id suffix -endgame) are game-mediated per
// the endgame doctrine and are not spine-checked here.
//
// The baseline is the 2026-07-15 backlog (largely the broken batch-authoring
// run whose anchors were pulled from corpus games without prefix-verifying
// the entry spine). It only SHRINKS — fix by extending the line to the
// anchor (engine-screened) or re-anchoring the plan; never add entries.

interface PlanLike { id: string; openingId: string; criticalPositionFen?: string }
interface EntryLike { id: string; pgn?: string; variations?: Array<{ pgn?: string }> | null }

const MAX_PAWN_DIFF = 3;

function pawnSet(c: Chess): Set<string> {
  const s = new Set<string>();
  for (const row of c.board()) for (const sq of row) if (sq && sq.type === 'p') s.add(sq.color + sq.square);
  return s;
}
function setDiff(a: Set<string>, b: Set<string>): number {
  let d = 0;
  for (const x of a) if (!b.has(x)) d++;
  for (const x of b) if (!a.has(x)) d++;
  return d;
}

const linesByOpening = new Map<string, string[]>();
const allEntries: EntryLike[] = [
  ...(repertoire as EntryLike[]),
  ...(proRepertoires as { openings: EntryLike[] }).openings,
  ...(antiOpenings as EntryLike[]),
];
for (const e of allEntries) {
  const arr: string[] = [];
  if (e.pgn) arr.push(e.pgn);
  for (const v of e.variations ?? []) if (v.pgn) arr.push(v.pgn);
  linesByOpening.set(e.id, arr);
}

function minPawnDiff(plan: PlanLike): number | null {
  const lines = linesByOpening.get(plan.openingId);
  if (!lines || lines.length === 0 || !plan.criticalPositionFen) return null;
  let planPawns: Set<string>;
  try { planPawns = pawnSet(new Chess(plan.criticalPositionFen)); } catch { return 99; }
  let best = 99;
  for (const pgn of lines) {
    const c = new Chess();
    best = Math.min(best, setDiff(pawnSet(c), planPawns));
    for (const m of pgn.trim().split(/\s+/)) {
      try { if (!c.move(m)) break; } catch { break; }
      best = Math.min(best, setDiff(pawnSet(c), planPawns));
      if (best === 0) return 0;
    }
  }
  return best;
}

describe('Gate C — middlegame plans anchor on (or directly continue) their opening lines', () => {
  const baseline = new Set((baselineJson as { ids: string[] }).ids);
  const plans = (middlegamePlans as PlanLike[]).filter((p) => !p.id.endsWith('-endgame'));

  it('no NEW plan breaks continuity (baseline only shrinks)', () => {
    const offenders: string[] = [];
    for (const p of plans) {
      const d = minPawnDiff(p);
      if (d != null && d > MAX_PAWN_DIFF && !baseline.has(p.id)) offenders.push(`${p.openingId} :: ${p.id} (pawn-diff ${d})`);
    }
    expect(offenders, `New plans must anchor on their opening's lines (pawn-diff <= ${MAX_PAWN_DIFF}); never add to the baseline:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('baseline contains no stale (now-anchored) entries — it only shrinks', () => {
    const planById = new Map(plans.map((p) => [p.id, p]));
    const stale: string[] = [];
    for (const id of baseline) {
      const p = planById.get(id);
      if (!p) { stale.push(`${id} (plan no longer exists)`); continue; }
      const d = minPawnDiff(p);
      if (d != null && d <= MAX_PAWN_DIFF) stale.push(`${id} (now pawn-diff ${d})`);
    }
    expect(stale, `These baseline entries are fixed — remove them from middlegamePlanContinuity.baseline.json:\n${stale.join('\n')}`).toEqual([]);
  });
});

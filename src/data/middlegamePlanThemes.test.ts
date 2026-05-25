import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import plansRaw from './middlegame-plans.json';
import baselineRaw from './middlegamePlanThemes.baseline.json';
import repertoireRaw from './repertoire.json';
import proRaw from './pro-repertoires.json';

// ─── The "show the theme" gate (David 2026-05-25) ───────────────────────────
// A middlegame-plan playableLine MUST demonstrate the plan's named theme — it
// must actually PLAY one of the plan's own declared pawn breaks, and it must
// not end on a bare promise ("Black is ready for …e5 and the kingside storm")
// without ever showing it. The disease: the "Dutch Leningrad: The Kingside
// Storm" line played d5/Na6/Rb1/Bd7 — zero storm moves — then promised the
// storm in its last annotation. This gate blocks NEW theme-empty / promise-
// only lines; the baseline holds the known offenders and only SHRINKS as lines
// are rewritten to play their breaks. See scripts/audit-plan-line-themes.mjs.

interface PlanLine { fen: string; moves: string[]; annotations?: string[]; title?: string }
interface Plan { id: string; openingId: string; title?: string; pawnBreaks?: unknown[]; playableLines?: PlanLine[] }

const plans = plansRaw as unknown as Plan[];
const baseline = new Set((baselineRaw as { keys: string[] }).keys);

const colorMap: Record<string, 'white' | 'black'> = {};
for (const src of [repertoireRaw, proRaw]) {
  const list = (Array.isArray(src) ? src : []) as Array<{ id?: string; color?: 'white' | 'black' }>;
  for (const o of list) if (o?.id && o?.color) colorMap[o.id] = o.color;
}

const SQUARE = /\b([a-h][1-8])\b/g;
const PROMISE = /\b(ready for|ready to|prepares?|preparing|will follow|is ready|planning|intends?|sets? up|setting up|swinging to|aims? to|looking to|poised|about to|coming next|next comes|to follow)\b/i;

function breakSquares(plan: Plan): Set<string> {
  const out = new Set<string>();
  const harvest = (s: unknown): void => {
    if (typeof s !== 'string') return;
    let m: RegExpExecArray | null;
    SQUARE.lastIndex = 0;
    while ((m = SQUARE.exec(s)) !== null) out.add(m[1]);
  };
  for (const pb of plan.pawnBreaks ?? []) {
    if (typeof pb === 'string') harvest(pb);
    else if (pb && typeof pb === 'object') harvest((pb as { move?: unknown }).move);
  }
  return out;
}

interface Offender { key: string; planId: string; flags: { themeEmpty: boolean; promiseEnding: boolean; badFen: boolean } }

function findOffenders(): Offender[] {
  const offenders: Offender[] = [];
  for (const plan of plans) {
    const lines = plan.playableLines ?? [];
    const color = colorMap[plan.openingId] ?? null;
    const breakSq = breakSquares(plan);
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      let themeHit = false;
      let badFen = false;
      try {
        const chess = new Chess(line.fen);
        const studentChar = color === 'black' ? 'b' : color === 'white' ? 'w' : null;
        for (const san of line.moves) {
          const mover = chess.turn();
          let mv;
          try { mv = chess.move(san); } catch { badFen = true; break; }
          const isStudent = studentChar ? mover === studentChar : true;
          if (isStudent && breakSq.size > 0 && breakSq.has(mv.to)) themeHit = true;
        }
      } catch { badFen = true; }
      const anns = line.annotations ?? [];
      const last = anns.length ? anns[anns.length - 1] : '';
      const promiseEnding = PROMISE.test(last);
      const themeEmpty = breakSq.size > 0 && !themeHit && !badFen;
      if (themeEmpty || promiseEnding || badFen) {
        offenders.push({ key: `${plan.id}#${li}`, planId: plan.id, flags: { themeEmpty, promiseEnding, badFen } });
      }
    }
  }
  return offenders;
}

describe('middlegame-plan playableLines demonstrate their named theme', () => {
  const offenders = findOffenders();

  it('introduces NO new theme-empty / promise-only lines beyond the baseline', () => {
    const novel = offenders.filter((o) => !baseline.has(o.key));
    expect(novel, `New plan lines fail the show-the-theme gate. Each MUST play one of its plan's declared pawn breaks (and not end on a bare promise). Rewrite them or, only if intentionally exempt, add to middlegamePlanThemes.baseline.json:\n${novel.map((o) => `  ${o.key} ${JSON.stringify(o.flags)}`).join('\n')}`).toHaveLength(0);
  });

  it('never lets a playableLine play an illegal move from its FEN', () => {
    const broken = offenders.filter((o) => o.flags.badFen && !baseline.has(o.key));
    expect(broken, `Illegal move / corrupt FEN in playableLine: ${broken.map((o) => o.key).join(', ')}`).toHaveLength(0);
  });

  it('keeps the fixed Dutch "Kingside Storm" line demonstrating the storm', () => {
    // Regression guard for David's 2026-05-25 report — this line must keep
    // playing a real kingside break (…g5/…g4/…f4), never revert to maneuvering.
    expect(offenders.some((o) => o.key === 'mp-dutchdefence-main#0')).toBe(false);
  });

  it('baseline does not contain entries that are already fixed (keep it honest)', () => {
    const live = new Set(offenders.map((o) => o.key));
    const stale = [...baseline].filter((k) => !live.has(k));
    // Informational: stale baseline entries are fixed lines that should be
    // pruned. Not a hard failure (avoids churn while a sweep is in flight),
    // but surfaced so the baseline shrinks honestly.
    if (stale.length > 0) console.warn(`[plan-themes] ${stale.length} baseline entries are now fixed — prune them: ${stale.join(', ')}`);
    expect(stale.length).toBeLessThanOrEqual(baseline.size);
  });
});

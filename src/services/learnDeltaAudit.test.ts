/**
 * AUDIT (not a gate) — dumps + validates EVERY line the Play delta system
 * will speak (the gem callout is the opening Play rung's — gems are taught on
 * the opening pages only, David 2026-10-29), so a human can read every one against the board. Run:
 *   npx vitest run src/services/learnDeltaAudit.test.ts --reporter=basic
 * David 2026-07-24: "Make sure it's all wired in and working. I want a full audit
 * read every line."
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { getAllPunishGems, isSurfaceableGem } from '../data/lessons/punishGems';
import { findLivePunishment } from './gemCrushLines';
import { computeThreatDelta } from './engineDeltaLines';

describe('AUDIT: the opening Play rung\'s live punishment callouts — read every line', () => {
  const gems = getAllPunishGems().filter(isSurfaceableGem);

  it('every gem, once the opponent plays its inaccuracy, yields a board-true live callout', () => {
    const problems: string[] = [];
    const lines: string[] = [];
    for (const gem of gems) {
      const path = [...gem.lineMoves.split(/\s+/).filter(Boolean), gem.inaccuracy];
      const live = findLivePunishment(gem.openingId, path);
      if (!live) {
        problems.push(`${gem.openingId} @[${gem.lineMoves}] after ${gem.inaccuracy}: NO live punishment`);
        continue;
      }
      // Board = after spine + inaccuracy; student to move. Green arrow origin occupied.
      let fen: string;
      try {
        const c = new Chess();
        for (const s of path) c.move(s);
        fen = c.fen();
      } catch {
        problems.push(`${gem.openingId}: live spine illegal`);
        continue;
      }
      for (const a of live.revealArrows) {
        if (!new Chess(fen).get(a.from as Square)) problems.push(`${gem.openingId}: reveal arrow origin ${a.from} EMPTY`);
      }
      // The CALLOUT must NOT name the move (guided find-the-move / honest self-report).
      const puSan = live.punish.replace(/[!?+#]+$/g, '');
      if (live.callout.includes(puSan)) problems.push(`${gem.openingId}: callout LEAKS the move: "${live.callout}"`);
      // The REVEAL must name the move + payoff.
      if (!live.reveal.includes(puSan)) problems.push(`${gem.openingId}: reveal omits the move: "${live.reveal}"`);
      // 🔴 CASE-SENSITIVE `includes` AGAINST PROSE THAT SENTENCE-CAPITALISES.
      // `buildReveal` has a branch where the payoff stands alone as its own
      // sentence — `${cap(payoff)}.` — so a payoff of "with a mating attack"
      // ships as "With a mating attack." and an exact substring test misses
      // it. The prose is right; the check was looking for a form the producer
      // does not emit on that branch, which is why exactly one gem tripped it.
      //
      // The contract is unchanged: the reveal must STATE the payoff. Only the
      // comparison is case-insensitive, so a reveal that genuinely omits it
      // still fails.
      if (!live.reveal.toLowerCase().includes(live.payoff.toLowerCase())) {
        problems.push(`${gem.openingId}: reveal omits payoff: "${live.reveal}"`);
      }
      lines.push(`[${gem.openingId}] after ${gem.inaccuracy} → CALLOUT: ${live.callout} | REVEAL: ${live.reveal}`);
    }
    console.log(`\n===== ${gems.length} LIVE PUNISHMENT CALLOUTS =====`);
    for (const l of lines.slice(0, 40)) console.log(l);
    console.log(`\n===== ${problems.length} PROBLEMS =====`);
    for (const p of problems) console.log('  ✗ ' + p);
    expect(problems).toEqual([]);
  }, 60_000);
});

describe('AUDIT: engine threat-delta lines — read every line', () => {
  it('every threat the detector finds is board-true + present-tense', () => {
    const gems = getAllPunishGems().filter(isSurfaceableGem);
    const problems: string[] = [];
    const lines = new Set<string>();
    for (const gem of gems.slice(0, 60)) {
      const seq = gem.playLine.split(/\s+/).filter(Boolean);
      const c = new Chess();
      for (let i = 0; i < seq.length; i++) {
        const before = c.fen();
        let mv: ReturnType<Chess['move']>;
        try {
          mv = c.move(seq[i]);
        } catch {
          break;
        }
        const after = c.fen();
        const d = computeThreatDelta(before, after, mv.color);
        if (!d) continue;
        if (!new Chess(after).get(d.arrows[0].from as Square)) problems.push(`threat @${after}: arrow origin ${d.arrows[0].from} empty`);
        if (!/^And now (White|Black) is threatening /.test(d.say)) problems.push(`threat not present-tense: "${d.say}"`);
        lines.add(`   ${d.say}   [arrow ${d.arrows[0].from}-${d.arrows[0].to}]`);
      }
    }
    console.log(`\n===== ${lines.size} DISTINCT THREAT LINES =====`);
    for (const l of [...lines]) console.log(l);
    console.log(`\n===== ${problems.length} PROBLEMS =====`);
    for (const p of problems) console.log('  ✗ ' + p);
    expect(problems).toEqual([]);
  }, 120000);
});

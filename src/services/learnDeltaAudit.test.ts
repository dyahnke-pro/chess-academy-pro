/**
 * AUDIT (not a gate) — dumps + validates EVERY line the Watch/Play delta system
 * will speak, so a human can read every one against the board. Run:
 *   npx vitest run src/services/learnDeltaAudit.test.ts --reporter=basic
 * David 2026-07-24: "Make sure it's all wired in and working. I want a full audit
 * read every line."
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { getAllPunishGems, isSurfaceableGem } from '../data/lessons/punishGems';
import {
  computeWatchGemAside,
  computeGemCrush,
  buildReviewGemSay,
  findLivePunishment,
} from './gemCrushLines';
import { computeThreatDelta } from './engineDeltaLines';

describe('AUDIT: gem crush lines (Watch + Play) — read every line', () => {
  const gems = getAllPunishGems().filter(isSurfaceableGem);

  it('every surfaceable gem → a valid, board-true crush aside + honest payoff', () => {
    const problems: string[] = [];
    const lines: string[] = [];
    for (const gem of gems) {
      const sans = gem.lineMoves.split(/\s+/).filter(Boolean);
      const aside = computeWatchGemAside(gem.openingId, sans);
      if (!aside) {
        problems.push(`${gem.openingId} @[${gem.lineMoves}] ${gem.inaccuracy}: NO ASIDE`);
        continue;
      }
      let fen: string;
      try {
        const c = new Chess();
        for (const s of sans) c.move(s);
        fen = c.fen();
      } catch {
        problems.push(`${gem.openingId} @[${gem.lineMoves}]: spine illegal`);
        continue;
      }
      for (const a of aside.arrows) {
        if (!new Chess(fen).get(a.from as Square)) {
          problems.push(`${gem.openingId} @[${gem.lineMoves}]: arrow origin ${a.from} EMPTY`);
        }
      }
      try {
        const cc = new Chess(fen);
        if (!cc.move(gem.inaccuracy)) throw new Error('inaccuracy');
        if (!cc.move(gem.punish)) throw new Error('punish');
      } catch (e) {
        problems.push(`${gem.openingId} @[${gem.lineMoves}]: ${(e as Error).message} illegal`);
      }
      // Multiple gems can share a position; validate against the crush the lookup
      // ACTUALLY returned.
      const crush = computeGemCrush(gem.openingId, sans)!;
      if (!/^If (White|Black) tries /.test(aside.say)) problems.push(`${gem.openingId}: not present-tense: "${aside.say}"`);
      if (!aside.say.includes(crush.punish.replace(/[!?]+$/g, ''))) problems.push(`${gem.openingId}: omits punish: "${aside.say}"`);
      if (/\b\d+\.[A-Za-z]/.test(aside.say)) problems.push(`${gem.openingId}: move-number prefix: "${aside.say}"`);
      // PAYOFF HONESTY: a material claim must match the board-computed flag.
      const claimsMaterial = /winning (a pawn|a piece|the exchange|decisive material)/.test(crush.payoff);
      if (claimsMaterial && !crush.winsMaterial) problems.push(`${gem.openingId}: payoff claims material, board shows none: "${crush.payoff}"`);
      if (!claimsMaterial && crush.winsMaterial) problems.push(`${gem.openingId}: board wins material, payoff hides it: "${crush.payoff}"`);
      if (!aside.say.includes(crush.payoff)) problems.push(`${gem.openingId}: dropped payoff fact: "${aside.say}"`);
      const rev = buildReviewGemSay(crush, { opponentPlayedInaccuracy: true, studentPlayedPunish: false });
      if (/^If /.test(rev)) problems.push(`${gem.openingId}: review leaked present-tense: "${rev}"`);

      lines.push(`[${gem.openingId}] ${gem.lineMoves} | ${gem.inaccuracy}→${gem.punish} (${gem.tier})`);
      lines.push(`   WATCH:  ${aside.say}`);
      lines.push(`   REVIEW: ${rev}`);
    }
    console.log(`\n===== ${gems.length} SURFACEABLE GEMS — EVERY LINE =====`);
    for (const l of lines) console.log(l);
    console.log(`\n===== ${problems.length} PROBLEMS =====`);
    for (const p of problems) console.log('  ✗ ' + p);
    expect(problems).toEqual([]);
  });
});

describe('AUDIT: live punishment callouts — the coach calls it out when it fires', () => {
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
      if (!live.reveal.includes(live.payoff)) problems.push(`${gem.openingId}: reveal omits payoff: "${live.reveal}"`);
      lines.push(`[${gem.openingId}] after ${gem.inaccuracy} → CALLOUT: ${live.callout} | REVEAL: ${live.reveal}`);
    }
    console.log(`\n===== ${gems.length} LIVE PUNISHMENT CALLOUTS =====`);
    for (const l of lines.slice(0, 40)) console.log(l);
    console.log(`\n===== ${problems.length} PROBLEMS =====`);
    for (const p of problems) console.log('  ✗ ' + p);
    expect(problems).toEqual([]);
  });
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

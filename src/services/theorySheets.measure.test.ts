// THE IDEA SHEET SCORER (rebuilt). Each written note (the voiced corpus: a
// person's own sentence about one opening position) is read for the IDEAS it
// carries — decision, plan, break, pieces — and the theory composer is asked
// what it says at the same position. An idea scores when the composer says an
// idea of that kind there. Run: THEORY_SHEETS=1 [THEORY_SHEETS_EVERY=8]
//   npx vitest run src/services/theorySheets.measure.test.ts
// "core" = notes on positions in the first 12 plies; "held-out" = every
// fourth note the tuning never read (positionKey hash), so a rule tuned on one
// board is not scored on that board. Ideas the composer does not own (structure,
// trap, move order, gambit, endgame) are reported, never scored against it.
import { describe, it, beforeAll } from 'vitest';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { __setLocalDbForTests, masterMovesCachedSync } from './masterPlayLookup';
import { mastersPlanRead } from './mastersPlanRead';
import { composeTheoryTurn, roadsFrom, type KeyMove } from './theoryComposer';

interface Note { lineSan: string[]; positionKey: string; explains: string; teaches: string; plans: string; phase: string }
type Idea = 'decision' | 'plan' | 'break' | 'pieces';
const OWN: Idea[] = ['decision', 'plan', 'break', 'pieces'];
const TAGS: Record<Idea | 'structure' | 'trap' | 'move-order' | 'gambit' | 'endgame', RegExp> = {
  decision: /\b(choice|decision|alternativ|instead|or you can|you can also|option|sideline|either)\b/i,
  plan: /\b(plan|idea is|aim|goal|going to|want to|wants to|strateg)/i,
  break: /\b(break|lever|undermin|c5|d5|f5|e5)\b.*\b(break|push|strike)|\bbreak\b|\bundermin/i,
  pieces: /\b(outpost|reroute|belongs|best square|good square|knight|bishop|rook|queen)\b.*\b(goes|go to|should|route|square|lands?)\b/i,
  structure: /\b(structure|pawn chain|isolated|backward|doubled|hanging pawns|open file|half-open)/i,
  trap: /\b(trap|blunder|falls? for|walks? into)\b/i,
  'move-order': /\b(move order|transpos|before playing)/i,
  gambit: /\b(gambit|sacrific|pawn down)/i,
  endgame: /\b(endgame|ending)\b/i,
};
const hash = (s: string): number => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

describe.runIf(!!process.env.THEORY_SHEETS && existsSync('public/data/voiced-teachings.json'))('theory idea sheets', () => {
  beforeAll(() => { __setLocalDbForTests(JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8'))); });
  it('scores the composer against the written notes', () => {
    const raw = JSON.parse(readFileSync('public/data/voiced-teachings.json', 'utf8')) as Record<string, Note[]>;
    const notes = Object.values(raw).flat().filter((n) => n.lineSan?.length && n.lineSan.length <= 24 && n.phase === 'opening');
    const every = Number(process.env.THEORY_SHEETS_EVERY ?? 8);
    const tally: Record<'core' | 'held', Record<string, { asked: number; said: number }>> = { core: {}, held: {} };
    const bump = (set: 'core' | 'held', k: string, said: boolean): void => { const t = (tally[set][k] ??= { asked: 0, said: 0 }); t.asked += 1; if (said) t.said += 1; };
    const others: Record<string, number> = {};
    notes.forEach((n, i) => {
      if (i % every !== 0) return;
      const set: 'core' | 'held' = hash(n.positionKey) % 4 === 0 ? 'held' : 'core';
      const text = `${n.explains} ${n.teaches} ${n.plans}`;
      const asked = (Object.keys(TAGS) as Array<keyof typeof TAGS>).filter((k) => TAGS[k].test(text));
      if (!asked.length) return;
      const c = new Chess();
      const history = n.lineSan.slice(0, -1);
      try { for (const s of history) c.move(s); } catch { return; }
      const fenBefore = c.fen();
      const san = n.lineSan[n.lineSan.length - 1];
      let mover; try { mover = c.turn(); c.move(san); } catch { return; }
      const fenAfter = c.fen();
      const read = mastersPlanRead(fenAfter, (f) => masterMovesCachedSync(f));
      const brk = read ? (mover === 'w' ? read.white : read.black) : null;
      const goal: KeyMove | null = brk ? { san: brk.san, piece: 'p', color: mover } : null;
      const piece = read ? (mover === 'w' ? read.whitePiece : read.blackPiece) : null;
      const turn = composeTheoryTurn({
        fen: fenBefore, san, mover, whose: 'your', roads: roadsFrom(masterMovesCachedSync(fenBefore)),
        plan: goal && brk ? { goal, goalSquare: brk.square, lead: brk.lead ?? [] } : null,
        piece: piece?.fen && piece.color ? { piece: piece.piece, to: piece.to, san: piece.san, color: piece.color, fen: piece.fen } : null,
        said: new Set(),
      });
      const says = new Set(turn.map((t) => t.kind));
      const said: Record<Idea, boolean> = { decision: says.has('decision'), plan: says.has('plan'), break: says.has('plan'), pieces: says.has('piece') };
      for (const k of asked) {
        if ((OWN as string[]).includes(k)) bump(set, k, said[k as Idea]); else others[k] = (others[k] ?? 0) + 1;
      }
    });
    const pct = (s: Record<string, { asked: number; said: number }>): { overall: number; byKind: Record<string, string> } => {
      const a = Object.values(s).reduce((x, y) => x + y.asked, 0); const b = Object.values(s).reduce((x, y) => x + y.said, 0);
      return { overall: a ? Math.round((100 * b) / a) : 0, byKind: Object.fromEntries(Object.entries(s).map(([k, v]) => [k, `${Math.round((100 * v.said) / v.asked)}% of ${v.asked}`])) };
    };
    const report = { core: pct(tally.core), heldOut: pct(tally.held), notScoredIdeaCounts: others, sampledEvery: every };
    writeFileSync('audit-reports/theory-sheets.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }, 600_000);
});

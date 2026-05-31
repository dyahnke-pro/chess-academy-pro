// Eric Rosen pro-rep lesson ARROW-ORIGIN + PROSE-CLAIM gate (2026-05-31).
//
// The existing pro-rep gates check SAN legality and hyphenated `<square>-piece`
// claims, but they do NOT verify that an arrow originates on a real piece, nor
// catch prose-form board claims ("the rook on f8" when none is there). A
// self-audit of the Eric Rosen build caught a false "rook on f8" claim plus ~80
// arrows drawn from a pawn or an empty square (move-trails). This gate locks
// those fixes in for every Eric Rosen lesson:
//   - every arrow's `from` square holds a NON-PAWN piece at the beat's position
//     (green vision arrows lead the eye from a resting piece; move/pawn squares
//      are shown by highlights — the masterclass lead-the-eye doctrine);
//   - every prose "<piece> on <square>" claim is TRUE at some frame of the beat.
// Scoped to pro-ericrosen-* (the legacy Gotham/Naroditsky builds legitimately
// use pawn-push intent arrows, per the narrationAccuracy note).

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import proRep from '../pro-repertoires.json';
import { getLessonScript, getVariationLessonScript } from './index';
import type { LessonScript } from '../../types';

const PRO = (proRep.openings as Array<{ id: string; variations?: { name: string }[] }>)
  .filter((o) => o.id.startsWith('pro-ericrosen-'));

const lessons: { label: string; l: LessonScript }[] = [];
for (const op of PRO) {
  const m = getLessonScript(op.id);
  if (m) lessons.push({ label: `${op.id} (main)`, l: m });
  for (const v of op.variations ?? []) {
    const vl = getVariationLessonScript(op.id, v.name);
    if (vl) lessons.push({ label: `${op.id} :: ${v.name}`, l: vl });
  }
}

const PIECE: Record<string, string> = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };

function boardAt(moves: string[]): Chess {
  const c = new Chess();
  for (const m of moves) c.move(m);
  return c;
}

describe('Eric Rosen lesson arrows originate on a resting non-pawn piece', () => {
  it('has no arrow from an empty square or a pawn', () => {
    const bad: string[] = [];
    for (const { label, l } of lessons) {
      for (const beat of l.beats) {
        let c: Chess;
        try { c = boardAt(beat.moves); } catch { continue; }
        for (const a of beat.arrows ?? []) {
          const pc = c.get(a.from as Parameters<Chess['get']>[0]);
          if (!pc) bad.push(`${label} [${beat.id}] arrow ${a.from}->${a.to}: empty origin`);
          else if (pc.type === 'p') bad.push(`${label} [${beat.id}] arrow ${a.from}->${a.to}: from a pawn`);
        }
      }
    }
    expect(bad, `Arrows must lead the eye from a resting non-pawn piece:\n${bad.join('\n')}`).toEqual([]);
  });

  it('every prose "<piece> on <square>" claim is true on the board', () => {
    const bad: string[] = [];
    for (const { label, l } of lessons) {
      for (const beat of l.beats) {
        const text = `${beat.say ?? ''} ${beat.sayShort ?? ''}`;
        for (const m of text.matchAll(/\b(pawn|knight|bishop|rook|queen|king)\s+on\s+([a-h][1-8])\b/gi)) {
          const want = PIECE[m[1].toLowerCase()];
          const sq = m[2];
          let ok = false;
          const c = new Chess();
          const check = (): void => { const p = c.get(sq as Parameters<Chess['get']>[0]); if (p && p.type === want) ok = true; };
          check();
          for (const mv of beat.moves) { try { c.move(mv); } catch { break; } check(); }
          if (!ok) bad.push(`${label} [${beat.id}] claims ${m[1]} on ${sq} — not on the board`);
        }
      }
    }
    expect(bad, `Prose board-claims must be true:\n${bad.join('\n')}`).toEqual([]);
  });
});

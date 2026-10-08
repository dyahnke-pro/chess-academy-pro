// Gate: a gem watch/learn line that states a material balance ("a pawn up",
// "a piece for two pawns", "level material") must match the board once the
// trades on that ply settle. The check reads the punisher's material from
// one ply before the line to three plies after it, plus the line's end, so
// a capture whose recapture is still pending is not counted against it.
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { ALL_GEMS, gemId } from './lessons/punishGems';
import { GEM_NARRATION } from './lessons/punishGemNarration';
import { GAMBIT_GEM_NARRATION } from './lessons/gambitGemNarration';

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Phrase → the punisher's material balances it may describe. First match wins. */
const CLAIMS: Array<[RegExp, number[]]> = [
  [/\b(two|both) (?:healthy )?extra pawns|two pawns (?:up|ahead|to the good)|two-pawn plus/i, [2]],
  [/piece (?:up )?for two pawns/i, [1]],
  [/piece (?:up )?for a (?:single )?pawn/i, [2]],
  [/\b(?:a|whole|clean|clear|full) piece up|piece ahead(?! of)/i, [2, 3, 4]],
  [/rook up|rook and a pawn up/i, [4, 5, 6, 7]],
  [/\bup the exchange|exchange up/i, [1, 2, 3]],
  [/\b(?:a|clean|sound|healthy) pawn (?:up|ahead|to the good)|(?:keeps?|stays?|holds?) (?:the|a|an) (?:healthy )?extra pawn/i, [1]],
  [/material (?:is |stays )?(?:level|even)|level material/i, [0]],
];

const FUTURE = /\b(?:will|would|if|once|after|later|next|threat|threaten|aims?|heading)\b/i;

export function materialFor(moves: string[], upto: number, punisherWhite: boolean): number {
  const c = new Chess();
  moves.slice(0, upto + 1).forEach((m) => c.move(m));
  let d = 0;
  for (const row of c.board()) for (const s of row) if (s) d += (s.color === 'w' ? 1 : -1) * VALUE[s.type];
  return punisherWhite ? d : -d;
}

function violations(): string[] {
  const all = { ...GEM_NARRATION, ...(GAMBIT_GEM_NARRATION as Record<string, { watch: string[]; learn?: string[] }>) };
  const out: string[] = [];
  for (const gem of ALL_GEMS) {
    const id = gemId(gem);
    const n = all[id];
    if (!n) continue;
    const ply = gem.playLine.trim().split(/\s+/);
    const punisherWhite = gem.lineMoves.trim().split(/\s+/).length % 2 === 1;
    const lines: Array<[string, number, string]> = [
      ...n.watch.map((t, i): [string, number, string] => [t, i, 'watch']),
      ...(n.learn ?? []).map((t, i): [string, number, string] => [t, i, 'learn']),
    ];
    for (const [text, i, reg] of lines) {
      const hit = CLAIMS.find(([re]) => re.test(text));
      if (!hit || FUTURE.test(text)) continue;
      const seen = new Set<number>();
      for (let j = Math.max(0, i - 1); j <= Math.min(ply.length - 1, i + 3); j++) seen.add(materialFor(ply, j, punisherWhite));
      seen.add(materialFor(ply, ply.length - 1, punisherWhite));
      if (!hit[1].some((v) => seen.has(v))) out.push(`${id} ${reg}[${i}] saw ${[...seen].join(',')} :: ${text}`);
    }
  }
  return out;
}

describe('gem material claims', () => {
  it('every stated material balance matches the board once trades settle', { timeout: 60000 }, () => {
    expect(violations()).toEqual([]);
  });
  it('the check is not vacuous: a pawn-up claim on a level board fails', () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6'];
    expect(materialFor(moves, 3, true)).toBe(0);
    const [re, allowed] = CLAIMS.find(([r]) => r.test('White is a clean pawn up'))!;
    expect(re).toBeTruthy();
    expect(allowed.includes(0)).toBe(false);
  });
});

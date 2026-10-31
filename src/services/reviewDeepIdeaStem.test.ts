// Prod Review 2026-10-31: "Watch what they're building — left alone, their
// idea goes: they play … takes … — they win a …" said three times in one game
// (V7: no reason formula more than twice). The stem rotates on how many of
// their ideas the game has told; each stem keeps a projection marker and stays
// out of the past-tenser (its line is what comes, not what was).
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';

// Every position gets a legal three-move line that swings the game for the
// side to move — so each opponent move tells an idea of its own.
vi.mock('./stockfishEngine', async () => {
  const { Chess: C } = await import('chess.js');
  const lineFor = (fen: string): string[] => {
    const c = new C(fen); const out: string[] = [];
    // A different first move on each move number, so each is its own idea
    // ("an idea is its first move").
    const seed = Number(fen.split(' ')[5] ?? '1') * 7;
    for (let k = 0; k < 3; k++) { const ms = c.moves({ verbose: true }); const m = ms[k === 0 ? seed % ms.length : 0]; if (!m) break; c.move(m); out.push(`${m.from}${m.to}${m.promotion ?? ''}`); }
    return out;
  };
  // White's view, as the engine reads it: every line is good for Black, the
  // opponent here.
  const read = (fen: string) => {
    const moves = lineFor(fen);
    return { evaluation: -400, bestMove: moves[0], topLines: [{ moves, evaluation: -400 }] };
  };
  return { stockfishEngine: { analyzePosition: vi.fn(async (fen: string) => read(fen)) } };
});

import { generateReviewNarration, type ReviewMoveInput } from './coachFeatureService';

const STEMS = [/Watch what they're building — left alone, their \w+ (?:goes:|starts with)/g, /Their next \w+, played out from here/g, /Another \w+ of theirs, if nothing stops it — it runs/g];

describe('their deep idea is not one formula said all game', () => {
  it('the stem rotates: none is said more than its share, the first is the full one, none past-tensed', async () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'Nc3', 'Nf6', 'O-O', 'O-O'];
    const c = new Chess();
    const moves: ReviewMoveInput[] = sans.map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, isCoachMove: (i + 1) % 2 === 0, classification: 'good', evaluation: -20, preMoveEval: -20, bestMove: null, fenAfter: c.fen() } as unknown as ReviewMoveInput;
    });
    const n = await generateReviewNarration({ moves, playerColor: 'white', openingName: null, result: '0-1', playerRating: 1500, coachNarration: 'full', uncapped: true });
    const text = n.segments.map((s) => s.narration ?? '').join(' ');
    const counts = STEMS.map((re) => (text.match(re) ?? []).length);
    const total = counts.reduce((a, b) => a + b, 0);
    expect(total, text).toBeGreaterThanOrEqual(3);
    expect(counts[0]).toBeGreaterThan(0);
    for (const [k, m] of counts.entries()) expect(m, `stem ${k} said ${m}× of ${total}`).toBeLessThanOrEqual(Math.ceil(total / STEMS.length));
    expect(text).not.toMatch(/played out from here: they played|it runs: they played/);
  }, 300_000);
});

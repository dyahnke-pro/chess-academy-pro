import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

// ── BOARD ACCURACY FOR HAND-REWRITTEN CORPUS LINES ──────────────────────────
// David 2026-09-12: "rewrite what you can" — then, immediately: "but you need to
// make sure the narrations match what is being shown on the board!"
//
// Some corpus lines were cut because they spoke in the REVIEW register inside a
// Watch lesson ("Black should have played the knight to f6 instead"). They carry
// real chess, so where the board supports it they are rewritten to the present
// tense instead of dropped. That rewrite is only honest if every square and
// piece it names is TRUE on the position the student is looking at — the same
// contract `narrationAccuracy` holds curated lessons to.
//
// This is not theoretical. Three counterfactuals did NOT survive board-check and
// stayed cut, the sharpest being "Black should have played h5": it is WHITE to
// move there and Black's h-pawn is already committed to h6, so h5 is available
// only as a White push. A present-tense rewrite would have named White's move on
// a board where the coach meant Black's — fluent, and wrong.
//
// Every rewrite is checked against the FEN of the very beat it sits on.

const OVERRIDES = join(__dirname, '../../scripts/corpus-sweep/manual-overrides.json');
const CORPUS = join(__dirname, '../../data/video-narration-voiced');

type Override = { id: string; was: string; text?: string; keep?: boolean; why?: string };
const { overrides } = JSON.parse(readFileSync(OVERRIDES, 'utf8')) as { overrides: Override[] };
const REWRITES = overrides.filter((o) => (o.why ?? '').startsWith('REWRITTEN'));

const PIECE: Record<string, string> = {
  knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k', pawn: 'p',
};
const SAN_PREFIX: Record<string, string> = {
  knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K',
};

/** The beat carrying this rewrite, with the FEN the student sees when it speaks. */
function beatFor(o: Override): { fen: string; spoken: string } {
  const json = JSON.parse(readFileSync(join(CORPUS, `${o.id}.json`), 'utf8')) as {
    moves: { fen: string; spoken?: string }[];
  };
  const hits = json.moves.filter((m) => m.spoken === o.text);
  expect(hits.length, `${o.id}: rewrite should appear exactly once in the corpus`).toBe(1);
  return { fen: hits[0].fen, spoken: hits[0].spoken ?? '' };
}

describe('hand-rewritten corpus lines are true on the board they are spoken over', () => {
  it('there are rewrites to check (a vacuous pass would hide a lost file)', () => {
    expect(REWRITES.length).toBeGreaterThan(0);
  });

  for (const o of REWRITES) {
    it(`${o.id}: ${(o.text ?? '').slice(0, 60)}…`, () => {
      const { fen, spoken } = beatFor(o);
      const board = new Chess(fen);

      // (a) "<piece> … on <square>" must actually be that piece on that square.
      //     The piece and its square must be ADJACENT — no other piece noun in
      //     between — or "the queens off and the bishop on g4" reads as a claim
      //     about the queen.
      const onSquare =
        /\b(knight|bishop|rook|queen|king|pawn)\b(?:(?!\b(?:knights?|bishops?|rooks?|queens?|kings?|pawns?)\b)[^.;—]){0,20}?\bon ([a-h][1-8])\b/gi;
      for (const m of spoken.matchAll(onSquare)) {
        const piece = board.get(m[2] as Parameters<Chess['get']>[0]);
        expect(piece?.type, `"${m[1]} on ${m[2]}" is not what stands there`).toBe(
          PIECE[m[1].toLowerCase()],
        );
      }

      // (b) a move offered as playable must be legal in THIS position.
      const legal = new Set(board.moves().map((s) => s.replace(/[+#]/g, '')));
      for (const m of spoken.matchAll(/\bthe (knight|bishop|rook|queen|king) to ([a-h][1-8])\b/gi)) {
        const san = `${SAN_PREFIX[m[1].toLowerCase()]}${m[2]}`;
        expect(legal.has(san), `"${san}" is offered but is not legal here`).toBe(true);
      }
    });
  }
});

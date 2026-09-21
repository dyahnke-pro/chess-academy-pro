import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
// @ts-expect-error — plain .mjs helper, no types by design
import { rewritePerspective } from '../../scripts/corpus-sweep/perspective.mjs';

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
  // The corpus is migrated to "you/your" AFTER the overrides are applied
  // (trim → overrides → perspective → build), so an override written with
  // "we/our" no longer matches the shipped text verbatim. Locate it through the
  // same migration rather than loosening the match — the board checks below
  // still run against whatever the corpus actually ships.
  const wanted = rewritePerspective(o.text ?? '');
  const hits = json.moves.filter((m) => m.spoken === o.text || m.spoken === wanted);
  expect(hits.length, `${o.id}: rewrite should appear exactly once in the corpus`).toBe(1);
  return { fen: hits[0].fen, spoken: hits[0].spoken ?? '' };
}

describe('the hand adjudication is still in force in the shipped corpus', () => {
  // A SECOND DRIFT OF THE SAME SHAPE, caught 2026-09-13 while re-examining the
  // remaining cuts. `apply-overrides.mjs` writes `text` (and, for a `keep`,
  // `was`) straight into the corpus — but both are stored in the ORIGINAL
  // we/our voice, because `was` has to match the pre-sweep tree it locates
  // against. The corpus has since been migrated to you/your, so running the
  // applier would have REVERTED six adjudicated beats and every `keep` back to
  // "we/our": exactly what regenerating voiced-matchups.json used to do to
  // 8,197 pronouns. The applier now migrates on the way in.
  //
  // This asserts the OUTCOME rather than the script: every adjudicated decision
  // is present, in the migrated voice, in the file that actually ships. It fails
  // whether the cause is a reverting applier, a hand edit to a beat someone
  // already ruled on, or a re-farm that overwrites one.
  for (const o of overrides) {
    const expected = rewritePerspective(o.keep ? o.was : (o.text ?? ''));
    it(`${o.id}: ${(o.why ?? '').slice(0, 8)}… survives in the shipped corpus`, () => {
      const json = JSON.parse(readFileSync(join(CORPUS, `${o.id}.json`), 'utf8')) as {
        moves: { spoken?: string }[];
      };
      const hits = json.moves.filter((m) => (m.spoken ?? '') === expected).length;
      expect(hits, `adjudicated text is not what ships (found ${hits} match(es))`).toBe(1);
    });
  }
});

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
      // A piece named as ABSENT is a claim about an empty square, and an empty
      // square is what makes it true: "White's d4 tries to punish the MISSING
      // knight on c6" is correct precisely because c6 has no knight. Without
      // this the checker reads absence as presence and fails a true sentence.
      const ABSENT = /\b(missing|absent|no|without (?:a|the|its)|lack of|departed|vanished|traded)\s+$/i;
      const onSquare =
        /\b(knight|bishop|rook|queen|king|pawn)\b(?:(?!\b(?:knights?|bishops?|rooks?|queens?|kings?|pawns?)\b)[^.;—]){0,20}?\bon ([a-h][1-8])\b/gi;
      for (const m of spoken.matchAll(onSquare)) {
        if (ABSENT.test(spoken.slice(Math.max(0, m.index - 24), m.index))) continue;
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

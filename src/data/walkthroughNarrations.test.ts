/**
 * Gate for src/data/walkthrough-narrations.json — the Tier-2 baked video
 * narrations (David 2026-07-30 walkthrough architecture). The bake script
 * enforces these at bake time; this test enforces them at BUILD time so a
 * hand-edited or badly-merged file can never ship:
 *   - every spine is chess.js-legal from the start position
 *   - one idea per ply, none empty
 *   - ALIGNMENT: each idea speaks about its OWN ply's move (the first
 *     Latvian bake shipped ideas shifted one ply — every board claim was
 *     true, only the own-move check catches the desync)
 *   - no attribution/medium leaks, no move-number prefixes
 *   - shortText stays in the brief register (≤18 words)
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import baked from './walkthrough-narrations.json';

interface BakedIdea { text: string; shortText?: string }
interface BakedBridge {
  mainSan: string;
  text: string;
  shortText?: string;
  textFlipped?: string;
  shortTextFlipped?: string;
}
interface BakedBranchNarration {
  label?: string;
  /** The branch line as replayed at bake time: [branchSan, ...extensions]. */
  moves?: string[];
  teaser: string;
  shortTeaser?: string;
  ideas: BakedIdea[];
}
interface BakedEntry {
  openingName: string;
  spine: string[];
  sourceVideos: string[];
  intro: string;
  outro: string;
  ideas: BakedIdea[];
  ideasFlipped?: BakedIdea[];
  bridges?: Record<string, BakedBridge>;
  branchNarrations?: Record<string, BakedBranchNarration>;
}

const NARRATIONS = (baked as { narrations: Record<string, BakedEntry> }).narrations;
const BANNED = /\b(naroditsky|danya|in this video|in the video|the streamer|chat|subscribe|this stream|speedrun)\b/i;
const MOVE_NUM = /\b\d{1,2}(\.|…|\.\.\.)(?=[NBRQKO]|[a-h][1-8x])/;

function boardClaimsOk(text: string, fen: string): boolean {
  const c = new Chess(fen);
  const code: Record<string, string> = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k', pawn: 'p' };
  // Plural + list forms ("pawns on e6 and c5") claim EVERY listed square.
  const claims: Array<{ sq: string; word: string }> = [];
  for (const m of text.matchAll(/\b(knight|bishop|rook|queen|king|pawn)s?\s+(?:(?:is|are|sits|stands|now|still)\s+)*(?:on|at)\s+([a-h][1-8])((?:\s*(?:,|and)\s*[a-h][1-8])*)\b/gi)) {
    for (const sq of [m[2], ...(m[3]?.match(/[a-h][1-8]/g) ?? [])]) claims.push({ sq, word: m[1] });
  }
  for (const m of text.matchAll(/\b([a-h][1-8])[-\s](knight|bishop|rook|queen|king|pawn)\b/gi)) {
    claims.push({ sq: m[1], word: m[2] });
  }
  for (const { sq, word } of claims) {
    const p = c.get(sq.toLowerCase() as Parameters<Chess['get']>[0]);
    if (!p || p.type !== code[word.toLowerCase()]) return false;
  }
  return true;
}

function mentionsOwnMove(text: string, san: string): boolean {
  const bare = san.replace(/[+#]/g, '');
  if (/^O-O/.test(bare)) return /\bcastl/i.test(text) || text.includes(bare);
  if (new RegExp(`\\b${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)) return true;
  const dest = /([a-h][1-8])(?:=[NBRQ])?$/.exec(bare)?.[1];
  return dest ? new RegExp(`\\b${dest}\\b`).test(text) : false;
}

const entries = Object.entries(NARRATIONS);

describe('walkthrough-narrations.json (Tier-2 baked video narrations)', () => {
  it('parses and every entry has sources', () => {
    for (const [, e] of entries) {
      expect(e.sourceVideos.length).toBeGreaterThan(0);
      expect(e.intro.trim().length).toBeGreaterThan(0);
      expect(e.outro.trim().length).toBeGreaterThan(0);
    }
  });

  it.each(entries.map(([key, e]) => [key, e] as const))(
    '%s: legal spine, one aligned idea per ply, clean registers',
    (_key, e) => {
      const c = new Chess();
      for (const san of e.spine) expect(() => c.move(san)).not.toThrow();
      expect(e.ideas).toHaveLength(e.spine.length);
      const replay = new Chess();
      const fens = e.spine.map((san) => { replay.move(san); return replay.fen(); });
      e.ideas.forEach((idea, i) => {
        const label = `${e.openingName} ply ${i + 1} (${e.spine[i]})`;
        expect(idea.text?.trim().length, `${label}: empty text`).toBeGreaterThan(0);
        expect(BANNED.test(idea.text), `${label}: attribution leak`).toBe(false);
        expect(MOVE_NUM.test(idea.text), `${label}: move-number prefix`).toBe(false);
        expect(mentionsOwnMove(idea.text, e.spine[i]), `${label}: misaligned — does not speak about its own move`).toBe(true);
        expect(boardClaimsOk(idea.text, fens[i]), `${label}: board-false piece claim`).toBe(true);
        if (idea.shortText) {
          expect(idea.shortText.trim().split(/\s+/).length, `${label}: shortText over 18 words`).toBeLessThanOrEqual(18);
        }
      });
      // The FLIPPED register (board-orientation pronouns) rides the same
      // rails as the primary — a bad hand-merge must not ship half-gated.
      if (e.ideasFlipped) {
        expect(e.ideasFlipped, `${e.openingName}: ideasFlipped length mismatch`).toHaveLength(e.spine.length);
        e.ideasFlipped.forEach((idea, i) => {
          const label = `${e.openingName} flip ply ${i + 1} (${e.spine[i]})`;
          expect(idea.text?.trim().length, `${label}: empty text`).toBeGreaterThan(0);
          expect(BANNED.test(idea.text), `${label}: attribution leak`).toBe(false);
          expect(MOVE_NUM.test(idea.text), `${label}: move-number prefix`).toBe(false);
          expect(mentionsOwnMove(idea.text, e.spine[i]), `${label}: misaligned`).toBe(true);
          expect(boardClaimsOk(idea.text, fens[i]), `${label}: board-false piece claim`).toBe(true);
        });
      }
    },
  );

  // COMPARATIVE BRIDGES (David 2026-07-31): spoken at the spine-terminus
  // fork to a returning student. Both SANs must be real legal moves at the
  // fork position, the prose must name both (the comparison anchor), and
  // every board claim must be true at the divergence FEN.
  const bridged = entries.filter(([, e]) => e.bridges && Object.keys(e.bridges).length > 0);
  it.each(bridged.map(([key, e]) => [key, e] as const))(
    '%s: bridges are legal, anchored, and board-true at the fork',
    (_key, e) => {
      const replay = new Chess();
      for (const san of e.spine) replay.move(san);
      const terminusFen = replay.fen();
      const legalHere = new Set(new Chess(terminusFen).moves());
      for (const [san, b] of Object.entries(e.bridges ?? {})) {
        const label = `${e.openingName} bridge ${san}`;
        expect(legalHere.has(san), `${label}: sideline SAN illegal at the fork`).toBe(true);
        expect(legalHere.has(b.mainSan), `${label}: mainSan ${b.mainSan} illegal at the fork`).toBe(true);
        expect(b.mainSan, `${label}: mainSan equals the sideline`).not.toBe(san);
        for (const [reg, text] of [['text', b.text], ['textFlipped', b.textFlipped]] as const) {
          if (!text) continue;
          const rl = `${label} ${reg}`;
          expect(text.trim().length, `${rl}: empty`).toBeGreaterThan(0);
          expect(BANNED.test(text), `${rl}: attribution leak`).toBe(false);
          expect(MOVE_NUM.test(text), `${rl}: move-number prefix`).toBe(false);
          expect(mentionsOwnMove(text, san), `${rl}: never names the sideline move`).toBe(true);
          expect(mentionsOwnMove(text, b.mainSan), `${rl}: never names the main move`).toBe(true);
          expect(boardClaimsOk(text, terminusFen), `${rl}: board-false piece claim at the fork`).toBe(true);
        }
        for (const short of [b.shortText, b.shortTextFlipped]) {
          if (short) expect(short.trim().split(/\s+/).length, `${label}: short register over 18 words`).toBeLessThanOrEqual(18);
        }
        if (b.textFlipped) {
          expect(b.textFlipped.trim(), `${label}: textFlipped identical to primary — not actually flipped`).not.toBe(b.text.trim());
        }
      }
    },
  );

  // BRANCH NARRATIONS (Tier 2 covers the whole tree): each branch line must
  // be legal from the spine terminus, each idea aligned to its own ply with
  // board-true claims, short registers capped.
  const branched = entries.filter(([, e]) => e.branchNarrations && Object.keys(e.branchNarrations).length > 0);
  it.each(branched.map(([key, e]) => [key, e] as const))(
    '%s: branch narrations are legal, aligned, and board-true',
    (_key, e) => {
      const base = new Chess();
      for (const san of e.spine) base.move(san);
      const terminusFen = base.fen();
      for (const [san, bn] of Object.entries(e.branchNarrations ?? {})) {
        const label = `${e.openingName} branch ${san}`;
        const replay = new Chess(terminusFen);
        expect(() => replay.move(san), `${label}: branch SAN illegal at the spine terminus`).not.toThrow();
        expect(bn.teaser.trim().length, `${label}: empty teaser`).toBeGreaterThan(0);
        expect(BANNED.test(bn.teaser), `${label}: teaser attribution leak`).toBe(false);
        expect(MOVE_NUM.test(bn.teaser), `${label}: teaser move-number prefix`).toBe(false);
        expect(mentionsOwnMove(bn.teaser, san), `${label}: teaser never names its own move`).toBe(true);
        expect(boardClaimsOk(bn.teaser, replay.fen()), `${label}: teaser board-false claim`).toBe(true);
        // With the persisted branch line, verify legality + alignment +
        // board claims per idea ply (idea i narrates moves[i+1]).
        const line = bn.moves ?? [];
        if (line.length > 0) {
          expect(line[0], `${label}: moves[0] must be the branch SAN`).toBe(san);
          expect(bn.ideas.length, `${label}: ideas/moves length mismatch`).toBe(line.length - 1);
        }
        bn.ideas.forEach((idea, i) => {
          const il = `${label} idea ${i + 1}`;
          expect(idea.text?.trim().length, `${il}: empty`).toBeGreaterThan(0);
          expect(BANNED.test(idea.text), `${il}: attribution leak`).toBe(false);
          expect(MOVE_NUM.test(idea.text), `${il}: move-number prefix`).toBe(false);
          if (line.length > 0) {
            const c = new Chess(terminusFen);
            for (let k = 0; k <= i + 1; k += 1) {
              expect(() => c.move(line[k]), `${il}: illegal move ${line[k]}`).not.toThrow();
            }
            expect(mentionsOwnMove(idea.text, line[i + 1]), `${il}: misaligned — does not speak about ${line[i + 1]}`).toBe(true);
            expect(boardClaimsOk(idea.text, c.fen()), `${il}: board-false claim`).toBe(true);
          }
          if (idea.shortText) {
            expect(idea.shortText.trim().split(/\s+/).length, `${il}: shortText over 18 words`).toBeLessThanOrEqual(18);
          }
        });
      }
    },
  );
});

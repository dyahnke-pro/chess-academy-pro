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
interface BakedEntry {
  openingName: string;
  spine: string[];
  sourceVideos: string[];
  intro: string;
  outro: string;
  ideas: BakedIdea[];
}

const NARRATIONS = (baked as { narrations: Record<string, BakedEntry> }).narrations;
const BANNED = /\b(naroditsky|danya|in this video|in the video|the streamer|chat|subscribe|this stream|speedrun)\b/i;
const MOVE_NUM = /\b\d{1,2}(\.|…|\.\.\.)(?=[NBRQKO]|[a-h][1-8x])/;

function boardClaimsOk(text: string, fen: string): boolean {
  const c = new Chess(fen);
  const code: Record<string, string> = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k', pawn: 'p' };
  const claims = [
    ...text.matchAll(/\b(knight|bishop|rook|queen|king|pawn)\s+on\s+([a-h][1-8])\b/gi),
    ...text.matchAll(/\b([a-h][1-8])[-\s](knight|bishop|rook|queen|king|pawn)\b/gi),
  ];
  for (const m of claims) {
    const rev = /^[a-h][1-8]$/.test(m[1]);
    const sq = (rev ? m[1] : m[2]).toLowerCase();
    const word = (rev ? m[2] : m[1]).toLowerCase();
    const p = c.get(sq as Parameters<Chess['get']>[0]);
    if (!p || p.type !== code[word]) return false;
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
    },
  );
});

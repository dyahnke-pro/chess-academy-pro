// Review teaches a blunder from COMPUTED signals, and does NOT voice a floating
// tactic-pattern note (David 2026-08-26 fencing: "no floating notes in the play
// surfaces — make them stay where they belong"; review is a play surface, so a
// geometry-free `spokenTacticNote` belongs on the tactics drill, not here). This
// file used to assert the OPPOSITE — that review spliced a floating tactic note —
// and went stale when the fencing removed that path from `buildReviewSegments`
// (coachFeatureService line 10). Rewritten 2026-08-27 to the current contract:
// review still TEACHES the moment (via detectTactics / threat computers), it just
// no longer borrows a floating note to do it.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegments } from './coachFeatureService';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import { detectTactics } from './tacticsDetector';
import { spokenTacticNote } from './danyaTeachingService';

// Legal's Mate: Black grabs the queen with …Bxd1 and walks into the mating net.
const GAME = ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1', 'Bxf7', 'Ke7', 'Nd5'];
const BLUNDER_AT = 9;

const segmentsFor = (): ReturnType<typeof buildReviewSegments> => {
  const c = new Chess();
  const moves = GAME.map((san, i) => {
    const before = c.fen();
    c.move(san);
    return {
      san,
      fen: c.fen(),
      fenBefore: before,
      ply: i,
      moveNumber: Math.floor(i / 2) + 1,
      classification: (i === BLUNDER_AT ? 'blunder' : null),
      isCoachMove: i % 2 === 0,   // Black is the student here
      bestMove: i === BLUNDER_AT ? 'Nf6' : undefined,
      evalBefore: 0,
      evalAfter: 0,
    };
  });
  return buildReviewSegments(moves as never, 'black', 'Philidor Defense');
};

describe('review teaches a blunder from computed signals (no floating note)', () => {
  // 60s: the corpus is a large JSON parse that runs past vitest's 10s hook
  // default whenever anything else is loading.
  beforeAll(() => { loadFullCorpus(); loadSpokenBake(); }, 60000);

  it('teaches the blunder — the narration names the tactic that punished it', () => {
    const spoken = segmentsFor().map((s) => s.narration ?? '').join(' ');
    // The review must SAY something instructive at the blunder — the computed
    // threat/tactic read (fork / threatens / the punishing move), not silence.
    expect(spoken).toMatch(/fork|threat|blunder|mate|Nxf7|Nd5/i);
    expect(spoken.length).toBeGreaterThan(40);
  });

  it('does NOT voice a floating tactic-pattern note in review (fenced to the drill)', () => {
    // Compute the floating note the OLD path would have spliced; assert its text
    // is ABSENT from what review speaks — the fencing holds.
    const c = new Chess();
    for (const san of GAME.slice(0, BLUNDER_AT)) c.move(san);
    const types = detectTactics(c.fen()).tactics.map((t) => t.type).filter((t) => t !== 'none');
    const floating = spokenTacticNote({ types, phase: 'middlegame' });
    if (!floating) return; // nothing to leak
    const spoken = segmentsFor().map((s) => s.narration ?? '').join(' ');
    expect(spoken).not.toContain(floating.text);
  });

  it('never repeats the same teaching sentence — a lesson repeated is a lesson ignored', () => {
    const withNote = segmentsFor().filter((s) => (s.narration ?? '').length > 0);
    const tails = withNote
      .map((s) => (s.narration ?? '').split(/(?<=[.!?])\s+/).pop() ?? '')
      .filter((t) => t.length > 40);
    expect(new Set(tails).size).toBe(tails.length);
  });
});

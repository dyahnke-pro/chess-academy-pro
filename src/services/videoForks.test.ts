// THE FORKS ARE THE "OTHER LINES" CONTENT, AND THEY MUST NAME ONLY REAL MOVES.
//
// David 2026-08-17: the options are the moves that APPEARED ON SCREEN, which is
// why they may be put in front of a student when a generated list may not. That
// only holds while every named move is legal on the board being described — so
// it is checked here rather than assumed.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { ALL_VIDEO_FORKS, forkAt, forkSentence } from './videoForks';

describe('video forks', () => {
  it('carries forks at all', () => {
    expect(ALL_VIDEO_FORKS.length).toBeGreaterThan(0);
  });

  it('every option is legal at its own fork position', () => {
    const bad: string[] = [];
    for (const f of ALL_VIDEO_FORKS) {
      for (const o of f.options) {
        const c = new Chess(f.fen);
        let ok = false;
        try { ok = !!c.move(o.san); } catch { ok = false; }
        if (!ok) bad.push(`${f.source} @ ${f.fen}: ${o.san}`);
      }
    }
    expect(bad, `illegal fork options:\n${bad.slice(0, 10).join('\n')}`).toEqual([]);
  });

  it('every fork offers a real choice, never one option', () => {
    const thin = ALL_VIDEO_FORKS.filter((f) => f.options.length < 2).map((f) => f.source);
    expect(thin, 'a single option is the move the lesson played, not a fork').toEqual([]);
  });

  it('is found by position and names its alternatives', () => {
    const f = ALL_VIDEO_FORKS[0];
    expect(forkAt(f.fen)?.fen).toBe(f.fen);
    const sentence = forkSentence(f.fen);
    expect(sentence, 'a fork with legal options produced no sentence').toBeTruthy();
    expect(sentence).toMatch(/other try|other tries/);
  });

  it('leaves out the move the lesson goes on to play', () => {
    const f = ALL_VIDEO_FORKS.find((x) => x.options.length >= 2);
    expect(f).toBeTruthy();
    const played = f!.options[0].san;
    const sentence = forkSentence(f!.fen, played) ?? '';
    // The student is about to see that move; calling it an alternative confuses.
    expect(sentence).not.toContain(played);
  });

  it('says nothing at a position no lesson forked at', () => {
    expect(forkSentence(new Chess().fen())).toBeNull();
  });
});

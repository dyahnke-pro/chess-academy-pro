/**
 * A WAVE SPEAKS WHOLE LINES (OS-11 #7, 2026-10-20). On g1 7.O-O and g2 7…Be6
 * the phase wave said only "One move stops it before it lands." — the
 * package had dropped the sentence naming the move (already said this turn)
 * and kept the tail that points back at it, and that orphan force-cut a
 * 50-word line after 0.18 s. A tail whose referent was dropped goes with it;
 * and the phase wave queues on the page's one speech chain.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildVoicePackage, type VoiceFact } from './voicePackage';
import { findProphylaxis, prophylaxisIdea } from './prophylaxis';

/** David's Smith-Morra after 7.O-O Bg7 — White to move. */
const MOVE8 = 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8';

describe('a dropped sentence takes the tail that points back at it', () => {
  it('7.O-O: "Watch Bg4…" already said this turn — "One move stops it before it lands." is not said alone', () => {
    const ph = findProphylaxis(MOVE8);
    expect(ph).not.toBeNull();
    const idea = prophylaxisIdea(ph!).text;
    const [head] = idea.split(/(?<=\.)\s+/);
    const pkg = buildVoicePackage([{ kind: 'computed', text: idea, fen: MOVE8 } as VoiceFact], head);
    expect(pkg.spoken).not.toMatch(/One move stops it/);
    expect(pkg.spoken).toBe('');
  });

  it('7.O-O: "Look ahead — …" already said — "Spot it before it lands." is not said alone', () => {
    const line = 'Look ahead — a discovery is two moves away: their bishop on g7 opens on your knight on c3. Spot it before it lands.';
    const pkg = buildVoicePackage([{ kind: 'computed', text: line, fen: MOVE8 } as VoiceFact], line.split(/(?<=\.)\s+/)[0]);
    expect(pkg.spoken).toBe('');
  });

  it('a new sentence that stands alone still speaks after a dropped one', () => {
    const said = 'Their bishop on g7 eyes your knight on c3.';
    const pkg = buildVoicePackage([{ kind: 'computed', text: `${said} Your rook on f1 is ready for the f-file.`, fen: MOVE8 } as VoiceFact], said);
    expect(pkg.spoken).toBe('Your rook on f1 is ready for the f-file.');
  });
});

describe('the phase wave never force-cuts the line playing', () => {
  it('its package is spoken on the page speech chain, not straight to the voice', () => {
    const code = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    const start = code.indexOf('speakFacts: async (facts, fen) => {');
    const end = code.indexOf('onReport:', start);
    const door = code.slice(start, end);
    expect(door).toMatch(/speechChainRef\.current\s*\.then\(\(\) => \([^)]*\) \? voiceService\.speakPackage\(d\.pkg\)/);
    expect(door).not.toMatch(/await voiceService\.speakPackage\(/);
  });
});

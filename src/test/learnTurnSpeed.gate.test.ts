// LEARN'S TURN SPEED (David 2026-11-21: "remove the pause before coach speaks",
// "one read per board", "2 waves … with a 0.5 second pause").
//
// Measured on his iPhone web app the same day: every turn read the board after
// his move at depth 12 (the eval bar, the ponder) beside the turn's own depth
// 14, so a shallow read that started first was thrown away and the turn read
// the board again from scratch; the coach's reply waited a random 1–2 s pad;
// and the phase line spoke as a third line of its own.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { COACH_TURN_DEPTH } from '../services/engineConstants';

const PAGE = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
const PONDER = readFileSync('src/hooks/useEnginePonder.ts', 'utf8');

describe('one read per live board', () => {
  it('the eval bar reads the board at the turn depth', () => {
    expect(PAGE).toMatch(/stockfishEngine\.analyzePosition\(fen, COACH_TURN_DEPTH, undefined, 'brain', \{ signal: leftBoard\.signal \}\)/);
    expect(PAGE).not.toMatch(/analyzePosition\(fen, 12, undefined, 'brain', \{ signal: leftBoard\.signal \}\)/);
  });
  it('the ponder reads the board at the turn depth', () => {
    expect(PONDER).toMatch(/const PONDER_DEPTH = COACH_TURN_DEPTH;/);
    expect(COACH_TURN_DEPTH).toBe(14);
  });
});

describe('no think pad before the coach replies', () => {
  it('Learn never pads the reply', () => {
    expect(PAGE).not.toMatch(/minThink/);
  });
});

describe('the second wave is one wave', () => {
  it('a phase line of the same turn follows the late line after 0.5 s', () => {
    expect(PAGE).toMatch(/export const PHASE_AFTER_LATE_PAUSE_MS = 500;/);
    expect(PAGE).toMatch(/\.then\(\(\) => \(afterTurnLine \? new Promise<void>\(\(r\) => \{ setTimeout\(r, PHASE_AFTER_LATE_PAUSE_MS\); \}\) : undefined\)\)\n\s*\.then\(\(\) => \(samePosition\(liveFenRef\.current \?\? '', turnBoard\) && learnVoiceAllows\('door'\) \? voiceService\.speakPackage\(d\.pkg\)/);
  });
});

describe('every other reader of the live boards reads at the turn depth', () => {
  const ENGINE = readFileSync('src/services/coachGameEngine.ts', 'utf8');
  const PHASE = readFileSync('src/hooks/usePhaseNarration.ts', 'utf8');
  it('the coach move: the best-move read and the steer check', () => {
    expect(ENGINE).toMatch(/engine\.analyzePosition\(fen, COACH_TURN_DEPTH, undefined, BAND_BUDGET_MS\)/);
    expect(ENGINE).toMatch(/const STEER_VERIFY_DEPTH = COACH_TURN_DEPTH;/);
  });
  it('the phase read', () => {
    expect(PHASE).toMatch(/const STOCKFISH_DEPTH = COACH_TURN_DEPTH;/);
  });
});

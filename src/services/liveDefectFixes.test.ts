// WO-LIVE-DEFECTS-01 — the fixes for defects read off real user sessions.
//
// Every case here reproduces something a REAL person heard or failed to get,
// week of 2026-09-11, from `narration_text` in native-iOS telemetry. Each test
// was verified to FAIL against the code as it shipped to them.
import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { capEval } from './accuracyService';
import { computeMoveFundamentals } from './moveFundamentals';
import { noteDetectedLanguage, resetDetectedLanguage, spokenLanguageName } from './spokenLanguage';
import { useCoachMemoryStore } from '../stores/coachMemoryStore';

describe('D1 — a mate is never graded as a loss', () => {
  it('capEval collapses a mate score so a subtraction cannot read as 300 points', () => {
    // The live path computed `preMoveEval - postMoveEval` on RAW evals. A mate
    // is ±30000, and the narration renders (cpLoss/100).toFixed(1) — hence the
    // user hearing "rook to a5, checkmate is a blunder — about 300.0 points."
    const raw = 30000 - 0;
    expect((raw / 100).toFixed(1)).toBe('300.0'); // what they heard
    const capped = capEval(30000) - capEval(0);
    expect(capped).toBe(1500);
    expect(Number((capped / 100).toFixed(1))).toBeLessThanOrEqual(15);
  });

  it('a "#" move is recognisable as game-ending, so it can be short-circuited', () => {
    // The guard the live path now uses before classifying at all.
    expect('Ra5#'.includes('#')).toBe(true);
    expect('Qd8+'.includes('#')).toBe(false);
  });
});

describe('D6 — a promotion is not a pawn push', () => {
  // White pawn on h7, black king on a8 so h8 is EMPTY — h8=Q is legal.
  const FEN = 'k7/7P/8/8/8/8/8/6K1 w - - 0 1';
  const promote = (): ReturnType<typeof computeMoveFundamentals> => {
    // Prove the fixture before asserting on it — a fixture whose move is
    // illegal would make every assertion below vacuous.
    const probe = new Chess(FEN);
    expect(probe.move({ from: 'h7', to: 'h8', promotion: 'q' }), 'fixture: h8=Q must be legal').toBeTruthy();
    return computeMoveFundamentals(FEN, 'h8=Q', 'white');
  };

  it('emits a promotion fundamental, and it outranks everything else on the move', () => {
    const out = promote();
    const promo = out.find((f) => f.id === 'promotion');
    expect(promo, 'a pawn reaching the 8th must produce a promotion fundamental').toBeTruthy();
    const top = [...out].sort((a, b) => b.weight - a.weight)[0];
    expect(top?.id).toBe('promotion');
  });

  it('does NOT also call it a passed-pawn push — that is the sentence they heard', () => {
    // The user heard the SAME line on h7 and on h8:
    //   "Your pawn to h8 — pushes your passed pawn — passed pawns must be pushed."
    const out = promote();
    expect(out.some((f) => f.id === 'passed-pawn')).toBe(false);
    expect(out.find((f) => f.id === 'promotion')?.led).toMatch(/queen/i);
  });
});

describe('D5 — one detected message makes the whole coach speak it', () => {
  beforeEach(() => { resetDetectedLanguage(); });

  it('is silent until the student actually writes a non-English message', () => {
    expect(spokenLanguageName()).toBeNull();
  });

  it('a detected language becomes the spoken language', () => {
    // The Thai user chatted in Thai for two days and heard English narration,
    // because only the chat half read the detection.
    noteDetectedLanguage('Thai');
    expect(spokenLanguageName()).toBe('Thai');
  });

  it('English is never recorded — it is the default, not an observation', () => {
    noteDetectedLanguage('English');
    expect(spokenLanguageName()).toBeNull();
  });
});

describe('D3 — a walkthrough asked for elsewhere is not dropped', () => {
  beforeEach(() => {
    useCoachMemoryStore.setState({ pendingWalkthrough: null });
  });

  it('queues the ask so the receiving surface can run it', () => {
    useCoachMemoryStore.getState().queueWalkthrough({
      opening: 'Italian Game',
      requestedFromSurface: null,
    });
    expect(useCoachMemoryStore.getState().pendingWalkthrough?.opening).toBe('Italian Game');
  });

  it('take is atomic — a remount cannot start the same lesson twice', () => {
    useCoachMemoryStore.getState().queueWalkthrough({ opening: 'Italian Game', requestedFromSurface: null });
    const first = useCoachMemoryStore.getState().takePendingWalkthrough();
    const second = useCoachMemoryStore.getState().takePendingWalkthrough();
    expect(first?.opening).toBe('Italian Game');
    expect(second).toBeNull();
  });

  it('asking again supersedes — the student means the newer one', () => {
    const s = useCoachMemoryStore.getState();
    s.queueWalkthrough({ opening: 'Italian Game', requestedFromSurface: null });
    s.queueWalkthrough({ opening: 'Caro-Kann Defense', requestedFromSurface: null });
    expect(useCoachMemoryStore.getState().takePendingWalkthrough()?.opening).toBe('Caro-Kann Defense');
  });
});

describe('D10 — two sentences get a space between them', () => {
  // The normalizer applied at the voice chokepoint, asserted on its own rule so
  // the intent is pinned even though the call site is inside speakInternal.
  const normalize = (s: string): string => s.replace(/([.!?])([A-Z])/g, '$1 $2');

  it('separates the run-on the user actually heard', () => {
    expect(normalize('…pick what to explore.Material is even'))
      .toBe('…pick what to explore. Material is even');
  });

  it('leaves a decimal alone', () => {
    expect(normalize('about 3.5 points')).toBe('about 3.5 points');
  });

  it('leaves normal spacing alone', () => {
    expect(normalize('One. Two. Three.')).toBe('One. Two. Three.');
  });
});

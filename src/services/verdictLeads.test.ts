// ON A MISTAKE TURN THE VERDICT SPEAKS FIRST (OS-18; Smith-Morra replay
// 2026-10-20, move 14: the verdict was heard 10 s after it was built, queued
// behind the instant threat line).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { instantWaitsForVerdict } from './coachDecider';

// White to move; Black's rook on e8 has mate on e1 if White passes.
const MATE_THREAT = 'k3r3/8/8/8/8/8/5PPP/6K1 w - - 0 1';
const QUIET = 'k7/8/8/8/8/8/5PPP/6K1 w - - 0 1';
const base = { verdictUrgent: true, fenAfterReply: QUIET, student: 'w' as const, mateTurn: false };

describe('the instant line waits for the verdict on a mistake turn', () => {
  it('a priced mistake holds the instant line; a fine move does not', () => {
    expect(instantWaitsForVerdict({ ...base, moveCostCp: 185 })).toBe(true);
    expect(instantWaitsForVerdict({ ...base, moveCostCp: 30 })).toBe(false);
  });
  it('an unpriced move holds only when it may have cost something', () => {
    expect(instantWaitsForVerdict({ ...base, moveCostCp: null })).toBe(true);
    expect(instantWaitsForVerdict({ ...base, moveCostCp: null, verdictUrgent: false })).toBe(false);
  });
  it('a mate goes first: a mate threat on the board, or a forced mate leading the wave', () => {
    expect(instantWaitsForVerdict({ ...base, moveCostCp: 185, fenAfterReply: MATE_THREAT })).toBe(false);
    expect(instantWaitsForVerdict({ ...base, moveCostCp: 185, mateTurn: true })).toBe(false);
  });
  it('a mate in one for the student goes first', () => {
    // White to move: Rh8 is mate (the king on b6 takes a7, b7 and b8's escape).
    expect(instantWaitsForVerdict({ ...base, moveCostCp: 185, fenAfterReply: 'k7/8/1K6/8/8/8/8/7R w - - 0 1' })).toBe(false);
  });
  it('on a turn whose verdict leads, Learn builds the instant wave once the verdict is playing (14.Rd5: the wave cost the verdict ~0.9 s)', () => {
    const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(page).toMatch(/const verdictLeads = \(\(\): boolean => \{[\s\S]{0,600}?instantWaitsForVerdict\(/);
    expect(page).toMatch(/verdictHeard\.then\(\(\) => voiceService\.untilOnAir\(VERDICT_HOLD_MS\)\),[^\n]*\n[^\n]*VERDICT_HOLD_MS[^\n]*\n\s*\]\)\.then\(runInstantWave\);\n\s*\} else runInstantWave\(\);/);
    // …and only for a mistake or worse: an inaccuracy may stay quiet.
    expect(page).toMatch(/return pricedAs !== 'inaccuracy' && instantWaitsForVerdict\(/);
    // …and a wave built after the verdict does not replace the verdict's lead.
    expect(page).toMatch(/if \(!verdictLed\) turnLeadRef\.current = instant\.lead/);
  });
  it('Learn holds the instant line on the verdict, and releases it when the verdict is handed over', () => {
    const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(page).toMatch(/if \(instantWaits\) void Promise\.race\(\[verdictHeard, [^\n]*VERDICT_HOLD_MS[^\n]*\.then\(sayInstant\)/);
    expect(page).toMatch(/speakLateWave\(p, verdictLines\);\n\s*\}\n\s*\}\n\s*\}\n\s*verdictHandedOver\(\);/);
    expect(page).toMatch(/void verdictPass\.finally\(verdictHandedOver\)/);
    // …and a pass that finds no verdict lets the held line go at once.
    expect(page).toMatch(/if \(look \|\| fundamental\) mistakeCalledThisTurn = true;\n(?:\s*\/\/[^\n]*\n)*\s*else verdictHandedOver\(\);/);
  });
});

describe('the reply waits for the reason for at most the ceiling, counted from the move (14.Rd5: 4.9 s)', () => {
  it('a reason that never comes holds the reply to the ceiling, not pad + ceiling', async () => {
    const { vi } = await import('vitest');
    const { replyWait } = await import('./foregroundActivity');
    vi.useFakeTimers();
    try {
      let landed = -1;
      const t0 = Date.now();
      void replyWait({ startedAt: t0, minThinkMs: 2000, reason: new Promise(() => {}), ceilingMs: 2500 }).then(() => { landed = Date.now() - t0; });
      await vi.advanceTimersByTimeAsync(2499);
      expect(landed).toBe(-1);
      await vi.advanceTimersByTimeAsync(1);
      expect(landed).toBe(2500);
    } finally {
      vi.useRealTimers();
    }
  });
  it('a quick reason still keeps the think pad', async () => {
    const { vi } = await import('vitest');
    const { replyWait } = await import('./foregroundActivity');
    vi.useFakeTimers();
    try {
      let landed = -1;
      const t0 = Date.now();
      void replyWait({ startedAt: t0, minThinkMs: 1500, reason: Promise.resolve(), ceilingMs: 2500 }).then(() => { landed = Date.now() - t0; });
      await vi.advanceTimersByTimeAsync(1500);
      expect(landed).toBe(1500);
    } finally {
      vi.useRealTimers();
    }
  });
  it('Learn\'s reply waits through replyWait', () => {
    const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(page).toMatch(/const padDone = replyWait\(\{ startedAt: thinkStart, minThinkMs: minThink, reason: reasonWarm, ceilingMs: reasonWaitMs \}\);/);
  });
});

describe('the next board is read once the verdict is on the air (14.Rd5: handed over +4.7 s, heard +9.2 s)', () => {
  const settle = async (p: Promise<void>): Promise<() => boolean> => {
    let done = false;
    void p.then(() => { done = true; });
    return () => done;
  };
  const deferred = <T,>(): { p: Promise<T>; go: (v: T) => void } => {
    let go!: (v: T) => void;
    const p = new Promise<T>((r) => { go = r; });
    return { p, go };
  };

  it('a move that cannot be a mistake reads the next board at once', async () => {
    const { vi } = await import('vitest');
    const { nextBoardGate } = await import('./foregroundActivity');
    vi.useFakeTimers();
    try {
      const done = await settle(nextBoardGate({ bar: 100, verdictUrgent: false, price: new Promise(() => {}), linesHeard: new Promise(() => {}), untilOnAir: () => new Promise(() => {}) }));
      await vi.advanceTimersByTimeAsync(0);
      expect(done()).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it('a price under the bar lets the reads go; a costly one holds them until the verdict is playing', async () => {
    const { vi } = await import('vitest');
    const { nextBoardGate } = await import('./foregroundActivity');
    vi.useFakeTimers();
    try {
      const cheap = deferred<number | null>();
      const cheapDone = await settle(nextBoardGate({ bar: 100, verdictUrgent: true, price: cheap.p, linesHeard: new Promise(() => {}), untilOnAir: () => new Promise(() => {}) }));
      cheap.go(30);
      await vi.advanceTimersByTimeAsync(0);
      expect(cheapDone()).toBe(true);

      const heard = deferred<undefined>();
      const onAir = deferred<undefined>();
      let askedOnAir = false;
      const costlyDone = await settle(nextBoardGate({
        bar: 100, verdictUrgent: true, price: Promise.resolve(185), linesHeard: heard.p.then(() => undefined),
        untilOnAir: () => { askedOnAir = true; return onAir.p.then(() => undefined); },
      }));
      await vi.advanceTimersByTimeAsync(2000);
      expect(costlyDone()).toBe(false);   // the verdict is still being built
      heard.go(undefined);
      await vi.advanceTimersByTimeAsync(0);
      expect(askedOnAir).toBe(true);
      expect(costlyDone()).toBe(false);   // handed over, not yet heard
      onAir.go(undefined);
      await vi.advanceTimersByTimeAsync(0);
      expect(costlyDone()).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it('a stalled verdict never holds the next board past the hold', async () => {
    const { vi } = await import('vitest');
    const { nextBoardGate, NEXT_BOARD_HOLD_MS } = await import('./foregroundActivity');
    vi.useFakeTimers();
    try {
      const done = await settle(nextBoardGate({ bar: 100, verdictUrgent: true, price: Promise.resolve(null), linesHeard: new Promise(() => {}), untilOnAir: () => new Promise(() => {}) }));
      await vi.advanceTimersByTimeAsync(NEXT_BOARD_HOLD_MS - 1);
      expect(done()).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(done()).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it('Learn reads the next board through the gate, after the read is stored', () => {
    const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(page).toMatch(/const nextBoardReads = nextBoardGate\(\{ verdictUrgent, price: priceRead\.then\(\(p\) => p\?\.costCp \?\? null\), bar: VERDICT_TURN_CP, linesHeard: Promise\.all\(\[verdictHeard, instantHeard\]\)\.then\(\(\) => undefined\), untilOnAir: \(ms\) => voiceService\.untilOnAir\(ms\) \}\);\n\s*const factsReady = /);
    // Every way out of the instant wave hands its line over (or none).
    expect(page).toMatch(/const sayInstant = \(\): void => \{ speakTrackA\(lines\.join\(' '\), instantMarks\); instantHandedOver\(\); \};/);
    expect(page).toMatch(/\} else instantHandedOver\(\);\n\s*\} catch \{ instantHandedOver\(\);/);
    expect(page).toMatch(/studentBestReadRef\.current = studentBest\n[^\n]*\n[^\n]*\n\s*await nextBoardReads;/);
  });
});

describe('a costly move\'s verdict is heard before last turn\'s owed answer (OS-11 g1 8.Bxf7+: verdict at +16.7 s behind a 39-word recap)', () => {
  it('the turn\'s first line, when it is the verdict, goes on the chain before the owed answer', () => {
    const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    // The owed answer is held back when the first line is the verdict…
    expect(page).toMatch(/if \(owedSaid && opts\?\.verdict\) owedAfter = owedSaid;\n\s*else if \(owedSaid\) speechChainRef\.current = speakComputed\(owedSaid/);
    // …queued after the line, and dropped if the turn was superseded.
    expect(page).toMatch(/if \(owedAfter\) \{\n\s*speechChainRef\.current = speechChainRef\.current\n\s*\.then\(\(\) => \(trackAGenRef\.current === myTrackAGen \? speakComputed\(owedAfter/);
    // The wave says whether it leads with the verdict: a 'but' beat.
    expect(page).toMatch(/speakTrackA\(hintPkg\.spoken, [^\n]*, \{ verdict: !!lateDecision\.lead && DNA_BEAT\[lateDecision\.lead\.lane\] === 'but' \}\);/);
  });
});

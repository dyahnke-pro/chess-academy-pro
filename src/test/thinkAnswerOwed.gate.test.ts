// A THINK-PAUSE QUESTION IS NEVER LEFT HANGING (Learn audit 2026-10-15: "How do
// you find a plan? Ask three things…" was spoken, the student moved during the
// pause, and the answer — the plan itself — was never heard). The answer is
// owed when the question is spoken, cleared when it is said, and a newer turn
// says it first.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');

describe('a preempted think answer leads the next turn', () => {
  it('the answer is owed before the question speaks', () => {
    const q = src.indexOf('const qa = splitThink(line);');
    const owe = src.indexOf('pendingAnswerRef.current = qa[1];', q);
    const speakQ = src.indexOf("speakComputed(qa[0]", q);
    expect(q).toBeGreaterThan(0);
    expect(owe).toBeGreaterThan(q);
    expect(owe).toBeLessThan(speakQ);
  });
  it('a new turn says the owed answer before anything else', () => {
    const start = src.indexOf('trackAStarted = true;');
    const owed = src.indexOf('const owed = pendingAnswerRef.current;', start);
    const said = src.indexOf('speakComputed(owed', owed);
    expect(owed).toBeGreaterThan(start);
    expect(said).toBeGreaterThan(owed);
    // …and before this turn's first line joins the chain.
    expect(said).toBeLessThan(src.indexOf('const qa = splitThink(line);'));
  });
  it('the turn that asks never answers — the answer waits for the move (David 2026-10-18)', () => {
    expect(src).not.toContain('speakComputed(qa[1]');
    expect(src).not.toContain('THINK_PAUSE_MS');
  });
});

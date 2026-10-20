// THE MISTAKE TURN ON THE LEARN PAGE (Smith-Morra replay 2026-10-20, 8.Bxf7+):
// one loss, one habit, composed in one place; and a wave that spoke hands its
// words to the next wave of the same turn.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');

describe('Learn: the mistake turn', () => {
  it('composes the grade, the fundamental and the habit through mistakeTurnLine', () => {
    expect(src).toMatch(/const turnLine = mistakeTurnLine\(\{/);
    // …and its habit joins the turn's one-habit rule (`method:` claim).
    expect(src).toMatch(/if \(turnLine\.teachesMethod\) winClaim\.push\('method:mistake-turn'\);/);
    // The old inline rule recognised only two fundamentals as the grade's loss.
    expect(src).not.toMatch(/lossInGrade/);
  });
  it('a late wave adds what it spoke to the turn\'s already-said text', () => {
    const helper = src.indexOf('const speakLateWave = ');
    const end = src.indexOf('if (lateDecision.lead) instantLead = lateDecision.lead;', helper);
    expect(helper).toBeGreaterThan(-1);
    expect(src.slice(helper, end)).toMatch(/instantSpokenText = \[instantSpokenText, stripThink\(hintPkg\.spoken\)\]/);
  });
});

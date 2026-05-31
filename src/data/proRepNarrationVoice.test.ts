// PRO-REP NARRATION VOICE-CONTRACT GATE — (David 2026-05-31, locked).
//
// The locked masterclass voice rules (CLAUDE.md §G9.1 / Narration Voice Rules /
// pro-rep STEP 7) forbid in SPOKEN narration:
//   • move-number prefixes — "2.Nc3" / "3…d5" / "1.e4". Polly reads "2." as
//     "two", producing robotic "two knight to c3" lines. The move name alone
//     ("Nc3", "…d5") is what should be spoken; the SAN is on the board.
//   • Learn cues longer than 8 words — `sayShort` is a TRUNCATED reinforcement
//     cue (move + a 3-5 word echo), hard-capped at 8 words by doctrine.
// The masterclass set is gated by narrationAccuracy/lessonIntegrity via
// registry.ts — but pro-rep lessons live in the runtime LESSONS map only, so
// their spoken `say`/`sayShort` text was an UNGATED swamp. This caught 62
// move-number prefixes + 6 over-length cues across the pro lesson files
// (2026-05-31). Baseline-free: all were fixed; new violations fail the build.
//
// Scope: every src/data/lessons/pro{Gothamchess,Naroditsky}*.ts file (the
// pro-rep Watch/variation/trap lessons). Stats are PRESERVED and EXEMPT:
// "73.4%", "1,475 games", "200-year" are not move-number prefixes (the regex
// requires a SAN token — piece/castle/file-rank — immediately after the
// number+dot, and a decimal like "9.3" has a digit after the dot).

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import cmRaw from './common-mistakes.json' assert { type: 'json' };
import mgRaw from './model-games.json' assert { type: 'json' };

const LESSON_DIR = join(process.cwd(), 'src/data/lessons');
// Match every pro-rep lesson file regardless of player (proGothamchess*,
// proNaroditsky*, proEricRosen*, …). Generalized 2026-05-31 so a new player's
// lessons cannot escape the spoken-voice gate (proLessonFiles already excludes
// *.test.ts). Was /^pro(Gothamchess|Naroditsky).*\.ts$/.
const PRO_RE = /^pro[A-Z][A-Za-z]*\.ts$/;

function proLessonFiles(): string[] {
  return readdirSync(LESSON_DIR).filter((f) => PRO_RE.test(f) && !f.endsWith('.test.ts'));
}

// A move-number prefix: 1-2 digits, then "." or "…"/"...", then a SAN start
// (piece N/B/R/Q/K, castle O, or file+rank/x). A decimal ("9.3", "73.4%") is
// excluded because a digit — not a SAN token — follows the dot.
const MOVE_NUM = /(?:^|[\s(])\d{1,2}(?:\.|…|\.\.\.)(?:[NBRQKO]|[a-h][1-8x])/;

interface Hit { file: string; kind: 'say' | 'sayShort'; reason: string; text: string }

function scan(): { moveNum: Hit[]; longCue: Hit[] } {
  const moveNum: Hit[] = [];
  const longCue: Hit[] = [];
  for (const file of proLessonFiles()) {
    const src = readFileSync(join(LESSON_DIR, file), 'utf8');
    // say: + sayShort: string literals (single/double/backtick), escape-aware
    for (const m of src.matchAll(/\b(say|sayShort):\s*(["'`])((?:\\.|(?!\2).)*)\2/gs)) {
      const kind = m[1] as 'say' | 'sayShort';
      const text = m[3];
      if (MOVE_NUM.test(text)) moveNum.push({ file, kind, reason: 'move-number prefix', text: text.slice(0, 90) });
      if (kind === 'sayShort') {
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        if (words > 8) longCue.push({ file, kind, reason: `cue is ${words} words (>8)`, text });
      }
    }
  }
  return { moveNum, longCue };
}

describe('pro-rep lesson narration obeys the spoken-voice contract', () => {
  const { moveNum, longCue } = scan();

  it('finds the pro-rep lesson files (guards against a path/glob regression)', () => {
    expect(proLessonFiles().length).toBeGreaterThan(20);
  });

  it('has NO move-number prefixes in spoken say/sayShort (Polly reads "2." as "two")', () => {
    const msg = moveNum.map((h) => `  [${h.file}] ${h.kind}: ${h.text}`).join('\n');
    expect(moveNum, `Move-number prefixes in spoken narration — strip "1.e4"→"e4", "3…d5"→"…d5":\n${msg}`).toHaveLength(0);
  });

  it('has NO Learn cue (sayShort) longer than 8 words', () => {
    const msg = longCue.map((h) => `  [${h.file}] ${h.reason}: "${h.text}"`).join('\n');
    expect(longCue, `sayShort cues over the 8-word cap — tighten them:\n${msg}`).toHaveLength(0);
  });

  // Pitfall explanations + model-game overviews are read aloud via the read-aloud
  // affordance — same Polly, same "2." → "two" defect. Strip move-numbers there too.
  it('has NO move-number prefixes in pro-rep pitfall / model-game narration', () => {
    const bad: string[] = [];
    const cm = cmRaw as Record<string, Array<{ explanation?: string; shortNarration?: string }>>;
    for (const key of Object.keys(cm)) {
      if (!/^pro-/.test(key)) continue;
      for (const m of cm[key]) {
        if (m.explanation && MOVE_NUM.test(m.explanation)) bad.push(`pitfall ${key}: ${m.explanation.slice(0, 80)}`);
        if (m.shortNarration && MOVE_NUM.test(m.shortNarration)) bad.push(`pitfall-cue ${key}: ${m.shortNarration}`);
      }
    }
    const games = (Array.isArray(mgRaw) ? mgRaw : (mgRaw as { games?: unknown[] }).games || []) as Array<{ id?: string; openingId?: string; overview?: string; criticalMoments?: Array<{ explanation?: string; shortNarration?: string }> }>;
    for (const g of games) {
      if (!/^pro-/.test(g.openingId || '')) continue;
      if (g.overview && MOVE_NUM.test(g.overview)) bad.push(`model ${g.id}: ${g.overview.slice(0, 80)}`);
      for (const c of g.criticalMoments || []) {
        if (c.explanation && MOVE_NUM.test(c.explanation)) bad.push(`model-moment ${g.id}: ${c.explanation.slice(0, 80)}`);
        if (c.shortNarration && MOVE_NUM.test(c.shortNarration)) bad.push(`model-cue ${g.id}: ${c.shortNarration}`);
      }
    }
    expect(bad, `Move-number prefixes in pro-rep pitfall/model-game text:\n${bad.map((b) => '  ' + b).join('\n')}`).toHaveLength(0);
  });
});

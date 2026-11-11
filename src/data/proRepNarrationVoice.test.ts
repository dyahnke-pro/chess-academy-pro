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
// Scope: every lesson the app SERVES (`getAllLessonScripts`: the runtime LESSONS
// and VARIATION_LESSONS maps, Watch courses included). It used to read the
// pro*.ts lesson files off disk; once the openings became Watch courses
// (src/data/lessons/watch/, beats in arrays, not `say:` literals) that scan saw
// none of them, and 60 move numbers in the masterclass lessons had never been
// gated at all (2026-11-11). Pro lessons are zero-tolerance; the other lessons'
// existing hits are a shrink-only baseline (spokenMoveNumber.baseline.json) that
// empties as each opening is rewritten. A cue's words are counted as the Learn
// cue gate counts them (wlppNarration): a dash is not a word.
// Stats are PRESERVED and EXEMPT: "73.4%", "1,475 games", "200-year" are not
// move-number prefixes (the regex requires a SAN token — piece/castle/file-rank —
// immediately after the number+dot, and a decimal like "9.3" has a digit after
// the dot).

import { describe, it, expect } from 'vitest';
import cmRaw from './common-mistakes.json' assert { type: 'json' };
import mgRaw from './model-games.json' assert { type: 'json' };
import baselineRaw from './lessons/spokenMoveNumber.baseline.json' assert { type: 'json' };
import { getAllLessonScripts } from './lessons';
import { WATCH_COURSES } from './lessons/watch';

// A move-number prefix: 1-2 digits, then "." or "…"/"...", then a SAN start
// (piece N/B/R/Q/K, castle O, or file+rank/x). A decimal ("9.3", "73.4%") is
// excluded because a digit — not a SAN token — follows the dot.
const MOVE_NUM = /(?:^|[\s(])\d{1,2}(?:\.|…|\.\.\.)(?:[NBRQKO]|[a-h][1-8x])/;
const BASELINE = new Set<string>(baselineRaw);

interface Hit { key: string; pro: boolean; kind: 'say' | 'sayShort'; reason: string; text: string }

function scan(): { moveNum: Hit[]; longCue: Hit[]; openings: Set<string> } {
  const moveNum: Hit[] = [];
  const longCue: Hit[] = [];
  const openings = new Set<string>();
  for (const { key, lesson } of getAllLessonScripts()) {
    openings.add(lesson.openingId);
    const pro = lesson.openingId.startsWith('pro-');
    for (const b of lesson.beats) {
      for (const kind of ['say', 'sayShort'] as const) {
        const text = b[kind];
        if (typeof text !== 'string') continue;
        if (MOVE_NUM.test(text)) moveNum.push({ key: `${key}::${b.id}`, pro, kind, reason: 'move-number prefix', text: text.slice(0, 90) });
      }
      if (pro && typeof b.sayShort === 'string') {
        const words = b.sayShort.trim().split(/\s+/).filter((w) => w && !/^[—–-]+$/.test(w)).length;
        if (words > 8) longCue.push({ key: `${key}::${b.id}`, pro, kind: 'sayShort', reason: `cue is ${words} words (>8)`, text: b.sayShort });
      }
    }
  }
  return { moveNum, longCue, openings };
}

describe('lesson narration obeys the spoken-voice contract', () => {
  const { moveNum, longCue, openings } = scan();

  it('reads every served lesson, every Watch course included (guards against a reach regression)', () => {
    expect(openings.size).toBeGreaterThan(150);
    for (const c of WATCH_COURSES) expect(openings.has(c.openingId), `${c.openingId} is not served`).toBe(true);
  });

  it('has NO move-number prefixes in spoken say/sayShort of a pro lesson (Polly reads "2." as "two")', () => {
    const bad = moveNum.filter((h) => h.pro);
    const msg = bad.map((h) => `  [${h.key}] ${h.kind}: ${h.text}`).join('\n');
    expect(bad, `Move-number prefixes in spoken narration — strip "1.e4"→"e4", "3…d5"→"…d5":\n${msg}`).toHaveLength(0);
  });

  it('adds NO move-number prefix to any other lesson (the baseline only shrinks)', () => {
    const fresh = moveNum.filter((h) => !h.pro && !BASELINE.has(h.key));
    const msg = fresh.map((h) => `  [${h.key}] ${h.kind}: ${h.text}`).join('\n');
    expect(fresh, `New move-number prefixes in spoken narration:\n${msg}`).toHaveLength(0);
  });

  it('keeps no stale baseline entry (a rewritten beat leaves the baseline)', () => {
    const live = new Set(moveNum.map((h) => h.key));
    const stale = [...BASELINE].filter((k) => !live.has(k));
    expect(stale, 'spokenMoveNumber.baseline.json lists beats that no longer say a move number — remove them').toEqual([]);
  });

  it('has NO Learn cue (sayShort) longer than 8 words in a pro lesson', () => {
    const msg = longCue.map((h) => `  [${h.key}] ${h.reason}: "${h.text}"`).join('\n');
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

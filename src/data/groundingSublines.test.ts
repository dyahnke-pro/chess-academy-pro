// GATE: every reply line (course-sublines.json — one per opponent reply on a
// tab, walked to a middlegame) is LEGAL and leaves the student NOT LOSING at
// its last board, per the engine (evaluated offline into grounding-items.json,
// the same cache and the same bar as the opening lines). A reply on a gambit
// tab is judged like the gambit. Until 2026-10-27 the reply lines were checked
// only by scripts run by hand; the current backlog is grandfathered in
// groundingSublines.baseline.json and may only SHRINK.
import { describe, it, expect } from 'vitest';
import { loadItems, toCp, loadBaseline, maybeWriteBaseline } from './grounding/groundingLib';
import { _SUBLINE_NARRATION } from './lessons/sublineNarration';
import sublinesData from './course-sublines.json';

// Worse than a pawn down for the student at the line's last board. Was −150
// until 2026-10-28; at −150, 60 lines that drift to between −1.0 and −1.5 —
// no one move bad enough for the soundness check — were taught.
const LOSING_CP = -100;

// What a narration says at the end of its line about who stands better, read
// only where the subject is explicit ("you're clearly better", "the engine rates
// you…", "Black is winning", "about two pawns better for them", "about level").
// The bands are wide on purpose — the engine here reads depth 14, the writer's
// fact sheet depth 16 — so only a real contradiction fails: "You're clearly
// better" on +0.07 did, seven times, when this landed (2026-10-27).
const BAND: Record<'level' | 'little' | 'clearly' | 'winning', [number, number]> = {
  level: [-100, 100], little: [10, 180], clearly: [45, 1e6], winning: [140, 1e6],
};
const NUM: Record<string, number> = { half: 0.5, a: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };
function evalClaims(text: string, student: 'white' | 'black'): Array<{ phrase: string; lo: number; hi: number }> {
  const out: Array<{ phrase: string; lo: number; hi: number }> = [];
  const degree = (w: string): 'little' | 'clearly' => (/clear|much|comfortabl|decisive/i.test(w) ? 'clearly' : 'little');
  const add = (phrase: string, [lo, hi]: [number, number], theirs: boolean): void => {
    out.push(theirs ? { phrase, lo: -hi, hi: -lo } : { phrase, lo, hi });
  };
  for (const m of text.matchAll(/\b(?:you're|you are|you stand|you remain|you stay|leaves you|the engine (?:rates|has|gives) you)\s+((?:clearly|slightly|a little|a bit|much|comfortably)\s+)?(better|winning|on top|worse|losing)\b/gi)) {
    add(m[0], BAND[/winning|losing/i.test(m[2]) ? 'winning' : degree(m[1] ?? '')], /worse|losing/i.test(m[2]));
  }
  for (const m of text.matchAll(/\b(White|Black|they're|they are)\s+(?:is\s+)?((?:clearly|slightly|a little|much|comfortably)\s+)?(better|winning)\b/g)) {
    const theirs = /they/i.test(m[1]) || m[1].toLowerCase() !== student;
    add(m[0], BAND[/winning/i.test(m[3]) ? 'winning' : degree(m[2] ?? '')], theirs);
  }
  for (const m of text.matchAll(/\b(?:about|roughly|nearly|almost|more than|over)?\s*(half|a|one|two|three|four|five)( and a half)? pawns? better(?: for (you|them))?/gi)) {
    const v = (NUM[m[1].toLowerCase()] ?? 1) + (m[2] ? 0.5 : 0);
    add(m[0], [v * 40 - 40, v * 200 + 80], m[3]?.toLowerCase() === 'them');
  }
  if (/\b(?:about|roughly|dead|completely)\s+level\b|\bthe position is (?:equal|level|balanced)\b/i.test(text)) add('about level', BAND.level, false);
  return out;
}

describe('grounding gate: reply lines are sound for the student', () => {
  const { items } = loadItems('subline');

  it('has the reply lines built (run scripts/ci/build-grounding.cjs)', () => {
    expect(items.length).toBeGreaterThan(4000);
  });

  it('every reply line is legal + not losing for the student at its last board', () => {
    const viol: string[] = [];
    const detail: Record<string, string> = {};
    for (const it of items) {
      const key = `${it.name}`;
      if (!it.terminalFen) { viol.push(`${key} :: ILLEGAL`); continue; }
      if (!it.eval) { viol.push(`${key} :: UNEVALUATED`); continue; }
      if (it.isGambit) continue;
      const cp = toCp(it.eval, it.color);
      if (cp == null) { viol.push(`${key} :: UNEVALUATED`); continue; }
      if (cp < LOSING_CP) { const k = `${key} :: LOSING`; viol.push(k); detail[k] = (cp / 100).toFixed(2); }
    }
    if (maybeWriteBaseline('groundingSublines', viol)) return;
    const baseline = loadBaseline('groundingSublines');
    const fresh = viol.filter((v) => !baseline.has(v));
    expect(
      fresh,
      `NEW reply-line grounding violations (not in baseline):\n` +
        fresh.map((v) => `  ${v}${detail[v] ? ` (student ${detail[v]})` : ''}`).join('\n'),
    ).toEqual([]);
  });

  it('the baseline only shrinks — a fixed line leaves it', () => {
    const live = new Set<string>();
    for (const it of items) {
      if (!it.terminalFen) { live.add(`${it.name} :: ILLEGAL`); continue; }
      if (!it.eval || it.isGambit) continue;
      const cp = toCp(it.eval, it.color);
      if (cp != null && cp < LOSING_CP) live.add(`${it.name} :: LOSING`);
    }
    expect([...loadBaseline('groundingSublines')].filter((v) => !live.has(v))).toEqual([]);
  });

  // A pro line carries its own eval (`evalCp`) and `dubious` flag — they drive
  // the teach-both caption. They were computed once when the line was built,
  // and lines rebuilt later kept the old numbers: 43 stored evals were more than
  // half a pawn off their own last board, 17 dubious flags were wrong, and the
  // lines that really ended lost were never flagged (2026-10-28).
  it("a pro line's stored eval and dubious flag match its own last board", () => {
    const S = sublinesData as Record<string, Record<string, Array<{ triggerMove: string; atPly: number; evalCp?: number | null; dubious?: boolean }>>>;
    const byKey = new Map(items.map((it) => [it.name, it]));
    const rows: string[] = [];
    let checked = 0;
    for (const [id, tabs] of Object.entries(S)) {
      if (!id.startsWith('pro-')) continue;
      for (const [tab, list] of Object.entries(tabs)) {
        for (const s of list) {
          const key = `${id}::${tab}::${s.triggerMove}@${s.atPly}`;
          const it = byKey.get(key);
          if (!it?.eval) continue;
          const cp = toCp(it.eval, it.color);
          if (cp == null) continue;
          checked++;
          if (s.evalCp == null || Math.abs(s.evalCp - cp) > 60) rows.push(`${key}: stored ${s.evalCp ?? 'none'}, board ${cp}`);
          if (!!s.dubious !== cp < LOSING_CP) rows.push(`${key}: dubious ${!!s.dubious}, board ${cp}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(rows).toEqual([]);
  });

  it("a line's last words about who is better agree with the engine", () => {
    const byKey = new Map(items.map((it) => [it.name, it]));
    const rows: string[] = [];
    for (const [key, n] of Object.entries(_SUBLINE_NARRATION)) {
      const it = byKey.get(key);
      if (!it?.eval || !it.pgn) continue;
      const cp = toCp(it.eval, it.color);
      if (cp == null) continue;
      const last = it.pgn.split(' ').length - 1;
      for (const b of (n.beats ?? []).filter((x) => x.atMove >= last - 1)) {
        for (const c of evalClaims(b.say, it.color === 'black' ? 'black' : 'white')) {
          if (cp < c.lo || cp > c.hi) rows.push(`${key} beat@${b.atMove}: "${c.phrase}" — engine ${(cp / 100).toFixed(2)} for you`);
        }
      }
    }
    expect(rows).toEqual([]);
  });
});

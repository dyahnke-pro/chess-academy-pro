/**
 * outlineCoverage — the status board may not lag the record.
 *
 * 🚨 WHY THIS FILE EXISTS, AND THE FINDING THAT PROMPTED IT. `OUTLINE.md`'s own
 * header has claimed since it was written that "Gate: `src/test/outlineCoverage.test.ts`
 * fails the build when a numbered roadblock item or bucket in `PLAN.md` has no
 * line here." **That file did not exist** — on 2026-09-20 a search of the repo
 * and of `origin/main` found exactly one reference to it in the whole history:
 * the sentence promising it. So the board was protected by a claim rather than
 * by a gate, which is the precise failure CLAUDE.md names at the root ("a
 * convention rots; a gate does not", and "a gate that fires means the wrong
 * thing was still possible"). The honest fix is to make the claim true, not to
 * delete it.
 *
 * WHAT A LAGGING BOARD COSTS. `OUTLINE.md` is the answer to "where do we
 * stand?", so a missing line reports open work as finished and a stale line
 * reports finished work as open — either way the next session picks up the
 * wrong thing, which is exactly the hour this repo keeps losing to duplicated
 * work between parallel sessions.
 *
 * THE CONTRACT IS DELIBERATELY NARROW, because a flaky gate is worse than none:
 * a gate that false-fires costs a session chasing a non-bug, and gets muted.
 * So this blames by a STRUCTURED reference, never by proximity or prose:
 *
 *  1. Every ROADBLOCK BUCKET in `PLAN.md` has a line in `OUTLINE.md`.
 *  2. Every OPEN numbered item — written `(#NN)`, the parenthesised form — has
 *     a line. DONE items are exempt: the board is an index of open work, and
 *     requiring closed items would make it grow forever.
 *  3. No PHANTOM references: every `#NN` the board cites must exist in the
 *     record. A board citing an item the plan no longer has is the same lie in
 *     the other direction.
 *
 * WHY THE PARENTHESISED FORM. `PLAN.md` is prose and mentions ids in passing —
 * "failure mode #1", "same disease as #18", "PR #938". Those are
 * cross-references, not items, and a gate that demanded a board line for each
 * would fire on four innocent sentences and be switched off within a day. An
 * item DECLARES itself as `(#NN)`; a sentence merely mentions one. Same
 * blame-by-statement discipline as `perspectiveRule` and `oneStudentRating`.
 *
 * NON-VACUITY. Every assertion below is preceded by a check that the parse
 * actually found something. A regex that silently stops matching after a
 * `PLAN.md` restructure would otherwise turn this gate green forever while
 * verifying nothing — the most expensive failure mode in this repo, and one
 * this file would be embarrassing to contain.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../..');
const plan = readFileSync(resolve(repoRoot, 'PLAN.md'), 'utf8');
const outline = readFileSync(resolve(repoRoot, 'OUTLINE.md'), 'utf8');

/** The ROADBLOCKS section — everything after its heading. */
function roadblocksSection(text: string): string {
  const i = text.indexOf('## ROADBLOCKS');
  return i === -1 ? '' : text.slice(i);
}

/** Bucket headings inside ROADBLOCKS: `### A. The loop cannot close…`. */
function buckets(text: string): string[] {
  const out: string[] = [];
  for (const line of roadblocksSection(text).split('\n')) {
    const m = /^###\s+([A-E])\.\s/.exec(line);
    if (m) out.push(m[1]);
  }
  return [...new Set(out)];
}

interface PlanItem {
  id: string;
  line: string;
  done: boolean;
}

/**
 * Numbered items, by their DECLARED form `(#NN)`.
 *
 * 🚨 DONE-NESS IS READ OFF THE WHOLE LIST ITEM, NEVER THE LINE. The first cut of
 * this parser read the marker from the same line as the id and immediately
 * false-fired on #60, whose `(#60)` sits on a WRAPPED CONTINUATION line while
 * its `✅ **DONE**` is on the item's first line. PLAN.md is hand-wrapped prose,
 * so id and marker routinely land on different lines — a line-scoped gate would
 * have reported a closed item as open on its very first run, which is the flaky
 * gate this file's header promises not to be. Blame by ITEM, the same way
 * `perspectiveRule` blames by statement rather than by proximity.
 */
function planItems(text: string): PlanItem[] {
  const items = new Map<string, PlanItem>();
  const lines = roadblocksSection(text).split('\n');
  const isItemStart = (l: string) => /^\s{0,3}(?:\d{1,2}\.|[-*])\s/.test(l);

  let block: string[] = [];
  const flush = () => {
    if (block.length === 0) return;
    const body = block.join('\n');
    const done = /✅|\bDONE\b|\bCLOSED\b/.test(body);
    for (const m of body.matchAll(/\(#(\d{1,3})\)/g)) {
      const id = m[1];
      const prev = items.get(id);
      // An id may be declared more than once; treat it as closed only if EVERY
      // declaration says so, so a reopened item cannot hide behind an old ✅.
      if (!prev) items.set(id, { id, line: block[0].trim(), done });
      else if (!done) items.set(id, { id, line: block[0].trim(), done: false });
    }
    block = [];
  };

  for (const line of lines) {
    if (isItemStart(line)) flush();
    block.push(line);
  }
  flush();
  return [...items.values()];
}

/** Every `#NN` the board cites, in any form — the board is terse by design. */
function outlineIds(text: string): Set<string> {
  return new Set([...text.matchAll(/#(\d{1,3})\b/g)].map((m) => m[1]));
}

/** Every `#NN` anywhere in the record, including prose cross-references. */
function planIds(text: string): Set<string> {
  return new Set([...text.matchAll(/#(\d{1,3})\b/g)].map((m) => m[1]));
}

describe('OUTLINE.md covers PLAN.md', () => {
  it('parses both files non-vacuously', () => {
    // If any of these ever reads zero, every assertion below is meaningless and
    // would pass for free. Fail here instead, loudly, naming the parse.
    expect(plan.length).toBeGreaterThan(5_000);
    expect(outline.length).toBeGreaterThan(1_000);
    expect(roadblocksSection(plan).length).toBeGreaterThan(1_000);
    expect(buckets(plan).length).toBeGreaterThanOrEqual(3);
    expect(planItems(plan).length).toBeGreaterThanOrEqual(5);
    expect(outlineIds(outline).size).toBeGreaterThanOrEqual(5);
  });

  it('has a board line for every roadblock bucket', () => {
    const missing = buckets(plan).filter((b) => !new RegExp(`Bucket\\s+${b}\\b`).test(outline));
    expect(
      missing,
      `PLAN.md has roadblock bucket(s) ${missing.join(', ')} with no line in OUTLINE.md. ` +
        'Add one line per bucket — the board is the answer to "where do we stand?", and a ' +
        'missing bucket reports its whole contents as finished.',
    ).toEqual([]);
  });

  it('has a board line for every OPEN numbered item', () => {
    const cited = outlineIds(outline);
    const missing = planItems(plan)
      .filter((item) => !item.done && !cited.has(item.id))
      .map((item) => `#${item.id} — ${item.line.slice(0, 110)}`);
    expect(
      missing,
      `Open item(s) in PLAN.md with no line in OUTLINE.md:\n  ${missing.join('\n  ')}\n` +
        'Add a one-line entry with a marker (🔴 real defect · 🟠 needs a measurement or ' +
        "David's call · 🟡 low rank · ⛔ another session owns it). Update the board in the " +
        'SAME commit as the work — a board that lags sends the next session at the wrong thing.',
    ).toEqual([]);
  });

  it('CAN FIRE — a negative control, on synthetic input', () => {
    // A gate nobody has watched fail is indistinguishable from a gate that
    // cannot fail. Prove both halves on input we control, so a real green above
    // means the board is covered rather than the parser being asleep.
    const synthetic = [
      '## ROADBLOCKS — synthetic',
      '### B. Something',
      '1. 🔴 **an open item** (#901). Still broken.',
      '2. ✅ **DONE — a closed one** (#902). Landed.',
      '3. ✅ **DONE — marker on the first line, id wrapped onto the next**',
      '   (#903). This is the #60 shape that false-fired the first parser.',
      'Prose mentioning #904 in passing is a cross-reference, not an item.',
    ].join('\n');

    const parsed = planItems(synthetic);
    const byId = Object.fromEntries(parsed.map((i) => [i.id, i.done]));

    expect(byId['901'], 'an open item must parse as OPEN').toBe(false);
    expect(byId['902'], 'a DONE item must parse as closed').toBe(true);
    expect(byId['903'], 'a DONE item whose id wrapped to the next line must parse as CLOSED').toBe(true);
    expect(byId['904'], 'a bare prose mention is not an item and must not be collected').toBeUndefined();

    // …and the open one is what a board missing it would be blamed for.
    const openMissing = parsed.filter((i) => !i.done && !outlineIds('board with no ids').has(i.id));
    expect(openMissing.map((i) => i.id)).toEqual(['901']);
  });

  it('carries no section heading twice', () => {
    // 🔴 THE BOARD SILENTLY GREW A SECOND COPY OF ITSELF (found 2026-09-21).
    // Six headings appeared twice — `## 8b`, `## 9`, the other session's
    // board, the blocked list, and both closing sections — because two
    // sessions edit this file and a merge kept both sides rather than
    // reconciling them. 165 item lines, 116 distinct.
    //
    // That is not cosmetic. Every tool that finds a line finds the FIRST one,
    // so an update lands in one copy and the other goes stale — which is
    // exactly how this board ended up asserting both sides of the same
    // question twice in one night (the hash finding, and FUNDLEAD's cause
    // reading UNNAMED an hour after it was named).
    //
    // Blame by HEADING, not by content: two items may legitimately say
    // similar things, but a section heading is an identity and appearing
    // twice means the file has two of something.
    const headings = outline.split('\n').filter((l) => /^##\s+\S/.test(l)).map((l) => l.trim());
    expect(headings.length, 'no section headings parsed — this check would pass for free')
      .toBeGreaterThan(5);
    const seen = new Map<string, number>();
    for (const h of headings) seen.set(h, (seen.get(h) ?? 0) + 1);
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([h, n]) => `${n}x ${h.slice(0, 90)}`);
    expect(
      dupes,
      `OUTLINE.md carries duplicate section heading(s):\n  ${dupes.join('\n  ')}\n` +
        'Two sessions edit this board and a merge kept both sides. Reconcile them into ONE ' +
        'section — every reader and every script finds the FIRST copy, so the second goes ' +
        'stale the moment anyone updates the first, and a board that lags is worse than none.',
    ).toEqual([]);
  });

  it('carries no ITEM LINE twice — the heading check is blind to a headless copy', () => {
    // 🔴 THE HEADING CHECK ABOVE MISSED THE SAME DEFECT, TWICE (2026-09-21).
    // After the six duplicate headings were reconciled, a 14-line copy of
    // §6/§8's tail was still sitting in the file — stranded under a heading of
    // its own that it did not duplicate, so the heading check had nothing to
    // catch it by. It survived a second pass for the same reason.
    //
    // And it was the OLDER copy, which is the worse kind. A plain duplicate is
    // noise you read twice; a STALE duplicate is a live contradiction — that
    // block still said "57,204 un-positioned notes" after the line above it
    // was corrected to 9,928, and "readingGate looks like DEAD STATE" after
    // the correction landed. The board asserted both, and whichever a reader
    // hits first is the one they act on. Half of them would have been sizing
    // work against a payload five times the real one.
    //
    // So blame by ITEM LINE as well as by heading. A heading is an identity;
    // an item line is a CLAIM, and the same claim twice means one of the two
    // is going stale the moment anyone edits the other — the defect does not
    // need a duplicated heading to happen, which is what the first two passes
    // learned the expensive way.
    //
    // NARROW ON PURPOSE (a flaky gate gets muted): only marked item lines, and
    // only substantial ones, so a short shared fragment like a table rule or a
    // repeated "· ✅ 8." tail cannot false-fire.
    const items = outline
      .split('\n')
      .map((l, i) => ({ n: i + 1, text: l.trim() }))
      .filter(({ text }) => /^[-*]\s+(✅|🔴|🟠|🟡|⛔)/.test(text) && text.length > 60)
      .map((x) => ({ ...x, key: x.text.replace(/\s+/g, ' ') }));

    expect(items.length, 'no marked item lines parsed — this check would pass for free')
      .toBeGreaterThan(20);

    const firstSeen = new Map<string, number>();
    const dupes: string[] = [];
    for (const { n, key } of items) {
      const prev = firstSeen.get(key);
      if (prev === undefined) firstSeen.set(key, n);
      else dupes.push(`line ${n} repeats line ${prev}: ${key.slice(0, 90)}`);
    }
    expect(
      dupes,
      `OUTLINE.md carries duplicate item line(s):\n  ${dupes.join('\n  ')}\n` +
        'Two sessions edit this board and a merge kept both sides. Delete the STALE copy — ' +
        'not the newer one, and check which is which before deleting: the older copy carries ' +
        'pre-correction numbers, so leaving it makes the board assert both answers at once.',
    ).toEqual([]);
  });

  it('cites no item the plan does not have', () => {
    const known = planIds(plan);
    const phantom = [...outlineIds(outline)].filter((id) => !known.has(id));
    expect(
      phantom,
      `OUTLINE.md cites #${phantom.join(', #')}, which appear nowhere in PLAN.md. ` +
        'PLAN is the record and wins: either the item was renumbered and the board kept the ' +
        'old id, or the line is stale. Fix the board.',
    ).toEqual([]);
  });
});

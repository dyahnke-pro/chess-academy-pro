// THE RECORD STEERS, IT IS NEVER RECITED (David 2026-10-28: "Remove the 'last
// mistake narration' the last time you made this mistake. I want to trim out
// unnecessary statements."). A student whose record holds the same slip from
// another game hears the lesson, never "you've walked into this before" /
// "this one keeps recurring" / "this time you held it". The record still
// raises what gets taught (`boostFor`, the need score) — that is the loop.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';
import type { WeaknessSignal } from './weaknessSignal';

// "you drilled … this time you found it" is Learn's drill-transfer line, the
// last producer reading the record back (WO-STORY-MATRIX-01 P1-1, 2026-10-30).
// "held it" is whole-word: "held its own pawns" is a board fact, not a recital.
// `lastTimeHere` ("Last time here you played …") is KEPT on David's call
// (OUTLINE.md, PLAN.md) and its words are deliberately not matched.
const RECALL = /keeps recurring|walked into this before|caught you before|held it\b|caught you in your games|against Rossi|against Sam|you drilled|this time you found it/i;
const SANS = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6', 'Nf3'];

function inputs(): ReviewMoveInput[] {
  const chess = new Chess();
  return SANS.map((san, i) => {
    chess.move(san);
    return {
      ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: i % 2 === 0,
      classification: i === 11 ? 'mistake' : 'book',
      preMoveEval: i === 11 ? -20 : 0, evaluation: i === 11 ? 90 : 0,
      bestMove: i === 11 ? 'e7e6' : null,
    } as unknown as ReviewMoveInput;
  });
}

const recorded = (clusterId: string, label: string): WeaknessSignal => ({
  clusterId, capabilityTag: null, proven: false, bucket: 'positional', label,
  openCount: 3, severity: 50, puzzleThemes: [], total: 3,
});

describe('review never recites the record', () => {
  it('a slip the record holds from another game: the lesson speaks, the recall does not', { timeout: 30_000 }, () => {
    const signals = [recorded('fundamental:same-piece-twice', 'Moving the same piece twice')];
    for (const uncapped of [false, true]) {
      const text = buildReviewSegmentsForTests(inputs(), 'black', 'Sicilian Defense: Alapin Variation', uncapped, 1400, signals, undefined, 'this-game')[11].narration ?? '';
      expect(text).toMatch(/same knight for the third time/);
      expect(text).not.toMatch(RECALL);
    }
  });

  it('a clean move answering a question the record failed elsewhere: no "this time you held it"', { timeout: 30_000 }, () => {
    const c = new Chess();
    const moves = ['e4', 'c5', 'c3', 'Nf6'].map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, isCoachMove: i % 2 === 0, classification: 'good' as const, evaluation: 30, preMoveEval: 30, bestMove: null, fenAfter: c.fen() } as unknown as ReviewMoveInput;
    });
    const segs = buildReviewSegmentsForTests(moves, 'black', null, true, 1500, [recorded('neglected-development', 'Neglected development')], undefined, 'now');
    for (const s of segs) expect(s.narration ?? '').not.toMatch(RECALL);
  });
});

// THE PRODUCERS, NOT ONLY THE REVIEW TAPE. The Review tests above cannot see a
// Learn line: the drill-transfer line ("That is the fork you drilled from your
// game against X — this time you found it at the board") spoke in Learn free
// play and passed them all. So every string a production module can say is
// read here, comments stripped.
const SRC_ROOT = 'src';
/** Wording that matches RECALL and is NOT the record read back. Each says why. */
const NOT_A_RECITAL: Record<string, string> = {
  'src/components/Campaign/RecapSheet.tsx': "a boss game's recap of THIS game: whether each targeted habit held in it ('you held it')",
};

function productionFiles(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f === 'test' || f === '__mocks__') continue;
      productionFiles(p, out);
    } else if (/\.(ts|tsx)$/.test(f) && !/\.(test|measure|report|gate|fixture)\./.test(f)) {
      out.push(p);
    }
  }
  return out;
}

/** The string and template literals a file can say, comments stripped. */
function literals(src: string): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
  return code.match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g) ?? [];
}

describe('no producer holds a line that recites the record', () => {
  it('no production string reads the record back', () => {
    const offenders: string[] = [];
    for (const f of productionFiles(SRC_ROOT)) {
      if (NOT_A_RECITAL[f]) continue;
      for (const l of literals(readFileSync(f, 'utf8'))) {
        if (RECALL.test(l)) offenders.push(`${f}: ${l.slice(0, 120)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the exemptions still hold the wording they excuse (a stale exemption hides nothing)', () => {
    for (const f of Object.keys(NOT_A_RECITAL)) {
      expect(literals(readFileSync(f, 'utf8')).some((l) => RECALL.test(l)), f).toBe(true);
    }
  });
});

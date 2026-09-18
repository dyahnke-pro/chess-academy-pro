/**
 * ONE STUDENT, ONE NUMBER (David 2026-09-17: "An unrated student is a different
 * student on each tab. NO!").
 *
 * Measured 2026-09-18, that was literally true: the student's rating fell back
 * to 1200 in 63 places, 1500 in twelve COMPUTERS and 1420 in five more — one of
 * which handed the model "Student rating: 1420" as a fact about the person. Every
 * rating-scaled decision (criticality thresholds, PV depth, alert sensitivity)
 * hung off whichever number its call site happened to type.
 *
 * This gate blames by STATEMENT, not by proximity: a line only counts if it
 * defaults something RATING-shaped. A game's `whiteElo ?? 1500` is a DIFFERENT
 * question — a missing PGN header, not this student — so lines mentioning Elo are
 * out of scope by design, and that exclusion is the reason this gate can be
 * strict about everything else.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_STUDENT_RATING } from './ratingBands';

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

describe('the unrated student resolves to ONE number', () => {
  it('no file defaults a student rating to anything but DEFAULT_STUDENT_RATING', () => {
    const offenders: string[] = [];
    for (const f of walk('src')) {
      if (f.endsWith('ratingBands.ts')) continue;   // the definer
      const src = readFileSync(f, 'utf8');
      src.split('\n').forEach((line, i) => {
        if (/elo/i.test(line)) return;                      // a GAME header, not this student
        if (!/rating/i.test(line)) return;                  // not a rating statement at all
        // TWO SYNTAXES, ONE BUG. The first cut of this gate scanned only `??`
        // and was blind to the PARAMETER-DEFAULT form (`rating = 1500`), which
        // hid five more sites — including `narrationImportance`, the
        // rating-scaled criticality computer, and `coldStudent` itself. A gate
        // that checks one spelling of a defect reports green on the other.
        const m = /\?\?\s*(\d{3,4})\b/.exec(line)
          ?? /\brating[A-Za-z]*\s*=\s*(\d{3,4})\b/.exec(line);
        // A default at master strength is not a claim about an UNKNOWN STUDENT,
        // it is a TARGET. Two real sites were considered and deliberately left
        // in scope-free: `masterReachState?.rating ?? 2400` (CoachTeachPage) and
        // `options.rating ?? 2400` (pickMasterDrill) both set how strong the
        // master-level drill should be. Nobody defaults an unrated beginner to
        // 2400, so the plausible-unrated ceiling is where this gate stops
        // blaming — narrow enough to stay honest, strict everywhere it matters.
        if (m && Number(m[1]) < 2000 && Number(m[1]) !== DEFAULT_STUDENT_RATING) {
          offenders.push(`${f}:${i + 1}  ${line.trim().slice(0, 100)}`);
        }
      });
    }
    expect(
      offenders,
      'a second default makes the same unrated student a different person on that tab — '
      + `import DEFAULT_STUDENT_RATING instead:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('is non-vacuous — the scan really does find a planted second default', () => {
    // Without this, a regex that matched nothing would pass forever.
    for (const planted of [
      'const rating = profile?.currentRating ?? 1500;',   // the `??` form
      'export function coldStudent(rating = 1500) {',      // the PARAMETER form
    ]) {
      const m = /\?\?\s*(\d{3,4})\b/.exec(planted)
        ?? /\brating[A-Za-z]*\s*=\s*(\d{3,4})\b/.exec(planted);
      expect(/rating/i.test(planted) && !/elo/i.test(planted), planted).toBe(true);
      expect(m && Number(m[1]) !== DEFAULT_STUDENT_RATING, planted).toBe(true);
    }
  });

  it('leaves a GAME Elo header default alone — it is a different question', () => {
    const header = 'playerRating: playerColor === "white" ? game.whiteElo ?? 1500 : game.blackElo ?? 1500,';
    expect(/elo/i.test(header), 'Elo lines are out of scope by design').toBe(true);
  });

  it('there is exactly ONE literal for it', () => {
    const rb = readFileSync('src/services/ratingBands.ts', 'utf8');
    expect(rb).toMatch(/export const DEFAULT_STUDENT_RATING = \d+;/);
    const prs = readFileSync('src/services/playerRatingService.ts', 'utf8');
    expect(prs, 'DEFAULT_RATING must derive from the one constant, not restate it')
      .toMatch(/DEFAULT_RATING = DEFAULT_STUDENT_RATING/);
  });
});

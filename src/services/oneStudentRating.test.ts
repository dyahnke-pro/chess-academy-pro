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

/**
 * THE STATEMENT THIS GATE BLAMES — any inline NUMERIC default on a rating line.
 *
 * 🔴 TIGHTENED 2026-09-22 (WO-STANDARD-01 I2). The first cut only failed a
 * literal that DIFFERED from the constant, so 63 inline `?? 1200`s passed —
 * drift was merely unlikely, not impossible: the day the constant moves, every
 * one of those sites silently becomes a second student. Now ANY literal fails,
 * whatever its value; the only spelling that passes is the constant's name.
 * Three syntaxes, one bug: `?? N`, `|| N`, and the parameter-default `rating = N`.
 * Comment lines are skipped — prose about a default is not a default.
 */
function inlineRatingLiteral(line: string): number | null {
  const s = line.trim();
  if (s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')) return null;
  if (/elo/i.test(line)) return null;                      // a GAME header, not this student
  if (!/rating/i.test(line)) return null;                  // not a rating statement at all
  const m = /(?:\?\?|\|\|)\s*(\d{3,4})\b/.exec(line)
    ?? /\brating[A-Za-z]*\s*=\s*(\d{3,4})\b/.exec(line);
  if (!m) return null;
  const n = Number(m[1]);
  // A default at master strength is not a claim about an UNKNOWN STUDENT, it
  // is a TARGET. Two real sites were considered and deliberately left out of
  // scope: `masterReachState?.rating ?? 2400` (CoachTeachPage) and
  // `options.rating ?? 2400` (pickMasterDrill) both set how strong the
  // master-level drill should be. Nobody defaults an unrated beginner to 2400,
  // so the plausible-unrated ceiling is where this gate stops blaming.
  return n < 2000 ? n : null;
}

describe('the unrated student resolves to ONE number', () => {
  it('no file defaults a student rating with an inline literal — the constant is the only spelling', () => {
    const offenders: string[] = [];
    for (const f of walk('src')) {
      if (f.endsWith('ratingBands.ts')) continue;   // the definer
      const src = readFileSync(f, 'utf8');
      src.split('\n').forEach((line, i) => {
        if (inlineRatingLiteral(line) !== null) {
          offenders.push(`${f}:${i + 1}  ${line.trim().slice(0, 100)}`);
        }
      });
    }
    expect(
      offenders,
      'an inline rating literal is a second default waiting to drift — '
      + `import DEFAULT_STUDENT_RATING instead:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('is non-vacuous — the scan really does find a planted default, INCLUDING one equal to the constant', () => {
    // Without this, a regex that matched nothing would pass forever. The last
    // two plants are the ones the first cut of this gate waved through.
    for (const planted of [
      'const rating = profile?.currentRating ?? 1500;',   // the `??` form
      'export function coldStudent(rating = 1500) {',      // the PARAMETER form
      `const rating = profile?.currentRating ?? ${DEFAULT_STUDENT_RATING};`, // SAME value, still a literal
      `const base = playerRating || ${DEFAULT_STUDENT_RATING};`,             // the `||` form
    ]) {
      expect(inlineRatingLiteral(planted), planted).not.toBeNull();
    }
  });

  it('leaves comments and the constant\'s own name alone', () => {
    expect(inlineRatingLiteral(' *   - Session rating starts at `UserProfile.endgameRating ?? 1200`.')).toBeNull();
    expect(inlineRatingLiteral('const rating = profile?.currentRating ?? DEFAULT_STUDENT_RATING;')).toBeNull();
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

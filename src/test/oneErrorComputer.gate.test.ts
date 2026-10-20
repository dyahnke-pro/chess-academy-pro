import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';

// ONE ERROR COMPUTER (David 2026-10-10: "Any error. Same in review and
// everywhere else. Unity!"). Every surface that says why a move was an error
// reads `errorWhy` (directly, or through `callInaccuracy` / `errorCallFor`).
// The readers it is built from are called from nowhere else, and the surfaces
// that must not name the better move say so at every call.
const read = (p: string): string => readFileSync(resolve(__dirname, '..', p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SURFACES: Record<string, { file: string; door: RegExp }> = {
  'Learn free play': { file: 'services/backwardLook.ts', door: /\bcallInaccuracy(?:Detailed)?\(/ },
  'Review': { file: 'services/reviewFullData.ts', door: /\berrorWhy\(/ },
  'Chat — was that a good move / why was X bad / is X good': { file: 'services/coachApi.ts', door: /\berrorCallFor\(/ },
  // Every Tactics board's wrong try: the puzzle board through `readWrongTry`,
  // the others through the hook — both speak `refuteWrongTry` (merged 2026-10-11).
  'Tactics wrong try (puzzle board)': { file: 'services/wrongTryRefutation.ts', door: /\brefuteWrongTry\(/ },
  'Tactics wrong try': { file: 'services/puzzleTeaching.ts', door: /\berrorWhyFor\(/ },
  'My Mistakes': { file: 'services/mistakeNarration.ts', door: /\berrorWhy\(/ },
  'Review turning point': { file: 'services/turningPoints.ts', door: /\berrorWhy\(/ },
};

/** The readers `errorWhy` is built from, and the only files that may call them. */
const READERS: Record<string, string[]> = {
  punishmentOf: ['services/inaccuracyCall.ts'],
  allowedReply: ['services/inaccuracyCall.ts'],
  // My Mistakes' "Qc5 keeps your pawn protected" reads which piece the error
  // dropped — the answer's line, said after the student solved it.
  replyPunishment: ['services/inaccuracyCall.ts', 'services/mistakeNarration.ts'],
  // The mechanism reader (2026-10-10): it was a second why-computer called by
  // Learn, Review's legacy path, the mistakes list, move commentary and the
  // setup trainer on their own.
  whyItFailed: ['services/inaccuracyCall.ts'],
};

/** Every production source file under src/ (tests excluded). */
function allSources(): string[] {
  const root = resolve(__dirname, '..');
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx)$/.test(name) || /\.test\.tsx?$/.test(name) || /\.d\.ts$/.test(name)) continue;
      out.push(relative(root, full).split('\\').join('/'));
    }
  };
  walk(root);
  return out;
}

describe('one error computer', () => {
  for (const [name, s] of Object.entries(SURFACES)) {
    it(`${name} reads it`, () => {
      expect(read(s.file), `${s.file} no longer reaches errorWhy`).toMatch(s.door);
    });
  }

  it('its readers are called from nowhere else (every source file)', () => {
    const files = allSources();
    expect(files.length, 'the source walk found nothing').toBeGreaterThan(200);
    for (const f of files) {
      const src = read(f);
      for (const [reader, allowed] of Object.entries(READERS)) {
        if (allowed.includes(f)) continue;
        expect(src, `${f} calls ${reader} directly — go through errorWhy`).not.toMatch(new RegExp(`(?<!function )\\b${reader}\\(`));
      }
    }
  });

  it('tactics and My Mistakes never name the better move; Learn names it only when it is past', () => {
    // `errorWhyFor` (tactics) never names it — checked at its own body.
    expect(read('services/inaccuracyCall.ts')).toMatch(/export function errorWhyFor\([\s\S]*?errorWhy\(\{[\s\S]*?namesBetterMove:\s*false[\s\S]*?\}\)/);
    // CARVE-OUT 2 (David 2026-10-18): THEIR better move is a moment already
    // past and is named; the rule protects the STUDENT's next move. Only a
    // call on the opponent's side may pass true.
    // CARVE-OUT 3 (David 2026-10-20, 13.Bc3: "what the better move did"): the
    // student's better move is named in Learn exactly when `pastBetterNameable`
    // says it is no longer theirs to find — never a literal true.
    const decide = /namesBetterMove:\s*(?:false|pastBetterNameable\(args\.fenBefore, args\.playedSan, args\.bestSan \?\? null, args\.replyPvUci \?\? null, args\.replySan \?\? null\))/;
    for (const [f, allowed] of [['services/backwardLook.ts', decide], ['services/mistakeNarration.ts', /namesBetterMove:\s*false/]] as const) {
      const src = read(f);
      const calls = [...src.matchAll(/\b(?:errorWhy|callInaccuracy(?:Detailed)?)\(\{[\s\S]*?\}\)/g)].map((m) => m[0]);
      expect(calls.length, `${f} has no error call`).toBeGreaterThan(0);
      for (const c of calls) {
        if (/side:\s*'coach'/.test(c)) continue;
        expect(c, `${f}: an error call that may name the better move`).toMatch(allowed);
      }
    }
  });

  it('Review names it — the game is over', () => {
    expect(read('services/reviewFullData.ts')).toMatch(/errorWhy\(\{[\s\S]*?namesBetterMove:\s*true[\s\S]*?\}\)/);
  });
});

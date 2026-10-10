import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  'Tactics wrong try': { file: 'services/wrongTryRefutation.ts', door: /\berrorWhy\(/ },
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
};

describe('one error computer', () => {
  for (const [name, s] of Object.entries(SURFACES)) {
    it(`${name} reads it`, () => {
      expect(read(s.file), `${s.file} no longer reaches errorWhy`).toMatch(s.door);
    });
  }

  it('its readers are called from nowhere else', () => {
    const files = [
      'services/reviewFullData.ts', 'services/coachApi.ts', 'services/wrongTryRefutation.ts',
      'services/mistakeNarration.ts', 'services/turningPoints.ts', 'services/backwardLook.ts',
      'services/groundedAnswer.ts', 'services/coachFeatureService.ts', 'components/Coach/CoachTeachPage.tsx',
      'components/Puzzles/PuzzleBoard.tsx', 'components/Puzzles/MistakePuzzleBoard.tsx',
    ];
    for (const f of files) {
      const src = read(f);
      for (const [reader, allowed] of Object.entries(READERS)) {
        if (allowed.includes(f)) continue;
        expect(src, `${f} calls ${reader} directly — go through errorWhy`).not.toMatch(new RegExp(`\\b${reader}\\(`));
      }
    }
  });

  it('Learn free play, tactics and My Mistakes never name the better move', () => {
    for (const f of ['services/backwardLook.ts', 'services/wrongTryRefutation.ts', 'services/mistakeNarration.ts']) {
      const src = read(f);
      const calls = [...src.matchAll(/\b(?:errorWhy|callInaccuracy(?:Detailed)?)\(\{[\s\S]*?\}\)/g)].map((m) => m[0]);
      expect(calls.length, `${f} has no error call`).toBeGreaterThan(0);
      for (const c of calls) expect(c, `${f}: an error call that may name the better move`).toMatch(/namesBetterMove:\s*false/);
    }
  });

  it('Review names it — the game is over', () => {
    expect(read('services/reviewFullData.ts')).toMatch(/errorWhy\(\{[\s\S]*?namesBetterMove:\s*true[\s\S]*?\}\)/);
  });
});

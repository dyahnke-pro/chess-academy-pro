import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Puzzle-section grounding gate (G0, David 2026-06-11).
 *
 * Every coach explanation in the puzzle / tactics section must be GROUNDED —
 * the chess facts (what the best move wins, whether a capture is recapturable)
 * are computed in code and only PHRASED by the LLM via the `voiceFacts`
 * chokepoint (`explainPuzzleMoveGrounded`). The free-narration entry points
 * (`getCoachCommentary`, `getCoachChatResponse`) let the LLM DECIDE the chess
 * and hallucinate — the 2026-06-11 weakness-drill "forks its own knight"
 * incident. They are BANNED from puzzle/tactics components.
 *
 * This is a static architectural gate, NOT an output validator: it keeps the
 * whole section on the grounded path so a future edit can't reintroduce the
 * leak on one board while the others stay clean.
 */
const BANNED = ['getCoachCommentary', 'getCoachChatResponse', 'getCoachStructuredResponse'];

const DIRS = [
  join(__dirname, '..', 'Puzzles'),
  join(__dirname, '..', 'Tactics'),
];

function tsxFiles(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out = out.concat(tsxFiles(join(dir, entry.name)));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

describe('puzzle-section grounding gate', () => {
  it('no puzzle/tactics component calls an ungrounded coach-narration entry point', () => {
    const offenders: string[] = [];
    for (const dir of DIRS) {
      for (const file of tsxFiles(dir)) {
        const src = readFileSync(file, 'utf8');
        for (const banned of BANNED) {
          if (src.includes(banned)) offenders.push(`${file.split('/src/')[1]} → ${banned}`);
        }
      }
    }
    expect(
      offenders,
      `Puzzle/tactics surfaces must explain moves via the grounded chokepoint ` +
        `(explainPuzzleMoveGrounded → voiceFacts), never free LLM narration. Offenders:\n` +
        offenders.join('\n'),
    ).toEqual([]);
  });
});

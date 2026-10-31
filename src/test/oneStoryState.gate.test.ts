/**
 * 🔒 ONE STORY STATE — the say-once family (WO-STORY-MATRIX-01 P1-8a, design
 * docs/plans/2026-10-30-story-matrix-phase1.md §P1-8).
 *
 * Learn kept fourteen say-once memories in four places — the page's refs
 * (`positionalSaidRef`, `fundamentalSeenRef`, `threatSaidRef`,
 * `drilledSaidRef`), the factory-made `standingFactMemory` (twice: the page's
 * and usePhaseNarration's own), and nine Sets on `learnMemory` — with two
 * "board went backwards" detectors, two reset doors and no rewind. Every one of
 * them lives in `GameStory` now (gameStory.ts), written at the door.
 *
 * It closes the blind spot of `memoryLifetimes.gate.test.ts`, which sees only
 * `useRef(new Set | new Map | [] | {})` and so never saw a memory made by a
 * factory. Blamed by STATEMENT: comments are stripped, so a comment telling
 * the history never fails it. Commits 8b/8c extend it to plans, phase state and
 * the other story memories as they move in.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const FILES = ['src/components/Coach/CoachTeachPage.tsx', 'src/hooks/usePhaseNarration.ts'];

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, (m, a: string) => a + ' '.repeat(m.length - a.length));
}

/** A say-once memory, by NAME: a ref, or a local holding a memory the
 *  component keeps between turns. */
const SAY_ONCE_NAME = /(?:said|seen|spoken|taught|explainer|alarm)/i;

/** Every say-once memory the page or the hook declares outside the story:
 *  refs named as one, factory-made ledgers, and the merged learnMemory slots. */
function sayOnceOutsideStory(src: string): string[] {
  const s = stripComments(src);
  const out: string[] = [];
  for (const m of s.matchAll(/\bconst\s+(\w+)\s*=\s*useRef\b/g)) if (SAY_ONCE_NAME.test(m[1])) out.push(`ref ${m[1]}`);
  for (const m of s.matchAll(/\b(createStandingFactMemory|standingFactMemory|fullmoveOf)\b/g)) out.push(`factory ${m[1]}`);
  for (const m of s.matchAll(/learnMemRef\.current\.(spokenKeys|conceptTaught|principleTaught|spokenThreatLines|lastThreatKey|loudAlarms|spokenTacticLines|saidExplainers|pieceQualitySaid|questionsAnswered)\b/g)) out.push(`learnMemory.${m[1]}`);
  return out;
}

describe('the say-once family lives in GameStory', () => {
  it('the scanner sees the shapes it must (negative control: the old page)', () => {
    const old = `
      const fundamentalSeenRef = useRef(new Set<FundamentalId>());
      const threatSaidRef = useRef<{ fen: string } | null>(null);
      // const commentedSaidRef = useRef(new Set());
      const standingRef = useRef(createStandingFactMemory());
      const ownStandingRef = useRef(createStandingFactMemory());
      learnMemRef.current.spokenKeys.add(k);
      if (learnMemRef.current.conceptTaught.has(type)) return '';
      const activeTokenRef = useRef(0);`;
    expect(sayOnceOutsideStory(old)).toEqual([
      'ref fundamentalSeenRef',
      'ref threatSaidRef',
      'factory createStandingFactMemory',
      'factory createStandingFactMemory',
      'learnMemory.spokenKeys',
      'learnMemory.conceptTaught',
    ]);
  });

  for (const file of FILES) {
    it(`${file} keeps no say-once memory of its own`, () => {
      expect(sayOnceOutsideStory(readFileSync(file, 'utf8')), 'move it into GameStory (gameStory.ts) — one ledger, written at the door').toEqual([]);
    });
  }

  it('learnMemory declares none of the merged slots, and holds the story', () => {
    const code = stripComments(readFileSync('src/services/learnMemory.ts', 'utf8'));
    for (const slot of ['spokenKeys', 'conceptTaught', 'principleTaught', 'spokenThreatLines', 'lastThreatKey', 'loudAlarms', 'spokenTacticLines', 'saidExplainers', 'pieceQualitySaid', 'questionsAnswered', 'lastPlies']) {
      expect(code, `learnMemory still declares ${slot}`).not.toMatch(new RegExp(`\\b${slot}\\b`));
    }
    expect(code).toMatch(/readonly story: StoryStore;/);
    expect(code).toMatch(/const story = createStoryStore\(mintGameId\(\)\);/);
  });

  it('the standing-fact ledger is gone, and nothing imports it', () => {
    for (const file of [...FILES, 'src/services/learnMemory.ts']) {
      expect(stripComments(readFileSync(file, 'utf8')), file).not.toMatch(/standingFactMemory/);
    }
  });

  it('ONE board detector and ONE reset door: the story is renewed only by learnMemory.newGame()', () => {
    const mem = stripComments(readFileSync('src/services/learnMemory.ts', 'utf8'));
    const ng = mem.indexOf('newGame(): void {');
    expect(ng).toBeGreaterThan(0);
    expect(mem.slice(ng, mem.indexOf('\n    },', ng))).toContain('story.newGame(mintGameId())');
    expect(mem.match(/story\.newGame\(/g) ?? []).toHaveLength(1);
    for (const file of FILES) {
      const code = stripComments(readFileSync(file, 'utf8'));
      expect(code, `${file} renews the story itself — a second door`).not.toMatch(/story\.newGame\(/);
      expect(code, `${file} detects a new game from the full move — a second detector`).not.toMatch(/\.observe\(fullmoveOf|fullmoveOf\(/);
    }
  });

  it('the phase hook only READS what was said — the surface\'s door writes it', () => {
    const hook = stripComments(readFileSync('src/hooks/usePhaseNarration.ts', 'utf8'));
    expect(hook).toMatch(/getSaid: \(fen: string\) => ReadonlySet<string>;/);
    expect(hook).not.toMatch(/\.remember\(|said\.add\(|story\.(?:commit|offer)\(/);
  });

  it('the five compute-time writes the design names are gone (page :9474-9477, :9880, :9919, :11256; hook :459)', () => {
    const page = stripComments(readFileSync(FILES[0], 'utf8'));
    // :9474-9477 — the threat lane marks itself only inside its door-run mark.
    const threat = page.indexOf('const threatsSaid = ');
    expect(threat).toBeGreaterThan(0);
    const end = page.indexOf("for (const k of [tacticLine ? tacticKey : '', threatLine ? threatKey : ''])", threat);
    expect(end).toBeGreaterThan(threat);
    const threatBlock = page.slice(threat, end);
    const commits = threatBlock.match(/story\.commit\(/g) ?? [];
    const marks = threatBlock.match(/markThreatSaid = \(\) => \{\s*learnMemRef\.current\.story\.commit\(/g) ?? [];
    expect(commits.length).toBeGreaterThan(0);
    expect(marks.length, 'every threat write is the door-run mark, never the compute').toBe(commits.length);
    // …and so is its "spoken" event: fired at compute, a threat the door held
    // was counted as spoken on every turn it came back (it is no longer marked
    // said, so it comes back).
    let outsideMarks = threatBlock;
    for (let at = outsideMarks.indexOf('markThreatSaid = () => {'); at >= 0; at = outsideMarks.indexOf('markThreatSaid = () => {', at + 1)) {
      const open = outsideMarks.indexOf('{', at);
      let depth = 0;
      let close = open;
      for (; close < outsideMarks.length; close++) {
        if (outsideMarks[close] === '{') depth++;
        else if (outsideMarks[close] === '}' && --depth === 0) break;
      }
      outsideMarks = outsideMarks.slice(0, open + 1) + outsideMarks.slice(close);
    }
    expect((threatBlock.match(/captureEvent\('tactics_alert_spoken'/g) ?? []).length, 'the event rides the mark').toBeGreaterThan(0);
    expect(outsideMarks, 'the threat alert\'s spoken event fires only where the door spoke it').not.toMatch(/captureEvent\('tactics_alert_spoken'/);
    expect(page).toMatch(/if \(instantDecision\.spoke\.includes\('threat'\)\) \{\s*markThreatSaid\?\.\(\);/);
    // :9880 — the bishop pair is OFFERED with the point that says it.
    expect(page).toMatch(/if \(pairJustWon\) learnMemRef\.current\.story\.offer\(args\.fenAfterReply, \{ text: BISHOP_PAIR_POINT, claims: \[\.\.\.BISHOP_PAIR_CLAIMS\] \}\);/);
    // :11256 — the rule clause's principle is OFFERED, never committed at compute.
    expect(page).toMatch(/if \(pf\.principleSpoken && ruleClause\?\.text\) learnMemRef\.current\.story\.offer\(/);
    expect(page).not.toMatch(/pf\.principleSpoken\.split\('\|'\)\)[^;]*commit/);
  });
});

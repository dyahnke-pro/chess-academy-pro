/**
 * KID ISOLATION — the gate the kid non-negotiables promised and nobody wrote
 * (CLAUDE.md "Kids section — non-negotiables" #3 and #10; plan 2026-10-04
 * "Kids are unified too").
 *
 * Kids are a DECLARED surface (`SURFACE_CONTRACT.kid`), not an island — but the
 * adult coach's phrasing and the adult student model must never reach a child:
 *   #3  no kid file imports `getCoachChatResponse` (the adult chat entry, which
 *       carries the coach personality); the kid seam is `getKidLlmResponse` /
 *       `voiceFacts({ kidSafe })`;
 *   #10 kid mode never reads or writes coach state — so no `ConversationState`
 *       (the door's conversational memory), no weakness spine, no curriculum,
 *       and no direct `dispatchCoachTurn` (the adult door; when it learns the
 *       `kid` row it will be reached through the kid seam, never from here).
 *
 * Scanned by STATEMENT with comments stripped, so a comment that NAMES a banned
 * symbol (this repo explains its rules in comments) never trips it, and a real
 * use anywhere in code does — an import, a dynamic import, a type reference.
 * Test files are out of scope: a kid test mocks `getCoachChatResponse` to prove
 * it is NOT called, which is the opposite of a use.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const SRC = resolve(__dirname, '..');

/** A banned symbol or module, and why. */
interface Ban {
  readonly name: string;
  readonly re: RegExp;
  readonly why: string;
}

const KID_BANS: readonly Ban[] = [
  { name: 'getCoachChatResponse', re: /\bgetCoachChatResponse\b/, why: 'adult chat entry (coach personality) — kid #3; use getKidLlmResponse / voiceFacts({ kidSafe })' },
  { name: 'ConversationState', re: /\bConversationState\b/, why: 'the adult door\'s conversational memory — kid #10, kid memory is its own' },
  { name: 'weaknessSpine', re: /\bweaknessSpine\b/, why: 'the adult student model — kid #10' },
  { name: 'coachCurriculumService', re: /\bcoachCurriculumService\b/, why: 'the adult curriculum — kid #10' },
  { name: 'dispatchCoachTurn', re: /\bdispatchCoachTurn\b/, why: 'the adult question door — kid questions go through the kid seam' },
];

/** Strip block and line comments, keeping strings (a module path is a string). */
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') { out += n; i += 2; continue; }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i += 1; continue; }
    if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    if (c === '/' && n === '/') {
      const end = src.indexOf('\n', i);
      i = end === -1 ? src.length : end;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/** Every banned use in one file's source, as "line N: name". */
function kidViolations(src: string): string[] {
  const code = stripComments(src);
  const hits: string[] = [];
  code.split('\n').forEach((line, idx) => {
    for (const ban of KID_BANS) if (ban.re.test(line)) hits.push(`line ${idx + 1}: ${ban.name} (${ban.why})`);
  });
  return hits;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

/** Every kid production file: the whole `components/Kid/` tree, plus any
 *  service whose name is kid-shaped (`kidGameCoach`, `kidBoardAnswers`,
 *  `kidPuzzleService`, …). `KID` in an opening name (King's Indian) is not a
 *  kid file, so the service match is on a lowercase `kid` word start. */
function kidFiles(): string[] {
  const components = walk(join(SRC, 'components', 'Kid'));
  const services = walk(join(SRC, 'services')).filter((p) => /^kid[A-Z]/.test(basename(p)) || /[a-z]Kid[A-Z.]/.test(basename(p)));
  return [...components, ...services];
}

describe('kid isolation — no adult phrasing, no coach state', () => {
  const files = kidFiles();

  it('finds the kid files (non-vacuous)', () => {
    const names = files.map((f) => basename(f));
    expect(names).toContain('GuidedGamePage.tsx');
    expect(names).toContain('kidGameCoach.ts');
    expect(names).toContain('kidBoardAnswers.ts');
    expect(files.length).toBeGreaterThan(10);
  });

  it('no kid file uses a banned adult symbol', () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const hit of kidViolations(readFileSync(f, 'utf8'))) offenders.push(`${f.slice(SRC.length + 1)} ${hit}`);
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  // NEGATIVE CONTROLS — prove the scan would fail on a planted use, so a green
  // above is a measurement and not a broken regex.
  it('catches a planted import of every banned symbol', () => {
    const planted = [
      "import { getCoachChatResponse } from '../../services/coachApi';",
      "import type { ConversationState } from '../../coach/conversationState';",
      "import { getProfile } from '../../services/weaknessSpine';",
      "const m = await import('../services/coachCurriculumService');",
      "void dispatchCoachTurn(turn);",
    ];
    for (const line of planted) expect(kidViolations(line), line).toHaveLength(1);
  });

  it('ignores a banned symbol named only in a comment', () => {
    expect(kidViolations('// never call getCoachChatResponse here\nconst x = 1;')).toEqual([]);
    expect(kidViolations('/* ConversationState and weaknessSpine are banned */')).toEqual([]);
  });

  it('still sees a banned symbol on a line that ALSO has a comment', () => {
    expect(kidViolations('getCoachChatResponse(x); // oops')).toHaveLength(1);
  });

  it('a planted violation in a real kid file would fail the gate', () => {
    const guided = files.find((f) => basename(f) === 'GuidedGamePage.tsx')!;
    const src = readFileSync(guided, 'utf8') + "\nimport { getCoachChatResponse } from '../../services/coachApi';\n";
    expect(kidViolations(src).length).toBeGreaterThan(0);
  });
});

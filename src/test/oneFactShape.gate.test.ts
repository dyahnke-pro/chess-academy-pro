/**
 * 🔒 ONE FACT SHAPE (WO-STORY-MATRIX-01 P1-6, design
 * docs/plans/2026-10-30-story-matrix-phase1.md §P1-6). Every fact enters every
 * composer as the one fact, `CoachFact`. The older shapes still carry facts to
 * the doors through adapters — the live clause (`ClauseItem`), Learn's board
 * teaching (`TeachingHint`), the phase report (`PhaseFact`), the opening story's
 * beat (`StoryFact`) and Review's `"[tag] text"` facet string — and the
 * registry's `BoardRead` is gone (P1-6a: every board computer's read is a
 * `CoachFact`). This gate counts every construction of each, file by file,
 * against a SHRINK-ONLY baseline: a new one fails here (emit `CoachFact`), and
 * one deleted must leave the baseline in the same commit. It reaches zero at
 * P1-6e.
 *
 * A construction is read by the parser, never off a comment: an object literal
 * carrying the shape's own required keys, a string or template that starts with
 * a facet tag, or the `BoardRead` type named at all.
 *
 * A step that converts a producer lowers the baseline; the diff is the review:
 *   ONE_FACT_SHAPE_UPDATE=1 npx vitest run src/test/oneFactShape.gate.test.ts
 */
import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FACET_RANK } from '../services/reviewFacetRank';

const BASELINE_PATH = 'src/test/oneFactShape.baseline.json';
const UPDATE = process.env.ONE_FACT_SHAPE_UPDATE === '1';
type Counts = Record<string, Record<string, number>>;

/** The old shapes, each by the keys only it requires together. */
const LITERAL_SHAPES: Record<string, (keys: ReadonlySet<string>) => boolean> = {
  // `kind` + `rank` + `namesStudentMove`: a clause (its rank is its hand weight).
  ClauseItem: (k) => k.has('kind') && k.has('rank') && k.has('namesStudentMove'),
  // `lane` + `event` + `arrows`: a board-teaching hint.
  TeachingHint: (k) => k.has('lane') && k.has('event') && k.has('arrows'),
  // A phase fact: words, claims, proof and the move it names — with no kind,
  // lane, rank, id, seat or key (the shapes that carry those are the others:
  // a registry read hands its maker a key and a seat, never a phase fact).
  PhaseFact: (k) => ['text', 'claims', 'proof', 'namesStudentMove'].every((x) => k.has(x)) && !['kind', 'lane', 'rank', 'id', 'seat', 'key'].some((x) => k.has(x)),
  // `beat` + `claimKey`: a story beat.
  StoryFact: (k) => k.has('beat') && k.has('claimKey'),
};
const SHAPES = [...Object.keys(LITERAL_SHAPES), 'facet', 'BoardRead'] as const;

const FACET_TAGS: ReadonlySet<string> = new Set(Object.keys(FACET_RANK));
const leadTag = (t: string): string | null => /^\[([a-z][a-z0-9-]*)\] /.exec(t)?.[1] ?? null;
/** `"[tactic] Your knight …"` — a tag, then words (a bare `'[tactic] '` is a
 *  reader's prefix, not a facet). */
const isFacetLiteral = (t: string): boolean => { const g = leadTag(t); return !!g && FACET_TAGS.has(g) && /^\[[^\]]+\] \S/.test(t); };

/** Every construction of an old shape in one file's source. */
function scanShapes(code: string, file = 'x.ts'): Record<string, number[]> {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Record<string, number[]> = {};
  const hit = (shape: string, n: ts.Node): void => { (out[shape] ??= []).push(sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1); };
  const visit = (n: ts.Node): void => {
    if (ts.isObjectLiteralExpression(n)) {
      const keys = new Set(n.properties.flatMap((p) => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? [p.name.text] : [])));
      for (const [shape, match] of Object.entries(LITERAL_SHAPES)) if (match(keys)) hit(shape, n);
    }
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && isFacetLiteral(n.text)) hit('facet', n);
    if (ts.isTemplateExpression(n)) {
      const head = n.head.text;
      const first = n.templateSpans[0];
      // `[move-job] ${…}` — a tag in the head; or `[${f.kind}] ${…}` — the tag
      // is the fact's kind or a facet tag picked in the expression.
      const tagged = (() => { const g = leadTag(head); return !!g && FACET_TAGS.has(g); })();
      const dynamic = head === '[' && !!first && /^\] /.test(first.literal.text)
        && (/\b(kind|tag)\b/.test(first.expression.getText(sf)) || [...first.expression.getText(sf).matchAll(/'([a-z-]+)'/g)].some((m) => FACET_TAGS.has(m[1])));
      if (tagged || dynamic) hit('facet', n);
    }
    if ((ts.isTypeReferenceNode(n) && ts.isIdentifier(n.typeName) && n.typeName.text === 'BoardRead')
      || (ts.isInterfaceDeclaration(n) && n.name.text === 'BoardRead')) hit('BoardRead', n);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'test') out.push(...sources(p)); continue; }
    if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

function countNow(): Counts {
  const counts: Counts = Object.fromEntries(SHAPES.map((s) => [s, {}]));
  for (const file of sources('src')) {
    for (const [shape, lines] of Object.entries(scanShapes(readFileSync(file, 'utf8'), file))) counts[shape][file] = lines.length;
  }
  return counts;
}

describe('one fact shape (WO-STORY-MATRIX-01 P1-6)', () => {
  it('the scanner sees each old shape, and never a comment (negative control)', () => {
    const planted = [
      "clauses.push({ namesStudentMove: NAMES_NO_MOVE, kind: 'tactic', rank: 80, text: t });",
      "out.push({ lane: 'movePoint', namesStudentMove: n, text: t, event: null, arrows: [] });",
      'const p: PhaseFact[] = [{ text: t, claims: [], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE }];',
      "out.push({ beat: 'identity', text: t, squares: [], proof: p, claimKey: k });",
      "facets.push('[forced] From here it is a forced checking run to mate.');",
      'facets.push(`[last-here] ${here.text}`);',
      'const raw = `[${f.kind}] ${f.text}`;',
      "const f = `[${positive ? 'praise' : 'quality'}] ${line}`;",
      'function f(r: BoardRead): void {}',
      // Not constructions: a comment, a reader's prefix, a log line, a fact.
      "// clauses.push({ kind: 'tactic', rank: 80, namesStudentMove: n });",
      "if (f.startsWith('[principle] ')) return;",
      'const subject = `[${subjectMap[category]}] Chess Academy Pro`;',
      "const fact = { id, kind: 'tactic', text: t, claims: [], proof: p, namesStudentMove: false };",
      "return fact({ key, claims: [key], text: t, proof: p, squares: [], stakes: null, seat: 'student', namesStudentMove: false, thread: LOCAL_THREAD, fen });",
    ].join('\n');
    const found = scanShapes(planted);
    expect(Object.fromEntries(Object.entries(found).map(([s, l]) => [s, l.length]))).toEqual({
      ClauseItem: 1, TeachingHint: 1, PhaseFact: 1, StoryFact: 1, facet: 4, BoardRead: 1,
    });
  });

  const now = countNow();
  if (UPDATE) writeFileSync(BASELINE_PATH, `${JSON.stringify(Object.fromEntries(Object.entries(now).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))])), null, 2)}\n`);
  const BASELINE = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Counts;

  it('not vacuous: the scanner still sees the backlog it was built on', () => {
    // The adapters' producers are all still here until P1-6e; a scan that finds
    // none of them has stopped reading the code.
    const total = (c: Counts): number => Object.values(c).reduce((a, m) => a + Object.values(m).reduce((x, y) => x + y, 0), 0);
    expect(total(BASELINE)).toBeGreaterThan(0);
    expect(total(now)).toBeGreaterThan(0);
  });

  for (const shape of SHAPES) {
    it(`no new ${shape} — a producer emits CoachFact`, () => {
      const grew = Object.entries(now[shape]).filter(([f, n]) => n > (BASELINE[shape]?.[f] ?? 0)).map(([f, n]) => `${f}: ${BASELINE[shape]?.[f] ?? 0} → ${n}`);
      expect(grew, `a new ${shape} construction — emit the one fact (\`CoachFact\`, coachFact.ts) instead`).toEqual([]);
    });
    it(`the ${shape} baseline only shrinks — a removed site leaves it in the same commit`, () => {
      const shrank = Object.entries(BASELINE[shape] ?? {}).filter(([f, n]) => (now[shape][f] ?? 0) < n).map(([f, n]) => `${f}: ${n} → ${now[shape][f] ?? 0}`);
      expect(shrank, `lower ${BASELINE_PATH} to the new count`).toEqual([]);
    });
  }
});

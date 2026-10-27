// Remove the hand-written narration bound to sublines whose moves changed
// (WO-COURSE-01 C). A narration's beats are written move by move for ONE line;
// once the repair rebuilt that line from its first bad student ply, the old
// beats describe moves that are no longer there. Deleting the binding drops the
// line back to its honest baseline (frequency + structure) until it is written
// again — never a narration that talks about another line.
//
// Narration objects are SHARED across sublines (`'ruy-lopez::0::Nf6@5':
// RUY_NF6_BC5` serves five variations), so only the repaired key's PROPERTY is
// removed; a narration const nothing points to any more is deleted with it.
//
// Usage: node scripts/course-replies/retire-subline-narration.mjs [--write]
//   KEYS_FILE=<json array of keys> retires those keys instead of the repair
//   report's (sublines DELETED as orphans, not rebuilt).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

const root = new URL('../..', import.meta.url).pathname;
const WRITE = process.argv.includes('--write');
// Every rebuilt line loses its narration: the intro speaks about the whole
// line, so even beats before the cut sit under an intro about the old moves.
const retiring = new Set(process.env.KEYS_FILE
  ? JSON.parse(readFileSync(process.env.KEYS_FILE, 'utf8'))
  : JSON.parse(readFileSync(root + 'audit-reports/subline-repair.json', 'utf8')).repaired.map((r) => r.key));

const dir = root + 'src/data/lessons/';
const files = readdirSync(dir).filter((f) => /^sublineNarration.*\.ts$/.test(f) && !f.endsWith('.test.ts'));
let removed = 0;
for (const f of files) {
  const path = dir + f;
  let text = readFileSync(path, 'utf8');
  const src = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true);
  // Narration consts in this file: name → object literal (to read beat plies).
  const consts = new Map();
  const visitConst = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && ts.isObjectLiteralExpression(n.initializer)) consts.set(n.name.text, n.initializer);
    ts.forEachChild(n, visitConst);
  };
  visitConst(src);
  const cuts = [];
  const visit = (n) => {
    if (ts.isPropertyAssignment(n) && ts.isStringLiteral(n.name) && retiring.has(n.name.text)) {
      let end = n.getEnd();
      const comma = /^\s*,/.exec(text.slice(end));
      if (comma) end += comma[0].length;
      cuts.push([n.getFullStart(), end]);
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
  if (!cuts.length) continue;
  cuts.sort((x, y) => y[0] - x[0]);
  for (const [s, e] of cuts) text = text.slice(0, s) + text.slice(e);
  removed += cuts.length;
  // Delete a narration const nothing references any more: re-parse the edited
  // text, and drop a NON-exported declaration whose name appears nowhere else
  // in the file (exported ones may be read by other files — left alone).
  for (let pass = 0; pass < 3; pass++) {
    const after = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true);
    const drops = [];
    for (const st of after.statements) {
      if (!ts.isVariableStatement(st)) continue;
      if (st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
      for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || !d.initializer || !(ts.isObjectLiteralExpression(d.initializer) || ts.isArrayLiteralExpression(d.initializer) || ts.isStringLiteral(d.initializer))) continue;
        const name = d.name.text;
        const uses = (text.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
        if (uses === 1 && st.declarationList.declarations.length === 1) drops.push([st.getFullStart(), st.getEnd()]);
      }
    }
    if (!drops.length) break;
    drops.sort((x, y) => y[0] - x[0]);
    for (const [s0, e0] of drops) text = text.slice(0, s0) + text.slice(e0);
  }
  if (WRITE) writeFileSync(path, text);
  console.log(`${f}: ${cuts.length} bindings removed`);
}
console.log(`[retire] ${removed} narration bindings removed${WRITE ? '' : ' (dry run)'}`);

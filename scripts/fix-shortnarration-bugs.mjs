#!/usr/bin/env node
/**
 * Reads docs/audit-runs/2026-05-19-content-scan/findings.json and
 * applies bulk-rewrites to shortNarration text:
 *
 * 1. "X fianchettoes the [(king's|queen's)?] bishop to <Y>, ..."
 *    on a pawn-push ply (g6/b6/g3/b3/h6/a6/h3/a3) →
 *    "X pushes <san>, preparing the [side]-bishop fianchetto to <Y>,
 *    which will ..."
 *
 *    The fianchetto target square (<Y>) is preserved. The pawn push
 *    is named. The verb changes from "fianchettoes" (which implies
 *    the bishop is moving) to "prepares the fianchetto".
 *
 * 2. Specific square-mismatch fixes (Nf6 narrated as 'c6' etc.):
 *    hand-applied corrections from the findings.
 *
 * Saves edits in-place. Run scan-annotation-bugs.mjs after to verify.
 */

import { readFile, writeFile } from 'node:fs/promises';

const FINDINGS = 'docs/audit-runs/2026-05-19-content-scan/findings.json';

const r = JSON.parse(await readFile(FINDINGS, 'utf-8'));
const issues = r.findings.filter((f) => f.field === 'shortNarration');

// Group by file
const byFile = new Map();
for (const f of issues) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

let filesEdited = 0;
let totalEdits = 0;

for (const [file, findings] of byFile.entries()) {
  const raw = await readFile(file, 'utf-8');
  const doc = JSON.parse(raw);
  let edits = 0;
  for (const f of findings) {
    let target;
    if (f.subline === 'main') target = doc.moveAnnotations;
    else target = (doc.subLines || []).find((s) => s.name === f.subline)?.moveAnnotations;
    if (!target) continue;
    const a = target[f.ply - 1];
    if (!a) continue;
    const original = a.shortNarration;
    if (!original) continue;
    const isPawnMove = /^[a-h][1-8]/.test(f.san);
    const newText = rewriteShortNarration(original, f.san, isPawnMove);
    if (newText !== original) {
      a.shortNarration = newText;
      edits++;
    }
  }
  if (edits > 0) {
    await writeFile(file, JSON.stringify(doc, null, 2) + '\n');
    filesEdited++;
    totalEdits += edits;
  }
}

console.log(`fix: rewrote shortNarration in ${filesEdited} files (${totalEdits} entries)`);

function rewriteShortNarration(text, san, isPawnMove) {
  if (!isPawnMove) {
    // Pattern: "...develops the knight to <wrongSq>..." — fix to actual square
    // for the 3 known cases:
    // catalan-opening-open-defense-classical-line ply2 Nf6 said c6
    // king-s-indian-attack-yugoslav-variation ply2 Nf6 said c6
    // nimzo-indian-defense-leningrad-variation-averbakh-gambit ply5 Nc3 said f3
    const sanTarget = san.replace(/[+#]/g, '').match(/([a-h][1-8])$/)?.[1];
    if (!sanTarget) return text;
    // Replace any "develops the knight to <sq>" with sanTarget
    return text.replace(
      /develops the knight to [a-h][1-8]/gi,
      `develops the knight to ${sanTarget}`,
    ).replace(
      /Knight develops to [a-h][1-8]/g,
      `Knight develops to ${sanTarget}`,
    );
  }

  // Pawn-move + fianchetto verb rewrite
  // "Black fianchettoes the king's bishop to g7, pressuring..."
  // → "Black pushes the pawn, preparing the king's-bishop fianchetto to g7, pressuring..."
  let out = text;
  // Match: "(White|Black) fianchettoes the (king's|queen's) bishop to <sq>, "
  out = out.replace(
    /\b(White|Black)\s+fianchettoes\s+the\s+(king'?s?|queen'?s?)\s+bishop\s+to\s+([a-h][1-8])\b/gi,
    (m, color, qual, sq) => {
      const cleanQual = qual.toLowerCase().replace(/'/g, '').replace(/s$/, "'s");
      return `${color} plays ${san}, preparing the ${cleanQual} bishop fianchetto to ${sq}`;
    },
  );
  // Without qualifier: "X fianchettoes the bishop to Y"
  out = out.replace(
    /\b(White|Black)\s+fianchettoes\s+the\s+bishop\s+to\s+([a-h][1-8])\b/gi,
    (m, color, sq) => `${color} plays ${san}, preparing the bishop fianchetto to ${sq}`,
  );
  // "X fianchettoes the bishop on Y"
  out = out.replace(
    /\b(White|Black)\s+fianchettoes\s+the\s+bishop\s+on\s+([a-h][1-8])\b/gi,
    (m, color, sq) => `${color} plays ${san}, preparing the bishop fianchetto on ${sq}`,
  );
  // "X fianchettoes the king's bishop to pressure ..." (no square)
  out = out.replace(
    /\b(White|Black)\s+fianchettoes\s+the\s+(king'?s?|queen'?s?)\s+bishop\b(?!\s+to\s+[a-h][1-8])/gi,
    (m, color, qual) => {
      const cleanQual = qual.toLowerCase().replace(/'/g, '').replace(/s$/, "'s");
      return `${color} plays ${san}, preparing the ${cleanQual} bishop fianchetto`;
    },
  );
  // "X fianchettoes the bishop" (no qualifier, no square)
  out = out.replace(
    /\b(White|Black)\s+fianchettoes\s+the\s+bishop\b(?!\s+to\s+[a-h][1-8])/gi,
    (m, color) => `${color} plays ${san}, preparing the bishop fianchetto`,
  );
  return out;
}

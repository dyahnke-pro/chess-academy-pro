#!/usr/bin/env node
/**
 * Applies a minimal-loss fix for PGN-vs-annotation drift bugs found
 * in non-pro openings. For each drift case, TRUNCATES the
 * annotation moveAnnotations array at the divergence ply so the
 * student gets correct narration up to the divergence and silence
 * (LLM-enriched at runtime) beyond. Better than wrong content.
 *
 * Preserves the truncated tail under a new subLine named
 * "<original> (legacy tail)" so the curated content isn't deleted —
 * a future curator can re-promote it.
 *
 * Reads docs/audit-runs/2026-05-19-content-scan/pgn-drift-findings.json
 */

import { readFile, writeFile } from 'node:fs/promises';

const FINDINGS = 'docs/audit-runs/2026-05-19-content-scan/pgn-drift-findings.json';

const r = JSON.parse(await readFile(FINDINGS, 'utf-8'));
const drifts = r.findings.filter(
  (f) => f.kind === 'main-pgn-vs-anno-drift' || f.kind === 'variation-pgn-vs-anno-drift',
);
console.log(`fix: ${drifts.length} drift cases`);

// Group by annoFile
const byFile = new Map();
for (const f of drifts) {
  if (!byFile.has(f.annoFile)) byFile.set(f.annoFile, []);
  byFile.get(f.annoFile).push(f);
}

let totalEdits = 0;

for (const [file, fileFindings] of byFile.entries()) {
  const doc = JSON.parse(await readFile(file, 'utf-8'));
  let edits = 0;
  for (const f of fileFindings) {
    let target;
    let parent;
    if (f.kind === 'main-pgn-vs-anno-drift') {
      target = doc.moveAnnotations;
      parent = doc;
    } else {
      const sub = (doc.subLines || []).find((s) => s.name === f.variationName);
      if (!sub) continue;
      target = sub.moveAnnotations;
      parent = sub;
    }
    if (!Array.isArray(target)) continue;
    const divergeIdx = f.ply - 1; // ply 6 drift -> truncate at index 5 keep idx 0..4
    if (divergeIdx >= target.length) continue;

    // Preserve the truncated tail as a legacy subLine if it has
    // non-empty annotations
    const tail = target.slice(divergeIdx);
    const hasContent = tail.some((a) => (a.annotation && a.annotation.trim()) || (a.shortNarration && a.shortNarration.trim()));
    if (hasContent) {
      const legacyName = (parent.name || 'main') + ' (legacy tail)';
      // Reconstruct the legacy subLine: prefix (matching plies) +
      // the divergent tail
      const prefix = target.slice(0, divergeIdx);
      doc.subLines = doc.subLines || [];
      doc.subLines.push({
        name: legacyName,
        type: 'archive',
        moveAnnotations: [...prefix, ...tail],
      });
    }

    // Truncate to the matching prefix
    parent.moveAnnotations = target.slice(0, divergeIdx);
    edits++;
    console.log(`  truncated ${file.split('/').pop()} :: ${f.variationName || 'main'} at ply ${f.ply} (drift ${f.pgnSan} vs ${f.annoSan})`);
  }
  if (edits > 0) {
    await writeFile(file, JSON.stringify(doc, null, 2) + '\n');
    totalEdits += edits;
  }
}

console.log(`fix: ${totalEdits} annotation arrays truncated at divergence`);

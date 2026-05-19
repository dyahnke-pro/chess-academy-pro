#!/usr/bin/env node
/**
 * Reads docs/audit-runs/2026-05-19-content-scan/findings.json and for
 * every arrow-target-missing finding, adds a green "move" arrow
 * from the from-square to the SAN target. Existing arrows are
 * preserved (they show plans / threats / follow-ups).
 *
 * Uses chess.js to compute the from-square deterministically by
 * replaying the subline's PGN from the start.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { Chess } from 'chess.js';

const FINDINGS = 'docs/audit-runs/2026-05-19-content-scan/findings.json';
const GREEN_ARROW_COLOR = 'rgba(0, 180, 80, 0.8)';

const r = JSON.parse(await readFile(FINDINGS, 'utf-8'));
const arrowMisses = r.findings.filter((f) => f.kind === 'arrow-target-missing');
console.log(`fix: ${arrowMisses.length} arrow-target-missing findings`);

// Group by file so we can edit each file in one pass
const byFile = new Map();
for (const f of arrowMisses) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

for (const [file, findings] of byFile.entries()) {
  const raw = await readFile(file, 'utf-8');
  const doc = JSON.parse(raw);
  let edits = 0;
  for (const f of findings) {
    let target;
    if (f.subline === 'main') target = doc.moveAnnotations;
    else target = (doc.subLines || []).find((s) => s.name === f.subline)?.moveAnnotations;
    if (!target) {
      console.warn(`  skip ${file} :: ${f.subline} (subline not found)`);
      continue;
    }
    // Replay PGN to find the from-square for this ply
    const chess = new Chess();
    let fromSquare = null;
    for (let i = 0; i <= f.ply - 1; i++) {
      const a = target[i];
      if (!a?.san) break;
      try {
        const move = chess.move(a.san);
        if (i === f.ply - 1) {
          fromSquare = move.from;
        }
      } catch (e) {
        console.warn(`  ${file} :: ${f.subline} ply ${i+1}: ${a.san} — chess.js rejected: ${e.message}`);
        break;
      }
    }
    if (!fromSquare) {
      console.warn(`  ${file} :: ${f.subline} ply ${f.ply}: could not resolve from-square`);
      continue;
    }
    const targetSquare = f.expectedSquare;
    const a = target[f.ply - 1];
    // Add green move arrow as the FIRST arrow (preserved alongside existing)
    const newArrow = { from: fromSquare, to: targetSquare, color: GREEN_ARROW_COLOR };
    a.arrows = [newArrow, ...(a.arrows || [])];
    console.log(`  fixed ${file.split('/').pop()} :: ${f.subline} ply ${f.ply} ${a.san}: added ${fromSquare}->${targetSquare} green`);
    edits++;
  }
  if (edits > 0) {
    await writeFile(file, JSON.stringify(doc, null, 2) + '\n');
    console.log(`  wrote ${file} (${edits} edits)`);
  }
}
console.log('done');

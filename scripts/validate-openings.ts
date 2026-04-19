/**
 * validate-openings.ts — one-off content audit.
 *
 * Run: `npx tsx scripts/validate-openings.ts`
 *
 * Checks every opening annotation file against the Lichess opening
 * database for:
 *   1. Missing opening match (annotation ID doesn't resolve to an
 *      opening with a PGN).
 *   2. SAN drift — the annotation's move SANs don't match the
 *      opening's canonical PGN.
 *   3. Illegal moves — chess.js rejects a SAN during playback.
 *
 * Narration quality (tone, factual claims about squares) is out of
 * scope — that needs an LLM-graded pass or human review.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

interface Opening {
  eco: string;
  name: string;
  pgn: string;
}

interface MoveAnnotation {
  san: string;
  annotation: string;
}

interface AnnotationFile {
  openingId: string;
  moveAnnotations?: MoveAnnotation[];
  moveAnalyses?: MoveAnnotation[];
}

const ROOT = '/home/user/chess-academy-pro';
const OPENINGS_PATH = `${ROOT}/src/data/openings-lichess.json`;
const ANNOTATIONS_DIR = `${ROOT}/src/data/annotations`;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[':,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function tokenizePgn(pgn: string): string[] {
  return pgn.replace(/\d+\./g, '').split(/\s+/).filter(Boolean);
}

function main(): void {
  const openingsRaw = readFileSync(OPENINGS_PATH, 'utf-8');
  const openings: Opening[] = JSON.parse(openingsRaw);

  // Build a lookup by slugified name so annotation IDs can resolve.
  const byId = new Map<string, Opening>();
  for (const o of openings) {
    byId.set(slugify(o.name), o);
  }

  const annotationFiles = readdirSync(ANNOTATIONS_DIR).filter((f) => f.endsWith('.json'));

  const issues: {
    missingOpening: string[];
    sanDrift: { file: string; expected: string; got: string; moveIdx: number }[];
    illegalMove: { file: string; san: string; moveIdx: number; reason: string }[];
    pgnIllegal: { file: string; pgn: string; san: string; moveIdx: number }[];
    incompleteAnnotation: { file: string; pgnMoves: number; annotatedMoves: number }[];
  } = {
    missingOpening: [],
    sanDrift: [],
    illegalMove: [],
    pgnIllegal: [],
    incompleteAnnotation: [],
  };

  let validated = 0;

  for (const fname of annotationFiles) {
    const path = join(ANNOTATIONS_DIR, fname);
    let data: AnnotationFile;
    try {
      data = JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
      issues.missingOpening.push(`${fname}: JSON parse failed — ${(err as Error).message}`);
      continue;
    }

    const opening = byId.get(data.openingId);
    if (!opening) {
      issues.missingOpening.push(`${fname}: no opening for id "${data.openingId}"`);
      continue;
    }

    const pgnTokens = tokenizePgn(opening.pgn);
    const annotations = data.moveAnnotations ?? data.moveAnalyses ?? [];

    // Check annotations align with PGN sans
    const minLen = Math.min(pgnTokens.length, annotations.length);
    for (let i = 0; i < minLen; i++) {
      if (pgnTokens[i] !== annotations[i].san) {
        issues.sanDrift.push({
          file: fname,
          expected: pgnTokens[i],
          got: annotations[i].san,
          moveIdx: i,
        });
      }
    }

    if (annotations.length < pgnTokens.length) {
      issues.incompleteAnnotation.push({
        file: fname,
        pgnMoves: pgnTokens.length,
        annotatedMoves: annotations.length,
      });
    }

    // Legality check: replay the PGN through chess.js
    const chess = new Chess();
    for (let i = 0; i < pgnTokens.length; i++) {
      const san = pgnTokens[i];
      try {
        const m = chess.move(san);
        if (!m) {
          issues.pgnIllegal.push({ file: fname, pgn: opening.pgn, san, moveIdx: i });
          break;
        }
      } catch (err) {
        issues.pgnIllegal.push({
          file: fname,
          pgn: opening.pgn,
          san: `${san} (threw: ${(err as Error).message})`,
          moveIdx: i,
        });
        break;
      }
    }

    // Separately validate the annotation SANs as a sanity check
    // (catches SAN in annotations that isn't even legal chess).
    const chess2 = new Chess();
    for (let i = 0; i < annotations.length; i++) {
      const san = annotations[i].san;
      try {
        const m = chess2.move(san);
        if (!m) {
          issues.illegalMove.push({
            file: fname,
            san,
            moveIdx: i,
            reason: 'move returned null (illegal in current position)',
          });
          break;
        }
      } catch (err) {
        issues.illegalMove.push({
          file: fname,
          san,
          moveIdx: i,
          reason: (err as Error).message,
        });
        break;
      }
    }

    validated += 1;
  }

  // Report
  console.log(`\n=== OPENING CONTENT AUDIT ===\n`);
  console.log(`Validated: ${validated} / ${annotationFiles.length} annotation files`);
  console.log(`Openings in index: ${openings.length}\n`);

  console.log(`Missing opening lookups: ${issues.missingOpening.length}`);
  for (const msg of issues.missingOpening.slice(0, 20)) console.log(`  - ${msg}`);
  if (issues.missingOpening.length > 20) {
    console.log(`  ... and ${issues.missingOpening.length - 20} more`);
  }

  console.log(`\nSAN drift (annotation san != PGN san): ${issues.sanDrift.length}`);
  for (const i of issues.sanDrift.slice(0, 20)) {
    console.log(`  - ${i.file} move[${i.moveIdx}]: expected ${i.expected}, got ${i.got}`);
  }
  if (issues.sanDrift.length > 20) {
    console.log(`  ... and ${issues.sanDrift.length - 20} more`);
  }

  console.log(`\nIllegal moves in annotations: ${issues.illegalMove.length}`);
  for (const i of issues.illegalMove.slice(0, 20)) {
    console.log(`  - ${i.file} move[${i.moveIdx}] "${i.san}": ${i.reason}`);
  }
  if (issues.illegalMove.length > 20) {
    console.log(`  ... and ${issues.illegalMove.length - 20} more`);
  }

  console.log(`\nIllegal moves in opening PGNs: ${issues.pgnIllegal.length}`);
  for (const i of issues.pgnIllegal.slice(0, 20)) {
    console.log(`  - ${i.file} move[${i.moveIdx}] "${i.san}" in PGN "${i.pgn}"`);
  }
  if (issues.pgnIllegal.length > 20) {
    console.log(`  ... and ${issues.pgnIllegal.length - 20} more`);
  }

  console.log(`\nIncomplete annotations (PGN has more moves than annotated): ${issues.incompleteAnnotation.length}`);
  for (const i of issues.incompleteAnnotation.slice(0, 10)) {
    console.log(`  - ${i.file}: ${i.annotatedMoves}/${i.pgnMoves} moves annotated`);
  }

  console.log(`\n=== END AUDIT ===\n`);
}

main();

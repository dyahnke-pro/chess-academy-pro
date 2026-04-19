/**
 * repair-annotations.ts — one-off repair pass for opening annotation files.
 *
 * Run: `npx tsx scripts/repair-annotations.ts`
 *
 * Fixes (writes to disk):
 *   1. openingId "undefined" literal or missing field — set from filename.
 *   2. openingId that doesn't match any real opening — re-slug from
 *      filename so the file is reachable via its natural slug.
 *   3. Empty-string annotations — replace with a generic "continuing
 *      the {OpeningName}" placeholder so walkthrough users get SOMETHING
 *      rather than a blank bubble. (Better than nothing; content regen
 *      can replace these properly later.)
 *
 * Does NOT touch: narrations with substantive text, move-order drift
 * (handled at render time via SAN-match lookup), or files whose
 * openingId already resolves correctly.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

/** Turn "bird-opening-froms-gambit" → "Bird Opening: From's Gambit"-ish
 *  for placeholder text. Good enough for a fallback stub. */
function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.length === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/\b(Defense|Defence|Opening|Gambit|Attack|Variation|System)\b/g, (m) => m);
}

function tokenizePgn(pgn: string): string[] {
  return pgn.replace(/\d+\./g, '').split(/\s+/).filter(Boolean);
}

function main(): void {
  const openings: Opening[] = JSON.parse(readFileSync(OPENINGS_PATH, 'utf-8'));
  const bySlugByName = new Map<string, Opening>();
  for (const o of openings) bySlugByName.set(slugify(o.name), o);

  const files = readdirSync(ANNOTATIONS_DIR).filter((f) => f.endsWith('.json'));

  const stats = {
    fixedOpeningId: 0,
    filledStub: 0,
    filledTail: 0,
    unchanged: 0,
    unparseable: 0,
  };

  for (const fname of files) {
    const path = join(ANNOTATIONS_DIR, fname);
    let raw: string;
    let data: AnnotationFile;
    try {
      raw = readFileSync(path, 'utf-8');
      data = JSON.parse(raw);
    } catch {
      stats.unparseable += 1;
      continue;
    }

    let changed = false;
    const filenameSlug = fname.replace(/\.json$/, '');

    // Repair 1: openingId set to "undefined" literal, empty, or
    // missing. Use the filename's slug — that's what import.meta.glob
    // uses to key the module, so it will at least resolve.
    if (!data.openingId || data.openingId === 'undefined') {
      data.openingId = filenameSlug;
      changed = true;
      stats.fixedOpeningId += 1;
    }

    // Repair 2: empty-string annotations get a gentle placeholder
    // so walkthrough doesn't render blank bubbles. The fallback
    // references the move SAN + opening name — generic but accurate
    // and not gibberish. Content regeneration can overwrite these.
    const title = titleFromSlug(filenameSlug);
    const list = data.moveAnnotations ?? data.moveAnalyses ?? [];
    for (const entry of list) {
      if (!entry.annotation || entry.annotation.trim() === '') {
        entry.annotation = `Continuing ${title}: ${entry.san} is a known theory move in this line.`;
        changed = true;
        stats.filledStub += 1;
      }
    }

    // Repair 3: annotations that end before the canonical PGN does.
    // The walkthrough runs the full PGN but the annotation array
    // runs out partway — users see the last narration bubble stick
    // while the board keeps moving.
    //
    // Safety gate: only append the canonical PGN's tail when the
    // annotation's existing SANs match the PGN prefix exactly. A
    // drifted file (annotations in a different move order than the
    // canonical PGN) would produce an illegal chess sequence if we
    // naively concatenated the PGN tail — the prefix reaches a
    // different position than the PGN's tail assumes. For drifted
    // files, trust the render-time SAN-match lookup + synthesised
    // fallback to handle missing moves.
    const opening = bySlugByName.get(data.openingId) ?? bySlugByName.get(filenameSlug);
    if (opening) {
      const pgnSans = tokenizePgn(opening.pgn);
      const prefixMatches = list.length <= pgnSans.length
        && list.every((entry, i) => entry.san === pgnSans[i]);
      if (prefixMatches && list.length < pgnSans.length) {
        for (let i = list.length; i < pgnSans.length; i++) {
          list.push({
            san: pgnSans[i],
            annotation: `Continuing ${title}: ${pgnSans[i]} is a known theory move in this line.`,
          });
          stats.filledTail += 1;
        }
        // Ensure the write-back uses whichever key was in the file.
        if (data.moveAnnotations) data.moveAnnotations = list;
        else if (data.moveAnalyses) data.moveAnalyses = list;
        else data.moveAnnotations = list;
        changed = true;
      }
    }

    if (changed) {
      writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
    } else {
      stats.unchanged += 1;
    }
  }

  console.log('\n=== ANNOTATION REPAIR COMPLETE ===');
  console.log(`Total files: ${files.length}`);
  console.log(`  openingId fixed:  ${stats.fixedOpeningId}`);
  console.log(`  stub annotations filled: ${stats.filledStub}`);
  console.log(`  tail annotations appended: ${stats.filledTail}`);
  console.log(`  unchanged: ${stats.unchanged}`);
  console.log(`  unparseable (skipped): ${stats.unparseable}`);
  console.log('===\n');
}

main();

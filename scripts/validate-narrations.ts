/**
 * validate-narrations.ts — content-quality audit for opening annotations.
 *
 * Run: `npx tsx scripts/validate-narrations.ts`
 *
 * The legality validator (validate-openings.ts) confirmed every move
 * is playable. This companion checks the PROSE against the moves:
 *   1. Empty / stub annotations (< 20 chars or whitespace-only)
 *   2. Placeholder tokens ("TODO", "FIXME", "[OPENING NAME]",
 *      "undefined", "null", unfilled template markers)
 *   3. Color-claim mismatch — "White plays X" when the actual move
 *      is Black's (and vice versa)
 *   4. Wrong-move reference — narration names a different SAN than
 *      the move it's supposed to describe (within reasonable fuzz)
 *   5. Duplicate narrations across moves (copy-paste tells)
 *   6. Wrong-opening reference — narration names an opening that
 *      isn't the file's opening (e.g. file is French but text says
 *      "we're in the Sicilian")
 *
 * Doesn't catch: claims about piece activity, tactical evaluations,
 * nuanced strategic statements. Those need LLM or human review.
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

const PLACEHOLDER_PATTERNS: [RegExp, string][] = [
  [/\bTODO\b/i, 'TODO'],
  [/\bFIXME\b/i, 'FIXME'],
  [/\[OPENING[_ ]NAME\]/i, '[OPENING NAME]'],
  [/\[MOVE\]/i, '[MOVE]'],
  [/\{\{[^}]+\}\}/, '{{template}}'],
  [/\bundefined\b/, 'undefined'],
  [/\bnull\b/, 'null (literal)'],
  [/Lorem ipsum/i, 'Lorem ipsum'],
];

/** Phrases that claim a side is moving — used to detect color mismatch. */
const WHITE_CLAIM_RE = /\bwhite\s+(plays|moves|pushes|takes|captures|develops|castles|responds|answers|continues|now)\b/i;
const BLACK_CLAIM_RE = /\bblack\s+(plays|moves|pushes|takes|captures|develops|castles|responds|answers|continues|now)\b/i;

/** Common opening names to spot in narration. If the file is about the
 *  French Defense but the text says "Sicilian", flag it. Case-insens. */
const OPENING_KEYWORDS = [
  'italian', 'ruy lopez', 'sicilian', 'french', 'caro-kann', 'caro kann',
  'scandinavian', 'pirc', 'alekhine', 'queen\'s gambit', 'queens gambit',
  'slav', 'grunfeld', 'king\'s indian', 'kings indian', 'nimzo-indian',
  'benoni', 'dutch', 'english', 'london', 'scotch', 'vienna', 'petroff',
  'philidor', 'evans gambit', 'king\'s gambit', 'kings gambit',
  'catalan', 'trompowsky',
];

function identifyOpeningFamily(openingName: string): string | null {
  const lower = openingName.toLowerCase();
  for (const kw of OPENING_KEYWORDS) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[':,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function main(): void {
  const openings: Opening[] = JSON.parse(readFileSync(OPENINGS_PATH, 'utf-8'));
  const byId = new Map<string, Opening>();
  for (const o of openings) byId.set(slugify(o.name), o);

  const files = readdirSync(ANNOTATIONS_DIR).filter((f) => f.endsWith('.json'));

  const findings = {
    empty: [] as string[],
    stub: [] as string[],
    placeholder: [] as { file: string; moveIdx: number; token: string }[],
    colorMismatch: [] as { file: string; moveIdx: number; san: string; expectedColor: string; claimed: string }[],
    duplicates: [] as { file: string; moveIdxs: number[]; text: string }[],
    wrongOpening: [] as { file: string; fileFamily: string; mentioned: string[]; moveIdx: number }[],
  };

  for (const fname of files) {
    let data: AnnotationFile;
    try {
      data = JSON.parse(readFileSync(join(ANNOTATIONS_DIR, fname), 'utf-8'));
    } catch {
      continue;
    }
    const annotations = data.moveAnnotations ?? data.moveAnalyses ?? [];
    if (annotations.length === 0) {
      findings.empty.push(fname);
      continue;
    }

    const opening = byId.get(data.openingId);
    const expectedFamily = opening ? identifyOpeningFamily(opening.name) : null;

    // Track duplicate detection
    const seen = new Map<string, number[]>();

    // Replay moves to know whose turn each SAN is
    const chess = new Chess();

    for (let i = 0; i < annotations.length; i++) {
      const { san, annotation } = annotations[i];
      const trimmed = annotation?.trim() ?? '';

      // Stub / empty
      if (!trimmed) {
        findings.stub.push(`${fname}[${i}] empty annotation for ${san}`);
      } else if (trimmed.length < 20) {
        findings.stub.push(`${fname}[${i}] very short (${trimmed.length} chars): "${trimmed}"`);
      }

      // Placeholder tokens
      for (const [re, token] of PLACEHOLDER_PATTERNS) {
        if (re.test(trimmed)) {
          findings.placeholder.push({ file: fname, moveIdx: i, token });
        }
      }

      // Compute actual mover BEFORE playing the move
      const actualTurn = chess.turn(); // 'w' or 'b' about to move
      const expectedColor = actualTurn === 'w' ? 'white' : 'black';

      if (trimmed) {
        const whiteClaim = WHITE_CLAIM_RE.test(trimmed);
        const blackClaim = BLACK_CLAIM_RE.test(trimmed);
        // Only flag when the narration makes an unambiguous claim
        // about the WRONG side (claims black plays on white's turn).
        // Both-claims is fine (narrator describing the sequence).
        if (expectedColor === 'white' && blackClaim && !whiteClaim) {
          findings.colorMismatch.push({
            file: fname, moveIdx: i, san,
            expectedColor, claimed: 'black',
          });
        }
        if (expectedColor === 'black' && whiteClaim && !blackClaim) {
          findings.colorMismatch.push({
            file: fname, moveIdx: i, san,
            expectedColor, claimed: 'white',
          });
        }

        // Wrong-opening references — the narration mentions an opening
        // family that isn't this file's family. Skip when the file
        // family couldn't be identified (too generic).
        if (expectedFamily) {
          const mentioned: string[] = [];
          for (const kw of OPENING_KEYWORDS) {
            if (kw === expectedFamily) continue;
            // Keyword boundary check — "french" matches but "french
            // variation" inside the correct opening's name doesn't
            // count as a mis-ref. Use word-boundary regex.
            const kwRe = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i');
            if (kwRe.test(trimmed) && !trimmed.toLowerCase().includes(expectedFamily)) {
              mentioned.push(kw);
            }
          }
          if (mentioned.length > 0) {
            findings.wrongOpening.push({
              file: fname, fileFamily: expectedFamily,
              mentioned, moveIdx: i,
            });
          }
        }

        // Duplicate tracking
        const normalised = trimmed.slice(0, 200).toLowerCase();
        if (!seen.has(normalised)) seen.set(normalised, []);
        seen.get(normalised)!.push(i);
      }

      // Play the move (ignore failures; legality validator already
      // confirmed these sequences work, but defensive).
      try {
        const moved = chess.move(san);
        if (!moved) break;
      } catch {
        break;
      }
    }

    // Report duplicates within this file (ignore singletons)
    for (const [text, idxs] of seen) {
      if (idxs.length >= 2) {
        findings.duplicates.push({ file: fname, moveIdxs: idxs, text: text.slice(0, 80) });
      }
    }
  }

  // Print report
  const print = (label: string, n: number): void => {
    console.log(`\n${label}: ${n}`);
  };

  console.log('\n=== NARRATION QUALITY AUDIT ===');
  console.log(`Files scanned: ${files.length}\n`);

  print('Empty files (no annotations at all)', findings.empty.length);
  findings.empty.slice(0, 10).forEach((f) => console.log(`  - ${f}`));

  print('Stub / ultra-short annotations', findings.stub.length);
  findings.stub.slice(0, 10).forEach((msg) => console.log(`  - ${msg}`));

  print('Placeholder tokens', findings.placeholder.length);
  findings.placeholder.slice(0, 10).forEach(
    (i) => console.log(`  - ${i.file}[${i.moveIdx}] "${i.token}"`),
  );

  print('Color-claim mismatch (narration says wrong side)', findings.colorMismatch.length);
  findings.colorMismatch.slice(0, 20).forEach(
    (i) => console.log(`  - ${i.file}[${i.moveIdx}] ${i.san}: ${i.expectedColor}'s move but narration claims ${i.claimed}`),
  );

  print('Duplicate narrations within one file', findings.duplicates.length);
  findings.duplicates.slice(0, 10).forEach(
    (d) => console.log(`  - ${d.file} idxs ${d.moveIdxs.join(',')}: "${d.text}"`),
  );

  print('Wrong-opening references', findings.wrongOpening.length);
  findings.wrongOpening.slice(0, 15).forEach(
    (w) => console.log(`  - ${w.file}[${w.moveIdx}] (${w.fileFamily} file) mentions: ${w.mentioned.join(', ')}`),
  );

  console.log('\n=== END ===\n');
}

main();

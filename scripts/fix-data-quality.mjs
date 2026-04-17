#!/usr/bin/env node
/**
 * fix-data-quality.mjs
 * --------------------
 * Auto-repairs the four classes of data-quality issues the structural
 * audit detects — illegal moves, SAN drift, illegal arrows, and filler
 * annotations. Writes fixed JSON back in-place.
 *
 * What it does NOT fix: chess-quality blunders (hanging queen, etc.).
 * Those require engine analysis + human judgment. They're flagged but
 * left in place for manual review.
 *
 * Usage:
 *   node scripts/fix-data-quality.mjs            # dry-run (report only)
 *   node scripts/fix-data-quality.mjs --write     # fix in-place
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const repoRoot = new URL('..', import.meta.url).pathname;
const annotDir = join(repoRoot, 'src/data/annotations');
const dryRun = !process.argv.includes('--write');

if (dryRun) {
  console.log('[fix-data-quality] DRY RUN — pass --write to modify files');
  console.log('');
}

const FILLER_PATTERNS = [
  /\bposition is heading toward the critical moment\b/i,
  /\bposition is becoming uncomfortable\b/i,
  /\bcareful defense is needed\b/i,
  /\bposition is roughly (equal|balanced)\b/i,
  /\bboth sides have chances\b/i,
  /\bThe position is sharp and requires precise play from this point forward\b/i,
  /\bThe key moment is approaching\b/i,
  /\bThe critical moment is approaching\b/i,
  /\bcritical moment in the trap\b/i,
  /\bcritical moment in the opening\b/i,
  /\bThis is a critical moment where precise play is essential\b/i,
  /\bDevelopment with purpose\b/i,
  /\bThis move contributes to (?:White|Black)'?s opening development\b/i,
  /\bControlling the center is the foundation of a strong position\b/i,
  /\bThis central advance fights for space and control of key squares\b/i,
  /\bGaining space here creates potential targets\b/i,
  /\bA flank pawn advance, creating space on the\b/i,
  /\bAn aggressive pawn advance, signaling kingside intentions\b/i,
  /\bA thematic move in this position, maintaining\b/i,
  /\bThe fianchettoed bishop rakes the long diagonal\b/i,
  /\bdeveloping normally\.\s*The opponent may not see what/i,
  /\bopponent (?:may|might|won[\u2019']?t|will not|doesn[\u2019']?t)(?:\s+not)? (?:see|notice|spot|catch) what[\u2019']?s coming\b/i,
  /\bThis move looks reasonable but allows the trap to unfold\b/i,
  /\bThis looks natural,? but it walks into the trap\b/i,
  /\bThis is the problematic continuation you need to recognize\b/i,
  /\bthe trap is being set\b/i,
  /\bWatch out\s*[—–-]\s*a mistake here would be very costly\b/i,
  /\bThis is the natural continuation that leads into the warning line\b/i,
  /\bThis sequence leads to the dangerous line\b/i,
  /\bThe position looks normal so far\b/i,
  /\bCheck forces a response\.\s*This is where the danger begins\b/i,
  /\bThis is the position you must avoid\b/i,
  /\bThe damage is done\b/i,
  /\bThis is the uncomfortable position that results from this line\b/i,
  /\bThis is the move that causes all the trouble\b/i,
  /\bThe position is now very difficult\.\s*This is the warning\b/i,
  /\bWe'?re approaching the critical position\b/i,
  /\bpreparing for the middlegame while the trap is being set\b/i,
  /\bThis exchange is part of the trap setup\b/i,
  /\bestablishing the position\.\s*The key moment is approaching\b/i,
  /\bThis is a critical moment in the trap\b/i,
  /\bThe position looks safe, but danger lurks\b/i,
  /\band this is the final blow\b/i,
  /\bMemorize this pattern\b/i,
  /\bThe trap is complete\b/i,
  /\bRemember this pattern\b/i,
  /\bThe trap is sprung\b/i,
  /\bThis is the key takeaway from the\b/i,
  /\bNow the trap is revealed\b/i,
  /\bThe opponent is in serious trouble\b/i,
  /\bThis is where the trap begins\b/i,
  /\bCastles to safety, connecting the rooks and tucking the king away\b/i,
  /\bGets the king to safety with castling\b/i,
  /\bCastles, completing king safety and activating the rook\b/i,
  /\bcastles, but the position requires careful play\b/i,
  /\bimproving piece coordination and maintaining pressure\b/i,
  /\bwinning material or improving the position\b/i,
  /\bConnecting the rooks is a priority\b/i,
  /\bThe rook now enters the game on a central file\b/i,
];

const BARE_SAN_RE = /^\s*(?:\d+\.+\s*)?(?:\.\.\.\s*)?[NBRQK]?[a-h]?[1-8]?[x-]?[a-h][1-8](?:=[NBRQ])?[+#!?]*\s*$/;
const CASTLING_RE = /^\s*(?:\d+\.+\s*)?O-O(?:-O)?[+#!?]*\s*$/;

function isFiller(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length === 0) return true;
  if (BARE_SAN_RE.test(t) || CASTLING_RE.test(t)) return true;
  return FILLER_PATTERNS.some((re) => re.test(t));
}

function arrowLegal(fen, arrow) {
  if (!fen || !arrow) return true;
  const from = arrow.from ?? arrow.startSquare;
  const to = arrow.to ?? arrow.endSquare;
  if (!from || !to) return true;
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    return moves.some((m) => m.from === from && m.to === to);
  } catch { return true; }
}

// ─── Fix pipeline ───────────────────────────────────────────────────────────

const stats = {
  filesProcessed: 0,
  filesModified: 0,
  movesTruncated: 0,
  sansCorrected: 0,
  arrowsReplaced: 0,
  fillerCleared: 0,
};

function fixMoveAnnotationArray(annotations) {
  const chess = new Chess();
  let modified = false;
  let truncateAt = -1;

  // Pass 1: replay and validate each move; find first illegal.
  for (let i = 0; i < annotations.length; i++) {
    const ann = annotations[i];
    const fenBefore = chess.fen();

    try {
      const move = chess.move(ann.san);

      // SAN drift: annotation declared "Nge2" but chess.js replays "Ne2"
      if (move.san !== ann.san) {
        ann.san = move.san;
        stats.sansCorrected++;
        modified = true;
      }

      // Arrow legality: replace illegal arrows with the correct
      // from→to derived from the SAN at this position. The arrow
      // should show the move that was actually played/intended.
      if (Array.isArray(ann.arrows)) {
        let anyFixed = false;
        for (let ai = 0; ai < ann.arrows.length; ai++) {
          const a = ann.arrows[ai];
          if (!arrowLegal(fenBefore, a)) {
            // Derive correct arrow from the move's from/to
            ann.arrows[ai] = {
              ...a,
              from: move.from,
              to: move.to,
            };
            stats.arrowsReplaced++;
            anyFixed = true;
          }
        }
        if (anyFixed) modified = true;
      }

      // Filler annotation: clear so LLM narrator fills at runtime.
      if (isFiller(ann.annotation)) {
        ann.annotation = '';
        stats.fillerCleared++;
        modified = true;
      }
    } catch {
      // Illegal move — truncate from here.
      truncateAt = i;
      break;
    }
  }

  if (truncateAt >= 0) {
    stats.movesTruncated += annotations.length - truncateAt;
    annotations.length = truncateAt;
    modified = true;
  }

  return modified;
}

const files = readdirSync(annotDir).filter((f) => f.endsWith('.json'));

for (const file of files) {
  const path = join(annotDir, file);
  const raw = readFileSync(path, 'utf-8');
  let data;
  try { data = JSON.parse(raw); } catch { continue; }

  stats.filesProcessed++;
  let fileModified = false;

  // Main line
  if (Array.isArray(data.moveAnnotations)) {
    if (fixMoveAnnotationArray(data.moveAnnotations)) fileModified = true;
  }

  // Sublines
  if (Array.isArray(data.subLines)) {
    for (const sl of data.subLines) {
      if (Array.isArray(sl.moveAnnotations)) {
        if (fixMoveAnnotationArray(sl.moveAnnotations)) fileModified = true;
      }
    }
  }

  if (fileModified) {
    stats.filesModified++;
    if (!dryRun) {
      writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
    }
  }
}

console.log('[fix-data-quality] summary:');
console.log(JSON.stringify(stats, null, 2));
if (dryRun) {
  console.log('');
  console.log('Pass --write to apply these fixes to the JSON files.');
}

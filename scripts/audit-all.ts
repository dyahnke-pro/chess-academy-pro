/**
 * audit-all.ts — offline sweep of every content source through the
 * rules-based narration auditor.
 *
 * Runs the same checks as the runtime auditor (piece-on-square,
 * hanging-piece, check/mate, illegal SAN) across every curated
 * annotation file and every middlegame plan. Deterministic, free,
 * ~30 sec. Good for CI or a pre-deploy gate.
 *
 * Usage:
 *   npx tsx scripts/audit-all.ts                  # default: high-signal kinds only
 *   npx tsx scripts/audit-all.ts --verbose        # print every finding
 *   npx tsx scripts/audit-all.ts --kind=...       # filter to one kind
 *   npx tsx scripts/audit-all.ts --include-san    # include illegal-san
 *   npx tsx scripts/audit-all.ts --strict         # exit 1 when findings exist
 *
 * illegal-san produces false positives on curated annotations that
 * discuss plans for future moves (e.g. "White aims for Nf3 next")
 * which aren't immediately legal — so it's excluded by default.
 * piece-on-square / check / mate have far lower false-positive
 * rates and those are the defaults.
 *
 * Output:
 *   - Aggregate stats (files scanned, narrations checked, flag totals)
 *   - Per-kind breakdown
 *   - Per-file summary with sample findings
 *   - Exit 1 only when --strict is set and findings exist
 */
import { Chess } from 'chess.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { auditNarration, type AuditFlag } from '../src/services/narrationAuditor';

interface MoveAnnotation {
  san: string;
  annotation?: string;
  narration?: string;
}
interface AnnotationFile {
  openingId: string;
  moveAnnotations?: MoveAnnotation[];
  moveAnalyses?: MoveAnnotation[];
}

interface PlayableLine {
  fen: string;
  moves: string[];
  annotations?: string[];
}

interface PawnBreak {
  move: string;
  explanation: string;
  fen: string;
}

interface MiddlegamePlan {
  id: string;
  openingId: string;
  criticalPositionFen: string;
  title: string;
  overview?: string;
  pawnBreaks?: PawnBreak[];
  pieceManeuvers?: { piece: string; route: string; explanation: string }[];
  strategicThemes?: string[];
  endgameTransitions?: string[];
  playableLines?: PlayableLine[];
}

interface Finding {
  source: string;
  fen: string;
  narration: string;
  flags: AuditFlag[];
}

const ROOT = '/home/user/chess-academy-pro';
const ANNOTATIONS_DIR = `${ROOT}/src/data/annotations`;
const MIDDLEGAME_PLANS = `${ROOT}/src/data/middlegame-plans.json`;

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const args = new Set(process.argv.slice(2));
const VERBOSE = args.has('--verbose');
const INCLUDE_SAN = args.has('--include-san');
const STRICT = args.has('--strict');
const KIND_FILTER = [...args].find((a) => a.startsWith('--kind='))?.slice(7);

/** Strip flags whose narration excerpt matches a SAN that's actually
 *  in the recent move history — annotations naming the move just
 *  played (or a few moves back) shouldn't be treated as a claim
 *  about what's legal from here. Piece-on-square / check / mate
 *  flags are kept unconditionally; only illegal-san is filtered. */
function filterRecentMoveRefs(flags: AuditFlag[], recentSans: Set<string>): AuditFlag[] {
  return flags.filter((f) => {
    if (f.kind !== 'illegal-san') return true;
    // narrationExcerpt here is the SAN token that was flagged. Strip
    // capture 'x' and check/mate suffixes so "Nxf6" matches "Nf6".
    const token = f.narrationExcerpt.replace(/[+#]/g, '');
    const tokenNoX = token.replace(/x/g, '');
    if (recentSans.has(token) || recentSans.has(tokenNoX)) return false;
    for (const san of recentSans) {
      const sanNoX = san.replace(/x/g, '').replace(/[+#]/g, '');
      if (sanNoX === tokenNoX) return false;
    }
    return true;
  });
}

function auditAnnotationFile(fname: string): Finding[] {
  const path = join(ANNOTATIONS_DIR, fname);
  const data: AnnotationFile = JSON.parse(readFileSync(path, 'utf-8'));
  const list = data.moveAnnotations ?? data.moveAnalyses ?? [];
  if (list.length === 0) return [];

  const chess = new Chess();
  const findings: Finding[] = [];

  for (let i = 0; i < list.length; i++) {
    const { san, annotation, narration } = list[i];
    let moved;
    try {
      moved = chess.move(san);
    } catch {
      moved = null;
    }
    if (!moved) break; // respect legal-move truncation

    const fenAfter = chess.fen();
    const recentSans = new Set(chess.history().slice(-6));

    // Audit both the display annotation and the spoken narration if
    // they diverge — both are user-facing and both need to be factual.
    const texts: { label: string; text: string | undefined }[] = [
      { label: 'annotation', text: annotation },
    ];
    if (narration && narration !== annotation) {
      texts.push({ label: 'narration', text: narration });
    }
    for (const { label, text } of texts) {
      if (!text) continue;
      const rawFlags = auditNarration(fenAfter, text);
      const flags = filterRecentMoveRefs(rawFlags, recentSans);
      if (flags.length > 0) {
        findings.push({
          source: `${fname} › move ${i + 1} (${san}) › ${label}`,
          fen: fenAfter,
          narration: text,
          flags,
        });
      }
    }
  }

  return findings;
}

function auditMiddlegamePlans(): Finding[] {
  const data: MiddlegamePlan[] = JSON.parse(readFileSync(MIDDLEGAME_PLANS, 'utf-8'));
  const findings: Finding[] = [];

  for (const plan of data) {
    const fen = plan.criticalPositionFen;
    if (!fen) continue;

    if (plan.overview) {
      const flags = auditNarration(fen, plan.overview);
      if (flags.length > 0) {
        findings.push({ source: `middlegame-plans.json › ${plan.id} › overview`, fen, narration: plan.overview, flags });
      }
    }

    for (const theme of plan.strategicThemes ?? []) {
      const flags = auditNarration(fen, theme);
      if (flags.length > 0) {
        findings.push({ source: `middlegame-plans.json › ${plan.id} › theme`, fen, narration: theme, flags });
      }
    }

    for (const transition of plan.endgameTransitions ?? []) {
      const flags = auditNarration(fen, transition);
      if (flags.length > 0) {
        findings.push({ source: `middlegame-plans.json › ${plan.id} › endgame`, fen, narration: transition, flags });
      }
    }

    for (const maneuver of plan.pieceManeuvers ?? []) {
      const flags = auditNarration(fen, maneuver.explanation);
      if (flags.length > 0) {
        findings.push({
          source: `middlegame-plans.json › ${plan.id} › maneuver (${maneuver.piece})`,
          fen,
          narration: maneuver.explanation,
          flags,
        });
      }
    }

    // pawnBreaks are narrations anchored to their OWN fen, not the
    // plan's critical fen.
    for (const pb of plan.pawnBreaks ?? []) {
      const flags = auditNarration(pb.fen ?? fen, pb.explanation);
      if (flags.length > 0) {
        findings.push({
          source: `middlegame-plans.json › ${plan.id} › pawnBreak (${pb.move})`,
          fen: pb.fen ?? fen,
          narration: pb.explanation,
          flags,
        });
      }
    }

    // playableLines: walk the moves from the playable fen and audit
    // each annotation against the resulting FEN.
    for (const line of plan.playableLines ?? []) {
      const chess = new Chess(line.fen || START_FEN);
      for (let i = 0; i < (line.annotations?.length ?? 0); i++) {
        const move = line.moves[i];
        const note = line.annotations?.[i];
        let moved;
        try {
          moved = chess.move(move);
        } catch {
          moved = null;
        }
        if (!moved) break;
        if (!note) continue;
        const recentSans = new Set(chess.history().slice(-6));
        const flags = filterRecentMoveRefs(auditNarration(chess.fen(), note), recentSans);
        if (flags.length > 0) {
          findings.push({
            source: `middlegame-plans.json › ${plan.id} › line move ${i + 1} (${move})`,
            fen: chess.fen(),
            narration: note,
            flags,
          });
        }
      }
    }
  }

  return findings;
}

function filterByKind(findings: Finding[]): Finding[] {
  return findings
    .map((f) => ({
      ...f,
      flags: f.flags.filter((fl) => {
        if (KIND_FILTER) return fl.kind === KIND_FILTER;
        if (!INCLUDE_SAN && fl.kind === 'illegal-san') return false;
        return true;
      }),
    }))
    .filter((f) => f.flags.length > 0);
}

function summarizeByKind(findings: Finding[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of findings) {
    for (const flag of f.flags) {
      counts[flag.kind] = (counts[flag.kind] ?? 0) + 1;
    }
  }
  return counts;
}

function main(): void {
  console.log('=== Offline narration audit ===');
  console.log('Rules-based — same checks as the runtime auditor.\n');

  const annotationFiles = readdirSync(ANNOTATIONS_DIR).filter((f) => f.endsWith('.json'));
  console.log(`Scanning ${annotationFiles.length} annotation files + middlegame plans...`);

  const allFindings: Finding[] = [];
  let narrationsChecked = 0;

  for (const fname of annotationFiles) {
    try {
      const data: AnnotationFile = JSON.parse(readFileSync(join(ANNOTATIONS_DIR, fname), 'utf-8'));
      const list = data.moveAnnotations ?? data.moveAnalyses ?? [];
      narrationsChecked += list.filter((m) => m.annotation || m.narration).length;
    } catch {
      /* counted below */
    }
    try {
      const findings = auditAnnotationFile(fname);
      allFindings.push(...findings);
    } catch (err) {
      console.warn(`  [parse error] ${fname}: ${(err as Error).message}`);
    }
  }

  try {
    const mgFindings = auditMiddlegamePlans();
    allFindings.push(...mgFindings);
  } catch (err) {
    console.warn(`  [middlegame-plans error] ${(err as Error).message}`);
  }

  const filtered = filterByKind(allFindings);
  const byKind = summarizeByKind(filtered);
  const filesWithFindings = new Set(filtered.map((f) => f.source.split(' ')[0])).size;

  console.log(`\n=== SUMMARY ===`);
  console.log(`Narrations checked: ~${narrationsChecked}`);
  console.log(`Findings: ${filtered.length}`);
  console.log(`Files with findings: ${filesWithFindings}`);
  if (KIND_FILTER) console.log(`(filtered to kind=${KIND_FILTER})`);

  console.log(`\nBy kind:`);
  for (const [kind, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${kind.padEnd(20)} ${n}`);
  }

  if (filtered.length === 0) {
    console.log('\n✓ No issues found.');
    return;
  }

  // Default: top 25 findings. Verbose: all.
  const toShow = VERBOSE ? filtered : filtered.slice(0, 25);
  console.log(`\n=== FINDINGS ${VERBOSE ? '(all)' : `(first ${toShow.length} of ${filtered.length})`} ===\n`);
  for (const f of toShow) {
    console.log(`• ${f.source}`);
    for (const flag of f.flags) {
      console.log(`    [${flag.kind}] ${flag.explanation}`);
      if (flag.narrationExcerpt && flag.narrationExcerpt !== flag.kind) {
        console.log(`    > "${flag.narrationExcerpt}"`);
      }
    }
    console.log();
  }

  if (!VERBOSE && filtered.length > toShow.length) {
    console.log(`... ${filtered.length - toShow.length} more. Re-run with --verbose to see all.`);
  }

  if (STRICT) process.exit(1);
}

main();

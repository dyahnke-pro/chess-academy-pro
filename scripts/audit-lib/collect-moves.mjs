#!/usr/bin/env node
/**
 * audit-lib/collect-moves.mjs
 * ---------------------------
 * Shared data collector for every audit script. Walks every known
 * scripted-moves data source and yields a uniform stream of records.
 *
 * Sources covered:
 *   - src/data/annotations/<openingId>.json
 *       - top-level `moveAnnotations` (main line)
 *       - `subLines[].moveAnnotations` (variations, traps, warnings)
 *   - src/data/middlegame-plans.json
 *       - each plan's `playableLines[].moves` + `annotations`
 *   - src/data/common-mistakes.json  (positions with wrong/correct move)
 *   - src/data/checkpoint-quizzes.json  (positions + correct move)
 *   - src/data/repertoire.json / gambits.json  (opening PGNs)
 *
 * Each yielded record has:
 *   source      — 'annotation-main' | 'annotation-subline' | 'middlegame-plan' | ...
 *   openingId   — parent opening identifier
 *   sublineName — when applicable
 *   moveIndex   — ply within the sequence (0-based)
 *   san         — SAN token for this move
 *   fenBefore   — FEN with side-to-move ABOUT to play this move
 *   fenAfter    — FEN after the move
 *   annotation  — annotation text (may be empty / undefined)
 *   classification? — move classification when available
 *   arrows?     — arrow data when present
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Chess } from 'chess.js';

const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function collectAllScriptedMoves(repoRoot) {
  const records = [];

  collectAnnotationFiles(repoRoot, records);
  collectMiddlegamePlans(repoRoot, records);
  collectCommonMistakes(repoRoot, records);
  collectCheckpointQuizzes(repoRoot, records);
  collectRepertoirePgns(repoRoot, records);

  return records;
}

function safeReadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function tokensToSans(pgn) {
  // Split on whitespace, drop move-number tokens like "1." "10."
  return pgn
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0 && !/^\d+\.+$/.test(t));
}

function replay(fen, sans) {
  const chess = new Chess(fen);
  const plies = [];
  for (let i = 0; i < sans.length; i++) {
    const fenBefore = chess.fen();
    try {
      const move = chess.move(sans[i]);
      plies.push({
        moveIndex: i,
        san: move.san,
        fenBefore,
        fenAfter: chess.fen(),
      });
    } catch {
      plies.push({ moveIndex: i, san: sans[i], fenBefore, fenAfter: null, illegal: true });
      break;
    }
  }
  return plies;
}

// ─── Per-source collectors ─────────────────────────────────────────────────

function collectAnnotationFiles(repoRoot, out) {
  const dir = join(repoRoot, 'src/data/annotations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const data = safeReadJson(join(dir, file));
    if (!data) continue;
    const openingId = data.openingId ?? file.replace(/\.json$/, '');

    // Main line
    collectMoveAnnotationArray(out, {
      source: 'annotation-main',
      openingId,
      sublineName: null,
      sublineType: 'main',
      moveAnnotations: data.moveAnnotations ?? [],
    });

    // Sublines (variations, traps, warnings)
    if (Array.isArray(data.subLines)) {
      for (const sl of data.subLines) {
        collectMoveAnnotationArray(out, {
          source: 'annotation-subline',
          openingId,
          sublineName: sl.name ?? null,
          sublineType: sl.type ?? 'variation',
          moveAnnotations: sl.moveAnnotations ?? [],
        });
      }
    }
  }
}

function collectMoveAnnotationArray(out, ctx) {
  const sans = ctx.moveAnnotations.map((m) => m.san);
  const plies = replay(STARTING_FEN, sans);
  for (let i = 0; i < ctx.moveAnnotations.length; i++) {
    const ann = ctx.moveAnnotations[i];
    const ply = plies[i] ?? { moveIndex: i, san: ann.san, fenBefore: null, fenAfter: null, illegal: true };
    out.push({
      source: ctx.source,
      openingId: ctx.openingId,
      sublineName: ctx.sublineName,
      sublineType: ctx.sublineType,
      moveIndex: i,
      san: ann.san,
      expectedSan: ply.san,
      fenBefore: ply.fenBefore,
      fenAfter: ply.fenAfter,
      illegal: Boolean(ply.illegal),
      annotation: typeof ann.annotation === 'string' ? ann.annotation : '',
      narration: typeof ann.narration === 'string' ? ann.narration : undefined,
      classification: ann.classification ?? null,
      arrows: Array.isArray(ann.arrows) ? ann.arrows : null,
    });
  }
}

function collectMiddlegamePlans(repoRoot, out) {
  const data = safeReadJson(join(repoRoot, 'src/data/middlegame-plans.json'));
  if (!Array.isArray(data)) return;
  for (const plan of data) {
    const openingId = plan.openingId ?? plan.id ?? 'unknown';
    if (!Array.isArray(plan.playableLines)) continue;
    for (const line of plan.playableLines) {
      const startFen = plan.criticalPositionFen ?? line.fen ?? STARTING_FEN;
      const sans = Array.isArray(line.moves) ? line.moves : [];
      const plies = replay(startFen, sans);
      for (let i = 0; i < sans.length; i++) {
        const ply = plies[i];
        const annotation = Array.isArray(line.annotations) ? line.annotations[i] ?? '' : '';
        out.push({
          source: 'middlegame-plan',
          openingId,
          sublineName: line.title ?? plan.title ?? null,
          sublineType: 'middlegame',
          moveIndex: i,
          san: sans[i],
          expectedSan: ply?.san,
          fenBefore: ply?.fenBefore ?? null,
          fenAfter: ply?.fenAfter ?? null,
          illegal: Boolean(ply?.illegal),
          annotation,
          narration: undefined,
          classification: null,
          arrows: Array.isArray(line.arrows?.[i]) ? line.arrows[i] : null,
        });
      }
    }
  }
}

function collectCommonMistakes(repoRoot, out) {
  const data = safeReadJson(join(repoRoot, 'src/data/common-mistakes.json'));
  if (!data || typeof data !== 'object') return;
  for (const [openingId, list] of Object.entries(data)) {
    if (!Array.isArray(list)) continue;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      // Each common-mistake has a fen + wrongMove + correctMove + explanation.
      // We audit BOTH moves from the same FEN so the engine check can verify
      // the "wrong" move really is bad and the "correct" move really is good.
      pushMistakeEntry(out, openingId, i, 'wrong', m);
      pushMistakeEntry(out, openingId, i, 'correct', m);
    }
  }
}

function pushMistakeEntry(out, openingId, index, kind, m) {
  const san = kind === 'wrong' ? m.wrongMove : m.correctMove;
  if (!san) return;
  let fenAfter = null;
  try {
    const chess = new Chess(m.fen);
    const move = chess.move(san);
    fenAfter = chess.fen();
    out.push({
      source: 'common-mistake-' + kind,
      openingId,
      sublineName: `mistake[${index}].${kind}`,
      sublineType: 'mistake',
      moveIndex: 0,
      san: move.san,
      expectedSan: move.san,
      fenBefore: m.fen,
      fenAfter,
      illegal: false,
      annotation: m.explanation ?? '',
      classification: kind === 'wrong' ? 'mistake' : null,
      arrows: null,
    });
  } catch {
    out.push({
      source: 'common-mistake-' + kind,
      openingId,
      sublineName: `mistake[${index}].${kind}`,
      sublineType: 'mistake',
      moveIndex: 0,
      san,
      expectedSan: null,
      fenBefore: m.fen,
      fenAfter: null,
      illegal: true,
      annotation: m.explanation ?? '',
      classification: null,
      arrows: null,
    });
  }
}

function collectCheckpointQuizzes(repoRoot, out) {
  const data = safeReadJson(join(repoRoot, 'src/data/checkpoint-quizzes.json'));
  if (!data || typeof data !== 'object') return;
  for (const [openingId, list] of Object.entries(data)) {
    if (!Array.isArray(list)) continue;
    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      if (q.type && q.type !== 'move') continue; // plan-type quizzes have no SAN
      const san = q.correctMove;
      if (!san) continue;
      try {
        const chess = new Chess(q.fen);
        const mv = chess.move(san);
        out.push({
          source: 'checkpoint-quiz',
          openingId,
          sublineName: `quiz[${i}]`,
          sublineType: 'quiz',
          moveIndex: 0,
          san: mv.san,
          expectedSan: mv.san,
          fenBefore: q.fen,
          fenAfter: chess.fen(),
          illegal: false,
          annotation: q.concept ?? q.hint ?? '',
          classification: null,
          arrows: null,
        });
      } catch {
        out.push({
          source: 'checkpoint-quiz',
          openingId,
          sublineName: `quiz[${i}]`,
          sublineType: 'quiz',
          moveIndex: 0,
          san,
          expectedSan: null,
          fenBefore: q.fen,
          fenAfter: null,
          illegal: true,
          annotation: q.concept ?? q.hint ?? '',
          classification: null,
          arrows: null,
        });
      }
    }
  }
}

function collectRepertoirePgns(repoRoot, out) {
  const files = ['src/data/repertoire.json', 'src/data/gambits.json'];
  for (const file of files) {
    const data = safeReadJson(join(repoRoot, file));
    if (!Array.isArray(data)) continue;
    for (const op of data) {
      if (!op.pgn) continue;
      const sans = tokensToSans(op.pgn);
      const plies = replay(STARTING_FEN, sans);
      for (let i = 0; i < sans.length; i++) {
        const ply = plies[i];
        out.push({
          source: 'repertoire-pgn',
          openingId: op.id ?? op.eco ?? 'unknown',
          sublineName: op.name ?? null,
          sublineType: 'repertoire',
          moveIndex: i,
          san: sans[i],
          expectedSan: ply?.san,
          fenBefore: ply?.fenBefore ?? null,
          fenAfter: ply?.fenAfter ?? null,
          illegal: Boolean(ply?.illegal),
          annotation: '',
          classification: null,
          arrows: null,
        });
      }
    }
  }
}

// ─── CLI smoke test ─────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
  const t0 = Date.now();
  const records = collectAllScriptedMoves(repoRoot);
  const elapsedMs = Date.now() - t0;
  const bySource = new Map();
  for (const r of records) {
    bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1);
  }
  console.log(`Collected ${records.length} scripted-move records in ${elapsedMs}ms`);
  for (const [src, count] of [...bySource.entries()].sort()) {
    console.log(`  ${src.padEnd(30)} ${count}`);
  }
}

/**
 * openingGenerator
 * ----------------
 * Real-time LLM generation of opening walkthrough trees. The user
 * says "Teach me [any opening]" → surface routing checks the static
 * registry → checks the Dexie cache → if both miss, calls this
 * service which:
 *   1. Calls Anthropic (forced) with a system prompt that includes
 *      the WalkthroughTree schema + a condensed Vienna sample +
 *      formatting rules.
 *   2. Parses the LLM's JSON response.
 *   3. Runs the validation harness (structural + legality).
 *   4. On validation failure: ONE retry with the failure messages
 *      fed back as context.
 *   5. On success: returns the tree. Caller persists to Dexie.
 *
 * Per CLAUDE.md and conversation context, this is a single-user app,
 * so per-call API cost (~$0.10–0.50) is fine. Caching means each
 * opening is generated at most once per user.
 *
 * Voice consistency: the prompt explicitly references Vienna's
 * voice and supplies a sample node so the LLM mimics the pattern.
 * Style drift is the main risk; that's why we anchor on a sample.
 */
import { Chess } from 'chess.js';
import puzzleData from '../data/puzzles.json';
import { getCoachChatResponse, getCoachStructuredResponse } from './coachApi';
import {
  validateMoveLegality,
  validateTreeMoveLegality,
  formatIssues,
  stripSanAnnotations,
} from '../data/openingWalkthroughs/validate';
import {
  findRelatedDbEntries,
  resolveOpeningEntry,
  resolveCuratedVariation,
  findSiblingExtensionBranches,
  findShortestCanonicalPgn,
  findContinuationsAtPly,
  type ForkBranch,
} from './openingDetectionService';
import { db, type CachedOpening } from '../db/schema';
import { gradeNarrationText } from './coachAnswerGates';
import { logAppAudit } from './appAuditor';
import { buildOpeningNarrationContext } from './chessConceptService';
import type {
  WalkthroughTree,
  WalkthroughTreeNode,
  NarrationSegment as NarrationSegmentType,
  ConceptCheckQuestion,
  FindMoveQuestion,
  DrillLine,
  PunishLesson,
} from '../types/walkthroughTree';

/** Render a Lichess-DB entry list as a numbered, prompt-friendly
 *  block. Each line: "  {N}. [ECO] Name :: PGN". */
function formatDbEntriesForPrompt(
  entries: Array<{ eco: string; name: string; pgn: string }>,
): string {
  return entries
    .map((e, i) => `  ${i + 1}. [${e.eco}] ${e.name} :: ${e.pgn}`)
    .join('\n');
}

/** Build the BOOK SOURCE block to inject into LLM prompts. Pulls
 *  Lichess-DB entries related to the opening name and formats them
 *  so the LLM has a "book on the table" of verified PGN sequences
 *  to anchor on. Empty string when the DB has nothing for the name
 *  (in which case the LLM falls back to training-memory). */
function buildBookSourceBlock(openingName?: string): string {
  if (!openingName) return '';
  const entries = findRelatedDbEntries(openingName, 30);
  if (entries.length === 0) return '';
  return `

BOOK SOURCE — Lichess opening database. The following PGN sequences are verified from master practice. They are your SOURCE OF TRUTH for move sequences:

${formatDbEntriesForPrompt(entries)}

GROUNDING RULES (this is the most important section):
- Every move sequence you emit (tree spine, fork children, drill moves, punish setupMoves, findMove paths) MUST be a prefix or extension of one of the lines above.
- DO NOT invent novel move sequences from training memory. The lines above are the authoritative theory; if a move you'd otherwise play isn't represented here, don't play it.
- Forks should land at positions where the database itself splits (i.e., the parent PGN above has multiple sub-variations diverging at that ply). Each fork child's first move = the divergence move of one listed line.
- Within a branch, continue down the chosen line's PGN. Do NOT mix moves from different lines in the same branch.
- For punish lessons: the inaccuracy + punishment can be moves NOT in the database (since traps by definition deviate from main theory), but the setupMoves leading up to the inaccuracy MUST be a prefix of a listed line. The punishment + followup should land back on or near a known line.`;
}


/** Defensively normalize an LLM-emitted JSON string before parse:
 *    - smart double quotes → straight double quotes (LLM occasionally
 *      uses curly " " as STRING DELIMITERS, which JSON.parse rejects)
 *    - smart single quotes → straight apostrophes (cosmetic, not a
 *      parse-breaker but keeps text uniform)
 *    - literal NEL / line-separator / paragraph-separator chars in
 *      strings → spaces (these are valid Unicode but iOS Safari
 *      sometimes treats them as illegal in JSON strings)
 *    - tab characters in strings → spaces (also iOS Safari sensitive)
 *  Production audit (builds c95ccc9 + 41154ec) caught Philidor +
 *  Hampe-Allgaier + Najdorf failing JSON.parse with iOS Safari's
 *  "Expected '}'" message and no position info. The position is
 *  always somewhere INSIDE the response — and the recurring suspect
 *  is character-class issues invisible in the audit dump. */
function preprocessForParse(text: string): string {
  // Use Unicode escapes inside the character classes — U+2028 and
  // U+2029 are line terminators in JS source, so writing them as
  // literal chars in a regex literal breaks the parser across lines.
  let out = text
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u0085\u2028\u2029]/g, ' ')
    .replace(/\t/g, ' ');
  // Quote bare object keys. Production audit (build 7dc700f) caught
  // "Italian Game: Blackburne-Kosti\u0107 Gambit" failing both attempts on
  // iOS Safari's "Property name must be a string literal" \u2014 the LLM
  // emitted unquoted keys like `{ node: { san: "e4" } }` for niche
  // openings it knows less well. Anchor on a newline + indentation +
  // identifier + colon \u2014 JSON keys appear at line start in pretty-
  // printed output, and JSON strings can't legally contain raw
  // newlines, so this won't touch prose values.
  out = out.replace(/(\n\s+)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
  return out;
}

/** Walk a parsed tree and ensure every node carries a `children`
 *  array. Production audit (build 62a884d) caught an unhandled
 *  rejection — `t.children.length` undefined — recursing through a
 *  Sicilian tree shortly after a JSON parse failure. The crash bubbled
 *  up because downstream walkers (validate, normalizeTreeSans,
 *  auditMoveQuality, useTeachWalkthrough) all trust `node.children` to
 *  be an array. If the LLM's JSON parses but a node omits `children`,
 *  every walker explodes. Failing the parse loudly here keeps a
 *  half-formed tree from leaking into Dexie cache or the runtime. */
export function assertTreeShape(tree: unknown): asserts tree is WalkthroughTree {
  if (!tree || typeof tree !== 'object') {
    throw new Error('tree is not an object');
  }
  const root = (tree as { root?: unknown }).root;
  if (!root || typeof root !== 'object') {
    throw new Error('tree.root missing');
  }
  function visit(node: unknown, path: string): void {
    if (!node || typeof node !== 'object') {
      throw new Error(`${path}: node is not an object`);
    }
    const n = node as { children?: unknown; san?: unknown };
    // Tolerate leaf nodes the LLM emits without an explicit empty
    // children array — production audit (build 998f5c4) caught
    // "Italian Game: Rousseau Gambit" failing both gen attempts at
    // depth 12 because the deepest node was missing `children: []`.
    // Treat undefined/null as an empty leaf instead of failing.
    if (n.children === undefined || n.children === null) {
      n.children = [];
    }
    if (!Array.isArray(n.children)) {
      throw new Error(`${path}: children missing or not an array`);
    }
    for (let i = 0; i < n.children.length; i += 1) {
      const child = n.children[i] as { node?: unknown } | null | undefined;
      if (!child || typeof child !== 'object' || !child.node) {
        throw new Error(`${path}.children[${i}]: missing .node`);
      }
      const san = (child.node as { san?: unknown }).san;
      const childPath = `${path}.children[${i}]${typeof san === 'string' ? `(${san})` : ''}`;
      visit(child.node, childPath);
    }
  }
  visit(root, 'root');
}

/** Normalize an opening name for cache lookup. Lowercase + trim. */
export function normalizeOpeningName(name: string): string {
  return name.trim().toLowerCase();
}

/** Read-through cache: check Dexie before generating. RE-VALIDATES
 *  the cached tree before returning — production audit (build
 *  c2bc340) caught a bad Pirc tree shipping into the cache during
 *  the window before tree-legality validation existed. Re-checking
 *  on retrieval means broken trees from old caches get evicted +
 *  re-generated automatically; users don't have to clear storage. */
export async function getCachedOpening(
  name: string,
): Promise<WalkthroughTree | null> {
  try {
    const normalized = normalizeOpeningName(name);
    const cached = await db.cachedOpenings.get(normalized);
    if (!cached) {
      // Audit-instrumentation phase-1 (2026-05-19): per-cache-lookup
      // hit/miss event. Generation is the most expensive operation in
      // the app; cache hit rate matters. Without this audit we can't
      // see how often a "lesson" call is fresh gen vs cached.
      void logAppAudit({
        kind: 'opening-cache-miss',
        category: 'subsystem',
        source: 'openingGenerator.getCachedOpening',
        summary: `cache miss: "${name}" → fresh generation`,
        details: JSON.stringify({ name, normalized }),
      });
      return null;
    }
    // Sanity-check the cached tree before returning. If illegal SANs
    // were saved before the tree-legality gate existed, evict the
    // record so the next request goes through fresh generation.
    const issues = validateTreeMoveLegality(cached.tree);
    const errors = issues.filter((i) => i.severity === 'error');
    if (errors.length > 0) {
      void logAppAudit({
        kind: 'dexie-error',
        category: 'subsystem',
        source: 'openingGenerator.getCachedOpening',
        summary: `evicting broken cached tree for "${name}" — ${errors.length} legality errors`,
        details: errors.slice(0, 3).map((e) => e.message).join('; '),
      });
      void logAppAudit({
        kind: 'opening-cache-invalidated',
        category: 'subsystem',
        source: 'openingGenerator.getCachedOpening',
        summary: `cache invalidated: "${name}" — broken tree evicted`,
        details: JSON.stringify({ name, normalized, errorCount: errors.length }),
      });
      await db.cachedOpenings.delete(normalized);
      return null;
    }
    void logAppAudit({
      kind: 'opening-cache-hit',
      category: 'subsystem',
      source: 'openingGenerator.getCachedOpening',
      summary: `cache hit: "${name}" (${cached.tree.openingName}, generated ${new Date(cached.generatedAt).toISOString().slice(0, 10)})`,
      details: JSON.stringify({
        name,
        normalized,
        cachedName: cached.tree.openingName,
        cachedEco: cached.eco,
        generatedAt: cached.generatedAt,
        ageMs: Date.now() - cached.generatedAt,
      }),
    });
    return cached.tree;
  } catch {
    return null;
  }
}

/** Persist a generated tree to Dexie so the second visit is instant. */
export async function cacheOpening(
  name: string,
  tree: WalkthroughTree,
): Promise<void> {
  try {
    const record: CachedOpening = {
      normalizedName: normalizeOpeningName(name),
      displayName: tree.openingName,
      eco: tree.eco,
      tree,
      generatedAt: Date.now(),
    };
    await db.cachedOpenings.put(record);
  } catch (err) {
    void logAppAudit({
      kind: 'dexie-error',
      category: 'subsystem',
      source: 'openingGenerator.cacheOpening',
      summary: `failed to cache "${name}"`,
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Result of a generation attempt. */
export interface GenerationResult {
  ok: boolean;
  tree?: WalkthroughTree;
  /** Reason for failure when ok=false. */
  reason?: string;
  /** Validation issues if any (even on success — warnings only). */
  issues?: string;
}

/** Auto-fix cosmetic schema mistakes the LLM repeatedly makes:
 *  missing label / forkSubtitle on fork children. The validator
 *  flags both as errors which forces a retry — but they're trivially
 *  derivable from the child's SAN. Production audit (build 23c484d)
 *  caught Pirc validation failing on 4 missing-label/subtitle errors
 *  even though the chess content was largely correct. Mutating in
 *  place keeps the caller path simple. Returns the count of fields
 *  filled so the audit can record what was repaired. */
/** Normalize every SAN string in a tree (root walk) by stripping
 *  annotation marks (!, ?, !!, ??, !?, ?!). chess.js rejects SAN with
 *  trailing annotations; the LLM frequently emits them on punish
 *  inaccuracies (e.g. "g4?") and occasionally on tree nodes. The
 *  validator already strips before its chess.js calls, but the
 *  RUNTIME (drill playback, punish move execution, walkthrough animation)
 *  also feeds these SANs into chess.js — so the cached data must be
 *  clean too. Mutates in place. Returns the count of fields normalized. */
export function normalizeTreeSans(tree: WalkthroughTree): number {
  let touched = 0;
  function walk(node: WalkthroughTreeNode): void {
    if (node.san !== null) {
      const stripped = stripSanAnnotations(node.san);
      if (stripped !== node.san) {
        node.san = stripped;
        touched += 1;
      }
    }
    for (const child of node.children) {
      walk(child.node);
    }
  }
  walk(tree.root);
  return touched;
}

/** Normalize SANs on a stage payload (one of concepts / findMove /
 *  drill / punish). Mutates in place. Returns count. */
export function normalizeStageSans(
  stage: 'concepts' | 'findMove' | 'drill' | 'punish',
  data: unknown[],
): number {
  let touched = 0;
  const strip = (s: string): string => {
    const stripped = stripSanAnnotations(s);
    if (stripped !== s) touched += 1;
    return stripped;
  };
  if (stage === 'findMove') {
    for (const q of data as { path?: string[]; candidates?: { san: string }[] }[]) {
      if (q.path) q.path = q.path.map(strip);
      if (q.candidates) {
        for (const c of q.candidates) c.san = strip(c.san);
      }
    }
  } else if (stage === 'drill') {
    for (const line of data as { moves?: string[] }[]) {
      if (line.moves) line.moves = line.moves.map(strip);
    }
  } else if (stage === 'punish') {
    for (const lesson of data as {
      setupMoves?: string[];
      inaccuracy?: string;
      punishment?: string;
      distractors?: { san: string }[];
      followup?: { san: string }[];
    }[]) {
      if (lesson.setupMoves) lesson.setupMoves = lesson.setupMoves.map(strip);
      if (typeof lesson.inaccuracy === 'string') lesson.inaccuracy = strip(lesson.inaccuracy);
      if (typeof lesson.punishment === 'string') lesson.punishment = strip(lesson.punishment);
      if (lesson.distractors) {
        for (const d of lesson.distractors) d.san = strip(d.san);
      }
      if (lesson.followup) {
        for (const f of lesson.followup) f.san = strip(f.san);
      }
    }
  } else if (stage === 'concepts') {
    for (const q of data as { path?: string[] }[]) {
      if (q.path) q.path = q.path.map(strip);
    }
  }
  return touched;
}

// ───────────────────────────────────────────────────────────────────
// STAGE REPAIR — drop bad individual entries instead of failing whole
// stages. The LLM produces 5 punish lessons; if 1 has an illegal SAN,
// we want to keep the other 4, not throw the entire stage away.
//
// Production audit (build 23c484d) showed the Pirc punish stage being
// discarded wholesale due to 6 errors — but really only 2-3 lessons
// were broken; the others were fine. The user wants ANY opening they
// pick to "just work," so per-stage all-or-nothing rejection has to go.
// ───────────────────────────────────────────────────────────────────

interface StageRepairReport {
  /** Entries dropped because they were unsalvageable. */
  dropped: number;
  /** Entries mutated to fix recoverable issues. */
  fixed: number;
  /** Per-action notes for audit logging. */
  notes: string[];
}

/** Try a SAN sequence from a starting position; return the resulting
 *  Chess instance if every move is legal, else null. */
function replayAll(sans: string[], startFen?: string): Chess | null {
  const c = startFen ? new Chess(startFen) : new Chess();
  for (const san of sans) {
    try {
      c.move(stripSanAnnotations(san));
    } catch {
      return null;
    }
  }
  return c;
}

/** Concepts repair:
 *  - single-select with 2+ correct → promote to multiSelect (LLM
 *    intended multi-correct; preserves the question)
 *  - 0 correct → drop (no salvage)
 *  - 0 choices → drop
 *  - illegal path → strip the path (question still works as
 *    starting-position MC) */
export function repairConceptsStage(
  data: ConceptCheckQuestion[],
): { kept: ConceptCheckQuestion[]; report: StageRepairReport } {
  const kept: ConceptCheckQuestion[] = [];
  const report: StageRepairReport = { dropped: 0, fixed: 0, notes: [] };
  for (let i = 0; i < data.length; i += 1) {
    const q = data[i];
    if (!q.choices || q.choices.length === 0) {
      report.dropped += 1;
      report.notes.push(`concepts[${i}]: dropped — no choices`);
      continue;
    }
    const correctCount = q.choices.filter((c) => c.correct).length;
    if (correctCount === 0) {
      report.dropped += 1;
      report.notes.push(`concepts[${i}]: dropped — no correct choice`);
      continue;
    }
    if (!q.multiSelect && correctCount > 1) {
      q.multiSelect = true;
      report.fixed += 1;
      report.notes.push(
        `concepts[${i}]: promoted to multiSelect (had ${correctCount} correct)`,
      );
    }
    if (q.path && q.path.length > 0 && !replayAll(q.path)) {
      const droppedPath = q.path.join(' ');
      q.path = [];
      report.fixed += 1;
      report.notes.push(`concepts[${i}]: stripped illegal path "${droppedPath}"`);
    }
    kept.push(q);
  }
  return { kept, report };
}

/** FindMove repair:
 *  - illegal path → drop (the position can't be reached, no salvage)
 *  - illegal candidate SAN → drop just that candidate
 *  - 0 correct candidates after pruning → drop
 *  - 2+ correct candidates → keep only first as correct, mark rest false
 *  - <2 candidates remaining → drop (MC needs at least 2 options) */
export function repairFindMoveStage(
  data: FindMoveQuestion[],
): { kept: FindMoveQuestion[]; report: StageRepairReport } {
  const kept: FindMoveQuestion[] = [];
  const report: StageRepairReport = { dropped: 0, fixed: 0, notes: [] };
  for (let i = 0; i < data.length; i += 1) {
    const q = data[i];
    const replay = replayAll(q.path ?? []);
    if (!replay) {
      report.dropped += 1;
      report.notes.push(`findMove[${i}]: dropped — illegal path`);
      continue;
    }
    const fen = replay.fen();
    // Filter candidates by SAN legality from the path FEN.
    const validCandidates = q.candidates.filter((c) => {
      const probe = new Chess(fen);
      try {
        probe.move(stripSanAnnotations(c.san));
        return true;
      } catch {
        return false;
      }
    });
    const droppedCands = q.candidates.length - validCandidates.length;
    if (droppedCands > 0) {
      report.fixed += 1;
      report.notes.push(
        `findMove[${i}]: dropped ${droppedCands} illegal candidate(s)`,
      );
    }
    if (validCandidates.length < 2) {
      report.dropped += 1;
      report.notes.push(
        `findMove[${i}]: dropped — only ${validCandidates.length} valid candidate(s) after pruning`,
      );
      continue;
    }
    // Enforce exactly-one-correct.
    const correctIndices = validCandidates
      .map((c, idx) => (c.correct ? idx : -1))
      .filter((idx) => idx >= 0);
    if (correctIndices.length === 0) {
      report.dropped += 1;
      report.notes.push(`findMove[${i}]: dropped — no correct candidate`);
      continue;
    }
    if (correctIndices.length > 1) {
      // Keep first as correct; mark rest false.
      for (let j = 1; j < correctIndices.length; j += 1) {
        validCandidates[correctIndices[j]].correct = false;
      }
      report.fixed += 1;
      report.notes.push(
        `findMove[${i}]: kept first of ${correctIndices.length} correct candidates`,
      );
    }
    // Board-claim gate the prose: the prompt against the question FEN,
    // each candidate's label+explanation against the FEN AFTER its move
    // (that's the position the explanation describes).
    q.prompt = gradeNarrationText(q.prompt, fen, 'openingGenerator.findMove') ?? q.prompt;
    for (const c of validCandidates) {
      let afterFen = fen;
      try {
        const probe = new Chess(fen);
        probe.move(stripSanAnnotations(c.san));
        afterFen = probe.fen();
      } catch { /* keep fen */ }
      c.label = gradeNarrationText(c.label, afterFen, 'openingGenerator.findMove') ?? c.label;
      c.explanation = gradeNarrationText(c.explanation, afterFen, 'openingGenerator.findMove') ?? c.explanation;
    }
    q.candidates = validCandidates;
    kept.push(q);
  }
  return { kept, report };
}

/** Drill repair:
 *  - empty moves → drop
 *  - line illegal at move N → if N >= 4 plies, truncate (still useful
 *    as a partial drill); else drop entirely */
export function repairDrillStage(
  data: DrillLine[],
): { kept: DrillLine[]; report: StageRepairReport } {
  const kept: DrillLine[] = [];
  const report: StageRepairReport = { dropped: 0, fixed: 0, notes: [] };
  for (let i = 0; i < data.length; i += 1) {
    const line = data[i];
    if (!line.moves || line.moves.length === 0) {
      report.dropped += 1;
      report.notes.push(`drill[${i}]: dropped — empty moves`);
      continue;
    }
    // Walk move-by-move; find the longest legal prefix.
    const c = new Chess();
    let legalUpTo = 0;
    for (let j = 0; j < line.moves.length; j += 1) {
      try {
        c.move(stripSanAnnotations(line.moves[j]));
        legalUpTo = j + 1;
      } catch {
        break;
      }
    }
    if (legalUpTo === line.moves.length) {
      kept.push(line);
      continue;
    }
    if (legalUpTo >= 4) {
      const dropped = line.moves.length - legalUpTo;
      line.moves = line.moves.slice(0, legalUpTo);
      report.fixed += 1;
      report.notes.push(
        `drill[${i}]: truncated last ${dropped} illegal move(s)`,
      );
      kept.push(line);
    } else {
      report.dropped += 1;
      report.notes.push(
        `drill[${i}]: dropped — only ${legalUpTo} legal move(s) before illegal SAN`,
      );
    }
  }
  return { kept, report };
}

/** Punish repair (most complex — multi-part lesson with several
 *  SAN fields). Drop policy:
 *  - illegal setupMoves / inaccuracy / punishment → drop the lesson
 *    (these are load-bearing; can't continue without them)
 *  - illegal individual distractor → drop just that distractor
 *  - 0 distractors remaining → drop the lesson (MC needs alternatives)
 *  - illegal followup move → truncate followup at the failing index */
export function repairPunishStage(
  data: PunishLesson[],
): { kept: PunishLesson[]; report: StageRepairReport } {
  const kept: PunishLesson[] = [];
  const report: StageRepairReport = { dropped: 0, fixed: 0, notes: [] };
  for (let i = 0; i < data.length; i += 1) {
    const lesson = data[i];
    // Resolve the setup FEN. Puzzle-DB-derived lessons carry an
    // explicit setupFen; LLM-emitted lessons replay setupMoves from
    // the standard start. Either way we end up with a single FEN to
    // probe the inaccuracy / punishment / distractors against.
    let setupFen: string;
    if (lesson.setupFen) {
      try {
        setupFen = new Chess(lesson.setupFen).fen();
      } catch {
        report.dropped += 1;
        report.notes.push(`punish[${i}]: dropped — invalid setupFen`);
        continue;
      }
    } else {
      const setupChess = replayAll(lesson.setupMoves ?? []);
      if (!setupChess) {
        report.dropped += 1;
        report.notes.push(`punish[${i}]: dropped — illegal setupMoves`);
        continue;
      }
      setupFen = setupChess.fen();
    }
    // Apply inaccuracy to get the post-inaccuracy FEN.
    let postInaccuracyFen: string;
    try {
      const probe = new Chess(setupFen);
      probe.move(stripSanAnnotations(lesson.inaccuracy));
      postInaccuracyFen = probe.fen();
    } catch {
      report.dropped += 1;
      report.notes.push(
        `punish[${i}]: dropped — illegal inaccuracy "${lesson.inaccuracy}"`,
      );
      continue;
    }
    // Apply punishment to get the post-punish FEN.
    let postPunishFen: string;
    try {
      const probe = new Chess(postInaccuracyFen);
      probe.move(stripSanAnnotations(lesson.punishment));
      postPunishFen = probe.fen();
    } catch {
      report.dropped += 1;
      report.notes.push(
        `punish[${i}]: dropped — illegal punishment "${lesson.punishment}"`,
      );
      continue;
    }
    // Filter distractors.
    const validDistractors = (lesson.distractors ?? []).filter((d) => {
      const probe = new Chess(postInaccuracyFen);
      try {
        probe.move(stripSanAnnotations(d.san));
        return true;
      } catch {
        return false;
      }
    });
    const droppedDist = (lesson.distractors?.length ?? 0) - validDistractors.length;
    if (droppedDist > 0) {
      report.fixed += 1;
      report.notes.push(`punish[${i}]: dropped ${droppedDist} illegal distractor(s)`);
    }
    if (validDistractors.length === 0) {
      report.dropped += 1;
      report.notes.push(
        `punish[${i}]: dropped — 0 valid distractors after pruning (MC needs alternatives)`,
      );
      continue;
    }
    lesson.distractors = validDistractors;
    // Truncate followup at first illegal move.
    if (lesson.followup && lesson.followup.length > 0) {
      const probe = new Chess(postPunishFen);
      let legalUpTo = 0;
      for (let j = 0; j < lesson.followup.length; j += 1) {
        try {
          probe.move(stripSanAnnotations(lesson.followup[j].san));
          legalUpTo = j + 1;
        } catch {
          break;
        }
      }
      if (legalUpTo < lesson.followup.length) {
        const dropped = lesson.followup.length - legalUpTo;
        lesson.followup = lesson.followup.slice(0, legalUpTo);
        report.fixed += 1;
        report.notes.push(`punish[${i}]: truncated ${dropped} illegal followup move(s)`);
      }
    }
    // Shared narration gate on the punish prose: whyBad describes the
    // position AFTER the inaccuracy, whyPunish the position AFTER the
    // punishment — drop any board-false sentence against those exact FENs.
    lesson.whyBad = gradeNarrationText(lesson.whyBad, postInaccuracyFen, 'openingGenerator.punish') ?? lesson.whyBad;
    lesson.whyPunish = gradeNarrationText(lesson.whyPunish, postPunishFen, 'openingGenerator.punish') ?? lesson.whyPunish;
    // Each distractor explanation describes the position AFTER that
    // distractor move; each followup idea the position after its move.
    for (const d of lesson.distractors) {
      let dFen = postInaccuracyFen;
      try { const p = new Chess(postInaccuracyFen); p.move(stripSanAnnotations(d.san)); dFen = p.fen(); } catch { /* keep */ }
      d.label = gradeNarrationText(d.label, dFen, 'openingGenerator.punish') ?? d.label;
      d.explanation = gradeNarrationText(d.explanation, dFen, 'openingGenerator.punish') ?? d.explanation;
    }
    if (lesson.followup && lesson.followup.length > 0) {
      const fp = new Chess(postPunishFen);
      for (const step of lesson.followup) {
        try { fp.move(stripSanAnnotations(step.san)); } catch { break; }
        step.idea = gradeNarrationText(step.idea, fp.fen(), 'openingGenerator.punish') ?? step.idea;
      }
    }
    kept.push(lesson);
  }
  return { kept, report };
}

/** Extract the destination square from a SAN string. Returns null
 *  for castle moves (special — no single dest). Strips check/mate
 *  marks and promotion suffixes before matching the trailing square.
 *  Used by repairNarrationArrows to detect "this arrow just shows
 *  the move that's already animating." */
function sanDestSquare(san: string): string | null {
  if (san === 'O-O' || san === 'O-O-O' || san === '0-0' || san === '0-0-0') {
    return null;
  }
  const stripped = san.replace(/[+#!?]+$/, '');
  const m = stripped.match(/([a-h][1-8])(?:=[QRBN])?$/);
  return m ? m[1] : null;
}

/** Drop narration arrows that are redundant or invalid:
 *  - from === to (LLM no-op "highlight this square" gestures —
 *    Hampe-Allgaier audit caught three of these failing validation)
 *  - to === the move's destination square (the move is already
 *    animating from start→dest; an arrow drawn at that same dest
 *    just clutters the board — production audit (build bdc447a)
 *    caught Bishop's Opening drawing a green arrow on Bc4 showing
 *    the bishop's destination square it was just animated TO).
 *  Mutates in place. Returns the count dropped. */
export function repairNarrationArrows(tree: WalkthroughTree): number {
  let dropped = 0;
  function walk(node: WalkthroughTreeNode): void {
    if (node.narration && node.san !== null) {
      const dest = sanDestSquare(node.san);
      for (const seg of node.narration) {
        if (seg.arrows) {
          const before = seg.arrows.length;
          seg.arrows = seg.arrows.filter((a) => {
            if (a.from === a.to) return false;
            // Drop arrows where the END is the move's destination
            // (showing where the piece just moved TO). Note: arrows
            // FROM the destination toward another square (e.g.
            // c4→f7 to show "now this bishop eyes f7") are kept —
            // those convey new information beyond the move itself.
            if (dest && a.to === dest) return false;
            return true;
          });
          dropped += before - seg.arrows.length;
        }
      }
    }
    for (const child of node.children) {
      walk(child.node);
    }
  }
  walk(tree.root);
  return dropped;
}

/** Strip provably-false board-fact sentences from every node's SPOKEN
 *  narration (idea / shortIdea / each narration segment text), validated
 *  against the position AFTER that node's move — replayed deterministically
 *  from the standard start. Closes the Learn-walkthrough hole: this
 *  DB-narration generator writes the per-move prose with the LLM and it was
 *  never board-checked at runtime, so a claim like "the knight on f6" with
 *  no knight on f6 shipped straight to the student. ONLY provably-false
 *  piece-on-square / pin-geometry claims are dropped; positional phrasing
 *  ("shoring up d5") is the idea-frontier and is left untouched. Returns the
 *  count of sentences dropped. */
export function gradeNarrationBoardClaims(tree: WalkthroughTree): number {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  let touched = 0;
  // Uses the shared `gradeNarrationText` — the SAME board-claim primitive
  // the spine and every other generator use (one source of truth).
  const gate = (text: string | undefined, fen: string): string | undefined => {
    const out = gradeNarrationText(text, fen, 'openingGenerator');
    if (out !== text) touched += 1;
    return out;
  };
  const walk = (node: WalkthroughTreeNode, fenBefore: string): void => {
    let fenAfter = fenBefore;
    if (node.san !== null) {
      try {
        const chess = new Chess(fenBefore);
        chess.move(node.san);
        fenAfter = chess.fen();
      } catch {
        return; // can't replay this branch — don't validate against a wrong FEN
      }
      node.idea = gate(node.idea, fenAfter) ?? node.idea;
      if (node.shortIdea !== undefined) node.shortIdea = gate(node.shortIdea, fenAfter);
      if (node.narration) {
        for (const seg of node.narration) {
          seg.text = gate(seg.text, fenAfter) ?? seg.text;
          if (seg.shortText !== undefined) seg.shortText = gate(seg.shortText, fenAfter);
        }
      }
    }
    for (const child of node.children) walk(child.node, fenAfter);
  };
  walk(tree.root, START);
  return touched;
}

export function repairForkLabels(tree: WalkthroughTree): number {
  let filled = 0;
  function walk(node: WalkthroughTreeNode): void {
    if (node.children.length > 1) {
      for (const child of node.children) {
        if (!child.label || !child.label.trim()) {
          child.label = child.node.san ?? '';
          filled += 1;
        }
        if (!child.forkSubtitle || !child.forkSubtitle.trim()) {
          // Derive from the child's first idea sentence — it's a coach
          // explanation so the first sentence usually states the plan.
          // Falls back to the SAN if the idea is empty.
          const idea = child.node.idea ?? '';
          const firstSentence = idea.split(/(?<=[.!?])\s/)[0]?.trim() ?? '';
          // Cap to keep the chip from getting unwieldy on the fork picker.
          const subtitle = firstSentence.length > 80
            ? firstSentence.slice(0, 79) + '…'
            : firstSentence;
          child.forkSubtitle = subtitle || (child.node.san ?? '—');
          filled += 1;
        }
      }
    }
    for (const child of node.children) {
      walk(child.node);
    }
  }
  walk(tree.root);
  return filled;
}

/** Drop leafOutros keys that don't correspond to any actual leaf
 *  path in the tree. Production audit (build 998f5c4) caught
 *  "Pirc Defense: Austrian Attack" failing both gen attempts because
 *  two leafOutros keys referenced paths the LLM emitted in its outro
 *  draft but never built into the actual tree. The text is harmless
 *  metadata — orphan keys do nothing at runtime — but the validator
 *  was failing the WHOLE tree over them. Drop the orphans, keep the
 *  rest. Returns count of keys dropped. */
export function repairLeafOutros(tree: WalkthroughTree): number {
  if (!tree.leafOutros) return 0;
  const validLeafPaths = new Set<string>();
  function collect(node: WalkthroughTreeNode, path: string[]): void {
    const here = node.san !== null ? [...path, node.san] : path;
    if (node.children.length === 0) {
      validLeafPaths.add(here.join(' '));
      return;
    }
    for (const c of node.children) collect(c.node, here);
  }
  collect(tree.root, []);
  let dropped = 0;
  for (const key of Object.keys(tree.leafOutros)) {
    if (!validLeafPaths.has(key)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- legitimate dynamic-key pruning of stale leaf outros.
      delete tree.leafOutros[key];
      dropped += 1;
    }
  }
  return dropped;
}

/** Walk the tree and prune any subtree rooted at an illegal SAN —
 *  keep the parent node but drop the bad child wrapper entirely.
 *  Production audit (build 59282db) caught "Italian Game:
 *  Blackburne-Kostić Gambit" failing because deep in a punish line
 *  the LLM emitted Be6 from a position where neither bishop could
 *  reach e6 (geometric hallucination). Rather than fail the whole
 *  tree over one bad branch, prune the bad branch and let the rest
 *  of the lesson ship. Returns count of subtrees pruned. */
export function repairTreeIllegalSubtrees(tree: WalkthroughTree): number {
  let pruned = 0;
  const startFen =
    tree.startFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  function walk(node: WalkthroughTreeNode, parentFen: string): void {
    let currentFen = parentFen;
    if (node.san !== null) {
      const probe = new Chess(parentFen);
      try {
        probe.move(stripSanAnnotations(node.san));
      } catch {
        // Caller prunes — we never enter here directly. Children of an
        // illegal node can't be replayed because the FEN is unknown,
        // so dump them too.
        node.children = [];
        return;
      }
      currentFen = probe.fen();
    }
    // Drop child wrappers whose root SAN is illegal at currentFen, then
    // recurse into surviving children to prune deeper illegality.
    const kept: typeof node.children = [];
    for (const child of node.children) {
      const childSan = child.node.san;
      if (childSan === null) {
        kept.push(child);
        continue;
      }
      const probe = new Chess(currentFen);
      try {
        probe.move(stripSanAnnotations(childSan));
        kept.push(child);
      } catch {
        pruned += 1;
      }
    }
    node.children = kept;
    for (const child of node.children) {
      walk(child.node, currentFen);
    }
  }
  walk(tree.root, startFen);
  return pruned;
}

/** Catch-all content cleanup for the long tail of small validator
 *  errors that shouldn't fail an entire 30-60s LLM gen. Handles:
 *
 *  - Empty `idea` on a non-root node — fill with the SAN itself so
 *    the empty-idea + idea-mentions-SAN checks both pass. The lesson
 *    is shallower for that one move but doesn't fail the gen.
 *  - Empty `narration` array — delete the field (the validator says
 *    "omit the field instead" so we comply).
 *  - Empty narration segment text — drop the segment; if all
 *    segments were empty, delete the narration field entirely.
 *  - Invalid algebraic arrow.from / arrow.to / highlight.square —
 *    drop just that arrow / highlight. Validator only accepts a-h+1-8.
 *  - Empty `openingName` — fall back to the requested name.
 *  - Empty `eco` — fall back to "?" (the field is required to be
 *    non-empty but the LLM occasionally omits ECO for niche openings).
 *
 *  Returns aggregate counts so audit can spot patterns. */
export function repairTreeContent(
  tree: WalkthroughTree,
  requestedName: string,
): {
  ideasFilled: number;
  narrationsDropped: number;
  segmentsDropped: number;
  arrowsDropped: number;
  highlightsDropped: number;
  treeFieldsFilled: number;
} {
  const out = {
    ideasFilled: 0,
    narrationsDropped: 0,
    segmentsDropped: 0,
    arrowsDropped: 0,
    highlightsDropped: 0,
    treeFieldsFilled: 0,
  };
  const SQUARE_RE = /^[a-h][1-8]$/;
  // Tree-level fields.
  if (!tree.openingName.trim()) {
    tree.openingName = requestedName;
    out.treeFieldsFilled += 1;
  }
  if (!tree.eco.trim()) {
    tree.eco = '?';
    out.treeFieldsFilled += 1;
  }
  function walk(node: WalkthroughTreeNode): void {
    if (node.san !== null && !node.idea.trim()) {
      // The validator's empty-idea check is hard-error; the
      // mention-SAN check is a warning. Use a sentence-form template
      // with the SAN embedded so narration is at least readable
      // ("Bare SAN" was unusable — TTS would say just "e4" with no
      // context). Word count is low (~7 words) which still trips the
      // "short idea" warning, but warnings don't fail the gen.
      const piece = node.san[0];
      const isPiece = ['N', 'B', 'R', 'Q', 'K'].includes(piece);
      node.idea = isPiece
        ? `${node.san} continues development for ${node.movedBy ?? 'the side to move'}.`
        : `${node.san} — the standard reply in this line.`;
      out.ideasFilled += 1;
    }
    if (node.narration !== undefined) {
      // Drop empty-text segments; drop arrows/highlights with bad squares.
      const cleanSegs = [];
      for (const seg of node.narration) {
        if (!seg.text.trim()) {
          out.segmentsDropped += 1;
          continue;
        }
        if (seg.arrows) {
          const before = seg.arrows.length;
          seg.arrows = seg.arrows.filter(
            (a) => SQUARE_RE.test(a.from) && SQUARE_RE.test(a.to),
          );
          out.arrowsDropped += before - seg.arrows.length;
        }
        if (seg.highlights) {
          const before = seg.highlights.length;
          seg.highlights = seg.highlights.filter((h) =>
            SQUARE_RE.test(h.square),
          );
          out.highlightsDropped += before - seg.highlights.length;
        }
        cleanSegs.push(seg);
      }
      if (cleanSegs.length === 0) {
        delete node.narration;
        out.narrationsDropped += 1;
      } else {
        node.narration = cleanSegs;
      }
    }
    for (const child of node.children) walk(child.node);
  }
  walk(tree.root);
  return out;
}

/** Generate a walkthrough tree for the given opening name. Tries
 *  once; on validation failure, tries once more with the error
 *  messages fed back. Returns null on total failure. */
export interface GenerateOpeningOptions {
  /** When 'face', the LLM is instructed to teach the OPPOSITE side
   *  the main-line counter against the named opening. The resulting
   *  tree's openingName will be the counter (e.g. "English Attack vs
   *  Najdorf"), not the original variation. Default 'learn'. */
  mode?: 'learn' | 'face';
  /** 'full' = the standard lesson with branch extensions to
   *  middlegame, post-walkthrough quiz / drill / punish stages, and
   *  longer per-move narrations. 'tour' = a quick playthrough — same
   *  spine + fork branches (so variation choice still works) but
   *  shorter narrations, shorter branch extensions, and no
   *  post-walkthrough stage gens. User: "Add a quick walk through
   *  mode from coach." Default 'full'. */
  pace?: 'full' | 'tour';
}

/** Schema for the narration-only LLM call. Inverts the gen
 *  architecture: code provides the move sequence (legal by DB
 *  construction) and the FENs (correct by chess.js replay); the LLM
 *  only writes one short sentence per move plus intro/outro.
 *
 *  v2 extension: when the canonical opening has sibling DB entries
 *  that extend its PGN (e.g. Najdorf has English Attack, Adams
 *  Attack, Bg5 Main Line, Opocensky etc), code surfaces them as
 *  fork branches at the end of the spine and asks the LLM for a
 *  one-sentence teaser idea per branch. */
const NARRATION_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['intro', 'outro', 'ideas'],
  properties: {
    intro: { type: 'string' },
    shortIntro: { type: 'string' },
    outro: { type: 'string' },
    ideas: {
      type: 'array',
      items: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string' },
          shortText: { type: 'string' },
          arrows: {
            type: 'array',
            items: {
              type: 'object',
              required: ['from', 'to'],
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
              },
            },
          },
        },
      },
    },
    branchIdeas: { type: 'array', items: { type: 'string' } },
    shortBranchIdeas: { type: 'array', items: { type: 'string' } },
    // For each fork branch, ideas for the EXTENSION moves that walk
    // the line into middlegame. Outer index matches branches[]; inner
    // index matches branches[i].extensionMoves[]. User: "ALL lines
    // extend to here [middlegame]." Without this every branch was
    // just the one divergent move, dropping the student off at the
    // moment the variation gets named with no idea what to play next.
    branchExtensionIdeas: {
      type: 'array',
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string' },
            shortText: { type: 'string' },
            arrows: {
              type: 'array',
              items: {
                type: 'object',
                required: ['from', 'to'],
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
};

interface NarrationIdea {
  text: string;
  shortText?: string;
  arrows?: { from: string; to: string }[];
}

interface NarrationOutput {
  intro: string;
  shortIntro?: string;
  outro: string;
  ideas: NarrationIdea[];
  branchIdeas?: string[];
  shortBranchIdeas?: string[];
  branchExtensionIdeas?: NarrationIdea[][];
}

/** PRIMARY gen path: build the walkthrough tree skeleton from the
 *  Lichess DB's canonical PGN (deterministic — moves are legal by
 *  DB construction, FENs are correct by chess.js replay), then ask
 *  the LLM for ONE short sentence per move plus an intro and outro.
 *  Same end-state as the legacy free-form tree gen but with all the
 *  failure modes structurally eliminated:
 *    - No invalid SANs (DB guarantees them).
 *    - No JSON tree shape errors (the schema is tiny + flat).
 *    - No truncation mid-tree (output is N short strings, not a
 *      deeply-nested tree).
 *    - Token usage is roughly N × 25 words, far smaller than the
 *      old 30-50K-char tree responses.
 *
 *  Returns null when the opening isn't in the DB (caller should
 *  fall through to the legacy free-form gen path). */
// Helper for sibling DB extensions (deep-dive forks) is in
// openingDetectionService — we use it here without re-importing the
// raw openings-lichess.json data.


async function generateOpeningFromDbNarration(
  name: string,
  pace: 'full' | 'tour' = 'full',
  /** Optional FACE-mode metadata. When provided, the resulting
   *  tree's studentSide is FLIPPED (the student plays the OPPOSITE
   *  side from the canonical opening — they're learning the counter,
   *  not the opening itself), and the openingName is prefixed with
   *  "Facing: " so the UI doesn't confuse it for a normal lesson.
   *  Caller passes the original opening's display name so the prose
   *  can frame the lesson as a counter to that opening. */
  faceContext?: { originalDisplayName: string },
): Promise<WalkthroughTree | null> {
  // Prefer the curated repertoire line (the exact PGN the opening detail
  // tab teaches) so a picker-chosen variation matches the opening tab; fall
  // back to the ECO DB for anything not in the curated repertoire.
  const entry = resolveCuratedVariation(name) ?? resolveOpeningEntry(name);
  if (!entry || entry.moves.length === 0) return null;

  // Use the SHORTEST canonical PGN as the spine. The DB carries
  // multiple rows for popular openings at different depths (Najdorf
  // at 10/11/12/13/14 plies); the bare entry is the natural spine
  // and leaves the most room for fork branches at the end. The
  // longer-depth rows ARE valid lines but they're better surfaced
  // as DB-grounded deep-dive targets, not the default walkthrough.
  const shortPgn = findShortestCanonicalPgn(entry.canonicalName);
  const spineMoves = shortPgn
    ? shortPgn.split(/\s+/).filter(Boolean)
    : entry.moves;

  // 1. Replay the PGN, collect each move's SAN + post-move FEN.
  type Position = { san: string; fen: string; ply: number; movedBy: 'white' | 'black' };
  const positions: Position[] = [];
  const c = new Chess();
  for (let i = 0; i < spineMoves.length; i += 1) {
    try {
      c.move(stripSanAnnotations(spineMoves[i]));
    } catch {
      return null; // DB entry corrupt — extremely rare, abort
    }
    positions.push({
      san: spineMoves[i],
      fen: c.fen(),
      ply: i,
      movedBy: i % 2 === 0 ? 'white' : 'black',
    });
  }

  // 1b. Find sibling extensions to inject as deep-dive fork branches
  //     at the end of the spine. For Najdorf this surfaces English
  //     Attack, Adams Attack, Bg5 Main Line, Opocensky / Scheveningen
  //     under Be2, etc. — the actual deep-dive choices a student
  //     would expect.
  const rawBranches: ForkBranch[] = findSiblingExtensionBranches(
    entry.canonicalName,
    spineMoves.join(' '),
  );
  // Tour mode caps branch extensions tighter so the lesson stays
  // snappy. Full mode runs each branch to the END of the Lichess DB
  // entry (no truncation — `findSiblingExtensionBranches` returns
  // every ply the DB carries); tour shortens to 3 plies so each
  // branch is a quick taste, not a deep walkthrough.
  const TOUR_EXT_CAP = 3;
  const branches: ForkBranch[] = pace === 'tour'
    ? rawBranches.map((b) => ({
        ...b,
        extensionMoves: b.extensionMoves.slice(0, TOUR_EXT_CAP),
      }))
    : rawBranches;

  // 2. Single LLM call: ask for narration text only.
  // Student side: in normal mode, derive from the canonical name.
  // In FACE mode the student plays the OPPOSITE side (they're
  // learning the counter to the named opening, not the opening
  // itself), so flip.
  const baseStudentSide = inferStudentSideFromName(entry.canonicalName);
  const studentSide = faceContext
    ? (baseStudentSide === 'white' ? 'black' : 'white')
    : baseStudentSide;
  const moveLabels = positions
    .map((p, idx) => {
      const moveNum = Math.floor(p.ply / 2) + 1;
      const dotted = p.movedBy === 'white' ? `${moveNum}.` : `${moveNum}…`;
      return `${idx + 1}. ${dotted}${p.san}  (after this move FEN: ${p.fen})`;
    })
    .join('\n');
  // Branches sit at the position AFTER the canonical's last move.
  // Same FEN = positions[last].fen. Whose turn is determined by the
  // total ply count's parity.
  const branchLabels = branches
    .map((b, idx) => {
      const extInfo =
        b.extensionMoves.length > 0
          ? ` extending into middlegame with: ${b.extensionMoves.join(' ')}`
          : '';
      return `${idx + 1}. "${b.label}" (entry move: ${b.san}) — ${b.count} sub-line${b.count === 1 ? '' : 's'} in DB${extInfo}`;
    })
    .join('\n');
  const lessonFraming = faceContext
    ? `a walkthrough of "${entry.canonicalName}" — the canonical White (or attacking side) counter to "${faceContext.originalDisplayName}". The student is the side PLAYING this counter (learning to face the named opening from the opposite perspective), not the side being countered.`
    : `a walkthrough of "${entry.canonicalName}".`;
  const systemPrompt = `You are an expert chess coach narrating ${lessonFraming} Output ONLY a JSON object matching the schema. The move sequence and positions are PROVIDED — do NOT invent or alter them. Your only job is to write short coach commentary plus optional visualization arrows.

VOICE RULES (locked 2026-05-19):
- Confident + declarative. Name what's happening. No "you might consider", no "this could be", no marketing voice.
- Specific chess detail. Name squares, piece routes, named patterns. "the c3-knight reroutes via d2 to f1-g3" not "the knight goes to a good square".
- Tactical verbs that match the action — threatens / pressures / kicks / blunts / outposts / hammers / undermines.
- Cite by SAN inside prose. "After Bxc3 bxc3 Black has doubled c-pawns" not "the bishop trade gives doubled pawns".
- NO move-number prefixes. Write "Nc3" or "the queen's knight to c3" — never "5.Nc3" or "5...Nc3". The voice reads "5." as "five" (robotic) and the count drifts across forks. Refer to moves by bare SAN or piece+square only.
- BANNED: "powerful", "devastating", "the secret of", "key to success", "essential to remember", "we will see", "let me show you".

For each move in the line, return:
- text: ONE sentence (max ${pace === 'tour' ? 12 : 25} words) explaining the IDEA behind the move. First-person, second-person, conversational. Mention the SAN or its spoken form somewhere. ${pace === 'tour' ? 'TOUR MODE: keep narrations TIGHT — the student wants a quick playthrough, not a lecture.' : ''}Examples:
  - "e4 grabs the center and frees the king's bishop and queen."
  - "c5 — Black declines the symmetry and aims for asymmetric play on the queenside."
  - "Nc3 develops the knight, defends e4, and prepares Bc4 or Qe2."
- shortText: ONE sentence (max 18 words) — Brief mode variant of text. Strip the prose, keep the KEY chess idea (the threat / pattern / verdict). Mention the SAN. Same conventions as text but tighter. Examples:
  - "e4 grabs the center and opens lines for the queen and bishop."
  - "c5 — the Sicilian, asymmetric counterplay on the queenside."
  - "Nc3 defends e4 and prepares Bc4."
- arrows (OPTIONAL, 0-3 per move): the user wants arrows ONLY for two purposes:
  (a) THREATS — squares the moved piece NOW attacks / pressures / eyes (Bc4 → f7, Nf3 → e5, c5 → d4).
  (b) LOOK-AHEAD — the next critical square on the line we're walking (Re1 → e8 because the rook will land there in 2 moves; Nc3 → d5 because the knight is going to d5 next).
  Do NOT draw the move's own from→to (the board animates that — drawing it again is noise). Do NOT draw retrospective arrows. Skip arrows entirely when neither category fits (O-O, generic developing moves).
- Use squares in algebraic notation only (e.g. "e4", "f7"). Empty arrows array is fine; do NOT invent arrows just to fill the field.

The student is playing as ${studentSide}. Frame ideas from that perspective when relevant.

Also produce:
- intro: ONE sentence (max 25 words) framing the OPENING'S CHARACTER — sharp / positional / aggressive / quiet / etc. Name ONE concrete plan or square the student should care about. CRITICAL: do NOT recite the move list (the board will animate it). Do NOT say "after 1.e4 e5 2.Nf3..." or any variant of that — production audit (build 6393c0f) caught the LLM opening with "After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 — symmetrical opening" before saying anything useful. The student already sees the moves; tell them what the OPENING IS, not what the moves ARE.
- shortIntro: ONE sentence (max 18 words) — Brief mode variant of intro. Same content rules but tighter.
- outro: ONE sentence (max 15 words). Action-oriented — what to do next.
${branches.length > 0 ? `- branchIdeas: ONE sentence (max 20 words) for EACH branch the student might dive into next. Mention the named line and its strategic flavor (sharp / positional / pawn-storm / quiet etc).
- shortBranchIdeas: ONE sentence (max 15 words) per branch — Brief mode variants of branchIdeas, same order.
- branchExtensionIdeas: a 2D array. For EACH branch (in the same order as branches[]), emit an array of EXACTLY ONE idea object per extension move provided. Each idea object MUST include both text AND shortText (Brief mode variant). If a branch has 6 extension moves you MUST emit 6 idea objects in its inner array — no fewer. This is the most-undersized field in past gens and the student ends up reading template prose instead of your prose; do not skimp.
  - text rules: same as the spine ideas (max ${pace === 'tour' ? 12 : 25} words, mention the SAN, do NOT forecast future moves).
  - arrow rules (CRITICAL): arrows on the EXTENSION moves should ONLY show:
      (a) THREATS — squares the moved piece NOW attacks/pressures (Bc4 → f7), or
      (b) LOOK-AHEAD — the next critical square on the line you're walking (Re1 → e8 if the rook is going to lift, Nc3 → d5 if the knight is heading to d5 next).
    Do NOT draw the move's own from→to (the board animates that). Skip arrows when nothing useful to show.
  Example: for "English Attack" with extension "Ng4 Bg5 Qa5+", emit 3 idea objects narrating those three plies.` : ''}

${(() => {
  const block = buildOpeningNarrationContext(entry.canonicalName);
  if (block) {
    void logAppAudit({
      kind: 'book-grounding-injected',
      category: 'subsystem',
      source: 'openingGenerator.bookGrounding',
      summary: `narration grounded with book passages for "${entry.canonicalName}" (${block.length} chars)`,
    });
  }
  return block;
})()}`;
  const userPrompt = `Opening: ${entry.canonicalName} (${entry.eco})
Student plays: ${studentSide}
Total moves in spine: ${positions.length}

Moves with post-move FENs:
${moveLabels}
${branches.length > 0 ? `\nBranches available at the end of the spine (the student picks one to dive deeper):\n${branchLabels}\n\nFor each branch, write ONE short sentence describing what kind of line it is.` : ''}

Emit a JSON object with intro (string), shortIntro (string), outro (string), ideas (array of ${positions.length} objects { text, shortText, arrows? }, one per spine move in order)${branches.length > 0 ? `, branchIdeas (array of ${branches.length} strings), shortBranchIdeas (array of ${branches.length} strings), and branchExtensionIdeas (2D array of { text, shortText, arrows? } objects)` : ''}.`;

  let narration: NarrationOutput;
  try {
    const result = await getCoachStructuredResponse(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
      'chat_response',
      // Each idea is ~25 words ≈ 35 tokens. N moves + intro + outro
      // + JSON envelope ≈ N×40 + 200. Cap at 4K which fits ~95 ideas
      // (more than any realistic walkthrough).
      4096,
      'emit_walkthrough_narration',
      'Emit short coach narrations (one sentence per provided move) plus an intro and outro for the line.',
      NARRATION_SCHEMA,
    );
    narration = result as NarrationOutput;
  } catch (err) {
    void logAppAudit({
      kind: 'llm-error',
      category: 'subsystem',
      source: 'openingGenerator.generateOpeningFromDbNarration',
      summary: `narration LLM call failed for "${name}" — falling back to template ideas: ${err instanceof Error ? err.message : String(err)}`,
    });
    // Template fallback: each move gets a generic sentence with
    // its SAN. Same as buildFallbackTreeFromDb logic.
    narration = {
      intro: `${entry.canonicalName} — book moves from the Lichess opening database. Quick walkthrough of the canonical line.`,
      outro: `That's the canonical book line for the ${entry.canonicalName}. Drill the moves to lock them in, or ask for a deeper variation.`,
      ideas: positions.map((p) => ({ text: synthesizeIdeaFromSan(p.san, p.movedBy) })),
    };
  }

  // 3. Build the tree from the bottom up using the LLM's ideas.
  //    Branches (if any) become the children of the spine's LAST
  //    node, so when the user reaches the end of the canonical line
  //    they see fork tiles for each named extension. Tapping a tile
  //    fires the deep-dive flow that resolves the canonical name and
  //    starts a fresh focused walkthrough.
  type ChildWrap = { node: WalkthroughTreeNode; label?: string; forkSubtitle?: string };
  const SQUARE_RE = /^[a-h][1-8]$/;
  const branchChildren: ChildWrap[] = branches.map((b, idx) => {
    // The branch's first move belongs to the side whose turn it is
    // after the canonical's last ply. Position[i].ply = i, so after
    // the last spine move the next ply is positions.length (odd =
    // Black moved last → White to move; even = White moved last →
    // Black to move).
    const branchMovedBy: 'white' | 'black' =
      positions.length % 2 === 0 ? 'white' : 'black';
    const teaser =
      narration.branchIdeas?.[idx]?.trim() ||
      `${b.san} — ${b.label} (${b.count} sub-line${b.count === 1 ? '' : 's'} in the database).`;
    // Walk extension moves bottom-up to build the branch's chain.
    // Each extension ply gets its own node. User: "ALL lines extend
    // to here [middlegame]." Without these extensions every branch
    // dropped off at the moment the variation gets named — no plan,
    // no middlegame transition.
    const extIdeas = narration.branchExtensionIdeas?.[idx] ?? [];
    let extChildren: ChildWrap[] = [];
    for (let j = b.extensionMoves.length - 1; j >= 0; j -= 1) {
      const extSan = b.extensionMoves[j];
      // The branch's first move (b.san) sits at spine ply
      // positions.length (the next ply after the canonical line). The
      // j-th extension move therefore sits at the 0-indexed spine ply
      // positions.length + 1 + j, so its side follows the SAME parity
      // rule the spine uses (positions[i].movedBy = i % 2 === 0 ?
      // 'white' : 'black'). Getting this right keeps node.movedBy — and
      // the "White/Black castles" wording — correct on extension nodes.
      const absolutePly = positions.length + 1 + j;
      const extMovedBy: 'white' | 'black' =
        absolutePly % 2 === 0 ? 'white' : 'black';
      const ideaEntry = extIdeas[j];
      const text =
        (typeof ideaEntry === 'object' && ideaEntry?.text?.trim()) ||
        synthesizeIdeaFromSan(extSan, extMovedBy);
      const shortText =
        typeof ideaEntry === 'object' && ideaEntry?.shortText?.trim()
          ? ideaEntry.shortText.trim()
          : undefined;
      const rawArrows =
        typeof ideaEntry === 'object' && Array.isArray(ideaEntry?.arrows)
          ? ideaEntry.arrows
          : [];
      const arrows = rawArrows.filter(
        (a) => SQUARE_RE.test(a.from) && SQUARE_RE.test(a.to) && a.from !== a.to,
      );
      const node: WalkthroughTreeNode = {
        san: extSan,
        movedBy: extMovedBy,
        idea: text,
        children: extChildren,
      };
      if (shortText) node.shortIdea = shortText;
      if (arrows.length > 0) {
        const segment: NarrationSegmentType = { text, arrows };
        if (shortText) segment.shortText = shortText;
        node.narration = [segment];
      }
      extChildren = [{ node }];
    }
    const shortTeaser = narration.shortBranchIdeas?.[idx]?.trim();
    const branchNode: WalkthroughTreeNode = {
      san: b.san,
      movedBy: branchMovedBy,
      idea: teaser,
      children: extChildren,
    };
    if (shortTeaser) branchNode.shortIdea = shortTeaser;
    return {
      label: b.label,
      forkSubtitle: teaser,
      node: branchNode,
    };
  });
  let nextChildren: ChildWrap[] = branchChildren;
  for (let i = positions.length - 1; i >= 0; i -= 1) {
    const p = positions[i];
    const ideaEntry = narration.ideas[i];
    const text =
      (typeof ideaEntry === 'object' && ideaEntry?.text?.trim()) ||
      // Tolerate legacy string-shaped entries (older cached gens
      // pre-arrows extension might still produce them).
      (typeof ideaEntry === 'string' ? (ideaEntry as string).trim() : '') ||
      synthesizeIdeaFromSan(p.san, p.movedBy);
    const shortText =
      typeof ideaEntry === 'object' && ideaEntry?.shortText?.trim()
        ? ideaEntry.shortText.trim()
        : undefined;
    const rawArrows =
      typeof ideaEntry === 'object' && Array.isArray(ideaEntry?.arrows)
        ? ideaEntry.arrows
        : [];
    // Drop arrows with non-algebraic squares or from===to no-ops.
    // The downstream repairNarrationArrows pass would clean these
    // up too, but doing it here keeps the tree tight at build time.
    const arrows = rawArrows.filter(
      (a) => SQUARE_RE.test(a.from) && SQUARE_RE.test(a.to) && a.from !== a.to,
    );
    const node: WalkthroughTreeNode = {
      san: p.san,
      movedBy: p.movedBy,
      idea: text,
      children: nextChildren,
    };
    if (shortText) node.shortIdea = shortText;
    if (arrows.length > 0) {
      const segment: NarrationSegmentType = { text, arrows };
      if (shortText) segment.shortText = shortText;
      node.narration = [segment];
    }
    nextChildren = [{ node }];
  }
  // In Face mode, surface the canonical counter's name with a
  // "Facing: <original>" prefix so the UI shows what the student is
  // learning to play AGAINST. Cache key prefixing handled by the
  // caller in CoachTeachPage (existing Face: prefix logic).
  const displayName = faceContext
    ? `${entry.canonicalName} (facing ${faceContext.originalDisplayName})`
    : entry.canonicalName;
  const shortIntro =
    narration.shortIntro && narration.shortIntro.trim().length > 0
      ? stripMoveRecitationLeadIn(narration.shortIntro.trim()) || undefined
      : undefined;
  const tree: WalkthroughTree = {
    openingName: displayName,
    eco: entry.eco,
    studentSide,
    intro:
      stripMoveRecitationLeadIn(narration.intro?.trim() || '') ||
      `${displayName} — let's walk through the main line.`,
    ...(shortIntro ? { shortIntro } : {}),
    outro: narration.outro?.trim() || `Drill the moves to lock them in.`,
    root: { san: null, movedBy: null, idea: '', children: nextChildren },
  };
  // Drop redundant arrows (no-ops + arrows pointing AT the move's
  // own destination). Production audit (build 088b57a): user reported
  // "the first pawn push has a forward and diagonal arrow." 1.e4
  // shouldn't draw e2→e4 (the board animates that) — only threats
  // / look-aheads. The legacy free-form gen path runs this repair;
  // the DB-narration path (this function) was missing it, so the
  // LLM's redundant arrows survived to the board.
  const droppedArrows = repairNarrationArrows(tree);
  if (droppedArrows > 0) {
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'openingGenerator.generateOpeningFromDbNarration',
      summary: `dropped ${droppedArrows} redundant narration arrows for "${name}"`,
    });
  }
  return tree;
}

/** DB-only fallback walkthrough builder. When both LLM gen attempts
 *  fail (parse errors, validation failures, etc.), we DON'T fail the
 *  user-facing experience. We synthesize a minimal linear walkthrough
 *  from the Lichess DB's canonical PGN with template-based narration.
 *  The user still gets a lesson — basic, but functional — and they
 *  can /clearcache later to retry the LLM gen.
 *
 *  The fallback tree is marked with fallbackOnly=true (extension on
 *  WalkthroughTree's optional metadata) so the UI can surface a
 *  "regenerate full lesson" prompt later. Cache stores it like a
 *  normal tree so subsequent loads are instant. */
function buildFallbackTreeFromDb(
  name: string,
): WalkthroughTree | null {
  const entry = resolveCuratedVariation(name) ?? resolveOpeningEntry(name);
  if (!entry || entry.moves.length === 0) return null;
  // Replay the PGN to validate moves before building. If the DB
  // entry's PGN is malformed (extremely rare — the DB is curated),
  // bail out and let the caller fall through.
  const c = new Chess();
  for (const san of entry.moves) {
    try {
      c.move(stripSanAnnotations(san));
    } catch {
      return null;
    }
  }
  const studentSide = inferStudentSideFromName(entry.canonicalName);
  // Build a chain of nodes from leaf back to root. Each node carries
  // a template idea referencing the SAN — short but readable, far
  // better than "e4" alone.
  type ChildWrap = { node: WalkthroughTreeNode };
  let nextChildren: ChildWrap[] = [];
  for (let i = entry.moves.length - 1; i >= 0; i -= 1) {
    const san = entry.moves[i];
    const movedBy: 'white' | 'black' = i % 2 === 0 ? 'white' : 'black';
    const idea = synthesizeIdeaFromSan(san, movedBy);
    const node: WalkthroughTreeNode = {
      san,
      movedBy,
      idea,
      children: nextChildren,
    };
    nextChildren = [{ node }];
  }
  const tree: WalkthroughTree = {
    openingName: entry.canonicalName,
    eco: entry.eco,
    studentSide,
    intro: `${entry.canonicalName} — book moves from the Lichess opening database. This is a quick walkthrough of the canonical line; full coach commentary will load on the next session.`,
    outro: `That's the canonical book line for the ${entry.canonicalName}. Drill the moves to lock them in, or ask for a deeper variation.`,
    root: {
      san: null,
      movedBy: null,
      idea: '',
      children: nextChildren,
    },
  };
  return tree;
}

/** Same logic as inferStudentSide in src/data/openingWalkthroughs/index.ts
 *  but local so this module doesn't import from a sibling. */
function inferStudentSideFromName(name: string): 'white' | 'black' {
  const lower = name.toLowerCase();
  if (/\bdefen[cs]e\b/.test(lower)) return 'black';
  const blackKeywords = [
    'sicilian', 'french', 'caro-kann', 'caro kann', 'pirc',
    'modern', 'alekhine', 'scandinavian', 'scandi',
    "king's indian", 'kings indian', "queen's indian", 'queens indian',
    'nimzo', 'grunfeld', 'grünfeld', 'benoni', 'benko',
    'dutch', 'philidor', 'petroff', 'petrov', 'slav',
  ];
  for (const kw of blackKeywords) if (lower.includes(kw)) return 'black';
  return 'white';
}

/** Build a short idea sentence for a SAN — the template fallback used
 *  only when the LLM narration call is unavailable.
 *
 *  Names the ACTUAL destination square and reacts to captures / checks
 *  so the spoken line is concrete, not a stuck-record "pawn move
 *  shaping the center" on every push. The per-move pick is keyed off
 *  the square so the same move is stable while different moves diverge.
 *  Per-piece templates DESCRIBE WHAT THE MOVE DOES rather than just
 *  announcing the SAN. User: "I don't want fen calls I want
 *  descriptions of what the moves do." */
function synthesizeIdeaFromSan(
  san: string,
  movedBy: 'white' | 'black',
): string {
  // No move-number prefix — the voice reads "5." as "five" and the
  // count drifts off across forks (David 2026-06-02). Lead with the
  // bare SAN; the board shows the move number, the voice describes the
  // idea.
  const prefix = san;
  const side = movedBy === 'white' ? 'White' : 'Black';
  if (san === 'O-O' || san === '0-0') {
    return `${prefix} — ${side} castles kingside, tucking the king to safety and connecting the rooks.`;
  }
  if (san === 'O-O-O' || san === '0-0-0') {
    return `${prefix} — ${side} castles queenside, bringing the rook to bear on the central d-file.`;
  }
  const piece = /^[NBRQK]/.test(san) ? san[0] : 'P';
  const destMatch = san.match(/([a-h][1-8])(?:=[NBRQ])?[+#]?$/);
  const dest = destMatch ? destMatch[1] : '';
  const isCapture = san.includes('x');
  const isCheck = /[+#]/.test(san);
  // Two phrasings per piece, chosen by the destination square so the
  // fallback varies move-to-move instead of repeating one sentence.
  const variant = dest ? (dest.charCodeAt(0) + Number(dest[1])) % 2 : 0;
  const pick = (a: string, b: string): string => (variant === 0 ? a : b);
  const on = dest ? ` on ${dest}` : '';
  const to = dest ? ` to ${dest}` : '';
  if (isCheck) {
    return `${prefix} — checks the king${dest ? ` from ${dest}` : ''}, forcing a reply before anything else.`;
  }
  if (piece === 'N') {
    return isCapture
      ? `${prefix} — the knight takes${on}, trading off a defender.`
      : `${prefix} — ${pick(`knight to ${dest}, developing toward the center and eyeing key squares.`, `knight jumps${to}, hitting central squares and adding pressure.`)}`;
  }
  if (piece === 'B') {
    return isCapture
      ? `${prefix} — the bishop captures${on}, giving up the pair for structure or tempo.`
      : `${prefix} — ${pick(`bishop${to}, raking a long diagonal toward the center.`, `bishop develops${to}, pinning or pressuring along its diagonal.`)}`;
  }
  if (piece === 'R') {
    return isCapture
      ? `${prefix} — the rook grabs${on}, winning the exchange or a pawn.`
      : `${prefix} — ${pick(`rook swings${to}, claiming an open or soon-to-open file.`, `rook lifts${to}, preparing to double or contest the file.`)}`;
  }
  if (piece === 'Q') {
    return isCapture
      ? `${prefix} — the queen takes${on}; watch she isn't chased with tempo.`
      : `${prefix} — ${pick(`queen${to}, joining the attack while keeping flexibility.`, `queen steps${to}, coordinating the pieces and eyeing weak squares.`)}`;
  }
  if (piece === 'K') {
    return `${prefix} — king${to}, walking to safety or activating in the late opening.`;
  }
  // Pawn move.
  if (isCapture) {
    return `${prefix} — the pawn captures${on}, opening lines and reshaping the center.`;
  }
  const central = dest && (dest[0] === 'd' || dest[0] === 'e');
  if (central) {
    return `${prefix} — stakes a claim in the center${on}, fighting for space and open lines.`;
  }
  return pick(
    `${prefix} — gains space${on}, supporting the center and freeing the pieces behind.`,
    `${prefix} — a pawn break${on}, challenging the structure and opening the position.`,
  );
}

/** Strip a leading move-recitation sentence from an intro string.
 *
 *  Production audit (build 6393c0f): user reported the intro for
 *  Italian Game opened with "After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 —
 *  symmetrical opening" before saying anything useful. The student
 *  is about to SEE those moves animate; reading them aloud first
 *  is filler. Their words: "the narration said the 4 fen lines in
 *  a row and then said symmetrical opening. That's what I wanted
 *  fixed."
 *
 *  Heuristic: if the FIRST sentence mentions a move-number pattern
 *  (e.g. "1.e4", "2...Nc6", "After 1.d4..."), drop it and keep
 *  whatever comes after. If the entire intro is move recitation
 *  with nothing after, returns "" so the caller can fall back to
 *  the generic frame.
 *
 *  Exported for testing. */
export function stripMoveRecitationLeadIn(intro: string): string {
  const trimmed = intro.trim();
  if (!trimmed) return '';
  // Match the opening lead-in patterns that recite moves:
  //   "After 1.e4 e5 2.Nf3..."
  //   "Following 1.d4 d5 c4..."
  //   "Starting from 1.e4 c5..."
  //   "1.e4 e5 2.Nf3 — ..."  (move list at the very start)
  // Detect a move-number token like "1.e4", "12.Nf3", "1...e5".
  const MOVE_TOKEN_RE = /\b\d{1,2}(?:\.{1,3})\s*[A-Za-z][a-h0-9OxNBRQK+#=…-]*/;
  // Split into sentences on punctuation. Em-dashes count as breaks
  // because the LLM often writes "After 1.e4 e5 2.Nf3 — symmetrical
  // opening" where the dash is the structural break.
  const sentences = trimmed
    .split(/(?<=[.!?])\s+|\s+—\s+|\s+–\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Strip any leading sentence that contains a move-number token.
  while (sentences.length > 0 && MOVE_TOKEN_RE.test(sentences[0])) {
    sentences.shift();
  }
  return sentences.join(' ').trim();
}

/** Build a linear walkthrough tree from a curated trap PGN (no LLM
 *  call — the curator's explanation IS the intro, per-move text is
 *  the terse SAN announcement). Used when a student taps a trap
 *  tile in the line picker. The tree is single-spine (no forks),
 *  ending at the punishment position. */
export function buildTrapWalkthroughTreeFromPgn(opts: {
  trapName: string;
  parentOpeningName: string;
  eco: string;
  pgn: string;
  explanation: string;
}): WalkthroughTree | null {
  const moves = opts.pgn.trim().split(/\s+/).filter(Boolean);
  if (moves.length === 0) return null;
  const c = new Chess();
  type Pos = { san: string; movedBy: 'white' | 'black'; ply: number };
  const positions: Pos[] = [];
  for (let i = 0; i < moves.length; i += 1) {
    try {
      c.move(stripSanAnnotations(moves[i]));
    } catch {
      return null;
    }
    positions.push({
      san: moves[i],
      movedBy: i % 2 === 0 ? 'white' : 'black',
      ply: i,
    });
  }
  // Build bottom-up: leaf has no children, each move wraps the next.
  type ChildWrap = { node: WalkthroughTreeNode };
  let nextChildren: ChildWrap[] = [];
  for (let i = positions.length - 1; i >= 0; i -= 1) {
    const p = positions[i];
    const node: WalkthroughTreeNode = {
      san: p.san,
      movedBy: p.movedBy,
      idea: synthesizeIdeaFromSan(p.san, p.movedBy),
      children: nextChildren,
    };
    nextChildren = [{ node }];
  }
  // The trap's "studentSide" is the side that PUNISHES the trap —
  // the side whose final move wins material. PGN ends with the
  // punisher's strike, so studentSide = whoever moved last.
  const lastMover = positions[positions.length - 1].movedBy;
  return {
    openingName: `Trap: ${opts.trapName}`,
    eco: opts.eco,
    studentSide: lastMover,
    intro: `${opts.trapName} — from ${opts.parentOpeningName}. ${opts.explanation}`,
    outro: `That's the trap. Watch for this pattern in your games.`,
    root: { san: null, movedBy: null, idea: '', children: nextChildren },
  };
}

export async function generateOpening(
  name: string,
  options?: GenerateOpeningOptions,
): Promise<GenerationResult> {
  const mode = options?.mode ?? 'learn';
  const pace = options?.pace ?? 'full';
  void logAppAudit({
    kind: 'coach-surface-migrated',
    category: 'subsystem',
    source: 'openingGenerator.generateOpening',
    summary: `generation requested for "${name}" (mode=${mode}, pace=${pace})`,
  });

  // PRIMARY PATH: trust the Lichess DB as the source of truth. Code
  // builds the tree skeleton (legal moves from DB, FENs from chess.js
  // replay); the LLM only writes per-move narration text. User's
  // word: "Have the LLM trust the structure. It is the source of
  // truth. Sounds like the LLM is trying to verify the structure
  // before running narration. It shouldn't have to do that if the
  // brain is pulling straight from the DB."
  //
  // FACE mode — the student is learning the counter to the named
  // opening, not the opening itself. We resolve the canonical
  // counter from the Lichess DB (the most-popular sibling
  // extension is by definition the main-line counter — for Sicilian
  // Dragon it's the Yugoslav Attack at Be3, for Najdorf it's the
  // Bg5 Main Line, etc) and run THAT through the same DB-narration
  // pipeline as learn mode. studentSide gets flipped automatically
  // (see faceContext handling inside generateOpeningFromDbNarration).
  // User: "I want that narration fix built!" — applies the same
  // architectural inversion that fixed learn mode.
  if (mode === 'face') {
    try {
      const original = resolveOpeningEntry(name);
      if (original) {
        const shortPgn =
          findShortestCanonicalPgn(original.canonicalName) ??
          original.moves.join(' ');
        const counters = findSiblingExtensionBranches(
          original.canonicalName,
          shortPgn,
        );
        if (counters.length > 0) {
          // counters[] is sorted by popularity descending; the first
          // is the main-line counter.
          const counter = counters[0];
          const fromDb = await generateOpeningFromDbNarration(
            counter.fullName,
            pace,
            { originalDisplayName: original.canonicalName },
          );
          if (fromDb) {
            void logAppAudit({
              kind: 'coach-surface-migrated',
              category: 'subsystem',
              source: 'openingGenerator.generateOpening',
              summary: `face mode resolved "${name}" → counter "${counter.fullName}" via DB-narration`,
            });
            return { ok: true, tree: fromDb };
          }
        } else {
          void logAppAudit({
            kind: 'coach-surface-migrated',
            category: 'subsystem',
            source: 'openingGenerator.generateOpening',
            summary: `face mode found no DB counter for "${name}" — falling back to legacy free-form gen`,
          });
        }
      }
    } catch (err) {
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'openingGenerator.generateOpening',
        summary: `face DB-narration path threw for "${name}" — falling back: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
  if (mode === 'learn') {
    try {
      const fromDb = await generateOpeningFromDbNarration(name, pace);
      if (fromDb) {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'openingGenerator.generateOpening',
          summary: `generation OK via DB-narration path for "${name}"`,
        });
        return { ok: true, tree: fromDb };
      }
    } catch (err) {
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'openingGenerator.generateOpening',
        summary: `DB-narration path threw for "${name}" — falling back to free-form gen: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // 🔒 NO LLM MOVE-INVENTION (G3 — David 2026-06-05: "the only thing the
  // LLM does is speak the grounded truth handed to it"). The old
  // generateOnce / emit_walkthrough_tree path let the LLM emit an entire
  // WalkthroughTree of SAN moves from memory whenever the DB-narration
  // path returned null — i.e. ONLY for openings NOT in the Lichess DB,
  // which is exactly where G3 says the line doesn't exist and we must not
  // fabricate. It was removed by the root. The DB-narration path above is
  // the grounded primary; below is the grounded DB-only fallback that
  // synthesizes a linear walkthrough straight from the DB's canonical PGN
  // (chess.js-replayed moves, template prose — no LLM move choice). If
  // neither produces a tree the opening simply isn't in our data, and we
  // fail honestly rather than invent one (empty > invented).
  const fallbackTree = buildFallbackTreeFromDb(name);
  if (fallbackTree) {
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'openingGenerator.generateOpening',
      summary: `DB-narration path returned no tree for "${name}" — shipped grounded DB-only fallback walkthrough`,
    });
    return { ok: true, tree: fallbackTree };
  }
  void logAppAudit({
    kind: 'llm-error',
    category: 'subsystem',
    source: 'openingGenerator.generateOpening',
    summary: `"${name}" not in the opening DB — failing honestly (no LLM move-invention fallback)`,
  });
  return {
    ok: false,
    reason: `"${name}" isn't in our opening database. We only teach lines that exist in the Lichess data — we never invent moves.`,
  };
}

// ───────────────────────────────────────────────────────────────────
// BACKGROUND STAGE GENERATION
// ───────────────────────────────────────────────────────────────────
// User asked: "Can it generate the next level of teaching in
// background while user is doing the walkthrough?" Yes — and it
// solves three problems at once:
//   1. Reliability: 4 focused LLM calls (one per stage) instead of
//      one giant call. Each is small enough to validate strictly.
//   2. Hidden latency: the walkthrough takes 2-5 minutes; the
//      stages generate in parallel during that window.
//   3. Validation time: each stage gets focused validation, not a
//      compromise across 5 sections at once.
//
// Flow:
//   1. Main gen produces the walkthrough tree (blocking, ~30-60s).
//   2. Walkthrough starts; user engages.
//   3. generateMissingStagesInBackground fires the 4 focused calls
//      in parallel, fire-and-forget.
//   4. As each stage validates, it merges into the cached tree
//      (Dexie put with the new stage).
//   5. Stage menu re-reads the cache when entered → shows whatever
//      stages have completed.

/** The four optional stages the LLM can generate in focused calls. */
type OptionalStage = 'concepts' | 'findMove' | 'drill' | 'punish';

/** Per-stage system prompt — focused on ONE stage at a time so the
 *  LLM has plenty of token budget to generate quality content. */
/** Compute the FEN at the end of an opening's canonical PGN. Lets
 *  the stage prompt anchor the LLM at the actual position where
 *  punish setupMoves typically branch from, so it stops inventing
 *  illegal moves like "Bxf7+" when the bishop isn't on a diagonal
 *  to f7. Returns null if the PGN can't be replayed (the validator
 *  will catch it later anyway). */
function computeEndOfBookFen(openingName?: string): string | null {
  if (!openingName) return null;
  const entry = resolveOpeningEntry(openingName);
  if (!entry || entry.moves.length === 0) return null;
  try {
    const c = new Chess();
    for (const san of entry.moves) c.move(stripSanAnnotations(san));
    return c.fen();
  } catch {
    return null;
  }
}

function buildStagePositionBlock(openingName?: string): string {
  const entry = openingName ? resolveOpeningEntry(openingName) : null;
  if (!entry || entry.moves.length === 0) return '';
  const endFen = computeEndOfBookFen(openingName);
  if (!endFen) return '';
  // Trim PGN to a readable form for the prompt.
  const pgn = entry.moves.join(' ');
  return `

OPENING POSITION CONTEXT:
- Canonical name: ${entry.canonicalName}
- ECO: ${entry.eco}
- Moves to reach the end-of-book position: ${pgn}
- FEN at the end of those moves: ${endFen}

Use this position as your anchor. Stage entries' setup paths (findMove.path, drill.moves prefixes, punish.setupMoves) typically branch from this position or earlier in the line. Verify each SAN against the actual piece placement at the relevant FEN before emitting it.`;
}

function buildStageSystemPrompt(stage: OptionalStage, openingName?: string): string {
  const schemas: Record<OptionalStage, string> = {
    concepts: `Output a JSON array of ConceptCheckQuestion objects:
interface ConceptCheckQuestion {
  prompt: string;            // Big-idea question, e.g. "Why does the Vienna play 2.Nc3 instead of 2.Nf3?"
  multiSelect?: boolean;     // true if multiple choices are correct
  choices: { text: string; correct: boolean; explanation: string }[];
}
Aim for 3-5 questions. Test the IDEA behind the opening, not memorization. Mix single-select and multi-select. Multi-select questions need 2+ correct choices.`,

    findMove: `Output a JSON array of FindMoveQuestion objects:
interface FindMoveQuestion {
  path: string[];            // SAN sequence from the standard start position to the position being quizzed
  prompt: string;            // Question, e.g. "White to play. What's the move?"
  candidates: { san: string; label: string; correct: boolean; explanation: string }[];
}
Aim for 3-5 puzzles. Each candidate's SAN must be LEGAL from the path's resulting FEN. Exactly one candidate is correct. Each label is a brief intent ("Bc4 — eyes f7"). Test recognition at branch points and key moments of the opening.`,

    drill: `Output a JSON array of DrillLine objects:
interface DrillLine {
  name: string;              // Display name
  subtitle?: string;
  moves: string[];           // Full SAN sequence from the standard start
  studentSide?: 'white' | 'black';  // Defaults to 'white'
}
Aim for 3-5 lines. Each is a full opening line through to a clear middlegame transition (~10-15 plies). All SANs must be legal sequences from the starting position. studentSide should match the opening (white for openings; black for defenses like Sicilian/French/Caro-Kann/Pirc).`,

    punish: `Output a JSON array of PunishLesson objects:
interface PunishLesson {
  name: string;              // Display name
  setupMoves: string[];      // SAN sequence to the position BEFORE the inaccuracy
  inaccuracy: string;        // Opponent's bad move (SAN, legal from setup position)
  whyBad: string;            // 2-3 sentences explaining the principle violated
  punishment: string;        // The student's punishing move (SAN, legal from post-inaccuracy)
  whyPunish: string;         // 2-3 sentences explaining why it works
  distractors: { san: string; label: string; explanation: string }[];  // 2-3 LEGAL alternatives that don't punish
  followup?: { san: string; idea: string }[];  // Optional winning continuation
}
Aim for 3-5 lessons. Each setupMoves+inaccuracy+punishment+distractors must be LEGAL chess from the start position. Teach common amateur mistakes the student will face in real games.`,
  };

  return `You are an expert chess coach generating ONE specific stage of an opening lesson. Output is RAW JSON — no markdown fences, no prose, no comments, no trailing commas. The first character must be \`[\` and the last must be \`]\`.

Schema:
${schemas[stage]}

CRITICAL:
- All chess moves must be LEGAL from their parent positions. The validation harness will reject illegal SANs.
- DO NOT include PGN annotation marks (!, ?, !!, ??, !?, ?!) in any SAN string. Use "g4" not "g4?", "Nf6" not "Nf6??". Production audit caught the LLM doing this for punish.inaccuracy and the bare \`?\` made chess.js reject the move.
- DO NOT prefix SANs with move numbers ("1.", "1...", etc.). Just the move: "e4", not "1.e4".
- LEGAL-MOVE TRAPS (production audit caught these — DO NOT repeat):
  • FIANCHETTO PREP: Bg7 / Bg2 / Bb7 / Bb2 require the pawn move FIRST (g6 / g3 / b6 / b3). The bishop's destination square must be EMPTY. Pirc move-order is ...d6, ...Nf6, ...g6, THEN ...Bg7.
  • QUEENSIDE CASTLING (O-O-O): the b1 / b8 knight must be DEVELOPED. Castling cannot pass through a piece. If Nb1 is still on its starting square, you cannot O-O-O.
  • KINGSIDE CASTLING (O-O): both the f1 bishop AND the g1 knight (or f8 / g8 for Black) must be developed.
  • Pawns move FORWARD only. e4-to-e3 is illegal.
- Coach voice: first-person, conversational, pedagogically clear.
${stage === 'concepts' ? `- Single-select questions (multiSelect omitted or false) need EXACTLY ONE correct choice. If 2+ choices are correct, set multiSelect: true on that question.\n` : ''}${stage === 'findMove' ? `- Each question needs 2+ candidates. EXACTLY ONE is correct. The path SANs must be a legal sequence from the standard starting position.\n` : ''}${stage === 'drill' ? `- Trace the FULL move sequence with chess.js mentally before emitting. Each move must be legal from the position the prior moves create. studentSide MUST match the opening — black for Sicilian, French, Caro-Kann, Pirc, KID, Nimzo-Indian, Modern, Alekhine, Scandinavian, etc.; white for Italian, Vienna, Spanish, Queen's Gambit, etc.\n` : ''}${stage === 'punish' ? `- setupMoves + inaccuracy + punishment + each distractor + each followup move must ALL be legal in sequence. Distractors are LEGAL alternatives that don't punish as well — they are NOT illegal moves. Each lesson needs at least 2 distractors.
- CRITICAL — STAY ON THE OPENING: setupMoves MUST match the canonical PGN of "${openingName}" exactly for the first N plies (where N = the canonical PGN's ply count). Production audit (build 1304700) caught the LLM emitting Dragon punishes (5...g6) under the Najdorf banner (5...a6) — same family but a different sub-variation. The OPENING POSITION CONTEXT block below shows the exact moves; do NOT substitute a different sub-line just because you find traps there easier to write.
- The inaccuracy is what the OPPONENT plays AFTER the canonical line is reached. setupMoves usually ends RIGHT AT the canonical spine's end FEN (or at most 1-2 plies deeper on a known main-line continuation).
\n` : ''}- Output JSON only. Validation pipeline rejects anything else.${buildBookSourceBlock(openingName)}${buildStagePositionBlock(openingName)}`;
}

// ─── DB-narration stage generators ──────────────────────────────────
// Mirror of the walkthrough's DB-narration inversion: code provides
// the move sequences (legal by DB construction) and chess.js confirms
// FENs; the LLM only writes labels and short prose. Eliminates the
// "illegal SAN" repair class for `drill` and `findMove` stages
// entirely. `concepts` is already prose-only (no moves to invert) and
// `punish` is tactical (its moves are by definition NOT in the DB),
// so neither gets a DB path here.
//
// The fallback is the existing free-form LLM stage gen if a DB path
// can't produce enough entries (e.g. a niche opening with no sibling
// extensions). All audit logs tag which path produced the stage.

const DRILL_LABEL_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['lines'],
  properties: {
    lines: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'subtitle'],
        properties: {
          name: { type: 'string' },
          subtitle: { type: 'string' },
        },
      },
    },
  },
};

interface DrillLabelOutput {
  lines: { name: string; subtitle: string }[];
}

const FIND_MOVE_LABEL_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['prompt', 'candidates'],
        properties: {
          prompt: { type: 'string' },
          candidates: {
            type: 'array',
            items: {
              type: 'object',
              required: ['label', 'explanation'],
              properties: {
                label: { type: 'string' },
                explanation: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

interface FindMoveLabelOutput {
  questions: {
    prompt: string;
    candidates: { label: string; explanation: string }[];
  }[];
}

/** Generate `drill` stage entries by pulling top sibling sub-variations
 *  from the Lichess DB (with their middlegame extensions) and asking
 *  the LLM ONLY for a display name + subtitle per line. Eliminates
 *  every "illegal SAN" failure mode for this stage. Returns null when
 *  the DB doesn't have enough sub-variations to populate a useful set
 *  — the caller falls back to the free-form LLM gen path. */
async function generateDrillFromDb(
  openingName: string,
): Promise<DrillLine[] | null> {
  const entry = resolveOpeningEntry(openingName);
  if (!entry || entry.moves.length === 0) return null;
  const shortPgn = findShortestCanonicalPgn(entry.canonicalName);
  const spineMoves = shortPgn ? shortPgn.split(/\s+/).filter(Boolean) : entry.moves;
  const branches = findSiblingExtensionBranches(
    entry.canonicalName,
    spineMoves.join(' '),
  );
  if (branches.length === 0) return null;
  const studentSide = inferStudentSideFromName(entry.canonicalName);
  const picked = branches.slice(0, 5);
  // Build the line skeletons from the DB (legal by construction).
  const lines = picked.map((b) => ({
    branchSan: b.san,
    branchLabel: b.label,
    moves: [...spineMoves, b.san, ...b.extensionMoves],
  }));

  const systemPrompt = `You are an expert chess coach labelling drill lines. For EACH line below, output:
- name: 4-8 words. Lead with the canonical sub-variation name (e.g. "English Attack — Najdorf Sicilian").
- subtitle: 3-7 words capturing the strategic flavor (e.g. "Sharp kingside pawn-storm" or "Quiet positional setup").

The move sequences come from the Lichess opening database — DO NOT alter them, do NOT repeat them in the labels. Output ONLY via the tool.`;

  const userPrompt = `Opening: ${entry.canonicalName} (${entry.eco})
Student plays: ${studentSide}

Lines (in order — emit one { name, subtitle } per line):
${lines
  .map(
    (l, i) =>
      `${i + 1}. "${l.branchLabel}" — entry move ${l.branchSan}; full sequence: ${l.moves.join(' ')}`,
  )
  .join('\n')}

Emit a JSON object: { lines: [ ${lines.length} entries, in the same order ] }.`;

  let labels: DrillLabelOutput;
  try {
    const result = await getCoachStructuredResponse(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
      'chat_response',
      1024,
      'emit_drill_labels',
      'Emit display labels for opening drill lines.',
      DRILL_LABEL_SCHEMA,
    );
    labels = result as DrillLabelOutput;
  } catch (err) {
    void logAppAudit({
      kind: 'llm-error',
      category: 'subsystem',
      source: 'openingGenerator.generateDrillFromDb',
      summary: `drill-label LLM call failed for "${openingName}" — using template names: ${err instanceof Error ? err.message : String(err)}`,
    });
    labels = {
      lines: lines.map((l) => ({
        name: `${entry.canonicalName} — ${l.branchLabel}`,
        subtitle: l.branchLabel,
      })),
    };
  }

  return lines.map((l, i) => {
    const lab = labels.lines?.[i];
    return {
      name: (lab?.name?.trim()) || `${entry.canonicalName} — ${l.branchLabel}`,
      subtitle: (lab?.subtitle?.trim()) || l.branchLabel,
      moves: l.moves,
      studentSide,
    };
  });
}

/** Generate `findMove` stage entries by walking the canonical spine
 *  and picking branchpoints — positions where multiple DB-named
 *  openings diverge. The "correct" candidate is the canonical SAN
 *  (the move that keeps the student in their named opening); the
 *  distractors are sibling SANs that lead to DIFFERENT named
 *  openings. The LLM only writes the prompt + per-candidate label
 *  and explanation. No SANs are LLM-emitted, eliminating the legal-
 *  move bug class for this stage. */
async function generateFindMoveFromDb(
  openingName: string,
): Promise<FindMoveQuestion[] | null> {
  const entry = resolveOpeningEntry(openingName);
  if (!entry || entry.moves.length === 0) return null;
  const shortPgn = findShortestCanonicalPgn(entry.canonicalName);
  const spineMoves = shortPgn
    ? shortPgn.split(/\s+/).filter(Boolean)
    : entry.moves;
  const studentSide = inferStudentSideFromName(entry.canonicalName);

  // Walk the spine. At each ply where the studentSide moves, query
  // the DB for sibling SANs at that ply. If 2+, it's a branchpoint.
  type Branchpoint = {
    pathBeforeMove: string[];
    correctSan: string;
    distractors: { san: string; openingName: string; eco: string }[];
    movedBy: 'white' | 'black';
    plyIndex: number;
  };
  const branchpoints: Branchpoint[] = [];
  for (let i = 0; i < spineMoves.length; i += 1) {
    const movedBy: 'white' | 'black' = i % 2 === 0 ? 'white' : 'black';
    if (movedBy !== studentSide) continue;
    const prefix = spineMoves.slice(0, i);
    const continuations = findContinuationsAtPly(prefix);
    if (continuations.size < 2) continue;
    const correctSan = spineMoves[i];
    if (!continuations.has(correctSan)) continue; // safety
    const distractors: Branchpoint['distractors'] = [];
    for (const [san, info] of continuations) {
      if (san === correctSan) continue;
      distractors.push({ san, openingName: info.name, eco: info.eco });
    }
    if (distractors.length === 0) continue;
    // Cap at 3 distractors. Prefer ones whose representative opening
    // has the SHORTEST name (the bare-line entries — Sicilian, French,
    // etc. — make cleaner distractors than deep sub-variations).
    distractors.sort((a, b) => a.openingName.length - b.openingName.length);
    branchpoints.push({
      pathBeforeMove: prefix,
      correctSan,
      distractors: distractors.slice(0, 3),
      movedBy,
      plyIndex: i,
    });
  }
  if (branchpoints.length === 0) return null;
  // Cap at 5 branchpoints. Prefer the ones DEEPEST in the spine
  // (later plies — those are the more specific decisions of the
  // named opening, the ones the student actually needs to memorize).
  branchpoints.sort((a, b) => b.plyIndex - a.plyIndex);
  const picked = branchpoints.slice(0, 5).reverse(); // re-order earliest-first for narrative flow

  const systemPrompt = `You are an expert chess coach writing find-the-move puzzles. For each branchpoint below, output:
- prompt: ONE sentence framing the question. Mention whose turn and the strategic context. Examples:
  • "Black has just played 4...Nc6. What's White's signature move to enter the Italian?"
  • "After 1.e4 c5 2.Nf3, what does Black play to set up a Najdorf-style structure?"
- candidates: for EACH candidate (in the SAME ORDER as given), write:
    label: 2-6 words tagging the move's idea ("eyes f7", "claims the center", "entering the Spanish")
    explanation: ONE sentence explaining why it's right or what other opening it heads into.

The SANs and the correct answer are GIVEN — DO NOT alter them, do NOT add candidates, do NOT change the order. Just label + explain. Output ONLY via the tool.`;

  const userPrompt = `Opening: ${entry.canonicalName} (${entry.eco})
Student plays: ${studentSide}

Branchpoints (emit one question per branchpoint, in order):
${picked
  .map((bp, i) => {
    const moveNum = Math.floor(bp.plyIndex / 2) + 1;
    const dotted = bp.movedBy === 'white' ? `${moveNum}.` : `${moveNum}…`;
    const path = bp.pathBeforeMove.length > 0
      ? bp.pathBeforeMove.join(' ')
      : '(starting position)';
    const candidatesList = [
      { san: bp.correctSan, isCorrect: true, opening: entry.canonicalName },
      ...bp.distractors.map((d) => ({
        san: d.san,
        isCorrect: false,
        opening: d.openingName,
      })),
    ];
    return `${i + 1}. After ${path} — ${bp.movedBy} to move ${dotted}? Candidates (in order):
${candidatesList.map((c, j) => `   ${String.fromCharCode(97 + j)}) ${c.san} → ${c.opening}${c.isCorrect ? ' [CORRECT]' : ''}`).join('\n')}`;
  })
  .join('\n\n')}

Emit a JSON object: { questions: [ ${picked.length} entries, in the same order, each with prompt + candidates labels in the same order as listed above ] }.`;

  let labels: FindMoveLabelOutput;
  try {
    const result = await getCoachStructuredResponse(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
      'chat_response',
      2048,
      'emit_findmove_labels',
      'Emit prompt + candidate labels for find-the-move puzzles.',
      FIND_MOVE_LABEL_SCHEMA,
    );
    labels = result as FindMoveLabelOutput;
  } catch (err) {
    void logAppAudit({
      kind: 'llm-error',
      category: 'subsystem',
      source: 'openingGenerator.generateFindMoveFromDb',
      summary: `findMove-label LLM call failed for "${openingName}" — using template labels: ${err instanceof Error ? err.message : String(err)}`,
    });
    labels = {
      questions: picked.map(() => ({
        prompt: '',
        candidates: [],
      })),
    };
  }

  // Map back to FindMoveQuestion[].
  return picked.map((bp, i) => {
    const moveNum = Math.floor(bp.plyIndex / 2) + 1;
    const dotted = bp.movedBy === 'white' ? `${moveNum}.` : `${moveNum}…`;
    const labelEntry = labels.questions?.[i];
    const fallbackPrompt = `${bp.movedBy === 'white' ? 'White' : 'Black'} to play ${dotted} What's the move?`;
    const candidates = [
      {
        san: bp.correctSan,
        label: labelEntry?.candidates?.[0]?.label?.trim() || `${bp.correctSan} — ${entry.canonicalName}`,
        correct: true,
        explanation:
          labelEntry?.candidates?.[0]?.explanation?.trim() ||
          `${bp.correctSan} is the canonical move into the ${entry.canonicalName}.`,
      },
      ...bp.distractors.map((d, j) => ({
        san: d.san,
        label:
          labelEntry?.candidates?.[j + 1]?.label?.trim() ||
          `${d.san} — ${d.openingName}`,
        correct: false,
        explanation:
          labelEntry?.candidates?.[j + 1]?.explanation?.trim() ||
          `${d.san} heads into the ${d.openingName} instead — a different opening.`,
      })),
    ];
    return {
      path: bp.pathBeforeMove,
      prompt: labelEntry?.prompt?.trim() || fallbackPrompt,
      candidates,
    };
  });
}

// ─── Punish-stage DB inversion ──────────────────────────────────────
// Pulls real opening-tagged tactical puzzles from the Lichess puzzle
// database (`src/data/puzzles.json`, 15K curated entries) and turns
// them into PunishLesson objects. Code provides every move (the
// puzzle's UCI sequence converted to SAN) and every distractor
// (chess.js legal moves at the post-inaccuracy FEN, scored to prefer
// captures/checks/developing moves so they look tempting). The LLM
// only writes:
//   - lesson `name` (4-8 words tying it to the opening + the tactic)
//   - `whyBad` (2 sentences on the opponent's mistake — the SETUP)
//   - `whyPunish` (2 sentences on why the tactic works — the IDEA)
//   - per-distractor `label` + `explanation`
//   - per-followup `idea`
//
// David's principle: "the DB is the brain." Punish lessons are
// grounded in real master-game puzzles tagged with the opening, with
// the puzzle's themes (mate, fork, sacrifice, hangingPiece) telling
// the LLM what tactical motif it's narrating. The opening's family
// (Italian → Bxf7+ themes; Caro-Kann → tempo/structure punishments)
// shapes the prose framing. No moves are LLM-emitted.

interface RawPuzzle {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
  openingTags: string | string[] | null;
  popularity: number;
  nbPlays: number;
}

const PUNISH_PUZZLE_THEMES = new Set([
  'mate', 'mateIn1', 'mateIn2', 'mateIn3',
  'fork', 'pin', 'skewer', 'discoveredAttack',
  'hangingPiece', 'trappedPiece', 'sacrifice',
  'attraction', 'deflection', 'doubleAttack',
  'kingsideAttack', 'queensideAttack', 'attackingF2F7',
  'xRayAttack',
]);

const PUNISH_LABEL_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['lessons'],
  properties: {
    lessons: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'whyBad', 'whyPunish', 'distractors'],
        properties: {
          name: { type: 'string' },
          whyBad: { type: 'string' },
          shortWhyBad: { type: 'string' },
          whyPunish: { type: 'string' },
          shortWhyPunish: { type: 'string' },
          distractors: {
            type: 'array',
            items: {
              type: 'object',
              required: ['label', 'explanation'],
              properties: {
                label: { type: 'string' },
                explanation: { type: 'string' },
              },
            },
          },
          followupIdeas: {
            type: 'array',
            items: { type: 'string' },
          },
          shortFollowupIdeas: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  },
};

interface PunishLabelOutput {
  lessons: {
    name: string;
    whyBad: string;
    shortWhyBad?: string;
    whyPunish: string;
    shortWhyPunish?: string;
    distractors: { label: string; explanation: string }[];
    followupIdeas?: string[];
    shortFollowupIdeas?: string[];
  }[];
}

/** Tags from the Lichess puzzle DB use underscore-separated names
 *  ("Italian_Game", "Sicilian_Defense_Najdorf_Variation"). Our
 *  canonical names use ":" + spaces. Convert and match generously:
 *  the puzzle tag must equal one of the canonical-derived forms OR
 *  start with one of them + "_" (so a "Najdorf" lesson catches both
 *  the bare Najdorf and any sub-variation like "Najdorf_English_Attack"). */
function puzzleTagsMatchOpening(
  puzzleTags: string[],
  canonicalName: string,
): boolean {
  // Lichess tag normalization: strip apostrophes ("King's" → "Kings",
  // "Bishop's" → "Bishops"), turn ":" + spaces into "_". Spot-checked
  // against the DB: tags use "Bishops_Opening" / "Kings_Gambit"
  // / "Queens_Gambit_Declined" — no apostrophes anywhere.
  const normalize = (s: string): string =>
    s.replace(/['']/g, '').replace(/[: ]+/g, '_');
  const candidates = new Set<string>();
  // Full canonical: "Sicilian Defense: Najdorf Variation"
  candidates.add(normalize(canonicalName));
  // Drop the colon-suffix: "Sicilian Defense" / "Bishop's Opening"
  const colonIdx = canonicalName.indexOf(':');
  if (colonIdx > 0) {
    candidates.add(normalize(canonicalName.slice(0, colonIdx).trim()));
  }
  // For Najdorf/Dragon/etc named after the colon, also try the
  // sub-variation name alone — Lichess sometimes tags only the
  // family ("Sicilian_Defense") without the variation, but we want
  // to match family-tagged puzzles for variation lessons too.
  for (const tag of puzzleTags) {
    for (const cand of candidates) {
      if (tag === cand) return true;
      if (tag.startsWith(cand + '_')) return true;
    }
  }
  return false;
}

function tagsOfPuzzle(p: RawPuzzle): string[] {
  if (!p.openingTags) return [];
  if (Array.isArray(p.openingTags)) return p.openingTags;
  return p.openingTags.split(/\s+/).filter(Boolean);
}

/** Convert a UCI move string ("e2e4", "e7e8q") to SAN by playing it
 *  on the given Chess instance. Mutates `chess` (advances the
 *  position). Returns the SAN string, or null if illegal. */
function uciToSan(chess: Chess, uci: string): string | null {
  if (uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length >= 5 ? uci[4] : undefined;
  try {
    const move = chess.move({ from, to, promotion });
    return move.san;
  } catch {
    return null;
  }
}

/** Score a candidate distractor SAN at the post-inaccuracy FEN to
 *  pick "tempting but wrong" alternatives. Captures + checks +
 *  developing moves rank high. Edge pawn moves and king shuffles
 *  rank low. The puzzle solution itself is excluded by the caller. */
function scoreDistractor(san: string): number {
  let score = 0;
  if (san.includes('x')) score += 3; // capture
  if (san.includes('+') || san.includes('#')) score += 2; // check
  // Knight or bishop development (uppercase first char, dest is in
  // central or near-central squares).
  if (/^[NB]/.test(san)) {
    const dest = san.match(/[a-h][1-8]/g)?.slice(-1)[0];
    if (dest) {
      const file = dest[0];
      const rank = parseInt(dest[1], 10);
      // d4-e5 / d5-e4 central squares get +2; c-d-e-f files +1;
      // edge files (a/h) get -1.
      if (['d', 'e'].includes(file) && rank >= 3 && rank <= 6) score += 2;
      else if (['c', 'd', 'e', 'f'].includes(file)) score += 1;
      else if (['a', 'h'].includes(file)) score -= 1;
    }
  }
  // King move that isn't castling = bad sign.
  if (/^K[a-h]/.test(san) && !san.startsWith('O-O')) score -= 2;
  // a- or h-file pawn push without capture = unlikely to be tempting.
  if (/^[ah][2-7]$/.test(san)) score -= 2;
  return score;
}

interface PreparedPunishLesson {
  setupFen: string;
  inaccuracy: string;
  punishment: string;
  followup: { san: string }[];
  distractors: { san: string }[];
  themes: string[];
  rating: number;
}

/** Walk one Lichess puzzle into a PunishLesson skeleton.
 *  Returns null when the puzzle's UCI sequence doesn't replay
 *  cleanly or when we can't generate at least 2 distractors. */
function preparePunishFromPuzzle(p: RawPuzzle): PreparedPunishLesson | null {
  const uciMoves = p.moves.split(/\s+/).filter(Boolean);
  if (uciMoves.length < 2) return null; // need at least inaccuracy + punishment
  const chess = new Chess(p.fen);
  // moves[0] = inaccuracy (opponent's bad move from puzzle.fen)
  const inaccuracy = uciToSan(chess, uciMoves[0]);
  if (!inaccuracy) return null;
  const postInaccuracyFen = chess.fen();
  // moves[1] = punishment (student's reply)
  const punishment = uciToSan(chess, uciMoves[1]);
  if (!punishment) return null;
  // moves[2..] = followup
  const followup: { san: string }[] = [];
  for (let i = 2; i < uciMoves.length; i += 1) {
    const san = uciToSan(chess, uciMoves[i]);
    if (!san) break;
    followup.push({ san });
  }
  // Distractors: chess.js legal moves at post-inaccuracy FEN, score
  // and pick top 3 (excluding the punishment itself).
  const probe = new Chess(postInaccuracyFen);
  const legal = probe.moves();
  const candidates = legal
    .filter((san) => san !== punishment)
    .map((san) => ({ san, score: scoreDistractor(san) }))
    .sort((a, b) => b.score - a.score);
  const distractors = candidates.slice(0, 3).map((c) => ({ san: c.san }));
  if (distractors.length < 2) return null; // need at least 2 alternatives
  return {
    setupFen: p.fen,
    inaccuracy,
    punishment,
    followup,
    distractors,
    themes: p.themes,
    rating: p.rating,
  };
}

/** Generate `punish` stage entries by mining the Lichess puzzle DB.
 *  Filters to puzzles tagged with the canonical opening's name
 *  family AND carrying punish-style tactical themes. Each surviving
 *  puzzle becomes a PunishLesson skeleton (positions + moves +
 *  distractors all from data); the LLM only labels the prose. */
async function generatePunishFromDb(
  openingName: string,
): Promise<PunishLesson[] | null> {
  const entry = resolveOpeningEntry(openingName);
  if (!entry || entry.moves.length === 0) return null;

  const puzzles = puzzleData as RawPuzzle[];
  const matching = puzzles.filter((p) => {
    const tags = tagsOfPuzzle(p);
    if (tags.length === 0) return false;
    if (!puzzleTagsMatchOpening(tags, entry.canonicalName)) return false;
    if (!p.themes.some((t) => PUNISH_PUZZLE_THEMES.has(t))) return false;
    if (p.popularity < 70) return false;
    if (p.nbPlays < 80) return false;
    return true;
  });
  if (matching.length === 0) return null;
  // Sort: popularity desc, then rating asc (easier first for teaching).
  matching.sort((a, b) => {
    if (b.popularity !== a.popularity) return b.popularity - a.popularity;
    return a.rating - b.rating;
  });

  // Walk top candidates; keep first 5 that prepare cleanly.
  const prepared: PreparedPunishLesson[] = [];
  for (const p of matching) {
    if (prepared.length >= 5) break;
    const lesson = preparePunishFromPuzzle(p);
    if (lesson) prepared.push(lesson);
  }
  if (prepared.length < 2) return null; // not enough to make a stage

  // Single LLM call: ask for prose labels for all lessons. The LLM
  // sees the SANs, the FENs, the themes, and the opening context; it
  // writes coach prose tying each tactic back to the opening's
  // strategic character.
  const studentSide = inferStudentSideFromName(entry.canonicalName);
  const systemPrompt = `You are an expert chess coach narrating punish lessons rooted in the "${entry.canonicalName}" opening. The student plays ${studentSide}. For each lesson below, output:
- name: 4-8 words tying the lesson to the opening + the tactic. Examples:
  • "Italian: Knight grabs f7 — fork on the queen"
  • "Caro-Kann: Careless Ngf6?? — Nd6 is mate"
  • "Sicilian: Loose d6 invites the bishop sack"
- whyBad: 1-2 sentences on WHY the opponent's move loses. Tie it back to the opening's character (Italian's Bc4-and-Ng5 pressure on f7, Caro-Kann's solid-but-tempo-sensitive structure, Sicilian's tactical density on the queenside, etc.).
- shortWhyBad: REQUIRED ≤28-word compression of whyBad for the Brief Coach Narration setting. Preserve the KEY tactical / positional reason the move loses.
- whyPunish: 1-2 sentences on the punishing IDEA — sacrifice for tempo, fork the queen, exploit the loose bishop, etc. Reference the puzzle's themes when natural ("a classic Bxf7+ sac that wins the queen by deflection").
- shortWhyPunish: REQUIRED ≤28-word compression of whyPunish for Brief mode.
- distractors: for EACH distractor (in the SAME ORDER given), write a short label (2-5 words) and a 1-sentence explanation of why it doesn't work or doesn't punish as well.
- followupIdeas: ONE short sentence per followup move (in order) describing the tactical thread — "rook lifts to win the queen", "the king is dragged into the open", etc.
- shortFollowupIdeas: parallel array — for EACH followup move, a ≤18-word Brief-mode variant of the matching followupIdea.

The SANs and FENs are GIVEN by the puzzle database — DO NOT alter them, do NOT add or reorder distractors, do NOT invent moves. Just write the prose. Output ONLY via the tool.`;

  const lessonsBlock = prepared
    .map((l, i) => {
      const themesLine = l.themes.slice(0, 6).join(', ');
      return `Lesson ${i + 1} (rating ${l.rating}; themes: ${themesLine}):
  setupFen: ${l.setupFen}
  Opponent's mistake (inaccuracy): ${l.inaccuracy}
  Punishing move: ${l.punishment}
  Distractors (in order — write label + explanation for each):
${l.distractors.map((d, j) => `    ${String.fromCharCode(97 + j)}) ${d.san}`).join('\n')}
  Followup moves after the punishment (in order):
${l.followup.length > 0 ? l.followup.map((f, j) => `    ${j + 1}. ${f.san}`).join('\n') : '    (none)'}`;
    })
    .join('\n\n');

  const userPrompt = `Opening: ${entry.canonicalName} (${entry.eco})
Canonical line: ${entry.moves.join(' ')}
Student plays: ${studentSide}

${prepared.length} lessons to label (in order):

${lessonsBlock}

Emit a JSON object: { lessons: [ ${prepared.length} entries, in the same order, each with { name, whyBad, whyPunish, distractors[${prepared.map((l) => l.distractors.length).join('/')}], followupIdeas? } ] }.`;

  let labels: PunishLabelOutput;
  try {
    const result = await getCoachStructuredResponse(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
      'chat_response',
      // Each lesson's prose ≈ 80-120 tokens × 5 lessons ≈ 600 tokens
      // plus distractor explanations ≈ 60 tokens × 15 = 900 tokens.
      // 3K cap is generous.
      3072,
      'emit_punish_labels',
      'Emit prose labels for puzzle-derived punish lessons.',
      PUNISH_LABEL_SCHEMA,
    );
    labels = result as PunishLabelOutput;
  } catch (err) {
    void logAppAudit({
      kind: 'llm-error',
      category: 'subsystem',
      source: 'openingGenerator.generatePunishFromDb',
      summary: `punish-label LLM call failed for "${openingName}" — using template prose: ${err instanceof Error ? err.message : String(err)}`,
    });
    labels = {
      lessons: prepared.map(() => ({
        name: '',
        whyBad: '',
        whyPunish: '',
        distractors: [],
        followupIdeas: [],
      })),
    };
  }

  return prepared.map((l, i) => {
    const lab = labels.lessons?.[i];
    const themePrimary = l.themes.find((t) => PUNISH_PUZZLE_THEMES.has(t)) ?? 'tactical';
    const fallbackName = `${entry.canonicalName} — ${themePrimary} trap`;
    const shortWhyBad = lab?.shortWhyBad?.trim();
    const shortWhyPunish = lab?.shortWhyPunish?.trim();
    return {
      name: (lab?.name?.trim()) || fallbackName,
      setupFen: l.setupFen,
      // Keep the canonical PGN as setupMoves for context display
      // (the runtime ignores it when setupFen is set, but stage
      // metadata + canonical-pinning stay coherent).
      setupMoves: entry.moves,
      inaccuracy: l.inaccuracy,
      whyBad: (lab?.whyBad?.trim()) || `${l.inaccuracy} drops the thread of the opening — the position now has a tactical hole.`,
      ...(shortWhyBad ? { shortWhyBad } : {}),
      punishment: l.punishment,
      whyPunish: (lab?.whyPunish?.trim()) || `${l.punishment} exploits the resulting weakness; a classic ${themePrimary} motif.`,
      ...(shortWhyPunish ? { shortWhyPunish } : {}),
      distractors: l.distractors.map((d, j) => ({
        san: d.san,
        label: (lab?.distractors?.[j]?.label?.trim()) || `${d.san} — alternative`,
        explanation:
          (lab?.distractors?.[j]?.explanation?.trim()) ||
          `${d.san} is legal but doesn't capitalize on the inaccuracy as sharply as ${l.punishment}.`,
      })),
      followup: l.followup.map((f, j) => {
        const shortIdea = lab?.shortFollowupIdeas?.[j]?.trim();
        return {
          san: f.san,
          idea: (lab?.followupIdeas?.[j]?.trim()) || `${f.san} — continues the winning sequence.`,
          ...(shortIdea ? { shortIdea } : {}),
        };
      }),
    } satisfies PunishLesson;
  });
}

/** Parse a stage array from raw LLM output. Mirrors the recovery
 *  pipeline used for tree parses (parseGeneratedTree): markdown
 *  fences, line comments, trailing commas, then on failure a second
 *  attempt with preprocessForParse (smart quotes, control chars,
 *  unquoted object keys). Production audit (build 9dedf2a): stage
 *  gen was failing silently with the same iOS Safari parse errors
 *  the tree gen had recovery for, but parseStageArray bypassed it. */
function parseStageArray(raw: string): unknown[] | null {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '');
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket < 0 || lastBracket < firstBracket) return null;
  let jsonText = text.slice(firstBracket, lastBracket + 1);
  jsonText = jsonText.replace(/^\s*\/\/[^\n]*$/gm, '');
  jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
  function tryParse(t: string): unknown[] | null {
    try {
      const parsed = JSON.parse(t) as unknown;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  const first = tryParse(jsonText);
  if (first !== null) return first;
  const preprocessed = preprocessForParse(jsonText);
  if (preprocessed !== jsonText) {
    const second = tryParse(preprocessed);
    if (second !== null) return second;
  }
  return null;
}

/** Generate one stage's data via a focused LLM call. Optional
 *  retryContext lets the caller wrap with a retry that feeds back
 *  the prior failure (e.g. "0 lessons survived per-entry repair"). */
async function generateOneStage(
  openingName: string,
  stage: OptionalStage,
  retryContext?: string,
): Promise<{ ok: boolean; data?: unknown[]; reason?: string }> {
  // DB-narration path for drill + findMove. Code provides legal
  // moves from the Lichess DB; LLM only labels them. Eliminates
  // the "illegal SAN" repair class for these stages entirely.
  // Skip on retry — if the DB path produced an empty/invalid set
  // the first time, the legacy LLM gen path is the fallback. Other
  // stages (concepts, punish) still go through the prose-only LLM
  // gen below, since concepts has no SANs and punish's tactical
  // moves aren't in the opening DB.
  if (!retryContext && stage === 'drill') {
    try {
      const drillData = await generateDrillFromDb(openingName);
      if (drillData && drillData.length >= 2) {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'openingGenerator.generateOneStage',
          summary: `drill via DB-narration path for "${openingName}" — ${drillData.length} lines`,
        });
        return { ok: true, data: drillData };
      }
    } catch (err) {
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'openingGenerator.generateOneStage',
        summary: `drill DB path failed for "${openingName}" — falling back to free-form LLM gen`,
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
  if (!retryContext && stage === 'findMove') {
    try {
      const findMoveData = await generateFindMoveFromDb(openingName);
      if (findMoveData && findMoveData.length >= 2) {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'openingGenerator.generateOneStage',
          summary: `findMove via DB-narration path for "${openingName}" — ${findMoveData.length} questions`,
        });
        return { ok: true, data: findMoveData };
      }
    } catch (err) {
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'openingGenerator.generateOneStage',
        summary: `findMove DB path failed for "${openingName}" — falling back to free-form LLM gen`,
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
  if (!retryContext && stage === 'punish') {
    try {
      const punishData = await generatePunishFromDb(openingName);
      if (punishData && punishData.length >= 2) {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'openingGenerator.generateOneStage',
          summary: `punish via Lichess-puzzle-DB path for "${openingName}" — ${punishData.length} lessons (real opening-tagged tactical puzzles)`,
        });
        return { ok: true, data: punishData };
      }
    } catch (err) {
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'openingGenerator.generateOneStage',
        summary: `punish DB path failed for "${openingName}" — falling back to free-form LLM gen`,
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const systemPrompt = buildStageSystemPrompt(stage, openingName);
  const userMessage = retryContext
    ? `Generate the ${stage} array for the opening: ${openingName}.\n\nYour previous attempt failed:\n${retryContext}\n\nProduce a new attempt that addresses the failures above. Keep moves SIMPLE and conservative — verify each SAN is legal from its parent position. Output JSON only.`
    : `Generate the ${stage} array for the opening: ${openingName}.`;
  let raw: string;
  try {
    raw = await getCoachChatResponse(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      undefined,
      'chat_response',
      // 4096 tokens per stage is plenty — focused content fits
      // easily and keeps cost down compared to the full 16K main call.
      4096,
      undefined,
      'anthropic',
    );
  } catch (err) {
    return { ok: false, reason: `LLM call failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (raw.startsWith('⚠️')) {
    void logAppAudit({
      kind: 'llm-error',
      category: 'subsystem',
      source: 'openingGenerator.generateOneStage',
      summary: `LLM provider error for "${openingName}" / ${stage}${retryContext ? ' (retry)' : ''}`,
      details: raw.slice(0, 500),
    });
    return { ok: false, reason: raw };
  }
  const data = parseStageArray(raw);
  if (!data) {
    void logAppAudit({
      kind: 'llm-error',
      category: 'subsystem',
      source: 'openingGenerator.generateOneStage',
      summary: `stage JSON parse failed for "${openingName}" / ${stage}${retryContext ? ' (retry)' : ''}`,
      details: `raw response (first 1500 chars): ${raw.slice(0, 1500)}`,
    });
    return { ok: false, reason: 'failed to parse stage JSON' };
  }
  return { ok: true, data };
}

/** Merge a freshly-generated stage into the cached tree. Atomic via
 *  Dexie's transaction. If another stage's merge happens concurrently,
 *  Dexie serializes them — last write wins on a per-field basis but
 *  since each call writes a DIFFERENT field, no conflict. */
async function mergeStageIntoCache(
  openingName: string,
  stage: OptionalStage,
  data: unknown[],
): Promise<{ merged: boolean; keptCount: number; reason?: string }> {
  try {
    const normalized = normalizeOpeningName(openingName);
    const cached = await db.cachedOpenings.get(normalized);
    if (!cached) return { merged: false, keptCount: 0, reason: 'no cached opening to merge into' };
    // Strip PGN annotation marks from any SAN strings in the stage
    // payload BEFORE validation. Production audit (build 23c484d)
    // caught Pirc punish failing on inaccuracy="g4?" / "Bg5?" /
    // "f4?" — chess.js rejected the bare `?`. Mutating cleans both
    // the validation pass and the cached runtime data.
    normalizeStageSans(stage, data);
    // Per-entry repair: drop bad individual entries instead of
    // failing the whole stage. Production audit (build 23c484d)
    // showed Pirc punish discarded wholesale on 6 errors when really
    // only 2-3 lessons were broken — losing the salvageable ones too.
    let repairedData: unknown[] = data;
    let repairReport: StageRepairReport | null = null;
    if (stage === 'concepts') {
      const r = repairConceptsStage(data as ConceptCheckQuestion[]);
      repairedData = r.kept;
      repairReport = r.report;
    } else if (stage === 'findMove') {
      const r = repairFindMoveStage(data as FindMoveQuestion[]);
      repairedData = r.kept;
      repairReport = r.report;
    } else if (stage === 'drill') {
      const r = repairDrillStage(data as DrillLine[]);
      repairedData = r.kept;
      repairReport = r.report;
    } else if (stage === 'punish') {
      // Pin punish lessons to the canonical opening: drop any whose
      // setupMoves diverge from the canonical PGN prefix. Production
      // audit (build 1304700): the LLM emitted Dragon punish lessons
      // (5...g6) under the Najdorf banner (5...a6) — same family,
      // different sub-variation, traps would never overlap with the
      // walkthrough spine. The stage-gen prompt now warns against
      // this, but we belt-and-suspenders here too in case the LLM
      // drifts anyway.
      const canonicalEntry = resolveOpeningEntry(openingName);
      const canonicalPlies = canonicalEntry?.moves ?? [];
      const onCanonical = (data as PunishLesson[]).filter((lesson) => {
        if (canonicalPlies.length === 0) return true; // can't enforce
        // Puzzle-DB-derived lessons (setupFen present) are already
        // pinned to the opening by the Lichess openingTags filter
        // upstream — no need to enforce setupMoves equality. The
        // setupMoves field on these lessons is the canonical PGN
        // for context display only; the actual board position comes
        // from the puzzle FEN.
        if (lesson.setupFen) return true;
        const setup = lesson.setupMoves ?? [];
        // Setup must be at LEAST canonical-length and start with the
        // canonical prefix verbatim (after stripping annotation marks).
        if (setup.length < canonicalPlies.length) return false;
        for (let k = 0; k < canonicalPlies.length; k += 1) {
          if (
            stripSanAnnotations(setup[k]) !==
            stripSanAnnotations(canonicalPlies[k])
          ) {
            return false;
          }
        }
        return true;
      });
      const droppedOffCanonical = data.length - onCanonical.length;
      const r = repairPunishStage(onCanonical);
      repairedData = r.kept;
      repairReport = r.report;
      if (droppedOffCanonical > 0) {
        repairReport.dropped += droppedOffCanonical;
        repairReport.notes.unshift(
          `punish: dropped ${droppedOffCanonical} lesson(s) whose setupMoves diverged from "${openingName}" canonical PGN`,
        );
      }
    }
    if (repairReport && (repairReport.dropped > 0 || repairReport.fixed > 0)) {
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'openingGenerator.mergeStageIntoCache',
        summary: `repaired ${stage} for "${openingName}" — ${repairReport.fixed} fixed, ${repairReport.dropped} dropped (${repairedData.length} kept)`,
        details: repairReport.notes.slice(0, 8).join('\n'),
      });
    }
    if (repairedData.length === 0) {
      const reason = repairReport
        ? `all ${stage} entries dropped during per-entry repair: ${repairReport.notes.slice(0, 4).join('; ')}`
        : `0 ${stage} entries after repair`;
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'openingGenerator.mergeStageIntoCache',
        summary: `no salvageable ${stage} entries for "${openingName}" after repair`,
      });
      return { merged: false, keptCount: 0, reason };
    }
    const updatedTree: WalkthroughTree = {
      ...cached.tree,
      [stage]: repairedData,
    };
    // Re-validate the merged tree to catch corruption.
    const issues = validateMoveLegality(updatedTree);
    const errors = issues.filter((i) => i.severity === 'error' && i.path[0] === stage);
    if (errors.length > 0) {
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'openingGenerator.mergeStageIntoCache',
        summary: `discarded background-generated ${stage} for "${openingName}" — ${errors.length} legality errors`,
        // Production audit (build 3965c09) showed N-error counts but
        // no SAN detail, so we couldn't tell which moves were illegal
        // or where the LLM was confused. Capture the full issue list
        // (capped) so the next audit triage has the SAN + FEN context.
        details: formatIssues(errors).slice(0, 2500),
      });
      return {
        merged: false,
        keptCount: 0,
        reason: `${errors.length} validation errors after repair: ${formatIssues(errors).slice(0, 800)}`,
      };
    }
    await db.cachedOpenings.put({
      ...cached,
      tree: updatedTree,
      generatedAt: cached.generatedAt, // preserve original timestamp
    });
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'openingGenerator.mergeStageIntoCache',
      summary: `merged ${stage} (${repairedData.length} entries) into cached "${openingName}"`,
    });
    return { merged: true, keptCount: repairedData.length };
  } catch (err) {
    void logAppAudit({
      kind: 'dexie-error',
      category: 'subsystem',
      source: 'openingGenerator.mergeStageIntoCache',
      summary: `failed to merge ${stage} for "${openingName}"`,
      details: err instanceof Error ? err.message : String(err),
    });
    return {
      merged: false,
      keptCount: 0,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Determine which optional stages are missing from a tree (for
 *  background-fill targeting). Empty arrays count as missing — we
 *  want SOMETHING for each stage, not a hollow shell. */
export function getMissingStages(tree: WalkthroughTree): OptionalStage[] {
  const missing: OptionalStage[] = [];
  if (!tree.concepts || tree.concepts.length === 0) missing.push('concepts');
  if (!tree.findMove || tree.findMove.length === 0) missing.push('findMove');
  if (!tree.drill || tree.drill.length === 0) missing.push('drill');
  if (!tree.punish || tree.punish.length === 0) missing.push('punish');
  return missing;
}

/** Fire-and-forget background generation for missing stages. Called
 *  AFTER the main tree is generated and cached. The 4 stages run in
 *  parallel; each successful one merges into the cached tree as it
 *  completes. Failures are silent — the user gets whatever finishes
 *  by the time they reach the stage menu. Idempotent: calling again
 *  for stages already present is a no-op (the `missing` filter
 *  excludes them). */
export async function generateMissingStagesInBackground(
  openingName: string,
  tree: WalkthroughTree,
  onStageMerged?: (stage: 'concepts' | 'findMove' | 'drill' | 'punish') => void,
): Promise<void> {
  const missing = getMissingStages(tree);
  if (missing.length === 0) return;
  void logAppAudit({
    kind: 'coach-surface-migrated',
    category: 'subsystem',
    source: 'openingGenerator.generateMissingStagesInBackground',
    summary: `kicking off ${missing.length} background stage gens for "${openingName}": ${missing.join(', ')}`,
  });
  // Promise.all runs them in parallel. We swallow the result —
  // individual failures don't block other stages.
  await Promise.all(
    missing.map(async (stage) => {
      const first = await generateOneStage(openingName, stage);
      if (!first.ok || !first.data) {
        void logAppAudit({
          kind: 'llm-error',
          category: 'subsystem',
          source: 'openingGenerator.generateMissingStagesInBackground',
          summary: `background stage gen failed for "${openingName}" / ${stage}: ${first.reason ?? 'unknown'}`,
        });
        return;
      }
      const merge = await mergeStageIntoCache(openingName, stage, first.data);
      if (merge.merged) {
        // Notify caller — the walkthrough is likely already running
        // and needs to refresh its in-memory tree so newly-arrived
        // punish lessons / drill lines / quiz questions become
        // available for trap-prompt and stage menus. Production audit
        // (build bc1eb69): "I never saw the punish lines" — root
        // cause was that the walkthrough's tree was a snapshot at
        // start() time, never updated when stages merged later.
        try { onStageMerged?.(stage); } catch { /* swallow */ }
        return;
      }
      // First attempt produced data but everything got dropped during
      // per-entry repair (e.g. all 5 punish lessons had illegal
      // setupMoves / inaccuracy / punishment). Try ONE more time with
      // the failure context fed back so the LLM can produce a simpler,
      // more conservative attempt. Production goal: punish stage
      // surfaces reliably for any opening, not just easy ones.
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'openingGenerator.generateMissingStagesInBackground',
        summary: `retrying ${stage} for "${openingName}" — first attempt yielded 0 kept entries`,
      });
      const retry = await generateOneStage(openingName, stage, merge.reason);
      if (!retry.ok || !retry.data) {
        void logAppAudit({
          kind: 'llm-error',
          category: 'subsystem',
          source: 'openingGenerator.generateMissingStagesInBackground',
          summary: `background stage gen retry failed for "${openingName}" / ${stage}: ${retry.reason ?? 'unknown'}`,
        });
        return;
      }
      const retryMerge = await mergeStageIntoCache(openingName, stage, retry.data);
      if (!retryMerge.merged) {
        void logAppAudit({
          kind: 'llm-error',
          category: 'subsystem',
          source: 'openingGenerator.generateMissingStagesInBackground',
          summary: `${stage} retry merge failed for "${openingName}": ${retryMerge.reason ?? 'unknown'}`,
        });
      } else {
        try { onStageMerged?.(stage); } catch { /* swallow */ }
      }
    }),
  );
}

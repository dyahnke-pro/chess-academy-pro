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
import { Chess, type Move } from 'chess.js';
import puzzleData from '../data/puzzles.json';
import { extractMentionedSquares, MAX_CANDIDATE_HIGHLIGHTS, type LineMove } from './arrowEngine';
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
  resolveTeachSpine,
  findContinuationsAtPly,
  inferStudentSideFromName,
  type ForkBranch,
} from './openingDetectionService';
import { db, type CachedOpening } from '../db/schema';
import { gradeNarrationText, gradeNarrationAcrossLine } from './coachAnswerGates';
import { materialBalance } from './materialClaimValidator';
import { narrateContinuationMove } from './continuationMoveNarration';
import { logAppAudit } from './appAuditor';
import { buildDanyaTeachingBlock, noteAtPosition, spokenBeatText } from './danyaTeachingService';
import { authoredNoteAt, authoredEntryFor } from './authoredOpeningNotes';
import authoredRepertoire from '../data/repertoire.json';
import { deriveNarrationArrows } from './narrationArrows';
import { splitSentences, squaresInText } from './narrationSegments';
import { bakedNarrationFor } from './bakedWalkthroughNarration';
import { gemPunishLessonsForOpeningName } from './gemPunishLessons';
import { detectTactics } from './tacticsDetector';
import { stageArrayHasUsableEntry } from './stageEntryValidity';
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
/** TEACHING grounding for a STAGE prompt.
 *
 *  The walkthrough spine was moved off the pre-1930 book corpus and onto the
 *  farmed teaching notes (David 2026-07-12, "unwire the books"), but the STAGES
 *  — the concept checks, find-the-move questions, drills and punishes the
 *  student actually works through after watching — were left on the books. So
 *  the lesson taught one set of ideas and then quizzed a different, century-old
 *  set. The notes are what the coach just said; the questions should come from
 *  the same place.
 *
 *  Opening-level rather than per-ply: a stage spans many positions, so the note
 *  selection keys off the opening name and the canonical spine.
 *
 *  This ADDS to the book block rather than replacing it — the book block is
 *  what carries the DB move sequences a stage must stay inside (G3), and those
 *  are load-bearing for legality. Only the IDEAS move to the notes. */
function buildStageTeachingBlock(openingName?: string): string {
  if (!openingName) return '';
  try {
    const entry = resolveOpeningEntry(openingName);
    const block = buildDanyaTeachingBlock({
      historySans: entry?.moves ?? [],
      openingName: entry?.canonicalName ?? openingName,
      maxNotes: 6,
    });
    if (!block) return '';
    void logAppAudit({
      kind: 'book-grounding-injected',
      category: 'subsystem',
      source: 'openingGenerator.stageTeaching',
      summary: `stage prompt grounded with teaching notes for "${openingName}" (${block.length} chars)`,
    });
    return `${block}

USE THE TEACHING ABOVE. The questions, labels and explanations you write must
draw on those ideas — they are what the coach already taught the student in the
walkthrough, so a stage that tests something else teaches two different lessons.
Ground the PROSE in them; the move sequences still come from the database lines
below.`;
  } catch {
    return ''; // the corpus is a bonus, never a blocker
  }
}

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

/** `Tour:` / `Face:` mark genuinely DIFFERENT lessons of the same opening — a
 *  quick tour, or the counter side — so they must never share a cache row. Any
 *  canonical key has to carry the prefix the caller asked with. */
const MODE_PREFIX_RE = /^((?:tour:\s*)?(?:face:\s*)?)/;

/** Where a generated tree SHOULD live: the mode prefix the caller used, plus the
 *  opening the tree actually teaches.
 *
 *  The lesson used to be cached under whatever the STUDENT TYPED. `requestedName`
 *  in `CoachTeachPage.handleSubmit` is raw input on four of its five paths (only
 *  the fuzzy branch canonicalizes), so "teach the caro" and "teach me the
 *  Caro-Kann" wrote two rows and each paid the full ~60s build — David 2026-08-05:
 *  "routing takes about 60 seconds because the lesson plans needs to build. It
 *  should cache after first use."
 *
 *  Keying on the tree's own identity also repairs the stage merge for free.
 *  `generateMissingStagesInBackground` is handed `tree.openingName`, and
 *  `mergeStageIntoCache` normalizes THAT to find the row — so with the row filed
 *  under the typed name it was reading a key that did not exist. */
export function canonicalCacheKey(requestedName: string, tree?: WalkthroughTree): string {
  const normalizedRequest = normalizeOpeningName(requestedName);
  const prefix = MODE_PREFIX_RE.exec(normalizedRequest)?.[1] ?? '';
  const base = normalizedRequest.slice(prefix.length).trim();
  if (!base) return normalizedRequest;
  // Resolve the phrasing to the DB's canonical name. `resolveOpeningEntry`'s
  // own doc has said to do this since it was written — "Callers should use the
  // returned canonicalName for cache keys … so that 'najdorf' and 'Sicilian
  // Defense: Najdorf Variation' land on the same cache row" — and no caller
  // did. Resolving on BOTH read and write is what makes a phrasing never seen
  // before hit a row an earlier phrasing built, with no alias to consult.
  // Resolve the PHRASING first, then the tree's own name. Both must go through
  // the resolver or they disagree on spelling: the app writes "Caro-Kann
  // Defence" while the DB is American ASCII ("Caro-Kann Defense"), so keying a
  // write off the tree name and a read off the resolver split one opening
  // across two rows — the exact bug this function exists to close.
  for (const candidate of [base, tree?.openingName]) {
    if (!candidate) continue;
    try {
      const resolved = resolveOpeningEntry(candidate)?.canonicalName;
      if (resolved) return `${prefix}${normalizeOpeningName(resolved)}`;
    } catch { /* try the next candidate */ }
  }
  // No DB match (a constructed matchup, a face-mode counter line): the tree
  // knows what it taught, which is still better than the raw phrasing. A read
  // has no tree, so those land on the alias written at cache time.
  const fromTree = normalizeOpeningName(tree?.openingName ?? '');
  return fromTree ? `${prefix}${fromTree}` : normalizedRequest;
}

/** Meta key pointing a typed phrasing at the row its lesson really lives in. */
const aliasKey = (normalized: string): string => `walkthroughAlias:${normalized}`;

/** Read-through cache: check Dexie before generating. RE-VALIDATES
 *  the cached tree before returning — production audit (build
 *  c2bc340) caught a bad Pirc tree shipping into the cache during
 *  the window before tree-legality validation existed. Re-checking
 *  on retrieval means broken trees from old caches get evicted +
 *  re-generated automatically; users don't have to clear storage. */
/** Sanitize a cached/shared walkthrough tree's post-walkthrough STAGE
 *  arrays (concepts / findMove / drill / punish) by running the SAME
 *  per-entry repairs the fresh-gen path applies (drops illegal /
 *  malformed entries). This is the SOURCE fix for the "trap line / quiz
 *  won't start" crash class (David 2026-07-15): a tree persisted before
 *  a repair shipped — or pulled from the shared cache — can carry a
 *  malformed stage entry (missing `distractors`/`choices`/`candidates`/
 *  `moves`) that throws in a downstream picker/render. `getCachedOpening`
 *  only re-checks tree MOVE legality, not stage-array shape, so sanitize
 *  the stages here at the boundary — every consumer then gets clean
 *  data, and the per-consumer validity guards become defense-in-depth.
 *  Returns the same tree object mutated in place (arrays replaced with
 *  their repaired subsets). */
export function sanitizeTreeStages(tree: WalkthroughTree): WalkthroughTree {
  try {
    if (Array.isArray(tree.concepts) && tree.concepts.length > 0) {
      // The taught main line, so a concept question that EXPLAINS the opening
      // is judged against the positions it actually talks about rather than
      // against move 0 (David 2026-08-01 — 22 true sentences deleted in one
      // lesson). First child at each level = the spine; branches are
      // alternatives the question is not about.
      const mainLine: string[] = [];
      for (let n = tree.root.children?.[0]?.node; n; n = n.children?.[0]?.node) {
        if (n.san) mainLine.push(n.san);
        if (mainLine.length > 40) break; // never walk a malformed cycle
      }
      tree.concepts = repairConceptsStage(tree.concepts, tree.startFen, mainLine).kept;
    }
    if (Array.isArray(tree.findMove) && tree.findMove.length > 0) {
      tree.findMove = repairFindMoveStage(tree.findMove).kept;
    }
    if (Array.isArray(tree.drill) && tree.drill.length > 0) {
      tree.drill = repairDrillStage(tree.drill).kept;
    }
    if (Array.isArray(tree.punish) && tree.punish.length > 0) {
      tree.punish = repairPunishStage(tree.punish).kept;
    }
  } catch {
    // A repair throwing on wildly-malformed data must not break the read
    // — the per-consumer validity guards still protect the UI.
  }
  return tree;
}

/** Bump to invalidate every cached walkthrough tree on next read. The corpus
 *  teaching splice happens at GENERATION time, so trees generated before it
 *  would keep speaking corpus-free narration forever off the warm cache. */
// Bumped for the truncated-narration salvage + wider retry: lessons generated
// before it are cached with all-template ideas (the "repetitive, nothing like
// Naroditsky" narration) and must regenerate rather than serve that forever.
// BUMP THIS whenever the SHAPE of generated narration changes, not just its
// wording — a cached tree is replayed exactly as it was built, so a shipped
// improvement nobody can see is the same as no fix at all. 2026-08-01: arrows are now
// grounded in the teaching note and each ply is split into per-sentence
// segments so the board reveals in step with the voice. Both are baked in at
// generation time, so every tree cached before this rev still narrates the old
// way (David: "squares and arrows are still not appearing as they are being
// mentioned" — they were not, because his Alekhine came from cache).
// 2026-08-04: the corpus note now LEADS each beat instead of trailing it
// (David: "corpus notes are primary for teach me x opening"), and branch /
// extension beats splice the note text at all — previously their arrows were
// note-grounded while the prose never named what the arrows pointed at. Both
// are baked in at generation time, so without this bump every already-taught
// opening keeps narrating the old note-as-afterthought order off the cache.
// ONE bump covering the whole 2026-08-05 narration batch (spoken-register cap,
// move-recitation drop, variation-scope filter) — batched per the locked cost
// rule: every bump makes cached lessons regenerate and their TTS re-synthesise.
// Bumped for the authored-prose tier: the splice order changed (corpus →
// HAND-WRITTEN → generated), and beats bake at generation time, so a cached
// tree would serve the old order forever.
//
// 🔒 AND BUMPED AGAIN, BECAUSE THE FIRST BUMP SHIPPED WITH THE TIER HALF DEAD.
// The authored lookup matched opening names raw, so the 18 British-spelled
// entries in repertoire.json ("French Defence", "Caro-Kann Defence") never
// resolved. Every lesson generated during that window cached at THIS revision
// — correct rev, missing teaching — and the fix could not reach a single one
// of them, because the cache only regenerates when the revision MOVES. A
// prod run confirmed it: the French Exchange lesson spoke 79 lines and not
// one of them was the hand-written prose that had been repaired hours earlier.
//
// The general rule, which cost a build to learn: a fix to what generation
// PRODUCES is invisible to every already-generated lesson until this string
// changes. Shipping the code is not shipping the behaviour.
// …and bumped a THIRD time, for the same reason as the second, caught on a
// session-end reread. The moves-first resolution and the introduction window
// both changed what PASS 1 produces, and neither moved this string — so every
// lesson cached at the '-spelling' rev keeps its dead-tier prose forever while
// the audits (fresh browser, cold cache, always regenerating) show green.
// One bump batching both fixes, per the locked cost rule.
// 2026-08-17: sixteen hand-written video notes landed, and PASS 1 splices a note
// at the ply it is anchored to. Beats bake at generation time, so without this
// bump every lesson already cached — including the trees seeded onto a fresh
// device — keeps prose written before the notes existed, and the new teaching
// reaches nobody. A prod audit chased that for an hour: the note was verifiably
// in the shipped bundle, verifiably on the taught line, and verifiably selected
// by the real selector in unit tests, while the lesson on prod served a cached
// tree that predated it. The comment directly above describes the same failure
// from August, which is the argument for bumping WITH the change rather than
// after noticing.
//
// One bump for all sixteen notes, per the locked cost rule: a bump regenerates
// prose into new strings that miss the TTS clip cache, so batching keeps that to
// a single synthesis bill instead of one per lesson written.
const WALKTHROUGH_GEN_REV = '2026-08-17-video-notes';

export async function getCachedOpening(
  name: string,
): Promise<WalkthroughTree | null> {
  try {
    const typed = normalizeOpeningName(name);
    let normalized = typed;
    let cached = await db.cachedOpenings.get(normalized);
    if (!cached) {
      // Resolve the phrasing to the row the lesson is really filed under. This
      // is what makes a brand-new phrasing hit — "caro kann" finding what "the
      // caro" built — instead of paying the ~60s rebuild again.
      const resolvedKey = canonicalCacheKey(name);
      if (resolvedKey !== typed) {
        cached = await db.cachedOpenings.get(resolvedKey);
        if (cached) normalized = resolvedKey;
      }
    }
    if (!cached) {
      // Belt and braces for rows written before canonical keying, and for names
      // the resolver cannot place (constructed matchups, face-mode counters).
      const alias = await db.meta.get(aliasKey(typed));
      const target = typeof alias?.value === 'string' ? alias.value : '';
      if (target && target !== typed) {
        cached = await db.cachedOpenings.get(target);
        if (cached) normalized = target;
      }
    }
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
    // Generator-revision gate: a tree generated before the current pipeline
    // (e.g. pre-dating the deterministic teaching splice) must not survive on
    // the warm cache — evict it so the next request regenerates.
    if (cached.genRev !== WALKTHROUGH_GEN_REV) {
      void logAppAudit({
        kind: 'opening-cache-invalidated',
        category: 'subsystem',
        source: 'openingGenerator.getCachedOpening',
        summary: `cache invalidated: "${name}" — genRev ${cached.genRev ?? '(none)'} != ${WALKTHROUGH_GEN_REV}`,
        details: JSON.stringify({ name, normalized }),
      });
      await db.cachedOpenings.delete(normalized);
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
    // Repair the stage arrays at the boundary (see sanitizeTreeStages) —
    // a legacy cached tree can carry a malformed concepts/findMove/drill/
    // punish entry that would crash a downstream picker/render.
    sanitizeTreeStages(cached.tree);
    // Stamp the key on the way OUT too, so a tree served from a row written
    // before `cacheOpening` started stamping still knows where it lives. A
    // warm cache long outlives a deploy; without this the trap-stage hang
    // would simply persist for anyone already holding an old row.
    cached.tree.cacheKey = normalized;
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
    if (tree.narrationFallback) {
      void logAppAudit({
        kind: 'opening-cache-invalidated',
        category: 'subsystem',
        source: 'openingGenerator.cacheOpening',
        summary: `refusing to cache "${name}" — template-fallback narration (regen next ask)`,
      });
      return;
    }
    // STAMP THE CACHE KEY ON THE TREE (David 2026-08-04 — the trap-stage hang).
    //
    // A tree is cached under the key the CALLER resolved ("Vienna"), while the
    // tree's own `openingName` is the canonical line it ended up teaching
    // ("Vienna Game"). Anything later wanting to re-read this entry — chiefly
    // `mergeStagesFromCache`, picking up background-generated stages — was
    // looking it up by `openingName` and missing entirely. The stages really
    // were written ("merged punish (5 entries) into cached \"Vienna\"") and the
    // surface really did wait forever, because it was reading a different row.
    //
    // Carrying the key on the tree makes the round trip closed: whoever holds
    // the tree knows exactly where it lives, regardless of which of the six
    // cacheOpening call sites wrote it or what name they used.
    // Stamped in PLACE, deliberately: the caller hands this exact tree to
    // `startWalkthrough` right after caching it, so the running walkthrough
    // must carry the key too — a stamped copy in Dexie would leave the live
    // tree unable to find its own row.
    // File under the OPENING, not the phrasing (see `canonicalCacheKey`), and
    // leave a pointer from what the student typed so the next phrasing of the
    // same ask lands on the row instead of rebuilding it.
    const typedKey = normalizeOpeningName(name);
    const normalizedName = canonicalCacheKey(name, tree);
    tree.cacheKey = normalizedName;
    if (typedKey && typedKey !== normalizedName) {
      await db.meta.put({ key: aliasKey(typedKey), value: normalizedName });
    }
    const record: CachedOpening = {
      normalizedName,
      displayName: tree.openingName,
      eco: tree.eco,
      tree,
      generatedAt: Date.now(),
      genRev: WALKTHROUGH_GEN_REV,
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
  /** The tree's own start position, so a question carrying NO path is still
   *  board-gated against the opening it belongs to. Without this the gate had
   *  a hole: path-less questions were checked against nothing at all. */
  startFen?: string,
  /** The taught line's SANs. A concept question EXPLAINS the opening, so its
   *  prose ranges over the whole line — see `gradeNarrationAcrossLine`. Given
   *  these, a claim is judged against every position the line passes through
   *  instead of one snapshot where most of the pieces it names do not exist
   *  yet. Without them the behaviour is unchanged. */
  lineSans?: readonly string[],
): { kept: ConceptCheckQuestion[]; report: StageRepairReport } {
  // Every position the taught line passes through, computed once.
  const linePositions: string[] = [];
  if (lineSans && lineSans.length > 0) {
    const walker = startFen ? new Chess(startFen) : new Chess();
    linePositions.push(walker.fen());
    for (const san of lineSans) {
      try {
        walker.move(stripSanAnnotations(san));
      } catch {
        break;
      }
      linePositions.push(walker.fen());
    }
  }
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
    // Default to the opening's own position; a path just moves us deeper.
    let atFen: string | null = startFen ?? new Chess().fen();
    if (q.path && q.path.length > 0) {
      const replayed = replayAll(q.path, startFen);
      if (!replayed) {
        const droppedPath = q.path.join(' ');
        q.path = [];
        report.fixed += 1;
        report.notes.push(`concepts[${i}]: stripped illegal path "${droppedPath}"`);
      } else {
        atFen = replayed.fen();
      }
    }
    // Board-claim gate the quiz prose, the same way findMove and punish are
    // gated. Concepts was the ONE stage with no board gate at all, which is
    // what `voiceFacts.containmentTripwire` kept catching on David's device
    // (2026-07-31: squares d2/d8/c8/d7 and a2 introduced with no grounding) —
    // a quiz could name a square that isn't what's on the board.
    // A question with its OWN path points at a specific position, so it is
    // graded there. A path-LESS question explains the opening as a whole and is
    // graded across the line — the root cause of 22 true sentences being
    // deleted in a single lesson (David 2026-08-01).
    const scope = q.path && q.path.length > 0 ? [atFen] : (linePositions.length > 0 ? linePositions : [atFen]);
    const fens = scope.filter((f): f is string => !!f);
    if (fens.length > 0) {
      q.prompt = gradeNarrationAcrossLine(q.prompt, fens, 'openingGenerator.concepts') || q.prompt;
      for (const c of q.choices) {
        c.text = gradeNarrationAcrossLine(c.text, fens, 'openingGenerator.concepts') || c.text;
        if (c.explanation) {
          c.explanation = gradeNarrationAcrossLine(c.explanation, fens, 'openingGenerator.concepts') || c.explanation;
        }
      }
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
/** Keep gated prose when anything survived; otherwise describe the move from
 *  the board. `gradeNarrationText` returns '' when it strips every sentence,
 *  which used to leave punish lessons silent (A3, David's 2026-07-31 log). */
function gatedOrComputed(
  gated: string | undefined,
  fenBefore: string,
  fenAfter: string,
  san: string,
): string {
  if (gated && gated.trim().length > 0) return gated;
  try {
    const c = new Chess(fenBefore);
    const mv = c.move(stripSanAnnotations(san));
    if (!mv) return '';
    return narrateContinuationMove(fenBefore, fenAfter, mv.san, mv.from, mv.to).say;
  } catch {
    return '';
  }
}

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
    // When the gate strips EVERY sentence it returns '' — and `?? x` doesn't
    // catch an empty string, so the lesson shipped with NO narration at all
    // (eight of these in David's 2026-07-31 device log, all `kept: ""`).
    // Empty beats wrong, but a computed board-true line beats empty: the same
    // per-move fact composer the play-out uses can always describe the move
    // that was actually played, from the position it was played in.
    lesson.whyBad = gatedOrComputed(
      gradeNarrationText(lesson.whyBad, postInaccuracyFen, 'openingGenerator.punish'),
      setupFen, postInaccuracyFen, lesson.inaccuracy,
    ) || lesson.whyBad;
    lesson.whyPunish = gatedOrComputed(
      gradeNarrationText(lesson.whyPunish, postPunishFen, 'openingGenerator.punish'),
      postInaccuracyFen, postPunishFen, lesson.punishment,
    ) || lesson.whyPunish;
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
            // The ORANGE played-move trail deliberately ends on the move's
            // destination — that's the opening-tab trail arrow (David
            // 2026-07-31). Keep it; the redundancy rule below is for
            // vision arrows only.
            if (a.color === 'orange') return true;
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
/** THE GROUNDED ARROW SOURCE for one ply (G0 — David 2026-08-01: "it shouldn't
 *  decide. the narrations are grounded in the notes. whatever the notes say
 *  about squares are what get arrows").
 *
 *  Arrows used to be scraped off the MODEL's finished prose, which left the
 *  choice of what to point at with the model: mention a square and it gets an
 *  arrow, stay quiet and it doesn't. That is the LLM deciding board content.
 *  The teaching note is what the narration is grounded in, so the note is what
 *  the arrows come from — computed in code, before the model speaks a word.
 *
 *  Returns the note's teaching text ALREADY graded against this ply's board
 *  (`gradeNarrationText` drops provably-false piece-on-square claims), or null
 *  when no note is taught at this position — an ungrounded ply has nothing but
 *  the prose to go on, and that fallback stays as it was.
 *
 *  `seenIds` keeps an opening-level note from re-arrowing every ply.
 *
 *  Exported for MEASUREMENT (`teachingCoverage.report.test`). Coverage has to be
 *  counted through this function rather than through the raw retrieval tiers:
 *  those say what the corpus COULD offer, while this says what a lesson actually
 *  splices — the dedupe and the board-truth grade both drop plies, and a report
 *  that skips them overstates by a factor of three. */
export function noteArrowSourceAt(
  historySans: string[],
  fen: string,
  seenIds: Set<string>,
  openingName?: string | null,
): string | null {
  try {
    // POSITION ONLY — move-prefix or transposition into this very FEN. This is
    // the contract documented at the splice site below, and for three days the
    // code did not honour it: a `supportNoteForPly` fallback reached notes by
    // OPENING-NAME token overlap, which asks nothing about the board. That put
    // teaching authored at a different position in front of the model to phrase
    // as if it described this move — the hallucination, upstream of every gate
    // (David 2026-08-04: "fix the package or how the position is chosen").
    //
    // `seenIds` goes IN rather than being checked on the way out: rejecting the
    // result here left 647 of 1,310 plies silent, because retrieval kept handing
    // back a note the lesson had already spoken and had no way to be asked for
    // the next one.
    const note = noteAtPosition(historySans, fen, openingName, seenIds);
    if (!note) return null;
    // SPOKEN register, not the full beat. `teachingBeatText` concatenates
    // explains+teaches+plans (median 544 chars) and the splice then stacked
    // generated prose on top — ~130 spoken words for one move. David 2026-08-05:
    // "a bit too wordy … droned on with long strings of FENs which lost me."
    // `spokenBeatText` is explains-only, recitation sentences dropped, capped
    // at a sentence boundary; teaches/plans still reach the model via the
    // lesson-level teaching block.
    const graded = gradeNarrationText(spokenBeatText(note), fen, 'openingGenerator.noteArrows');
    if (!graded?.trim()) return null;
    seenIds.add(note.id);
    return graded;
  } catch {
    return null; // the corpus is a bonus, never a blocker
  }
}

/** The ply's arrows: the ORANGE trail on the move just played, plus GREEN
 *  vision arrows for the moves the GROUNDING SOURCE names.
 *
 *  `noteText` is the note that grounds this ply (null when none is taught
 *  here); `prose` is the narration actually spoken. The note wins whenever it
 *  exists — that is the whole G0 point, and it is why this takes both rather
 *  than a single pre-resolved string: the caller must not be able to quietly
 *  hand the prose in as if it were grounding. */
export function groundedSegmentArrows(
  noteText: string | null,
  prose: string,
  move: { from: string; to: string; fen: string },
): {
  arrows: NarrationSegmentType['arrows'];
  source: 'note' | 'prose';
  /** Per GREEN arrow: the SAN it represents and where that move was mentioned
   *  in the source text. The offset is what lets a caller hand each arrow to
   *  the sentence that actually speaks it. The orange trail has no span — it is
   *  the move being played, not a mention. */
  spans: Array<{ from: string; to: string; san: string; index: number }>;
} {
  const source = noteText?.trim() ? 'note' : 'prose';
  const text = source === 'note' ? (noteText as string) : prose;
  const derived = deriveNarrationArrows(text, move.fen, [{ from: move.from, to: move.to }]).arrows;
  return {
    source,
    spans: derived.map((a) => ({ from: a.from, to: a.to, san: a.san, index: a.index })),
    arrows: [
      { from: move.from, to: move.to, color: 'orange' },
      ...derived.map((a) => ({ from: a.from, to: a.to, color: 'green' as const })),
    ],
  };
}

/** Split one ply's narration into per-SENTENCE segments, each carrying only the
 *  arrows that sentence names, so the board reveals in step with the voice.
 *
 *  The ORANGE trail rides every segment — it marks the move being played and
 *  must not blink out mid-beat. Green arrows are placed by the sentence their
 *  mention falls in; anything unplaceable rides the first segment rather than
 *  being dropped. A single-sentence beat returns exactly what it was handed. */
export function splitSegmentBySentence(
  segment: NarrationSegmentType,
  spans: Array<{ from: string; to: string; san: string; index: number }>,
): NarrationSegmentType[] {
  const sentences = splitSentences(segment.text);
  if (sentences.length <= 1) return [segment];

  const trail = (segment.arrows ?? []).filter((a) => a.color === 'orange');
  const green = (segment.arrows ?? []).filter((a) => a.color !== 'orange');
  const spanOf = new Map(spans.map((sp) => [`${sp.from}-${sp.to}`, sp.index]));

  // Character range of each sentence within the beat, walked in order so a
  // repeated sentence cannot resolve to the wrong occurrence.
  const bounds: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const sentence of sentences) {
    const at = segment.text.indexOf(sentence, cursor);
    const start = at >= 0 ? at : cursor;
    bounds.push({ start, end: start + sentence.length });
    cursor = start + sentence.length;
  }

  const sentenceOf = (key: string): number => {
    const idx = spanOf.get(key);
    if (idx === undefined) return 0;
    const hit = bounds.findIndex((b) => idx >= b.start && idx < b.end);
    return hit >= 0 ? hit : 0;
  };

  // Highlights follow their arrow's sentence when one names the same square,
  // so a yellow square lights up with the words that point at it.
  const highlights = segment.highlights ?? [];
  return sentences.map((text, i) => {
    const own = green.filter((a) => sentenceOf(`${a.from}-${a.to}`) === i);
    const out: NarrationSegmentType = { text, arrows: [...trail, ...own] };
    const mine = highlights.filter((h) => squaresInText(text).has(h.square));
    const leftovers = i === sentences.length - 1
      ? highlights.filter((h) => !sentences.some((sent) => squaresInText(sent).has(h.square)))
      : [];
    const combined = [...mine, ...leftovers];
    if (combined.length > 0) out.highlights = combined;
    // The short register and the flipped registers describe the WHOLE beat, so
    // they belong to its first segment only — repeating them per sentence would
    // speak the cue several times over.
    if (i === 0) {
      if (segment.shortText) out.shortText = segment.shortText;
      if (segment.textFlipped) out.textFlipped = segment.textFlipped;
      if (segment.shortTextFlipped) out.shortTextFlipped = segment.shortTextFlipped;
    }
    return out;
  });
}

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
  /** When the caller ALREADY has the exact opening (e.g. the openings page
   *  handing a NON-built line to the coach), pass its identity here to build
   *  the walkthrough straight from these moves — bypassing name resolution,
   *  which filters out terminal-short lines (short namesakes like the Scandi
   *  Panov Transfer) and returns null for them. G3-safe: the moves come from
   *  the DB record, not the LLM. (David 2026-07-16.) */
  entryOverride?: TeachEntryOverride;
}

/** Minimal opening identity a caller can hand to `generateOpening` to skip
 *  name resolution — same shape `resolveOpeningEntry` returns. */
export interface TeachEntryOverride {
  canonicalName: string;
  eco: string;
  moves: string[];
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
          // No `arrows` field — lead-the-eye arrows are computed in
          // code (computeLeadEyeArrows), never decided by the LLM.
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
            // No `arrows` — computed in code (computeLeadEyeArrows).
          },
        },
      },
    },
  },
};

interface NarrationIdea {
  text: string;
  shortText?: string;
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

/** Did the narration payload survive to its LAST field, or was it cut off?
 *
 *  The model emits the schema in order — spine `ideas` first, then
 *  `branchIdeas`, then `branchExtensionIdeas` — and a payload that hits
 *  max_tokens is salvaged by keeping the complete prefix and dropping the
 *  partial tail. So a full spine proves nothing about the fork prose: the
 *  branches are exactly what a truncated payload loses. Absence is the signal.
 *  An extension array that is PRESENT but thin is the model skimping rather
 *  than running out of room, and a retry does not fix that (the per-move
 *  template fallback covers it), so only whole missing fields count here. */
export function narrationTailCovered(
  n: { branchIdeas?: string[]; branchExtensionIdeas?: unknown[] } | null,
  branchCount: number,
): boolean {
  if (branchCount === 0) return true;
  const ideas = Array.isArray(n?.branchIdeas) ? n.branchIdeas.filter((s) => !!s?.trim()).length : 0;
  const ext = Array.isArray(n?.branchExtensionIdeas) ? n.branchExtensionIdeas.length : 0;
  return ideas >= branchCount && ext >= branchCount;
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
  /** Skip name resolution when the caller already has the opening (option B —
   *  lets the coach teach terminal-short non-built lines the resolver hides). */
  entryOverride?: TeachEntryOverride,
): Promise<WalkthroughTree | null> {
  // Prefer the caller-supplied entry (the openings page already knows the exact
  // line); else the curated repertoire line (so a picker-chosen variation
  // matches the opening tab); else the ECO DB.
  const entry = entryOverride ?? resolveCuratedVariation(name) ?? resolveOpeningEntry(name);
  if (!entry || entry.moves.length === 0) return null;

  // Use the SHORTEST canonical PGN as the spine. The DB carries
  // multiple rows for popular openings at different depths (Najdorf
  // at 10/11/12/13/14 plies); the bare entry is the natural spine
  // and leaves the most room for fork branches at the end. The
  // longer-depth rows ARE valid lines but they're better surfaced
  // as DB-grounded deep-dive targets, not the default walkthrough.
  // Resolve the spine + deep-dive fork branches, GUARANTEEING the main
  // line reaches a middlegame in full pace (David 2026-07-15 — "doesn't
  // get me to the middle game"). See `resolveTeachSpine`: when the
  // shortest-canonical spine's forks don't carry the line past the
  // opening, it extends the spine itself to a middlegame terminus. The
  // extended plies are narrated by the same single Danya-voiced,
  // teaching-grounded LLM call below. Tour mode stays a quick taste.
  const spineResolution = resolveTeachSpine(entry.canonicalName, entry.moves, {
    extendToMiddlegame: pace !== 'tour',
  });
  const spineMoves = spineResolution.spineMoves;
  const rawBranches: ForkBranch[] = spineResolution.branches;
  if (spineResolution.extendedToMiddlegame) {
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'openingGenerator.generateOpeningFromDbNarration',
      summary: `spine extended to middlegame for "${entry.canonicalName}" (${spineMoves.length} plies) — forks did not carry the main line past the opening`,
    });
  }

  // 1. Replay the PGN, collect each move's SAN + post-move FEN.
  type Position = { san: string; fen: string; ply: number; movedBy: 'white' | 'black'; from: string; to: string };
  const positions: Position[] = [];
  const c = new Chess();
  for (let i = 0; i < spineMoves.length; i += 1) {
    let mv: Move;
    try {
      mv = c.move(stripSanAnnotations(spineMoves[i]));
    } catch {
      return null; // DB entry corrupt — extremely rare, abort
    }
    positions.push({
      san: spineMoves[i],
      fen: c.fen(),
      ply: i,
      movedBy: i % 2 === 0 ? 'white' : 'black',
      from: mv.from,
      to: mv.to,
    });
  }
  // (Heuristic threat/look-ahead arrows removed 2026-07-31 — walkthrough
  // segments now use the opening tab's grammar: orange played-move trail +
  // green mention arrows + yellow named squares. See the node build below.)

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
      // MATERIAL LEDGER (David 2026-08-13, the Benko color-swap incident):
      // the model inverted who was up material because nothing computed told
      // it. The balance per ply is code-computed; the prompt directive below
      // makes it the ONLY permissible material claim.
      const bal = materialBalance(p.fen);
      const matNote = bal === null || bal === 0
        ? 'material even'
        : bal > 0 ? `WHITE is up ${bal} point${bal === 1 ? '' : 's'} of material`
          : `BLACK is up ${-bal} point${bal === -1 ? '' : 's'} of material`;
      return `${idx + 1}. ${dotted}${p.san}  (after this move FEN: ${p.fen}; ${matNote})`;
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
  const systemPrompt = `You are a warm, world-class chess coach — think Daniel Naroditsky sitting right next to the student, teaching this opening. Narrate ${lessonFraming} Output ONLY a JSON object matching the schema. The move sequence and positions are PROVIDED — do NOT invent or alter them. Your only job is to write the coach commentary plus optional visualization arrows.

HOUSE VOICE (David 2026-07-05 — the ENTIRE repertoire should feel like Naroditsky is teaching it, not a database dumping annotations):
- Teach the IDEA, not just the move. A student should finish each beat understanding WHY, not just WHAT. "Nc3 does two jobs — it braces e4 so Black can never strike there for free, and it keeps the king-knight home, so White still gets to choose which attacking setup to build" beats "Nc3 develops and defends e4."
- Concept-first and conversational. It's fine to sound like a person talking: "Here's the thing about this line…", "notice that…", "the point is…". Warmth is welcome; hollow hype is not.
- Every opening turns on ONE central idea or question — find it and teach toward it, so the beats build an argument instead of listing facts. (See the through-line field below.)
- Reach for the clarifying detail — the square that matters, the piece that's secretly the star, the plan three moves away — the way a great coach does out loud.

WHY DISCIPLINE (David 2026-07-19 — "be careful not to overstate the why, I don't want non-applicable reasons stated"):
- State only reasons that are TRUE of THIS EXACT position. ONE true, concrete reason beats three plausible-sounding ones. Multiple reasons are welcome ONLY when each is genuinely true here — never pad a move with a second or third justification just to sound thorough or fill space.
- A normal developing move is allowed to be just that. If a move is routine, say so plainly ("Castles kingside — all very natural") rather than inventing a deep hidden purpose. A tag that says "this needs no theory" is itself useful information; a fabricated deep reason is not.
- Anchor the reason to something on the board: a specific square, pawn, piece, or line. If you can't name what the reason points AT, don't state it.
- MATERIAL ACCOUNTING IS COMPUTED, NOT YOURS TO JUDGE: every move below carries a computed material note ("material even" / "BLACK is up 1 point"). Any statement about who is up or down material, an extra pawn, or material being level MUST match that note for the move being narrated — including hypotheticals ("once White takes X" must describe the accounting that capture actually produces). Never claim a piece "stays home" or "is kept back" on the very move where that piece develops.

STRUCTURAL BEATS (the tape's keystone shape — use on the defining/keystone moves, not routine ones):
- Shape a keystone's WHY as: the TRIGGER that makes the plan apply (a structure, a pawn event like "once the center locks", or a piece placement) → the concrete PLAN as a square-by-square route ("the knight travels f3→d2→c4", not "the knight improves") → the ONE weakness it TARGETS, stated with "because" ("a monster on c4 because d6 can never challenge it"). Optionally add the rule then its exception ("you almost always meet …c6 with a4 — but here b4 is fine because…").

NAME IT EARLY:
- Name the opening in prose within the first couple of moves, the way a coach says "that's the Modern" out loud — not only in the intro. At a fork, NAME the specific variation each branch is ("the Austrian Attack", "the Classical") so the student learns the map, not just the moves.

VOICE RULES (locked 2026-05-19, still in force):
- Confident + declarative. Name what's happening. No "you might consider", no "this could be", no marketing voice.
- Specific chess detail. Name squares, piece routes, named patterns. "the c3-knight reroutes via d2 to f1-g3" not "the knight goes to a good square".
- Tactical verbs that match the action — threatens / pressures / kicks / blunts / outposts / hammers / undermines.
- Cite by SAN inside prose. "After Bxc3 bxc3 Black has doubled c-pawns" not "the bishop trade gives doubled pawns".
- NO move-number prefixes. Write "Nc3" or "the queen's knight to c3" — never "5.Nc3" or "5...Nc3". The voice reads "5." as "five" (robotic) and the count drifts across forks. Refer to moves by bare SAN or piece+square only.
- BANNED (empty hype only — warmth is fine): "powerful", "devastating", "the secret of", "key to success", "essential to remember", "we will see", "let me show you".

For each move in the line, return:
- text: the coach's spoken teaching for this move. ${pace === 'tour'
    ? 'TOUR MODE: keep every beat TIGHT — ONE sentence, max 14 words. The student wants a quick playthrough, not a lecture.'
    : 'SPEND WORDS WHERE THEY MATTER — there is NO length cap on full narration (the user\'s verbosity setting handles brevity; you handle teaching). A routine developing move gets one tight sentence. A KEYSTONE move — the opening\'s defining decision, the tabiya, the pawn break, the move that gives the line its character — gets taught like a MASTERCLASS BEAT: what the move does, the plan it serves, what happens if the idea is ignored, and how the coming moves carry the plan forward. Take the space the teaching needs; a student should finish a keystone beat able to explain the idea to someone else.'} Conversational; mention the SAN or its spoken form. Examples:
  - routine: "Nf3 develops toward the center and eyes e5."
  - keystone (full): "Now the point of the whole line — c3, quietly building a big pawn duo with a later d4. It's not flashy, but it's the move that turns this into a space game: White wants to roll the center forward and leave Black cramped."
  - keystone (full): "…c5 is the move that defines the Sicilian — Black refuses the symmetrical fight and takes the game onto the queenside, where the half-open c-file becomes the source of all his counterplay."
- shortText: ONE sentence (max 18 words) — Brief mode variant of text. Strip the prose, keep the KEY chess idea (the threat / pattern / verdict). Mention the SAN. Same conventions as text but tighter. Examples:
  - "e4 grabs the center and opens lines for the queen and bishop."
  - "c5 — the Sicilian, asymmetric counterplay on the queenside."
  - "Nc3 defends e4 and prepares Bc4."
Do NOT emit arrows or square-coordinates as data — the board's lead-the-eye arrows are drawn by code. Just write the prose; if a square matters, NAME it in the sentence ("the bishop eyes f7") and the arrow will already be there.

The student is playing as ${studentSide}. Frame ideas from that perspective when relevant.

Also produce:
- intro: the HOOK — one or two sentences (up to ~40 words) that pose the ONE question or idea this opening turns on, the way a great coach opens a lesson. Not "sharp/positional" boilerplate — the actual central idea: what is this opening ABOUT, what is each side really fighting over, what's the one thing to understand. Good hooks: "The whole Italian grows from one question — which piece points at f7, the square only Black's king defends?" / "This is a space play: White stakes the center and dares Black to break it before it suffocates him." Name the plan or square that matters. CRITICAL: do NOT recite the move list (the board animates it). Do NOT say "after 1.e4 e5 2.Nf3..." or any variant — the student already sees the moves; tell them what the opening IS, not what the moves ARE.
- shortIntro: ONE sentence (max 18 words) — Brief mode variant of intro. Same content rules but tighter.
- outro: ONE sentence (max 15 words). Action-oriented — what to do next.
${branches.length > 0 ? `- branchIdeas: ONE sentence (max 20 words) for EACH branch the student might dive into next. Mention the named line and its strategic flavor (sharp / positional / pawn-storm / quiet etc).
- shortBranchIdeas: ONE sentence (max 15 words) per branch — Brief mode variants of branchIdeas, same order.
- branchExtensionIdeas: a 2D array. For EACH branch (in the same order as branches[]), emit an array of EXACTLY ONE idea object per extension move provided. Each idea object MUST include both text AND shortText (Brief mode variant). If a branch has 6 extension moves you MUST emit 6 idea objects in its inner array — no fewer. This is the most-undersized field in past gens and the student ends up reading template prose instead of your prose; do not skimp.
  - text rules: same as the spine ideas (max ${pace === 'tour' ? 12 : 25} words, mention the SAN, do NOT forecast future moves). No arrows/coordinates as data — the board's arrows are drawn by code; just write prose.
  Example: for "English Attack" with extension "Ng4 Bg5 Qa5+", emit 3 idea objects narrating those three plies.` : ''}

${(() => {
  // TEACHING grounding (David 2026-07-12): Tier-3 narration grounds on the
  // Danya teaching corpus — his explanation of the positions, the ideas, the
  // plans — instead of the pre-1930 book passages ("unwire the books"). The
  // spine SANs key position-specific notes; the name keys opening-level ones.
  const block = buildDanyaTeachingBlock({
    historySans: positions.map((p) => p.san),
    openingName: entry.canonicalName,
    maxNotes: 6,
  });
  if (block) {
    void logAppAudit({
      kind: 'book-grounding-injected',
      category: 'subsystem',
      source: 'openingGenerator.danyaTeaching',
      summary: `narration grounded with teaching notes for "${entry.canonicalName}" (${block.length} chars)`,
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

Emit a JSON object with intro (string), shortIntro (string), outro (string), ideas (array of ${positions.length} objects { text, shortText }, one per spine move in order)${branches.length > 0 ? `, branchIdeas (array of ${branches.length} strings), shortBranchIdeas (array of ${branches.length} strings), and branchExtensionIdeas (2D array of { text, shortText } objects)` : ''}.`;

  // ── Tier 2 (David 2026-07-30, locked): a BAKED video narration for this
  // exact line replaces the runtime LLM spine narration. The bake script
  // already handed the teacher's transcript to the model offline, reworded
  // it into the house voice and gated every line — so a hit is final prose:
  // no note splice, no reword pass, deterministic every session. The LLM is
  // still called ONLY when fork branches need their teasers narrated.
  const bakedRaw = faceContext
    ? null
    : bakedNarrationFor(entry.canonicalName, positions.map((p) => p.san));
  if (bakedRaw) {
    void logAppAudit({
      kind: 'book-grounding-injected',
      category: 'subsystem',
      source: 'openingGenerator.bakedVideoNarration',
      summary: `baked video narration hit for "${entry.canonicalName}" (${positions.length}/${bakedRaw.spine.length} plies, sources: ${bakedRaw.sourceVideos.join(',')})`,
    });
  }
  // Orient the bake to THIS tree's studentSide: when the bake's primary
  // register addresses the other color (side inference changed, or the bake
  // predates it) and a flipped register exists, the registers swap — the
  // spoken "we" always matches the side the student is learning. The other
  // register rides along for the live board-flip (David 2026-07-31).
  const baked = (() => {
    if (!bakedRaw) return null;
    const mismatched =
      bakedRaw.studentSide !== undefined && bakedRaw.studentSide !== studentSide;
    if (!mismatched || !bakedRaw.ideasFlipped) return bakedRaw;
    return {
      ...bakedRaw,
      intro: bakedRaw.introFlipped ?? bakedRaw.intro,
      shortIntro: bakedRaw.shortIntroFlipped ?? bakedRaw.shortIntro,
      outro: bakedRaw.outroFlipped ?? bakedRaw.outro,
      ideas: bakedRaw.ideasFlipped,
      introFlipped: bakedRaw.intro,
      shortIntroFlipped: bakedRaw.shortIntro,
      outroFlipped: bakedRaw.outro,
      ideasFlipped: bakedRaw.ideas,
      studentSide,
    };
  })();

  let narration: NarrationOutput;
  let narrationFellBack = false;
  // Full-tree bake coverage: every fork branch has a baked narration deep
  // enough for its extension line → zero runtime LLM even WITH branches
  // (David 2026-07-31: "Tier 2 openings fully in effect?").
  const bakedBranchesCoverAll =
    baked !== null &&
    branches.every((b) => {
      const bn = baked.branchNarrations?.[b.san];
      return bn !== undefined && bn.ideas.length >= b.extensionMoves.length;
    });
  if (baked && (branches.length === 0 || bakedBranchesCoverAll)) {
    // Full coverage — zero runtime LLM.
    narration = {
      intro: baked.intro,
      ...(baked.shortIntro ? { shortIntro: baked.shortIntro } : {}),
      outro: baked.outro,
      ideas: baked.ideas.slice(0, positions.length),
      ...(bakedBranchesCoverAll && branches.length > 0
        ? {
            branchIdeas: branches.map((b) => baked.branchNarrations?.[b.san]?.teaser ?? ''),
            shortBranchIdeas: branches.map((b) => baked.branchNarrations?.[b.san]?.shortTeaser ?? ''),
            branchExtensionIdeas: branches.map((b) => baked.branchNarrations?.[b.san]?.ideas ?? []),
          }
        : {}),
    };
  } else {
  // Up to 2 attempts before the template fallback. A single transient
  // failure (truncated/malformed tool JSON — the 2026-07-31 Alapin session:
  // "JSON Parse error: Expected ']'") used to drop the WHOLE lesson to
  // template ideas ("e4 — staking a claim…", "c5 — gaining space…" — the
  // repetitive garbage David heard). One retry almost always recovers.
  const callNarration = async (maxTokens: number): Promise<NarrationOutput> => {
    const result = await getCoachStructuredResponse(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
      'chat_response',
      maxTokens,
      'emit_walkthrough_narration',
      'Emit short coach narrations (one sentence per provided move) plus an intro and outro for the line.',
      NARRATION_SCHEMA,
    );
    return result as NarrationOutput;
  };
  // How many plies this output actually narrates. A truncated tool payload is
  // now SALVAGED rather than thrown away (coachApi.callDeepseekWithTool), so a
  // short `ideas` array means "the model ran out of room", not "it failed" —
  // every unnarrated ply silently falls back to the generic template sentence.
  const covered = (n: NarrationOutput | null): number =>
    Array.isArray(n?.ideas) ? n.ideas.filter((e) => typeof e === 'object' ? !!e?.text?.trim() : !!e).length : 0;
  // The spine is only the FIRST field the model emits. branchIdeas and
  // branchExtensionIdeas come after it in the schema, so a payload cut off at
  // max_tokens loses the TAIL first — the salvage keeps the complete prefix
  // and drops everything past it. Counting spine plies alone therefore scores
  // a truncated payload as fully covered and the retry never fires, which is
  // how the fork branches ended up on template prose while the spine read
  // fine. Missing tail FIELDS mean the JSON was cut short; an inner extension
  // array that is present but thin is the model skimping, which a retry does
  // not fix (the per-move template fallback covers it), so only absence counts.
  const tailCovered = (n: NarrationOutput | null): boolean => narrationTailCovered(n, branches.length);
  // Full narration is UNCAPPED (David 2026-07-30: the only caps are the user's
  // verbosity settings; 2026-08-02: "remove the ceiling"). 8K was never the
  // model's limit — it was ours: api.deepseek.com accepts max_tokens up to
  // 131072 on deepseek-v4-flash (probed 2026-08-02), and the model burns part
  // of whatever budget it gets on hidden reasoning_content before writing a
  // token of output, so a deep line with a big grounding block ran out of room
  // and shipped template prose (the Alapin lesson, "repetitive and sounded
  // nothing like Naroditsky", 2026-07-31). A ceiling costs nothing when the
  // output is short — generation stops when the model is done, not when the
  // budget is spent — so there is no reason to sit below what the API allows.
  const FIRST_BUDGET = 65536;
  const RETRY_BUDGET = 131072;
  try {
    let attempt: NarrationOutput | null = null;
    try {
      attempt = await callNarration(FIRST_BUDGET);
    } catch (firstErr) {
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'openingGenerator.generateOpeningFromDbNarration',
        summary: `narration attempt 1 failed for "${name}" — retrying once: ${firstErr instanceof Error ? firstErr.message : String(firstErr)}`,
      });
    }
    // Retry when the call failed outright OR narrated less than the whole
    // line. Keep the better of the two — a wider retry that comes back worse
    // (a transient stumble) must never cost us the first attempt's prose.
    if (covered(attempt) < positions.length || !tailCovered(attempt)) {
      const shortfall = tailCovered(attempt)
        ? `${covered(attempt)}/${positions.length} plies`
        : `${covered(attempt)}/${positions.length} plies and a truncated branch tail`;
      try {
        const wider = await callNarration(RETRY_BUDGET);
        void logAppAudit({
          kind: 'llm-error',
          category: 'subsystem',
          source: 'openingGenerator.generateOpeningFromDbNarration',
          summary:
            `narration covered only ${shortfall} for "${name}" at ${FIRST_BUDGET} tokens — ` +
            `retried at ${RETRY_BUDGET}, got ${covered(wider)}/${positions.length}` +
            (tailCovered(wider) ? ' with the branch tail intact' : ' and still no branch tail'),
        });
        // Prefer the retry when it narrates more of the spine, and also when it
        // merely rescues the branch tail the first attempt lost — equal spine
        // coverage plus real fork prose is strictly the better lesson.
        // ...but never trade spine prose away for it: a retry that narrates
        // FEWER plies is a transient stumble, tail or no tail.
        const rescuesTail = tailCovered(wider) && !tailCovered(attempt) && covered(wider) >= covered(attempt);
        if (covered(wider) > covered(attempt) || rescuesTail) attempt = wider;
      } catch (retryErr) {
        void logAppAudit({
          kind: 'llm-error',
          category: 'subsystem',
          source: 'openingGenerator.generateOpeningFromDbNarration',
          summary: `wider narration retry failed for "${name}" (kept ${shortfall}): ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
        });
      }
    }
    if (covered(attempt) === 0) throw new Error('narration returned no usable ideas');
    narration = attempt as NarrationOutput;
  } catch (err) {
    void logAppAudit({
      kind: 'llm-error',
      category: 'subsystem',
      source: 'openingGenerator.generateOpeningFromDbNarration',
      summary: `narration LLM call failed for "${name}" — falling back to template ideas: ${err instanceof Error ? err.message : String(err)}`,
    });
    // Template fallback: each move gets a generic sentence with
    // its SAN. Same as buildFallbackTreeFromDb logic.
    narrationFellBack = true;
    narration = {
      intro: `${entry.canonicalName} — book moves from the Lichess opening database. Quick walkthrough of the canonical line.`,
      outro: `That's the canonical book line for the ${entry.canonicalName}. Drill the moves to lock them in, or ask for a deeper variation.`,
      // Silent, not canned. If this fed templates back in, the tier chain
      // above could not tell them from real prose and would append them after
      // the authored text — filler in the one slot that is supposed to teach.
      ideas: positions.map(() => ({ text: '' })),
    };
  }
  if (baked) {
    // Overlay the baked spine narration over whatever the call produced
    // (or the fallback) — the spine speaks the baked video teaching, and
    // any branch WITH a baked narration speaks it too (LLM prose only for
    // uncovered branches). A baked spine also un-fails the fallback: the
    // tree's MAIN narration is real, so it may cache.
    const branchIdeas = branches.map(
      (b, i) => baked.branchNarrations?.[b.san]?.teaser ?? narration.branchIdeas?.[i] ?? '',
    );
    const shortBranchIdeas = branches.map(
      (b, i) => baked.branchNarrations?.[b.san]?.shortTeaser ?? narration.shortBranchIdeas?.[i] ?? '',
    );
    const branchExtensionIdeas = branches.map(
      (b, i) => baked.branchNarrations?.[b.san]?.ideas ?? narration.branchExtensionIdeas?.[i] ?? [],
    );
    narration = {
      ...narration,
      intro: baked.intro,
      ...(baked.shortIntro ? { shortIntro: baked.shortIntro } : {}),
      outro: baked.outro,
      ideas: baked.ideas.slice(0, positions.length),
      ...(branches.length > 0 ? { branchIdeas, shortBranchIdeas, branchExtensionIdeas } : {}),
    };
    narrationFellBack = false;
  }
  }

  // 3. Build the tree from the bottom up using the LLM's ideas.
  //    Branches (if any) become the children of the spine's LAST
  //    node, so when the user reaches the end of the canonical line
  //    they see fork tiles for each named extension. Tapping a tile
  //    fires the deep-dive flow that resolves the canonical name and
  //    starts a fresh focused walkthrough.
  type ChildWrap = { node: WalkthroughTreeNode; label?: string; forkSubtitle?: string };
  // Branches sit at the spine terminus; replay each branch line from
  // there so its lead-the-eye arrows are code-computed too.
  const terminusFen = positions[positions.length - 1].fen;
  const spineSans = positions.map((q) => q.san);
  const branchChildren: ChildWrap[] = branches.map((b, idx) => {
    // Notes ground this branch's arrows the same way they ground the spine's
    // (G0). Scoped per branch: a branch is a path the student takes INSTEAD of
    // the others, so one note may legitimately teach on two of them.
    const branchNoteIds = new Set<string>();
    // Resolved in FORWARD ply order and cached, because the tree below is
    // assembled bottom-up: walking the once-per-note dedupe in reverse would
    // hand a note to the deepest ply it touches instead of the first.
    // [0] = the branch move itself, [1 + j] = extension move j.
    const branchNoteSources: Array<string | null> = [];
    // CODE-COMPUTED arrows for [b.san, ...extensionMoves], replayed
    // from the spine terminus. branchSeq[0] = b.san's replayed move;
    // branchSeq[1 + j] = extensionMoves[j]'s.
    const branchSeq: LineMove[] = [];
    const bc = new Chess(terminusFen);
    for (const san of [b.san, ...b.extensionMoves]) {
      try {
        const m = bc.move(stripSanAnnotations(san));
        branchSeq.push({ from: m.from, to: m.to, color: m.color, fen: bc.fen() });
      } catch {
        break; // shouldn't happen (DB-validated), but never throw mid-build
      }
    }
    const branchSans = [b.san, ...b.extensionMoves];
    for (let k = 0; k < branchSeq.length; k += 1) {
      branchNoteSources.push(
        noteArrowSourceAt(
          [...spineSans, ...branchSans.slice(0, k + 1)],
          branchSeq[k].fen,
          branchNoteIds,
          entry.canonicalName,
        ),
      );
    }
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
      const extGenerated =
        (typeof ideaEntry === 'object' && ideaEntry?.text?.trim()) || '';
      // Same note-leads rule as the spine. The branch's arrows were ALREADY
      // grounded on this note (`branchNoteSources` below); until now the prose
      // never said what they pointed at, so a green arrow could land on a
      // square the narration never named — the lead-the-eye defect.
      const extNote = baked ? null : branchNoteSources[j + 1] ?? null;
      const text = extNote
        ? (extGenerated ? `${extNote} ${extGenerated}` : extNote)
        : extGenerated;
      const shortText =
        typeof ideaEntry === 'object' && ideaEntry?.shortText?.trim()
          ? ideaEntry.shortText.trim()
          : undefined;
      const node: WalkthroughTreeNode = {
        san: extSan,
        movedBy: extMovedBy,
        idea: text,
        children: extChildren,
      };
      if (shortText) node.shortIdea = shortText;
      // Opening-tab grammar (see the spine build below): orange trail on
      // the played move + green mention arrows. branchSeq[1 + j] is the
      // j-th extension move's replayed from/to/fen.
      const extMove = branchSeq[j + 1];
      if (extMove) {
        const segment: NarrationSegmentType = {
          text,
          arrows: groundedSegmentArrows(branchNoteSources[j + 1] ?? null, text, extMove).arrows,
        };
        if (shortText) segment.shortText = shortText;
        node.narration = [segment];
      }
      extChildren = [{ node }];
    }
    const shortTeaser = narration.shortBranchIdeas?.[idx]?.trim();
    // The note leads what is SPOKEN on the branch move. `teaser` itself stays
    // untouched — it doubles as the fork tile's `forkSubtitle`, which must
    // remain a short label, not a paragraph.
    const branchNote = baked ? null : branchNoteSources[0] ?? null;
    const branchSpoken = branchNote ? `${branchNote} ${teaser}` : teaser;
    const branchNode: WalkthroughTreeNode = {
      san: b.san,
      movedBy: branchMovedBy,
      idea: branchSpoken,
      children: extChildren,
    };
    if (shortTeaser) branchNode.shortIdea = shortTeaser;
    const branchMove = branchSeq[0];
    if (branchMove) {
      const segment: NarrationSegmentType = {
        text: branchSpoken,
        arrows: groundedSegmentArrows(branchNoteSources[0] ?? null, teaser, branchMove).arrows,
      };
      if (shortTeaser) segment.shortText = shortTeaser;
      branchNode.narration = [segment];
    }
    return {
      label: b.label,
      forkSubtitle: teaser,
      node: branchNode,
    };
  });
  let nextChildren: ChildWrap[] = branchChildren;
  // DETERMINISTIC teaching splice (David 2026-07-30: the corpus must reach the
  // "teach me X" walkthrough as PACKAGE, not as advisory prompt context the
  // model may ignore). CODE walks each spine ply, looks up the corpus note
  // taught EXACTLY at that position (move-prefix or transposition-safe FEN —
  // never the fuzzy tiers, so a note can't land on the wrong ply), grades its
  // prose against that ply's board, and appends it to the spoken idea. The
  // LLM's generated prose stays; the teaching rides regardless of what the
  // model did with the advisory block. Once per note id, so an opening-level
  // note can't spam every ply.
  const splicedNoteIds = new Set<string>();
  // One introduction per variation per lesson — see `authoredNoteAt`.
  const authoredNamesUsed = new Set<string>();
  // Which plies the AUTHORED tier spoke on, and in what words — kept apart
  // from `plyNoteText` because that array also holds corpus-note text, so
  // reading authored coverage off it would over-report every corpus hit as a
  // hand-written one.
  const authoredSpoke: Array<{ ply: number; variation: string; text: string }> = [];
  // Selected for the right ply and then refused by the board-truth gate. Kept
  // apart from silence: they are different failures with different fixes.
  const authoredRefused: Array<{ ply: number; variation: string; text: string }> = [];
  // The repertoire entry that actually HOLDS the authored prose. The generator's
  // own `entry` is a DB record with no variations — passing it was how the first
  // cut of this tier shipped dead. Resolved once per lesson, not per ply.
  // The SPINE is passed, and it is what actually decides. Name matching is a
  // translation layer between two independent human conventions and it leaked
  // twice in one day — first on British spelling, then on the repertoire's
  // family shorthand ("Sicilian: Najdorf") and its own sub-opening entries
  // ("Evans Gambit", filed under "Italian Game" in the database). Names resolved
  // 31 of 43 openings; the moves resolve all 43, because a line that walks this
  // entry IS this entry regardless of what either source calls it.
  const authoredEntry = authoredEntryFor(
    entry.canonicalName,
    authoredRepertoire as unknown as Parameters<typeof authoredEntryFor>[1],
    positions.map((p) => p.san).filter((san): san is string => typeof san === 'string'),
  );
  // The GROUNDED arrow source per spine ply — the note's graded teaching text,
  // captured BEFORE the house-voice reword so the arrows can never drift with
  // the model's phrasing (G0, see `noteArrowSourceAt`). null = ungrounded ply.
  const plyNoteText: Array<string | null> = positions.map(() => null);
  // PASS 1 — assemble each ply's raw material.
  //
  // THE NOTE LEADS (David 2026-08-04: "corpus notes are primary for teach me x
  // opening"). The corpus note is the TEACHING; the generated prose is what
  // fills in around it. Until now the order was the other way round — the
  // model's idea led and the note was appended — which read as an afterthought
  // and left the spoken beat opening on prose the arrows were not grounded in
  // (the arrows already come from the note, see `noteArrowSourceAt`). Leading
  // with the note puts voice and board on the same source, which is the G0
  // posture: the note is the fact, the model only phrases it.
  //
  // Nothing real is discarded — the generated idea still follows the note, and
  // PASS 2's house-voice reword fuses them into one voice. What used to sit
  // here was a SAN-shaped template ("Nc3 — developing toward the center and
  // eyeing key squares") standing in whenever nothing real existed. It named
  // nothing about the position in front of the student, so it is gone: those
  // plies are silent now, which the narration rules explicitly allow.
  const rawPlyTexts: string[] = positions.map((p, i) => {
    const ideaEntry = narration.ideas[i];
    const generated =
      (typeof ideaEntry === 'object' && ideaEntry?.text?.trim()) ||
      // Tolerate legacy string-shaped entries (older cached gens
      // pre-arrows extension might still produce them).
      (typeof ideaEntry === 'string' ? (ideaEntry as string).trim() : '') ||
      '';
    // NO CANNED LINE WHEN NOTHING REAL IS AVAILABLE (David 2026-08-12: "adds
    // no value. It can be removed"). This used to emit a template chosen by SAN
    // shape — "Nc3 — developing toward the center and eyeing key squares" —
    // which names nothing about THIS position and is filler by the project's
    // own rule: a spoken sentence must name a square, a piece, or a concept the
    // student can look at. Silence is explicitly allowed; an empty idea is no
    // narration, and the board is the lesson on those plies.
    const fallback = generated;
    try {
      // Baked video narration IS the teaching for this ply — splicing a
      // corpus note on top would double-teach the same source material.
      if (baked) return fallback;
      const prefix = positions.slice(0, i + 1).map((q) => q.san);
      const teaching = noteArrowSourceAt(prefix, p.fen, splicedNoteIds, entry.canonicalName);
      if (teaching) {
        plyNoteText[i] = teaching;
        return generated ? `${teaching} ${generated}` : teaching;
      }
      // TIER 3 — THE HAND-WRITTEN PROSE, BEFORE ANYTHING COMPUTED.
      //
      // David 2026-08-12: "I still want the computer narrations to fire after
      // the handwritten narrations." All 318 variations in repertoire.json
      // carry an authored `explanation` and none of it reached the voice —
      // the splice went straight from corpus note to model output, so on every
      // ply the corpus could not reach (about six in seven) the model wrote
      // from scratch over the top of text that was already written.
      //
      // Graded like every other tier. Being hand-written earns it no exemption:
      // it speaks only at the ply its own variation begins (see
      // `authoredNoteAt`), and only if it is true of that board.
      const authored = authoredEntry ? authoredNoteAt(authoredEntry, prefix, authoredNamesUsed) : null;
      if (authored) {
        const graded = gradeNarrationText(authored.text, p.fen, 'openingGenerator.authoredNote');
        if (graded?.trim()) {
          plyNoteText[i] = graded;
          authoredSpoke.push({ ply: i, variation: authored.variationName, text: graded });
          return generated ? `${graded} ${generated}` : graded;
        }
        // SELECTED, THEN REFUSED BY THE GATE. A different outcome from never
        // being selected, and the two were reported as one — which sent three
        // prod runs chasing a selection bug that offline could not reproduce,
        // because offline the selection was fine and the grading was the step
        // that dropped it.
        authoredRefused.push({ ply: i, variation: authored.variationName, text: authored.text.slice(0, 160) });
      }
      return fallback;
    } catch {
      /* the corpus is a bonus, never a blocker */
      return fallback;
    }
  });

  // A TIER NOBODY CAN SEE FIRE IS A TIER NOBODY CAN TELL IS DEAD. This one
  // already shipped dead once — wired to an object with no `variations`, with
  // green unit tests over it the whole time — and a prod audit could not tell
  // the difference either, because PASS 2 rewords the authored sentence into
  // the house voice and no literal phrase survives to match on. So say it out
  // loud: which variation spoke, at which ply, in its pre-reword words.
  if (authoredSpoke.length > 0) {
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'openingGenerator.authoredTier',
      summary: `authored prose spoke on ${authoredSpoke.length} ply(s) of "${entry.canonicalName}": ${authoredSpoke.map((a) => a.variation).join(' | ')}`,
      details: JSON.stringify({
        plies: authoredSpoke.map((a) => a.ply),
        variations: authoredSpoke.map((a) => a.variation),
        firstText: authoredSpoke[0].text.slice(0, 240),
      }),
    });
  } else if (!baked) {
    // SAY WHY IT DIDN'T SPEAK. Three prod runs went silent on the French and
    // each time the cause had to be guessed at from the outside — a stale
    // cache, then a name that would not resolve, then a bake that turned out
    // not to exist — while offline the same data fired correctly every time.
    // Three guesses is two too many. The failure has exactly three possible
    // causes and the generator knows which one it hit, so it reports it.
    const why = !authoredEntry
      ? `resolved to NO repertoire entry`
      : authoredRefused.length > 0
        ? `selected ${authoredRefused.length} variation(s) and the board-truth gate refused every one`
        : `resolved to "${authoredEntry.name ?? '(unnamed)'}" but no variation began on this spine`;
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'openingGenerator.authoredTier.silent',
      summary: `authored tier silent: "${entry.canonicalName}" — ${why}`,
      details: JSON.stringify({
        canonicalName: entry.canonicalName,
        resolved: authoredEntry?.name ?? null,
        variationsAvailable: (authoredEntry?.variations ?? []).length,
        refused: authoredRefused,
        spine: positions.slice(0, 12).map((p) => p.san),
      }),
    });
  }

  // PASS 2 — HOUSE-VOICE REWORD (David 2026-07-30: "hand the entire narration
  // to the llm and have it reword it in our coaches voice"). Template ideas
  // stitched to raw note prose read as two voices and neither is the coach.
  // The model REWORDS supplied content only — it adds nothing, decides
  // nothing (G0) — and every line is re-graded against its own ply's board;
  // any failure falls back to that line's pre-reword text. Best-effort: on
  // call failure the raw script ships as before.
  let finalPlyTexts = rawPlyTexts;
  try {
    // A baked script is ALREADY reworded + gated offline — rewording it
    // again could only drift it away from its verified form.
    if (!baked) {
      // The arrows are decided HERE, in code, from the note — then handed to
      // the model as a requirement it must voice (David 2026-08-01: "we need to
      // hand the arrows in the package to the llm... but we dont let the LLM
      // decide"). Computing them before the reword is what makes that possible.
      const arrowSans = positions.map((p, i) =>
        groundedSegmentArrows(plyNoteText[i], rawPlyTexts[i], p).spans.map((sp) => sp.san),
      );
      finalPlyTexts = await rewordNarrationInHouseVoice(positions, rawPlyTexts, arrowSans);
    }
  } catch (err) {
    void logAppAudit({
      kind: 'llm-error',
      category: 'subsystem',
      source: 'openingGenerator.houseVoiceReword',
      summary: `reword pass failed — shipping raw script: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  for (let i = positions.length - 1; i >= 0; i -= 1) {
    const p = positions[i];
    const ideaEntry = narration.ideas[i];
    const text = finalPlyTexts[i] ?? rawPlyTexts[i];
    const shortText =
      typeof ideaEntry === 'object' && ideaEntry?.shortText?.trim()
        ? ideaEntry.shortText.trim()
        : undefined;
    const node: WalkthroughTreeNode = {
      san: p.san,
      movedBy: p.movedBy,
      idea: text,
      children: nextChildren,
    };
    if (shortText) node.shortIdea = shortText;
    // Opposite-perspective register from the bake (board-flip pronouns).
    const flippedIdea = baked?.ideasFlipped?.[i];
    if (flippedIdea?.text?.trim()) {
      node.ideaFlipped = flippedIdea.text.trim();
      if (flippedIdea.shortText?.trim()) node.shortIdeaFlipped = flippedIdea.shortText.trim();
    }
    // THE OPENING-TAB ARROW GRAMMAR (David 2026-07-31, third request —
    // "the arrows on the coach tab need to MATCH the opening tab"):
    // ORANGE trail on the played move (LessonPlayer's TRAIL), GREEN vision
    // arrows ONLY for moves the narration actually NAMES (deriveNarrationArrows
    // — the same helper the opening tab uses), YELLOW highlights on squares
    // the narration points at. The old threat/look-ahead heuristics
    // (computeLeadEyeArrows) are GONE from walkthrough segments — they drew
    // arrows at squares the voice never talked about, which is exactly the
    // "wrong arrows" David kept reporting.
    //
    // G0 (David 2026-08-01): the arrows come from the NOTE, not the model's
    // prose. Scraping the finished narration handed the model the board — what
    // it chose to mention became what the student's eye was led to. The note is
    // what the narration is grounded in, so `plyNoteText[i]` (graded against
    // this ply's board, captured before the reword) is the arrow source
    // whenever the ply is grounded. An UNGROUNDED ply has no note to read, so
    // it falls back to the prose exactly as before — deterministic either way.
    // A BAKED ply carries no plyNoteText and correctly falls back to its prose:
    // that prose IS the teaching, reworded and board-gated OFFLINE where a bad
    // line could be rejected. Deriving from it is still deriving from grounded
    // content — it is not the runtime model choosing what to point at.
    const grounded = groundedSegmentArrows(plyNoteText[i], text, p);
    const segmentArrows: NarrationSegmentType['arrows'] = grounded.arrows;
    // Highlights read the SAME source as the arrows — a yellow square the
    // narration points at is the same class of claim as a green arrow, so
    // letting it come from the prose while the arrows come from the note
    // would put the model back in charge of half the board.
    const arrowSource = grounded.source === 'note' ? (plyNoteText[i] as string) : text;
    const namedSquares = extractMentionedSquares(arrowSource)
      .filter((sq) => sq !== p.to && sq !== p.from)
      .slice(0, MAX_CANDIDATE_HIGHLIGHTS);
    const segment: NarrationSegmentType = { text, arrows: segmentArrows };
    if (namedSquares.length > 0) {
      segment.highlights = namedSquares.map((square) => ({ square, color: 'yellow' as const }));
    }
    if (shortText) segment.shortText = shortText;
    if (node.ideaFlipped) segment.textFlipped = node.ideaFlipped;
    if (node.shortIdeaFlipped) segment.shortTextFlipped = node.shortIdeaFlipped;
    // ARROWS ARRIVE AS THEY ARE SPOKEN (David 2026-08-01: "can we have the
    // arrows appear as they are being spoken?").
    //
    // The runtime already does this — the walkthrough loops a node's segments
    // and sets each one's arrows immediately BEFORE speaking it. What was
    // missing is that this builder emitted ONE segment per ply carrying every
    // arrow, so there was nothing to stagger: eight arrows landed at once while
    // the coach was still on the first clause. Splitting the ply into
    // sentences, each holding only the arrows it names, is what turns the
    // existing reveal loop into a lead-the-eye.
    //
    // The split is by the arrow's own character offset in the text, not by
    // re-matching square names: `deriveNarrationArrows` already recorded where
    // each move was mentioned, so a sentence gets exactly the arrows it speaks.
    // Any arrow whose sentence cannot be identified rides the FIRST segment, so
    // an arrow is never dropped for being hard to place.
    node.narration = splitSegmentBySentence(segment, grounded.spans);
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
    ...(narrationFellBack ? { narrationFallback: true } : {}),
    openingName: displayName,
    eco: entry.eco,
    studentSide,
    intro:
      stripMoveRecitationLeadIn(narration.intro?.trim() || '') ||
      `${displayName} — let's walk through the main line.`,
    ...(shortIntro ? { shortIntro } : {}),
    outro: narration.outro?.trim() || `Drill the moves to lock them in.`,
    ...(baked?.introFlipped ? { introFlipped: baked.introFlipped } : {}),
    ...(baked?.shortIntroFlipped ? { shortIntroFlipped: baked.shortIntroFlipped } : {}),
    ...(baked?.outroFlipped ? { outroFlipped: baked.outroFlipped } : {}),
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
  entryOverride?: TeachEntryOverride,
): WalkthroughTree | null {
  const entry = entryOverride ?? resolveCuratedVariation(name) ?? resolveOpeningEntry(name);
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
    const idea = '';
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


/** PASS-2 house-voice reword. Hands the assembled per-move script to the
 *  model with one job: say the SAME content as ONE coach in the house
 *  register (concept-first, warm, rigorous). Hard rules in the prompt: no
 *  new chess content, never restate the move being played, keep every
 *  number/percentage verbatim. Output is validated per line against that
 *  ply's board (gradeNarrationText); a line that fails ships its pre-reword
 *  text instead, so the pass can polish but never corrupt. */
async function rewordNarrationInHouseVoice(
  positions: Array<{ san: string; fen: string; movedBy: 'white' | 'black' }>,
  rawTexts: string[],
  /** The moves CODE has already decided to draw an arrow for at each ply, in
   *  SAN. Handed to the model as a requirement, never as a suggestion — see
   *  the arrow contract below. */
  arrowSans: string[][] = [],
): Promise<string[]> {
  if (rawTexts.length === 0) return rawTexts;
  const script = rawTexts
    .map((t, i) => {
      const arrows = arrowSans[i] ?? [];
      const arrowNote = arrows.length > 0 ? ` [ARROWS ON THE BOARD: ${arrows.join(', ')}]` : '';
      return `${i + 1}. [after ${positions[i].san}]${arrowNote} ${t}`;
    })
    .join('\n');
  const system = `You are rewording a chess walkthrough narration so it sounds like ONE warm, rigorous coach — concept-first, plain language, ideas before names.
HARD RULES:
- Reword ONLY. Add NO chess content: no new squares, pieces, plans, tactics, or evaluations that are not already in the line's text.
- NEVER restate the move being played ("knight to c6 — the knight goes to c6" is banned); the voice announces the move separately. Speak only the idea.
- Keep every number, percentage, and move token that appears, verbatim.
- NO length cap: keep a keystone's full teaching intact, keep a routine move tight. No praise, no filler, no "let's".
- ARROW CONTRACT: when a line is tagged [ARROWS ON THE BOARD: ...], those moves are ALREADY DRAWN on the student's board while your line is spoken. Your reworded line MUST mention every one of them, so the words match what the eye is being led to. You are not choosing them and you may not add others — arrows the student cannot hear explained, and words pointing at squares with no arrow, both read as broken.
Return STRICT JSON: {"lines": [string, ...]} with EXACTLY ${rawTexts.length} entries, in order.`;
  const result = (await getCoachStructuredResponse(
    [{ role: 'user', content: `NARRATION SCRIPT (${rawTexts.length} lines):\n${script}` }],
    system,
    'chat_response',
    Math.min(8192, 600 + rawTexts.length * 140),
    'reword_walkthrough_narration',
    'Reword each narration line into the single house coach voice, same content, one entry per input line.',
    { type: 'object', properties: { lines: { type: 'array', items: { type: 'string' } } }, required: ['lines'] },
  )) as { lines?: unknown };
  const lines = Array.isArray(result?.lines) ? result.lines : [];
  let kept = 0;
  let dropped = 0;
  const out = rawTexts.map((raw, i) => {
    const candidate = typeof lines[i] === 'string' ? lines[i].trim() : '';
    if (!candidate) return raw;
    const graded = gradeNarrationText(candidate, positions[i].fen, 'openingGenerator.houseVoiceReword');
    if (!graded) return raw;
    // ARROW/WORD AGREEMENT, verified rather than trusted (David 2026-08-01:
    // "we need to hand the arrows in the package to the llm. this should be
    // done matching the narration... but we dont let the LLM decide").
    // The arrows are already fixed by code; the model's only job is to voice
    // them. A reword that drops one leaves an arrow nobody explains — which is
    // exactly the mismatch reported from prod — so that line falls back to its
    // pre-reword text, which names the squares by construction.
    const required = arrowSans[i] ?? [];
    if (required.length > 0) {
      const bare = (san: string): string => san.replace(/[+#!?]/g, '');
      const missing = required.filter((san) => !graded.includes(bare(san)));
      if (missing.length > 0) {
        dropped += 1;
        return raw;
      }
    }
    kept += 1;
    return graded;
  });
  void logAppAudit({
    kind: 'coach-surface-migrated',
    category: 'subsystem',
    source: 'openingGenerator.houseVoiceReword',
    summary: `house-voice reword: ${kept}/${rawTexts.length} lines reworded (rest kept raw${dropped > 0 ? `; ${dropped} reverted for dropping their arrow moves` : ''})`,
  });
  return out;
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
      idea: '',
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
      const fromDb = await generateOpeningFromDbNarration(name, pace, undefined, options?.entryOverride);
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
  const fallbackTree = buildFallbackTreeFromDb(name, options?.entryOverride);
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

/** Computed, board-true facts for every ply of the canonical line — G0 for
 *  the concepts lane (145 gate drops in 14 days: the model was READING the
 *  line itself and mis-stating where pieces stand). Each line is derived by
 *  chess.js replay, so a prose claim built from this block cannot be a
 *  board lie. */
export function buildLineFactsBlock(openingName?: string): string {
  const entry = openingName ? resolveOpeningEntry(openingName) : null;
  if (!entry || entry.moves.length === 0) return '';
  try {
    const c = new Chess();
    const facts: string[] = [];
    for (const [i, raw] of entry.moves.slice(0, 24).entries()) {
      const m = c.move(stripSanAnnotations(raw));
      if (!m) break;
      const side = m.color === 'w' ? 'White' : 'Black';
      const bits = [`${side}'s ${PUNISH_PIECE_WORD[m.piece]} goes to ${m.to}`];
      if (m.captured) bits.push(`capturing the ${PUNISH_PIECE_WORD[m.captured]}`);
      if (m.san.includes('+')) bits.push('with check');
      // What the landed piece now EYES — the control vocabulary concepts
      // prose actually needs ("the knight eyes f4 and g5"). Without it the
      // model invents control claims; measured on the first probe (13
      // concepts drops survived landing-facts alone).
      if (m.piece !== 'p' && m.piece !== 'k') {
        try {
          const parts = c.fen().split(' ');
          parts[1] = m.color;
          parts[3] = '-';
          const view = new Chess(parts.join(' '));
          const eyes = [...new Set(view.moves({ square: m.to, verbose: true }).map((x) => x.to))].slice(0, 8);
          if (eyes.length > 0) bits.push(`from ${m.to} it eyes ${eyes.join(', ')}`);
        } catch { /* reachability read optional */ }
      }
      facts.push(`  ${Math.floor(i / 2) + 1}${m.color === 'w' ? '.' : '…'} ${m.san} — ${bits.join('; ')}`);
    }
    if (facts.length === 0) return '';
    return `

LINE FACTS (computed by code — the ONLY piece/square claims you may make):
${facts.join('\n')}

Any claim about WHERE a piece stands, what it captures or attacks, or what square it occupies or eyes must come from the LINE FACTS above. Ideas, plans and principles may draw on the teaching/book context, but never invent a piece-on-square or control claim that is not listed. Do NOT assert who stands better or any evaluation — no engine eval is provided here.`;
  } catch {
    return '';
  }
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
\n` : ''}- Output JSON only. Validation pipeline rejects anything else.${buildStageTeachingBlock(openingName)}${buildBookSourceBlock(openingName)}${buildStagePositionBlock(openingName)}${buildLineFactsBlock(openingName)}`;
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

The move sequences come from the Lichess opening database — DO NOT alter them, do NOT repeat them in the labels. Output ONLY via the tool.${buildStageTeachingBlock(entry.canonicalName)}`;

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

The SANs and the correct answer are GIVEN — DO NOT alter them, do NOT add candidates, do NOT change the order. Just label + explain. Output ONLY via the tool.${buildStageTeachingBlock(entry.canonicalName)}`;

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
  /** Code-computed board facts — the ONLY claims the label prose may make.
   *  See computePunishFacts. */
  computedFacts: string;
}

const PUNISH_PIECE_WORD: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};
const PUNISH_PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

/** G0 for the punish labels (2026-08-06, after the trip-rate ranking put this
 *  lane FIRST — 133 narrationGate drops in 14 days). The prompt used to hand
 *  the model a raw FEN and ask it to work out WHY the move loses — asking an
 *  LLM to read a FEN is asking it to decide board facts, and the gate drops
 *  proved it can't. Every claim the prose needs is computed HERE with
 *  chess.js + detectTactics (ground-truth-audited the same day: 49,725
 *  description claims, zero false) and injected as the only permissible
 *  assertions. The model phrases; it does not read the board. */
export function computePunishFacts(
  postInaccuracyFen: string,
  punishment: string,
  followup: { san: string }[],
  distractors: { san: string }[],
): string {
  const lines: string[] = [];
  try {
    const base = new Chess(postInaccuracyFen);
    const student = base.turn();
    // 1. What is ON the board for the punisher — the detector's audited prose.
    try {
      const t = detectTactics(postInaccuracyFen);
      for (const tac of t.tactics.filter((x) => x.beneficiary === student).slice(0, 3)) {
        lines.push(tac.description);
      }
      for (const h of t.hangingPieces.filter((x) => x.color !== student).slice(0, 2)) {
        lines.push(`the opponent's ${PUNISH_PIECE_WORD[h.piece] ?? 'piece'} on ${h.square} is undefended`);
      }
    } catch { /* detector optional */ }
    // 2. The punishing move's mechanics + the sequence's material arithmetic.
    const seq = new Chess(postInaccuracyFen);
    let studentGain = 0;
    let opponentGain = 0;
    const first = seq.move(punishment);
    if (first) {
      const mech: string[] = [];
      if (first.captured) mech.push(`captures the ${PUNISH_PIECE_WORD[first.captured]} on ${first.to}`);
      if (first.san.includes('#')) mech.push('is checkmate');
      else if (first.san.includes('+')) mech.push('gives check');
      if (mech.length === 0) mech.push('is a quiet move');
      lines.push(`the punishing move ${first.san} ${mech.join(' and ')}`);
      if (first.captured) studentGain += PUNISH_PIECE_VALUE[first.captured] ?? 0;
      let mover: 'student' | 'opponent' = 'opponent';
      for (const f of followup) {
        const m = (() => { try { return seq.move(f.san); } catch { return null; } })();
        if (!m) break;
        if (m.captured) {
          if (mover === 'student') studentGain += PUNISH_PIECE_VALUE[m.captured] ?? 0;
          else opponentGain += PUNISH_PIECE_VALUE[m.captured] ?? 0;
        }
        mover = mover === 'student' ? 'opponent' : 'student';
      }
      const last = followup.length > 0 ? followup[followup.length - 1].san : first.san;
      if (last.includes('#')) lines.push('the sequence ends in checkmate');
      else if (studentGain - opponentGain >= 2) {
        lines.push(`over the full sequence the student comes out ${studentGain - opponentGain} points of material ahead`);
      }
    }
    // 3. Why each distractor fails — computed, not guessed.
    const mateAvailable = (() => {
      try { return new Chess(postInaccuracyFen).moves().some((m) => m.includes('#')); } catch { return false; }
    })();
    for (const d of distractors) {
      try {
        const probe = new Chess(postInaccuracyFen);
        const m = probe.move(d.san);
        if (!m) continue;
        const why: string[] = [];
        if (mateAvailable && !m.san.includes('#')) why.push('misses the available checkmate');
        // Does the moved piece land where a CHEAPER enemy piece can take it?
        const parts = probe.fen().split(' ');
        const enemy = student === 'w' ? 'b' : 'w';
        parts[1] = enemy;
        parts[3] = '-';
        try {
          const enemyView = new Chess(parts.join(' '));
          const takers = enemyView.moves({ verbose: true }).filter((x) => x.to === m.to);
          const cheapest = Math.min(...takers.map((x) => PUNISH_PIECE_VALUE[x.piece] ?? 99));
          const moverVal = PUNISH_PIECE_VALUE[m.piece] ?? 0;
          const defended = takers.length > 0 && (() => {
            const backParts = probe.fen().split(' ');
            backParts[1] = student;
            backParts[3] = '-';
            try { return new Chess(backParts.join(' ')).isAttacked(m.to, student); } catch { return false; }
          })();
          if (takers.length > 0 && (cheapest < moverVal || !defended)) {
            why.push(`the ${PUNISH_PIECE_WORD[m.piece]} can simply be captured on ${m.to}`);
          }
        } catch { /* skip the safety read */ }
        if (why.length === 0) why.push(m.captured ? 'wins less than the main move' : 'does not create a threat');
        lines.push(`distractor ${d.san}: ${why.join('; ')}`);
      } catch { /* illegal — skip */ }
    }
  } catch { /* facts are a constraint, never a blocker */ }
  return lines.length > 0 ? lines.map((l) => `    • ${l}`).join('\n') : '    • (no computed facts — describe only the moves given)';
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
    computedFacts: computePunishFacts(postInaccuracyFen, punishment, followup, distractors),
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

  // Single LLM call: prose labels for all lessons, describing THE POSITION
  // GIVEN and nothing else.
  //
  // 🚨 These are NOT the opening's trap lines. They are tactics from games that
  // merely carried this opening's ECO tag, and `setupFen` is routinely move 14+
  // — long past any theory. The prompt used to say "tie it back to the opening's
  // character (Italian's Bc4-and-Ng5 pressure on f7, …)", which INSTRUCTED the
  // model to assert a relationship it has no way to check. David's 2026-08-05
  // prod run is what that produces: on a move-14 position from a stranger's
  // game, "Black's Bxh1 grabs a rook but completely ignores the bishop's-opening
  // pressure White has built on f7." There was no bishop's-opening pressure.
  //
  // The board gate did fire on the neighbouring sentences (audit findings
  // 50-57, several dropping to kept:"") and could not catch this one, because
  // "the opening's pressure" names no square and so is not a checkable claim.
  // That is G0 exactly: the cure is not another gate, it is not asking for the
  // invention. The model gets the FEN, the moves and the themes — enough to
  // describe what is actually on the board — and is told the opening name is
  // provenance, not a fact about this position.
  //
  // `buildStageTeachingBlock` is DROPPED here for the same reason. It was
  // injecting ~4KB of the opening's corpus teaching (audit findings 102-105)
  // into a prompt about positions the opening never reaches, which is the
  // conflation with the volume turned up. It stays on every stage that IS the
  // opening — only this puzzle-derived one loses it.
  const studentSide = inferStudentSideFromName(entry.canonicalName);
  const systemPrompt = `You are an expert chess coach narrating tactical lessons drawn from real games. The student plays ${studentSide}.

THESE POSITIONS ARE NOT OPENING THEORY. Each one is a middlegame position from a game that happened to begin with the ${entry.canonicalName}, often more than ten moves earlier. The opening name is PROVENANCE ONLY. Never claim the position shows that opening's ideas, pressure, structure or plans, and never name the opening as the reason a move works — you cannot see how this position was reached, so any such claim would be invented. Describe ONLY what the given FEN shows.

For each lesson below, output:
- name: 4-8 words naming the mistake and the tactic, from the position itself. Examples:
  • "Knight grabs f7 — fork on the queen"
  • "Careless Ngf6?? — Nd6 is mate"
  • "The loose bishop invites a sack"
- whyBad: 1-2 sentences on WHY the opponent's move loses, in terms of the pieces and squares ON THIS BOARD — what it leaves undefended, what line it opens, what square it stops covering.
- shortWhyBad: REQUIRED ≤28-word compression of whyBad for the Brief Coach Narration setting. Preserve the KEY tactical / positional reason the move loses.
- whyPunish: 1-2 sentences on the punishing IDEA — sacrifice for tempo, fork the queen, exploit the loose bishop, etc. Reference the puzzle's themes when natural ("a classic Bxf7+ sac that wins the queen by deflection").
- shortWhyPunish: REQUIRED ≤28-word compression of whyPunish for Brief mode.
- distractors: for EACH distractor (in the SAME ORDER given), write a short label (2-5 words) and a 1-sentence explanation of why it doesn't work or doesn't punish as well.
- followupIdeas: ONE short sentence per followup move (in order) describing the tactical thread — "rook lifts to win the queen", "the king is dragged into the open", etc.
- shortFollowupIdeas: parallel array — for EACH followup move, a ≤18-word Brief-mode variant of the matching followupIdea.

Each lesson carries a COMPUTED BOARD FACTS block. Those facts were verified against the board by code — they are the ONLY board claims you may make. Phrase them naturally; never assert a piece, square, capture, threat or material count that is not in the block. If the block doesn't mention it, you don't know it.

The SANs and FENs are GIVEN by the puzzle database — DO NOT alter them, do NOT add or reorder distractors, do NOT invent moves. Just write the prose. Output ONLY via the tool.`;

  const lessonsBlock = prepared
    .map((l, i) => {
      const themesLine = l.themes.slice(0, 6).join(', ');
      return `Lesson ${i + 1} (rating ${l.rating}; themes: ${themesLine}):
  setupFen: ${l.setupFen}
  Opponent's mistake (inaccuracy): ${l.inaccuracy}
  Punishing move: ${l.punishment}
  COMPUTED BOARD FACTS (your only permissible board claims):
${l.computedFacts}
  Distractors (in order — write label + explanation for each):
${l.distractors.map((d, j) => `    ${String.fromCharCode(97 + j)}) ${d.san}`).join('\n')}
  Followup moves after the punishment (in order):
${l.followup.length > 0 ? l.followup.map((f, j) => `    ${j + 1}. ${f.san}`).join('\n') : '    (none)'}`;
    })
    .join('\n\n');

  // No canonical line here — handing the model the opening's move list next to
  // a move-14 puzzle FEN invites it to narrate the two as one line. The FEN in
  // each lesson block is the only position it may describe.
  const userPrompt = `Games in this set opened with: ${entry.canonicalName} (${entry.eco}) — provenance only, not the position.
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
    // CURATED WEAPONS FIRST (David 2026-08-01: "we are building out the
    // gem/punish lines in coach"). The gems beat anything the puzzle path can
    // produce for this opening — the opponent's slip is what really gets
    // played at this level, the refutation is engine-verified and tiered, the
    // line is already played out to where the material lands, and the prose is
    // hand-written, so no LLM call is needed at all. The puzzle path stays as
    // the fallback for the openings with no gems (most of the DB's 3,000).
    try {
      const gemLessons = gemPunishLessonsForOpeningName(openingName);
      // ONE curated weapon is enough (David 2026-08-02: traps "should be gem
      // lines"). The >= 2 bar is the generic "enough material for a stage"
      // rule the drill and find-move paths use, and it was wrong here: a gem
      // is a hand-narrated, engine-verified, tiered refutation, and 23 of the
      // 86 openings with gems have exactly one — those were falling past it to
      // the puzzle path, which is the WEAKER source, to make up a count.
      if (gemLessons.length >= 1) {
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'openingGenerator.generateOneStage',
          summary: `punish via CURATED GEMS for "${openingName}" — ${gemLessons.length} engine-verified weapons, no LLM call`,
        });
        return { ok: true, data: gemLessons };
      }
    } catch (err) {
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'openingGenerator.generateOneStage',
        summary: `gem punish path failed for "${openingName}" — falling through to the puzzle DB`,
        details: err instanceof Error ? err.message : String(err),
      });
    }
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
      // No forceProvider: the Anthropic key was removed 2026-06-25, so a
      // pinned 'anthropic' resolved to a null config and every stage gen
      // failed with "provider unreachable" — let the spine pick DeepSeek.
      4096,
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
  // MISSING means "the student cannot be shown this stage", NOT "the array is
  // empty" (David 2026-08-04 — the "teach me the traps in X just keeps
  // loading" bug). A tree from a legacy Dexie row or the shared Supabase cache
  // never re-ran `repair*Stage`, so it can carry a NON-EMPTY punish array in
  // which every lesson is unstartable — missing `distractors`, or an illegal
  // inaccuracy/punishment. Under the old length test that stage counted as
  // present, so nothing regenerated it, while the stage menu's own validity
  // test refused to enter it. The jump parked forever and the student watched
  // a spinner. Both sides now ask `stageArrayHasUsableEntry`, so a stage that
  // cannot be entered is a stage that gets rebuilt.
  const missing: OptionalStage[] = [];
  for (const stage of ['concepts', 'findMove', 'drill', 'punish'] as const) {
    if (!stageArrayHasUsableEntry(stage, tree[stage])) missing.push(stage);
  }
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
  /** Fired when a stage has EXHAUSTED its attempts and still has nothing the
   *  student could be shown. The caller may be parked on a pending jump into
   *  that stage; without this it waits forever for a merge that will never
   *  come (David 2026-08-04). Silence beats a spinner — tell the surface so it
   *  can say so honestly and let the student do something else. */
  onStageUnavailable?: (stage: 'concepts' | 'findMove' | 'drill' | 'punish') => void,
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
      const giveUp = (): void => {
        try { onStageUnavailable?.(stage); } catch { /* swallow */ }
      };
      const first = await generateOneStage(openingName, stage);
      if (!first.ok || !first.data) {
        void logAppAudit({
          kind: 'llm-error',
          category: 'subsystem',
          source: 'openingGenerator.generateMissingStagesInBackground',
          summary: `background stage gen failed for "${openingName}" / ${stage}: ${first.reason ?? 'unknown'}`,
        });
        giveUp();
        return;
      }
      const merge = await mergeStageIntoCache(tree.cacheKey ?? openingName, stage, first.data);
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
        giveUp();
        return;
      }
      const retryMerge = await mergeStageIntoCache(tree.cacheKey ?? openingName, stage, retry.data);
      if (!retryMerge.merged) {
        void logAppAudit({
          kind: 'llm-error',
          category: 'subsystem',
          source: 'openingGenerator.generateMissingStagesInBackground',
          summary: `${stage} retry merge failed for "${openingName}": ${retryMerge.reason ?? 'unknown'}`,
        });
        giveUp();
      } else {
        try { onStageMerged?.(stage); } catch { /* swallow */ }
      }
    }),
  );
}

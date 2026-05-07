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
import { getCoachChatResponse } from './coachApi';
import {
  validateWalkthroughTree,
  validateMoveLegality,
  validateTreeMoveLegality,
  formatIssues,
  stripSanAnnotations,
} from '../data/openingWalkthroughs/validate';
import { db, type CachedOpening } from '../db/schema';
import { logAppAudit } from './appAuditor';
import type {
  WalkthroughTree,
  WalkthroughTreeNode,
  ConceptCheckQuestion,
  FindMoveQuestion,
  DrillLine,
  PunishLesson,
} from '../types/walkthroughTree';

/** Concrete top-of-tree skeleton showing the root → first-move →
 *  second-move structure. Production audit (build 3965c09 and prior)
 *  caught the LLM placing Black moves directly under root for openings
 *  like Pirc/Sicilian/Caro-Kann — the prose rules in the system prompt
 *  weren't enough; the LLM needed to SEE the JSON shape with the root
 *  placeholder + White's first move + Black's response nested below.
 *  This anchor shows it. Generic king-pawn opening template; the LLM
 *  fills in actual moves and idea text appropriate to the requested
 *  opening. */
const ROOT_STRUCTURE_EXAMPLE = `
ROOT STRUCTURE EXAMPLE — top-of-tree shape for a Pirc Defense walkthrough.
The root node ALWAYS has san: null and movedBy: null. The FIRST entry in
root.children is ALWAYS White's 1st move, regardless of which side the
student is learning. Black's response is nested INSIDE that node's children.

{
  "openingName": "Pirc Defense",
  "eco": "B07",
  "studentSide": "black",
  "intro": "...",
  "outro": "...",
  "root": {
    "san": null,
    "movedBy": null,
    "idea": "",
    "children": [
      {
        "node": {
          "san": "e4",
          "movedBy": "white",
          "idea": "1.e4 — White claims the center...",
          "children": [
            {
              "node": {
                "san": "d6",
                "movedBy": "black",
                "idea": "1...d6 — the Pirc setup move...",
                "children": [
                  { "node": { "san": "d4", "movedBy": "white", ... } }
                ]
              }
            }
          ]
        }
      }
    ]
  }
}

Same shape applies to EVERY opening:
- Italian: root → e4 (white) → e5 (black) → Nf3 (white) → Nc6 (black) → Bc4 (white) → ...
- Sicilian: root → e4 (white) → c5 (black) → Nf3 (white) → d6 (black) → ...
- Queen's Gambit: root → d4 (white) → d5 (black) → c4 (white) → ...
`;

/** Condensed Vienna sample shown to the LLM as a few-shot example.
 *  Just one full node (2.Nc3) showing all the conventions: idea
 *  text, narration segments with arrows, color usage. The LLM
 *  generalizes from this rather than reading the full file. */
const VIENNA_SAMPLE = `
Example node — White's 2.Nc3 in the Vienna:

{
  "san": "Nc3",
  "movedBy": "white",
  "idea": "2.Nc3 — and here's where the Vienna actually starts. The natural move is Nf3 (the Italian and the Spanish both go there), but we play Nc3 instead. Why? Three reasons. One: it develops a piece. Two: it defends e4. Three — and this is the big one — it leaves the f-pawn FREE. In the Italian, after Nf3, the f-pawn is locked behind the knight forever; in the Vienna, f4 is on the table from move three onward. That's the whole opening: a kingside pawn storm waiting to happen.",
  "narration": [
    {
      "text": "2.Nc3 — and here's where the Vienna actually starts. The natural move is Nf3 — the Italian and the Spanish both go there.",
      "arrows": [{ "from": "g1", "to": "f3", "color": "red" }]
    },
    {
      "text": "But we play Nc3 instead. Why? Three reasons. One — it develops a piece.",
      "arrows": [{ "from": "b1", "to": "c3", "color": "green" }]
    },
    {
      "text": "Two — it defends e4 in case Black later threatens it.",
      "arrows": [{ "from": "c3", "to": "e4", "color": "blue" }]
    },
    {
      "text": "Three, and this is the big one — it leaves the f-pawn free.",
      "highlights": [{ "square": "f2", "color": "yellow" }]
    },
    {
      "text": "In the Vienna, f4 is on the table from move three onward. That's the whole opening — a kingside pawn storm waiting to happen.",
      "arrows": [{ "from": "f2", "to": "f4", "color": "green" }]
    }
  ],
  "children": [/* fork or linear children here */]
}

Branch points (children.length > 1) need label + forkSubtitle on every child:
{
  "label": "2…Nf6",
  "forkSubtitle": "Hits e4 — invites the gambit",
  "node": { /* the subtree */ }
}
`;

/** System prompt — instructs the LLM to produce a JSON
 *  WalkthroughTree following the Vienna pattern. Critically: output
 *  must be RAW JSON, no markdown fences, no commentary. */
function buildSystemPrompt(): string {
  return `You are an expert chess coach generating a walkthrough lesson for a 1200-1600 rated player. Your output is a JSON object matching the WalkthroughTree schema below. You are reading from your knowledge of standard opening theory — moves should be MAIN-LINE master theory, not engine sidelines.

OUTPUT FORMAT: Raw JSON only. No markdown code fences. No prose before or after. The first character must be \`{\` and the last must be \`}\`. The validation pipeline will fail otherwise.

SCOPE: You are generating ONLY the walkthrough tree (the move-by-move lesson). DO NOT include concepts, findMove, drill, or punish fields — those are generated by separate calls. Including them in your output makes the response truncate and the lesson fails to load. Omit them entirely.

SCHEMA (TypeScript types) — these are the ONLY fields you output:

interface WalkthroughTree {
  openingName: string;       // Display name, e.g. "Italian Game"
  eco: string;               // ECO code, e.g. "C50"
  studentSide: 'white' | 'black';  // REQUIRED. Which side the student is learning. White for openings the student plays AS WHITE (Italian, Vienna, Ruy Lopez, Queen's Gambit, etc.). Black for defenses the student plays AS BLACK (Sicilian, French, Caro-Kann, Pirc, King's Indian, Nimzo-Indian, etc.). Drives board orientation.
  intro: string;             // 2-4 sentence opening framing, coach voice
  outro: string;             // 1-2 sentences inviting next steps
  leafOutros?: Record<string, string>;  // Optional per-leaf custom outros, key = SAN path joined by spaces
  root: WalkthroughTreeNode;
}

interface WalkthroughTreeNode {
  san: string | null;        // null only for root
  movedBy: 'white' | 'black' | null;
  idea: string;              // 40-90 word coach explanation; mention the SAN played
  narration?: NarrationSegment[];  // Optional: 2-4 segments max, each 1-2 short sentences
  children: { label?: string; forkSubtitle?: string; node: WalkthroughTreeNode }[];
}

interface NarrationSegment {
  text: string;              // 1-2 short sentences
  arrows?: { from: string; to: string; color?: 'green'|'red'|'blue'|'yellow' }[];
  highlights?: { square: string; color?: 'green'|'red'|'blue'|'yellow' }[];
}

CRITICAL MOVE-ORDER RULES:
- Chess ALWAYS starts with White's move. root.children[0].node.san MUST be a White move (e.g. 'e4', 'd4', 'Nf3', 'c4'); root.children[0].node.movedBy MUST be 'white'.
- This applies EVEN when studentSide is 'black'. studentSide: 'black' affects board orientation ONLY — the SAN sequence still alternates white→black→white→black starting from White's 1st move.
- See ROOT STRUCTURE EXAMPLE below for the exact JSON shape. Match it precisely. Production audit caught the LLM repeatedly producing Pirc/Sicilian/Caro-Kann trees with the Black move (d6/c5/c6) as root.children[0] — that's illegal because White moves first. The example below shows the correct shape.

${ROOT_STRUCTURE_EXAMPLE}

CONVENTIONS:
- Coach voice: first-person, conversational, pedagogically clear. Read like a strong coach explaining to a student face-to-face.
- Each idea must MENTION the SAN played (e.g. "Bc4 develops..." or "bishop to c4 develops...").
- Branch points (forks) need every child to have label + forkSubtitle.
- Move-order matters: trace each line carefully. For example, you can't push f4 with Black's bishop on c5 (the long diagonal opens and the g1-knight hangs). The trade or the move-order matters.
- TARGET SIZE: 3 forks, each branch ~6-10 plies after the fork. Idea text 40-90 words. Narration 2-4 segments per node, each 1-2 sentences. This keeps the response within the token budget; longer trees truncate and fail to load.

ARROW + HIGHLIGHT RULES (production audit caught useless arrows; follow these strictly):
- DO NOT draw an arrow on the move being played in this node. The board animates the SAN itself — adding an arrow from the same from→to is redundant noise.
- DO draw arrows on FUTURE moves the narration text mentions. If the prose says "preparing ...c5" → green arrow c7→c5. If it says "...e5 will challenge the center" → green arrow e7→e5. If the prose says "we'll castle" → green arrow e8→g8. If "...Nc6 hits d4" → green arrow b8→c6.
- DO highlight key SQUARES the prose talks about ("eyes f7", "controls e5") with yellow.
- DO use red arrows for OPPONENT THREATS the prose warns about ("careful — White wants Bxh7+") with red from→to.
- Color legend: green = our future plan / our piece's destination. Red = opponent's threat or move-not-to-make. Blue = development / defensive squares. Yellow = key squares the prose highlights.
- If a narration segment doesn't reference a specific square or future move, OMIT arrows/highlights entirely on that segment. A clean board with no arrows is better than nonsense arrows.

LEGAL-MOVE TRAPS (production audit caught all of these — DO NOT repeat):
- FIANCHETTO PREP: To play Bg7 you must FIRST move the g-pawn (...g6). Bishop on f8 → bishop to g7 requires g7 to be EMPTY. Same for Bg2 (needs g3) and Bb7 (needs b6) and Bb2 (needs b3). The Pirc move order is ...d6, ...Nf6, ...g6, THEN ...Bg7 — never ...Bg7 before ...g6.
- QUEENSIDE CASTLING: O-O-O requires the b1 (or b8) knight to be DEVELOPED — castling cannot pass through a piece. If Nb1 is still home, you cannot castle queenside. Develop the knight first (Nc3, Nb1-d2-c4, etc.) before O-O-O.
- KINGSIDE CASTLING: O-O requires the f1 (or f8) bishop to be developed AND the g1 (or g8) knight to be developed. King and rook must not have moved.
- Pawn moves can never go BACKWARD or sideways. e4 to e5 is legal, e4 to e3 is not.

${VIENNA_SAMPLE}

Now generate the WalkthroughTree for the requested opening. Output JSON only.`;
}

/** Parse the LLM's response into a WalkthroughTree. Defensively
 *  handles common LLM output mistakes: markdown code fences,
 *  surrounding prose, trailing commas in objects/arrays, single-line
 *  comments. Production audit (build ea296eb) caught "The Pirc"
 *  generation failing on first parse — likely the LLM output got
 *  truncated mid-JSON when max_tokens was 8192 (now bumped to 16384
 *  in the call), but defensive parsing also helps recover from
 *  smaller LLM mistakes. Returns null if JSON parsing still fails. */
/** Parse result that surfaces the JSON.parse error message when it
 *  fails — production audit (build 23c484d) showed retries producing
 *  non-truncated responses (ended with `}`) that still didn't parse.
 *  Without the error message we couldn't tell why. */
interface ParseResult {
  tree: WalkthroughTree | null;
  /** JSON.parse error message when tree is null, e.g.
   *  "Unexpected token } in JSON at position 1234". */
  parseError?: string;
}

function parseGeneratedTree(raw: string): ParseResult {
  let text = raw.trim();
  // Strip markdown code fences defensively.
  text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '');
  // Find the first { and last } in case there's surrounding prose.
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace < firstBrace) {
    return { tree: null, parseError: 'no balanced { ... } found in response' };
  }
  let jsonText = text.slice(firstBrace, lastBrace + 1);
  // Strip C-style line comments (LLMs sometimes add them despite
  // the prompt). Matches // ... to end of line.
  jsonText = jsonText.replace(/^\s*\/\/[^\n]*$/gm, '');
  // Strip trailing commas before } or ] (LLM frequently adds these
  // even though strict JSON disallows them).
  jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
  try {
    return { tree: JSON.parse(jsonText) as WalkthroughTree };
  } catch (err) {
    return {
      tree: null,
      parseError: err instanceof Error ? err.message : String(err),
    };
  }
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
    if (!cached) return null;
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
      await db.cachedOpenings.delete(normalized);
      return null;
    }
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
    const setupChess = replayAll(lesson.setupMoves ?? []);
    if (!setupChess) {
      report.dropped += 1;
      report.notes.push(`punish[${i}]: dropped — illegal setupMoves`);
      continue;
    }
    // Apply inaccuracy to get the post-inaccuracy FEN.
    let postInaccuracyFen: string;
    try {
      const probe = new Chess(setupChess.fen());
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
    kept.push(lesson);
  }
  return { kept, report };
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

/** Pull the first N SAN values from a generated tree by walking
 *  root.children depth-first along the leftmost path. Used in audit
 *  logs so we can SEE what the LLM produced — the most diagnostic
 *  signal when validation fails is "did the LLM put Black on top?"
 *  Returns up to maxDepth SANs from the leftmost spine. */
function firstSansAlongLeftSpine(
  tree: WalkthroughTree,
  maxDepth: number,
): string[] {
  const sans: string[] = [];
  let node = tree.root;
  while (node.children.length > 0 && sans.length < maxDepth) {
    const next = node.children[0].node;
    sans.push(next.san ?? '<null>');
    node = next;
  }
  return sans;
}

/** Snapshot the LLM's structural shape into one short string for
 *  audit triage: childCount + first SANs along the leftmost spine.
 *  At a glance you can see "Pirc tree shape: rootKids=1, spine=d6,d4,Nf6"
 *  and immediately know the LLM put Black on top. */
function describeTreeShape(tree: WalkthroughTree): string {
  const rootKidCount = tree.root.children.length;
  const spine = firstSansAlongLeftSpine(tree, 6).join(',');
  const firstMover = tree.root.children[0]?.node.movedBy ?? '<missing>';
  return `rootKids=${rootKidCount}, firstMover=${firstMover}, spine=${spine}`;
}

/** Single generation attempt — calls the LLM, parses, validates.
 *  No retry; the wrapper `generateOpening` does the retry. */
async function generateOnce(
  name: string,
  retryContext?: string,
): Promise<GenerationResult> {
  const systemPrompt = buildSystemPrompt();
  const userMessage = retryContext
    ? `Generate the WalkthroughTree for: ${name}

Your previous attempt failed:
${retryContext}

CRITICAL on this retry:
- Output ONLY raw JSON. First character must be \`{\`, last must be \`}\`. The validator checks that the LAST character of your response is \`}\` — if your output is truncated mid-JSON, parsing fails.
- DO NOT include concepts/findMove/drill/punish — they are generated separately. Including them is the #1 cause of truncation.
- Keep idea text 40-70 words, narration 2-3 segments per node. Shorter is better.
- Aim for 3 forks total, each ~6-8 plies deep. NOT 4-5 forks.
- No markdown fences. No prose. No comments. No trailing commas.

Fix the issues above and produce a SHORTER, valid tree.`
    : `Generate the WalkthroughTree for: ${name}`;

  let rawResponse: string;
  try {
    rawResponse = await getCoachChatResponse(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      undefined, // no streaming
      'chat_response',
      // 16384 max tokens — full opening trees with all 5 stages
      // (concepts, findMove, drill, punish, plus a deep walkthrough
      // tree with 4-5 forks) routinely exceed 8192. Production audit
      // (build ea296eb) caught "The Pirc" generation failing because
      // the response was truncated mid-JSON. 16K gives plenty of room
      // without bumping into the per-call API ceiling.
      16384,
      undefined,
      'anthropic',
    );
  } catch (err) {
    return {
      ok: false,
      reason: `LLM call failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (rawResponse.startsWith('⚠️')) {
    void logAppAudit({
      kind: 'llm-error',
      category: 'subsystem',
      source: 'openingGenerator.generateOnce',
      summary: `LLM provider error for "${name}"${retryContext ? ' (retry)' : ''}`,
      details: rawResponse.slice(0, 500),
    });
    return { ok: false, reason: rawResponse };
  }

  const parseResult = parseGeneratedTree(rawResponse);
  const tree = parseResult.tree;
  if (!tree) {
    // Detect truncation explicitly — if the last non-whitespace char
    // isn't `}`, the response was cut off mid-stream (most likely
    // hit max_tokens). That's a different remedy than malformed JSON
    // (e.g. trailing comma) so flag it separately in the trail.
    const trimmed = rawResponse.trimEnd();
    const looksTruncated = trimmed.length > 0 && trimmed[trimmed.length - 1] !== '}';
    const reason = looksTruncated
      ? 'JSON parse failed — response truncated (does not end with `}`); LLM exceeded token budget'
      : `JSON parse failed — ${parseResult.parseError ?? 'unknown error'}`;
    // Around the parse error position, dump the surrounding 200 chars
    // — that's the diagnostic the audit needs. Production audit (build
    // 23c484d) showed a retry response ending in `}` but not parsing,
    // and we couldn't see what broke without the error message + locale.
    // Production audit (build c95ccc9) caught Philidor failing with
    // iOS Safari's "Expected '}'" message — no position number, so the
    // position-based window didn't fire and we were blind to which
    // region broke. Fall back to dumping the LAST 500 chars (where
    // structural-tail errors usually live).
    let errorContext = '';
    const posMatch = parseResult.parseError?.match(/position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const start = Math.max(0, pos - 100);
      const end = Math.min(rawResponse.length, pos + 100);
      errorContext = `\n--- 200 chars around position ${pos} ---\n${rawResponse.slice(start, end)}`;
    } else if (rawResponse.length > 500) {
      errorContext = `\n--- last 500 chars (no position in error message) ---\n${rawResponse.slice(-500)}`;
    }
    void logAppAudit({
      kind: 'llm-error',
      category: 'subsystem',
      source: 'openingGenerator.generateOnce',
      summary: `${looksTruncated ? 'truncated response' : 'JSON parse failed'} for "${name}"${retryContext ? ' (retry)' : ''}`,
      details:
        `responseLength=${rawResponse.length} endsWith=${JSON.stringify(trimmed.slice(-50))}\n` +
        `parseError: ${parseResult.parseError ?? '<none>'}` +
        errorContext +
        `\n--- raw response (first 1500 chars) ---\n${rawResponse.slice(0, 1500)}`,
    });
    return { ok: false, reason };
  }

  // Auto-repair cosmetic schema mistakes the LLM keeps making
  // (missing label / forkSubtitle on fork children). Production
  // audit (build 23c484d) caught Pirc validation failing on 4
  // missing-label/subtitle errors that were trivially derivable
  // from the SAN. Fixing in code beats begging the LLM to remember.
  const repaired = repairForkLabels(tree);
  if (repaired > 0) {
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'openingGenerator.generateOnce',
      summary: `auto-repaired ${repaired} missing label/forkSubtitle entries for "${name}"`,
    });
  }
  // Strip PGN annotation marks from every SAN. The validator already
  // strips before its chess.js calls so validation passes, but the
  // RUNTIME drill / punish / walkthrough animation will fail to advance
  // if the cached data has "g4?" instead of "g4".
  const sansNormalized = normalizeTreeSans(tree);
  if (sansNormalized > 0) {
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'openingGenerator.generateOnce',
      summary: `stripped ${sansNormalized} SAN annotation marks for "${name}"`,
    });
  }

  const structural = validateWalkthroughTree(tree);
  const legality = validateMoveLegality(tree);
  // CRITICAL: validate the walkthrough tree's own SANs are legal
  // from their parent positions. Production audit (build c2bc340)
  // caught the LLM generating a Pirc tree where the first child's
  // san='d6' (Black's move) — illegal from the standard starting
  // position because White moves first. The tree shipped, got
  // cached, narration played but the board never advanced because
  // chess.js silently rejected each move. Without this gate, broken
  // trees ship and cache.
  const treeLegality = validateTreeMoveLegality(tree);
  const allIssues = [...structural, ...legality, ...treeLegality];
  const errors = allIssues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    const formatted = formatIssues(errors);
    void logAppAudit({
      kind: 'llm-error',
      category: 'subsystem',
      source: 'openingGenerator.generateOnce',
      summary: `validation failed for "${name}"${retryContext ? ' (retry)' : ''} — ${errors.length} errors`,
      // Include the parsed tree shape (so we know if the LLM put Black
      // on top, missed root, etc.) and the first 1500 chars of issues.
      // Without this, "validation failed" is opaque and we can't
      // diagnose without re-running.
      details:
        `shape: ${describeTreeShape(tree)}\n` +
        `issues:\n${formatted.slice(0, 2500)}`,
    });
    return {
      ok: false,
      reason: 'validation failed',
      issues: formatted,
    };
  }

  return {
    ok: true,
    tree,
    issues:
      allIssues.length > 0
        ? formatIssues(allIssues.filter((i) => i.severity === 'warning'))
        : undefined,
  };
}

/** Generate a walkthrough tree for the given opening name. Tries
 *  once; on validation failure, tries once more with the error
 *  messages fed back. Returns null on total failure. */
export async function generateOpening(
  name: string,
): Promise<GenerationResult> {
  void logAppAudit({
    kind: 'coach-surface-migrated',
    category: 'subsystem',
    source: 'openingGenerator.generateOpening',
    summary: `generation requested for "${name}"`,
  });

  const first = await generateOnce(name);
  if (first.ok) {
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'openingGenerator.generateOpening',
      summary: `generation OK on first try for "${name}"`,
    });
    return first;
  }

  // One retry with the failure context. Cheap insurance; LLM often
  // recovers when shown its own validation errors.
  const second = await generateOnce(name, first.issues ?? first.reason);
  if (second.ok) {
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'openingGenerator.generateOpening',
      summary: `generation OK on retry for "${name}"`,
    });
    return second;
  }

  void logAppAudit({
    kind: 'llm-error',
    category: 'subsystem',
    source: 'openingGenerator.generateOpening',
    summary: `generation failed both attempts for "${name}"`,
    // The per-attempt logAppAudit calls inside generateOnce already
    // captured the raw response / tree shape / full issue list. This
    // top-level summary just chains the attempt summaries so the trail
    // is readable end-to-end without joining audit entries by hand.
    details:
      `first attempt reason: ${first.reason}\n` +
      `first attempt issues: ${(first.issues ?? '<none>').slice(0, 1000)}\n` +
      `second attempt reason: ${second.reason}\n` +
      `second attempt issues: ${(second.issues ?? '<none>').slice(0, 1000)}`,
  });
  return second;
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
function buildStageSystemPrompt(stage: OptionalStage): string {
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
${stage === 'concepts' ? `- Single-select questions (multiSelect omitted or false) need EXACTLY ONE correct choice. If 2+ choices are correct, set multiSelect: true on that question.\n` : ''}${stage === 'findMove' ? `- Each question needs 2+ candidates. EXACTLY ONE is correct. The path SANs must be a legal sequence from the standard starting position.\n` : ''}${stage === 'drill' ? `- Trace the FULL move sequence with chess.js mentally before emitting. Each move must be legal from the position the prior moves create. studentSide MUST match the opening — black for Sicilian, French, Caro-Kann, Pirc, KID, Nimzo-Indian, Modern, Alekhine, Scandinavian, etc.; white for Italian, Vienna, Spanish, Queen's Gambit, etc.\n` : ''}${stage === 'punish' ? `- setupMoves + inaccuracy + punishment + each distractor + each followup move must ALL be legal in sequence. Distractors are LEGAL alternatives that don't punish as well — they are NOT illegal moves. Each lesson needs at least 2 distractors.\n` : ''}- Output JSON only. Validation pipeline rejects anything else.`;
}

/** Parse a stage array from raw LLM output. Same defensive handling
 *  as the main tree parser — strips markdown fences, trailing
 *  commas, and line comments. Returns null if parse fails. */
function parseStageArray<T>(raw: string): T[] | null {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '');
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket < 0 || lastBracket < firstBracket) return null;
  let jsonText = text.slice(firstBracket, lastBracket + 1);
  jsonText = jsonText.replace(/^\s*\/\/[^\n]*$/gm, '');
  jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
  try {
    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

/** Generate one stage's data via a focused LLM call. */
async function generateOneStage(
  openingName: string,
  stage: OptionalStage,
): Promise<{ ok: boolean; data?: unknown[]; reason?: string }> {
  const systemPrompt = buildStageSystemPrompt(stage);
  const userMessage = `Generate the ${stage} array for the opening: ${openingName}.`;
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
      summary: `LLM provider error for "${openingName}" / ${stage}`,
      details: raw.slice(0, 500),
    });
    return { ok: false, reason: raw };
  }
  const data = parseStageArray<unknown>(raw);
  if (!data) {
    void logAppAudit({
      kind: 'llm-error',
      category: 'subsystem',
      source: 'openingGenerator.generateOneStage',
      summary: `stage JSON parse failed for "${openingName}" / ${stage}`,
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
): Promise<void> {
  try {
    const normalized = normalizeOpeningName(openingName);
    const cached = await db.cachedOpenings.get(normalized);
    if (!cached) return;
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
      const r = repairPunishStage(data as PunishLesson[]);
      repairedData = r.kept;
      repairReport = r.report;
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
      void logAppAudit({
        kind: 'llm-error',
        category: 'subsystem',
        source: 'openingGenerator.mergeStageIntoCache',
        summary: `no salvageable ${stage} entries for "${openingName}" after repair`,
      });
      return;
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
      return;
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
      summary: `merged ${stage} (${data.length} entries) into cached "${openingName}"`,
    });
  } catch (err) {
    void logAppAudit({
      kind: 'dexie-error',
      category: 'subsystem',
      source: 'openingGenerator.mergeStageIntoCache',
      summary: `failed to merge ${stage} for "${openingName}"`,
      details: err instanceof Error ? err.message : String(err),
    });
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
      const result = await generateOneStage(openingName, stage);
      if (result.ok && result.data) {
        await mergeStageIntoCache(openingName, stage, result.data);
      } else {
        void logAppAudit({
          kind: 'llm-error',
          category: 'subsystem',
          source: 'openingGenerator.generateMissingStagesInBackground',
          summary: `background stage gen failed for "${openingName}" / ${stage}: ${result.reason ?? 'unknown'}`,
        });
      }
    }),
  );
}

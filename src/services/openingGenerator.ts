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
import { getCoachChatResponse } from './coachApi';
import {
  validateWalkthroughTree,
  validateMoveLegality,
  formatIssues,
} from '../data/openingWalkthroughs/validate';
import { db, type CachedOpening } from '../db/schema';
import { logAppAudit } from './appAuditor';
import type { WalkthroughTree } from '../types/walkthroughTree';

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

SCHEMA (TypeScript types):

interface WalkthroughTree {
  openingName: string;       // Display name, e.g. "Italian Game"
  eco: string;               // ECO code, e.g. "C50"
  studentSide: 'white' | 'black';  // REQUIRED. Which side the student is learning. White for openings the student plays AS WHITE (Italian, Vienna, Ruy Lopez, Queen's Gambit, etc.). Black for defenses the student plays AS BLACK (Sicilian, French, Caro-Kann, Pirc, King's Indian, Nimzo-Indian, etc.). Drives board orientation.
  intro: string;             // 2-4 sentence opening framing, coach voice
  outro: string;             // 1-2 sentences inviting next steps
  leafOutros?: Record<string, string>;  // Optional per-leaf custom outros, key = SAN path joined by spaces
  root: WalkthroughTreeNode;
  concepts?: ConceptCheckQuestion[];   // 3-5 big-idea MC questions
  findMove?: FindMoveQuestion[];        // 3-5 recognition puzzles
  drill?: DrillLine[];                  // 3-5 woodpecker SAN sequences
  punish?: PunishLesson[];              // 3-5 common-mistake lessons
}

interface WalkthroughTreeNode {
  san: string | null;        // null only for root
  movedBy: 'white' | 'black' | null;
  idea: string;              // 50-150 word coach explanation; mention the SAN played
  narration?: NarrationSegment[];  // Optional: segmented narration with arrows
  children: { label?: string; forkSubtitle?: string; node: WalkthroughTreeNode }[];
}

interface NarrationSegment {
  text: string;
  arrows?: { from: string; to: string; color?: 'green'|'red'|'blue'|'yellow' }[];
  highlights?: { square: string; color?: 'green'|'red'|'blue'|'yellow' }[];
}

interface ConceptCheckQuestion {
  prompt: string;
  multiSelect?: boolean;     // true if multiple answers correct
  choices: { text: string; correct: boolean; explanation: string }[];
}

interface FindMoveQuestion {
  path: string[];            // SAN sequence from start to the position
  prompt: string;
  candidates: { san: string; label: string; correct: boolean; explanation: string }[];
}

interface DrillLine {
  name: string;              // Display name
  subtitle?: string;
  moves: string[];           // Full SAN sequence from start
  studentSide?: 'white' | 'black';  // Default 'white'
}

interface PunishLesson {
  name: string;
  setupMoves: string[];      // SAN sequence to position BEFORE the inaccuracy
  inaccuracy: string;        // Black's bad move
  whyBad: string;            // 2-4 sentences explaining the principle, not just the tactic
  punishment: string;        // White's response that wins material/position
  whyPunish: string;         // 2-4 sentences explaining why it works
  distractors: { san: string; label: string; explanation: string }[];  // 2-3 LEGAL but inferior alternatives
  followup?: { san: string; idea: string }[];  // Optional winning continuation
}

CONVENTIONS:
- Coach voice: first-person, conversational, pedagogically clear. Read like a strong coach explaining to a student face-to-face.
- Narration arrows: green = our plan, red = warning/threat or move-not-to-make, blue = development/defensive, yellow = key squares/highlights.
- Each idea must MENTION the SAN played (e.g. "Bc4 develops..." or "bishop to c4 develops...").
- Branch points (forks) need every child to have label + forkSubtitle.
- All distractor moves in findMove and punish MUST be LEGAL from the position. The validation harness will reject illegal SANs.
- Move-order matters: trace each line carefully. For example, you can't push f4 with Black's bishop on c5 (the long diagonal opens and the g1-knight hangs). The trade or the move-order matters.
- Aim for 3-5 forks total, ending each branch at a recognizable middlegame transition (~7-12 plies after the fork).
- Concepts/findMove/drill/punish are OPTIONAL; include all four if you can produce quality data, omit if you'd be guessing.

${VIENNA_SAMPLE}

Now generate the WalkthroughTree for the requested opening. Output JSON only.`;
}

/** Parse the LLM's response into a WalkthroughTree. Strips any
 *  markdown fences if the LLM ignored the instruction; returns null
 *  if JSON parsing fails entirely. */
function parseGeneratedTree(raw: string): WalkthroughTree | null {
  let text = raw.trim();
  // Strip markdown code fences defensively.
  text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  // Find the first { and last } in case there's surrounding prose.
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace < firstBrace) return null;
  const jsonText = text.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonText) as WalkthroughTree;
  } catch {
    return null;
  }
}

/** Normalize an opening name for cache lookup. Lowercase + trim. */
export function normalizeOpeningName(name: string): string {
  return name.trim().toLowerCase();
}

/** Read-through cache: check Dexie before generating. */
export async function getCachedOpening(
  name: string,
): Promise<WalkthroughTree | null> {
  try {
    const normalized = normalizeOpeningName(name);
    const cached = await db.cachedOpenings.get(normalized);
    return cached ? cached.tree : null;
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

/** Single generation attempt — calls the LLM, parses, validates.
 *  No retry; the wrapper `generateOpening` does the retry. */
async function generateOnce(
  name: string,
  retryContext?: string,
): Promise<GenerationResult> {
  const systemPrompt = buildSystemPrompt();
  const userMessage = retryContext
    ? `Generate the WalkthroughTree for: ${name}\n\nYour previous attempt failed validation:\n${retryContext}\n\nFix those issues and produce a valid tree.`
    : `Generate the WalkthroughTree for: ${name}`;

  let rawResponse: string;
  try {
    rawResponse = await getCoachChatResponse(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      undefined, // no streaming
      'chat_response',
      8192, // max tokens — opening trees can be large
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
    return { ok: false, reason: rawResponse };
  }

  const tree = parseGeneratedTree(rawResponse);
  if (!tree) {
    return {
      ok: false,
      reason: 'failed to parse JSON from LLM response',
    };
  }

  const structural = validateWalkthroughTree(tree);
  const legality = validateMoveLegality(tree);
  const allIssues = [...structural, ...legality];
  const errors = allIssues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    return {
      ok: false,
      reason: 'validation failed',
      issues: formatIssues(errors),
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
    details: `first: ${first.reason}; second: ${second.reason}`,
  });
  return second;
}

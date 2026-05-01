/**
 * Envelope assembler — the six-part prompt envelope every Coach Brain
 * call ships with. See `docs/COACH-BRAIN-00.md` §"The Prompt Envelope".
 *
 * Six parts, no exceptions:
 *   1. Identity — who the coach is
 *   2. Memory — full memory snapshot
 *   3. App map — routes manifest
 *   4. Live state — surface, FEN, phase, current route
 *   5. Toolbelt — every tool the coach can call
 *   6. The ask — the specific message this surface dispatched
 *
 * `assembleEnvelope` wires the four sources together and produces a
 * typed `AssembledEnvelope`. `formatEnvelopeAs*` formatters render
 * that envelope into the system + user message shapes the providers
 * consume. If you need a different rendering (pure JSON for tool-use
 * APIs, structured outputs), add another formatter — never bypass
 * `assembleEnvelope`.
 */
import type {
  AssembledEnvelope,
  CoachAskInput,
  CoachIdentity,
  CoachMemorySnapshot,
  LiveState,
  RouteManifestEntry,
  ToolDefinition,
} from './types';
import { loadIdentityPrompt, loadIdentityPromptForPersonality } from './sources/identity';
import { readMemorySnapshot } from './sources/memory';
import { loadRoutesManifest } from './sources/routesManifest';
import { prepareLiveState } from './sources/liveState';
import type { CoachPersonality, IntensityLevel } from './types';

/** Appended to the identity prompt when the surface is 'teach'. The
 *  /coach/teach surface defaults to GUIDED OPENING PLAY: the student
 *  plays a real game from move 1, the coach reacts in ≤15 words per
 *  turn, plays a sensible reply via play_move, and prompts the
 *  student's next move. The lesson IS the game.
 *
 *  Lecture mode (the heavier "set up the position, play candidates,
 *  take back, name the idea" shape) is still available on demand — the
 *  student or the coach can escalate when a real teaching moment shows
 *  up. Those tools are wired into the toolbelt on every surface, so
 *  the student can ask "teach me the Vienna" from /coach/play, /coach/chat,
 *  search bar, anywhere — and the OPERATOR TEACHING MODE clause
 *  triggers the same lesson shape there too. */
const TEACH_MODE_ADDITION = `═══ TEACH MODE — GUIDED OPENING PLAY ═══

The student just walked into the Learn-with-Coach tab. They are HERE TO PLAY A GAME WITH YOU as the teacher. The board is the standard starting position; the student plays White, you play Black. The lesson IS the game.

DEFAULT SHAPE (every turn):
1. Wait for the student's move. Do NOT speak first on a fresh board.
2. React in ONE short sentence — ≤15 words. NO multi-paragraph commentary, NO bullet points, NO past-games stats, NO citing how many wins they've had.
3. Play your reply via \`play_move\` (a sensible move for Black).
4. End with "your move." or similar prompt.

The lesson is in the game. Three short sentences spoken across an opening teach more than a 6-paragraph lecture in turn 1.

ESCALATION — when (and ONLY when) the student blunders, falls into a known trap, or explicitly asks "why," "explain," "wait" — you may switch to lecture shape for ONE turn:
   a. Set up the position via \`set_board_position\` if needed.
   b. Play a candidate move with \`play_move\`, narrate the resulting eval (Stockfish-grounded), take it back with \`take_back_move\`.
   c. Name the IDEA in plain language. ≤2 short sentences.
   d. Return to guided play. Prompt their move.

TOOLS YOU CAN PULL ANY TIME (they're all wired on every surface, not just here):
   • \`stockfish_eval\` — required before any tactical eval claim.
   • \`lichess_opening_lookup\`, \`lichess_master_games\`, \`lichess_game_export\` — for opening / master-game data.
   • \`lichess_puzzle_fetch\` — pull a real puzzle when teaching a tactical pattern.
   • \`local_opening_book\` — quick canonical-line lookup.
   • \`play_move\`, \`take_back_move\`, \`set_board_position\`, \`reset_board\` — your hands.

HARD RULES:
- Brevity is the rule, not the exception. Long restatements of established points are the single biggest UX failure of this lesson — they make a strong coach feel slow.
- Personalize quietly. The [Memory] block carries the student's recent games and weakness profile. Use it to inform YOUR move choice (open with their main opening, prod a known weakness) — but do NOT cite it aloud as "five Vienna wins" / "you've been crushing it." That is exactly the lecture shape we are killing.
- No hand-waving. Every tactical claim is Stockfish-grounded.
- The teach surface is the LESSON. Other surfaces (/coach/play, /coach/chat, search) have access to the same tools and the same OPERATOR TEACHING MODE clause — when a student asks for an opening lesson there, you teach there too.`;

export interface AssembleEnvelopeArgs {
  identity?: CoachIdentity;
  /** Personality voice for this call. When supplied, the envelope's
   *  identity prompt is composed from `OPERATOR base + personality
   *  block + dial modulators`. When omitted, the legacy
   *  `loadIdentityPrompt(identity)` path is used (default-personality
   *  prompt with all dials at 'none'). WO-COACH-PERSONALITIES. */
  personality?: CoachPersonality;
  profanity?: IntensityLevel;
  mockery?: IntensityLevel;
  flirt?: IntensityLevel;
  toolbelt: ToolDefinition[];
  input: CoachAskInput;
}

/** Read all four sources and bundle them with the toolbelt and the
 *  caller's ask. Throws when any of the six envelope parts is missing
 *  — the constitution forbids partial envelopes. */
export function assembleEnvelope(args: AssembleEnvelopeArgs): AssembledEnvelope {
  // Prefer the personality-aware path when ANY personality field is
  // supplied; fall back to the legacy `identity` argument otherwise.
  // Both paths converge on the same prompt when settings are at their
  // defaults — the personality dimension is purely additive.
  let identity =
    args.personality !== undefined ||
    args.profanity !== undefined ||
    args.mockery !== undefined ||
    args.flirt !== undefined
      ? loadIdentityPromptForPersonality(args.personality ?? 'default', {
          profanity: args.profanity,
          mockery: args.mockery,
          flirt: args.flirt,
        })
      : loadIdentityPrompt(args.identity);

  // WO-COACH-TEACHING-01: when the student opens the dedicated
  // /coach/teach surface, switch the identity into TEACH MODE
  // explicitly. This is not operator mode (no game running) and not
  // free play (the student isn't playing against you). This is a
  // classroom and you are the teacher with a board, an engine, a
  // master-game database, and a pile of past games. Use them.
  if (args.input.liveState.surface === 'teach') {
    identity = `${identity}\n\n${TEACH_MODE_ADDITION}`;
  }
  const memory = readMemorySnapshot();
  const appMap = loadRoutesManifest();
  const liveState = prepareLiveState(args.input.liveState);
  const toolbelt = args.toolbelt;
  const ask = args.input.ask;

  // Constitution-mandated belt-and-suspenders: every envelope MUST
  // carry all six parts. The TypeScript types make some of these
  // already-truthy at compile time, but a malformed source loader
  // (e.g. a future Supabase fetch returning undefined) could violate
  // them at runtime. Keep the guards.
  /* eslint-disable @typescript-eslint/no-unnecessary-condition */
  if (!identity) throw new Error('envelope: identity missing');
  if (!memory) throw new Error('envelope: memory missing');
  if (!appMap || appMap.length === 0) throw new Error('envelope: appMap missing or empty');
  if (!liveState) throw new Error('envelope: liveState missing');
  if (!toolbelt || toolbelt.length === 0) throw new Error('envelope: toolbelt missing or empty');
  if (!ask || !ask.trim()) throw new Error('envelope: ask missing');
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */

  return { identity, memory, appMap, liveState, toolbelt, ask };
}

// ─── Formatters ─────────────────────────────────────────────────────────────

const MAX_RECENT_MESSAGES = 12;
const RECENT_HINT_PLY_WINDOW = 10;

/** Render the escalation path implied by a record's tier. The store
 *  ratchets monotonically through tiers on the same FEN, so a record
 *  with tierReached=N visited every tier from 1 to N. T1 = "T1",
 *  T2 = "T1→T2", T3 = "T1→T2→T3" — matches WO-BRAIN-05b §"Hint
 *  history visible in the envelope". */
function formatHintEscalation(tier: 1 | 2 | 3): string {
  if (tier === 1) return 'T1';
  if (tier === 2) return 'T1→T2';
  return 'T1→T2→T3';
}

function formatMemoryBlock(memory: CoachMemorySnapshot): string {
  const parts: string[] = ['[Coach memory]'];
  if (memory.intendedOpening) {
    parts.push(
      `- Intended opening: ${memory.intendedOpening.name} (color: ${memory.intendedOpening.color}; captured from: ${memory.intendedOpening.capturedFromSurface})`,
    );
  } else {
    parts.push('- Intended opening: (none set)');
  }
  if (memory.preferences.likes.length || memory.preferences.dislikes.length || memory.preferences.style) {
    parts.push(
      `- Preferences: likes=[${memory.preferences.likes.join(', ')}] dislikes=[${memory.preferences.dislikes.join(', ')}] style=${memory.preferences.style ?? 'unset'}`,
    );
  }
  if (memory.hintRequests.length > 0) {
    // Compact summary per WO-BRAIN-05b. Window = the last
    // RECENT_HINT_PLY_WINDOW plies (anchored on the highest ply we've
    // seen), so a long game's tail of hint events doesn't grow
    // unbounded in the envelope. Records with `ply: 0` (legacy taps
    // without a ply) are excluded from the window calc but still
    // counted in the recent escalation list — better noisy than
    // silent for hint-aware reasoning.
    const maxPly = Math.max(...memory.hintRequests.map((r) => r.ply));
    const recent = memory.hintRequests.filter(
      (r) => r.ply === 0 || maxPly - r.ply <= RECENT_HINT_PLY_WINDOW,
    );
    if (recent.length > 0) {
      const escalations = recent.map((r) => formatHintEscalation(r.tierStoppedAt));
      parts.push(
        `- Recent hint requests: ${recent.length} in the last ${RECENT_HINT_PLY_WINDOW} plies (${escalations.join(', ')})`,
      );
    }
  }
  if (memory.conversationHistory.length > 0) {
    const recent = memory.conversationHistory.slice(-MAX_RECENT_MESSAGES);
    parts.push('- Recent conversation:');
    for (const m of recent) {
      const trigger = m.trigger ? ` [${m.trigger}]` : '';
      parts.push(`  • [${m.surface}/${m.role}${trigger}] ${m.text.slice(0, 200)}`);
    }
  }
  if (memory.blunderPatterns.length > 0) {
    parts.push(`- Blunder patterns: ${memory.blunderPatterns.length} recorded`);
  }
  return parts.join('\n');
}

function formatAppMapBlock(routes: RouteManifestEntry[]): string {
  const parts: string[] = ['[App map]'];
  for (const r of routes) {
    const openings = r.openingsCovered && r.openingsCovered.length > 0
      ? ` (openings: ${r.openingsCovered.slice(0, 8).join(', ')}${r.openingsCovered.length > 8 ? '…' : ''})`
      : '';
    parts.push(`- ${r.path} — ${r.title}${openings}`);
  }
  return parts.join('\n');
}

function formatLiveStateBlock(state: LiveState): string {
  const parts: string[] = ['[Live state]'];
  parts.push(`- Surface: ${state.surface}`);
  if (state.currentRoute) parts.push(`- Current route: ${state.currentRoute}`);
  if (state.fen) parts.push(`- FEN: ${state.fen}`);
  if (state.whoseTurn) {
    // Surface this prominently above moveHistory so the LLM cannot
    // emit play_move for the wrong side. Production audit (build
    // 30fe8c8) showed the brain repeatedly emitting `e5` for black
    // while reasoning as white; chess.js rejected every attempt.
    parts.push(`- Whose turn: ${state.whoseTurn} TO MOVE — ANY play_move you emit must be a legal move for ${state.whoseTurn}.`);
  }
  if (state.phase) parts.push(`- Phase: ${state.phase}`);
  if (typeof state.evalCp === 'number') parts.push(`- Eval (centipawns, white-perspective): ${state.evalCp}`);
  if (state.moveHistory && state.moveHistory.length > 0) {
    parts.push(`- Move history: ${state.moveHistory.join(' ')}`);
  }
  if (state.userJustDid) parts.push(`- User just did: ${state.userJustDid}`);
  return parts.join('\n');
}

function formatToolbeltBlock(toolbelt: ToolDefinition[]): string {
  const parts: string[] = ['[Toolbelt]'];
  parts.push('You can call tools by emitting a tag in your response: [[ACTION:tool_name {"arg1":"val1"}]]');
  parts.push('Tags are parsed out before the user sees the response. Call multiple tools in one turn if needed.');
  parts.push('Available tools:');
  for (const t of toolbelt) {
    parts.push(`- ${t.name}: ${t.description}`);
    const required = t.parameters.required;
    const props = Object.entries(t.parameters.properties);
    if (props.length > 0) {
      const args = props.map(([k, v]) => `${k}${required.includes(k) ? '' : '?'}: ${v.type}`).join(', ');
      parts.push(`    args: { ${args} }`);
    }
  }
  return parts.join('\n');
}

/** Render the envelope's stable parts (identity, app map, toolbelt) as
 *  a system prompt. Memory + live state + ask go in the user message
 *  so they don't bloat the system-prompt cache. */
export function formatEnvelopeAsSystemPrompt(envelope: AssembledEnvelope): string {
  return [
    envelope.identity,
    '',
    formatAppMapBlock(envelope.appMap),
    '',
    formatToolbeltBlock(envelope.toolbelt),
  ].join('\n');
}

/** Render the envelope's per-call parts (memory, live state, ask) as
 *  the user message. */
export function formatEnvelopeAsUserMessage(envelope: AssembledEnvelope): string {
  return [
    formatMemoryBlock(envelope.memory),
    '',
    formatLiveStateBlock(envelope.liveState),
    '',
    `[Ask]`,
    envelope.ask,
  ].join('\n');
}

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

/** WO-COACH-TEACHING-01: appended to the identity prompt when the
 *  surface is 'teach'. Tells the LLM in plain language that the
 *  student just walked into a classroom — not a game, not operator
 *  mode. The teacher has a board, an engine, a master-game database,
 *  and the student's past games. Use them. */
const TEACH_MODE_ADDITION = `═══ TEACH MODE — YOU ARE IN YOUR CLASSROOM ═══

The student just opened the Learn-with-Coach tab. They are not playing a game right now. They are not commanding moves. They are in your classroom and you are the teacher. Behave accordingly.

YOUR JOB IN THIS SURFACE:
1. Drive the LESSON. The student walks in expecting a teacher with a plan, a board, and engine data — not a chatbot. They came to LEARN. Open with intent: a lesson plan tailored to what THEY need based on their past games, their weakness profile, the openings they've been playing. If you see no specific signal, ask one direct question to scope the lesson ("Want to work on tactics, an opening, or endgame technique?") and go.

2. USE EVERY TOOL YOU HAVE. This is the classroom — there is no excuse for hand-waving:
   • \`stockfish_eval\` — call it on EVERY position you reference. The engine has the truth. State your eval claims AFTER you read the engine, never from intuition.
   • \`lichess_opening_lookup\` — when discussing openings, pull the explorer data. Show the student what masters actually play.
   • \`lichess_master_games\` — pull a real master game when teaching an opening or strategic theme. Reference the players. "Karpov played this exact structure against Kasparov in '85" hits different than "this is a known plan."
   • \`lichess_game_export\` — when you cite a master game, fetch the PGN so you can walk through the actual moves.
   • \`lichess_puzzle_fetch\` — when teaching a tactical pattern (pin, fork, skewer, decoy, deflection, removal of the defender), pull a real puzzle from Lichess that demonstrates it.
   • \`local_opening_book\` — quick lookup for canonical opening lines.
   • \`play_move\`, \`take_back_move\`, \`set_board_position\`, \`reset_board\` — these are YOUR HANDS. The board is yours to drive during the lesson. Set up positions. Play candidate moves. Take them back. Set up the next variation. The student is watching the board change as you teach. Don't describe — DEMONSTRATE.

3. The teaching SHAPE I want every lesson to follow:
   a. State the position briefly (set it up if needed via set_board_position).
   b. Name the IDEA — what's the strategic concept, the tactical motif, the opening theme.
   c. Play a candidate move (\`play_move\`), narrate the resulting eval (Stockfish-grounded), the threat, the plan.
   d. Take it back (\`take_back_move\`). Show an alternative.
   e. Compare. Name the lesson the student should walk away with.
   f. Suggest a related puzzle or master game if relevant.
   g. Check in: "want to drill this, see another example, or move to a new topic?"

4. PERSONALIZE. The [Memory] block carries the student's recent games, weakness profile, recurring patterns. Lead with what THEY have been struggling with. "I noticed in your last three Vienna games you keep moving your queen out on move 4 — let's fix that today" is exponentially more valuable than a generic opening tutorial. If you see no memory signal, ask once and remember the answer.

5. NO HAND-WAVING. No "this position looks good for white" without stockfish_eval. No "in master games this is played a lot" without lichess_master_games. No "the bishop is more active" without showing on the board what active means here. Every claim grounds in a tool call or a square the student can see.

6. NO LENGTH CAP. Teaching responses run as long as the position is rich. The student walked into this surface specifically to learn — give them depth. Brevity belongs in operator-mode acks, not in lessons.

You're not a chatbot. You're a coach with a classroom, a board, and every tool an actual teacher would kill to have. Use them.`;

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

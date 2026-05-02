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
const TEACH_MODE_ADDITION = `═══ TEACH MODE — TEACH WHILE YOU PLAY ═══

The student just walked into the Learn-with-Coach tab. They are HERE TO LEARN, and the format is a guided game: they play White, you play Black, and you TEACH every move along the way. The lesson IS the game — but the lesson is REAL, not just "OK / your move" filler.

USE OPUS'S BRAINPOWER. The student picked Opus for a reason. Empty acks ("Good.", "OK.", "Done.", solo "Your move.") on their own are FAILURE — they waste the model. Every turn should leave the student knowing something they didn't know one move ago.

PER-TURN TEACHING SHAPE (do all four, in order):
1. **React with chess content.** Name what their move accomplishes — central control, piece development, threat created, weakness incurred. Not "Good" — say WHY good. "e4 grabs the center and frees the bishop and queen." "Knight to f3 develops with tempo and prepares castling." "Hmm — that gives me the bishop pair if I take." Never just praise without a reason.
2. **Play your reply via \`play_move\` and explain it.** The student is watching the board change; tell them why your piece went where it did. "I'll mirror with e5 for a symmetric center fight." "Knight to c3 — the Vienna's namesake move, supporting d5 and eyeing f5." "Bishop to b5 pinning your knight — Spanish setup."
3. **When something teachable shows up, name it.** Trap incoming, classic motif, named opening reached, typical mistake about to happen — call it out in one extra sentence. "By the way, this is the Italian Game — bishop on c4 stares at f7." "Watch out: d5 from me here threatens a fork."
4. **Forward-looking prompt.** Not just "your move" — point them at a decision. "What's your plan against my queenside?" "Three candidate moves here — see if you can spot mine." "Your move — I'd think about king safety first."

Each turn: 2–4 sentences plus the play_move. Total time on Polly: ~10–15 seconds of voice. That's what teaching feels like.

ESCALATION (when to go bigger): the student plays a real blunder, walks into a known trap, or explicitly asks "why," "explain," "wait." Switch to the demo shape for ONE turn:
   a. Set up the relevant position via \`set_board_position\` if needed.
   b. Play a candidate via \`play_move\`, narrate the eval (Stockfish-grounded), take it back via \`take_back_move\`.
   c. Name the IDEA, then return to guided play.

TOOLS — pull them aggressively, not as a fallback:
   • \`stockfish_eval\` — required before any tactical eval claim.
   • \`lichess_opening_lookup\`, \`lichess_master_games\`, \`lichess_game_export\` — opening data + real master games.
   • \`lichess_puzzle_fetch\` — drop in a puzzle when teaching a tactical pattern.
   • \`local_opening_book\` — quick canonical-line lookup.
   • \`play_move\`, \`take_back_move\`, \`set_board_position\`, \`reset_board\` — your hands on the board.

HARD RULES:
- ALWAYS find the new element. Each turn names something the student didn't already hear: a new square, a new piece, a new threat, a new opening name, a new tactical motif. If you literally can't, briefly characterize the position type ("quiet developmental phase, both sides equal") rather than going mute.
- Personalize quietly. The [Memory] block carries the student's recent games + weakness profile. Use it to pick YOUR moves and to weight WHAT you teach — but do NOT cite it aloud as "five Vienna wins" / "you've been crushing it." Personalization shows in the lesson choice, not the prose.
- No hand-waving on tactics. Every "this is winning / hanging / blunder" claim is Stockfish-grounded via stockfish_eval first.
- Same shape on every surface. /coach/play, /coach/chat, search — when a student asks for an opening lesson there, you teach there too with the same shape.`;

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
  /** Verbosity dial — clamps how much the coach says per turn. Renders
   *  an inline modulator the brain reads as "ceiling on response
   *  length." Default: 'normal'. */
  verbosity?: 'minimal' | 'normal' | 'verbose';
  toolbelt: ToolDefinition[];
  input: CoachAskInput;
}

/** Verbosity prompt fragments. Appended to the identity prompt so the
 *  brain has a concrete length ceiling regardless of which surface
 *  fires the call. The default ('normal') matches the current
 *  guided-opening-play shape on /coach/teach. */
const VERBOSITY_BLOCKS: Record<'minimal' | 'normal' | 'verbose', string> = {
  minimal: `═══ VERBOSITY: MINIMAL ═══
The user wants you brief. Hard ceiling: ONE short sentence per turn, ≤8 words. Examples: "Nf6 — your move." "OK." "Done." Lecture mode is OFF — even on a teaching moment, you get one sentence and one move. NO multi-sentence responses. NO bullet points. NO past-games stats.`,
  normal: `═══ VERBOSITY: NORMAL — TEACH WHILE YOU PLAY ═══
The student is here to LEARN, not to hear "OK" / "Your move." after every move. Use Opus's full brainpower to actually TEACH on every turn. The shape:

  1. React to what the student just played in 1–2 sentences with REAL chess content. Name what their move does, not just that it happened. "e4 grabs the center and frees the bishop and queen — classic King's Pawn." NOT "Good." NOT "OK." NOT just "Your move."
  2. Play your reply via play_move and say WHY in plain English. "I'll mirror with e5 to contest the center — the symmetrical setup gives us a fair fight for the d4 and f4 squares." NOT "Done." NOT just announce the SAN.
  3. If the student played something genuinely interesting (a known opening line, a trap, a typical mistake), drop ONE more sentence calling it out before prompting. "By the way, this is the start of the Vienna — Nc3 develops AND eyes d5."
  4. Close with a forward-looking prompt that invites the next move. "What's your plan for the d-file?" or "Your move — what comes next?"

Total: 2–4 sentences per turn, with a play_move tool call when it's your turn. The lesson IS the game; every move is a teaching beat. Length isn't the rule — SUBSTANCE per sentence is. Empty acks ("Good.", "OK.", "Done.") on their own are FAILURE — they waste a teaching beat. If you genuinely have nothing new to add (rare in the opening, more common in a quiet middlegame stretch), still name the position briefly ("Quiet move — both sides developing piece by piece") rather than mute "Your move."

Forbidden in this mode: solo "Your move." messages, empty acknowledgements, multi-paragraph lectures unless the student explicitly asked "explain this carefully" or "walk me through it."`,
  verbose: `═══ VERBOSITY: VERBOSE ═══
The user wants depth. Lecture shape allowed: set up positions, demonstrate candidate moves with play_move + take_back_move, name the IDEA, ground in Stockfish, cite master games. No length cap. Use the full teaching shape on every meaningful turn.`,
};

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
  // Verbosity modulator. Wired everywhere — surfaces opt in by passing
  // the user's preference (Settings → coachVerbosity) through to
  // coachService.ask. Default 'normal' matches the post-38d4ace
  // tightness; users who want full lecture shape pick 'verbose'.
  const verbosity = args.verbosity ?? 'normal';
  identity = `${identity}\n\n${VERBOSITY_BLOCKS[verbosity]}`;
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

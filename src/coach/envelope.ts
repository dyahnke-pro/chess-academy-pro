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
import { loadIdentityPrompt } from './sources/identity';
import { readMemorySnapshot } from './sources/memory';
import { loadRoutesManifest } from './sources/routesManifest';
import { prepareLiveState } from './sources/liveState';

export interface AssembleEnvelopeArgs {
  identity?: CoachIdentity;
  toolbelt: ToolDefinition[];
  input: CoachAskInput;
}

/** Read all four sources and bundle them with the toolbelt and the
 *  caller's ask. Throws when any of the six envelope parts is missing
 *  — the constitution forbids partial envelopes. */
export function assembleEnvelope(args: AssembleEnvelopeArgs): AssembledEnvelope {
  const identity = loadIdentityPrompt(args.identity);
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
 *  so they don't bloat the system-prompt cache.
 *
 *  WO-MANDATORY-GROUNDING: when the spine pre-fetched Stockfish /
 *  Lichess data based on the question classifier, the result is
 *  prepended after the identity prompt. Per-call data, so it does
 *  break the system-prompt cache for that call — accepted as the cost
 *  of structural grounding that the LLM physically cannot ignore. */
export function formatEnvelopeAsSystemPrompt(envelope: AssembledEnvelope): string {
  const sections: string[] = [envelope.identity];
  if (envelope.groundingContext) {
    sections.push('', envelope.groundingContext);
  }
  sections.push('', formatAppMapBlock(envelope.appMap));
  sections.push('', formatToolbeltBlock(envelope.toolbelt));
  return sections.join('\n');
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

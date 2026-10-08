/**
 * coachActionDispatcher
 * ---------------------
 * Provider-agnostic action protocol for the agent coach. The LLM
 * (DeepSeek or Anthropic — same grammar both) emits structured
 * action tags inline with its prose:
 *
 *   [[ACTION:start_play {"opening":"King's Indian Attack","side":"black","narrate":true}]]
 *   [[ACTION:analyze_game {"id":"game-482"}]]
 *   [[ACTION:narrate {"text":"Watch the e-file."}]]
 *
 * The parser turns tags into tool calls (coach providers) and strips them
 * from the rendered text. The old side-effect registry that executed
 * actions straight from model prose (`dispatchActions`) lost its last
 * caller and was deleted 2026-10-08.
 */

export interface ParsedAction {
  name: string;
  args: Record<string, unknown>;
  /** Where in the original text the tag appeared (for ordering). */
  index: number;
}

export interface ParsedActionsResult {
  cleanText: string;
  actions: ParsedAction[];
}

// ─── Tag parser ─────────────────────────────────────────────────────────────

// Matches `[[ACTION:name {jsonArgs}]]` markers. The args group uses a
// non-greedy `[\s\S]*?` body and a closing-context lookahead `(?=\]\])`
// instead of the older `[^\]]*` pattern — that previous pattern silently
// dropped any tool call whose JSON args contained `]` (e.g. arrays like
// `{"speeds":["blitz","rapid"]}` for lichess_opening_lookup or
// `{"themes":["fork","pin"]}` for record_blunder), since the regex
// would fail to find the closing `}`. The new shape stops at the first
// `}` followed by `]]`, which correctly handles arrays AND nested
// objects in args.
const ACTION_TAG_RE = /\[\[ACTION:([a-z_]+)(?:\s*(\{[\s\S]*?\}))?\s*(?=\]\])\]\]/gi;

/**
 * Extract action tags from coach output and return the cleaned prose
 * (with tags removed) plus the parsed action list. Malformed JSON args
 * are dropped silently — better to skip a bad tag than crash chat.
 */
export function parseActions(text: string): ParsedActionsResult {
  const actions: ParsedAction[] = [];
  const cleanText = text.replace(ACTION_TAG_RE, (_match, name: string, jsonArgs: string | undefined, offset: number) => {
    let args: Record<string, unknown> = {};
    if (jsonArgs) {
      try {
        const parsed = JSON.parse(jsonArgs) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          args = parsed as Record<string, unknown>;
        }
      } catch {
        // Malformed args — keep the call with empty args; the consumer
        // validates its own required keys.
      }
    }
    actions.push({ name: name.toLowerCase(), args, index: offset });
    return '';
  }).replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText, actions };
}

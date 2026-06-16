/**
 * sanitizeCoachText — strips LLM directive markup so the user never
 * sees or hears it.
 *
 * The legacy agent protocol asked the model to emit inline tags like
 * `[[ACTION:name {"json":"args"}]]` which the dispatcher parsed.
 * The new architecture uses structured `tool_calls` from the provider
 * API, but DeepSeek (and occasionally Anthropic) still pattern-match
 * to the inline-tag shape. Polly was reading those aloud verbatim.
 *
 * This module is the defense-in-depth filter:
 *   1. `sanitizeCoachText` — pure function, strips markup from a full
 *      string and collapses whitespace.
 *   2. `sanitizeCoachStream` — streaming-safe variant. Returns the
 *      portion safe to emit NOW plus any pending text that contains
 *      a half-arrived marker, which the caller buffers until the next
 *      chunk closes the marker.
 *
 * Markup shapes handled:
 *   - `[[DIRECTIVE:args]]` — double-bracket form (canonical)
 *   - `[DIRECTIVE:args]`   — single-bracket legacy form
 *
 * `DIRECTIVE` is one or more uppercase letters / digits / underscores,
 * starting with a letter. `args` can be any text including JSON with
 * nested braces (`{`, `}`); the regex is non-greedy on `]]` so the
 * first matching closer terminates the marker. Single closing
 * brackets `]` inside JSON args (e.g. `[1,2,3]`) are tolerated.
 */

/** Match `[[DIRECTIVE:...args...]]` non-greedy on `]]` so multiple
 *  markers in one string strip independently. `[\s\S]` matches
 *  newlines too — the LLM sometimes wraps long tool-args across
 *  lines. */
const DOUBLE_MARKUP_RE = /\\?\[\[[A-Z][A-Z0-9_]*(?::[\s\S]*?)?\]\]/g;

/** JSON-bearing directive `[DIRECTIVE:name {…json…}]` (single OR double
 *  bracket). The generic single-bracket strip below uses `[^\]]*`, which
 *  stops at the FIRST `]` — so a tool whose JSON args carry an array
 *  (`{"moves":["e4","d4"]}`) only gets HALF-stripped and the tail leaks
 *  into the chat bubble. Production bug (David 2026-06-11): the Catalan
 *  Learn-with-Coach walkthrough rendered a raw
 *  `[ACTION:lookup_player_opening_moves {…}]` with a trailing `\`.
 *  This pattern anchors on the closing `}` that's followed by the
 *  marker's `]`, so any `]` INSIDE the JSON (arrays, nested objects) is
 *  consumed by the lazy body instead of terminating the match early.
 *  Run BEFORE the generic single-bracket strip. */
const JSON_MARKUP_RE = /\\?\[\[?[A-Z][A-Z0-9_]*:[^[\]{]*\{[\s\S]*?\}\s*\]\]?/g;

/** Legacy single-bracket form `[DIRECTIVE:args]`. `args` is `[^\]]*`
 *  because legacy tags didn't support nested `]`. */
const SINGLE_MARKUP_RE = /\\?\[[A-Z][A-Z0-9_]+:[^\]]*\]/g;

/** Board markup the LLM sometimes emits as PROSE despite the "code draws
 *  the board" rule (G0) — a "Board arrows:" / "Board highlights:" header
 *  followed by a bullet list of `from-to` (color, …) descriptions. It is
 *  NOT a `[BOARD: …]` marker, so the marker strips above miss it, and it
 *  leaked RAW to the student ("Board arrows: - c6-c6 (green, highlighting
 *  the hanging pawn)", David 2026-06-16). The board is code-derived; this
 *  prose has zero value to the reader. Strip the header + its trailing
 *  bullet block. Anchored on the "board" prefix to avoid touching legit
 *  prose that happens to contain "arrows". */
const BOARD_PROSE_RE = /(?:^|\n)[ \t]*board\s+(?:arrows?|highlights?|markers?)\s*:[^\n]*(?:\n[ \t]*[-*•][^\n]*)*/gi;

/** Conversational scaffolding the LLM tacks onto the front of
 *  responses despite explicit prompt bans. Audit 2026-05-19 (Bug I):
 *  every brief-mode response opened with "Great question" or "Let me
 *  show you" or similar filler, then the cap clipped the END off —
 *  losing the actual chess content. Strip these so the user never
 *  sees or hears the filler.
 *
 *  Patterns are case-insensitive, anchored to the start of the
 *  response. Any em-dash / colon / comma / period separator gets
 *  consumed along with the phrase. Longer phrases are listed first
 *  so "Great question —" matches before "Great". */
const SCAFFOLDING_PREFIXES: RegExp[] = [
  /^great question[\s,.\-—:!?]+/i,
  /^good question[\s,.\-—:!?]+/i,
  /^excellent question[\s,.\-—:!?]+/i,
  /^that'?s a great question[\s,.\-—:!?]+/i,
  /^interesting question[\s,.\-—:!?]+/i,
  /^nice question[\s,.\-—:!?]+/i,
  /^great[\s,.\-—:!?]+(?=[a-z])/i,
  /^excellent[\s,.\-—:!?]+(?=[a-z])/i,
  /^perfect[\s,.\-—:!?]+(?=[a-z])/i,
  /^nice[\s,.\-—:!?]+(?=[a-z])/i,
  /^awesome[\s,.\-—:!?]+(?=[a-z])/i,
  /^well done[\s,.\-—:!?]+/i,
  /^let me (show|explain|tell|walk)[^.!?\n]+[.!?]\s+/i,
  /^let'?s see[\s,.\-—:!?]+/i,
  /^so[\s,.\-—:!?]+(?=[a-z])/i,
  /^okay[\s,.\-—:!?]+(?=[a-z])/i,
  /^alright[\s,.\-—:!?]+(?=[a-z])/i,
  /^i think[\s,.\-—:!?]+/i,
  /^now[\s,.\-—:!?]+(?=[a-z])/i,
];

/** Strip scaffolding from the head of a response. Idempotent — runs
 *  multiple passes to handle stacked filler like "Great — well done,
 *  let me show you…". Exposed for callers that want to observe
 *  whether stripping fired (the chat surface emits an audit event
 *  when it does, so we can watch how often the LLM ignores the ban). */
export function stripScaffolding(text: string): {
  text: string;
  strippedCount: number;
  stripped: string[];
} {
  let out = text.trimStart();
  const stripped: string[] = [];
  for (let pass = 0; pass < 6; pass++) {
    let matched = false;
    for (const re of SCAFFOLDING_PREFIXES) {
      const m = re.exec(out);
      if (m) {
        stripped.push(m[0].trim());
        out = out.slice(m[0].length).trimStart();
        matched = true;
        break;
      }
    }
    if (!matched) break;
  }
  return { text: out, strippedCount: stripped.length, stripped };
}

/** Internal: strip markup AND collapse the runs of internal
 *  whitespace stripped tags leave behind (e.g. "X  Y" → "X Y"), but
 *  preserve a trailing space if the caller is mid-stream (don't trim
 *  the ends — splice safety across chunk boundaries depends on that
 *  trailing whitespace surviving). The full-string variant trims the
 *  ends; the streaming variant doesn't. */
function stripMarkup(text: string): string {
  return text
    .replace(DOUBLE_MARKUP_RE, '')
    // JSON-bearing tags first, so a `]` inside the args can't terminate
    // the generic single-bracket match early and leak the tail.
    .replace(JSON_MARKUP_RE, '')
    .replace(SINGLE_MARKUP_RE, '')
    // Prose "Board arrows:/highlights:" lists the LLM emits despite the
    // code-draws-the-board rule — strip before whitespace-collapse.
    .replace(BOARD_PROSE_RE, '')
    // Collapse runs of horizontal whitespace BUT preserve newlines.
    // `[ \t]+` only matches spaces/tabs so paragraph breaks survive.
    .replace(/[ \t]{2,}/g, ' ');
}

/** Strip directive markup from a complete string AND trim the ends.
 *  Use this for full chat-bubble text and for the final flush of a
 *  streaming buffer. Pure function.
 *
 *  Also strips conversational scaffolding ("Great question —", "Let
 *  me show you…", etc.) from the head — see SCAFFOLDING_PREFIXES.
 *  The prompt bans these at every verbosity, but the LLM ignores the
 *  ban; this strip is the enforcement so the user never sees the
 *  filler in the chat bubble or hears it via the voice fallback.
 *
 *  When stripping happens, fires a `scaffolding-stripped` audit so we
 *  can observe how often the LLM ignores the prompt ban — feedback
 *  signal for prompt tuning. The audit is best-effort (import is
 *  dynamic to avoid a top-level dep cycle); failures are silent. */
export function sanitizeCoachText(text: string | null | undefined): string {
  if (!text) return '';
  const noMarkup = stripMarkup(text).trim();
  const { text: noScaffolding, strippedCount, stripped } = stripScaffolding(noMarkup);
  if (strippedCount > 0) {
    void import('./appAuditor').then(({ logAppAudit }) => {
      void logAppAudit({
        kind: 'scaffolding-stripped',
        category: 'subsystem',
        source: 'sanitizeCoachText',
        summary: `stripped ${strippedCount} scaffolding opener(s): ${stripped.map((p) => `"${p.slice(0, 30)}"`).join(', ')}`,
        details: JSON.stringify({
          strippedCount,
          strippedPhrases: stripped,
          originalLength: noMarkup.length,
          cleanedLength: noScaffolding.length,
          // Cap the previews so massive responses don't bloat the audit
          // log — first 120 chars on each side gives enough context.
          originalPreview: noMarkup.slice(0, 120),
          cleanedPreview: noScaffolding.slice(0, 120),
        }),
      });
    }).catch(() => undefined);
  }
  return noScaffolding;
}

/** Defense-in-depth markup strip exposed for the TTS pipeline. Same
 *  shape as `sanitizeCoachText` but skips the trim so the caller can
 *  splice with surrounding whitespace. Used by `voiceService`'s
 *  `sanitizeForTTS` so any `[VOICE: ...]` / `[[ACTION:...]]` /
 *  `[BOARD: ...]` directive that slipped past the per-surface strip
 *  never reaches Polly verbatim. Production audit (build 6459def+)
 *  showed Polly speaking `[VOICE: Let's walk through where it all...`
 *  and `[[ACTION:play_move {...}]]` aloud — sanitizeForTTS was the
 *  single chokepoint that didn't run a markup strip. */
export function stripCoachMarkup(text: string): string {
  if (!text) return text;
  return stripMarkup(text);
}

/**
 * Prepare a sanitized prose chunk for Polly TTS. Strips formatting
 * tokens that have no spoken value (markdown bold `**word**`, italic
 * `__word__`, horizontal rules `---`, list bullets `* `, leading
 * `1.` / `2.` from numbered lists when on their own line).
 *
 * The streaming sentence dispatcher otherwise ships these tokens as
 * standalone "sentences" (Polly voices `**1.**` and `---` literally),
 * which makes the lesson sound like it stalled on a single chunk.
 */
export function formatForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Markdown bold / italic — keep the inner words, drop the markers.
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Stray bold/italic marker pairs with no inner content.
    .replace(/\*{1,3}/g, '')
    .replace(/_{2,}/g, '')
    // Horizontal rules — drop entirely.
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    // Leading list bullet on its own line: "* foo" → "foo".
    .replace(/^\s*[-*]\s+/gm, '')
    // Numbered-list leader on its own line: "1. foo" → "foo". Only
    // strip when followed by space + word so we don't eat "3.Bc4" SAN.
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Streaming-safe sanitize. The caller buffers chunk text, calls this
 *  on the buffer after each chunk arrives, and:
 *   - dispatches `result.safe` to TTS / chat (sanitized prose)
 *   - keeps `result.pending` in the buffer for the next chunk
 *
 *  Detection: find the LAST `[[` in the buffer. If a `]]` exists
 *  after that `[[`, every marker in the buffer is complete and the
 *  whole buffer is safe to sanitize. If no `]]` follows the last
 *  `[[`, the marker is in flight — return the safe prefix and hold
 *  everything from `[[` onward in `pending`.
 *
 *  Single `[` is also held back if it's at the end of the buffer
 *  (the next chunk might land another `[` to make `[[`). Same for
 *  `]` at the very end (could be the start of `]]`).
 */
export function sanitizeCoachStream(
  buffer: string | null | undefined,
): { safe: string; pending: string } {
  if (!buffer) return { safe: '', pending: '' };

  // Last `[[` open in the buffer.
  const lastDoubleOpen = buffer.lastIndexOf('[[');
  if (lastDoubleOpen !== -1) {
    const closingAfter = buffer.indexOf(']]', lastDoubleOpen);
    if (closingAfter === -1) {
      // Marker open and not yet closed — hold it. Strip markup from
      // the safe prefix but DO NOT trim/collapse whitespace; the
      // caller stitches consecutive `safe` outputs together and
      // collapsing here would eat inter-chunk spaces.
      return {
        safe: stripMarkup(buffer.slice(0, lastDoubleOpen)),
        pending: buffer.slice(lastDoubleOpen),
      };
    }
  }

  // Hold back an in-flight SINGLE-bracket directive whose closing `]`
  // hasn't streamed yet — including JSON-bearing tags
  // (`[ACTION:name {"moves":["e4"]}]`) whose args carry a `]` we must
  // NOT mistake for the terminator. Without this the partial tag flashes
  // in the bubble before the next chunk closes it.
  const openDirective = /\[[A-Z][A-Z0-9_]*:/g;
  let dm: RegExpExecArray | null;
  let lastOpen = -1;
  while ((dm = openDirective.exec(buffer)) !== null) lastOpen = dm.index;
  if (lastOpen !== -1) {
    const rest = buffer.slice(lastOpen);
    // With a `{`, the tag closes only on `}` + `]`; otherwise on the
    // first `]`.
    const closed = /\{/.test(rest) ? /\}\s*\]/.test(rest) : /\]/.test(rest);
    if (!closed) {
      return {
        safe: stripMarkup(buffer.slice(0, lastOpen)),
        pending: buffer.slice(lastOpen),
      };
    }
  }

  // No incomplete `[[`. Guard against a single `[` at the tail (next
  // chunk could complete `[[`).
  if (buffer.endsWith('[')) {
    return {
      safe: stripMarkup(buffer.slice(0, -1)),
      pending: '[',
    };
  }

  return { safe: stripMarkup(buffer), pending: '' };
}

/**
 * Sentence-end matcher used by every streaming-voice dispatcher in
 * the Coach tab. Matches one sentence + its terminator, but only
 * when the terminator is followed by whitespace or end-of-buffer
 * AND not preceded by a digit (so "+0.8" / "3.Bc4" don't false-
 * positive split into pieces).
 *
 * Audit-driven (#29): three different regexes were in use across
 * GameChatPanel, CoachChatPage, and CoachTeachPage. CoachChatPage's
 * lacked the `(?<!\d)` lookbehind, so SAN move
 * numbers ("1.", "12.") split sentences and Polly voiced "1." /
 * "Nc3 Nc6 3." as separate utterances.
 *
 * Use this regex with `RegExp.exec` in a loop; `match[1]` is the
 * full sentence including the terminator. Slice the buffer to
 * `match.index + match[1].length` after each match.
 */
export const SENTENCE_END_RE = /([^.!?\n]+(?<!\d)[.!?\n])(?=\s|$)/;

/**
 * Strip the spine's wrapped provider error from text. The Coach
 * Brain Spine returns `text: '(coach-brain provider error: <msg>)'`
 * when the underlying provider call rejects. Six call sites used
 * to inline this strip; some surfaces forgot it entirely (chat
 * pages voiced the error message verbatim).
 *
 * Returns empty string when the wrap is detected, original text
 * otherwise. Pure function.
 */
export function unwrapSpineError(text: string): string {
  return text.startsWith('(coach-brain provider error:') ? '' : text;
}

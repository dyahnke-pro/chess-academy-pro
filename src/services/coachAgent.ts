/**
 * coachAgent
 * ----------
 * Parses natural-language coach requests into structured intents the
 * UI can route on. Fast-path regexes cover the most common phrasings;
 * anything else falls through to `kind: 'qa'` which the existing
 * coach chat handles.
 *
 * Keeping a deterministic regex layer (vs. always asking the LLM)
 * means lessons start instantly and never misroute on a malformed
 * model response.
 *
 * See CLAUDE.md → "Agent Coach Pattern".
 */

export type CoachIntentKind =
  | 'continue-middlegame'
  | 'play-against'
  | 'puzzle'
  | 'walkthrough'
  | 'explain-position'
  | 'qa';

export type CoachDifficulty = 'easy' | 'medium' | 'hard' | 'auto';

export interface CoachIntent {
  kind: CoachIntentKind;
  /** Opening / theme / puzzle type extracted from the query. */
  subject?: string;
  /** Difficulty hint for play-against and puzzle sessions. */
  difficulty?: CoachDifficulty;
  /** Puzzle theme, e.g. "knight fork", "back rank". */
  theme?: string;
  /** For play-against: which colour the student wants. */
  side?: 'white' | 'black';
  /** Original raw user query. */
  raw: string;
}

const DIFFICULTY_WORDS: Record<string, CoachDifficulty> = {
  easy: 'easy',
  beginner: 'easy',
  gentle: 'easy',
  medium: 'medium',
  normal: 'medium',
  hard: 'hard',
  tough: 'hard',
  strong: 'hard',
  max: 'hard',
  maximum: 'hard',
};

function extractDifficulty(text: string): CoachDifficulty | undefined {
  const lower = text.toLowerCase();
  // "at my level" → medium is a natural-language shortcut that wouldn't
  // otherwise match the word map below.
  if (/\bat my level\b/.test(lower)) return 'medium';
  for (const [word, level] of Object.entries(DIFFICULTY_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`);
    if (re.test(lower)) return level;
  }
  return undefined;
}

function extractSide(text: string): 'white' | 'black' | undefined {
  const lower = text.toLowerCase();
  // Explicit "as black/white"
  const asMatch = lower.match(/\bas\s+(black|white)\b/);
  if (asMatch) return asMatch[1] as 'white' | 'black';
  // "I'll take/play black" or "I want black"
  const takeMatch = lower.match(
    /\bi\s*(?:'|wi)?ll\s+(?:take|play|be)\s+(black|white)\b/,
  );
  if (takeMatch) return takeMatch[1] as 'white' | 'black';
  const wantMatch = lower.match(/\bi\s+want\s+(?:to\s+play\s+)?(black|white)\b/);
  if (wantMatch) return wantMatch[1] as 'white' | 'black';
  const takeShort = lower.match(/\bi\s+take\s+(black|white)\b/);
  if (takeShort) return takeShort[1] as 'white' | 'black';
  return undefined;
}

/**
 * Parse a user query into a CoachIntent.
 *
 * Pure, synchronous, and deterministic — safe to call on every input
 * keystroke to show live intent previews in the search bar.
 */
export function parseCoachIntent(query: string): CoachIntent {
  const raw = query.trim();
  const lower = raw.toLowerCase();

  if (!raw) {
    return { kind: 'qa', raw };
  }

  // 1. "Run me through the middlegame plans" / "show me middlegame" /
  //    "continue with middlegame" etc. Also captures an optional subject
  //    like "for the Italian" / "of the Sicilian" / "in the King's Indian"
  //    so downstream resolution can find a matching DB plan instead of
  //    falling back to a generic Stockfish line.
  if (
    /(middle\s*game|middlegame)/.test(lower) &&
    /(run|walk|show|teach|plan|continue|through|explain)/.test(lower)
  ) {
    const subjectMatch =
      lower.match(/middle\s*game\b[^.?!]*?\b(?:for|of|in|from)\s+(?:the\s+)?([a-z][a-z\s'-]+)/) ||
      lower.match(/(?:for|of|in|from)\s+(?:the\s+)?([a-z][a-z\s'-]+?)\s+middle\s*game/);
    const subject = subjectMatch ? cleanSubject(subjectMatch[1]) : '';
    return {
      kind: 'continue-middlegame',
      subject: subject || undefined,
      raw,
    };
  }

  // 2. Explain-position: "explain this position", "what's happening here",
  //    "analyze the board", "break down this position", "evaluate this".
  //    Runs BEFORE play-against so phrases like "what should I do here"
  //    don't get swallowed.
  if (
    /\b(explain|analy[sz]e|evaluate|break\s+down)\b.*\b(position|board)\b/.test(lower) ||
    /\bwhat(?:'s| is)\s+(?:happening|going on)\s+here\b/.test(lower) ||
    /\bwhat\s+should\s+i\s+(?:do|play)\s+here\b/.test(lower) ||
    /\bevaluate\s+this\b/.test(lower)
  ) {
    return { kind: 'explain-position', raw };
  }

  // 3. "Play X against me" / "play against me with X" / "play the Stafford"
  //    Also covers "challenge me", "let's play".
  const playMatch =
    lower.match(/play\s+(?:the\s+)?(.+?)\s+against\s+me/) ||
    lower.match(/play\s+against\s+me(?:\s+with\s+(?:the\s+)?(.+))?/) ||
    // "let's play [,.]? [subject]" — allow comma/period between "play" and
    // the rest so "let's play, I'll take black" still routes.
    lower.match(/let'?s\s+play\b[\s,.]*(?:the\s+)?(.+)?/) ||
    lower.match(/challenge\s+me(?:\s+with\s+(?:the\s+)?(.+))?/);
  if (playMatch) {
    const rawSubject = playMatch[1] ? cleanSubject(playMatch[1]) : '';
    const side = extractSide(lower);
    const difficulty = extractDifficulty(lower) ?? 'auto';
    // Strip side/difficulty phrases from the subject so "play against me
    // as black easy" doesn't produce subject "as black easy".
    const subject = stripSideAndDifficulty(rawSubject) || undefined;
    return {
      kind: 'play-against',
      subject,
      difficulty,
      side,
      raw,
    };
  }

  // 4. Puzzle requests: "give me a knight-fork puzzle", "puzzle about pins"
  const puzzleMatch =
    lower.match(/(?:give\s+me\s+)?(?:a\s+|an\s+)?(.+?)\s+puzzle/) ||
    lower.match(/puzzle\s+(?:about|on|for)\s+(.+)/) ||
    (/^\s*(?:a\s+)?puzzle\s*$/.test(lower) ? ['puzzle', ''] : null);
  if (puzzleMatch && /puzzle/.test(lower)) {
    const theme = cleanSubject(puzzleMatch[1] || '');
    return {
      kind: 'puzzle',
      theme: theme || undefined,
      difficulty: extractDifficulty(lower),
      raw,
    };
  }

  // 5. Walkthrough requests. Ordered from most specific to least so
  //    "show me the London System opening" picks up the "opening"
  //    suffix variant first.
  const walkthroughMatch =
    lower.match(/walk\s+(?:me\s+)?through\s+(?:the\s+)?(.+)/) ||
    lower.match(/teach\s+me\s+(?:the\s+main\s+line\s+of\s+)?(?:the\s+)?(.+)/) ||
    lower.match(/show\s+me\s+(?:the\s+)?(.+?)(?:\s+opening)?$/) ||
    lower.match(/study\s+(?:the\s+)?(.+)/);
  if (walkthroughMatch) {
    const subject = cleanSubject(walkthroughMatch[1]);
    if (subject) {
      return { kind: 'walkthrough', subject, raw };
    }
  }

  // Fallthrough: treat as a regular Q&A chat message.
  return { kind: 'qa', raw };
}

/**
 * Strip trailing punctuation/filler from an extracted subject phrase.
 * Keeps multi-word subjects like "stafford gambit" intact but removes
 * trailing words like "please" and punctuation.
 */
function cleanSubject(subject: string): string {
  return subject
    .replace(/[?.!,]+$/g, '')
    .replace(/\b(please|now|today|against me|right now|real quick)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove side ("as black"), difficulty, and leftover filler from a
 * subject phrase extracted from a play-against query.
 */
function stripSideAndDifficulty(subject: string): string {
  let out = subject.toLowerCase();
  out = out.replace(
    /\bas\s+(black|white)\b|\bi\s*(?:'|wi)?ll\s+(?:take|play|be)\s+(?:black|white)\b|\bi\s+want\s+(?:to\s+play\s+)?(?:black|white)\b/gi,
    '',
  );
  for (const word of Object.keys(DIFFICULTY_WORDS)) {
    out = out.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  }
  out = out.replace(/\bat my level\b/gi, '');
  out = out.replace(/[,;.]/g, ' ').replace(/\s+/g, ' ').trim();
  // Drop trailing filler words.
  out = out.replace(/\b(with|the|a|an|please)\b\s*$/i, '').trim();
  return out;
}

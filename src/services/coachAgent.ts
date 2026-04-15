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
  for (const [word, level] of Object.entries(DIFFICULTY_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`);
    if (re.test(lower)) return level;
  }
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
  //    "continue with middlegame" etc.
  if (
    /(middle\s*game|middlegame)/.test(lower) &&
    /(run|walk|show|teach|plan|continue|through|explain)/.test(lower)
  ) {
    return { kind: 'continue-middlegame', raw };
  }

  // 2. "Play X against me" / "play against me with X" / "play the Stafford"
  const playMatch =
    lower.match(/play\s+(?:the\s+)?(.+?)\s+against\s+me/) ||
    lower.match(/play\s+against\s+me\s+with\s+(?:the\s+)?(.+)/) ||
    lower.match(/let'?s\s+play\s+(?:the\s+)?(.+)/) ||
    lower.match(/challenge\s+me\s+with\s+(?:the\s+)?(.+)/);
  if (playMatch) {
    const subject = cleanSubject(playMatch[1]);
    return {
      kind: 'play-against',
      subject: subject || undefined,
      difficulty: extractDifficulty(lower) ?? 'auto',
      raw,
    };
  }

  // 3. Puzzle requests: "give me a knight-fork puzzle", "puzzle about pins"
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

  // 4. Walkthrough requests: "walk me through the Sicilian", "teach me
  //    the London"
  const walkthroughMatch =
    lower.match(/walk\s+(?:me\s+)?through\s+(?:the\s+)?(.+)/) ||
    lower.match(/teach\s+me\s+(?:the\s+)?(.+)/) ||
    lower.match(/show\s+me\s+(?:the\s+)?(.+?)\s+opening/);
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
    .trim();
}

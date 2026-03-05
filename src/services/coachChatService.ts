import type { ChatMessage, CoachExpression, UserProfile, CoachPersonality } from '../types';

const MAX_HISTORY_PAIRS = 10;

interface ParsedAction {
  type: string;
  id: string;
}

interface ParseResult {
  cleanText: string;
  actions: ParsedAction[];
}

export function buildChatMessages(
  history: ChatMessage[],
  profile: UserProfile,
): { role: 'user' | 'assistant'; content: string }[] {
  // Take last N pairs (user+assistant) to keep token budget manageable
  const recentMessages = history.slice(-(MAX_HISTORY_PAIRS * 2));

  const profileContext = [
    `Player: ${profile.name}, ~${profile.currentRating} ELO`,
    `Level: ${profile.level}`,
    `Coach personality: ${profile.coachPersonality}`,
    profile.badHabits.filter((h) => !h.isResolved).length > 0
      ? `Known weaknesses: ${profile.badHabits.filter((h) => !h.isResolved).map((h) => h.description).join(', ')}`
      : '',
    `Skill radar: Opening ${profile.skillRadar.opening}, Tactics ${profile.skillRadar.tactics}, Endgame ${profile.skillRadar.endgame}, Calculation ${profile.skillRadar.calculation}, Memory ${profile.skillRadar.memory}`,
  ].filter(Boolean).join('\n');

  const messages: { role: 'user' | 'assistant'; content: string }[] = [];

  // Inject profile as first user context message if history is short
  if (recentMessages.length <= 2) {
    messages.push({
      role: 'user',
      content: `[Player context]\n${profileContext}\n\n${recentMessages[0]?.content ?? ''}`,
    });
    // Add remaining messages
    for (let i = 1; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      messages.push({ role: msg.role, content: msg.content });
    }
  } else {
    for (const msg of recentMessages) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  return messages;
}

export function parseActionTags(text: string): ParseResult {
  const actions: ParsedAction[] = [];
  const cleanText = text.replace(/\[ACTION:\s*(\w+):([^\]]+)\]/g, (_match, type: string, id: string) => {
    actions.push({ type, id });
    return '';
  }).trim();

  return { cleanText, actions };
}

const EXPRESSION_KEYWORDS: Record<CoachExpression, string[]> = {
  excited: ['brilliant', 'amazing', 'excellent', 'fantastic', 'incredible', 'perfect', 'superb', 'outstanding', 'wow'],
  encouraging: ['good', 'nice', 'well done', 'keep going', 'great effort', 'improving', 'progress', 'solid', 'right track'],
  disappointed: ['mistake', 'blunder', 'missed', 'wrong', 'inaccuracy', 'unfortunate', 'costly', 'should have'],
  thinking: ['let me think', 'consider', 'interesting', 'hmm', 'analyzing', 'looking at', 'complex'],
  neutral: [],
};

let lastExpressionChangeTime = 0;
const EXPRESSION_DEBOUNCE_MS = 2000;

export function detectExpression(text: string): CoachExpression {
  const now = Date.now();
  if (now - lastExpressionChangeTime < EXPRESSION_DEBOUNCE_MS) {
    return 'neutral'; // debounce
  }

  const lower = text.toLowerCase();

  for (const [expression, keywords] of Object.entries(EXPRESSION_KEYWORDS)) {
    if (expression === 'neutral') continue;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        lastExpressionChangeTime = now;
        return expression as CoachExpression;
      }
    }
  }

  return 'neutral';
}

export function resetExpressionDebounce(): void {
  lastExpressionChangeTime = 0;
}

export function getChatSystemPromptAdditions(personality: CoachPersonality): string {
  const base = `You are having a conversation with a chess student. Be helpful, engaging, and stay in character.

When you want to suggest the student try a specific drill or review, include an action tag in your response:
- [ACTION: drill_opening:opening_id] — to suggest an opening drill
- [ACTION: puzzle_theme:theme_name] — to suggest puzzle practice
- [ACTION: review_game:game_id] — to suggest reviewing a game
- [ACTION: analyse_position:fen] — to suggest analysing a position

Keep responses concise (2-4 sentences for casual chat, longer for analysis requests).
Never break character. Reference the student's profile and weaknesses naturally.`;

  const personalityAdditions: Record<CoachPersonality, string> = {
    danya: '\nBe warm and encouraging. Use "we" and "let\'s" language. Celebrate small wins.',
    kasparov: '\nBe direct and challenging. Push the student. Use short, punchy sentences.',
    fischer: '\nBe precise and exacting. Reference specific lines and theory. Demand preparation.',
  };

  return base + personalityAdditions[personality];
}

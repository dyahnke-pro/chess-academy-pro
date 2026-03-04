// All Claude API calls must go through this file only — per CLAUDE.md
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/schema';
import { SYSTEM_PROMPTS, buildChessContextMessage } from './coachPrompts';
import type { CoachTask, CoachPersonality, CoachContext } from '../types';

const MODEL_MAP: Record<CoachTask, string> = {
  move_commentary:    'claude-haiku-4-5-20251001',
  hint:               'claude-haiku-4-5-20251001',
  puzzle_feedback:    'claude-haiku-4-5-20251001',
  post_game_analysis: 'claude-sonnet-4-5-20250514',
  daily_lesson:       'claude-sonnet-4-5-20250514',
  bad_habit_report:   'claude-sonnet-4-5-20250514',
  weekly_report:      'claude-opus-4-5-20250514',
  deep_analysis:      'claude-opus-4-5-20250514',
  opening_overview:   'claude-sonnet-4-5-20250514',
};

// Offline fallback templates per personality
const OFFLINE_FALLBACKS: Record<CoachPersonality, Record<string, string>> = {
  danya: {
    default: "I'm having trouble connecting right now. Keep playing — I'll be back online soon!",
    hint: "Think about which pieces are undefended, and whether there's a forcing sequence available.",
    puzzle_feedback: "Good effort! Every puzzle teaches something. Try to identify the key tactical pattern here.",
  },
  kasparov: {
    default: "Connection lost. Train on your own. Attack something.",
    hint: "Look for forcing moves. Check, capture, threat. In that order.",
    puzzle_feedback: "Did you attack? If not, find the attack.",
  },
  fischer: {
    default: "Network unavailable. Review your opening theory in the meantime.",
    hint: "Calculate the exact line. Don't guess.",
    puzzle_feedback: "Note the exact variation. You must know these patterns cold.",
  },
};

async function getDecryptedApiKey(): Promise<string | null> {
  try {
    const profile = await db.profiles.get('main');
    if (!profile?.preferences.apiKeyEncrypted || !profile.preferences.apiKeyIv) {
      return null;
    }

    const { decryptApiKey } = await import('./cryptoService');
    return await decryptApiKey(
      profile.preferences.apiKeyEncrypted,
      profile.preferences.apiKeyIv,
    );
  } catch {
    return null;
  }
}

export async function getCoachCommentary(
  task: CoachTask,
  context: CoachContext,
  personality: CoachPersonality,
  onStream?: (chunk: string) => void,
): Promise<string> {
  const apiKey = await getDecryptedApiKey();

  if (!apiKey) {
    const fallbacks = OFFLINE_FALLBACKS[personality];
    return fallbacks[task] ?? fallbacks.default;
  }

  try {
    const client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    const systemPrompt = SYSTEM_PROMPTS[personality];
    const userMessage = buildChessContextMessage(context);
    const model = MODEL_MAP[task];

    if (onStream) {
      // Streaming response
      let fullText = '';

      const stream = client.messages.stream({
        model,
        max_tokens: 512,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            // @ts-expect-error — cache_control is a valid Anthropic extension
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      });

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          fullText += chunk.delta.text;
          onStream(chunk.delta.text);
        }
      }

      return fullText;
    } else {
      // Non-streaming response
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            // @ts-expect-error — cache_control is a valid Anthropic extension
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      });

      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    }
  } catch (error) {
    console.error('Coach API error:', error);
    const fallbacks = OFFLINE_FALLBACKS[personality];
    return fallbacks[task] ?? fallbacks.default;
  }
}

// All Claude API calls must go through this file only — per CLAUDE.md
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/schema';
import { SYSTEM_PROMPTS, buildChessContextMessage } from './coachPrompts';
import { recordApiUsage } from './coachCostService';
import type { CoachTask, CoachPersonality, CoachContext } from '../types';

const MODEL_MAP: Record<CoachTask, string> = {
  move_commentary:         'claude-haiku-4-5-20251001',
  hint:                    'claude-haiku-4-5-20251001',
  puzzle_feedback:         'claude-haiku-4-5-20251001',
  game_commentary:         'claude-haiku-4-5-20251001',
  game_opening_line:       'claude-haiku-4-5-20251001',
  post_game_analysis:      'claude-sonnet-4-5-20250514',
  daily_lesson:            'claude-sonnet-4-5-20250514',
  bad_habit_report:        'claude-sonnet-4-5-20250514',
  opening_overview:        'claude-sonnet-4-5-20250514',
  chat_response:           'claude-sonnet-4-5-20250514',
  game_post_review:        'claude-sonnet-4-5-20250514',
  position_analysis_chat:  'claude-sonnet-4-5-20250514',
  session_plan_generation: 'claude-sonnet-4-5-20250514',
  weekly_report:           'claude-opus-4-5-20250514',
  deep_analysis:           'claude-opus-4-5-20250514',
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

export async function getCoachChatResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  personality: CoachPersonality,
  systemPromptAddition: string,
  onStream?: (chunk: string) => void,
): Promise<string> {
  const apiKey = await getDecryptedApiKey();

  if (!apiKey) {
    const fallbacks = OFFLINE_FALLBACKS[personality];
    return fallbacks.default;
  }

  try {
    const client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    const systemPrompt = SYSTEM_PROMPTS[personality] + '\n\n' + systemPromptAddition;
    const model = MODEL_MAP.chat_response;

    if (onStream) {
      let fullText = '';

      const stream = client.messages.stream({
        model,
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
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

      const finalMsg = await stream.finalMessage();
      void recordApiUsage(
        'chat_response',
        model,
        finalMsg.usage.input_tokens,
        finalMsg.usage.output_tokens,
      );

      return fullText;
    } else {
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
      });

      void recordApiUsage(
        'chat_response',
        model,
        response.usage.input_tokens,
        response.usage.output_tokens,
      );

      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    }
  } catch (error) {
    console.error('Coach chat API error:', error);
    const fallbacks = OFFLINE_FALLBACKS[personality];
    return fallbacks.default;
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

      const finalMsg = await stream.finalMessage();
      void recordApiUsage(
        task,
        model,
        finalMsg.usage.input_tokens,
        finalMsg.usage.output_tokens,
      );

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
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      });

      void recordApiUsage(
        task,
        model,
        response.usage.input_tokens,
        response.usage.output_tokens,
      );

      const content = response.content[0];
      return content.type === 'text' ? content.text : '';
    }
  } catch (error) {
    console.error('Coach API error:', error);
    const fallbacks = OFFLINE_FALLBACKS[personality];
    return fallbacks[task] ?? fallbacks.default;
  }
}

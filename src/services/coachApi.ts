// All LLM API calls must go through this file only — per CLAUDE.md
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/schema';
import { SYSTEM_PROMPT, buildChessContextMessage } from './coachPrompts';
import { recordApiUsage } from './coachCostService';
import type { CoachTask, CoachContext, AiProvider } from '../types';

const DEEPSEEK_MODEL_MAP: Record<CoachTask, string> = {
  move_commentary:         'deepseek-chat',
  hint:                    'deepseek-chat',
  puzzle_feedback:         'deepseek-chat',
  game_commentary:         'deepseek-chat',
  game_opening_line:       'deepseek-chat',
  whatif_commentary:       'deepseek-chat',
  game_narrative_summary:  'deepseek-chat',
  post_game_analysis:      'deepseek-reasoner',
  daily_lesson:            'deepseek-reasoner',
  bad_habit_report:        'deepseek-reasoner',
  opening_overview:        'deepseek-reasoner',
  chat_response:           'deepseek-reasoner',
  game_post_review:        'deepseek-reasoner',
  position_analysis_chat:  'deepseek-reasoner',
  session_plan_generation: 'deepseek-reasoner',
  interactive_review:      'deepseek-reasoner',
  weakness_report:         'deepseek-reasoner',
  weekly_report:           'deepseek-reasoner',
  deep_analysis:           'deepseek-reasoner',
  model_game_annotation:   'deepseek-reasoner',
  middlegame_plan_generation: 'deepseek-reasoner',
  sideline_explanation:    'deepseek-chat',
  smart_search:            'deepseek-chat',
};

const ANTHROPIC_MODEL_MAP: Record<CoachTask, string> = {
  move_commentary:         'claude-haiku-4-5-20251001',
  hint:                    'claude-haiku-4-5-20251001',
  puzzle_feedback:         'claude-haiku-4-5-20251001',
  game_commentary:         'claude-haiku-4-5-20251001',
  game_opening_line:       'claude-haiku-4-5-20251001',
  whatif_commentary:       'claude-haiku-4-5-20251001',
  game_narrative_summary:  'claude-haiku-4-5-20251001',
  post_game_analysis:      'claude-sonnet-4-6',
  daily_lesson:            'claude-sonnet-4-6',
  bad_habit_report:        'claude-sonnet-4-6',
  opening_overview:        'claude-sonnet-4-6',
  chat_response:           'claude-sonnet-4-6',
  game_post_review:        'claude-sonnet-4-6',
  position_analysis_chat:  'claude-sonnet-4-6',
  session_plan_generation: 'claude-sonnet-4-6',
  interactive_review:      'claude-sonnet-4-6',
  weakness_report:         'claude-opus-4-6',
  weekly_report:           'claude-opus-4-6',
  deep_analysis:           'claude-opus-4-6',
  model_game_annotation:   'claude-sonnet-4-6',
  middlegame_plan_generation: 'claude-sonnet-4-6',
  sideline_explanation:    'claude-haiku-4-5-20251001',
  smart_search:            'claude-haiku-4-5-20251001',
};

// Offline fallback templates
const OFFLINE_FALLBACKS: Record<string, string> = {
  default: "I'm having trouble connecting right now. Keep playing — I'll be back online soon!",
  hint: "Think about which pieces are undefended, and whether there's a forcing sequence available.",
  puzzle_feedback: "Good effort! Every puzzle teaches something. Try to identify the key tactical pattern here.",
};

interface ProviderConfig {
  provider: AiProvider;
  apiKey: string;
}

// Keys are loaded exclusively from environment variables (set in Vercel).
// No API keys are ever stored in the browser (IndexedDB, localStorage, etc.).
function getAnthropicKey(): string | undefined {
  const key = (import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_KEY || __ANTHROPIC_KEY__) as string;
  return key || undefined;
}

function getDeepseekKey(): string | undefined {
  const key = (import.meta.env.VITE_DEEPSEEK_API_KEY || import.meta.env.DEEPSEEK_KEY || __DEEPSEEK_KEY__) as string;
  return key || undefined;
}

async function getProviderConfig(): Promise<ProviderConfig | null> {
  const deepseekKey = getDeepseekKey();
  const anthropicKey = getAnthropicKey();

  // Read only the provider preference from the profile — never read keys from the DB
  let preferredProvider: AiProvider = 'deepseek';
  try {
    const profile = await db.profiles.get('main');
    if (profile?.preferences.aiProvider) {
      preferredProvider = profile.preferences.aiProvider;
    }
  } catch {
    // If DB read fails, fall through to default preference
  }

  // Try the preferred provider first, then fall back to the other
  if (preferredProvider === 'anthropic') {
    if (anthropicKey) return { provider: 'anthropic', apiKey: anthropicKey };
    if (deepseekKey) {
      console.warn('[CoachAPI] Anthropic key not available, falling back to DeepSeek');
      return { provider: 'deepseek', apiKey: deepseekKey };
    }
  } else {
    if (deepseekKey) return { provider: 'deepseek', apiKey: deepseekKey };
    if (anthropicKey) {
      console.warn('[CoachAPI] DeepSeek key not available, falling back to Anthropic');
      return { provider: 'anthropic', apiKey: anthropicKey };
    }
  }

  console.error('[CoachAPI] No API keys configured. Set VITE_DEEPSEEK_API_KEY or VITE_ANTHROPIC_API_KEY in environment variables.');
  return null;
}

/** Get a fallback config using the OTHER provider. Returns null if no alternate key available. */
function getFallbackConfig(failedProvider: AiProvider): ProviderConfig | null {
  const anthropicKey = getAnthropicKey();
  const deepseekKey = getDeepseekKey();

  if (failedProvider === 'anthropic' && deepseekKey) {
    return { provider: 'deepseek', apiKey: deepseekKey };
  }
  if (failedProvider === 'deepseek' && anthropicKey) {
    return { provider: 'anthropic', apiKey: anthropicKey };
  }
  return null;
}

function getModel(task: CoachTask, provider: AiProvider): string {
  return provider === 'anthropic'
    ? ANTHROPIC_MODEL_MAP[task]
    : DEEPSEEK_MODEL_MAP[task];
}

// ── DeepSeek (OpenAI-compatible) ──

async function callDeepSeekStream(
  apiKey: string,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  maxTokens: number,
  onStream: (chunk: string) => void,
): Promise<string> {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
    dangerouslyAllowBrowser: true,
  });

  let fullText = '';
  const stream = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) {
      fullText += text;
      onStream(text);
    }
  }
  return fullText;
}

async function callDeepSeek(
  apiKey: string,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  maxTokens: number,
  task: string,
): Promise<string> {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages,
  });

  if (response.usage) {
    void recordApiUsage(task, model, response.usage.prompt_tokens, response.usage.completion_tokens);
  }
  return response.choices[0]?.message?.content ?? '';
}

// ── Anthropic ──

async function callAnthropicStream(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  onStream: (chunk: string) => void,
): Promise<string> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  let fullText = '';
  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages,
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullText += chunk.delta.text;
      onStream(chunk.delta.text);
    }
  }

  const finalMsg = await stream.finalMessage();
  void recordApiUsage(
    'stream',
    model,
    finalMsg.usage.input_tokens,
    finalMsg.usage.output_tokens,
  );
  return fullText;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  task: string,
): Promise<string> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages,
  });

  void recordApiUsage(task, model, response.usage.input_tokens, response.usage.output_tokens);
  const content = response.content[0];
  return content.type === 'text' ? content.text : '';
}

// ── Public API ──

async function callChatWithConfig(
  config: ProviderConfig,
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt: string,
  onStream?: (chunk: string) => void,
  task: CoachTask = 'chat_response',
  maxTokens: number = 1024,
): Promise<string> {
  const model = getModel(task, config.provider);
  if (config.provider === 'anthropic') {
    if (onStream) {
      return await callAnthropicStream(config.apiKey, model, systemPrompt, messages, maxTokens, onStream);
    }
    return await callAnthropic(config.apiKey, model, systemPrompt, messages, maxTokens, 'chat_response');
  } else {
    const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];
    if (onStream) {
      return await callDeepSeekStream(config.apiKey, model, allMessages, maxTokens, onStream);
    }
    return await callDeepSeek(config.apiKey, model, allMessages, maxTokens, 'chat_response');
  }
}

export async function getCoachChatResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPromptAddition: string,
  onStream?: (chunk: string) => void,
  task: CoachTask = 'chat_response',
  maxTokens: number = 1024,
): Promise<string> {
  const config = await getProviderConfig();
  if (!config) return '⚠️ No API key configured. Please set VITE_DEEPSEEK_API_KEY or VITE_ANTHROPIC_API_KEY in the server environment.';

  const systemPrompt = SYSTEM_PROMPT + '\n\n' + systemPromptAddition;

  try {
    return await callChatWithConfig(config, messages, systemPrompt, onStream, task, maxTokens);
  } catch (error) {
    console.warn(`[CoachAPI] ${config.provider} failed, trying fallback...`, error);
    const fallback = getFallbackConfig(config.provider);
    if (fallback) {
      try {
        return await callChatWithConfig(fallback, messages, systemPrompt, onStream, task, maxTokens);
      } catch (fallbackError) {
        console.error('[CoachAPI] Both providers failed. Primary:', error, 'Fallback:', fallbackError);
        const errMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        return `⚠️ Coach error: ${errMsg}`;
      }
    }
    console.error('[CoachAPI] Primary provider failed and no fallback available:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return `⚠️ Coach error: ${errMsg}`;
  }
}

async function callCommentaryWithConfig(
  config: ProviderConfig,
  task: CoachTask,
  userMessage: string,
  onStream?: (chunk: string) => void,
): Promise<string> {
  const model = getModel(task, config.provider);
  if (config.provider === 'anthropic') {
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: userMessage },
    ];
    if (onStream) {
      return await callAnthropicStream(config.apiKey, model, SYSTEM_PROMPT, messages, 512, onStream);
    }
    return await callAnthropic(config.apiKey, model, SYSTEM_PROMPT, messages, 1024, task);
  } else {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ];
    if (onStream) {
      return await callDeepSeekStream(config.apiKey, model, messages, 512, onStream);
    }
    return await callDeepSeek(config.apiKey, model, messages, 1024, task);
  }
}

export async function getCoachCommentary(
  task: CoachTask,
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  const config = await getProviderConfig();
  if (!config) return OFFLINE_FALLBACKS[task] ?? OFFLINE_FALLBACKS.default;

  const userMessage = buildChessContextMessage(context);

  try {
    return await callCommentaryWithConfig(config, task, userMessage, onStream);
  } catch (error) {
    console.warn(`[CoachAPI] ${config.provider} failed for ${task}, trying fallback...`, error);
    const fallback = getFallbackConfig(config.provider);
    if (fallback) {
      try {
        return await callCommentaryWithConfig(fallback, task, userMessage, onStream);
      } catch (fallbackError) {
        console.error(`[CoachAPI] Both providers failed for ${task}. Primary:`, error, 'Fallback:', fallbackError);
        return OFFLINE_FALLBACKS[task] ?? OFFLINE_FALLBACKS.default;
      }
    }
    console.error(`[CoachAPI] Primary provider failed for ${task} and no fallback available:`, error);
    return OFFLINE_FALLBACKS[task] ?? OFFLINE_FALLBACKS.default;
  }
}

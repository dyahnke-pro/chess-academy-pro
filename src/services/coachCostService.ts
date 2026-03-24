import { db } from '../db/schema';

export interface ApiUsageEntry {
  id: string;
  date: string;
  task: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

// Rough per-token pricing (USD)
const PRICING: Record<string, { input: number; output: number }> = {
  // DeepSeek
  'deepseek-chat':     { input: 0.00000027, output: 0.0000011 },
  'deepseek-reasoner': { input: 0.00000055, output: 0.00000219 },
  // Anthropic
  'claude-haiku-4-5-20251001':  { input: 0.0000008, output: 0.000004 },
  'claude-sonnet-4-6':          { input: 0.000003,  output: 0.000015 },
  'claude-sonnet-4-5-20250514': { input: 0.000003,  output: 0.000015 },
  'claude-opus-4-6':            { input: 0.000015,  output: 0.000075 },
  'claude-opus-4-5-20250514':   { input: 0.000015,  output: 0.000075 },
};

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = PRICING[model] as { input: number; output: number } | undefined;
  if (!pricing) return 0;
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

export async function recordApiUsage(
  task: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const cost = estimateCost(model, inputTokens, outputTokens);
  const entry: ApiUsageEntry = {
    id: `usage-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString().split('T')[0],
    task,
    model,
    inputTokens,
    outputTokens,
    estimatedCost: cost,
  };

  await db.meta.put({ key: `api_usage_${entry.id}`, value: JSON.stringify(entry) });

  // Update monthly spend on profile
  const profile = await db.profiles.get('main');
  if (profile) {
    const newSpend = profile.preferences.estimatedSpend + cost;
    await db.profiles.update('main', {
      preferences: { ...profile.preferences, estimatedSpend: newSpend },
    });
  }
}

export async function getMonthlySpend(): Promise<number> {
  const profile = await db.profiles.get('main');
  return profile?.preferences.estimatedSpend ?? 0;
}

export async function getBudgetStatus(): Promise<{
  spent: number;
  cap: number | null;
  percentUsed: number;
  isOverBudget: boolean;
  isNearBudget: boolean;
}> {
  const profile = await db.profiles.get('main');
  if (!profile) {
    return { spent: 0, cap: null, percentUsed: 0, isOverBudget: false, isNearBudget: false };
  }

  const spent = profile.preferences.estimatedSpend;
  const cap = profile.preferences.monthlyBudgetCap;

  if (cap === null || cap === 0) {
    return { spent, cap: null, percentUsed: 0, isOverBudget: false, isNearBudget: false };
  }

  const percentUsed = (spent / cap) * 100;
  return {
    spent,
    cap,
    percentUsed,
    isOverBudget: percentUsed >= 100,
    isNearBudget: percentUsed >= 80 && percentUsed < 100,
  };
}

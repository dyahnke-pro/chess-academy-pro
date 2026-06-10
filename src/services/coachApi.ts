// All LLM API calls must go through this file only — per CLAUDE.md
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { SYSTEM_PROMPT, buildChessContextMessage, getVerbosityInstruction } from './coachPrompts';
import { recordApiUsage } from './coachCostService';

/** Audit-instrumentation phase-1 (2026-05-19): emit a per-LLM-call
 *  token usage event so per-turn cost trends are visible in the
 *  audit log without scraping provider invoices. Paired with every
 *  recordApiUsage call so the local cost dashboard and the audit
 *  stream stay in sync. */
function emitLlmTokenUsage(
  task: string,
  model: string,
  provider: 'deepseek' | 'anthropic',
  promptTokens: number,
  completionTokens: number,
  finishReason: string | null = null,
): void {
  void logAppAudit({
    kind: 'llm-token-usage',
    category: 'subsystem',
    source: `coachApi.${provider}`,
    summary: `task=${task} model=${model} provider=${provider} in=${promptTokens} out=${completionTokens}`,
    details: JSON.stringify({
      task,
      model,
      provider,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      finishReason,
    }),
  });
}
import { lookupMasterPlay } from './masterPlayLookup';
import { assembleMoveEvalAnswer, assembleTacticsAnswer, assembleProgressAnswer, assembleMasterPlayAnswer, assemblePlanAnswer, assembleConceptAnswer, assemblePlayerGamesAnswer, assembleEndgameAnswer } from './groundedAnswer';
import { lookupTablebase } from './lichessTablebaseService';
import { detectBadHabits } from './badHabitDetector';
import { detectConceptsInText, getConcept } from './chessConceptService';
import { validateClaims, type ClaimValidationResult } from './claimValidator';
import { logAppAudit } from './appAuditor';
import { buildVerifiedPuzzleContext } from './verifiedLineLibrary';
import type { MasterPlayContext, MasterPlayResult, OpeningDbEntry } from './masterPlayTypes';
import { buildOpeningDbEntries } from './openingDbGrounding';
import { buildNarrationGroundingBlock } from './narrationGrounding';
import { buildLessonReferenceBlock } from '../data/lessons';
import type { CoachTask, CoachContext, CoachVerbosity, AiProvider } from '../types';
import type { TacticsLiveContext, LivePlayerGamesContext } from '../coach/types';

// WO-COACH-MASTER-INTEGRATION audit bridge — installs window.__masterPlayAudit
// when the audit-stream is configured, letting the Playwright audit drive
// the deployed app's services via page.evaluate. No-op for real users.
// Side-effect import keeps the audit script free of source-path knowledge.
import './masterPlayAuditBridge';

/**
 * Model routing policy
 * --------------------
 * Three tiers:
 *   CHEAP   — routine dialog, short commentary, everything high-frequency
 *   MID     — once-per-game or once-per-day analysis with meaningful depth
 *   HEAVY   — rare deep-analysis passes (weekly report, deep position work)
 *
 * Per-task choice is a deliberate cost-vs-quality tradeoff:
 *   - chat_response fires on EVERY chat turn. Kept on CHEAP because most
 *     turns are casual Q&A ("what's the idea behind Nf3?") where the
 *     MID-tier reasoner is overkill. The user can always ask "think
 *     deeper" and we can route that through MID explicitly in a future
 *     upgrade. Moving chat_response from MID to CHEAP cuts DeepSeek cost
 *     ~50% and Anthropic cost ~75% on the largest single LLM surface.
 *   - post_game_analysis / daily_lesson / bad_habit_report / opening_*
 *     / game_post_review fire once per natural event, so MID is worth
 *     the quality bump.
 *   - weakness_report / weekly_report / deep_analysis fire rarely and
 *     the output is consumed as a reference artifact — HEAVY pays off.
 */
const DEEPSEEK_MODEL_MAP: Record<CoachTask, string> = {
  // High-frequency / short outputs → CHEAP (deepseek-chat)
  move_commentary:         'deepseek-chat',
  hint:                    'deepseek-chat',
  puzzle_feedback:         'deepseek-chat',
  game_commentary:         'deepseek-chat',
  game_opening_line:       'deepseek-chat',
  whatif_commentary:       'deepseek-chat',
  game_narrative_summary:  'deepseek-chat',
  chat_response:           'deepseek-chat',  // was 'deepseek-reasoner' — biggest single cost win
  sideline_explanation:    'deepseek-chat',
  smart_search:            'deepseek-chat',
  explore_reaction:        'deepseek-chat',
  intent_classify:         'deepseek-chat',
  // Kid-mode puzzle annotation — short, neutral, JSON-shaped prose.
  // Routed via getKidLlmResponse (skipPersonality=true) — see CLAUDE.md
  // "Kids section non-negotiables".
  kid_puzzle_gen:          'deepseek-chat',

  // Per-event analysis → MID (deepseek-reasoner)
  post_game_analysis:      'deepseek-reasoner',
  daily_lesson:            'deepseek-reasoner',
  bad_habit_report:        'deepseek-reasoner',
  opening_overview:        'deepseek-reasoner',
  game_post_review:        'deepseek-reasoner',
  position_analysis_chat:  'deepseek-reasoner',
  session_plan_generation: 'deepseek-reasoner',
  // interactive_review → deepseek-chat (NOT reasoner). Audit log build
  // 83233ab proved that deepseek-reasoner with max_tokens=420 consumes
  // all 420 tokens on hidden `reasoning_content` (1400+ chars of CoT)
  // for per-move commentary, leaving 0-20 tokens for visible `content`
  // — every llm-response audit showed `finishReason="length"`,
  // `completionTokens=420`, `reasoningContentLength≈1400`, content
  // empty or truncated mid-sentence ("Now it's you"). Per-move
  // narration is conversational coaching prose, not analysis — it
  // doesn't benefit from chain-of-thought. The Anthropic side already
  // uses non-reasoning Sonnet for the same task (see ANTHROPIC_MODEL_MAP
  // below). Moving DeepSeek to deepseek-chat eliminates the wasted
  // reasoning budget; the same 420 max_tokens now produces ~1500 chars
  // of actual narration.
  interactive_review:      'deepseek-chat',
  model_game_annotation:   'deepseek-reasoner',
  middlegame_plan_generation: 'deepseek-reasoner',

  // Rare deep-dive outputs → still reasoner (DeepSeek has no heavier tier)
  weakness_report:         'deepseek-reasoner',
  weekly_report:           'deepseek-reasoner',
  deep_analysis:           'deepseek-reasoner',
};

const ANTHROPIC_MODEL_MAP: Record<CoachTask, string> = {
  // High-frequency / short outputs → CHEAP (Haiku)
  move_commentary:         'claude-haiku-4-5-20251001',
  hint:                    'claude-haiku-4-5-20251001',
  puzzle_feedback:         'claude-haiku-4-5-20251001',
  game_commentary:         'claude-haiku-4-5-20251001',
  game_opening_line:       'claude-haiku-4-5-20251001',
  whatif_commentary:       'claude-haiku-4-5-20251001',
  game_narrative_summary:  'claude-haiku-4-5-20251001',
  // chat_response runs on Sonnet 4.6 because chat is where TEACHING
  // happens (in-game ask, standalone chat, /coach/teach lesson surface).
  // Haiku is fast but formulaic; Sonnet does the creative leaps a real
  // coach makes — pattern naming, opening trap callouts, "if you do X,
  // I respond Y" multi-step walkthroughs. Per-move live narration
  // (interactive_review task) stays on Haiku for speed; chat depth
  // beats chat speed for teaching surfaces.
  chat_response:           'claude-sonnet-4-6',
  sideline_explanation:    'claude-haiku-4-5-20251001',
  smart_search:            'claude-haiku-4-5-20251001',
  explore_reaction:        'claude-haiku-4-5-20251001',
  intent_classify:         'claude-haiku-4-5-20251001',
  // Kid-mode puzzle annotation — Haiku is plenty for neutral kid-safe
  // hint text. Same isolation contract as DEEPSEEK_MODEL_MAP above.
  kid_puzzle_gen:          'claude-haiku-4-5-20251001',

  // Per-event analysis → MID (Sonnet)
  post_game_analysis:      'claude-sonnet-4-6',
  daily_lesson:            'claude-sonnet-4-6',
  bad_habit_report:        'claude-sonnet-4-6',
  opening_overview:        'claude-sonnet-4-6',
  game_post_review:        'claude-sonnet-4-6',
  position_analysis_chat:  'claude-sonnet-4-6',
  session_plan_generation: 'claude-sonnet-4-6',
  interactive_review:      'claude-haiku-4-5-20251001',
  model_game_annotation:   'claude-sonnet-4-6',
  middlegame_plan_generation: 'claude-sonnet-4-6',

  // Rare deep-dive outputs → HEAVY (Opus)
  weakness_report:         'claude-opus-4-6',
  weekly_report:           'claude-opus-4-6',
  deep_analysis:           'claude-opus-4-6',
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
  /** User-selected per-category model overrides from Settings →
   *  Provider Settings (preferredModel.commentary / .analysis /
   *  .reports). When unset, falls back to the per-task defaults in
   *  ANTHROPIC_MODEL_MAP / DEEPSEEK_MODEL_MAP. Lets the user pin
   *  Opus for thinking + Haiku for short prose without us hard-coding
   *  the choice. */
  preferredModel?: { commentary: string; analysis: string; reports: string };
}

/** Maps each `CoachTask` to one of three user-facing categories so the
 *  preferredModel preference (Settings → Provider) actually flows
 *  through to the wire. Today every Anthropic call hardcoded Sonnet 4.6
 *  via ANTHROPIC_MODEL_MAP regardless of what the user picked — this
 *  is the bridge.
 *
 *  - 'commentary' → quick, high-frequency prose (per-move chat,
 *    hint, puzzle reaction, intent classification, smart-search
 *    autocomplete). The "language center."
 *  - 'analysis'   → reasoning-heavy turns (the chat brain, position
 *    deep-dives, opening overviews, plan generation, /coach/teach
 *    lesson turns). The "thought process."
 *  - 'reports'    → rare deep artifacts read as references (weakness
 *    report, weekly digest, deep_analysis, bad-habit summary).
 */
const TASK_CATEGORY: Record<CoachTask, 'commentary' | 'analysis' | 'reports'> = {
  move_commentary:           'commentary',
  hint:                      'commentary',
  puzzle_feedback:           'commentary',
  game_commentary:           'commentary',
  game_opening_line:         'commentary',
  whatif_commentary:         'commentary',
  game_narrative_summary:    'commentary',
  sideline_explanation:      'commentary',
  smart_search:              'commentary',
  explore_reaction:          'commentary',
  intent_classify:           'commentary',
  kid_puzzle_gen:            'commentary',
  interactive_review:        'commentary',
  chat_response:             'analysis',
  position_analysis_chat:    'analysis',
  opening_overview:          'analysis',
  game_post_review:          'analysis',
  post_game_analysis:        'analysis',
  daily_lesson:              'analysis',
  session_plan_generation:   'analysis',
  model_game_annotation:     'analysis',
  middlegame_plan_generation:'analysis',
  bad_habit_report:          'reports',
  weakness_report:           'reports',
  weekly_report:             'reports',
  deep_analysis:             'reports',
};

// LLM keys NEVER ship to the client (incident 2026-06-09: the baked key was
// scraped from the bundle and siphoned). Provider calls go through the
// first-party proxy `/api/llm/{deepseek,anthropic}` (api/llm-proxy.ts), which
// injects the real key SERVER-SIDE from process.env. The client only needs a
// non-empty sentinel so the SDKs construct and the provider-reachability /
// fallback logic in getProviderConfig still treats both providers as
// available (the server decides real availability — a missing key there
// returns 503 and the existing fallback chain switches providers).
const PROXY_SENTINEL_KEY = 'proxy';

/** Absolute origin for our `/api` proxy. Under Capacitor (WKWebView, origin
 *  `capacitor://…`) we must hit the deployed prod host; on web + dev we use
 *  the page origin (vite dev proxies `/api/*` to prod). Mirrors
 *  `voiceService.getTtsUrl`. */
const VERCEL_ORIGIN = 'https://chess-academy-pro.vercel.app';
function apiOrigin(): string {
  if (typeof window === 'undefined') return VERCEL_ORIGIN;
  if (window.location.protocol === 'capacitor:') return VERCEL_ORIGIN;
  return window.location.origin;
}
const DEEPSEEK_PROXY_BASE = `${apiOrigin()}/api/llm/deepseek`;
const ANTHROPIC_PROXY_BASE = `${apiOrigin()}/api/llm/anthropic`;

function getAnthropicKey(): string | undefined {
  return PROXY_SENTINEL_KEY;
}

function getDeepseekKey(): string | undefined {
  return PROXY_SENTINEL_KEY;
}

async function getProviderConfig(): Promise<ProviderConfig | null> {
  try {
    const anthropicEnvKey = getAnthropicKey();
    const deepseekEnvKey = getDeepseekKey();

    const profile = await db.profiles.get('main');

    // Audit-mode provider override (2026-05-19): the Playwright loop
    // audit re-runs the coach dozens of times per scenario and David
    // doesn't want to burn Anthropic API tokens on test traffic.
    // When the audit script (or any caller) sets `auditForceProvider`
    // in Dexie's `meta` table to 'deepseek' or 'anthropic',
    // `getProviderConfig` honors it for the duration of the override.
    // Real user settings are untouched — this is a per-tab / per-test
    // override that the audit script clears at teardown. Less critical
    // now that the prod default is also DeepSeek (see note below), but
    // retained as belt-and-suspenders so the audit pins the provider
    // regardless of cooldowns / key availability.
    const auditOverrideRecord = await db.meta.get('auditForceProvider');
    const auditOverride =
      auditOverrideRecord?.value === 'deepseek' || auditOverrideRecord?.value === 'anthropic'
        ? (auditOverrideRecord.value as AiProvider)
        : null;

    // DeepSeek is the primary as of 2026-05-19 (David's call: "switch
    // to deepseek tokens"). Previously Anthropic-first since 2026-05-14
    // for pedagogy reasons. The fallback chain below auto-retries on
    // Anthropic if DeepSeek 401s/429s on this single call. The
    // dead-state cooldown above means subsequent calls within the
    // next 60s skip DeepSeek entirely if we just saw it fail — avoids
    // paying the failed-primary latency on every coach interaction
    // during an extended outage. A user with ONLY an Anthropic key
    // still gets Anthropic.
    const anthropicReachable = !!anthropicEnvKey && !isProviderInCooldown('anthropic');
    const deepseekReachable = !!deepseekEnvKey && !isProviderInCooldown('deepseek');
    const provider: AiProvider = auditOverride
      ? auditOverride
      : (deepseekReachable
          ? 'deepseek'
          : (anthropicReachable
              ? 'anthropic'
              // Both keys absent OR both in cooldown — fall through to
              // whichever key exists (try-anyway over no-coach), then to
              // profile preference. Cooldown lifts on its own after 60s.
              : (deepseekEnvKey
                  ? 'deepseek'
                  : (anthropicEnvKey
                      ? 'anthropic'
                      : (profile?.preferences.aiProvider ?? 'deepseek')))));

    if (auditOverride) {
      void logAppAudit({
        kind: 'coach-llm-model-selected',
        category: 'subsystem',
        source: 'coachApi.getProviderConfig.auditOverride',
        summary: `audit-mode override forcing provider=${provider}`,
        details: JSON.stringify({ override: auditOverride, willPick: provider }),
      });
    }

    const preferredModel = profile?.preferences.preferredModel;

    if (provider === 'anthropic') {
      if (anthropicEnvKey) return { provider, apiKey: anthropicEnvKey, preferredModel };
      if (!profile?.preferences.anthropicApiKeyEncrypted || !profile.preferences.anthropicApiKeyIv) {
        if (deepseekEnvKey) return { provider: 'deepseek', apiKey: deepseekEnvKey, preferredModel };
        return null;
      }
      const { decryptApiKey } = await import('./cryptoService');
      const apiKey = await decryptApiKey(
        profile.preferences.anthropicApiKeyEncrypted,
        profile.preferences.anthropicApiKeyIv,
      );
      return { provider, apiKey, preferredModel };
    } else {
      if (deepseekEnvKey) return { provider, apiKey: deepseekEnvKey, preferredModel };
      if (!profile?.preferences.apiKeyEncrypted || !profile.preferences.apiKeyIv) {
        if (anthropicEnvKey) return { provider: 'anthropic', apiKey: anthropicEnvKey, preferredModel };
        return null;
      }
      const { decryptApiKey } = await import('./cryptoService');
      const apiKey = await decryptApiKey(
        profile.preferences.apiKeyEncrypted,
        profile.preferences.apiKeyIv,
      );
      return { provider, apiKey, preferredModel };
    }
  } catch {
    return null;
  }
}

/** Pin the provider for a single call. Used by the brain's per-surface
 *  routing (e.g. /coach/teach forces 'anthropic'). Walks the same key
 *  resolution order as `getProviderConfig` for that provider only:
 *  env key → encrypted profile key → null. NEVER falls back to the
 *  other provider — that's the caller's job via `getFallbackConfig`. */
async function getForcedProviderConfig(provider: AiProvider): Promise<ProviderConfig | null> {
  try {
    const profile = await db.profiles.get('main');
    const preferredModel = profile?.preferences.preferredModel;
    if (provider === 'anthropic') {
      const envKey = getAnthropicKey();
      if (envKey) return { provider, apiKey: envKey, preferredModel };
      if (!profile?.preferences.anthropicApiKeyEncrypted || !profile.preferences.anthropicApiKeyIv) {
        return null;
      }
      const { decryptApiKey } = await import('./cryptoService');
      const apiKey = await decryptApiKey(
        profile.preferences.anthropicApiKeyEncrypted,
        profile.preferences.anthropicApiKeyIv,
      );
      return { provider, apiKey, preferredModel };
    } else {
      const envKey = getDeepseekKey();
      if (envKey) return { provider, apiKey: envKey, preferredModel };
      if (!profile?.preferences.apiKeyEncrypted || !profile.preferences.apiKeyIv) {
        return null;
      }
      const { decryptApiKey } = await import('./cryptoService');
      const apiKey = await decryptApiKey(
        profile.preferences.apiKeyEncrypted,
        profile.preferences.apiKeyIv,
      );
      return { provider, apiKey, preferredModel };
    }
  } catch {
    return null;
  }
}

// ─── Provider dead-state cooldown ────────────────────────────────────
// When a provider call throws (auth/quota/network), record a short-TTL
// timestamp so subsequent coach interactions skip the known-dead
// provider and go straight to the fallback. Without this every call
// during an extended Anthropic outage would pay the full Anthropic
// latency (timeout/error) before the DeepSeek retry — bad UX. 60s
// balances "recover quickly from transient blips" with "don't burn
// time on a primary we just saw fail."
const PROVIDER_COOLDOWN_MS = 60_000;
const providerDeadUntil: Record<AiProvider, number> = {
  anthropic: 0,
  deepseek: 0,
};

function markProviderDead(provider: AiProvider): void {
  providerDeadUntil[provider] = Date.now() + PROVIDER_COOLDOWN_MS;
}

/** Emit a structured audit event for a provider call failure so the
 *  audit-stream captures WHY a fallback fired. Without this, the only
 *  signal on the wire is a silent jump from one `coach-llm-model-selected`
 *  to another, and the actual error (auth, quota, network, timeout) is
 *  invisible — David's 2026-05-28 incident: buddy's iPhone saw a raw
 *  Anthropic "credit balance too low" 400 dumped into the chat, and the
 *  audit had no record of what DeepSeek threw first to trigger the
 *  fallback. */
function emitProviderFailureAudit(
  role: 'primary' | 'fallback',
  provider: AiProvider,
  task: CoachTask,
  error: unknown,
): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errName = error instanceof Error ? error.name : 'Unknown';
  void import('./appAuditor').then(({ logAppAudit }) => {
    void logAppAudit({
      kind: 'coach-llm-provider-error',
      category: 'subsystem',
      source: `coachApi.${role}`,
      summary: `${role} provider=${provider} task=${task} failed: ${errMsg.slice(0, 120)}`,
      details: JSON.stringify({
        role,
        provider,
        task,
        errorName: errName,
        errorMessage: errMsg.slice(0, 1000),
      }),
    });
  }).catch(() => undefined);
}

function isProviderInCooldown(provider: AiProvider): boolean {
  return Date.now() < providerDeadUntil[provider];
}

/** Reset the dead-state cache. Test-only — production code never
 *  calls this; the timestamps decay on their own after 60s. */
export function __resetProviderCooldownsForTests(): void {
  providerDeadUntil.anthropic = 0;
  providerDeadUntil.deepseek = 0;
}

/** Get a fallback config using the OTHER provider. Returns null if no alternate key available. */
function getFallbackConfig(failedProvider: AiProvider): ProviderConfig | null {
  try {
    const anthropicEnvKey = getAnthropicKey();
    const deepseekEnvKey = getDeepseekKey();

    if (failedProvider === 'anthropic' && deepseekEnvKey) {
      return { provider: 'deepseek', apiKey: deepseekEnvKey };
    }
    if (failedProvider === 'deepseek' && anthropicEnvKey) {
      return { provider: 'anthropic', apiKey: anthropicEnvKey };
    }
    return null;
  } catch {
    return null;
  }
}

/** Tasks that drive an INTERACTIVE, realtime loop and therefore must
 *  NEVER run on a reasoning/thinking model — even when the user's
 *  per-category Settings preference picks one. `chat_response` is the
 *  live teach/in-game brain; `interactive_review` is per-move live
 *  narration. Both block the board and both feed the Coach Brain
 *  spine's 30s timeout race. See the LATENCY GUARD comment in
 *  `getModel` for the full rationale. The genuinely deep, single-shot
 *  analysis tasks (post_game_analysis, position_analysis_chat,
 *  opening_overview, reports) are NOT here — they keep the reasoner. */
const INTERACTIVE_TASKS: ReadonlySet<CoachTask> = new Set<CoachTask>([
  'chat_response',
  'interactive_review',
]);

export function getModel(
  task: CoachTask,
  provider: AiProvider,
  preferredModel?: ProviderConfig['preferredModel'],
): string {
  // 1. Honor the user's per-category preference from Settings →
  //    Provider when set. This is what makes "Opus for analysis,
  //    Haiku for commentary" actually flow through to the wire —
  //    until this layer existed, every Anthropic call was hardcoded
  //    to ANTHROPIC_MODEL_MAP[task] regardless of Settings.
  // 2. Validate that the preferred model is compatible with the
  //    active provider — Anthropic models start with "claude-",
  //    DeepSeek models start with "deepseek-". If the user picked
  //    an Anthropic model but we're falling back to DeepSeek (or
  //    vice versa), use the per-task default for the active provider
  //    so we don't send a "claude-opus-4-6" string to DeepSeek.
  if (preferredModel) {
    const category = TASK_CATEGORY[task];
    const userChoice = preferredModel[category];
    if (userChoice) {
      const isAnthropicModel = userChoice.startsWith('claude-');
      const isDeepSeekModel = userChoice.startsWith('deepseek-');
      const compatible =
        (provider === 'anthropic' && isAnthropicModel) ||
        (provider === 'deepseek' && isDeepSeekModel);
      // 3. LATENCY GUARD — the live chat brain (`chat_response`: in-game
      //    ask + /coach/teach step-by-step move turns) and per-move live
      //    narration (`interactive_review`) are real-time; the board waits
      //    on them. A reasoning/thinking model adds 5-15s per turn across
      //    up to 4 tool round-trips (David 2026-06-02: "the board is taking
      //    way too long to reset after my opponent's move") AND blows past
      //    the Coach Brain spine's 30s race → "coach-brain-deepseek-timeout".
      //    Reasoner also burns the max_tokens budget on hidden
      //    reasoning_content (truncated visible content — the documented
      //    interactive_review failure) and 400s on a forced tool_choice
      //    ("Thinking mode does not support this tool_choice"). So even when
      //    the user's category pick is a reasoner, these tasks use the fast
      //    per-task default. The reasoner pick still governs the genuinely
      //    deep, single-shot tasks (post_game_analysis, position_analysis_chat,
      //    opening_overview, reports). This also restores the deliberate
      //    `chat_response → deepseek-chat` default (DEEPSEEK_MODEL_MAP:
      //    "biggest single cost win").
      if (compatible && !(INTERACTIVE_TASKS.has(task) && isReasoningModel(userChoice))) {
        return userChoice;
      }
    }
  }
  return provider === 'anthropic'
    ? ANTHROPIC_MODEL_MAP[task]
    : DEEPSEEK_MODEL_MAP[task];
}

/** "Reasoning"/"thinking" models (deepseek-reasoner, Claude extended-
 *  thinking variants) run in a mode that REJECTS a forced `tool_choice`
 *  — DeepSeek returns `400 Thinking mode does not support this
 *  tool_choice`, and Anthropic extended-thinking only permits
 *  `tool_choice: auto`. */
function isReasoningModel(model: string): boolean {
  return /reasoner|thinking/i.test(model);
}

/** Resolve a model that is guaranteed to accept a forced `tool_choice`
 *  for structured tool-use calls. If the task/user-preference resolves
 *  to a reasoning model, swap in the provider's default — and if that
 *  default is itself a reasoner, pin the known tool-capable base model.
 *
 *  Without this, a user whose Settings → Provider analysis pick is
 *  `deepseek-reasoner` makes EVERY structured call (walkthrough
 *  narration, drill/findMove/punish labels) 400 and silently fall back
 *  to generic template prose. */
export function toolCapableModel(task: CoachTask, provider: AiProvider, model: string): string {
  if (!isReasoningModel(model)) return model;
  const fallback = provider === 'anthropic' ? ANTHROPIC_MODEL_MAP[task] : DEEPSEEK_MODEL_MAP[task];
  if (isReasoningModel(fallback)) {
    return provider === 'anthropic' ? 'claude-sonnet-4-6' : 'deepseek-chat';
  }
  return fallback;
}

// ── DeepSeek (OpenAI-compatible) ──

async function callDeepSeekStream(
  apiKey: string,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  maxTokens: number,
  onStream: (chunk: string) => void,
  task: string = 'chat_response',
): Promise<string> {
  emitCoachLlmCallAudit({ grounded: task === 'grounded_voice', intent: task });
  const client = new OpenAI({
    apiKey,
    baseURL: DEEPSEEK_PROXY_BASE,
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

/** Module-level scratch space for the last DeepSeek response's metadata.
 *  Audit-only; read synchronously by callers right after their await on
 *  getCoachChatResponse so the call→read pair runs in one event-loop
 *  tick (no interleaving). Captures finish_reason and reasoning_content
 *  length — the two fields the previous return-string-only contract
 *  was discarding. Lets the coachMoveCommentary path log a definitive
 *  llm-response audit instead of inferring "empty content + normal
 *  latency = ???". */
export interface LastLlmMetadata {
  provider: 'deepseek' | 'anthropic';
  model: string;
  finishReason: string | null;
  reasoningContentLength: number;
  promptTokens: number | null;
  completionTokens: number | null;
}

let lastLlmMetadata: LastLlmMetadata | null = null;

/** Read the metadata from the most recent LLM call. Resets to null
 *  after read so a stale value can't leak across unrelated callers. */
export function consumeLastLlmMetadata(): LastLlmMetadata | null {
  const m = lastLlmMetadata;
  lastLlmMetadata = null;
  return m;
}

async function callDeepSeek(
  apiKey: string,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  maxTokens: number,
  task: string,
): Promise<string> {
  emitCoachLlmCallAudit({ grounded: task === 'grounded_voice', intent: task });
  const client = new OpenAI({
    apiKey,
    baseURL: DEEPSEEK_PROXY_BASE,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages,
  });

  if (response.usage) {
    void recordApiUsage(task, model, response.usage.prompt_tokens, response.usage.completion_tokens);
    emitLlmTokenUsage(task, model, 'deepseek', response.usage.prompt_tokens, response.usage.completion_tokens, response.choices[0]?.finish_reason ?? null);
  }
  const choice = response.choices[0];
  // DeepSeek-reasoner emits `reasoning_content` separately from
  // `content` — the chain-of-thought is hidden from the caller but
  // shares the `max_tokens` budget. When max_tokens is too small for
  // both, content can be empty even though the call succeeded. We
  // capture the length here so coachMoveCommentary's audit can name
  // the failure mode.
  const message = choice?.message as { content?: string | null; reasoning_content?: string | null } | undefined;
  const reasoningContent = message?.reasoning_content;
  lastLlmMetadata = {
    provider: 'deepseek',
    model,
    finishReason: choice?.finish_reason ?? null,
    reasoningContentLength: typeof reasoningContent === 'string' ? reasoningContent.length : 0,
    promptTokens: response.usage?.prompt_tokens ?? null,
    completionTokens: response.usage?.completion_tokens ?? null,
  };
  return message?.content ?? '';
}

// ── Anthropic ──

async function callAnthropicStream(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  onStream: (chunk: string) => void,
  task: string = 'chat_response',
): Promise<string> {
  emitCoachLlmCallAudit({ grounded: task === 'grounded_voice', intent: task });
  const client = new Anthropic({
    apiKey,
    baseURL: ANTHROPIC_PROXY_BASE,
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
  emitLlmTokenUsage('stream', model, 'anthropic', finalMsg.usage.input_tokens, finalMsg.usage.output_tokens, finalMsg.stop_reason ?? null);
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
  emitCoachLlmCallAudit({ grounded: task === 'grounded_voice', intent: task });
  const client = new Anthropic({
    apiKey,
    baseURL: ANTHROPIC_PROXY_BASE,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages,
  });

  void recordApiUsage(task, model, response.usage.input_tokens, response.usage.output_tokens);
  emitLlmTokenUsage(task, model, 'anthropic', response.usage.input_tokens, response.usage.output_tokens, response.stop_reason ?? null);
  const content = response.content[0];
  return content.type === 'text' ? content.text : '';
}

/** Force the LLM to emit a structured JSON object matching the
 *  given input schema by defining a tool and using `tool_choice` to
 *  require the LLM call it. The API enforces schema validation
 *  server-side, so the returned object is guaranteed to be valid
 *  JSON of the right shape — no client-side parse errors possible.
 *
 *  Production audit (build e86aa19): "THIS IS GETTING OLD" — the
 *  LLM kept emitting structurally broken JSON for niche openings
 *  (Najdorf, Pirc, Blackburne-Kostić) and our parse-recovery
 *  pipeline couldn't catch all edge cases. Tool-use eliminates the
 *  parse problem at the source. Returns the tool's input as an
 *  unknown so the caller can validate field shapes (we still need
 *  to assertTreeShape for our own invariants).
 *
 *  Throws if the API doesn't return a tool_use block (network error,
 *  rate limit, etc.). */
export async function callAnthropicWithTool(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  task: string,
  toolName: string,
  toolDescription: string,
  inputSchema: Record<string, unknown>,
): Promise<unknown> {
  emitCoachLlmCallAudit({ grounded: false, intent: task });
  const client = new Anthropic({
    apiKey,
    baseURL: ANTHROPIC_PROXY_BASE,
    dangerouslyAllowBrowser: true,
  });
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages,
    tools: [
      {
        name: toolName,
        description: toolDescription,
        // SDK types want a specific shape; cast through unknown so
        // the caller can pass any JSON Schema sub-tree.
        input_schema: inputSchema as unknown as { type: 'object' },
      },
    ],
    // Force the model to call THIS tool and only this tool. No prose,
    // no choice — the API validates the input matches input_schema.
    tool_choice: { type: 'tool', name: toolName },
  });
  void recordApiUsage(task, model, response.usage.input_tokens, response.usage.output_tokens);
  emitLlmTokenUsage(task, model, 'anthropic', response.usage.input_tokens, response.usage.output_tokens, response.stop_reason ?? null);
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === toolName) {
      return block.input;
    }
  }
  throw new Error(
    `Anthropic API returned no tool_use block for tool "${toolName}" — got ${response.content.map((b) => b.type).join(',')}`,
  );
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
  const model = getModel(task, config.provider, config.preferredModel);
  // Audit which model actually went out on the wire so you can verify
  // Settings → preferredModel is being honored. Joins to brain trips
  // by timestamp.
  void import('./appAuditor').then(({ logAppAudit }) => {
    void logAppAudit({
      kind: 'coach-llm-model-selected',
      category: 'subsystem',
      source: 'coachApi.callChatWithConfig',
      summary: `task=${task} category=${TASK_CATEGORY[task]} model=${model} provider=${config.provider}`,
      details: JSON.stringify({
        task,
        category: TASK_CATEGORY[task],
        model,
        provider: config.provider,
        userPick: config.preferredModel?.[TASK_CATEGORY[task]] ?? null,
      }),
    });
  }).catch(() => undefined);
  if (config.provider === 'anthropic') {
    if (onStream) {
      return await callAnthropicStream(config.apiKey, model, systemPrompt, messages, maxTokens, onStream, task);
    }
    return await callAnthropic(config.apiKey, model, systemPrompt, messages, maxTokens, task);
  } else {
    const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];
    if (onStream) {
      return await callDeepSeekStream(config.apiKey, model, allMessages, maxTokens, onStream, task);
    }
    return await callDeepSeek(config.apiKey, model, allMessages, maxTokens, task);
  }
}

async function getCoachVerbosity(): Promise<CoachVerbosity> {
  const profile = await db.profiles.get('main');
  return profile?.preferences.coachVerbosity ?? 'unlimited';
}

function buildSystemPromptWithVerbosity(base: string, verbosity: CoachVerbosity, addition?: string): string {
  const parts = [base];
  const verbosityInstr = getVerbosityInstruction(verbosity);
  if (verbosityInstr) parts.push(verbosityInstr);
  if (addition) parts.push(addition);
  return parts.join('\n\n');
}

/** DeepSeek tool-use via OpenAI-compatible function calling. The
 *  LLM is forced to invoke the named function and the API validates
 *  the arguments against the schema. Mirrors callAnthropicWithTool
 *  for the DeepSeek path so we have a free fallback when Anthropic
 *  is unavailable / rate-limited. DeepSeek returns the tool's
 *  arguments as a JSON STRING in tool_calls[].function.arguments;
 *  we JSON.parse that string and return the object. */
export async function callDeepseekWithTool(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
  task: string,
  toolName: string,
  toolDescription: string,
  inputSchema: Record<string, unknown>,
): Promise<unknown> {
  emitCoachLlmCallAudit({ grounded: false, intent: task });
  const client = new OpenAI({
    apiKey,
    baseURL: DEEPSEEK_PROXY_BASE,
    dangerouslyAllowBrowser: true,
  });
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    tools: [
      {
        type: 'function',
        function: {
          name: toolName,
          description: toolDescription,
          parameters: inputSchema as unknown as Record<string, unknown>,
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: toolName } },
  });
  if (response.usage) {
    void recordApiUsage(task, model, response.usage.prompt_tokens, response.usage.completion_tokens);
    emitLlmTokenUsage(task, model, 'deepseek', response.usage.prompt_tokens, response.usage.completion_tokens, response.choices[0]?.finish_reason ?? null);
  }
  const choice = response.choices[0];
  const toolCall = choice?.message?.tool_calls?.[0];
  // The OpenAI SDK union types tool_call as function | custom. We
  // only emit `function` tools so narrow on `type === 'function'`.
  if (!toolCall || toolCall.type !== 'function' || toolCall.function.name !== toolName) {
    const got = toolCall && toolCall.type === 'function' ? toolCall.function.name : 'none';
    throw new Error(
      `DeepSeek API returned no matching tool_call for "${toolName}" — got ${got}`,
    );
  }
  // DeepSeek emits `arguments` as a JSON string. Parse here; let
  // exceptions propagate so the caller can decide to fall back.
  return JSON.parse(toolCall.function.arguments);
}

/** Top-level helper for tool-use generation. Tries Anthropic first —
 *  Sonnet/Haiku schema-validate tool calls more reliably than DeepSeek
 *  and chess pedagogy quality is better. Falls back to DeepSeek on
 *  any failure (no Anthropic key, network error, schema rejection,
 *  quota). The dead-state cooldown skips Anthropic for 60s after a
 *  failure so subsequent calls go straight to DeepSeek. CLAUDE.md
 *  2026-05-14: Anthropic-primary across the app. */
export async function getCoachStructuredResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt: string,
  task: CoachTask,
  maxTokens: number,
  toolName: string,
  toolDescription: string,
  inputSchema: Record<string, unknown>,
): Promise<unknown> {
  let lastErr: unknown = null;
  if (!isProviderInCooldown('anthropic')) {
    const anthropicConfig = await getForcedProviderConfig('anthropic');
    if (anthropicConfig) {
      try {
        const model = toolCapableModel(
          task,
          anthropicConfig.provider,
          getModel(task, anthropicConfig.provider, anthropicConfig.preferredModel),
        );
        return await callAnthropicWithTool(
          anthropicConfig.apiKey,
          model,
          systemPrompt,
          messages,
          maxTokens,
          task,
          toolName,
          toolDescription,
          inputSchema,
        );
      } catch (err) {
        lastErr = err;
        markProviderDead('anthropic');
        // Fall through to DeepSeek.
      }
    }
  }
  const deepseekConfig = await getForcedProviderConfig('deepseek');
  if (deepseekConfig) {
    const model = toolCapableModel(
      task,
      deepseekConfig.provider,
      getModel(task, deepseekConfig.provider, deepseekConfig.preferredModel),
    );
    try {
      return await callDeepseekWithTool(
        deepseekConfig.apiKey,
        model,
        systemPrompt,
        messages,
        maxTokens,
        task,
        toolName,
        toolDescription,
        inputSchema,
      );
    } catch (err) {
      markProviderDead('deepseek');
      throw err;
    }
  }
  if (lastErr) {
    throw lastErr instanceof Error
      ? lastErr
      : new Error(typeof lastErr === 'string' ? lastErr : JSON.stringify(lastErr));
  }
  throw new Error('No API key configured for tool-use call (neither DeepSeek nor Anthropic)');
}

// ─── WO-COACH-MASTER-INTEGRATION — master-play grounding (Layers B + D) ─
//
// The four-layer grounding pipeline (CLAUDE.md G3 runtime instrument)
// hangs off `getCoachChatResponse` via the optional `grounding` parameter.
// Surfaces that want grounding pass a `MasterGroundingOptions` block; the
// function detects move-question intent on the latest user message,
// pre-injects master-play context from the cache (Layer B), then
// validates the LLM's output against that context (Layer D) and retries
// up to twice before falling back to the stock "I can't verify" response.
//
// Layer A (watcher prefetch) is invoked by the surface's
// `useMasterPlayWatcher` hook — it runs ahead of every chat turn, so by
// the time pre-injection asks the cache for the current FEN, the data is
// almost always already there. Layer C (LLM-driven tool call for follow-
// up positions) is deferred to a follow-up PR; the watcher's look-ahead
// pass already covers the practical "and if I play X?" follow-ups by
// pre-injecting the top-3 child positions alongside the current one.

/** Surfaces that want master-play grounding pass this block. The
 *  function decides INTERNALLY whether to engage (intent detector +
 *  context availability) — surfaces don't need to gate the call. */
export interface MasterGroundingOptions {
  /** The FEN the user is currently looking at. When undefined, Layer B
   *  skips: nothing to ground against. The watcher's prefetch is also
   *  keyed on this FEN, so callers should pass the SAME FEN the watcher
   *  saw most recently. */
  currentFen?: string;
  /** SAN move history that led to `currentFen`. Used by the
   *  DB-grounding extension to resolve the current opening via
   *  `findOpeningByPgnPrefix` and pull canonical sub-variations from
   *  `openings-lichess.json` as a SECOND grounding source alongside
   *  the live Lichess master-play data. Optional — when omitted, the
   *  DB-grounding still works via name-based detection on the user's
   *  most recent message ("walk me through the Steinitz Gambit"
   *  surfaces the right entries with no move history needed). */
  moveHistory?: ReadonlyArray<string>;
  /** Ground-truth SANs for surfaces analyzing a SPECIFIC played game
   *  (game review): the full list of moves actually played, chess.js-
   *  validated. When present, the grounding pipeline treats these moves
   *  — PLUS the legal moves of `currentFen` — as grounded, so the claim
   *  validator no longer flags the game's own moves (and engine-suggested
   *  legal alternatives at the reviewed position) as ungrounded SAN
   *  hallucinations. This is the fix for the review-surface false-positive
   *  storm: a game that left master book (a sacrifice / sharp middlegame)
   *  has no Lichess explorer data, so every concrete SAN the coach
   *  mentioned about the student's game tripped the validator and the
   *  answer stocked out. The legal-move expansion is GATED on this field
   *  being set — surfaces that leave it undefined (opening teaching, "what
   *  do masters play") keep the strict master-play-only SAN gate, where
   *  "no master data → flag every SAN" is the intended contract. */
  gameSans?: ReadonlyArray<string>;
  /** Player display names grounded THIS turn by the player-games tools
   *  (lookup_player_games / lookup_player_opening_moves). When teaching
   *  "how <pro> plays X", the brain must name the player; the entity
   *  claim-validator would otherwise flag it ("mentions Carlsen but no
   *  topGames attribution") and stock-out the lesson. Listing the
   *  grounded player here tells the validator that name is attributed.
   *  Same escape hatch as `gameSans` for moves. (Prod bug 2026-06-02.) */
  groundedPlayers?: ReadonlyArray<string>;
  /** Step-by-step MOVE NARRATION turn (the engine-driven Learn reply / a
   *  "I played X. Your move." report). The coach is narrating a played move +
   *  its ideas, naming tactical continuations a ply or two ahead — TEACHING,
   *  not a "masters play X" claim. When set, the bare-SAN gate is skipped for
   *  this turn (the G6 arrow validator still board-verifies every SAN, and the
   *  percentage / count / player / comparative guards stay on `hasMasterData`).
   *  See `LiveState.moveNarration`. (David's iPhone + deep audit, 2026-06-04:
   *  deep Learn games stocked out ~half their turns on real recaptures the
   *  explorer's top-N for the exact FEN didn't carry.) */
  moveNarration?: boolean;
  /** PLAN / STRATEGY question turn ("give me a plan for the next three
   *  moves", "what are my main ideas here?"). A plan answer names forward
   *  moves 2-3 plies ahead that aren't legal in the current position nor in
   *  the explorer's top-N, so the bare-SAN gate flagged them and stocked
   *  out a legitimate plan question even WITH master data (the off-book
   *  carve-out only covered no-master-data positions; an opening position
   *  HAS master data — response-loop audit 2026-06-05). When set, the
   *  bare-SAN gate is skipped for this turn; the stat / count / player /
   *  comparative guards stay on `hasMasterData`, so G3's real fabrication
   *  vectors remain gated. See `LiveState`/`MasterPlayContext.planQuestion`. */
  planQuestion?: boolean;
  /** True when this turn is a BEST-MOVE / SOUNDNESS question ("what's the
   *  best move?", "is this sound?", "only one good move?"). Same carve-out
   *  as `planQuestion`: the answer names the engine's best move + the short
   *  proving line (forward SANs), so the bare-SAN gate is skipped for the
   *  turn while every fabrication guard stays in force. Detected via
   *  `isBestMoveQuestion` in coachService (David 2026-06-09 "No bueno"). */
  bestMoveQuestion?: boolean;
  /** GROUNDING INVERSION (STEP A) — the live engine snapshot, threaded from
   *  the surface (`CoachTeachPage`/play) so the chat layer can ground a
   *  best-move / eval / tactics answer in CODE and voice it through
   *  `voiceFacts` — instead of handing the LLM the board and hoping. All
   *  optional + additive: when absent, the interception falls through to the
   *  master-play top move (in-book) or the legacy reasoning path. Threading
   *  the engine move is what lets OFF-BOOK positions (no master data) ground.
   *  See docs/plans/2026-06-10-coach-chat-grounding-inversion.md. */
  /** Stockfish PV[0] in UCI (e.g. `g1f3`) for `currentFen`. The TRUE best
   *  move — preferred over the master-play top move when present. */
  engineBestMoveUci?: string;
  /** WHITE-perspective centipawn eval of `currentFen` (LiveState convention).
   *  The interception flips the sign to side-to-move POV for the assembler. */
  engineEvalCp?: number;
  /** Mate distance in plies (signed, white-positive) for `currentFen`. */
  engineMateIn?: number;
  /** STEP D Phase 3 — the engine's principal variation for a PLAN question.
   *  The plan's MOVE backbone is Stockfish's best line (real, legal, verified),
   *  voiced by assemblePlanAnswer instead of the LLM free-synthesizing a plan.
   *  Built only when the student is to move (PV[0] is the student's move). */
  enginePlan?: { pvSan: ReadonlyArray<string>; evalCp: number | null; mateIn: number | null; studentSide: 'white' | 'black' };
  /** Pre-computed tactical context for `currentFen` (forks/hanging/threats/
   *  mate-in-one) — the fact source for STEP B's tactics/danger answers. */
  tactics?: TacticsLiveContext;
  /** STEP B — true when this turn is a TACTICS / DANGER question ("anything
   *  hanging?", "what's the threat?", "fork here?"). The answer is COMPUTED
   *  from `tactics` (assembleTacticsAnswer) and voiced via voiceFacts. */
  tacticsQuestion?: boolean;
  /** STEP B — true when this turn is a STUDENT-PROGRESS question ("am I
   *  improving?", "what should I work on?"). The answer is the student's OWN
   *  bad-habit profile (assembleProgressAnswer), voiced via voiceFacts. Needs
   *  no board, so the pipeline engages even with no `currentFen`. */
  progressQuestion?: boolean;
  /** STEP D Phase 4 — true when this turn asks how MASTERS play the position
   *  ("how do masters play this?", "most popular move?"). Voices the master-play
   *  lookup's real top moves + frequencies (assembleMasterPlayAnswer) so the LLM
   *  never fabricates a frequency. */
  masterPlayQuestion?: boolean;
  /** STEP D Phase 5 — true when this turn is a CONCEPT / DEFINITION question
   *  ("what's a fork?", "explain zwischenzug"). The answer is the injected book
   *  corpus (assembleConceptAnswer), voiced via voiceFacts — never the LLM's
   *  training memory. Needs no board. The interception confirms a real concept
   *  via `detectConceptsInText` and falls through otherwise. */
  conceptQuestion?: boolean;
  /** STEP D Phase 4 (cont) — true when this turn asks how a specific PRO plays
   *  ("how does Naroditsky play this?"). Voiced from `playerGames` (the player's
   *  real game corpus) via assemblePlayerGamesAnswer; gated on `playerGames`
   *  being present. */
  playerGamesQuestion?: boolean;
  /** The player's real-game reference corpus for the current opening (loaded by
   *  coachService from pro-game-references). The fact source for a pro-game
   *  answer — the LLM never invents a "<pro> plays X" game. */
  playerGames?: LivePlayerGamesContext;
  /** STEP D Phase 5 — true when this turn is an ENDGAME-verdict question ("can I
   *  win this?", "is this a draw?"). The interception does a syzygy tablebase
   *  lookup (≤7 pieces) and voices the verdict (assembleEndgameAnswer); falls
   *  through to the engine-eval path when the position isn't in the tablebase. */
  endgameQuestion?: boolean;
  /** Which side the STUDENT plays — so the tactics answer warns about THEIR
   *  hanging pieces. Falls back to side-to-move when absent. */
  studentColor?: 'white' | 'black';
  /** Surface route for audit attribution. Goes into every emitted
   *  audit event (`master-play-lookup`, `claim-validator-trip`, etc). */
  surface: string;
  /** Session correlator for audit attribution. */
  sessionId?: string;
  /** Force the grounding pipeline ON regardless of intent detection.
   *  Used by integration tests; production surfaces leave undefined. */
  forceEngage?: boolean;
  /** Canonical opening ID the user is studying (e.g. 'italian-game',
   *  'pro-naroditsky-caro-kann'). When set, the grounding pipeline injects
   *  pre-baked best-counter stats + a representative master game from
   *  src/services/bestCounterService so the coach has instant
   *  concept-level narration material per CLAUDE.md narration rule
   *  ('name the concept every time'). Surfaces that don't know the
   *  current openingId leave undefined — the live master-play
   *  context still grounds based on currentFen. */
  openingId?: string;
}

/** Move-question intent patterns. The detector matches the last user
 *  message against the union — any match engages Layer B. Conservative:
 *  better to engage grounding on a question that doesn't need it
 *  (cheap pass-through when context has no data) than to miss a move
 *  question and let the LLM invent. */
const MOVE_QUESTION_PATTERNS: ReadonlyArray<RegExp> = [
  /\bwhat\s+(?:should|do|would|can)\s+I\s+play\b/i,
  /\bwhat'?s?\s+the\s+(?:best|right|correct)\s+move\b/i,
  /\bwhat\s+(?:move|moves)\s+(?:should|do|does)\b/i,
  /\bwhat\s+do\s+masters\s+(?:play|do|choose)\b/i,
  /\bwhat\s+do\s+grandmasters\s+(?:play|do|choose)\b/i,
  /\bwhat\s+do\s+(?:they|pros)\s+(?:play|do|choose)\b/i,
  /\bwhat'?s?\s+(?:the\s+)?most\s+(?:popular|common|played)\b/i,
  /\bwhich\s+move\s+(?:is|wins|works|scores)\b/i,
  /\bis\s+[A-Za-z][\w-]*\s+(?:a\s+)?(?:good|bad|sound|playable|winning|losing)\b/i,
  /\b(?:should|can)\s+I\s+play\s+[A-Za-z][\w-]*\b/i,
  /\bwhat\s+happens?\s+(?:after|if\s+I\s+play)\b/i,
  // "what about Nf3?" / "what if I play exd5?" — only a MOVE-shaped
  // token engages position-grounding. Must NOT match general questions
  // like "what about the Caro-Kann?" (audit 2026-06-02: that wrongly
  // engaged master-play on the START position, the coach named Caro
  // moves …c6/…d5, the validator gated them against the start's master
  // moves, and a teaching question got the stock "run it through the
  // engine" fallback).
  /\bwhat\s+(?:about|if)\s+(?:i\s+(?:play|try)\s+)?(?:[NBRQK][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x?[a-h]?[1-8]|O-O(?:-O)?)\b/i,
  /\bbest\s+continuation\b/i,
  /\bbook\s+move\b/i,
  /\bmain\s+line\b/i,
  /\bcontinuation\s+(?:here|after)\b/i,
  /\bhow\s+do\s+(?:masters|pros|GMs)\s+continue\b/i,
];

/** Match the last user message. Returns true if any pattern fires. */
function detectMoveQuestionIntent(
  messages: ReadonlyArray<{ role: 'user' | 'assistant'; content: string }>,
): boolean {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role !== 'user') continue;
    const text = m.content;
    for (const pat of MOVE_QUESTION_PATTERNS) {
      if (pat.test(text)) return true;
    }
    return false; // Only look at the most recent user message.
  }
  return false;
}

/** Build the look-ahead set for a position. For each of the top-N
 *  master moves, apply via chess.js to get the resulting FEN, then
 *  look it up. Results are pulled from the cache when available so
 *  this method is cheap when the watcher has done its job. */
async function buildLookahead(
  fen: string,
  current: MasterPlayResult,
  surface: string,
  sessionId: string | undefined,
  maxCandidates = 3,
): Promise<MasterPlayContext['lookahead']> {
  if (current.moves.length === 0) return [];
  const top = current.moves.slice(0, maxCandidates);
  const out: MasterPlayContext['lookahead'][number][] = [];
  for (const move of top) {
    let childFen: string;
    try {
      const chess = new Chess(fen);
      const played = chess.move(move.san);
      if (!played) continue;
      childFen = chess.fen();
    } catch {
      continue;
    }
    const childResult = await lookupMasterPlay(childFen, {
      triggeredBy: 'pre-injection',
      surface,
      sessionId,
    });
    out.push({ moveFromCurrent: move.san, result: childResult });
  }
  return out;
}

/** Assemble the full master-play context for the brain. Returns
 *  undefined when no FEN was provided OR when both current + look-ahead
 *  resolve to source:'none' (the brain has nothing grounded to say). */
/** Build the ground-truth SAN set for a game-review turn: the moves
 *  actually played in the game (`gameSans`) plus the legal moves of the
 *  position being reviewed (`currentFen`). chess.js is the authority for
 *  both. Returns undefined off the review surface (no `gameSans`) so the
 *  strict master-play-only SAN gate stays in force everywhere else. */
function buildGroundedSans(grounding: MasterGroundingOptions): ReadonlyArray<string> | undefined {
  const set = new Set<string>(grounding.gameSans ?? []);
  // The MOVES ALREADY PLAYED to reach the current position are grounded on
  // EVERY surface. They're board-truth — chess.js validated each one as the
  // live game advanced to `currentFen` — so naming the move just played
  // ("c5 is the Sicilian", after the engine replied c5) is describing the
  // board, NOT a fabricated "masters play X" claim. Before this, the engine-
  // driven Learn step narrated the reply it had just played, but the
  // validator only grounded the LEGAL moves of the post-move position — from
  // which the just-played pawn move (c5/e6/…) is no longer legal — so EVERY
  // engine reply (c5, e6, Qc7, …) tripped the SAN gate, exhausted 2 retries,
  // and served the stock "I can't verify which moves are sound" fallback: the
  // student heard the non-answer instead of the lesson (prod, David's iPhone,
  // 2026-06-04 — claim-validator-trip kind=san retry=2 on /coach/teach). The
  // move history is already threaded through `grounding.moveHistory`; ground
  // it. Move-number prefixes ("1.e4") are stripped so the bare SAN matches.
  for (const raw of grounding.moveHistory ?? []) {
    const san = raw.replace(/^\d+\.+/, '').trim();
    if (san) set.add(san);
  }
  // The LEGAL MOVES of the current position are grounded on EVERY
  // surface, not just game review. A legal move the coach names while
  // discussing a plan / the position is a real move, NOT a fabricated
  // "masters play X" claim — so it must not trip the claim validator.
  // Before this, on an off-book position the validator had no grounding
  // source and flagged EVERY SAN, exhausted its retries, and served the
  // stock "I can't verify which moves are sound" fallback — even for a
  // plain "give me a plan" question (audit 2026-06-02, finding #1). The
  // anti-fabrication guards that matter (percentages, game counts,
  // ratings, player names, "most popular"/"main line" comparatives) all
  // gate on `hasMasterData`, NOT this SAN set, so grounding legal moves
  // does not weaken them.
  if (grounding.currentFen) {
    try {
      const chess = new Chess(grounding.currentFen);
      for (const m of chess.moves()) set.add(m);
    } catch {
      // Bad FEN — fall back to whatever gameSans provided (possibly none).
    }
  }
  return set.size > 0 ? Array.from(set) : undefined;
}

async function buildMasterPlayContext(
  grounding: MasterGroundingOptions,
): Promise<MasterPlayContext | undefined> {
  if (!grounding.currentFen) return undefined;
  const groundedSans = buildGroundedSans(grounding);
  // Did this turn come from an ACTUAL played game (review)? If so the
  // SAN gate stays strict (a non-played, non-legal SAN is a real
  // hallucination). Off-book play/chat has only legal-move grounding,
  // where forward-looking plan SANs must NOT be gated.
  const groundedFromPlayedGame = !!(grounding.gameSans && grounding.gameSans.length > 0);
  const current = await lookupMasterPlay(grounding.currentFen, {
    triggeredBy: 'pre-injection',
    surface: grounding.surface,
    sessionId: grounding.sessionId,
  });
  if (current.source === 'none' || current.moves.length === 0) {
    // Honest "no master data" context — claim validator will use this
    // to reject any SAN/percentage the LLM tries to fabricate. In game
    // review, `groundedSans` carries the game's own moves + legal moves
    // so the coach can discuss the student's actual game without every
    // SAN tripping the gate.
    return { current, lookahead: [], groundedSans, groundedFromPlayedGame, moveNarration: grounding.moveNarration, planQuestion: grounding.planQuestion, bestMoveQuestion: grounding.bestMoveQuestion, groundedPlayers: grounding.groundedPlayers };
  }
  const lookahead = await buildLookahead(
    grounding.currentFen,
    current,
    grounding.surface,
    grounding.sessionId,
  );
  return { current, lookahead, groundedSans, groundedFromPlayedGame, moveNarration: grounding.moveNarration, planQuestion: grounding.planQuestion, bestMoveQuestion: grounding.bestMoveQuestion, groundedPlayers: grounding.groundedPlayers };
}

/** Render the context as a system-prompt block the LLM can consume.
 *  Format is deliberately structured (move counts + percentages +
 *  attribution) so the LLM can read off values without paraphrasing. */
function renderMasterPlayContextBlock(ctx: MasterPlayContext): string {
  const lines: string[] = ['═══ MASTER-PLAY CONTEXT (grounded data — use ONLY these figures) ═══'];
  const c = ctx.current;
  if (c.source === 'none' || c.moves.length === 0) {
    lines.push('No master-game data is available for the current position.');
    lines.push('Do NOT cite move popularity, win rates, ratings, player names, or "what masters play" for this position.');
    lines.push('If the user asks a move question, say so explicitly — recommend they analyze with the engine.');
  } else {
    lines.push(`Position: ${c.fen}`);
    lines.push(`Source: ${c.source}    Total master games: ${c.totalGames}`);
    lines.push('Top moves played by masters in this position:');
    for (const m of c.moves.slice(0, 6)) {
      const wPct = (m.whitePct * 100).toFixed(0);
      const dPct = (m.drawPct * 100).toFixed(0);
      const bPct = (m.blackPct * 100).toFixed(0);
      const rating = m.averageRating ? ` avg-rating ${m.averageRating}` : '';
      lines.push(`  • ${m.san} — ${m.games} games (W:${wPct}% D:${dPct}% B:${bPct}%)${rating}`);
    }
    if (c.topGames && c.topGames.length > 0) {
      lines.push('Notable master games in this position:');
      for (const g of c.topGames.slice(0, 4)) {
        const white = g.white ?? '?';
        const black = g.black ?? '?';
        const year = g.year ?? '?';
        const event = g.event ? ` (${g.event})` : '';
        const result = g.result ?? '*';
        lines.push(`  • ${white} vs ${black}, ${year}${event} — ${result}`);
      }
    }
    if (ctx.lookahead.length > 0) {
      lines.push('Look-ahead — positions after each top move:');
      for (const la of ctx.lookahead) {
        const r = la.result;
        if (r.source === 'none' || r.moves.length === 0) {
          lines.push(`  After ${la.moveFromCurrent}: no master data.`);
          continue;
        }
        const top = r.moves.slice(0, 4).map((m) => `${m.san} (${m.games}g)`).join(', ');
        lines.push(`  After ${la.moveFromCurrent}: ${r.totalGames} games — top: ${top}`);
      }
    }
  }
  // ── DB-grounding block ──────────────────────────────────────────────
  // Canonical opening entries from openings-lichess.json that match
  // the current move history OR were referenced by name in the user's
  // most recent message. The coach can teach any opening name, SAN, or
  // sub-variation listed here as book theory — these don't need
  // master-play attribution to count as grounded.
  if (ctx.dbEntries && ctx.dbEntries.length > 0) {
    lines.push('');
    lines.push('OPENING THEORY CONTEXT (canonical Lichess DB — book theory):');
    lines.push('These named openings and sub-variations match the current position or your student\'s question.');
    lines.push('SANs and names listed here are valid book theory you may teach without master-game attribution.');
    for (const e of ctx.dbEntries.slice(0, 8)) {
      lines.push(`  • [${e.eco}] ${e.name} — ${e.pgn}`);
    }
  }
  lines.push('');
  lines.push('GROUNDING RULES (non-negotiable):');
  lines.push('  • When recommending a move, citing frequencies / ratings / player names / years, or making');
  lines.push('    comparative claims about master practice — ground EVERY such claim in the master-play data');
  lines.push('    above.');
  lines.push('  • Never invent or estimate move popularity, game counts, ratings, or "what masters play"');
  lines.push('    figures that are not literally in the master-play data.');
  lines.push('  • SANs and opening names found in the OPENING THEORY CONTEXT above are valid book theory —');
  lines.push('    you may teach them freely, naming the opening and walking through the canonical sequence.');
  lines.push('  • If you need a position not shown, say so — do not fabricate the answer.');
  lines.push('  • Strategic prose (plan ideas, structural concepts) without specific SANs is unrestricted.');
  lines.push('═══════════════════════════════════════════════════════════════════════════');
  return lines.join('\n');
}

/** Stock fallback served when the in-code strip emptied the response (every
 *  sentence carried an ungrounded claim). Honest about uncertainty without
 *  punting the student to "the engine" — invites a question the grounded
 *  assemblers (best move / plan / tactics / master play) can actually answer. */
const STOCK_GROUNDING_FALLBACK =
  "I can't verify that precisely from grounded data right now. " +
  "Ask me for the best move, the plan, or what's hanging, and I'll ground the answer for you.";

function emitClaimValidatorTrips(
  validation: ClaimValidationResult,
  retryNumber: 1 | 2,
  surface: string,
  sessionId: string | undefined,
): void {
  for (const v of validation.violations) {
    void logAppAudit({
      kind: 'claim-validator-trip',
      category: 'subsystem',
      source: 'coachApi.getCoachChatResponse',
      summary: `kind=${v.kind} claim="${v.claim.slice(0, 60)}" retry=${retryNumber} surface=${surface}`,
      details: JSON.stringify({
        kind: v.kind,
        claim: v.claim,
        reason: v.reason,
        retryNumber,
        surface,
        sessionId,
      }),
    });
  }
}

function emitEnforcementFallback(
  originalQuery: string,
  lastValidation: ClaimValidationResult,
  surface: string,
  sessionId: string | undefined,
): void {
  void logAppAudit({
    kind: 'master-play-enforcement-fallback',
    category: 'subsystem',
    source: 'coachApi.getCoachChatResponse',
    summary: `retry budget exhausted — stock response served surface=${surface}`,
    details: JSON.stringify({
      originalQuery: originalQuery.slice(0, 240),
      violationCount: lastValidation.violations.length,
      sampleViolation: lastValidation.violations[0],
      surface,
      sessionId,
    }),
  });
}

/** STEP C — the in-code replacement for the regen loop. When the single
 *  validator backstop trips, we do NOT re-call the LLM (that was the disease:
 *  re-calling the model = the LLM still deciding, at 3–6 calls/turn). Instead we drop
 *  the whole SENTENCES carrying a flagged claim and keep the rest — grammatical,
 *  no clipped fragments, ZERO extra LLM calls. Directive markers ([BOARD:],
 *  [VOICE:], [[ACTION:]]) are never severed. Modeled on
 *  `stripUngroundedPlayerStats` (claimValidator.ts). Returns '' only when every
 *  sentence carried a claim (caller then serves the honest stock line). */
function stripUngroundedSentences(text: string, validation: ClaimValidationResult): string {
  const claims = validation.violations.map((v) => v.claim).filter(Boolean).map((c) => c.toLowerCase());
  if (claims.length === 0 || !text.trim()) return text.trim();
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept: string[] = [];
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    const hasMarker = /\[\[?[A-Z]/.test(trimmed); // protect directive markers
    const lower = trimmed.toLowerCase();
    const carriesClaim = !hasMarker && claims.some((c) => lower.includes(c));
    if (!carriesClaim) kept.push(trimmed);
  }
  return kept.join(' ').trim();
}

/**
 * voiceFacts — THE CHOKEPOINT for the grounding inversion
 * (docs/plans/2026-06-10-coach-chat-grounding-inversion.md).
 *
 * The contract: the LLM DECIDES NOTHING. Every chess fact — the move, the
 * eval, the reason it's strong — is computed in code and passed in as `facts`.
 * This makes ONE small call whose ONLY job is to phrase those facts as a coach.
 * There is no question for the model to reason about, no board to read, no
 * move to pick. That's why it needs no validator: nothing ungrounded can come
 * out because nothing ungrounded went in.
 *
 * If you find yourself wanting to add a validator, a gate, or an anti-
 * hallucination instruction (the "say only these squares" kind) around a coach
 * call — STOP. The LLM is still deciding. Compute the answer in code and route
 * it through HERE instead.
 *
 * Returns null if no provider is configured (caller decides the fallback);
 * never throws.
 */
export async function voiceFacts(
  facts: string,
  opts: { studentMessage?: string; providerConfig?: ProviderConfig | null; intent?: string } = {},
): Promise<string | null> {
  const cfg = opts.providerConfig ?? (await getProviderConfig());
  if (!cfg) return null;

  const system =
    'You are a warm, concise chess coach speaking to a student. You will be given ' +
    'FACTS that are already true and verified. Your ONLY job is to say those facts ' +
    'to the student naturally, as a coach would. Add NOTHING: do not introduce any ' +
    'move, square, piece, number, name, opening, or claim that is not in the facts. ' +
    'Do not analyze further, do not hedge, do not recommend running an engine. Just ' +
    'voice the facts in one or two friendly sentences.';
  const user =
    `FACTS (say these, add nothing):\n${facts}` +
    (opts.studentMessage ? `\n\nThe student asked: "${opts.studentMessage}"` : '');

  // Phrasing only → always the cheap model. Tight token budget; no reasoning.
  // (Deliberately NOT cfg.preferredModel — voicing facts never needs the
  // pricier model, and that field is a string|object union anyway.)
  try {
    const out = cfg.provider === 'anthropic'
      ? await callAnthropic(cfg.apiKey, ANTHROPIC_MODEL_MAP.move_commentary, system, [{ role: 'user', content: user }], 240, 'grounded_voice')
      : await callDeepSeek(
          cfg.apiKey,
          DEEPSEEK_MODEL_MAP.move_commentary,
          [{ role: 'system', content: system }, { role: 'user', content: user }],
          240,
          'grounded_voice',
        );
    // Leak audit fires at the primitive (callAnthropic/callDeepSeek) with
    // task='grounded_voice' → tagged grounded=true there. No emit needed here.
    return out;
  } catch {
    return null; // never throws — caller falls through
  }
}

/** STEP E — the grounding-inversion leak audit. Called from EACH of the 6
 *  network primitives (`callDeepSeek`, `callDeepSeekStream`, `callAnthropic`,
 *  `callAnthropicStream`, `callAnthropicWithTool`, `callDeepseekWithTool`) — the
 *  one chokepoint every model call must pass through (the SDK is imported only
 *  in this file; the `coachLlmChokepoint.gate.test.ts` enforces it). Emitting at
 *  the primitive means EVERY call is tagged by construction — no entry point can
 *  bypass it, present or future. `grounded=true` exactly when the task is
 *  `grounded_voice` (i.e. it came via an assembler → `voiceFacts`); every other
 *  call is the LLM reasoning/narrating freely. Turns "does the LLM still decide
 *  anywhere?" into a measured, closeable list (read the grounded=false rows off
 *  the audit stream). Fire-and-forget; never throws. */
function emitCoachLlmCallAudit(opts: { grounded: boolean; intent: string; surface?: string; question?: string }): void {
  void logAppAudit({
    kind: 'coach-llm-call',
    category: 'subsystem',
    source: 'coachApi',
    summary: `grounded=${opts.grounded} intent=${opts.intent} surface=${opts.surface ?? 'unknown'}`,
    details: JSON.stringify({
      grounded: opts.grounded,
      intent: opts.intent,
      surface: opts.surface ?? null,
      question: opts.question ? opts.question.slice(0, 200) : null,
    }),
  });
}

export async function getCoachChatResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPromptAddition: string,
  onStream?: (chunk: string) => void,
  task: CoachTask = 'chat_response',
  maxTokens: number = 1024,
  /** Optional verbosity override. When provided, bypasses the DB
   *  fetch so callers that already know the student's verbosity
   *  (e.g. per-move commentary) can avoid a redundant lookup and
   *  guarantee a single source of truth for the length directive. */
  verbosityOverride?: CoachVerbosity,
  /** Force a specific API provider for this call, overriding the
   *  default `getProviderConfig()` selection. Used by the brain's
   *  per-surface routing — `/coach/teach` forces Anthropic so the
   *  Learn tab always gets Sonnet/Haiku regardless of the global
   *  default, while every other surface stays on DeepSeek. The
   *  fallback chain still kicks in if the forced provider's call
   *  errors. */
  forceProvider?: AiProvider,
  /** Kid-mode safety lane. When true, skips both
   *  `loadPersonalityAddition` and `loadResponseLengthAddition` so the
   *  user's coach personality dials (edgy / drill-sergeant / profanity
   *  intensity) cannot bleed into kid surfaces. Kid callers should use
   *  `getKidLlmResponse` rather than passing this flag directly. See
   *  CLAUDE.md "Kids section non-negotiables" #3. */
  skipPersonality?: boolean,
  /** WO-COACH-MASTER-INTEGRATION — when set, runs the four-layer
   *  master-play grounding pipeline for this turn. The function decides
   *  internally whether to engage based on intent detection. Surfaces
   *  pass `currentFen` from their game state; the watcher
   *  (`useMasterPlayWatcher`) keeps the cache warm so pre-injection is
   *  near-instant. `getKidLlmResponse` does NOT pass this — kid lane
   *  excluded by contract. */
  grounding?: MasterGroundingOptions,
): Promise<string> {
  const config = forceProvider
    ? await getForcedProviderConfig(forceProvider)
    : await getProviderConfig();
  if (!config) return '⚠️ No API key configured. Go to Settings to add your Anthropic or DeepSeek API key.';

  const verbosity = verbosityOverride ?? await getCoachVerbosity();
  // Pull the active profile's personality dials so EVERY surface that
  // routes through getCoachChatResponse inherits the user's chosen
  // voice (default / soft / edgy / flirtatious / drill-sergeant) +
  // profanity / mockery / flirt intensities. Until this layer existed,
  // legacy callers (walkthrough narrator, opening-section narrator,
  // smart search, kid puzzles, middlegame planner, MiddlegamePractice,
  // CoachGameReview) used a flat SYSTEM_PROMPT with no persona —
  // their coach voice was identical regardless of Settings, breaking
  // the "one coach across all tabs" feel. Failing this lookup
  // gracefully (no profile, fresh install) keeps the legacy flat
  // persona as the fallback so the surface still works.
  //
  // EXCEPTION: `skipPersonality` short-circuits both lookups so kid
  // mode (and any future "neutral voice" surface) can guarantee no
  // adult personality leaks in — see comment on the parameter above.
  const personalityAddition = skipPersonality ? '' : await loadPersonalityAddition();
  const responseLengthAddition = skipPersonality ? '' : await loadResponseLengthAddition();

  // ── Layer B: master-play pre-injection ────────────────────────────
  // Only engages when: grounding options were passed (a surface opted
  // in), AND either intent detector fires OR the caller forced it
  // (integration tests). When engaged, we build the masterPlayContext
  // (cache → local DB → live Lichess fallback chain) and inject a
  // structured prompt block. We also disable streaming for this turn
  // so the post-response claim validator (Layer D) can rerun if needed
  // without the user seeing a half-bad answer first.
  let masterPlayContext: MasterPlayContext | undefined;
  let groundingEngaged = false;
  if (grounding) {
    const intentFired =
      grounding.forceEngage === true ||
      detectMoveQuestionIntent(messages) ||
      grounding.tacticsQuestion === true ||
      grounding.progressQuestion === true ||
      grounding.conceptQuestion === true ||
      grounding.playerGamesQuestion === true ||
      grounding.endgameQuestion === true;
    if (intentFired) {
      try {
        // Helper: the latest user message, for voiceFacts context.
        const lastUserMessage = (): string | undefined => {
          for (let i = messages.length - 1; i >= 0; i -= 1) {
            if (messages[i].role === 'user') return messages[i].content;
          }
          return undefined;
        };

        // ── PROGRESS (Phase 6) — the student's OWN computed history ────────
        // No board needed. `detectBadHabits` recomputes the FRESH habit profile
        // from current theme-skill data (it lives in the leaf `badHabitDetector`
        // so this call is cycle-free — coachFeatureService imports coachApi, so
        // the detector can't live there). voiceFacts the facts; fall through to
        // the legacy path when there's no habit data.
        if (grounding.progressQuestion) {
          try {
            const profile = await db.profiles.get('main');
            const answer = profile ? assembleProgressAnswer(await detectBadHabits(profile)) : null;
            if (answer) {
              const voiced = await voiceFacts(answer.facts, { studentMessage: lastUserMessage(), providerConfig: config, intent: 'progress' });
              if (voiced) return voiced;
            }
          } catch { /* fall through to legacy path */ }
        }

        // ── CONCEPT / DEFINITION (Phase 5) — voice the BOOK corpus ─────────
        // "what's a fork?" / "explain zwischenzug". The definition comes from
        // chess-concepts.json (Capablanca / Lasker / …), NEVER training memory.
        // Confirm a real concept token here (the detector only checked the
        // question SHAPE); fall through when none matches.
        if (grounding.conceptQuestion) {
          const userText = lastUserMessage() ?? '';
          const conceptIds = detectConceptsInText(userText);
          if (conceptIds.length > 0) {
            const concept = getConcept(conceptIds[0]);
            const answer = concept ? assembleConceptAnswer(concept) : null;
            if (answer) {
              const voiced = await voiceFacts(answer.facts, { studentMessage: userText, providerConfig: config, intent: 'concept' });
              if (voiced) return voiced;
            }
          }
        }

        masterPlayContext = await buildMasterPlayContext(grounding);
        // ── GROUNDING INVERSION (Phase 1) — the voiceFacts chokepoint ──────
        // For a "what's the best move?" question with real master data, the
        // answer is COMPUTED in code (the grounded top master move + chess.js's
        // "why") and VOICED through `voiceFacts`. The LLM decides nothing — so
        // there is no claim to validate and no regen to pay for. Falls through
        // to the legacy reasoning path on ANY miss, so it can never break the
        // turn. This is the pattern every intent migrates to; see
        // docs/plans/2026-06-10-coach-chat-grounding-inversion.md. If you're
        // about to add a validator here — STOP: compute it and route it through
        // voiceFacts instead.
        if (grounding.bestMoveQuestion) {
          // Prefer Stockfish's TRUE best move (threaded from the surface engine
          // snapshot, STEP A); fall back to the top master move when the engine
          // snapshot isn't present. Threading the engine move is what lets
          // OFF-BOOK positions (no master data) ground too — the gap the
          // master-only block couldn't cover.
          let bestUci: string | null = grounding.engineBestMoveUci ?? null;
          let bestFen: string | null = bestUci ? (grounding.currentFen ?? null) : null;
          if (!bestUci && masterPlayContext && masterPlayContext.current.moves.length > 0) {
            bestUci = masterPlayContext.current.moves[0].uci ?? null;
            bestFen = masterPlayContext.current.fen;
          }
          if (bestUci && bestFen) {
            // LiveState evals are WHITE-perspective; assembleMoveEvalAnswer
            // wants side-to-move POV. Flip the sign when Black is to move.
            const blackToMove = bestFen.split(' ')[1] === 'b';
            const stmEvalCp =
              typeof grounding.engineEvalCp === 'number'
                ? (blackToMove ? -grounding.engineEvalCp : grounding.engineEvalCp)
                : null;
            const stmMateIn =
              typeof grounding.engineMateIn === 'number'
                ? (blackToMove ? -grounding.engineMateIn : grounding.engineMateIn)
                : null;
            const answer = assembleMoveEvalAnswer({ fen: bestFen, bestMoveUci: bestUci, evalCp: stmEvalCp, mateIn: stmMateIn });
            if (answer) {
              const voiced = await voiceFacts(answer.facts, { studentMessage: lastUserMessage(), providerConfig: config, intent: 'best-move' });
              if (voiced) {
                return answer.bestMoveFromTo
                  ? `${voiced} [BOARD: arrow:${answer.bestMoveFromTo.from}-${answer.bestMoveFromTo.to}:green]`
                  : voiced;
              }
            }
          }
        }

        // ── PLAN / STRATEGY (Phase 3) — voice the engine's principal variation ──
        // The plan's MOVE backbone is Stockfish's PV (real, legal, chess.js-
        // verified), NOT the LLM free-synthesizing moves. assemblePlanAnswer
        // replays the PV and packages the student's moves + the expected reply;
        // voiceFacts says them. Falls through when there's no engine plan.
        if (grounding.planQuestion && grounding.enginePlan && grounding.currentFen) {
          const answer = assemblePlanAnswer({
            fen: grounding.currentFen,
            pvSan: grounding.enginePlan.pvSan,
            evalCp: grounding.enginePlan.evalCp,
            mateIn: grounding.enginePlan.mateIn,
            studentSide: grounding.enginePlan.studentSide,
          });
          if (answer) {
            const voiced = await voiceFacts(answer.facts, { studentMessage: lastUserMessage(), providerConfig: config, intent: 'plan' });
            if (voiced) {
              return answer.bestMoveFromTo
                ? `${voiced} [BOARD: arrow:${answer.bestMoveFromTo.from}-${answer.bestMoveFromTo.to}:green]`
                : voiced;
            }
          }
        }

        // ── TACTICS / DANGER (Phase 2) — voice the engine's computed tactics ──
        // `liveTacticsContext` already computed every fork/hanging/mate-in-one
        // deterministically; assembleTacticsAnswer SELECTS the relevant facts
        // and voiceFacts says them. The LLM decides nothing. Falls through when
        // there's no concrete tactic (the legacy path then handles the turn).
        if (grounding.tacticsQuestion && grounding.tactics) {
          const sc: 'white' | 'black' =
            grounding.studentColor ??
            ((grounding.currentFen ?? '').split(' ')[1] === 'b' ? 'black' : 'white');
          const answer = assembleTacticsAnswer(grounding.tactics, sc);
          if (answer) {
            const voiced = await voiceFacts(answer.facts, { studentMessage: lastUserMessage(), providerConfig: config, intent: 'tactics' });
            if (voiced) return voiced;
          }
        }

        // ── MASTER PLAY (Phase 4) — voice the real top moves + frequencies ──
        // The master-play lookup already computed the top moves with their game
        // counts + W/D/B splits; assembleMasterPlayAnswer packages them and
        // voiceFacts says them. The LLM never invents "masters play X 55%".
        // Falls through when there's no master data (legacy path handles it).
        if (grounding.masterPlayQuestion && masterPlayContext && masterPlayContext.current.moves.length > 0) {
          const answer = assembleMasterPlayAnswer(masterPlayContext.current);
          if (answer) {
            const voiced = await voiceFacts(answer.facts, { studentMessage: lastUserMessage(), providerConfig: config, intent: 'master-play' });
            if (voiced) {
              return answer.bestMoveFromTo
                ? `${voiced} [BOARD: arrow:${answer.bestMoveFromTo.from}-${answer.bestMoveFromTo.to}:green]`
                : voiced;
            }
          }
        }

        // ── PRO GAMES (Phase 4 cont) — voice the player's REAL games ────────
        // "how does <pro> play this?" → the player's actual reference corpus
        // (pro-game-references), already loaded into grounding.playerGames.
        // assemblePlayerGamesAnswer voices the real count + a standout game; the
        // LLM never invents a "<pro> plays X" game. Falls through when there are
        // no reference games for this opening.
        if (grounding.playerGamesQuestion && grounding.playerGames) {
          const answer = assemblePlayerGamesAnswer(grounding.playerGames);
          if (answer) {
            const voiced = await voiceFacts(answer.facts, { studentMessage: lastUserMessage(), providerConfig: config, intent: 'player-games' });
            if (voiced) return voiced;
          }
        }

        // ── ENDGAME (Phase 5) — voice the SYZYGY TABLEBASE verdict ──────────
        // For an endgame-verdict question, the syzygy tablebase is literal truth
        // (≤7 pieces). lookupTablebase returns null off-tablebase (>7 pieces /
        // proxy miss) → fall through to the engine-eval path. The verdict is
        // voiced from the STUDENT's perspective; the LLM decides nothing.
        if (grounding.endgameQuestion && grounding.currentFen) {
          try {
            const tb = await lookupTablebase(grounding.currentFen);
            if (tb) {
              const sc: 'white' | 'black' =
                grounding.studentColor ??
                (grounding.currentFen.split(' ')[1] === 'b' ? 'black' : 'white');
              const answer = assembleEndgameAnswer({ result: tb, studentColor: sc });
              if (answer) {
                const voiced = await voiceFacts(answer.facts, { studentMessage: lastUserMessage(), providerConfig: config, intent: 'endgame' });
                if (voiced) return voiced;
              }
            }
          } catch { /* tablebase unreachable — fall through to engine eval */ }
        }
        // DB-grounding extension: attach canonical openings-lichess.json
        // entries that match the current move history OR were referenced
        // by name in the user's latest message. The claim validator
        // consults these alongside master-play, so the coach can answer
        // "walk me through the Steinitz Gambit" even when live Lichess
        // explorer's top-N for the exact position doesn't carry the
        // gambit's canonical continuations. Always-on when grounding
        // engages — cheap (in-memory DB scan) and additive.
        const lastUserContent = (() => {
          for (let i = messages.length - 1; i >= 0; i -= 1) {
            if (messages[i].role === 'user') return messages[i].content;
          }
          return '';
        })();
        const dbEntries: ReadonlyArray<OpeningDbEntry> = buildOpeningDbEntries({
          moveHistory: grounding.moveHistory,
          userMessage: lastUserContent,
          maxEntries: 8,
        });
        if (masterPlayContext && dbEntries.length > 0) {
          masterPlayContext = { ...masterPlayContext, dbEntries };
        } else if (!masterPlayContext && dbEntries.length > 0) {
          // No master data at all, but the DB caught the opening — still
          // useful grounding. Build a minimal context with empty master
          // data and the DB entries attached so the validator can use
          // them.
          masterPlayContext = {
            current: {
              fen: grounding.currentFen ?? '',
              totalGames: 0,
              moves: [],
              source: 'none',
            },
            lookahead: [],
            dbEntries,
          };
        }
        groundingEngaged = masterPlayContext !== undefined;
      } catch (err) {
        // Building the context shouldn't throw, but if it does, fail
        // open — proceed without grounding rather than crash the turn.
        console.warn('[CoachAPI] buildMasterPlayContext threw:', err);
      }
    }
  }
  const groundingBlock = masterPlayContext
    ? renderMasterPlayContextBlock(masterPlayContext)
    : '';

  // Book grounding — pulls relevant passages from the 7 Gutenberg
  // classics for any opening / concept named in the latest user
  // message. Empty string when nothing matched; otherwise a compact
  // reference block keyed off the same opening/concept vocabulary
  // the narration generator uses. The brain grounds its prose in
  // Capablanca / Lasker / Staunton rather than inventing stock
  // explanations. See chessConceptService.ts for the data shape.
  //
  // KID CONTRACT — book grounding is GATED on `skipPersonality === false`.
  // Pre-1929 chess prose can carry archaic phrasings, SAN, and adult
  // language tone that violates the kid-safety prompt. Surfaces that
  // pass `skipPersonality: true` (kid path via `getKidLlmResponse`)
  // get NO book grounding. CLAUDE.md kid §3 + §17.
  // Universal narration grounding: same loader stack `coachService.ask`
  // runs (annotation / book passages / middlegame plan / model games).
  // The legacy `buildCoachChatContext` covered only chess-concepts
  // passages — this expansion folds in the other three curated
  // sources so bypass paths (voice mic, puzzle feedback, smart search,
  // walkthrough LLM narrator, content generation, …) all ship with
  // the same shape of grounding the unified envelope already provides.
  // Skipped on kid surfaces per CLAUDE.md kid §3.
  const allMessagesText = messages.map((m) => m.content).join(' ');
  const narrationGrounding = skipPersonality
    ? { block: '', loadedCount: 0, loaded: { annotation: false, bookPassages: false, middlegamePlan: false, modelGames: false } }
    : await buildNarrationGroundingBlock({
        askText: allMessagesText,
        // No reliable opening name or moveHistory in raw message text;
        // the bookGrounding loader detects opening via concept scan
        // on askText, and the annotation/plan/game loaders skip
        // gracefully when nothing resolves. Bypass paths that DO have
        // moveHistory (e.g. coachMoveCommentary, walkthroughLlmNarrator)
        // already route via coachService.ask so the unified path handles
        // them with full context.
        moveHistory: [],
        auditSource: 'coachApi.chatResponse',
      });
  const bookGroundingBlock = narrationGrounding.block;

  // Verified trap/pitfall puzzle library. Inject the Stockfish-verified
  // lines whenever the student names an opening we have lines for — so the
  // coach always has the REAL verified traps as reference and never invents
  // a position/solution. (Capped at 4 lines, so it stays lean.) Previously
  // gated to puzzle/trap-shaped turns only; widened so the trap reference
  // is available like the book + lesson references — David 2026-05-20.
  // Gated off kid surfaces (skipPersonality). See verifiedLineLibrary.
  let verifiedPuzzleBlock = '';
  if (!skipPersonality) {
    // The library fuzzy-matches an opening name inside the message text,
    // so passing the raw text hits (and returns '') when no opening with
    // verified lines is named.
    const block = buildVerifiedPuzzleContext(allMessagesText);
    if (block) {
      verifiedPuzzleBlock = block;
      void logAppAudit({
        kind: 'book-grounding-injected',
        category: 'subsystem',
        source: 'coachApi.verifiedPuzzleLibrary',
        summary: `verified trap/pitfall puzzle context injected (${block.length} chars)`,
      });
    }
  }

  // Master-class reference: when the student names an opening (or subline)
  // we've built a verified master class for, hand the coach those teaching
  // ideas as reference so its answers stay consistent with the lessons.
  // FOR REFERENCE only — the coach answers naturally, not as a lecture.
  // Gated off kid surfaces (skipPersonality) per the kid contract.
  const lessonReferenceBlock = skipPersonality ? '' : buildLessonReferenceBlock(allMessagesText);
  if (lessonReferenceBlock) {
    void logAppAudit({
      kind: 'book-grounding-injected',
      category: 'subsystem',
      source: 'coachApi.lessonReference',
      summary: `master-class reference injected (${lessonReferenceBlock.length} chars)`,
    });
  }

  const buildSystemPromptFor = (extraAddendum: string = ''): string => {
    return buildSystemPromptWithVerbosity(
      SYSTEM_PROMPT,
      verbosity,
      [
        personalityAddition,
        responseLengthAddition,
        groundingBlock,
        bookGroundingBlock,
        verifiedPuzzleBlock,
        lessonReferenceBlock,
        systemPromptAddition,
        extraAddendum,
      ]
        .filter(Boolean)
        .join('\n\n') || undefined,
    );
  };

  // Helper that wraps the existing primary+fallback provider chain
  // so we can reuse it across retries without duplicating the
  // error-handling. Returns null on dead-end (both providers failed)
  // so the caller can decide whether to retry or stock-out.
  const callOnce = async (systemPrompt: string, allowStream: boolean): Promise<string> => {
    const onStreamForCall = allowStream ? onStream : undefined;
    try {
      return await callChatWithConfig(config, messages, systemPrompt, onStreamForCall, task, maxTokens);
    } catch (error) {
      console.warn(`[CoachAPI] ${config.provider} failed, trying fallback...`, error);
      emitProviderFailureAudit('primary', config.provider, task, error);
      markProviderDead(config.provider);
      const fallback = getFallbackConfig(config.provider);
      if (fallback) {
        try {
          return await callChatWithConfig(fallback, messages, systemPrompt, onStreamForCall, task, maxTokens);
        } catch (fallbackError) {
          console.error('[CoachAPI] Fallback also failed:', fallbackError);
          emitProviderFailureAudit('fallback', fallback.provider, task, fallbackError);
          markProviderDead(fallback.provider);
          return OFFLINE_FALLBACKS.default;
        }
      }
      return OFFLINE_FALLBACKS.default;
    }
  };

  // ── Non-grounded path: existing behavior, streaming-as-passed ──
  // (Leak audit fires at the primitive — this call lands as grounded=false.)
  if (!groundingEngaged) {
    return callOnce(buildSystemPromptFor(), true);
  }

  // ── Grounded path: ONE call → ONE validator backstop → in-code strip ──
  // STEP C of the grounding inversion (David's "1 call max" rule). The old
  // path re-called the LLM up to 2× on a validator trip — 3–6 calls/turn and
  // the disease itself (re-calling the model means the LLM is still DECIDING). That's
  // gone. Now: a single LLM call, a single silent validator pass, and if a
  // claim slips through we DROP the offending sentences IN CODE (grammatical,
  // no clipped fragments, zero extra LLM calls). A turn is AT MOST 1 LLM call.
  // Streaming stays off on grounded turns so the strip can run before the user
  // sees a half-grounded response. `grounding` is non-null here (groundingEngaged
  // implies we built a context, which requires grounding).
  const { surface, sessionId } = grounding ?? { surface: 'unknown', sessionId: undefined };
  const originalQuery = messages[messages.length - 1]?.content ?? '';

  // Grounding context was injected but no assembler produced the answer, so the
  // LLM still reasons freely (the validator backstop + in-code strip guard it).
  // This call lands as grounded=false at the primitive — the remaining hole the
  // general-path inversion will close (→ gate 0).
  const response = await callOnce(buildSystemPromptFor(), false);
  const validation = validateClaims(response, masterPlayContext);
  if (validation.ok) {
    if (onStream && response) onStream(response);
    return response;
  }
  // Ungrounded claim(s) slipped in. Do NOT re-call the model — strip the
  // sentences carrying them and serve what's left.
  emitClaimValidatorTrips(validation, 1, surface, sessionId);
  const stripped = stripUngroundedSentences(response, validation);
  if (stripped) {
    if (onStream) onStream(stripped);
    return stripped;
  }
  // The strip emptied the response (the whole thing was ungrounded). Serve the
  // honest stock line — still zero extra LLM calls.
  emitEnforcementFallback(originalQuery, validation, surface, sessionId);
  if (onStream) onStream(STOCK_GROUNDING_FALLBACK);
  return STOCK_GROUNDING_FALLBACK;
}

/** Read the active profile's personality dials and render the
 *  surface-agnostic personality block (voice + intensity modulators).
 *  Cached by-call — getProviderConfig already touches the same row, so
 *  the additional read is hot in IndexedDB. Returns empty string when
 *  the profile/dials aren't available so the legacy flat persona
 *  remains the fallback. */
async function loadPersonalityAddition(): Promise<string> {
  try {
    const profile = await db.profiles.get('main');
    if (!profile) return '';
    const personality = profile.preferences.coachPersonality ?? 'default';
    const profanity = profile.preferences.coachProfanity ?? 'none';
    const mockery = profile.preferences.coachMockery ?? 'none';
    const flirt = profile.preferences.coachFlirt ?? 'none';
    if (personality === 'default' && profanity === 'none' && mockery === 'none' && flirt === 'none') {
      return '';
    }
    const { renderPersonalityBlock } = await import('../coach/sources/personalities');
    return renderPersonalityBlock({ personality, profanity, mockery, flirt });
  } catch {
    return '';
  }
}

/** Read the user's coachResponseLength preference (Settings →
 *  Personality → Verbosity) and render the matching modulator. Same
 *  shape as the verbosity blocks in `coach/envelope.ts` so legacy
 *  callers feel identical to the chat surfaces. Default 'normal'
 *  matches /coach/teach's tightness. */
async function loadResponseLengthAddition(): Promise<string> {
  try {
    const profile = await db.profiles.get('main');
    const level = profile?.preferences.coachResponseLength ?? 'normal';
    const blocks: Record<'minimal' | 'normal' | 'verbose', string> = {
      minimal: '═══ VERBOSITY: MINIMAL ═══\nHard ceiling: ONE short sentence per turn, ≤8 words. NO multi-sentence responses, NO bullet points, NO past-games stats.',
      normal: '═══ VERBOSITY: NORMAL ═══\nDefault tightness. Ceiling: ONE short sentence per turn (≤15 words) plus an optional one-line teaching beat when the position genuinely warrants it. NO multi-paragraph commentary, NO bullet-point agendas.',
      verbose: '═══ VERBOSITY: VERBOSE ═══\nLecture shape allowed: set up positions, demonstrate candidate moves, name the IDEA, ground in Stockfish, cite master games. No length cap.',
    };
    return blocks[level];
  } catch {
    return '';
  }
}

async function callCommentaryWithConfig(
  config: ProviderConfig,
  task: CoachTask,
  userMessage: string,
  systemPrompt: string,
  onStream?: (chunk: string) => void,
): Promise<string> {
  const model = getModel(task, config.provider, config.preferredModel);
  if (config.provider === 'anthropic') {
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: userMessage },
    ];
    if (onStream) {
      return await callAnthropicStream(config.apiKey, model, systemPrompt, messages, 512, onStream, task);
    }
    return await callAnthropic(config.apiKey, model, systemPrompt, messages, 1024, task);
  } else {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];
    if (onStream) {
      return await callDeepSeekStream(config.apiKey, model, messages, 512, onStream, task);
    }
    return await callDeepSeek(config.apiKey, model, messages, 1024, task);
  }
}

export async function getCoachCommentary(
  task: CoachTask,
  context: CoachContext,
  onStream?: (chunk: string) => void,
): Promise<string> {
  const verbosity = await getCoachVerbosity();
  if (verbosity === 'none') return '';

  const config = await getProviderConfig();
  if (!config) return OFFLINE_FALLBACKS[task] ?? OFFLINE_FALLBACKS.default;

  // Universal narration grounding: pull the four curated sources
  // (annotations / classical book passages / middlegame plans /
  // model games) into the system prompt so this bypass path gets
  // the same opening-book context `coachService.ask` injects via
  // its envelope. Without this, every getCoachCommentary call —
  // puzzle feedback, post-game analysis, daily lesson, weekly
  // report, content-generation prose, lesson narration — shipped
  // book-blind. See `src/services/narrationGrounding.ts`.
  const groundingMoveHistory = (() => {
    if (!context.pgn) return [];
    return context.pgn
      .replace(/\d+\.+/g, ' ')
      .split(/\s+/)
      .filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
  })();
  const grounding = await buildNarrationGroundingBlock({
    askText: context.additionalContext ?? '',
    openingName: context.openingName,
    moveHistory: groundingMoveHistory,
    auditSource: `coachApi.commentary.${task}`,
  });
  const systemPrompt = buildSystemPromptWithVerbosity(
    SYSTEM_PROMPT,
    verbosity,
    grounding.block || undefined,
  );
  const userMessage = buildChessContextMessage(context);

  // The commentary/report tasks (move commentary, puzzle feedback, post-game
  // review, reports, model-game annotation, …) are grounded-by-INJECTION but
  // still let the LLM phrase freely — they don't route through voiceFacts. The
  // leak audit tags them grounded=false at the primitive with intent=<task>.
  try {
    return await callCommentaryWithConfig(config, task, userMessage, systemPrompt, onStream);
  } catch (error) {
    console.warn(`[CoachAPI] ${config.provider} failed for ${task}, trying fallback...`, error);
    emitProviderFailureAudit('primary', config.provider, task, error);
    markProviderDead(config.provider);
    const fallback = getFallbackConfig(config.provider);
    if (fallback) {
      try {
        return await callCommentaryWithConfig(fallback, task, userMessage, systemPrompt, onStream);
      } catch (fallbackError) {
        console.error('[CoachAPI] Fallback also failed:', fallbackError);
        emitProviderFailureAudit('fallback', fallback.provider, task, fallbackError);
        markProviderDead(fallback.provider);
        return OFFLINE_FALLBACKS[task] ?? OFFLINE_FALLBACKS.default;
      }
    }
    return OFFLINE_FALLBACKS[task] ?? OFFLINE_FALLBACKS.default;
  }
}

// ─── Kid-mode safety lane ──────────────────────────────────────────────
//
// All kid LLM calls go through this wrapper. Pins:
//   1. `skipPersonality: true` — user's coach personality / profanity
//      / mockery / flirt dials cannot bleed in.
//   2. A kid-safety system prompt that asserts age-appropriate output,
//      JSON-only when requested, no slang / negative language / taunting,
//      ≤ 12 words per text field.
//   3. `task: 'kid_puzzle_gen'` so audit-stream entries are filterable
//      and per-task model maps stay tight.
// Kid surfaces MUST use this wrapper instead of `getCoachChatResponse`
// directly. See CLAUDE.md "Kids section non-negotiables" #3 & #17.

const KID_SAFETY_PROMPT = `You are writing text for a child aged 5-10 learning chess.

ABSOLUTE RULES:
- Age-appropriate, friendly, encouraging tone — no slang, no sarcasm.
- No negative language, no comparison to other kids, no taunting.
- No idioms ("a piece of cake", "by the skin of your teeth"). Literal language only.
- No standard algebraic notation. Spell out moves ("the knight takes the bishop", not "Nxc6").
- ≤ 12 words per text field unless explicitly told otherwise.
- Output JSON only when the user asks for JSON. No prose around it.
- You are the position teaching the student. You are not "I", you are not a tutor character.`;

/** Kid-mode LLM entry point. Forces neutral/Ruth personality and
 *  prepends the kid-safety system prompt. Returns the raw string just
 *  like `getCoachChatResponse`. Callers in kid surfaces must use this
 *  wrapper; importing `getCoachChatResponse` directly from a `Kid/`
 *  file is banned (see scripts/audit-kid-llm-hallucination.mjs). */
export async function getKidLlmResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPromptAddition: string,
  maxTokens: number = 1024,
): Promise<string> {
  const fullAddition = `${KID_SAFETY_PROMPT}\n\n${systemPromptAddition}`.trim();
  return getCoachChatResponse(
    messages,
    fullAddition,
    undefined,        // no streaming for kid puzzles
    'kid_puzzle_gen', // task — audit-stream filterable
    maxTokens,
    undefined,        // no verbosity override
    undefined,        // no forced provider
    true,             // skipPersonality — the safety contract
  );
}


/**
 * Coach Brain provider abstraction. Every LLM call in the spine
 * goes through a `Provider`. Today: DeepSeek (active) and Anthropic
 * (wired but dark, flippable via `COACH_PROVIDER` env var).
 *
 * Tool-call surface: spine v1 uses the `[[ACTION:name {args}]]` tag
 * protocol already in the codebase (`coachActionDispatcher.ts`).
 * The provider implementation parses tags out of the LLM response
 * and returns them as `ProviderToolCall[]`. A future WO can swap to
 * native function-calling without changing surface code.
 *
 * See COACH-BRAIN-00 §"The Cerebrum (LLM provider)".
 */
export type {
  Provider,
  ProviderName,
  ProviderResponse,
  ProviderToolCall,
} from '../types';

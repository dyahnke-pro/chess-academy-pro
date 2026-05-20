/**
 * Narration grounding — the universal entry point for injecting
 * curated book/data context into ANY LLM narration call that doesn't
 * go through `coachService.ask`.
 *
 * Why this exists: `coachService.ask` already auto-loads four curated
 * grounding sources (opening annotations, classical book passages,
 * named middlegame plans, master model games) into the envelope's
 * `[Live state]` sub-blocks. But ~14 legacy narration call sites
 * bypass `coachService.ask` and call `getCoachChatResponse` or
 * `getCoachCommentary` in `coachApi.ts` directly — puzzle feedback,
 * voice-mic responses, middlegame practice prose, content
 * generation, lesson narration, post-game recap. Without this
 * helper, those paths shipped ungrounded prose with no opening
 * theory / book passages / strategic plans / master examples
 * reaching the LLM.
 *
 * `buildNarrationGroundingBlock` is the single function those
 * bypass paths now call to fold the same curated content into their
 * system-prompt addendum. The helper accepts whatever context is
 * available (user message text, optional opening name, optional
 * move history, optional FEN) and returns ONE text block ready to
 * paste into the system prompt — or empty when nothing matched.
 *
 * Mirrors `coachService.ask`'s loader stack:
 *   1. Opening annotations  — `src/coach/sources/annotationContext.ts`
 *   2. Classical book passages — `src/coach/sources/bookGrounding.ts`
 *   3. Middlegame plans — `src/coach/sources/middlegamePlan.ts`
 *   4. Curated model games — `src/coach/sources/modelGames.ts`
 *
 * Returns one concatenated block with all four sub-blocks the
 * loader returned, separated by blank lines. Empty string when
 * everything returned null (no opening recognized + no concepts
 * matched in text). The G3-style "USE this, don't contradict it"
 * closer is baked into each sub-block by the envelope formatter.
 *
 * G3 contract: bypass paths get the SAME grounding shape as the
 * envelope path. The brain's vocabulary is bounded by the curated
 * content — not its own free-association.
 *
 * Performance: each loader is sync (in-memory JSON lookup) except
 * annotation, which is a dynamic-import-cached read. Combined cost
 * per call is ~5ms warm, ~30ms cold-import.
 */
import { loadAnnotationContextForLive } from '../coach/sources/annotationContext';
import { loadBookGroundingForLive } from '../coach/sources/bookGrounding';
import { loadMiddlegamePlanForLive } from '../coach/sources/middlegamePlan';
import { loadModelGamesForLive } from '../coach/sources/modelGames';
import {
  formatAnnotationContextSubBlock,
  formatBookGroundingSubBlock,
  formatMiddlegamePlanSubBlock,
  formatModelGamesSubBlock,
} from '../coach/envelope';
import { logAppAudit } from './appAuditor';

export interface NarrationGroundingArgs {
  /** User-typed text or task ask. The book-grounding loader keys
   *  concept detection off this string (e.g. "isolated pawn",
   *  "Italian Game"). When empty, only opening-name + move-history
   *  paths can resolve. */
  askText?: string;
  /** Pre-resolved opening name (e.g. "Italian Game"). When ECO-shape
   *  ("B01") it's nullified internally so detection from moveHistory
   *  can take over. */
  openingName?: string | null;
  /** SAN move history if available. Used to detect opening when
   *  openingName isn't set and to window the annotation block
   *  around the current ply. */
  moveHistory?: string[];
  /** Source identifier for the audit emission so we can tell which
   *  bypass path requested grounding (e.g. "coachApi.chatResponse",
   *  "coachApi.commentary", "voiceChat", "puzzleFeedback"). */
  auditSource?: string;
}

export interface NarrationGroundingResult {
  /** Concatenated text block ready to paste into a system prompt.
   *  Empty string when nothing matched. */
  block: string;
  /** How many of the four loaders produced content. */
  loadedCount: number;
  /** Per-source diagnostic detail. */
  loaded: {
    annotation: boolean;
    bookPassages: boolean;
    middlegamePlan: boolean;
    modelGames: boolean;
  };
}

/** Build a single text grounding block for a narration call. Calls
 *  all four loaders, formats their results, concatenates with the
 *  exact same shape `coachService.ask` would emit via the envelope.
 *  Returns `{ block: '', loadedCount: 0, loaded: { all false } }`
 *  when nothing matched — caller can short-circuit. */
export async function buildNarrationGroundingBlock(
  args: NarrationGroundingArgs,
): Promise<NarrationGroundingResult> {
  const moveHistory = args.moveHistory ?? [];
  const askText = args.askText ?? '';
  const openingName = args.openingName ?? null;

  // Run loaders in parallel — annotation is async (dynamic import),
  // the others are sync but wrap them in resolved promises so the
  // single Promise.all settles cleanly even when one throws.
  const [annotation, plan, games, book] = await Promise.all([
    loadAnnotationContextForLive({ openingName, moveHistory }).catch(() => null),
    Promise.resolve(loadMiddlegamePlanForLive({ openingName, moveHistory })).catch(() => null),
    Promise.resolve(loadModelGamesForLive({ openingName, moveHistory })).catch(() => null),
    Promise.resolve(loadBookGroundingForLive({ askText, openingName })).catch(() => null),
  ]);

  const parts: string[] = [];
  if (annotation) parts.push(formatAnnotationContextSubBlock(annotation));
  if (book) parts.push(formatBookGroundingSubBlock(book));
  if (plan) parts.push(formatMiddlegamePlanSubBlock(plan));
  if (games) parts.push(formatModelGamesSubBlock(games));

  const block = parts.filter(Boolean).join('\n\n');
  const loaded = {
    annotation: !!annotation,
    bookPassages: !!book,
    middlegamePlan: !!plan,
    modelGames: !!games,
  };
  const loadedCount = Object.values(loaded).filter(Boolean).length;

  // Audit emission so the per-call grounding fingerprint is visible
  // in the rolling log. Skipped when nothing loaded so the audit
  // stays signal-rich. Source name surfaces which bypass path
  // requested grounding.
  if (loadedCount > 0) {
    void logAppAudit({
      kind: 'book-grounding-injected',
      category: 'subsystem',
      source: args.auditSource ?? 'narrationGrounding',
      summary: `narration grounded: annotation=${loaded.annotation ? '1' : '0'} book=${loaded.bookPassages ? '1' : '0'} plan=${loaded.middlegamePlan ? '1' : '0'} games=${loaded.modelGames ? '1' : '0'} (${block.length} chars) opening="${openingName ?? '?'}" histLen=${moveHistory.length}`,
    });
  }

  return { block, loadedCount, loaded };
}

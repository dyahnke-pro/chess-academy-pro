import { useCallback, useEffect, useRef, useState } from 'react';
import { voiceService } from '../services/voiceService';
import { stockfishEngine, resolveWorkerUrl } from '../services/stockfishEngine';
import { groundedMoveFeedback } from '../services/coachApi';
import { logAppAudit } from '../services/appAuditor';
import { db } from '../db/schema';
import { getCachedStockfish, setCachedStockfish } from './stockfishFenCache';
import { isSpokenSentenceGrounded } from '../services/coachAnswerGates';
import { buildFedTacticsContext } from '../services/liveTacticsContext';
import { transitionTeachingForGame } from '../services/danyaTeachingService';
import { detectOpening } from '../services/openingDetectionService';
import type { PhaseNarrationVerbosity, StockfishAnalysis } from '../types';
import type { PhaseTransitionEvent } from '../services/phaseTransitionDetector';

export interface UsePhaseNarrationArgs {
  /** Full PGN at narration time — fed into the grounding block. */
  getPgn: () => string;
  /** Opening name as detected by the coach game screen. */
  getOpeningName: () => string | null;
  /** Persist the finished phase-transition report as a chat message (David
   *  2026-07-01: the report should live in the messages under the board, not
   *  a transient banner that pops up then disappears). Called once with the
   *  final report text when the narration content is finalized. */
  onReport?: (text: string) => void;
}

export interface UsePhaseNarrationResult {
  narrate: (event: PhaseTransitionEvent, verbosity: Exclude<PhaseNarrationVerbosity, 'off'>) => Promise<void>;
  cancel: () => void;
  isNarrating: boolean;
  currentText: string;
  error: string | null;
}

/** Stockfish analysis depth for phase narration. PHASE-LAG-01 set 12;
 *  PHASE-LAG-02 drops to 10 to match Read Position. Deterministic
 *  tactics detection runs on every FEN in buildChessContextMessage
 *  regardless, so the engine contributes only eval direction + top
 *  lines — not something that benefits from deeper search here. */
const STOCKFISH_DEPTH = 10;
// WO-NARR-POLICY-04: bumped 30s → 12s. With max_tokens dropped to
// 600 the real LLM response returns in ~3-5s; the old 30s timeout
// existed because phase prose used to be 4000 tokens of streaming
// narration. A tighter timeout means the deterministic fallback
// fires faster on a true outage instead of letting the student wait
// 30s with no audio at all.
const NARRATION_API_TIMEOUT_MS = 12_000;
const NARRATION_SPEAK_TIMEOUT_MS = 60_000;

/** WO-REAL-FIXES — when the phase-narration LLM call times out
 *  (production audit cycle 6 Finding 43 reproduced this) we used to
 *  render NOTHING and the student silently saw / heard nothing at
 *  the transition. These templates are deterministic, local, and
 *  prefixed with `* ` so the banner subtly flags it as a fallback
 *  rather than a tailored read. */
const PHASE_FALLBACK_TEMPLATES: Record<'opening-to-middlegame' | 'middlegame-to-endgame', string> = {
  'opening-to-middlegame':
    "* We're entering the middlegame. The opening is set, now it's about plans and piece coordination.",
  'middlegame-to-endgame':
    "* Endgame territory. King activity and pawn structure decide it from here.",
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}-timeout`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

/**
 * Fires automatic narration at phase boundaries (opening→middlegame,
 * middlegame→endgame). Consumer holds the phase-transition ledger and
 * calls `narrate()` when the detector produces an event AND all
 * gating conditions pass (verbosity ≠ 'off', no blunder pending, no
 * position-narration in flight).
 *
 * Shape parallels `usePositionNarration` so the two hooks are
 * interchangeable from an observability standpoint — same grounding
 * pipeline, same timeout discipline, same token-supersession
 * cancellation.
 */
export function usePhaseNarration(args: UsePhaseNarrationArgs): UsePhaseNarrationResult {
  const [isNarrating, setIsNarrating] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const activeTokenRef = useRef(0);
  // Capture args in a ref so the narrate callback's dependency list
  // stays empty — the hook is called once per coach play session and
  // should reuse the same narrate reference across renders.
  const argsRef = useRef(args);
  argsRef.current = args;

  useEffect(() => {
    return () => {
      activeTokenRef.current += 1;
      voiceService.stop();
      setIsNarrating(false);
      setCurrentText('');
      setError(null);
    };
  }, []);

  const cancel = useCallback(() => {
    activeTokenRef.current += 1;
    voiceService.stop();
    setIsNarrating(false);
    setCurrentText('');
  }, []);

  const narrate = useCallback(async (
    event: PhaseTransitionEvent,
    verbosity: Exclude<PhaseNarrationVerbosity, 'off'>,
  ): Promise<void> => {
    console.log('[PHASE-HOOK-01] received event', { event, verbosity });
    if (activeTokenRef.current > 0) {
      console.log('[PHASE-HOOK-02] aborting prior narration (token supersession)');
    }
    activeTokenRef.current += 1;
    const token = activeTokenRef.current;
    voiceService.stop();
    setError(null);
    setCurrentText('');
    setIsNarrating(true);
    // WO-PHASE-LAG-01: detection timestamp drives the tap-to-first-word
    // latency measurement. Phase narration has no literal tap — "tap"
    // here means "the moment the hook received the detection event".
    const detectedTs = Date.now();

    // Full-trail instrumentation (WO-PHASE-FIX-02): record that the
    // hook actually received an event. If Dave ever sees a
    // 'phase-transition-detected' audit entry without a matching
    // 'usePhaseNarration received' entry, the dispatch wiring is
    // broken between CoachGamePage and the hook.
    void logAppAudit({
      kind: 'phase-transition-detected',
      category: 'subsystem',
      source: 'usePhaseNarration',
      summary: `received: ${event.kind} verbosity=${verbosity}`,
      details: JSON.stringify(event),
      fen: event.fen,
    });

    let fullText = '';
    let apiResponse = '';
    let apiTimedOut = false;
    // The final display text to persist as a chat message (David 2026-07-01).
    let reportText = '';

    try {
      // WO-PHASE-LAG-02: check the shared Stockfish FEN cache first.
      // When Read Position ran the engine on this exact board a few
      // seconds ago (or another phase transition produced the same
      // position), we skip the engine cycle entirely and jump straight
      // to LLM dispatch. Emits narration-stockfish-cache-hit for
      // observability parity with usePositionNarration.
      let stockfishAnalysis: StockfishAnalysis | null;
      const cachedAnalysis = getCachedStockfish(event.fen);
      if (cachedAnalysis) {
        void logAppAudit({
          kind: 'narration-stockfish-cache-hit',
          category: 'subsystem',
          source: 'usePhaseNarration',
          summary: 'skipped Stockfish — cached analysis',
          fen: event.fen,
        });
        stockfishAnalysis = cachedAnalysis;
        console.log('[PHASE-HOOK-03] stockfish cache hit');
      } else {
        // WO-PHASE-LAG-01: mirror WO-POLISH-03's parallel + race pattern.
        // Stockfish runs alongside the rest of setup; we race it against
        // a short budget so LLM dispatch isn't blocked by engine
        // analysis. PHASE_NARRATION_ADDITION already handles missing
        // stockfishAnalysis gracefully. WO-PHASE-LAG-02: depth 12 → 10,
        // budget 500ms → 300ms, successful analyses cached for reuse.
        console.log('[PHASE-HOOK-03] stockfish analysis call (budgeted)');
        // David 2026-07-03: the old `analyzePosition(depth) raced-to-null`
        // pattern searched to a FIXED depth (unbounded time) and threw the
        // result away on timeout — so the slow iOS asm.js build (the WASM
        // builds OOM / call_indirect-trap on iPhone) NEVER returned an eval and
        // the brain guessed "equal material." `analyzeWithBudget` instead lets
        // the engine search for the budget, then `stop()`s it and returns the
        // BEST line it reached so far — depth 5/6 on asm, full depth on desktop
        // (which resolves early). We take whatever it found in the time instead
        // of demanding a target depth; a real shallow eval beats null. The
        // code-counted material balance still covers a truly dead engine (G0).
        // Budget is generous because desktop resolves on depth well before it,
        // so it only bounds the genuinely-slow asm path.
        const engineIsAsm = resolveWorkerUrl().variant === 'asm';
        const budgetMs = engineIsAsm ? 5000 : 1200;
        stockfishAnalysis = await stockfishEngine
          .analyzeWithBudget(event.fen, STOCKFISH_DEPTH, budgetMs)
          .then((r) => {
            setCachedStockfish(event.fen, r);
            return r as StockfishAnalysis | null;
          })
          .catch(() => null as StockfishAnalysis | null);
        console.log('[PHASE-HOOK-04] stockfish budget resolved', {
          hasAnalysis: stockfishAnalysis !== null,
        });
      }
      if (token !== activeTokenRef.current) return;

      const profile = await db.profiles.get('main');
      const rating = profile?.currentRating ?? 1200;
      const { getPgn, getOpeningName } = argsRef.current;

      // GROUNDING INVERSION (G0): hand the brain the REAL, code-computed tactics
      // for this position so it can only VOICE them — instead of free-reasoning
      // over the board and naming a pin/fork that isn't there (PostHog
      // `phase-narration.tacticClaimGate … no tactics context`, David 2026-06-22).
      // The prompt below already promises a "Tactics analysis block"; without
      // this the block was never sent, so the LLM invented tactics and the gate
      // stripped them. Reuses the Stockfish read just done — no extra round trip.
      const phaseTactics = await buildFedTacticsContext(
        event.fen,
        event.playerColor === 'white' ? 'w' : 'b',
        rating,
        stockfishAnalysis,
        undefined, // default analyzer
        profile?.skillRadar?.tactics, // adaptive lookahead (David 2026-07-03)
      ).catch(() => undefined);
      if (token !== activeTokenRef.current) return;

      const transitionLabel = event.kind === 'opening-to-middlegame'
        ? 'Opening → Middlegame'
        : 'Middlegame → Endgame';

      // Verbosity is not a length knob here — a phase transition is a rich
      // moment. Kept as a param for API compatibility.
      void verbosity;
      void transitionLabel;
      // GROUNDED framing (David 2026-07-09 + the 2026-07-06 voice law):
      // in-game narration VOICES facts computed in code and DECIDES nothing.
      // The transition label is the ONLY authored framing; the eval + tactics
      // that follow are all code-computed. `bestUci` is the engine PV[0] at
      // `event.fen` (the FEN's side-to-move is the OPPONENT — the transition
      // fires right after the student's move — and serveGroundedPositionDefault
      // handles the perspective flip + the student-relative assessment).
      const bestUci = stockfishAnalysis?.bestMove || stockfishAnalysis?.topLines?.[0]?.moves?.[0];
      let transitionSentence = event.kind === 'opening-to-middlegame'
        ? "The opening's set — we're into the middlegame now."
        : 'This is heading into an endgame.';
      // TEACHING at the transition (David 2026-07-12: "make the phase
      // transitions match more closely to danya's teachings"): his
      // opening→middlegame ritual is structure → idea → plan, so the whole
      // teaching note rides in — chosen by tightening circles (exact
      // position → recent path → the opening FAMILY's middlegame teaching,
      // since most real games have left book by the transition). Curated
      // note, code-selected; the model still only phrases (G0), and the
      // per-sentence board gate drops any family-level specific that isn't
      // true on this exact board.
      if (event.kind === 'opening-to-middlegame') {
        try {
          const sans = (getPgn() ?? '').split(/\s+/).filter((t) => t && !/^\d+\.$/.test(t));
          const openingName = getOpeningName?.() ?? detectOpening(sans)?.name ?? null;
          const note = transitionTeachingForGame({ historySans: sans, fen: event.fen, openingName });
          if (note) {
            const ritual = [note.explains, note.teaches, note.plans ? `The plan: ${note.plans}` : '']
              .filter((s) => s && s.trim())
              .join(' ');
            transitionSentence += ` ${ritual}`;
          }
        } catch { /* corpus is a bonus, never a blocker */ }
      }

      // Sentence-buffered streaming TTS. Every sentence chains through
      // speakForced so each Polly call awaits the previous one's
      // audio. Single-engine consistency: no Polly+Web-Speech overlap,
      // no dropped sentences from the dead speakQueuedForced path.
      let sentenceBuffer = '';
      let speechChain: Promise<void> = Promise.resolve();
      let sentenceCount = 0;
      const dispatchSentence = (sentence: string): void => {
        const trimmed = sentence.trim();
        if (!trimmed) return;
        // Per-sentence spoken gate — this surface streams sentences to
        // Polly as they arrive (before the spine's final-text gate), so a
        // board-false OR out-of-vocab-tactic sentence must be dropped HERE,
        // before it's spoken. Pass phaseTactics so the tactic half fires too —
        // it was omitted, so a hallucinated fork/pin was board-checked only and
        // still SPOKEN (David 2026-07-04 PostHog sweep).
        if (!isSpokenSentenceGrounded(trimmed, event.fen, 'usePhaseNarration', phaseTactics)) return;
        sentenceCount += 1;
        if (sentenceCount === 1) {
          const firstDispatchMs = Date.now() - detectedTs;
          void logAppAudit({
            kind: 'phase-narration-latency',
            category: 'subsystem',
            source: 'usePhaseNarration',
            summary: `detection-to-first-dispatch ${firstDispatchMs}ms (${event.kind})`,
            details: JSON.stringify({
              tapToFirstDispatchMs: firstDispatchMs,
              firstSentenceChars: trimmed.length,
              stockfishResolved: stockfishAnalysis !== null,
              transitionKind: event.kind,
            }),
            fen: event.fen,
          });
        }
        speechChain = speechChain
          .then(() => voiceService.speakForced(trimmed))
          .catch(() => undefined);
      };
      // `+` (not `*`) so a bare terminator like "..." can't match a
      // zero-char sentence. Requires ≥1 non-terminator char before the
      // `.`/`!`/`?` so we dispatch only actual sentences.
      const SENTENCE_END_RE = /([^.!?]+[.!?])(?=\s|$)/g;
      const flushCompletedSentences = (): void => {
        SENTENCE_END_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        let lastEnd = 0;
        while ((match = SENTENCE_END_RE.exec(sentenceBuffer)) !== null) {
          dispatchSentence(match[1]);
          lastEnd = SENTENCE_END_RE.lastIndex;
        }
        if (lastEnd > 0) sentenceBuffer = sentenceBuffer.slice(lastEnd);
      };

      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'usePhaseNarration',
        summary: `surface=phase-narration grounded=voiceFacts (G0 in-game narration, David 2026-07-09)`,
        fen: event.fen,
      });
      try {
        // GROUNDED (David 2026-07-09 + the 2026-07-06 voice law): compute the
        // transition read — engine eval + the board-verified tactics computed
        // above — and phrase it WARMLY through the ONE voiceFacts chokepoint
        // via `groundedMoveFeedback`. NO coachService.ask: that routes to the
        // Q&A grounding seal (a one-line default) AND would let the LLM
        // free-compose the board read, the exact G0 violation this build rips
        // out. The transition label rides in as `extraFacts` so the warm voice
        // leads with "we're into the middlegame" truthfully.
        const grounded = await withTimeout(
          groundedMoveFeedback({
            fen: event.fen,
            bestMoveUci: bestUci,
            evalCp: stockfishAnalysis?.evaluation,
            mateIn: stockfishAnalysis?.mateIn,
            tactics: phaseTactics,
            studentColor: event.playerColor,
            surface: 'phase-narration',
            extraFacts: transitionSentence,
            warm: true,
          }),
          NARRATION_API_TIMEOUT_MS,
          'phase-narration-api',
        );
        apiResponse = grounded ?? '';
        // Feed the grounded text through the SAME streaming sentence pipeline so
        // the per-sentence TTS pacing (Polly chain) is unchanged. The per-
        // sentence board gate still runs (defense in depth) but can't drop a
        // computed sentence about the real position.
        if (token === activeTokenRef.current && apiResponse) {
          fullText = apiResponse;
          setCurrentText(fullText);
          sentenceBuffer = apiResponse;
          flushCompletedSentences();
        }
        console.log('[PHASE-HOOK-06] grounded narration ready', {
          length: apiResponse.length,
          startsWithWarning: apiResponse.startsWith('⚠️'),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log('[PHASE-HOOK-06] grounded narration errored', msg);
        setError(msg);
        if (msg.endsWith('-timeout')) {
          apiTimedOut = true;
          void logAppAudit({
            kind: 'llm-error',
            category: 'subsystem',
            source: 'usePhaseNarration',
            summary: `phase narration compute timed out (${event.kind})`,
            details: msg,
            fen: event.fen,
          });
        }
      }

      if (token !== activeTokenRef.current) return;

      // Flush any tail text that didn't end with a sentence terminator
      // (e.g. stream truncated mid-sentence — still speakable).
      if (sentenceBuffer.trim()) {
        dispatchSentence(sentenceBuffer);
        sentenceBuffer = '';
      }
      // The streamed path produced the whole report in fullText — that's what
      // persists as the chat message.
      if (fullText.trim()) reportText = fullText.trim();

      // Fallback: if nothing streamed and nothing dispatched but the
      // API returned a usable response (non-streaming provider, rare),
      // dispatch that as a single speak.
      let fallbackPath = false;
      if (sentenceCount === 0) {
        const apiTrimmed = apiResponse.trim();
        if (apiTrimmed && !apiTrimmed.startsWith('⚠️')) {
          setCurrentText(apiTrimmed);
          reportText = apiTrimmed;
          dispatchSentence(apiTrimmed);
        } else if (apiTimedOut || apiTrimmed.startsWith('⚠️') || !apiTrimmed) {
          // WO-REAL-FIXES — render the deterministic template so the
          // user sees / hears SOMETHING for the transition. Audio
          // uses the local text — no API round-trip. Fire-and-forget
          // speak so a dead Polly device can't hold isNarrating=true
          // for the full 60s NARRATION_SPEAK_TIMEOUT_MS (which would
          // freeze the board's interactive prop and produce a
          // perceived "board reset").
          fallbackPath = true;
          const fallback = PHASE_FALLBACK_TEMPLATES[event.kind];
          const reason = apiTimedOut
            ? 'api-timeout'
            : apiTrimmed.startsWith('⚠️')
              ? 'api-warning'
              : 'empty-response';
          void logAppAudit({
            kind: 'phase-narration-fallback-shown',
            category: 'subsystem',
            source: 'usePhaseNarration',
            summary: `transition=${event.kind} reason=${reason}`,
            fen: event.fen,
          });
          setCurrentText(fallback);
          reportText = fallback;
          // Strip the leading `* ` before TTS — the asterisk is a
          // chat-banner affordance flagging the fallback path; Polly
          // reads the literal "asterisk" out loud otherwise (production
          // audit, build e2a96ed: voice spoke "* Endgame territory.
          // King activity..."). Chat keeps the prefix; voice gets the
          // bare prose.
          const spokenFallback = fallback.replace(/^\s*\*\s*/, '');
          voiceService.speakForced(spokenFallback).catch(() => {
            /* swallow — TTS hangs / device failures audit elsewhere */
          });
        } else {
          console.log('[PHASE-HOOK-07] speech SKIPPED: no speakable text');
          return;
        }
      }
      // Persist the finished report as a chat message so it lives in the
      // messages under the board instead of a transient banner that pops up
      // then disappears (David 2026-07-01). Fires once for BOTH the streamed
      // and fallback paths; the voice is handled separately, so this is
      // text-only (the chat panel's inject path mutes re-speaking).
      if (reportText.trim() && token === activeTokenRef.current) {
        argsRef.current.onReport?.(reportText.trim());
      }

      // Fallback path: don't await Polly — we already kicked it off
      // fire-and-forget above. Awaiting firstSpeakPromise (which is
      // null on this branch since we didn't go through dispatchSentence)
      // would no-op anyway, but the explicit return documents the
      // intent so a future reader doesn't reintroduce the freeze.
      if (fallbackPath) return;

      console.log('[PHASE-HOOK-07] streaming speech dispatched', {
        sentenceCount,
      });
      // Block isNarrating true until the speech chain drains —
      // preserves the "board frozen while main voice speaks"
      // invariant. Single-engine Polly chain plays under this gate.
      try {
        await withTimeout(
          speechChain,
          NARRATION_SPEAK_TIMEOUT_MS,
          'phase-narration-speak',
        );
        console.log('[PHASE-HOOK-08] speech chain drained');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log('[PHASE-HOOK-08] speech errored / timed out', msg);
        setError(msg);
        if (msg.endsWith('-timeout')) {
          voiceService.stop();
          void logAppAudit({
            kind: 'tts-failure',
            category: 'subsystem',
            source: 'usePhaseNarration',
            summary: 'phase narration TTS playback timed out',
            details: msg,
            fen: event.fen,
          });
        }
      }
    } finally {
      if (token === activeTokenRef.current) {
        setIsNarrating(false);
      }
    }
  }, []);

  return { narrate, cancel, isNarrating, currentText, error };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCoachChatResponse } from '../services/coachApi';
import { isSpokenSentenceGrounded } from '../services/coachAnswerGates';
import { buildFedTacticsContext, speakDeepestLookahead } from '../services/liveTacticsContext';
import { voiceService } from '../services/voiceService';
import { buildVoicePackage } from '../services/voicePackage';
import { stockfishEngine, resolveWorkerUrl } from '../services/stockfishEngine';
import { buildChessContextMessage, POSITION_NARRATION_ADDITION } from '../services/coachPrompts';
import { formatReadingFacts } from '../services/positionReadingService';
import { logAppAudit } from '../services/appAuditor';
import { db } from '../db/schema';
import {
  getCachedStockfish,
  setCachedStockfish,
  __resetStockfishFenCacheForTests,
} from './stockfishFenCache';
import type { CoachContext, StockfishAnalysis } from '../types';

export interface UsePositionNarrationArgs {
  fen: string;
  pgn: string;
  moveNumber: number;
  playerColor: 'white' | 'black';
  openingName?: string | null;
  /** Persist the finished "Read this position" narration as a chat message
   *  below the board (David 2026-07-06: "read position ... placed in the
   *  chat/text area below the board") — the SAME treatment phase-transition
   *  narration got. The banner is the live subtitle; this is the durable,
   *  rereadable copy. Fires once per read with the full text. */
  onReport?: (text: string) => void;
}

export interface UsePositionNarrationResult {
  narrate: () => Promise<void>;
  cancel: () => void;
  isNarrating: boolean;
  currentText: string;
  error: string | null;
}

/** Stockfish analysis depth for tap-time narration. WO-POLISH-03
 *  dropped 16 → 12; WO-PHASE-PROSE-01 drops 12 → 10. Deterministic
 *  tactics detection runs on every FEN regardless in
 *  buildChessContextMessage, so the engine is only contributing an
 *  eval direction + top lines — not something that needs tournament
 *  depth. Shaves another few hundred ms per tap on slow positions. */
const STOCKFISH_DEPTH = 10;
/** Per-FEN Stockfish cache is now shared across narration hooks via
 *  `stockfishFenCache.ts`. Extracted by WO-PHASE-LAG-02 so phase
 *  narration can skip the engine when Read Position already ran it on
 *  the same FEN (and vice versa). */
/** Test-only: clear the shared Stockfish cache between test cases.
 *  Re-exported for existing tests that import from this module. */
export const __resetStockfishCacheForTests = __resetStockfishFenCacheForTests;
/** Total budget for the coach LLM round-trip (network + stream). Raised
 *  30s→120s by WO-POLISH-02. A long-form narration at realistic stream
 *  rates can take well past 30s; the original cap was truncating valid
 *  responses mid-stream and leaving `fullText` short of a period. */
const NARRATION_API_TIMEOUT_MS = 120_000;
/** Speech playback budget. Raised 60s→600s by WO-POLISH-02 — the
 *  previous 60s cap was the primary `narration-speak-timeout` source
 *  (audit log Finding 49). A normal 300-word narration at Polly's
 *  spoken rate already runs well over 60s; 10 minutes is effectively
 *  unlimited for any narration we'd actually produce. The timeout
 *  remains a safety net for a frozen audio pipeline, not a truncator. */
const NARRATION_SPEAK_TIMEOUT_MS = 600_000;

/** Race a promise against a timeout. Rejects with an Error whose
 *  message ends in "-timeout" so the caller can cheaply distinguish
 *  timeout failures from genuine errors. Clears the timer on resolve. */
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
 * Drives the "Read this position" button on the coach play screen.
 *
 * Calls the coach LLM with POSITION_NARRATION_ADDITION, streams tokens
 * into `currentText` for a live subtitle banner, then hands each sentence
 * to voiceService.speakReadAloud() for TTS. Cancellation uses a token
 * counter so an in-flight run is superseded instead of racing.
 *
 * speakReadAloud (NOT speakForced) because "Read this position" is an
 * EXPLICIT, user-tapped read-aloud affordance — the user just asked to
 * hear THIS position, so it bypasses the Coach Narration verbosity gate
 * (silent AND brief), exactly like the opening-page Classic Wisdom /
 * section read-aloud buttons. Without this, a student on Silent/Brief
 * taps the button and gets a dead control: the subtitle streams but no
 * voice ever fires (CLAUDE.md G5 read-aloud carve-out).
 *
 * Every async step is bounded by a timeout. If any step hangs, the
 * timeout fires, the catch block runs, the finally resets state — so
 * the button can NEVER get stuck in "Reading…" and the board can NEVER
 * stay frozen. That's WO-COACH-NARRATION-05's invariant.
 */
export function usePositionNarration(args: UsePositionNarrationArgs): UsePositionNarrationResult {
  const [isNarrating, setIsNarrating] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const activeTokenRef = useRef(0);

  // Defensive unmount cleanup — bump the token so any pending narrate
  // call becomes a no-op at its next checkpoint, stop audio, clear
  // state. State setters on an unmounted component are silent no-ops
  // in React 18+, so this is safe.
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

  const narrate = useCallback(async () => {
    // Bump the token so any still-running call from a prior tap bails
    // out when it next checks. stop() kills in-flight audio immediately.
    activeTokenRef.current += 1;
    const token = activeTokenRef.current;
    voiceService.stop();
    setError(null);
    setCurrentText('');
    setIsNarrating(true);
    // WO-POLISH-03: record tap timestamp so the first-sentence
    // dispatch can log tap-to-first-word latency in the audit trail.
    const tapTs = Date.now();

    // Accumulated streamed text. Lives outside the API try/catch so a
    // truncated / aborted / timed-out stream still produces voice for
    // whatever the coach already generated. Rule: if the coach
    // generated words, Dave hears them.
    let fullText = '';
    let apiResponse = '';
    let apiTimedOut = false;

    try {
      // WO-PHASE-PROSE-01: per-FEN cache check before firing the
      // engine. Repeat taps on the same position (common when the
      // student re-reads a tense middlegame a few seconds apart) skip
      // the engine cycle entirely.
      const cachedAnalysis = getCachedStockfish(args.fen);
      let stockfishAnalysis: StockfishAnalysis | null;
      if (cachedAnalysis) {
        void logAppAudit({
          kind: 'narration-stockfish-cache-hit',
          category: 'subsystem',
          source: 'usePositionNarration',
          summary: 'skipped Stockfish — cached analysis',
          fen: args.fen,
        });
        stockfishAnalysis = cachedAnalysis;
      } else {
        // David 2026-07-03: use a time-BUDGETED search, not depth-raced-to-null.
        // The old pattern ran to a fixed depth (unbounded time) and discarded
        // the result on timeout, so the slow iOS asm.js engine never returned an
        // eval. `analyzeWithBudget` searches for the budget then `stop()`s and
        // returns the BEST line reached so far — desktop resolves early on
        // depth, asm returns its shallow-but-real eval. We take what it found in
        // the time; code-counted material (buildChessContextMessage) covers a
        // dead engine (G0).
        const engineIsAsm = resolveWorkerUrl().variant === 'asm';
        const budgetMs = engineIsAsm ? 5000 : 1200;
        stockfishAnalysis = await stockfishEngine
          .analyzeWithBudget(args.fen, STOCKFISH_DEPTH, budgetMs)
          .then((r) => {
            setCachedStockfish(args.fen, r);
            return r as StockfishAnalysis | null;
          })
          .catch(() => null as StockfishAnalysis | null);
      }
      if (token !== activeTokenRef.current) return;

      const profile = await db.profiles.get('main');
      const rating = profile?.currentRating ?? 1200;

      // Build the bounded tactics context so the per-sentence spoken gate below
      // can drop an out-of-vocab fork/pin too, not just a board-false fact — a
      // "read this position" narration naming a tactic that isn't there was the
      // one remaining tactic-ungated read-aloud (David 2026-07-04 sweep).
      // Reuses the stockfishAnalysis already computed above — no extra engine
      // read; falls back to a FEN-only scan if that analysis is thin.
      const posStudentCC = args.playerColor === 'white' ? 'w' : 'b';
      const posTactics = (await buildFedTacticsContext(
        args.fen,
        posStudentCC,
        rating,
        stockfishAnalysis,
        () => Promise.resolve(null), // latency-safe: reuse the cached analysis, no extra engine read
        profile?.skillRadar?.tactics,
      ).catch(() => undefined)) ?? null;
      if (token !== activeTokenRef.current) return;

      // G0 — compute the extra reading facts (SEE-accurate material at risk,
      // pawn breaks, good/bad piece quality) in code and hand them to the coach
      // so its spoken read is grounded, not eyeballed. Complements the tactics
      // sub-block buildChessContextMessage already injects. Wrapped defensively:
      // a bad FEN returns '' and the narration falls back to the base facts.
      let readingFacts = '';
      try {
        readingFacts = formatReadingFacts(args.fen, args.playerColor);
      } catch {
        readingFacts = '';
      }

      // P5 — GUARANTEED deep look-ahead (David 2026-07-26: "add it to the package
      // gen to the llm — it will have no choice but to speak the words"). The
      // app's DEEPEST foresight is the PV scan in posTactics; feeding it to the
      // prompt as CONTEXT let the LLM skip it (diluted). Instead PRE-COMPOSE the
      // exact spoken line in code (speakDeepestLookahead — G0: the engine decided,
      // the voice only phrases) and inject it as a REQUIRED utterance, so the
      // model must voice the computed foresight verbatim. Null on a quiet board.
      const lookaheadLine = posTactics ? speakDeepestLookahead(posTactics) : null;
      const requiredLookahead = lookaheadLine
        ? ` REQUIRED: the engine has computed the deepest look-ahead for this position. You MUST include this exact sentence, verbatim, as part of your narration (do not paraphrase, do not omit it): "${lookaheadLine}"`
        : '';

      const context: CoachContext = {
        fen: args.fen,
        lastMoveSan: null,
        moveNumber: args.moveNumber,
        pgn: args.pgn,
        openingName: args.openingName ?? null,
        stockfishAnalysis,
        playerMove: null,
        moveClassification: null,
        playerProfile: { rating, weaknesses: [] },
        additionalContext: `${readingFacts ? `${readingFacts}\n\n` : ''}The student is playing as ${args.playerColor}. They just tapped "Read this position" — give them a live, spoken narration of what you see.${requiredLookahead}`,
      };

      const userMessage = buildChessContextMessage(context);

      // Sentence-buffered streaming TTS. Every sentence chains through
      // speakForced via a Promise chain so each Polly call awaits the
      // previous one's audio. Single engine (Polly) means no
      // Polly+Web-Speech overlap, no dropped sentences from the dead
      // speakQueuedForced path.
      let sentenceBuffer = '';
      let speechChain: Promise<void> = Promise.resolve();
      let sentenceCount = 0;
      const dispatchSentence = (sentence: string): void => {
        const trimmed = sentence.trim();
        if (!trimmed) return;
        // Per-sentence spoken gate. This surface streams each sentence
        // straight to TTS as it arrives (no final-text chokepoint), so the
        // gate must run HERE — never speak a provably-false board fact.
        if (!isSpokenSentenceGrounded(trimmed, args.fen, 'usePositionNarration', posTactics)) return;
        sentenceCount += 1;
        if (sentenceCount === 1) {
          const firstDispatchMs = Date.now() - tapTs;
          void logAppAudit({
            kind: 'narration-latency',
            category: 'subsystem',
            source: 'usePositionNarration',
            summary: `tap-to-first-dispatch ${firstDispatchMs}ms`,
            details: JSON.stringify({
              tapToFirstDispatchMs: firstDispatchMs,
              firstSentenceChars: trimmed.length,
              stockfishResolved: stockfishAnalysis !== null,
            }),
            fen: args.fen,
          });
        }
        // PACKAGED. Read-this-position speaks per sentence straight to TTS as
        // the stream arrives, so there is no final chokepoint downstream — the
        // check has to be here or it is nowhere. `args.fen` is the board the
        // student asked to have read, which is the board every sentence in the
        // read is about.
        speechChain = speechChain
          .then(() => {
            const pkg = buildVoicePackage([{ kind: 'computed', text: trimmed, fen: args.fen }]);
            // speakReadAloud, not speakPackage: this is the G5 read-aloud
            // carve-out — the student TAPPED to hear it, so it bypasses the
            // verbosity gate. Packaging governs TRUTH; the carve-out governs
            // WHETHER a tapped read is allowed to speak at all. Routing it
            // through speakPackage would silently re-apply the gate and make
            // the button dead on Silent/Brief again.
            return pkg.spoken ? voiceService.speakReadAloud(pkg.spoken) : undefined;
          })
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

      try {
        apiResponse = await withTimeout(
          getCoachChatResponse(
            [{ role: 'user', content: userMessage }],
            POSITION_NARRATION_ADDITION,
            (chunk: string) => {
              if (token !== activeTokenRef.current) return;
              fullText += chunk;
              setCurrentText(fullText);
              sentenceBuffer += chunk;
              flushCompletedSentences();
            },
            'position_analysis_chat',
            // Raised 2000→4000 by WO-POLISH-02. Effectively unlimited
            // for a narration; the cap is never the reason a sentence
            // gets cut off.
            4000,
            // Override verbosity — narration length is constrained by the
            // prompt, not by the student's global verbosity setting.
            'medium',
          ),
          NARRATION_API_TIMEOUT_MS,
          'narration-api',
        );
      } catch (err: unknown) {
        // Stream errored or timed out — DON'T bail. Tokens already
        // streamed are speakable. Record the error and fall through.
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        if (msg.endsWith('-timeout')) {
          apiTimedOut = true;
          void logAppAudit({
            kind: 'llm-error',
            category: 'subsystem',
            source: 'usePositionNarration',
            summary: 'narration API call timed out',
            details: msg,
            fen: args.fen,
          });
        }
      }

      // Only suppress speech on explicit user cancel / re-tap (token
      // supersession). Stream errors / truncation still speak whatever
      // arrived before the failure.
      if (token !== activeTokenRef.current) return;

      // Flush any tail text that didn't end with a sentence terminator
      // (e.g. stream truncated mid-sentence — still speakable).
      if (sentenceBuffer.trim()) {
        dispatchSentence(sentenceBuffer);
        sentenceBuffer = '';
      }

      // Fallback path: if nothing streamed and nothing dispatched, but
      // the API returned a usable response (non-streaming provider,
      // rare), dispatch that as a single speak.
      if (sentenceCount === 0) {
        const apiTrimmed = apiResponse.trim();
        if (apiTrimmed && !apiTrimmed.startsWith('⚠️')) {
          setCurrentText(apiTrimmed);
          dispatchSentence(apiTrimmed);
        } else if (apiTimedOut) {
          // Nothing to say and the call timed out — surface retry hint.
          setCurrentText('Narration timed out — tap again to retry.');
          return;
        } else {
          return;
        }
      }

      // Mirror the finished read into the CHAT transcript below the board
      // (David 2026-07-06) — same treatment as phase-transition narration.
      // The banner is the live subtitle; the chat is the durable copy the
      // student can scroll back and reread.
      const finalReadText = fullText.trim() || apiResponse.trim();
      if (finalReadText && !finalReadText.startsWith('⚠️')) {
        args.onReport?.(finalReadText);
      }

      // Block isNarrating true until the speech chain drains — preserves
      // the "board frozen while main voice speaks" invariant from
      // WO-COACH-NARRATION-05. Single-engine Polly chain means the
      // entire narration plays under this gate, no Web Speech tail.
      try {
        await withTimeout(speechChain, NARRATION_SPEAK_TIMEOUT_MS, 'narration-speak');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        if (msg.endsWith('-timeout')) {
          voiceService.stop();
          void logAppAudit({
            kind: 'tts-failure',
            category: 'subsystem',
            source: 'usePositionNarration',
            summary: 'narration TTS playback timed out',
            details: msg,
            fen: args.fen,
          });
        }
      }
    } finally {
      // This is the invariant: if narration is not actively streaming
      // audio right now, the hook's state says so — and therefore the
      // board unfreezes. Token-gated so a superseded older call
      // doesn't clobber the newer call's active state.
      if (token === activeTokenRef.current) {
        setIsNarrating(false);
      }
    }
  }, [args.fen, args.pgn, args.moveNumber, args.playerColor, args.openingName, args.onReport]);

  return { narrate, cancel, isNarrating, currentText, error };
}

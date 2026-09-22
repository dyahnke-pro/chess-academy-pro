import { useCallback, useEffect, useRef, useState } from 'react';
import { voiceFacts, speakableFacts } from '../services/coachApi';
import { buildFedTacticsContext, speakDeepestLookahead } from '../services/liveTacticsContext';
import { voiceService } from '../services/voiceService';
import { splitSpeakableSentences } from '../utils/sentenceSplit';
import { buildVoicePackage } from '../services/voicePackage';
import { stockfishEngine, resolveWorkerUrl } from '../services/stockfishEngine';
import { readPosition } from '../services/positionalRead';
import { detectPhase } from '../services/narratedContinuation';
import { computePositionFacts, clauseText } from '../services/positionFacts';
import { useWeaknessSignals } from './useWeaknessSignals';
import { teachingSourceForBoard, generalizedTeaching, spokenBeatText } from '../services/danyaTeachingService';
import { logAppAudit } from '../services/appAuditor';
import { db } from '../db/schema';
import {
  getCachedStockfish,
  setCachedStockfish,
  __resetStockfishFenCacheForTests,
} from './stockfishFenCache';
import type { StockfishAnalysis } from '../types';

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
 *  dropped 16 → 12; WO-PHASE-PROSE-01 drops 12 → 10. The board computers
 *  (positionFacts, readPosition, the tactics scan) run on every FEN
 *  regardless, so the engine is only contributing an eval direction + top
 *  lines — not something that needs tournament depth. */
const STOCKFISH_DEPTH = 10;
/** Per-FEN Stockfish cache is now shared across narration hooks via
 *  `stockfishFenCache.ts`. Extracted by WO-PHASE-LAG-02 so phase
 *  narration can skip the engine when Read Position already ran it on
 *  the same FEN (and vice versa). */
/** Test-only: clear the shared Stockfish cache between test cases.
 *  Re-exported for existing tests that import from this module. */
export const __resetStockfishCacheForTests = __resetStockfishFenCacheForTests;
/** Total budget for the phrasing round-trip. On expiry the COMPUTED facts
 *  are spoken raw — the read exists before the model is asked, so a slow
 *  phraser costs the house voice, never the answer. */
const NARRATION_API_TIMEOUT_MS = 120_000;
/** Speech playback budget. Raised 60s→600s by WO-POLISH-02 — the
 *  previous 60s cap was the primary `narration-speak-timeout` source
 *  (audit log Finding 49). A normal 300-word narration at Polly's
 *  spoken rate already runs well over 60s; 10 minutes is effectively
 *  unlimited for any narration we'd actually produce. The timeout
 *  remains a safety net for a frozen audio pipeline, not a truncator. */
const NARRATION_SPEAK_TIMEOUT_MS = 600_000;
/** The phase, as the coach names it opening a read — computed, one line each.
 *  A Record over the union so a fourth phase cannot ship without a sentence. */
const PHASE_LINE: Record<ReturnType<typeof detectPhase>, string> = {
  opening: 'Still in the opening.',
  middlegame: 'This is the middlegame now.',
  endgame: 'This is the endgame now.',
};

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
 * G0 — INVERTED (WO-STANDARD-01 F2, 2026-09-22). This used to hand the model
 * a grounding-allowance prompt (POSITION_NARRATION_ADDITION: "every piece
 * location MUST match the FEN… every tactic MUST appear in the block…") and
 * let it AUTHOR the read, streaming each sentence through a per-sentence
 * validator (`isSpokenSentenceGrounded`) on its way to TTS. That is the
 * disease G0 names: a validator exists only because the model was still
 * deciding. Now the read is COMPUTED in code — the corpus note leads
 * (`teachingSourceForBoard`), then the phase, the position facts, the ranked
 * positional read (`readPosition`) and the engine's deepest look-ahead — and
 * the model only PHRASES that bundle through the one chokepoint, `voiceFacts`,
 * from the coach-is-opponent seat. With the provider dead the same facts are
 * spoken in the raw computed register, so the button can never go silent
 * over a phrasing hiccup. There is nothing left to validate per sentence.
 *
 * The phrased read lands in `currentText` for the chat bubble, then each
 * sentence goes to voiceService.speakReadAloud() for TTS. Cancellation uses a
 * token counter so an in-flight run is superseded instead of racing.
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
  const weaknessRef = useWeaknessSignals(); // student model → re-ranks the read (Phase 1)
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
        // the time; the code-computed read below covers a dead engine (G0).
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

      // The bounded tactics context — the engine's deepest look-ahead is read
      // off it below. Reuses the stockfishAnalysis already computed above (no
      // extra engine read); falls back to a FEN-only scan if that analysis is
      // thin.
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

      // ── THE FACTS, IN CODE. Every sentence below is computed; the model
      //    only phrases them. Ordered most-important-first for the voice.

      // 1. THE CORPUS LEADS (David 2026-08-13: "narrations follow the corpus,
      //    hand written, computed note format"). A read of the board starts
      //    from a farmed teaching note about THIS position or structure when
      //    one exists — board-gated at retrieval (teachingSourceForBoard),
      //    framed honestly by origin (generalizedTeaching). No note = the
      //    computed facts carry the read alone.
      let noteLine = '';
      try {
        const historySans = args.pgn.split(/\s+/).map((t) => t.replace(/^\d+\.+/, '')).filter((t) => t && !/^(?:1-0|0-1|1\/2-1\/2|\*)$/.test(t));
        const src = teachingSourceForBoard(historySans, args.fen, args.openingName ?? null, args.playerColor);
        if (src) noteLine = generalizedTeaching(src.origin, spokenBeatText(src.note)).trim();
      } catch { /* corpus unavailable — the computed read stands alone */ }

      // 2. THE PHASE — the old prompt asked the model to "open by naming the
      //    phase"; it is a two-line computation.
      const plyCount = args.pgn.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t)).length;
      const phaseLine = PHASE_LINE[detectPhase(args.fen, plyCount)];

      // 3. POSITION FACTS — the computed board-truth supply (importance-gated,
      //    DNA): the decision/intent read, the must-defend, the why-probe.
      //    `must-defend` is INCLUDED now — it used to be excluded because the
      //    prompt block `formatReadingFacts` listed the material at risk, and
      //    that block was model input, never something a student could hear.
      let positionFactsBlock = '';
      try {
        if (stockfishAnalysis?.topLines?.length) {
          const pf = await computePositionFacts({
            // The student TAPPED "read this position". Silence would be a dead
            // button — the same reasoning that exempts this surface from the
            // verbosity gate (CLAUDE.md §G5, third sanctioned exemption).
            posture: 'walk',
            fen: args.fen,
            moverColor: args.fen.split(' ')[1] === 'b' ? 'b' : 'w',
            studentColor: posStudentCC,
            rating,
            analysis: stockfishAnalysis,
            evalBoard: (f) => stockfishEngine.evalBoard(f),
            studentWeaknesses: weaknessRef.current,
          });
          positionFactsBlock = clauseText(pf.clauses).join(' ');
        }
      } catch { positionFactsBlock = ''; }
      if (token !== activeTokenRef.current) return;

      // 4. THE POSITIONAL READ — every ranked observation on both sides of the
      //    board (`readPosition`: king safety, development, weak pawns,
      //    outposts, levers, passers, files), most useful first. NO cap
      //    (G4.5): the ranker orders, the student hears what it ranked. An
      //    observation whose square the facts above already named is skipped
      //    — say a thing once.
      const readLines: string[] = [];
      try {
        const already = `${noteLine} ${positionFactsBlock}`.toLowerCase();
        for (const o of readPosition(args.fen, args.playerColor)) {
          const naming = o.text.toLowerCase().match(/[a-h][1-8]/)?.[0];
          if (naming && already.includes(naming)) continue;
          readLines.push(o.text);
        }
      } catch { /* the read is a bonus, never a blocker */ }

      // 5. THE DEEPEST LOOK-AHEAD — the PV scan in posTactics, pre-composed as
      //    the exact spoken line in code (speakDeepestLookahead — G0: the
      //    engine decided, the voice only phrases). Null on a quiet board.
      const lookaheadLine = posTactics ? speakDeepestLookahead(posTactics, 'coach-is-opponent', weaknessRef.current) : null;

      const facts = [noteLine, phaseLine, positionFactsBlock, ...readLines, lookaheadLine ?? '']
        .map((t) => t.trim())
        .filter(Boolean)
        .join(' ');
      if (!facts) {
        setCurrentText('');
        return;
      }

      // ── THE PHRASING — one call through the one chokepoint. The coach on
      //    this surface IS the opponent (Play, Learn guided play), so it speaks
      //    as "I / my" for its own pieces and "you / your" for the student's.
      //    A timeout or a dead provider serves the computed facts raw
      //    (speakableFacts) — the correct read exists before the model is
      //    asked, so nothing can race it away (David 2026-07-04).
      let spoken: string;
      try {
        spoken = (await withTimeout(
          voiceFacts(facts, {
            warm: true,
            intent: 'position-read',
            perspective: { mode: 'coach-is-opponent' },
            directives: 'The student tapped "read this position" and is listening to you live. Speak every fact given, most important first; the first sentence must stand alone. Do not suggest a move. Do not recap the last move.',
          }),
          NARRATION_API_TIMEOUT_MS,
          'narration-api',
        )) ?? speakableFacts(facts);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        if (msg.endsWith('-timeout')) {
          void logAppAudit({
            kind: 'llm-error',
            category: 'subsystem',
            source: 'usePositionNarration',
            summary: 'narration phrasing timed out — speaking the computed facts raw',
            details: msg,
            fen: args.fen,
          });
        }
        spoken = speakableFacts(facts);
      }
      if (token !== activeTokenRef.current) return;
      spoken = spoken.trim();
      if (!spoken) return;
      setCurrentText(spoken);

      // ── THE VOICE. Sentence by sentence through the package (truth) and
      //    speakReadAloud (the G5 read-aloud carve-out — the student TAPPED to
      //    hear it, so it bypasses the verbosity gate; routing it through
      //    speakPackage would silently re-apply the gate and make the button
      //    dead on Silent/Brief again). Packaging governs TRUTH; the carve-out
      //    governs WHETHER a tapped read is allowed to speak at all.
      const { sentences, rest } = splitSpeakableSentences(spoken);
      const utterances = [...sentences, rest].map((t) => t.trim()).filter(Boolean);
      let speechChain: Promise<void> = Promise.resolve();
      let sentenceCount = 0;
      for (const sentence of utterances) {
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
              firstSentenceChars: sentence.length,
              stockfishResolved: stockfishAnalysis !== null,
            }),
            fen: args.fen,
          });
        }
        speechChain = speechChain
          .then(() => {
            const pkg = buildVoicePackage([{ kind: 'computed', text: sentence, fen: args.fen }]);
            return pkg.spoken ? voiceService.speakReadAloud(pkg.spoken) : undefined;
          })
          .catch(() => undefined);
      }

      // Mirror the finished read into the CHAT transcript below the board
      // (David 2026-07-06) — same treatment as phase-transition narration.
      // The banner is the live subtitle; the chat is the durable copy the
      // student can scroll back and reread.
      args.onReport?.(spoken);

      // Block isNarrating true until the speech chain drains — preserves
      // the "board frozen while main voice speaks" invariant from
      // WO-COACH-NARRATION-05.
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

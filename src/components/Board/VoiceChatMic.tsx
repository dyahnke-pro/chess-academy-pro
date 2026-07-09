import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceInputService } from '../../services/voiceInputService';
import { voiceService } from '../../services/voiceService';
import { speechService } from '../../services/speechService';
import { useAppStore } from '../../stores/appStore';
import { dispatchCoachTurn } from '../../coach/dispatchCoachTurn';
import { isSpokenSentenceGrounded } from '../../services/coachAnswerGates';
import { tryRouteIntent } from '../../services/coachSessionRouter';
import { logAppAudit } from '../../services/appAuditor';
import { stockfishEngine } from '../../services/stockfishEngine';
import { extractAndRememberNotes } from '../../services/coachMemoryService';
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import { db } from '../../db/schema';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

/** Dexie meta key for the one-time "voice needs volume" banner. Set
 *  to '1' once shown so we don't repeat on every mic tap. */
const VOICE_ONBOARDING_META_KEY = 'voice-onboarding-shown';
import { uciMoveToSan, uciLinesToSan } from '../../utils/uciToSan';
import type { ChatMessage, BoardArrow } from '../../types';

/** Parse [ARROW:from:to] tags from LLM response. Returns arrows and cleaned text. */
function extractArrows(text: string): { arrows: BoardArrow[]; cleanText: string } {
  const ARROW_RE = /\[ARROW:([a-h][1-8]):([a-h][1-8])\]/gi;
  const arrows: BoardArrow[] = [];
  let match: RegExpExecArray | null;
  while ((match = ARROW_RE.exec(text)) !== null) {
    arrows.push({
      startSquare: match[1],
      endSquare: match[2],
      color: 'rgba(255, 170, 0, 0.85)',
    });
  }
  const cleanText = text.replace(ARROW_RE, '').replace(/\s{2,}/g, ' ').trim();
  return { arrows, cleanText };
}

export interface EngineSnapshot {
  bestMove: string;
  evaluation: number;
  isMate: boolean;
  mateIn: number | null;
  topLines: { moves: string[]; evaluation: number; mate: number | null }[];
}

export interface LastMoveContext {
  san: string;
  player: 'you' | 'opponent';
  classification: string | null;
  evalBefore: number | null;
  evalAfter: number | null;
  bestMove: string | null;
}

interface VoiceChatMicProps {
  fen: string;
  pgn?: string;
  turn?: 'w' | 'b';
  /** Which color the student is playing ('white' or 'black'). */
  playerColor?: 'white' | 'black';
  /** Called when the user asks the coach to play a specific opening (e.g. "French Defense"). */
  onOpeningRequest?: (openingName: string) => void;
  /** Pre-computed engine snapshot (avoids running Stockfish again). */
  engineSnapshot?: EngineSnapshot | null;
  /** Context about the last move played (for "was that an inaccuracy?" questions). */
  lastMoveContext?: LastMoveContext | null;
  /** Called when listening state changes (true = mic active). */
  onListeningChange?: (listening: boolean) => void;
  /** Called when the LLM response includes arrow annotations for the board. */
  onArrows?: (arrows: BoardArrow[]) => void;
  // WO-DEEP-DIAGNOSTICS — voice-side intent dispatch surface callbacks.
  // The voice path used to bypass coachService.ask's tool dispatch
  // entirely; utterances went straight to getCoachChatResponse which
  // has no tool-call surface, so "take back" / "play X" produced LLM
  // chat ABOUT the action instead of an actual dispatch. These
  // callbacks let the mic pre-route deterministic commands the same
  // way GameChatPanel.handleSend does, and the voice-flow audit kinds
  // surface every step so a "voice take-back didn't take back"
  // report has a complete causal chain.
  onPlayMove?: (san: string) => boolean | { ok: boolean; reason?: string } | Promise<boolean | { ok: boolean; reason?: string }>;
  onTakeBackMove?: (count: number) => boolean | { ok: boolean; reason?: string } | Promise<boolean | { ok: boolean; reason?: string }>;
  onResetBoard?: () => boolean | { ok: boolean; reason?: string } | Promise<boolean | { ok: boolean; reason?: string }>;
  /** Optional: live `game.history.length` getter so the
   *  voice-game-state-after audit can prove the take-back actually
   *  shrank the move list. */
  getMoveCount?: () => number;
  /** Optional: live FEN getter for the same audit. */
  getCurrentFen?: () => string;
}

const VOICE_ENGINE_DEPTH = 10;
/** Tokens cap for voice replies. Previously 120 (set in PR #230 for
 *  latency), but that truncates the first-ever greeting's
 *  capabilities tour and any 3+ sentence answer. 400 keeps replies
 *  in the "comfortable spoken length" band (~45 seconds max) without
 *  cutting off a natural mid-thought. */
const VOICE_MAX_TOKENS = 400;

/** Regex that flags when the user's question is move/position specific
 *  enough that the engine analysis block is worth including. Most
 *  conversational turns ("what's a fork?", "can you teach me the
 *  Sicilian?") don't need engine data and the extra tokens just slow
 *  things down. */
const ENGINE_REQUIRED_RE = /\b(best|blunder|mistake|inaccur|trade|sacrifice|hanging|threat|check\s*mate|winning|losing|eval|what.*(move|play)|should\s*i|analy[sz]e|position)\b/i;

function shouldIncludeEngine(userText: string): boolean {
  return ENGINE_REQUIRED_RE.test(userText);
}

/**
 * Inline mic button for the board controls bar.
 * Voice-to-voice only — no text bubble. Continuous listening stays on
 * until the user taps again. LLM responses are spoken aloud.
 */
/** Common opening name patterns users might say via voice. */
const OPENING_REQUEST_RE = /\b(?:play|use|try|do|go with|switch to|let'?s (?:play|try|do))\b.*?\b(french|sicilian|caro[- ]?kann|italian|spanish|ruy lopez|queen'?s gambit|king'?s indian|english|pirc|scandinavian|alekhine|dutch|london|scotch|vienna|petroff|philidor|nimzo[- ]?indian|grunfeld|slav|catalan|benoni|bogo[- ]?indian)\b/i;

function detectOpeningRequest(text: string): string | null {
  const match = OPENING_REQUEST_RE.exec(text);
  if (!match) return null;
  const raw = match[1].toLowerCase().replace(/-/g, ' ');
  const nameMap: Record<string, string> = {
    french: 'French Defense',
    sicilian: 'Sicilian Defense',
    'caro kann': 'Caro-Kann Defense',
    italian: 'Italian Game',
    spanish: 'Spanish Opening',
    'ruy lopez': 'Ruy Lopez',
    "queen's gambit": "Queen's Gambit",
    'queens gambit': "Queen's Gambit",
    "king's indian": "King's Indian Defense",
    'kings indian': "King's Indian Defense",
    english: 'English Opening',
    pirc: 'Pirc Defense',
    scandinavian: 'Scandinavian Defense',
    alekhine: "Alekhine's Defense",
    dutch: 'Dutch Defense',
    london: 'London System',
    scotch: 'Scotch Game',
    vienna: 'Vienna Game',
    petroff: "Petrov's Defense",
    philidor: "Philidor Defense",
    'nimzo indian': 'Nimzo-Indian Defense',
    grunfeld: 'Grunfeld Defense',
    slav: 'Slav Defense',
    catalan: 'Catalan Opening',
    benoni: 'Benoni Defense',
    'bogo indian': 'Bogo-Indian Defense',
  };
  return nameMap[raw] ?? raw;
}

export function VoiceChatMic({ fen, turn, playerColor = 'white', onOpeningRequest, engineSnapshot, lastMoveContext, onListeningChange, onArrows, onPlayMove, onTakeBackMove, onResetBoard, getMoveCount, getCurrentFen }: VoiceChatMicProps): JSX.Element {
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [unsupportedFlash, setUnsupportedFlash] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [onboardingBanner, setOnboardingBanner] = useState<string | null>(null);
  // Live interim transcript shown above the mic while the user is
  // speaking. Cleared on final recognition + after the coach replies.
  // The single biggest UX win — makes the mic feel responsive
  // instead of "did it even hear me?"
  const [interimTranscript, setInterimTranscript] = useState('');
  const listeningRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  // Gate the pulsing mic animation on the user's motion preference —
  // accessibility requires respecting this system setting.
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  // Notify parent when voice is active (listening or speaking response)
  useEffect(() => {
    onListeningChange?.(listening || isStreaming);
  }, [listening, isStreaming, onListeningChange]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleUserMessage = useCallback(async (text: string) => {
    // WO-DEEP-DIAGNOSTICS — full causal chain for voice utterances.
    // Stage 1: transcript landed.
    void logAppAudit({
      kind: 'voice-transcript-received',
      category: 'subsystem',
      source: 'VoiceChatMic.handleUserMessage',
      summary: `text="${text.slice(0, 80)}" len=${text.length}`,
      fen,
    });

    // Stage 2: try to route the transcript as a direct command.
    // This pipeline matches what GameChatPanel.handleSend does on the
    // text side, so voice and chat see the same regex shapes.
    // `lastMoveBy` is derived from `lastMoveContext.player` so the
    // router can map "take back your move" / "take back my move" onto
    // the correct ply count.
    const lastMoveBy: 'user' | 'coach' | undefined = lastMoveContext
      ? lastMoveContext.player === 'you'
        ? 'user'
        : 'coach'
      : undefined;
    const routedIntent = tryRouteIntent(text, { currentFen: fen, lastMoveBy });
    void logAppAudit({
      kind: 'voice-route-result',
      category: 'subsystem',
      source: 'VoiceChatMic.handleUserMessage',
      summary: routedIntent
        ? `matched=${routedIntent.kind} args=${JSON.stringify(routedIntent).slice(0, 80)}`
        : 'matched=none (falling through to LLM)',
    });

    // Mirror voice turns into the spine's conversation memory so the
    // brain's next envelope reflects the back-and-forth. Voice was
    // flying blind here pre-fix — every routed intent + LLM reply
    // landed in local chat state but never in memory, leaving the
    // brain dissociative-amnesic for anything spoken (the audit-found
    // CoachChatPage class of bugs swept across all chat surfaces).
    const recordMemory = (role: 'user' | 'coach', textContent: string): void => {
      useCoachMemoryStore.getState().appendConversationMessage({
        surface: 'chat-in-game',
        role,
        text: textContent,
        fen: fen || undefined,
        trigger: null,
      });
    };

    if (routedIntent) {
      const userMsg: ChatMessage = {
        id: `voice-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };
      setMessages([...messagesRef.current, userMsg]);
      recordMemory('user', text);
      const beforeMoveCount = getMoveCount?.() ?? -1;
      const beforeFen = getCurrentFen?.() ?? fen;

      // Stage 3 — surface callback dispatch.
      void logAppAudit({
        kind: 'voice-callback-invoked',
        category: 'subsystem',
        source: 'VoiceChatMic.handleUserMessage',
        summary: `kind=${routedIntent.kind} hasCallback=${
          routedIntent.kind === 'play_move'
            ? typeof onPlayMove === 'function'
            : routedIntent.kind === 'take_back_move'
              ? typeof onTakeBackMove === 'function'
              : routedIntent.kind === 'reset_board'
                ? typeof onResetBoard === 'function'
                : 'unsupported-in-voice'
        }`,
      });

      let ackText = 'Done.';
      let ok = false;
      let reason: string | undefined;
      try {
        switch (routedIntent.kind) {
          case 'play_move': {
            if (!onPlayMove) { reason = 'no onPlayMove callback'; break; }
            const r = await Promise.resolve(onPlayMove(routedIntent.san));
            ok = typeof r === 'boolean' ? r : r.ok;
            if (ok) ackText = `${routedIntent.san}.`;
            else reason = typeof r === 'object' && 'reason' in r ? r.reason : 'rejected';
            break;
          }
          case 'take_back_move': {
            if (!onTakeBackMove) { reason = 'no onTakeBackMove callback'; break; }
            const r = await Promise.resolve(onTakeBackMove(routedIntent.count));
            ok = typeof r === 'boolean' ? r : r.ok;
            if (ok) ackText = routedIntent.count > 1 ? 'Took both back.' : 'Took it back.';
            else reason = typeof r === 'object' && 'reason' in r ? r.reason : 'rejected';
            break;
          }
          case 'reset_board': {
            if (!onResetBoard) { reason = 'no onResetBoard callback'; break; }
            const r = await Promise.resolve(onResetBoard());
            ok = typeof r === 'boolean' ? r : r.ok;
            if (ok) ackText = 'Reset.';
            else reason = typeof r === 'object' && 'reason' in r ? r.reason : 'rejected';
            break;
          }
          case 'navigate_to_route': {
            // Deterministic drill routing (e.g. "drill calculation" →
            // /coach/endgame?tab=calculation). Navigating away is the
            // correct response to an explicit drill request — far better
            // than the brain inventing a fake drill (G0).
            try {
              void navigate(routedIntent.route);
              ok = true;
              ackText = 'On it.';
            } catch (err) {
              reason = err instanceof Error ? err.message : String(err);
            }
            break;
          }
          default:
            reason = `intent ${routedIntent.kind} not wired in voice path`;
        }
      } catch (err) {
        reason = err instanceof Error ? err.message : String(err);
      }

      // Stage 4 — callback result.
      void logAppAudit({
        kind: 'voice-callback-result',
        category: 'subsystem',
        source: 'VoiceChatMic.handleUserMessage',
        summary: `kind=${routedIntent.kind} ok=${ok} reason=${reason ?? 'none'}`,
      });

      // Stage 5 — game state after dispatch. Proves the take-back
      // actually shrank the move list (or didn't).
      const afterMoveCount = getMoveCount?.() ?? -1;
      const afterFen = getCurrentFen?.() ?? fen;
      void logAppAudit({
        kind: 'voice-game-state-after',
        category: 'subsystem',
        source: 'VoiceChatMic.handleUserMessage',
        summary: `moveCount ${beforeMoveCount}→${afterMoveCount} fenChanged=${beforeFen !== afterFen}`,
        fen: afterFen,
      });

      if (!ok && reason) ackText = `Couldn't do that — ${reason}.`;
      const ack: ChatMessage = {
        id: `voice-ack-${Date.now()}`,
        role: 'assistant',
        content: ackText,
        timestamp: Date.now(),
      };
      setMessages([...messagesRef.current, userMsg, ack]);
      recordMemory('coach', ackText);
      voiceService.stop();
      void voiceService.speakForced(ackText);
      return;
    }

    // Detect opening requests (e.g. "play the French Defense")
    const requestedOpening = detectOpeningRequest(text);
    if (requestedOpening && onOpeningRequest) {
      onOpeningRequest(requestedOpening);
    }

    const userMsg: ChatMessage = {
      id: `voice-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const currentMessages = [...messagesRef.current, userMsg];
    setMessages(currentMessages);
    recordMemory('user', text);
    setIsStreaming(true);

    // Engine analysis is expensive (~500-1000ms). Only run it when the
    // user's question actually needs it — most voice turns are general
    // chat ("what's a fork?", "teach me the Sicilian") where the engine
    // block just bloats the prompt and slows the reply. Use the
    // pre-computed snapshot when available (free), else gate on the
    // question's keywords.
    const needsEngine = shouldIncludeEngine(text);
    let engineData: EngineSnapshot | null = engineSnapshot ?? null;
    if (engineData && (!engineData.bestMove || engineData.topLines.length === 0)) {
      engineData = null;
    }
    if (!engineData && needsEngine) {
      try {
        const analysis = await stockfishEngine.analyzePosition(fen, VOICE_ENGINE_DEPTH);
        engineData = {
          bestMove: uciMoveToSan(analysis.bestMove, fen),
          evaluation: analysis.evaluation,
          isMate: analysis.isMate,
          mateIn: analysis.mateIn,
          topLines: analysis.topLines.map((l) => ({
            moves: [uciLinesToSan(l.moves, fen, 5)],
            evaluation: l.evaluation,
            mate: l.mate,
          })),
        };
      } catch {
        // Continue without engine data if Stockfish fails
      }
    }

    // The voice surface used to HAND-BUILD the whole envelope here (base
    // system + conversation rules + context snapshot + memory + student-state +
    // grounding) as a workaround for the flat getCoachChatResponse path having
    // no envelope. That is exactly the "same trainer-grade blocks the main coach
    // runner uses" — i.e. `coachService.ask`. Migrating onto the shared spine
    // (dispatchCoachTurn → ask) gives those blocks NATIVELY, so the greeting/
    // tempo fix now rides the envelope instead of a hand-rolled copy. The live
    // board state is threaded through `liveState`; grounding + memory are
    // rebuilt inside `ask`. (identical-capabilities rule; remove-old-wiring.)

    // Stop any in-flight TTS (per-move narration from CoachGamePage, a
    // previous voice reply that's still playing, etc.) before the voice
    // chat reply starts — otherwise the two narrators overlap and the
    // student hears both at once. User's latest voice question always
    // wins; the coach will re-narrate the position if it's still
    // relevant on the next move.
    voiceService.stop();

    // Stream sentences to speech as they arrive. Every sentence chains
    // through speakForced via a Promise chain so each Polly call awaits
    // the previous one's audio. Single-engine consistency (no Web Speech
    // tail talking over Polly), no sentences dropped silently.
    let sentenceBuffer = '';
    let speechChain: Promise<void> = Promise.resolve();

    const flushSentence = (sentence: string): void => {
      const trimmed = sentence
        .replace(/^(great question!?|excellent!?|good question!?|nice (one|question)!?|interesting!?|that'?s a (great|good|nice) (question|one)!?)\s*/i, '')
        .trim();
      if (!trimmed) return;
      // Ground the streamed sentence against the live board BEFORE it's spoken.
      // This voice path streams straight to Polly (before any final-text gate),
      // so a board-false / out-of-vocab-tactic sentence must be dropped here or
      // it's HEARD — the voice mic was the last ungated coach voice surface
      // (David 2026-07-04 grounding-coverage sweep). Board-only (no tactics
      // context on this surface yet; a fabricated piece-on-square is the risk).
      const gfen = getCurrentFen?.() ?? fen ?? null;
      if (!isSpokenSentenceGrounded(trimmed, gfen, 'VoiceChatMic')) return;
      speechChain = speechChain
        .then(() => voiceService.speakForced(trimmed))
        .catch((err: unknown) => {
          console.warn('[VoiceChatMic] speakForced failed:', err);
        });
    };

    const onChunk = (chunk: string): void => {
      sentenceBuffer += chunk;
      // Flush on any sentence terminator (period, bang, question, or
      // newline) — no requirement for trailing whitespace. Previous
      // regex required `[.!?]\s+` which added 200-400ms of first-word
      // latency on short streams. Flushing eagerly on ".!?\n" makes
      // the coach's first word land as soon as the first sentence
      // actually finishes.
      const match = sentenceBuffer.match(/^(.*?[.!?\n])(\s*)(.*)$/s);
      if (match) {
        flushSentence(match[1]);
        sentenceBuffer = match[3];
      }
    };

    // Route through chat_response — my model routing audit moved
    // this to the cheap tier (deepseek-chat / claude-haiku). Voice
    // replies are 1-2 sentences anyway; reasoner is overkill + slower.
    // Capped at VOICE_MAX_TOKENS so responses stay snappy.
    // WO-COACH-MASTER-INTEGRATION: pass the current FEN so the brain
    // can engage master-play grounding when the user's spoken question
    // is a move question ("what should I play?", "what do masters
    // play?"). Voice is one of the most likely surfaces to hit this
    // intent. The watcher's not mounted on voice but the cache may
    // already be warm from the host board surface.
    // The spine auto-grounds (buildQuestionGrounding fires inside `ask` when a
    // FEN is present or any intent detector matches) so a spoken "what am I weak
    // in?" / "what should I play?" voices the SAME computed data the typed
    // surfaces do — voice is one coherent unit with Learn/Play. The live board
    // (FEN, whose-turn, student side, pre-computed eval) is handed via liveState
    // so the envelope carries ground truth without a redundant engine trip.
    const answer = await dispatchCoachTurn(
      {
        surface: 'game-chat',
        ask: text,
        liveState: {
          surface: 'game-chat',
          fen: getCurrentFen?.() ?? fen,
          whoseTurn: turn === 'w' ? 'white' : 'black',
          studentColor: playerColor === 'white' ? 'white' : 'black',
          userJustDid: text,
          ...(engineData?.evaluation !== undefined ? { evalCp: engineData.evaluation } : {}),
        },
      },
      {
        // VoiceChatMic runs its own deterministic board-command pre-pass
        // (tryRouteIntent) above, so skip the spine's action router here; the
        // agentic tool loop still handles teach/navigate. Folding tryRouteIntent
        // into the shared routeChatIntent is the follow-up chunk.
        skipActionRouter: true,
        onChunk,
        task: 'chat_response',
        maxTokens: VOICE_MAX_TOKENS,
        maxToolRoundTrips: 3,
        onNavigate: (path: string) => { void navigate(path); },
      },
    );
    const rawResponse = answer.text;

    // Strip + persist any [[REMEMBER: ...]] notes the coach emitted.
    // Voice chat now grows the same cross-session memory as the main
    // chat surface — so "student keeps missing knight forks" said
    // during a voice turn carries forward to every future session.
    const afterMemory = extractAndRememberNotes(rawResponse);

    // Extract arrow annotations before flushing remaining speech
    const { arrows: responseArrows, cleanText: rawClean } = extractArrows(afterMemory);
    // The answer came from the grounded spine (dispatchCoachTurn → coachService.ask),
    // which computes every fact and voices it — so the displayed bubble is already
    // grounded. The post-hoc groundCoachReply strip is DELETED (David 2026-07-09).
    const response = rawClean;

    // Flush remaining text (cleaned of arrow tags)
    const { cleanText: cleanBuffer } = extractArrows(sentenceBuffer);
    flushSentence(cleanBuffer);

    // Send arrows to the board if the LLM included any
    if (responseArrows.length > 0 && onArrows) {
      onArrows(responseArrows);
    }

    const assistantMsg: ChatMessage = {
      id: `voice-${Date.now()}-resp`,
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    recordMemory('coach', response);
    setIsStreaming(false);
  }, [fen, turn, playerColor, engineSnapshot, lastMoveContext, onOpeningRequest, onArrows, onPlayMove, onTakeBackMove, onResetBoard, getMoveCount, getCurrentFen, navigate]);

  // Keep a ref to handleUserMessage so the onResult callback always uses the latest
  const handleUserMessageRef = useRef(handleUserMessage);
  useEffect(() => {
    handleUserMessageRef.current = handleUserMessage;
  }, [handleUserMessage]);

  const restartListening = useCallback(() => {
    // No-op: voiceInputService handles continuous listening internally
    // (its onend handler restarts unless userStopped is true). A second
    // restart path here raced with user-tap-off and wiped the onInterim
    // / onSpeechStart / onError handlers because it called
    // startListening() with no options. Kept as a no-op so the
    // onResult subscription site reads cleanly; leave to the service.
  }, []);

  useEffect(() => {
    const unsubscribe = voiceInputService.onResult((transcript: string) => {
      if (transcript.trim()) {
        // Final recognition landed — clear the interim preview and
        // send.
        setInterimTranscript('');
        void handleUserMessageRef.current(transcript.trim());
      }
      restartListening();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the component unmounts mid-listening (user navigates away),
  // cut the mic so the "listening" chrome doesn't reappear stale on
  // the next mount and the browser doesn't keep the microphone hot.
  useEffect(() => {
    // Stop the mic when the app goes to the background. iOS keeps the
    // getUserMedia stream alive when Safari backgrounds, which (a)
    // burns battery, (b) leaves the privacy indicator on, and (c)
    // confuses the user when they return. Visibilitychange is the
    // most reliable signal across iOS Safari + Chrome + standalone
    // PWA. When the page comes back to the foreground we don't auto-
    // restart listening — the user re-taps the mic explicitly.
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden' && listeningRef.current) {
        voiceInputService.stopListening();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (listeningRef.current) {
        voiceInputService.stopListening();
      }
      voiceService.stop();
    };
  }, []);

  const handleMicToggle = useCallback(() => {
    if (!voiceInputService.isSupported()) {
      setUnsupportedFlash(true);
      setTimeout(() => setUnsupportedFlash(false), 2000);
      return;
    }
    // Warm up Web Speech in this gesture context so iOS doesn't block TTS later
    speechService.warmupInGestureContext();
    // Pre-warm mic permission + hardware BEFORE Web Speech starts —
    // fixes the "press mic twice to start" bug where the permission
    // prompt on first tap steals focus from recognition.start().
    // Fire and forget; completes in parallel with the rest of the
    // start flow. Subsequent taps no-op via the internal micPreWarmed
    // flag.
    void voiceInputService.prewarmMic();

    // Source of truth for the toggle is listeningRef, not the
    // `listening` state captured by this callback's closure. React
    // state may lag a just-completed setListening from another path
    // (e.g. restart race), while listeningRef is synced on every
    // render. Using the ref guarantees tap N always sees the right
    // on/off state — no sticky "on" after an off-tap, no double-start.
    if (listeningRef.current) {
      // Update the ref synchronously so any in-flight restart path
      // sees the off-state immediately — setListening alone would
      // only settle after the next commit.
      listeningRef.current = false;
      voiceInputService.stopListening();
      setListening(false);
      setInterimTranscript('');
      return;
    }

    // One-time banner: voice coach needs volume + silent-switch off.
    // iOS silent mode mutes Web Audio entirely (Polly); Web Speech
    // honours the mute switch too. Without this hint users think the
    // app is broken the first time they try voice on a muted phone.
    // Stored in Dexie meta so it only shows once per device.
    void db.meta.get(VOICE_ONBOARDING_META_KEY).then((rec) => {
      if (!rec) {
        setOnboardingBanner('Voice coach needs volume ON — if you\u2019re on silent mode, flip the mute switch off.');
        setTimeout(() => setOnboardingBanner(null), 6000);
        void db.meta.put({ key: VOICE_ONBOARDING_META_KEY, value: '1' });
      }
    });

    // Mic on = voice narration on (implicit). If the student turns
    // the mic on during a game, they expect a spoken conversation —
    // the coach should narrate per-move without being asked. Flip
    // coachVoiceOn here; the per-move commentary path reads this
    // flag to decide whether to TTS its reply. Left ON when the user
    // later stops the mic — they can explicitly toggle voice off via
    // the dedicated voice button if they want silence.
    if (!useAppStore.getState().coachVoiceOn) {
      useAppStore.getState().setCoachVoiceOn(true);
    }

    // Tap-to-interrupt: if the coach is mid-reply, cut off the TTS
    // and start listening. Previously the user had to wait for the
    // coach to finish — painful during a long answer.
    if (isStreaming) {
      voiceService.stop();
    }

    const started = voiceInputService.startListening({
      onInterim: (text: string) => setInterimTranscript(text),
      // Trainer feel: the instant the student starts speaking, the
      // coach stops talking. Matches how a person-to-person lesson
      // actually works — never talked over. Fires once per utterance.
      onSpeechStart: () => voiceService.stop(),
      onError: (reason) => {
        listeningRef.current = false;
        setListening(false);
        setInterimTranscript('');
        setMicError(
          reason === 'permission-denied'
            ? (Capacitor.isNativePlatform()
                ? 'Mic blocked. Open iOS Settings → Chess Academy and turn ON Microphone and Speech Recognition, then tap the mic again.'
                : 'Mic blocked. On iPhone: Settings → General → Keyboard → Enable Dictation, and allow Safari mic access.')
            : reason === 'unavailable'
              ? (Capacitor.isNativePlatform()
                  ? 'Mic unavailable. Enable Dictation (Settings → General → Keyboard → Enable Dictation) and allow Microphone + Speech Recognition for Chess Academy in Settings, then tap again.'
                  : 'Mic unavailable — your browser couldn’t reach the speech service. Try the iOS app, or check your connection.')
              : 'Mic reconnect failed. Tap again to retry.'
        );
        setTimeout(() => setMicError(null), 6000);
      },
    });
    // Same sync-ref pattern as the off-branch above.
    listeningRef.current = started;
    setListening(started);
    // Supported (we passed the isSupported gate above) but start() still
    // failed — on iOS this is the silent dead-button case (Dictation off,
    // the recognizer threw). Give the user an actionable message instead
    // of a button that just doesn't turn on. The voiceInputService audit
    // captures the underlying cause for diagnosis.
    if (!started) {
      setMicError('Couldn’t start the mic. On iPhone: Settings → General → Keyboard → Enable Dictation, then reload. The native app is more reliable for voice.');
      setTimeout(() => setMicError(null), 6000);
    }
  }, [isStreaming]);

  return (
    <div className="relative" data-testid="voice-chat-mic">
      <AnimatePresence>
        {unsupportedFlash && (
          <motion.span
            className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[10px] text-red-400 bg-theme-surface border border-theme-border rounded px-1.5 py-0.5 whitespace-nowrap z-20"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            data-testid="voice-unsupported-msg"
          >
            Mic not supported
          </motion.span>
        )}
        {micError && (
          <motion.span
            className="absolute bottom-full mb-1 right-0 text-[11px] text-red-400 bg-theme-surface border border-red-500/40 rounded px-2 py-1 max-w-[240px] z-20"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            data-testid="voice-mic-error"
          >
            {micError}
          </motion.span>
        )}
        {onboardingBanner && (
          <motion.span
            className="absolute bottom-full mb-1 right-0 text-[11px] text-amber-400 bg-theme-surface border border-amber-500/40 rounded px-2 py-1 max-w-[260px] z-20"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            data-testid="voice-onboarding-banner"
          >
            {onboardingBanner}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Live interim transcript — shows the user's words as they
          speak, so the mic feels responsive. Positioned above the
          button, clipped to a max-width so long phrases don't blow
          out the layout. */}
      <AnimatePresence>
        {listening && interimTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute bottom-full mb-2 right-0 max-w-[260px] text-xs px-2.5 py-1.5 rounded-lg shadow-md z-20"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
            data-testid="voice-interim-transcript"
          >
            <span style={{ color: 'var(--color-accent)' }}>●</span>{' '}
            {interimTranscript}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleMicToggle}
        // min-h/w 44px = WCAG AA tap target minimum. Previously
        // px-3 py-1.5 rendered around 30x30px which is below iOS HIG
        // and WCAG AA 44x44.
        className={`flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-md text-sm transition-colors ${
          listening
            ? 'bg-red-500/15 text-red-500 border border-red-500'
            : 'bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text'
        }`}
        animate={listening && !prefersReducedMotion ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={listening && !prefersReducedMotion ? { duration: 1.2, repeat: Infinity } : {}}
        title={
          listening
            ? 'Stop listening'
            : isStreaming
              ? 'Tap to interrupt and talk'
              : 'Talk to coach'
        }
        aria-label={
          listening
            ? 'Stop listening'
            : isStreaming
              ? 'Tap to interrupt and talk'
              : 'Talk to coach'
        }
        data-testid="voice-chat-mic-btn"
      >
        {listening ? <MicOff size={14} /> : <Mic size={14} />}
        <span>{listening ? 'Stop' : 'Ask'}</span>
      </motion.button>
    </div>
  );
}

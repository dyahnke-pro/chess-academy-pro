/**
 * coachAgentRunner
 * ----------------
 * The narration toggle ("narrate while we play") and the per-move narration
 * call. The old free-LLM agent loop (`runAgentTurn` / `runCoachTurn`) lost its
 * last caller and was deleted 2026-10-08 — every chat surface asks through the
 * one door (coachService.ask).
 */
import { logAppAudit } from './appAuditor';
import { useCoachSessionStore } from '../stores/coachSessionStore';
import { useAppStore } from '../stores/appStore';
import { voiceService } from './voiceService';

/**
 * Deterministic narration-toggle detector. Runs BEFORE the LLM so
 * "narrate while we play" reliably flips voice on regardless of
 * prompt-following. Returns `{ enable }` on match, null otherwise.
 */
export function detectNarrationToggle(text: string): { enable: boolean } | null {
  const lower = text.toLowerCase();
  const hasNarrationTopic =
    /\b(narrat|commentat|commentar|voice|speak|talk|announc)/i.test(lower);
  // "shut up" stands on its own.
  if (/\bshut\s+up\b/i.test(lower)) return { enable: false };
  const offSignal =
    /\b(stop|turn\s+off|disable|silence|mute|quiet|no\s+more|cease|end)\b/i;
  if (offSignal.test(lower) && hasNarrationTopic) return { enable: false };
  const hasVerb =
    /\b(narrat|commentat|speak|voice|announce|talk\s+through)/i.test(lower);
  const hasPlayContext =
    /\b(game|play|we|move|each\s+move|during|while|turn\s+on)\b/i.test(lower);
  if (hasVerb && hasPlayContext) return { enable: true };
  return null;
}

/**
 * Apply a narration toggle and return the user-facing ack text. Flips
 * both the session-store narrationMode and the appStore coachVoiceOn
 * flag (the existing per-move commentary path reads the latter).
 */
export function applyNarrationToggle(enable: boolean): string {
  useCoachSessionStore.getState().setNarrationMode(enable);
  const voiceOn = useAppStore.getState().coachVoiceOn;
  if (enable && !voiceOn) useAppStore.getState().toggleCoachVoice();
  if (!enable && voiceOn) useAppStore.getState().toggleCoachVoice();
  const ack = enable
    ? "Got it — each move is narrated out loud as you play. Starting a game now."
    : "Narration off — quiet so you can focus.";
  if (enable) {
    void voiceService.speak(ack).catch((err: unknown) => {
      console.warn('[applyNarrationToggle] TTS failed:', err);
    });
  }
  return ack;
}

/**
 * Speak a short announcement of a move. Used by CoachGamePage after
 * both sides' moves so narration is guaranteed when the session is in
 * narration mode, even if LLM commentary is empty or slow.
 *
 * Precedence: full LLM commentary > short SAN announcement > silence.
 * Gated on useCoachSessionStore.narrationMode so non-narrated games
 * stay silent (narrationMode is only on when the user asked for it).
 */
export function narrateMove(opts: {
  san: string;
  mover: 'w' | 'b';
  playerColor: 'w' | 'b';
  commentary?: string | null;
}): void {
  if (!useCoachSessionStore.getState().narrationMode) {
    void logAppAudit({
      kind: 'coach-move-narration-skipped',
      category: 'subsystem',
      source: 'coachAgentRunner.narrateMove',
      summary: `san=${opts.san} reason=narrationMode-off`,
    });
    return;
  }
  // Only speak when the caller has produced real LLM commentary. The
  // legacy "I played e5." / "You played e5." fallback was generic
  // template prose that broke the conversational-coach feel — the
  // student wants opening ideas and reasoning, not a SAN announcement.
  // When commentary is empty (coach-move surface that doesn't run the
  // LLM yet, or a verbosity-gated student move with nothing useful to
  // say), fall silent and let the next LLM-narrated move carry the
  // conversation forward.
  const trimmed = opts.commentary?.trim();
  if (!trimmed) {
    void logAppAudit({
      kind: 'coach-move-narration-skipped',
      category: 'subsystem',
      source: 'coachAgentRunner.narrateMove',
      summary: `san=${opts.san} reason=empty-commentary`,
    });
    return;
  }
  // Phase narration takes precedence: usePhaseNarration.narrate() calls
  // voiceService.stop() on entry, and voiceService.speakInternal stops
  // in-flight speech before starting — so a phase summary firing will
  // cleanly cut this off and the two surfaces never talk over each other.
  void logAppAudit({
    kind: 'coach-move-narration-fired',
    category: 'subsystem',
    source: 'coachAgentRunner.narrateMove',
    summary: `san=${opts.san} mover=${opts.mover} chars=${trimmed.length}`,
  });
  void voiceService.speak(trimmed).catch((err: unknown) => {
    console.warn('[narrateMove] TTS failed:', err);
  });
}

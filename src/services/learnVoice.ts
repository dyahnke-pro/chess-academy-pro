/**
 * THE LEARN PAGE'S ONE VOICE DOOR, FAIL CLOSED (WO-LEARN-FOCUS-01, David
 * 2026-10-21: "any new surface that speaks has to register with the switch,
 * or it stays silent during focus games").
 *
 * Every line the Learn page speaks names its CHANNEL:
 *   - `owner`     — the line of whoever owns the game's voice (a mission's
 *                   fixed phrase, a boss intro, a focus line);
 *   - `asked`     — the user asked or tapped for it (a chat answer, Show me,
 *                   a seat or road button, a command);
 *   - `lesson`    — a walkthrough, drill, stage or play-out (each of those
 *                   ends a mission or focus game when it starts);
 *   - `mistake`   — the mistake lesson (`learnMistakeTurn`): Learn's one
 *                   volunteered voice — after the student's move, only on a
 *                   mistake by either side, or the one good-decision line
 *                   (WO-LEARN-MISTAKES-ONLY, David 2026-11-23). Dropped only
 *                   while a mission owns the game;
 *   - `door`      — the old turn door's waves (instant, late, phase, the
 *                   answer it owed): HELD. Learn says nothing before the move
 *                   and nothing but the lesson after it;
 *   - `free-play` — any other line the coach volunteers during a live game:
 *                   HELD, for the same reason.
 * The
 * channel is a required field, so a new speak site does not compile until it
 * says which it is — the leak cannot be written by forgetting.
 *
 * The page registers who owns the voice (`registerLearnVoiceOwner`) once its
 * runners exist; with nothing registered the door is open (the classic Learn).
 */
import { speakComputed } from './speakComputed';
import { logAppAudit } from './appAuditor';
import { emitEverything } from './everythingEvents';
import type { VoiceOwner } from './learnTurnDoor';

export type LearnVoiceChannel = 'owner' | 'asked' | 'lesson' | 'mistake' | 'door' | 'free-play';

const OPEN = (): VoiceOwner => 'open';
let ownerOf: () => VoiceOwner = OPEN;

/** The page says who owns the voice; the returned function unregisters it. */
export function registerLearnVoiceOwner(fn: () => VoiceOwner): () => void {
  ownerOf = fn;
  return () => { if (ownerOf === fn) ownerOf = OPEN; };
}

export function learnVoiceOwner(): VoiceOwner {
  return ownerOf();
}

/** May a line on this channel speak now? */
export function learnVoiceAllows(channel: LearnVoiceChannel): boolean {
  if (channel === 'mistake') return ownerOf() !== 'mission';
  return channel !== 'door' && channel !== 'free-play';
}

export function speakLearn(
  text: string,
  opts: { forced: boolean; intent: string; repeatOnPurpose?: boolean; channel: LearnVoiceChannel },
): Promise<void> {
  if (!learnVoiceAllows(opts.channel)) {
    void logAppAudit({
      kind: 'coach-surface-migrated',
      category: 'subsystem',
      source: 'learnVoice.held',
      summary: `${opts.channel} line held — ${ownerOf()} owns the voice: "${text.slice(0, 80)}"`,
    });
    emitEverything({ surface: 'learn', door: 'voice-owner', lines: [{ computer: opts.intent, kind: null, text, said: false, why: `${ownerOf()} owns the voice` }] });
    return Promise.resolve();
  }
  return speakComputed(text, { forced: opts.forced, intent: opts.intent, ...(opts.repeatOnPurpose ? { repeatOnPurpose: true } : {}) });
}

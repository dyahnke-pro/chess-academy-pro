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
 *   - `free-play` — the coach volunteering during a live game.
 * A `free-play` line is DROPPED while a mission or a focus owns the game. The
 * channel is a required field, so a new speak site does not compile until it
 * says which it is — the leak cannot be written by forgetting.
 *
 * The page registers who owns the voice (`registerLearnVoiceOwner`) once its
 * runners exist; with nothing registered the door is open (the classic Learn).
 */
import { speakComputed } from './speakComputed';
import { logAppAudit } from './appAuditor';
import type { VoiceOwner } from './learnTurnDoor';

export type LearnVoiceChannel = 'owner' | 'asked' | 'lesson' | 'free-play';

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
  return channel !== 'free-play' || ownerOf() === 'open';
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
      summary: `free-play line held — ${ownerOf()} owns the voice: "${text.slice(0, 80)}"`,
    });
    return Promise.resolve();
  }
  return speakComputed(text, { forced: opts.forced, intent: opts.intent, ...(opts.repeatOnPurpose ? { repeatOnPurpose: true } : {}) });
}

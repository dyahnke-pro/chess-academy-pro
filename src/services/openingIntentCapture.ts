/**
 * openingIntentCapture
 * --------------------
 * Surface-agnostic helpers for writing opening intent into the
 * `useCoachMemoryStore` from any chat input. Extracted by
 * WO-COACH-MEMORY-UNIFY-01 so all chat surfaces use the same capture
 * path — previously each surface had its own detection/dispatch
 * pipeline, and intent set on one surface was unreachable from others.
 *
 * Two detectors:
 *   - `tryCaptureOpeningIntent(text, surface, fallbackColor)` — writes
 *     `intendedOpening` to the memory store when the user names an
 *     opening. Reuses `parseCoachIntent` + `expandOpeningAlias` +
 *     `getOpeningMoves` so capture is identical to the existing
 *     in-game intent detector.
 *   - `tryCaptureForgetIntent(text, surface)` — clears the current
 *     intent when the user says "forget the X", "play anything",
 *     "no opening", "free play".
 *
 * Both are additive — they do not replace the existing LLM dispatch or
 * `routeChatIntent` navigation. They simply observe the incoming text
 * and write to memory as a side effect before the message continues
 * through the normal chat path.
 */
import { parseCoachIntent } from './coachAgent';
import { expandOpeningAlias } from './openingAliases';
import { getOpeningMoves } from './openingDetectionService';
import { useCoachMemoryStore } from '../stores/coachMemoryStore';

/** "forget the Caro-Kann" / "forget my opening" / "forget it" — clears
 *  the current intent without naming a replacement. */
const FORGET_RE =
  /\b(?:forget|drop|cancel|never\s*mind|nevermind|stop\s+playing)\b(?:\s+(?:the|my|that|this))?\s*(?:opening|line|repertoire)?\b/i;

/** "play anything" / "free play" / "no opening" / "any opening" —
 *  same effect, different phrasing. */
const PLAY_ANYTHING_RE =
  /\b(?:play\s+(?:anything|any\s+opening|free(?:ly)?|whatever)|free\s+play|no\s+opening|open\s+play|any\s+opening|just\s+play|play\s+normally)\b/i;

/**
 * Sniff `text` for a named opening. If found, writes the intent to
 * the coach-memory store and returns the captured intent. The caller
 * does not need to do anything with the return — the store write has
 * already happened, along with the `coach-memory-intent-set` audit.
 *
 * @param fallbackColor The player's current color; used when
 *   `parseCoachIntent` can't infer side from the text itself.
 * @param surface A short label for `capturedFromSurface` so the audit
 *   log shows WHICH chat wrote the intent.
 * @returns the captured intent, or null on miss.
 */
export function tryCaptureOpeningIntent(
  text: string,
  surface: string,
  fallbackColor: 'white' | 'black',
): { name: string; color: 'white' | 'black' } | null {
  if (!text.trim()) return null;
  const intent = parseCoachIntent(text);
  if (intent.kind !== 'play-against' && intent.kind !== 'walkthrough') return null;
  const rawSubject = intent.subject;
  if (!rawSubject) return null;
  const expanded = expandOpeningAlias(rawSubject);
  const moves = getOpeningMoves(expanded);
  if (!moves || moves.length === 0) return null;
  // `intent.side` reflects the student's color; the coach plays the
  // opposite. If the student named a color, honor it. Otherwise fall
  // back to whatever color the caller says the student is playing.
  const studentColor = intent.side === 'white' || intent.side === 'black'
    ? intent.side
    : fallbackColor;
  useCoachMemoryStore.getState().setIntendedOpening({
    name: expanded,
    color: studentColor,
    capturedFromSurface: surface,
  });
  return { name: expanded, color: studentColor };
}

/**
 * Sniff `text` for an explicit clear intent ("forget the X", "play
 * anything"). Clears `intendedOpening` in the store when matched.
 *
 * @returns true if a clear was triggered, false otherwise.
 */
export function tryCaptureForgetIntent(text: string, _surface: string): boolean {
  if (!text.trim()) return false;
  const current = useCoachMemoryStore.getState().intendedOpening;
  if (!current) return false;
  if (PLAY_ANYTHING_RE.test(text)) {
    useCoachMemoryStore.getState().clearIntendedOpening('user-said-play-anything');
    return true;
  }
  if (FORGET_RE.test(text)) {
    useCoachMemoryStore.getState().clearIntendedOpening('user-said-forget');
    return true;
  }
  return false;
}

// coachActuator — the global "hands" of the coach (full control / real Phase 4,
// David 2026-09-08: "coach needs to be able to set up any position, open any tab,
// do all functions within the app when asked. currently it said done but we were
// still on the home screen").
//
// THE BUG THIS KILLS: the action tools (navigate_to_route, set_board_position)
// actuate through surface-supplied callbacks on the tool context. When a surface
// didn't wire a callback — the home mic/chat wires neither `onNavigate` nor
// `onSetBoardPosition` — the tools returned SYNTHETIC SUCCESS, so the LLM said
// "done" while nothing happened. This module gives the coach a single app-wide
// actuator so it can navigate + set up a position from ANY surface, and (paired
// with the tools returning {ok:false} when truly unavailable) it can never claim
// success it didn't achieve (G0: the confirmation reflects the real outcome).
//
// `navigate` is registered ONCE at the app root (AppLayout) with react-router's
// navigate. `setBoardPosition` reuses the EXISTING `/coach/play?fen=` support
// (CoachGamePage renders a coach-set FEN) — no new surface needed. Surfaces that
// DO wire their own board callbacks (CoachTeachPage, CoachGamePage) keep their
// in-place behavior; the actuator is the fallback for surfaces without a board.

/** The play surface that renders an arbitrary coach-set position via `?fen=`. */
const BOARD_ROUTE = '/coach/play';

let navigateFn: ((path: string) => void) | null = null;

/** Register the app's navigate function (call once at the app root). */
export function registerCoachNavigate(fn: (path: string) => void): void {
  navigateFn = fn;
}

/** Drop the registration (on app-root unmount / tests). */
export function clearCoachNavigate(): void {
  navigateFn = null;
}

export interface ActuationResult {
  ok: boolean;
  reason?: string;
}

/** Navigate the app to a route. Returns {ok:false} when no navigator is
 *  registered — so a caller can report the truth instead of faking success. */
export function coachNavigate(path: string): ActuationResult {
  const p = (path ?? '').trim();
  if (!p) return { ok: false, reason: 'empty path' };
  if (!navigateFn) return { ok: false, reason: 'navigation unavailable on this surface' };
  try {
    navigateFn(p);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Set up a position on the play board from anywhere: navigate to the play
 *  surface seeded with the FEN (it renders `?fen=`). Returns {ok:false} when
 *  navigation isn't available, so the coach never fake-reports "done". */
export function coachSetBoardPosition(fen: string): ActuationResult {
  const f = (fen ?? '').trim();
  if (!f) return { ok: false, reason: 'no fen' };
  return coachNavigate(`${BOARD_ROUTE}?fen=${encodeURIComponent(f)}`);
}

/** True when a navigator is registered (the coach can actually actuate). */
export function coachCanActuate(): boolean {
  return navigateFn !== null;
}

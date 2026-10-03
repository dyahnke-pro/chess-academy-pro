/**
 * THE HOME SUGGESTION ROTATES (David 2026-10-02: "Make it the most important
 * thing but never the same two times in a row. Every app open should generate
 * a new suggestion … Never suggest play with coach." → "I want the Home Screen
 * blinking removed and just blink the 1-4 tabs (rotating according to need)
 * personal algo, not random!").
 *
 * Each app open ranks the families by what the student's record says matters
 * most, and ONE of Home's four section rows blinks — the highest family that
 * is NOT the one shown last open. No bar on Home; the section's own hub bar
 * carries the specific bite. A beginner's Start-here step leads every open
 * until the path is done.
 *
 * Only where it benefits ("No changes for changes sake"):
 *  - UPLOAD only when no chess.com / lichess name is linked — a linked account
 *    is already imported weekly by `autoImportScheduler`, so asking would be
 *    noise. With no games at all it is the most important thing in the app:
 *    every personal surface (weaknesses, slips, the home opening) runs on them.
 *  - TACTICS is the record's best puzzle bite (a slip from the last game, a
 *    weakness, a grown puzzle, else a level-matched warm-up).
 *  - LEARN is a game the coach talks the student through, the place a
 *    weakness gets taught as it comes up on a live board.
 *  - OPENINGS only when the record has an opening step due (a line due for
 *    review, a marked opening not yet learned, a free opening to claim).
 * Play with Coach is never a candidate (Play is a pure playing surface).
 */
import { db } from '../db/schema';
import { isFixtureGame } from './fixtureGames';
import { useAppStore } from '../stores/appStore';
import { logAppAudit } from './appAuditor';
import { loadUpNext, type UpNextState } from './upNextLoader';
import type { UpNextPick } from './upNextPicker';

export type SuggestionFamily = 'start' | 'upload' | 'tactics' | 'learn' | 'openings';

export interface FamilyCandidate {
  family: SuggestionFamily;
  /** Higher = more important now. Computed from the record, never rolled. */
  importance: number;
  pick: UpNextPick;
}

export interface SuggestionInput {
  state: UpNextState;
  /** The student's own games (not masters, not fixtures). */
  ownGames: number;
  /** A chess.com or lichess name is set, so games arrive on their own. */
  accountLinked: boolean;
}

const UPLOAD_PICK = (first: boolean): UpNextPick => ({
  // The Weaknesses row: its holes are found in the student's games.
  kind: 'upload', key: 'up:upload', hub: 'weaknesses', path: '/games/import', bite: first ? 'one minute' : 'link once',
  label: first ? 'Upload your games' : 'Link your chess.com or lichess',
  reason: first
    ? 'Your coach learns you from your games: your weaknesses, your openings, the moves you missed.'
    : 'Link your account and your new games come in on their own every week.',
});

const LEARN_PICK: UpNextPick = {
  kind: 'learn', key: 'up:learn', hub: 'coach', path: '/coach/teach', bite: 'one game',
  label: 'Learn with Coach',
  reason: 'Play a game and your coach talks you through it, and speaks up where you tend to slip.',
};

const TACTICS_IMPORTANCE: Partial<Record<UpNextPick['kind'], number>> = {
  'game-slip': 85, grown: 75, weakness: 70, 'deep-run': 55, 'warm-up': 50, long: 50,
};
/** A line due for review outranks a new one; both below a fresh game slip. */
const OPENINGS_IMPORTANCE = (p: UpNextPick): number =>
  p.kind === 'free-opening' ? 50 : p.reason.includes('due for review') ? 65 : 45;

/** Every family the record supports right now, most important first. */
export function rankFamilies(i: SuggestionInput): FamilyCandidate[] {
  const out: FamilyCandidate[] = [];
  const cur = i.state.current;
  if (cur?.kind === 'start') return [{ family: 'start', importance: 100, pick: cur }];
  if (!i.accountLinked) {
    out.push({ family: 'upload', importance: i.ownGames === 0 ? 90 : 40, pick: UPLOAD_PICK(i.ownGames === 0) });
  }
  const tactics = i.state.ranked.find((p) => p.hub.startsWith('tactics:') && !i.state.done.has(p.key));
  if (tactics) out.push({ family: 'tactics', importance: TACTICS_IMPORTANCE[tactics.kind] ?? 50, pick: tactics });
  const opening = i.state.ranked.find((p) => p.hub === 'openings' && !i.state.done.has(p.key));
  if (opening) out.push({ family: 'openings', importance: OPENINGS_IMPORTANCE(opening), pick: opening });
  out.push({ family: 'learn', importance: 60, pick: LEARN_PICK });
  return out.sort((a, b) => b.importance - a.importance);
}

/** The most important family that is not the one shown last open. A
 *  beginner's start step is the one exception: it leads until done. */
export function chooseSuggestion(ranked: readonly FamilyCandidate[], lastFamily: SuggestionFamily | null): FamilyCandidate | null {
  if (ranked.length === 0) return null;
  if (ranked[0].family === 'start') return ranked[0];
  return ranked.find((c) => c.family !== lastFamily) ?? ranked[0];
}

// ── One choice per app open ────────────────────────────────────────────────
// An "open" is a fresh launch, or a return to the app after it sat hidden for
// RESUME_AS_NEW_OPEN_MS. Within one open the family stays put (Home and its
// re-renders agree); its pick refreshes as bites finish.

const LAST_KEY = 'home_suggestion_last';
export const RESUME_AS_NEW_OPEN_MS = 10 * 60 * 1000;

let openSeq = 0;
let hiddenAt: number | null = null;
let chosen: { open: number; family: SuggestionFamily } | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (hiddenAt !== null && Date.now() - hiddenAt >= RESUME_AS_NEW_OPEN_MS) openSeq += 1;
    hiddenAt = null;
  });
}

async function loadInput(): Promise<SuggestionInput> {
  const [state, ownGames] = await Promise.all([
    loadUpNext(),
    db.games.filter((g) => !g.isMasterGame && !isFixtureGame(g)).count().catch(() => 0),
  ]);
  const prefs = useAppStore.getState().activeProfile?.preferences;
  const accountLinked = !!(prefs?.chessComUsername?.trim() || prefs?.lichessUsername?.trim());
  return { state, ownGames, accountLinked };
}

/** Home's suggestion for this app open. */
export async function loadHomeSuggestion(): Promise<FamilyCandidate | null> {
  const ranked = rankFamilies(await loadInput());
  if (ranked.length === 0) return null;
  if (chosen?.open === openSeq) {
    return ranked.find((c) => c.family === chosen?.family) ?? ranked[0];
  }
  const last = await db.meta.get(LAST_KEY).catch(() => undefined);
  const pick = chooseSuggestion(ranked, (last?.value as SuggestionFamily | undefined) ?? null);
  if (!pick) return null;
  chosen = { open: openSeq, family: pick.family };
  await db.meta.put({ key: LAST_KEY, value: pick.family }).catch(() => undefined);
  // Observable (algo-audit rule): what was ranked, what was skipped as last
  // time's, what was shown.
  void logAppAudit({
    kind: 'home-suggestion-chosen',
    category: 'subsystem',
    source: 'homeSuggestion.loadHomeSuggestion',
    summary: `${pick.family}: ${pick.pick.label} (last ${last?.value ?? 'none'})`,
    details: JSON.stringify({
      shown: pick.family,
      last: last?.value ?? null,
      ranked: ranked.map((c) => ({ family: c.family, importance: c.importance, kind: c.pick.kind })),
    }),
  });
  return pick;
}

/** Test hook. */
export function __resetHomeSuggestionForTests(): void {
  openSeq = 0;
  hiddenAt = null;
  chosen = null;
}

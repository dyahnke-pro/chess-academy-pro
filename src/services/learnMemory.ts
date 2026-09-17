/**
 * learnMemory — ONE per-game memory for the Learn producer.
 *
 * The Phase 4 finding (docs/plans/2026-09-17-computer-unification.md §6):
 * `computeInstantTeaching` closes over EIGHTEEN refs, fifteen of them say-once
 * memory, and that — not the line count — is why no other surface can call it.
 * Its state lives in Learn's React tree.
 *
 * 🚨 IT IS ALSO A LIVE BUG, which is why this lands before the lift. There were
 * TWO "fresh game" resets, in two places, with two different membership lists
 * and two different triggers:
 *
 *   `startOpeningPlay`  (a guided game starts)   cleared 4 refs
 *   the reply handler   (`history.length <= 2`)  cleared a DIFFERENT 8
 *
 * and TEN were cleared by neither, for the life of the mount — a first census
 * of this file said six, and undercounted, because it read the two lists rather
 * than deriving the orphans from the code. `learnMemory.test.ts` derives them.
 *
 * The clearest proof that a hand-maintained reset list rots: `engineReadSaidRef`
 * is declared four lines below `planSaidRef` with the comment "Same contract as
 * `planSaidRef`" — and got the OPPOSITE treatment, because the author updated
 * the sibling and not the list.
 *
 * And `gemSeenRef`'s own
 * comment said it "holds the last callout for the whole game" — but nothing
 * reset it, so a gem called out in game 1 was suppressed in games 2, 3 and 4 of
 * the same session. Same for the curated beats and the explainers. That is
 * exactly what `standingFactMemory`'s doc warns about: "a set that never clears
 * makes the coach mute for the rest of a session after one mention."
 *
 * Site A's comment even said "Both said-sets are per-GAME" while clearing four —
 * the comment had already drifted from the code it described.
 *
 * THE RULE, stated once: this memory is PER GAME. `newGame()` forgets
 * everything it holds, and every "fresh game" site calls it instead of
 * hand-listing refs — so a slot added here cannot be forgotten-to-forget.
 *
 * It grows: each Phase-4 slice moves more of the remaining refs in, and
 * `learnMemory.test.ts` holds the count still OUTSIDE as a shrink-only ceiling.
 * `behaviorScheduler` is deliberately NOT here — it is a rate-matcher whose
 * stride tracks the corpus over the long run, not a say-once set, and moving it
 * would change the behaviour distribution rather than fix a silence. Nor is
 * `taughtGemIds`: it is scoped to the trap MENU by opening, not to a game, and
 * forgetting it would re-offer a trap the coach just taught.
 */

/** "No think-aloud has fired yet." Far enough below any real ply that the
 *  first gap test passes. */
export const NEVER_FIRED = -999;

export interface LearnMemory {
  /** Curated masterclass beats already spoken this game (by beat key). */
  readonly curatedBeatSeen: Set<string>;
  /** Explainer lines already given this game. */
  readonly saidExplainers: Set<string>;
  /** The last gem callout spoken — suppresses the identical callout. */
  gemSeen: string | null;
  /** The board that gem callout was computed on. */
  gemFen: string | null;
  /** The last computed line, so two consecutive plies never repeat it. */
  lastComputed: string;
  /** Pawn-structure families already NAMED this game. */
  readonly structureSaid: Set<string>;
  /** Engine readings (WDL, sharpness) already spoken this game. */
  readonly engineReadSaid: Set<string>;
  /** Pieces already called out this game by `pieceQualityLines`. */
  readonly pieceQualitySaid: Set<string>;
  /** Ply a think-aloud last fired. A PLY NUMBER, so it must reset with the
   *  board: carried across games it reads as a FUTURE ply, and
   *  `plyNow - last >= gap` then fails for as many plies as the last game was
   *  long — muting the lane precisely at the start of the new game. */
  thinkAloudLastPly: number;
  /** Forget everything. Every "a new game starts" site calls THIS. */
  newGame(): void;
}

export function createLearnMemory(): LearnMemory {
  const curatedBeatSeen = new Set<string>();
  const saidExplainers = new Set<string>();
  const structureSaid = new Set<string>();
  const engineReadSaid = new Set<string>();
  const pieceQualitySaid = new Set<string>();
  const mem: LearnMemory = {
    curatedBeatSeen,
    saidExplainers,
    structureSaid,
    engineReadSaid,
    pieceQualitySaid,
    gemSeen: null,
    gemFen: null,
    lastComputed: '',
    thinkAloudLastPly: NEVER_FIRED,
    newGame(): void {
      curatedBeatSeen.clear();
      saidExplainers.clear();
      structureSaid.clear();
      engineReadSaid.clear();
      pieceQualitySaid.clear();
      mem.gemSeen = null;
      mem.gemFen = null;
      mem.lastComputed = '';
      mem.thinkAloudLastPly = NEVER_FIRED;
    },
  };
  return mem;
}

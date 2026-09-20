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
  /** MOVES a curated beat has already taught this game — the dedupe term that
   *  the ID set and the sentence-novelty set both miss, because two lessons
   *  teaching the same move are a different beat AND a different sentence.
   *  See `beatSubject` in `curatedBeatSource`. */
  readonly curatedBeatSubjects: Set<string>;
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
  /** The threat and tactic lanes' say-once memory — the last spoken KEY (so a
   *  standing danger alerts once, not every ply) and EVERY sentence already
   *  spoken this game (an alternating pair walks straight through a single
   *  slot). These four lived as hand refs on the page, cleared inside ONE
   *  intent branch — so a second game in the same mount reached the same
   *  board, produced the identical threat line, and was told it had already
   *  said it. Measured 2026-09-19 (`audit-second-game-memory-prod`, 3/3 runs):
   *  the queen-attacked line and the pin invariant riding on it went silent
   *  in game 2 at the one shared position. Here, the board-driven `observe`
   *  reset forgets them like everything else. */
  lastTacticKey: string;
  lastThreatKey: string;
  readonly spokenTacticLines: Set<string>;
  readonly spokenThreatLines: Set<string>;
  /** Engine readings (WDL, sharpness) already spoken this game. */
  readonly engineReadSaid: Set<string>;
  /** Pieces already called out this game by `pieceQualityLines`. */
  readonly pieceQualitySaid: Set<string>;
  /** Ply a think-aloud last fired. A PLY NUMBER, so it must reset with the
   *  board: carried across games it reads as a FUTURE ply, and
   *  `plyNow - last >= gap` then fails for as many plies as the last game was
   *  long — muting the lane precisely at the start of the new game. */
  thinkAloudLastPly: number;
  /** EVERY phrase the coach has spoken this game, across every lane and both
   *  packages of every turn — the CROSS-turn, cross-lane repeat guard.
   *
   *  🚨 It is also the last thing that kept the second game quiet after the
   *  board-driven forget landed, and the reason is worth stating: the teachings
   *  that stayed silent were exactly the ones whose sentence is IDENTICAL
   *  between games ("This game is now the Scandinavian Defense.", the pin
   *  invariant), while the threat lines — different text, different board —
   *  came back immediately. A session-lived phrase set does not make the coach
   *  repeat less; it makes it teach the same lesson to only the first game. */
  readonly spokenKeys: Set<string>;
  /** Concept invariants already taught this game, by tactic type. */
  readonly conceptTaught: Set<string>;
  /**
   * The opening name the student has actually HEARD. Per game: a second game of
   * the same line must be named again, because the student is being told what
   * they are now playing, not being reminded of a fact they already hold.
   *
   * 🚨 SPENT BY SPEAKING, NEVER BY QUEUEING (found reading the code, 2026-09-18).
   * This was ONE field doing TWO jobs — "the opening we have detected" and "the
   * opening we have said" — and the announcement marked itself done the instant
   * it was QUEUED. It then had to survive a delivery path that could discard it,
   * and on any turn where the instant package said something substantive it did
   * not: `pendingVoiceRef` was nulled wholesale. The name was already marked
   * announced, so it never retried, and the fallback site guarded on the same
   * field so it could never fire either. Measured on prod: game 2's opening was
   * computed FIVE times and spoken ZERO.
   *
   * So the two jobs are two fields. A reader asking "what opening is this" reads
   * `detectedOpeningName`; only real delivery writes this one. An announcement
   * that is dropped is therefore re-queued next turn, which is the honest
   * behaviour: it keeps trying because it has not yet succeeded.
   */
  spokenOpeningName: string | null;
  /** What the detector last resolved, set the moment it resolves. This is
   *  CONTEXT — which opening the board is in — and is what the curated-beat
   *  selector and the refrain lane want. It says nothing about what was said. */
  detectedOpeningName: string | null;
  /**
   * Note how many plies are on the board. Forgets everything when the board
   * has gone BACKWARDS — a new or rewound game. Returns true when it forgot.
   *
   * 🚨 THIS, not the call sites, is what makes the reset reliable. The two
   * hand-placed "fresh game" sites are PATH-DEPENDENT, and a second game
   * reaches the board by paths neither covers — measured on prod 2026-09-17,
   * with two games of the same line in one mount playing an IDENTICAL first
   * fourteen plies: the opening was announced four times in game 1 and ZERO
   * times in game 2. One reset ran on `historyAfterReply.length <= 2`, which
   * is never true on the first coach reply of a game the student plays as
   * Black (`e4 d5 exd5` is already 3); the other hangs off one intent branch.
   *
   * The board cannot be fooled by any of that. It is the same rule
   * `standingFactMemory` states for the same reason — neither surface has a
   * game id, so without it a second game inherits the first game's silence —
   * and rewinding is the safe direction to be wrong in: forgetting makes the
   * coach repeat itself, suppressing makes it mute for a reason nobody can
   * trace.
   */
  observe(plies: number): boolean;
  /** Forget everything. Every "a new game starts" site calls THIS. */
  newGame(): void;
  /**
   * THE GAME'S OWN ID — minted here, re-minted by `newGame()`.
   *
   * The comment on `observe` above says "neither surface has a game id" and
   * treats that as a constraint to work around. It was also a DATA defect: the
   * coach's live capture (`captureMisconception`) has a `sourceGameId` field
   * and had nothing to put in it, so every slip the coach recorded during a
   * Learn game — the richest signal in the app, the student's own reasoning —
   * stored WHAT they got wrong and threw away WHERE. The weakness spine fills
   * those rows' provenance with a bare `origin: 'game'` for exactly this
   * reason, and no surface can say "you met this against X thirteen days ago".
   *
   * It lives HERE rather than in another ref because this object is already
   * the thing that knows when a game begins, by the one mechanism that cannot
   * be fooled — the board going backwards. A hand-placed `useRef` would be
   * path-dependent in precisely the way `observe` exists to fix.
   *
   * The SAVED `GameRecord` uses this same id, so the slips captured mid-game
   * and the game they happened in join without a lookup.
   */
  readonly gameId: string;
}

/** `teach-` prefixed to match the id shape the saved Learn `GameRecord` has
 *  always used. Random suffix because two games can start inside one
 *  millisecond (a rewind fires `newGame` synchronously). */
function mintGameId(): string {
  return `teach-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @param onNewGame Fired AFTER every reset, from EVERY path — the explicit
 *   `newGame()` call and `observe()`'s own board-went-backwards detection. The
 *   surface passes its hand-held per-game refs' clearer here, so a fresh game
 *   cannot forget this memory's slots while the page's refs remember (found
 *   2026-09-20: `observe()` self-reset was a THIRD door, and the page's
 *   `fundamentalSeenRef` never heard about it). Never call `newGame()` from
 *   inside it — the callback forgets the CALLER's state, not this one's.
 */
export function createLearnMemory(onNewGame?: () => void): LearnMemory {
  const curatedBeatSeen = new Set<string>();
  const curatedBeatSubjects = new Set<string>();
  const saidExplainers = new Set<string>();
  const structureSaid = new Set<string>();
  const engineReadSaid = new Set<string>();
  const pieceQualitySaid = new Set<string>();
  const spokenKeys = new Set<string>();
  const conceptTaught = new Set<string>();
  const spokenTacticLines = new Set<string>();
  const spokenThreatLines = new Set<string>();
  let lastPlies = 0;
  const mem: LearnMemory = {
    gameId: mintGameId(),
    curatedBeatSeen,
    curatedBeatSubjects,
    saidExplainers,
    structureSaid,
    engineReadSaid,
    pieceQualitySaid,
    spokenKeys,
    conceptTaught,
    lastTacticKey: '',
    lastThreatKey: '',
    spokenTacticLines,
    spokenThreatLines,
    gemSeen: null,
    gemFen: null,
    lastComputed: '',
    thinkAloudLastPly: NEVER_FIRED,
    spokenOpeningName: null,
    detectedOpeningName: null,
    observe(plies: number): boolean {
      const forgot = plies < lastPlies;
      if (forgot) mem.newGame();
      lastPlies = plies;
      return forgot;
    },
    newGame(): void {
      curatedBeatSeen.clear();
      curatedBeatSubjects.clear();
      saidExplainers.clear();
      structureSaid.clear();
      engineReadSaid.clear();
      pieceQualitySaid.clear();
      spokenKeys.clear();
      conceptTaught.clear();
      spokenTacticLines.clear();
      spokenThreatLines.clear();
      mem.lastTacticKey = '';
      mem.lastThreatKey = '';
      mem.gemSeen = null;
      mem.gemFen = null;
      mem.lastComputed = '';
      mem.thinkAloudLastPly = NEVER_FIRED;
      mem.spokenOpeningName = null;
      mem.detectedOpeningName = null;
      lastPlies = 0;
      // A NEW GAME IS A NEW ID. Re-minting here (rather than at a call site)
      // is what makes it impossible to record game 2's slips against game 1.
      (mem as { gameId: string }).gameId = mintGameId();
      // ONE SIGNAL, EVERY DOOR. Whoever decided a new game started — a caller,
      // or `observe` reading the board going backwards — the surface's own
      // per-game refs are forgotten in the same breath.
      onNewGame?.();
    },
  };
  return mem;
}

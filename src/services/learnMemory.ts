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
  /** Explainer lines already given this game. */
  readonly saidExplainers: Set<string>;
  /** The last gem callout spoken — suppresses the identical callout. */
  gemSeen: string | null;
  /** The board that gem callout was computed on. */
  gemFen: string | null;
  /** The gem called out at `gemFen`, held until the student moves from that
   *  board — then it is resolved (found / missed) with narration, arrows and a
   *  Walk button. Never shown before the move (honesty contract). */
  gemPending: import('./gemCrushLines').LivePunishment | null;
  /** The move held back at a deciding moment (David 2026-10-02), the board it
   *  belongs to, and whether "Show me" already said it — resolved when the
   *  student moves from that board, exactly like `gemPending`. */
  heldMove: (import('./deliberation').HeldVerdict & { fen: string; shown: boolean }) | null;
  /** The board the opponent's slip left the student, after the coach said
   *  "look for it" — and the slip itself (SAN), so a capture back on its
   *  square reads as a recapture. Resolved when the student moves from it:
   *  "you found it" or the answer with its point (David 2026-10-02). */
  slipAnswer: { fen: string; theirSan: string } | null;
  /** The coach's last reply, when the STUDENT dictated it (its SAN) — so
   *  "that was a mistake from me" would be false (hand walk 2026-09-24). */
  lastReplyDictated: string | null;
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
  /** Loud alarms (a piece or the game at stake) said this game: the first is
   *  said with full weight, later ones as "Again —", so the alarm keeps its
   *  meaning (live tape 2026-10-06: seven "Drop everything" in one game). */
  readonly loudAlarms: Set<string>;
  readonly spokenTacticLines: Set<string>;
  readonly spokenThreatLines: Set<string>;
  /** Threat answers said this game — rotates their question stem by
   *  occurrence, so consecutive answers never open with the same words. */
  readonly questionsAnswered: Set<string>;
  /** Pieces already called out this game by `pieceQualityLines`. */
  readonly pieceQualitySaid: Set<string>;
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
  /** Opening principles taught this game (WO-TEACH-02 S2) — each once. */
  readonly principleTaught: Set<string>;
  /** Tactic motif → the move number it was first taught (S6 transfer). */
  /** Structurally `MotifLedger` — this module imports nothing (pure memory). */
  readonly motifFirstMove: Map<string, { move: number; instance: string }>;
  /** The opening name already QUEUED for the voice this game. Queueing is not
   *  saying (see `spokenOpeningName`), but re-queueing the SAME name every turn
   *  spoke "This game is now the Caro-Kann Defense." on two consecutive plies
   *  (Learn walk 2026-09-23). One queue per name per game. */
  queuedOpeningName: string | null;
  /** The opening-identity paragraph queued this game (its claim key) — what
   *  the opening provokes/aims for is said ONCE per game, after the name. */
  identityQueued: string | null;
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
  /** THE STUDENT'S SLIPS THIS GAME, by fundamental id — so the coach can say
   *  "that's the second time this game" (David 2026-10-06: a coach reacts to
   *  the student, it does not narrate each move in isolation). */
  slipsThisGame: Map<string, number>;
  /** IDEAS THE COACH SAID THIS GAME, with the move that pays them off — the
   *  thread across moves: when the board pays an idea off, the coach closes
   *  the loop instead of moving on as if it had never spoken. */
  promises: Map<string, { key: string; piece: string; square: string; takes?: boolean; say: string; ply: number }>;
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
  const saidExplainers = new Set<string>();
  const structureSaid = new Set<string>();
  const pieceQualitySaid = new Set<string>();
  const spokenKeys = new Set<string>();
  const conceptTaught = new Set<string>();
  const principleTaught = new Set<string>();
  const motifFirstMove = new Map<string, { move: number; instance: string }>();
  const spokenTacticLines = new Set<string>();
  const spokenThreatLines = new Set<string>();
  const loudAlarms = new Set<string>();
  const questionsAnswered = new Set<string>();
  let lastPlies = 0;
  const mem: LearnMemory = {
    gameId: mintGameId(),
    saidExplainers,
    structureSaid,
    pieceQualitySaid,
    spokenKeys,
    conceptTaught,
    principleTaught,
    motifFirstMove,
    lastTacticKey: '',
    lastThreatKey: '',
    loudAlarms,
    questionsAnswered,
    spokenTacticLines,
    spokenThreatLines,
    gemSeen: null,
    gemFen: null,
    gemPending: null,
    heldMove: null,
    slipAnswer: null,
    lastReplyDictated: null,
    lastComputed: '',
    spokenOpeningName: null,
    detectedOpeningName: null,
    queuedOpeningName: null,
    identityQueued: null,
    slipsThisGame: new Map<string, number>(),
    promises: new Map<string, { key: string; piece: string; square: string; takes?: boolean; say: string; ply: number }>(),
    observe(plies: number): boolean {
      const forgot = plies < lastPlies;
      if (forgot) mem.newGame();
      lastPlies = plies;
      return forgot;
    },
    newGame(): void {
      mem.slipsThisGame.clear();
      mem.promises.clear();
      saidExplainers.clear();
      structureSaid.clear();
      pieceQualitySaid.clear();
      spokenKeys.clear();
      conceptTaught.clear();
      principleTaught.clear();
      motifFirstMove.clear();
      spokenTacticLines.clear();
      spokenThreatLines.clear();
      mem.lastTacticKey = '';
      mem.lastThreatKey = '';
      loudAlarms.clear();
      questionsAnswered.clear();
      mem.gemSeen = null;
      mem.gemFen = null;
      mem.gemPending = null;
      mem.heldMove = null;
      mem.slipAnswer = null;
      mem.lastReplyDictated = null;
      mem.lastComputed = '';
      mem.spokenOpeningName = null;
      mem.detectedOpeningName = null;
      mem.queuedOpeningName = null;
      mem.identityQueued = null;
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

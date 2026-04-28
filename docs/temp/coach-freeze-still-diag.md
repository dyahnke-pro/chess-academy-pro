## (1) What PR #347 actually shipped

### git log 314e4ae..HEAD on coach-turn files
```
59f9b9c fix(coach): real resilience layer (withTimeout + 3-tier fallback) + voice tag leak + board flash on student moves + lichess 401 (#347)
```

### git show HEAD --stat
```
commit 59f9b9c14d65453ff7420da8e4b5a43095290c24
Author: dyahnke-pro <dyahnke@gmail.com>
Date:   Mon Apr 27 12:43:53 2026 -0500

    fix(coach): real resilience layer (withTimeout + 3-tier fallback) + voice tag leak + board flash on student moves + lichess 401 (#347)
    
    PR #344 shipped audit-kind names without implementation — coach hangs mid-game when Stockfish stalls. Diagnostic at docs/temp/coach-stall-diag.md (PR #345) confirmed the withTimeout wrapper, fallback chain, and audit emit sites do not exist in code. This PR ships the actual resilience layer plus three related polish bugs caught by production audits.
    
    Part A — withTimeout utility
    - src/coach/withTimeout.ts: discriminated WithTimeoutResult { ok, value? | reason+label }. Real upstream rejections propagate via reject; only timeouts take the discriminated path. Timer cleared on either branch.
    - 7 tests in src/coach/__tests__/withTimeout.test.ts.
    
    Part B — coach-turn resilience: wrap every ask + 3-tier fallback chain
    - CoachGamePage.tsx coach-turn ask wrapped at 15 s; on timeout, three-tier fallback fires:
      - Level 1 (coach-move-stockfish-bypassed, 10 s): retry with excludeTools: ['stockfish_eval']
      - Level 2 (coach-move-llm-fallback, 8 s): retry with all data tools excluded + system addendum telling the brain to play from its own chess knowledge
      - Level 3 (coach-move-emergency-pick): deterministic move from chess.js — symmetric reply on move 1 (e4→e5, d4→d5, Nf3→Nf6); else first knight move; else pawn; else any legal
    - GameChatPanel.tsx both ask sites (in-game + drawer) wrapped at 15 s; on timeout, surfaces an error bubble.
    - The pre-existing local withTimeout helper for Lichess fetches renamed to withFetchTimeout (different shape — throws on timeout).
    - CoachServiceOptions gains excludeTools?: readonly string[]. getToolDefinitions accepts { exclude }. coachService.ask refuses to dispatch any excluded tool (defense in depth).
    - Three new audit kinds: coach-move-stockfish-bypassed, coach-move-llm-fallback, coach-move-emergency-pick.
    
    Part C — voice tag-strip leak
    Audit Finding 32: '[[ACTION:play_move {san}]] Done.' was being spoken aloud by Polly because the existing strip regex only matched the canonical double-bracket form. The brain has been observed emitting BOTH '[[ACTION:...]]' and '[ACTION:...]' (single-bracket regression).
    - src/coach/stripTags.ts: shared utility + COACH_OUTPUT_TAG_STRIP_RE covering both bracket variants AND [BOARD:...]. Alternation-ordered so the double-bracket form matches first (no half-stripping).
```

### grep withTimeout / fallback audit kinds in coach-turn files
```
src/components/Coach/GameChatPanel.tsx:14:import { withTimeout } from '../../coach/withTimeout';
src/components/Coach/GameChatPanel.tsx:588:          // shared withTimeout so a hung spine surfaces a graceful
src/components/Coach/GameChatPanel.tsx:590:          const askResult = await withTimeout(
src/components/Coach/GameChatPanel.tsx:845:        // WO-COACH-RESILIENCE: same withTimeout wrap as the in-game
src/components/Coach/GameChatPanel.tsx:847:        const drawerAskResult = await withTimeout(
src/components/Coach/CoachGamePage.tsx:47:import { withTimeout } from '../../coach/withTimeout';
src/components/Coach/CoachGamePage.tsx:70: *  on expiry. Distinct from `../../coach/withTimeout` (which returns
src/components/Coach/CoachGamePage.tsx:1579:          const primary = await withTimeout(
src/components/Coach/CoachGamePage.tsx:1587:              kind: 'coach-move-stockfish-bypassed',
src/components/Coach/CoachGamePage.tsx:1593:            const lvl1 = await withTimeout(
src/components/Coach/CoachGamePage.tsx:1599:              'coach-move-stockfish-bypassed',
src/components/Coach/CoachGamePage.tsx:1607:                kind: 'coach-move-llm-fallback',
src/components/Coach/CoachGamePage.tsx:1613:              const lvl2 = await withTimeout(
src/components/Coach/CoachGamePage.tsx:1628:                'coach-move-llm-fallback',
src/components/Coach/CoachGamePage.tsx:1634:                  kind: 'coach-move-emergency-pick',
src/components/Coach/CoachGamePage.tsx:1996:        // withTimeout so a slow Lichess response never stalls
```

## (2) Coach-turn trigger — useEffect that watches game.turn and invokes ask

```
 *  coach-narration path shares a budget. Past this, narration
 *  degrades to ungrounded prose rather than stalling the turn. */
const LICHESS_FETCH_TIMEOUT_MS = 2500;

/** Race a fetch-style promise against a timeout, throwing 'timeout'
 *  on expiry. Distinct from `../../coach/withTimeout` (which returns
 *  a discriminated `{ ok }` result for the resilience chain) — this
 *  one is used by Lichess cloud-eval / explorer fetches that already
 *  use try / catch and want a thrown error on timeout. */
function withFetchTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Evaluate a set of candidate SAN moves on the position reached AFTER
 * each move. Uses Lichess cloud-eval (no auth, free, cached) per
 * candidate in parallel. Candidates whose FEN has no cloud eval
 * (404) are skipped — better to miss a trap than to mis-flag one.
 *
 * Eval is normalised to the MOVER's POV: positive = the candidate
 * player got better, negative = they lost ground. This matches what
 * `detectTrapInPosition` expects (it looks for popular moves where
 * evalCp &lt;= -200 for the mover).
 */
/** Max Lichess cloud-eval requests in flight at once. Previously
 *  Promise.all fired 5+ candidates in parallel on every trap check,
 *  which could 429 on the public endpoint or just pile up on slow
 *  networks. 2-at-a-time is enough to keep latency reasonable
 *  without burst. */
const LICHESS_CLOUD_EVAL_CONCURRENCY = 2;

async function evaluateExplorerCandidates(
  fen: string,
--
): MoveClassification {
  if (preMoveEval === null) return 'good';
  // Both evals are from White's perspective (normalized by stockfishEngine).

  // If the player delivered checkmate or found a forced mate, it's brilliant/great
  const postMoveGoodForPlayer = playerColor === 'white' ? postMoveEval > 0 : postMoveEval < 0;
  if (isMateEval(postMoveEval) && postMoveGoodForPlayer) {
    return isEngineBestMove ? 'brilliant' : 'great';
  }

  // If the player walked into a forced mate against them (was fine before), it's a blunder
  const postMoveBadForPlayer = playerColor === 'white' ? postMoveEval < 0 : postMoveEval > 0;
  if (isMateEval(postMoveEval) && postMoveBadForPlayer && !isMateEval(preMoveEval)) {
    return 'blunder';
  }

  // If both pre and post are mate evals (e.g. forced mate was already on the board),
  // the player maintained the line — classify as good unless they lost the mate
  if (isMateEval(preMoveEval) && isMateEval(postMoveEval)) {
    return 'good';
  }

  // cpLostVsBest = how much worse the played move is vs the engine's best
  const cpLostVsBest = bestMoveEval !== null
    ? (playerColor === 'white'
        ? bestMoveEval - postMoveEval
        : postMoveEval - bestMoveEval)
    : 0;

  // Brilliant: player found the engine's best move AND second-best was significantly worse.
  // This means the move was the *only* good option in a critical position (Chess.com-style).
  // We require second-best to be ≥150cp worse than best to qualify as brilliant.
  if (isEngineBestMove && secondBestEval !== null && secondBestEval !== undefined) {
    const secondBestGap = playerColor === 'white'
      ? (bestMoveEval ?? postMoveEval) - secondBestEval
      : secondBestEval - (bestMoveEval ?? postMoveEval);
    if (secondBestGap >= 150) return 'brilliant';
  }

  // Great: played the best move or very close (<10cp off)
  if (cpLostVsBest <= 10) return 'great';
  // Good: small inaccuracy vs best
  if (cpLostVsBest < 50) return 'good';
  // Suboptimal classifications based on cp lost vs best move
  if (cpLostVsBest < 100) return 'inaccuracy';
  if (cpLostVsBest < 250) return 'mistake';
  return 'blunder';
}

function findKeyMoments(moves: CoachGameMove[]): KeyMoment[] {
  const evaluated = moves.filter((m) => m.evaluation !== null && !m.isCoachMove);
  if (evaluated.length < 2) return [];

  // Find largest eval swings, clamping mate evals so they don't distort deltas
  const clampEval = (e: number): number => Math.max(-3000, Math.min(3000, e));

  const swings: { index: number; delta: number; move: CoachGameMove }[] = [];

  for (let i = 1; i < evaluated.length; i++) {
    const prev = evaluated[i - 1];
    const curr = evaluated[i];
    if (prev.evaluation !== null && curr.evaluation !== null) {
      const delta = Math.abs(clampEval(curr.evaluation) - clampEval(prev.evaluation));
      swings.push({ index: i, delta, move: curr });
--
    };
  }, [gameState.moves]);

  // 3-tier visual hint system (Stockfish-powered, no knownMove)
  const isPlayersTurn =
    (playerColor === 'white' && game.turn === 'w') ||
    (playerColor === 'black' && game.turn === 'b');
  const { hintState, requestHint, resetHints } = useHintSystem({
    fen: game.fen,
    playerColor,
    enabled: gameState.status === 'playing' && isPlayersTurn && !game.isGameOver,
  });

  // WO-LIVE-COACH-01: live-coach interjection driver. Receives per-move
  // analysis from this component's existing Stockfish pipeline (we do
  // NOT re-run the engine inside the hook) and dispatches LLM speech
  // when one of the five triggers fires.
  const liveCoach = useLiveCoach({
    gameId: gameState.gameId,
    playerColor,
  });

  // Inject nudge text into chat when it appears
  const prevNudgeRef = useRef<string | null>(null);
  useEffect(() => {
    if (hintState.nudgeText && hintState.nudgeText !== prevNudgeRef.current) {
      prevNudgeRef.current = hintState.nudgeText;
      gameChatRef.current?.injectAssistantMessage(hintState.nudgeText);
    }
  }, [hintState.nudgeText]);

  // ─── Coach Tip Bubble (floating overlay near board) ─────────────────────────
  const [tipBubbleText, setTipBubbleText] = useState<string | null>(null);
  const [tipTacticLine, setTipTacticLine] = useState<TacticLineData | null>(null);
  const [showingTacticLine, setShowingTacticLine] = useState(false);
  const tipBubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tacticAnimTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
--

  // Check for game over — transition to 'gameover' first to show final position
  useEffect(() => {
    if (game.isGameOver && gameState.status === 'playing') {
      const result: 'win' | 'loss' | 'draw' = game.isCheckmate
        ? (game.turn === 'w' && playerColor === 'white' ? 'loss' : 'win')
        : 'draw';

      const keyMoments = findKeyMoments(gameState.moves);

      // Show the final board position with game-over overlay before transitioning
      setGameState((prev) => ({
        ...prev,
        status: 'gameover',
        result,
        keyMoments,
      }));

      // Save game to DB
      const playerWon = result === 'win';
      const playerLost = result === 'loss';
      const pgnResult: GameResult = playerColor === 'white'
        ? (playerWon ? '1-0' : playerLost ? '0-1' : '1/2-1/2')
        : (playerWon ? '0-1' : playerLost ? '1-0' : '1/2-1/2');
      const tags: string[] = [difficulty === 'hard' ? 'Hard' : '', gameState.hintsUsed === 0 ? 'NoHints' : ''].filter(Boolean);

      const annotations = movesToAnnotations(gameState.moves, playerColor);
      const summary = buildAnalysisSummary(gameState.moves, keyMoments, playerColor, result);

      const playerName = activeProfile?.name ?? 'Player';
      const gameRecord = {
        id: gameState.gameId,
        pgn: game.history.join(' '),
        white: playerColor === 'white' ? playerName : 'Stockfish Bot',
        black: playerColor === 'black' ? playerName : 'Stockfish Bot',
        result: pgnResult,
        date: new Date().toISOString().split('T')[0],
        event: `Coach Game ${tags.join(' ')}`.trim(),
        eco: detectedOpening?.eco ?? null,
        whiteElo: playerColor === 'white' ? playerRating : targetStrength,
        blackElo: playerColor === 'black' ? playerRating : targetStrength,
        source: 'coach' as const,
        annotations,
        coachAnalysis: JSON.stringify(summary),
        isMasterGame: false,
        openingId: detectedOpening?.name ?? null,
      };

      void db.games.add(gameRecord).then(() => {
        if (!activeProfile) return;

        // Detect bad habits from game moves
        void detectBadHabitsFromGame(gameState.moves, activeProfile);

        // Generate mistake puzzles and refresh weakness profile
        void generateMistakePuzzlesFromGame(gameRecord.id).then(() => {
          // Refresh weakness profile with new game data and generated puzzles
          void computeWeaknessProfile(activeProfile);
        });

      });
    }
  }, [game.isGameOver, game.isCheckmate, game.turn, gameState.status, gameState.moves, playerColor, difficulty, gameState.hintsUsed, gameState.gameId, game.history, activeProfile, playerRating, targetStrength, setActiveProfile, detectedOpening]);

  // Auto-transition from gameover overlay to postgame review after showing final position
  useEffect(() => {
    if (gameState.status !== 'gameover') return;
    // Clear the resumable snapshot once the game actually ends so we
    // don't auto-restore a finished position on the next visit.
    void clearCoachPlayState();
    const timer = setTimeout(() => {
--

  // Coach makes a move when it's their turn.
  // Uses an AbortController (not a ref guard) to handle React strict-mode
  // double-invocation and dependency-change re-runs safely.
  useEffect(() => {
    const isCoachTurn =
      gameState.status === 'playing' &&
      !game.isGameOver &&
      ((playerColor === 'white' && game.turn === 'b') ||
       (playerColor === 'black' && game.turn === 'w'));

    if (!isCoachTurn) return;

    setIsCoachThinking(true);
    const abortController = new AbortController();
    const isCancelled = (): boolean => abortController.signal.aborted;

    const applyCoachMove = (
      result: MoveResult,
      evaluation: number,
      preMoveEval: number | null = null,
      bestMove: string | null = null,
    ): void => {
      moveCountRef.current += 1;

      const coachMove: CoachGameMove = {
        moveNumber: moveCountRef.current,
        san: result.san,
        fen: result.fen,
        isCoachMove: true,
        commentary: '',
        evaluation,
        classification: null,
        expanded: false,
        bestMove,
        bestMoveEval: null,
        preMoveEval,
      };
```


## (3) Diagnostic console.log instrumentation added

Eight `// DIAG-FREEZE` log points added on this branch:

```
1419:    // DIAG-FREEZE A — coach-turn useEffect tick (every render)
1421:    console.log('[DIAG-FREEZE A] coach-turn useEffect tick', {
1492:      // DIAG-FREEZE A2 — makeCoachMove entered (after the 800 ms delay)
1494:      console.log('[DIAG-FREEZE A2] makeCoachMove entered', {
1599:          // DIAG-FREEZE B — about to invoke primary coach-turn ask
1601:          console.log('[DIAG-FREEZE B] about to call coachService.ask (primary)', {
1612:          // DIAG-FREEZE C — primary ask resolved (ok or timeout)
1614:          console.log('[DIAG-FREEZE C] primary ask resolved', {
1686:        // DIAG-FREEZE D — exited the resilience block
1688:        console.log('[DIAG-FREEZE D] resilience block exited', {
1723:        // DIAG-FREEZE E — about to apply coach move to the board
1725:        console.log('[DIAG-FREEZE E] about to tryMakeMove', { uci: move, ts: Date.now() });
1901:    // DIAG-FREEZE P1 — entering player-move post-analysis section.
1909:    console.log('[DIAG-FREEZE P1] handlePlayerMove: about to call analyzePosition(moveResult.fen, 12)', {
1922:    // DIAG-FREEZE P2 — first analyzePosition resolved (or threw).
1924:    console.log('[DIAG-FREEZE P2] handlePlayerMove: post-move analyzePosition returned', {
1937:    // DIAG-FREEZE P3 — second analyzePosition resolved.
1939:    console.log('[DIAG-FREEZE P3] handlePlayerMove: pre-move analyzePosition returned', {
2327:    // DIAG-FREEZE P4 — non-blunder path: about to commit player's move.
2331:    // (DIAG-FREEZE A should fire right after).
2333:    console.log('[DIAG-FREEZE P4] handlePlayerMove: about to game.makeMove', {
```

Open the preview, open browser DevTools console, filter by `DIAG-FREEZE`, then play 1.d4 (as Black it would be 1...something else; the user reported playing as White against the coach so 1.d4 is the user's move). Watch the sequence.

**Expected log sequence on a healthy turn:**
1. **A** fires every render — many entries; useful only to confirm `isCoachTurn` becomes true after the player moves.
2. **A2** fires once when `makeCoachMove` is invoked (after the 800 ms feel-natural delay).
3. **B** fires immediately before `coachService.ask` — if A2 fires but B doesn't, the suspicion is the lines between (envelope assembly, opening intent lookup, etc.).
4. **C** fires when the primary ask resolves (ok=true with the answer, or ok=false on 15 s timeout).
5. **D** fires when the resilience block exits (after Levels 1 / 2 / 3 if needed).
6. **E** fires immediately before `tryMakeMove` applies the coach's UCI to the board.

**Player-move post-analysis instrumentation (suspected freeze location):**
1. **P1** fires when `handlePlayerMove` enters the post-move analysis section.
2. **P2** fires when the post-move `analyzePosition` returns.
3. **P3** fires when the pre-move `analyzePosition` returns.
4. **P4** fires immediately before the non-blunder `game.makeMove` commit. If P1 fires but P2 doesn't (or P2 fires but P3 doesn't), the player-move analysis is hanging — that's the freeze, and it BLOCKS `game.makeMove`, which means `game.turn` never flips, which means the coach-turn useEffect never sees its trigger.

## (4) Coach-turn legacy bypass check — does the coach-turn path use coachApi/getCoachChatResponse instead of the spine?

```
src/components/Coach/CoachGamePage.tsx:135:import { getCoachChatResponse } from '../../services/coachApi';
src/components/Coach/CoachGamePage.tsx:865:      void getCoachChatResponse(
src/components/Coach/CoachGamePage.tsx:2262:        const alertText = await getCoachChatResponse(
```

### And in case the path goes through a service layer:
```
```


---

## Diagnosis

**PR #347 wrapped the coach's OWN ask but did NOT wrap the player-move post-analysis path. The freeze is on a completely different code path.**

The coach-turn pipeline (CoachGamePage.tsx:1412 useEffect → 1476 makeCoachMove → 1579 `withTimeout(coachService.ask, 15_000, 'coach-turn-ask')`) is correctly wrapped by PR #347 with the 3-tier fallback chain (Level 1 stockfish-bypass / Level 2 LLM-only / Level 3 emergency-pick). That's not the freeze.

The freeze is in **handlePlayerMove** (CoachGamePage.tsx:1866) at lines 1903-1915, which contains TWO sequential bare-await Stockfish calls with NO timeout protection:

```typescript
analysis = await stockfishEngine.analyzePosition(moveResult.fen, 12);
// ...
preAnalysis = await stockfishEngine.analyzePosition(preFen, 12);
```

These run on EVERY player move BEFORE `game.makeMove` is called (game.makeMove is intentionally deferred to line 2301 to keep `game.turn` on the player's color until the blunder check completes — see the comment block at lines 1883-1889). When Stockfish hangs (the iOS Safari WASM crash from the original report), these awaits never resolve, `handlePlayerMove` never reaches line 2301, `game.makeMove` never runs, `game.turn` stays on the player's color, and the coach-turn useEffect never re-fires for the second turn.

**No legacy bypass.** Section (4) shows `getCoachChatResponse` is called from CoachGamePage.tsx but only in explore-mode commentary (line 865) and a missed-tactic alert path (line 2262) — neither is on the coach-turn move-selection path.

**Specific lines to wrap in the actual fix:**
- `src/components/Coach/CoachGamePage.tsx:1904` — `stockfishEngine.analyzePosition(moveResult.fen, 12)` → wrap with `withTimeout(..., 5_000, 'player-move-analysis-after')` and treat timeout as null analysis (existing try/catch already handles null)
- `src/components/Coach/CoachGamePage.tsx:1912` — `stockfishEngine.analyzePosition(preFen, 12)` → wrap with `withTimeout(..., 5_000, 'player-move-analysis-before')` same handling
- `src/components/Coach/CoachGamePage.tsx:1810` (line is now ~1822 with diag logs) — the catch block already does `tryMakeMove(randomMove)` as a last-resort, but it's only reached if the analysis throws. Add a separate path: if EITHER analysis times out, still call `game.makeMove` to commit the player's move (skip the eval-graph / classification updates) so the coach-turn useEffect can fire.

**Same pattern likely lurks in `handlePracticeMove` (line 2270) and `handleExploreMove`.** Worth grepping the rest of the file for unwrapped `analyzePosition` calls in player-move handlers.

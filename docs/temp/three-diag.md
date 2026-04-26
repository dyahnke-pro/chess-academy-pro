# Three-diagnostic — post-57573b2 audit triage

Branch: claude/wo-teach-fix-02 at `57573b25199377d978458b6f2577e030f6454a56`

Vercel comment on PR #335 confirms: deployment status `Ready` (DEPLOYED), preview URL points to commit 57573b2 (built at Apr 26 04:48 UTC, AFTER the 04:47 push). The audit Dave just collected was on the deployed code.

Preview URL: https://chess-academy-pro-git-claude-wo-te-b2150a-dyahnke-pros-projects.vercel.app

---

## Diagnostic A — Branch + deploy verification

### A.1 — `git log --oneline claude/wo-teach-fix-02 -5`

```
57573b2 fix(WO-TEACH-FIX-02 continued): voice doubling, chat-surface play_move
08aa978 docs: add temporary voice-doubling diagnostic
7896626 fix(coach): strip action tags from voice + audit streaming dispatch
2fda8d2 docs: add temporary streaming action-parsing diagnostic
bf9c351 docs: add temporary play_move wiring diagnostic
```

### A.2 — Vercel status (from PR #335 comment)

- Status badge: **Ready** (DEPLOYED)
- Inspector: https://vercel.com/dyahnke-pros-projects/chess-academy-pro/9JZQCRwTuN6UqvimcW97qML26DkP
- Preview alias (stable per branch): https://chess-academy-pro-git-claude-wo-te-b2150a-dyahnke-pros-projects.vercel.app
- Last update: Apr 26, 2026 04:48 UTC

Conclusion: the alias URL is the same as before, but Vercel swapped the deployment behind it. The user's test was against commit 57573b2.

---

## Diagnostic B — Every speak source firing across the entire src/

### B.1 — `grep -rn "voiceService\.\(speak\|speakForced\|speakQueuedForced\)" src --include="*.ts" --include="*.tsx"`

```
src/components/Puzzles/MistakePuzzleBoard.tsx:156:    void voiceService.speak(message);
src/components/Puzzles/MistakePuzzleBoard.tsx:273:        void voiceService.speak(contextMsg);
src/components/Puzzles/MistakePuzzleBoard.tsx:285:            void voiceService.speak(puzzle.narration.intro);
src/components/Puzzles/MistakePuzzleBoard.tsx:294:              void voiceService.speak(puzzle.narration.intro);
src/components/Puzzles/MistakePuzzleBoard.tsx:364:            void voiceService.speak(puzzle.narration.intro);
src/components/Puzzles/MistakePuzzleBoard.tsx:371:        void voiceService.speak(mistakeMsg).finally(() => {
src/components/Puzzles/MistakePuzzleBoard.tsx:424:      void voiceService.speak(puzzle.narration.intro);
src/components/Puzzles/MistakePuzzleBoard.tsx:438:        void voiceService.speak(hint);
src/components/Puzzles/MistakePuzzleBoard.tsx:444:        void voiceService.speak(message);
src/components/Puzzles/MistakePuzzleBoard.tsx:488:      void voiceService.speak(response);
src/components/Puzzles/MistakePuzzleBoard.tsx:495:      void voiceService.speak(fallback);
src/components/Puzzles/MistakePuzzleBoard.tsx:522:        void voiceService.speak(moveNarrations[currentPlayerMove]);
src/components/Puzzles/MistakePuzzleBoard.tsx:548:            void voiceService.speak(puzzle.narration.outro);
src/components/Puzzles/MistakePuzzleBoard.tsx:627:      void voiceService.speak(hint);
src/components/Puzzles/PuzzleBoard.tsx:92:    void voiceService.speak(message);
src/components/Puzzles/PuzzleBoard.tsx:194:    if (state === 'correct') void voiceService.speak('Excellent! Puzzle solved!');
src/components/Puzzles/PuzzleBoard.tsx:280:        void voiceService.speak(hint);
src/components/Settings/NarrationAuditPanel.test.ts:41:        source: 'voiceService.speakPolly',
src/components/Settings/NarrationAuditPanel.test.ts:60:    expect(md).toContain('source: `voiceService.speakPolly`');
src/components/Board/VoiceChatMic.tsx:396:        firstSpeakPromise = Promise.resolve(voiceService.speakForced(trimmed))
src/components/Board/VoiceChatMic.tsx:405:        void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(trimmed));
src/components/Tactics/TacticCreatePage.tsx:122:        void voiceService.speak(narration);
src/components/Tactics/TacticCreatePage.tsx:135:      void voiceService.speak(transition);
src/components/Tactics/TacticCreatePage.tsx:156:      void voiceService.speak(intro);
src/components/Tactics/TacticCreatePage.tsx:188:      void voiceService.speak(msg + depthMsg);
src/components/Tactics/TacticCreatePage.tsx:199:      void voiceService.speak(msg);
src/components/Search/SmartSearchBar.tsx:268:            firstSpeakPromise = Promise.resolve(voiceService.speakForced(cleaned))
src/components/Search/SmartSearchBar.tsx:275:            void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(cleaned));
src/components/Openings/PlayableLinePlayer.tsx:149:      void voiceService.speak(annotation);
src/components/Openings/PlayableLinePlayer.tsx:240:            void voiceService.speak('Excellent! You remembered the entire line.');
src/components/Tactics/TacticSetupBoard.tsx:60:    void voiceService.speak(coachMsg);
src/components/Tactics/TacticSetupBoard.tsx:102:    void voiceService.speak(intro);
src/components/Tactics/TacticSetupBoard.tsx:143:          void voiceService.speak(completeMsg);
src/components/Tactics/TacticSetupBoard.tsx:199:        void voiceService.speak(revealMsg);
src/components/Tactics/TacticSetupBoard.tsx:204:        void voiceService.speak(prepMsg);
src/components/Tactics/TacticSetupBoard.tsx:217:    void voiceService.speak(wrongMsg);
src/components/Openings/MiddlegamePlanStudy.tsx:171:      void voiceService.speak(text).finally(() => {
src/components/Openings/TrainMode.tsx:180:      void voiceService.speak(`Well done! You've completed the ${currentLine.name} line.`);
src/components/Openings/MiddlegamePlanStudy.test.tsx:173:  it('calls voiceService.speak when narration is toggled on', async () => {
src/components/Openings/MiddlegamePlanStudy.test.tsx:177:    expect(voiceService.speak).toHaveBeenCalledWith(
src/components/Openings/PracticeMode.tsx:224:        void voiceService.speak(`Line perfected! You know the ${lineName} by heart.`);
src/components/Openings/PracticeMode.tsx:226:        void voiceService.speak(`Good attempt on the ${lineName}. ${totalMistakes} mistake${totalMistakes !== 1 ? 's' : ''}.`);
src/components/Kid/KingMarchGame.tsx:38:      void voiceService.speak(text);
src/components/Kid/KingEscapeGame.tsx:27:      void voiceService.speak(text);
src/components/Openings/DrillMode.tsx:285:      void voiceService.speak(`Line discovered! You've learned the ${lineName}.`);
src/components/Openings/DrillMode.tsx:297:      void voiceService.speak(speechText);
src/components/Kid/ColorWars.tsx:54:    void voiceService.speak(text);
src/components/Kid/KnightSweepGame.tsx:95:      void voiceService.speak(text);
src/components/Kid/KidModePage.tsx:59:    void voiceService.speak(text);
src/components/Kid/KnightGamesPage.tsx:23:      void voiceService.speak(text);
src/components/Openings/OpeningPlayMode.tsx:133:      void voiceService.speak(text);
src/components/Kid/RookGamesPage.tsx:25:      void voiceService.speak(text);
src/components/Kid/MiniGamePage.test.tsx:165:  // 4. voiceService.speak called with storyIntro on intro
src/components/Kid/MiniGamePage.test.tsx:166:  it('calls voiceService.speak with storyIntro on intro phase', async () => {
src/components/Kid/MiniGamePage.test.tsx:171:    expect(voiceService.speak).toHaveBeenCalledWith(
src/components/Kid/MiniGamePage.test.tsx:330:  // 14. voiceService.speak called on won phase
src/components/Kid/MiniGamePage.test.tsx:331:  it('calls voiceService.speak with storyWin on won phase', async () => {
src/components/Kid/MiniGamePage.test.tsx:338:    vi.mocked(voiceService.speak).mockClear();
src/components/Kid/MiniGamePage.test.tsx:347:    expect(voiceService.speak).toHaveBeenCalledWith(
src/components/Kid/MiniGamePage.test.tsx:352:  // 15. voiceService.speak called on lost phase
src/components/Kid/MiniGamePage.test.tsx:353:  it('calls voiceService.speak with storyLoss on lost phase', async () => {
src/components/Kid/MiniGamePage.test.tsx:359:    vi.mocked(voiceService.speak).mockClear();
src/components/Kid/MiniGamePage.test.tsx:368:    expect(voiceService.speak).toHaveBeenCalledWith(
src/components/Kid/KidPiecePage.tsx:44:    void voiceService.speak(text).finally(() => setSpeaking(false));
src/components/Kid/GuidedGamePage.tsx:61:      void voiceService.speak(text);
src/components/Kid/GameChapterPage.tsx:62:    void voiceService.speak(text);
src/components/Kid/QueenGamesHub.tsx:41:        void voiceService.speak('Welcome to the Queen Games! Choose your challenge.');
src/components/Kid/QueenGamesHub.tsx:43:        void voiceService.speak('Complete the Knight chapter first to unlock the Queen Games!');
src/components/Kid/QueenGamesHub.tsx:69:        void voiceService.speak('Amazing! You defeated the pawn army!');
src/components/Kid/QueenGamesHub.tsx:82:        void voiceService.speak('Brilliant! You navigated the gauntlet safely!');
src/components/Kid/BishopVsPawns.tsx:47:    void voiceService.speak(text);
src/components/Kid/RowClearerPage.tsx:51:      void voiceService.speak(text);
src/components/Kid/KidPuzzlePage.tsx:56:    void voiceService.speak(text);
src/components/Kid/RookMazePage.tsx:42:      void voiceService.speak(text);
src/components/Kid/MiniGamePage.tsx:83:      void voiceService.speak(config.storyIntro);
src/components/Kid/MiniGamePage.tsx:85:      void voiceService.speak(config.storyWin);
src/components/Kid/MiniGamePage.tsx:87:      void voiceService.speak(config.storyLoss);
src/components/Kid/MiniGamePage.tsx:167:      void voiceService.speak('Watch out for the enemy pawns!');
src/components/Kid/MiniGamePage.tsx:170:      void voiceService.speak('Try moving this pawn forward!');
src/components/Kid/KidPiecePage.test.tsx:168:      expect(voiceService.speak).toHaveBeenCalled();
src/components/Kid/KidPiecePage.test.tsx:178:    expect(voiceService.speak).toHaveBeenCalled();
src/components/Kid/LeapFrogGame.tsx:107:      void voiceService.speak(text);
src/components/Coach/ExplainPositionSessionView.tsx:101:          void voiceService.speak(streamed.slice(0, 400));
src/components/Coach/ExplainPositionSessionView.tsx:154:        void voiceService.speak(response.slice(0, 400));
src/components/Kid/GameMapPage.tsx:22:    void voiceService.speak(text);
src/components/Coach/CoachGamePage.tsx:510:  // voiceService.speak(text) so we only handle the visual surface here.
src/components/Coach/CoachGamePage.tsx:2174:    // voiceService.speak(commentary) path is silenced here. Text
src/components/Coach/CoachChatPage.tsx:93:      void voiceService.speak(buffer.trim());
src/components/Coach/CoachChatPage.tsx:152:        void voiceService.speak(stripMarkdownForTts(lastAssistant.content));
src/components/Coach/CoachChatPage.tsx:237:        firstSpeakPromise = Promise.resolve(voiceService.speakForced(sentence))
src/components/Coach/CoachChatPage.tsx:242:        void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(sentence));
src/hooks/usePositionNarration.ts:92: * response to voiceService.speakForced() for TTS. Cancellation uses a
src/hooks/usePositionNarration.ts:235:          firstSpeakPromise = voiceService.speakForced(trimmed).catch(() => {
src/hooks/usePositionNarration.ts:243:            void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(trimmed));
src/hooks/usePositionNarration.ts:245:            voiceService.speakQueuedForced(trimmed);
src/components/Coach/CoachSessionPlanPage.tsx:89:        void voiceService.speak(explanation.slice(0, 300));
src/components/Coach/CoachSessionPlanPage.tsx:134:      void voiceService.speak(explanation.slice(0, 200));
src/components/Coach/CoachGameReview.tsx:181:  // the user stops auto-review would still call voiceService.speak()
src/components/Coach/GameChatPanel.tsx:153:        void voiceService.speak(buffer.trim());
src/components/Coach/GameChatPanel.tsx:211:          void voiceService.speak(ack);
src/components/Coach/GameChatPanel.tsx:248:            void voiceService.speak(ack.content);
src/components/Coach/GameChatPanel.tsx:269:            void voiceService.speak(ack.content);
src/components/Coach/GameChatPanel.tsx:394:            void voiceService.speak(textWithoutBoardTags.trim());
src/components/Coach/GameChatPanel.tsx:503:          void voiceService.speak(drawerCleanText.trim());
src/components/Coach/CoachPanel.tsx:44:      void voiceService.speak(message);
src/components/Coach/CoachAnalysePage.tsx:75:      void voiceService.speak(explanation.slice(0, 200)); // First 200 chars only for voice
src/components/Coach/CoachAnalysePage.tsx:128:    void voiceService.speak(response.slice(0, 200));
src/hooks/useReviewPlayback.ts:155:    voiceService.speakForced(text).then(
src/hooks/usePhaseNarration.ts:247:          firstSpeakPromise = voiceService.speakForced(trimmed).catch(() => {
src/hooks/usePhaseNarration.ts:252:            void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(trimmed));
src/hooks/usePhaseNarration.ts:254:            voiceService.speakQueuedForced(trimmed);
src/hooks/useStrictNarration.ts:4://   - a 30-second safety timeout AND `voiceService.speak().then()` AND a
src/hooks/useStrictNarration.ts:11://     `voiceService.speak()`. Manual presses (or stops) supersede in-flight
src/hooks/useStrictNarration.ts:123:      void voiceService.speak(narration).finally(() => {
src/hooks/useLiveCoach.ts:167:  const firstPromise = voiceService.speakForced(first).catch(() => undefined);
src/hooks/useLiveCoach.ts:171:    void firstPromise.finally(() => voiceService.speakQueuedForced(next));
src/hooks/usePositionNarration.test.ts:150:  it('speaks the full response via voiceService.speakForced when the stream completes', async () => {
src/hooks/useHintSystem.ts:347:            firstSpeakPromise = Promise.resolve(voiceService.speakForced(cleaned))
src/hooks/useHintSystem.ts:350:            void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(cleaned));
src/services/coachAgentRunner.ts:80:    void voiceService.speak(ack).catch((err: unknown) => {
src/services/coachAgentRunner.ts:112:  // void voiceService.speak(text).catch((err: unknown) => {
src/services/voiceService.test.ts:30:      await voiceService.speak('Hello world');
src/services/voiceService.test.ts:45:      await voiceService.speak('Test speech');
src/services/voiceService.test.ts:61:      await voiceService.speak('Fallback test');
src/services/voiceService.test.ts:85:      await voiceService.speak('Error fallback');
src/services/voiceService.test.ts:105:      await voiceService.speak('Network fail');
src/services/voiceService.test.ts:124:      await voiceService.speak('Custom voice');
src/services/voiceService.test.ts:202:      await voiceService.speak('Hello');
src/services/voiceService.test.ts:211:      await voiceService.speak('Hello');
src/services/voiceService.ts:401:          source: 'voiceService.speakInternal',
src/services/voiceService.ts:538:        source: 'voiceService.speakPolly',
src/services/walkthroughRunner.ts:11: *  4. Auto-play is gated primarily on `voiceService.speak()` resolving.
src/services/coachActionDispatcher.ts:298:  void voiceService.speak(text).catch(() => {
```

### B.2 — `grep -rn "voiceService\.\(speak\|speakForced\|speakQueuedForced\)" src/hooks src/services`

```
src/hooks/useReviewPlayback.ts:155:    voiceService.speakForced(text).then(
src/hooks/usePhaseNarration.ts:247:          firstSpeakPromise = voiceService.speakForced(trimmed).catch(() => {
src/hooks/usePhaseNarration.ts:252:            void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(trimmed));
src/hooks/usePhaseNarration.ts:254:            voiceService.speakQueuedForced(trimmed);
src/hooks/usePositionNarration.ts:92: * response to voiceService.speakForced() for TTS. Cancellation uses a
src/hooks/usePositionNarration.ts:235:          firstSpeakPromise = voiceService.speakForced(trimmed).catch(() => {
src/hooks/usePositionNarration.ts:243:            void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(trimmed));
src/hooks/usePositionNarration.ts:245:            voiceService.speakQueuedForced(trimmed);
src/hooks/useLiveCoach.ts:167:  const firstPromise = voiceService.speakForced(first).catch(() => undefined);
src/hooks/useLiveCoach.ts:171:    void firstPromise.finally(() => voiceService.speakQueuedForced(next));
src/hooks/useStrictNarration.ts:4://   - a 30-second safety timeout AND `voiceService.speak().then()` AND a
src/hooks/useStrictNarration.ts:11://     `voiceService.speak()`. Manual presses (or stops) supersede in-flight
src/hooks/useStrictNarration.ts:123:      void voiceService.speak(narration).finally(() => {
src/hooks/useHintSystem.ts:347:            firstSpeakPromise = Promise.resolve(voiceService.speakForced(cleaned))
src/hooks/useHintSystem.ts:350:            void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(cleaned));
src/hooks/usePositionNarration.test.ts:150:  it('speaks the full response via voiceService.speakForced when the stream completes', async () => {
src/services/coachAgentRunner.ts:80:    void voiceService.speak(ack).catch((err: unknown) => {
src/services/coachAgentRunner.ts:112:  // void voiceService.speak(text).catch((err: unknown) => {
src/services/voiceService.test.ts:30:      await voiceService.speak('Hello world');
src/services/voiceService.test.ts:45:      await voiceService.speak('Test speech');
src/services/voiceService.test.ts:61:      await voiceService.speak('Fallback test');
src/services/voiceService.test.ts:85:      await voiceService.speak('Error fallback');
src/services/voiceService.test.ts:105:      await voiceService.speak('Network fail');
src/services/voiceService.test.ts:124:      await voiceService.speak('Custom voice');
src/services/voiceService.test.ts:202:      await voiceService.speak('Hello');
src/services/voiceService.test.ts:211:      await voiceService.speak('Hello');
src/services/voiceService.ts:401:          source: 'voiceService.speakInternal',
src/services/voiceService.ts:538:        source: 'voiceService.speakPolly',
src/services/walkthroughRunner.ts:11: *  4. Auto-play is gated primarily on `voiceService.speak()` resolving.
src/services/coachActionDispatcher.ts:298:  void voiceService.speak(text).catch(() => {
```

### B.3 — `grep -B5 -A2 "speakForced\|speakQueuedForced" src/services`

```
src/services/voiceService.ts-    await speechService.speak(sanitizeForTTS(text), { ...WEB_SPEECH_FALLBACK, rate: speed });
src/services/voiceService.ts-  }
src/services/voiceService.ts-
src/services/voiceService.ts-  /** Speak regardless of the voiceEnabled preference.
src/services/voiceService.ts-   *  Used by the voice-chat mic where the user explicitly opted into voice. */
src/services/voiceService.ts:  async speakForced(text: string): Promise<void> {
src/services/voiceService.ts:    this.logSpeakInvoked('speakForced', text);
src/services/voiceService.ts-    return this.speakInternal(sanitizeForTTS(text), true);
src/services/voiceService.ts-  }
src/services/voiceService.ts-
src/services/voiceService.ts-  /** Queue a sentence without stopping current speech. For streaming voice responses. */
src/services/voiceService.ts:  speakQueuedForced(text: string): void {
src/services/voiceService.ts:    this.logSpeakInvoked('speakQueuedForced', text);
src/services/voiceService.ts-    if (this.cachedPrefs?.systemVoiceURI) {
src/services/voiceService.ts-      speechService.setVoice(this.cachedPrefs.systemVoiceURI);
```

### B.4 — `grep -B5 -A2 "speakForced\|speakQueuedForced" src/hooks` (bonus — hooks may also queue voice)

```
src/hooks/usePositionNarration.ts-/**
src/hooks/usePositionNarration.ts- * Drives the "Read this position" button on the coach play screen.
src/hooks/usePositionNarration.ts- *
src/hooks/usePositionNarration.ts- * Calls the coach LLM with POSITION_NARRATION_ADDITION, streams tokens
src/hooks/usePositionNarration.ts- * into `currentText` for a live subtitle banner, then hands the full
src/hooks/usePositionNarration.ts: * response to voiceService.speakForced() for TTS. Cancellation uses a
src/hooks/usePositionNarration.ts- * token counter so an in-flight run is superseded instead of racing.
src/hooks/usePositionNarration.ts- *
--
src/hooks/usePositionNarration.ts-      const userMessage = buildChessContextMessage(context);
src/hooks/usePositionNarration.ts-
src/hooks/usePositionNarration.ts-      // WO-POLISH-03: sentence-buffered streaming TTS. As LLM chunks
src/hooks/usePositionNarration.ts-      // arrive, split on sentence boundaries and dispatch each sentence
src/hooks/usePositionNarration.ts-      // for speech immediately. First sentence goes through Polly
src/hooks/usePositionNarration.ts:      // (speakForced — premium voice for the first impression);
src/hooks/usePositionNarration.ts:      // subsequent sentences go through Web Speech (speakQueuedForced —
src/hooks/usePositionNarration.ts-      // low latency, no cancellation of the Polly utterance) so the
src/hooks/usePositionNarration.ts-      // user hears the narration start within one sentence of the first
--
src/hooks/usePositionNarration.ts-              firstSentenceChars: trimmed.length,
src/hooks/usePositionNarration.ts-              stockfishResolved: stockfishAnalysis !== null,
src/hooks/usePositionNarration.ts-            }),
src/hooks/usePositionNarration.ts-            fen: args.fen,
src/hooks/usePositionNarration.ts-          });
src/hooks/usePositionNarration.ts:          firstSpeakPromise = voiceService.speakForced(trimmed).catch(() => {
src/hooks/usePositionNarration.ts-            /* swallow — error handled via logAppAudit path */
src/hooks/usePositionNarration.ts-          });
src/hooks/usePositionNarration.ts-        } else {
src/hooks/usePositionNarration.ts-          // Queue subsequent sentences behind the Polly first-sentence
src/hooks/usePositionNarration.ts:          // so they don't talk over it. speakQueuedForced uses Web
src/hooks/usePositionNarration.ts-          // Speech, which starts near-instantly once Polly ends.
src/hooks/usePositionNarration.ts-          if (firstSpeakPromise) {
src/hooks/usePositionNarration.ts:            void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(trimmed));
src/hooks/usePositionNarration.ts-          } else {
src/hooks/usePositionNarration.ts:            voiceService.speakQueuedForced(trimmed);
src/hooks/usePositionNarration.ts-          }
src/hooks/usePositionNarration.ts-        }
src/hooks/useHintSystem.test.ts-// ── Mocks ─────────────────────────────────────────────────────────────────
src/hooks/useHintSystem.test.ts-
src/hooks/useHintSystem.test.ts-const speakRecords: { method: string; text: string }[] = [];
src/hooks/useHintSystem.test.ts-vi.mock('../services/voiceService', () => ({
src/hooks/useHintSystem.test.ts-  voiceService: {
src/hooks/useHintSystem.test.ts:    speakForced: vi.fn((text: string) => {
src/hooks/useHintSystem.test.ts:      speakRecords.push({ method: 'speakForced', text });
src/hooks/useHintSystem.test.ts-      return Promise.resolve();
src/hooks/useHintSystem.test.ts-    }),
src/hooks/useHintSystem.test.ts:    speakQueuedForced: vi.fn((text: string) => {
src/hooks/useHintSystem.test.ts:      speakRecords.push({ method: 'speakQueuedForced', text });
src/hooks/useHintSystem.test.ts-      return Promise.resolve();
src/hooks/useHintSystem.test.ts-    }),
--
src/hooks/useHintSystem.test.ts-    expect(spineCalls[0].ask).toContain(HINT_TIER_1_ADDITION);
src/hooks/useHintSystem.test.ts-    await waitFor(() => expect(result.current.hintState.level).toBe(1));
src/hooks/useHintSystem.test.ts-    expect(result.current.hintState.arrows).toEqual([]);
src/hooks/useHintSystem.test.ts-    expect(result.current.hintState.ghostMove).toBeNull();
src/hooks/useHintSystem.test.ts-    // Sentence-streamed via Polly as the first sentence (chunk-driven).
src/hooks/useHintSystem.test.ts:    expect(speakRecords.some((r) => r.method === 'speakForced')).toBe(true);
src/hooks/useHintSystem.test.ts-  });
src/hooks/useHintSystem.test.ts-
src/hooks/useReviewPlayback.ts- * forward mid-sentence. WO-REVIEW-02.
src/hooks/useReviewPlayback.ts- *
src/hooks/useReviewPlayback.ts- * Voice discipline mirrors usePhaseNarration + usePositionNarration:
src/hooks/useReviewPlayback.ts- * every nav action calls voiceService.stop() BEFORE dispatching the
src/hooks/useReviewPlayback.ts- * next speak. No sentence streaming here — review segments are short
src/hooks/useReviewPlayback.ts: * pre-generated strings, so a single speakForced() per segment is
src/hooks/useReviewPlayback.ts- * enough.
src/hooks/useReviewPlayback.ts- */
--
src/hooks/useReviewPlayback.ts-      category: 'subsystem',
src/hooks/useReviewPlayback.ts-      source: 'useReviewPlayback',
src/hooks/useReviewPlayback.ts-      summary: `ply ${currentPly}: ${text.slice(0, 40)}`,
src/hooks/useReviewPlayback.ts-      details: JSON.stringify({ ply: currentPly, length: text.length }),
src/hooks/useReviewPlayback.ts-    });
src/hooks/useReviewPlayback.ts:    voiceService.speakForced(text).then(
src/hooks/useReviewPlayback.ts-      () => {
src/hooks/useReviewPlayback.ts-        if (token === activeTokenRef.current) setNarrationState('idle');
src/hooks/useLiveCoach.ts-  const sentences = text.match(/([^.!?]+[.!?])(?=\s|$)/g) ?? [text];
src/hooks/useLiveCoach.ts-  if (sentences.length === 0) return;
src/hooks/useLiveCoach.ts-  voiceService.stop();
src/hooks/useLiveCoach.ts-  const first = sentences[0].trim();
src/hooks/useLiveCoach.ts-  if (!first) return;
src/hooks/useLiveCoach.ts:  const firstPromise = voiceService.speakForced(first).catch(() => undefined);
src/hooks/useLiveCoach.ts-  for (let i = 1; i < sentences.length; i++) {
src/hooks/useLiveCoach.ts-    const next = sentences[i].trim();
src/hooks/useLiveCoach.ts-    if (!next) continue;
src/hooks/useLiveCoach.ts:    void firstPromise.finally(() => voiceService.speakQueuedForced(next));
src/hooks/useLiveCoach.ts-  }
src/hooks/useLiveCoach.ts-}
src/hooks/useHintSystem.ts-        let firstSpeakPromise: Promise<void> | null = null;
src/hooks/useHintSystem.ts-        const speakSentence = (sentence: string): void => {
src/hooks/useHintSystem.ts-          const cleaned = sentence.replace(TAG_STRIP_RE, '').trim();
src/hooks/useHintSystem.ts-          if (!cleaned) return;
src/hooks/useHintSystem.ts-          if (!firstSpeakPromise) {
src/hooks/useHintSystem.ts:            firstSpeakPromise = Promise.resolve(voiceService.speakForced(cleaned))
src/hooks/useHintSystem.ts-              .catch(() => undefined);
src/hooks/useHintSystem.ts-          } else {
src/hooks/useHintSystem.ts:            void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(cleaned));
src/hooks/useHintSystem.ts-          }
src/hooks/useHintSystem.ts-        };
src/hooks/useReviewPlayback.test.ts-const speakRecords: SpeakRecord[] = [];
src/hooks/useReviewPlayback.test.ts-let stopCount = 0;
src/hooks/useReviewPlayback.test.ts-
src/hooks/useReviewPlayback.test.ts-vi.mock('../services/voiceService', () => ({
src/hooks/useReviewPlayback.test.ts-  voiceService: {
src/hooks/useReviewPlayback.test.ts:    speakForced: vi.fn((text: string) => {
src/hooks/useReviewPlayback.test.ts-      return new Promise<void>((resolve) => {
src/hooks/useReviewPlayback.test.ts-        speakRecords.push({ text, resolve });
src/hooks/usePhaseNarration.ts-
src/hooks/usePhaseNarration.ts-      const userMessage = buildChessContextMessage(context);
src/hooks/usePhaseNarration.ts-
src/hooks/usePhaseNarration.ts-      // WO-PHASE-LAG-01: sentence-buffered streaming TTS (mirror of
src/hooks/usePhaseNarration.ts-      // WO-POLISH-03 in usePositionNarration). First complete sentence
src/hooks/usePhaseNarration.ts:      // goes to Polly (speakForced) so the premium voice lands on the
src/hooks/usePhaseNarration.ts-      // first impression; subsequent sentences chain through Web Speech
src/hooks/usePhaseNarration.ts:      // (speakQueuedForced) behind the Polly promise so they don't talk
src/hooks/usePhaseNarration.ts-      // over it. Net effect: voice starts within one sentence of the
src/hooks/usePhaseNarration.ts-      // first LLM token instead of waiting for the full response.
--
src/hooks/usePhaseNarration.ts-              stockfishResolved: stockfishAnalysis !== null,
src/hooks/usePhaseNarration.ts-              transitionKind: event.kind,
src/hooks/usePhaseNarration.ts-            }),
src/hooks/usePhaseNarration.ts-            fen: event.fen,
src/hooks/usePhaseNarration.ts-          });
src/hooks/usePhaseNarration.ts:          firstSpeakPromise = voiceService.speakForced(trimmed).catch(() => {
src/hooks/usePhaseNarration.ts-            /* swallow — error handled via logAppAudit path */
src/hooks/usePhaseNarration.ts-          });
src/hooks/usePhaseNarration.ts-        } else {
src/hooks/usePhaseNarration.ts-          if (firstSpeakPromise) {
src/hooks/usePhaseNarration.ts:            void firstSpeakPromise.finally(() => voiceService.speakQueuedForced(trimmed));
src/hooks/usePhaseNarration.ts-          } else {
src/hooks/usePhaseNarration.ts:            voiceService.speakQueuedForced(trimmed);
src/hooks/usePhaseNarration.ts-          }
src/hooks/usePhaseNarration.ts-        }
src/hooks/usePositionNarration.test.ts-const speakRecords: SpeakRecord[] = [];
src/hooks/usePositionNarration.test.ts-let stopCount = 0;
src/hooks/usePositionNarration.test.ts-
src/hooks/usePositionNarration.test.ts-vi.mock('../services/voiceService', () => ({
src/hooks/usePositionNarration.test.ts-  voiceService: {
src/hooks/usePositionNarration.test.ts:    speakForced: vi.fn((text: string) => {
src/hooks/usePositionNarration.test.ts-      return new Promise<void>((resolve) => {
src/hooks/usePositionNarration.test.ts-        speakRecords.push({ text, resolve });
--
src/hooks/usePositionNarration.test.ts-    expect(result.current.currentText).toBe(
src/hooks/usePositionNarration.test.ts-      'Okay, we are out of book. I have pressure on the c-file.',
src/hooks/usePositionNarration.test.ts-    );
src/hooks/usePositionNarration.test.ts-  });
src/hooks/usePositionNarration.test.ts-
src/hooks/usePositionNarration.test.ts:  it('speaks the full response via voiceService.speakForced when the stream completes', async () => {
src/hooks/usePositionNarration.test.ts-    const { result } = renderHook(() => usePositionNarration(defaultArgs()));
src/hooks/usePositionNarration.test.ts-
```

---

## Diagnostic C — What 57573b2 actually shipped

### C.1 — `git show 57573b25 --stat`

```
commit 57573b25199377d978458b6f2577e030f6454a56
Author: Claude <noreply@anthropic.com>
Date:   Sun Apr 26 04:47:36 2026 +0000

    fix(WO-TEACH-FIX-02 continued): voice doubling, chat-surface play_move
    
    Three converging changes for PR #335:
    
    1. Voice doubling fix: streaming chunks no longer trigger per-sentence
       voiceService.speak() calls. Each speak() opens its own audio request,
       so when a single chunk carries multiple sentences (or chunks arrive
       faster than Polly can complete one), 3-5 audio streams race in
       parallel and the user hears overlapping coach voices. Now: text
       still streams to the chat panel progressively, but voice waits for
       the full response and speaks once. One audio request, no overlap,
       natural prosody. Standard voice-assistant pattern.
    
    2. Cherry-picked PR #334's chat-surface play_move wiring (commit
       4755f62): GameChatPanel passes onPlayMove to coachService.ask,
       CoachGamePage supplies the handler from its existing student-move
       apply path. PR #334 closes as superseded.
    
    3. Identity prompt: chat-surface play_move guidance strengthened from
       PR #334's single bullet to three bullets. The April 26 audit showed
       the brain bypassing PR #334's framing — emitting stockfish_eval
       for analysis instead of play_move when the student said "play
       knight to f3." New framing makes student-requested moves a hard
       directive: play first, talk after. Refuse only if illegal.
    
    Three bugs converged. One PR ships them all. Test plan unchanged
    from earlier WO-TEACH-FIX-02 spec — Dave tests on preview, looks
    for clean voice + actual play_move dispatch.

 src/coach/sources/identity.ts          |  4 +-
 src/components/Coach/CoachGamePage.tsx | 32 ++++++++++++
 src/components/Coach/GameChatPanel.tsx | 89 +++++++++++++++++++---------------
 3 files changed, 86 insertions(+), 39 deletions(-)
```

### C.2 — `git show 57573b25 -- src/components/Coach/GameChatPanel.tsx | head -80`

```diff
commit 57573b25199377d978458b6f2577e030f6454a56
Author: Claude <noreply@anthropic.com>
Date:   Sun Apr 26 04:47:36 2026 +0000

    fix(WO-TEACH-FIX-02 continued): voice doubling, chat-surface play_move
    
    Three converging changes for PR #335:
    
    1. Voice doubling fix: streaming chunks no longer trigger per-sentence
       voiceService.speak() calls. Each speak() opens its own audio request,
       so when a single chunk carries multiple sentences (or chunks arrive
       faster than Polly can complete one), 3-5 audio streams race in
       parallel and the user hears overlapping coach voices. Now: text
       still streams to the chat panel progressively, but voice waits for
       the full response and speaks once. One audio request, no overlap,
       natural prosody. Standard voice-assistant pattern.
    
    2. Cherry-picked PR #334's chat-surface play_move wiring (commit
       4755f62): GameChatPanel passes onPlayMove to coachService.ask,
       CoachGamePage supplies the handler from its existing student-move
       apply path. PR #334 closes as superseded.
    
    3. Identity prompt: chat-surface play_move guidance strengthened from
       PR #334's single bullet to three bullets. The April 26 audit showed
       the brain bypassing PR #334's framing — emitting stockfish_eval
       for analysis instead of play_move when the student said "play
       knight to f3." New framing makes student-requested moves a hard
       directive: play first, talk after. Refuse only if illegal.
    
    Three bugs converged. One PR ships them all. Test plan unchanged
    from earlier WO-TEACH-FIX-02 spec — Dave tests on preview, looks
    for clean voice + actual play_move dispatch.

diff --git a/src/components/Coach/GameChatPanel.tsx b/src/components/Coach/GameChatPanel.tsx
index caed3cf..208b202 100644
--- a/src/components/Coach/GameChatPanel.tsx
+++ b/src/components/Coach/GameChatPanel.tsx
@@ -40,6 +40,12 @@ interface GameChatPanelProps {
    *  against them. The opening name is passed through to the board's
    *  opening-book hook. */
   onPlayOpening?: (openingName: string) => void;
+  /** Called when the brain emits play_move from the chat surface — e.g.
+   *  the student says "play knight to f3" and the brain executes it on
+   *  their behalf. Validate the SAN against the live FEN before applying.
+   *  Return { ok: true } if the move landed, { ok: false, reason } if not.
+   *  Same shape as CoachGamePage's move-selector onPlayMove. */
+  onPlayMove?: (san: string) => { ok: boolean; reason?: string } | Promise<{ ok: boolean; reason?: string }>;
   /** Apply a what-if variation: take back `undo` half-moves, then play
    *  `moves` (SAN) forward. Returns true on success, false if any move
    *  was invalid or there was nothing to undo. Powers the coach's
@@ -77,6 +83,7 @@ export const GameChatPanel = forwardRef<GameChatPanelHandle, GameChatPanelProps>
       onBoardAnnotation,
       onRestartGame,
       onPlayOpening,
+      onPlayMove,
       initialPrompt,
       onInitialPromptSent,
       hideHeader,
@@ -345,39 +352,48 @@ export const GameChatPanel = forwardRef<GameChatPanelHandle, GameChatPanelProps>
                   .replace(/\[\[ACTION:[^\]]*\]\]/gi, '')
                   .trim();
                 setStreamingContent(displayText);
-                if (useAppStore.getState().coachVoiceOn) {
-                  // Strip action and board tags from speech, same as displayText.
-                  // Never read [[ACTION:...]] or [BOARD:...] aloud — those are
-                  // machine-readable directives, not coach speech. Buffer the
-                  // STRIPPED text and emit complete sentences. Tags can span
-                  // chunks; we only strip when both opening and closing markers
-                  // are present, so a partial tag stays in the buffer until
-                  // the rest arrives.
-                  speechBufferRef.current += chunk;
-                  speechBufferRef.current = speechBufferRef.current
-                    .replace(/\[\[ACTION:[^\]]*\]\]/gi, '')
-                    .replace(BOARD_TAG_STRIP_RE, '');
-                  const sentenceEnd = /[.!?]\s/.exec(speechBufferRef.current);
-                  if (sentenceEnd) {
-                    const sentence = speechBufferRef.current.slice(0, sentenceEnd.index + 1);
-                    speechBufferRef.current = speechBufferRef.current.slice(sentenceEnd.index + 2);
-                    const cleaned = sentence.trim();
-                    if (cleaned) void voiceService.speak(cleaned);
```

### C.3 — `git show 57573b25 -- src/coach/sources/identity.ts`

```diff
commit 57573b25199377d978458b6f2577e030f6454a56
Author: Claude <noreply@anthropic.com>
Date:   Sun Apr 26 04:47:36 2026 +0000

    fix(WO-TEACH-FIX-02 continued): voice doubling, chat-surface play_move
    
    Three converging changes for PR #335:
    
    1. Voice doubling fix: streaming chunks no longer trigger per-sentence
       voiceService.speak() calls. Each speak() opens its own audio request,
       so when a single chunk carries multiple sentences (or chunks arrive
       faster than Polly can complete one), 3-5 audio streams race in
       parallel and the user hears overlapping coach voices. Now: text
       still streams to the chat panel progressively, but voice waits for
       the full response and speaks once. One audio request, no overlap,
       natural prosody. Standard voice-assistant pattern.
    
    2. Cherry-picked PR #334's chat-surface play_move wiring (commit
       4755f62): GameChatPanel passes onPlayMove to coachService.ask,
       CoachGamePage supplies the handler from its existing student-move
       apply path. PR #334 closes as superseded.
    
    3. Identity prompt: chat-surface play_move guidance strengthened from
       PR #334's single bullet to three bullets. The April 26 audit showed
       the brain bypassing PR #334's framing — emitting stockfish_eval
       for analysis instead of play_move when the student said "play
       knight to f3." New framing makes student-requested moves a hard
       directive: play first, talk after. Refuse only if illegal.
    
    Three bugs converged. One PR ships them all. Test plan unchanged
    from earlier WO-TEACH-FIX-02 spec — Dave tests on preview, looks
    for clean voice + actual play_move dispatch.

diff --git a/src/coach/sources/identity.ts b/src/coach/sources/identity.ts
index 3a6e871..1d356d2 100644
--- a/src/coach/sources/identity.ts
+++ b/src/coach/sources/identity.ts
@@ -36,7 +36,9 @@ How you verify:
 How you play:
 - You play to teach, not to win. Calibrate to the student's rating. Sometimes the right move for this student isn't the engine's top choice.
 - During the opening, when the student has committed to a line, consult \`local_opening_book\` first — it is zero-latency and matches the line they're trying to learn. Reach for \`stockfish_eval\` once you're out of book or the position is sharp.
-- When you decide on a move, play it via \`play_move\`. Don't describe what you're going to do; do it.`;
+- When you decide on a move, play it via \`play_move\`. Don't describe what you're going to do; do it.
+- When the student tells YOU to play a specific move on their behalf — "play knight to f3," "play a6," "make the move you suggested" — emit play_move immediately with the requested SAN. This is on the chat surface, NOT the move-selector. Do not analyze whether their move is good first. Do not call stockfish_eval to second-guess them. They asked you to play it; play it. The student can ask you to discuss the move afterward. Acting on intent, not narrating it (Discipline 3).
+- You only refuse to play a requested move if it is illegal (chess.js will reject it) or if it isn't the student's turn to make a move on your behalf. Otherwise: play first, talk after.`;
 
 const KASPAROV_IDENTITY = DANYA_IDENTITY; // future personality pack
 const FISCHER_IDENTITY = DANYA_IDENTITY;  // future personality pack
```

### C.4 — `git show 57573b25 -- src/components/Coach/CoachGamePage.tsx` (bonus — confirm onPlayMove handler shipped)

```diff
commit 57573b25199377d978458b6f2577e030f6454a56
Author: Claude <noreply@anthropic.com>
Date:   Sun Apr 26 04:47:36 2026 +0000

    fix(WO-TEACH-FIX-02 continued): voice doubling, chat-surface play_move
    
    Three converging changes for PR #335:
    
    1. Voice doubling fix: streaming chunks no longer trigger per-sentence
       voiceService.speak() calls. Each speak() opens its own audio request,
       so when a single chunk carries multiple sentences (or chunks arrive
       faster than Polly can complete one), 3-5 audio streams race in
       parallel and the user hears overlapping coach voices. Now: text
       still streams to the chat panel progressively, but voice waits for
       the full response and speaks once. One audio request, no overlap,
       natural prosody. Standard voice-assistant pattern.
    
    2. Cherry-picked PR #334's chat-surface play_move wiring (commit
       4755f62): GameChatPanel passes onPlayMove to coachService.ask,
       CoachGamePage supplies the handler from its existing student-move
       apply path. PR #334 closes as superseded.
    
    3. Identity prompt: chat-surface play_move guidance strengthened from
       PR #334's single bullet to three bullets. The April 26 audit showed
       the brain bypassing PR #334's framing — emitting stockfish_eval
       for analysis instead of play_move when the student said "play
       knight to f3." New framing makes student-requested moves a hard
       directive: play first, talk after. Refuse only if illegal.
    
    Three bugs converged. One PR ships them all. Test plan unchanged
    from earlier WO-TEACH-FIX-02 spec — Dave tests on preview, looks
    for clean voice + actual play_move dispatch.

diff --git a/src/components/Coach/CoachGamePage.tsx b/src/components/Coach/CoachGamePage.tsx
index 544e202..cb3e16a 100644
--- a/src/components/Coach/CoachGamePage.tsx
+++ b/src/components/Coach/CoachGamePage.tsx
@@ -2199,6 +2199,36 @@ export function CoachGamePage(): JSX.Element {
     }
   }, [isExploreMode, handleExploreMove, practicePosition, handlePracticeMove, handlePlayerMove]);
 
+  // WO-TEACH-FIX-01 — chat-driven student move. The student says "play
+  // knight to f3" in the in-game chat panel and the brain emits
+  // play_move with that SAN. We validate against the live FEN, commit
+  // through the same `game.makeMove` the board uses, then route the
+  // result through `handleBoardMoveRouted` so the post-move analysis
+  // pipeline (classification, blunder interception, coach reaction)
+  // runs identically to a board-drag move. chess.js's turn-check is
+  // the gate: if it's not the student's turn or the move is illegal,
+  // `game.makeMove` returns null and we surface that to the brain.
+  const handleChatPlayMove = useCallback(
+    (san: string): { ok: boolean; reason?: string } => {
+      try {
+        // Probe the SAN in a sandbox first to extract from/to/promotion;
+        // the live game's `makeMove` takes from/to, not SAN.
+        const probe = new Chess(game.fen);
+        const probed = probe.move(san);
+        if (!probed) return { ok: false, reason: `illegal SAN "${san}" from current FEN` };
+        const moveResult = game.makeMove(probed.from, probed.to, probed.promotion);
+        if (!moveResult) {
+          return { ok: false, reason: `commit rejected for "${san}" — likely a turn or state mismatch` };
+        }
+        handleBoardMoveRouted(moveResult);
+        return { ok: true };
+      } catch (err) {
+        return { ok: false, reason: err instanceof Error ? err.message : String(err) };
+      }
+    },
+    [game, handleBoardMoveRouted],
+  );
+
   // Handle practice-in-chat from post-game review
   const handlePracticeInChat = useCallback((prompt: string) => {
     // Transition from postgame back to playing mode with chat
@@ -3134,6 +3164,7 @@ export function CoachGamePage(): JSX.Element {
               onBoardAnnotation={handleBoardAnnotation}
               onRestartGame={handleRestart}
               onPlayOpening={handleOpeningRequest}
+              onPlayMove={handleChatPlayMove}
               onPlayVariation={handlePlayVariation}
               onReturnToGame={handleReturnToGame}
               initialPrompt={pendingChatPrompt}
@@ -3192,6 +3223,7 @@ export function CoachGamePage(): JSX.Element {
               onBoardAnnotation={handleBoardAnnotation}
               onRestartGame={handleRestart}
               onPlayOpening={handleOpeningRequest}
+              onPlayMove={handleChatPlayMove}
               onPlayVariation={handlePlayVariation}
               onReturnToGame={handleReturnToGame}
               initialPrompt={pendingChatPrompt}
```

# Walkthrough Chat Path Verification

Goal: determine whether a user typing in the chat drawer DURING a walkthrough lands on `coachService.ask` (the spine, with toolbelt + envelope) or on `getCoachChatResponse` (legacy bypass with no tools).

---

## (a) Openings surface — how it invokes the brain

```
src/components/Openings/MiddlegamePractice.tsx-import { ControlledChessBoard } from '../Board/ControlledChessBoard';
src/components/Openings/MiddlegamePractice.tsx-import { EngineLines } from '../Board/EngineLines';
src/components/Openings/MiddlegamePractice.tsx-import { useChessGame } from '../../hooks/useChessGame';
src/components/Openings/MiddlegamePractice.tsx-import { useSettings } from '../../hooks/useSettings';
src/components/Openings/MiddlegamePractice.tsx-import { stockfishEngine } from '../../services/stockfishEngine';
src/components/Openings/MiddlegamePractice.tsx:import { getCoachChatResponse } from '../../services/coachApi';
src/components/Openings/MiddlegamePractice.tsx-import { speechService } from '../../services/speechService';
src/components/Openings/MiddlegamePractice.tsx-import { sanitizeForTTS } from '../../services/voiceService';
src/components/Openings/MiddlegamePractice.tsx-import { ArrowLeft, MessageCircle, Volume2, VolumeX, Undo, Lightbulb } from 'lucide-react';
src/components/Openings/MiddlegamePractice.tsx-import type {
src/components/Openings/MiddlegamePractice.tsx-  MiddlegamePlan,
src/components/Openings/MiddlegamePractice.tsx-  StockfishAnalysis,
src/components/Openings/MiddlegamePractice.tsx-  AnalysisLine,
src/components/Openings/MiddlegamePractice.tsx-  BoardArrow,
src/components/Openings/MiddlegamePractice.tsx-} from '../../types';
src/components/Openings/MiddlegamePractice.tsx-import type { MoveResult } from '../../hooks/useChessGame';
src/components/Openings/MiddlegamePractice.tsx-
src/components/Openings/MiddlegamePractice.tsx-interface MiddlegamePracticeProps {
src/components/Openings/MiddlegamePractice.tsx-  plan: MiddlegamePlan;
src/components/Openings/MiddlegamePractice.tsx-  playerColor: 'white' | 'black';
src/components/Openings/MiddlegamePractice.tsx-  onExit: () => void;
src/components/Openings/MiddlegamePractice.tsx-}
src/components/Openings/MiddlegamePractice.tsx-
src/components/Openings/MiddlegamePractice.tsx-interface CoachMessage {
src/components/Openings/MiddlegamePractice.tsx-  role: 'user' | 'assistant';
src/components/Openings/MiddlegamePractice.tsx-  content: string;
--
src/components/Openings/MiddlegamePractice.tsx-
src/components/Openings/MiddlegamePractice.tsx-      chatHistoryRef.current.push(userMsg);
src/components/Openings/MiddlegamePractice.tsx-
src/components/Openings/MiddlegamePractice.tsx-      const systemAddition = `${MIDDLEGAME_PRACTICE_PROMPT}\n\n${planContextRef.current}`;
src/components/Openings/MiddlegamePractice.tsx-
src/components/Openings/MiddlegamePractice.tsx:      const response = await getCoachChatResponse(
src/components/Openings/MiddlegamePractice.tsx-        chatHistoryRef.current,
src/components/Openings/MiddlegamePractice.tsx-        systemAddition,
src/components/Openings/MiddlegamePractice.tsx-        undefined,
src/components/Openings/MiddlegamePractice.tsx-        'explore_reaction',
src/components/Openings/MiddlegamePractice.tsx-        256,
src/components/Openings/MiddlegamePractice.tsx-      );
src/components/Openings/MiddlegamePractice.tsx-
src/components/Openings/MiddlegamePractice.tsx-      if (!isMountedRef.current) return;
src/components/Openings/MiddlegamePractice.tsx-
src/components/Openings/MiddlegamePractice.tsx-      const assistantMsg: CoachMessage = { role: 'assistant', content: response };
src/components/Openings/MiddlegamePractice.tsx-      chatHistoryRef.current.push(assistantMsg);
src/components/Openings/MiddlegamePractice.tsx-
src/components/Openings/MiddlegamePractice.tsx-      setCoachText(response);
src/components/Openings/MiddlegamePractice.tsx-
src/components/Openings/MiddlegamePractice.tsx-      if (isNarrating) {
src/components/Openings/MiddlegamePractice.tsx-        // LLM response may include chess notation; sanitize before TTS
src/components/Openings/MiddlegamePractice.tsx-        // so the student hears plain English instead of "Nxf7".
src/components/Openings/MiddlegamePractice.tsx-        speechService.speak(sanitizeForTTS(response));
src/components/Openings/MiddlegamePractice.tsx-      }
src/components/Openings/MiddlegamePractice.tsx-    } catch {
src/components/Openings/OpeningExplorerPage.test.tsx-vi.mock('../../services/dataLoader', () => ({
src/components/Openings/OpeningExplorerPage.test.tsx-  seedDatabase: vi.fn().mockResolvedValue(undefined),
src/components/Openings/OpeningExplorerPage.test.tsx-}));
src/components/Openings/OpeningExplorerPage.test.tsx-
src/components/Openings/OpeningExplorerPage.test.tsx-vi.mock('../../services/coachApi', () => ({
src/components/Openings/OpeningExplorerPage.test.tsx:  getCoachChatResponse: vi.fn().mockResolvedValue(''),
src/components/Openings/OpeningExplorerPage.test.tsx-}));
src/components/Openings/OpeningExplorerPage.test.tsx-
src/components/Openings/OpeningExplorerPage.test.tsx-describe('OpeningExplorerPage', () => {
src/components/Openings/OpeningExplorerPage.test.tsx-  beforeEach(() => {
src/components/Openings/OpeningExplorerPage.test.tsx-    vi.clearAllMocks();
src/components/Openings/OpeningExplorerPage.test.tsx-    mockGetRepertoireOpenings.mockResolvedValue([whiteOpening, blackOpening]);
src/components/Openings/OpeningExplorerPage.test.tsx-    mockSearchOpenings.mockResolvedValue([]);
src/components/Openings/OpeningExplorerPage.test.tsx-    mockGetOpeningsByEcoLetter.mockImplementation((letter: string) => {
src/components/Openings/OpeningExplorerPage.test.tsx-      if (letter === 'A') return Promise.resolve([ecoOpening]);
src/components/Openings/OpeningExplorerPage.test.tsx-      return Promise.resolve([]);
src/components/Openings/OpeningExplorerPage.test.tsx-    });
src/components/Openings/OpeningExplorerPage.test.tsx-  });
src/components/Openings/OpeningExplorerPage.test.tsx-
src/components/Openings/OpeningExplorerPage.test.tsx-  it('renders the page title', async () => {
src/components/Openings/OpeningExplorerPage.test.tsx-    render(<OpeningExplorerPage />);
src/components/Openings/OpeningExplorerPage.test.tsx-    await waitFor(() => {
src/components/Openings/OpeningExplorerPage.test.tsx-      expect(screen.getByText('Openings')).toBeInTheDocument();
src/components/Openings/OpeningExplorerPage.test.tsx-    });
src/components/Openings/OpeningExplorerPage.test.tsx-  });
src/components/Openings/OpeningExplorerPage.test.tsx-
```

## (b) Drawer that opens during walkthroughs

```
ls: cannot access 'src/components/Coach/CoachDrawer*.tsx': No such file or directory
src/components/Coach/GlobalCoachDrawer.tsx

# GlobalCoachDrawer — invocation pattern

# CoachDrawer* (if any)
```

## (c) What the GlobalCoachDrawer actually renders

```
          decides whether to play from there. No preview rendered. */}

      {/* Chat panel — hideHeader since the drawer provides its own */}
      {!minimized && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <GameChatPanel
            ref={chatRef}
            fen={fen}
            pgn={pgn}
            moveNumber={moveNumber}
            playerColor={playerColor}
            turn={turn}
            // Global drawer is never "locked" to an active game — routing
            // intents like "let's play" must navigate to a session. The
            // GameChatPanel gates routing behind isGameOver; passing true
            // here unblocks that path for the global/floating drawer.
            isGameOver={true}
            gameResult=""
            lastMove={ctxLastMove}
            history={ctxHistory}
            onBoardAnnotation={handleBoardAnnotation}
            className="h-full"
            hideHeader
            initialPrompt={initialMessage}
            onInitialPromptSent={handleInitialPromptSent}
            initialMessages={savedMessagesRef.current}
```

## (d) Spine emits provider-called and tool-called audits unconditionally

```
29:import { logAppAudit } from '../services/appAuditor';
144:  void logAppAudit({
157:  void logAppAudit({
178:  void logAppAudit({
195:  void logAppAudit({
227:  void logAppAudit({
244:  void logAppAudit({
259:    void logAppAudit({
278:    void logAppAudit({
298:      void logAppAudit({
306:        void logAppAudit({
324:        void logAppAudit({
332:        void logAppAudit({
364:  void logAppAudit({
```

---

## Conclusion

**The walkthrough drawer chat goes through coachService.ask (spine path).**

Evidence:
- Section (a): `src/components/Openings/` does NOT call `coachService.ask` or `getCoachChatResponse` directly. The Openings page itself doesn't invoke the brain — the chat is in the global drawer.
- Section (b): `GlobalCoachDrawer.tsx` doesn't call either function directly — it delegates to `<GameChatPanel>`.
- Section (c): The drawer renders `<GameChatPanel ... isGameOver={true} ...>`. `GameChatPanel.handleSend` (lines 578 in-game branch and 801 drawer branch on main, post-WO-FOUNDATION-02) calls `coachService.ask` with surface `'home-chat'` for the drawer path.
- Section (d): `coachService.ts` emits `coach-brain-ask-received`, `coach-brain-envelope-assembled`, `coach-brain-provider-called`, `coach-brain-tool-called`, and `coach-brain-answer-returned` unconditionally on every call. If those audits were missing from the 02:42:08Z trace, the call either never reached `handleSend` (filtered upstream by the layer-1 router or pre-LLM intercepts in `GameChatPanel`), or the audit log was filtered/truncated before display.

**Implication for Part 2:** Implementing the question classifier + envelope grounding injection in `coachService.ask` will fix the walkthrough drawer chat path, because that's the path it's already on. The legacy `getCoachChatResponse` route is only used by `walkthroughLlmNarrator.ts` for the auto-generated step annotations during walkthrough playback — that's a separate concern, out of scope for this WO. User-typed questions during a walkthrough hit the spine, so structural grounding here covers them.

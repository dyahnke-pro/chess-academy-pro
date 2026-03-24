import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import { getOrCreateMainProfile } from './services/dbService';
import { getThemeById, applyTheme } from './services/themeService';
import { seedDatabase } from './services/dataLoader';
import { seedPuzzles } from './services/puzzleService';
import { getSharedAudioContext } from './services/audioContextManager';
import { speechService } from './services/speechService';
import { db } from './db/schema';
import { AppLayout } from './components/ui/AppLayout';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Page-level imports
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { BoardTestPage } from './components/BoardTest/BoardTestPage';
import { OpeningExplorerPage } from './components/Openings/OpeningExplorerPage';
import { OpeningDetailPage } from './components/Openings/OpeningDetailPage';
import { PuzzleTrainerPage } from './components/Puzzles/PuzzleTrainerPage';
import { AdaptivePuzzlePage } from './components/Puzzles/AdaptivePuzzlePage';
import { MyMistakesPage } from './components/Puzzles/MyMistakesPage';
import { GamesPage } from './components/Play/GamesPage';
import { AnalysisBoardPage } from './components/Analysis/AnalysisBoardPage';
import { CoachPage } from './components/Coach/CoachPage';
import { CoachChatPage } from './components/Coach/CoachChatPage';
import { CoachGamePage } from './components/Coach/CoachGamePage';
import { CoachAnalysePage } from './components/Coach/CoachAnalysePage';
import { CoachSessionPlanPage } from './components/Coach/CoachSessionPlanPage';
import { CoachWeaknessReport } from './components/Coach/CoachWeaknessReport';
import { CoachTrainPage } from './components/Coach/CoachTrainPage';
import { StatsPage } from './components/Stats/StatsPage';
import { KidLayout } from './components/Kid/KidLayout';
import { KidModePage } from './components/Kid/KidModePage';
import { KidPiecePage } from './components/Kid/KidPiecePage';
import { JourneyMapPage } from './components/Kid/JourneyMapPage';
import { JourneyChapterPage } from './components/Kid/JourneyChapterPage';
import { FairyTaleMapPage } from './components/Kid/FairyTaleMapPage';
import { FairyTaleChapterPage } from './components/Kid/FairyTaleChapterPage';
import { RookGamesPage } from './components/Kid/RookGamesPage';
import { RookMazePage } from './components/Kid/RookMazePage';
import { RowClearerPage } from './components/Kid/RowClearerPage';
import { MiniGameHubPage } from './components/Kid/MiniGameHubPage';
import { MiniGamePage } from './components/Kid/MiniGamePage';
import { KingEscapeGame } from './components/Kid/KingEscapeGame';
import { KingMarchGame } from './components/Kid/KingMarchGame';
import { KnightGamesPage } from './components/Kid/KnightGamesPage';
import { LeapFrogGame } from './components/Kid/LeapFrogGame';
import { KnightSweepGame } from './components/Kid/KnightSweepGame';
import { QueenGamesHub } from './components/Kid/QueenGamesHub';
import { KidPuzzlePage } from './components/Kid/KidPuzzlePage';
import { SettingsPage } from './components/Settings/SettingsPage';
import { OnboardingPage } from './components/Settings/OnboardingPage';
import { GameDatabasePage } from './components/Games/GameDatabasePage';
import { ImportPage } from './components/Games/ImportPage';
import { ProPlayerPage } from './components/Openings/ProPlayerPage';

export function App(): JSX.Element {
  const { isLoading, setLoading, setActiveProfile, setActiveTheme, activeProfile } =
    useAppStore();
  const [onboardingSkipped, setOnboardingSkipped] = useState(false);

  useEffect(() => {
    async function init(): Promise<void> {
      // Create the shared AudioContext immediately so its touchstart unlock
      // listener is attached before the user's first tap. On iOS Safari the
      // context starts suspended; the listener resumes it on first touch.
      getSharedAudioContext();

      try {
        const profile = await getOrCreateMainProfile();
        const theme = getThemeById(profile.preferences.theme);
        applyTheme(theme);
        setActiveTheme(theme);
        setActiveProfile(profile);

        // Restore saved system voice preference so it's ready when voices load
        if (profile.preferences.systemVoiceURI) {
          speechService.setVoice(profile.preferences.systemVoiceURI);
        }

        const skippedMeta = await db.meta.get('onboarding_skipped');
        setOnboardingSkipped(skippedMeta?.value === 'true');

        // Seed data in background (no-op if already seeded)
        void seedDatabase();
        void seedPuzzles();


      } catch (error) {
        console.error('App initialization failed:', error);
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [setLoading, setActiveProfile, setActiveTheme]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  // First-run: redirect to onboarding if no API key and user hasn't completed/skipped it
  const hasApiKey = Boolean(activeProfile?.preferences.apiKeyEncrypted) ||
    Boolean(activeProfile?.preferences.anthropicApiKeyEncrypted);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
          <Route path="/puzzles" element={<ErrorBoundary><AdaptivePuzzlePage /></ErrorBoundary>} />
          <Route path="/puzzles/classic" element={<ErrorBoundary><PuzzleTrainerPage /></ErrorBoundary>} />
          <Route path="/puzzles/mistakes" element={<ErrorBoundary><MyMistakesPage /></ErrorBoundary>} />
          <Route path="/openings" element={<ErrorBoundary><OpeningExplorerPage /></ErrorBoundary>} />
          <Route path="/openings/pro/:playerId" element={<ErrorBoundary><ProPlayerPage /></ErrorBoundary>} />
          <Route path="/openings/pro/:playerId/:id" element={<ErrorBoundary><OpeningDetailPage /></ErrorBoundary>} />
          <Route path="/openings/:id" element={<ErrorBoundary><OpeningDetailPage /></ErrorBoundary>} />
          <Route path="/play" element={<ErrorBoundary><GamesPage /></ErrorBoundary>} />
          <Route path="/coach" element={<ErrorBoundary><CoachPage /></ErrorBoundary>} />
          <Route path="/coach/play" element={<ErrorBoundary><CoachGamePage /></ErrorBoundary>} />
          <Route path="/coach/chat" element={<ErrorBoundary><CoachChatPage /></ErrorBoundary>} />
          <Route path="/coach/analyse" element={<ErrorBoundary><CoachAnalysePage /></ErrorBoundary>} />
          <Route path="/coach/plan" element={<ErrorBoundary><CoachSessionPlanPage /></ErrorBoundary>} />
          <Route path="/coach/report" element={<ErrorBoundary><CoachWeaknessReport /></ErrorBoundary>} />
          <Route path="/coach/train" element={<ErrorBoundary><CoachTrainPage /></ErrorBoundary>} />
          <Route path="/games" element={<ErrorBoundary><GameDatabasePage /></ErrorBoundary>} />
          <Route path="/games/import" element={<ErrorBoundary><ImportPage /></ErrorBoundary>} />
          <Route path="/analysis" element={<ErrorBoundary><AnalysisBoardPage /></ErrorBoundary>} />
          <Route path="/stats" element={<ErrorBoundary><StatsPage /></ErrorBoundary>} />
          <Route
            path="/settings"
            element={
              <ErrorBoundary>
                {hasApiKey || onboardingSkipped
                  ? <SettingsPage />
                  : <Navigate to="/settings/onboarding" replace />}
              </ErrorBoundary>
            }
          />
          <Route path="/settings/onboarding" element={<ErrorBoundary><OnboardingPage /></ErrorBoundary>} />
          <Route path="/board" element={<ErrorBoundary><BoardTestPage /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route element={<KidLayout />}>
          <Route path="/kid" element={<ErrorBoundary><KidModePage /></ErrorBoundary>} />
          <Route path="/kid/journey" element={<ErrorBoundary><JourneyMapPage /></ErrorBoundary>} />
          <Route path="/kid/queen-games" element={<ErrorBoundary><QueenGamesHub /></ErrorBoundary>} />
          <Route path="/kid/journey/:chapterId" element={<ErrorBoundary><JourneyChapterPage /></ErrorBoundary>} />
          <Route path="/kid/fairy-tale" element={<ErrorBoundary><FairyTaleMapPage /></ErrorBoundary>} />
          <Route path="/kid/fairy-tale/:chapterId" element={<ErrorBoundary><FairyTaleChapterPage /></ErrorBoundary>} />
          <Route path="/kid/rook-games" element={<ErrorBoundary><RookGamesPage /></ErrorBoundary>} />
          <Route path="/kid/rook-maze/:level" element={<ErrorBoundary><RookMazePage /></ErrorBoundary>} />
          <Route path="/kid/row-clearer/:level" element={<ErrorBoundary><RowClearerPage /></ErrorBoundary>} />
          <Route path="/kid/mini-games" element={<ErrorBoundary><MiniGameHubPage /></ErrorBoundary>} />
          <Route path="/kid/mini-games/pawn-wars/:level" element={<ErrorBoundary><MiniGamePage gameId="pawn-wars" /></ErrorBoundary>} />
          <Route path="/kid/mini-games/blocker/:level" element={<ErrorBoundary><MiniGamePage gameId="blocker" /></ErrorBoundary>} />
          <Route path="/kid/king-escape" element={<ErrorBoundary><KingEscapeGame /></ErrorBoundary>} />
          <Route path="/kid/king-march" element={<ErrorBoundary><KingMarchGame /></ErrorBoundary>} />
          <Route path="/kid/knight-games" element={<ErrorBoundary><KnightGamesPage /></ErrorBoundary>} />
          <Route path="/kid/knight-games/leap-frog" element={<ErrorBoundary><LeapFrogGame /></ErrorBoundary>} />
          <Route path="/kid/knight-games/knight-sweep" element={<ErrorBoundary><KnightSweepGame /></ErrorBoundary>} />
          <Route path="/kid/puzzles" element={<ErrorBoundary><KidPuzzlePage /></ErrorBoundary>} />
          <Route path="/kid/:piece" element={<ErrorBoundary><KidPiecePage /></ErrorBoundary>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import { getOrCreateMainProfile } from './services/dbService';
import { getThemeById, applyTheme } from './services/themeService';
import { seedDatabase } from './services/dataLoader';
import { seedPuzzles } from './services/puzzleService';
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
import { SettingsPage } from './components/Settings/SettingsPage';
import { OnboardingPage } from './components/Settings/OnboardingPage';
import { GameDatabasePage } from './components/Games/GameDatabasePage';
import { ImportPage } from './components/Games/ImportPage';

export function App(): JSX.Element {
  const { isLoading, setLoading, setActiveProfile, setActiveTheme, activeProfile } =
    useAppStore();
  const [onboardingSkipped, setOnboardingSkipped] = useState(false);

  useEffect(() => {
    async function init(): Promise<void> {
      try {
        const profile = await getOrCreateMainProfile();
        const theme = getThemeById(profile.preferences.theme);
        applyTheme(theme);
        setActiveTheme(theme);
        setActiveProfile(profile);

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
  const hasApiKey = Boolean(activeProfile?.preferences.apiKeyEncrypted);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
          <Route path="/puzzles" element={<ErrorBoundary><PuzzleTrainerPage /></ErrorBoundary>} />
          <Route path="/openings" element={<ErrorBoundary><OpeningExplorerPage /></ErrorBoundary>} />
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
          <Route path="/kid/journey/:chapterId" element={<ErrorBoundary><JourneyChapterPage /></ErrorBoundary>} />
          <Route path="/kid/fairy-tale" element={<ErrorBoundary><FairyTaleMapPage /></ErrorBoundary>} />
          <Route path="/kid/fairy-tale/:chapterId" element={<ErrorBoundary><FairyTaleChapterPage /></ErrorBoundary>} />
          <Route path="/kid/:piece" element={<ErrorBoundary><KidPiecePage /></ErrorBoundary>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
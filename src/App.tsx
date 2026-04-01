import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import { getOrCreateMainProfile } from './services/dbService';
import { getThemeById, applyTheme } from './services/themeService';
import { seedDatabase } from './services/dataLoader';
import { seedPuzzles } from './services/puzzleService';
import { getSharedAudioContext } from './services/audioContextManager';
import { speechService } from './services/speechService';
import { voiceService } from './services/voiceService';
import { db } from './db/schema';
import { getRandomWelcome } from './data/welcomeMessages';
import { AppLayout } from './components/ui/AppLayout';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Page-level imports
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { OpeningExplorerPage } from './components/Openings/OpeningExplorerPage';
import { OpeningDetailPage } from './components/Openings/OpeningDetailPage';
import { PuzzleTrainerPage } from './components/Puzzles/PuzzleTrainerPage';
import { AdaptivePuzzlePage } from './components/Puzzles/AdaptivePuzzlePage';
import { MyMistakesPage } from './components/Puzzles/MyMistakesPage';
import { LichessDashboardPage } from './components/Puzzles/LichessDashboardPage';
import { WeaknessPuzzlePage } from './components/Puzzles/WeaknessPuzzlePage';
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
import { TacticsPage } from './components/Tactics/TacticsPage';
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
import { GuidedGameHubPage } from './components/Kid/GuidedGameHubPage';
import { GuidedGamePage } from './components/Kid/GuidedGamePage';
import { SettingsPage } from './components/Settings/SettingsPage';
import { OnboardingPage } from './components/Settings/OnboardingPage';
import { GameDatabasePage } from './components/Games/GameDatabasePage';
import { ImportPage } from './components/Games/ImportPage';
import { ProPlayerPage } from './components/Openings/ProPlayerPage';
import { TacticalProfilePage } from './components/Tactics/TacticalProfilePage';
import { TacticDrillPage } from './components/Tactics/TacticDrillPage';
import { TacticSetupPage } from './components/Tactics/TacticSetupPage';
import { TacticCreatePage } from './components/Tactics/TacticCreatePage';

export function App(): JSX.Element {
  const { isLoading, setLoading, setActiveProfile, setActiveTheme, activeProfile } =
    useAppStore();
  const [onboardingSkipped, setOnboardingSkipped] = useState(true);

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

        // Restore saved voice preferences so they're applied from the first speak() call
        if (profile.preferences.systemVoiceURI) {
          speechService.setVoice(profile.preferences.systemVoiceURI);
        }
        if (profile.preferences.voiceSpeed) {
          speechService.setRate(profile.preferences.voiceSpeed);
        }

        // Speak a welcome greeting to warm up the Polly TTS connection.
        // This pre-establishes DNS/TCP/TLS with the TTS server so subsequent
        // voice calls (e.g. opening trainer narration) have much less lag.
        // On iOS the audio may not play until after first touch, but the HTTP
        // round-trip still warms the connection.
        const lastWelcome = sessionStorage.getItem('lastWelcome') ?? undefined;
        const welcome = getRandomWelcome(lastWelcome);
        sessionStorage.setItem('lastWelcome', welcome);
        void voiceService.speak(welcome);

        const skippedMeta = await db.meta.get('onboarding_skipped');
        if (skippedMeta?.value !== 'true') {
          // Auto-skip onboarding — API keys can be added from Settings
          await db.meta.put({ key: 'onboarding_skipped', value: 'true' });
        }
        setOnboardingSkipped(true);

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
          {/* Puzzle routes — now under /weaknesses */}
          <Route path="/weaknesses/puzzles" element={<ErrorBoundary><WeaknessPuzzlePage /></ErrorBoundary>} />
          <Route path="/weaknesses/adaptive" element={<ErrorBoundary><AdaptivePuzzlePage /></ErrorBoundary>} />
          <Route path="/weaknesses/classic" element={<ErrorBoundary><PuzzleTrainerPage /></ErrorBoundary>} />
          <Route path="/weaknesses/mistakes" element={<ErrorBoundary><MyMistakesPage /></ErrorBoundary>} />
          <Route path="/weaknesses/lichess-dashboard" element={<ErrorBoundary><LichessDashboardPage /></ErrorBoundary>} />
          {/* Redirects for old /puzzles routes */}
          <Route path="/puzzles" element={<Navigate to="/weaknesses" replace />} />
          <Route path="/puzzles/classic" element={<Navigate to="/weaknesses/classic" replace />} />
          <Route path="/puzzles/mistakes" element={<Navigate to="/weaknesses/mistakes" replace />} />
          <Route path="/puzzles/lichess-dashboard" element={<Navigate to="/weaknesses/lichess-dashboard" replace />} />
          <Route path="/openings" element={<ErrorBoundary><OpeningExplorerPage /></ErrorBoundary>} />
          <Route path="/openings/pro/:playerId" element={<ErrorBoundary><ProPlayerPage /></ErrorBoundary>} />
          <Route path="/openings/pro/:playerId/:id" element={<ErrorBoundary><OpeningDetailPage /></ErrorBoundary>} />
          <Route path="/openings/:id" element={<ErrorBoundary><OpeningDetailPage /></ErrorBoundary>} />
          {/* Tactics routes */}
          <Route path="/tactics" element={<ErrorBoundary><TacticsPage /></ErrorBoundary>} />
          <Route path="/tactics/profile" element={<ErrorBoundary><TacticalProfilePage /></ErrorBoundary>} />
          <Route path="/tactics/drill" element={<ErrorBoundary><TacticDrillPage /></ErrorBoundary>} />
          <Route path="/tactics/setup" element={<ErrorBoundary><TacticSetupPage /></ErrorBoundary>} />
          <Route path="/tactics/create" element={<ErrorBoundary><TacticCreatePage /></ErrorBoundary>} />
          <Route path="/play" element={<ErrorBoundary><GamesPage /></ErrorBoundary>} />
          <Route path="/coach" element={<ErrorBoundary><CoachPage /></ErrorBoundary>} />
          <Route path="/coach/play" element={<ErrorBoundary><CoachGamePage /></ErrorBoundary>} />
          <Route path="/coach/chat" element={<ErrorBoundary><CoachChatPage /></ErrorBoundary>} />
          <Route path="/coach/analyse" element={<ErrorBoundary><CoachAnalysePage /></ErrorBoundary>} />
          <Route path="/coach/plan" element={<ErrorBoundary><CoachSessionPlanPage /></ErrorBoundary>} />
          <Route path="/weaknesses" element={<ErrorBoundary><CoachWeaknessReport /></ErrorBoundary>} />
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
          <Route path="/kid/play-games" element={<ErrorBoundary><GuidedGameHubPage /></ErrorBoundary>} />
          <Route path="/kid/play-games/:gameId" element={<ErrorBoundary><GuidedGamePage /></ErrorBoundary>} />
          <Route path="/kid/puzzles" element={<ErrorBoundary><KidPuzzlePage /></ErrorBoundary>} />
          <Route path="/kid/:piece" element={<ErrorBoundary><KidPiecePage /></ErrorBoundary>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
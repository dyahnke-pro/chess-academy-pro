import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import { getOrCreateMainProfile } from './services/dbService';
import { getThemeById, applyTheme } from './services/themeService';
import { seedDatabase } from './services/dataLoader';
import { seedPuzzles } from './services/puzzleService';
import { AppLayout } from './components/ui/AppLayout';
import { LoadingScreen } from './components/ui/LoadingScreen';

// Page-level imports
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { BoardTestPage } from './components/BoardTest/BoardTestPage';
import { OpeningExplorerPage } from './components/Openings/OpeningExplorerPage';
import { OpeningDetailPage } from './components/Openings/OpeningDetailPage';
import { PuzzleTrainerPage } from './components/Puzzles/PuzzleTrainerPage';

export function App(): JSX.Element {
  const { isLoading, setLoading, setActiveProfile, setActiveTheme, activeProfile } =
    useAppStore();

  useEffect(() => {
    async function init(): Promise<void> {
      try {
        const profile = await getOrCreateMainProfile();
        const theme = getThemeById(profile.preferences.theme);
        applyTheme(theme);
        setActiveTheme(theme);
        setActiveProfile(profile);
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

  // First-run: redirect to onboarding if no API key set
  const hasApiKey = Boolean(activeProfile?.preferences.apiKeyEncrypted);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/puzzles" element={<PuzzleTrainerPage />} />
          <Route path="/openings" element={<OpeningExplorerPage />} />
          <Route path="/openings/:id" element={<OpeningDetailPage />} />
          <Route path="/flashcards" element={<PlaceholderPage title="Flashcards" />} />
          <Route path="/games" element={<PlaceholderPage title="Games" />} />
          <Route path="/analysis" element={<PlaceholderPage title="Analysis Board" />} />
          <Route path="/stats" element={<PlaceholderPage title="Stats" />} />
          <Route path="/kid" element={<PlaceholderPage title="Kid Mode" />} />
          <Route
            path="/settings"
            element={
              hasApiKey
                ? <PlaceholderPage title="Settings" />
                : <Navigate to="/settings/onboarding" replace />
            }
          />
          <Route path="/settings/onboarding" element={<PlaceholderPage title="Setup" />} />
          <Route path="/board" element={<BoardTestPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// Temporary placeholder — replaced by real pages in subsequent work orders
function PlaceholderPage({ title }: { title: string }): JSX.Element {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center">
        <div className="text-4xl mb-4">♛</div>
        <h1 className="text-2xl font-bold text-theme-text mb-2">{title}</h1>
        <p className="text-theme-text-muted">Coming soon — check the work orders.</p>
      </div>
    </div>
  );
}

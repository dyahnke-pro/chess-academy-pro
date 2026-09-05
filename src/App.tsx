import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './services/bucketAuditBridge'; // installs window.__bucketAudit for the bucket-delivery audit (no-op for real users)
import { useAppStore } from './stores/appStore';
import { getOrCreateMainProfile } from './services/dbService';
import { calibrateStrength } from './services/strengthCalibrationService';
import { AiConsentModal } from './components/Legal/AiConsentModal';
import { useAiConsentStore } from './stores/aiConsentStore';
import { getThemeById, applyTheme } from './services/themeService';
import { seedDatabase } from './services/dataLoader';
import { seedVerifiedLibraryNote } from './services/coachMemoryService';
import { seedPuzzles } from './services/puzzleService';
import { runAutoImportIfDue } from './services/autoImportScheduler';
import { getSharedAudioContext } from './services/audioContextManager';
import { speechService } from './services/speechService';
import { voiceService } from './services/voiceService';
import { stockfishEngine } from './services/stockfishEngine';
import { warmCoachProvider } from './services/coachApi';
import { db } from './db/schema';
import { installGlobalErrorHooks, installConsoleBackdoor, logAppAudit, loadAuditStreamConfig } from './services/appAuditor';
import { initAnalytics, identifyUser, setUserProperties, registerSuperProperties } from './services/analytics';
import { applyInternalFromUrl, resolveDeviceIdentity, getDeviceId } from './services/deviceIdentity';
import { requestPersistentStorage } from './services/storageQuota';
import { emitAppBootAudit } from './services/appBootAudit';
import { AppLayout } from './components/ui/AppLayout';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { BuildVersionWidget } from './components/Debug/BuildVersionWidget';
import { StarAnimationLayer } from './components/StarAnimationLayer';

// Page-level imports
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { AcademyPage } from './components/Academy/AcademyPage';
import { CourseSyllabusPage } from './components/Academy/CourseSyllabusPage';
import { CourseTrainerPage } from './components/Academy/CourseTrainerPage';
import { OpeningExplorerPage } from './components/Openings/OpeningExplorerPage';
import { OpeningDetailPage } from './components/Openings/OpeningDetailPage';
import { SrsTrainerPage } from './components/Openings/SrsTrainerPage';
import { PuzzleTrainerPage } from './components/Puzzles/PuzzleTrainerPage';
import { AdaptivePuzzlePage } from './components/Puzzles/AdaptivePuzzlePage';
import { MyMistakesPage } from './components/Puzzles/MyMistakesPage';
import { LichessDashboardPage } from './components/Puzzles/LichessDashboardPage';
import { WeaknessTagDrillPage } from './components/Puzzles/WeaknessTagDrillPage';
import { WeaknessThemesPage } from './components/Puzzles/WeaknessThemesPage';
// PuzzlesHubPage removed — Puzzles tab merged into Tactics
import { CoachGamePage } from './components/Coach/CoachGamePage';
import { CoachChatPage } from './components/Coach/CoachChatPage';
import { CoachSessionPage } from './components/Coach/CoachSessionPage';
import { CoachAnalysePage } from './components/Coach/CoachAnalysePage';
import { CoachTrainPage } from './components/Coach/CoachTrainPage';
import { TrainingPlanRolodexPage } from './components/Coach/TrainingPlanRolodexPage';
import { GameInsightsPage } from './components/Insights/GameInsightsPage';
import { GamesDrilldownPage } from './components/Insights/GamesDrilldownPage';
import { CoachTeachPage } from './components/Coach/CoachTeachPage';
import { ProGamesPage } from './components/Coach/ProGamesPage';
import { CoachEndgamePage } from './components/Coach/CoachEndgamePage';
import { EndgameTrainerPage } from './components/Coach/EndgameTrainerPage';
import { FundamentalsPage } from './components/Coach/FundamentalsPage';
import { CoachesLibraryPage } from './components/Coach/CoachesLibraryPage';
import { CoachReviewListPage } from './components/Coach/CoachReviewListPage';
import { CoachReviewSessionPage } from './components/Coach/CoachReviewSessionPage';
import { CoachPage } from './components/Coach/CoachPage';
import { TacticsPage } from './components/Tactics/TacticsPage';
import { FindSquarePage } from './components/Tactics/FindSquarePage';
import { AnalysisPracticePage } from './components/Tactics/AnalysisPracticePage';
import { CalculationDrillPage } from './components/Tactics/CalculationDrillPage';
import { TacticalProfilePage } from './components/Tactics/TacticalProfilePage';
import { PatternSchoolPage } from './components/Tactics/PatternSchoolPage';
import { TacticDrillPage } from './components/Tactics/TacticDrillPage';
import { TacticSetupPage } from './components/Tactics/TacticSetupPage';
import { TacticCreatePage } from './components/Tactics/TacticCreatePage';
import { SettingsPage } from './components/Settings/SettingsPage';
import { OnboardingPage } from './components/Settings/OnboardingPage';
import { GameDatabasePage } from './components/Games/GameDatabasePage';
import { ImportPage } from './components/Games/ImportPage';
import { ProPlayerPage } from './components/Openings/ProPlayerPage';
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
import { KingGamesPage } from './components/Kid/KingGamesPage';
import { BishopGamesPage, BishopVsPawnsRoute, ColorWarsRoute } from './components/Kid/BishopGamesPage';
import { KidPiecePuzzlesPage } from './components/Kid/KidPiecePuzzlesPage';
import { PieceMazePage } from './components/Kid/PieceMazePage';
import { PieceSweepPage } from './components/Kid/PieceSweepPage';
import { PieceRaceGame } from './components/Kid/PieceRaceGame';
import { KnightArmyRoute, BishopArmyRoute } from './components/Kid/PairArmyGame';
import { PieceLevelSelect } from './components/Kid/PieceLevelSelect';
import { KnightGamesPage } from './components/Kid/KnightGamesPage';
import { LeapFrogGame } from './components/Kid/LeapFrogGame';
import { KnightSweepGame } from './components/Kid/KnightSweepGame';
import { QueenGamesHub, QueenVsArmyRoute, QueensGauntletRoute } from './components/Kid/QueenGamesHub';
import { KidPuzzlePage } from './components/Kid/KidPuzzlePage';
import { GuidedGameHubPage } from './components/Kid/GuidedGameHubPage';
import { GuidedGamePage } from './components/Kid/GuidedGamePage';
import { NeonBoardMock } from './components/Board/NeonBoardMock';
import { DebugAuditPage } from './components/Debug/DebugAuditPage';
import { OpeningBlundersPage } from './components/Debug/OpeningBlundersPage';
import { useAndroidBackButton } from './hooks/useAndroidBackButton';
import { PrivacyPolicyPage } from './components/Legal/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/Legal/TermsOfServicePage';
import { SupportPage } from './components/Legal/SupportPage';
import { AccessGate } from './components/Paywall/AccessGate';
import { initBilling, getStableAnalyticsId } from './services/billingService';
import { useFreeTierStore } from './stores/freeTierStore';
import { ReviewPrompt } from './components/Feedback/ReviewPrompt';

/**
 * Mounted inside BrowserRouter so it can use router hooks. Wires the
 * Android hardware/gesture back-button to in-app navigation (no-op on
 * web + iOS). Renders nothing.
 */
function NativeBackButton(): null {
  useAndroidBackButton();
  return null;
}

export function App(): JSX.Element {
  const { isLoading, setLoading, setActiveProfile, setActiveTheme, activeProfile } =
    useAppStore();
  const [onboardingSkipped, setOnboardingSkipped] = useState(true);

  // First-run AI data-sharing consent (Apple 5.1.1). If this profile has never
  // answered the consent prompt (undefined ⇒ new install OR an existing profile
  // that predates the field), surface the blocking AiConsentModal before any
  // coach call can share gameplay data with the third-party AI providers. (The
  // strength-picker bubble that used to gate this was removed 2026-08-22 — see
  // the calibration block below — so consent is now the ONLY first-run prompt.)
  useEffect(() => {
    if (!activeProfile) return;
    if (activeProfile.aiDataConsent !== undefined) return;
    if (useAiConsentStore.getState().promptOpen) return;
    void useAiConsentStore.getState().requestConsent();
  }, [activeProfile]);

  // Unlock Web Speech API on first user gesture (required on iOS/WKWebView)
  useEffect(() => {
    const unlock = (): void => {
      speechService.warmupInGestureContext();
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  // Install window.onerror + unhandledrejection hooks so any runtime
  // failure flows into the same audit log as narration findings and
  // subsystem errors. One place to look post-launch.
  useEffect(() => {
    const uninstall = installGlobalErrorHooks();
    // Register the __AUDIT__ DevTools back-door alongside. Also
    // available via the /debug/audit route.
    installConsoleBackdoor();
    // WO-DEEP-DIAGNOSTICS — capture install / runtime context once
    // per tab session so production reports name the build, the
    // standalone mode, the SW state, and the network status at boot.
    emitAppBootAudit();

    // Audit-tool: periodic memory pressure snapshot. Chrome exposes
    // `performance.memory` (non-standard but widely available). When
    // a tab crashes, the audit log usually has nothing in the last
    // seconds before the crash because nothing happened to log. A
    // 30 s heartbeat with heap stats means the next crash-report
    // dump CAN show the memory ramp leading up to the crash, not
    // just the silence right before it. ~120 rows per hour of use,
    // negligible IndexedDB load.
    const memInterval = window.setInterval(() => {
      const perf = performance as Performance & {
        memory?: {
          jsHeapSizeLimit: number;
          totalJSHeapSize: number;
          usedJSHeapSize: number;
        };
      };
      const mem = perf.memory;
      if (!mem) return;
      const usedMb = Math.round(mem.usedJSHeapSize / (1024 * 1024));
      const totalMb = Math.round(mem.totalJSHeapSize / (1024 * 1024));
      const limitMb = Math.round(mem.jsHeapSizeLimit / (1024 * 1024));
      void logAppAudit({
        kind: 'memory-snapshot',
        category: 'subsystem',
        source: 'App.memoryAuditInterval',
        summary: `heap used=${usedMb}MB total=${totalMb}MB limit=${limitMb}MB (${Math.round((usedMb / limitMb) * 100)}% of cap)`,
      });
    }, 30_000);

    return () => {
      window.clearInterval(memInterval);
      uninstall();
    };
  }, []);

  useEffect(() => {
    async function init(): Promise<void> {
      // Create the shared AudioContext immediately so its touchstart unlock
      // listener is attached before the user's first tap. On iOS Safari the
      // context starts suspended; the listener resumes it on first touch.
      getSharedAudioContext();

      // 🔒 DATA-LOSS FIX (David 2026-07-29) — claim PERSISTENT storage BEFORE
      // the first Dexie write. Without this grant WebKit evicts IndexedDB from
      // apps that aren't opened often, and the analytics showed it happening:
      // devices that opened the app rarely re-ran first-run calibration on
      // ~75% of boots (empty Dexie = lost profile, rating, unlocked openings,
      // ladder progress, SRS, imported games), while the daily-use device lost
      // it on only 7%. Runs first so the profile we're about to create lands in
      // storage that won't be evicted. Total + fail-open — never blocks boot.
      const persistence = await requestPersistentStorage();
      // David's 2026-07-31 device log showed `persisted=false already=false` on
      // every boot — the SUPPORTED branch, i.e. WebKit was asked properly and
      // refused. That is a platform decision we can't override; what we can do
      // is record the context that explains it, since WebKit weighs install
      // state and engagement. Without these fields the log can't distinguish
      // "we asked wrong" from "the platform said no".
      const standalone = typeof window !== 'undefined'
        && (window.matchMedia?.('(display-mode: standalone)').matches
          || (window.navigator as { standalone?: boolean }).standalone === true);
      void logAppAudit({
        kind: 'storage-persistence',
        category: 'app',
        source: 'App.init',
        summary: persistence.supported
          ? `persisted=${String(persistence.persisted)} already=${String(persistence.alreadyPersisted)} standalone=${String(standalone)}`
          : 'persist() unsupported on this platform',
        details: JSON.stringify({
          supported: persistence.supported,
          persisted: persistence.persisted,
          alreadyPersisted: persistence.alreadyPersisted,
          standalone,
          // A refusal on a standalone install is WebKit policy, not a bug in
          // the request — the eviction risk is real either way, and cloud sync
          // is the only durable answer.
          platformRefused: persistence.supported && !persistence.persisted,
        }),
      });

      try {
        const profile = await getOrCreateMainProfile();
        const theme = getThemeById(profile.preferences.theme);
        applyTheme(theme);
        setActiveTheme(theme);
        setActiveProfile(profile);

        // Productization Phase 1 — start PostHog product analytics.
        // No-op unless VITE_POSTHOG_KEY is set; honors the per-profile
        // opt-out. Stays anonymous until auth lands (Phase 3) — never
        // identify with the shared 'main' profile id.
        initAnalytics({ optedOut: profile.preferences.analyticsOptOut === true });

        // Productization Phase 4 — resolve subscription entitlement via
        // RevenueCat. No-op without a platform SDK key (keyless build stays
        // fully usable, source='unconfigured' → isPro). The hard paywall only
        // engages when VITE_PAYWALL_ENABLED=true AND the user isn't Pro.
        //
        // Then tie PostHog identity to RevenueCat's durable app-user id (David
        // 2026-07-17). On native, RevenueCat persists that id in the iOS
        // Keychain, so it survives the storage evictions that otherwise mint a
        // fresh anonymous "person" every session — the reason user counts
        // inflate and per-install retention is invisible. identify() makes each
        // install ONE tracked user; no-op on web/keyless (stable cookie id).
        // Hand RevenueCat our OWN durable device id (David 2026-08-01). Without
        // it every install is a throwaway $RCAnonymousID: a reinstall orphans
        // the customer, and no entitlement can be granted to a specific person
        // because there is no stable person to grant it to. `initBilling`
        // configures anonymously first and ALIASES onto this id, so existing
        // purchases carry over instead of vanishing.
        void getDeviceId()
          .catch(() => undefined)
          .then((deviceId) => initBilling(deviceId ?? undefined))
          .then(async () => {
            const stableId = await getStableAnalyticsId();
            if (stableId) identifyUser(stableId);
          });

        // Person-level retention anchors: first_seen_at is written ONCE (stable
        // cohort boundary), last_seen_at every boot. No-op on keyless builds.
        setUserProperties(
          { last_seen_at: new Date().toISOString() },
          { first_seen_at: new Date().toISOString() },
        );

        // Stable device identity + the owner/internal flag (David 2026-07-28:
        // real device counts, and "I never want my stats mixed in"). Honors
        // ?internal=1 first so a device can be marked straight from a link,
        // then registers device_id / is_internal as super-properties — every
        // event carries them, and posthog persists them across sessions.
        void applyInternalFromUrl()
          .then(() => resolveDeviceIdentity())
          .then((identity) => {
            // AUDIT RUN CORRELATION (David 2026-08-06: "pull the narrations
            // from posthog instead of listener tool"). A Playwright driver
            // stamps localStorage.auditRunId next to auditMuteTts; riding it
            // as a super-property makes one run's events isolable in PostHog
            // (`WHERE properties.audit_run_id = '<id>'`) instead of guessed
            // from $session_id + wall clock. Absent for every real user —
            // registering nothing in that case.
            let auditRunId: string | null = null;
            try { auditRunId = globalThis.localStorage?.getItem('auditRunId'); } catch { /* locked-down context */ }
            registerSuperProperties({ ...identity, ...(auditRunId ? { audit_run_id: auditRunId } : {}) });
          })
          .catch(() => undefined);

        // Hydrate the free-tier ledger (puzzle bucket / free opening / kid
        // window) into its runtime mirror so the soft paywall gate can read
        // spend synchronously. Dormant unless the gate is live + non-Pro.
        void useFreeTierStore.getState().hydrate();

        // Difficulty is FULLY ADAPTIVE — no calibration step, no forced rating
        // seed (David 2026-09-02: "remove strength calibration → go fully
        // adaptive"). When the player has IMPORTED games, calibrateStrength
        // still silently applies their REAL rating (the honest signal). With no
        // import we write NOTHING: the opponent plays the shared default
        // (studentPlayingRating → 1200) and difficulty tunes from real signals
        // (imports + puzzle results) rather than a guessed band. No pop-up, no
        // picker, no seed.
        try {
          const { result, profile: calibrated } = await calibrateStrength(profile);
          if (!result.needsPicker && calibrated !== profile) {
            setActiveProfile(calibrated);
          }
        } catch (e) {
          // Never block boot on calibration — fall through to defaults.
          console.error('[calibration] failed:', e);
        }

        // Hydrate the audit-stream config cache from Dexie (with
        // one-time localStorage migration if any pre-Dexie values
        // are still present). `appAuditor.streamAuditEntry` reads
        // the cache synchronously on every audit log — until this
        // resolves, streaming is a no-op (same as default-off state).
        void loadAuditStreamConfig();

        // Restore saved voice preferences so they're applied from the first speak() call
        if (profile.preferences.systemVoiceURI) {
          speechService.setVoice(profile.preferences.systemVoiceURI);
        }
        if (profile.preferences.voiceSpeed) {
          speechService.setRate(profile.preferences.voiceSpeed);
        }

        // Warm up the voice pipeline early so the first narration has no cold-start delay
        void voiceService.warmup();

        // Wire the iOS audio-element unlock. iOS blocks programmatic
        // audio.play() until the element has played once inside a real user
        // gesture, so timer-driven narration (Watch lessons) is silent until
        // then. This attaches first-gesture listeners that "bless" the
        // streaming <audio> element. It existed but was NEVER called — that's
        // why the coach voice was silent on the iPhone (David 2026-06-06).
        voiceService.installStreamingAudioUnlock();

        const skippedMeta = await db.meta.get('onboarding_skipped');
        if (skippedMeta?.value !== 'true') {
          // Auto-skip onboarding — API keys can be added from Settings
          await db.meta.put({ key: 'onboarding_skipped', value: 'true' });
        }
        setOnboardingSkipped(true);

        // Seed data in background (no-op if already seeded).
        // seedDatabase is single-flight guarded so the strict-mode
        // double-invoke + re-renders can't race the bulkPut writes.
        void seedDatabase().catch((e: unknown) => console.error('[seed] failed:', e));
        void seedVerifiedLibraryNote();
        void seedPuzzles();

        // Warm the Stockfish WASM engine shortly after boot (David 2026-06-17)
        // so it's READY before the user reaches a coach question. Deferred ~2.5s
        // so it never competes with first paint or the critical seed; idempotent
        // + fire-and-forget (never blocks boot, NEVER an LLM call).
        //
        // 🔒 `initialize()` ALONE IS NOT ENOUGH — it loads the worker but the
        // FIRST `analyzeWithBudget` still pays the cold search cost, and the WASM
        // init itself can run up to ~45s which `analyzeWithBudget` AWAITS. The
        // hand-driven prod audit (David 2026-09-02) proved it: on /coach/play the
        // FIRST coach question took ~21s (cold Stockfish) and blew the 15s client
        // cap → "Coach is taking too long", while Q2/Q3 hit `stockfish-cache-hit`
        // and answered in <200ms. Every coach turn runs a tactics-context
        // analysis, so the first question of a session ate the whole cold-start.
        // Fix: after init, run ONE real budgeted analysis so the ENTIRE analysis
        // path (worker + first `go` + hash alloc) is warm at boot — any first
        // coach question is then fast regardless of its position.
        const STOCKFISH_WARM_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        setTimeout(() => {
          void stockfishEngine
            .initialize()
            .then(() => stockfishEngine.analyzeWithBudget(STOCKFISH_WARM_FEN, 12, 1500))
            .catch(() => undefined);
        }, 2500);

        // Warm the BATCH-analysis worker pool too (David 2026-09-05: "get those
        // parallel computers warming up at app launch"). On a phone the pool is
        // asm.js and each worker cold-compiles ~45s — paid here, off the
        // critical path, instead of in front of the first Analyze tap or review.
        // Only when the library has games (a fresh install spawns nothing); the
        // pool then stays alive for the session (gameAnalysisService warm pool).
        // Gated on there being WORK, not merely games. Warming four asm.js
        // engines is itself ~45s of compile per worker; doing that on a library
        // that is fully analysed spends battery to prepare for a tap that has
        // nothing to do (David 2026-09-05: "this is burning way too much
        // battery"). countGamesNeedingAnalysis is a Dexie filter, not an engine
        // call, so asking is free.
        setTimeout(() => {
          void import('./services/gameAnalysisService')
            .then(async (m) => (await m.countGamesNeedingAnalysis() > 0 ? m.warmAnalysisPool() : 0))
            .catch(() => undefined);
        }, 8000);

        // Warm the DeepSeek LLM proxy too (David 2026-09-02). The hand-driven
        // prod audit proved the LLM edge — not Stockfish — was the dominant cold
        // leg: the first coach turn hit coach-brain-deepseek-timeout → retry →
        // ~37s, later turns <200ms. A 1-token completion at boot pre-pays that
        // edge cold-start off the critical path. Deferred ~3s so it never
        // competes with first paint or the Stockfish warm; fire-and-forget.
        setTimeout(() => { void warmCoachProvider().catch(() => undefined); }, 3000);

        // Warm the OTHER two serverless proxies the FIRST coach turn hits — the
        // syzygy TABLEBASE and the masters/amateur EXPLORER (David 2026-09-02).
        // The hand-driven audit showed the first endgame question took ~32s while
        // it computer-served (no LLM): it was these proxies cold-starting and
        // STACKING on turn one (turns 2+ were instant, warm). Pre-pay both off
        // the critical path. Fire-and-forget; a warm-ping failure is harmless.
        setTimeout(() => {
          const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
          void import('./services/lichessTablebaseService')
            .then((m) => m.lookupTablebase('8/8/8/4k3/8/8/4K3/6R1 w - - 0 1'))
            .catch(() => undefined);
          void fetch(`/api/lichess-explorer?source=masters&fen=${encodeURIComponent(startFen)}`)
            .then((r) => r.text())
            .catch(() => undefined);
        }, 3500);

        // Biweekly chess.com / lichess auto-import. Fire-and-forget,
        // deferred 30s after boot so it never competes with the user's
        // first action (especially the /coach/teach kickoff which
        // wants the engine free for stockfish_eval tool calls).
        // Skips post-import puzzle/analysis runs — those happen on
        // explicit Game Insights navigation instead.
        setTimeout(() => {
          void runAutoImportIfDue(profile, {
            onProfileUpdated: (next) => setActiveProfile(next),
          });
        }, 30_000);

      } catch (error) {
        console.error('App initialization failed:', error);
        void logAppAudit({
          kind: 'uncaught-error',
          category: 'app',
          source: 'App.init',
          summary: error instanceof Error ? error.message : 'App initialization failed',
          details: error instanceof Error ? error.stack : String(error),
        });
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
    <>
    <BrowserRouter>
      <NativeBackButton />
      <Routes>
        {/* Standalone legal route — no app chrome, so the production URL
            (/privacy) doubles as the hosted privacy-policy link the App
            Store + Google Play both require. */}
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        {/* Standalone Terms + Support routes — hosted Terms/Support URLs the
            stores require, and the EULA/Privacy links the subscription paywall
            must carry. Mounted OUTSIDE the PaywallGate so a walled user (and a
            store reviewer) can always reach them. */}
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route element={<AccessGate><ErrorBoundary><AppLayout /></ErrorBoundary></AccessGate>}>
          <Route path="/" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
          <Route path="/academy" element={<ErrorBoundary><AcademyPage /></ErrorBoundary>} />
          <Route path="/academy/course/:id" element={<ErrorBoundary><CourseSyllabusPage /></ErrorBoundary>} />
          <Route path="/academy/course/:id/train" element={<ErrorBoundary><CourseTrainerPage /></ErrorBoundary>} />
          {/* The course's own WLPP lesson surface — keeps courses SELF-CONTAINED
              under The Academy so a chapter never throws the student into the
              Openings tab. Reuses the lesson player; reads ?line= for variations. */}
          <Route path="/academy/course/:id/lesson" element={<ErrorBoundary><OpeningDetailPage /></ErrorBoundary>} />
          {/* Openings */}
          <Route path="/openings" element={<ErrorBoundary><OpeningExplorerPage /></ErrorBoundary>} />
          <Route path="/openings/srs" element={<ErrorBoundary><SrsTrainerPage /></ErrorBoundary>} />
          <Route path="/openings/pro/:playerId" element={<ErrorBoundary><ProPlayerPage /></ErrorBoundary>} />
          <Route path="/openings/pro/:playerId/:id" element={<ErrorBoundary><OpeningDetailPage /></ErrorBoundary>} />
          <Route path="/openings/:id" element={<ErrorBoundary><OpeningDetailPage /></ErrorBoundary>} />
          {/* Coach — /coach redirects to the live play-with-coach
              board so "tap Coach in the nav" always lands the student
              on a playable game instead of a card hub. The old hub
              (CoachHomePage / CoachPage) is still reachable at
              /coach/home for anyone who wants the action grid. */}
          <Route path="/coach" element={<Navigate to="/coach/home" replace />} />
          <Route path="/coach/home" element={<ErrorBoundary><CoachPage /></ErrorBoundary>} />
          <Route path="/coach/play" element={<ErrorBoundary><CoachGamePage /></ErrorBoundary>} />
          <Route path="/coach/chat" element={<ErrorBoundary><CoachChatPage /></ErrorBoundary>} />
          <Route path="/coach/session/:kind" element={<ErrorBoundary><CoachSessionPage /></ErrorBoundary>} />
          <Route path="/coach/analyse" element={<ErrorBoundary><CoachAnalysePage /></ErrorBoundary>} />
          <Route path="/coach/plan" element={<ErrorBoundary><TrainingPlanRolodexPage /></ErrorBoundary>} />
          {/* /coach/report is a legacy alias — redirect lives below in the redirects block */}
          {/* /coach/train: the Training Plan (/coach/plan) is the primary hub,
              but the standalone coach-recommendations view stays reachable on
              demand (David 2026-05-25: "tie in but allow for standalone if user
              desires"). Linked from the plan, not the main nav. */}
          <Route path="/coach/train" element={<ErrorBoundary><CoachTrainPage /></ErrorBoundary>} />
          <Route path="/coach/teach" element={<ErrorBoundary><CoachTeachPage /></ErrorBoundary>} />
          <Route path="/coach/endgame" element={<ErrorBoundary><CoachEndgamePage /></ErrorBoundary>} />
          <Route path="/coach/endgame-trainer/:lessonId" element={<ErrorBoundary><EndgameTrainerPage /></ErrorBoundary>} />
          <Route path="/coach/fundamentals" element={<ErrorBoundary><FundamentalsPage /></ErrorBoundary>} />
          <Route path="/coach/academy" element={<Navigate to="/coach/library" replace />} />
          <Route path="/coach/library" element={<ErrorBoundary><CoachesLibraryPage /></ErrorBoundary>} />
          <Route path="/coach/pro-games" element={<ErrorBoundary><ProGamesPage /></ErrorBoundary>} />
          <Route path="/coach/review" element={<ErrorBoundary><CoachReviewListPage /></ErrorBoundary>} />
          <Route path="/coach/review/:gameId" element={<ErrorBoundary><CoachReviewSessionPage /></ErrorBoundary>} />
          {/* Tactics (absorbs former Puzzles tab) */}
          <Route path="/tactics" element={<ErrorBoundary><TacticsPage /></ErrorBoundary>} />
          <Route path="/tactics/profile" element={<ErrorBoundary><TacticalProfilePage /></ErrorBoundary>} />
          <Route path="/tactics/patterns" element={<ErrorBoundary><PatternSchoolPage /></ErrorBoundary>} />
          <Route path="/tactics/drill" element={<ErrorBoundary><TacticDrillPage /></ErrorBoundary>} />
          <Route path="/tactics/setup" element={<ErrorBoundary><TacticSetupPage /></ErrorBoundary>} />
          <Route path="/tactics/create" element={<ErrorBoundary><TacticCreatePage /></ErrorBoundary>} />
          <Route path="/tactics/mistakes" element={<ErrorBoundary><MyMistakesPage /></ErrorBoundary>} />
          <Route path="/tactics/find-square" element={<ErrorBoundary><FindSquarePage /></ErrorBoundary>} />
          <Route path="/tactics/analysis-practice" element={<ErrorBoundary><AnalysisPracticePage /></ErrorBoundary>} />
          <Route path="/tactics/calculation" element={<ErrorBoundary><CalculationDrillPage /></ErrorBoundary>} />
          <Route path="/tactics/adaptive" element={<ErrorBoundary><AdaptivePuzzlePage /></ErrorBoundary>} />
          <Route path="/tactics/classic" element={<ErrorBoundary><PuzzleTrainerPage /></ErrorBoundary>} />
          <Route path="/tactics/weakness-drill" element={<ErrorBoundary><WeaknessTagDrillPage /></ErrorBoundary>} />
          <Route path="/tactics/weakness-themes" element={<ErrorBoundary><WeaknessThemesPage /></ErrorBoundary>} />
          <Route path="/tactics/lichess" element={<ErrorBoundary><LichessDashboardPage /></ErrorBoundary>} />
          {/* Backward-compat redirects */}
          <Route path="/puzzles" element={<Navigate to="/tactics" replace />} />
          <Route path="/puzzles/classic" element={<Navigate to="/tactics/classic" replace />} />
          <Route path="/puzzles/adaptive" element={<Navigate to="/tactics/adaptive" replace />} />
          <Route path="/puzzles/mistakes" element={<Navigate to="/tactics/mistakes" replace />} />
          <Route path="/puzzles/weakness" element={<Navigate to="/tactics/weakness-themes" replace />} />
          <Route path="/puzzles/lichess-dashboard" element={<Navigate to="/tactics/lichess" replace />} />
          <Route path="/weaknesses" element={<ErrorBoundary><GameInsightsPage /></ErrorBoundary>} />
          <Route path="/weaknesses/games" element={<ErrorBoundary><GamesDrilldownPage /></ErrorBoundary>} />
          <Route path="/coach/report" element={<Navigate to="/weaknesses" replace />} />
          <Route path="/weaknesses/puzzles" element={<Navigate to="/tactics/weakness-themes" replace />} />
          <Route path="/weaknesses/adaptive" element={<Navigate to="/tactics/adaptive" replace />} />
          <Route path="/weaknesses/classic" element={<Navigate to="/tactics/classic" replace />} />
          <Route path="/weaknesses/mistakes" element={<Navigate to="/tactics/mistakes" replace />} />
          <Route path="/weaknesses/lichess-dashboard" element={<Navigate to="/tactics/lichess" replace />} />
          {/* Games (accessible from weakness report) */}
          <Route path="/games" element={<ErrorBoundary><GameDatabasePage /></ErrorBoundary>} />
          <Route path="/games/import" element={<ErrorBoundary><ImportPage /></ErrorBoundary>} />
          {/* Settings */}
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
          <Route path="/neon-mock" element={<NeonBoardMock />} />
          {/* Audit back-door — not linked from UI; deep-link only. */}
          <Route path="/debug/audit" element={<ErrorBoundary><DebugAuditPage /></ErrorBoundary>} />
          {/* Opening Traps — wired up from the Tactics page tile and
              also kept as a /debug deep-link alias for older preview
              URLs we've shared. */}
          <Route path="/tactics/opening-traps" element={<ErrorBoundary><OpeningBlundersPage /></ErrorBoundary>} />
          <Route path="/debug/opening-blunders" element={<Navigate to="/tactics/opening-traps" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route element={<AccessGate><KidLayout /></AccessGate>}>
          <Route path="/kid" element={<ErrorBoundary><KidModePage /></ErrorBoundary>} />
          <Route path="/kid/journey" element={<ErrorBoundary><JourneyMapPage /></ErrorBoundary>} />
          <Route path="/kid/queen-games" element={<ErrorBoundary><QueenGamesHub /></ErrorBoundary>} />
          <Route path="/kid/queen-games/vs-army" element={<ErrorBoundary><QueenVsArmyRoute /></ErrorBoundary>} />
          <Route path="/kid/queen-games/gauntlet" element={<ErrorBoundary><QueensGauntletRoute /></ErrorBoundary>} />
          <Route path="/kid/journey/:chapterId" element={<ErrorBoundary><JourneyChapterPage /></ErrorBoundary>} />
          <Route path="/kid/fairy-tale" element={<ErrorBoundary><FairyTaleMapPage /></ErrorBoundary>} />
          <Route path="/kid/fairy-tale/:chapterId" element={<ErrorBoundary><FairyTaleChapterPage /></ErrorBoundary>} />
          <Route path="/kid/rook-games" element={<ErrorBoundary><RookGamesPage /></ErrorBoundary>} />
          <Route path="/kid/rook-maze/:level" element={<ErrorBoundary><RookMazePage /></ErrorBoundary>} />
          <Route path="/kid/row-clearer/:level" element={<ErrorBoundary><RowClearerPage /></ErrorBoundary>} />
          <Route path="/kid/pawn-games" element={<ErrorBoundary><MiniGameHubPage /></ErrorBoundary>} />
          <Route path="/kid/pawn-games/pawn-wars/:level" element={<ErrorBoundary><MiniGamePage gameId="pawn-wars" /></ErrorBoundary>} />
          <Route path="/kid/pawn-games/blocker/:level" element={<ErrorBoundary><MiniGamePage gameId="blocker" /></ErrorBoundary>} />
          {/* Legacy /kid/mini-games* hub redirect — old route renamed
              to /kid/pawn-games. Sub-routes redirect to the hub
              rather than carry the :level through (kid section is
              single-user, no realistic deep-link bookmarks). */}
          <Route path="/kid/mini-games" element={<Navigate to="/kid/pawn-games" replace />} />
          <Route path="/kid/mini-games/pawn-wars/:level" element={<Navigate to="/kid/pawn-games" replace />} />
          <Route path="/kid/mini-games/blocker/:level" element={<Navigate to="/kid/pawn-games" replace />} />
          <Route path="/kid/king-games" element={<ErrorBoundary><KingGamesPage /></ErrorBoundary>} />
          <Route path="/kid/king-games/escape" element={<ErrorBoundary><KingEscapeGame /></ErrorBoundary>} />
          <Route path="/kid/king-games/march" element={<ErrorBoundary><KingMarchGame /></ErrorBoundary>} />
          {/* Legacy /kid/king-* routes — redirect to the new king-games hub. */}
          <Route path="/kid/king-escape" element={<Navigate to="/kid/king-games/escape" replace />} />
          <Route path="/kid/king-march" element={<Navigate to="/kid/king-games/march" replace />} />
          <Route path="/kid/bishop-games" element={<ErrorBoundary><BishopGamesPage /></ErrorBoundary>} />
          <Route path="/kid/bishop-games/vs-pawns" element={<ErrorBoundary><BishopVsPawnsRoute /></ErrorBoundary>} />
          <Route path="/kid/bishop-games/color-wars" element={<ErrorBoundary><ColorWarsRoute /></ErrorBoundary>} />
          <Route path="/kid/knight-games" element={<ErrorBoundary><KnightGamesPage /></ErrorBoundary>} />
          <Route path="/kid/knight-games/leap-frog" element={<ErrorBoundary><LeapFrogGame /></ErrorBoundary>} />
          <Route path="/kid/knight-games/knight-sweep" element={<ErrorBoundary><KnightSweepGame /></ErrorBoundary>} />
          <Route path="/kid/play-games" element={<ErrorBoundary><GuidedGameHubPage /></ErrorBoundary>} />
          <Route path="/kid/play-games/:gameId" element={<ErrorBoundary><GuidedGamePage /></ErrorBoundary>} />
          <Route path="/kid/puzzles" element={<ErrorBoundary><KidPuzzlePage /></ErrorBoundary>} />
          {/* Per-piece adaptive puzzle sessions (Phase 8) — filtered by
              movingPiece, rating band ±50 of the kid's per-piece rating. */}
          <Route path="/kid/pawn-games/puzzles"   element={<ErrorBoundary><KidPiecePuzzlesPage piece="pawn" /></ErrorBoundary>} />
          <Route path="/kid/rook-games/puzzles"   element={<ErrorBoundary><KidPiecePuzzlesPage piece="rook" /></ErrorBoundary>} />
          <Route path="/kid/knight-games/puzzles" element={<ErrorBoundary><KidPiecePuzzlesPage piece="knight" /></ErrorBoundary>} />
          <Route path="/kid/bishop-games/puzzles" element={<ErrorBoundary><KidPiecePuzzlesPage piece="bishop" /></ErrorBoundary>} />
          <Route path="/kid/queen-games/puzzles"  element={<ErrorBoundary><KidPiecePuzzlesPage piece="queen" /></ErrorBoundary>} />
          <Route path="/kid/king-games/puzzles"   element={<ErrorBoundary><KidPiecePuzzlesPage piece="king" /></ErrorBoundary>} />
          {/* Phase 7 — generic piece-maze sandbox levels. 5 levels per
              piece × 6 pieces = 30 new sandbox levels. */}
          <Route path="/kid/pawn-games/maze/:level"   element={<ErrorBoundary><PieceMazePage piece="pawn" /></ErrorBoundary>} />
          <Route path="/kid/rook-games/maze/:level"   element={<ErrorBoundary><PieceMazePage piece="rook" /></ErrorBoundary>} />
          <Route path="/kid/knight-games/maze/:level" element={<ErrorBoundary><PieceMazePage piece="knight" /></ErrorBoundary>} />
          <Route path="/kid/bishop-games/maze/:level" element={<ErrorBoundary><PieceMazePage piece="bishop" /></ErrorBoundary>} />
          <Route path="/kid/queen-games/maze/:level"  element={<ErrorBoundary><PieceMazePage piece="queen" /></ErrorBoundary>} />
          <Route path="/kid/king-games/maze/:level"   element={<ErrorBoundary><PieceMazePage piece="king" /></ErrorBoundary>} />
          {/* Phase 7b — generic piece-sweep (capture all targets). 5 levels per piece × 6 = 30. */}
          <Route path="/kid/pawn-games/sweep/:level"   element={<ErrorBoundary><PieceSweepPage piece="pawn" /></ErrorBoundary>} />
          <Route path="/kid/rook-games/sweep/:level"   element={<ErrorBoundary><PieceSweepPage piece="rook" /></ErrorBoundary>} />
          <Route path="/kid/knight-games/sweep/:level" element={<ErrorBoundary><PieceSweepPage piece="knight" /></ErrorBoundary>} />
          <Route path="/kid/bishop-games/sweep/:level" element={<ErrorBoundary><PieceSweepPage piece="bishop" /></ErrorBoundary>} />
          <Route path="/kid/queen-games/sweep/:level"  element={<ErrorBoundary><PieceSweepPage piece="queen" /></ErrorBoundary>} />
          <Route path="/kid/king-games/sweep/:level"   element={<ErrorBoundary><PieceSweepPage piece="king" /></ErrorBoundary>} />
          {/* Time-trial races — capture every target against the clock. */}
          <Route path="/kid/knight-games/race/:level" element={<ErrorBoundary><PieceRaceGame piece="knight" /></ErrorBoundary>} />
          <Route path="/kid/bishop-games/race/:level" element={<ErrorBoundary><PieceRaceGame piece="bishop" /></ErrorBoundary>} />
          <Route path="/kid/rook-games/race/:level"   element={<ErrorBoundary><PieceRaceGame piece="rook" /></ErrorBoundary>} />
          <Route path="/kid/queen-games/race/:level"  element={<ErrorBoundary><PieceRaceGame piece="queen" /></ErrorBoundary>} />
          <Route path="/kid/king-games/race/:level"   element={<ErrorBoundary><PieceRaceGame piece="king" /></ErrorBoundary>} />
          {/* Pairs vs. Army — two heroes hunt the marching pawn army. */}
          <Route path="/kid/knight-games/army" element={<ErrorBoundary><KnightArmyRoute /></ErrorBoundary>} />
          <Route path="/kid/bishop-games/army" element={<ErrorBoundary><BishopArmyRoute /></ErrorBoundary>} />
          {/* Level picker for the generic per-piece games (maze/sweep/race). */}
          <Route path="/kid/level-select/:piece/:game" element={<ErrorBoundary><PieceLevelSelect /></ErrorBoundary>} />
          <Route path="/kid/:piece" element={<ErrorBoundary><KidPiecePage /></ErrorBoundary>} />
        </Route>
      </Routes>
      <BuildVersionWidget />
      <StarAnimationLayer />
      {/* AI data-sharing consent — the ONLY first-run prompt now (the strength
          picker was removed 2026-08-22). Blocking, shown once; re-shown
          just-in-time if a user who declined later tries the coach.
          Guideline 5.1.1(i): permission before any gameplay data is shared with
          the third-party AI + voice providers. Must live INSIDE BrowserRouter —
          it renders a <Link to="/privacy">, and a router consumer outside the
          Router throws "Cannot destructure property 'basename' from null" and
          white-screens the whole app (P0, David 2026-07-02). */}
      <AiConsentModal />
      {/* Two-step review prompt — armed by reviewPromptService after enough
          positive moments; renders only when open. Global so it can surface
          from any surface that recorded the win. */}
      <ReviewPrompt />
    </BrowserRouter>
    </>
  );
}
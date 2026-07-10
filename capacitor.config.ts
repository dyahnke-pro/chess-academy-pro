import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chessacademy.pro',
  appName: 'Chess Academy Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'app.chessacademy.pro',
  },
  ios: {
    contentInset: 'always',
    // Native WKWebView scrolling. Was `false`, which disabled scrolling
    // entirely on device — content below the fold was unreachable (David's
    // TestFlight report 2026-06-03). The app's pages rely on normal vertical
    // scroll, so this must be on.
    scrollEnabled: true,
    backgroundColor: '#0f0f0f',
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#0f0f0f',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    // Over-the-air web-bundle updates (David 2026-07-03). SELF-HOSTED: the
    // plugin polls our OWN endpoint (no third-party account) and downloads a
    // newer web bundle we publish to Vercel Blob on each deploy, so content /
    // JS / coach fixes reach testers on the next open WITHOUT a TestFlight
    // round-trip. Native changes still need a build.
    //
    // SAFETY: the plugin auto-reverts to the shipped bundle if the freshly-
    // applied bundle doesn't call `CapacitorUpdater.notifyAppReady()` within
    // `appReadyTimeout` (see src/main.tsx) — a bad OTA bundle can't brick a
    // tester; worst case they stay on the last good bundle.
    CapacitorUpdater: {
      autoUpdate: true,
      // The builtin (shipped) bundle's version. Stamped at iOS build time by
      // ci_post_clone.sh (OTA_BUNDLE_VERSION = short git SHA) to MATCH the OTA
      // bundle published for the same commit — so a fresh install doesn't
      // redundantly re-download the bundle it already ships with. Unset on
      // web / local → the plugin falls back to the native app version.
      version: process.env.OTA_BUNDLE_VERSION || undefined,
      // Our self-hosted manifest endpoint (Capgo self-hosted protocol).
      updateUrl: 'https://chess-academy-pro.vercel.app/api/ota/manifest',
      // Apply the downloaded update as soon as it's fetched (David 2026-07-10:
      // "flip to auto") — the new bundle goes live on the launch it's detected
      // instead of waiting for the next background→foreground, so testers don't
      // have to fully quit + reopen to pick up a web/content change. The
      // appReadyTimeout revert below still protects against a bad bundle.
      directUpdate: true,
      // If the new bundle doesn't signal ready within this window, revert.
      appReadyTimeout: 10000,
      responseTimeout: 20,
      autoDeleteFailed: true,
      autoDeletePrevious: true,
    },
  },
};

export default config;

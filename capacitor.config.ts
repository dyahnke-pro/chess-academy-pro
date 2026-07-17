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
      // 🔓 OTA RE-ENABLED (David 2026-07-17: "put it back on"). Reverses the
      // 2026-07-11 disable. autoUpdate:true → the plugin polls the manifest on
      // launch and applies a newer published web bundle, so content / JS / coach
      // fixes reach testers on next open WITHOUT a TestFlight round-trip. The CI
      // publish step (daily-deploy.yml → publish-ota-bundle.mjs) repopulates the
      // manifest pointer. NB: this flag is compiled into the native build, so it
      // only takes effect once testers install a build cut AFTER this change —
      // the currently-installed autoUpdate:false apps cannot be turned back on
      // server-side. The notifyAppReady auto-revert safety above still applies.
      autoUpdate: true,
      version: process.env.OTA_BUNDLE_VERSION || undefined,
      updateUrl: 'https://chess-academy-pro.vercel.app/api/ota/manifest',
      directUpdate: false,
      appReadyTimeout: 10000,
      responseTimeout: 20,
      autoDeleteFailed: true,
      autoDeletePrevious: true,
    },
  },
};

export default config;

/**
 * patch-speech-plugin-spm
 * -----------------------
 * ROOT CAUSE (David 2026-07-08, proven from device audit telemetry:
 * `mic-start-failed: "SpeechRecognition" plugin is not implemented on ios`):
 * `@capacitor-community/speech-recognition@7.0.1` ships a CocoaPods podspec
 * but NO Package.swift — i.e. no Swift Package Manager support. Our iOS build
 * is SPM-based (`cap add ios` defaults to SPM on Capacitor 8, and
 * ci_post_clone.sh generates CapApp-SPM + Package.resolved for Xcode Cloud).
 * Capacitor's SPM sync silently omits plugins without SPM support, so the
 * native SpeechRecognition module was never compiled into the binary — the JS
 * bridge call throws "not implemented on ios". No JS fix or OTA bundle can
 * cure this; only a native rebuild that INCLUDES the module.
 *
 * This script makes the installed plugin SPM-capable, in place, so a
 * subsequent `npx cap sync ios` discovers it (Capacitor detects SPM support by
 * the presence of a plugin Package.swift) and links its native module:
 *   1. Convert the plugin class to `CAPBridgedPlugin` Swift registration
 *      (the modern, SPM-compatible mechanism) — mirrors the @capacitor/* core
 *      plugins. This replaces the ObjC `CAP_PLUGIN` macro in Plugin.m.
 *   2. Remove the ObjC files (Plugin.m/.h) + framework Info.plist — SPM targets
 *      can't mix ObjC + Swift, and none are needed once registration is Swift.
 *   3. Write a Package.swift declaring a pure-Swift library target.
 *
 * Runs from `postinstall`, so every `npm ci` (local + Xcode Cloud) re-applies
 * it after node_modules is (re)installed, BEFORE `cap add/sync ios`.
 *
 * BULLETPROOF BY DESIGN: postinstall failure would break `npm ci` everywhere,
 * so this never throws — any problem logs a warning and exits 0. Worst case the
 * plugin stays unpatched (mic stays broken, status quo) — nothing else breaks.
 * Idempotent: re-running on an already-patched tree is a no-op.
 */
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLUGIN = join(ROOT, 'node_modules', '@capacitor-community', 'speech-recognition');
const IOS = join(PLUGIN, 'ios', 'Plugin');
const SWIFT = join(IOS, 'Plugin.swift');
const PKG = join(PLUGIN, 'Package.swift');

const BRIDGED_METHODS = [
  'available',
  'start',
  'stop',
  'getSupportedLanguages',
  'isListening',
  'checkPermissions',
  'requestPermissions',
];

const PACKAGE_SWIFT = `// swift-tools-version: 5.9
import PackageDescription

// Injected by scripts/ci/patch-speech-plugin-spm.mjs so Capacitor's SPM sync
// links this plugin's native module (the upstream 7.0.1 release is CocoaPods-
// only). See that script for the full root-cause note.
let package = Package(
    name: "CapacitorCommunitySpeechRecognition",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "CapacitorCommunitySpeechRecognition",
            targets: ["SpeechRecognitionPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "SpeechRecognitionPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Plugin")
    ]
)
`;

function main() {
  if (!existsSync(PLUGIN)) {
    console.log('[patch-speech-spm] plugin not installed — skipping (fine on non-iOS installs)');
    return;
  }
  if (!existsSync(SWIFT)) {
    console.warn('[patch-speech-spm] Plugin.swift not found — plugin layout changed; skipping');
    return;
  }

  // 1. Add CAPBridgedPlugin conformance + registration members (idempotent).
  let swift = readFileSync(SWIFT, 'utf8');
  if (swift.includes('CAPBridgedPlugin')) {
    console.log('[patch-speech-spm] already patched — no-op');
  } else {
    const anchor = 'public class SpeechRecognition: CAPPlugin {';
    if (!swift.includes(anchor)) {
      console.warn('[patch-speech-spm] class declaration not found as expected — skipping (upstream changed)');
      return;
    }
    const methodsList = BRIDGED_METHODS.map(
      (m) => `        CAPPluginMethod(name: "${m}", returnType: CAPPluginReturnPromise)`,
    ).join(',\n');
    const replacement = `public class SpeechRecognition: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpeechRecognition"
    public let jsName = "SpeechRecognition"
    public let pluginMethods: [CAPPluginMethod] = [
${methodsList}
    ]`;
    swift = swift.replace(anchor, replacement);
    writeFileSync(SWIFT, swift);
    console.log('[patch-speech-spm] added CAPBridgedPlugin registration to Plugin.swift');
  }

  // 2. Remove ObjC + framework files (SPM target must be pure Swift).
  for (const f of ['Plugin.m', 'Plugin.h', 'Info.plist']) {
    const p = join(IOS, f);
    if (existsSync(p)) {
      rmSync(p, { force: true });
      console.log(`[patch-speech-spm] removed ${f}`);
    }
  }

  // 3. Write the plugin Package.swift so `cap sync` discovers SPM support.
  writeFileSync(PKG, PACKAGE_SWIFT);
  console.log('[patch-speech-spm] wrote Package.swift — plugin is now SPM-capable');
}

try {
  main();
} catch (err) {
  // NEVER fail the install — a broken postinstall would break every `npm ci`.
  console.warn(`[patch-speech-spm] non-fatal: ${err?.message ?? err}`);
}

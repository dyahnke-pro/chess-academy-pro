#!/usr/bin/env node
/**
 * Inject the required Info.plist keys into ios/App/App/Info.plist after
 * `cap add` / `cap sync` regenerates a bare plist.
 *
 * Why this exists: `npx cap add ios` / `npx cap sync ios` regenerate a
 * stock Info.plist that carries NEITHER microphone/speech usage string, so
 * a LOCAL Xcode/simulator run of the voice mic HARD-CRASHES on the first tap
 * (iOS kills the app the instant the @capacitor-community/speech-recognition
 * plugin calls SFSpeechRecognizer.requestAuthorization / the AVAudioSession
 * requests record without a purpose string). The two CI build paths inject
 * these at build time (ci_scripts/ci_post_clone.sh — the canonical Xcode
 * Cloud path — and .github/workflows/ios-testflight.yml), but a developer
 * building locally to test voice got the crash. This mirrors the CI
 * injection so `setup:ios` / `sync:ios` produce a runnable mic build.
 *
 * Idempotent Set-or-Add via PlistBuddy (macOS only — these npm scripts only
 * run on a Mac anyway). Fails loudly if the speech key can't be written,
 * since a missing key is a guaranteed first-tap crash.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const PLIST = 'ios/App/App/Info.plist';
const PLIST_BUDDY = '/usr/libexec/PlistBuddy';

/** key → { type, value }. Strings are the same copy the CI paths ship. */
const KEYS = {
  ITSAppUsesNonExemptEncryption: {
    type: 'bool',
    value: 'false',
  },
  NSMicrophoneUsageDescription: {
    type: 'string',
    value: 'Chess Academy uses the microphone for voice chat with your coach.',
  },
  NSSpeechRecognitionUsageDescription: {
    type: 'string',
    value: 'Chess Academy uses speech recognition to turn your spoken questions into coaching.',
  },
};

function run(args) {
  return execFileSync(PLIST_BUDDY, args, { encoding: 'utf8' });
}

function setOrAdd(key, { type, value }) {
  try {
    run(['-c', `Set :${key} ${value}`, PLIST]);
  } catch {
    run(['-c', `Add :${key} ${type} ${value}`, PLIST]);
  }
}

function main() {
  if (!existsSync(PLIST)) {
    console.error(`[inject-ios-plist-keys] ${PLIST} not found — run 'npx cap add ios' first.`);
    process.exit(1);
  }
  for (const [key, spec] of Object.entries(KEYS)) {
    setOrAdd(key, spec);
  }
  // Verify the load-bearing keys landed — a missing usage string crashes on
  // the first mic tap, so never leave the build in that state silently.
  console.log('--- Info.plist mic/speech keys ---');
  for (const key of ['NSMicrophoneUsageDescription', 'NSSpeechRecognitionUsageDescription']) {
    try {
      const val = run(['-c', `Print :${key}`, PLIST]).trim();
      console.log(`  ${key}=${val}`);
    } catch {
      console.error(`::error:: ${key} missing after injection — mic would crash on first tap`);
      process.exit(1);
    }
  }
}

main();

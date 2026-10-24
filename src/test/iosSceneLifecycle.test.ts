/**
 * THE iOS APP ADOPTS THE UIScene LIFECYCLE (2026-10-21).
 *
 * iOS 27 will not launch an app without it: build 206 (4.0.6) died at launch
 * on iOS 27.0.1 with EXC_BREAKPOINT in
 * _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption, before any of
 * our code ran — so nothing reached PostHog and the phone simply never opened.
 *
 * Three things must stay true, and each one alone would reopen the crash:
 *   1. the Capacitor CLI that Xcode Cloud runs scaffolds a SceneDelegate and a
 *      scene manifest (Capacitor >= 8.5);
 *   2. our AppDelegate patch, copied over the generated one, keeps the scene
 *      configuration — and does not hang work on applicationDidBecomeActive,
 *      which UIKit never calls once scenes are adopted;
 *   3. ci_post_clone.sh refuses to archive a build without them.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

/** Strip `//` comments so a sentence ABOUT a method never counts as the method. */
function code(swift: string): string {
  return swift
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');
}

function sceneReady(appDelegate: string): boolean {
  const c = code(appDelegate);
  return (
    /configurationForConnecting/.test(c) &&
    /SceneDelegate\.self/.test(c) &&
    /didBecomeActiveNotification/.test(c) &&
    !/func\s+applicationDidBecomeActive\s*\([^)]*\)\s*\{[^}]*\S[^}]*\}/.test(c)
  );
}

describe('iOS adopts the UIScene lifecycle', () => {
  it('the installed Capacitor template scaffolds a SceneDelegate and a scene manifest', () => {
    const tar = join(ROOT, 'node_modules/@capacitor/cli/assets/ios-spm-template.tar.gz');
    const files = execFileSync('tar', ['-tzf', tar]).toString();
    expect(files).toMatch(/App\/App\/SceneDelegate\.swift/);
    const plist = execFileSync('tar', ['-xzOf', tar, 'App/App/Info.plist']).toString();
    expect(plist).toMatch(/UIApplicationSceneManifest/);
    expect(plist).toMatch(/SceneDelegate/);
  });

  it('the AppDelegate patch keeps the scene configuration and a lifecycle-proof foreground hook', () => {
    expect(sceneReady(read('ios-patches/App/AppDelegate.swift'))).toBe(true);
  });

  it('flags the pre-scene AppDelegate (negative control)', () => {
    // The AppDelegate as it stood at e985956cb, kept as a fixture: a shallow
    // clone (every cloud session) does not carry that commit.
    const before = read('src/test/fixtures/AppDelegate.pre-scene.swift');
    expect(sceneReady(before)).toBe(false);
  });

  it('Xcode Cloud verifies the scene lifecycle after the patch and before the archive', () => {
    const sh = read('ios/App/ci_scripts/ci_post_clone.sh');
    const copy = sh.indexOf('cp ios-patches/App/AppDelegate.swift');
    const verify = sh.indexOf('UIApplicationSceneManifest:UISceneConfigurations');
    const resolveSpm = sh.indexOf('xcodebuild -resolvePackageDependencies');
    expect(copy).toBeGreaterThan(sh.indexOf('npx cap add ios'));
    expect(verify).toBeGreaterThan(copy);
    expect(verify).toBeLessThan(resolveSpm);
    expect(sh.slice(verify, resolveSpm)).toMatch(/exit 1/);
  });
});
